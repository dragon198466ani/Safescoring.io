#!/usr/bin/env python3
"""
Mark SafeScoring internal criteria with appropriate summaries.

These are criteria invented by SafeScoring to evaluate products,
not official standards from external bodies.
"""

import os
import sys
import re
import time
import argparse
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from src.core.database import SupabaseClient
from src.core.api_provider import AIProvider

db = SupabaseClient()
api = AIProvider()

if not db.is_configured():
    print("ERROR: Missing Supabase configuration")
    sys.exit(1)

# Template for internal criteria
INTERNAL_CRITERIA_TEMPLATE = """## 1. PURPOSE
SafeScoring evaluation criterion that assesses: {title}

## 2. ORIGIN
- **Date**: Internal criterion
- **Authors**: SafeScoring Team
- **Organization**: SafeScoring (getmykey.io)
- **Type**: Internal Evaluation Criterion

## 3. TECHNICAL SPECIFICATIONS
This is a SafeScoring-defined criterion, not an external standard.
- **Pillar**: {pillar} ({pillar_name})
- **Code**: {code}
- **Category**: Product evaluation criterion

## 4. CRYPTOGRAPHIC PRIMITIVES
[Not applicable - evaluation criterion]

## 5. SECURITY PROPERTIES
This criterion evaluates whether a product:
{description}

## 6. COMPLIANCE REQUIREMENTS
Products are evaluated against this criterion as part of the SAFE scoring methodology.
- **Scoring**: Binary (pass/fail) or graded
- **Weight**: Varies by product type

## 7. DEPENDENCIES & REFERENCES
May relate to external standards where applicable.
- See SafeScoring methodology documentation

## 8. USE CASES
Used to evaluate:
- Hardware wallets
- Software wallets
- Exchanges (CEX)
- DeFi protocols
- Staking services

## 9. LIMITATIONS & WARNINGS
- This is an internal SafeScoring criterion
- Not an official external standard
- Evaluation methodology documented at getmykey.io/methodology

## 10. REFERENCES
- [SafeScoring Methodology](https://getmykey.io/methodology)
- [SAFE Framework Documentation](https://getmykey.io/about)
"""

PILLAR_NAMES = {
    'S': 'Security',
    'A': 'Adversity',
    'F': 'Fidelity',
    'E': 'Ecosystem'
}


class InternalCriteriaMarker:
    """Mark internal criteria with appropriate summaries."""

    def __init__(self, dry_run=False):
        self.dry_run = dry_run
        self.stats = {
            'processed': 0,
            'marked': 0,
            'skipped': 0,
            'errors': 0
        }

    def is_internal_criterion(self, code):
        """Check if this is an internal SafeScoring criterion."""
        # Numbered codes like A01, S23, F45, E67
        if re.match(r'^[ASFE]\d+$', code):
            return True

        # Codes with SafeScoring prefixes
        safescoring_prefixes = [
            '-OPS-', '-CEX-', '-DEX-', '-STAKE-', '-BRIDGE-',
            '-POOL-', '-LST-', '-LSD-', '-DAO-', '-GOV-',
            '-SWAP-', '-YIELD-', '-NFT-', '-GAME-', '-PAY-',
            '-LEND-', '-BORROW-', '-PERP-', '-OPT-', '-SYNTH-'
        ]
        if any(prefix in code for prefix in safescoring_prefixes):
            return True

        return False

    def generate_description(self, code, title):
        """Generate a description for internal criteria."""
        # Use AI to generate a brief description based on title
        prompt = f"""Generate a brief technical description (2-3 sentences) for this cryptocurrency security evaluation criterion:

Code: {code}
Title: {title}

Focus on what the criterion evaluates in terms of security, privacy, or functionality.
Write in technical but accessible language.
Do NOT invent specific standards or make claims about external organizations.

Example output:
"Evaluates whether the product implements secure key derivation following industry best practices. Checks for proper entropy sources and secure storage of derived keys."
"""
        try:
            response = api.call(prompt=prompt, temperature=0.3, max_tokens=200)
            if response:
                # Clean response
                response = response.strip().strip('"')
                if len(response) > 50:
                    return response
        except Exception:
            pass

        # Fallback: simple description from title
        return f"Evaluates whether the product implements {title.lower()}."

    def get_norms_needing_marking(self, limit=None):
        """Get internal criteria that need marking."""
        all_norms = []
        offset = 0
        batch_size = 1000

        while True:
            result = db.select(
                table='norms',
                columns='id,code,title,pillar,official_doc_summary',
                order='code',
                order_desc=False,
                limit=batch_size,
                offset=offset
            )

            if not result:
                break

            # Filter to internal criteria needing marking
            for norm in result:
                if not self.is_internal_criterion(norm['code']):
                    continue

                summary = norm.get('official_doc_summary', '') or ''
                # Skip if already has a good summary
                if len(summary) > 500 and 'NEEDS MANUAL REVIEW' not in summary:
                    continue

                all_norms.append(norm)

            print(f"  Scanned {offset + len(result)} norms, found {len(all_norms)} internal criteria...")

            if len(result) < batch_size:
                break

            offset += batch_size

        if limit and len(all_norms) > limit:
            all_norms = all_norms[:limit]

        return all_norms

    def process_norm(self, norm):
        """Process a single internal criterion."""
        code = norm['code']
        title = norm['title']
        pillar = norm.get('pillar', 'S')

        print(f"\nProcessing {code}: {title[:50]}...")

        # Generate description
        description = self.generate_description(code, title)
        print(f"  Generated description ({len(description)} chars)")

        # Format summary
        summary = INTERNAL_CRITERIA_TEMPLATE.format(
            title=title,
            pillar=pillar,
            pillar_name=PILLAR_NAMES.get(pillar, 'Security'),
            code=code,
            description=description
        )

        # Update database
        update_data = {
            'official_doc_summary': summary,
            'summary_status': 'internal_criterion',
            'issuing_authority': 'SafeScoring'
        }

        if not self.dry_run:
            db.update(
                table='norms',
                data=update_data,
                filters={'id': norm['id']}
            )
            print(f"  Marked as internal criterion")
        else:
            print(f"  [DRY RUN] Would mark as internal criterion")

        self.stats['marked'] += 1
        return True

    def run(self, limit=None):
        """Run the internal criteria marker."""
        print("=" * 60)
        print("INTERNAL CRITERIA MARKER")
        print("=" * 60)
        print(f"Mode: {'DRY RUN' if self.dry_run else 'LIVE'}")
        print(f"Limit: {limit or 'NONE'}")
        print()

        print("Finding internal criteria needing marking...")
        norms = self.get_norms_needing_marking(limit)
        print(f"Found {len(norms)} internal criteria to mark")

        for norm in norms:
            try:
                self.process_norm(norm)
                self.stats['processed'] += 1
            except Exception as e:
                print(f"  ERROR: {e}")
                self.stats['errors'] += 1

            # Rate limiting
            time.sleep(0.5)

        # Print stats
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Processed: {self.stats['processed']}")
        print(f"Marked: {self.stats['marked']}")
        print(f"Skipped: {self.stats['skipped']}")
        print(f"Errors: {self.stats['errors']}")

        return self.stats


def main():
    parser = argparse.ArgumentParser(description='Mark internal SafeScoring criteria')
    parser.add_argument('--limit', type=int, help='Limit number of norms to process')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without updating DB')

    args = parser.parse_args()

    marker = InternalCriteriaMarker(dry_run=args.dry_run)
    marker.run(limit=args.limit)


if __name__ == '__main__':
    main()
