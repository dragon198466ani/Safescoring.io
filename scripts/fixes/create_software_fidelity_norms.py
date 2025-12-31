#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAFESCORING.IO - Création des normes F (Fidelity) pour software
Ajoute 5 nouvelles normes pour évaluer la fiabilité des produits logiciels
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
print("CRÉATION DES NORMES F (FIDELITY) POUR SOFTWARE")
print("="*80)
print()

# Define new software fidelity norms
new_norms = [
    {
        'code': 'F200',
        'pillar': 'F',
        'title': 'Uptime ≥99.9%',
        'description': 'Service availability of at least 99.9% (three nines) over the past 12 months. Demonstrates operational reliability and infrastructure quality.',
        'classification': 'consumer',
        'essential': False,
        'consumer': True,
        'full': True,
        'evaluation_criteria': {
            'YES': 'Documented uptime ≥99.9% (verified via status page or SLA)',
            'YESp': 'Uptime 99.5-99.9% OR claims without public verification',
            'NO': 'Uptime <99.5% OR no uptime data available',
            'N/A': 'Not applicable for client-side only software'
        }
    },
    {
        'code': 'F201',
        'pillar': 'F',
        'title': 'Security patches <7 days',
        'description': 'Critical security vulnerabilities are patched and deployed within 7 days of discovery or public disclosure. Demonstrates commitment to security maintenance.',
        'classification': 'essential',
        'essential': True,
        'consumer': True,
        'full': True,
        'evaluation_criteria': {
            'YES': 'Documented track record of critical patches <7 days',
            'YESp': 'Most patches <30 days OR no critical vulnerabilities disclosed',
            'NO': 'Patches >30 days OR unresolved critical vulnerabilities',
            'N/A': 'Not applicable for end-of-life or unmaintained software'
        }
    },
    {
        'code': 'F202',
        'pillar': 'F',
        'title': 'Professional security audit',
        'description': 'At least one professional third-party security audit by a recognized firm. Code quality verified through comprehensive testing (≥60% coverage for YES).',
        'classification': 'essential',
        'essential': True,
        'consumer': True,
        'full': True,
        'evaluation_criteria': {
            'YES': '≥2 professional audits + test coverage ≥80%',
            'YESp': '1 professional audit OR test coverage ≥60%',
            'NO': 'No professional audit and inadequate testing',
            'N/A': 'Not applicable for non-custodial or minimal code products'
        }
    },
    {
        'code': 'F203',
        'pillar': 'F',
        'title': 'LTS support ≥2 years',
        'description': 'Long-term support commitment of at least 2 years, including security updates, bug fixes, and compatibility maintenance.',
        'classification': 'consumer',
        'essential': False,
        'consumer': True,
        'full': True,
        'evaluation_criteria': {
            'YES': 'Formal LTS commitment ≥2 years with documented policy',
            'YESp': 'Active support without formal LTS OR 1-2 year commitment',
            'NO': 'No clear support commitment or end-of-life announced',
            'N/A': 'Not applicable for decentralized protocols without central maintenance'
        }
    },
    {
        'code': 'F204',
        'pillar': 'F',
        'title': 'Track record ≥2 years',
        'description': 'Product has been operational for at least 2 years without major unresolved security incidents. Demonstrates proven reliability and maturity.',
        'classification': 'consumer',
        'essential': False,
        'consumer': True,
        'full': True,
        'evaluation_criteria': {
            'YES': '≥2 years operational with no major unresolved incidents',
            'YESp': '1-2 years operational OR major incident resolved quickly (<30 days)',
            'NO': '<1 year OR major unresolved incidents OR pattern of security issues',
            'N/A': 'Not applicable for beta/experimental products (if clearly labeled)'
        }
    }
]

print("📊 Nouvelles normes à créer:")
print()
for norm in new_norms:
    essential_flag = "✅ ESSENTIAL" if norm['essential'] else "   consumer"
    print(f"  {norm['code']:6s} | {essential_flag} | {norm['title']}")

print()
print("="*80)
print("VÉRIFICATION DES CODES EXISTANTS")
print("="*80)
print()

# Check if codes already exist
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/norms?select=code&code=in.(F200,F201,F202,F203,F204)",
    headers=headers
)

existing_codes = [n['code'] for n in r.json()] if r.status_code == 200 else []

if existing_codes:
    print(f"⚠️  Codes déjà existants: {', '.join(existing_codes)}")
    print("   Ces normes seront MISES À JOUR (pas créées)")
    print()
else:
    print("✅ Aucun code existant - Création de nouvelles normes")
    print()

print("="*80)
print("CRÉATION DES NORMES")
print("="*80)
print()

# Create or update norms
success_count = 0
error_count = 0

for norm_data in new_norms:
    code = norm_data['code']

    # Prepare data for insertion
    insert_data = {
        'code': norm_data['code'],
        'pillar': norm_data['pillar'],
        'title': norm_data['title'],
        'description': norm_data['description'],
        'is_essential': norm_data['essential'],
        'consumer': norm_data['consumer'],
        'full': norm_data['full']
    }

    if code in existing_codes:
        # Update existing norm
        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/norms?code=eq.{code}",
            headers=headers,
            json=insert_data
        )
        action = "UPDATED"
    else:
        # Insert new norm
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/norms",
            headers=headers,
            json=insert_data
        )
        action = "CREATED"

    if r.status_code in [200, 201, 204]:
        essential_flag = "✅ ESSENTIAL" if norm_data['essential'] else "   consumer"
        print(f"✅ {code} {action} | {essential_flag} | {norm_data['title'][:50]}")
        success_count += 1
    else:
        print(f"❌ {code} ERROR {r.status_code}: {r.text[:100]}")
        error_count += 1

print()
print("="*80)
print("RÉSUMÉ")
print("="*80)
print()
print(f"✅ Succès: {success_count}/{len(new_norms)}")
print(f"❌ Erreurs: {error_count}")
print()

if success_count > 0:
    print("🎯 IMPACT SUR LES NORMES F:")
    print()

    # Get F norms count
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?pillar=eq.F&select=code,title,essential,consumer",
        headers=headers
    )

    if r.status_code == 200:
        f_norms = r.json()
        print(f"   Total normes F: {len(f_norms)}")

        # Count software-specific norms (F200+)
        software_norms = [n for n in f_norms if n['code'].startswith('F2')]
        hardware_norms = [n for n in f_norms if n['code'].startswith('F0') or n['code'].startswith('F1')]

        print(f"   - Hardware (F0x-F1xx): {len(hardware_norms)}")
        print(f"   - Software (F2xx): {len(software_norms)}")
        print()

        essential_count = sum(1 for n in f_norms if n.get('essential', False))
        consumer_count = sum(1 for n in f_norms if n.get('consumer', False))

        print(f"   Classification:")
        print(f"   - Essential: {essential_count}")
        print(f"   - Consumer: {consumer_count}")
        print()

print("="*80)
print("EXEMPLES D'ÉVALUATION")
print("="*80)
print()

print("Pour un DEX comme 1inch:")
print()
for norm in new_norms:
    print(f"  {norm['code']} {norm['title']}")
    print(f"       Critères:")
    for result, criteria in norm['evaluation_criteria'].items():
        print(f"         {result:4s}: {criteria}")
    print()

print("="*80)
print("✅ NORMES F SOFTWARE CRÉÉES")
print("="*80)
print()
print("📋 PROCHAINES ÉTAPES:")
print("   1. Mettre à jour norm_applicability pour les produits software")
print("   2. Créer le guide d'évaluation détaillé")
print("   3. Tester sur produits pilotes (1inch, MetaMask, etc.)")
print("   4. Valider la cohérence des résultats")
print()
