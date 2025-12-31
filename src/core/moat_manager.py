#!/usr/bin/env python3
"""
SAFESCORING.IO - Moat Manager
Manages score history and security incidents - Features that create competitive advantage

This module provides:
1. Score history tracking (evolution over time)
2. Security incident management
3. Product impact analysis
4. Historical comparisons

These features create UNIQUE DATA that cannot be copied by competitors.
"""

import requests
from datetime import datetime
from typing import List, Dict, Optional, Any
import json
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Import from common module
from .config import SUPABASE_URL, get_supabase_headers

HEADERS = get_supabase_headers('return=representation')


class MoatManager:
    """
    Manages competitive advantage features:
    - Score history (unique historical data)
    - Security incidents (unique intelligence)
    """

    def __init__(self):
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

    # =========================================================================
    # SCORE HISTORY MANAGEMENT
    # =========================================================================

    def record_score_snapshot(
        self,
        product_id: int,
        triggered_by: str = 'manual',
        change_reason: str = None
    ) -> Optional[int]:
        """
        Records a score snapshot for a product in the history table.

        Args:
            product_id: The product ID
            triggered_by: What triggered this snapshot ('manual', 'monthly_cron', 'incident', 'reevaluation')
            change_reason: Optional reason for the score change

        Returns:
            The new history record ID, or None on failure
        """
        # Get current product scores from safe_scoring_results
        r = self.session.get(
            f'{SUPABASE_URL}/rest/v1/safe_scoring_results?product_id=eq.{product_id}&select=*',
            headers=HEADERS,
            timeout=30
        )

        if r.status_code != 200 or not r.json():
            print(f"[WARNING] Product {product_id} has no scores in safe_scoring_results")
            return None

        ssr = r.json()[0]

        # Build scores dict from safe_scoring_results
        scores = {
            'full': {
                'SAFE': ssr.get('note_finale'),
                'S': ssr.get('score_s'),
                'A': ssr.get('score_a'),
                'F': ssr.get('score_f'),
                'E': ssr.get('score_e'),
            },
            'consumer': {
                'SAFE': ssr.get('note_consumer'),
            },
            'essential': {
                'SAFE': ssr.get('note_essential'),
            }
        }

        stats = {
            'total': ssr.get('total_norms_evaluated', 0),
            'yes': ssr.get('total_yes', 0),
            'no': ssr.get('total_no', 0),
            'na': ssr.get('total_na', 0),
            'tbd': ssr.get('total_tbd', 0),
        }

        if not scores['full'].get('SAFE'):
            print(f"[WARNING] Product {product_id} has no SAFE score")
            return None

        # Get previous score for delta calculation
        r_prev = self.session.get(
            f'{SUPABASE_URL}/rest/v1/score_history?product_id=eq.{product_id}&order=recorded_at.desc&limit=1',
            headers=HEADERS,
            timeout=30
        )

        previous_safe_score = None
        score_change = None

        if r_prev.status_code == 200 and r_prev.json():
            previous_safe_score = r_prev.json()[0].get('safe_score')
            current_safe_score = scores.get('full', {}).get('SAFE')
            if previous_safe_score is not None and current_safe_score is not None:
                score_change = round(current_safe_score - previous_safe_score, 2)

        # Create history record
        history_data = {
            'product_id': product_id,
            'recorded_at': datetime.now().isoformat(),
            'safe_score': scores.get('full', {}).get('SAFE'),
            'score_s': scores.get('full', {}).get('S'),
            'score_a': scores.get('full', {}).get('A'),
            'score_f': scores.get('full', {}).get('F'),
            'score_e': scores.get('full', {}).get('E'),
            'consumer_score': scores.get('consumer', {}).get('SAFE'),
            'essential_score': scores.get('essential', {}).get('SAFE'),
            'total_evaluations': stats['total'],
            'total_yes': stats['yes'],
            'total_no': stats['no'],
            'total_na': stats['na'],
            'total_tbd': stats['tbd'],
            'previous_safe_score': previous_safe_score,
            'score_change': score_change,
            'change_reason': change_reason,
            'triggered_by': triggered_by
        }

        r = self.session.post(
            f'{SUPABASE_URL}/rest/v1/score_history',
            headers=HEADERS,
            json=history_data,
            timeout=30
        )

        if r.status_code in [200, 201]:
            result = r.json()
            if result:
                new_id = result[0].get('id')
                print(f"[OK] Score history recorded for product {product_id} (ID: {new_id})")
                return new_id

        print(f"[ERROR] Failed to record score history: {r.status_code} - {r.text}")
        return None

    def record_all_scores_snapshot(
        self,
        triggered_by: str = 'monthly_cron',
        change_reason: str = 'Monthly snapshot'
    ) -> Dict[str, int]:
        """
        Records score snapshots for ALL products.
        Useful for monthly automation.

        Returns:
            Dict with success and failure counts
        """
        print("=" * 60)
        print("RECORDING SCORE SNAPSHOTS FOR ALL PRODUCTS")
        print("=" * 60)

        # Get all products with scores
        r = self.session.get(
            f'{SUPABASE_URL}/rest/v1/products?select=id,name&scores=not.is.null',
            headers=HEADERS,
            timeout=60
        )

        if r.status_code != 200:
            print(f"[ERROR] Failed to load products: {r.status_code}")
            return {'success': 0, 'failed': 0}

        products = r.json()
        print(f"[INFO] Found {len(products)} products with scores")

        success = 0
        failed = 0

        for i, product in enumerate(products, 1):
            product_id = product['id']
            product_name = product['name']

            result = self.record_score_snapshot(
                product_id,
                triggered_by=triggered_by,
                change_reason=change_reason
            )

            if result:
                success += 1
                print(f"[{i}/{len(products)}] {product_name[:30]:<30} - OK")
            else:
                failed += 1
                print(f"[{i}/{len(products)}] {product_name[:30]:<30} - FAILED")

        print("-" * 60)
        print(f"[DONE] {success} snapshots recorded, {failed} failed")

        return {'success': success, 'failed': failed}

    def get_score_evolution(
        self,
        product_id: int,
        limit: int = 12
    ) -> List[Dict]:
        """
        Gets score evolution history for a product.

        Args:
            product_id: The product ID
            limit: Number of records to return (default 12 = 1 year of monthly snapshots)

        Returns:
            List of score history records
        """
        r = self.session.get(
            f'{SUPABASE_URL}/rest/v1/score_history?product_id=eq.{product_id}&order=recorded_at.desc&limit={limit}',
            headers=HEADERS,
            timeout=30
        )

        if r.status_code == 200:
            return r.json()
        return []

    def get_score_comparison(
        self,
        product_id: int,
        days_ago: int = 30
    ) -> Optional[Dict]:
        """
        Compares current score with score from X days ago.

        Args:
            product_id: The product ID
            days_ago: Number of days to look back

        Returns:
            Dict with comparison data
        """
        from datetime import timedelta

        target_date = (datetime.now() - timedelta(days=days_ago)).isoformat()

        # Get current product score
        r_current = self.session.get(
            f'{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}&select=name,scores',
            headers=HEADERS,
            timeout=30
        )

        if r_current.status_code != 200 or not r_current.json():
            return None

        product = r_current.json()[0]
        current_score = product.get('scores', {}).get('full', {}).get('SAFE')

        # Get historical score closest to target date
        r_history = self.session.get(
            f'{SUPABASE_URL}/rest/v1/score_history?product_id=eq.{product_id}&recorded_at=lte.{target_date}&order=recorded_at.desc&limit=1',
            headers=HEADERS,
            timeout=30
        )

        if r_history.status_code != 200 or not r_history.json():
            return {
                'product_name': product['name'],
                'current_score': current_score,
                'historical_score': None,
                'change': None,
                'days_ago': days_ago,
                'message': 'No historical data available'
            }

        historical = r_history.json()[0]
        historical_score = historical.get('safe_score')

        change = None
        if current_score is not None and historical_score is not None:
            change = round(current_score - historical_score, 2)

        return {
            'product_name': product['name'],
            'current_score': current_score,
            'historical_score': historical_score,
            'historical_date': historical.get('recorded_at'),
            'change': change,
            'change_percent': round((change / historical_score) * 100, 2) if historical_score and change else None,
            'days_ago': days_ago,
            'trend': 'up' if change and change > 0 else ('down' if change and change < 0 else 'stable')
        }

    # =========================================================================
    # SECURITY INCIDENT MANAGEMENT
    # =========================================================================

    def create_incident(
        self,
        incident_id: str,
        title: str,
        incident_type: str,
        severity: str,
        incident_date: datetime,
        description: str = None,
        funds_lost_usd: float = 0,
        affected_product_ids: List[int] = None,
        source_urls: List[str] = None,
        is_published: bool = False
    ) -> Optional[int]:
        """
        Creates a new security incident.

        Args:
            incident_id: Unique ID (e.g., 'INC-2024-001', 'CVE-2024-12345')
            title: Incident title
            incident_type: Type (hack, exploit, vulnerability, etc.)
            severity: Severity (critical, high, medium, low, info)
            incident_date: When the incident occurred
            description: Detailed description
            funds_lost_usd: Estimated funds lost in USD
            affected_product_ids: List of affected product IDs
            source_urls: List of source URLs
            is_published: Show on public site?

        Returns:
            The new incident record ID, or None on failure
        """
        incident_data = {
            'incident_id': incident_id,
            'title': title,
            'description': description,
            'incident_type': incident_type,
            'severity': severity,
            'incident_date': incident_date.isoformat(),
            'funds_lost_usd': funds_lost_usd,
            'affected_product_ids': affected_product_ids or [],
            'source_urls': source_urls or [],
            'status': 'confirmed',
            'is_published': is_published,
            'created_at': datetime.now().isoformat()
        }

        r = self.session.post(
            f'{SUPABASE_URL}/rest/v1/security_incidents',
            headers=HEADERS,
            json=incident_data,
            timeout=30
        )

        if r.status_code in [200, 201]:
            result = r.json()
            if result:
                new_id = result[0].get('id')
                print(f"[OK] Incident '{incident_id}' created (ID: {new_id})")

                # Create impact records for affected products
                if affected_product_ids:
                    self._create_product_impacts(new_id, affected_product_ids, severity)

                return new_id

        print(f"[ERROR] Failed to create incident: {r.status_code} - {r.text}")
        return None

    def _create_product_impacts(
        self,
        incident_db_id: int,
        product_ids: List[int],
        severity: str
    ):
        """Creates impact records for affected products."""
        # Default score impacts based on severity
        impacts = {
            'critical': {'s': -15, 'a': -10, 'f': -10, 'e': -5},
            'high': {'s': -10, 'a': -5, 'f': -5, 'e': -2},
            'medium': {'s': -5, 'a': -2, 'f': -2, 'e': -1},
            'low': {'s': -2, 'a': -1, 'f': -1, 'e': 0},
            'info': {'s': 0, 'a': 0, 'f': 0, 'e': 0}
        }

        impact_values = impacts.get(severity, impacts['medium'])

        for product_id in product_ids:
            impact_data = {
                'incident_id': incident_db_id,
                'product_id': product_id,
                'impact_level': 'direct',
                'score_adjustment_s': impact_values['s'],
                'score_adjustment_a': impact_values['a'],
                'score_adjustment_f': impact_values['f'],
                'score_adjustment_e': impact_values['e']
            }

            r = self.session.post(
                f'{SUPABASE_URL}/rest/v1/incident_product_impact',
                headers={**HEADERS, 'Prefer': 'return=minimal'},
                json=impact_data,
                timeout=30
            )

            if r.status_code in [200, 201, 204]:
                print(f"   [OK] Impact recorded for product {product_id}")
            else:
                print(f"   [ERROR] Failed to record impact for product {product_id}")

    def get_product_incidents(self, product_id: int) -> List[Dict]:
        """Gets all incidents affecting a product."""
        r = self.session.get(
            f'{SUPABASE_URL}/rest/v1/incident_product_impact?product_id=eq.{product_id}&select=*,security_incidents(*)',
            headers=HEADERS,
            timeout=30
        )

        if r.status_code == 200:
            results = r.json()
            # Flatten the response
            incidents = []
            for item in results:
                incident = item.get('security_incidents', {})
                incident['impact_level'] = item.get('impact_level')
                incident['score_adjustments'] = {
                    'S': item.get('score_adjustment_s'),
                    'A': item.get('score_adjustment_a'),
                    'F': item.get('score_adjustment_f'),
                    'E': item.get('score_adjustment_e')
                }
                incidents.append(incident)
            return incidents
        return []

    def get_recent_incidents(self, limit: int = 20) -> List[Dict]:
        """Gets recent security incidents."""
        r = self.session.get(
            f'{SUPABASE_URL}/rest/v1/security_incidents?is_published=eq.true&order=incident_date.desc&limit={limit}',
            headers=HEADERS,
            timeout=30
        )

        if r.status_code == 200:
            return r.json()
        return []

    def get_incident_stats(self) -> Dict:
        """Gets overall incident statistics."""
        r = self.session.get(
            f'{SUPABASE_URL}/rest/v1/security_incidents?select=id,severity,funds_lost_usd,incident_type',
            headers=HEADERS,
            timeout=30
        )

        if r.status_code != 200:
            return {}

        incidents = r.json()

        stats = {
            'total_incidents': len(incidents),
            'total_funds_lost': sum(i.get('funds_lost_usd', 0) or 0 for i in incidents),
            'by_severity': {},
            'by_type': {}
        }

        for incident in incidents:
            severity = incident.get('severity', 'unknown')
            inc_type = incident.get('incident_type', 'unknown')

            stats['by_severity'][severity] = stats['by_severity'].get(severity, 0) + 1
            stats['by_type'][inc_type] = stats['by_type'].get(inc_type, 0) + 1

        return stats

    # =========================================================================
    # MOAT ANALYTICS
    # =========================================================================

    def get_moat_summary(self) -> Dict:
        """
        Gets a summary of all "moat" data - unique data that competitors cannot copy.
        """
        # Count historical snapshots
        r_history = self.session.get(
            f'{SUPABASE_URL}/rest/v1/score_history?select=id',
            headers=HEADERS,
            timeout=30
        )
        history_count = len(r_history.json()) if r_history.status_code == 200 else 0

        # Count incidents
        r_incidents = self.session.get(
            f'{SUPABASE_URL}/rest/v1/security_incidents?select=id',
            headers=HEADERS,
            timeout=30
        )
        incident_count = len(r_incidents.json()) if r_incidents.status_code == 200 else 0

        # Count evaluations
        r_evals = self.session.get(
            f'{SUPABASE_URL}/rest/v1/evaluations?select=id&limit=1',
            headers={**HEADERS, 'Prefer': 'count=exact'},
            timeout=30
        )
        eval_count = 0
        if r_evals.status_code == 200:
            count_header = r_evals.headers.get('content-range', '')
            if '/' in count_header:
                eval_count = int(count_header.split('/')[1])

        return {
            'unique_data_points': {
                'score_history_snapshots': history_count,
                'security_incidents': incident_count,
                'product_evaluations': eval_count,
                'total': history_count + incident_count + eval_count
            },
            'competitive_advantage': {
                'historical_tracking': history_count > 0,
                'incident_intelligence': incident_count > 0,
                'deep_evaluations': eval_count > 10000
            },
            'message': f"SafeScoring has {history_count + incident_count + eval_count:,} unique data points that cannot be copied."
        }


def main():
    """Demo of MoatManager capabilities."""
    print("=" * 60)
    print("SAFESCORING - MOAT MANAGER DEMO")
    print("=" * 60)

    manager = MoatManager()

    # Show moat summary
    print("\n[MOAT SUMMARY]")
    summary = manager.get_moat_summary()
    print(f"  Score history snapshots: {summary['unique_data_points']['score_history_snapshots']:,}")
    print(f"  Security incidents: {summary['unique_data_points']['security_incidents']:,}")
    print(f"  Product evaluations: {summary['unique_data_points']['product_evaluations']:,}")
    print(f"  TOTAL UNIQUE DATA: {summary['unique_data_points']['total']:,}")
    print(f"\n  {summary['message']}")

    print("\n" + "=" * 60)
    print("DEMO COMPLETE")
    print("=" * 60)


if __name__ == '__main__':
    main()
