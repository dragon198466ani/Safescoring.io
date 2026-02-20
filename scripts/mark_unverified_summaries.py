#!/usr/bin/env python3
"""
Mark paywall-sourced norm summaries as unverified.
These summaries were generated from AI knowledge, not official documents.

Usage:
    python scripts/mark_unverified_summaries.py [--dry-run]
"""
import requests
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.core.config import SUPABASE_URL, get_supabase_headers


# Paywall domains - summaries from these sources are AI-generated hallucinations
PAYWALL_DOMAINS = [
    'iso.org',
    'astm.org',
    'ieee.org',
    'ieeexplore.ieee.org',
    'sae.org',
    'ansi.org',
    'din.de',
    'bsigroup.com',
    'afnor.org',
]

# Likely timeout/fallback domains
FALLBACK_DOMAINS = [
    'dla.mil',      # MIL-STD often timeouts
    'quicksearch.dla.mil',
]

# Verified scrapable domains
VERIFIED_DOMAINS = [
    'github.com',
    'nist.gov',
    'ietf.org',
    'eips.ethereum.org',
    'owasp.org',
    'w3.org',
    'bitcoin.it',
    'ethereum.org',
]


def get_all_norms():
    """Fetch all norms from database."""
    headers = get_supabase_headers()
    all_norms = []
    offset = 0

    while True:
        url = f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,official_link,official_doc_summary&limit=1000&offset={offset}'
        r = requests.get(url, headers=headers)
        if r.status_code != 200:
            print(f"Error fetching norms: {r.status_code}")
            break

        batch = r.json()
        if not batch:
            break

        all_norms.extend(batch)
        offset += 1000

        if len(batch) < 1000:
            break

    return all_norms


def classify_norm(norm):
    """Classify a norm based on its source."""
    link = (norm.get('official_link') or '').lower()
    has_summary = bool(norm.get('official_doc_summary'))

    if not has_summary:
        return None, None, None

    # Check paywall
    for domain in PAYWALL_DOMAINS:
        if domain in link:
            return False, 'fallback_ai', f'{domain.upper()} paywall - AI generated, not official doc'

    # Check fallback
    for domain in FALLBACK_DOMAINS:
        if domain in link:
            return False, 'fallback_ai', f'Source often timeouts - may be AI generated'

    # Check verified
    for domain in VERIFIED_DOMAINS:
        if domain in link:
            return True, 'scraped', None

    # Unknown - assume scraped but mark for review
    return True, 'scraped', None


WARNING_HEADER = """⚠️ **UNVERIFIED SUMMARY - AI GENERATED**
This summary was generated from AI knowledge, NOT from the official document.
The source ({source}) is behind a paywall and could not be scraped.
Please verify against official documentation before relying on this information.

---

"""


def add_warning_to_summary(norm_id, summary, source_domain, dry_run=False):
    """Add warning header to unverified summary."""
    if dry_run:
        return True

    # Skip if already has warning
    if summary and '⚠️ **UNVERIFIED SUMMARY' in summary:
        return True

    headers = get_supabase_headers('return=minimal')
    url = f'{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}'

    new_summary = WARNING_HEADER.format(source=source_domain) + (summary or '')

    r = requests.patch(url, headers=headers, json={'official_doc_summary': new_summary})
    return r.status_code in [200, 204]


def update_norm_verification(norm_id, verified, source, notes, dry_run=False):
    """Update a norm's verification status."""
    if dry_run:
        return True

    headers = get_supabase_headers('return=minimal')
    url = f'{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}'

    data = {
        'summary_verified': verified,
        'summary_source': source,
    }
    if notes:
        data['summary_verification_notes'] = notes

    r = requests.patch(url, headers=headers, json=data)
    return r.status_code in [200, 204]


def main():
    dry_run = '--dry-run' in sys.argv

    print("=" * 70)
    print("MARKING UNVERIFIED SUMMARIES")
    print("=" * 70)

    if dry_run:
        print("DRY RUN MODE - no changes will be made")

    print("\nFetching all norms...")
    norms = get_all_norms()
    print(f"Found {len(norms)} norms")

    # Classify norms
    paywall = []
    fallback = []
    verified = []
    no_summary = []

    for norm in norms:
        v, source, notes = classify_norm(norm)

        if v is None:
            no_summary.append(norm)
        elif v == False:
            paywall.append((norm, source, notes))
        else:
            verified.append(norm)

    print(f"\n=== CLASSIFICATION ===")
    print(f"Paywall/Fallback (UNVERIFIED): {len(paywall)}")
    print(f"Scrapable (verified): {len(verified)}")
    print(f"No summary: {len(no_summary)}")

    # Show paywall norms
    print(f"\n=== NORMS TO MARK AS UNVERIFIED ===")
    for norm, source, notes in paywall[:10]:
        print(f"  {norm['code']}: {notes}")
    if len(paywall) > 10:
        print(f"  ... and {len(paywall) - 10} more")

    # Update database - add warning headers to paywall summaries
    if not dry_run:
        print(f"\n=== ADDING WARNING HEADERS ===")

        success = 0
        errors = 0
        skipped = 0

        for norm, source, notes in paywall:
            summary = norm.get('official_doc_summary', '')

            # Skip if already has warning
            if summary and '⚠️ **UNVERIFIED SUMMARY' in summary:
                skipped += 1
                continue

            # Extract domain for warning message
            link = norm.get('official_link', '').lower()
            domain = 'ISO' if 'iso.org' in link else \
                     'ASTM' if 'astm.org' in link else \
                     'IEEE' if 'ieee' in link else \
                     'MIL-STD' if 'dla.mil' in link else 'paywall'

            if add_warning_to_summary(norm['id'], summary, domain):
                success += 1
                print(f"  [WARNING ADDED] {norm['code']} ({domain})")
            else:
                errors += 1
                print(f"  [ERROR] {norm['code']}")

        print(f"\n=== RESULTS ===")
        print(f"Warnings added: {success}")
        print(f"Already had warning: {skipped}")
        print(f"Errors: {errors}")

    # Export list of PDFs needed
    print(f"\n=== PDFs NEEDED FOR VERIFICATION ===")
    pdf_list = []
    for norm, source, notes in paywall:
        pdf_list.append({
            'code': norm['code'],
            'title': norm['title'],
            'link': norm['official_link'],
            'source_type': 'ISO' if 'iso.org' in norm['official_link'].lower() else
                          'ASTM' if 'astm.org' in norm['official_link'].lower() else
                          'IEEE' if 'ieee' in norm['official_link'].lower() else
                          'MIL-STD' if 'dla.mil' in norm['official_link'].lower() else 'OTHER'
        })

    # Save to file
    with open('pdfs_needed.json', 'w', encoding='utf-8') as f:
        json.dump(pdf_list, f, indent=2, ensure_ascii=False)

    print(f"List saved to pdfs_needed.json")

    # Print by category
    by_type = {}
    for p in pdf_list:
        t = p['source_type']
        by_type[t] = by_type.get(t, []) + [p]

    for t, items in sorted(by_type.items()):
        print(f"\n{t} ({len(items)} PDFs needed):")
        for item in items[:5]:
            print(f"  - {item['code']}: {item['title'][:40]}...")
        if len(items) > 5:
            print(f"  ... et {len(items)-5} autres")


if __name__ == '__main__':
    main()
