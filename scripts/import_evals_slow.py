#!/usr/bin/env python3
"""
Slowly import evaluations from JSON file with very long delays.
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import json
import requests
import time
from core.config import SUPABASE_URL, get_supabase_headers

WRITE_HEADERS = get_supabase_headers(use_service_key=True)
WRITE_HEADERS['Content-Type'] = 'application/json'
WRITE_HEADERS['Prefer'] = 'resolution=merge-duplicates,return=minimal'

def import_batch(batch):
    """Try to import a single batch with aggressive retries."""
    for attempt in range(10):
        try:
            r = requests.post(
                f'{SUPABASE_URL}/rest/v1/evaluations?on_conflict=product_id,norm_id,evaluation_date',
                headers=WRITE_HEADERS,
                json=batch,
                timeout=300  # 5 minute timeout
            )
            if r.status_code in [200, 201]:
                return True, None
            elif r.status_code == 500:
                error = r.json().get('message', 'Unknown error')
                if 'timeout' in error.lower():
                    # Wait even longer on timeout
                    wait_time = 60 * (attempt + 1)
                    print(f"      Timeout, waiting {wait_time}s before retry {attempt+1}/10...")
                    time.sleep(wait_time)
                else:
                    return False, error
        except Exception as e:
            wait_time = 30 * (attempt + 1)
            print(f"      Exception: {str(e)[:50]}, waiting {wait_time}s...")
            time.sleep(wait_time)
    return False, "Max retries exceeded"

def main():
    print("=" * 60)
    print("  SLOW EVALUATION IMPORTER")
    print("=" * 60)

    # Load evaluations
    print("\nLoading evaluations from JSON...")
    with open('data/claude_opus_evaluations.json', 'r') as f:
        evaluations = json.load(f)
    print(f"Loaded {len(evaluations)} evaluations")

    # Import in very small batches
    batch_size = 10  # Very small batches
    delay_between_batches = 5  # 5 seconds between batches

    total = len(evaluations)
    saved = 0
    failed = 0

    print(f"\nImporting in batches of {batch_size} with {delay_between_batches}s delay...")

    for i in range(0, total, batch_size):
        batch = evaluations[i:i+batch_size]
        batch_num = i // batch_size + 1
        total_batches = (total + batch_size - 1) // batch_size

        success, error = import_batch(batch)

        if success:
            saved += len(batch)
        else:
            failed += len(batch)
            print(f"    Batch {batch_num} failed: {error}")

        if batch_num % 100 == 0:
            print(f"  Progress: {saved}/{total} saved, {failed} failed ({batch_num}/{total_batches} batches)")

        time.sleep(delay_between_batches)

        # Save progress every 1000 batches
        if batch_num % 1000 == 0:
            print(f"  *** Checkpoint: {saved} saved so far ***")

    print(f"\n*** COMPLETE: {saved} saved, {failed} failed ***")

if __name__ == "__main__":
    main()
