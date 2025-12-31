#!/usr/bin/env python3
"""Check for pillar mismatches in norms table"""
import requests

config = {}
with open('config/env_template_free.txt', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            config[key.strip()] = value.strip()

SUPABASE_URL = config.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title&order=code', headers=headers)
all_norms = r.json()

print('='*80)
print('NORMS PILLAR ASSIGNMENT CHECK')
print('='*80)

mismatches = []
for n in all_norms:
    code = n.get('code', '')
    pillar = n.get('pillar', '')

    if code and code[0] in ['S', 'A', 'F', 'E']:
        expected_pillar = code[0]
        if pillar != expected_pillar:
            mismatches.append({
                'code': code,
                'current': pillar,
                'expected': expected_pillar,
                'title': n.get('title', '')
            })

print(f'\nTotal norms: {len(all_norms)}')
print(f'Mismatches found: {len(mismatches)}')
print()

if mismatches:
    print(f"{'Code':10s} | {'Current':8s} | {'Expected':8s} | Title")
    print('-' * 80)
    for m in mismatches[:50]:
        title = m['title'][:40] if m['title'] else 'N/A'
        print(f"{m['code']:10s} | {m['current']:8s} | {m['expected']:8s} | {title}")
    if len(mismatches) > 50:
        print(f'... and {len(mismatches) - 50} more mismatches')
else:
    print('All norms have correct pillar assignments!')
