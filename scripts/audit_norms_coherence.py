#!/usr/bin/env python3
"""
Audit norms table for coherence between title and official_link.
Detects:
- Invented/fake norm names
- official_link pointing to unrelated standards
- Missing or invalid official links
"""
import os
import re
import csv
import requests
from datetime import datetime
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# Known real standards patterns
REAL_STANDARDS = {
    # ISO standards
    r'ISO\s*/?IEC\s*27001': 'Information security management',
    r'ISO\s*/?IEC\s*27002': 'Information security controls',
    r'ISO\s*/?IEC\s*27017': 'Cloud security',
    r'ISO\s*/?IEC\s*27018': 'PII in cloud',
    r'ISO\s*/?IEC\s*27701': 'Privacy information management',
    r'ISO\s*22301': 'Business continuity',
    r'ISO\s*9001': 'Quality management',
    r'ISO\s*14001': 'Environmental management',
    r'ISO\s*17712': 'Tamper-evident seals',
    r'ISO\s*15408': 'Common Criteria',
    r'ISO\s*20653': 'Road vehicles - IP protection',
    r'ISO\s*9227': 'Corrosion tests',
    r'ISO\s*14577': 'Hardness testing',
    # NIST
    r'NIST\s*SP\s*800-\d+': 'NIST Special Publication',
    r'FIPS\s*\d+': 'Federal Information Processing Standard',
    # Crypto specific
    r'BIP[\s-]*\d+': 'Bitcoin Improvement Proposal',
    r'EIP[\s-]*\d+': 'Ethereum Improvement Proposal',
    r'SLIP[\s-]*\d+': 'SatoshiLabs Improvement Proposal',
    r'ERC[\s-]*\d+': 'Ethereum Request for Comments',
    r'TRC[\s-]*\d+': 'Tron Token Standard',
    # Security
    r'OWASP': 'Open Web Application Security Project',
    r'CVE-\d+-\d+': 'Common Vulnerabilities and Exposures',
    r'CWE-\d+': 'Common Weakness Enumeration',
    r'CCSS': 'CryptoCurrency Security Standard',
    r'SOC\s*[12]': 'Service Organization Control',
    r'PCI[\s-]*DSS': 'Payment Card Industry Data Security Standard',
    # Military
    r'MIL-STD-\d+': 'Military Standard',
    r'MIL-HDBK-\d+': 'Military Handbook',
    # Other
    r'IEC\s*\d+': 'International Electrotechnical Commission',
    r'IEEE\s*\d+': 'Institute of Electrical and Electronics Engineers',
    r'RFC\s*\d+': 'Request for Comments',
    r'ETSI': 'European Telecommunications Standards Institute',
    r'FATF': 'Financial Action Task Force',
    r'GDPR': 'General Data Protection Regulation',
    r'CCPA': 'California Consumer Privacy Act',
    r'Common\s*Criteria': 'Common Criteria',
}

# ISO standard number to name mapping (partial)
ISO_STANDARDS = {
    '27001': 'ISO/IEC 27001 - Information security management',
    '27002': 'ISO/IEC 27002 - Information security controls',
    '27017': 'ISO/IEC 27017 - Cloud security',
    '27018': 'ISO/IEC 27018 - PII protection in cloud',
    '27701': 'ISO/IEC 27701 - Privacy information management',
    '22301': 'ISO 22301 - Business continuity',
    '9001': 'ISO 9001 - Quality management',
    '17712': 'ISO 17712 - Tamper-evident seals',
    '15408': 'ISO/IEC 15408 - Common Criteria',
    '20653': 'ISO 20653 - Road vehicles IP protection',
    '9227': 'ISO 9227 - Corrosion tests',
    '14577': 'ISO 14577 - Hardness testing',
    '50341': 'ISO/IEC 15408 - Common Criteria (Part 1)',
    '43757': 'ISO/IEC 27017 - Cloud security (old)',
    '73820': 'ISO/IEC - Unknown (verify manually)',
    '73822': 'ISO 22753 - GMO seed testing (NOT CRYPTO)',
    '74972': 'ISO 22301 - Business continuity',
    '74534': 'ISO/IEC 27002 - Security controls',
    '76555': 'ISO/IEC 27017 - Cloud security (2024)',
    '79212': 'ISO 17712 - Tamper-evident seals',
}


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
    """Fetch all norms from database."""
    all_norms = []
    offset = 0
    limit = 1000

    while True:
        url = f"{SUPABASE_URL}/rest/v1/norms?select=id,code,title,official_link,issuing_authority,standard_reference&order=code&offset={offset}&limit={limit}"
        r = requests.get(url, headers=get_headers(), timeout=60)
        if r.status_code != 200:
            log(f"Error fetching norms: {r.status_code}")
            break

        batch = r.json()
        if not batch:
            break

        all_norms.extend(batch)
        offset += limit

        if len(batch) < limit:
            break

    return all_norms


def extract_iso_number_from_url(url):
    """Extract ISO standard number from URL."""
    if not url:
        return None
    match = re.search(r'iso\.org/standard/(\d+)', url)
    if match:
        return match.group(1)
    return None


def check_title_has_real_standard(title):
    """Check if title contains a recognized standard name."""
    if not title:
        return None, False

    for pattern, name in REAL_STANDARDS.items():
        if re.search(pattern, title, re.IGNORECASE):
            return name, True

    return None, False


def analyze_norm_coherence(norm):
    """Analyze a single norm for coherence issues."""
    issues = []
    norm_id = norm['id']
    code = norm.get('code', '')
    title = norm.get('title', '')
    official_link = norm.get('official_link', '')
    issuing_authority = norm.get('issuing_authority', '')
    standard_reference = norm.get('standard_reference', '')

    # Check 1: Does title contain a real standard name?
    std_name, has_real_std = check_title_has_real_standard(title)

    # Check 2: Is official_link valid and matching?
    iso_num = extract_iso_number_from_url(official_link)

    if iso_num:
        iso_name = ISO_STANDARDS.get(iso_num, f'Unknown ISO standard {iso_num}')

        # Check if ISO link matches title
        if 'NOT CRYPTO' in iso_name:
            issues.append({
                'type': 'WRONG_ISO',
                'severity': 'CRITICAL',
                'detail': f'Link points to {iso_name}'
            })
        elif iso_num == '27001' and not any(x in title.lower() for x in ['27001', 'isms', 'information security management']):
            # Generic 27001 used as placeholder
            issues.append({
                'type': 'GENERIC_PLACEHOLDER',
                'severity': 'HIGH',
                'detail': f'Using ISO 27001 as generic placeholder for "{title[:50]}"'
            })

    # Check 3: Missing official link
    if not official_link or official_link.strip() == '':
        issues.append({
            'type': 'NO_LINK',
            'severity': 'MEDIUM',
            'detail': 'No official link provided'
        })

    # Check 4: SafeScoring internal criteria (not real standards)
    internal_prefixes = ['A-', 'F-', 'E-', 'A0', 'A1', 'F0', 'F1', 'E0', 'E1']
    is_internal = any(code.startswith(p) for p in internal_prefixes)

    if is_internal and not has_real_std:
        # This is likely an internal SafeScoring criterion, not a real standard
        # Check if it's pretending to be a standard
        if 'ISO' in title or 'NIST' in title or 'IEEE' in title:
            issues.append({
                'type': 'FAKE_STANDARD_CLAIM',
                'severity': 'HIGH',
                'detail': f'Internal criterion claims to be official standard'
            })

    # Check 5: Link domain doesn't match claimed standard
    if official_link:
        if 'iso.org' in official_link and 'ISO' not in title.upper():
            pass  # Might be OK, ISO covers many things
        if 'nist.gov' in official_link and 'NIST' not in title.upper() and 'SP 800' not in title.upper() and 'FIPS' not in title.upper():
            issues.append({
                'type': 'DOMAIN_MISMATCH',
                'severity': 'LOW',
                'detail': f'Link is NIST but title doesn\'t mention NIST'
            })

    # Check 6: Invented standard names (heuristic)
    invented_patterns = [
        r'SafeScoring',
        r'A-[A-Z]{2,}-\d{3}',  # Internal codes like A-PHY-001
        r'F-[A-Z]{2,}-\d{3}',
        r'\d{2,3}:\s',  # Just numbers like "F04: Something"
    ]
    for pattern in invented_patterns:
        if re.search(pattern, title):
            issues.append({
                'type': 'INTERNAL_CRITERION',
                'severity': 'INFO',
                'detail': 'This appears to be an internal SafeScoring criterion, not an official standard'
            })
            break

    return {
        'id': norm_id,
        'code': code,
        'title': title,
        'official_link': official_link,
        'iso_number': iso_num,
        'has_real_standard': has_real_std,
        'detected_standard': std_name,
        'issues': issues
    }


def generate_report(results, output_file='norms_audit_report.csv'):
    """Generate CSV report of audit findings."""

    # Filter to only include norms with issues
    with_issues = [r for r in results if r['issues']]

    # Sort by severity
    severity_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3, 'INFO': 4}
    with_issues.sort(key=lambda x: min([severity_order.get(i['severity'], 5) for i in x['issues']], default=5))

    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['ID', 'Code', 'Title', 'Official Link', 'ISO Number', 'Has Real Std', 'Detected Std', 'Issue Type', 'Severity', 'Detail'])

        for r in with_issues:
            for issue in r['issues']:
                writer.writerow([
                    r['id'],
                    r['code'],
                    r['title'][:80],
                    r['official_link'][:100] if r['official_link'] else '',
                    r['iso_number'] or '',
                    r['has_real_standard'],
                    r['detected_standard'] or '',
                    issue['type'],
                    issue['severity'],
                    issue['detail']
                ])

    return output_file


def main():
    log("=" * 70)
    log("AUDIT NORMS TABLE - COHERENCE CHECK")
    log("=" * 70)

    if not all([SUPABASE_URL, SUPABASE_KEY]):
        log("ERROR: Missing SUPABASE_URL or SUPABASE_KEY")
        return

    log("Fetching all norms...")
    norms = get_all_norms()
    log(f"Found {len(norms)} norms to audit")

    log("Analyzing coherence...")
    results = []
    for i, norm in enumerate(norms):
        result = analyze_norm_coherence(norm)
        results.append(result)
        if (i + 1) % 500 == 0:
            log(f"  Processed {i + 1}/{len(norms)}")

    # Statistics
    with_issues = [r for r in results if r['issues']]
    critical = sum(1 for r in results for i in r['issues'] if i['severity'] == 'CRITICAL')
    high = sum(1 for r in results for i in r['issues'] if i['severity'] == 'HIGH')
    medium = sum(1 for r in results for i in r['issues'] if i['severity'] == 'MEDIUM')

    log("\n" + "=" * 70)
    log("AUDIT RESULTS")
    log("=" * 70)
    log(f"Total norms:        {len(norms)}")
    log(f"With issues:        {len(with_issues)}")
    log(f"  CRITICAL:         {critical}")
    log(f"  HIGH:             {high}")
    log(f"  MEDIUM:           {medium}")

    # Show critical issues
    log("\n" + "-" * 70)
    log("CRITICAL ISSUES (Wrong ISO links, fake standards):")
    log("-" * 70)

    for r in results:
        for issue in r['issues']:
            if issue['severity'] == 'CRITICAL':
                log(f"\n[ID {r['id']}] {r['code']}: {r['title'][:50]}...")
                log(f"  Link: {r['official_link']}")
                log(f"  Issue: {issue['detail']}")

    # Show high priority
    log("\n" + "-" * 70)
    log("HIGH PRIORITY (Generic placeholders, fake standard claims):")
    log("-" * 70)

    count = 0
    for r in results:
        for issue in r['issues']:
            if issue['severity'] == 'HIGH' and count < 20:
                log(f"\n[ID {r['id']}] {r['code']}: {r['title'][:50]}...")
                log(f"  Link: {r['official_link']}")
                log(f"  Issue: {issue['detail']}")
                count += 1

    if count >= 20:
        remaining = sum(1 for r in results for i in r['issues'] if i['severity'] == 'HIGH') - 20
        log(f"\n  ... and {remaining} more HIGH priority issues")

    # Generate report
    report_file = generate_report(results)
    log(f"\nFull report saved to: {report_file}")

    log("\nDone.")


if __name__ == '__main__':
    main()
