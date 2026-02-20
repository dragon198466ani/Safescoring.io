#!/usr/bin/env python3
"""
Run full evaluation of ALL products with Claude Code CLI.
Safe to run multiple times - will skip already evaluated products.
"""

import subprocess
import sys
import time
import os

# Get list of products to evaluate
os.chdir(r'c:\Users\alexa\Desktop\SafeScoring')

print("="*60)
print("FULL PRODUCT EVALUATION WITH CLAUDE CODE CLI")
print("="*60)
print("\nThis will evaluate all products using your Claude subscription.")
print("No API costs - uses Claude Code CLI.\n")

# Run evaluation for all products
# --limit 100 = max 100 norms per product
# --batch-size 10 = process 10 products at a time
cmd = [
    sys.executable,
    'scripts/eval_with_claude_code_cli.py',
    '--all',
    '--limit', '100',
    '--batch-size', '10'
]

print(f"Running: {' '.join(cmd)}\n")
print("-"*60)

try:
    process = subprocess.run(cmd, check=False)
    print("-"*60)
    print(f"\nCompleted with return code: {process.returncode}")
except KeyboardInterrupt:
    print("\n\nInterrupted by user. Progress has been saved.")
except Exception as e:
    print(f"\nError: {e}")
