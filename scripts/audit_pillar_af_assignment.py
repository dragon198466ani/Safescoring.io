#!/usr/bin/env python3
"""
SAFESCORING.IO - Audit & Correct Pillar A vs F Assignments
=============================================================
This script audits all norms in the database and identifies those that may be
incorrectly assigned to Adversity (A) vs Fidelity (F).

Rule:
  - ADVERSITY (A) = Protection against INTENTIONAL threats from human adversaries
  - FIDELITY (F) = Protection against NON-INTENTIONAL failures and wear

Usage:
  python scripts/audit_pillar_af_assignment.py --audit      # Audit only (no changes)
  python scripts/audit_pillar_af_assignment.py --fix        # Apply corrections
  python scripts/audit_pillar_af_assignment.py --export     # Export report to CSV
"""

import os
import sys
import csv
import argparse
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

# Import classification functions
from src.core.applicability_rules import (
    classify_pillar_a_vs_f,
    validate_pillar_assignment,
    ADVERSITY_KEYWORDS,
    FIDELITY_KEYWORDS,
)

# Use the unified database client (uses requests, not supabase library)
from src.core.database import SupabaseClient

db = SupabaseClient()


def fetch_norms_af():
    """Fetch all norms with pillar A or F from database."""
    print("Fetching norms with pillar A or F...")

    # Fetch A norms (filter format: column=value, client adds eq. automatically)
    norms_a = db.select(
        "norms",
        columns="id, code, title, pillar, summary",
        filters={"pillar": "A"}
    )

    # Fetch F norms
    norms_f = db.select(
        "norms",
        columns="id, code, title, pillar, summary",
        filters={"pillar": "F"}
    )

    norms = (norms_a or []) + (norms_f or [])
    print(f"Found {len(norms)} norms (A: {len(norms_a or [])}, F: {len(norms_f or [])})")

    return norms


def audit_norms(norms):
    """
    Audit all norms and identify misclassified ones.

    Returns:
        {
            'correct': [...],      # Correctly assigned
            'incorrect': [...],    # Should be moved to other pillar
            'unknown': [...]       # Cannot determine
        }
    """
    results = {
        'correct': [],
        'incorrect': [],
        'unknown': []
    }

    for norm in norms:
        code = norm.get('code', '')
        title = norm.get('title', '')
        summary = norm.get('summary', '')
        current_pillar = norm.get('pillar', '')

        # Use the improved classifier with code, title, and summary
        suggested = classify_pillar_a_vs_f(code, title, summary)

        if suggested == 'UNKNOWN':
            validation = {
                'valid': True,
                'suggested_pillar': None,
                'reason': 'Cannot determine'
            }
        elif suggested == current_pillar:
            validation = {
                'valid': True,
                'suggested_pillar': None,
                'reason': f'Correctly assigned to {current_pillar}'
            }
        else:
            validation = {
                'valid': False,
                'suggested_pillar': suggested,
                'reason': f'Should be {suggested}, not {current_pillar}'
            }

        result_entry = {
            'id': norm.get('id'),
            'code': code,
            'title': title,
            'current_pillar': current_pillar,
            'suggested_pillar': validation.get('suggested_pillar'),
            'reason': validation.get('reason'),
            'summary_preview': (summary or '')[:100] + '...' if summary and len(summary) > 100 else summary
        }

        if validation['valid']:
            if 'Cannot determine' in validation['reason']:
                results['unknown'].append(result_entry)
            else:
                results['correct'].append(result_entry)
        else:
            results['incorrect'].append(result_entry)

    return results


def print_report(results):
    """Print audit report to console."""
    print("\n" + "=" * 80)
    print("AUDIT REPORT: Pillar A vs F Classification")
    print("=" * 80)

    print(f"\nSUMMARY:")
    print(f"  - Correctly assigned: {len(results['correct'])}")
    print(f"  - INCORRECTLY assigned: {len(results['incorrect'])}")
    print(f"  - Cannot determine: {len(results['unknown'])}")

    if results['incorrect']:
        print(f"\n{'='*80}")
        print("NORMS TO CORRECT (should be moved to different pillar):")
        print("=" * 80)

        # Group by direction
        a_to_f = [n for n in results['incorrect'] if n['current_pillar'] == 'A']
        f_to_a = [n for n in results['incorrect'] if n['current_pillar'] == 'F']

        if a_to_f:
            print(f"\n--- A → F (currently Adversity, should be Fidelity) ---")
            print("These protect against ACCIDENTS/WEAR, not intentional attacks:\n")
            for norm in a_to_f[:20]:  # Limit display
                print(f"  {norm['code']:20} {norm['title'][:50]}")
                print(f"    Reason: {norm['reason']}")
            if len(a_to_f) > 20:
                print(f"  ... and {len(a_to_f) - 20} more")

        if f_to_a:
            print(f"\n--- F → A (currently Fidelity, should be Adversity) ---")
            print("These protect against INTENTIONAL attacks, not accidents:\n")
            for norm in f_to_a[:20]:  # Limit display
                print(f"  {norm['code']:20} {norm['title'][:50]}")
                print(f"    Reason: {norm['reason']}")
            if len(f_to_a) > 20:
                print(f"  ... and {len(f_to_a) - 20} more")

    if results['unknown']:
        print(f"\n{'='*80}")
        print(f"UNKNOWN ({len(results['unknown'])} norms) - Manual review recommended:")
        print("=" * 80)
        for norm in results['unknown'][:10]:
            print(f"  {norm['code']:20} {norm['title'][:50]}")
        if len(results['unknown']) > 10:
            print(f"  ... and {len(results['unknown']) - 10} more")

    print("\n" + "=" * 80)


def export_report(results, filename=None):
    """Export audit report to CSV."""
    if not filename:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"pillar_af_audit_{timestamp}.csv"

    filepath = os.path.join(os.path.dirname(__file__), '..', 'data', filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    all_results = (
        [{'status': 'INCORRECT', **r} for r in results['incorrect']] +
        [{'status': 'UNKNOWN', **r} for r in results['unknown']] +
        [{'status': 'CORRECT', **r} for r in results['correct']]
    )

    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        if all_results:
            writer = csv.DictWriter(f, fieldnames=all_results[0].keys())
            writer.writeheader()
            writer.writerows(all_results)

    print(f"\nReport exported to: {filepath}")
    return filepath


def apply_corrections(results, dry_run=False):
    """Apply pillar corrections to database."""
    incorrect = results['incorrect']

    if not incorrect:
        print("No corrections needed!")
        return

    print(f"\n{'DRY RUN - ' if dry_run else ''}Applying {len(incorrect)} corrections...")

    corrected = 0
    errors = 0

    for norm in incorrect:
        norm_id = norm['id']
        new_pillar = norm['suggested_pillar']
        old_pillar = norm['current_pillar']
        code = norm['code']

        if dry_run:
            print(f"  [DRY RUN] Would update {code}: {old_pillar} → {new_pillar}")
            corrected += 1
            continue

        try:
            # Update in database
            db.update(
                "norms",
                data={"pillar": new_pillar},
                filters={"id": norm_id}
            )

            print(f"  Updated {code}: {old_pillar} → {new_pillar}")
            corrected += 1

        except Exception as e:
            print(f"  ERROR updating {code}: {e}")
            errors += 1

    print(f"\n{'Would correct' if dry_run else 'Corrected'}: {corrected}")
    if errors:
        print(f"Errors: {errors}")


def main():
    parser = argparse.ArgumentParser(
        description="Audit and correct pillar A vs F assignments"
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
    parser.add_argument(
        '--export', action='store_true',
        help='Export report to CSV'
    )

    args = parser.parse_args()

    # Default to audit if no action specified
    if not any([args.audit, args.fix, args.export]):
        args.audit = True

    # Fetch norms
    norms = fetch_norms_af()

    if not norms:
        print("No norms found with pillar A or F")
        return

    # Run audit
    results = audit_norms(norms)

    # Print report
    print_report(results)

    # Export if requested
    if args.export:
        export_report(results)

    # Apply corrections if requested
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
