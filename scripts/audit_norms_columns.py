#!/usr/bin/env python3
"""Audit all norms to find missing column values"""
import requests

from config_helper import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers

headers = get_supabase_headers()

# Get all norms
all_norms = []
offset = 0
limit = 1000

while True:
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/norms?select=*&offset={offset}&limit={limit}',
        headers=headers
    )
    if resp.status_code != 200:
        print(f'Error: {resp.status_code}')
        break

    batch = resp.json()
    if not batch:
        break

    all_norms.extend(batch)
    offset += limit
    if len(batch) < limit:
        break

print(f'Total normes: {len(all_norms)}')
print('=' * 70)

# Columns to check
columns_to_check = [
    'is_essential',
    'consumer',
    'full',
    'classification_method',
    'classification_date',
    'official_doc_summary',
    'crypto_relevance',
    'geographic_scope',
    'scope_type',
    'access_type',
    'official_link',
    'issuing_authority',
    'standard_reference'
]

# Count missing values per column
missing_counts = {col: 0 for col in columns_to_check}
missing_by_pillar = {'S': {}, 'A': {}, 'F': {}, 'E': {}}

for norm in all_norms:
    pillar = norm.get('pillar', 'S')
    if pillar not in missing_by_pillar:
        missing_by_pillar[pillar] = {}

    for col in columns_to_check:
        if norm.get(col) is None:
            missing_counts[col] += 1
            missing_by_pillar[pillar][col] = missing_by_pillar[pillar].get(col, 0) + 1

print('COLONNES MANQUANTES (NULL):')
print('-' * 70)
for col, count in sorted(missing_counts.items(), key=lambda x: -x[1]):
    pct = count / len(all_norms) * 100
    print(f'{col:25} | {count:5} / {len(all_norms)} ({pct:5.1f}%)')

print()
print('PAR PILIER:')
print('-' * 70)
for pillar in ['S', 'A', 'F', 'E']:
    norms_in_pillar = len([n for n in all_norms if n.get('pillar') == pillar])
    print(f'\n{pillar} ({norms_in_pillar} normes):')
    for col, count in sorted(missing_by_pillar.get(pillar, {}).items(), key=lambda x: -x[1]):
        print(f'  {col:23} | {count}')

# Sample norms with missing data
print()
print('EXEMPLES DE NORMES AVEC DONNEES MANQUANTES:')
print('-' * 70)
sample_count = 0
for norm in all_norms:
    missing = [col for col in columns_to_check if norm.get(col) is None]
    if len(missing) >= 5 and sample_count < 10:
        print(f'{norm["code"]} ({norm["pillar"]}): {len(missing)} colonnes NULL')
        print(f'  Manquant: {", ".join(missing[:5])}...')
        sample_count += 1
