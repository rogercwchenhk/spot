/**
 * AI Pipeline 服务
 * 使用 mimo-v2.5-pro 提取标讯结构化字段
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
      max_tokens: options.maxTokens || 2000,
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

/**
 * 清洗 HTML 内容为纯文本
 */
function cleanHtml(html) {
  if (!html) return '';
  
  // 移除 HTML 标签
  let text = html.replace(/<[^>]*>/g, ' ');
  
  // 移除多余空白
  text = text.replace(/\s+/g, ' ').trim();
  
  // 移除常见噪声
  text = text.replace(/(首页|导航|页脚|版权|备案号|ICP).*$/g, '');
  
  return text.substring(0, 8000); // 限制长度，控制 token 成本
}

/**
 * 生成摘要
 */
async function generateSummary(cleanedContent) {
  const prompt = `请用中文为以下招标公告生成一个200字以内的精炼摘要，突出：
1. 采购单位
2. 项目类型
3. 预算金额
4. 关键技术要求
5. 截止日期

公告内容：
${cleanedContent.substring(0, 4000)}`;

  const messages = [
    { role: 'system', content: '你是一个专业的招标公告分析师，擅长提取关键信息。' },
    { role: 'user', content: prompt },
  ];

  return await callMimo(messages, { maxTokens: 500 });
}

/**
 * 提取结构化字段
 */
async function extractStructuredFields(cleanedContent) {
  const prompt = `请从以下招标公告中提取结构化信息，返回JSON格式：

{
  "project_name": "项目名称",
  "budget": 金额数字（万元）,
  "deadline": "截止日期 YYYY-MM-DD",
  "region": "地区",
  "industry_type": "行业类型（银行/医院/政府/交通/电力/其他）",
  "project_type": "项目类型（运维/驻场/桌面/维保/集成/咨询/其他）",
  "tech_keywords": ["技术关键词1", "技术关键词2"],
  "qualification_requirements": [
    {"item": "资质要求", "mandatory": true/false}
  ],
  "commercial_scoring_rules": [
    {"item": "评分项", "max_score": 分值, "deduction_if_missing": 缺失扣分}
  ],
  "tenderee": "采购单位",
  "tender_agent": "代理机构"
}

公告内容：
${cleanedContent.substring(0, 6000)}`;

  const messages = [
    { role: 'system', content: '你是一个专业的招标公告结构化提取专家。请严格按照JSON格式返回，不要包含其他文字。' },
    { role: 'user', content: prompt },
  ];

  const result = await callMimo(messages, { jsonMode: true, maxTokens: 2000 });
  
  try {
    return JSON.parse(result);
  } catch (e) {
    console.error('[ai-pipeline] JSON parse error:', e.message);
    console.error('[ai-pipeline] Raw response:', result);
    throw new Error('Failed to parse AI response as JSON');
  }
}

/**
 * 处理单条标讯
 */
async function processNotice(noticeId) {
  console.log(`[ai-pipeline] Processing notice ${noticeId}`);

  // 1. 读取标讯
  const { data: notice, error: fetchError } = await supabaseAdmin
    .from('bidding_notice')
    .select('*')
    .eq('id', noticeId)
    .single();

  if (fetchError || !notice) {
    throw new Error(`Notice not found: ${noticeId}`);
  }

  // 2. 检查状态
  if (notice.ai_status === 4) {
    console.log(`[ai-pipeline] Notice ${noticeId} already fully processed`);
    return { status: 'already_processed' };
  }

  try {
    // 3. 清洗内容
    let cleanedContent = notice.cleaned_content;
    if (!cleanedContent) {
      cleanedContent = cleanHtml(notice.notice_content);
      await supabaseAdmin
        .from('bidding_notice')
        .update({ cleaned_content: cleanedContent, ai_status: 1 })
        .eq('id', noticeId);
    }

    // 4. 生成摘要
    let summary = notice.notice_summary;
    if (!summary && cleanedContent) {
      summary = await generateSummary(cleanedContent);
      await supabaseAdmin
        .from('bidding_notice')
        .update({ notice_summary: summary, ai_status: 2 })
        .eq('id', noticeId);
    }

    // 5. 提取结构化字段
    const extracted = await extractStructuredFields(cleanedContent);
    
    // 6. 写入 ai_extracted_fields
    await supabaseAdmin
      .from('bidding_notice')
      .update({ 
        ai_extracted_fields: extracted,
        ai_status: 3 
      })
      .eq('id', noticeId);

    // 7. 展开写入 notice_tag
    const tags = [];
    
    // 技术关键词
    if (extracted.tech_keywords) {
      for (const kw of extracted.tech_keywords) {
        tags.push({ notice_id: noticeId, tag_type: 'tech_keyword', tag_value: kw, confidence: 0.9 });
      }
    }
    
    // 资质要求
    if (extracted.qualification_requirements) {
      for (const req of extracted.qualification_requirements) {
        tags.push({ notice_id: noticeId, tag_type: 'qualification', tag_value: req.item, confidence: 0.85 });
      }
    }
    
    // 行业
    if (extracted.industry_type) {
      tags.push({ notice_id: noticeId, tag_type: 'industry', tag_value: extracted.industry_type, confidence: 0.9 });
    }
    
    // 项目类型
    if (extracted.project_type) {
      tags.push({ notice_id: noticeId, tag_type: 'project_type', tag_value: extracted.project_type, confidence: 0.9 });
    }

    if (tags.length > 0) {
      await supabaseAdmin
        .from('notice_tag')
        .insert(tags);
    }

    // 8. 更新状态为完成
    await supabaseAdmin
      .from('bidding_notice')
      .update({ ai_status: 4 })
      .eq('id', noticeId);

    console.log(`[ai-pipeline] Notice ${noticeId} processed successfully`);
    return { status: 'success', extracted, tags_count: tags.length };

  } catch (err) {
    // 记录错误
    await supabaseAdmin
      .from('bidding_notice')
      .update({ ai_status: -2, ai_error: err.message })
      .eq('id', noticeId);

    console.error(`[ai-pipeline] Notice ${noticeId} failed:`, err.message);
    throw err;
  }
}

/**
 * 批量处理待处理的标讯
 */
async function processPendingNotices(limit = 10) {
  const { data: notices, error } = await supabaseAdmin
    .from('bidding_notice')
    .select('id')
    .eq('ai_status', 0)
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

module.exports = { processNotice, processPendingNotices, cleanHtml, generateSummary, extractStructuredFields };
