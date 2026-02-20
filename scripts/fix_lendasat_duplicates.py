#!/usr/bin/env python3
"""
Fix duplicate evaluations for Lendasat.
Keeps only the most recent evaluation for each (product_id, norm_id) pair.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

import requests
from core.config import SUPABASE_URL, get_supabase_headers
from collections import defaultdict

def main():
    headers = get_supabase_headers(use_service_key=True)

    print("Fixing Lendasat evaluation duplicates...")

    # 1. Fetch all evaluations for Lendasat
    print("\n[1/3] Fetching all evaluations...")
    all_evals = []
    offset = 0
    while True:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.1657&select=id,norm_id,evaluation_date&order=evaluation_date.desc&limit=1000&offset={offset}",
            headers=headers
        )
        if r.status_code != 200:
            break
        batch = r.json()
        if not batch:
            break
        all_evals.extend(batch)
        print(f"   Fetched {len(all_evals)} records...", end="\r")
        if len(batch) < 1000:
            break
        offset += 1000

    print(f"\n   Total: {len(all_evals)} evaluation records")

    # 2. Find duplicates - keep only most recent for each norm_id
    print("\n[2/3] Identifying duplicates...")
    by_norm = defaultdict(list)
    for ev in all_evals:
        by_norm[ev['norm_id']].append(ev)

    ids_to_delete = []
    for norm_id, evals in by_norm.items():
        if len(evals) > 1:
            # Sort by date desc (most recent first)
            evals.sort(key=lambda x: x.get('evaluation_date', ''), reverse=True)
            # Keep first, delete rest
            for ev in evals[1:]:
                ids_to_delete.append(ev['id'])

    print(f"   Unique norms: {len(by_norm)}")
    print(f"   Duplicates to delete: {len(ids_to_delete)}")

    # 3. Delete duplicates in batches
    if ids_to_delete:
        print("\n[3/3] Deleting duplicates...")
        deleted = 0
        batch_size = 100
        for i in range(0, len(ids_to_delete), batch_size):
            batch_ids = ids_to_delete[i:i+batch_size]
            ids_str = ','.join(str(id) for id in batch_ids)

            r = requests.delete(
                f"{SUPABASE_URL}/rest/v1/evaluations?id=in.({ids_str})",
                headers=headers
            )
            if r.status_code in [200, 204]:
                deleted += len(batch_ids)
                print(f"   Deleted {deleted}/{len(ids_to_delete)}...", end="\r")

        print(f"\n   ✓ Deleted {deleted} duplicate records")
    else:
        print("\n[3/3] No duplicates found")

    # Verify final count
    r = requests.head(
        f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.1657",
        headers={**headers, 'Prefer': 'count=exact'}
    )
    content_range = r.headers.get('Content-Range', '')
    if '/' in content_range:
        final_count = content_range.split('/')[-1]
        print(f"\n✓ Final unique evaluations: {final_count}")
        print(f"  Remaining to evaluate: {2159 - int(final_count)} norms")

if __name__ == '__main__':
    main()
