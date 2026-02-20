#!/usr/bin/env python3
"""
Supabase utilities for automatic pagination beyond 1000 row limit.
Import this module in any script that needs to fetch large datasets.

Usage:
    from supabase_utils import fetch_all, update_batch, get_headers, SUPABASE_URL

    # Fetch all products (auto-pagination)
    products = fetch_all('products', select='id,name,slug')

    # Fetch with filters
    evals = fetch_all('evaluations', select='*', filters={'product_id': f'eq.{product_id}'})

    # Update multiple records
    update_batch('products', updates, key='id')
"""
import sys
import io

# Only set encoding if running as main script (not when imported)
if __name__ == '__main__':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import os
import requests
from dotenv import load_dotenv

# Load environment
load_dotenv()
load_dotenv('web/.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')

def get_headers(return_minimal=False):
    """Get Supabase API headers."""
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
    }
    if return_minimal:
        headers['Prefer'] = 'return=minimal'
    return headers


def fetch_all(table, select='*', filters=None, order=None, batch_size=1000, verbose=False):
    """
    Fetch all records from a Supabase table, automatically handling pagination.

    Args:
        table: Table name (e.g., 'products', 'evaluations', 'norms')
        select: Columns to select (default '*')
        filters: Dict of filters (e.g., {'product_id': 'eq.123', 'result': 'eq.YES'})
        order: Order by column (e.g., 'id.asc' or 'created_at.desc')
        batch_size: Number of records per request (max 1000)
        verbose: Print progress

    Returns:
        List of all records
    """
    all_records = []
    offset = 0
    headers = get_headers()

    while True:
        # Build URL
        url = f'{SUPABASE_URL}/rest/v1/{table}?select={select}&limit={batch_size}&offset={offset}'

        # Add filters
        if filters:
            for key, value in filters.items():
                url += f'&{key}={value}'

        # Add order
        if order:
            url += f'&order={order}'

        # Fetch batch
        response = requests.get(url, headers=headers)

        if response.status_code != 200:
            print(f"[ERROR] Supabase fetch failed: {response.status_code} - {response.text[:200]}")
            break

        batch = response.json()

        if not batch:
            break

        all_records.extend(batch)

        if verbose:
            print(f"  Fetched {len(all_records)} records from {table}...")

        # Check if we got less than batch_size (last page)
        if len(batch) < batch_size:
            break

        offset += batch_size

    if verbose:
        print(f"  Total: {len(all_records)} records from {table}")

    return all_records


def fetch_by_ids(table, ids, select='*', id_column='id', batch_size=100):
    """
    Fetch records by a list of IDs, handling the IN clause limit.

    Args:
        table: Table name
        ids: List of IDs to fetch
        select: Columns to select
        id_column: Name of the ID column
        batch_size: Number of IDs per request (recommended 100 for URL length)

    Returns:
        Dict mapping ID to record
    """
    results = {}
    headers = get_headers()

    for i in range(0, len(ids), batch_size):
        batch_ids = ids[i:i+batch_size]
        ids_str = ','.join(str(id) for id in batch_ids)

        url = f'{SUPABASE_URL}/rest/v1/{table}?{id_column}=in.({ids_str})&select={select}'
        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            for record in response.json():
                results[record[id_column]] = record

    return results


def update_batch(table, updates, key='id', batch_size=50, verbose=False):
    """
    Update multiple records in a table.

    Args:
        table: Table name
        updates: List of dicts, each containing the key field and fields to update
        key: Primary key field name
        batch_size: Number of updates per transaction
        verbose: Print progress

    Returns:
        Tuple of (success_count, fail_count)
    """
    headers = get_headers(return_minimal=True)
    success = 0
    failed = 0

    for i, update in enumerate(updates):
        if key not in update:
            print(f"[WARNING] Missing key '{key}' in update: {update}")
            failed += 1
            continue

        key_value = update[key]
        data = {k: v for k, v in update.items() if k != key}

        url = f'{SUPABASE_URL}/rest/v1/{table}?{key}=eq.{key_value}'
        response = requests.patch(url, headers=headers, json=data)

        if response.status_code in [200, 204]:
            success += 1
        else:
            failed += 1
            if verbose:
                print(f"[FAIL] Update {key}={key_value}: {response.status_code}")

        if verbose and (i + 1) % 100 == 0:
            print(f"  Updated {i + 1}/{len(updates)}...")

    return success, failed


def insert_batch(table, records, batch_size=100, on_conflict=None, verbose=False):
    """
    Insert multiple records into a table.

    Args:
        table: Table name
        records: List of records to insert
        batch_size: Number of records per request
        on_conflict: Column for upsert (e.g., 'id' or 'slug')
        verbose: Print progress

    Returns:
        Tuple of (success_count, fail_count)
    """
    headers = get_headers(return_minimal=True)

    if on_conflict:
        headers['Prefer'] = 'resolution=merge-duplicates'

    success = 0
    failed = 0

    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]

        url = f'{SUPABASE_URL}/rest/v1/{table}'
        if on_conflict:
            url += f'?on_conflict={on_conflict}'

        response = requests.post(url, headers=headers, json=batch)

        if response.status_code in [200, 201, 204]:
            success += len(batch)
        else:
            failed += len(batch)
            if verbose:
                print(f"[FAIL] Insert batch {i}-{i+len(batch)}: {response.status_code} - {response.text[:100]}")

        if verbose and (i + batch_size) % 500 == 0:
            print(f"  Inserted {min(i + batch_size, len(records))}/{len(records)}...")

    return success, failed


def delete_batch(table, filters, verbose=False):
    """
    Delete records matching filters.

    Args:
        table: Table name
        filters: Dict of filters
        verbose: Print info

    Returns:
        Boolean success
    """
    headers = get_headers(return_minimal=True)

    url = f'{SUPABASE_URL}/rest/v1/{table}'
    for key, value in filters.items():
        url += f'?{key}={value}' if '?' not in url else f'&{key}={value}'

    response = requests.delete(url, headers=headers)

    if verbose:
        print(f"Delete from {table}: {response.status_code}")

    return response.status_code in [200, 204]


def count_records(table, filters=None):
    """
    Count records in a table.

    Args:
        table: Table name
        filters: Optional filters

    Returns:
        Integer count
    """
    headers = get_headers()
    headers['Prefer'] = 'count=exact'
    headers['Range-Unit'] = 'items'

    url = f'{SUPABASE_URL}/rest/v1/{table}?select=id'
    if filters:
        for key, value in filters.items():
            url += f'&{key}={value}'

    response = requests.head(url, headers=headers)

    # Parse Content-Range header: "0-999/1234"
    content_range = response.headers.get('Content-Range', '*/0')
    total = content_range.split('/')[-1]

    return int(total) if total != '*' else 0


# Convenience function for common patterns
def get_all_products(select='id,name,slug,type_id'):
    """Fetch all products."""
    return fetch_all('products', select=select)


def get_all_norms(select='id,code,title,pillar'):
    """Fetch all norms."""
    return fetch_all('norms', select=select)


def get_product_evaluations(product_id, select='norm_id,result,why_this_result'):
    """Fetch all evaluations for a product."""
    return fetch_all('evaluations', select=select, filters={'product_id': f'eq.{product_id}'})


def get_all_evaluations(select='product_id,norm_id,result'):
    """Fetch ALL evaluations (can be millions of rows)."""
    return fetch_all('evaluations', select=select, verbose=True)


# Test
if __name__ == '__main__':
    print("Testing Supabase utilities...")

    # Test count
    product_count = count_records('products')
    print(f"Products count: {product_count}")

    # Test fetch all
    products = fetch_all('products', select='id,name', verbose=True)
    print(f"Fetched {len(products)} products")

    # Test fetch by IDs
    if products:
        sample_ids = [p['id'] for p in products[:5]]
        by_id = fetch_by_ids('products', sample_ids, select='id,name')
        print(f"Fetched by ID: {list(by_id.values())[:2]}")

    print("\nAll tests passed!")
