#!/usr/bin/env python3
"""Debug applicability generator"""
import sys
sys.path.insert(0, 'src')
from core.config import SUPABASE_URL, get_supabase_headers
from core.applicability_generator import ApplicabilityGenerator, NORM_CATEGORIES
import requests

gen = ApplicabilityGenerator()
gen.load_data()

print("\n=== DEBUG APPLICABILITY ===")
print(f"Types: {len(gen.product_types)}")
print(f"Norms: {len(gen.norms)}")

# Check how many norms have categories defined
norms_with_category = sum(1 for n in gen.norms if n['code'] in NORM_CATEGORIES)
print(f"Norms with defined category: {norms_with_category}/{len(gen.norms)}")

# Get a sample type and some norms
sample_type = list(gen.product_types.values())[0]
sample_norms = gen.norms[:5]

print(f"\nSample type: {sample_type['code']} - {sample_type['name']}")
print(f"Sample norms: {[n['code'] for n in sample_norms]}")

# Test evaluate_batch
print("\nTesting evaluate_batch...")
result = gen.evaluate_batch(sample_type, sample_norms)
print(f"Result: {len(result)} entries")
for norm_id, data in list(result.items())[:5]:
    print(f"  norm_id={norm_id}: {data}")

# Check type characteristics
ctx = gen.get_type_context(sample_type)
print(f"\nType context:")
print(f"  is_hardware: {ctx['is_hardware']}")
print(f"  is_wallet: {ctx['is_wallet']}")
print(f"  is_defi: {ctx['is_defi']}")
print(f"  is_protocol: {ctx['is_protocol']}")
print(f"  is_physical: {ctx['is_physical']}")

# Check AI provider
print("\nTesting AI provider...")
from core.api_provider import AIProvider
ai = AIProvider()
test_result = ai.call_for_applicability("TEST", "Just respond with OK", max_tokens=10)
print(f"AI test result: {test_result}")
