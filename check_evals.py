#!/usr/bin/env python3
"""Quick check of evaluation counts."""
import sys
sys.path.insert(0, 'src')

from core.supabase_pagination import SupabaseClient

client = SupabaseClient()
ids = client.fetch_evaluated_product_ids()
print(f"Products with evaluations: {len(ids)}")
print(f"Total products: {len(client.fetch_products())}")
