#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Quick evaluation of 1inch with progress display"""

import sys
import os
import io

# Fix encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from core.smart_evaluator import SmartEvaluator

print("="*80)
print("QUICK EVALUATION: 1inch")
print("="*80)

evaluator = SmartEvaluator()

# Run evaluation for 1inch
# Note: This will scrape 1inch.io website and evaluate with AI
# May take 5-15 minutes depending on API availability

evaluator.run(
    product_name="1inch",
    limit=1  # Only evaluate first match
)

print("\n" + "="*80)
print("EVALUATION COMPLETE!")
print("="*80)
