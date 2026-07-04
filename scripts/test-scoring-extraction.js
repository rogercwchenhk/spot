/**
 * 测试：从招标文件 PDF 中提取评分标准
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// mimo AI 配置
const MIMO_BASE_URL = process.env.MIMO_BASE_URL || 'https://token-plan-cn.xiaomimimo.com/v1';
const MIMO_API_KEY = process.env.MIMO_API_KEY;
const MIMO_MODEL = process.env.MIMO_MODEL || 'mimo-v2.5-pro';

/**
 * 从 PDF Buffer 提取文本
 */
async function extractTextFromPdf(buffer) {
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join('');
    pages.push(text);
  }

  return pages.join('\n');
}

/**
 * 调用 mimo AI 提取评分标准
 */
async function extractScoringCriteria(text) {
  const prompt = `你是招投标文件分析专家。请从以下招标文件内容中提取评分标准和资质要求。

要求：
1. 提取"评分标准"或"评标办法"中的具体评分项、分值、评分规则
2. 提取"资质要求"或"资格条件"中的具体要求（如企业资质、人员证书、业绩要求等）
3. 以 JSON 格式返回

返回格式：
{
  "scoring_criteria": [
    {
      "category": "评分大类名称",
      "max_score": 最高分,
      "items": [
        {
          "item": "具体评分项",
          "score": 分值,
          "rule": "评分规则说明"
        }
      ]
    }
  ],
  "qualification_requirements": [
    {
      "type": "资质类型（企业资质/人员资质/业绩要求/其他）",
      "requirement": "具体要求描述",
      "is_mandatory": true/false
    }
  ],
  "summary": "整体评分标准概述（100字以内）"
}

招标文件内容：
${text.substring(0, 8000)}`;

  const response = await fetch(`${MIMO_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MIMO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MIMO_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`mimo API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

(async () => {
  console.log('=== 测试：解析招标文件评分标准 ===\n');

  // 1. 下载 PDF
  const storagePath = '66/3ffa4b678c653a9b15365274235c49a6e49e323b.pdf';
  console.log('[1/3] 下载 PDF:', storagePath);

  const { data: fileData, error: dlError } = await sb.storage
    .from('bid-documents')
    .download(storagePath);

  if (dlError) {
    console.error('下载失败:', dlError.message);
    return;
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  console.log('下载成功:', (buffer.length / 1024).toFixed(0), 'KB');

  // 2. 提取文本
  console.log('\n[2/3] 提取 PDF 文本...');
  const text = await extractTextFromPdf(buffer);
  console.log('提取文本长度:', text.length, '字符');
  console.log('\n--- 文本预览 (前500字) ---');
  console.log(text.substring(0, 500));

  // 3. AI 提取评分标准
  console.log('\n[3/3] AI 提取评分标准...');
  const result = await extractScoringCriteria(text);

  console.log('\n=== 提取结果 ===\n');
  console.log(JSON.stringify(result, null, 2));
})();
