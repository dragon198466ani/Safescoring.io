#!/usr/bin/env python3
"""
Regenerate norm summaries WITHOUT hallucination.

Key principles:
1. ONLY summarize from ACTUAL scraped document content
2. NEVER fall back to "AI knowledge" - mark as NEEDS_REVIEW instead
3. NO fabricated CVEs, formulas, or statistics
4. Strict evidence-based summaries only
"""

import os
import sys
import json
import hashlib
import time
import argparse
from datetime import datetime
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from src.core.api_provider import AIProvider
from src.core.database import SupabaseClient

# Initialize database client (uses requests, not supabase lib - Python 3.14 compatible)
db = SupabaseClient()

if not db.is_configured():
    print("ERROR: Missing Supabase configuration")
    sys.exit(1)

# Professional 10-chapter extraction prompt - structured, detailed, no hallucination
SAFE_SUMMARY_PROMPT = """You are a technical standards analyst. Extract and organize factual data from the document below.

DOCUMENT SOURCE:
{document_content}

STANDARD: {code} - {title}

OUTPUT FORMAT: Generate exactly 10 sections with consistent formatting. Start directly with "## 1. PURPOSE" - no preamble.

## 1. PURPOSE
Explain what this standard does. Quote the document directly:
> "exact quote from document describing purpose"

## 2. ORIGIN
Extract provenance data:
- **Date**: [exact date from document or "Not specified"]
- **Authors**: [names listed or "Not specified"]
- **Version**: [version number or "Not specified"]
- **Status**: [Draft/Final/Deployed/Superseded or "Not specified"]
- **License**: [if mentioned]
- **Organization**: [issuing body]

## 3. TECHNICAL SPECIFICATIONS
List ALL numerical values found with exact precision:
- **[parameter name]**: [exact value with units]
- Example: **Key size**: 256 bits, **Iterations**: 2048, **Block size**: 128 bits

## 4. CRYPTOGRAPHIC PRIMITIVES
List all algorithms, functions, and cryptographic methods mentioned:
- **[Algorithm name]**: [brief description from document]
- Example: **PBKDF2-HMAC-SHA512**: key derivation function

## 5. SECURITY PROPERTIES
Quote security claims from the document:
> "exact security guarantee quoted from document"
- Threat model addressed
- Attack vectors mitigated
- Trust assumptions

## 6. COMPLIANCE REQUIREMENTS
Extract normative language (MUST/SHALL/SHOULD/MAY):
- **MUST**: "[exact requirement quoted]"
- **SHOULD**: "[exact recommendation quoted]"
- **MAY**: "[exact option quoted]"

## 7. DEPENDENCIES & REFERENCES
List all external standards referenced:
- **[Standard ID]**: [Standard name] - [relationship]
- Example: **BIP-32**: HD Wallets - required dependency

## 8. USE CASES
Concrete applications mentioned in document:
- [Application 1]: [context from document]
- [Application 2]: [context from document]

## 9. LIMITATIONS & WARNINGS
Critical warnings and limitations from document:
> "exact warning quoted from document"
- Known edge cases
- Security considerations
- Deprecated features

## 10. REFERENCES
All URLs and citations from document:
- [Reference name](exact URL)
- [Document title] - [identifier]

CRITICAL RULES:
1. Start output with "## 1. PURPOSE" - no introduction text
2. Use > for direct quotes from the document
3. Use **bold** for all technical values
4. Write "[Not specified in document]" if information is missing
5. NEVER invent data - only extract what exists in the document
6. Keep consistent ## formatting for all 10 sections
"""

# Prompt for marking unscrapable norms
NEEDS_REVIEW_TEMPLATE = """[NEEDS MANUAL REVIEW]

This norm could not be automatically summarized because:
- Reason: {reason}
- Official Link: {official_link}
- Attempted: {timestamp}

To complete this summary:
1. Manually access the official document
2. Extract key requirements and specifications
3. Update this summary with verified information

Status: UNVERIFIED - DO NOT USE FOR SCORING
"""


class SafeSummaryGenerator:
    """Generate summaries only from actual document content."""

    def __init__(self, dry_run=False):
        self.api = AIProvider()
        self.dry_run = dry_run
        self.stats = {
            'processed': 0,
            'regenerated': 0,
            'fetched_web': 0,
            'needs_review': 0,
            'skipped': 0,
            'errors': 0
        }

        # Load existing scraped documents
        self.docs_dir = Path(__file__).parent.parent / "norm_docs"
        self.pdfs_dir = Path(__file__).parent.parent / "norm_pdfs"

        # Trusted domains for web fetch
        self.trusted_domains = [
            'github.com', 'nist.gov', 'ietf.org', 'owasp.org', 'w3.org',
            'eips.ethereum.org', 'bitcoin.org', 'docs.soliditylang.org',
            'csrc.nist.gov', 'nvd.nist.gov', 'cve.mitre.org',
            'datatracker.ietf.org', 'rfc-editor.org', 'commoncriteriaportal.org',
            'iso.org', 'ieee.org', 'bips.xyz', 'slip.xyz', 'ethereum.org',
            # Government/official sources
            'anssi.gouv.fr', 'cyber.gouv.fr', 'bsi.bund.de', 'enisa.europa.eu',
            # DeFi documentation
            'defillama.com', 'docs.uniswap.org', 'docs.aave.com', 'docs.compound.finance',
            # Hardware wallet vendors
            'trezor.io', 'ledger.com', 'coldcard.com', 'foundation.xyz',
            # Crypto protocols
            'docs.ethers.org', 'docs.openzeppelin.com', 'chainlink.com',
            # Standards bodies
            'www.iec.ch', 'iec.ch', 'www.astm.org', 'astm.org',
            # Privacy/anonymity
            'spec.torproject.org', 'torproject.org', 'cryptonote.org',
            # More crypto docs
            'docs.makerdao.com', 'docs.lido.fi', 'docs.curve.fi', 'nvlpubs.nist.gov',
            # Crypto security standards
            'ccss.info', 'www.ccss.info', 'cryptoconsortium.org'
        ]

    def get_norms_to_process(self, pillar=None, limit=None):
        """Get norms that need summary regeneration with pagination."""
        filters = {}
        if pillar:
            filters['pillar'] = pillar

        all_norms = []
        offset = 0
        batch_size = 1000  # Supabase max per request

        while True:
            result = db.select(
                table='norms',
                columns='id,code,title,pillar,official_link,official_doc_summary',
                filters=filters if filters else None,
                order='code',
                order_desc=False,
                limit=batch_size,
                offset=offset
            )

            if not result:
                break

            all_norms.extend(result)
            print(f"  Fetched {len(result)} norms (total: {len(all_norms)})")

            # If we got less than batch_size, we're done
            if len(result) < batch_size:
                break

            offset += batch_size

            # Safety limit to prevent infinite loops
            if offset > 5000:
                break

        # Apply user limit if specified
        if limit and len(all_norms) > limit:
            all_norms = all_norms[:limit]

        return all_norms

    def get_scraped_document(self, code):
        """Get previously scraped document content."""
        # Try HTML file
        html_path = self.docs_dir / f"{code}.html"
        if html_path.exists():
            try:
                content = html_path.read_text(encoding='utf-8')
                if len(content) > 500:  # Meaningful content
                    return content, 'html'
            except Exception as e:
                print(f"  Error reading HTML: {e}")

        # Try text file
        txt_path = self.docs_dir / f"{code}.txt"
        if txt_path.exists():
            try:
                content = txt_path.read_text(encoding='utf-8')
                if len(content) > 500:
                    return content, 'txt'
            except Exception as e:
                print(f"  Error reading TXT: {e}")

        # Try PDF extracted text
        pdf_txt_path = self.pdfs_dir / f"{code}_extracted.txt"
        if pdf_txt_path.exists():
            try:
                content = pdf_txt_path.read_text(encoding='utf-8')
                if len(content) > 500:
                    return content, 'pdf'
            except Exception as e:
                print(f"  Error reading PDF text: {e}")

        return None, None

    def fetch_from_official_link(self, norm):
        """Fetch content from the official_link if it's a trusted domain."""
        import requests
        from urllib.parse import urlparse

        official_link = norm.get('official_link')
        if not official_link:
            return None, None

        # Check if domain is trusted
        try:
            parsed = urlparse(official_link)
            domain = parsed.netloc.lower()

            is_trusted = any(td in domain for td in self.trusted_domains)
            if not is_trusted:
                print(f"  Domain not trusted: {domain}")
                return None, None

            print(f"  Fetching from: {official_link[:60]}...")

            # Fetch with timeout
            headers = {
                'User-Agent': 'Mozilla/5.0 (SafeScoring Bot - Documentation Scraper)'
            }
            response = requests.get(official_link, headers=headers, timeout=30)

            if response.status_code == 200:
                content = response.text

                # Extract text from HTML if needed
                if '<html' in content.lower() or '<body' in content.lower():
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(content, 'html.parser')

                    # Remove scripts and styles
                    for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
                        tag.decompose()

                    # Get text
                    content = soup.get_text(separator='\n', strip=True)

                if len(content) > 500:
                    return content, 'web_fetch'

            print(f"  Fetch failed: HTTP {response.status_code}")

        except Exception as e:
            print(f"  Fetch error: {e}")

        return None, None

    def validate_content_relevance(self, content, code, title):
        """Check if document content is actually relevant to the norm."""
        content_lower = content.lower()

        # Extract keywords from code and title
        keywords = []

        # From code (e.g., "BIP-39" -> ["bip", "39"])
        code_parts = code.replace('-', ' ').replace('_', ' ').lower().split()
        keywords.extend(code_parts)

        # From title
        title_words = title.lower().split()
        # Filter common words
        stopwords = {'the', 'a', 'an', 'and', 'or', 'for', 'of', 'in', 'to', 'with', 'on'}
        keywords.extend([w for w in title_words if w not in stopwords and len(w) > 2])

        # Check how many keywords appear in content
        matches = sum(1 for kw in keywords if kw in content_lower)
        match_ratio = matches / len(keywords) if keywords else 0

        # Require at least 30% keyword match
        return match_ratio >= 0.3, match_ratio

    def generate_safe_summary(self, norm, doc_content):
        """Generate summary from actual document content only."""
        # Truncate very long documents (keep first 15000 chars)
        if len(doc_content) > 15000:
            doc_content = doc_content[:15000] + "\n\n[Document truncated for processing...]"

        prompt = SAFE_SUMMARY_PROMPT.format(
            document_content=doc_content,
            code=norm['code'],
            title=norm['title']
        )

        try:
            response = self.api.call(
                prompt=prompt,
                temperature=0.0,  # Zero creativity - pure extraction
                max_tokens=3000   # More space for complete extraction
            )

            if response:
                # Clean response - remove AI thinking blocks and normalize format
                import re

                # Remove <think>...</think> blocks (some models expose reasoning)
                response = re.sub(r'<think>.*?</think>', '', response, flags=re.DOTALL)

                # Remove any other XML-like tags that shouldn't be there
                response = re.sub(r'<[^>]+>', '', response)

                # Normalize headers: ### 1. -> ## 1.
                response = re.sub(r'###\s*(\d+\.)', r'## \1', response)

                # Remove excessive dashes/separators
                response = re.sub(r'\n---+\n', '\n\n', response)

                # Remove "Here is the extracted..." preamble
                response = re.sub(r'^.*?(?=## 1\.)', '', response, flags=re.DOTALL)

                # Ensure starts with ## 1.
                if '## 1.' not in response[:50]:
                    # Try to find first section
                    match = re.search(r'(## 1\.|#+ 1\.|1\.\s+PURPOSE)', response)
                    if match:
                        response = response[match.start():]

                # Validate response doesn't contain hallucination markers
                hallucination_phrases = [
                    "CVE-20",  # Made up CVE (if not in doc)
                    "according to industry",
                    "it is well known",
                    "typically",
                    "generally",
                    "most implementations",
                    "commonly used"
                ]

                # Check if these appear but weren't in original doc
                for phrase in hallucination_phrases:
                    if phrase.lower() in response.lower() and phrase.lower() not in doc_content.lower():
                        print(f"  WARNING: Possible hallucination detected: '{phrase}'")

                return response.strip()

        except Exception as e:
            print(f"  API error: {e}")

        return None

    def mark_needs_review(self, norm, reason):
        """Mark a norm as needing manual review."""
        summary = NEEDS_REVIEW_TEMPLATE.format(
            reason=reason,
            official_link=norm.get('official_link', 'Not available'),
            timestamp=datetime.now().isoformat()
        )

        if not self.dry_run:
            db.update(
                table='norms',
                data={
                    'official_doc_summary': summary
                },
                filters={'id': norm['id']}
            )

        self.stats['needs_review'] += 1
        return summary

    def process_norm(self, norm):
        """Process a single norm."""
        code = norm['code']
        title = norm['title']

        print(f"\nProcessing {code}: {title[:50]}...")

        # Get scraped document
        doc_content, doc_type = self.get_scraped_document(code)

        # If no local document, try fetching from official link
        if not doc_content:
            print(f"  No local document, trying web fetch...")
            doc_content, doc_type = self.fetch_from_official_link(norm)

            if doc_content:
                self.stats['fetched_web'] += 1
                # Save fetched content locally for future use
                try:
                    save_path = self.docs_dir / f"{code}.txt"
                    save_path.write_text(doc_content[:50000], encoding='utf-8')
                    print(f"  Saved fetched content to {save_path.name}")
                except Exception as e:
                    print(f"  Could not save: {e}")

        if not doc_content:
            print(f"  No document available (local or web)")
            self.mark_needs_review(norm, "No document available - needs manual fetch")
            return

        print(f"  Found {doc_type} document ({len(doc_content)} chars)")

        # Validate relevance
        is_relevant, match_ratio = self.validate_content_relevance(doc_content, code, title)

        if not is_relevant:
            print(f"  Document not relevant (match ratio: {match_ratio:.1%})")
            self.mark_needs_review(norm, f"Scraped document not relevant (match: {match_ratio:.1%})")
            return

        print(f"  Document relevance: {match_ratio:.1%}")

        # Generate safe summary
        summary = self.generate_safe_summary(norm, doc_content)

        if not summary:
            print(f"  Failed to generate summary")
            self.mark_needs_review(norm, "AI summary generation failed")
            return

        print(f"  Generated summary ({len(summary)} chars)")

        # Extract metadata from summary
        metadata = self.extract_metadata_from_summary(summary)

        # Build update data with all columns
        update_data = {
            'official_doc_summary': summary,
            'summary_status': 'complete'
        }

        # Add extracted metadata if found
        if metadata.get('year'):
            update_data['standard_year'] = metadata['year']
            print(f"  Extracted year: {metadata['year']}")

        if metadata.get('organization'):
            update_data['issuing_authority'] = metadata['organization']
            print(f"  Extracted authority: {metadata['organization']}")

        if metadata.get('purpose') and len(metadata['purpose']) > 20:
            # Use purpose as description (max 500 chars)
            update_data['description'] = metadata['purpose'][:500]
            print(f"  Extracted description: {len(metadata['purpose'])} chars")

        # Update database with all columns
        if not self.dry_run:
            db.update(
                table='norms',
                data=update_data,
                filters={'id': norm['id']}
            )
            print(f"  Updated {len(update_data)} columns in database")
        else:
            print(f"  [DRY RUN] Would update {len(update_data)} columns")

        self.stats['regenerated'] += 1

    def extract_metadata_from_summary(self, summary):
        """Extract structured metadata from the generated summary."""
        import re
        metadata = {}

        # Extract year from ## 2. ORIGIN section
        # Look for patterns like "**Date**: 2013-09-10" or "**Date**: June 2017"
        date_match = re.search(r'\*\*Date\*\*:\s*(\d{4})', summary)
        if date_match:
            metadata['year'] = int(date_match.group(1))
        else:
            # Try other date patterns
            year_match = re.search(r'(\d{4})-\d{2}-\d{2}', summary)
            if year_match:
                metadata['year'] = int(year_match.group(1))

        # Extract organization from ## 2. ORIGIN section
        org_match = re.search(r'\*\*Organization\*\*:\s*([^\n\*]+)', summary)
        if org_match and 'Not specified' not in org_match.group(1):
            metadata['organization'] = org_match.group(1).strip()
        else:
            # Try to get from Authors if organization not found
            authors_match = re.search(r'\*\*Authors\*\*:\s*([^\n]+)', summary)
            if authors_match and 'Not specified' not in authors_match.group(1):
                # Extract first author's organization or use author names
                authors = authors_match.group(1).strip()
                if len(authors) < 100:
                    metadata['organization'] = authors[:100]

        # Extract purpose from ## 1. PURPOSE section
        purpose_match = re.search(r'## 1\. PURPOSE\s*\n+>\s*"([^"]+)"', summary)
        if purpose_match:
            metadata['purpose'] = purpose_match.group(1).strip()
        else:
            # Try without quotes
            purpose_match2 = re.search(r'## 1\. PURPOSE\s*\n+([^\n#]+)', summary)
            if purpose_match2:
                purpose_text = purpose_match2.group(1).strip()
                if not purpose_text.startswith('[') and len(purpose_text) > 20:
                    metadata['purpose'] = purpose_text

        return metadata

    def run(self, pillar=None, limit=None):
        """Run the safe summary regeneration."""
        print("=" * 60)
        print("SAFE SUMMARY REGENERATION")
        print("=" * 60)
        print(f"Mode: {'DRY RUN' if self.dry_run else 'LIVE'}")
        print(f"Pillar filter: {pillar or 'ALL'}")
        print(f"Limit: {limit or 'NONE'}")
        print()

        norms = self.get_norms_to_process(pillar, limit)
        print(f"Found {len(norms)} norms to process")

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
        print(f"Regenerated: {self.stats['regenerated']}")
        print(f"Fetched from web: {self.stats['fetched_web']}")
        print(f"Needs Review: {self.stats['needs_review']}")
        print(f"Errors: {self.stats['errors']}")

        return self.stats


def main():
    parser = argparse.ArgumentParser(description='Regenerate norm summaries safely')
    parser.add_argument('--pillar', choices=['S', 'A', 'F', 'E'], help='Process only this pillar')
    parser.add_argument('--limit', type=int, help='Limit number of norms to process')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without updating DB')

    args = parser.parse_args()

    generator = SafeSummaryGenerator(dry_run=args.dry_run)
    generator.run(pillar=args.pillar, limit=args.limit)


if __name__ == '__main__':
    main()
