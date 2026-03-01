#!/usr/bin/env python3
"""
Purge NULL evaluations from Supabase in small batches to avoid statement timeout.
Uses ID-based deletion in chunks. Auto-retries on connection errors.
"""
import sys
import os
import time
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from src.core.config import SUPABASE_URL, get_supabase_headers

BATCH_SIZE = 500
HEADERS = get_supabase_headers(use_service_key=True)

# Resilient session with retry
session = requests.Session()
retry = Retry(total=5, backoff_factor=2, status_forcelist=[429, 500, 502, 503, 504])
session.mount('https://', HTTPAdapter(max_retries=retry))


def delete_batch():
    """Fetch a batch of NULL eval IDs and delete them. Returns count deleted or -1 on error."""
    try:
        r = session.get(
            f'{SUPABASE_URL}/rest/v1/evaluations?evaluated_by=is.null&select=id&limit={BATCH_SIZE}&order=id',
            headers=HEADERS, timeout=60
        )
        if r.status_code != 200:
            print(f'  [ERR] Fetch failed: {r.status_code} {r.text[:200]}')
            return -1

        ids = [x['id'] for x in r.json()]
        if not ids:
            return 0

        ids_str = ','.join(str(i) for i in ids)
        h = dict(HEADERS)
        h['Prefer'] = 'return=minimal'
        r2 = session.delete(
            f'{SUPABASE_URL}/rest/v1/evaluations?id=in.({ids_str})',
            headers=h, timeout=120
        )
        if r2.status_code in (200, 204):
            return len(ids)
        else:
            print(f'  [ERR] Delete failed: {r2.status_code} {r2.text[:200]}')
            return -1
    except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
        print(f'  [CONN] Connection error, retrying in 5s... ({type(e).__name__})')
        time.sleep(5)
        return -1


def main():
    print('=' * 60)
    print('  PURGE: NULL evaluations (batch delete by ID)')
    print('=' * 60)

    total_deleted = 0
    batch_num = 0
    consecutive_errors = 0

    while True:
        batch_num += 1
        deleted = delete_batch()

        if deleted == 0:
            print(f'\n  [DONE] No more NULL evaluations found.')
            break
        elif deleted < 0:
            consecutive_errors += 1
            if consecutive_errors > 10:
                print(f'\n  [ABORT] Too many consecutive errors.')
                break
            continue

        total_deleted += deleted
        consecutive_errors = 0

        if batch_num % 10 == 0:
            print(f'  Batch {batch_num}: {total_deleted:,} deleted so far...')

    print(f'\n  Total deleted: {total_deleted:,}')
    print(f'  Batches: {batch_num}')
    print('=' * 60)

    # Also purge reference_transfer evals
    print('\n  Purging reference_transfer evals...')
    rt_deleted = 0
    while True:
        try:
            r = session.get(
                f'{SUPABASE_URL}/rest/v1/evaluations?evaluated_by=eq.reference_transfer&select=id&limit={BATCH_SIZE}&order=id',
                headers=HEADERS, timeout=60
            )
            if r.status_code != 200 or not r.json():
                break
            ids = [x['id'] for x in r.json()]
            if not ids:
                break
            ids_str = ','.join(str(i) for i in ids)
            h = dict(HEADERS)
            h['Prefer'] = 'return=minimal'
            r2 = session.delete(
                f'{SUPABASE_URL}/rest/v1/evaluations?id=in.({ids_str})',
                headers=h, timeout=120
            )
            if r2.status_code in (200, 204):
                rt_deleted += len(ids)
                print(f'  reference_transfer: {rt_deleted:,} deleted...')
        except Exception as e:
            print(f'  [CONN] {e}, retrying...')
            time.sleep(5)
            continue

    print(f'  reference_transfer deleted: {rt_deleted:,}')
    print(f'\n  GRAND TOTAL purged: {total_deleted + rt_deleted:,}')
    print('=' * 60)


if __name__ == '__main__':
    main()
