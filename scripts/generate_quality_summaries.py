#!/usr/bin/env python3
"""
Generate QUALITY summaries for norms using AI knowledge.

Instead of extracting from documents (which often fails), this script
generates informative summaries based on what the standard actually is.
"""

import os
import sys
import re
import time
import argparse
from pathlib import Path

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

# New prompt: Generate informative content, not extract quotes
QUALITY_SUMMARY_PROMPT = """You are a technical writer creating documentation for a cryptocurrency security evaluation platform.

Write a comprehensive, informative summary for this security standard/criterion:

**Code:** {code}
**Title:** {title}
**Pillar:** {pillar} ({pillar_desc})
**Related Standard:** {standard_ref}

Generate a summary with these 10 sections. Be INFORMATIVE and SPECIFIC. Do not say "not specified" - if you don't know, describe what the standard SHOULD cover based on its title.

## 1. PURPOSE
Explain clearly what this standard/criterion does and why it matters for cryptocurrency security. Write 2-3 sentences.

## 2. ORIGIN
- **Organization**: [Who created/maintains this - e.g., "Bitcoin Core", "NIST", "Ethereum Foundation", "SafeScoring"]
- **First Published**: [Year if known, or "Industry standard" if unclear]
- **Status**: [Active/Draft/Superseded]
- **Type**: [Standard/Best Practice/Evaluation Criterion]

## 3. TECHNICAL SPECIFICATIONS
List the key technical requirements or parameters:
- **[Parameter 1]**: [Value/Description]
- **[Parameter 2]**: [Value/Description]
(Include actual technical details - key sizes, algorithms, thresholds, etc.)

## 4. CRYPTOGRAPHIC PRIMITIVES
List relevant cryptographic methods (if applicable):
- **[Algorithm]**: [How it's used]
(If not crypto-related, write "N/A - Not a cryptographic standard")

## 5. SECURITY PROPERTIES
What security guarantees does this provide?
- **Protects against**: [Threat 1, Threat 2]
- **Security level**: [Description]
- **Trust model**: [What assumptions]

## 6. COMPLIANCE REQUIREMENTS
What must a product do to comply?
- **MUST**: [Required capability 1]
- **MUST**: [Required capability 2]
- **SHOULD**: [Recommended capability]

## 7. DEPENDENCIES & REFERENCES
Related standards:
- **[Standard 1]**: [Relationship]
- **[Standard 2]**: [Relationship]

## 8. USE CASES
Practical applications:
- **Hardware wallets**: [How it applies]
- **Software wallets**: [How it applies]
- **Exchanges/DeFi**: [How it applies]

## 9. LIMITATIONS & WARNINGS
Known limitations or security considerations:
- [Limitation 1]
- [Warning 1]

## 10. REFERENCES
Official resources:
- [Official documentation URL if known]
- [Related specification]

IMPORTANT:
- Write factual, useful content
- Be specific with technical details
- Don't say "not specified" or "unknown" - make educated descriptions based on the title
- This content will be displayed to users evaluating crypto products
"""

PILLAR_DESCRIPTIONS = {
    'S': 'Security - Cryptographic and technical security measures',
    'A': 'Adversity - Protection against coercion and physical attacks',
    'F': 'Fidelity - Compliance, audits, and organizational trust',
    'E': 'Ecosystem - User experience, integrations, and ecosystem support'
}


class QualitySummaryGenerator:
    def __init__(self, dry_run=False):
        self.dry_run = dry_run
        self.stats = {'processed': 0, 'generated': 0, 'errors': 0}

    def get_norms_to_process(self, pillar=None, limit=None):
        """Get norms that need quality summaries."""
        all_norms = []
        offset = 0
        batch_size = 1000

        while True:
            filters = {}
            if pillar:
                filters['pillar'] = pillar

            result = db.select(
                table='norms',
                columns='id,code,title,pillar,official_link,standard_reference,official_doc_summary',
                filters=filters if filters else None,
                order='code',
                order_desc=False,
                limit=batch_size,
                offset=offset
            )

            if not result:
                break

            for norm in result:
                summary = norm.get('official_doc_summary', '') or ''
                # Need new summary if:
                # 1. Has "NEEDS MANUAL REVIEW"
                # 2. Has "does not explicitly state"
                # 3. Summary is too short
                # 4. Summary is empty
                needs_regen = (
                    'NEEDS MANUAL REVIEW' in summary or
                    'does not explicitly state' in summary or
                    'No direct quote' in summary or
                    len(summary) < 500
                )
                if needs_regen:
                    all_norms.append(norm)

            print(f"  Scanned {offset + len(result)} norms, found {len(all_norms)} needing quality summaries...")

            if len(result) < batch_size:
                break
            offset += batch_size

        if limit and len(all_norms) > limit:
            all_norms = all_norms[:limit]

        return all_norms

    def generate_summary(self, norm):
        """Generate a quality summary using AI knowledge."""
        code = norm['code']
        title = norm['title']
        pillar = norm.get('pillar', 'S')
        standard_ref = norm.get('standard_reference', '') or 'SafeScoring Criterion'

        prompt = QUALITY_SUMMARY_PROMPT.format(
            code=code,
            title=title,
            pillar=pillar,
            pillar_desc=PILLAR_DESCRIPTIONS.get(pillar, 'Security'),
            standard_ref=standard_ref
        )

        try:
            response = api.call(
                prompt=prompt,
                temperature=0.3,  # Some creativity for informative content
                max_tokens=2500
            )

            if response:
                # Clean response
                response = re.sub(r'<think>.*?</think>', '', response, flags=re.DOTALL)
                response = re.sub(r'<[^>]+>', '', response)
                response = re.sub(r'###\s*(\d+\.)', r'## \1', response)
                response = re.sub(r'^.*?(?=## 1\.)', '', response, flags=re.DOTALL)

                if len(response) > 500:
                    return response.strip()

        except Exception as e:
            print(f"  API error: {e}")

        return None

    def extract_metadata(self, summary):
        """Extract metadata from generated summary."""
        metadata = {}

        # Extract organization
        org_match = re.search(r'\*\*Organization\*\*:\s*([^\n\*]+)', summary)
        if org_match:
            org = org_match.group(1).strip()
            if org and 'unknown' not in org.lower():
                metadata['issuing_authority'] = org[:100]

        # Extract year
        year_match = re.search(r'\*\*First Published\*\*:\s*(\d{4})', summary)
        if year_match:
            metadata['standard_year'] = int(year_match.group(1))

        # Extract purpose for description
        purpose_match = re.search(r'## 1\. PURPOSE\s*\n+([^\n#]+)', summary)
        if purpose_match:
            purpose = purpose_match.group(1).strip()
            if len(purpose) > 30:
                metadata['description'] = purpose[:500]

        return metadata

    def process_norm(self, norm):
        """Process a single norm."""
        code = norm['code']
        title = norm['title']

        print(f"\nProcessing {code}: {title[:50]}...")

        summary = self.generate_summary(norm)

        if not summary:
            print(f"  Failed to generate summary")
            self.stats['errors'] += 1
            return False

        print(f"  Generated summary ({len(summary)} chars)")

        # Extract metadata
        metadata = self.extract_metadata(summary)

        # Build update data
        update_data = {
            'official_doc_summary': summary,
            'summary_status': 'complete'
        }

        if metadata.get('issuing_authority'):
            update_data['issuing_authority'] = metadata['issuing_authority']
            print(f"  Authority: {metadata['issuing_authority']}")

        if metadata.get('standard_year'):
            update_data['standard_year'] = metadata['standard_year']
            print(f"  Year: {metadata['standard_year']}")

        if metadata.get('description'):
            update_data['description'] = metadata['description']

        if not self.dry_run:
            db.update(
                table='norms',
                data=update_data,
                filters={'id': norm['id']}
            )
            print(f"  Updated database")
        else:
            print(f"  [DRY RUN] Would update database")

        self.stats['generated'] += 1
        return True

    def run(self, pillar=None, limit=None):
        """Run the quality summary generator."""
        print("=" * 60)
        print("QUALITY SUMMARY GENERATOR")
        print("=" * 60)
        print(f"Mode: {'DRY RUN' if self.dry_run else 'LIVE'}")
        print(f"Pillar: {pillar or 'ALL'}")
        print(f"Limit: {limit or 'NONE'}")
        print()

        norms = self.get_norms_to_process(pillar, limit)
        print(f"Found {len(norms)} norms needing quality summaries")

        for norm in norms:
            try:
                self.process_norm(norm)
                self.stats['processed'] += 1
            except Exception as e:
                print(f"  ERROR: {e}")
                self.stats['errors'] += 1

            time.sleep(0.5)

        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Processed: {self.stats['processed']}")
        print(f"Generated: {self.stats['generated']}")
        print(f"Errors: {self.stats['errors']}")

        return self.stats


def main():
    parser = argparse.ArgumentParser(description='Generate quality summaries')
    parser.add_argument('--pillar', choices=['S', 'A', 'F', 'E'], help='Process only this pillar')
    parser.add_argument('--limit', type=int, help='Limit number of norms')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes')

    args = parser.parse_args()

    generator = QualitySummaryGenerator(dry_run=args.dry_run)
    generator.run(pillar=args.pillar, limit=args.limit)


if __name__ == '__main__':
    main()
