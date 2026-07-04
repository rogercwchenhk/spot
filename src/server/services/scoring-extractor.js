/**
 * 评分标准提取服务
 * PDF/DOCX → 文本提取 → AI 结构化解析 → 存入 notice_scoring
 */
const { supabaseAdmin } = require('../db');
const { execSync } = require('child_process');
const path = require('path');

const MIMO_BASE_URL = process.env.MIMO_BASE_URL || 'https://token-plan-cn.xiaomimimo.com/v1';
const MIMO_API_KEY = process.env.MIMO_API_KEY;
const MIMO_MODEL = process.env.MIMO_MODEL || 'mimo-v2.5-pro';
const EXTRACT_SCRIPT = path.join(__dirname, '../../../scripts/extract-text.py');

/**
 * 从 Storage 提取文本
 */
function extractText(storagePath) {
  const cmd = `python3 "${EXTRACT_SCRIPT}" "${process.env.SUPABASE_URL}" "${process.env.SUPABASE_SERVICE_ROLE_KEY}" "${storagePath}"`;
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 30000 }).trim();
  } catch (err) {
    throw new Error(`文本提取失败: ${err.message}`);
  }
}

/**
 * AI 提取评分标准
 */
async function extractScoringWithAI(text) {
  // 找评分相关段落
  const scoreKeywords = ['详细评审', '评分标准', '评标办法', '综合评分法', '评分细则', '评审因素'];
  let scoreSection = '';
  for (const kw of scoreKeywords) {
    const idx = text.indexOf(kw);
    if (idx >= 0) {
      // 取更长的段落，确保包含完整评分表
      scoreSection = text.substring(Math.max(0, idx - 100), idx + 10000);
      break;
    }
  }
  if (!scoreSection) {
    // 尝试找包含'分'的评分相关段落
    const match = text.match(/(?:技术部分|商务部分|价格部分)[^]{5000}/);
    scoreSection = match ? match[0] : text.substring(0, 10000);
  }

  const prompt = `从以下招标文件内容中提取评分标准和资质要求，返回 JSON。

格式：
{
  "scoring": {
    "total": 100,
    "categories": [
      {
        "name": "大类名称",
        "max_score": 分数,
        "items": [
          {"item": "评分项", "score": 分数, "rule": "评分规则"}
        ]
      }
    ]
  },
  "qualifications": [
    {"type": "类型", "requirement": "要求", "mandatory": true}
  ],
  "summary": "100字以内的评分概述"
}

内容：
${scoreSection}`;

  const resp = await fetch(`${MIMO_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${MIMO_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MIMO_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!resp.ok) throw new Error(`mimo API: ${resp.status}`);
  const data = await resp.json();
  return JSON.parse(data.choices[0].message.content);
}

/**
 * 提取单条标讯的评分标准
 */
async function extractNoticeScoring(noticeId) {
  console.log(`[scoring] #${noticeId}`);

  // 检查是否已有
  const { data: existing } = await supabaseAdmin
    .from('notice_scoring').select('id').eq('notice_id', noticeId);
  if (existing?.length > 0) return { status: 'skip', message: '已有评分数据' };

  // 找招标文件（优先解压出的 PDF/DOCX，跳过 ZIP 和代理协议）
  const { data: docs } = await supabaseAdmin
    .from('bid_document').select('id, storage_path, file_name, file_type, file_size')
    .eq('notice_id', noticeId).eq('download_status', 'completed')
    .in('file_type', ['pdf', 'docx', 'doc'])
    .order('file_size', { ascending: false });

  if (!docs?.length) return { status: 'skip', message: '无可解析文件' };

  // 筛选策略：
  // 1. 优先 ZIP 解压出的招标文件（文件名含招标/采购文件，>50KB）
  // 2. 其次普通 PDF/DOCX 中文件名含招标且 >50KB 的
  // 3. 跳过 <50KB 的小文件（封面/授权书/补充说明）
  const MIN_SIZE = 50 * 1024; // 50KB
  const validDocs = docs.filter(d => d.file_size >= MIN_SIZE);
  if (validDocs.length === 0) return { status: 'skip', message: '无有效文件（均<50KB）' };

  let doc = validDocs.find(d => /招标|采购文件/.test(d.file_name));
  if (!doc) doc = validDocs[0];

  console.log(`  解析: ${doc.file_name}`);

  // 提取文本
  let text;
  try {
    text = extractText(doc.storage_path);
  } catch (err) {
    return { status: 'fail', message: err.message };
  }

  if (text.length < 200) return { status: 'fail', message: '文本过短' };

  // AI 提取
  let result;
  try {
    result = await extractScoringWithAI(text);
  } catch (err) {
    return { status: 'fail', message: 'AI 提取失败: ' + err.message };
  }

  // 存入数据库
  const { error: dbErr } = await supabaseAdmin.from('notice_scoring').insert({
    notice_id: noticeId,
    doc_id: doc.id,
    total_score: result.scoring?.total || 100,
    scoring_json: result.scoring || {},
    qualifications: result.qualifications || [],
    summary: result.summary || '',
  });

  if (dbErr) return { status: 'fail', message: '入库失败: ' + dbErr.message };

  console.log(`  完成: ${(result.scoring?.categories || []).length} 个评分大类`);
  return { status: 'success', data: result };
}

/**
 * 批量提取
 */
async function extractBatch(limit = 20) {
  console.log(`[scoring] 批量 ${limit} 条`);

  // 找有已下载文件但没有评分数据的标讯
  // 只处理 tender 类型的标讯
  const { data: tenderNotices } = await supabaseAdmin
    .from('bidding_notice')
    .select('id')
    .eq('notice_type', 'tender')
    .eq('doc_access_type', 'free');
  const tenderIds = new Set((tenderNotices || []).map(n => n.id));

  const { data: notices } = await supabaseAdmin.rpc
    ? await supabaseAdmin
        .from('bid_document')
        .select('notice_id')
        .eq('download_status', 'completed')
        .in('file_type', ['pdf', 'docx', 'doc'])
        .limit(limit * 3)
    : { data: [] };

  // 去重并排除已有评分的
  const { data: scored } = await supabaseAdmin.from('notice_scoring').select('notice_id');
  const scoredIds = new Set((scored || []).map(s => s.notice_id));
  const noticeIds = [...new Set((notices || []).map(n => n.notice_id))]
    .filter(id => !scoredIds.has(id) && tenderIds.has(id))
    .slice(0, limit);

  if (noticeIds.length === 0) return { success: 0, failed: 0, skipped: 0, total: 0 };

  console.log(`  待处理: ${noticeIds.length} 条`);

  let success = 0, failed = 0, skipped = 0;
  for (const id of noticeIds) {
    try {
      const r = await extractNoticeScoring(id);
      if (r.status === 'success') success++;
      else if (r.status === 'skip') skipped++;
      else failed++;
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) { failed++; }
  }

  return { success, failed, skipped, total: noticeIds.length };
}

module.exports = { extractNoticeScoring, extractBatch };
