#!/usr/bin/env python3
"""
SAFESCORING.IO - Mise à jour des liens officiels des normes
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
    
    print("🔗 MISE À JOUR LIENS OFFICIELS DES NORMES")
    print("=" * 60)
    
    # Lire les liens depuis Excel
    print("\n📊 Lecture des liens depuis Excel...")
    df = pd.read_excel('SAFE_SCORING_V7_FINAL.xlsx', sheet_name='ÉVALUATIONS DÉTAIL', header=3)
    
    norm_links = {}
    for index, row in df.iterrows():
        code = str(row.get('ID', '')).strip()
        link = str(row.get('Lien Officiel', '')).strip()
        
        if code and code != 'nan' and link and link != 'nan' and link.startswith('http'):
            norm_links[code] = link
    
    print(f"   ✅ {len(norm_links)} liens trouvés")
    
    # Récupérer les normes
    print("\n📋 Mise à jour des normes...")
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,code",
        headers=headers,
        timeout=30
    )
    
    if response.status_code != 200:
        print(f"   ❌ Erreur: {response.status_code}")
        return
    
    norms = response.json()
    print(f"   📊 {len(norms)} normes en base")
    
    # Mettre à jour chaque norme
    updated = 0
    for norm in norms:
        code = norm['code']
        norm_id = norm['id']
        
        if code in norm_links:
            link = norm_links[code]
            
            response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}",
                headers=headers,
                json={'official_link': link},
                timeout=30
            )
            
            if response.status_code in [200, 204]:
                updated += 1
                if updated <= 10:
                    print(f"   ✅ {code}: {link[:50]}...")
    
    if updated > 10:
        print(f"   ... et {updated - 10} autres")
    
    print(f"\n   📊 {updated} normes mises à jour avec leurs liens")
    
    # Vérification
    print("\n🔍 Vérification...")
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?official_link=not.is.null&select=code,official_link&limit=5",
        headers=headers,
        timeout=30
    )
    
    if response.status_code == 200:
        norms_with_links = response.json()
        print(f"   📊 Échantillon de normes avec liens:")
        for n in norms_with_links:
            print(f"      • {n['code']}: {n['official_link'][:50]}...")
    
    print("\n🎉 TERMINÉ!")

if __name__ == "__main__":
    main()
