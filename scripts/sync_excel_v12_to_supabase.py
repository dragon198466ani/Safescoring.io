#!/usr/bin/env python3
"""
Synchronise l'Excel V12 avec Supabase.
Met à jour les liens officiels et les métadonnées des normes.
"""

import pandas as pd
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.config import SUPABASE_URL, SUPABASE_HEADERS
import requests
import json

EXCEL_PATH = "SAFE_SCORING_V12_100PCT_FINAL.xlsx"

# Mapping des colonnes Excel vers les colonnes Supabase
COLUMN_MAPPING = {
    'ID': 'code',
    'Pilier': 'pillar',
    'Type': 'type',
    'Catégorie': 'category',
    'Norme': 'title',
    'Description': 'description',
    'Source': 'issuing_authority',
    'Accès': 'access_type',
    'Prix': 'price_info',
    'Lien': 'official_link'
}

# Mapping des valeurs d'accès
ACCESS_MAPPING = {
    'Gratuit': 'G',
    'Payant': 'P',
    'Freemium': 'F',
    'Propriétaire': 'X'
}

def load_excel_data():
    """Charge les données de l'Excel V12."""
    print("📖 Chargement de l'Excel V12...")
    df = pd.read_excel(EXCEL_PATH, sheet_name='Toutes Normes')
    print(f"   {len(df)} normes trouvées")
    return df

def load_supabase_norms():
    """Charge les normes existantes depuis Supabase."""
    print("📥 Chargement des normes Supabase...")
    
    all_norms = []
    offset = 0
    limit = 1000
    
    while True:
        url = f"{SUPABASE_URL}/rest/v1/norms?select=id,code,official_link,issuing_authority&offset={offset}&limit={limit}"
        resp = requests.get(url, headers=SUPABASE_HEADERS)
        
        if resp.status_code != 200:
            print(f"   ❌ Erreur: {resp.status_code}")
            break
            
        batch = resp.json()
        if not batch:
            break
            
        all_norms.extend(batch)
        offset += limit
        
        if len(batch) < limit:
            break
    
    print(f"   {len(all_norms)} normes en base")
    return {n['code']: n for n in all_norms}

def sync_norms(df, existing_norms, dry_run=False):
    """Synchronise les normes Excel avec Supabase."""
    
    updates = []
    inserts = []
    
    for _, row in df.iterrows():
        code = str(row['ID']).strip() if pd.notna(row['ID']) else None
        if not code:
            continue
            
        # Préparer les données
        official_link = str(row['Lien']).strip() if pd.notna(row['Lien']) else None
        issuing_authority = str(row['Source']).strip() if pd.notna(row['Source']) else None
        
        # Ignorer les liens invalides
        if official_link and not official_link.startswith('http'):
            official_link = None
        
        if code in existing_norms:
            # Mise à jour si le lien ou l'autorité diffère
            existing = existing_norms[code]
            needs_update = False
            update_data = {'id': existing['id']}
            
            if official_link and existing.get('official_link') != official_link:
                update_data['official_link'] = official_link
                needs_update = True
                
            if issuing_authority and existing.get('issuing_authority') != issuing_authority:
                update_data['issuing_authority'] = issuing_authority
                needs_update = True
            
            # Ajouter target_type depuis la colonne Type
            type_val = str(row.get('Type', '')).strip() if pd.notna(row.get('Type')) else None
            if type_val:
                target_type = 'digital' if type_val == 'Numérique' else 'physical' if type_val == 'Physique' else 'both'
                update_data['target_type'] = target_type
                needs_update = True
                
            if needs_update:
                updates.append(update_data)
        else:
            # Nouvelle norme à insérer
            pillar = str(row['Pilier']).strip() if pd.notna(row['Pilier']) else 'S'
            title = str(row['Norme']).strip() if pd.notna(row['Norme']) else code
            description = str(row['Description']).strip() if pd.notna(row['Description']) else None
            access_raw = str(row['Accès']).strip() if pd.notna(row['Accès']) else 'G'
            access_type = ACCESS_MAPPING.get(access_raw, 'G')
            
            # Déterminer target_type
            type_val = str(row.get('Type', '')).strip() if pd.notna(row.get('Type')) else None
            target_type = 'digital' if type_val == 'Numérique' else 'physical' if type_val == 'Physique' else 'both'
            
            insert_data = {
                'code': code,
                'pillar': pillar,
                'title': title,
                'description': description,
                'issuing_authority': issuing_authority,
                'official_link': official_link,
                'access_type': access_type,
                'target_type': target_type
            }
            inserts.append(insert_data)
    
    print(f"\n📊 Résumé:")
    print(f"   - Mises à jour: {len(updates)}")
    print(f"   - Insertions: {len(inserts)}")
    
    if dry_run:
        print("\n🔍 Mode dry-run - aucune modification")
        if updates:
            print("\nExemples de mises à jour:")
            for u in updates[:5]:
                print(f"   {u}")
        if inserts:
            print("\nExemples d'insertions:")
            for i in inserts[:5]:
                print(f"   {i['code']}: {i['title']}")
        return
    
    # Appliquer les mises à jour
    if updates:
        print(f"\n🔄 Application de {len(updates)} mises à jour...")
        success = 0
        for update in updates:
            norm_id = update.pop('id')
            url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"
            resp = requests.patch(url, headers=SUPABASE_HEADERS, json=update)
            if resp.status_code in [200, 204]:
                success += 1
            else:
                print(f"   ❌ Erreur update {norm_id}: {resp.status_code}")
        print(f"   ✅ {success}/{len(updates)} mises à jour réussies")
    
    # Appliquer les insertions
    if inserts:
        print(f"\n➕ Insertion de {len(inserts)} nouvelles normes...")
        # Insérer par batch de 50
        batch_size = 50
        success = 0
        for i in range(0, len(inserts), batch_size):
            batch = inserts[i:i+batch_size]
            url = f"{SUPABASE_URL}/rest/v1/norms"
            headers = {**SUPABASE_HEADERS, 'Prefer': 'return=minimal'}
            resp = requests.post(url, headers=headers, json=batch)
            if resp.status_code in [200, 201]:
                success += len(batch)
            else:
                print(f"   ❌ Erreur batch {i}: {resp.status_code} - {resp.text[:200]}")
        print(f"   ✅ {success}/{len(inserts)} insertions réussies")

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Sync Excel V12 to Supabase')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without applying')
    args = parser.parse_args()
    
    print("=" * 60)
    print("SYNC EXCEL V12 → SUPABASE")
    print("=" * 60)
    
    df = load_excel_data()
    existing = load_supabase_norms()
    sync_norms(df, existing, dry_run=args.dry_run)
    
    print("\n✅ Terminé!")

if __name__ == "__main__":
    main()
