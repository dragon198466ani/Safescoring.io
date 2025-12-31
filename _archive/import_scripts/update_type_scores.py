#!/usr/bin/env python3
"""
Calcule et met à jour les scores par pilier (S, A, F, E, SAFE) pour chaque type de produit.
Basé sur les évaluations existantes dans Supabase.

Ajoute les colonnes:
- scores_full: {S: %, A: %, F: %, E: %, SAFE: %}
- scores_consumer: {S: %, A: %, F: %, E: %, SAFE: %}
- scores_essential: {S: %, A: %, F: %, E: %, SAFE: %}
"""

import os
import requests
import json

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

def fetch_all_paginated(base_url, headers, page_size=1000):
    """Récupère toutes les données avec pagination"""
    all_data = []
    offset = 0
    
    # Déterminer le séparateur
    separator = '&' if '?' in base_url else '?'
    
    while True:
        url = f"{base_url}{separator}limit={page_size}&offset={offset}"
        r = requests.get(url, headers=headers)
        
        if r.status_code != 200:
            print(f"   ⚠️ Erreur {r.status_code}: {r.text[:100]}")
            break
        
        data = r.json()
        if not data:
            break
        
        all_data.extend(data)
        
        if len(data) < page_size:
            break
        
        offset += page_size
    
    return all_data

def calculate_type_scores():
    """
    Calcule les scores potentiels par type de produit basé sur l'applicabilité.
    Pour chaque type, calcule le % de normes applicables par pilier.
    """
    print("""
╔══════════════════════════════════════════════════════════════╗
║  📊 CALCUL DES SCORES PAR TYPE DE PRODUIT                   ║
╚══════════════════════════════════════════════════════════════╝
""")
    
    # Charger les types
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name",
        headers=HEADERS
    )
    types = r.json() if r.status_code == 200 else []
    print(f"📦 {len(types)} types de produits")
    
    # Charger les normes avec leurs piliers et catégories (avec pagination)
    # Colonnes: is_essential, consumer, full
    norms = fetch_all_paginated(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,is_essential,consumer,full",
        HEADERS
    )
    print(f"📋 {len(norms)} normes")
    
    # Créer un mapping norm_id -> norm_info
    norm_map = {n['id']: n for n in norms}
    
    # Charger l'applicabilité (avec pagination)
    applicability = fetch_all_paginated(
        f"{SUPABASE_URL}/rest/v1/norm_applicability?select=type_id,norm_id,is_applicable",
        HEADERS
    )
    print(f"📊 {len(applicability)} règles d'applicabilité\n")
    
    # Grouper l'applicabilité par type
    app_by_type = {}
    for app in applicability:
        type_id = app['type_id']
        if type_id not in app_by_type:
            app_by_type[type_id] = []
        app_by_type[type_id].append(app)
    
    # Calculer les scores pour chaque type
    results = []
    
    for product_type in types:
        type_id = product_type['id']
        type_code = product_type['code']
        
        type_apps = app_by_type.get(type_id, [])
        
        # Initialiser les compteurs par pilier et catégorie
        scores = {
            'full': {'S': {'app': 0, 'total': 0}, 'A': {'app': 0, 'total': 0}, 
                    'F': {'app': 0, 'total': 0}, 'E': {'app': 0, 'total': 0}},
            'consumer': {'S': {'app': 0, 'total': 0}, 'A': {'app': 0, 'total': 0}, 
                        'F': {'app': 0, 'total': 0}, 'E': {'app': 0, 'total': 0}},
            'essential': {'S': {'app': 0, 'total': 0}, 'A': {'app': 0, 'total': 0}, 
                         'F': {'app': 0, 'total': 0}, 'E': {'app': 0, 'total': 0}}
        }
        
        for app in type_apps:
            norm_id = app['norm_id']
            is_applicable = app['is_applicable']
            
            norm = norm_map.get(norm_id)
            if not norm:
                continue
            
            pillar = norm.get('pillar', 'S')
            is_essential = norm.get('is_essential', False)
            is_consumer = norm.get('consumer', False)  # Colonne 'consumer' dans Supabase
            
            # Full = toutes les normes
            scores['full'][pillar]['total'] += 1
            if is_applicable:
                scores['full'][pillar]['app'] += 1
            
            # Consumer = normes consumer + essential
            if is_consumer or is_essential:
                scores['consumer'][pillar]['total'] += 1
                if is_applicable:
                    scores['consumer'][pillar]['app'] += 1
            
            # Essential = normes essential uniquement
            if is_essential:
                scores['essential'][pillar]['total'] += 1
                if is_applicable:
                    scores['essential'][pillar]['app'] += 1
        
        # Calculer les pourcentages
        result = {
            'type_id': type_id,
            'type_code': type_code,
            'scores_full': {},
            'scores_consumer': {},
            'scores_essential': {}
        }
        
        for category in ['full', 'consumer', 'essential']:
            cat_scores = {}
            total_app = 0
            total_norms = 0
            
            for pillar in ['S', 'A', 'F', 'E']:
                app = scores[category][pillar]['app']
                total = scores[category][pillar]['total']
                pct = round(app * 100 / total) if total > 0 else 0
                cat_scores[pillar] = pct
                total_app += app
                total_norms += total
            
            # Score SAFE global (moyenne des 4 piliers)
            safe_score = round(sum(cat_scores.values()) / 4) if cat_scores else 0
            cat_scores['SAFE'] = safe_score
            
            result[f'scores_{category}'] = cat_scores
        
        results.append(result)
        
        # Afficher
        full = result['scores_full']
        print(f"   {type_code:<15}: S:{full['S']:>3}% A:{full['A']:>3}% F:{full['F']:>3}% E:{full['E']:>3}% | SAFE:{full['SAFE']:>3}%")
    
    return results

def update_supabase_scores(results):
    """Met à jour les scores dans Supabase"""
    print("\n💾 Mise à jour Supabase...")
    
    updated = 0
    for result in results:
        type_id = result['type_id']
        
        update_data = {
            'scores_full': result['scores_full'],
            'scores_consumer': result['scores_consumer'],
            'scores_essential': result['scores_essential']
        }
        
        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/product_types?id=eq.{type_id}",
            headers=HEADERS,
            json=update_data
        )
        
        if r.status_code in [200, 204]:
            updated += 1
        else:
            print(f"   ❌ {result['type_code']}: {r.status_code} - {r.text[:100]}")
    
    print(f"   ✅ {updated} types mis à jour")

def main():
    results = calculate_type_scores()
    update_supabase_scores(results)
    
    print("\n📊 Résumé des scores (Full):")
    print("-" * 70)
    print(f"{'Type':<15} | {'S':>5} | {'A':>5} | {'F':>5} | {'E':>5} | {'SAFE':>5}")
    print("-" * 70)
    for r in results:
        full = r['scores_full']
        print(f"{r['type_code']:<15} | {full['S']:>4}% | {full['A']:>4}% | {full['F']:>4}% | {full['E']:>4}% | {full['SAFE']:>4}%")

if __name__ == "__main__":
    main()
