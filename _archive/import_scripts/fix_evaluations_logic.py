#!/usr/bin/env python3
"""
SAFESCORING.IO - Correction des évaluations depuis ÉVALUATIONS COMPLÈTES
Logique: YES/NO/N/A directement depuis l'Excel
"""

import os
import requests
import pandas as pd

# Charger configuration
def load_config():
    config = {}
    config_path = os.path.join(os.path.dirname(__file__), 'env_template_free.txt')
    
    with open(config_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                config[key.strip()] = value.strip()
    
    return config

CONFIG = load_config()
SUPABASE_URL = CONFIG.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = CONFIG.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

def main():
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    print("🔄 IMPORT ÉVALUATIONS DEPUIS 'ÉVALUATIONS COMPLÈTES'")
    print("=" * 60)
    print("   Logique: YES → PASS | NO → FAIL | N/A → N/A")
    
    # 1. Charger les références Supabase
    print("\n📂 Chargement des références Supabase...")
    
    # Normes (code -> id)
    response = requests.get(f"{SUPABASE_URL}/rest/v1/norms?select=id,code", headers=headers)
    norms_map = {n['code']: n['id'] for n in response.json()}
    print(f"   ✅ {len(norms_map)} normes")
    
    # Produits (name -> id)
    response = requests.get(f"{SUPABASE_URL}/rest/v1/products?select=id,name", headers=headers)
    products = response.json()
    products_map = {}
    for p in products:
        products_map[p['name'].lower().strip()] = p['id']
    print(f"   ✅ {len(products_map)} produits")

    # 2. Lire la feuille ÉVALUATIONS COMPLÈTES
    print("\n📊 Lecture de 'ÉVALUATIONS COMPLÈTES'...")
    df = pd.read_excel('SAFE_SCORING_V7_FINAL.xlsx', sheet_name='ÉVALUATIONS COMPLÈTES', header=5)
    
    # Identifier les colonnes normes (S01, S02, A01, F01, E01, etc.)
    norm_cols = [col for col in df.columns if isinstance(col, str) and len(col) <= 5 and col[0] in ['S', 'A', 'F', 'E'] and any(c.isdigit() for c in col)]
    print(f"   ✅ {len(norm_cols)} colonnes normes trouvées")
    print(f"   📊 {len(df)} lignes produits")

    # 3. Construire les évaluations
    print("\n🧮 Construction des évaluations...")
    
    evaluations_batch = []
    products_found = 0
    products_not_found = []
    
    for index, row in df.iterrows():
        product_name = str(row.get('Produit', '')).strip()
        if not product_name or product_name == 'nan':
            continue
        
        # Trouver le product_id
        product_id = products_map.get(product_name.lower())
        if not product_id:
            # Essayer match partiel
            for p_name, p_id in products_map.items():
                if product_name.lower() in p_name or p_name in product_name.lower():
                    product_id = p_id
                    break
        
        if not product_id:
            if product_name not in products_not_found:
                products_not_found.append(product_name)
            continue
        
        products_found += 1
        
        # Pour chaque norme
        for norm_code in norm_cols:
            norm_id = norms_map.get(norm_code)
            if not norm_id:
                continue
            
            # Lire la valeur Excel
            cell_value = str(row.get(norm_code, '')).strip().upper()
            
            # Déterminer le résultat
            if cell_value in ['YES', 'OUI', 'TRUE', '1', '✅']:
                result = 'YES'
            elif cell_value in ['NO', 'NON', 'FALSE', '0', '❌']:
                result = 'NO'
            elif cell_value in ['N/A', 'NA', '-', '']:
                result = 'N/A'
            else:
                result = 'N/A'  # Valeur inconnue -> N/A
            
            evaluations_batch.append({
                'product_id': product_id,
                'norm_id': norm_id,
                'result': result,
                'evaluated_by': 'excel_import',
                'evaluation_date': pd.Timestamp.now().strftime('%Y-%m-%d')
            })

    print(f"   ✅ {products_found} produits trouvés")
    if products_not_found:
        print(f"   ⚠️  {len(products_not_found)} produits non trouvés: {products_not_found[:5]}...")
    print(f"   📊 {len(evaluations_batch)} évaluations à insérer")

    # 4. Vider et réinsérer
    print("\n🗑️  Nettoyage de la table evaluations...")
    requests.delete(f"{SUPABASE_URL}/rest/v1/evaluations?id=gte.0", headers=headers, timeout=60)
    
    print("\n📤 Insertion des évaluations...")
    batch_size = 1000
    total_inserted = 0
    
    for i in range(0, len(evaluations_batch), batch_size):
        batch = evaluations_batch[i:i+batch_size]
        
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/evaluations",
            headers=headers,
            json=batch,
            timeout=120
        )
        
        if r.status_code in [200, 201]:
            total_inserted += len(batch)
            print(f"   ✅ Batch {i//batch_size + 1}: {len(batch)} insérés")
        else:
            print(f"   ❌ Erreur Batch {i//batch_size + 1}: {r.status_code} - {r.text[:100]}")

    # 5. Résumé
    print("\n" + "=" * 60)
    print("🎉 IMPORT TERMINÉ")
    print("=" * 60)
    print(f"   ✅ {total_inserted} évaluations insérées")
    
    # Stats
    print("\n📊 Statistiques...")
    
    for result_type in ['YES', 'NO', 'N/A']:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/evaluations?result=eq.{result_type}&select=id",
            headers=headers,
            timeout=30
        )
        if r.status_code == 200:
            count = len(r.json())
            icon = '✅' if result_type == 'YES' else ('❌' if result_type == 'NO' else '➖')
            print(f"   {icon} {result_type}: {count}")
    
    # Échantillon
    print("\n🔍 Échantillon:")
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/evaluations?select=result,product_id,norm_id&limit=10",
        headers=headers
    )
    if r.status_code == 200:
        for e in r.json()[:5]:
            print(f"   product_id={e['product_id']} × norm_id={e['norm_id']} → {e['result']}")

if __name__ == "__main__":
    main()
