#!/usr/bin/env python3
"""
Fix false positive standard matches in norm titles.
Removes wrong standard prefixes and applies correct ones.
"""
import os
import re
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# Standards that are often incorrectly matched
FALSE_POSITIVES = [
    'GlobalPlatform SE',  # Matched "se" in many words
    'Avail',  # Matched "available"
    'Simple Power Analysis',  # Matched "simple"
    'Electromagnetic Analysis',  # Matched random words
]

# Code-based correct mappings for specific norms
CORRECT_MAPPINGS = {
    # A-PILLAR duress/adversity norms
    'A-BANK-ACCESS': ('Internal Criterion', None),
    'A-BANK-FREEZE': ('Internal Criterion', None),
    'A-BANK-TRANS': ('Internal Criterion', None),
    'A-BRIDGE-DELAY': ('Internal Criterion', None),
    'A-BRIDGE-LIMIT': ('Internal Criterion', None),
    'A-BRIDGE-VERIFY': ('Internal Criterion', None),
    'A-CEX-DELAY': ('Internal Criterion', None),
    'A-CEX-WHITELIST': ('FATF Travel Rule', 'https://www.fatf-gafi.org/'),
    'A-CEX-FREEZE': ('Internal Criterion', None),
    'A-CRYPTO-SSS': ('SLIP-39', 'https://github.com/satoshilabs/slips/blob/master/slip-0039.md'),
    'A-ETSI-103097': ('ETSI TS 103 097', 'https://www.etsi.org/'),
    'A-HDN-004': ('Internal Criterion', None),
    'A-ISO-24759': ('ISO/IEC 24759', 'https://www.iso.org/standard/72515.html'),
    'A-LEND-LIMIT': ('Internal Criterion', None),
    'A-LST-QUEUE': ('Internal Criterion', None),
    'A-LST-REDEEM': ('Internal Criterion', None),
    'A-NFT-CANCEL': ('Internal Criterion', None),
    'A-NFT-ESCROW': ('Internal Criterion', None),
    'A-NFT-FRAUD': ('Internal Criterion', None),
    'A-OPS-003': ('Internal Criterion', None),
    'A-OPS-004': ('Internal Criterion', None),
    'A-OPS-005': ('Internal Criterion', None),
    'A-OPS-006': ('Internal Criterion', None),
    'A-PAY-DISPUTE': ('Internal Criterion', None),
    'A-PAY-REFUND': ('Internal Criterion', None),
    'A-PERP-MARGIN': ('Internal Criterion', None),
    'A-PHY-001': ('Internal Criterion', None),
    'A-PHY-003': ('Internal Criterion', None),
    'A-PHY-004': ('Internal Criterion', None),
    'A-PNC-004': ('Internal Criterion', None),
    'A-SOC-001': ('Internal Criterion', None),

    # E-PILLAR usability norms - remove wrong matches
    'E-AA-BUNDLERS': ('EIP-4337', 'https://eips.ethereum.org/EIPS/eip-4337'),
    'E-BANK-IBAN': ('Internal Criterion', None),
    'E-BANK-LOANS': ('Internal Criterion', None),
    'E-BANK-SAVINGS': ('Internal Criterion', None),
    'E-CEX-API': ('Internal Criterion', None),
    'E-CEX-FIAT': ('Internal Criterion', None),
    'E-CEX-PAIRS': ('Internal Criterion', None),
    'E-FIAT-OFF': ('Internal Criterion', None),
    'E-FIAT-ON': ('Internal Criterion', None),
    'E-FUTURES': ('Internal Criterion', None),
    'E-YIELD-VAULT': ('ERC-4626', 'https://eips.ethereum.org/EIPS/eip-4626'),
    'E-YIELD-ZAPS': ('Internal Criterion', None),

    # F-PILLAR fidelity norms
    'F-BANK-DEPOSIT': ('Internal Criterion', None),
    'F-BANK-RESERVE': ('Internal Criterion', None),
    'F-CEX-SEGREG': ('Internal Criterion', None),
    'F-CUST-REGLIC': ('Internal Criterion', None),
    'F-CUST-SLA': ('Internal Criterion', None),
    'F-INCIDENT': ('ISO/IEC 27035', 'https://www.iso.org/standard/78973.html'),
    'F-LEND-GOV': ('Internal Criterion', None),
    'F-LEND-UTIL': ('Internal Criterion', None),
    'F-SEGREG': ('Internal Criterion', None),
    'F-WALLET-UPDATE': ('Internal Criterion', None),
    'F-CARD-CASHBACK': ('Internal Criterion', None),
    'F-CARD-CONVERT': ('Internal Criterion', None),
    'F-LEND-TVL': ('Internal Criterion', None),
    'F-PERP-FUND': ('Internal Criterion', None),
    'F-PERP-INSUR': ('Nexus Mutual', 'https://nexusmutual.io/'),
    'F-PERP-OI': ('Internal Criterion', None),

    # S-PILLAR security norms
    'S-BANK-SEGR': ('Internal Criterion', None),
    'S-BR-LOCK': ('Internal Criterion', None),
    'S-BR-MINT': ('Internal Criterion', None),
    'S-CARD-EMV': ('EMVCo', 'https://www.emvco.com/'),
    'S-LEND-COLLAT': ('Internal Criterion', None),
    'S-NIST-001': ('NIST SP 800-53', 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final'),
    'S-PAY-FRAUD': ('Internal Criterion', None),
    'S-SLIP-0044': ('SLIP-0044', 'https://github.com/satoshilabs/slips/blob/master/slip-0044.md'),
    'S-YIELD-LIMIT': ('Internal Criterion', None),
    'S-YIELD-STRAT': ('Internal Criterion', None),
}


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }


def clean_title(title, wrong_std):
    """Remove wrong standard prefix from title."""
    if title.startswith(f"{wrong_std}: "):
        return title[len(wrong_std) + 2:]
    return title


def update_norm(norm_id, new_title, official_link=None):
    """Update norm in database."""
    url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"
    headers = get_headers()
    headers['Prefer'] = 'return=minimal'

    data = {'title': new_title}
    if official_link:
        data['official_link'] = official_link

    r = requests.patch(url, headers=headers, json=data, timeout=30)
    return r.status_code in [200, 204]


def main():
    log("=" * 70)
    log("FIX FALSE POSITIVE STANDARD MATCHES")
    log("=" * 70)

    # Get all norms with false positive prefixes
    log("Fetching norms with potential false positives...")

    all_norms = []
    for false_std in FALSE_POSITIVES:
        url = f"{SUPABASE_URL}/rest/v1/norms?title=ilike.{false_std}%3A*&select=id,code,title"
        r = requests.get(url, headers=get_headers(), timeout=30)
        if r.status_code == 200:
            all_norms.extend(r.json())

    log(f"Found {len(all_norms)} norms with potential false positives")

    fixed = 0
    kept = 0
    errors = 0

    for norm in all_norms:
        norm_id = norm['id']
        code = norm['code']
        title = norm['title']

        # Check if this code has a correct mapping
        if code in CORRECT_MAPPINGS:
            correct_std, correct_link = CORRECT_MAPPINGS[code]

            # Extract original description (after wrong standard)
            for false_std in FALSE_POSITIVES:
                if title.startswith(f"{false_std}: "):
                    original_desc = title[len(false_std) + 2:]
                    break
            else:
                original_desc = title

            # Format new title
            if correct_std and correct_std != 'Internal Criterion':
                new_title = f"{correct_std}: {original_desc}"
            else:
                new_title = original_desc  # Keep description without standard prefix

            if new_title != title:
                if update_norm(norm_id, new_title, correct_link):
                    log(f"OK {code}: {title[:30]}... -> {new_title[:30]}...")
                    fixed += 1
                else:
                    log(f"ERR {code}")
                    errors += 1
            else:
                kept += 1
        else:
            # No specific mapping - just remove wrong standard prefix
            for false_std in FALSE_POSITIVES:
                if title.startswith(f"{false_std}: "):
                    new_title = title[len(false_std) + 2:]
                    if update_norm(norm_id, new_title):
                        log(f"CLEAN {code}: Removed '{false_std}' prefix")
                        fixed += 1
                    else:
                        errors += 1
                    break
            else:
                kept += 1

    log("")
    log("=" * 70)
    log(f"COMPLETE: {fixed} fixed, {kept} kept, {errors} errors")
    log("=" * 70)


if __name__ == '__main__':
    main()
