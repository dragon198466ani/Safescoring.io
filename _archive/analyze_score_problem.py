#!/usr/bin/env python3
"""Analyze why Essential scores can be higher than Consumer scores."""

import requests

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'REVOKED_ROTATE_ON_DASHBOARD'

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
}

# Get 1inch Card
r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name&name=eq.1inch Card', headers=HEADERS)
product = r.json()[0]
pid = product['id']

print("=" * 70)
print(f"🔍 ANALYZING: {product['name']}")
print("=" * 70)

# Get norms
r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar', headers=HEADERS)
norms = {n['id']: n for n in r.json()}

# Get definitions
r = requests.get(f'{SUPABASE_URL}/rest/v1/safe_scoring_definitions?select=norm_id,is_essential,is_consumer', headers=HEADERS)
defs = {d['norm_id']: d for d in r.json()}

# Get evaluations
r = requests.get(f'{SUPABASE_URL}/rest/v1/evaluations?select=norm_id,result&product_id=eq.{pid}', headers=HEADERS)
evals = r.json()

# Analyze
essential_yes = 0
essential_no = 0
consumer_yes = 0
consumer_no = 0
full_yes = 0
full_no = 0

for e in evals:
    nid = e['norm_id']
    result = e['result']
    
    if result in ['N/A', 'TBD']:
        continue
    
    d = defs.get(nid, {})
    
    # Count for each category
    if d.get('is_essential'):
        if result in ['YES', 'YESp']:
            essential_yes += 1
        elif result == 'NO':
            essential_no += 1
    
    if d.get('is_consumer'):
        if result in ['YES', 'YESp']:
            consumer_yes += 1
        elif result == 'NO':
            consumer_no += 1
    
    # Full = all
    if result in ['YES', 'YESp']:
        full_yes += 1
    elif result == 'NO':
        full_no += 1

# Calculate scores
ess_score = essential_yes * 100 / (essential_yes + essential_no) if (essential_yes + essential_no) > 0 else 0
con_score = consumer_yes * 100 / (consumer_yes + consumer_no) if (consumer_yes + consumer_no) > 0 else 0
full_score = full_yes * 100 / (full_yes + full_no) if (full_yes + full_no) > 0 else 0

print(f"\nESSENTIAL:")
print(f"  Norms evaluated: {essential_yes + essential_no}")
print(f"  YES: {essential_yes}")
print(f"  NO: {essential_no}")
print(f"  Score: {ess_score:.1f}%")

print(f"\nCONSUMER:")
print(f"  Norms evaluated: {consumer_yes + consumer_no}")
print(f"  YES: {consumer_yes}")
print(f"  NO: {consumer_no}")
print(f"  Score: {con_score:.1f}%")

print(f"\nFULL:")
print(f"  Norms evaluated: {full_yes + full_no}")
print(f"  YES: {full_yes}")
print(f"  NO: {full_no}")
print(f"  Score: {full_score:.1f}%")

print("\n" + "=" * 70)
print("💡 EXPLICATION DU PROBLÈME")
print("=" * 70)

print(f"""
Le problème est que les scores sont calculés comme des POURCENTAGES INDÉPENDANTS:

- Essential: {essential_yes}/{essential_yes + essential_no} = {ess_score:.1f}%
- Consumer: {consumer_yes}/{consumer_yes + consumer_no} = {con_score:.1f}%

Même si Essential ⊂ Consumer (toutes les normes Essential sont aussi Consumer),
les POURCENTAGES peuvent être différents car les dénominateurs sont différents !

Exemple:
- Si Essential a 14 YES sur 15 normes = 93.3%
- Et Consumer a 100 YES sur 132 normes = 75.8%
- Alors Essential > Consumer même si Essential ⊂ Consumer !

SOLUTION:
Les scores Essential et Consumer doivent être calculés comme des SOUS-ENSEMBLES
du score Full, pas comme des pourcentages indépendants.
""")
