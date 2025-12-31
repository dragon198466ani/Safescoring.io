#!/usr/bin/env python3
"""
SAFESCORING.IO - Scoring Engine
Calcule les scores SAFE à partir des évaluations YES/NO/N/A
"""

import os
import requests
from datetime import datetime

# Configuration
def load_config():
    config = {}
    config_path = os.path.join(os.path.dirname(__file__), 'env_template_free.txt')
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


class ScoringEngine:
    """Moteur de calcul des scores SAFE"""
    
    # Poids des piliers SAFE
    PILLAR_WEIGHTS = {
        'S': 0.35,  # Security - 35%
        'A': 0.25,  # Accessibility - 25%
        'F': 0.20,  # Functionality - 20%
        'E': 0.20   # Experience - 20%
    }
    
    # Bonus pour normes essentielles
    ESSENTIAL_MULTIPLIER = 1.5
    
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
        self.norms_cache = {}
    
    def load_norms(self):
        """Charge les normes avec leurs piliers"""
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,is_essential",
            headers=self.headers
        )
        if r.status_code == 200:
            for norm in r.json():
                self.norms_cache[norm['id']] = norm
        return self.norms_cache
    
    def get_product_evaluations(self, product_id):
        """Récupère toutes les évaluations d'un produit"""
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}&select=norm_id,result",
            headers=self.headers
        )
        if r.status_code == 200:
            return r.json()
        return []
    
    def calculate_product_score(self, product_id):
        """Calcule le score SAFE complet d'un produit"""
        
        # Charger les normes si nécessaire
        if not self.norms_cache:
            self.load_norms()
        
        # Récupérer les évaluations
        evaluations = self.get_product_evaluations(product_id)
        
        if not evaluations:
            return None
        
        # Initialiser les compteurs par pilier
        pillar_stats = {
            'S': {'yes': 0, 'no': 0, 'na': 0, 'essential_yes': 0, 'essential_total': 0},
            'A': {'yes': 0, 'no': 0, 'na': 0, 'essential_yes': 0, 'essential_total': 0},
            'F': {'yes': 0, 'no': 0, 'na': 0, 'essential_yes': 0, 'essential_total': 0},
            'E': {'yes': 0, 'no': 0, 'na': 0, 'essential_yes': 0, 'essential_total': 0}
        }
        
        # Compter les résultats par pilier
        for eval in evaluations:
            norm = self.norms_cache.get(eval['norm_id'])
            if not norm:
                continue
            
            pillar = norm.get('pillar', 'S')
            if pillar not in pillar_stats:
                pillar = 'S'
            
            result = eval.get('result', 'N/A').upper()
            is_essential = norm.get('is_essential', False)
            
            if result == 'YES':
                pillar_stats[pillar]['yes'] += 1
                if is_essential:
                    pillar_stats[pillar]['essential_yes'] += 1
            elif result == 'NO':
                pillar_stats[pillar]['no'] += 1
            else:  # N/A
                pillar_stats[pillar]['na'] += 1
            
            if is_essential and result != 'N/A':
                pillar_stats[pillar]['essential_total'] += 1
        
        # Calculer les scores par pilier
        pillar_scores = {}
        for pillar, stats in pillar_stats.items():
            applicable = stats['yes'] + stats['no']
            
            if applicable == 0:
                pillar_scores[pillar] = None
                continue
            
            # Score de base (% de YES)
            base_score = (stats['yes'] / applicable) * 100
            
            # Bonus/Malus pour normes essentielles
            if stats['essential_total'] > 0:
                essential_rate = stats['essential_yes'] / stats['essential_total']
                # Si toutes les essentielles sont YES, bonus de 5%
                # Si aucune essentielle n'est YES, malus de 10%
                essential_modifier = (essential_rate - 0.5) * 10
                base_score = min(100, max(0, base_score + essential_modifier))
            
            pillar_scores[pillar] = round(base_score, 1)
        
        # Calculer le score global pondéré
        total_weight = 0
        weighted_sum = 0
        
        for pillar, weight in self.PILLAR_WEIGHTS.items():
            if pillar_scores.get(pillar) is not None:
                weighted_sum += pillar_scores[pillar] * weight
                total_weight += weight
        
        global_score = round(weighted_sum / total_weight, 1) if total_weight > 0 else None
        
        return {
            'product_id': product_id,
            'global_score': global_score,
            'security_score': pillar_scores.get('S'),
            'accessibility_score': pillar_scores.get('A'),
            'functionality_score': pillar_scores.get('F'),
            'experience_score': pillar_scores.get('E'),
            'stats': pillar_stats,
            'calculated_at': datetime.now().isoformat()
        }
    
    def update_product_scores(self, product_id):
        """Met à jour les scores d'un produit dans la base"""
        scores = self.calculate_product_score(product_id)
        
        if not scores:
            return None
        
        # Préparer les données pour Supabase
        update_data = {
            'specs': {
                'safe_score': scores['global_score'],
                'security_score': scores['security_score'],
                'accessibility_score': scores['accessibility_score'],
                'functionality_score': scores['functionality_score'],
                'experience_score': scores['experience_score'],
                'last_scored': scores['calculated_at']
            }
        }
        
        # Mettre à jour le produit
        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}",
            headers={**self.headers, 'Prefer': 'return=minimal'},
            json=update_data
        )
        
        if r.status_code in [200, 204]:
            return scores
        
        return None
    
    def calculate_all_scores(self):
        """Calcule les scores de tous les produits"""
        print("📊 CALCUL DES SCORES SAFE")
        print("=" * 60)
        
        # Charger les normes
        self.load_norms()
        print(f"   📋 {len(self.norms_cache)} normes chargées")
        
        # Récupérer tous les produits
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=id,name",
            headers=self.headers
        )
        
        if r.status_code != 200:
            print("   ❌ Erreur récupération produits")
            return
        
        products = r.json()
        print(f"   📦 {len(products)} produits à scorer")
        
        # Calculer les scores
        results = []
        for i, product in enumerate(products):
            scores = self.calculate_product_score(product['id'])
            
            if scores and scores['global_score'] is not None:
                results.append({
                    'name': product['name'],
                    'score': scores['global_score'],
                    'S': scores['security_score'],
                    'A': scores['accessibility_score'],
                    'F': scores['functionality_score'],
                    'E': scores['experience_score']
                })
                
                # Mettre à jour en base
                self.update_product_scores(product['id'])
        
        # Trier par score
        results.sort(key=lambda x: x['score'], reverse=True)
        
        # Afficher le classement
        print(f"\n🏆 CLASSEMENT (Top 20)")
        print("-" * 60)
        print(f"{'Rang':<5} {'Produit':<25} {'SAFE':<8} {'S':<6} {'A':<6} {'F':<6} {'E':<6}")
        print("-" * 60)
        
        for i, r in enumerate(results[:20]):
            print(f"{i+1:<5} {r['name'][:24]:<25} {r['score']:<8} {r['S'] or '-':<6} {r['A'] or '-':<6} {r['F'] or '-':<6} {r['E'] or '-':<6}")
        
        print(f"\n✅ {len(results)} produits scorés")
        
        return results


def main():
    """Calcul des scores"""
    engine = ScoringEngine()
    engine.calculate_all_scores()


if __name__ == "__main__":
    main()
