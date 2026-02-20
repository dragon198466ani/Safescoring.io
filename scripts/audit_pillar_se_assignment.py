#!/usr/bin/env python3
"""
SAFESCORING.IO - Audit & Correct Pillar S vs E Assignments
=============================================================
This script audits all norms in the database and identifies those that may be
incorrectly assigned to Security (S) vs Efficiency (E).

Rule:
  - SECURITY (S) = Technical cryptographic protection, authentication, audits
  - EFFICIENCY (E) = Usability, performance, connectivity, UX
  - Some privacy norms might belong in ADVERSITY (A)

Usage:
  python scripts/audit_pillar_se_assignment.py --audit      # Audit only
  python scripts/audit_pillar_se_assignment.py --fix        # Apply corrections
"""

import os
import sys
import argparse

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from src.core.database import SupabaseClient

db = SupabaseClient()

# =========================================================================
# CLASSIFICATION RULES FOR S vs E
# =========================================================================

# Keywords strongly indicating SECURITY (S)
SECURITY_KEYWORDS = [
    'encryption', 'cryptograph', 'aes', 'rsa', 'sha-', 'hash', 'hmac',
    'signature', 'signing', 'authenticate', 'authentication', 'auth',
    'fido', 'webauthn', 'passkey', 'password', 'credential',
    'secure element', 'tee', 'trusted execution', 'enclave',
    'key management', 'key derivation', 'key generation', 'private key',
    'audit', 'penetration test', 'vulnerability', 'security review',
    'smart contract audit', 'formal verification', 'bug bounty',
    'fips', 'common criteria', 'cc eal', 'anssi', 'bsi',
    'bip-32', 'bip-39', 'bip-44', 'slip', 'hd wallet',
    'hsm', 'hardware security', 'tamper', 'anti-tamper',
    'tls', 'ssl', 'https', 'certificate', 'pki',
    'zero knowledge', 'zk-snark', 'zk-stark', 'zkp',
    'mpc', 'multi-party', 'threshold', 'shamir',
    'firmware sign', 'secure boot', 'verified boot',
    'owasp', 'cwe', 'cve', 'security standard',
]

# Keywords strongly indicating EFFICIENCY (E)
EFFICIENCY_KEYWORDS = [
    'user experience', 'ux', 'usability', 'interface', 'ui',
    'performance', 'speed', 'latency', 'throughput', 'tps',
    'platform', 'ios', 'android', 'windows', 'macos', 'linux',
    'bluetooth', 'nfc', 'usb', 'wifi', 'wireless', 'connectivity',
    'display', 'screen', 'touchscreen', 'oled', 'e-ink',
    'battery', 'charging', 'power', 'energy',
    'api', 'sdk', 'integration', 'developer', 'documentation',
    'blockchain support', 'chain support', 'multi-chain', 'network',
    'erc-20', 'erc-721', 'erc-1155', 'token support', 'nft support',
    'defi', 'swap', 'stake', 'lending', 'yield', 'liquidity',
    'portfolio', 'tracking', 'analytics', 'dashboard',
    'l2', 'layer 2', 'rollup', 'optimistic', 'zk-rollup',
    'cross-chain', 'bridge', 'interoperability',
    'gas', 'fee', 'transaction fee', 'cost',
    'mobile', 'desktop', 'browser', 'extension',
    'qr code', 'scan', 'camera',
    'notification', 'alert', 'push',
    'backup', 'export', 'import', 'sync',
    'format', 'encoding', 'serialization',
]

# Code prefixes that MUST be Security (S)
SECURITY_PREFIXES = [
    # S-series codes (all S-xxx are security)
    'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9',
    'S-',  # All S-xxx codes
    # Authentication & Identity
    'AUTH', 'FIDO', 'DID',
    # Cryptography
    'CRYPT', 'CRYP', 'HASH', 'SIG', 'KEY', 'PQC',
    # Hardware Security
    'HSM', 'SE-', 'HW', 'TEE',
    # Certifications & Standards (SECURITY standards)
    'FIPS', 'CC', 'NIST', 'ISO', 'ANSSI', 'BSI', 'PCI', 'SOC',
    # Security frameworks
    'OWASP', 'SEC', 'MOB',
    # Audits
    'AUDIT', 'SCA', 'VULN', 'PEN', 'CVE',
    # Crypto protocols
    'TLS', 'PKI', 'MPC', 'ZK', 'BIP', 'SLIP', 'EIP', 'ERC', 'RFC',
    # Network security
    'NET',
    # Staking security
    'STK',
    # Payment security
    'PAY',
    # Biometric security
    'BIO',
    # Governance security
    'G0', 'G1',
    # Liquidity (risk management)
    'LIQ',
]

# Code prefixes that MUST be Efficiency (E)
EFFICIENCY_PREFIXES = [
    # E-series codes
    'E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9',
    'E-BT', 'E-NFC', 'E-USB', 'E-WIFI',
    # UX/UI
    'UX', 'UI-',
    # Performance
    'PERF',
    # Platforms
    'PLAT',
    # APIs (except OWASP which is security)
    'SDK',
    # Blockchain/DeFi ecosystem
    'BC', 'CHAIN', 'DEFI',
    # Layer 2 solutions (ecosystem features)
    'L20', 'L21', 'L22',
    # Tokens
    'TOKEN', 'NFT',
    # Gas/Fees
    'GAS',
    # Connectivity
    'COMM', 'DISP', 'BATT',
    # Infrastructure/Oracles (ecosystem)
    'INF', 'ORACLE',
    # Real World Assets
    'RWA',
    # AI features (operational)
    'AI',
    # General/Misc features
    'GM',
]

# Privacy codes should be in A (Adversity) - ONLY clear privacy protocols
SHOULD_BE_ADVERSITY_PREFIXES = ['PRIV', 'ANON', 'TOR', 'MIX']

# Explicit overrides for edge cases
EXPLICIT_PILLAR_OVERRIDES_SE = {
    # API standards
    'API01': 'S',  # OWASP API Top 10 is security
    'API02': 'E',  # OpenAPI 3.1 is specification/usability
    'API03': 'E', 'API04': 'E', 'API05': 'E',

    # E-series codes that are wrongly in S - should stay E
    'E238': 'E', 'E239': 'E', 'E240': 'E', 'E241': 'E', 'E242': 'E',

    # GM (General/Misc) codes
    'GM01': 'E', 'GM02': 'E', 'GM03': 'E', 'GM04': 'E', 'GM05': 'E',

    # DP codes - SPECIFIC classification
    'DP01': 'E',   # IPFS Protocol - decentralized storage (infrastructure)
    'DP02': 'S',   # Filecoin Proofs - cryptographic proofs
    'DP03': 'E',   # Arweave Permaweb - permanent storage (infrastructure)
    'DP04': 'E',   # Data Availability Sampling - scaling solution
    'DP05': 'S',   # TEE Attestation - hardware security
    'DP06': 'S',   # AMD SEV - hardware security
    'DP07': 'E',   # Stratum V2 - mining protocol (infrastructure)
    'DP08': 'S',   # WireGuard Protocol - encryption protocol
    'DP09': 'A',   # Tor Onion Routing - PRIVACY
    'DP10': 'A',   # Nym Mixnet - PRIVACY
    'DP11': 'E',   # libp2p - networking library (infrastructure)
    'DP12': 'E',   # Erasure Coding - data redundancy (infrastructure)
    'DP13': 'S',   # Proof of Work - consensus/security
    'DP14': 'E',   # ASIC Resistance - mining feature

    # W3C codes - web security standards = S
    'W3C007': 'S',  # Content Security Policy - security
    'W3C008': 'S',  # Subresource Integrity - security
    'W3C009': 'S',  # CORS - security
    'W3C010': 'S',  # Referrer Policy - privacy/security
    'W3C012': 'S',  # Secure Contexts - security

    # STB (Stablecoin) codes - regulatory/financial = F actually, not S or E
    'STB01': 'F',  # ISDA Master Agreement - legal/quality
    'STB02': 'F',  # Basel III LCR - regulatory/quality
    'STB03': 'F',  # FSB Recommendations - regulatory/quality
    'STB04': 'F',  # GAAP/IFRS Reserves - accounting/quality
}


def classify_s_vs_e(code, title, summary):
    """Classify a norm as S, E, A, or F based on its content."""
    code_upper = (code or '').upper()
    text = ((title or '') + ' ' + (summary or '')).lower()

    # 1. Check explicit overrides first
    if code_upper in EXPLICIT_PILLAR_OVERRIDES_SE:
        return EXPLICIT_PILLAR_OVERRIDES_SE[code_upper]

    # 2. Check if should be in A (Adversity) - privacy norms
    for prefix in SHOULD_BE_ADVERSITY_PREFIXES:
        if code_upper.startswith(prefix):
            return 'A'

    # 3. Check Security prefixes
    for prefix in SECURITY_PREFIXES:
        if code_upper.startswith(prefix):
            return 'S'

    # 4. Check Efficiency prefixes
    for prefix in EFFICIENCY_PREFIXES:
        if code_upper.startswith(prefix):
            return 'E'

    # 5. Keyword matching
    s_score = sum(1 for kw in SECURITY_KEYWORDS if kw in text)
    e_score = sum(1 for kw in EFFICIENCY_KEYWORDS if kw in text)

    if s_score > e_score:
        return 'S'
    elif e_score > s_score:
        return 'E'

    return 'UNKNOWN'


def fetch_norms_se():
    """Fetch all norms with pillar S or E from database."""
    print("Fetching norms with pillar S or E...")

    norms_s = db.select(
        "norms",
        columns="id, code, title, pillar, summary",
        filters={"pillar": "S"}
    )

    norms_e = db.select(
        "norms",
        columns="id, code, title, pillar, summary",
        filters={"pillar": "E"}
    )

    norms = (norms_s or []) + (norms_e or [])
    print(f"Found {len(norms)} norms (S: {len(norms_s or [])}, E: {len(norms_e or [])})")

    return norms


def audit_norms(norms):
    """Audit all norms and identify misclassified ones."""
    results = {
        'correct': [],
        'incorrect': [],
        'to_adversity': [],
        'to_fidelity': [],
        'unknown': []
    }

    for norm in norms:
        code = norm.get('code', '')
        title = norm.get('title', '')
        summary = norm.get('summary', '')
        current_pillar = norm.get('pillar', '')

        suggested = classify_s_vs_e(code, title, summary)

        result_entry = {
            'id': norm.get('id'),
            'code': code,
            'title': title,
            'current_pillar': current_pillar,
            'suggested_pillar': suggested,
            'summary_preview': (summary or '')[:80] + '...' if summary and len(summary) > 80 else summary
        }

        if suggested == 'UNKNOWN':
            results['unknown'].append(result_entry)
        elif suggested == 'A':
            results['to_adversity'].append(result_entry)
        elif suggested == 'F':
            results['to_fidelity'].append(result_entry)
        elif suggested == current_pillar:
            results['correct'].append(result_entry)
        else:
            results['incorrect'].append(result_entry)

    return results


def print_report(results):
    """Print audit report to console."""
    print("\n" + "=" * 80)
    print("AUDIT REPORT: Pillar S vs E Classification")
    print("=" * 80)

    print(f"\nSUMMARY:")
    print(f"  - Correctly assigned: {len(results['correct'])}")
    print(f"  - INCORRECTLY assigned (S<->E swap): {len(results['incorrect'])}")
    print(f"  - Should be ADVERSITY (A): {len(results['to_adversity'])}")
    print(f"  - Should be FIDELITY (F): {len(results['to_fidelity'])}")
    print(f"  - Cannot determine: {len(results['unknown'])}")

    if results['incorrect']:
        print(f"\n{'='*80}")
        print("NORMS TO CORRECT (S <-> E swap):")
        print("=" * 80)

        s_to_e = [n for n in results['incorrect'] if n['current_pillar'] == 'S']
        e_to_s = [n for n in results['incorrect'] if n['current_pillar'] == 'E']

        if s_to_e:
            print(f"\n--- S -> E (currently Security, should be Efficiency) ---")
            for norm in s_to_e[:25]:
                print(f"  {norm['code']:20} {(norm['title'] or '')[:50]}")
            if len(s_to_e) > 25:
                print(f"  ... and {len(s_to_e) - 25} more")

        if e_to_s:
            print(f"\n--- E -> S (currently Efficiency, should be Security) ---")
            for norm in e_to_s[:25]:
                print(f"  {norm['code']:20} {(norm['title'] or '')[:50]}")
            if len(e_to_s) > 25:
                print(f"  ... and {len(e_to_s) - 25} more")

    if results['to_adversity']:
        print(f"\n{'='*80}")
        print("NORMS THAT SHOULD BE ADVERSITY (A) - Privacy/Anti-surveillance:")
        print("=" * 80)
        for norm in results['to_adversity'][:25]:
            print(f"  {norm['code']:20} {norm['current_pillar']} -> A  {(norm['title'] or '')[:45]}")
        if len(results['to_adversity']) > 25:
            print(f"  ... and {len(results['to_adversity']) - 25} more")

    if results['to_fidelity']:
        print(f"\n{'='*80}")
        print("NORMS THAT SHOULD BE FIDELITY (F) - Quality/Regulatory:")
        print("=" * 80)
        for norm in results['to_fidelity'][:25]:
            print(f"  {norm['code']:20} {norm['current_pillar']} -> F  {(norm['title'] or '')[:45]}")
        if len(results['to_fidelity']) > 25:
            print(f"  ... and {len(results['to_fidelity']) - 25} more")

    if results['unknown']:
        print(f"\n{'='*80}")
        print(f"UNKNOWN ({len(results['unknown'])} norms) - Manual review needed:")
        print("=" * 80)
        for norm in results['unknown'][:15]:
            print(f"  {norm['code']:20} [{norm['current_pillar']}] {(norm['title'] or '')[:45]}")
        if len(results['unknown']) > 15:
            print(f"  ... and {len(results['unknown']) - 15} more")

    print("\n" + "=" * 80)


def apply_corrections(results, dry_run=False):
    """Apply pillar corrections to database."""
    # Combine all correction types
    to_correct = results['incorrect'] + results['to_adversity'] + results['to_fidelity']

    if not to_correct:
        print("No corrections needed!")
        return

    print(f"\n{'DRY RUN - ' if dry_run else ''}Applying {len(to_correct)} corrections...")

    corrected = 0
    errors = 0

    for norm in to_correct:
        norm_id = norm['id']
        new_pillar = norm['suggested_pillar']
        old_pillar = norm['current_pillar']
        code = norm['code']

        if dry_run:
            print(f"  [DRY RUN] Would update {code}: {old_pillar} -> {new_pillar}")
            corrected += 1
            continue

        try:
            db.update(
                "norms",
                data={"pillar": new_pillar},
                filters={"id": norm_id}
            )

            print(f"  Updated {code}: {old_pillar} -> {new_pillar}")
            corrected += 1

        except Exception as e:
            print(f"  ERROR updating {code}: {e}")
            errors += 1

    print(f"\n{'Would correct' if dry_run else 'Corrected'}: {corrected}")
    if errors:
        print(f"Errors: {errors}")


def main():
    parser = argparse.ArgumentParser(
        description="Audit and correct pillar S vs E assignments"
    )
    parser.add_argument(
        '--audit', action='store_true',
        help='Run audit only (no changes)'
    )
    parser.add_argument(
        '--fix', action='store_true',
        help='Apply corrections to database'
    )
    parser.add_argument(
        '--dry-run', action='store_true',
        help='Show what would be changed without applying'
    )

    args = parser.parse_args()

    if not any([args.audit, args.fix]):
        args.audit = True

    norms = fetch_norms_se()

    if not norms:
        print("No norms found with pillar S or E")
        return

    results = audit_norms(norms)
    print_report(results)

    if args.fix:
        if args.dry_run:
            apply_corrections(results, dry_run=True)
        else:
            print("\nWARNING: This will modify the database!")
            confirm = input("Type 'YES' to confirm: ")
            if confirm == 'YES':
                apply_corrections(results, dry_run=False)
            else:
                print("Aborted.")


if __name__ == "__main__":
    main()
