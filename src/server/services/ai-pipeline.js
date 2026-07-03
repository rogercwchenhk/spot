/**
 * AI Pipeline 服务 (v2)
 * 基于元数据做分类/标签提取
 * 知了 API 只返回标题+元数据，不含招标文件正文
 * 资质要求和评分标准需要查看原发布网站的招标文件
 */
const config = require('../config');
const { supabaseAdmin } = require('../db');

const MIMO_BASE_URL = config.mimo.baseUrl;
const MIMO_API_KEY = config.mimo.apiKey;
const MIMO_MODEL = config.mimo.model;

/**
 * 调用 mimo API
 */
async function callMimo(messages, options = {}) {
  const response = await fetch(`${MIMO_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MIMO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MIMO_MODEL,
      messages,
      temperature: options.temperature || 0.1,
      max_tokens: options.maxTokens || 1500,
      response_format: options.jsonMode ? { type: 'json_object' } : undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mimo API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ============================================================
// 规则引擎：从元数据提取结构化信息（无需 AI 调用）
// ============================================================

const TECH_PATTERNS = [
  { pattern: /小型机|IBM|Power|AIX|P系列/i, keyword: '小型机' },
  { pattern: /存储|SAN|NAS|磁盘阵列|华为存储|EMC|NetApp/i, keyword: '存储' },
  { pattern: /数据库|Oracle|MySQL|PostgreSQL|DB2|达梦/i, keyword: '数据库' },
  { pattern: /服务器|x86|刀片|机架/i, keyword: '服务器' },
  { pattern: /网络|交换机|路由器|Cisco|华为|H3C|防火墙/i, keyword: '网络设备' },
  { pattern: /虚拟化|VMware|vSphere|KVM|Hyper-V|超融合/i, keyword: '虚拟化' },
  { pattern: /桌面|终端|PC|办公设备|打印机/i, keyword: '桌面运维' },
  { pattern: /安全|防火墙|IDS|IPS|态势感知|等保|网安/i, keyword: '信息安全' },
  { pattern: /云|公有云|私有云|混合云|AWS|阿里云|腾讯云/i, keyword: '云计算' },
  { pattern: /UPS|精密空调|动环监控|机房|数据中心/i, keyword: '机房基础设施' },
  { pattern: /ERP|SAP|用友|金蝶/i, keyword: 'ERP系统' },
  { pattern: /监控|Zabbix|Nagios|Prometheus|运维平台/i, keyword: '运维监控' },
  { pattern: /备份|容灾|灾备/i, keyword: '备份容灾' },
  { pattern: /Kubernetes|K8s|Docker|容器|微服务/i, keyword: '容器化' },
];

const INDUSTRY_PATTERNS = [
  { pattern: /银行|金融|证券|保险|基金|信用社/i, industry: '金融' },
  { pattern: /医院|卫生|医疗|疾控|血站/i, industry: '医疗' },
  { pattern: /电力|电网|能源|核电|水电|风电|光伏/i, industry: '电力能源' },
  { pattern: /交通|公路|铁路|航空|港口|地铁|城运/i, industry: '交通' },
  { pattern: /教育|大学|学院|学校|职校|教育局/i, industry: '教育' },
  { pattern: /政府|政务|公安|法院|检察院|税务|海关/i, industry: '政府' },
  { pattern: /电信|联通|移动|通信/i, industry: '通信' },
  { pattern: /制造|工厂|汽车|钢铁|石化|化工/i, industry: '制造业' },
];

const PROJECT_TYPE_PATTERNS = [
  { pattern: /运维|运行维护|维护服务|维保|保修/i, type: '运维' },
  { pattern: /驻场|现场|外包/i, type: '驻场运维' },
  { pattern: /桌面|终端/i, type: '桌面运维' },
  { pattern: /集成|实施|部署|建设/i, type: '系统集成' },
  { pattern: /咨询|规划|设计|评估/i, type: '咨询' },
  { pattern: /安全|等保|渗透/i, type: '安全服务' },
  { pattern: /培训/i, type: '培训' },
];

/**
 * 从标讯元数据做规则提取（不调用 AI，快速免费）
 */
function extractFromMetadata(notice) {
  const text = [notice.title, ...(notice.sm_names || [])].join(' ');

  // 技术关键词
  const techKeywords = [];
  for (const { pattern, keyword } of TECH_PATTERNS) {
    if (pattern.test(text) && !techKeywords.includes(keyword)) {
      techKeywords.push(keyword);
    }
  }

  // 行业
  let industryType = notice.industry_type || 'other';
  for (const { pattern, industry } of INDUSTRY_PATTERNS) {
    if (pattern.test(text)) {
      industryType = industry;
      break;
    }
  }

  // 项目类型
  let projectType = 'other';
  for (const { pattern, type } of PROJECT_TYPE_PATTERNS) {
    if (pattern.test(text)) {
      projectType = type;
      break;
    }
  }

  return {
    project_name: notice.title,
    budget: notice.budget_amount || 0,
    region: notice.region_scope || notice.city || '',
    deadline: notice.end_date || notice.signup_time || null,
    industry_type: industryType,
    project_type: projectType,
    tech_keywords: techKeywords,
    tenderee: notice.tenderee || notice.caller_name || '',
    tender_agent: notice.tender_agent || notice.agency_name || '',
    source: 'metadata_rules',
    // 标注：需要查看招标文件才能获取资质要求和评分标准
    qualification_requirements: [],
    commercial_scoring_rules: [],
    doc_access_note: '招标文件需查看原发布网站，资质要求和评分标准以招标文件为准',
  };
}

/**
 * 对模糊标题用 AI 做补充分类（仅在规则引擎无法确定时调用）
 */
async function aiClassify(notice) {
  const prompt = `根据以下招标公告的标题和元数据，判断行业类型和项目类型。

标题: ${notice.title}
分类: ${(notice.sm_names || []).join(', ')}
采购方: ${notice.tenderee || notice.caller_name || ''}
地区: ${notice.region_scope || ''} ${notice.city || ''}
预算: ${notice.budget_amount ? notice.budget_amount + '万元' : '未公开'}

请返回JSON：
{
  "industry_type": "行业（金融/医疗/电力能源/交通/教育/政府/通信/制造业/其他）",
  "project_type": "项目类型（运维/驻场运维/桌面运维/系统集成/咨询/安全服务/培训/其他）",
  "tech_keywords": ["从标题推断的技术关键词"],
  "confidence": 0.0到1.0的置信度
}`;

  const messages = [
    { role: 'system', content: '你是招标公告分类专家。仅根据标题和元数据做分类，不要编造信息。返回纯JSON。' },
    { role: 'user', content: prompt },
  ];

  const result = await callMimo(messages, { jsonMode: true, maxTokens: 500 });
  return JSON.parse(result);
}

/**
 * 处理单条标讯
 */
async function processNotice(noticeId) {
  console.log(`[ai-pipeline] Processing notice ${noticeId}`);

  const { data: notice, error: fetchError } = await supabaseAdmin
    .from('bidding_notice')
    .select('*')
    .eq('id', noticeId)
    .single();

  if (fetchError || !notice) {
    throw new Error(`Notice not found: ${noticeId}`);
  }

  if (notice.ai_status === 4) {
    console.log(`[ai-pipeline] Notice ${noticeId} already processed`);
    return { status: 'already_processed' };
  }

  try {
    // 1. 规则提取（基于元数据，无需 AI）
    const extracted = extractFromMetadata(notice);

    // 2. 如果规则引擎无法确定行业或项目类型，用 AI 补充
    if (extracted.industry_type === 'other' || extracted.project_type === 'other') {
      try {
        const aiResult = await aiClassify(notice);
        if (aiResult.industry_type && aiResult.industry_type !== '其他') {
          extracted.industry_type = aiResult.industry_type;
        }
        if (aiResult.project_type && aiResult.project_type !== '其他') {
          extracted.project_type = aiResult.project_type;
        }
        if (aiResult.tech_keywords?.length > 0) {
          for (const kw of aiResult.tech_keywords) {
            if (!extracted.tech_keywords.includes(kw)) {
              extracted.tech_keywords.push(kw);
            }
          }
        }
        extracted.source = 'metadata_rules+ai';
        extracted.ai_confidence = aiResult.confidence;
      } catch (aiErr) {
        console.warn(`[ai-pipeline] AI classification failed for ${noticeId}, using rules only:`, aiErr.message);
      }
    }

    // 3. 写入 ai_extracted_fields
    await supabaseAdmin
      .from('bidding_notice')
      .update({
        ai_extracted_fields: extracted,
        industry_type: extracted.industry_type,
        ai_status: 4,
        ai_error: null,
      })
      .eq('id', noticeId);

    // 4. 写入 notice_tag
    const tags = [];

    for (const kw of extracted.tech_keywords) {
      tags.push({ notice_id: noticeId, tag_type: 'tech_keyword', tag_value: kw, confidence: 0.95 });
    }

    if (extracted.industry_type && extracted.industry_type !== 'other') {
      tags.push({ notice_id: noticeId, tag_type: 'industry', tag_value: extracted.industry_type, confidence: 0.9 });
    }

    if (extracted.project_type && extracted.project_type !== 'other') {
      tags.push({ notice_id: noticeId, tag_type: 'project_type', tag_value: extracted.project_type, confidence: 0.9 });
    }

    if (tags.length > 0) {
      // 先删旧标签再插入（避免重复）
      await supabaseAdmin.from('notice_tag').delete().eq('notice_id', noticeId);
      await supabaseAdmin.from('notice_tag').insert(tags);
    }

    console.log(`[ai-pipeline] Notice ${noticeId} processed (${extracted.source}, tags: ${tags.length})`);
    return { status: 'success', extracted, tags_count: tags.length };

  } catch (err) {
    await supabaseAdmin
      .from('bidding_notice')
      .update({ ai_status: -2, ai_error: err.message })
      .eq('id', noticeId);

    console.error(`[ai-pipeline] Notice ${noticeId} failed:`, err.message);
    throw err;
  }
}

/**
 * 批量处理
 */
async function processPendingNotices(limit = 50) {
  const { data: notices, error } = await supabaseAdmin
    .from('bidding_notice')
    .select('id')
    .in('ai_status', [0, -2])
    .order('publish_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!notices || notices.length === 0) {
    console.log('[ai-pipeline] No pending notices');
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const notice of notices) {
    try {
      await processNotice(notice.id);
      processed++;
    } catch (err) {
      failed++;
    }
  }

  console.log(`[ai-pipeline] Batch complete: ${processed} processed, ${failed} failed`);
  return { processed, failed };
}

/**
 * 重置所有标讯的 AI 状态（用于重新处理）
 */
async function resetAllAiStatus() {
  const { count } = await supabaseAdmin
    .from('bidding_notice')
    .update({ ai_status: 0, ai_error: null, ai_extracted_fields: null, cleaned_content: null, notice_summary: null })
    .neq('ai_status', 0)
    .select('*', { count: 'exact', head: true });

  console.log(`[ai-pipeline] Reset ${count} notices to ai_status=0`);
  return { reset: count || 0 };
}

module.exports = { processNotice, processPendingNotices, resetAllAiStatus, extractFromMetadata };
