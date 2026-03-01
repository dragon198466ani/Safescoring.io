#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Deep audit of ALL SafeScoring database tables:
- Norms: titles, descriptions, pillar, codes, duplicates, French text
- Product types: definitions, codes, metadata, flags
- Products: HQ, URL, descriptions, types, duplicates
- Applicability: completeness and spot-check
"""
import sys, os, re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
from config import SUPABASE_URL, SUPABASE_KEY
import requests
from collections import Counter

HR = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json'}
BASE = SUPABASE_URL + '/rest/v1'

out = []
def p(s=''):
    out.append(s)
    try:
        print(s)
    except UnicodeEncodeError:
        print(s.encode('ascii', 'replace').decode())

def load_all(table, select='*', filters=''):
    items = []
    offset = 0
    while True:
        r = requests.get(f'{BASE}/{table}?select={select}&order=id&limit=1000&offset={offset}{filters}', headers=HR)
        batch = r.json()
        if not batch:
            break
        items.extend(batch)
        offset += 1000
    return items

# French detection patterns (truly French words, not English)
FRENCH_PATTERNS = [
    r'\bD[eE]centralis[eE]\b', r'\b[eE]valuati?on\b.*\b(des|du|de la)\b',
    r'\bSuisse\b', r'\bAllemagne\b', r'\bPays-Bas\b', r'\bBelgique\b',
    r'\bNorv[eE]ge\b', r'\bPologne\b', r'\bSingapour\b', r'\bChine(?!\s*se)\b',
    r'\b[eE]quipement\b', r'\bS[eE]curit[eE]\b', r'\bConformit[eE]\b',
    r'\bV[eE]rification\b', r'\b[eE]valuation\b', r'\bProtection\b.*\bdes\b',
    r'\bGestion\b', r'\bStockage\b', r'\bAccess?ibilit[eE]\b',
    r'\bUtilisateur\b', r'\bFournisseur\b', r'\bDisponibilit[eE]\b',
    r'\bMise [aA] jour\b', r'\bContr[oO]le\b.*\bacc[eE]s\b',
    r'\bExigences?\b', r'\bR[eE]glementaire\b', r'\bTransparence\b',
    r'\bInfrastructure\b.*\bde\b.*\bs[eE]curit[eE]\b',
    r'\bsans\b', r'\bpour\b.*\b(les|des|la)\b', r'\bou\b.*\b(les|des|la)\b',
    r'\bdes\s+(?:fonds|donn[eE]es|utilisateurs|actifs)\b',
    r'\bdu\s+(?:protocole|syst[eE]me|r[eE]seau)\b',
]

def has_french(text):
    if not text:
        return False
    for pat in FRENCH_PATTERNS:
        if re.search(pat, text):
            return True
    return False

# ================================================================
p('=' * 75)
p('  DEEP AUDIT - ALL DATABASE TABLES')
p('=' * 75)

# ================================================================
# 1. NORMS
# ================================================================
p('\n' + '=' * 75)
p('[1] NORMS AUDIT')
p('=' * 75)

norms = load_all('norms', 'id,code,title,description,pillar,chapter_id')
p(f'\n  Total norms: {len(norms)}')

# Check pillar distribution
pillar_counts = Counter(n.get('pillar') for n in norms)
for pillar in ['S', 'A', 'F', 'E']:
    p(f'  Pillar {pillar}: {pillar_counts.get(pillar, 0)} norms')

# Check for missing/bad pillar
bad_pillar = [n for n in norms if n.get('pillar') not in ('S', 'A', 'F', 'E')]
p(f'  Bad pillar value: {len(bad_pillar)}')
for n in bad_pillar[:5]:
    p(f'    [{n["id"]}] {n["code"]} pillar={n.get("pillar")}')

# Missing fields
no_title = [n for n in norms if not n.get('title')]
no_desc = [n for n in norms if not n.get('description')]
no_code = [n for n in norms if not n.get('code')]
p(f'  Missing title: {len(no_title)}')
p(f'  Missing description: {len(no_desc)}')
p(f'  Missing code: {len(no_code)}')

# Duplicate codes
code_counts = Counter(n.get('code') for n in norms)
dupes = [(code, cnt) for code, cnt in code_counts.items() if cnt > 1]
p(f'  Duplicate codes: {len(dupes)}')
for code, cnt in dupes[:10]:
    p(f'    "{code}" x {cnt}')

# French text in norms
french_norms = []
for n in norms:
    for field in ['title', 'description']:
        val = n.get(field) or ''
        if has_french(val):
            french_norms.append((n['id'], n['code'], field, val[:80]))
            break

p(f'  Norms with French text: {len(french_norms)}')
for nid, code, field, val in french_norms[:10]:
    p(f'    [{nid}] {code} ({field}): {val}...')

# Very short descriptions (potential placeholders)
short_desc = [n for n in norms if n.get('description') and len(n['description']) < 20]
p(f'  Very short descriptions (<20 chars): {len(short_desc)}')
for n in short_desc[:5]:
    p(f'    [{n["id"]}] {n["code"]}: "{n["description"]}"')

# Check code format consistency
code_formats = Counter()
for n in norms:
    code = n.get('code') or ''
    match = re.match(r'^([A-Z]+)-', code)
    if match:
        code_formats[match.group(1)] += 1
    else:
        code_formats['OTHER'] += 1

p(f'  Code prefixes:')
for prefix, cnt in code_formats.most_common(10):
    p(f'    {prefix}: {cnt}')

# ================================================================
# 2. PRODUCT TYPES
# ================================================================
p('\n' + '=' * 75)
p('[2] PRODUCT TYPES AUDIT')
p('=' * 75)

types = load_all('product_types', '*')
p(f'\n  Total types: {len(types)}')

# Check required fields
no_name = [t for t in types if not t.get('name')]
no_code = [t for t in types if not t.get('code')]
no_def = [t for t in types if not t.get('definition')]
no_desc = [t for t in types if not t.get('description')]
no_eval = [t for t in types if not t.get('evaluation_focus')]

p(f'  Missing name: {len(no_name)}')
p(f'  Missing code: {len(no_code)}')
p(f'  Missing definition: {len(no_def)}')
p(f'  Missing description: {len(no_desc)}')
p(f'  Missing evaluation_focus: {len(no_eval)}')

for t in no_desc[:3]:
    p(f'    [{t["id"]}] {t.get("name")} has no description')
for t in no_eval[:3]:
    p(f'    [{t["id"]}] {t.get("name")} has no evaluation_focus')

# Check flags consistency
flag_issues = []
for t in types:
    tid = t['id']
    name = t.get('name', '')
    is_hw = t.get('is_hardware', False)
    is_wallet = t.get('is_wallet', False)
    is_defi = t.get('is_defi', False)

    # HW wallets should have is_hardware=True
    if tid == 1 and not is_hw:
        flag_issues.append(f'  [{tid}] {name}: is_hardware should be True')
    # Software wallets should have is_wallet=True
    if tid in (2, 3, 4, 5, 6, 7) and not is_wallet:
        flag_issues.append(f'  [{tid}] {name}: is_wallet should be True')
    # DeFi protocols should have is_defi=True
    if tid in (11, 15, 16, 17, 18, 19, 25, 29, 30) and not is_defi:
        flag_issues.append(f'  [{tid}] {name}: is_defi should be True')

p(f'  Flag inconsistencies: {len(flag_issues)}')
for issue in flag_issues[:10]:
    p(f'    {issue}')

# Check pillar_weights
no_weights = [t for t in types if not t.get('pillar_weights')]
p(f'  Missing pillar_weights: {len(no_weights)}')
for t in no_weights[:5]:
    p(f'    [{t["id"]}] {t.get("name")}')

# Check risk_factors
no_risks = [t for t in types if not t.get('risk_factors')]
p(f'  Missing risk_factors: {len(no_risks)}')
for t in no_risks[:5]:
    p(f'    [{t["id"]}] {t.get("name")}')

# French text in type fields
french_types = []
for t in types:
    for field in ['name', 'definition', 'description', 'evaluation_focus']:
        val = t.get(field) or ''
        if has_french(val):
            french_types.append((t['id'], t.get('name'), field, val[:80]))
            break

p(f'  Types with French text: {len(french_types)}')
for tid, name, field, val in french_types[:10]:
    p(f'    [{tid}] {name} ({field}): {val}...')

# Duplicate type names
type_name_counts = Counter(t.get('name') for t in types)
type_dupes = [(name, cnt) for name, cnt in type_name_counts.items() if cnt > 1]
p(f'  Duplicate type names: {len(type_dupes)}')
for name, cnt in type_dupes:
    p(f'    "{name}" x {cnt}')

# ================================================================
# 3. PRODUCTS (deep check)
# ================================================================
p('\n' + '=' * 75)
p('[3] PRODUCTS DEEP AUDIT')
p('=' * 75)

prods = load_all('products', 'id,name,slug,url,type_id,headquarters,description,short_description,is_active', '&is_active=eq.true')
type_map = {t['id']: t for t in types}
p(f'\n  Active products: {len(prods)}')

# Check for missing HQ
no_hq = [p2 for p2 in prods if not p2.get('headquarters') or p2['headquarters'] in ('None', 'null')]
p(f'  Missing/null HQ: {len(no_hq)}')
for p2 in no_hq[:10]:
    p(f'    [{p2["id"]}] {p2["name"]} (type={type_map.get(p2.get("type_id"),{}).get("name","?")})')

# Duplicate names
name_counts = Counter(p2['name'] for p2 in prods)
name_dupes = [(name, cnt) for name, cnt in name_counts.items() if cnt > 1]
p(f'  Duplicate product names: {len(name_dupes)}')
for name, cnt in name_dupes[:10]:
    dups = [p2 for p2 in prods if p2['name'] == name]
    ids = [f'{d["id"]}(t={d.get("type_id")})' for d in dups]
    p(f'    "{name}" x {cnt}: {", ".join(ids)}')

# Duplicate URLs
url_counts = Counter(p2.get('url') for p2 in prods if p2.get('url'))
url_dupes = [(url, cnt) for url, cnt in url_counts.items() if cnt > 1]
p(f'  Duplicate URLs: {len(url_dupes)}')
for url, cnt in url_dupes[:15]:
    dups = [p2 for p2 in prods if p2.get('url') == url]
    ids_info = [f'{d["id"]}/{d["name"]}(t={d.get("type_id")})' for d in dups]
    p(f'    {url} x {cnt}: {", ".join(ids_info)}')

# Products with very short descriptions
short_prod_desc = [p2 for p2 in prods if p2.get('description') and len(p2['description']) < 30]
p(f'  Very short descriptions (<30 chars): {len(short_prod_desc)}')
for p2 in short_prod_desc[:5]:
    p(f'    [{p2["id"]}] {p2["name"]}: "{p2["description"]}"')

# Products with French text in fields
french_prods = []
for p2 in prods:
    for field in ['headquarters', 'description']:
        val = p2.get(field) or ''
        if has_french(val):
            french_prods.append((p2['id'], p2['name'], field, val[:80]))
            break

p(f'  Products with French text: {len(french_prods)}')
for pid, name, field, val in french_prods[:10]:
    p(f'    [{pid}] {name} ({field}): {val}...')

# ================================================================
# 4. CHAPTERS
# ================================================================
p('\n' + '=' * 75)
p('[4] CHAPTERS / SCORING DEFINITIONS')
p('=' * 75)

try:
    chapters = load_all('chapters', 'id,pillar,code,title,description')
    p(f'\n  Total chapters: {len(chapters)}')

    ch_pillars = Counter(c.get('pillar') for c in chapters)
    for pillar in ['S', 'A', 'F', 'E']:
        p(f'  Pillar {pillar}: {ch_pillars.get(pillar, 0)} chapters')

    no_title = [c for c in chapters if not c.get('title')]
    no_desc = [c for c in chapters if not c.get('description')]
    p(f'  Missing title: {len(no_title)}')
    p(f'  Missing description: {len(no_desc)}')

    # French text in chapters
    french_ch = []
    for c in chapters:
        for field in ['title', 'description']:
            val = c.get(field) or ''
            if has_french(val):
                french_ch.append((c['id'], c.get('code'), field, val[:80]))
                break
    p(f'  Chapters with French text: {len(french_ch)}')
    for cid, code, field, val in french_ch[:10]:
        p(f'    [{cid}] {code} ({field}): {val}...')

except Exception as e:
    p(f'  Chapters table error: {e}')

# ================================================================
# 5. SCORING DEFINITIONS
# ================================================================
p('\n' + '=' * 75)
p('[5] SCORING DEFINITIONS')
p('=' * 75)

try:
    sdefs = load_all('scoring_definitions', 'id,norm_id,yes_criteria,no_criteria,na_criteria')
    p(f'\n  Total scoring definitions: {len(sdefs)}')

    no_yes = [s for s in sdefs if not s.get('yes_criteria')]
    no_no = [s for s in sdefs if not s.get('no_criteria')]
    p(f'  Missing yes_criteria: {len(no_yes)}')
    p(f'  Missing no_criteria: {len(no_no)}')

    # French text
    french_sd = []
    for s in sdefs:
        for field in ['yes_criteria', 'no_criteria', 'na_criteria']:
            val = s.get(field) or ''
            if has_french(val):
                french_sd.append((s['id'], s.get('norm_id'), field, val[:80]))
                break
    p(f'  Scoring defs with French text: {len(french_sd)}')
    for sid, nid, field, val in french_sd[:5]:
        p(f'    [{sid}] norm={nid} ({field}): {val}...')

except Exception as e:
    p(f'  Scoring definitions table: {e}')

# ================================================================
# 6. SUMMARY
# ================================================================
p('\n' + '=' * 75)
p('  SUMMARY')
p('=' * 75)
p(f'  Norms: {len(norms)} total, {len(french_norms)} French, {len(dupes)} duplicate codes')
p(f'  Types: {len(types)} total, {len(french_types)} French, {len(no_weights)} no weights, {len(no_risks)} no risks')
p(f'  Products: {len(prods)} active, {len(no_hq)} no HQ, {len(name_dupes)} dup names, {len(url_dupes)} dup URLs')
p(f'  French text found: {len(french_norms)} norms + {len(french_types)} types + {len(french_prods)} products')

# Write to file
with open(os.path.join(os.path.dirname(__file__), 'deep_audit_output.txt'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('\nOutput saved to scripts/deep_audit_output.txt')
