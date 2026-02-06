#!/usr/bin/env python3
"""Vérifie si les produits sont correctement catégorisés en utilisant l'IA"""

import requests
import os
from dotenv import load_dotenv
import time

load_dotenv('config/.env.txt')

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'REVOKED_ROTATE_ON_DASHBOARD'
MISTRAL_API_KEY = os.getenv('MISTRAL_API_KEY')

headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

# Récupérer tous les produits
r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name,url,type_id', headers=headers)
products = r.json()

# Récupérer tous les types
r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,description', headers=headers)
types = {t['id']: t for t in r.json()}

# Construire la liste des types pour le prompt
types_list = "\n".join([
    f"- {t['code']} ({t['name']}): {(t.get('description') or '')[:100]}"
    for t in types.values()
])

print(f"Vérification de {len(products)} produits...")
print(f"Types disponibles: {len(types)}\n")

errors = []
checked = 0

for product in products:
    product_name = product['name']
    current_type = types.get(product['type_id'], {})
    current_type_code = current_type.get('code', 'Unknown')
    current_type_name = current_type.get('name', 'Unknown')
    
    # Prompt pour l'IA
    prompt = f"""Tu es un expert en produits crypto. Vérifie si ce produit est correctement catégorisé.

PRODUIT: {product_name}
URL: {product.get('url', 'N/A')}
TYPE ACTUEL: {current_type_code} ({current_type_name})

TYPES DISPONIBLES:
{types_list}

QUESTION: Le type "{current_type_code}" est-il correct pour "{product_name}"?

Réponds UNIQUEMENT avec ce format:
CORRECT: oui/non
SI NON, TYPE SUGGÉRÉ: [code du type correct]
RAISON: [explication courte]"""

    # Appel Mistral
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
                "max_tokens": 200
            },
            timeout=30
        )
        
        if r.status_code == 200:
            response = r.json()['choices'][0]['message']['content']
            
            # Parser la réponse
            if 'CORRECT: non' in response.lower() or 'correct: no' in response.lower():
                errors.append({
                    'product': product_name,
                    'product_id': product['id'],
                    'current_type': current_type_code,
                    'response': response
                })
                print(f"❌ {product_name} ({current_type_code})")
                print(f"   {response.replace(chr(10), ' ')[:150]}")
            else:
                print(f"✅ {product_name} ({current_type_code})")
        else:
            print(f"⚠️ Erreur API pour {product_name}: {r.status_code}")
            
    except Exception as e:
        print(f"⚠️ Exception pour {product_name}: {e}")
    
    checked += 1
    time.sleep(1.0)  # Rate limiting - plus lent pour éviter 429
    
    # Afficher progression
    if checked % 20 == 0:
        print(f"\n--- Progression: {checked}/{len(products)} ({len(errors)} erreurs) ---\n")

# Résumé
print("\n" + "=" * 70)
print(f"RÉSUMÉ: {checked} produits vérifiés, {len(errors)} erreurs potentielles")
print("=" * 70)

if errors:
    print("\nPRODUITS MAL CATÉGORISÉS:")
    for err in errors:
        print(f"\n  📦 {err['product']} (id={err['product_id']})")
        print(f"     Type actuel: {err['current_type']}")
        print(f"     Suggestion: {err['response'][:200]}")
