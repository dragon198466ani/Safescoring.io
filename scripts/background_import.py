#!/usr/bin/env python3
"""
BACKGROUND IMPORT - Runs continuously, trying to import when database is available.
Saves progress and can be resumed.
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import json
import requests
import time
from datetime import datetime
from core.config import SUPABASE_URL, get_supabase_headers

WRITE_HEADERS = get_supabase_headers(use_service_key=True)
WRITE_HEADERS['Content-Type'] = 'application/json'
WRITE_HEADERS['Prefer'] = 'resolution=merge-duplicates,return=minimal'

READ_HEADERS = get_supabase_headers()

PROGRESS_FILE = 'data/import_progress.json'
LOG_FILE = 'data/import_log.txt'

def log(msg):
    """Log to file and print."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    line = f"[{timestamp}] {msg}"
    print(line)
    with open(LOG_FILE, 'a') as f:
        f.write(line + '\n')

def load_progress():
    """Load progress from checkpoint file."""
    try:
        with open(PROGRESS_FILE, 'r') as f:
            return json.load(f)
    except:
        return {'last_index': 0, 'saved': 0, 'failed': 0, 'skipped': 0}

def save_progress(progress):
    """Save progress to checkpoint file."""
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(progress, f)

def is_database_ready():
    """Check if database is responding."""
    try:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/product_types?limit=1',
            headers=READ_HEADERS,
            timeout=10
        )
        return r.status_code == 200
    except:
        return False

def try_insert_batch(batch):
    """Try to insert a batch. Returns (success, count_inserted, error)."""
    try:
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/evaluations?on_conflict=product_id,norm_id,evaluation_date',
            headers=WRITE_HEADERS,
            json=batch,
            timeout=90
        )
        if r.status_code in [200, 201]:
            return True, len(batch), None
        elif r.status_code == 500:
            error = r.json().get('message', 'Unknown')
            return False, 0, error
        else:
            return False, 0, f"Status {r.status_code}"
    except requests.exceptions.Timeout:
        return False, 0, "Request timeout"
    except Exception as e:
        return False, 0, str(e)[:100]

def main():
    log("=" * 50)
    log("BACKGROUND IMPORT STARTED")
    log("=" * 50)

    # Load evaluations
    log("Loading evaluations from JSON...")
    with open('data/claude_opus_evaluations.json', 'r') as f:
        evaluations = json.load(f)
    total = len(evaluations)
    log(f"Total: {total} evaluations")

    # Load progress
    progress = load_progress()
    start_idx = progress['last_index']
    log(f"Resuming from index {start_idx}")

    # Batch size - start small
    batch_size = 5
    wait_between = 3  # seconds
    wait_on_error = 60  # seconds
    check_interval = 30  # seconds to wait when DB not ready

    consecutive_failures = 0
    max_failures = 10

    log(f"Config: batch={batch_size}, wait={wait_between}s, error_wait={wait_on_error}s")
    log("")

    try:
        idx = start_idx
        while idx < total:
            # Check if database is ready
            if not is_database_ready():
                log(f"Database not ready, waiting {check_interval}s...")
                time.sleep(check_interval)
                continue

            # Get batch
            batch = evaluations[idx:idx + batch_size]

            # Try insert
            success, count, error = try_insert_batch(batch)

            if success:
                progress['saved'] += count
                progress['last_index'] = idx + batch_size
                consecutive_failures = 0

                if (idx // batch_size) % 100 == 0:
                    pct = (idx / total) * 100
                    log(f"Progress: {idx}/{total} ({pct:.1f}%) - {progress['saved']} saved")
                    save_progress(progress)

                idx += batch_size
                time.sleep(wait_between)

            else:
                consecutive_failures += 1
                log(f"Batch failed at {idx}: {error}")

                if consecutive_failures >= max_failures:
                    log(f"Too many failures ({max_failures}), reducing batch size")
                    if batch_size > 1:
                        batch_size = max(1, batch_size // 2)
                        log(f"New batch size: {batch_size}")
                    consecutive_failures = 0

                log(f"Waiting {wait_on_error}s before retry...")
                time.sleep(wait_on_error)

            # Checkpoint every 1000
            if idx % 1000 == 0:
                save_progress(progress)

    except KeyboardInterrupt:
        log("\nInterrupted by user")

    # Final save
    save_progress(progress)
    log(f"\nFinal: {progress['saved']} saved, {progress['failed']} failed")
    log("Progress saved. Run again to resume.")

if __name__ == "__main__":
    main()
