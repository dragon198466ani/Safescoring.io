#!/usr/bin/env python3
"""
Generate 10,000 word summaries in ENGLISH from reliable sources.
Uses local documents (norm_docs/) as primary source.
"""
import os
import sys
import requests
from datetime import datetime
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY',
    'REVOKED_ROTATE_ON_DASHBOARD')

NORM_DOCS = Path(__file__).parent.parent / 'norm_docs'

def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }

def get_local_doc(code):
    """Get local documentation for a norm."""
    patterns = [f"{code}.html", f"{code}.txt", f"{code}.md",
                f"{code.replace('-','_')}.html", f"{code.replace('-','_')}.txt"]

    for p in patterns:
        path = NORM_DOCS / p
        if path.exists():
            try:
                content = path.read_text(encoding='utf-8', errors='ignore')
                if len(content) > 500:
                    return content[:50000]
            except:
                pass
    return None

def save_summary(norm_id, code, summary):
    """Save summary to Supabase."""
    date = datetime.now().strftime('%Y-%m-%d %H:%M UTC')
    full = f"# {code} - SafeScoring Summary\n**Updated:** {date}\n\n---\n\n{summary}"

    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}',
        headers=get_headers(),
        json={'summary': full, 'summary_status': 'ai_generated'}
    )
    return r.status_code in [200, 204]

def get_norms_to_process(limit=10):
    """Get norms needing summaries."""
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,description,pillar,official_link&or=(summary.is.null,summary.eq.)&order=code&limit={limit}',
        headers=get_headers()
    )
    return r.json() if r.status_code == 200 else []

def main():
    print("=" * 60)
    print("SAFESCORING - 10K WORD ENGLISH SUMMARIES")
    print("=" * 60)

    norms = get_norms_to_process(5)
    print(f"Found {len(norms)} norms to process")

    for n in norms:
        code = n['code']
        title = n['title']
        print(f"\n[{code}] {title}")

        # Check for local docs
        doc = get_local_doc(code)
        if doc:
            print(f"  Found local doc: {len(doc)} chars")
        else:
            print(f"  No local doc found")

        # For now, just print - actual AI generation would go here
        print(f"  Official link: {n.get('official_link', 'N/A')}")

if __name__ == "__main__":
    main()
