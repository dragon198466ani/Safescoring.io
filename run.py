#!/usr/bin/env python3
"""
SAFE SCORING - Main Entry Point
"""

import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def main():
    if len(sys.argv) < 2:
        print("""
🔐 SAFE SCORING - Available Commands

Usage: python run.py <command>

Commands:
  admin       Launch admin web interface (port 5000)
  score       Calculate scores for all products
  cron        Run monthly cron job
  evaluate    Evaluate a product via AI
  
Examples:
  python run.py admin
  python run.py score
  python run.py cron --mode score --limit 10
""")
        return

    command = sys.argv[1]

    if command == 'admin':
        os.chdir(os.path.join(os.path.dirname(__file__), 'src', 'web'))
        from web.admin_app import app
        print("Starting admin interface...")
        print("   URL: http://localhost:5000")
        is_debug = os.environ.get('FLASK_ENV', 'development') != 'production'
        app.run(debug=is_debug, port=5000)

    elif command == 'score':
        os.chdir(os.path.dirname(__file__))
        ensure_config()
        from core.config import validate_config
        if not validate_config(require_ai=False):
            sys.exit(1)
        from core.score_calculator import ScoreCalculator
        calculator = ScoreCalculator()
        calculator.run()

    elif command == 'cron':
        os.chdir(os.path.dirname(__file__))
        ensure_config()
        from automation.monthly_cron import MonthlyCron
        
        mode = 'score'
        limit = None
        
        if '--mode' in sys.argv:
            idx = sys.argv.index('--mode')
            if idx + 1 < len(sys.argv):
                mode = sys.argv[idx + 1]
        
        if '--limit' in sys.argv:
            idx = sys.argv.index('--limit')
            if idx + 1 < len(sys.argv):
                limit = int(sys.argv[idx + 1])
        
        cron = MonthlyCron()
        cron.run(mode=mode, limit=limit)

    elif command == 'evaluate':
        os.chdir(os.path.dirname(__file__))
        ensure_config()
        from core.config import validate_config
        if not validate_config(require_ai=True):
            sys.exit(1)
        from core.smart_evaluator import SmartEvaluator
        evaluator = SmartEvaluator()
        evaluator.load_data()
        
        if len(sys.argv) > 2:
            product_id = int(sys.argv[2])
            # Find product by ID
            product = next((p for p in evaluator.products if p['id'] == product_id), None)
            if product:
                evaluator.evaluate_product(product)
            else:
                print(f"Product ID={product_id} not found")
        else:
            print("Usage: python run.py evaluate <product_id>")

    else:
        print(f"❌ Unknown command: {command}")
        print("   Use: admin, score, cron, evaluate")


def ensure_config():
    """Ensures the config file is accessible"""
    config_src = os.path.join(os.path.dirname(__file__), 'config', 'env_template_free.txt')
    config_dst = os.path.join(os.path.dirname(__file__), 'src', 'core', 'env_template_free.txt')
    
    if os.path.exists(config_src) and not os.path.exists(config_dst):
        import shutil
        shutil.copy(config_src, config_dst)
        
    # Also for automation
    config_dst2 = os.path.join(os.path.dirname(__file__), 'src', 'automation', 'env_template_free.txt')
    if os.path.exists(config_src) and not os.path.exists(config_dst2):
        import shutil
        shutil.copy(config_src, config_dst2)


if __name__ == '__main__':
    main()
