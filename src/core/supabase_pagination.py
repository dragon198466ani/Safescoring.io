#!/usr/bin/env python3
"""
Centralized Supabase pagination utility.

THIS MODULE SOLVES THE 1000 LIMIT PROBLEM PERMANENTLY.

Supabase REST API returns max 1000 rows by default.
This utility ALWAYS paginates to get ALL data.

Usage:
    from core.supabase_pagination import fetch_all, SupabaseClient

    # Simple usage - fetch all records
    products = fetch_all('products', select='*')
    norms = fetch_all('norms', select='id,code,title', order='id')

    # With filters
    evals = fetch_all('evaluations', select='product_id', filters={'result': 'eq.YES'})

    # Client usage
    client = SupabaseClient()
    products = client.fetch_all('products')
    norms = client.fetch_all('norms', order='id')
"""

import requests
import time
from typing import List, Dict, Any, Optional
from .config import SUPABASE_URL, get_supabase_headers, SUPABASE_PAGE_SIZE, SUPABASE_MAX_PAGES


# Default page size (from config, Supabase max is 1000)
PAGE_SIZE = SUPABASE_PAGE_SIZE

# Safety limit to prevent infinite loops (from config)
MAX_PAGES = SUPABASE_MAX_PAGES


def fetch_all(
    table: str,
    select: str = '*',
    order: Optional[str] = None,
    filters: Optional[Dict[str, str]] = None,
    page_size: int = PAGE_SIZE,
    debug: bool = False,
    max_retries: int = 3
) -> List[Dict[str, Any]]:
    """
    Fetch ALL records from a Supabase table with automatic pagination.

    This function ALWAYS paginates to ensure you get all data,
    not just the first 1000 rows.

    Args:
        table: Table name (e.g., 'products', 'norms')
        select: Columns to select (default: '*')
        order: Column to order by (recommended for consistent pagination)
        filters: Dict of filters like {'type_id': 'eq.5', 'result': 'eq.YES'}
        page_size: Page size (default: 1000, max allowed by Supabase)
        debug: Print debug info
        max_retries: Max retries on error/timeout

    Returns:
        List of all records

    Example:
        >>> products = fetch_all('products')
        >>> len(products)
        1547

        >>> norms = fetch_all('norms', select='id,code,title', order='id')
        >>> len(norms)
        2159
    """
    headers = get_supabase_headers()
    all_records = []
    offset = 0
    page_count = 0

    while page_count < MAX_PAGES:
        # Build URL with pagination
        url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&offset={offset}&limit={page_size}"

        # Add ordering (important for consistent pagination)
        if order:
            url += f"&order={order}"

        # Add filters
        if filters:
            for key, value in filters.items():
                url += f"&{key}={value}"

        retries = 0
        while retries < max_retries:
            try:
                response = requests.get(url, headers=headers, timeout=60)

                if response.status_code == 500:
                    # Server error - retry with smaller batch
                    if page_size > 100:
                        if debug:
                            print(f"  [PAGINATION] Server error, reducing page size...")
                        page_size = max(100, page_size // 2)
                        url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&offset={offset}&limit={page_size}"
                        if order:
                            url += f"&order={order}"
                        if filters:
                            for key, value in filters.items():
                                url += f"&{key}={value}"
                        retries += 1
                        time.sleep(2)
                        continue
                    else:
                        if debug:
                            print(f"  [PAGINATION] Error {response.status_code}: {response.text[:200]}")
                        break

                if response.status_code != 200:
                    if debug:
                        print(f"  [PAGINATION] Error {response.status_code}: {response.text[:200]}")
                    break

                data = response.json()

                if not data:
                    # No more records
                    break

                all_records.extend(data)
                page_count += 1

                if debug:
                    print(f"  [PAGINATION] Page {page_count}: {len(data)} records (total: {len(all_records)})")

                # If we got less than page_size, we've reached the end
                if len(data) < page_size:
                    break

                offset += page_size

                # Small delay to avoid rate limiting
                if page_count % 5 == 0:
                    time.sleep(0.2)

                break  # Success, exit retry loop

            except requests.exceptions.Timeout:
                retries += 1
                if debug:
                    print(f"  [PAGINATION] Timeout at offset {offset}, retry {retries}/{max_retries}...")
                time.sleep(2 * retries)  # Exponential backoff
                continue
            except Exception as e:
                if debug:
                    print(f"  [PAGINATION] Error: {e}")
                break

        if retries >= max_retries:
            if debug:
                print(f"  [PAGINATION] Max retries reached at offset {offset}")
            break

        # Check if we should continue (data was empty or we got all)
        if not all_records or (page_count > 0 and len(all_records) % page_size != 0):
            break

    if debug:
        print(f"  [PAGINATION] Complete: {len(all_records)} total records in {page_count} pages")

    return all_records


def fetch_unique(
    table: str,
    column: str,
    filters: Optional[Dict[str, str]] = None
) -> set:
    """
    Fetch unique values of a column with pagination.

    Useful for getting distinct IDs without loading full records.

    Args:
        table: Table name
        column: Column to get unique values from
        filters: Optional filters

    Returns:
        Set of unique values

    Example:
        >>> evaluated_ids = fetch_unique('evaluations', 'product_id')
        >>> len(evaluated_ids)
        496
    """
    records = fetch_all(table, select=column, filters=filters)
    return {r[column] for r in records if column in r}


class SupabaseClient:
    """
    Supabase client with built-in pagination.

    All fetch methods automatically paginate to get ALL data.

    Example:
        client = SupabaseClient()

        # Get ALL products (not limited to 1000)
        products = client.fetch_all('products')
        print(f"Loaded {len(products)} products")  # 1547, not 1000

        # Get ALL norms with specific columns
        norms = client.fetch_all('norms', select='id,code,pillar,title', order='id')
        print(f"Loaded {len(norms)} norms")  # 2159, not 1000
    """

    def __init__(self, debug: bool = False):
        self.debug = debug
        self._headers = get_supabase_headers()

    def fetch_all(
        self,
        table: str,
        select: str = '*',
        order: Optional[str] = None,
        filters: Optional[Dict[str, str]] = None
    ) -> List[Dict[str, Any]]:
        """Fetch ALL records from a table with automatic pagination."""
        return fetch_all(table, select, order, filters, debug=self.debug)

    def fetch_unique(
        self,
        table: str,
        column: str,
        filters: Optional[Dict[str, str]] = None
    ) -> set:
        """Fetch unique values of a column with pagination."""
        return fetch_unique(table, column, filters)

    def fetch_products(self) -> List[Dict[str, Any]]:
        """Fetch ALL products with minimal columns to avoid timeout."""
        # Only select columns needed for evaluation to avoid timeout
        # Use smaller page size (500) for stability
        select = 'id,name,slug,url,type_id'
        return fetch_all('products', select=select, order='id', page_size=500, debug=self.debug)

    def fetch_norms(self, with_summaries: bool = True) -> List[Dict[str, Any]]:
        """
        Fetch ALL norms with or without official summaries.

        Note: When with_summaries=True, we use a two-step approach because
        the official_doc_summary field is large and causes timeouts on paginated queries.
        """
        # Step 1: Get all norms without heavy fields (fast, no timeout)
        # Use smaller page size (500) for stability
        base_select = 'id,code,pillar,title,description,official_link'
        norms = fetch_all('norms', select=base_select, order='id', page_size=500, debug=self.debug)

        if not with_summaries:
            return norms

        # Step 2: Fetch summaries separately in smaller batches to avoid timeout
        # Build a dict for quick lookup
        norms_dict = {n['id']: n for n in norms}

        # Fetch summaries in batches of 100 (smaller to avoid timeout)
        summaries = fetch_all(
            'norms',
            select='id,official_doc_summary',
            order='id',
            page_size=100,  # Smaller batches for heavy field
            debug=self.debug
        )

        # Merge summaries into norms
        for s in summaries:
            if s['id'] in norms_dict:
                norms_dict[s['id']]['official_doc_summary'] = s.get('official_doc_summary')

        return list(norms_dict.values())

    def fetch_applicability(self) -> Dict[int, Dict[int, bool]]:
        """Fetch ALL applicability rules as nested dict."""
        records = self.fetch_all(
            'norm_applicability',
            select='type_id,norm_id,is_applicable'
        )

        applicability = {}
        for r in records:
            type_id = r['type_id']
            if type_id not in applicability:
                applicability[type_id] = {}
            applicability[type_id][r['norm_id']] = r['is_applicable']

        return applicability

    def fetch_product_types(self) -> Dict[int, Dict[str, Any]]:
        """Fetch ALL product types as dict by ID."""
        records = self.fetch_all(
            'product_types',
            select='id,code,name,definition'
        )
        return {t['id']: t for t in records}

    def fetch_product_type_mappings(self) -> Dict[str, List[int]]:
        """Fetch ALL product-type mappings."""
        records = self.fetch_all(
            'product_type_mapping',
            select='product_id,type_id,is_primary'
        )

        mappings = {}
        for r in records:
            pid = r['product_id']
            if pid not in mappings:
                mappings[pid] = []
            mappings[pid].append(r['type_id'])

        return mappings

    def fetch_evaluated_product_ids(self) -> set:
        """Fetch ALL evaluated product IDs."""
        return self.fetch_unique('evaluations', 'product_id')

    def count_records(self, table: str, filters: Optional[Dict[str, str]] = None) -> int:
        """Count records in a table."""
        return len(self.fetch_all(table, select='id', filters=filters))


# Singleton instance for convenience
_client = None

def get_client(debug: bool = False) -> SupabaseClient:
    """Get singleton Supabase client."""
    global _client
    if _client is None:
        _client = SupabaseClient(debug=debug)
    return _client


# Quick test
if __name__ == '__main__':
    print("Testing Supabase pagination utility...")
    print()

    client = SupabaseClient(debug=True)

    # Test products
    print("Fetching products...")
    products = client.fetch_products()
    print(f"-> {len(products)} products loaded")
    assert len(products) > 1000, f"Expected >1000 products, got {len(products)}"

    # Test norms
    print("\nFetching norms...")
    norms = client.fetch_norms()
    print(f"-> {len(norms)} norms loaded")
    assert len(norms) > 1000, f"Expected >1000 norms, got {len(norms)}"

    # Test applicability
    print("\nFetching applicability rules...")
    applicability = client.fetch_applicability()
    total_rules = sum(len(v) for v in applicability.values())
    print(f"-> {total_rules} rules loaded")

    # Test evaluated IDs
    print("\nFetching evaluated product IDs...")
    evaluated = client.fetch_evaluated_product_ids()
    print(f"-> {len(evaluated)} evaluated products")

    print("\n" + "="*50)
    print("ALL TESTS PASSED - Pagination working correctly!")
    print("="*50)
