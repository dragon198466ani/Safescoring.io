#!/usr/bin/env python3
"""Convertit les TBD en NO pour Glacier Protocol (standards récents non documentés)"""

import requests

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# Récupérer les normes
r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title', headers=headers)
norms = {n['code']: n for n in r.json()}

# TBD à convertir en NO avec justification
tbd_to_no = {
    # Standards récents (post-2017) - Glacier ne les documente pas
    'S21': 'BIP-85 (2020) - Glacier (2017) ne documente pas ce standard récent',
    'S25': 'BIP-370 PSBTv2 (2021) - Glacier utilise PSBT v1 uniquement',
    'S98': 'BIP-352 Silent Payments (2023) - Standard trop récent',
    'S99': 'BIP-380 Miniscript (2022) - Standard trop récent',
    'S100': 'BIP-381 Miniscript descriptors (2022) - Standard trop récent',
    'S101': 'BIP-327 MuSig2 (2022) - Standard trop récent',
    'S102': 'BIP-388 Wallet Policies (2022) - Standard trop récent',
    'S103': 'BIP-129 BSMS (2020) - Glacier ne mentionne pas ce standard',
    
    # Efficiency - Glacier ne fournit pas ces services
    'E74': 'Pas de support client réactif - Glacier est un document statique',
    'E170': 'Anglais uniquement - pas de support multilingue',
    'E149': 'WCAG 2.2 Level AAA non vérifié - accessibilité maximale non garantie',
}

print('='*70)
print('CONVERSION TBD → NO POUR GLACIER PROTOCOL')
print('='*70)

product_id = 315  # Glacier Protocol

success = 0
for code, reason in tbd_to_no.items():
    norm = norms.get(code)
    if not norm:
        print(f"⚠️ Norme {code} non trouvée")
        continue
    
    norm_id = norm['id']
    
    # Supprimer l'ancienne évaluation
    r = requests.delete(
        f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}&norm_id=eq.{norm_id}',
        headers=headers
    )
    
    # Créer la nouvelle évaluation
    from datetime import date
    r = requests.post(
        f'{SUPABASE_URL}/rest/v1/evaluations',
        headers={**headers, 'Prefer': 'return=minimal'},
        json={
            'product_id': product_id,
            'norm_id': norm_id,
            'result': 'NO',
            'evaluated_by': 'manual_tbd_fix',
            'evaluation_date': str(date.today()),
            'confidence_score': 1.0
        }
    )
    
    if r.status_code in [200, 201, 204]:
        print(f"✅ {code}: TBD → NO")
        print(f"   Raison: {reason}")
        success += 1
    else:
        print(f"❌ {code}: Erreur {r.status_code} - {r.text[:100]}")

print(f"\n{'='*70}")
print(f"RÉSUMÉ: {success}/{len(tbd_to_no)} conversions réussies")
print('='*70)

# Recalculer le score
r = requests.get(f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}&select=result', headers=headers)
evals = r.json()

from collections import Counter
counts = Counter(e['result'] for e in evals)

yes_count = counts.get('YES', 0) + counts.get('YESp', 0)
no_count = counts.get('NO', 0)
tbd_count = counts.get('TBD', 0)

total = yes_count + no_count
score = 100 * yes_count // total if total > 0 else 0

print(f"\n📊 NOUVEAU SCORE GLACIER PROTOCOL:")
print(f"   YES: {counts.get('YES', 0)}")
print(f"   YESp: {counts.get('YESp', 0)}")
print(f"   NO: {no_count}")
print(f"   TBD: {tbd_count}")
print(f"   N/A: {counts.get('N/A', 0)}")
print(f"\n   🎯 Score: {yes_count}/{total} = {score}%")
