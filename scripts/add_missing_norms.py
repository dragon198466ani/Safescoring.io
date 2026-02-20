#!/usr/bin/env python3
"""
Add missing norms from Excel to database.
Focuses on numeric S-pillar norms that are missing.
"""
import os
import sys
import re
import requests
import pandas as pd
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


# Standard mappings for S-pillar norms
S_STANDARDS = {
    # Cryptographic primitives
    'aes': ('FIPS 197', 'https://csrc.nist.gov/publications/detail/fips/197/final'),
    'rsa': ('RFC 8017', 'https://datatracker.ietf.org/doc/html/rfc8017'),
    'ecdsa': ('FIPS 186-5', 'https://csrc.nist.gov/publications/detail/fips/186/5/final'),
    'ed25519': ('RFC 8032', 'https://datatracker.ietf.org/doc/html/rfc8032'),
    'sha-256': ('FIPS 180-4', 'https://csrc.nist.gov/publications/detail/fips/180/4/final'),
    'sha-3': ('FIPS 202', 'https://csrc.nist.gov/publications/detail/fips/202/final'),
    'blake': ('RFC 7693', 'https://datatracker.ietf.org/doc/html/rfc7693'),
    'hmac': ('RFC 2104', 'https://datatracker.ietf.org/doc/html/rfc2104'),
    'pbkdf': ('NIST SP 800-132', 'https://csrc.nist.gov/publications/detail/sp/800-132/final'),
    'argon': ('RFC 9106', 'https://datatracker.ietf.org/doc/html/rfc9106'),
    'chacha': ('RFC 8439', 'https://datatracker.ietf.org/doc/html/rfc8439'),
    'diffie': ('RFC 7748', 'https://datatracker.ietf.org/doc/html/rfc7748'),
    'schnorr': ('BIP-340', 'https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki'),
    'taproot': ('BIP-341', 'https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki'),
    'zk': ('ZK-SNARKs', 'https://z.cash/technology/zksnarks/'),

    # BIP standards
    'bip-32': ('BIP-32', 'https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki'),
    'bip-39': ('BIP-39', 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki'),
    'bip-44': ('BIP-44', 'https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki'),
    'bip-49': ('BIP-49', 'https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki'),
    'bip-84': ('BIP-84', 'https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki'),
    'bip-86': ('BIP-86', 'https://github.com/bitcoin/bips/blob/master/bip-0086.mediawiki'),
    'seed': ('BIP-39', 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki'),
    'mnemonic': ('BIP-39', 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki'),
    'hierarchical': ('BIP-32', 'https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki'),
    'derivation': ('BIP-32', 'https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki'),
    'segwit': ('BIP-141', 'https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki'),
    'psbt': ('BIP-174', 'https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki'),

    # Security standards
    'hsm': ('FIPS 140-3', 'https://csrc.nist.gov/publications/detail/fips/140/3/final'),
    'secure element': ('ISO/IEC 15408', 'https://www.iso.org/standard/72891.html'),
    'common criteria': ('ISO/IEC 15408', 'https://www.iso.org/standard/72891.html'),
    'eal': ('ISO/IEC 15408', 'https://www.iso.org/standard/72891.html'),
    'tpm': ('TCG TPM 2.0', 'https://trustedcomputinggroup.org/resource/tpm-library-specification/'),
    'tee': ('GlobalPlatform TEE', 'https://globalplatform.org/specs-library/tee-system-architecture/'),
    'sgx': ('Intel SGX', 'https://www.intel.com/content/www/us/en/architecture-and-technology/software-guard-extensions.html'),
    'sev': ('AMD SEV', 'https://www.amd.com/en/developer/sev.html'),
    'trustzone': ('ARM TrustZone', 'https://developer.arm.com/ip-products/security-ip/trustzone'),

    # Ethereum standards
    'eip-712': ('EIP-712', 'https://eips.ethereum.org/EIPS/eip-712'),
    'eip-1559': ('EIP-1559', 'https://eips.ethereum.org/EIPS/eip-1559'),
    'eip-4337': ('EIP-4337', 'https://eips.ethereum.org/EIPS/eip-4337'),
    'erc-20': ('ERC-20', 'https://eips.ethereum.org/EIPS/eip-20'),
    'erc-721': ('ERC-721', 'https://eips.ethereum.org/EIPS/eip-721'),
    'erc-1155': ('ERC-1155', 'https://eips.ethereum.org/EIPS/eip-1155'),

    # Default
    'default': ('NIST SP 800-53', 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final'),
}


def get_standard_for_norm(name, description):
    """Find the best matching standard for a norm."""
    text = (name + ' ' + description).lower()

    for keyword, (std_name, std_link) in S_STANDARDS.items():
        if keyword in text:
            return std_name, std_link

    return S_STANDARDS['default']


def insert_norm(code, pillar, title, description, official_link):
    """Insert a new norm into the database."""
    url = f"{SUPABASE_URL}/rest/v1/norms"
    headers = get_headers()
    headers['Prefer'] = 'return=minimal'

    data = {
        'code': code,
        'pillar': pillar,
        'title': title,
        'description': description,
        'official_link': official_link,
        'is_essential': False,
        'consumer': True,
        'full': True,
        'access_type': 'G',
    }

    r = requests.post(url, headers=headers, json=data, timeout=30)
    return r.status_code in [200, 201]


def main():
    log("=" * 70)
    log("ADD MISSING NORMS FROM EXCEL")
    log("=" * 70)

    # Get existing norms from database
    log("Fetching existing norms...")
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=code&limit=3000",
        headers=get_headers()
    )
    existing_codes = set(n['code'] for n in r.json())
    log(f"Existing norms in DB: {len(existing_codes)}")

    # Read Excel
    excel_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'SAFE_SCORING_V7_FINAL.xlsx')
    log(f"Reading Excel: {excel_path}")
    df = pd.read_excel(excel_path, sheet_name='ÉVALUATIONS DÉTAIL', header=None)

    # Process each row
    added = 0
    skipped = 0
    errors = 0

    for idx, row in df.iterrows():
        code = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''

        # Skip non-norm rows
        if not code or len(code) < 2 or code[0] not in 'SAFE':
            continue

        # Skip if already exists
        if code in existing_codes:
            skipped += 1
            continue

        # Get norm details
        pillar = code[0]
        category = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ''
        norm_name = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ''
        description = str(row.iloc[3]).strip() if pd.notna(row.iloc[3]) else ''
        source = str(row.iloc[4]).strip() if pd.notna(row.iloc[4]) else ''

        if not norm_name:
            continue

        # Get standard
        std_name, std_link = get_standard_for_norm(norm_name, description + ' ' + source)

        # Build title with standard prefix
        title = f"{std_name}: {norm_name}"

        # Use description or source as description
        final_description = description if description else source

        # Insert norm
        if insert_norm(code, pillar, title, final_description, std_link):
            log(f"ADD {code}: {title[:50]}...")
            added += 1
            existing_codes.add(code)  # Prevent duplicates in same run
        else:
            log(f"ERR {code}")
            errors += 1

        if (added + skipped + errors) % 50 == 0:
            log(f"--- Progress: {added} added, {skipped} skipped, {errors} errors ---")

    log("")
    log("=" * 70)
    log("COMPLETE:")
    log(f"  - Added: {added}")
    log(f"  - Already existed: {skipped}")
    log(f"  - Errors: {errors}")
    log(f"  - Total norms now: {len(existing_codes)}")
    log("=" * 70)


if __name__ == '__main__':
    main()
