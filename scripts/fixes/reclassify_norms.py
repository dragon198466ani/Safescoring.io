#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAFESCORING.IO - Reclassification des normes SAFE
Reclassifie les normes mal catégorisées pour améliorer la cohérence
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
print("RECLASSIFICATION DES NORMES SAFE")
print("="*80)
print()

# Get all norms
print("📊 Chargement des normes...")
r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title', headers=headers)
if r.status_code != 200:
    print(f"❌ Erreur chargement normes: {r.status_code}")
    sys.exit(1)

norms = r.json()
norms_by_code = {n['code']: n for n in norms}

print(f"✅ {len(norms)} normes chargées")
print()

# Define reclassifications
reclassifications = [
    # S → A (Protection adversariale)
    {
        'code': 'S169',
        'old_pillar': 'S',
        'new_pillar': 'A',
        'reason': 'Reentrancy Protection - Protection contre attaque adversariale'
    },
    {
        'code': 'S220',
        'old_pillar': 'S',
        'new_pillar': 'A',
        'reason': 'Rug Pull Protection - Protection contre fraude adversariale'
    },
    {
        'code': 'S222',
        'old_pillar': 'S',
        'new_pillar': 'A',
        'reason': 'Phishing Protection - Protection contre manipulation sociale'
    },
    {
        'code': 'S276',
        'old_pillar': 'S',
        'new_pillar': 'A',
        'reason': 'Light Attack Detection - Détection d\'attaque adversariale'
    },

    # A → S (Sécurité crypto/technique)
    {
        'code': 'A145',
        'old_pillar': 'A',
        'new_pillar': 'S',
        'reason': 'MEV Protection - Sécurité crypto-économique technique'
    },
    {
        'code': 'A21',
        'old_pillar': 'A',
        'new_pillar': 'S',
        'reason': 'CLTV CheckLockTimeVerify - Primitive cryptographique Bitcoin'
    },
    {
        'code': 'A53',
        'old_pillar': 'A',
        'new_pillar': 'S',
        'reason': 'Cryptographic erase - Technique cryptographique'
    },
]

print("="*80)
print("RECLASSIFICATIONS À EFFECTUER")
print("="*80)
print()

# Verify all norms exist
missing = []
for item in reclassifications:
    if item['code'] not in norms_by_code:
        missing.append(item['code'])

if missing:
    print(f"❌ Normes manquantes: {', '.join(missing)}")
    sys.exit(1)

# Display summary
print(f"Total: {len(reclassifications)} normes à reclassifier")
print()

s_to_a = [r for r in reclassifications if r['old_pillar'] == 'S' and r['new_pillar'] == 'A']
a_to_s = [r for r in reclassifications if r['old_pillar'] == 'A' and r['new_pillar'] == 'S']

print(f"📊 S → A: {len(s_to_a)} normes")
for item in s_to_a:
    norm = norms_by_code[item['code']]
    print(f"   {item['code']:6s} | {norm['title'][:60]}")

print()
print(f"📊 A → S: {len(a_to_s)} normes")
for item in a_to_s:
    norm = norms_by_code[item['code']]
    print(f"   {item['code']:6s} | {norm['title'][:60]}")

print()
print("="*80)
print("EXÉCUTION DES RECLASSIFICATIONS")
print("="*80)
print()

# Execute reclassifications
success_count = 0
error_count = 0

for item in reclassifications:
    norm = norms_by_code[item['code']]

    # Verify current pillar
    if norm['pillar'] != item['old_pillar']:
        print(f"⚠️  {item['code']} - Pilier actuel: {norm['pillar']} (attendu: {item['old_pillar']}) - SKIP")
        continue

    # Update norm
    update_data = {'pillar': item['new_pillar']}

    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm['id']}",
        headers=headers,
        json=update_data
    )

    if r.status_code in [200, 204]:
        print(f"✅ {item['code']} | {item['old_pillar']} → {item['new_pillar']} | {norm['title'][:50]}")
        success_count += 1
    else:
        print(f"❌ {item['code']} - Erreur {r.status_code}: {r.text[:100]}")
        error_count += 1

print()
print("="*80)
print("RÉSUMÉ")
print("="*80)
print()
print(f"✅ Succès: {success_count}/{len(reclassifications)}")
print(f"❌ Erreurs: {error_count}")
print()

if success_count > 0:
    print("🎯 IMPACT SUR LA DISTRIBUTION:")
    print()

    # Recalculate distribution
    r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=pillar', headers=headers)
    updated_norms = r.json()

    from collections import Counter
    pillar_counts = Counter(n['pillar'] for n in updated_norms)

    print(f"   S (Security):           {pillar_counts.get('S', 0):3d} normes")
    print(f"   A (Adversity):          {pillar_counts.get('A', 0):3d} normes")
    print(f"   F (Fidelity):           {pillar_counts.get('F', 0):3d} normes")
    print(f"   E (Efficiency):         {pillar_counts.get('E', 0):3d} normes")
    print(f"   Total:                  {sum(pillar_counts.values()):3d} normes")
    print()

print("="*80)
print("✅ RECLASSIFICATION TERMINÉE")
print("="*80)
print()
print("📋 PROCHAINES ÉTAPES:")
print("   1. Vérifier les changements dans Supabase")
print("   2. Mettre à jour norm_applicability si nécessaire")
print("   3. Créer les critères F pour software")
print("   4. Lancer la ré-évaluation des produits")
print()
