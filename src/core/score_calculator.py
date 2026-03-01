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
        self.type_weights = {}  # type_id -> {S, A, F, E} pillar weights

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

        # Load products (paginated - loads ALL products beyond 1000 limit)
        self.products = fetch_all('products', select='id,name,slug,type_id', order='id', filters={'deleted_at': 'is.null'})
        print(f"   {len(self.products)} products")

        time.sleep(0.5)

        # Load product type mapping (paginated)
        mappings = fetch_all('product_type_mapping', select='product_id,type_id', order='product_id')
        if mappings:
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

        # Load product types with pillar weights
        types_list = fetch_all('product_types', select='id,pillar_weights', order='id')
        for t in types_list:
            pw = t.get('pillar_weights')
            if pw:
                if isinstance(pw, str):
                    try:
                        pw = json.loads(pw)
                    except (json.JSONDecodeError, TypeError):
                        pw = None
                if isinstance(pw, dict) and all(p in pw for p in ['S', 'A', 'F', 'E']):
                    self.type_weights[t['id']] = pw
        print(f"   {len(self.type_weights)} types with pillar weights")

        time.sleep(0.5)

        # Load all evaluations (with pagination via fetch_all)
        print("   Loading evaluations (paginated)...")
        self.evaluations = fetch_all('evaluations', select='product_id,norm_id,result', order='product_id')
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

    def compute_weighted_safe(self, pillar_scores, weights):
        """Compute weighted SAFE score from individual pillar scores and weights."""
        s = pillar_scores.get('S')
        a = pillar_scores.get('A')
        f = pillar_scores.get('F')
        e = pillar_scores.get('E')

        # Need at least 2 pillar scores to compute a meaningful weighted average
        available = [(v, weights.get(p, 25)) for p, v in [('S', s), ('A', a), ('F', f), ('E', e)] if v is not None]
        if len(available) < 2:
            return None

        total_weight = sum(w for _, w in available)
        if total_weight == 0:
            return None

        weighted_sum = sum(score * weight for score, weight in available)
        return round(weighted_sum / total_weight, 1)

    def compute_equal_safe(self, pillar_scores):
        """Compute equal-weight SAFE score: simple average of available pillars."""
        return self.compute_weighted_safe(pillar_scores, {'S': 25, 'A': 25, 'F': 25, 'E': 25})

    def save_product_scores(self, product_id, scores_data, stats, type_id=None):
        """Save scores to safe_scoring_results table"""
        # Compute dual SAFE scores for each tier
        weights = self.type_weights.get(type_id, {'S': 25, 'A': 25, 'F': 25, 'E': 25})

        full_pillars = {p: scores_data['full'].get(p) for p in ['S', 'A', 'F', 'E']}
        consumer_pillars = {p: scores_data['consumer'].get(p) for p in ['S', 'A', 'F', 'E']}
        essential_pillars = {p: scores_data['essential'].get(p) for p in ['S', 'A', 'F', 'E']}

        results_data = {
            'product_id': product_id,
            # FULL pillar scores
            'score_s': full_pillars['S'],
            'score_a': full_pillars['A'],
            'score_f': full_pillars['F'],
            'score_e': full_pillars['E'],
            # FULL SAFE scores (dual mode)
            'note_finale': self.compute_equal_safe(full_pillars),
            'note_weighted': self.compute_weighted_safe(full_pillars, weights),
            'note_equal': self.compute_equal_safe(full_pillars),
            # CONSUMER pillar scores
            's_consumer': consumer_pillars['S'],
            'a_consumer': consumer_pillars['A'],
            'f_consumer': consumer_pillars['F'],
            'e_consumer': consumer_pillars['E'],
            # CONSUMER SAFE scores (dual mode)
            'note_consumer': self.compute_equal_safe(consumer_pillars),
            'note_consumer_weighted': self.compute_weighted_safe(consumer_pillars, weights),
            'note_consumer_equal': self.compute_equal_safe(consumer_pillars),
            # ESSENTIAL pillar scores
            's_essential': essential_pillars['S'],
            'a_essential': essential_pillars['A'],
            'f_essential': essential_pillars['F'],
            'e_essential': essential_pillars['E'],
            # ESSENTIAL SAFE scores (dual mode)
            'note_essential': self.compute_equal_safe(essential_pillars),
            'note_essential_weighted': self.compute_weighted_safe(essential_pillars, weights),
            'note_essential_equal': self.compute_equal_safe(essential_pillars),
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
                # Delete stale scores for products with no evaluations
                self.session.delete(
                    f'{SUPABASE_URL}/rest/v1/safe_scoring_results?product_id=eq.{product_id}',
                    headers=SUPABASE_HEADERS,
                    timeout=30
                )
                continue

            type_id = product.get('type_id')

            if self.save_product_scores(product_id, scores, stats, type_id=type_id):
                success_count += 1

                full_pillars = {p: scores['full'].get(p) for p in ['S', 'A', 'F', 'E']}
                weights = self.type_weights.get(type_id, {'S': 25, 'A': 25, 'F': 25, 'E': 25})
                w_safe = self.compute_weighted_safe(full_pillars, weights)
                e_safe = self.compute_equal_safe(full_pillars)

                w_str = f"{w_safe:.1f}%" if w_safe is not None else "N/A"
                e_str = f"{e_safe:.1f}%" if e_safe is not None else "N/A"

                print(f"[{i:3}/{len(self.products)}] {product_name[:30]:<30} | W:{w_str:>6} E:{e_str:>6} | S:{full_pillars['S'] or 0:.0f} A:{full_pillars['A'] or 0:.0f} F:{full_pillars['F'] or 0:.0f} E:{full_pillars['E'] or 0:.0f}")
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

        # Generate static snapshot for frontend fallback
        if success_count > 0:
            try:
                from .snapshot_generator import generate_snapshot
                print("\n[SNAPSHOT] Generating static fallback snapshot...")
                generate_snapshot()
            except Exception as e:
                print(f"[SNAPSHOT] Warning: Could not generate snapshot: {e}")

        self.print_summary()

    def print_summary(self):
        """Displays a summary of calculated scores"""
        print("\n" + "=" * 60)
        print("SCORE SUMMARY")
        print("=" * 60)

        # Read scores from safe_scoring_results joined with products (paginated)
        scores_data = fetch_all(
            'safe_scoring_results',
            select='product_id,note_finale,note_weighted,note_equal',
            order='note_finale'
        )
        products_data = fetch_all('products', select='id,name', order='name', filters={'deleted_at': 'is.null'})
        product_names = {p['id']: p['name'] for p in products_data}

        weighted_scores = []
        equal_scores = []
        scored_products_w = []
        scored_products_e = []
        for s in scores_data:
            if not isinstance(s, dict):
                continue
            name = product_names.get(s['product_id'], f"ID:{s['product_id']}")
            nw = s.get('note_weighted')
            ne = s.get('note_equal')
            if nw is not None:
                weighted_scores.append(nw)
                scored_products_w.append((name, nw))
            if ne is not None:
                equal_scores.append(ne)
                scored_products_e.append((name, ne))

        for label, scores_list, products_list in [
            ('Weighted (type-specific)', weighted_scores, scored_products_w),
            ('Equal (25/25/25/25)', equal_scores, scored_products_e),
        ]:
            if not scores_list:
                continue
            avg = sum(scores_list) / len(scores_list)
            print(f"\n[STATS] SAFE Score — {label}:")
            print(f"   Average: {avg:.1f}%")
            print(f"   Min: {min(scores_list):.1f}%  Max: {max(scores_list):.1f}%")
            print(f"   Products with score: {len(scores_list)}")

            products_list.sort(key=lambda x: x[1], reverse=True)
            print(f"   Top 5:")
            for name, score in products_list[:5]:
                print(f"      {score:5.1f}% - {name}")
            print(f"   Bottom 5:")
            for name, score in products_list[-5:]:
                print(f"      {score:5.1f}% - {name}")


if __name__ == '__main__':
    calculator = ScoreCalculator()
    calculator.run()
