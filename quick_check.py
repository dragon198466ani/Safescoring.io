#!/usr/bin/env python3
"""Quick progress check."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
from core.supabase_pagination import SupabaseClient
client = SupabaseClient()
ids = client.fetch_evaluated_product_ids()
print(f"Evaluated: {len(ids)}/1547")
