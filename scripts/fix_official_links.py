#!/usr/bin/env python3
"""
Fix official_link for norms that failed document validation.

This script:
1. Finds norms with "NEEDS MANUAL REVIEW" in their summary
2. Uses pattern matching to find correct official document URLs
3. Validates URLs are accessible and relevant
4. Updates official_link in Supabase
"""

import os
import sys
import re
import time
import argparse
import requests
from pathlib import Path
from urllib.parse import urlparse, quote

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from src.core.database import SupabaseClient
from src.core.api_provider import AIProvider

# Initialize
db = SupabaseClient()
api = AIProvider()

if not db.is_configured():
    print("ERROR: Missing Supabase configuration")
    sys.exit(1)

# Known URL patterns for standards
URL_PATTERNS = {
    # Bitcoin Improvement Proposals
    'BIP': 'https://github.com/bitcoin/bips/blob/master/bip-{num:04d}.mediawiki',
    'S-BIP': 'https://github.com/bitcoin/bips/blob/master/bip-{num:04d}.mediawiki',
    'A-BIP': 'https://github.com/bitcoin/bips/blob/master/bip-{num:04d}.mediawiki',
    'F-BIP': 'https://github.com/bitcoin/bips/blob/master/bip-{num:04d}.mediawiki',
    'E-BIP': 'https://github.com/bitcoin/bips/blob/master/bip-{num:04d}.mediawiki',

    # Ethereum Improvement Proposals
    'EIP': 'https://eips.ethereum.org/EIPS/eip-{num}',
    'S-EIP': 'https://eips.ethereum.org/EIPS/eip-{num}',
    'E-EIP': 'https://eips.ethereum.org/EIPS/eip-{num}',
    'F-EIP': 'https://eips.ethereum.org/EIPS/eip-{num}',

    # Ethereum Request for Comments
    'ERC': 'https://eips.ethereum.org/EIPS/eip-{num}',
    'S-ERC': 'https://eips.ethereum.org/EIPS/eip-{num}',
    'E-ERC': 'https://eips.ethereum.org/EIPS/eip-{num}',

    # SLIP (SatoshiLabs Improvement Proposals)
    'SLIP': 'https://github.com/satoshilabs/slips/blob/master/slip-{num:04d}.md',
    'S-SLIP': 'https://github.com/satoshilabs/slips/blob/master/slip-{num:04d}.md',

    # NIST Special Publications
    'NIST-SP': 'https://csrc.nist.gov/publications/detail/sp/{num}/final',
    'S-NIST-SP': 'https://csrc.nist.gov/publications/detail/sp/{num}/final',

    # NIST FIPS
    'FIPS': 'https://csrc.nist.gov/publications/detail/fips/{num}/final',
    'S-FIPS': 'https://csrc.nist.gov/publications/detail/fips/{num}/final',

    # RFC (IETF)
    'RFC': 'https://datatracker.ietf.org/doc/html/rfc{num}',
    'S-RFC': 'https://datatracker.ietf.org/doc/html/rfc{num}',

    # OWASP
    'OWASP': 'https://owasp.org/www-project-{slug}/',
    'S-OWASP': 'https://owasp.org/www-project-{slug}/',

    # Common Criteria
    'CC-EAL': 'https://www.commoncriteriaportal.org/files/epfiles/',

    # ISO standards (note: often behind paywall)
    'ISO': 'https://www.iso.org/standard/{num}.html',
    'S-ISO': 'https://www.iso.org/standard/{num}.html',

    # CWE (Common Weakness Enumeration)
    'CWE': 'https://cwe.mitre.org/data/definitions/{num}.html',
    'S-CWE': 'https://cwe.mitre.org/data/definitions/{num}.html',
}

# Alternative patterns for specific standards
ALTERNATIVE_URLS = {
    # BIP alternatives
    'BIP-39': 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki',
    'BIP-32': 'https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki',
    'BIP-44': 'https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki',
    'BIP-141': 'https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki',
    'BIP-174': 'https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki',
    'BIP-340': 'https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki',

    # Common EIPs
    'EIP-20': 'https://eips.ethereum.org/EIPS/eip-20',
    'EIP-721': 'https://eips.ethereum.org/EIPS/eip-721',
    'EIP-1155': 'https://eips.ethereum.org/EIPS/eip-1155',
    'EIP-2612': 'https://eips.ethereum.org/EIPS/eip-2612',
    'EIP-4626': 'https://eips.ethereum.org/EIPS/eip-4626',

    # FIDO Alliance
    'FIDO2': 'https://fidoalliance.org/specs/fido-v2.0-ps-20190130/fido-client-to-authenticator-protocol-v2.0-ps-20190130.html',
    'A-FIDO2': 'https://fidoalliance.org/specs/fido-v2.0-ps-20190130/fido-client-to-authenticator-protocol-v2.0-ps-20190130.html',
    'CTAP': 'https://fidoalliance.org/specs/fido-v2.0-ps-20190130/fido-client-to-authenticator-protocol-v2.0-ps-20190130.html',

    # WebAuthn
    'WebAuthn': 'https://www.w3.org/TR/webauthn-2/',
    'S-WebAuthn': 'https://www.w3.org/TR/webauthn-2/',

    # Common Criteria
    'CC-EAL5': 'https://www.commoncriteriaportal.org/cc/',
    'CC-EAL6': 'https://www.commoncriteriaportal.org/cc/',

    # CCSS
    'CCSS': 'https://cryptoconsortium.github.io/CCSS/',
    'S-CCSS': 'https://cryptoconsortium.github.io/CCSS/',
    'F-CCSS': 'https://cryptoconsortium.github.io/CCSS/',
}


class OfficialLinkFixer:
    """Fix official_link for norms that need review."""

    def __init__(self, dry_run=False):
        self.dry_run = dry_run
        self.stats = {
            'processed': 0,
            'fixed': 0,
            'unfixable': 0,
            'errors': 0
        }

        # User agent for requests
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (SafeScoring Bot - Documentation Validator)'
        }

    def get_norms_needing_review(self, limit=None):
        """Get norms with NEEDS MANUAL REVIEW in summary."""
        all_norms = []
        offset = 0
        batch_size = 1000

        while True:
            result = db.select(
                table='norms',
                columns='id,code,title,pillar,official_link,official_doc_summary',
                order='code',
                order_desc=False,
                limit=batch_size,
                offset=offset
            )

            if not result:
                break

            # Filter to only norms needing review
            for norm in result:
                summary = norm.get('official_doc_summary', '') or ''
                if 'NEEDS MANUAL REVIEW' in summary or 'NEEDS_REVIEW' in summary:
                    all_norms.append(norm)

            print(f"  Scanned {offset + len(result)} norms, found {len(all_norms)} needing review...")

            if len(result) < batch_size:
                break

            offset += batch_size

            if offset > 5000:
                break

        if limit and len(all_norms) > limit:
            all_norms = all_norms[:limit]

        return all_norms

    def extract_standard_number(self, code):
        """Extract numeric part from standard code."""
        # Try to find number in code
        # Examples: BIP-39, EIP-721, NIST-SP-800-53, RFC-7519

        # Pattern 1: CODE-NUMBER (e.g., BIP-39)
        match = re.search(r'-(\d+)$', code)
        if match:
            return match.group(1)

        # Pattern 2: CODE-XX-NUMBER (e.g., NIST-SP-800-53)
        match = re.search(r'-(\d+-\d+)$', code)
        if match:
            return match.group(1)

        # Pattern 3: Numbers anywhere
        match = re.search(r'(\d+)', code)
        if match:
            return match.group(1)

        return None

    def build_url_from_pattern(self, code, title):
        """Build URL using known patterns."""
        # Check direct alternatives first
        for alt_code, alt_url in ALTERNATIVE_URLS.items():
            if alt_code in code:
                return alt_url

        # Extract standard type and number
        num = self.extract_standard_number(code)

        # Try pattern matching
        for pattern_key, url_template in URL_PATTERNS.items():
            if pattern_key in code.upper():
                if num:
                    try:
                        if '{num:04d}' in url_template:
                            url = url_template.format(num=int(num))
                        elif '{num}' in url_template:
                            url = url_template.format(num=num)
                        elif '{slug}' in url_template:
                            # Convert title to slug
                            slug = title.lower().replace(' ', '-').replace('_', '-')
                            slug = re.sub(r'[^a-z0-9-]', '', slug)
                            url = url_template.format(slug=slug)
                        else:
                            url = url_template
                        return url
                    except Exception:
                        pass

        return None

    def search_for_official_url(self, code, title):
        """Use AI to search for the correct official URL."""
        search_prompt = f"""Find the official documentation URL for this technical standard:

Code: {code}
Title: {title}

Return ONLY the direct URL to the official specification document.
Prefer these sources:
- BIP: github.com/bitcoin/bips
- EIP/ERC: eips.ethereum.org
- NIST: csrc.nist.gov or nvlpubs.nist.gov
- RFC: datatracker.ietf.org
- ISO: iso.org
- OWASP: owasp.org
- W3C: w3.org/TR/
- FIDO: fidoalliance.org/specs

If this is not a real standard or you cannot find an official URL, respond with: NOT_FOUND

Response format: Just the URL or NOT_FOUND, nothing else."""

        try:
            response = api.call(
                prompt=search_prompt,
                temperature=0.0,
                max_tokens=500
            )

            if response:
                response = response.strip()

                # Check for NOT_FOUND
                if 'NOT_FOUND' in response.upper():
                    return None

                # Extract URL from response
                url_match = re.search(r'https?://[^\s<>"\']+', response)
                if url_match:
                    return url_match.group(0).rstrip('.,;:)')

        except Exception as e:
            print(f"  AI search error: {e}")

        return None

    def validate_url(self, url, code, title):
        """Validate URL is accessible and contains relevant content."""
        if not url:
            return False, "No URL"

        try:
            response = requests.get(url, headers=self.headers, timeout=15, allow_redirects=True)

            if response.status_code == 200:
                content = response.text.lower()

                # Check if content is relevant
                code_lower = code.lower()
                title_words = [w.lower() for w in title.split() if len(w) > 3]

                # Check for code or title keywords
                code_found = any(part in content for part in code_lower.split('-') if len(part) > 2)
                title_found = sum(1 for w in title_words if w in content) >= len(title_words) * 0.3

                if code_found or title_found:
                    return True, "Valid"
                else:
                    return False, "Content not relevant"

            elif response.status_code == 403:
                # Might be behind auth/paywall but URL exists
                return True, "Access restricted (paywall)"

            else:
                return False, f"HTTP {response.status_code}"

        except requests.exceptions.Timeout:
            return False, "Timeout"
        except Exception as e:
            return False, str(e)[:50]

    def process_norm(self, norm):
        """Process a single norm to fix its official_link."""
        code = norm['code']
        title = norm['title']
        current_link = norm.get('official_link', '')

        print(f"\nProcessing {code}: {title[:50]}...")

        # Step 1: Try pattern matching
        pattern_url = self.build_url_from_pattern(code, title)

        if pattern_url:
            is_valid, reason = self.validate_url(pattern_url, code, title)
            if is_valid:
                print(f"  Pattern match: {pattern_url[:60]}...")
                print(f"  Validation: {reason}")

                if not self.dry_run:
                    db.update(
                        table='norms',
                        data={'official_link': pattern_url},
                        filters={'id': norm['id']}
                    )
                    print(f"  Updated official_link")
                else:
                    print(f"  [DRY RUN] Would update official_link")

                self.stats['fixed'] += 1
                return True

        # Step 2: Try AI search
        print(f"  Pattern failed, trying AI search...")
        ai_url = self.search_for_official_url(code, title)

        if ai_url:
            is_valid, reason = self.validate_url(ai_url, code, title)
            if is_valid:
                print(f"  AI found: {ai_url[:60]}...")
                print(f"  Validation: {reason}")

                if not self.dry_run:
                    db.update(
                        table='norms',
                        data={'official_link': ai_url},
                        filters={'id': norm['id']}
                    )
                    print(f"  Updated official_link")
                else:
                    print(f"  [DRY RUN] Would update official_link")

                self.stats['fixed'] += 1
                return True

        # Step 3: Could not fix
        print(f"  Could not find valid official URL")
        self.stats['unfixable'] += 1
        return False

    def run(self, limit=None):
        """Run the official link fixer."""
        print("=" * 60)
        print("OFFICIAL LINK FIXER")
        print("=" * 60)
        print(f"Mode: {'DRY RUN' if self.dry_run else 'LIVE'}")
        print(f"Limit: {limit or 'NONE'}")
        print()

        print("Finding norms needing review...")
        norms = self.get_norms_needing_review(limit)
        print(f"Found {len(norms)} norms to fix")

        for norm in norms:
            try:
                self.process_norm(norm)
                self.stats['processed'] += 1
            except Exception as e:
                print(f"  ERROR: {e}")
                self.stats['errors'] += 1

            # Rate limiting
            time.sleep(1)

        # Print stats
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Processed: {self.stats['processed']}")
        print(f"Fixed: {self.stats['fixed']}")
        print(f"Unfixable: {self.stats['unfixable']}")
        print(f"Errors: {self.stats['errors']}")

        if self.stats['fixed'] > 0:
            print(f"\nNext step: Run regenerate_summaries_safe.py to generate summaries for fixed norms")

        return self.stats


def main():
    parser = argparse.ArgumentParser(description='Fix official_link for norms needing review')
    parser.add_argument('--limit', type=int, help='Limit number of norms to process')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without updating DB')

    args = parser.parse_args()

    fixer = OfficialLinkFixer(dry_run=args.dry_run)
    fixer.run(limit=args.limit)


if __name__ == '__main__':
    main()
