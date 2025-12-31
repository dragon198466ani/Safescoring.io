#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAFESCORING.IO - Mise à jour norm_applicability pour normes F software
Applique les nouvelles normes F200-F204 aux types de produits software
"""

import requests
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Load config
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
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

print("="*80)
print("MISE À JOUR NORM_APPLICABILITY - NORMES F SOFTWARE")
print("="*80)
print()

# Get F200-F204 norm IDs
print("📊 Chargement des nouvelles normes F...")
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/norms?code=in.(F200,F201,F202,F203,F204)&select=id,code,title",
    headers=headers
)

if r.status_code != 200:
    print(f"❌ Erreur chargement normes: {r.status_code}")
    sys.exit(1)

f_norms = r.json()
f_norms_by_code = {n['code']: n for n in f_norms}

print(f"✅ {len(f_norms)} normes F software trouvées")
for norm in f_norms:
    print(f"   {norm['code']:6s} (ID {norm['id']:4d}) | {norm['title']}")
print()

# Get all product types
print("📊 Chargement des types de produits...")
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name_fr,category",
    headers=headers
)

if r.status_code != 200:
    print(f"❌ Erreur chargement types: {r.status_code}")
    print(f"   Détails: {r.text[:200]}")
    sys.exit(1)

product_types = r.json()
print(f"✅ {len(product_types)} types de produits trouvés")
print()

# Define which types should have F software norms applicable
# SOFTWARE TYPES = applicable (codes start with SW, DEX, CEX, DeFi, etc.)
# HARDWARE TYPES = N/A (codes start with HW, Bkp Physical, etc.)

# Use CODE patterns for classification (more reliable than names)
SOFTWARE_CODE_PATTERNS = ['SW', 'DEX', 'CEX', 'DeFi', 'Liq', 'Derivatives', 'Lending', 'Staking']
HARDWARE_CODE_PATTERNS = ['HW', 'Bkp Physical']

print("="*80)
print("CLASSIFICATION DES TYPES DE PRODUITS")
print("="*80)
print()

software_type_ids = []
hardware_type_ids = []
mixed_type_ids = []

for ptype in product_types:
    code = ptype.get('code', '')
    name = ptype.get('name_fr', ptype.get('code', 'Unknown'))

    if any(code.startswith(pattern) for pattern in SOFTWARE_CODE_PATTERNS):
        software_type_ids.append(ptype['id'])
        print(f"✅ SOFTWARE: {ptype['id']:3d} | {code:20s} | {name}")
    elif any(code.startswith(pattern) for pattern in HARDWARE_CODE_PATTERNS):
        hardware_type_ids.append(ptype['id'])
        print(f"🔧 HARDWARE: {ptype['id']:3d} | {code:20s} | {name}")
    else:
        mixed_type_ids.append(ptype['id'])
        print(f"❓ MIXED:    {ptype['id']:3d} | {code:20s} | {name} (default=software)")

print()
print(f"Software types: {len(software_type_ids)}")
print(f"Hardware types: {len(hardware_type_ids)}")
print(f"Mixed/Unknown: {len(mixed_type_ids)}")
print()

# For mixed types, apply software norms by default (more inclusive)
software_type_ids.extend(mixed_type_ids)

print("="*80)
print("CRÉATION DES RÈGLES NORM_APPLICABILITY")
print("="*80)
print()

# Create norm_applicability records
records_to_create = []

# For SOFTWARE types: F200-F204 = APPLICABLE
for type_id in software_type_ids:
    for norm_code in ['F200', 'F201', 'F202', 'F203', 'F204']:
        if norm_code in f_norms_by_code:
            records_to_create.append({
                'type_id': type_id,
                'norm_id': f_norms_by_code[norm_code]['id'],
                'is_applicable': True
            })

# For HARDWARE types: F200-F204 = NOT APPLICABLE
for type_id in hardware_type_ids:
    for norm_code in ['F200', 'F201', 'F202', 'F203', 'F204']:
        if norm_code in f_norms_by_code:
            records_to_create.append({
                'type_id': type_id,
                'norm_id': f_norms_by_code[norm_code]['id'],
                'is_applicable': False
            })

print(f"Total règles à créer: {len(records_to_create)}")
print(f"  - SOFTWARE (applicable): {len(software_type_ids) * 5}")
print(f"  - HARDWARE (N/A): {len(hardware_type_ids) * 5}")
print()

# Insert in batches (Supabase limit)
BATCH_SIZE = 100
success_count = 0
error_count = 0

for i in range(0, len(records_to_create), BATCH_SIZE):
    batch = records_to_create[i:i+BATCH_SIZE]

    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/norm_applicability",
        headers=headers,
        json=batch
    )

    if r.status_code in [200, 201, 204]:
        success_count += len(batch)
        print(f"✅ Batch {i//BATCH_SIZE + 1}: {len(batch)} règles créées")
    else:
        error_count += len(batch)
        print(f"❌ Batch {i//BATCH_SIZE + 1} ERROR: {r.status_code}")
        if r.text:
            print(f"   {r.text[:200]}")

print()
print("="*80)
print("RÉSUMÉ")
print("="*80)
print()
print(f"✅ Succès: {success_count}/{len(records_to_create)}")
print(f"❌ Erreurs: {error_count}")
print()

if success_count > 0:
    print("🎯 IMPACT:")
    print()
    print(f"   Les normes F200-F204 sont maintenant:")
    print(f"   - ✅ APPLICABLES pour {len(software_type_ids)} types software")
    print(f"   - ❌ N/A pour {len(hardware_type_ids)} types hardware")
    print()

    # Show example for DEX
    dex_type = next((pt for pt in product_types if pt['name'] == 'DEX'), None)
    if dex_type:
        print(f"   Exemple pour DEX (type_id={dex_type['id']}):")

        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{dex_type['id']}&select=norm_id,is_applicable&limit=1000",
            headers=headers
        )

        if r.status_code == 200:
            dex_applicability = r.json()
            applicable_count = sum(1 for a in dex_applicability if a['is_applicable'])
            na_count = sum(1 for a in dex_applicability if not a['is_applicable'])

            print(f"   - Total normes applicables: {applicable_count}")
            print(f"   - Total normes N/A: {na_count}")
            print(f"   - Total: {len(dex_applicability)}")

print()
print("="*80)
print("✅ MISE À JOUR TERMINÉE")
print("="*80)
print()
print("📋 PROCHAINES ÉTAPES:")
print("   1. Créer le guide d'évaluation détaillé")
print("   2. Tester sur produits pilotes (1inch, MetaMask)")
print("   3. Valider cohérence des scores")
print("   4. Lancer ré-évaluation complète")
print()
