#!/usr/bin/env python3
"""
Auto-update product compatibility when scores change.
Uses compat_refresh_queue table for seamless interconnected flow.

Flow:
1. Product score changes -> trigger adds to compat_refresh_queue
2. This script processes queue -> regenerates compatibility
3. Marks as processed -> ready for next change
"""

import os
import sys
import requests
import time
from datetime import datetime
from typing import Dict, List, Set

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.core.config import SUPABASE_URL, get_supabase_headers
from scripts.generate_product_compat_safe import ProductCompatibilitySAFE


class AutoUpdateCompat:
    """Process compat_refresh_queue and auto-update compatibility"""

    def __init__(self):
        self.headers = get_supabase_headers()
        self.generator = None  # Lazy load

    def get_pending_products(self, limit: int = 100) -> List[int]:
        """Get products from queue that need refresh"""
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/compat_refresh_queue?select=product_id&processed_at=is.null&limit={limit}",
            headers=self.headers
        )
        if r.status_code == 200:
            return list(set(p['product_id'] for p in r.json()))
        return []

    def mark_processed(self, product_ids: List[int]):
        """Mark products as processed in queue"""
        if not product_ids:
            return

        for pid in product_ids:
            requests.patch(
                f"{SUPABASE_URL}/rest/v1/compat_refresh_queue?product_id=eq.{pid}&processed_at=is.null",
                headers=self.headers,
                json={'processed_at': datetime.now().isoformat()}
            )

    def get_affected_pairs(self, product_ids: List[int]) -> List[tuple]:
        """Get all compatibility pairs affected by changed products"""
        if not product_ids:
            return []

        pairs = []
        ids_str = ','.join(str(pid) for pid in product_ids)

        # Get pairs where product_a changed
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_compatibility?select=product_a_id,product_b_id&product_a_id=in.({ids_str})",
            headers=self.headers
        )
        if r.status_code == 200:
            pairs.extend([(p['product_a_id'], p['product_b_id']) for p in r.json()])

        # Get pairs where product_b changed
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_compatibility?select=product_a_id,product_b_id&product_b_id=in.({ids_str})",
            headers=self.headers
        )
        if r.status_code == 200:
            pairs.extend([(p['product_a_id'], p['product_b_id']) for p in r.json()])

        return list(set(pairs))

    def ensure_generator(self):
        """Lazy load and initialize generator"""
        if self.generator is None:
            self.generator = ProductCompatibilitySAFE()
            self.generator.load_data()

    def regenerate_pairs(self, pairs: List[tuple]) -> int:
        """Regenerate compatibility for specific pairs"""
        if not pairs:
            return 0

        self.ensure_generator()
        products_by_id = {p['id']: p for p in self.generator.products}
        updated = 0

        for pa_id, pb_id in pairs:
            pa = products_by_id.get(pa_id)
            pb = products_by_id.get(pb_id)

            if not pa or not pb:
                continue

            try:
                data = self.generator.analyze_pair(pa, pb)
                if data and self.generator.save_compat(pa_id, pb_id, data):
                    updated += 1
                    print(f"   OK {pa['name']} x {pb['name']}")
            except Exception as e:
                print(f"   ERR {pa['name']} x {pb['name']}: {e}")

        return updated

    def process_queue(self) -> dict:
        """Process all pending items in queue"""
        stats = {'products': 0, 'pairs': 0, 'updated': 0}

        pending = self.get_pending_products()
        if not pending:
            return stats

        stats['products'] = len(pending)
        print(f"[QUEUE] {len(pending)} products to process")

        pairs = self.get_affected_pairs(pending)
        stats['pairs'] = len(pairs)
        print(f"[PAIRS] {len(pairs)} compatibility pairs to regenerate")

        if pairs:
            # Reload generator data to get fresh scores
            self.generator = None
            stats['updated'] = self.regenerate_pairs(pairs)

        # Mark as processed
        self.mark_processed(pending)
        print(f"[DONE] {stats['updated']}/{stats['pairs']} pairs updated")

        return stats

    def run_once(self):
        """Process queue once"""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Processing queue...")
        stats = self.process_queue()
        if stats['products'] == 0:
            print("   No pending updates")
        return stats

    def run_daemon(self, interval: int = 60):
        """Run continuously, processing queue every interval seconds"""
        print(f"=== Auto-Update Compatibility Daemon ===")
        print(f"Checking queue every {interval}s")
        print(f"Press Ctrl+C to stop\n")

        while True:
            try:
                stats = self.run_once()
                time.sleep(interval)
            except KeyboardInterrupt:
                print("\nDaemon stopped")
                break
            except Exception as e:
                print(f"[ERROR] {e}")
                time.sleep(30)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Auto-update compatibility when scores change')
    parser.add_argument('--daemon', action='store_true', help='Run as daemon')
    parser.add_argument('--interval', type=int, default=60, help='Check interval in seconds (default: 60)')
    args = parser.parse_args()

    updater = AutoUpdateCompat()

    if args.daemon:
        updater.run_daemon(args.interval)
    else:
        updater.run_once()
