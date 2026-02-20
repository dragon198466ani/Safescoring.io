#!/usr/bin/env python3
"""
Batch applicability analysis - processes one type at a time with progress
With retry logic and rate limiting
"""
import os
import sys
import time
import requests
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

load_dotenv(Path('c:/Users/alexa/Desktop/SafeScoring/.env'))

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
headers_post = {**headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}

# Create session with retry logic
session = requests.Session()
retry_strategy = Retry(
    total=5,
    backoff_factor=2,
    status_forcelist=[429, 500, 502, 503, 504],
)
adapter = HTTPAdapter(max_retries=retry_strategy)
session.mount("https://", adapter)
session.mount("http://", adapter)

# Import analyze_applicability from comprehensive_applicability
sys.path.insert(0, str(Path('c:/Users/alexa/Desktop/SafeScoring/scripts')))
from comprehensive_applicability import analyze_applicability

def get_all_norms():
    """Fetch all norms"""
    all_norms = []
    offset = 0
    while True:
        r = session.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,target_type,summary,description&limit=500&offset={offset}&order=id',
            headers=headers, timeout=120
        )
        batch = r.json() if r.status_code == 200 else []
        if not batch:
            break
        all_norms.extend(batch)
        offset += len(batch)
        time.sleep(0.5)  # Rate limit
        if len(batch) < 500:
            break
    return all_norms

def get_product_type(type_id):
    """Get single product type"""
    r = session.get(f'{SUPABASE_URL}/rest/v1/product_types?id=eq.{type_id}&select=*',
                    headers=headers, timeout=60)
    data = r.json() if r.status_code == 200 else []
    return data[0] if data else None

def upsert_batch(records):
    """Upsert batch of records with retry"""
    for attempt in range(5):
        try:
            r = session.post(
                f'{SUPABASE_URL}/rest/v1/norm_applicability?on_conflict=norm_id,type_id',
                headers={**headers_post, 'Prefer': 'resolution=merge-duplicates'},
                json=records,
                timeout=120
            )
            if r.status_code in [200, 201]:
                time.sleep(0.3)  # Rate limit
                return True
            elif r.status_code == 429:
                wait = 2 ** attempt
                print(f"    Rate limited, waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"    Upsert failed: {r.status_code}")
                return False
        except Exception as e:
            wait = 2 ** attempt
            print(f"    Connection error, retry in {wait}s: {str(e)[:50]}")
            time.sleep(wait)
    return False

def process_type(type_id, norms):
    """Process all norms for a single product type"""
    product_type = get_product_type(type_id)
    if not product_type:
        print(f"Type {type_id} not found")
        return 0, 0

    print(f"\n[Type {type_id}] {product_type['name']}")

    applicable = 0
    non_applicable = 0
    batch = []
    saved = 0

    for i, norm in enumerate(norms):
        is_applicable, reason, applicability_reason = analyze_applicability(product_type, norm)

        if is_applicable:
            applicable += 1
        else:
            non_applicable += 1

        # Truncate applicability_reason
        if len(applicability_reason) > 30000:
            applicability_reason = applicability_reason[:30000] + "..."

        batch.append({
            'norm_id': norm['id'],
            'type_id': type_id,
            'is_applicable': is_applicable,
            'reason': reason[:500] if reason else '',
            'applicability_reason': applicability_reason
        })

        # Upsert every 100 records
        if len(batch) >= 100:
            if upsert_batch(batch):
                saved += len(batch)
            batch = []

        if (i + 1) % 500 == 0:
            print(f"  Processed {i+1}/{len(norms)}...")

    # Upsert remaining
    if batch:
        if upsert_batch(batch):
            saved += len(batch)

    pct_applicable = applicable / len(norms) * 100
    print(f"  -> Applicable: {applicable} ({pct_applicable:.1f}%) | Non: {non_applicable} | Saved: {saved}")
    return applicable, non_applicable

def main():
    # Get type_id from command line or process all
    if len(sys.argv) > 1:
        type_ids = [int(x) for x in sys.argv[1:]]
    else:
        # Get all type IDs
        r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id&order=id',
                         headers=headers, timeout=30)
        type_ids = [t['id'] for t in r.json()] if r.status_code == 200 else []

    print("=" * 60)
    print(f"APPLICABILITY ANALYSIS")
    print("=" * 60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    print("\nLoading norms...")
    norms = get_all_norms()
    print(f"  {len(norms)} norms loaded")

    print(f"\nProcessing {len(type_ids)} types...")

    total_applicable = 0
    total_non_applicable = 0

    for type_id in type_ids:
        applicable, non_applicable = process_type(type_id, norms)
        total_applicable += applicable
        total_non_applicable += non_applicable

    print("\n" + "=" * 60)
    print("FINAL REPORT")
    print("=" * 60)
    total = total_applicable + total_non_applicable
    print(f"Total: {total}")
    print(f"  Applicable: {total_applicable} ({total_applicable*100/total:.1f}%)")
    print(f"  Non-applicable: {total_non_applicable} ({total_non_applicable*100/total:.1f}%)")
    print(f"\nDone: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

if __name__ == "__main__":
    main()
