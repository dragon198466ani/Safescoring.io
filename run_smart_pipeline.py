#!/usr/bin/env python3
"""
Quick launcher for Smart Data Pipeline.

Usage:
    python run_smart_pipeline.py              # Status only
    python run_smart_pipeline.py summaries    # Process norm summaries
    python run_smart_pipeline.py evaluations  # Process evaluations
    python run_smart_pipeline.py all          # Both
"""
import sys
import os

# Change to project root
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Add to path
sys.path.insert(0, '.')

from src.automation.smart_data_pipeline import SmartDataPipeline
from src.core.config import GROQ_API_KEYS, SAMBANOVA_API_KEYS, CEREBRAS_API_KEYS

# Print API status
print("=" * 50)
print("🔧 API CONFIGURATION")
print("=" * 50)
print(f"Groq: {len(GROQ_API_KEYS)} keys (1 compte = 30 RPM)")
print(f"SambaNova: {len(SAMBANOVA_API_KEYS)} keys (1 compte = 20 RPM)")
print(f"Cerebras: {len(CEREBRAS_API_KEYS)} keys (1 compte = 30 RPM)")
print("-" * 50)
print(f"RPM RÉEL: ~80 RPM (3 comptes)")
print("=" * 50)

# Determine mode
mode = 'status'
if len(sys.argv) > 1:
    mode = sys.argv[1]

# Determine workers based on available APIs
groq_exhausted = os.path.exists('config/.groq_quota_exhausted')
workers = 2 if groq_exhausted else 4

print(f"\nMode: {mode}")
print(f"Workers: {workers} ({'Groq exhausted' if groq_exhausted else 'Groq active'})")

# Run pipeline
pipeline = SmartDataPipeline()
pipeline.run(mode=mode, limit=100, workers=workers)
