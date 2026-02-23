#!/usr/bin/env python3
"""
SAFESCORING.IO - Parallel Evaluation
Launches multiple SmartEvaluator instances to speed up product evaluation.
Each worker processes a specific range of products.

Fixed: Supabase key from config, correct -m command, paginated progress check.
"""

import subprocess
import sys
import os
import time
import requests
import argparse
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Import credentials from config module
from src.core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

HEADERS = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
}

# Reusable session with retry
session = requests.Session()
retry = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
session.mount('https://', HTTPAdapter(max_retries=retry))


def fetch_all_paginated(endpoint, select, extra_filter=""):
    """Fetch all rows with pagination (avoid 1000 row limit)."""
    all_rows = []
    offset = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{endpoint}?select={select}&limit=1000&offset={offset}{extra_filter}"
        r = session.get(url, headers=HEADERS, timeout=60)
        if r.status_code != 200:
            print(f"   [WARN] fetch {endpoint}: {r.status_code}")
            break
        data = r.json()
        if not data:
            break
        all_rows.extend(data)
        if len(data) < 1000:
            break
        offset += len(data)
    return all_rows


def get_progress():
    """Get current evaluation progress (lightweight: count per product)."""
    # Get product list (paginated)
    products = fetch_all_paginated("products", "id,name", "&order=id")

    # Get distinct evaluated product IDs (paginated)
    eval_pids = set()
    offset = 0
    while True:
        r = session.get(
            f"{SUPABASE_URL}/rest/v1/evaluations?select=product_id&limit=1000&offset={offset}",
            headers=HEADERS, timeout=60
        )
        if r.status_code != 200 or not r.json():
            break
        data = r.json()
        for e in data:
            eval_pids.add(e['product_id'])
        if len(data) < 1000:
            break
        offset += len(data)

    evaluated = [p for p in products if p['id'] in eval_pids]
    not_evaluated = [p for p in products if p['id'] not in eval_pids]

    return evaluated, not_evaluated, products


def main():
    parser = argparse.ArgumentParser(description='Parallel evaluation')
    parser.add_argument('--workers', type=int, default=5, help='Number of workers (default: 5)')
    parser.add_argument('--product-ids', type=str, help='Comma-separated product IDs to evaluate')
    args = parser.parse_args()

    print("=" * 60)
    print("  SAFE SCORING - PARALLEL EVALUATION")
    print("=" * 60)

    # Check progress
    evaluated, not_evaluated, products = get_progress()
    print(f"\nProgress: {len(evaluated)}/{len(products)} products evaluated")
    print(f"Remaining: {len(not_evaluated)}")

    if args.product_ids:
        target_ids = [int(x.strip()) for x in args.product_ids.split(",")]
        products_to_eval = [p for p in products if p['id'] in target_ids]
        print(f"Targeting {len(products_to_eval)} specific products")
    else:
        products_to_eval = not_evaluated
        if not products_to_eval:
            print("All products already evaluated!")
            return

    num_workers = min(args.workers, len(products_to_eval))
    chunk_size = len(products_to_eval) // num_workers

    print(f"\nLaunching {num_workers} workers...")
    print(f"Each worker processes ~{chunk_size} products")

    # Find all product indices in the full list
    all_product_ids = [p['id'] for p in products]

    processes = []
    for i in range(num_workers):
        # Calculate which products this worker handles
        start = i * chunk_size
        end = start + chunk_size if i < num_workers - 1 else len(products_to_eval)
        worker_products = products_to_eval[start:end]

        if not worker_products:
            continue

        # Find start index in full product list
        first_pid = worker_products[0]['id']
        start_idx = all_product_ids.index(first_pid) if first_pid in all_product_ids else 0

        print(f"\n  Worker {i+1}: {len(worker_products)} products (start index {start_idx})")
        print(f"    First: {worker_products[0]['name']}")

        # Launch worker using correct -m module syntax
        cmd = [
            sys.executable,
            '-u',
            '-m', 'src.core.smart_evaluator',
            '--start', str(start_idx),
            '--limit', str(len(worker_products)),
            '--worker', str(i + 1),
            '--resume'
        ]

        log_file = open(f'worker_{i+1}.log', 'w', encoding='utf-8')

        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'
        env['PYTHONUNBUFFERED'] = '1'

        proc = subprocess.Popen(
            cmd,
            stdout=log_file,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            env=env,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        processes.append((i + 1, proc, log_file, worker_products[0]['name']))

    print(f"\n{len(processes)} workers launched!")
    print("Logs: worker_1.log, worker_2.log, ...")
    print("\nMonitoring progress (Ctrl+C to stop)...")

    initial_count = len(evaluated)
    start_time = time.time()

    try:
        while True:
            time.sleep(30)

            try:
                evaluated, not_evaluated, _ = get_progress()
                current_count = len(evaluated)
            except Exception:
                continue

            elapsed = time.time() - start_time
            new_evals = current_count - initial_count
            speed = new_evals / (elapsed / 60) if elapsed > 60 else 0

            if speed > 0:
                remaining = len(products_to_eval) - new_evals
                eta_minutes = remaining / speed if speed > 0 else 0
                eta_str = f"~{eta_minutes:.0f}min" if eta_minutes < 60 else f"~{eta_minutes/60:.1f}h"
            else:
                eta_str = "calculating..."

            active_workers = sum(1 for _, p, _, _ in processes if p.poll() is None)

            print(f"\r  {current_count}/{len(products)} ({current_count*100//max(len(products),1)}%) | "
                  f"+{new_evals} new | "
                  f"Workers: {active_workers}/{len(processes)} | "
                  f"ETA: {eta_str}     ", end="", flush=True)

            all_done = all(p.poll() is not None for _, p, _, _ in processes)
            if all_done:
                print(f"\n\nDone! {current_count} products evaluated (+{new_evals} new).")
                break

    except KeyboardInterrupt:
        print("\n\nStopping workers...")
        for i, proc, log_file, _ in processes:
            proc.terminate()
            log_file.close()
        print("Workers stopped.")
        return

    # Close log files
    for _, _, log_file, _ in processes:
        log_file.close()

    # Print worker exit codes
    print("\nWorker results:")
    for wid, proc, _, first_product in processes:
        code = proc.returncode
        status = "OK" if code == 0 else f"ERROR (exit {code})"
        print(f"  Worker {wid}: {status} - started with {first_product}")


if __name__ == '__main__':
    main()
