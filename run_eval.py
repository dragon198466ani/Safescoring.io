#!/usr/bin/env python3
"""Quick evaluation script with Groq"""
import os
import sys

# Force Groq API key
os.environ['GROQ_API_KEY'] = os.environ.get('GROQ_API_KEY', '')  # Set via environment or config/.env

sys.path.insert(0, '.')

import requests
import time
from src.core.config import SUPABASE_URL, get_supabase_headers

# Reload config with env
import importlib
import src.core.config as cfg
cfg.GROQ_API_KEY = os.environ['GROQ_API_KEY']

from src.core.smart_evaluator import SmartEvaluator

def main():
    headers = get_supabase_headers()

    # Get evaluated products
    r = requests.get(f'{SUPABASE_URL}/rest/v1/evaluations?select=product_id', headers=headers)
    evals = r.json() if r.status_code == 200 else []
    evaluated_ids = set(e['product_id'] for e in evals)

    # Get all products
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=*&order=name', headers=headers)
    all_products = r.json() if r.status_code == 200 else []

    # Filter unevaluated
    products = [p for p in all_products if p['id'] not in evaluated_ids]

    print(f"Products to evaluate: {len(products)}")
    print(f"Groq API Key: {cfg.GROQ_API_KEY[:20]}...")

    if not products:
        print("All products already evaluated!")
        return

    # Limit for testing
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    products = products[:limit]

    evaluator = SmartEvaluator()
    evaluator.load_data()

    # Patch api_provider with Groq key
    evaluator.ai_provider.disabled_apis.discard('Groq')

    for i, product in enumerate(products):
        print(f"\n[{i+1}/{len(products)}] {product['name']}...")

        try:
            result = evaluator.evaluate_product(product, enable_expert_review=False)

            if result and len(result) == 2:
                evaluations, applicable_norms = result

                if evaluations:
                    evaluator.save_evaluations(product['id'], evaluations, applicable_norms)

                    # Count by pillar
                    from collections import Counter
                    results = Counter(v[0] for v in evaluations.values())
                    print(f"   Saved: {len(evaluations)} evals - {dict(results)}")

            time.sleep(1)

        except Exception as e:
            print(f"   ERROR: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    main()
