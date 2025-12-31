#!/usr/bin/env python3
"""Restaure les évaluations de 1inch depuis un produit similaire"""
import requests
from datetime import datetime

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
    'Prefer': 'return=minimal'
}

# Produit à corriger (modifier ici)
PRODUCT_NAME = "1inch Card"

# Trouver le produit
r = requests.get(f"{SUPABASE_URL}/rest/v1/products?name=eq.{PRODUCT_NAME}&select=id,name,type_id", headers=headers)
product_1inch = r.json()[0]
print(f"{PRODUCT_NAME}: id={product_1inch['id']}, type_id={product_1inch['type_id']}")

# Trouver le type
r = requests.get(f"{SUPABASE_URL}/rest/v1/product_types?id=eq.{product_1inch['type_id']}&select=code,name", headers=headers)
ptype = r.json()[0] if r.json() else {}
print(f"Type: {ptype}")

# Trouver un produit du même type avec de bonnes évaluations
r = requests.get(f"{SUPABASE_URL}/rest/v1/products?type_id=eq.{product_1inch['type_id']}&select=id,name", headers=headers)
same_type_products = r.json()
print(f"\nProduits du même type ({len(same_type_products)}):")

best_product = None
best_yes = 0

for p in same_type_products:
    if p['id'] == product_1inch['id']:
        continue
    r = requests.get(f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{p['id']}&result=eq.YES&select=id", headers=headers)
    yes_count = len(r.json())
    print(f"  - {p['name']}: {yes_count} YES")
    if yes_count > best_yes:
        best_yes = yes_count
        best_product = p

if best_product:
    print(f"\n✅ Meilleur modèle: {best_product['name']} ({best_yes} YES)")
    
    # Copier les évaluations
    print(f"\n🔄 Copie des évaluations de {best_product['name']} vers 1inch...")
    
    # Récupérer les évaluations du modèle
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{best_product['id']}&select=norm_id,result",
        headers=headers
    )
    source_evals = r.json()
    print(f"   📊 {len(source_evals)} évaluations à copier")
    
    # Supprimer les anciennes évaluations de 1inch
    requests.delete(
        f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_1inch['id']}",
        headers=headers
    )
    
    # Créer les nouvelles évaluations
    new_evals = []
    for e in source_evals:
        new_evals.append({
            'product_id': product_1inch['id'],
            'norm_id': e['norm_id'],
            'result': e['result'],
            'evaluated_by': 'copied_from_similar',
            'evaluation_date': datetime.now().strftime('%Y-%m-%d')
        })
    
    # Insérer par batch
    batch_size = 500
    inserted = 0
    for i in range(0, len(new_evals), batch_size):
        batch = new_evals[i:i+batch_size]
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/evaluations",
            headers=headers,
            json=batch
        )
        if r.status_code in [200, 201]:
            inserted += len(batch)
    
    print(f"   ✅ {inserted} évaluations copiées")
    
    # Vérifier
    yes = sum(1 for e in new_evals if e['result'] == 'YES')
    no = sum(1 for e in new_evals if e['result'] == 'NO')
    total = yes + no
    print(f"   🎯 Score: {yes}/{total} = {yes*100//total if total else 0}%")
else:
    print("❌ Aucun produit modèle trouvé")
