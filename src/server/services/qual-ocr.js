/**
 * 证书图片 OCR + AI 字段提取
 */
const { getMimoConfig } = require('./ai-pipeline');

/**
 * 从证书图片中提取结构化字段
 * @param {string} imageUrl - 图片 URL
 * @param {string} qualType - company/personnel
 * @returns {Object} 提取的字段
 */
async function extractQualFields(imageUrl, qualType = 'company') {
  const prompt = qualType === 'company'
    ? COMPANY_QUAL_PROMPT
    : PERSONNEL_QUAL_PROMPT;

  try {
    const mimo = await getMimoConfig();

    // 构建带图片的消息
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ];

    const response = await fetch(`${mimo.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mimo.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: mimo.model,
        messages,
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mimo API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;
    return parseExtractedFields(result, qualType);
  } catch (err) {
    console.error('[qual-ocr] AI extraction failed:', err.message);
    return { error: err.message };
  }
}

const COMPANY_QUAL_PROMPT = `请仔细分析这张公司资质证书图片，提取以下信息并返回 JSON 格式：

{
  "qual_type": "资质类型（如：ISO9001、ISO27001、ITSS、CS、软件著作权、营业执照、高新技术企业等）",
  "qual_name": "资质证书全称",
  "qual_level": "等级/级别（如：一级、二级、三级、甲级、乙级等，如果没有等级则留空）",
  "cert_number": "证书编号",
  "issue_date": "发证日期（格式：YYYY-MM-DD）",
  "expiry_date": "有效期截止日期（格式：YYYY-MM-DD，如果永久有效则留空）",
  "issuing_body": "发证机关/认证机构名称",
  "scope": "覆盖范围/适用范围描述（简要概括）"
}

注意事项：
- 如果某个字段无法识别，请留空字符串
- 日期格式统一为 YYYY-MM-DD
- 请确保返回有效的 JSON 格式
- 不要添加任何额外说明，只返回 JSON`;

const PERSONNEL_QUAL_PROMPT = `请仔细分析这张人员资质证书图片，提取以下信息并返回 JSON 格式：

{
  "person_name": "持证人姓名",
  "qual_type": "证书类型（如：PMP、OCP、RHCE、CCIE、HCIE、软考高级、一级建造师等）",
  "qual_name": "证书全称",
  "cert_number": "证书编号",
  "issue_date": "发证日期（格式：YYYY-MM-DD）",
  "expiry_date": "有效期截止日期（格式：YYYY-MM-DD，如果永久有效则留空）"
}

注意事项：
- 如果某个字段无法识别，请留空字符串
- 日期格式统一为 YYYY-MM-DD
- 请确保返回有效的 JSON 格式
- 不要添加任何额外说明，只返回 JSON`;

/**
 * 解析 AI 返回的 JSON
 */
function parseExtractedFields(aiResult, qualType) {
  try {
    // 尝试提取 JSON
    let jsonStr = aiResult;

    // 如果包含 markdown 代码块，提取其中的 JSON
    const jsonMatch = aiResult.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // 尝试直接解析
    const fields = JSON.parse(jsonStr);

    // 验证并清理字段
    const cleaned = {};

    if (qualType === 'company') {
      cleaned.qual_type = fields.qual_type || '';
      cleaned.qual_name = fields.qual_name || '';
      cleaned.qual_level = fields.qual_level || '';
      cleaned.cert_number = fields.cert_number || '';
      cleaned.issue_date = fields.issue_date || '';
      cleaned.expiry_date = fields.expiry_date || '';
      cleaned.issuing_body = fields.issuing_body || '';
      cleaned.scope = fields.scope || '';
    } else {
      cleaned.person_name = fields.person_name || '';
      cleaned.qual_type = fields.qual_type || '';
      cleaned.qual_name = fields.qual_name || '';
      cleaned.cert_number = fields.cert_number || '';
      cleaned.issue_date = fields.issue_date || '';
      cleaned.expiry_date = fields.expiry_date || '';
    }

    // 验证日期格式
    const dateFields = ['issue_date', 'expiry_date'];
    for (const df of dateFields) {
      if (cleaned[df] && !/^\d{4}-\d{2}-\d{2}$/.test(cleaned[df])) {
        // 尝试转换常见日期格式
        const date = new Date(cleaned[df]);
        if (!isNaN(date.getTime())) {
          cleaned[df] = date.toISOString().split('T')[0];
        } else {
          cleaned[df] = '';
        }
      }
    }

    return { success: true, fields: cleaned };
  } catch (err) {
    console.error('[qual-ocr] Parse error:', err.message, 'Raw:', aiResult);
    return { success: false, error: 'AI 返回格式解析失败', raw: aiResult };
  }
}

module.exports = { extractQualFields };
