#!/usr/bin/env python3
"""
Link SafeScoring criteria to related official standards.

For each criterion without an official standard, find the closest
related official standard and link to its documentation.
"""

import os
import sys
import re
import time
import json
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

# Known standards mapping - pre-defined relationships
KNOWN_MAPPINGS = {
    # Security - Cryptography
    'S01': ('NIST FIPS 197', 'https://csrc.nist.gov/publications/detail/fips/197/final', 'AES encryption standard'),
    'S02': ('NIST FIPS 180-4', 'https://csrc.nist.gov/publications/detail/fips/180/4/final', 'SHA-2 hash standard'),
    'S03': ('NIST FIPS 186-5', 'https://csrc.nist.gov/publications/detail/fips/186/5/final', 'Digital signature standard'),
    'S04': ('NIST SP 800-90A', 'https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final', 'Random number generation'),
    'S05': ('NIST SP 800-132', 'https://csrc.nist.gov/publications/detail/sp/800-132/final', 'Password-based key derivation'),

    # Security - Key Management
    'S06': ('BIP-39', 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki', 'Mnemonic seed phrases'),
    'S07': ('BIP-32', 'https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki', 'HD wallet derivation'),
    'S08': ('BIP-44', 'https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki', 'Multi-account HD wallets'),
    'S09': ('SLIP-39', 'https://github.com/satoshilabs/slips/blob/master/slip-0039.md', 'Shamir secret sharing'),
    'S10': ('BIP-85', 'https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki', 'Deterministic entropy'),

    # Security - Hardware
    'S15': ('FIPS 140-2', 'https://csrc.nist.gov/publications/detail/fips/140/2/final', 'Security requirements for crypto modules'),
    'S16': ('Common Criteria EAL5+', 'https://www.commoncriteriaportal.org/cc/', 'Security evaluation assurance'),
    'S17': ('TPM 2.0', 'https://trustedcomputinggroup.org/resource/tpm-library-specification/', 'Trusted platform module'),

    # Adversity - Anti-coercion
    'A01': ('BIP-39 Passphrase', 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki', 'Hidden wallet via passphrase'),
    'A02': ('VeraCrypt Hidden Volume', 'https://www.veracrypt.fr/en/Hidden%20Volume.html', 'Deniable encryption'),
    'A03': ('BIP-174 PSBT', 'https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki', 'Partially signed transactions'),

    # Adversity - Time-locks
    'A20': ('BIP-65 CLTV', 'https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki', 'CheckLockTimeVerify'),
    'A21': ('BIP-112 CSV', 'https://github.com/bitcoin/bips/blob/master/bip-0112.mediawiki', 'CheckSequenceVerify'),
    'A22': ('BIP-68', 'https://github.com/bitcoin/bips/blob/master/bip-0068.mediawiki', 'Relative lock-time'),

    # Fidelity - Compliance
    'F01': ('SOC 2 Type II', 'https://www.aicpa.org/resources/landing/system-and-organization-controls-soc-suite-of-services', 'Service organization controls'),
    'F02': ('ISO 27001', 'https://www.iso.org/isoiec-27001-information-security.html', 'Information security management'),
    'F03': ('GDPR', 'https://gdpr.eu/', 'Data protection regulation'),
    'F04': ('PCI DSS', 'https://www.pcisecuritystandards.org/', 'Payment card security'),

    # Ecosystem - Token Standards
    'E01': ('ERC-20', 'https://eips.ethereum.org/EIPS/eip-20', 'Fungible token standard'),
    'E02': ('ERC-721', 'https://eips.ethereum.org/EIPS/eip-721', 'Non-fungible token standard'),
    'E03': ('ERC-1155', 'https://eips.ethereum.org/EIPS/eip-1155', 'Multi-token standard'),
    'E04': ('EIP-2612', 'https://eips.ethereum.org/EIPS/eip-2612', 'Permit signatures'),
    'E05': ('EIP-4626', 'https://eips.ethereum.org/EIPS/eip-4626', 'Tokenized vault standard'),

    # DeFi Standards
    'E10': ('ERC-20', 'https://eips.ethereum.org/EIPS/eip-20', 'Token interface'),
    'E11': ('EIP-2981', 'https://eips.ethereum.org/EIPS/eip-2981', 'NFT royalty standard'),

    # Multi-sig
    'S20': ('BIP-67', 'https://github.com/bitcoin/bips/blob/master/bip-0067.mediawiki', 'Deterministic P2SH multisig'),
    'S21': ('EIP-4337', 'https://eips.ethereum.org/EIPS/eip-4337', 'Account abstraction'),

    # Authentication
    'S30': ('FIDO2/WebAuthn', 'https://www.w3.org/TR/webauthn-2/', 'Web authentication standard'),
    'S31': ('TOTP RFC 6238', 'https://datatracker.ietf.org/doc/html/rfc6238', 'Time-based OTP'),
    'S32': ('HOTP RFC 4226', 'https://datatracker.ietf.org/doc/html/rfc4226', 'HMAC-based OTP'),
}

# Standard categories for AI search
STANDARD_CATEGORIES = {
    'encryption': ['NIST FIPS', 'AES', 'ChaCha20', 'Salsa20'],
    'hashing': ['SHA-2', 'SHA-3', 'Blake2', 'Keccak'],
    'signatures': ['ECDSA', 'EdDSA', 'Schnorr', 'BLS'],
    'key_derivation': ['BIP-32', 'BIP-39', 'BIP-44', 'SLIP-39', 'Argon2', 'scrypt', 'PBKDF2'],
    'authentication': ['FIDO2', 'WebAuthn', 'TOTP', 'HOTP', 'OAuth', 'OIDC'],
    'hardware': ['FIPS 140-2', 'Common Criteria', 'TPM', 'TEE', 'SGX'],
    'compliance': ['SOC 2', 'ISO 27001', 'GDPR', 'PCI DSS', 'MiCA'],
    'transactions': ['BIP-174', 'BIP-370', 'PSBT', 'EIP-712'],
    'timelocks': ['BIP-65', 'BIP-68', 'BIP-112', 'HTLC'],
    'privacy': ['BIP-47', 'Coinjoin', 'zk-SNARKs', 'zk-STARKs', 'Tornado'],
    'tokens': ['ERC-20', 'ERC-721', 'ERC-1155', 'EIP-2612', 'EIP-4626'],
    'defi': ['EIP-4337', 'Flash loans', 'AMM', 'Compound', 'Aave'],
}


class StandardLinker:
    """Link SafeScoring criteria to related official standards."""

    def __init__(self, dry_run=False):
        self.dry_run = dry_run
        self.stats = {
            'processed': 0,
            'linked': 0,
            'unfound': 0,
            'errors': 0
        }
        self.cache_file = Path(__file__).parent / 'standard_links_cache.json'
        self.cache = self.load_cache()

    def load_cache(self):
        """Load cached standard links."""
        if self.cache_file.exists():
            try:
                return json.loads(self.cache_file.read_text())
            except Exception:
                pass
        return {}

    def save_cache(self):
        """Save standard links cache."""
        try:
            self.cache_file.write_text(json.dumps(self.cache, indent=2))
        except Exception as e:
            print(f"  Could not save cache: {e}")

    def get_norms_needing_links(self, limit=None):
        """Get norms that need official standard links."""
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

            for norm in result:
                summary = norm.get('official_doc_summary', '') or ''
                # Need linking if has NEEDS REVIEW or short summary
                if 'NEEDS MANUAL REVIEW' in summary or len(summary) < 500:
                    all_norms.append(norm)

            print(f"  Scanned {offset + len(result)} norms, found {len(all_norms)} needing links...")

            if len(result) < batch_size:
                break

            offset += batch_size

        if limit and len(all_norms) > limit:
            all_norms = all_norms[:limit]

        return all_norms

    def find_related_standard(self, code, title, pillar):
        """Find the most relevant official standard for this criterion."""
        # Check known mappings first
        if code in KNOWN_MAPPINGS:
            std_name, std_url, std_desc = KNOWN_MAPPINGS[code]
            return {
                'standard_name': std_name,
                'official_link': std_url,
                'relevance': std_desc
            }

        # Check cache
        if code in self.cache:
            return self.cache[code]

        # Use AI to find related standard
        prompt = f"""Find the most relevant official technical standard for this cryptocurrency security criterion:

Criterion Code: {code}
Criterion Title: {title}
Pillar: {pillar} ({'Security' if pillar == 'S' else 'Adversity' if pillar == 'A' else 'Fidelity' if pillar == 'F' else 'Ecosystem'})

IMPORTANT: Find a REAL, EXISTING standard. Common standards include:
- BIP (Bitcoin Improvement Proposals): BIP-32, BIP-39, BIP-44, BIP-65, BIP-174, etc.
- EIP/ERC (Ethereum): EIP-20, EIP-721, EIP-1155, EIP-2612, EIP-4626, etc.
- NIST: FIPS 140-2, FIPS 197, SP 800-53, SP 800-90A, etc.
- RFC: RFC 6238 (TOTP), RFC 4226 (HOTP), RFC 7519 (JWT), etc.
- ISO: ISO 27001, ISO 15408 (Common Criteria)
- OWASP: OWASP Top 10, ASVS, MASVS
- FIDO: FIDO2, WebAuthn, CTAP

Respond in this exact JSON format:
{{"standard_name": "BIP-39", "official_link": "https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki", "relevance": "Defines mnemonic seed phrases"}}

If no relevant standard exists, respond:
{{"standard_name": null, "official_link": null, "relevance": "No direct standard"}}
"""

        try:
            response = api.call(prompt=prompt, temperature=0.0, max_tokens=300)

            if response:
                # Extract JSON from response
                json_match = re.search(r'\{[^}]+\}', response, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group(0))
                    if result.get('standard_name') and result.get('official_link'):
                        # Cache the result
                        self.cache[code] = result
                        return result

        except Exception as e:
            print(f"  AI search error: {e}")

        return None

    def validate_url(self, url):
        """Quick validation that URL is accessible."""
        import requests

        try:
            response = requests.head(url, timeout=10, allow_redirects=True)
            return response.status_code < 400
        except Exception:
            return False

    def process_norm(self, norm):
        """Process a single norm to link it to a standard."""
        code = norm['code']
        title = norm['title']
        pillar = norm.get('pillar', 'S')

        print(f"\nProcessing {code}: {title[:50]}...")

        # Find related standard
        result = self.find_related_standard(code, title, pillar)

        if not result or not result.get('official_link'):
            print(f"  No related standard found")
            self.stats['unfound'] += 1
            return False

        std_name = result['standard_name']
        std_url = result['official_link']
        relevance = result.get('relevance', '')

        print(f"  Found: {std_name}")
        print(f"  URL: {std_url[:60]}...")
        print(f"  Relevance: {relevance}")

        # Update database
        if not self.dry_run:
            update_data = {
                'official_link': std_url,
                'standard_reference': std_name
            }

            db.update(
                table='norms',
                data=update_data,
                filters={'id': norm['id']}
            )
            print(f"  Updated official_link and standard_reference")
        else:
            print(f"  [DRY RUN] Would update links")

        self.stats['linked'] += 1
        return True

    def run(self, limit=None):
        """Run the standard linker."""
        print("=" * 60)
        print("STANDARD LINKER")
        print("=" * 60)
        print(f"Mode: {'DRY RUN' if self.dry_run else 'LIVE'}")
        print(f"Limit: {limit or 'NONE'}")
        print(f"Pre-defined mappings: {len(KNOWN_MAPPINGS)}")
        print()

        print("Finding norms needing standard links...")
        norms = self.get_norms_needing_links(limit)
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

            # Save cache periodically
            if self.stats['processed'] % 50 == 0:
                self.save_cache()

        # Final cache save
        self.save_cache()

        # Print stats
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Processed: {self.stats['processed']}")
        print(f"Linked: {self.stats['linked']}")
        print(f"Not Found: {self.stats['unfound']}")
        print(f"Errors: {self.stats['errors']}")

        if self.stats['linked'] > 0:
            print(f"\nNext step: Run regenerate_summaries_safe.py to generate summaries")

        return self.stats


def main():
    parser = argparse.ArgumentParser(description='Link SafeScoring criteria to related standards')
    parser.add_argument('--limit', type=int, help='Limit number of norms to process')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without updating DB')

    args = parser.parse_args()

    linker = StandardLinker(dry_run=args.dry_run)
    linker.run(limit=args.limit)


if __name__ == '__main__':
    main()
