#!/usr/bin/env python3
"""Compare l'applicabilité IA vs manuelle pour Protocol/Guide"""

import requests
import os
from dotenv import load_dotenv
import time

load_dotenv('config/.env.txt')

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'
MISTRAL_API_KEY = os.getenv('MISTRAL_API_KEY')

headers = {'apikey': SUPABASE_KEY}

# Normes actuellement applicables (manuelles)
r = requests.get(f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.50&is_applicable=eq.true&select=norm_id', headers=headers)
current_applicable = set(row['norm_id'] for row in r.json())

# Toutes les normes
r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,description', headers=headers)
norms = {n['id']: n for n in r.json()}

# Type Protocol/Guide
r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?id=eq.50&select=*', headers=headers)
type_info = r.json()[0]

print("=" * 70)
print("COMPARAISON APPLICABILITÉ: IA vs MANUEL pour Protocol/Guide")
print("=" * 70)
print(f"\nType: {type_info['name']}")
print(f"Description: {type_info['description'][:200]}...")
print(f"\nNormes actuellement applicables (manuel): {len(current_applicable)}")

# Sélectionner 5 normes NON applicables actuellement pour les tester
non_applicable = [n for n in norms.values() if n['id'] not in current_applicable]

# Prendre des exemples variés par pilier
examples = []
for pillar in ['S', 'A', 'F', 'E']:
    pillar_norms = [n for n in non_applicable if n['pillar'] == pillar][:3]
    examples.extend(pillar_norms)

# Tester avec l'IA
print("\n" + "=" * 70)
print("TEST IA: Ces normes devraient-elles être applicables à Protocol/Guide?")
print("=" * 70)

for norm in examples[:12]:
    prompt = f"""Tu es un expert en produits crypto. Détermine si cette norme est APPLICABLE au type de produit.

TYPE DE PRODUIT: Protocol/Guide
Description: {type_info['description']}
Exemples: {type_info.get('examples', 'Glacier Protocol, guides de sécurité crypto')}

NORME À ÉVALUER:
- Code: {norm['code']}
- Titre: {norm['title']}
- Description: {norm.get('description', 'N/A')}

QUESTION: Cette norme est-elle APPLICABLE à un Protocol/Guide?
(Applicable = ça a du sens de poser la question, même si le guide ne l'implémente pas)

Réponds avec:
APPLICABLE: OUI ou NON
RAISON: [explication courte en 1 ligne]"""

    try:
        r = requests.post(
            "https://api.mistral.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {MISTRAL_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "mistral-small-latest",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 150
            },
            timeout=30
        )
        
        if r.status_code == 200:
            response = r.json()['choices'][0]['message']['content']
            is_applicable = 'OUI' in response.upper() and 'APPLICABLE' in response.upper()
            
            status = "🟢 OUI" if is_applicable else "🔴 NON"
            print(f"\n[{norm['pillar']}] {norm['code']}: {norm['title'][:40]}")
            print(f"    Actuellement: ❌ Non applicable (manuel)")
            print(f"    IA suggère: {status}")
            print(f"    {response.replace(chr(10), ' ')[:100]}")
        else:
            print(f"⚠️ Erreur API: {r.status_code}")
            
    except Exception as e:
        print(f"⚠️ Exception: {e}")
    
    time.sleep(0.5)
