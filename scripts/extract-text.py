#!/usr/bin/env python3
"""
从 PDF/DOCX 提取文本（供 Node.js 调用）
用法: python3 extract-text.py <supabase_url> <service_key> <storage_path>
输出: 提取的文本到 stdout
"""
import sys, os, requests, zipfile, re
from io import BytesIO

def extract_pdf(content):
    from PyPDF2 import PdfReader
    reader = PdfReader(BytesIO(content))
    return ''.join(p.extract_text() or '' for p in reader.pages)

def extract_docx(content):
    z = zipfile.ZipFile(BytesIO(content))
    xml = z.read('word/document.xml').decode('utf-8')
    return re.sub(r'<[^>]+>', '', xml)

def main():
    supabase_url = sys.argv[1]
    service_key = sys.argv[2]
    storage_path = sys.argv[3]

    url = f"{supabase_url}/storage/v1/object/bid-documents/{storage_path}"
    r = requests.get(url, headers={'Authorization': f'Bearer {service_key}'})
    r.raise_for_status()
    content = r.content

    ext = storage_path.lower().split('.')[-1]
    if ext == 'pdf':
        text = extract_pdf(content)
    elif ext in ('docx', 'doc'):
        text = extract_docx(content)
    else:
        print(f"不支持的格式: {ext}", file=sys.stderr)
        sys.exit(1)

    print(text)

if __name__ == '__main__':
    main()
