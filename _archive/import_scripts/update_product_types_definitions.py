#!/usr/bin/env python3
"""
Met à jour les définitions des types de produits dans Supabase
depuis la feuille 'DÉFINITIONS TYPES' de l'Excel.

Structure Excel (ligne 2 = en-têtes):
- Code: Code du type (HW Cold, DEX, etc.)
- Nom: Nom complet
- Définition: Description détaillée
- Exemples: Exemples de produits
- Caractéristiques: Avantages/features
- Limites: Inconvénients
- Applicabilité: Scores par pilier (S:90% A:90% F:95% E:66%)
"""

import os
import sys
import json
import pandas as pd
import requests
import re

# Configuration
def load_config():
    config = {}
    config_path = os.path.join(os.path.dirname(__file__), '..', '..', 'config', 'env_template_free.txt')
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

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

def parse_pillar_scores(score_str):
    """Parse les scores par pilier depuis une chaîne comme 'S:85% A:73% F:37% E:95%'"""
    if not score_str or pd.isna(score_str):
        return {}
    
    scores = {}
    # Pattern: S:85% ou S:100%
    matches = re.findall(r'([SAFE]):(\d+)%', str(score_str))
    for pillar, score in matches:
        scores[pillar] = int(score)
    
    return scores

def add_columns_if_needed():
    """Ajoute les colonnes manquantes via SQL RPC"""
    print("📋 Vérification des colonnes...")
    
    # Vérifier les colonnes existantes
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_types?select=*&limit=1",
        headers=HEADERS
    )
    
    if r.status_code == 200:
        data = r.json()
        if data:
            existing_cols = set(data[0].keys())
            needed_cols = {'description', 'examples', 'advantages', 'disadvantages', 'pillar_scores'}
            missing = needed_cols - existing_cols
            
            if missing:
                print(f"   ⚠️ Colonnes manquantes: {missing}")
                print(f"   📝 Exécutez ce SQL dans Supabase:")
                print(f"""
ALTER TABLE product_types 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS examples TEXT,
ADD COLUMN IF NOT EXISTS advantages TEXT,
ADD COLUMN IF NOT EXISTS disadvantages TEXT,
ADD COLUMN IF NOT EXISTS pillar_scores JSONB DEFAULT '{{}}';
""")
                return False
            else:
                print("   ✅ Toutes les colonnes existent")
                return True
    
    return False

def main():
    print("""
╔══════════════════════════════════════════════════════════════╗
║  📦 MISE À JOUR DÉFINITIONS TYPES DE PRODUITS               ║
╚══════════════════════════════════════════════════════════════╝
""")
    
    # Vérifier les colonnes
    if not add_columns_if_needed():
        print("\n⚠️ Ajoutez d'abord les colonnes dans Supabase, puis relancez le script.")
        return
    
    # Lire l'Excel avec header à la ligne 2 (index 2)
    excel_path = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'SAFE_SCORING_V7_FINAL.xlsx')
    df = pd.read_excel(excel_path, sheet_name='DÉFINITIONS TYPES', header=2)
    
    print(f"\n📊 {len(df)} types trouvés dans l'Excel")
    print(f"Colonnes: {list(df.columns)}")
    
    # Récupérer les types existants dans Supabase
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name",
        headers=HEADERS
    )
    existing_types = {t['code'].lower().strip(): t for t in r.json()} if r.status_code == 200 else {}
    print(f"📁 {len(existing_types)} types existants dans Supabase\n")
    
    updated = 0
    
    for idx, row in df.iterrows():
        # Colonnes: Code, Nom, Définition, Exemples, Caractéristiques, Limites, Applicabilité
        code = str(row.get('Code', '')).strip() if pd.notna(row.get('Code')) else None
        
        if not code or code == 'nan':
            continue
        
        # Chercher dans Supabase
        code_lower = code.lower().strip()
        supabase_type = existing_types.get(code_lower)
        
        if not supabase_type:
            print(f"   ⚠️ Type '{code}' non trouvé dans Supabase")
            continue
        
        # Extraire les données
        definition = str(row.get('Définition', '')).strip() if pd.notna(row.get('Définition')) else None
        examples = str(row.get('Exemples', '')).strip() if pd.notna(row.get('Exemples')) else None
        characteristics = str(row.get('Caractéristiques', '')).strip() if pd.notna(row.get('Caractéristiques')) else None
        limits = str(row.get('Limites', '')).strip() if pd.notna(row.get('Limites')) else None
        applicability = str(row.get('Applicabilité', '')).strip() if pd.notna(row.get('Applicabilité')) else None
        
        # Parser les scores
        pillar_scores = parse_pillar_scores(applicability)
        
        # Préparer les données pour Supabase
        update_data = {}
        if definition and definition != 'nan':
            update_data['description'] = definition
        if examples and examples != 'nan':
            update_data['examples'] = examples
        if characteristics and characteristics != 'nan':
            update_data['advantages'] = characteristics
        if limits and limits != 'nan':
            update_data['disadvantages'] = limits
        if pillar_scores:
            update_data['pillar_scores'] = pillar_scores
        
        if update_data:
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/product_types?id=eq.{supabase_type['id']}",
                headers=HEADERS,
                json=update_data
            )
            
            if r.status_code in [200, 204]:
                scores_str = ' '.join([f"{k}:{v}%" for k, v in pillar_scores.items()]) if pillar_scores else 'N/A'
                print(f"   ✅ {code}: {scores_str}")
                updated += 1
            else:
                print(f"   ❌ {code}: erreur {r.status_code} - {r.text[:100]}")
    
    print(f"\n✅ {updated} types mis à jour dans Supabase")

if __name__ == "__main__":
    main()
