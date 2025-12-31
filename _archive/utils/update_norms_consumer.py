#!/usr/bin/env python3
"""
SAFESCORING.IO - Ajouter et remplir la colonne Consumer dans norms
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
    
    print("🔧 MISE À JOUR COLONNE CONSUMER DANS NORMS")
    print("=" * 60)
    
    # Lire les données Excel
    print("\n📊 Lecture des données Excel...")
    df = pd.read_excel('SAFE_SCORING_V7_FINAL.xlsx', sheet_name='ÉVALUATIONS DÉTAIL', header=3)
    
    # Extraire les valeurs Consumer par code de norme
    consumer_data = {}
    for index, row in df.iterrows():
        code = str(row.get('ID', '')).strip()
        if not code or code == 'nan':
            continue
        
        consumer_val = row.get('Consumer', '')
        is_consumer = str(consumer_val).upper() in ['OUI', 'YES', 'TRUE', '1', '✅']
        consumer_data[code] = is_consumer
    
    print(f"   ✅ {len(consumer_data)} normes avec valeur Consumer")
    
    # Compter les Consumer = True
    consumer_count = sum(1 for v in consumer_data.values() if v)
    print(f"   📊 {consumer_count} normes applicables aux Consumer")
    
    # Récupérer les normes existantes
    print("\n📋 Mise à jour des normes dans Supabase...")
    
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,code",
        headers=headers,
        timeout=30
    )
    
    if response.status_code != 200:
        print(f"   ❌ Erreur récupération normes: {response.status_code}")
        return
    
    norms = response.json()
    print(f"   📊 {len(norms)} normes en base")
    
    # Mettre à jour chaque norme
    updated = 0
    for norm in norms:
        code = norm['code']
        norm_id = norm['id']
        
        if code in consumer_data:
            is_consumer = consumer_data[code]
            
            # Mettre à jour
            update_response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}",
                headers=headers,
                json={'consumer': is_consumer},
                timeout=30
            )
            
            if update_response.status_code in [200, 204]:
                updated += 1
    
    print(f"\n   ✅ {updated} normes mises à jour avec Consumer")
    
    # Vérification
    print("\n🔍 Vérification...")
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?consumer=eq.true&select=code,title&limit=10",
        headers=headers,
        timeout=30
    )
    
    if response.status_code == 200:
        consumer_norms = response.json()
        print(f"   📊 Normes Consumer=TRUE (échantillon):")
        for norm in consumer_norms[:5]:
            print(f"      • {norm['code']}: {norm['title'][:40]}...")
    
    print("\n🎉 MISE À JOUR TERMINÉE")
    print("=" * 60)
    print("   ✅ Colonne 'consumer' remplie avec les données Excel")
    print("   📊 Vérifiez dans Supabase Dashboard → Table norms")

if __name__ == "__main__":
    main()
