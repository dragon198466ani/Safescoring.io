#!/usr/bin/env python3
"""
Import evaluations from JSON backup to Supabase with micro-batches.
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import json
import time
import requests
from core.config import SUPABASE_URL, get_supabase_headers

WRITE_HEADERS = get_supabase_headers(use_service_key=True)
WRITE_HEADERS['Content-Type'] = 'application/json'
WRITE_HEADERS['Prefer'] = 'resolution=merge-duplicates,return=minimal'


def import_evaluations(json_file, batch_size=5, start_from=0):
    """Import evaluations from JSON to Supabase."""
    print(f"Loading evaluations from {json_file}...")
    with open(json_file, 'r', encoding='utf-8') as f:
        evaluations = json.load(f)

    total = len(evaluations)
    print(f"Loaded {total:,} evaluations")

    if start_from > 0:
        evaluations = evaluations[start_from:]
        print(f"Starting from index {start_from} ({len(evaluations):,} remaining)")

    saved = 0
    errors = 0
    consecutive_errors = 0
    total_batches = (len(evaluations) + batch_size - 1) // batch_size

    for i in range(0, len(evaluations), batch_size):
        batch = evaluations[i:i+batch_size]
        batch_num = i // batch_size + 1
        actual_index = start_from + i

        # Retry logic
        success = False
        for attempt in range(3):
            try:
                r = requests.post(
                    f'{SUPABASE_URL}/rest/v1/evaluations?on_conflict=product_id,norm_id,evaluation_date',
                    headers=WRITE_HEADERS,
                    json=batch,
                    timeout=30
                )
                if r.status_code in [200, 201]:
                    saved += len(batch)
                    success = True
                    consecutive_errors = 0
                    break
                elif r.status_code == 500 and '57014' in r.text:
                    # Statement timeout - wait longer
                    time.sleep(2 * (attempt + 1))
                    continue
                else:
                    errors += 1
                    if errors <= 5:
                        print(f"  Error {r.status_code} at index {actual_index}: {r.text[:80]}")
                    break
            except Exception as e:
                if attempt < 2:
                    time.sleep(1)
                    continue
                errors += 1
                consecutive_errors += 1
                if errors <= 5:
                    print(f"  Exception at index {actual_index}: {e}")
                break

        # Progress every 50 batches (250 records)
        if batch_num % 50 == 0:
            print(f"  [{batch_num}/{total_batches}] index={actual_index} saved={saved:,} errors={errors}", flush=True)

        # Small delay between batches
        if success:
            time.sleep(0.05)  # 50ms
        else:
            time.sleep(0.3)

        # If too many consecutive errors, pause
        if consecutive_errors >= 10:
            print(f"  Pausing 30s at index {actual_index} due to errors...")
            time.sleep(30)
            consecutive_errors = 0

    print(f"\nDone! Saved {saved:,}/{total:,} evaluations ({errors} errors)")
    return saved


if __name__ == "__main__":
    json_file = sys.argv[1] if len(sys.argv) > 1 else 'evaluations_opus_backup.json'
    start_from = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    batch_size = int(sys.argv[3]) if len(sys.argv) > 3 else 5

    print("=" * 60)
    print("  IMPORT EVALUATIONS FROM JSON")
    print("=" * 60)
    import_evaluations(json_file, batch_size=batch_size, start_from=start_from)
