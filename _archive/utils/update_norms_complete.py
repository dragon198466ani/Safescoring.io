#!/usr/bin/env python3
"""
SAFESCORING.IO - Mise à jour complète:
1. access_type dans norms (G/R)
2. norm_applicability (norme × type de produit)
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
    
    print("📋 MISE À JOUR COMPLÈTE NORMES + APPLICABILITÉ")
    print("=" * 60)
    
    # Lire l'Excel
    print("\n📊 Lecture de ÉVALUATIONS DÉTAIL...")
    df = pd.read_excel('SAFE_SCORING_V7_FINAL.xlsx', sheet_name='ÉVALUATIONS DÉTAIL', header=3)
    print(f"   ✅ {len(df)} lignes lues")
    
    # Types de produits dans l'Excel (colonnes après Consumer)
    type_columns = ['HW Cold', 'HW Hot', 'SW Browser', 'SW Mobile', 'Bkp Digital', 'Bkp Physical',
                    'Card', 'AC Phys', 'AC Digit', 'AC Phygi', 'DEX', 'CEX', 'Lending', 'Yield',
                    'Liq Staking', 'Derivatives', 'Bridges', 'DeFi Tools', 'RWA', 'Crypto Bank',
                    'Card Non-Cust', 'Bkp Phygital']
    
    # ========================================
    # 1. CHARGER LES MAPS
    # ========================================
    print("\n📂 Chargement des références...")
    
    # Normes
    response = requests.get(f"{SUPABASE_URL}/rest/v1/norms?select=id,code", headers=headers, timeout=30)
    norms_map = {n['code']: n['id'] for n in response.json()} if response.status_code == 200 else {}
    print(f"   ✅ {len(norms_map)} normes")
    
    # Types
    response = requests.get(f"{SUPABASE_URL}/rest/v1/product_types?select=id,code", headers=headers, timeout=30)
    types_map = {t['code']: t['id'] for t in response.json()} if response.status_code == 200 else {}
    print(f"   ✅ {len(types_map)} types")
    
    # ========================================
    # 2. MISE À JOUR ACCESS_TYPE
    # ========================================
    print("\n💰 [1/2] Mise à jour access_type (G/R)...")
    
    updated_access = 0
    for index, row in df.iterrows():
        code = str(row.get('ID', '')).strip()
        if not code or code == 'nan':
            continue
        
        norm_id = norms_map.get(code)
        if not norm_id:
            continue
        
        access = str(row.get('Accès', 'G')).strip().upper()
        if access not in ['G', 'R']:
            access = 'G'
        
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}",
            headers=headers,
            json={'access_type': access},
            timeout=30
        )
        
        if response.status_code in [200, 204]:
            updated_access += 1
    
    print(f"   ✅ {updated_access} normes mises à jour avec access_type")
    
    # ========================================
    # 3. REMPLIR NORM_APPLICABILITY
    # ========================================
    print("\n📋 [2/2] Remplissage de norm_applicability...")
    
    # Supprimer les anciennes données
    requests.delete(f"{SUPABASE_URL}/rest/v1/norm_applicability?norm_id=gte.0", headers=headers, timeout=30)
    print("   🗑️  Table vidée")
    
    # Préparer les données
    applicabilities = []
    
    for index, row in df.iterrows():
        code = str(row.get('ID', '')).strip()
        if not code or code == 'nan':
            continue
        
        norm_id = norms_map.get(code)
        if not norm_id:
            continue
        
        # Pour chaque type de produit
        for type_code in type_columns:
            type_id = types_map.get(type_code)
            if not type_id:
                continue
            
            # Valeur d'applicabilité
            value = row.get(type_code, '')
            is_applicable = str(value).upper() in ['OUI', 'YES', 'TRUE', '1', '✅']
            
            applicabilities.append({
                'norm_id': norm_id,
                'type_id': type_id,
                'is_applicable': is_applicable
            })
    
    print(f"   📊 {len(applicabilities)} entrées à insérer")
    
    # Insérer par batch
    batch_size = 500
    inserted = 0
    
    for i in range(0, len(applicabilities), batch_size):
        batch = applicabilities[i:i+batch_size]
        
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/norm_applicability",
            headers=headers,
            json=batch,
            timeout=120
        )
        
        if response.status_code in [200, 201]:
            inserted += len(batch)
            print(f"   ✅ Batch {i//batch_size + 1}: {len(batch)} insérés")
        else:
            print(f"   ❌ Batch {i//batch_size + 1}: {response.status_code}")
    
    print(f"\n   📊 {inserted} applicabilités insérées")
    
    # ========================================
    # RÉSUMÉ
    # ========================================
    print("\n" + "=" * 60)
    print("🎉 MISE À JOUR TERMINÉE")
    print("=" * 60)
    print(f"   💰 access_type: {updated_access} normes")
    print(f"   📋 norm_applicability: {inserted} entrées")
    
    # Vérification
    print("\n🔍 Vérification...")
    
    # Count applicability
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/norm_applicability?select=norm_id&limit=1000",
        headers=headers,
        timeout=30
    )
    if response.status_code == 200:
        print(f"   📊 Entrées dans norm_applicability: {len(response.json())}")
    
    # Échantillon
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/norm_applicability?select=norm_id,type_id,is_applicable&limit=10",
        headers=headers,
        timeout=30
    )
    if response.status_code == 200:
        print(f"   📋 Échantillon:")
        for a in response.json()[:5]:
            status = '✅' if a['is_applicable'] else '❌'
            print(f"      {status} norm_id={a['norm_id']} × type_id={a['type_id']}")

if __name__ == "__main__":
    main()
