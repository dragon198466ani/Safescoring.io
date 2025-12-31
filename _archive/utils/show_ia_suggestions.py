#!/usr/bin/env python3
"""Montre les normes que l'IA suggère d'ajouter pour Protocol/Guide"""

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

# Normes potentiellement intéressantes à ajouter (par mots-clés)
keywords = ['documentation', 'guide', 'backup', 'recovery', 'seed', 'mnemonic', 
            'multisig', 'privacy', 'security', 'audit', 'open source', 'bip', 'slip']

candidates = []
for n in norms.values():
    if n['id'] in current_applicable:
        continue
    text = f"{n['title']} {n.get('description', '')}".lower()
    for kw in keywords:
        if kw in text:
            candidates.append(n)
            break

print("=" * 70)
print("NORMES CANDIDATES À AJOUTER POUR PROTOCOL/GUIDE")
print("=" * 70)
print(f"\nNormes actuelles: {len(current_applicable)}")
print(f"Candidates trouvées par mots-clés: {len(candidates)}")

# Tester 5 candidates avec l'IA
print("\n" + "=" * 70)
print("TEST IA: Ces normes devraient-elles être ajoutées?")
print("=" * 70)

for norm in candidates[:8]:
    prompt = f"""Tu es un expert en produits crypto. Détermine si cette norme est APPLICABLE au type de produit.

TYPE DE PRODUIT: Protocol/Guide
Description: DOCUMENTATION de sécurité crypto. Méthodologie écrite décrivant des PROCÉDURES de sécurité.
Le protocole RECOMMANDE des pratiques mais ne les IMPLÉMENTE pas lui-même.
Exemples: Glacier Protocol, guides de sécurité Bitcoin, tutoriels multisig

NORME À ÉVALUER:
- Code: {norm['code']}
- Titre: {norm['title']}
- Description: {norm.get('description', 'N/A')}

QUESTION: Un guide/protocole de sécurité crypto devrait-il être évalué sur cette norme?
(Est-ce que le guide peut RECOMMANDER ou DOCUMENTER cette pratique?)

Réponds avec:
APPLICABLE: OUI ou NON
RAISON: [explication courte]"""

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
            
            status = "🟢 AJOUTER" if is_applicable else "🔴 IGNORER"
            print(f"\n[{norm['pillar']}] {norm['code']}: {norm['title'][:45]}")
            print(f"    Description: {norm.get('description', 'N/A')[:60]}...")
            print(f"    IA: {status}")
            reason_start = response.find('RAISON:')
            if reason_start > 0:
                print(f"    {response[reason_start:reason_start+80]}")
        else:
            print(f"⚠️ Erreur API: {r.status_code}")
            
    except Exception as e:
        print(f"⚠️ Exception: {e}")
    
    time.sleep(0.5)
