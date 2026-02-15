#!/usr/bin/env python3
"""
SAFESCORING.IO - Monthly Cron
Monthly orchestrator for automatic evaluation updates
"""

import os
import sys
import json
import requests
import time
from datetime import datetime, timedelta

# Add parent directory to path to access core/
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.smart_evaluator import SmartEvaluator
from core.product_scraper import ProductScraper
from core.score_calculator import ScoreCalculator

from core.config import load_config, CONFIG, SUPABASE_URL, SUPABASE_KEY


class MonthlyCron:
    """SAFE SCORING Monthly Orchestrator"""
    
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
        self.start_time = datetime.now()
        self.stats = {
            'products_scraped': 0,
            'products_evaluated': 0,
            'evaluations_created': 0,
            'scores_updated': 0,
            'errors': []
        }
    
    def log(self, message, level='INFO'):
        """Log with timestamp"""
        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"[{timestamp}] [{level}] {message}")
        
        # Save to automation_logs
        self._save_log(message, level)
    
    def _save_log(self, message, level):
        """Saves log to Supabase"""
        try:
            requests.post(
                f"{SUPABASE_URL}/rest/v1/automation_logs",
                headers=self.headers,
                json={
                    'action': 'monthly_cron',
                    'status': level.lower(),
                    'details': {'message': message},
                    'created_at': datetime.now().isoformat()
                },
                timeout=10
            )
        except Exception:
            pass
    
    def get_products_to_update(self, limit=None):
        """Gets products to update"""
        # Priority: products never evaluated or evaluated more than 30 days ago
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=id,name,url,type_id&type_id=not.is.null",
            headers=self.headers
        )
        
        if r.status_code == 200:
            products = r.json()
            if limit:
                return products[:limit]
            return products
        return []
    
    def run_scraping(self, products):
        """Step 1: Product scraping"""
        self.log("🕷️  STEP 1: PRODUCT SCRAPING")
        
        scraper = ProductScraper()
        scraped = 0
        
        for product in products:
            if not product.get('url'):
                continue
            
            try:
                content = scraper.scrape_product(product)
                if content:
                    scraped += 1
                    self.log(f"   ✅ {product['name']}")
            except Exception as e:
                self.stats['errors'].append(f"Scraping {product['name']}: {e}")
                self.log(f"   ❌ {product['name']}: {e}", 'ERROR')
            
            # Rate limiting
            time.sleep(1)
        
        self.stats['products_scraped'] = scraped
        self.log(f"   📊 {scraped} products scraped")
    
    def run_evaluation(self, products, max_per_product=50):
        """Step 2: AI product evaluation"""
        self.log("🤖 STEP 2: AI EVALUATION")
        
        evaluator = SmartEvaluator()
        evaluator.load_data()
        
        total_evals = 0
        
        for product in products:
            if not product.get('type_id'):
                continue
            
            try:
                results = evaluator.evaluate_product(product)
                
                if results:
                    total_evals += len(results)
                    self.stats['products_evaluated'] += 1
                    self.log(f"   ✅ {product['name']}: {len(results)} evaluations")
                    
            except Exception as e:
                self.stats['errors'].append(f"Evaluation {product['name']}: {e}")
                self.log(f"   ❌ {product['name']}: {e}", 'ERROR')
            
            # Rate limiting for APIs
            time.sleep(2)
        
        self.stats['evaluations_created'] = total_evals
        self.log(f"   📊 {total_evals} evaluations created")
    
    def run_scoring(self):
        """Step 3: Score calculation"""
        self.log("📊 STEP 3: SCORE CALCULATION")
        
        calculator = ScoreCalculator()
        calculator.load_data()
        results = []
        for product in calculator.products:
            scores, stats = calculator.calculate_product_scores_with_stats(product['id'])
            if scores:
                calculator.save_product_scores(product['id'], scores, stats)
                results.append(product)
        
        if results:
            self.stats['scores_updated'] = len(results)
            self.log(f"   📊 {len(results)} scores updated")
    
    def detect_changes(self):
        """Step 4: Significant change detection"""
        self.log("🔔 STEP 4: CHANGE DETECTION")
        
        # Get products with score change > 5%
        # TODO: Compare with previously stored scores
        
        self.log("   ℹ️  Change detection: to be implemented")
    
    def generate_report(self):
        """Generates final report"""
        duration = datetime.now() - self.start_time
        
        report = f"""
╔══════════════════════════════════════════════════════════════╗
║           SAFE SCORING - MONTHLY REPORT                       ║
╠══════════════════════════════════════════════════════════════╣
║  Date: {self.start_time.strftime('%Y-%m-%d %H:%M')}                                      ║
║  Duration: {str(duration).split('.')[0]}                                       ║
╠══════════════════════════════════════════════════════════════╣
║  📦 Products scraped:    {self.stats['products_scraped']:<10}                        ║
║  🤖 Products evaluated:  {self.stats['products_evaluated']:<10}                        ║
║  📋 Evaluations created: {self.stats['evaluations_created']:<10}                        ║
║  📊 Scores updated:      {self.stats['scores_updated']:<10}                        ║
║  ❌ Errors:              {len(self.stats['errors']):<10}                        ║
╚══════════════════════════════════════════════════════════════╝
"""
        print(report)
        
        # Save the report
        self._save_log(f"Rapport: {json.dumps(self.stats)}", 'REPORT')
        
        return report
    
    def run(self, mode='full', limit=None):
        """Runs the monthly cron"""
        print("""
╔══════════════════════════════════════════════════════════════╗
║           🔐 SAFE SCORING - MONTHLY UPDATE 🔐                ║
╚══════════════════════════════════════════════════════════════╝
""")
        
        self.log(f"Starting in mode: {mode}")
        
        # Get products
        products = self.get_products_to_update(limit)
        self.log(f"📦 {len(products)} products to process")
        
        if mode in ['full', 'scrape']:
            self.run_scraping(products)
        
        if mode in ['full', 'evaluate']:
            self.run_evaluation(products)
        
        if mode in ['full', 'score']:
            self.run_scoring()
        
        if mode == 'full':
            self.detect_changes()
        
        # Final report
        self.generate_report()
        
        return self.stats


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='SAFE SCORING Monthly Cron')
    parser.add_argument('--mode', choices=['full', 'scrape', 'evaluate', 'score'], 
                        default='score', help='Execution mode')
    parser.add_argument('--limit', type=int, default=None, 
                        help='Limit of products to process')
    
    args = parser.parse_args()
    
    cron = MonthlyCron()
    cron.run(mode=args.mode, limit=args.limit)


if __name__ == "__main__":
    main()
