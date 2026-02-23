#!/usr/bin/env python3
"""
SafeScoring Static Snapshot Generator

Generates a static JSON snapshot of all product scores that can be served
as a fallback when Supabase is unavailable.

The snapshot is written to web/public/data/scores-snapshot.json and served
by Next.js as a static file.

Usage:
    python -m core.snapshot_generator           # Generate snapshot
    python -m core.snapshot_generator --pretty  # Pretty-printed output
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from core.config import SUPABASE_URL, SUPABASE_KEY
from core.supabase_pagination import fetch_all


# Output paths
SNAPSHOT_DIR = os.path.join(
    os.path.dirname(__file__), '..', '..', 'web', 'public', 'data'
)
SNAPSHOT_FILE = os.path.join(SNAPSHOT_DIR, 'scores-snapshot.json')


def generate_snapshot(pretty: bool = False) -> dict:
    """
    Generate a static JSON snapshot of all product scores.

    The snapshot contains:
    - products: list of {id, name, slug, type_id, logo_url, scores, stats}
    - leaderboard: sorted product list by SAFE score
    - metadata: timestamp, version, count

    Returns:
        The snapshot dict
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[ERROR] Supabase not configured.")
        return None

    print("[SNAPSHOT] Generating static score snapshot...")
    start = time.time()

    # Fetch products
    print("  Fetching products...", end=' ', flush=True)
    products = fetch_all(
        'products',
        select='id,name,slug,type_id,logo_url,description,category,url',
        order='id',
    )
    print(f"{len(products)} products")

    # Fetch scoring results
    print("  Fetching scores...", end=' ', flush=True)
    scores = fetch_all(
        'safe_scoring_results',
        select='product_id,note_finale,score_s,score_a,score_f,score_e,'
               'note_consumer,s_consumer,a_consumer,f_consumer,e_consumer,'
               'note_essential,s_essential,a_essential,f_essential,e_essential,'
               'total_norms_evaluated,total_yes,total_no,total_na,total_tbd,'
               'calculated_at',
        order='product_id',
    )
    scores_by_product = {s['product_id']: s for s in scores}
    print(f"{len(scores)} scores")

    # Fetch product types
    print("  Fetching product types...", end=' ', flush=True)
    product_types = fetch_all('product_types', select='id,code,name', order='id')
    types_map = {t['id']: t for t in product_types}
    print(f"{len(product_types)} types")

    # Build snapshot
    snapshot_products = []

    for product in products:
        pid = product['id']
        score_data = scores_by_product.get(pid)

        entry = {
            'id': pid,
            'name': product.get('name'),
            'slug': product.get('slug'),
            'type_id': product.get('type_id'),
            'type_name': types_map.get(product.get('type_id'), {}).get('name'),
            'logo_url': product.get('logo_url'),
            'category': product.get('category'),
            'url': product.get('url'),
        }

        if score_data:
            entry['scores'] = {
                'full': {
                    'SAFE': score_data.get('note_finale'),
                    'S': score_data.get('score_s'),
                    'A': score_data.get('score_a'),
                    'F': score_data.get('score_f'),
                    'E': score_data.get('score_e'),
                },
                'consumer': {
                    'SAFE': score_data.get('note_consumer'),
                    'S': score_data.get('s_consumer'),
                    'A': score_data.get('a_consumer'),
                    'F': score_data.get('f_consumer'),
                    'E': score_data.get('e_consumer'),
                },
                'essential': {
                    'SAFE': score_data.get('note_essential'),
                    'S': score_data.get('s_essential'),
                    'A': score_data.get('a_essential'),
                    'F': score_data.get('f_essential'),
                    'E': score_data.get('e_essential'),
                },
            }
            entry['stats'] = {
                'total': score_data.get('total_norms_evaluated', 0),
                'yes': score_data.get('total_yes', 0),
                'no': score_data.get('total_no', 0),
                'na': score_data.get('total_na', 0),
                'tbd': score_data.get('total_tbd', 0),
            }
            entry['calculated_at'] = score_data.get('calculated_at')
        else:
            entry['scores'] = None
            entry['stats'] = None
            entry['calculated_at'] = None

        snapshot_products.append(entry)

    # Build leaderboard (sorted by SAFE score, descending)
    scored = [p for p in snapshot_products if p.get('scores') and p['scores']['full'].get('SAFE') is not None]
    leaderboard = sorted(scored, key=lambda x: x['scores']['full']['SAFE'], reverse=True)
    leaderboard_slim = [
        {
            'id': p['id'],
            'name': p['name'],
            'slug': p['slug'],
            'type_name': p.get('type_name'),
            'logo_url': p.get('logo_url'),
            'safe_score': p['scores']['full']['SAFE'],
            'scores': p['scores']['full'],
        }
        for p in leaderboard
    ]

    snapshot = {
        '_meta': {
            'generated_at': datetime.now().isoformat(),
            'version': '1.0',
            'product_count': len(snapshot_products),
            'scored_count': len(scored),
            'formula': '(YES + YESp) / (YES + YESp + NO) * 100',
        },
        'products': snapshot_products,
        'leaderboard': leaderboard_slim,
    }

    # Write to file
    os.makedirs(SNAPSHOT_DIR, exist_ok=True)

    indent = 2 if pretty else None
    with open(SNAPSHOT_FILE, 'w', encoding='utf-8') as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=indent, default=str)

    size = os.path.getsize(SNAPSHOT_FILE)
    duration = time.time() - start

    print(f"\n[DONE] Snapshot generated:")
    print(f"  File: {SNAPSHOT_FILE}")
    print(f"  Size: {size / 1024:.1f} KB")
    print(f"  Products: {len(snapshot_products)} ({len(scored)} with scores)")
    print(f"  Duration: {duration:.1f}s")

    return snapshot


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate static score snapshot')
    parser.add_argument('--pretty', action='store_true', help='Pretty-print JSON')
    args = parser.parse_args()

    generate_snapshot(pretty=args.pretty)
