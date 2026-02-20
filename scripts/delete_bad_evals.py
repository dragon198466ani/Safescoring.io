#!/usr/bin/env python3
"""Delete bad evaluations in small batches with retries"""
import sys
sys.path.insert(0, 'src')
from core.config import SUPABASE_URL, get_supabase_headers
import requests
import time

headers = get_supabase_headers(use_service_key=True)
total_deleted = 0
batch_size = 50  # Very small batches
max_retries = 3

while True:
    # Get IDs to delete
    try:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/evaluations?select=id&evaluated_by=eq.claude_opus_deterministic&limit={batch_size}',
            headers=headers,
            timeout=30
        )
        if r.status_code != 200:
            print(f'Get error: {r.status_code}', flush=True)
            time.sleep(2)
            continue

        ids = [e['id'] for e in r.json()]
        if not ids:
            print(f'Done! Total deleted: {total_deleted}', flush=True)
            break
    except Exception as e:
        print(f'Get exception: {e}', flush=True)
        time.sleep(5)
        continue

    # Delete each ID with retry
    deleted_this_batch = 0
    for id in ids:
        for attempt in range(max_retries):
            try:
                r = requests.delete(
                    f'{SUPABASE_URL}/rest/v1/evaluations?id=eq.{id}',
                    headers=headers,
                    timeout=10
                )
                if r.status_code in [200, 204]:
                    deleted_this_batch += 1
                    break
                elif r.status_code == 500:
                    time.sleep(1)
                else:
                    break
            except Exception:
                time.sleep(2)

    total_deleted += deleted_this_batch
    print(f'Deleted: {total_deleted}', flush=True)
    time.sleep(0.5)

print(f'COMPLETE: {total_deleted} evaluations deleted')
