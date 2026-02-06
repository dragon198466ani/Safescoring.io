#!/usr/bin/env python3
"""Liste toutes les normes TBD pour Glacier Protocol"""

import requests

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'REVOKED_ROTATE_ON_DASHBOARD'

headers = {'apikey': SUPABASE_KEY}

# Récupérer les évaluations TBD de Glacier (product_id=315)
r = requests.get(f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.315&result=eq.TBD&select=norm_id', headers=headers)
tbd_norm_ids = [e['norm_id'] for e in r.json()]

# Récupérer les détails des normes
r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,description', headers=headers)
norms = {n['id']: n for n in r.json()}

print('='*80)
print(f'NORMES TBD POUR GLACIER PROTOCOL ({len(tbd_norm_ids)} normes)')
print('='*80)

# Grouper par pilier
by_pillar = {'S': [], 'A': [], 'F': [], 'E': []}
for nid in tbd_norm_ids:
    norm = norms.get(nid)
    if norm:
        by_pillar[norm['pillar']].append(norm)

for pillar in ['S', 'A', 'F', 'E']:
    norms_list = by_pillar[pillar]
    if norms_list:
        print(f'\n{"="*80}')
        print(f'PILIER {pillar} ({len(norms_list)} TBD)')
        print(f'{"="*80}')
        for n in sorted(norms_list, key=lambda x: x['code']):
            desc = (n.get('description') or 'Pas de description')[:60]
            print(f"\n  {n['code']}: {n['title']}")
            print(f"     → {desc}...")

# Analyse des causes de TBD
print('\n' + '='*80)
print('ANALYSE DES CAUSES DE TBD')
print('='*80)

categories = {
    'Standards récents (post-2017)': ['BIP-85', 'BIP-352', 'BIP-370', 'BIP-380', 'BIP-381', 'BIP-327', 'BIP-388', 'SLIP-39', 'MuSig2', 'Taproot', 'Miniscript'],
    'Privacy avancée': ['Silent Payment', 'CoinJoin', 'Confidential', 'Mixer', 'Ring'],
    'Multi-chain/Altcoins': ['Ethereum', 'EIP', 'Solana', 'Cardano', 'Cosmos'],
    'Hardware spécifique': ['Secure Element', 'HSM', 'TPM', 'Chip'],
    'Documentation manquante': []
}

for cat, keywords in categories.items():
    matching = []
    for nid in tbd_norm_ids:
        norm = norms.get(nid)
        if norm:
            text = f"{norm['title']} {norm.get('description', '')}".lower()
            for kw in keywords:
                if kw.lower() in text:
                    matching.append(norm['code'])
                    break
    if matching:
        print(f"\n{cat}:")
        print(f"   {', '.join(matching[:10])}")
