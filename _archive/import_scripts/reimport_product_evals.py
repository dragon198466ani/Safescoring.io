#!/usr/bin/env python3
"""
SAFESCORING.IO - Réimporte les évaluations d'un produit depuis l'Excel
Usage: python reimport_product_evals.py "1inch"
"""

import os
import sys
import requests
import pandas as pd
from datetime import datetime

# Configuration
def load_config():
    config = {}
    possible_paths = [
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', 'env_template_free.txt'),
        os.path.join(os.path.dirname(__file__), 'env_template_free.txt'),
    ]
    for path in possible_paths:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        config[key.strip()] = value.strip()
            break
    return config

CONFIG = load_config()
SUPABASE_URL = CONFIG.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = CONFIG.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

EXCEL_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'SAFE_SCORING_V7_FINAL.xlsx')


def reimport_product_evaluations(product_name):
    """Réimporte les évaluations d'un produit depuis l'Excel"""
    
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    print(f"\n🔄 Réimportation des évaluations pour: {product_name}")
    print("=" * 60)
    
    # 1. Trouver le produit dans Supabase
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?name=ilike.*{product_name}*&select=id,name",
        headers=headers
    )
    products = r.json() if r.status_code == 200 else []
    
    if not products:
        print(f"❌ Produit '{product_name}' non trouvé dans Supabase")
        return
    
    product = products[0]
    product_id = product['id']
    print(f"   📦 Produit trouvé: {product['name']} (id={product_id})")
    
    # 2. Charger les normes
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,code",
        headers=headers
    )
    norms = r.json() if r.status_code == 200 else []
    norms_by_code = {n['code']: n['id'] for n in norms}
    print(f"   📋 {len(norms)} normes chargées")
    
    # 3. Lire l'Excel - feuille ÉVALUATIONS DÉTAIL
    print(f"   📊 Lecture de l'Excel...")
    
    try:
        # Lire avec header à la ligne 3 (index 2)
        df = pd.read_excel(EXCEL_PATH, sheet_name='ÉVALUATIONS DÉTAIL', header=3)
        
        # Trouver la colonne du produit
        product_col = None
        for col in df.columns:
            if product_name.lower() in str(col).lower():
                product_col = col
                break
        
        if not product_col:
            # Chercher dans les premières lignes
            df_header = pd.read_excel(EXCEL_PATH, sheet_name='ÉVALUATIONS DÉTAIL', header=None, nrows=5)
            for row_idx in range(5):
                for col_idx, val in enumerate(df_header.iloc[row_idx]):
                    if pd.notna(val) and product_name.lower() in str(val).lower():
                        product_col = df.columns[col_idx] if col_idx < len(df.columns) else None
                        print(f"   🔍 Colonne trouvée: {product_col} (index {col_idx})")
                        break
                if product_col:
                    break
        
        if not product_col:
            print(f"   ❌ Colonne pour '{product_name}' non trouvée dans l'Excel")
            return
        
        print(f"   ✅ Colonne produit: {product_col}")
        
        # 4. Extraire les évaluations
        evaluations = []
        
        # La colonne ID contient les codes de normes
        id_col = 'ID' if 'ID' in df.columns else df.columns[0]
        
        for idx, row in df.iterrows():
            norm_code = str(row.get(id_col, '')).strip()
            if not norm_code or norm_code == 'nan':
                continue
            
            # Trouver l'ID de la norme
            norm_id = norms_by_code.get(norm_code)
            if not norm_id:
                continue
            
            # Récupérer le résultat
            result_raw = row.get(product_col)
            
            if pd.isna(result_raw):
                result = 'N/A'
            elif str(result_raw).strip().upper() in ['OUI', 'YES', '1', 'TRUE', 'O']:
                result = 'YES'
            elif str(result_raw).strip().upper() in ['NON', 'NO', '0', 'FALSE', 'N']:
                result = 'NO'
            else:
                result = 'N/A'
            
            evaluations.append({
                'product_id': product_id,
                'norm_id': norm_id,
                'result': result,
                'evaluated_by': 'excel_import',
                'evaluation_date': datetime.now().strftime('%Y-%m-%d')
            })
        
        print(f"   📊 {len(evaluations)} évaluations extraites")
        
        # Compter
        yes_count = sum(1 for e in evaluations if e['result'] == 'YES')
        no_count = sum(1 for e in evaluations if e['result'] == 'NO')
        na_count = sum(1 for e in evaluations if e['result'] == 'N/A')
        print(f"   📈 YES={yes_count}, NO={no_count}, N/A={na_count}")
        
        # 5. Supprimer les anciennes évaluations
        print(f"   🗑️  Suppression des anciennes évaluations...")
        requests.delete(
            f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}",
            headers=headers
        )
        
        # 6. Insérer les nouvelles
        print(f"   💾 Insertion des nouvelles évaluations...")
        batch_size = 500
        inserted = 0
        
        for i in range(0, len(evaluations), batch_size):
            batch = evaluations[i:i+batch_size]
            r = requests.post(
                f"{SUPABASE_URL}/rest/v1/evaluations",
                headers=headers,
                json=batch
            )
            if r.status_code in [200, 201]:
                inserted += len(batch)
        
        print(f"   ✅ {inserted} évaluations importées")
        
        # 7. Recalculer le score
        total = yes_count + no_count
        score = yes_count * 100 // total if total > 0 else 0
        print(f"\n   🎯 Score: {yes_count}/{total} = {score}%")
        
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        import traceback
        traceback.print_exc()


def main():
    if len(sys.argv) < 2:
        print("Usage: python reimport_product_evals.py <product_name>")
        print("Exemple: python reimport_product_evals.py '1inch'")
        return
    
    product_name = sys.argv[1]
    reimport_product_evaluations(product_name)


if __name__ == "__main__":
    main()
