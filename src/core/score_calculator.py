#!/usr/bin/env python3
"""
SAFESCORING.IO - Score Calculator
Calculates S, A, F, E scores for each product using safe_scoring_definitions

WORKFLOW: Applicability (TRUE/FALSE) -> Smart Evaluator (YES/NO/N/A/TBD) -> Score Calculator

Score Categories:
- FULL: All applicable norms (is_full=true in safe_scoring_definitions)
- CONSUMER: Consumer-relevant norms (is_consumer=true)
- ESSENTIAL: Essential norms only (is_essential=true)

Formula: Score = (YES + YESp) / (YES + YESp + NO) * 100
(TBD and N/A are excluded from calculation)
"""

import json
import time
from datetime import datetime
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import requests

# Import from common module
from .config import SUPABASE_URL, SUPABASE_KEY, SUPABASE_HEADERS
from .supabase_pagination import fetch_all

# Import MoatManager for history tracking
try:
    from .moat_manager import MoatManager
    MOAT_AVAILABLE = True
except ImportError:
    MOAT_AVAILABLE = False


class ScoreCalculator:
    def __init__(self, record_history: bool = True):
        """
        Initialize the ScoreCalculator.

        Args:
            record_history: If True, automatically records score snapshots to history
        """
        self.products = []
        self.norms = {}
        self.evaluations = []
        self.record_history = record_history

        # Setup session with retry logic
        self.session = requests.Session()
        retry_strategy = Retry(
            total=5,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)

        # Initialize MoatManager for history tracking
        self.moat_manager = None
        if MOAT_AVAILABLE and record_history:
            self.moat_manager = MoatManager()
            print("[INFO] MoatManager initialized - Score history will be recorded")

    def load_data(self):
        """Load all necessary data from Supabase"""
        print("[LOAD] Loading data...")

        # Load products
        r = self.session.get(
            f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id',
            headers=SUPABASE_HEADERS,
            timeout=30
        )
        self.products = r.json()
        print(f"   {len(self.products)} products")

        time.sleep(0.5)

        # Load product type mapping (multi-type support info)
        r = self.session.get(
            f'{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id',
            headers=SUPABASE_HEADERS,
            timeout=30
        )
        if r.status_code == 200:
            mappings = r.json()
            multi_type_products = {}
            for m in mappings:
                pid = m['product_id']
                if pid not in multi_type_products:
                    multi_type_products[pid] = 0
                multi_type_products[pid] += 1
            multi_count = sum(1 for count in multi_type_products.values() if count > 1)
            if multi_count > 0:
                print(f"   {multi_count} products with multiple types")

        time.sleep(0.5)

        # Load norms with pillar info (paginated - loads ALL 2159+ norms)
        norms_list = fetch_all('norms', select='id,code,pillar', order='id')
        self.norms = {n['id']: n for n in norms_list}
        print(f"   {len(self.norms)} norms")

        time.sleep(0.5)

        # Load safe_scoring_definitions (paginated)
        definitions = fetch_all(
            'safe_scoring_definitions',
            select='norm_id,is_essential,is_consumer,is_full'
        )
        self.definitions = {d['norm_id']: d for d in definitions}
        print(f"   {len(self.definitions)} norm definitions")

        time.sleep(0.5)

        # Load all evaluations (with pagination)
        self.evaluations = []
        offset = 0
        while True:
            r = self.session.get(
                f'{SUPABASE_URL}/rest/v1/evaluations?select=product_id,norm_id,result&offset={offset}&limit=1000',
                headers=SUPABASE_HEADERS,
                timeout=30
            )
            data = r.json()
            if not data:
                break
            self.evaluations.extend(data)
            offset += 1000
            time.sleep(0.3)
        print(f"   {len(self.evaluations)} evaluations")

    def calculate_score(self, results):
        """
        Calculates score from a list of results
        Score = (YES + YESp) / (YES + YESp + NO) * 100
        """
        yes_count = sum(1 for r in results if r in ['YES', 'YESp'])
        no_count = sum(1 for r in results if r == 'NO')

        total = yes_count + no_count
        if total == 0:
            return None

        return round(yes_count * 100 / total, 1)

    def calculate_product_scores_with_stats(self, product_id):
        """
        Calculate scores and return statistics for a product.
        Returns (scores_dict, stats_dict) or (None, None) if no evaluations.
        """
        product_evals = [e for e in self.evaluations if e['product_id'] == product_id]

        if not product_evals:
            return None, None

        # Count statistics
        stats = {'total': 0, 'yes': 0, 'no': 0, 'na': 0, 'tbd': 0}

        # Organize by pillar and category
        scores = {
            'full': {'S': [], 'A': [], 'F': [], 'E': [], 'SAFE': []},
            'consumer': {'S': [], 'A': [], 'F': [], 'E': [], 'SAFE': []},
            'essential': {'S': [], 'A': [], 'F': [], 'E': [], 'SAFE': []}
        }

        for eval_item in product_evals:
            norm_id = eval_item['norm_id']
            result = eval_item['result']

            if norm_id not in self.norms:
                continue

            stats['total'] += 1
            if result in ['YES', 'YESp']:
                stats['yes'] += 1
            elif result == 'NO':
                stats['no'] += 1
            elif result == 'N/A':
                stats['na'] += 1
            elif result == 'TBD':
                stats['tbd'] += 1

            norm = self.norms[norm_id]
            pillar = norm['pillar']

            # Get classification from safe_scoring_definitions
            definition = self.definitions.get(norm_id, {})
            is_essential = definition.get('is_essential', False)
            is_consumer = definition.get('is_consumer', False)
            is_full = definition.get('is_full', True)

            # Exclude N/A and TBD from score calculation
            if not pillar or result in ['N/A', 'TBD']:
                continue

            # FULL: norms with is_full=true
            if is_full:
                scores['full'][pillar].append(result)
                scores['full']['SAFE'].append(result)

            # CONSUMER: norms with is_consumer=true
            if is_consumer:
                scores['consumer'][pillar].append(result)
                scores['consumer']['SAFE'].append(result)

            # ESSENTIAL: only essential norms
            if is_essential:
                scores['essential'][pillar].append(result)
                scores['essential']['SAFE'].append(result)

        # Calculate final scores
        result_scores = {}

        for category in ['full', 'consumer', 'essential']:
            result_scores[category] = {}
            for pillar in ['S', 'A', 'F', 'E', 'SAFE']:
                score = self.calculate_score(scores[category][pillar])
                result_scores[category][pillar] = score

        return result_scores, stats

    def save_product_scores(self, product_id, scores_data, stats):
        """Save scores to safe_scoring_results table"""
        results_data = {
            'product_id': product_id,
            # FULL scores
            'note_finale': scores_data['full'].get('SAFE'),
            'score_s': scores_data['full'].get('S'),
            'score_a': scores_data['full'].get('A'),
            'score_f': scores_data['full'].get('F'),
            'score_e': scores_data['full'].get('E'),
            # CONSUMER scores
            'note_consumer': scores_data['consumer'].get('SAFE'),
            's_consumer': scores_data['consumer'].get('S'),
            'a_consumer': scores_data['consumer'].get('A'),
            'f_consumer': scores_data['consumer'].get('F'),
            'e_consumer': scores_data['consumer'].get('E'),
            # ESSENTIAL scores
            'note_essential': scores_data['essential'].get('SAFE'),
            's_essential': scores_data['essential'].get('S'),
            'a_essential': scores_data['essential'].get('A'),
            'f_essential': scores_data['essential'].get('F'),
            'e_essential': scores_data['essential'].get('E'),
            # Statistics
            'total_norms_evaluated': stats['total'],
            'total_yes': stats['yes'],
            'total_no': stats['no'],
            'total_na': stats['na'],
            'total_tbd': stats.get('tbd', 0),
            'calculated_at': datetime.now().isoformat(),
            'last_evaluation_date': datetime.now().isoformat()
        }

        # Upsert to safe_scoring_results
        headers = {**SUPABASE_HEADERS, 'Prefer': 'resolution=merge-duplicates,return=minimal'}
        r = self.session.post(
            f'{SUPABASE_URL}/rest/v1/safe_scoring_results',
            headers=headers,
            json=results_data,
            timeout=30
        )

        # If insert fails due to duplicate, try update
        if r.status_code == 409:
            r = self.session.patch(
                f'{SUPABASE_URL}/rest/v1/safe_scoring_results?product_id=eq.{product_id}',
                headers=SUPABASE_HEADERS,
                json=results_data,
                timeout=30
            )

        return r.status_code in [200, 201, 204]

    def run(self):
        """Runs score calculation for all products"""
        print("=" * 60)
        print("SAFESCORING - SAFE Score Calculator")
        print("=" * 60)

        self.load_data()

        print(f"\n[CALC] Calculating scores for {len(self.products)} products...")
        print("-" * 60)

        success_count = 0
        skip_count = 0

        for i, product in enumerate(self.products, 1):
            product_id = product['id']
            product_name = product['name']

            scores, stats = self.calculate_product_scores_with_stats(product_id)

            if not scores:
                skip_count += 1
                continue

            if self.save_product_scores(product_id, scores, stats):
                success_count += 1

                full_safe = scores['full'].get('SAFE')
                full_s = scores['full'].get('S')
                full_a = scores['full'].get('A')
                full_f = scores['full'].get('F')
                full_e = scores['full'].get('E')

                safe_str = f"{full_safe:.1f}%" if full_safe is not None else "N/A"
                s_str = f"{full_s:.1f}%" if full_s is not None else "N/A"
                a_str = f"{full_a:.1f}%" if full_a is not None else "N/A"
                f_str = f"{full_f:.1f}%" if full_f is not None else "N/A"
                e_str = f"{full_e:.1f}%" if full_e is not None else "N/A"

                print(f"[{i:3}/{len(self.products)}] {product_name[:30]:<30} | SAFE: {safe_str:>6} | S:{s_str:>6} A:{a_str:>6} F:{f_str:>6} E:{e_str:>6}")
            else:
                print(f"[{i:3}/{len(self.products)}] {product_name[:30]:<30} | ERROR: Save failed")

        print("-" * 60)
        print(f"\n[DONE] {success_count} products updated, {skip_count} skipped (no evaluations)")

        # Record score history snapshots
        if self.moat_manager and success_count > 0:
            print("\n[HISTORY] Recording score snapshots...")
            history_result = self.moat_manager.record_all_scores_snapshot(
                triggered_by='score_calculator',
                change_reason='Score recalculation'
            )
            print(f"[HISTORY] {history_result['success']} snapshots recorded")

        self.print_summary()

    def print_summary(self):
        """Displays a summary of calculated scores"""
        print("\n" + "=" * 60)
        print("SCORE SUMMARY")
        print("=" * 60)

        r = self.session.get(
            f'{SUPABASE_URL}/rest/v1/products?select=name,scores&order=name',
            headers=SUPABASE_HEADERS,
            timeout=30
        )
        products = r.json()

        if not isinstance(products, list):
            print("[WARNING] Error loading products")
            return

        full_scores = []
        for p in products:
            if not isinstance(p, dict):
                continue
            scores = p.get('scores')
            if isinstance(scores, str):
                try:
                    scores = json.loads(scores)
                except (json.JSONDecodeError, Exception):
                    continue
            if scores and isinstance(scores, dict) and scores.get('full'):
                safe = scores['full'].get('SAFE')
                if safe is not None:
                    full_scores.append(safe)

        if full_scores:
            avg = sum(full_scores) / len(full_scores)
            min_score = min(full_scores)
            max_score = max(full_scores)

            print(f"\n[STATS] SAFE Score Statistics (Full):")
            print(f"   Average: {avg:.1f}%")
            print(f"   Min: {min_score:.1f}%")
            print(f"   Max: {max_score:.1f}%")
            print(f"   Products with score: {len(full_scores)}")

        # Top 5 and Bottom 5
        scored_products = []
        for p in products:
            if not isinstance(p, dict):
                continue
            scores = p.get('scores')
            if isinstance(scores, str):
                try:
                    scores = json.loads(scores)
                except (json.JSONDecodeError, Exception):
                    continue
            if scores and isinstance(scores, dict) and scores.get('full') and scores['full'].get('SAFE') is not None:
                scored_products.append((p['name'], scores['full']['SAFE']))

        if scored_products:
            scored_products.sort(key=lambda x: x[1], reverse=True)

            print(f"\n[TOP 5]")
            for name, score in scored_products[:5]:
                print(f"   {score:5.1f}% - {name}")

            print(f"\n[BOTTOM 5]")
            for name, score in scored_products[-5:]:
                print(f"   {score:5.1f}% - {name}")


if __name__ == '__main__':
    calculator = ScoreCalculator()
    calculator.run()
