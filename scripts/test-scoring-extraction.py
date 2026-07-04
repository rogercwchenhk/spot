#!/usr/bin/env python3
"""
测试：从招标文件 PDF 中提取评分标准
"""
import os
import json
import requests
from io import BytesIO
from PyPDF2 import PdfReader
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
MIMO_BASE_URL = os.getenv('MIMO_BASE_URL', 'https://token-plan-cn.xiaomimimo.com/v1')
MIMO_API_KEY = os.getenv('MIMO_API_KEY')
MIMO_MODEL = os.getenv('MIMO_MODEL', 'mimo-v2.5-pro')

def download_from_storage(path):
    """从 Supabase Storage 下载文件"""
    url = f"{SUPABASE_URL}/storage/v1/object/bid-documents/{path}"
    resp = requests.get(url, headers={'Authorization': f'Bearer {SUPABASE_KEY}'})
    resp.raise_for_status()
    return resp.content

def extract_text_from_pdf(content):
    """从 PDF 提取文本"""
    reader = PdfReader(BytesIO(content))
    texts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            texts.append(text)
    return '\n'.join(texts)

def extract_scoring_criteria(text):
    """调用 mimo AI 提取评分标准"""
    prompt = f"""你是招投标文件分析专家。请从以下招标文件内容中提取评分标准和资质要求。

要求：
1. 提取"评分标准"或"评标办法"中的具体评分项、分值、评分规则
2. 提取"资质要求"或"资格条件"中的具体要求（如企业资质、人员证书、业绩要求等）
3. 以 JSON 格式返回

返回格式：
{{
  "scoring_criteria": [
    {{
      "category": "评分大类名称",
      "max_score": 最高分,
      "items": [
        {{
          "item": "具体评分项",
          "score": 分值,
          "rule": "评分规则说明"
        }}
      ]
    }}
  ],
  "qualification_requirements": [
    {{
      "type": "资质类型（企业资质/人员资质/业绩要求/其他）",
      "requirement": "具体要求描述",
      "is_mandatory": true或false
    }}
  ],
  "summary": "整体评分标准概述（100字以内）"
}}

招标文件内容：
{text[:8000]}"""

    resp = requests.post(
        f"{MIMO_BASE_URL}/chat/completions",
        headers={
            'Authorization': f'Bearer {MIMO_API_KEY}',
            'Content-Type': 'application/json',
        },
        json={
            'model': MIMO_MODEL,
            'messages': [{'role': 'user', 'content': prompt}],
            'temperature': 0.1,
            'max_tokens': 3000,
            'response_format': {'type': 'json_object'},
        },
    )
    resp.raise_for_status()
    data = resp.json()
    return json.loads(data['choices'][0]['message']['content'])

if __name__ == '__main__':
    print('=== 测试：解析招标文件评分标准 ===\n')

    # 1. 下载 PDF
    storage_path = '66/3ffa4b678c653a9b15365274235c49a6e49e323b.pdf'
    print(f'[1/3] 下载 PDF: {storage_path}')
    content = download_from_storage(storage_path)
    print(f'下载成功: {len(content) / 1024:.0f} KB')

    # 2. 提取文本
    print('\n[2/3] 提取 PDF 文本...')
    text = extract_text_from_pdf(content)
    print(f'提取文本长度: {len(text)} 字符')
    print(f'\n--- 文本预览 (前500字) ---')
    print(text[:500])

    # 3. AI 提取评分标准
    print('\n[3/3] AI 提取评分标准...')
    result = extract_scoring_criteria(text)

    print('\n=== 提取结果 ===\n')
    print(json.dumps(result, ensure_ascii=False, indent=2))
