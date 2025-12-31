#!/usr/bin/env python3
"""
Migration des scores JSONB (specs/scores) vers la table safe_scoring_results
Ce script lit les colonnes specs et scores de products et les migre vers safe_scoring_results
"""

import requests
from datetime import datetime

# Configuration Supabase
SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}


def migrate_scores():
    """Migre les scores des colonnes JSONB vers safe_scoring_results"""
    print("=" * 60)
    print("🔄 MIGRATION DES SCORES VERS safe_scoring_results")
    print("=" * 60)
    
    # Charger tous les produits avec leurs scores JSONB
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?select=id,name,specs,scores',
        headers=HEADERS
    )
    products = r.json()
    print(f"\n📦 {len(products)} produits trouvés")
    
    migrated = 0
    skipped = 0
    
    for product in products:
        product_id = product['id']
        name = product['name']
        specs = product.get('specs') or {}
        scores = product.get('scores') or {}
        
        # Extraire les scores depuis specs (format full_auto_scoring.py)
        result_data = {
            'product_id': product_id,
            'calculated_at': datetime.now().isoformat()
        }
        
        # Priorité à specs (plus récent), sinon scores
        if specs:
            # Format specs: full_S, full_A, consumer_S, essential_S, etc.
            result_data['note_finale'] = specs.get('safe_score_full')
            result_data['score_s'] = specs.get('full_S')
            result_data['score_a'] = specs.get('full_A')
            result_data['score_f'] = specs.get('full_F')
            result_data['score_e'] = specs.get('full_E')
            
            result_data['note_consumer'] = specs.get('safe_score_consumer')
            result_data['s_consumer'] = specs.get('consumer_S')
            result_data['a_consumer'] = specs.get('consumer_A')
            result_data['f_consumer'] = specs.get('consumer_F')
            result_data['e_consumer'] = specs.get('consumer_E')
            
            result_data['note_essential'] = specs.get('safe_score_essential')
            result_data['s_essential'] = specs.get('essential_S')
            result_data['a_essential'] = specs.get('essential_A')
            result_data['f_essential'] = specs.get('essential_F')
            result_data['e_essential'] = specs.get('essential_E')
            
        elif scores and scores.get('full'):
            # Format scores: {"full": {"S": 10, "A": 20, "SAFE": 30}, ...}
            full = scores.get('full', {})
            consumer = scores.get('consumer', {})
            essential = scores.get('essential', {})
            
            result_data['note_finale'] = full.get('SAFE')
            result_data['score_s'] = full.get('S')
            result_data['score_a'] = full.get('A')
            result_data['score_f'] = full.get('F')
            result_data['score_e'] = full.get('E')
            
            result_data['note_consumer'] = consumer.get('SAFE')
            result_data['s_consumer'] = consumer.get('S')
            result_data['a_consumer'] = consumer.get('A')
            result_data['f_consumer'] = consumer.get('F')
            result_data['e_consumer'] = consumer.get('E')
            
            result_data['note_essential'] = essential.get('SAFE')
            result_data['s_essential'] = essential.get('S')
            result_data['a_essential'] = essential.get('A')
            result_data['f_essential'] = essential.get('F')
            result_data['e_essential'] = essential.get('E')
        else:
            skipped += 1
            continue
        
        # Vérifier qu'on a au moins un score
        if result_data.get('note_finale') is None and result_data.get('score_s') is None:
            skipped += 1
            continue
        
        # Upsert dans safe_scoring_results
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/safe_scoring_results',
            headers={**HEADERS, 'Prefer': 'resolution=merge-duplicates'},
            json=result_data
        )
        
        if r.status_code in [200, 201, 204]:
            migrated += 1
            note = result_data.get('note_finale')
            note_str = f"{note:.1f}%" if note else "N/A"
            print(f"   ✅ {name[:40]:<40} | Note: {note_str}")
        else:
            print(f"   ❌ {name[:40]:<40} | Erreur: {r.status_code}")
    
    print("\n" + "=" * 60)
    print(f"✅ Migration terminée: {migrated} migrés, {skipped} ignorés")
    print("=" * 60)
    
    # Afficher un aperçu des résultats
    print("\n📊 Vérification des données migrées:")
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/safe_scoring_results?select=product_id,note_finale,score_s,score_a,score_f,score_e&order=note_finale.desc&limit=10',
        headers=HEADERS
    )
    results = r.json()
    
    print(f"\n{'ID':<6} {'Note Finale':>12} {'S':>8} {'A':>8} {'F':>8} {'E':>8}")
    print("-" * 60)
    for res in results:
        note = res.get('note_finale')
        s = res.get('score_s')
        a = res.get('score_a')
        f = res.get('score_f')
        e = res.get('score_e')
        
        print(f"{res['product_id']:<6} {note or 0:>11.1f}% {s or 0:>7.1f}% {a or 0:>7.1f}% {f or 0:>7.1f}% {e or 0:>7.1f}%")


if __name__ == '__main__':
    migrate_scores()
