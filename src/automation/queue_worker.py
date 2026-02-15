#!/usr/bin/env python3
"""
SafeScoring Queue Worker
========================
Automatically processes tasks from the queue.

Usage:
    python queue_worker.py              # Normal mode
    python queue_worker.py --once       # Process a single task
    python queue_worker.py --dry-run    # Test mode without modification
"""

import os
import sys
import time
import json
import argparse
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / 'config' / '.env')

from supabase import create_client

# Import handlers
from handlers.scrape_handler import handle_scrape_product, handle_scrape_norm
from handlers.classify_handler import handle_classify_type
from handlers.evaluate_handler import handle_evaluate_product, handle_evaluate_norm_all, handle_evaluate_single_norm
from handlers.score_handler import handle_calculate_score

# ============================================
# CONFIGURATION
# ============================================

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ============================================
# TASK HANDLERS MAP
# ============================================

HANDLERS = {
    'scrape_product': handle_scrape_product,
    'scrape_norm': handle_scrape_norm,
    'classify_type': handle_classify_type,
    'evaluate_product': handle_evaluate_product,
    'evaluate_norm_all': handle_evaluate_norm_all,
    'evaluate_single_norm': handle_evaluate_single_norm,
    'calculate_score': handle_calculate_score,
}

# ============================================
# LOGGER
# ============================================

class Logger:
    COLORS = {
        'reset': '\033[0m',
        'red': '\033[91m',
        'green': '\033[92m',
        'yellow': '\033[93m',
        'blue': '\033[94m',
        'purple': '\033[95m',
        'cyan': '\033[96m',
    }

    @staticmethod
    def _log(level: str, color: str, message: str):
        timestamp = datetime.now().strftime('%H:%M:%S')
        c = Logger.COLORS.get(color, '')
        r = Logger.COLORS['reset']
        print(f"{c}[{timestamp}] {level}: {message}{r}")

    @staticmethod
    def info(msg): Logger._log('INFO', 'blue', msg)

    @staticmethod
    def success(msg): Logger._log('OK', 'green', msg)

    @staticmethod
    def warning(msg): Logger._log('WARN', 'yellow', msg)

    @staticmethod
    def error(msg): Logger._log('ERROR', 'red', msg)

    @staticmethod
    def task(msg): Logger._log('TASK', 'cyan', msg)

log = Logger()

# ============================================
# QUEUE UTILITIES
# ============================================

def add_task(task_type: str, target_id: int, target_type: str, priority: int = 5, payload: dict = None):
    """Adds a task to the queue."""
    supabase.table('task_queue').insert({
        'task_type': task_type,
        'target_id': target_id,
        'target_type': target_type,
        'priority': priority,
        'payload': payload or {}
    }).execute()
    log.info(f"Task added: {task_type} #{target_id}")


def get_next_task():
    """Retrieves the next task to process."""
    result = supabase.table('task_queue').select('*') \
        .eq('status', 'pending') \
        .order('priority') \
        .order('created_at') \
        .limit(1) \
        .execute()

    return result.data[0] if result.data else None


def mark_task_processing(task_id: str):
    """Marks a task as processing."""
    supabase.table('task_queue').update({
        'status': 'processing',
        'started_at': datetime.now().isoformat()
    }).eq('id', task_id).execute()


def mark_task_completed(task_id: str, result: dict = None):
    """Marks a task as completed."""
    update_data = {
        'status': 'completed',
        'completed_at': datetime.now().isoformat()
    }
    if result:
        update_data['payload'] = result

    supabase.table('task_queue').update(update_data).eq('id', task_id).execute()


def mark_task_failed(task_id: str, error: str, retries: int):
    """Marks a task as failed."""
    new_status = 'pending' if retries < 3 else 'failed'

    supabase.table('task_queue').update({
        'status': new_status,
        'error': error,
        'retries': retries
    }).eq('id', task_id).execute()


def get_queue_stats():
    """Retrieves queue statistics."""
    result = supabase.table('task_queue').select('status').execute()

    stats = {'pending': 0, 'processing': 0, 'completed': 0, 'failed': 0}
    for task in result.data:
        status = task.get('status', 'pending')
        if status in stats:
            stats[status] += 1

    return stats

# ============================================
# MAIN WORKER
# ============================================

def process_task(task: dict, dry_run: bool = False) -> bool:
    """Processes a single task."""
    task_id = task['id']
    task_type = task['task_type']
    target_id = task.get('target_id')
    payload = task.get('payload', {})

    log.task(f"Processing: {task_type} #{target_id}")

    if dry_run:
        log.warning("DRY RUN - No modification")
        return True

    # Mark as processing
    mark_task_processing(task_id)

    try:
        # Find the handler
        handler = HANDLERS.get(task_type)
        if not handler:
            raise ValueError(f"Unknown task type: {task_type}")

        # Execute
        result = handler(supabase, task, add_task)

        # Mark as completed
        mark_task_completed(task_id, result)
        log.success(f"Completed: {task_type} → {result}")
        return True

    except Exception as e:
        # Handle the error
        retries = task.get('retries', 0) + 1
        mark_task_failed(task_id, str(e), retries)

        if retries < 3:
            log.warning(f"Error (retry {retries}/3): {e}")
        else:
            log.error(f"Failed permanently: {e}")

        return False


def process_queue(once: bool = False, dry_run: bool = False):
    """Processes pending tasks."""

    print("\n" + "=" * 60)
    print("🚀 SAFESCORING QUEUE WORKER")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Initial stats
    stats = get_queue_stats()
    print(f"📊 Queue: {stats['pending']} pending, {stats['processing']} processing, {stats['failed']} failed\n")

    tasks_processed = 0
    errors = 0

    while True:
        # Retrieve next task
        task = get_next_task()

        if not task:
            if once:
                log.info("No pending tasks")
                break
            else:
                print("⏳ No tasks, waiting 10s...", end='\r')
                time.sleep(10)
                continue

        # Process
        success = process_task(task, dry_run)
        tasks_processed += 1
        if not success:
            errors += 1

        # Once mode: exit after one task
        if once:
            break

        # Small delay between tasks
        time.sleep(1)

    # Summary
    print(f"\n{'=' * 60}")
    print(f"📊 Summary: {tasks_processed} tasks processed, {errors} errors")
    print("=" * 60)


# ============================================
# CLI
# ============================================

def main():
    parser = argparse.ArgumentParser(
        description='SafeScoring Queue Worker',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument(
        '--once',
        action='store_true',
        help='Process a single task then exit'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Test mode without modifying the database'
    )

    parser.add_argument(
        '--stats',
        action='store_true',
        help='Display queue statistics'
    )

    args = parser.parse_args()

    if args.stats:
        stats = get_queue_stats()
        print(f"📊 Queue Stats:")
        print(f"   Pending:    {stats['pending']}")
        print(f"   Processing: {stats['processing']}")
        print(f"   Completed:  {stats['completed']}")
        print(f"   Failed:     {stats['failed']}")
        return

    try:
        process_queue(once=args.once, dry_run=args.dry_run)
    except KeyboardInterrupt:
        print("\n⚠️ Interrupted by user")
        sys.exit(130)


if __name__ == "__main__":
    main()
