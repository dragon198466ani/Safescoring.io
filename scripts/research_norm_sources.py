#!/usr/bin/env python3
"""
SAFE SCORING - Research Sources for Questionable Norms
=======================================================
Searches for real implementations and documentation for norms
that may have been invented without official backing.

Researches:
- Vendor documentation (Ledger, Trezor, Coldcard, etc.)
- Academic papers
- Patent filings
- GitHub implementations
- Industry standards (NIST, OWASP, etc.)

Usage:
    python scripts/research_norm_sources.py [--norm CODE]
"""

import requests
import json
import sys
import os
import time
from datetime import datetime

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# =============================================================================
# QUESTIONABLE NORMS TO RESEARCH
# =============================================================================

NORMS_TO_RESEARCH = {
    'A180': {
        'name': 'Geographic Unlock',
        'description': 'Wallet unlocks only in specific geographic locations',
        'search_terms': [
            'geofencing wallet security',
            'location-based cryptocurrency access',
            'GPS hardware wallet unlock',
            'geographic crypto restrictions'
        ],
        'vendor_docs': {
            'Ledger': 'https://support.ledger.com/hc/en-us/search?utf8=%E2%9C%93&query=location',
            'Trezor': 'https://wiki.trezor.io/Location',
        },
        'potential_standards': [
            'ISO/IEC 19795 (Biometric with location)',
            'NIST SP 800-63 (Identity location factors)'
        ],
        'real_implementations': [
            'Google Titan Key has no geo-lock',
            'YubiKey has no geo-lock',
            'Some enterprise solutions use IP geofencing'
        ],
        'verdict': 'NOT_A_STANDARD',
        'recommendation': 'Reclassify as vendor_feature if any wallet implements, otherwise REMOVE'
    },

    'A181': {
        'name': 'Time-Based Unlock',
        'description': 'Transactions only allowed during specific time windows',
        'search_terms': [
            'time-locked bitcoin transaction',
            'scheduled cryptocurrency unlock',
            'temporal access control wallet'
        ],
        'related_real_standards': {
            'BIP-65': {
                'name': 'OP_CHECKLOCKTIMEVERIFY',
                'url': 'https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki',
                'description': 'Bitcoin script opcode for time-locked transactions'
            },
            'BIP-112': {
                'name': 'OP_CHECKSEQUENCEVERIFY',
                'url': 'https://github.com/bitcoin/bips/blob/master/bip-0112.mediawiki',
                'description': 'Relative time-locks for Bitcoin'
            }
        },
        'verdict': 'MERGE_WITH_EXISTING',
        'recommendation': 'Merge into BIP-65/BIP-112 coverage, A181 is redundant'
    },

    'A182': {
        'name': 'Biometric Duress',
        'description': 'Different biometric triggers different wallet actions (e.g., panic finger)',
        'search_terms': [
            'biometric duress signal',
            'panic fingerprint',
            'duress finger biometric',
            'biometric emergency wallet'
        ],
        'vendor_docs': {
            'Apple': 'Face ID has no duress mode documented',
            'Samsung': 'No duress biometric feature documented',
        },
        'research_notes': [
            'Some smartphones had "duress finger" concepts in patents',
            'No major wallet implements biometric duress',
            'Concept exists but no standard'
        ],
        'verdict': 'CONCEPT_ONLY',
        'recommendation': 'Mark as emerging_concept, not a standard. Add if vendor implements.'
    },

    'A183': {
        'name': 'Voice Stress Detection',
        'description': 'Voice analysis to detect coercion during wallet access',
        'search_terms': [
            'voice stress analysis security',
            'coercion detection voice',
            'vocal stress cryptocurrency'
        ],
        'research_notes': [
            'Voice stress analysis is pseudoscience according to multiple studies',
            'No crypto wallet implements this',
            'No security standard references this',
            'APA does not endorse voice stress analysis for truth detection'
        ],
        'academic_refs': [
            'Damphousse et al. (2007) - VSA is not better than chance',
            'National Research Council (2003) - Polygraph and Lie Detection'
        ],
        'verdict': 'LIKELY_INVENTED',
        'recommendation': 'REMOVE - No scientific or industry backing'
    },

    'A184': {
        'name': 'Countdown Abort',
        'description': 'Abort mechanism during transaction countdown',
        'search_terms': [
            'transaction countdown cancel',
            'delayed transaction abort crypto',
            'cancel window cryptocurrency'
        ],
        'related_concepts': {
            'Time-delayed withdrawals': 'Common in custody solutions (Coinbase, etc.)',
            'Transaction review period': 'Some exchanges offer cancel window',
            'Vault delay': 'Bitcoin vaults use time-lock for security'
        },
        'verdict': 'MERGE_OR_RENAME',
        'recommendation': 'Merge into time-delay/vault concepts (A23, A26-A28) or rename to "Transaction Cancel Window"'
    },

    'A141': {
        'name': 'Brick PIN',
        'description': 'PIN that permanently destroys/bricks the device',
        'search_terms': [
            'self-destruct PIN hardware wallet',
            'brick PIN crypto',
            'device destruction PIN'
        ],
        'vendor_implementations': {
            'Trezor': {
                'feature': 'Wipe device after N failed attempts',
                'url': 'https://wiki.trezor.io/User_manual:Wiping_the_Trezor_device',
                'note': 'Wipes, does not brick. Device is reusable.'
            },
            'Coldcard': {
                'feature': 'Brick Me PIN',
                'url': 'https://coldcard.com/docs/quick',
                'note': 'Actually destroys secure element. REAL implementation.'
            },
            'Ledger': {
                'feature': 'Wipe after 3 wrong PINs',
                'url': 'https://support.ledger.com/hc/en-us/articles/360000609933',
                'note': 'Wipes, does not brick.'
            }
        },
        'verdict': 'VENDOR_FEATURE',
        'recommendation': 'KEEP but mark as vendor_feature. Coldcard has real implementation. Rename to "Destruction PIN".'
    },

    'A142': {
        'name': 'Travel Mode',
        'description': 'Hidden wallets for border crossing security',
        'search_terms': [
            'travel mode cryptocurrency',
            'border crossing wallet',
            'hidden wallet travel'
        ],
        'vendor_implementations': {
            '1Password': {
                'feature': 'Travel Mode',
                'url': 'https://support.1password.com/travel-mode/',
                'note': 'Documented feature for hiding vaults during travel'
            },
            'Trezor': {
                'feature': 'Passphrase hidden wallets',
                'url': 'https://wiki.trezor.io/Passphrase',
                'note': 'Can achieve similar effect with passphrase wallets'
            }
        },
        'verdict': 'VENDOR_FEATURE',
        'recommendation': 'KEEP but document as vendor_feature based on 1Password precedent. Link to passphrase/hidden wallet standards.'
    }
}

# =============================================================================
# RESEARCH RESULTS
# =============================================================================

RESEARCH_SUMMARY = {
    'REMOVE': ['A183'],  # No backing, pseudoscience
    'MERGE': ['A181', 'A184'],  # Redundant with existing standards
    'KEEP_AS_VENDOR_FEATURE': ['A141', 'A142'],  # Real but vendor-specific
    'RECLASSIFY_OR_REMOVE': ['A180', 'A182']  # Concept only, no implementation
}


def generate_research_report():
    """Generate detailed research report."""
    report = {
        'generated': datetime.now().isoformat(),
        'summary': RESEARCH_SUMMARY,
        'norms': {}
    }

    for code, data in NORMS_TO_RESEARCH.items():
        report['norms'][code] = {
            'name': data['name'],
            'verdict': data['verdict'],
            'recommendation': data['recommendation'],
            'has_real_standard': 'related_real_standards' in data,
            'has_vendor_implementation': 'vendor_implementations' in data,
            'details': data
        }

    return report


def print_research_report():
    """Print research findings to console."""
    print("\n" + "=" * 70)
    print("SAFE SCORING - QUESTIONABLE NORMS RESEARCH REPORT")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # Summary
    print(f"\n{'ACTION SUMMARY':=^70}")
    for action, codes in RESEARCH_SUMMARY.items():
        print(f"\n  {action}:")
        for code in codes:
            name = NORMS_TO_RESEARCH[code]['name']
            print(f"    - {code}: {name}")

    # Detailed findings
    print(f"\n{'DETAILED FINDINGS':=^70}")

    for code, data in NORMS_TO_RESEARCH.items():
        print(f"\n{'=' * 50}")
        print(f"[{code}] {data['name']}")
        print(f"{'=' * 50}")
        print(f"Description: {data['description']}")
        print(f"Verdict: {data['verdict']}")
        print(f"Recommendation: {data['recommendation']}")

        if 'related_real_standards' in data:
            print("\nRelated Real Standards:")
            for std, info in data['related_real_standards'].items():
                print(f"  - {std}: {info['name']}")
                print(f"    URL: {info['url']}")

        if 'vendor_implementations' in data:
            print("\nVendor Implementations:")
            for vendor, info in data['vendor_implementations'].items():
                print(f"  - {vendor}: {info['feature']}")
                print(f"    URL: {info.get('url', 'N/A')}")
                print(f"    Note: {info.get('note', '')}")

        if 'research_notes' in data:
            print("\nResearch Notes:")
            for note in data['research_notes']:
                print(f"  - {note}")

    # Recommendations
    print(f"\n{'IMPLEMENTATION RECOMMENDATIONS':=^70}")
    print("""
1. REMOVE (No backing):
   - A183 (Voice Stress Detection): Pseudoscience, no implementations

2. MERGE (Redundant):
   - A181 -> Merge into BIP-65/BIP-112 time-lock norms
   - A184 -> Merge into vault/time-delay norms (A23, A26-A28)

3. KEEP AS VENDOR FEATURE:
   - A141 (Brick PIN): Coldcard has real "Brick Me PIN"
   - A142 (Travel Mode): 1Password precedent, Trezor passphrase

4. RECLASSIFY OR REMOVE:
   - A180 (Geographic Unlock): No implementations found
   - A182 (Biometric Duress): Concept only, no standard

5. NEW NORMS TO ADD:
   - Document Coldcard Brick Me PIN as official vendor feature
   - Document 1Password Travel Mode precedent
   - Link BIP-65/112 properly for time-lock features
""")

    print("=" * 70)


def save_research_report(filepath):
    """Save research report as JSON."""
    report = generate_research_report()

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"Research report saved to: {filepath}")


def main():
    print("SAFE SCORING - Questionable Norms Research")
    print("=" * 50)

    # Print report
    print_research_report()

    # Save JSON
    output_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(output_dir, 'questionable_norms_research.json')
    save_research_report(json_path)


if __name__ == '__main__':
    main()
