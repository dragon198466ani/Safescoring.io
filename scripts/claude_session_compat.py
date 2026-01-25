#!/usr/bin/env python3
"""
Interactive Claude Code compatibility analyzer.
Run this when Claude Code is open - Claude will analyze pairs intelligently.

Usage:
    python scripts/claude_session_compat.py --fetch    # Show pending pairs for Claude to analyze
    python scripts/claude_session_compat.py --save     # Save Claude's analysis from clipboard/file
"""

import os
import sys
import json
import requests
from datetime import datetime
from typing import Dict, List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.core.config import SUPABASE_URL, get_supabase_headers


class ClaudeSessionCompat:
    """Interactive compatibility analysis with Claude Code session"""

    def __init__(self):
        self.headers = get_supabase_headers()
        self.output_file = os.path.join(os.path.dirname(__file__), 'claude_compat_pending.json')
        self.input_file = os.path.join(os.path.dirname(__file__), 'claude_compat_results.json')

    def fetch_pending(self, limit: int = 10) -> List[Dict]:
        """Fetch pending pairs for Claude to analyze"""
        # Get products from queue
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/compat_refresh_queue?select=product_id&processed_at=is.null&limit=50",
            headers=self.headers
        )
        if r.status_code != 200:
            print(f"Error fetching queue: {r.status_code}")
            return []

        product_ids = list(set(p['product_id'] for p in r.json()))
        if not product_ids:
            print("No pending updates in queue")
            return []

        print(f"Found {len(product_ids)} products in queue")

        # Get all products data
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug,product_type,pilier_s,pilier_a,pilier_f,pilier_e,url,description",
            headers=self.headers
        )
        products = {p['id']: p for p in r.json()}

        # Get affected pairs
        ids_str = ','.join(str(pid) for pid in product_ids)
        pairs = []

        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_compatibility?select=product_a_id,product_b_id&product_a_id=in.({ids_str})",
            headers=self.headers
        )
        if r.status_code == 200:
            pairs.extend(r.json())

        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_compatibility?select=product_a_id,product_b_id&product_b_id=in.({ids_str})",
            headers=self.headers
        )
        if r.status_code == 200:
            pairs.extend(r.json())

        # Deduplicate
        unique = {}
        for p in pairs:
            key = f"{min(p['product_a_id'], p['product_b_id'])}-{max(p['product_a_id'], p['product_b_id'])}"
            unique[key] = p

        pairs = list(unique.values())[:limit]
        print(f"Found {len(pairs)} pairs to analyze")

        # Build analysis requests for Claude
        analysis_requests = []
        for pair in pairs:
            pa = products.get(pair['product_a_id'])
            pb = products.get(pair['product_b_id'])
            if not pa or not pb:
                continue

            analysis_requests.append({
                'product_a_id': pa['id'],
                'product_b_id': pb['id'],
                'product_a': {
                    'name': pa['name'],
                    'type': pa.get('product_type'),
                    'pilier_s': pa.get('pilier_s'),
                    'pilier_a': pa.get('pilier_a'),
                    'pilier_f': pa.get('pilier_f'),
                    'pilier_e': pa.get('pilier_e'),
                    'url': pa.get('url'),
                    'description': pa.get('description', '')[:200]
                },
                'product_b': {
                    'name': pb['name'],
                    'type': pb.get('product_type'),
                    'pilier_s': pb.get('pilier_s'),
                    'pilier_a': pb.get('pilier_a'),
                    'pilier_f': pb.get('pilier_f'),
                    'pilier_e': pb.get('pilier_e'),
                    'url': pb.get('url'),
                    'description': pb.get('description', '')[:200]
                }
            })

        # Save to file for Claude to read
        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(analysis_requests, f, indent=2, ensure_ascii=False)

        print(f"\nSaved {len(analysis_requests)} pairs to: {self.output_file}")
        print("\n" + "="*60)
        print("CLAUDE: Lis ce fichier et genere les SAFE warnings pour chaque paire")
        print("Format attendu pour chaque paire:")
        print("""
{
  "product_a_id": X,
  "product_b_id": Y,
  "safe_warning_s": "SECURITE (XX/100) - SITUATION: ... CAS EXTREME: ... SOLUTION: ...",
  "safe_warning_a": "ADVERSITE (XX/100) - SITUATION: ... CAS EXTREME: ... SOLUTION: ...",
  "safe_warning_f": "FIABILITE (XX/100) - SITUATION: ... CAS EXTREME: ... SOLUTION: ...",
  "safe_warning_e": "EFFICACITE (XX/100) - SITUATION: ... CAS EXTREME: ... SOLUTION: ...",
  "security_level": "HIGH/MEDIUM/LOW",
  "ai_method": "Description de comment utiliser les deux produits ensemble"
}
""")
        print("="*60)

        return analysis_requests

    def save_results(self, results: List[Dict] = None):
        """Save Claude's analysis results to database"""
        if results is None:
            # Try to load from file
            if os.path.exists(self.input_file):
                with open(self.input_file, 'r', encoding='utf-8') as f:
                    results = json.load(f)
            else:
                print(f"No results file found: {self.input_file}")
                return

        if not results:
            print("No results to save")
            return

        saved = 0
        for r in results:
            pa_id = min(r['product_a_id'], r['product_b_id'])
            pb_id = max(r['product_a_id'], r['product_b_id'])

            update_data = {
                'safe_warning_s': r.get('safe_warning_s', '')[:500],
                'safe_warning_a': r.get('safe_warning_a', '')[:500],
                'safe_warning_f': r.get('safe_warning_f', '')[:500],
                'safe_warning_e': r.get('safe_warning_e', '')[:500],
                'security_level': r.get('security_level', 'MEDIUM'),
                'ai_method': r.get('ai_method', '')[:500],
                'ai_justification': 'Claude Opus session analysis',
                'analyzed_at': datetime.now().isoformat(),
                'analyzed_by': 'claude_opus_session'
            }

            resp = requests.patch(
                f"{SUPABASE_URL}/rest/v1/product_compatibility?product_a_id=eq.{pa_id}&product_b_id=eq.{pb_id}",
                headers=self.headers,
                json=update_data
            )

            if resp.status_code in [200, 204]:
                saved += 1
                print(f"   OK: {pa_id} x {pb_id}")
            else:
                print(f"   ERR: {pa_id} x {pb_id} - {resp.status_code}")

        print(f"\nSaved {saved}/{len(results)} analyses")

        # Mark queue as processed
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/compat_refresh_queue?select=product_id&processed_at=is.null",
            headers=self.headers
        )
        if r.status_code == 200:
            for item in r.json():
                requests.patch(
                    f"{SUPABASE_URL}/rest/v1/compat_refresh_queue?product_id=eq.{item['product_id']}&processed_at=is.null",
                    headers=self.headers,
                    json={'processed_at': datetime.now().isoformat()}
                )

        print("Queue marked as processed")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Interactive Claude compatibility analysis')
    parser.add_argument('--fetch', action='store_true', help='Fetch pending pairs for Claude')
    parser.add_argument('--save', action='store_true', help='Save Claude results to database')
    parser.add_argument('--limit', type=int, default=10, help='Max pairs to fetch')
    args = parser.parse_args()

    analyzer = ClaudeSessionCompat()

    if args.fetch:
        analyzer.fetch_pending(args.limit)
    elif args.save:
        analyzer.save_results()
    else:
        print("Usage:")
        print("  --fetch  : Fetch pending pairs for Claude to analyze")
        print("  --save   : Save Claude's results to database")
