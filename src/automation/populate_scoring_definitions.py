#!/usr/bin/env python3
"""
SAFESCORING.IO - Populate safe_scoring_definitions table
=========================================================
The safe_scoring_definitions table is EMPTY, which means all norms default
to is_full=True in the ScoreCalculator. This script:

1. Reads classification from the norms table (is_essential, consumer, full)
2. If norms table has no classification, applies rule-based classification
3. Upserts into safe_scoring_definitions

Usage:
    python -m src.automation.populate_scoring_definitions
    python -m src.automation.populate_scoring_definitions --dry-run
"""

import sys
import os
import argparse
import time
import requests
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from src.core.config import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers
from src.core.supabase_pagination import fetch_all

# Keywords for rule-based classification (fallback if norms table has no flags)
ESSENTIAL_KEYWORDS = [
    'aes-256', 'aes 256', 'bip-32', 'bip32', 'bip-39', 'bip39', 'bip-44', 'bip44',
    'key derivation', 'hd wallet', 'hierarchical deterministic',
    'csprng', 'random number', 'secure entropy',
    'tls 1.3', 'end-to-end encrypt', 'e2e encrypt',
    'secure element', 'tee', 'hsm', 'hardware security', 'cc eal', 'fips 140',
    '2fa', 'two-factor', 'two factor', 'mfa', 'multi-factor',
    'multi-sig', 'multisig', 'multi signature',
    'security audit', 'third-party audit', 'external audit',
    'mev protection', 'front-running protect',
    'no critical vulner', 'zero known exploit',
    'signed firmware', 'firmware signature', 'secure boot',
    'duress pin', 'duress password', 'duress mode',
    'hidden wallet', 'plausible deniability',
    'seed phrase', 'mnemonic backup', 'recovery phrase',
    'panic mode', 'panic button',
    'velocity limit', 'spending limit',
    'open source', 'source code available', 'source code public',
    'active maintenance', 'regular update', 'security patch',
    'no major incident', 'incident free',
    'walletconnect', 'wallet connect',
]

NON_CONSUMER_KEYWORDS = [
    'enterprise', 'institutional', 'corporate',
    'sso', 'single sign-on', 'saml', 'ldap', 'active directory',
    'rbac', 'role-based access',
    'institutional custody', 'qualified custodian', 'regulated custody',
    'soc 2', 'soc2', 'soc 1', 'iso 27001', 'pci dss',
    'enterprise sla', 'dedicated support',
    'governance framework', 'board approval',
    'regulatory report', 'compliance report',
]


def classify_norm_by_keywords(title, description=''):
    """Rule-based classification using keywords."""
    text = (title + ' ' + (description or '')).lower()

    is_essential = any(kw in text for kw in ESSENTIAL_KEYWORDS)
    is_consumer = not any(kw in text for kw in NON_CONSUMER_KEYWORDS)

    # Hierarchy: essential → always consumer
    if is_essential:
        is_consumer = True

    return is_essential, is_consumer


def analyze(norms):
    """Show current state of norms classification."""
    print("\n" + "=" * 70)
    print("   ANALYSIS: Norms Classification State")
    print("=" * 70)

    total = len(norms)
    has_essential = sum(1 for n in norms if n.get('is_essential') is True)
    has_consumer = sum(1 for n in norms if n.get('consumer') is True)
    has_full = sum(1 for n in norms if n.get('full') is True)
    no_flags = sum(1 for n in norms if n.get('is_essential') is None and n.get('consumer') is None)

    print(f"\n   Total norms: {total}")
    print(f"   With is_essential=True: {has_essential} ({has_essential*100//total}%)")
    print(f"   With consumer=True: {has_consumer} ({has_consumer*100//total}%)")
    print(f"   With full=True: {has_full} ({has_full*100//total}%)")
    print(f"   With NO flags set (all NULL): {no_flags}")

    # Per pillar
    by_pillar = Counter(n.get('pillar', '?') for n in norms)
    essential_by_pillar = Counter(n.get('pillar', '?') for n in norms if n.get('is_essential'))
    print(f"\n   Per pillar:")
    for p in ['S', 'A', 'F', 'E']:
        ess = essential_by_pillar.get(p, 0)
        tot = by_pillar.get(p, 0)
        pct = f"{ess*100//tot}%" if tot > 0 else "N/A"
        print(f"      {p}: {tot} norms, {ess} essential ({pct})")

    return {
        'total': total,
        'has_flags': total - no_flags,
        'no_flags': no_flags,
        'has_essential': has_essential,
    }


def populate(dry_run=False):
    """Populate safe_scoring_definitions from norms table."""
    print("\n" + "=" * 70)
    print("   POPULATE: safe_scoring_definitions")
    print("=" * 70)

    # Load norms with classification columns
    norms = fetch_all('norms', select='id,code,pillar,title,description,is_essential,consumer,full', order='code')
    print(f"\n   Loaded {len(norms)} norms")

    # Check current state of safe_scoring_definitions
    existing = fetch_all('safe_scoring_definitions', select='norm_id', order='norm_id')
    print(f"   Existing safe_scoring_definitions rows: {len(existing)}")

    analysis = analyze(norms)

    # Decide strategy: use norms table flags if they exist, else rule-based
    use_rule_based = analysis['has_essential'] == 0
    if use_rule_based:
        print(f"\n   [~~] Norms table has NO essential flags -- using rule-based classification")
    else:
        print(f"\n   [OK] Using classification from norms table ({analysis['has_essential']} essential norms")

    # Build definitions
    definitions = []
    stats = {'essential': 0, 'consumer': 0, 'full': 0, 'rule_based': 0}

    for norm in norms:
        norm_id = norm['id']

        if use_rule_based:
            is_essential, is_consumer = classify_norm_by_keywords(
                norm.get('title', ''),
                norm.get('description', '')
            )
            is_full = True
            stats['rule_based'] += 1
        else:
            is_essential = norm.get('is_essential', False) or False
            is_consumer = norm.get('consumer', True)
            if is_consumer is None:
                is_consumer = True
            is_full = norm.get('full', True)
            if is_full is None:
                is_full = True

        # Enforce hierarchy: essential → consumer → full
        if is_essential:
            is_consumer = True
        if is_consumer:
            is_full = True

        definitions.append({
            'norm_id': norm_id,
            'is_essential': is_essential,
            'is_consumer': is_consumer,
            'is_full': is_full,
        })

        if is_essential:
            stats['essential'] += 1
        if is_consumer:
            stats['consumer'] += 1
        if is_full:
            stats['full'] += 1

    print(f"\n   Classification results:")
    print(f"      Essential: {stats['essential']} ({stats['essential']*100//len(norms)}%)")
    print(f"      Consumer: {stats['consumer']} ({stats['consumer']*100//len(norms)}%)")
    print(f"      Full: {stats['full']} ({stats['full']*100//len(norms)}%)")
    if use_rule_based:
        print(f"      Rule-based classifications: {stats['rule_based']}")

    if dry_run:
        print(f"\n   [DRY RUN] No changes made")
        return stats

    # Upsert in batches
    print(f"\n   Upserting {len(definitions)} definitions...")
    headers = get_supabase_headers(prefer='resolution=merge-duplicates,return=minimal')
    batch_size = 100
    success = 0
    errors = 0

    for i in range(0, len(definitions), batch_size):
        batch = definitions[i:i + batch_size]
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/safe_scoring_definitions',
            headers=headers,
            json=batch,
            timeout=30
        )
        if r.status_code in (200, 201, 204):
            success += len(batch)
        else:
            errors += len(batch)
            print(f"   [ERR] Batch {i//batch_size + 1} failed: {r.status_code} {r.text[:200]}")
        time.sleep(0.3)

    print(f"\n   [OK] Upserted {success} definitions ({errors} errors)")

    # Verify
    final = fetch_all('safe_scoring_definitions', select='norm_id,is_essential,is_consumer,is_full', order='norm_id')
    print(f"   Verification: {len(final)} rows in safe_scoring_definitions")

    ess_count = sum(1 for d in final if d.get('is_essential'))
    con_count = sum(1 for d in final if d.get('is_consumer'))
    full_count = sum(1 for d in final if d.get('is_full'))
    print(f"      Essential: {ess_count}")
    print(f"      Consumer: {con_count}")
    print(f"      Full: {full_count}")

    return stats


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Populate safe_scoring_definitions')
    parser.add_argument('--dry-run', action='store_true', help='Analyze only, no writes')
    args = parser.parse_args()

    populate(dry_run=args.dry_run)
