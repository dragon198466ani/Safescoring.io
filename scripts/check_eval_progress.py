#!/usr/bin/env python3
"""
Check evaluation progress - shows how many evaluations were made by Claude Code CLI
"""
import os
import sys
sys.path.insert(0, 'src')
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import requests
from dotenv import load_dotenv

load_dotenv('.env')
load_dotenv('config/.env')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

def main():
    print("=" * 60)
    print("EVALUATION PROGRESS CHECK")
    print("=" * 60)

    # Count by evaluated_by
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/evaluations?select=evaluated_by&limit=10000',
        headers=headers
    )

    if r.status_code == 200:
        evals = r.json()
        by_model = {}
        for e in evals:
            model = e.get('evaluated_by', 'unknown')
            by_model[model] = by_model.get(model, 0) + 1

        print(f"\nEvaluations by model (sample of {len(evals)}):")
        for model, count in sorted(by_model.items(), key=lambda x: -x[1]):
            print(f"  {model}: {count}")

        claude_code = by_model.get('claude_code_opus_4.5', 0)
        print(f"\n>>> Claude Code CLI evaluations: {claude_code}")
    else:
        print(f"Error: {r.status_code} - {r.text[:200]}")

    # Get some recent Claude Code evaluations
    r2 = requests.get(
        f'{SUPABASE_URL}/rest/v1/evaluations?evaluated_by=eq.claude_code_opus_4.5&select=product_id,norm_id,result,why_this_result&order=id.desc&limit=5',
        headers=headers
    )

    if r2.status_code == 200 and r2.json():
        print("\nMost recent Claude Code evaluations:")
        for e in r2.json():
            just = e.get('why_this_result', '')[:50]
            print(f"  Product {e['product_id']} × Norm {e['norm_id']}: {e['result']} - {just}...")

    print("=" * 60)


if __name__ == '__main__':
    main()
