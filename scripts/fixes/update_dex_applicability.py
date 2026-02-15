#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Update DEX norm applicability using AI analysis
Reviews and corrects the applicability of all norms for DEX products
"""

import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from core.applicability_generator import ApplicabilityGenerator

DEX_TYPE_ID = 39  # DEX type ID from database

print("""
╔══════════════════════════════════════════════════════════════╗
║   UPDATE DEX NORM APPLICABILITY                              ║
║   Reviews all 2159 norms for DEX products                     ║
╚══════════════════════════════════════════════════════════════╝
""")

print("This will:")
print("  1. Load current DEX type definition and all norms")
print("  2. Use AI to review applicability of each norm for DEX")
print("  3. Update the norm_applicability table with corrections")
print()

response = input("Continue? (yes/no): ")
if response.lower() not in ['yes', 'y']:
    print("Cancelled.")
    sys.exit(0)

# Create generator
generator = ApplicabilityGenerator()

# Run for DEX type only
print("\n" + "="*60)
print("PROCESSING DEX TYPE")
print("="*60)

# Process in smaller batches for better accuracy
generator.run(type_id=DEX_TYPE_ID, batch_size=25)

print("\n" + "="*60)
print("✅ DEX APPLICABILITY UPDATE COMPLETE")
print("="*60)
print("\nYou can now run: python analyze_dex_norms.py")
print("to see the updated applicability breakdown.")
