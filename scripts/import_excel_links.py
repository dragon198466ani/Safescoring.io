#!/usr/bin/env python3
"""Import official_link and official_source from Excel to database."""
import os
import sys
import time
import pandas as pd
import requests
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')


def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }


def main():
    print("=" * 70)
    print("IMPORT OFFICIAL LINKS FROM EXCEL")
    print("=" * 70)

    # Read Excel
    excel_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'SAFE_SCORING_V7_FINAL.xlsx')
    print(f"Reading Excel: {excel_path}")
    df = pd.read_excel(excel_path, sheet_name=3, skiprows=3, header=None)

    # Build dict of code -> (source, link)
    excel_data = {}
    for i, row in df.iterrows():
        code = str(row[0]).strip() if pd.notna(row[0]) else ''
        if not code or code[0] not in 'SAFE':
            continue

        source = str(row[5]).strip() if pd.notna(row[5]) and str(row[5]) != 'nan' else ''
        link = str(row[7]).strip() if pd.notna(row[7]) and str(row[7]) != 'nan' else ''

        excel_data[code] = (source, link)

    print(f"Excel norms loaded: {len(excel_data)}")

    # Get all norms from database
    print("Fetching norms from database...")
    all_norms = []
    offset = 0
    limit = 1000

    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code&order=code&offset={offset}&limit={limit}',
            headers=get_headers()
        )
        batch = r.json()
        if not batch:
            break
        all_norms.extend(batch)
        offset += limit
        if len(batch) < limit:
            break

    print(f"Database norms: {len(all_norms)}")

    # Build update list
    updates = []
    for norm in all_norms:
        code = norm['code']
        if code not in excel_data:
            continue

        source, link = excel_data[code]
        if link:
            updates.append({
                'id': norm['id'],
                'code': code,
                'source': source,
                'link': link
            })

    print(f"Norms to update: {len(updates)}")
    print()

    # Update in batches with delay
    batch_size = 50
    updated = 0
    errors = 0

    headers_update = get_headers()
    headers_update['Prefer'] = 'return=minimal'

    for i in range(0, len(updates), batch_size):
        batch = updates[i:i+batch_size]

        for item in batch:
            data = {'official_link': item['link']}
            if item['source']:
                data['standard_reference'] = item['source']

            try:
                r = requests.patch(
                    f"{SUPABASE_URL}/rest/v1/norms?id=eq.{item['id']}",
                    headers=headers_update,
                    json=data,
                    timeout=30
                )

                if r.status_code in [200, 204]:
                    updated += 1
                else:
                    errors += 1
                    print(f"ERR {item['code']}: {r.status_code}")
            except Exception as e:
                errors += 1
                print(f"ERR {item['code']}: {e}")

        print(f"Progress: {i+len(batch)}/{len(updates)} ({updated} ok, {errors} err)")
        time.sleep(0.5)  # Rate limit protection

    print()
    print("=" * 70)
    print(f"COMPLETE: {updated} updated, {errors} errors")
    print("=" * 70)


if __name__ == '__main__':
    main()
