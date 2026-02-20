#!/usr/bin/env python3
"""
SAFE SCORING - Norm Sources Assessment Script
==============================================
Analyzes all norms and categorizes them by verification status.

Categories:
- VERIFIED: Has official_link + issuing_authority + summary_verified=TRUE
- PARTIALLY_VERIFIED: Has some required fields but not all
- UNVERIFIED: Missing official sources
- QUESTIONABLE: Known problematic norms (A180-A184, A141-A142)

Usage:
    python scripts/assess_norm_sources.py [--output json|csv|console]
"""

import requests
import json
import sys
import os
from datetime import datetime
from collections import defaultdict

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from src.core.config import SUPABASE_URL, SUPABASE_KEY
except ImportError:
    print("Error: Could not import config. Make sure SUPABASE_URL and SUPABASE_KEY are set.")
    sys.exit(1)

# Known questionable norms
QUESTIONABLE_CODES = [
    'A180', 'A181', 'A182', 'A183', 'A184',  # Dubious anti-coercion
    'A141', 'A142',  # Brick PIN, Travel Mode
]

# Real standards patterns (should have official sources)
REAL_STANDARD_PATTERNS = [
    'BIP-', 'EIP-', 'SLIP-', 'RFC-', 'NIST-', 'FIPS-', 'ISO-',
    'OWASP', 'CC-', 'EAL', 'GDPR', 'MiCA', 'CCPA'
]


def get_supabase_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }


def load_all_norms():
    """Load all norms from database."""
    headers = get_supabase_headers()
    all_norms = []
    offset = 0
    limit = 1000

    while True:
        url = f"{SUPABASE_URL}/rest/v1/norms?select=*&offset={offset}&limit={limit}"
        response = requests.get(url, headers=headers)

        if response.status_code != 200:
            print(f"Error fetching norms: {response.status_code}")
            break

        batch = response.json()
        if not batch:
            break

        all_norms.extend(batch)
        offset += limit

        if len(batch) < limit:
            break

    return all_norms


def categorize_norm(norm):
    """Categorize a single norm by verification status."""
    code = norm.get('code', '')

    # Check if questionable
    if code in QUESTIONABLE_CODES:
        return 'QUESTIONABLE'

    # Check verification fields
    has_link = norm.get('official_link') is not None
    has_authority = norm.get('issuing_authority') is not None
    has_reference = norm.get('standard_reference') is not None
    summary_verified = norm.get('summary_verified', False)
    summary_source = norm.get('summary_source', '')

    # Fully verified
    if has_link and has_authority and summary_verified:
        return 'VERIFIED'

    # Partially verified
    if has_link or has_authority or has_reference:
        if summary_source == 'fallback_ai':
            return 'AI_GENERATED'
        return 'PARTIALLY_VERIFIED'

    return 'UNVERIFIED'


def analyze_norms(norms):
    """Analyze all norms and generate statistics."""
    stats = {
        'total': len(norms),
        'by_status': defaultdict(list),
        'by_pillar': defaultdict(lambda: defaultdict(int)),
        'by_source_type': defaultdict(int),
        'missing_fields': {
            'official_link': [],
            'issuing_authority': [],
            'standard_reference': [],
            'summary_verified': []
        },
        'real_standards_without_source': [],
        'questionable_details': []
    }

    for norm in norms:
        code = norm.get('code', '')
        pillar = norm.get('pillar', 'X')

        # Categorize
        status = categorize_norm(norm)
        stats['by_status'][status].append(code)
        stats['by_pillar'][pillar][status] += 1

        # Track source type
        source = norm.get('summary_source', 'unknown')
        stats['by_source_type'][source] += 1

        # Track missing fields
        if not norm.get('official_link'):
            stats['missing_fields']['official_link'].append(code)
        if not norm.get('issuing_authority'):
            stats['missing_fields']['issuing_authority'].append(code)
        if not norm.get('standard_reference'):
            stats['missing_fields']['standard_reference'].append(code)
        if not norm.get('summary_verified'):
            stats['missing_fields']['summary_verified'].append(code)

        # Check if looks like real standard but missing source
        for pattern in REAL_STANDARD_PATTERNS:
            if pattern in code.upper() or pattern in norm.get('title', '').upper():
                if not norm.get('official_link'):
                    stats['real_standards_without_source'].append({
                        'code': code,
                        'title': norm.get('title'),
                        'pattern': pattern
                    })
                break

        # Collect details for questionable norms
        if code in QUESTIONABLE_CODES:
            stats['questionable_details'].append({
                'code': code,
                'title': norm.get('title'),
                'pillar': pillar,
                'has_link': bool(norm.get('official_link')),
                'link': norm.get('official_link'),
                'authority': norm.get('issuing_authority'),
                'summary_source': norm.get('summary_source'),
                'description': norm.get('description', '')[:200]
            })

    return stats


def print_report(stats):
    """Print assessment report to console."""
    print("\n" + "=" * 70)
    print("SAFE SCORING - NORM SOURCES ASSESSMENT REPORT")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # Summary
    print(f"\n{'SUMMARY':=^70}")
    print(f"Total norms: {stats['total']}")
    print()

    for status, codes in sorted(stats['by_status'].items()):
        pct = len(codes) / stats['total'] * 100 if stats['total'] > 0 else 0
        emoji = {'VERIFIED': '[OK]', 'QUESTIONABLE': '[!!]', 'UNVERIFIED': '[--]',
                 'PARTIALLY_VERIFIED': '[??]', 'AI_GENERATED': '[AI]'}.get(status, '[ ]')
        print(f"  {emoji} {status}: {len(codes)} ({pct:.1f}%)")

    # By pillar
    print(f"\n{'BY PILLAR':=^70}")
    for pillar in ['S', 'A', 'F', 'E']:
        pillar_stats = stats['by_pillar'].get(pillar, {})
        total = sum(pillar_stats.values())
        verified = pillar_stats.get('VERIFIED', 0)
        pct = verified / total * 100 if total > 0 else 0
        print(f"  {pillar}: {total} norms, {verified} verified ({pct:.1f}%)")

    # Source types
    print(f"\n{'BY SOURCE TYPE':=^70}")
    for source, count in sorted(stats['by_source_type'].items(), key=lambda x: -x[1]):
        pct = count / stats['total'] * 100 if stats['total'] > 0 else 0
        print(f"  {source}: {count} ({pct:.1f}%)")

    # Missing fields
    print(f"\n{'MISSING FIELDS':=^70}")
    for field, codes in stats['missing_fields'].items():
        print(f"  {field}: {len(codes)} norms missing")

    # Questionable norms details
    print(f"\n{'QUESTIONABLE NORMS (NEED RESEARCH)':=^70}")
    for q in stats['questionable_details']:
        print(f"\n  [{q['code']}] {q['title']}")
        print(f"     Pillar: {q['pillar']}")
        print(f"     Has link: {q['has_link']}")
        if q['link']:
            print(f"     Link: {q['link'][:60]}...")
        print(f"     Authority: {q['authority'] or 'MISSING'}")
        print(f"     Source: {q['summary_source']}")

    # Real standards without sources
    if stats['real_standards_without_source']:
        print(f"\n{'REAL STANDARDS MISSING SOURCES':=^70}")
        for item in stats['real_standards_without_source'][:20]:
            print(f"  [{item['code']}] {item['title']} (matches: {item['pattern']})")
        if len(stats['real_standards_without_source']) > 20:
            print(f"  ... and {len(stats['real_standards_without_source']) - 20} more")

    # Recommendations
    print(f"\n{'RECOMMENDATIONS':=^70}")
    print("""
1. IMMEDIATE ACTIONS:
   - Research sources for questionable norms (A180-A184, A141-A142)
   - Add official_link for real standards missing sources
   - Mark AI-generated summaries clearly in UI

2. CLEANUP PRIORITIES:
   - Remove norms with no verifiable source after research
   - Merge duplicate concepts (e.g., multiple time-lock norms)
   - Reclassify vendor features vs industry standards

3. QUALITY GATES:
   - Require official_link + issuing_authority for new norms
   - Auto-flag summary_source='fallback_ai' as unverified
   - Regular audit of verification coverage by pillar
""")

    print("=" * 70)


def save_json_report(stats, filepath):
    """Save report as JSON."""
    output = {
        'generated': datetime.now().isoformat(),
        'summary': {
            'total': stats['total'],
            'by_status': {k: len(v) for k, v in stats['by_status'].items()},
            'by_pillar': dict(stats['by_pillar']),
            'by_source_type': dict(stats['by_source_type'])
        },
        'questionable_norms': stats['questionable_details'],
        'missing_sources': stats['real_standards_without_source'],
        'all_codes_by_status': {k: v for k, v in stats['by_status'].items()}
    }

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Report saved to: {filepath}")


def main():
    print("Loading norms from database...")
    norms = load_all_norms()

    if not norms:
        print("No norms found!")
        return

    print(f"Loaded {len(norms)} norms")
    print("Analyzing...")

    stats = analyze_norms(norms)

    # Print to console
    print_report(stats)

    # Save JSON report
    output_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(output_dir, 'norm_assessment_report.json')
    save_json_report(stats, json_path)


if __name__ == '__main__':
    main()
