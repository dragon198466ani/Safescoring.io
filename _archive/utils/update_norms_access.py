#!/usr/bin/env python3
"""
SAFESCORING.IO - Mise à jour colonne access_type (G=Gratuit, R=Résumé/Payant)
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
    
    print("💰 MISE À JOUR COLONNE ACCESS_TYPE (G/R)")
    print("=" * 60)
    print("   G = Gratuit (accès libre)")
    print("   R = Résumé/Payant (accès restreint)")
    
    # Lire les données depuis Excel
    print("\n📊 Lecture des données depuis Excel...")
    df = pd.read_excel('SAFE_SCORING_V7_FINAL.xlsx', sheet_name='ÉVALUATIONS DÉTAIL', header=3)
    
    access_data = {}
    count_g = 0
    count_r = 0
    
    for index, row in df.iterrows():
        code = str(row.get('ID', '')).strip()
        access = str(row.get('Accès', '')).strip().upper()
        
        if code and code != 'nan':
            if access in ['G', 'GRATUIT', 'FREE']:
                access_data[code] = 'G'
                count_g += 1
            elif access in ['R', 'RESUME', 'PAYANT', 'PAID']:
                access_data[code] = 'R'
                count_r += 1
            else:
                access_data[code] = 'G'  # Par défaut gratuit
                count_g += 1
    
    print(f"   ✅ {len(access_data)} normes avec info accès")
    print(f"   📊 G (Gratuit): {count_g}")
    print(f"   📊 R (Payant) : {count_r}")
    
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
        
        if code in access_data:
            access_type = access_data[code]
            
            response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}",
                headers=headers,
                json={'access_type': access_type},
                timeout=30
            )
            
            if response.status_code in [200, 204]:
                updated += 1
    
    print(f"   ✅ {updated} normes mises à jour")
    
    # Vérification
    print("\n🔍 Vérification...")
    
    # Count G
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?access_type=eq.G&select=code",
        headers=headers,
        timeout=30
    )
    if response.status_code == 200:
        g_count = len(response.json())
        print(f"   📊 Normes Gratuites (G): {g_count}")
    
    # Count R
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?access_type=eq.R&select=code",
        headers=headers,
        timeout=30
    )
    if response.status_code == 200:
        r_count = len(response.json())
        print(f"   📊 Normes Payantes (R): {r_count}")
    
    # Échantillon
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=code,title,access_type&limit=10",
        headers=headers,
        timeout=30
    )
    if response.status_code == 200:
        print(f"\n   📋 Échantillon:")
        for n in response.json():
            access = n.get('access_type', '?')
            icon = '🆓' if access == 'G' else '💰'
            print(f"      {icon} {n['code']}: {n['title'][:35]}... ({access})")
    
    print("\n🎉 TERMINÉ!")

if __name__ == "__main__":
    main()
