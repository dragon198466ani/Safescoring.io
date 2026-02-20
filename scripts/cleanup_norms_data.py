#!/usr/bin/env python3
"""
Clean up norms table - distinguish internal criteria from real standards.
- Internal criteria: set official_link = NULL, clear hallucinated summaries
- Real standards: keep/fix correct official links
"""
import os
import re
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# Real standards - these have legitimate official documentation
REAL_STANDARDS_PATTERNS = {
    # Bitcoin/Crypto
    r'^BIP-?\d+': 'https://github.com/bitcoin/bips/blob/master/bip-{num}.mediawiki',
    r'^EIP-?\d+': 'https://eips.ethereum.org/EIPS/eip-{num}',
    r'^ERC-?\d+': 'https://eips.ethereum.org/EIPS/eip-{num}',
    r'^SLIP-?\d+': 'https://github.com/satoshilabs/slips/blob/master/slip-{num}.md',
    r'^CAIP-?\d+': 'https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-{num}.md',

    # Security standards
    r'^NIST[\s-]*(SP[\s-]*)?800-\d+': None,  # Keep existing NIST links
    r'^FIPS[\s-]*\d+': None,
    r'^OWASP': None,
    r'^PCI[\s-]*DSS': 'https://www.pcisecuritystandards.org/',
    r'^SOC[\s-]*[12]': None,
    r'^CCSS': 'https://cryptoconsortium.github.io/CCSS/',

    # ISO - only when title actually mentions ISO
    r'^ISO[\s/]*IEC[\s-]*27001': 'https://www.iso.org/standard/27001.html',
    r'^ISO[\s/]*IEC[\s-]*27002': 'https://www.iso.org/standard/75652.html',
    r'^ISO[\s/]*IEC[\s-]*27017': 'https://www.iso.org/standard/43757.html',
    r'^ISO[\s/]*IEC[\s-]*27701': 'https://www.iso.org/standard/71670.html',
    r'^ISO[\s-]*22301': 'https://www.iso.org/standard/75106.html',
    r'^ISO[\s/]*IEC[\s-]*15408': 'https://www.iso.org/standard/50341.html',

    # Other real standards
    r'^RFC[\s-]*\d+': 'https://www.rfc-editor.org/rfc/rfc{num}',
    r'^IEEE[\s-]*\d+': None,
    r'^MIL-STD-\d+': None,
    r'^ETSI': None,
    r'^Common\s*Criteria': 'https://www.commoncriteriaportal.org/',
}

# Internal SafeScoring criteria patterns - these should NOT have official_link
INTERNAL_PATTERNS = [
    r'^[AFES]\d{1,3}$',           # A01, F99, E123, S45
    r'^[AFES]\d{1,3}:',           # A01: Title, F99: Title
    r'^[AFES]-[A-Z]{2,}',         # A-PHY-001, F-ISO-001, E-CEX-001
    r'^[AFES]-[A-Z]+$',           # A-COLD, F-SEGREG
]


def log(msg):
    try:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")
    except UnicodeEncodeError:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg.encode('ascii', 'replace').decode()}")


def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }


def get_all_norms():
    """Fetch all norms."""
    all_norms = []
    offset = 0
    limit = 1000

    while True:
        url = f"{SUPABASE_URL}/rest/v1/norms?select=id,code,title,official_link,official_doc_summary&order=code&offset={offset}&limit={limit}"
        r = requests.get(url, headers=get_headers(), timeout=60)
        if r.status_code != 200:
            log(f"Error: {r.status_code}")
            break
        batch = r.json()
        if not batch:
            break
        all_norms.extend(batch)
        offset += limit
        if len(batch) < limit:
            break
    return all_norms


def is_internal_criterion(code, title):
    """Check if this is an internal SafeScoring criterion."""
    for pattern in INTERNAL_PATTERNS:
        if re.match(pattern, code, re.IGNORECASE):
            return True
    return False


def is_real_standard(code, title):
    """Check if this is a real external standard and get correct link."""
    full_text = f"{code} {title}"

    for pattern, link_template in REAL_STANDARDS_PATTERNS.items():
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            if link_template:
                # Extract number if present
                num_match = re.search(r'\d+', match.group())
                if num_match and '{num}' in link_template:
                    return link_template.replace('{num}', num_match.group())
                return link_template
            return 'KEEP'  # Keep existing link
    return None


def has_fake_iso_link(official_link, code, title):
    """Check if the link is a fake ISO placeholder."""
    if not official_link:
        return False

    # ISO 27001 used as placeholder for non-ISO content
    if 'iso.org/standard/27001' in official_link:
        # Check if title/code actually relates to ISO 27001
        full_text = f"{code} {title}".lower()
        iso_keywords = ['27001', 'isms', 'information security management']
        if not any(kw in full_text for kw in iso_keywords):
            return True

    return False


def has_hallucinated_summary(summary):
    """Check if summary contains hallucination markers."""
    if not summary:
        return False

    markers = [
        r'ISO/IEC\s*23800',  # Fake ISO standard
        r'\[Official.*documentation.*\]',
        r'\[.*if known.*\]',
        r'\[.*if available.*\]',
        r'\[Insert.*\]',
        r'\[TBD\]',
    ]

    for marker in markers:
        if re.search(marker, summary, re.IGNORECASE):
            return True
    return False


def update_norm(norm_id, updates):
    """Update a norm in the database."""
    url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"
    headers = get_headers()
    headers['Prefer'] = 'return=minimal'

    r = requests.patch(url, headers=headers, json=updates, timeout=30)
    return r.status_code in [200, 204]


def main(auto_apply=False):
    log("=" * 70)
    log("CLEANUP NORMS DATA - REMOVE FAKE LINKS AND HALLUCINATIONS")
    log("=" * 70)

    if not all([SUPABASE_URL, SUPABASE_KEY]):
        log("ERROR: Missing environment variables")
        return

    norms = get_all_norms()
    log(f"Analyzing {len(norms)} norms...")

    # Categorize
    to_cleanup = []      # Internal criteria with fake links
    to_fix_link = []     # Real standards with wrong links
    already_ok = []      # Already correct

    for norm in norms:
        norm_id = norm['id']
        code = norm.get('code', '')
        title = norm.get('title', '')
        official_link = norm.get('official_link', '')
        summary = norm.get('official_doc_summary', '')

        is_internal = is_internal_criterion(code, title)
        real_std_link = is_real_standard(code, title)
        has_fake = has_fake_iso_link(official_link, code, title)
        has_hallucination = has_hallucinated_summary(summary)

        if is_internal:
            if has_fake or has_hallucination or (official_link and 'iso.org' in official_link):
                to_cleanup.append({
                    'id': norm_id,
                    'code': code,
                    'title': title,
                    'reason': 'Internal criterion with fake ISO/NIST link',
                    'current_link': official_link,
                    'has_hallucination': has_hallucination
                })
            else:
                already_ok.append(norm)
        elif real_std_link:
            if real_std_link != 'KEEP' and official_link != real_std_link:
                to_fix_link.append({
                    'id': norm_id,
                    'code': code,
                    'title': title,
                    'current_link': official_link,
                    'correct_link': real_std_link
                })
            else:
                already_ok.append(norm)
        else:
            # Neither internal nor recognized standard
            if has_fake or has_hallucination:
                to_cleanup.append({
                    'id': norm_id,
                    'code': code,
                    'title': title,
                    'reason': 'Unrecognized with fake link/hallucination',
                    'current_link': official_link,
                    'has_hallucination': has_hallucination
                })
            else:
                already_ok.append(norm)

    # Report
    log("\n" + "=" * 70)
    log("ANALYSIS RESULTS")
    log("=" * 70)
    log(f"Already OK:              {len(already_ok)}")
    log(f"To cleanup (fake links): {len(to_cleanup)}")
    log(f"To fix (wrong links):    {len(to_fix_link)}")

    # Show what will be cleaned
    log("\n" + "-" * 70)
    log("WILL CLEANUP (set official_link=NULL, clear bad summary):")
    log("-" * 70)
    for item in to_cleanup[:30]:
        log(f"  [{item['code']}] {item['title'][:40]}...")
        log(f"    Current: {item['current_link'][:60] if item['current_link'] else 'None'}...")
        if item['has_hallucination']:
            log(f"    Has hallucinated summary")
    if len(to_cleanup) > 30:
        log(f"  ... and {len(to_cleanup) - 30} more")

    # Show link fixes
    if to_fix_link:
        log("\n" + "-" * 70)
        log("WILL FIX LINKS:")
        log("-" * 70)
        for item in to_fix_link[:10]:
            log(f"  [{item['code']}] {item['title'][:40]}...")
            log(f"    Current:  {item['current_link'][:50] if item['current_link'] else 'None'}")
            log(f"    Correct:  {item['correct_link'][:50]}")

    # Generate SQL script instead of interactive prompt
    log("\n" + "=" * 70)
    total_changes = len(to_cleanup) + len(to_fix_link)

    sql_file = 'cleanup_norms.sql'
    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write("-- Cleanup norms: remove fake links and hallucinated summaries\n")
        f.write(f"-- Generated: {datetime.now().isoformat()}\n")
        f.write(f"-- Total changes: {total_changes}\n\n")

        f.write("BEGIN;\n\n")

        # Cleanup internal criteria
        if to_cleanup:
            f.write("-- Internal criteria with fake ISO/NIST links\n")
            for item in to_cleanup:
                code_escaped = item['code'].replace("'", "''")
                f.write(f"-- {item['code']}: {item['title'][:50]}\n")
                if item['has_hallucination']:
                    f.write(f"UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = {item['id']};\n")
                else:
                    f.write(f"UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = {item['id']};\n")
            f.write("\n")

        # Fix links for real standards
        if to_fix_link:
            f.write("-- Fix links for real standards\n")
            for item in to_fix_link:
                link_escaped = item['correct_link'].replace("'", "''")
                f.write(f"-- {item['code']}: {item['title'][:50]}\n")
                f.write(f"UPDATE norms SET official_link = '{link_escaped}' WHERE id = {item['id']};\n")
            f.write("\n")

        f.write("COMMIT;\n")

    log(f"SQL script generated: {sql_file}")
    log(f"Review it, then run in Supabase SQL Editor")

    if not auto_apply:
        log("\nRun with --apply flag to apply changes directly via API")
        return

    # Apply changes
    log("\nApplying changes...")

    success = 0
    failed = 0

    # Cleanup internal criteria
    for item in to_cleanup:
        updates = {
            'official_link': None,
            'summary_status': 'pending'
        }
        # Clear hallucinated summary
        if item['has_hallucination']:
            updates['official_doc_summary'] = None

        if update_norm(item['id'], updates):
            success += 1
        else:
            failed += 1
            log(f"  Failed: {item['code']}")

    # Fix links for real standards
    for item in to_fix_link:
        updates = {'official_link': item['correct_link']}
        if update_norm(item['id'], updates):
            success += 1
        else:
            failed += 1
            log(f"  Failed: {item['code']}")

    log(f"\nDone! Success: {success}, Failed: {failed}")


if __name__ == '__main__':
    import sys
    auto_apply = '--apply' in sys.argv
    main(auto_apply=auto_apply)
