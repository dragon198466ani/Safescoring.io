#!/usr/bin/env python3
"""Analyse des lacunes de normes par type de produit financier"""
import requests
from collections import defaultdict

from config_helper import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers

headers = get_supabase_headers()

# Types de produits qui manipulent l'argent
FINANCIAL_TYPES = [
    ('HW_WALLET', 'Hardware Wallet - Stockage froid'),
    ('SW_WALLET', 'Software Wallet - Stockage chaud'),
    ('CUSTODY', 'Custody - Garde institutionnelle'),
    ('CEX', 'Exchange Centralise'),
    ('DEX', 'Exchange Decentralise'),
    ('DEX_AGG', 'Agregateur DEX'),
    ('BRIDGE', 'Bridge Cross-chain'),
    ('LENDING', 'Protocole de Pret'),
    ('YIELD', 'Agregateur de Rendement'),
    ('STAKING', 'Service de Staking'),
    ('LIQUID_STAKING', 'Staking Liquide'),
    ('PERP_DEX', 'Futures Decentralises'),
    ('NFT_MARKET', 'Marketplace NFT'),
    ('PAYMENT', 'Passerelle de Paiement'),
    ('CARD', 'Carte Crypto'),
    ('BANK', 'Neo-Banque Crypto'),
]

def get_all_norms():
    all_norms = []
    offset = 0
    while True:
        resp = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=code,pillar,title,description&offset={offset}&limit=1000', headers=headers)
        if resp.status_code != 200: break
        batch = resp.json()
        if not batch: break
        all_norms.extend(batch)
        offset += 1000
        if len(batch) < 1000: break
    return all_norms

def get_products():
    resp = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=name,type', headers=headers)
    return resp.json() if resp.status_code == 200 else []

def count_norms_for_type(norms, product_type):
    """Compte les normes specifiques a un type"""
    counts = {'S': 0, 'A': 0, 'F': 0, 'E': 0}
    keywords = product_type.lower().replace('_', ' ').split()

    for norm in norms:
        text = f"{norm['code']} {norm['title']} {norm.get('description', '')}".lower()
        # Verification plus souple
        if any(kw in text for kw in keywords if len(kw) > 2):
            counts[norm['pillar']] += 1
    return counts

print('=' * 80)
print('ANALYSE DES LACUNES DE NORMES - PRODUITS FINANCIERS')
print('=' * 80)

norms = get_all_norms()
products = get_products()

print(f'\nTotal normes: {len(norms)}')
print(f'Total produits: {len(products)}')

# Compter par pilier
pillar_counts = defaultdict(int)
for n in norms:
    pillar_counts[n['pillar']] += 1

print(f'\nRepartition par pilier:')
for p in ['S', 'A', 'F', 'E']:
    print(f'  {p}: {pillar_counts[p]} normes')

# Analyser chaque type financier
print(f'\n{"="*80}')
print('COUVERTURE PAR TYPE DE PRODUIT:')
print(f'{"="*80}')

gaps = []

for ptype, desc in FINANCIAL_TYPES:
    counts = count_norms_for_type(norms, ptype)
    total = sum(counts.values())

    # Identifier les lacunes
    missing = []
    if counts['S'] < 5: missing.append(f"S:{counts['S']}<5")
    if counts['A'] < 3: missing.append(f"A:{counts['A']}<3")
    if counts['F'] < 3: missing.append(f"F:{counts['F']}<3")
    if counts['E'] < 3: missing.append(f"E:{counts['E']}<3")

    status = "INSUFFISANT" if missing else "OK"
    print(f'\n{ptype:15} | S:{counts["S"]:3} A:{counts["A"]:3} F:{counts["F"]:3} E:{counts["E"]:3} | Total:{total:3} | {status}')
    print(f'  {desc}')
    if missing:
        print(f'  LACUNES: {", ".join(missing)}')
        gaps.append((ptype, desc, counts, missing))

print(f'\n{"="*80}')
print('TYPES AVEC LACUNES CRITIQUES:')
print(f'{"="*80}')

for ptype, desc, counts, missing in gaps:
    print(f'\n{ptype}: {desc}')
    print(f'  Actuel: S={counts["S"]}, A={counts["A"]}, F={counts["F"]}, E={counts["E"]}')
    print(f'  Manque: {", ".join(missing)}')
