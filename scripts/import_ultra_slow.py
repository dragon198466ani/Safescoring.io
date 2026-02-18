#!/usr/bin/env python3
"""
ULTRA SLOW IMPORTER - 1 evaluation at a time with very long waits.
Designed to work around Supabase statement_timeout on large tables.
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
WRITE_HEADERS['Prefer'] = 'return=minimal'

PROGRESS_FILE = 'data/import_progress.json'

def load_progress():
    """Load progress from checkpoint file."""
    try:
        with open(PROGRESS_FILE, 'r') as f:
            return json.load(f)
    except:
        return {'last_index': 0, 'saved': 0, 'failed': 0, 'failed_indices': []}

def save_progress(progress):
    """Save progress to checkpoint file."""
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(progress, f)

def insert_single(evaluation, max_retries=20, base_wait=10):
    """Insert a single evaluation with aggressive retries."""
    for attempt in range(max_retries):
        try:
            r = requests.post(
                f'{SUPABASE_URL}/rest/v1/evaluations',
                headers=WRITE_HEADERS,
                json=[evaluation],
                timeout=120  # 2 minute timeout
            )
            if r.status_code in [200, 201]:
                return True, None
            elif r.status_code == 409:
                # Conflict - already exists, that's OK
                return True, 'duplicate'
            elif r.status_code == 500:
                error = r.json().get('message', 'Unknown')
                if 'timeout' in error.lower():
                    wait = base_wait * (attempt + 1)
                    print(f"      Timeout, wait {wait}s (attempt {attempt+1}/{max_retries})")
                    time.sleep(wait)
                else:
                    return False, error
            else:
                return False, f"Status {r.status_code}: {r.text[:100]}"
        except requests.exceptions.Timeout:
            wait = base_wait * (attempt + 1)
            print(f"      Request timeout, wait {wait}s")
            time.sleep(wait)
        except Exception as e:
            wait = base_wait * (attempt + 1)
            print(f"      Exception: {str(e)[:50]}, wait {wait}s")
            time.sleep(wait)
    return False, "Max retries"

def main():
    print("=" * 60)
    print("  ULTRA SLOW IMPORTER")
    print("  1 evaluation at a time - designed for loaded database")
    print("=" * 60)

    # Load evaluations
    print("\nLoading evaluations from JSON...")
    with open('data/claude_opus_evaluations.json', 'r') as f:
        evaluations = json.load(f)
    total = len(evaluations)
    print(f"Total: {total} evaluations")

    # Load progress
    progress = load_progress()
    start_idx = progress['last_index']
    print(f"Resuming from index {start_idx} ({progress['saved']} saved, {progress['failed']} failed)")

    # Configuration
    delay_between = 2  # 2 seconds between each insert
    checkpoint_every = 100

    print(f"\nStarting import (delay={delay_between}s between inserts)...")
    print("Press Ctrl+C to stop - progress will be saved\n")

    try:
        for i in range(start_idx, total):
            evaluation = evaluations[i]

            success, error = insert_single(evaluation)

            if success:
                progress['saved'] += 1
                if error == 'duplicate':
                    pass  # Silent for duplicates
            else:
                progress['failed'] += 1
                progress['failed_indices'].append(i)
                print(f"    #{i} FAILED: {error}")

            progress['last_index'] = i + 1

            # Status every 100
            if (i + 1) % 100 == 0:
                pct = ((i + 1) / total) * 100
                print(f"  Progress: {i+1}/{total} ({pct:.2f}%) - {progress['saved']} saved, {progress['failed']} failed")

            # Checkpoint
            if (i + 1) % checkpoint_every == 0:
                save_progress(progress)

            time.sleep(delay_between)

    except KeyboardInterrupt:
        print("\n\nInterrupted! Saving progress...")
        save_progress(progress)
        print(f"Progress saved at index {progress['last_index']}")
        return

    # Final save
    save_progress(progress)
    print(f"\n*** COMPLETE: {progress['saved']} saved, {progress['failed']} failed ***")

if __name__ == "__main__":
    main()
