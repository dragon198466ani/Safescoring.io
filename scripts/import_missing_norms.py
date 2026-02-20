#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAFESCORING.IO - Import Missing Norms from Excel
Imports norms that exist in Excel but not in Supabase.

USAGE:
    python -m scripts.import_missing_norms [--dry-run] [--limit N]
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

# Pillar mapping
PILLAR_MAP = {
    'S': 'S',
    'A': 'A', 
    'F': 'F',
    'E': 'E',
}


def load_excel_data():
    """Load norms data from Excel."""
    df = pd.read_excel(EXCEL_FILE, sheet_name=SHEET_NAME)
    print(f"Loaded {len(df)} norms from Excel")
    return df


def load_db_codes():
    """Load all norm codes from database."""
    headers = get_supabase_headers()
    url = f"{SUPABASE_URL}/rest/v1/norms?select=code"
    
    all_codes = set()
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
            
        for n in batch:
            all_codes.add(n['code'])
        offset += limit
        
        if len(batch) < limit:
            break
    
    print(f"Loaded {len(all_codes)} norm codes from database")
    return all_codes


def insert_norm(norm_data, headers):
    """Insert a new norm into database."""
    url = f"{SUPABASE_URL}/rest/v1/norms"
    r = requests.post(url, json=norm_data, headers=headers)
    return r.status_code in [200, 201]


def main():
    parser = argparse.ArgumentParser(description='Import missing norms from Excel')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be imported')
    parser.add_argument('--limit', type=int, help='Limit number of imports')
    args = parser.parse_args()
    
    print("\n" + "="*70)
    print("SAFESCORING - Import Missing Norms from Excel")
    print("="*70)
    
    # Load data
    excel_df = load_excel_data()
    db_codes = load_db_codes()
    headers = get_supabase_headers()
    
    # Find missing norms
    missing_norms = []
    for idx, row in excel_df.iterrows():
        code = str(row['ID']).strip()
        if code not in db_codes:
            missing_norms.append(row)
    
    print(f"\nFound {len(missing_norms)} missing norms")
    
    if args.limit:
        missing_norms = missing_norms[:args.limit]
        print(f"Limited to {args.limit} norms")
    
    # Stats
    stats = {
        'imported': 0,
        'errors': 0
    }
    
    print(f"\nImporting {len(missing_norms)} norms...")
    print()
    
    for i, row in enumerate(missing_norms):
        code = str(row['ID']).strip()
        pillar = str(row.get('Pilier', 'E')).strip().upper()
        if pillar not in PILLAR_MAP:
            pillar = 'E'  # Default to Efficiency
        
        title = str(row.get('Norme', '')).strip()
        description = str(row.get('Description', '')).strip()
        source = str(row.get('Source', '')).strip() if pd.notna(row.get('Source')) else None
        link = str(row.get('Lien', '')).strip() if pd.notna(row.get('Lien')) else None
        access_type = 'G' if str(row.get('Accès', '')).lower() in ['gratuit', 'free', 'g'] else 'P'
        
        # Clean up nan values
        if title == 'nan':
            title = code
        if description == 'nan':
            description = title
        if link == 'nan':
            link = None
        if source == 'nan':
            source = None
        
        norm_data = {
            'code': code,
            'pillar': pillar,
            'title': title,
            'description': description,
            'access_type': access_type,
            'official_link': link,
            'issuing_authority': source,
            'created_at': datetime.now(timezone.utc).isoformat(),
        }
        
        if args.dry_run:
            if i < 20:
                print(f"  [DRY-RUN] Would import: {code} ({pillar}) - {title[:40]}...")
            elif i == 20:
                print(f"  ... and {len(missing_norms) - 20} more")
        else:
            if insert_norm(norm_data, headers):
                stats['imported'] += 1
                if stats['imported'] % 100 == 0:
                    print(f"  ✅ Imported {stats['imported']} norms...")
            else:
                stats['errors'] += 1
                if stats['errors'] <= 10:
                    print(f"  ❌ Failed to import {code}")
    
    # Final stats
    print("\n" + "="*70)
    print("IMPORT COMPLETE" + (" (DRY-RUN)" if args.dry_run else ""))
    print("="*70)
    print(f"✅ Imported:  {stats['imported']}")
    print(f"❌ Errors:    {stats['errors']}")


if __name__ == '__main__':
    main()
