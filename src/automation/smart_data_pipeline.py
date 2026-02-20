#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAFESCORING.IO - Smart Data Pipeline
Intelligently processes only what needs to be updated using freshness tracking.

USAGE:
    python -m src.automation.smart_data_pipeline [--mode MODE] [--limit N] [--workers N]

Modes:
    summaries   - Generate/update norm summaries (10K words each)
    evaluations - Evaluate products against norms
    all         - Both summaries and evaluations
    status      - Show freshness status only
"""

import requests
import time
import sys
import os
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.core.config import SUPABASE_URL, get_supabase_headers
from src.core.api_provider import AIProvider


class SmartDataPipeline:
    """
    Smart pipeline that only processes data that needs updates.
    Uses database functions to track freshness and avoid redundant work.
    """

    def __init__(self):
        self.headers = get_supabase_headers()
        self.ai_provider = AIProvider()
        self.stats = {
            'summaries_processed': 0,
            'summaries_skipped': 0,
            'evaluations_processed': 0,
            'evaluations_skipped': 0,
            'errors': 0,
        }

    # =========================================================================
    # FRESHNESS STATUS
    # =========================================================================

    def get_freshness_stats(self):
        """Get current data freshness statistics from database."""
        try:
            url = f"{SUPABASE_URL}/rest/v1/rpc/get_data_freshness_stats"
            r = requests.post(url, headers=self.headers, json={}, timeout=30)
            if r.status_code == 200:
                return r.json()
            else:
                print(f"   Error getting stats: {r.status_code}")
                return None
        except Exception as e:
            print(f"   Error: {e}")
            return None

    def print_status(self):
        """Print current freshness status."""
        print("\n" + "=" * 60)
        print("📊 DATA FRESHNESS STATUS")
        print("=" * 60)

        stats = self.get_freshness_stats()
        if not stats:
            print("Could not fetch stats. Run migration 068 first.")
            return

        for entity, data in stats.items():
            print(f"\n{entity.upper()}:")
            print(f"  Total:           {data.get('total', 0)}")
            if 'never_evaluated' in data:
                print(f"  Never evaluated: {data.get('never_evaluated', 0)}")
            if 'needs_summary' in data:
                print(f"  Needs summary:   {data.get('needs_summary', 0)}")
            print(f"  Stale:           {data.get('stale', 0)}")
            print(f"  Fresh:           {data.get('fresh', 0)}")

        print("\n" + "=" * 60)

    # =========================================================================
    # NORM SUMMARIES
    # =========================================================================

    def get_norms_needing_summary(self, limit=50):
        """Get norms that need AI summaries."""
        try:
            url = f"{SUPABASE_URL}/rest/v1/rpc/get_norms_needing_summary"
            r = requests.post(url, headers=self.headers, json={'p_limit': limit}, timeout=30)
            if r.status_code == 200:
                return r.json()
            elif r.status_code == 404:
                # Function doesn't exist yet - fall back to simple query
                print("   (Using fallback query - run migration 068 for smart mode)")
                return self._fallback_get_norms_needing_summary(limit)
            return []
        except Exception as e:
            print(f"   Error: {e}")
            return []

    def _fallback_get_norms_needing_summary(self, limit):
        """Fallback for when RPC function doesn't exist."""
        url = f"{SUPABASE_URL}/rest/v1/norms"
        url += "?select=id,code,title,official_link"
        url += "&official_doc_summary=is.null"
        url += "&official_link=not.is.null"
        url += f"&limit={limit}"

        r = requests.get(url, headers=self.headers, timeout=30)
        if r.status_code == 200:
            return [{'norm_id': n['id'], 'norm_code': n['code'],
                     'norm_title': n['title'], 'official_link': n['official_link'],
                     'reason': 'never_summarized'} for n in r.json()]
        return []

    def generate_norm_summary(self, norm, index=1, total=1):
        """Generate 10K word summary for a norm."""
        norm_id = norm.get('norm_id')
        norm_code = norm.get('norm_code')
        norm_title = norm.get('norm_title', '')
        official_link = norm.get('official_link', '')
        reason = norm.get('reason', 'unknown')

        print(f"\n   [{norm_code}] {reason}")

        # Import norm doc scraper for the actual scraping
        try:
            from src.automation.norm_doc_scraper import NormDocScraper
            scraper = NormDocScraper()
            scraper.ai_provider = self.ai_provider  # Share AI provider

            # Process this single norm (format expected by _process_single_norm)
            norm_data = {
                'id': norm_id,
                'code': norm_code,
                'title': norm_title,
                'official_link': official_link,
                'description': '',  # Will use AI fallback
            }

            result = scraper._process_single_norm(norm_data, index, total)

            if result and result.get('status') == 'success':
                # Mark summary complete
                self._mark_summary_complete(norm_id)
                self.stats['summaries_processed'] += 1
                return True
            else:
                self.stats['errors'] += 1
                return False

        except Exception as e:
            print(f"   ERROR: {e}")
            self.stats['errors'] += 1
            return False

    def _mark_summary_complete(self, norm_id):
        """Mark norm summary as complete in database."""
        url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"
        data = {
            'last_summarized_at': datetime.utcnow().isoformat(),
            'summary_version': 1,
        }
        requests.patch(url, headers=self.headers, json=data, timeout=30)

    def process_summaries(self, limit=50, workers=2):
        """Process norm summaries that need generation/update."""
        print("\n" + "=" * 60)
        print("📝 PROCESSING NORM SUMMARIES")
        print("=" * 60)

        norms = self.get_norms_needing_summary(limit)
        total = len(norms)

        if not norms:
            print("   All norm summaries are up to date!")
            return

        print(f"   Found {total} norms needing summaries")
        print(f"   Workers: {workers}")

        # Process with thread pool
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {
                executor.submit(self.generate_norm_summary, norm, i+1, total): norm
                for i, norm in enumerate(norms)
            }

            completed = 0
            for future in as_completed(futures):
                norm = futures[future]
                completed += 1
                try:
                    future.result()
                    print(f"   Progress: {completed}/{total}")
                except Exception as e:
                    print(f"   ERROR processing {norm.get('norm_code')}: {e}")
                    self.stats['errors'] += 1

    # =========================================================================
    # EVALUATIONS
    # =========================================================================

    def get_pending_evaluations(self, limit=100):
        """Get evaluations that need to be processed."""
        try:
            url = f"{SUPABASE_URL}/rest/v1/rpc/get_pending_evaluations"
            r = requests.post(url, headers=self.headers, json={'p_limit': limit}, timeout=30)
            if r.status_code == 200:
                return r.json()
            elif r.status_code == 404:
                print("   (Evaluation tracking not set up - run migration 068)")
                return []
            return []
        except Exception as e:
            print(f"   Error: {e}")
            return []

    def process_single_evaluation(self, eval_item):
        """Process a single product-norm evaluation."""
        product_id = eval_item.get('product_id')
        product_slug = eval_item.get('product_slug')
        norm_id = eval_item.get('norm_id')
        norm_code = eval_item.get('norm_code')
        reason = eval_item.get('reason', 'unknown')

        print(f"\n   [{product_slug}] × [{norm_code}] - {reason}")

        try:
            # Import evaluator
            from src.core.smart_evaluator import SmartEvaluator
            evaluator = SmartEvaluator()
            evaluator.ai_provider = self.ai_provider

            # Run evaluation
            result = evaluator.evaluate_single(product_id, norm_id)

            if result:
                self._mark_evaluation_complete(product_id, norm_id)
                self.stats['evaluations_processed'] += 1
                return True
            else:
                self.stats['errors'] += 1
                return False

        except ImportError:
            # SmartEvaluator might not exist yet
            print(f"   SKIP: SmartEvaluator not implemented")
            self.stats['evaluations_skipped'] += 1
            return False
        except Exception as e:
            print(f"   ERROR: {e}")
            self.stats['errors'] += 1
            return False

    def _mark_evaluation_complete(self, product_id, norm_id):
        """Mark evaluation as complete using RPC."""
        try:
            url = f"{SUPABASE_URL}/rest/v1/rpc/mark_evaluation_complete"
            requests.post(url, headers=self.headers, json={
                'p_product_id': product_id,
                'p_norm_id': norm_id
            }, timeout=30)
        except Exception:
            pass  # Non-critical

    def process_evaluations(self, limit=100, workers=2):
        """Process pending evaluations."""
        print("\n" + "=" * 60)
        print("⚡ PROCESSING EVALUATIONS")
        print("=" * 60)

        evals = self.get_pending_evaluations(limit)
        total = len(evals)

        if not evals:
            print("   All evaluations are up to date!")
            return

        print(f"   Found {total} pending evaluations")
        print(f"   Workers: {workers}")

        # Process with thread pool
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {executor.submit(self.process_single_evaluation, e): e for e in evals}

            for i, future in enumerate(as_completed(futures), 1):
                eval_item = futures[future]
                try:
                    future.result()
                except Exception as e:
                    print(f"   ERROR: {e}")
                    self.stats['errors'] += 1

                if i % 10 == 0:
                    print(f"   Progress: {i}/{total}")

    # =========================================================================
    # MAIN RUN
    # =========================================================================

    def run(self, mode='all', limit=50, workers=2):
        """Run the smart data pipeline."""
        start_time = time.time()

        print("\n" + "=" * 60)
        print("🚀 SMART DATA PIPELINE")
        print(f"   Mode: {mode}")
        print(f"   Limit: {limit}")
        print(f"   Workers: {workers}")
        print("=" * 60)

        if mode in ['status', 'all']:
            self.print_status()

        if mode in ['summaries', 'all']:
            self.process_summaries(limit=limit, workers=workers)

        if mode in ['evaluations', 'all']:
            self.process_evaluations(limit=limit, workers=workers)

        # Final stats
        elapsed = time.time() - start_time
        print("\n" + "=" * 60)
        print("📊 PIPELINE COMPLETE")
        print("=" * 60)
        print(f"   Summaries processed:   {self.stats['summaries_processed']}")
        print(f"   Summaries skipped:     {self.stats['summaries_skipped']}")
        print(f"   Evaluations processed: {self.stats['evaluations_processed']}")
        print(f"   Evaluations skipped:   {self.stats['evaluations_skipped']}")
        print(f"   Errors:                {self.stats['errors']}")
        print(f"   Time elapsed:          {elapsed:.1f}s")
        print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description='Smart Data Pipeline')
    parser.add_argument('--mode', choices=['summaries', 'evaluations', 'all', 'status'],
                        default='status', help='Processing mode')
    parser.add_argument('--limit', type=int, default=50, help='Max items to process')
    parser.add_argument('--workers', type=int, default=2, help='Parallel workers')

    args = parser.parse_args()

    pipeline = SmartDataPipeline()
    pipeline.run(mode=args.mode, limit=args.limit, workers=args.workers)


if __name__ == '__main__':
    main()
