#!/usr/bin/env python3
"""
Fix norms where the title standard doesn't match the link/content.
Remove incorrect standard prefixes.
"""
import os
import sys
import requests
from datetime import datetime
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }


def update_norm(norm_id, title=None, official_link=None):
    url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"
    headers = get_headers()
    headers['Prefer'] = 'return=minimal'
    data = {}
    if title:
        data['title'] = title
    if official_link is not None:  # Allow setting to None
        data['official_link'] = official_link
    r = requests.patch(url, headers=headers, json=data, timeout=30)
    return r.status_code in [200, 204]


def clean_prefix(title, prefix):
    """Remove standard prefix from title."""
    if title.startswith(f"{prefix}: "):
        return title[len(prefix) + 2:].strip()
    return title


def main():
    log("=" * 70)
    log("FIX MISMATCHED STANDARDS")
    log("=" * 70)

    # Get all norms
    log("Fetching all norms...")
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,code,title,official_link&order=code&limit=2000",
        headers=get_headers()
    )
    norms = r.json()
    log(f"Total norms: {len(norms)}")

    # Define what's a mismatch and needs cleaning
    fixed = 0
    skipped = 0

    for norm in norms:
        norm_id = norm['id']
        code = norm['code']
        title = norm['title'] or ''
        link = (norm['official_link'] or '').lower()

        new_title = None
        needs_fix = False

        # BIP-85 - Only valid for deterministic entropy, not duress/panic features
        if title.startswith('BIP-85:') and 'bitcoin/bips' not in link:
            new_title = clean_prefix(title, 'BIP-85')
            needs_fix = True

        # BIP-340 - Only valid for Schnorr signatures
        if title.startswith('BIP-340:') and 'bitcoin/bips' not in link:
            new_title = clean_prefix(title, 'BIP-340')
            needs_fix = True

        # BIP-65/112 - Only valid for timelocks
        if title.startswith('BIP-65:') and 'bitcoin/bips' not in link:
            new_title = clean_prefix(title, 'BIP-65')
            needs_fix = True
        if title.startswith('BIP-112:') and 'bitcoin/bips' not in link:
            new_title = clean_prefix(title, 'BIP-112')
            needs_fix = True

        # NIST SP 800-88 - Only valid for media sanitization
        if title.startswith('NIST SP 800-88:') and 'nist.gov' not in link:
            new_title = clean_prefix(title, 'NIST SP 800-88')
            needs_fix = True

        # NIST SP 800-53 - Only valid for security controls
        if title.startswith('NIST SP 800-53:') and 'nist.gov' not in link:
            new_title = clean_prefix(title, 'NIST SP 800-53')
            needs_fix = True

        # NIST SP 800-63B - Only valid for authentication
        if title.startswith('NIST SP 800-63B:') and 'nist.gov' not in link:
            new_title = clean_prefix(title, 'NIST SP 800-63B')
            needs_fix = True

        # NIST SP 800-57 - Only valid for key management
        if title.startswith('NIST SP 800-57:') and 'nist.gov' not in link:
            new_title = clean_prefix(title, 'NIST SP 800-57')
            needs_fix = True

        # ISO/IEC 15408 - Keep for Common Criteria (commoncriteriaportal.org is valid)
        if title.startswith('ISO/IEC 15408:'):
            if 'iso.org' not in link and 'commoncriteriapo' not in link:
                new_title = clean_prefix(title, 'ISO/IEC 15408')
                needs_fix = True

        # ISO/IEC 27001 - Keep only for ISMS
        if title.startswith('ISO/IEC 27001:') and 'iso.org' not in link:
            new_title = clean_prefix(title, 'ISO/IEC 27001')
            needs_fix = True

        # FIPS standards - Only valid if link is NIST
        for fips in ['FIPS 140-3:', 'FIPS 186-5:', 'FIPS 197:', 'FIPS 180-4:', 'FIPS 202:']:
            if title.startswith(fips) and 'nist.gov' not in link and 'csrc.nist.gov' not in link:
                new_title = clean_prefix(title, fips.rstrip(':'))
                needs_fix = True
                break

        # SLIP standards - Only valid if link is satoshilabs
        if title.startswith('SLIP-') and 'satoshilabs' not in link:
            prefix = title.split(':')[0] if ':' in title else None
            if prefix:
                new_title = clean_prefix(title, prefix)
                needs_fix = True

        # EIP/ERC standards - Only valid if link is ethereum
        for eip_prefix in ['EIP-712:', 'EIP-1559:', 'EIP-4337:', 'ERC-20:', 'ERC-721:', 'ERC-1155:', 'ERC-4626:']:
            if title.startswith(eip_prefix) and 'ethereum' not in link and 'eips.ethereum.org' not in link:
                new_title = clean_prefix(title, eip_prefix.rstrip(':'))
                needs_fix = True
                break

        # OWASP standards - Only valid if link is OWASP
        for owasp in ['OWASP Top 10:', 'OWASP ASVS:']:
            if title.startswith(owasp) and 'owasp.org' not in link:
                new_title = clean_prefix(title, owasp.rstrip(':'))
                needs_fix = True
                break

        # GDPR - Only valid for actual GDPR articles
        if title.startswith('GDPR:'):
            if 'gdpr' not in link and 'eur-lex' not in link:
                # Check if it's really about GDPR
                desc_lower = title.lower()
                if not any(x in desc_lower for x in ['privacy', 'personal data', 'data protection', 'art.', 'article']):
                    new_title = clean_prefix(title, 'GDPR')
                    needs_fix = True

        if needs_fix and new_title:
            if update_norm(norm_id, title=new_title):
                log(f"OK {code}: {title[:40]}... -> {new_title[:40]}...")
                fixed += 1
            else:
                log(f"ERR {code}")
        else:
            skipped += 1

    log("")
    log("=" * 70)
    log(f"COMPLETE: {fixed} fixed, {skipped} skipped/ok")
    log("=" * 70)


if __name__ == '__main__':
    main()
