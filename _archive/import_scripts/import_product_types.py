#!/usr/bin/env python3
"""
SAFESCORING.IO - Import des types de produits depuis DÉFINITIONS TYPES
"""

import os
import requests
import pandas as pd
from datetime import datetime

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
    
    print("📂 IMPORT PRODUCT_TYPES DEPUIS EXCEL")
    print("=" * 60)
    
    # Lire la feuille Excel
    print("\n📊 Lecture de 'DÉFINITIONS TYPES'...")
    df = pd.read_excel('SAFE_SCORING_V7_FINAL.xlsx', sheet_name='DÉFINITIONS TYPES', header=None)
    
    # Mapping des catégories
    category_map = {
        'HW Cold': 'Hardware',
        'HW Hot': 'Hardware',
        'SW Browser': 'Software',
        'SW Mobile': 'Software',
        'Bkp Digital': 'Backup',
        'Bkp Physical': 'Backup',
        'Card': 'Card',
        'Card Non-Cust': 'Card',
        'AC Phys': 'Anti-Coercion',
        'AC Digit': 'Anti-Coercion',
        'AC Phygi': 'Anti-Coercion',
        'DEX': 'DeFi',
        'CEX': 'Exchange',
        'Lending': 'DeFi',
        'Yield': 'DeFi',
        'Liq Staking': 'DeFi',
        'Derivatives': 'DeFi',
        'Bridges': 'DeFi',
        'DeFi Tools': 'DeFi',
        'RWA': 'Finance',
        'Crypto Bank': 'Finance',
    }
    
    # Extraire les types (lignes 3 à 23)
    types = []
    for i in range(3, min(25, len(df))):
        row = df.iloc[i]
        
        code = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
        if not code or code == 'nan':
            continue
        
        name = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else code
        if name == 'nan':
            name = code
        
        # Déterminer la catégorie
        category = category_map.get(code, 'General')
        
        product_type = {
            'code': code,
            'name': name,
            'category': category
        }
        types.append(product_type)
        print(f"   ✅ {code}: {name[:40]} ({category})")
    
    print(f"\n   📊 {len(types)} types de produits trouvés")
    
    # Supprimer les anciens types
    print("\n🗑️  Nettoyage de la table product_types...")
    requests.delete(f"{SUPABASE_URL}/rest/v1/product_types?id=gte.0", headers=headers, timeout=30)
    
    # Insérer les nouveaux types
    print("\n📤 Insertion des types...")
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/product_types",
        headers=headers,
        json=types,
        timeout=30
    )
    
    if response.status_code in [200, 201]:
        print(f"   ✅ {len(types)} types insérés avec succès!")
    else:
        print(f"   ❌ Erreur: {response.status_code} - {response.text[:200]}")
    
    # Vérification
    print("\n🔍 Vérification...")
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_types?select=code,name,category&order=id.asc",
        headers=headers,
        timeout=30
    )
    
    if response.status_code == 200:
        inserted_types = response.json()
        print(f"   📊 {len(inserted_types)} types dans la base:")
        for t in inserted_types[:10]:
            print(f"      • {t['code']:15} | {t['name'][:30]:30} | {t['category']}")
        if len(inserted_types) > 10:
            print(f"      ... et {len(inserted_types) - 10} autres")
    
    print("\n🎉 IMPORT TERMINÉ")
    print("=" * 60)
    print("   ✅ Table product_types remplie depuis Excel")
    print("   📊 Vérifiez dans Supabase Dashboard")

if __name__ == "__main__":
    main()
