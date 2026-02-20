#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAFESCORING.IO - Import Sources from Excel
Imports official_link and source from the original Excel file to Supabase.

USAGE:
    python -m scripts.import_excel_sources [--dry-run]
"""

import pandas as pd
import requests
import sys
import os
import argparse
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.config import SUPABASE_URL, get_supabase_headers

EXCEL_FILE = 'SAFE_SCORING_V11_COMPLET.xlsx'
SHEET_NAME = 'Toutes Normes'


def load_excel_data():
    """Load norms data from Excel."""
    df = pd.read_excel(EXCEL_FILE, sheet_name=SHEET_NAME)
    print(f"Loaded {len(df)} norms from Excel")
    return df


def load_db_norms():
    """Load all norms from database."""
    headers = get_supabase_headers()
    url = f"{SUPABASE_URL}/rest/v1/norms?select=id,code,official_link,issuing_authority"
    
    all_norms = []
    offset = 0
    limit = 1000
    
    while True:
        r = requests.get(f"{url}&offset={offset}&limit={limit}", headers=headers)
        if r.status_code != 200:
            print(f"Error loading norms: {r.status_code}")
            break
        
        batch = r.json()
        if not batch:
            break
            
        all_norms.extend(batch)
        offset += limit
        
        if len(batch) < limit:
            break
    
    print(f"Loaded {len(all_norms)} norms from database")
    return {n['code']: n for n in all_norms}


def update_norm(norm_id, updates, headers):
    """Update a norm in database."""
    url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"
    r = requests.patch(url, json=updates, headers=headers)
    return r.status_code in [200, 204]


def main():
    parser = argparse.ArgumentParser(description='Import sources from Excel')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be updated without making changes')
    args = parser.parse_args()
    
    print("\n" + "="*70)
    print("SAFESCORING - Import Sources from Excel")
    print("="*70)
    
    # Load data
    excel_df = load_excel_data()
    db_norms = load_db_norms()
    headers = get_supabase_headers()
    
    # Stats
    stats = {
        'matched': 0,
        'link_added': 0,
        'source_added': 0,
        'already_has_link': 0,
        'not_found': 0,
        'errors': 0
    }
    
    print(f"\nProcessing {len(excel_df)} Excel rows...")
    print()
    
    for idx, row in excel_df.iterrows():
        code = str(row['ID']).strip()
        excel_link = row.get('Lien')
        excel_source = row.get('Source')
        
        # Skip if no link in Excel
        if pd.isna(excel_link) or not excel_link:
            continue
        
        # Find in database
        if code not in db_norms:
            stats['not_found'] += 1
            if stats['not_found'] <= 10:
                print(f"  ⚠️  Not found in DB: {code}")
            continue
        
        stats['matched'] += 1
        db_norm = db_norms[code]
        
        # Check if already has link
        if db_norm.get('official_link'):
            stats['already_has_link'] += 1
            continue
        
        # Prepare updates
        updates = {}
        
        # Add link
        excel_link = str(excel_link).strip()
        if excel_link and excel_link != 'nan':
            updates['official_link'] = excel_link
            stats['link_added'] += 1
        
        # Add source as issuing_authority if not set
        if excel_source and not pd.isna(excel_source) and not db_norm.get('issuing_authority'):
            updates['issuing_authority'] = str(excel_source).strip()
            stats['source_added'] += 1
        
        if updates:
            if args.dry_run:
                print(f"  [DRY-RUN] Would update {code}: {list(updates.keys())}")
            else:
                if update_norm(db_norm['id'], updates, headers):
                    if (stats['link_added'] + stats['source_added']) % 100 == 0:
                        print(f"  ✅ Updated {stats['link_added']} links so far...")
                else:
                    stats['errors'] += 1
                    print(f"  ❌ Failed to update {code}")
    
    # Final stats
    print("\n" + "="*70)
    print("IMPORT COMPLETE" + (" (DRY-RUN)" if args.dry_run else ""))
    print("="*70)
    print(f"📊 Matched in DB:      {stats['matched']}")
    print(f"✅ Links added:        {stats['link_added']}")
    print(f"📝 Sources added:      {stats['source_added']}")
    print(f"ℹ️  Already had link:   {stats['already_has_link']}")
    print(f"⚠️  Not found in DB:   {stats['not_found']}")
    print(f"❌ Errors:             {stats['errors']}")


if __name__ == '__main__':
    main()
