#!/usr/bin/env python3
import requests
import sys
import os
import re
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.core.config import SUPABASE_URL, get_supabase_headers

NORM_DOCS_DIR = 'norm_docs'
NORM_PDFS_DIR = 'norm_pdfs'

def sanitize_code(code):
    return re.sub(r'[<>:"/\\|?*]', '_', code)[:100]

def find_document_for_norm(code):
    safe_code = sanitize_code(code)
    html_path = os.path.join(NORM_DOCS_DIR, f'{safe_code}.html')
    if os.path.exists(html_path):
        return ('html', html_path)
    pdf_path = os.path.join(NORM_PDFS_DIR, f'{safe_code}.pdf')
    if os.path.exists(pdf_path):
        return ('pdf', pdf_path)
    return (None, None)

headers = get_supabase_headers()

# Fetch all norms with pagination
all_norms = []
for offset in range(0, 2000, 500):
    url = f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,official_doc_summary&limit=500&offset={offset}'
    try:
        r = requests.get(url, headers=headers, timeout=30)
        if r.status_code != 200:
            print(f'Error at offset {offset}: {r.status_code}')
            continue
        batch = r.json()
        if not batch:
            break
        all_norms.extend(batch)
        print(f'Fetched {len(batch)} at offset {offset}, total: {len(all_norms)}')
    except Exception as e:
        print(f'Exception at offset {offset}: {e}')

print(f'\nTotal: {len(all_norms)} norms')

# Find unverified with downloaded docs
to_process = []
for norm in all_norms:
    summary = norm.get('official_doc_summary', '') or ''
    if 'UNVERIFIED SUMMARY' in summary:
        doc_type, doc_path = find_document_for_norm(norm['code'])
        if doc_type:
            to_process.append((norm['code'], doc_type, os.path.basename(doc_path)))

print(f'Unverified with docs: {len(to_process)}')
for code, t, p in to_process[:15]:
    print(f'  {code}: {t} - {p}')
