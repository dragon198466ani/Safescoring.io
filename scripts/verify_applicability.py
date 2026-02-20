#!/usr/bin/env python3
"""
SAFESCORING.IO - Applicability Verification Script
Verifies all applicability rules for consistency and correctness.

Checks:
1. All 1302 norms have rules for each of 62 types
2. Hardware-only norms are only applicable to hardware types
3. DeFi-only norms are only applicable to DeFi types
4. Universal norms are applicable to all types
5. WALLET_OR_DEFI norms are applicable to wallets and DeFi
"""

import os
import sys
import requests
from dotenv import load_dotenv
from pathlib import Path
from collections import defaultdict

# Setup paths
PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / '.env')
load_dotenv(PROJECT_ROOT / 'config' / '.env')

sys.path.insert(0, str(PROJECT_ROOT))
from src.core.applicability_rules import (
    categorize_norm_by_keywords,
    is_norm_applicable_by_keywords,
    HARDWARE_KEYWORDS,
    DEFI_KEYWORDS,
    WALLET_KEYWORDS,
    UNIVERSAL_KEYWORDS,
    WALLET_OR_DEFI_KEYWORDS,
)

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }

def load_data():
    """Load all types, norms, and applicability rules."""
    headers = get_headers()

    # Load types
    print("Loading types...")
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=*', headers=headers)
    types = r.json()
    # Filter to safe_applicable only
    types = [t for t in types if t.get('is_safe_applicable', True) != False]
    print(f"  {len(types)} types loaded")

    # Load norms with pagination
    print("Loading norms...")
    norms = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar&limit=1000&offset={offset}',
            headers=headers
        )
        data = r.json()
        if not data:
            break
        norms.extend(data)
        offset += 1000
        if len(data) < 1000:
            break
    print(f"  {len(norms)} norms loaded")

    # Load applicability rules with pagination
    print("Loading applicability rules...")
    rules = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norm_applicability?select=type_id,norm_id,is_applicable&limit=1000&offset={offset}',
            headers=headers
        )
        data = r.json()
        if not data:
            break
        rules.extend(data)
        offset += 1000
        if len(data) < 1000:
            break
    print(f"  {len(rules)} rules loaded")

    return types, norms, rules

def verify_coverage(types, norms, rules):
    """Check that all types have rules for all norms."""
    print("\n=== VERIFICATION: COVERAGE ===")

    # Build lookup
    rules_by_type = defaultdict(set)
    for r in rules:
        rules_by_type[r['type_id']].add(r['norm_id'])

    norm_ids = {n['id'] for n in norms}

    issues = []
    for t in types:
        covered = rules_by_type.get(t['id'], set())
        missing = norm_ids - covered
        if missing:
            issues.append((t['name'], len(missing)))

    if issues:
        print(f"  ❌ {len(issues)} types have missing rules:")
        for name, count in issues[:10]:
            print(f"     - {name}: {count} norms missing")
    else:
        print(f"  ✅ All {len(types)} types have rules for all {len(norms)} norms")

    return len(issues) == 0

def verify_hardware_rules(types, norms, rules):
    """Check hardware-only norms are only applicable to hardware types."""
    print("\n=== VERIFICATION: HARDWARE RULES ===")

    # Find hardware types
    hw_type_ids = {t['id'] for t in types if t.get('is_hardware', False)}
    non_hw_type_ids = {t['id'] for t in types if not t.get('is_hardware', False)}

    # Find hardware-only norms
    hw_norms = []
    for n in norms:
        cat = categorize_norm_by_keywords(n['code'], n['title'])
        if cat == 'HARDWARE':
            hw_norms.append(n)

    print(f"  Hardware types: {len(hw_type_ids)}")
    print(f"  Hardware-only norms: {len(hw_norms)}")

    # Check rules
    rules_lookup = {(r['type_id'], r['norm_id']): r['is_applicable'] for r in rules}

    errors = []
    for n in hw_norms:
        for tid in non_hw_type_ids:
            key = (tid, n['id'])
            if key in rules_lookup and rules_lookup[key]:
                t_name = next((t['name'] for t in types if t['id'] == tid), 'Unknown')
                errors.append(f"HW norm [{n['code']}] applicable to non-HW type [{t_name}]")

    if errors:
        print(f"  ❌ {len(errors)} errors found:")
        for e in errors[:10]:
            print(f"     - {e}")
    else:
        print(f"  ✅ All hardware-only norms correctly restricted")

    return len(errors) == 0

def verify_defi_rules(types, norms, rules):
    """Check DeFi-only norms are only applicable to DeFi/protocol types."""
    print("\n=== VERIFICATION: DEFI RULES ===")

    # Find DeFi types
    defi_type_ids = {t['id'] for t in types if t.get('is_defi', False) or t.get('is_protocol', False)}
    non_defi_type_ids = {t['id'] for t in types if not (t.get('is_defi', False) or t.get('is_protocol', False))}

    # Find DeFi-only norms
    defi_norms = []
    for n in norms:
        cat = categorize_norm_by_keywords(n['code'], n['title'])
        if cat == 'DEFI':
            defi_norms.append(n)

    print(f"  DeFi/Protocol types: {len(defi_type_ids)}")
    print(f"  DeFi-only norms: {len(defi_norms)}")

    # Check rules
    rules_lookup = {(r['type_id'], r['norm_id']): r['is_applicable'] for r in rules}

    errors = []
    for n in defi_norms:
        for tid in non_defi_type_ids:
            key = (tid, n['id'])
            if key in rules_lookup and rules_lookup[key]:
                t_name = next((t['name'] for t in types if t['id'] == tid), 'Unknown')
                errors.append(f"DeFi norm [{n['code']}] applicable to non-DeFi type [{t_name}]")

    if errors:
        print(f"  ❌ {len(errors)} errors found:")
        for e in errors[:10]:
            print(f"     - {e}")
    else:
        print(f"  ✅ All DeFi-only norms correctly restricted")

    return len(errors) == 0

def verify_wallet_or_defi_rules(types, norms, rules):
    """Check WALLET_OR_DEFI norms are applicable to wallets and DeFi."""
    print("\n=== VERIFICATION: WALLET_OR_DEFI RULES ===")

    # Find eligible types (wallet OR defi OR protocol)
    eligible_ids = {t['id'] for t in types
                    if t.get('is_wallet', False) or t.get('is_defi', False) or t.get('is_protocol', False)}

    # Find WALLET_OR_DEFI norms
    wod_norms = []
    for n in norms:
        cat = categorize_norm_by_keywords(n['code'], n['title'])
        if cat == 'WALLET_OR_DEFI':
            wod_norms.append(n)

    print(f"  Wallet/DeFi/Protocol types: {len(eligible_ids)}")
    print(f"  WALLET_OR_DEFI norms: {len(wod_norms)}")

    # Check rules
    rules_lookup = {(r['type_id'], r['norm_id']): r['is_applicable'] for r in rules}

    errors = []
    for n in wod_norms:
        for tid in eligible_ids:
            key = (tid, n['id'])
            if key in rules_lookup and not rules_lookup[key]:
                t_name = next((t['name'] for t in types if t['id'] == tid), 'Unknown')
                errors.append(f"WALLET_OR_DEFI norm [{n['code']}] not applicable to eligible type [{t_name}]")

    if errors:
        print(f"  ❌ {len(errors)} errors found:")
        for e in errors[:10]:
            print(f"     - {e}")
    else:
        print(f"  ✅ All WALLET_OR_DEFI norms correctly applied")

    return len(errors) == 0

def verify_universal_rules(types, norms, rules):
    """Check universal norms are applicable to all types."""
    print("\n=== VERIFICATION: UNIVERSAL RULES ===")

    # Find universal norms
    universal_norms = []
    for n in norms:
        cat = categorize_norm_by_keywords(n['code'], n['title'])
        if cat == 'UNIVERSAL':
            universal_norms.append(n)

    print(f"  Universal norms: {len(universal_norms)}")

    # Check rules
    rules_lookup = {(r['type_id'], r['norm_id']): r['is_applicable'] for r in rules}

    errors = []
    for n in universal_norms:
        for t in types:
            key = (t['id'], n['id'])
            if key in rules_lookup and not rules_lookup[key]:
                errors.append(f"Universal norm [{n['code']}] not applicable to [{t['name']}]")

    if errors:
        print(f"  ❌ {len(errors)} errors found:")
        for e in errors[:10]:
            print(f"     - {e}")
    else:
        print(f"  ✅ All universal norms correctly applied")

    return len(errors) == 0

def main():
    print("=" * 60)
    print("SAFESCORING.IO - APPLICABILITY VERIFICATION")
    print("=" * 60)

    types, norms, rules = load_data()

    results = []
    results.append(("Coverage", verify_coverage(types, norms, rules)))
    results.append(("Hardware Rules", verify_hardware_rules(types, norms, rules)))
    results.append(("DeFi Rules", verify_defi_rules(types, norms, rules)))
    results.append(("WALLET_OR_DEFI Rules", verify_wallet_or_defi_rules(types, norms, rules)))
    results.append(("Universal Rules", verify_universal_rules(types, norms, rules)))

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {name}: {status}")

    all_passed = all(r[1] for r in results)
    print(f"\nOverall: {'✅ ALL CHECKS PASSED' if all_passed else '❌ SOME CHECKS FAILED'}")

    return 0 if all_passed else 1

if __name__ == '__main__':
    sys.exit(main())
