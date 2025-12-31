#!/usr/bin/env python3
"""Vérifie les évaluations de Glacier Protocol"""

import requests
from collections import Counter

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
}

# Récupérer les normes
r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar', headers=headers)
norms = {n['id']: n for n in r.json()}

# Récupérer les évaluations de Glacier (product_id=315)
r = requests.get(f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.315&select=norm_id,result', headers=headers)
evals = r.json()

print(f"Total évaluations: {len(evals)}")
print(f"\nRépartition globale: {Counter(e['result'] for e in evals)}")

# Par pilier
print("\n" + "=" * 60)
print("DÉTAIL PAR PILIER")
print("=" * 60)

for pillar in ['S', 'A', 'F', 'E']:
    pillar_evals = [e for e in evals if norms.get(e['norm_id'], {}).get('pillar') == pillar]
    counts = Counter(e['result'] for e in pillar_evals)
    
    print(f"\n--- Pilier {pillar} ({len(pillar_evals)} évaluations) ---")
    print(f"    {dict(counts)}")
    
    # Afficher les YES et YESp
    yes_evals = [e for e in pillar_evals if e['result'] in ['YES', 'YESp']]
    if yes_evals:
        print(f"    YES/YESp:")
        for e in yes_evals[:10]:
            norm = norms.get(e['norm_id'], {})
            print(f"      {norm.get('code', '?')}: {norm.get('title', '?')[:40]} = {e['result']}")
        if len(yes_evals) > 10:
            print(f"      ... et {len(yes_evals) - 10} autres")
    
    # Afficher les NO
    no_evals = [e for e in pillar_evals if e['result'] == 'NO']
    if no_evals:
        print(f"    NO:")
        for e in no_evals:
            norm = norms.get(e['norm_id'], {})
            print(f"      {norm.get('code', '?')}: {norm.get('title', '?')[:40]}")

# Vérifier les normes applicables vs évaluées
print("\n" + "=" * 60)
print("NORMES APPLICABLES VS ÉVALUÉES")
print("=" * 60)

r = requests.get(f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.50&is_applicable=eq.true&select=norm_id', headers=headers)
applicable_norm_ids = set(a['norm_id'] for a in r.json())

evaluated_norm_ids = set(e['norm_id'] for e in evals if e['result'] not in ['N/A', None])

print(f"Normes applicables (type Protocol): {len(applicable_norm_ids)}")
print(f"Normes évaluées (non N/A): {len(evaluated_norm_ids)}")

missing = applicable_norm_ids - evaluated_norm_ids
if missing:
    print(f"\n⚠️ {len(missing)} normes applicables NON évaluées:")
    for norm_id in list(missing)[:20]:
        norm = norms.get(norm_id, {})
        print(f"   {norm.get('code', '?')}: {norm.get('title', '?')[:50]}")
