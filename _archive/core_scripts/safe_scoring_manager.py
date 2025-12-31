#!/usr/bin/env python3
"""
SAFESCORING.IO - Safe Scoring Manager

Central manager for:
1. AI classification of new norms (essential/consumer/full)
2. Automatic score calculation in safe_scoring_results
3. Synchronization between tables

This module uses the new tables:
- safe_scoring_definitions: Definitions linked to norms
- safe_scoring_results: Results per product (like Excel)
"""

import os
import sys
import json
import requests
import time
from datetime import datetime
from typing import Dict, List, Optional

# Add parent path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.norm_classifier import NormClassifier

# Configuration
def load_config():
    """Load configuration from env file"""
    config = {}
    possible_paths = [
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', '.env'),
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', 'env_template_free.txt'),
    ]
    
    config_path = None
    for path in possible_paths:
        if os.path.exists(path):
            config_path = path
            break
    
    if not config_path:
        print("\u274c Configuration file not found!")
        return config
    
    with open(config_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                config[key.strip()] = value.strip()
    return config

CONFIG = load_config()
SUPABASE_URL = CONFIG.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = CONFIG.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')


class SafeScoringManager:
    """
    Central manager for SAFE Scoring system.
    
    Features:
    - Add new norms with automatic AI classification
    - Calculate scores for all products
    - Synchronize definitions
    - Export results (Excel-like format)
    """
    
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        self.classifier = NormClassifier()
    
    # ═════════════════════════════════════════════════════════════════════════════
    # NORM MANAGEMENT
    # ═════════════════════════════════════════════════════════════════════════════
    
    def add_norm(self, code: str, pillar: str, title: str, description: str = '',
                 auto_classify: bool = True) -> Dict:
        """
        Add a new norm and classify it automatically.
        
        Args:
            code: Norm code (e.g., S001)
            pillar: SAFE pillar (S, A, F, E)
            title: Norm title
            description: Detailed description
            auto_classify: If True, automatically classify with AI
            
        Returns:
            Dict with created norm and its classification
        """
        print(f"\n➕ ADDING NORM: {code}")
        print("=" * 60)
        
        # 1. Create the norm in the norms table
        norm_data = {
            'code': code.upper(),
            'pillar': pillar.upper(),
            'title': title,
            'description': description,
            'full': True,
            'created_at': datetime.now().isoformat()
        }
        
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/norms",
            headers=self.headers,
            json=norm_data
        )
        
        if r.status_code not in [200, 201]:
            print(f"   ❌ Erreur création norme: {r.text}")
            return {'error': r.text}
        
        norm = r.json()[0] if isinstance(r.json(), list) else r.json()
        print(f"   ✅ Norme créée avec ID: {norm['id']}")
        
        # 2. Classifier automatiquement avec l'IA
        if auto_classify:
            classification = self.classifier.classify_and_save(norm)
            norm['classification'] = classification
        
        return norm
    
    def classify_new_norms(self, limit: int = None) -> int:
        """
        Classifie toutes les nouvelles normes non encore classifiées.
        
        Args:
            limit: Nombre maximum de normes à classifier
            
        Returns:
            Nombre de normes classifiées
        """
        return self.classifier.classify_all_unclassified(limit=limit)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CALCUL DES SCORES
    # ═══════════════════════════════════════════════════════════════════════════
    
    def calculate_all_scores(self) -> List[Dict]:
        """
        Calcule les scores pour TOUS les produits et les sauvegarde
        dans safe_scoring_results.
        
        Utilise les définitions de safe_scoring_definitions pour déterminer
        quelles normes sont essential/consumer/full.
        
        Returns:
            Liste des résultats par produit
        """
        print("\n📊 CALCUL DES SCORES SAFE")
        print("=" * 60)
        
        # Récupérer tous les produits
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=id,name,type_id&order=name.asc",
            headers=self.headers
        )
        products = r.json() if r.status_code == 200 else []
        print(f"   📦 {len(products)} produits à scorer")
        
        # Récupérer les normes avec leurs définitions
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/v_norm_definitions",
            headers=self.headers
        )
        norms = r.json() if r.status_code == 200 else []
        norms_by_id = {n['norm_id']: n for n in norms}
        print(f"   📋 {len(norms)} normes avec définitions")
        
        results = []
        
        for i, product in enumerate(products):
            print(f"\n[{i+1}/{len(products)}] 📦 {product['name'][:30]}...", end=" ")
            
            # Récupérer les évaluations du produit
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product['id']}&select=norm_id,result",
                headers=self.headers
            )
            evaluations = r.json() if r.status_code == 200 else []
            
            if not evaluations:
                print("⚠️ Pas d'évaluations")
                continue
            
            # Calculate scores
            scores = self._calculate_product_scores(evaluations, norms_by_id)
            
            # Save to safe_scoring_results
            result_data = {
                'product_id': product['id'],
                # Full scores
                'note_finale': scores['full']['global'],
                'score_s': scores['full']['S'],
                'score_a': scores['full']['A'],
                'score_f': scores['full']['F'],
                'score_e': scores['full']['E'],
                # Consumer scores
                'note_consumer': scores['consumer']['global'],
                's_consumer': scores['consumer']['S'],
                'a_consumer': scores['consumer']['A'],
                'f_consumer': scores['consumer']['F'],
                'e_consumer': scores['consumer']['E'],
                # Essential scores
                'note_essential': scores['essential']['global'],
                's_essential': scores['essential']['S'],
                'a_essential': scores['essential']['A'],
                'f_essential': scores['essential']['F'],
                'e_essential': scores['essential']['E'],
                # Stats
                'total_norms_evaluated': scores['stats']['total'],
                'total_yes': scores['stats']['yes'],
                'total_no': scores['stats']['no'],
                'total_na': scores['stats']['na'],
                'calculated_at': datetime.now().isoformat(),
                'last_evaluation_date': datetime.now().isoformat()
            }
            
            # Upsert to safe_scoring_results
            r = requests.post(
                f"{SUPABASE_URL}/rest/v1/safe_scoring_results",
                headers={**self.headers, 'Prefer': 'resolution=merge-duplicates'},
                json=result_data
            )
            
            if r.status_code not in [200, 201]:
                # Try update
                requests.patch(
                    f"{SUPABASE_URL}/rest/v1/safe_scoring_results?product_id=eq.{product['id']}",
                    headers=self.headers,
                    json=result_data
                )
            
            print(f"✅ Full:{scores['full']['global']:.1f} Consumer:{scores['consumer']['global']:.1f} Essential:{scores['essential']['global']:.1f}")
            
            results.append({
                'product_id': product['id'],
                'name': product['name'],
                **scores
            })
        
        print(f"\n✅ {len(results)} produits scorés")
        return results
    
    def _calculate_product_scores(self, evaluations: List[Dict], norms_by_id: Dict) -> Dict:
        """
        Calcule les scores Full, Consumer, Essential pour un produit.
        
        Args:
            evaluations: Liste des évaluations (norm_id, result)
            norms_by_id: Dict des normes avec leurs définitions
            
        Returns:
            Dict avec les scores par catégorie et pilier
        """
        # Initialiser les compteurs
        stats = {'total': 0, 'yes': 0, 'no': 0, 'na': 0}
        
        pillar_stats = {
            'full': {'S': {'yes': 0, 'total': 0}, 'A': {'yes': 0, 'total': 0},
                     'F': {'yes': 0, 'total': 0}, 'E': {'yes': 0, 'total': 0}},
            'consumer': {'S': {'yes': 0, 'total': 0}, 'A': {'yes': 0, 'total': 0},
                         'F': {'yes': 0, 'total': 0}, 'E': {'yes': 0, 'total': 0}},
            'essential': {'S': {'yes': 0, 'total': 0}, 'A': {'yes': 0, 'total': 0},
                          'F': {'yes': 0, 'total': 0}, 'E': {'yes': 0, 'total': 0}}
        }
        
        for eval_item in evaluations:
            norm = norms_by_id.get(eval_item['norm_id'])
            if not norm:
                continue
            
            result = (eval_item.get('result') or 'N/A').upper()
            pillar = norm.get('pillar', 'S')
            
            # Global stats
            stats['total'] += 1
            if result == 'YES':
                stats['yes'] += 1
            elif result == 'NO':
                stats['no'] += 1
            else:
                stats['na'] += 1
                continue  # Skip N/A pour les calculs
            
            # Full (toutes les normes où is_full = TRUE)
            if norm.get('is_full', True):
                pillar_stats['full'][pillar]['total'] += 1
                if result == 'YES':
                    pillar_stats['full'][pillar]['yes'] += 1
            
            # Consumer
            if norm.get('is_consumer', False):
                pillar_stats['consumer'][pillar]['total'] += 1
                if result == 'YES':
                    pillar_stats['consumer'][pillar]['yes'] += 1
            
            # Essential
            if norm.get('is_essential', False):
                pillar_stats['essential'][pillar]['total'] += 1
                if result == 'YES':
                    pillar_stats['essential'][pillar]['yes'] += 1
        
        # Calculate final scores
        def calc_score(yes, total):
            return round((yes / total) * 100, 2) if total > 0 else None
        
        def calc_global(pillar_dict):
            scores = []
            for pillar in ['S', 'A', 'F', 'E']:
                s = pillar_dict[pillar]
                if s['total'] > 0:
                    scores.append(s['yes'] / s['total'])
            return round((sum(scores) / len(scores)) * 100, 2) if scores else None
        
        return {
            'full': {
                'global': calc_global(pillar_stats['full']),
                'S': calc_score(pillar_stats['full']['S']['yes'], pillar_stats['full']['S']['total']),
                'A': calc_score(pillar_stats['full']['A']['yes'], pillar_stats['full']['A']['total']),
                'F': calc_score(pillar_stats['full']['F']['yes'], pillar_stats['full']['F']['total']),
                'E': calc_score(pillar_stats['full']['E']['yes'], pillar_stats['full']['E']['total'])
            },
            'consumer': {
                'global': calc_global(pillar_stats['consumer']),
                'S': calc_score(pillar_stats['consumer']['S']['yes'], pillar_stats['consumer']['S']['total']),
                'A': calc_score(pillar_stats['consumer']['A']['yes'], pillar_stats['consumer']['A']['total']),
                'F': calc_score(pillar_stats['consumer']['F']['yes'], pillar_stats['consumer']['F']['total']),
                'E': calc_score(pillar_stats['consumer']['E']['yes'], pillar_stats['consumer']['E']['total'])
            },
            'essential': {
                'global': calc_global(pillar_stats['essential']),
                'S': calc_score(pillar_stats['essential']['S']['yes'], pillar_stats['essential']['S']['total']),
                'A': calc_score(pillar_stats['essential']['A']['yes'], pillar_stats['essential']['A']['total']),
                'F': calc_score(pillar_stats['essential']['F']['yes'], pillar_stats['essential']['F']['total']),
                'E': calc_score(pillar_stats['essential']['E']['yes'], pillar_stats['essential']['E']['total'])
            },
            'stats': stats
        }
    
    def recalculate_product(self, product_id: int) -> Dict:
        """
        Recalculate scores for a specific product.
        
        Args:
            product_id: Product ID
            
        Returns:
            Dict with calculated scores
        """
        # Call PostgreSQL function
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/recalculate_product_scores",
            headers=self.headers,
            json={'p_product_id': product_id}
        )
        
        if r.status_code == 200:
            # Get results
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/safe_scoring_results?product_id=eq.{product_id}",
                headers=self.headers
            )
            return r.json()[0] if r.status_code == 200 and r.json() else {}
        
        return {'error': r.text}
    
    # ═══════════════════════════════════════════════════════════════════════════
    # EXPORT AND DISPLAY
    # ═══════════════════════════════════════════════════════════════════════════
    
    def get_results_table(self, limit: int = 50) -> List[Dict]:
        """
        Get results formatted like Excel table.
        
        Args:
            limit: Maximum number of results
            
        Returns:
            List of results sorted by note_finale
        """
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/v_safe_scoring_results?order=note_finale.desc.nullslast&limit={limit}",
            headers=self.headers
        )
        return r.json() if r.status_code == 200 else []
    
    def print_results_table(self, limit: int = 20):
        """Display results in table format (like Excel)"""
        results = self.get_results_table(limit)
        
        if not results:
            print("❌ No results found")
            return
        
        print("\n" + "=" * 160)
        print("🏆 SAFE SCORING RESULTS - Ranking")
        print("=" * 160)
        
        # Header
        print(f"{'Rank':<5} {'Product':<25} │ {'FINAL SCORE':^10} │ {'SCORE S':^8} {'SCORE A':^8} {'SCORE F':^8} {'SCORE E':^8} │ "
              f"{'CONSUMER':^10} │ {'ESSENTIAL':^10}")
        print("-" * 160)
        
        def fmt(val):
            return f"{val:.1f}" if val is not None else "-"
        
        for i, r in enumerate(results):
            name = (r.get('product_name') or 'N/A')[:24]
            print(f"{i+1:<5} {name:<25} │ {fmt(r.get('note_finale')):^10} │ "
                  f"{fmt(r.get('score_s')):^8} {fmt(r.get('score_a')):^8} "
                  f"{fmt(r.get('score_f')):^8} {fmt(r.get('score_e')):^8} │ "
                  f"{fmt(r.get('note_consumer')):^10} │ {fmt(r.get('note_essential')):^10}")
        
        print("=" * 160)
        print(f"Total: {len(results)} products")
    
    def export_to_csv(self, filepath: str = 'safe_scoring_results.csv'):
        """
        Export results to CSV (Excel-compatible format).
        
        Args:
            filepath: CSV file path
        """
        import csv
        
        results = self.get_results_table(limit=1000)
        
        if not results:
            print("❌ No results to export")
            return
        
        # Columns like in Excel
        columns = [
            'product_name', 'product_type', 'brand_name',
            'note_finale', 'score_s', 'score_a', 'score_f', 'score_e',
            'note_consumer', 's_consumer', 'a_consumer', 'f_consumer', 'e_consumer',
            'note_essential', 's_essential', 'a_essential', 'f_essential', 'e_essential',
            'total_yes', 'total_no', 'total_na', 'calculated_at'
        ]
        
        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=columns, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(results)
        
        print(f"✅ Exported {len(results)} results to {filepath}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SYNCHRONIZATION
    # ═══════════════════════════════════════════════════════════════════════════
    
    def sync_definitions_from_norms(self):
        """
        Sync definitions from norms table to safe_scoring_definitions.
        Useful for migrating existing data.
        """
        print("\n🔄 SYNCING DEFINITIONS")
        print("=" * 60)
        
        # Get all norms
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,is_essential,consumer,full,classification_method",
            headers=self.headers
        )
        norms = r.json() if r.status_code == 200 else []
        
        # Get existing definitions
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/safe_scoring_definitions?select=norm_id",
            headers=self.headers
        )
        existing_ids = {d['norm_id'] for d in (r.json() if r.status_code == 200 else [])}
        
        synced = 0
        for norm in norms:
            if norm['id'] in existing_ids:
                continue
            
            definition_data = {
                'norm_id': norm['id'],
                'is_essential': norm.get('is_essential', False),
                'is_consumer': norm.get('consumer', False),
                'is_full': norm.get('full', True),
                'classification_method': norm.get('classification_method', 'migrated'),
                'classified_at': datetime.now().isoformat(),
                'classified_by': 'migration'
            }
            
            r = requests.post(
                f"{SUPABASE_URL}/rest/v1/safe_scoring_definitions",
                headers=self.headers,
                json=definition_data
            )
            
            if r.status_code in [200, 201]:
                synced += 1
        
        print(f"   ✅ {synced} definitions synced")
        return synced
    
    def run_full_pipeline(self, classify_new: bool = True, calculate_scores: bool = True):
        """
        Execute full pipeline:
        1. Classify new norms
        2. Calculate all scores
        3. Display results
        """
        print("""
╔══════════════════════════════════════════════════════════════╗
║       🔐 SAFE SCORING - FULL PIPELINE                        ║
╚══════════════════════════════════════════════════════════════╝
""")
        
        start_time = datetime.now()
        
        # 1. Classify new norms
        if classify_new:
            self.classify_new_norms()
        
        # 2. Calculate scores
        if calculate_scores:
            self.calculate_all_scores()
        
        # 3. Display results
        self.print_results_table()
        
        duration = datetime.now() - start_time
        print(f"\n⏱️ Total duration: {duration}")


def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='SAFE SCORING - Central Manager')
    parser.add_argument('--pipeline', action='store_true', help='Execute full pipeline')
    parser.add_argument('--classify', action='store_true', help='Classify new norms')
    parser.add_argument('--calculate', action='store_true', help='Calculate all scores')
    parser.add_argument('--results', action='store_true', help='Display results')
    parser.add_argument('--export', type=str, help='Export to CSV file')
    parser.add_argument('--sync', action='store_true', help='Sync definitions from norms')
    parser.add_argument('--add-norm', nargs=4, metavar=('CODE', 'PILLAR', 'TITLE', 'DESC'),
                        help='Add a new norm')
    
    args = parser.parse_args()
    
    manager = SafeScoringManager()
    
    if args.pipeline:
        manager.run_full_pipeline()
    
    elif args.classify:
        manager.classify_new_norms()
    
    elif args.calculate:
        manager.calculate_all_scores()
    
    elif args.results:
        manager.print_results_table()
    
    elif args.export:
        manager.export_to_csv(args.export)
    
    elif args.sync:
        manager.sync_definitions_from_norms()
    
    elif args.add_norm:
        code, pillar, title, desc = args.add_norm
        manager.add_norm(code, pillar, title, desc)
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
