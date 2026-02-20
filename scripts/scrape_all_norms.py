#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAFESCORING.IO - Complete Norm Documentation Scraper
Fetches official documentation for ALL norms and stores in Supabase.

USAGE:
    python scripts/scrape_all_norms.py [--limit N] [--seed-only] [--scrape-only]

This script:
1. Seeds official_link for ALL known standards (BIP, EIP, SLIP, RFC, NIST, etc.)
2. Scrapes documentation content from each source
3. Generates AI summaries (8000-10000 words)
4. Stores everything in Supabase norms table

SOURCES SUPPORTED:
- GitHub (BIP, SLIP, standards repos)
- Ethereum (EIP, ERC)
- IETF (RFC)
- NIST (SP, FIPS)
- W3C specifications
- OWASP (MASVS, ASVS)
- Common Criteria
- ISO (reference only - paid)
"""

import requests
import time
import re
import sys
import os
import argparse
from urllib.parse import urlparse

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.config import SUPABASE_URL, get_supabase_headers
from src.core.api_provider import AIProvider
from src.core.cache_manager import get_response_cache


# =============================================================================
# OFFICIAL LINKS DATABASE - Complete mapping of norm codes to official URLs
# =============================================================================

OFFICIAL_LINKS = {
    # =========================================================================
    # BIP - Bitcoin Improvement Proposals
    # =========================================================================
    'BIP-32': {
        'url': 'https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki',
        'patterns': ['BIP32', 'BIP-32', 'hierarchical deterministic', 'HD wallet'],
        'access': 'G'
    },
    'BIP-39': {
        'url': 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki',
        'patterns': ['BIP39', 'BIP-39', 'mnemonic', 'seed phrase', '24 words', '12 words'],
        'access': 'G'
    },
    'BIP-44': {
        'url': 'https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki',
        'patterns': ['BIP44', 'BIP-44', 'multi-account', 'derivation path'],
        'access': 'G'
    },
    'BIP-49': {
        'url': 'https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki',
        'patterns': ['BIP49', 'BIP-49', 'P2WPKH-nested', 'SegWit'],
        'access': 'G'
    },
    'BIP-84': {
        'url': 'https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki',
        'patterns': ['BIP84', 'BIP-84', 'native SegWit', 'bc1'],
        'access': 'G'
    },
    'BIP-85': {
        'url': 'https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki',
        'patterns': ['BIP85', 'BIP-85', 'deterministic entropy'],
        'access': 'G'
    },
    'BIP-86': {
        'url': 'https://github.com/bitcoin/bips/blob/master/bip-0086.mediawiki',
        'patterns': ['BIP86', 'BIP-86', 'Taproot', 'P2TR'],
        'access': 'G'
    },
    'BIP-141': {
        'url': 'https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki',
        'patterns': ['BIP141', 'BIP-141', 'Segregated Witness'],
        'access': 'G'
    },
    'BIP-143': {
        'url': 'https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki',
        'patterns': ['BIP143', 'BIP-143', 'transaction digest'],
        'access': 'G'
    },
    'BIP-174': {
        'url': 'https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki',
        'patterns': ['BIP174', 'BIP-174', 'PSBT', 'Partially Signed'],
        'access': 'G'
    },
    'BIP-340': {
        'url': 'https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki',
        'patterns': ['BIP340', 'BIP-340', 'Schnorr'],
        'access': 'G'
    },
    'BIP-341': {
        'url': 'https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki',
        'patterns': ['BIP341', 'BIP-341', 'Taproot'],
        'access': 'G'
    },

    # =========================================================================
    # SLIP - SatoshiLabs Improvement Proposals
    # =========================================================================
    'SLIP-10': {
        'url': 'https://github.com/satoshilabs/slips/blob/master/slip-0010.md',
        'patterns': ['SLIP10', 'SLIP-10', 'Universal HD', 'ed25519'],
        'access': 'G'
    },
    'SLIP-39': {
        'url': 'https://github.com/satoshilabs/slips/blob/master/slip-0039.md',
        'patterns': ['SLIP39', 'SLIP-39', 'Shamir', 'backup shares'],
        'access': 'G'
    },
    'SLIP-44': {
        'url': 'https://github.com/satoshilabs/slips/blob/master/slip-0044.md',
        'patterns': ['SLIP44', 'SLIP-44', 'coin types', 'registered coins'],
        'access': 'G'
    },

    # =========================================================================
    # EIP/ERC - Ethereum Improvement Proposals
    # =========================================================================
    'EIP-155': {
        'url': 'https://eips.ethereum.org/EIPS/eip-155',
        'patterns': ['EIP155', 'EIP-155', 'replay protection', 'chain ID'],
        'access': 'G'
    },
    'EIP-191': {
        'url': 'https://eips.ethereum.org/EIPS/eip-191',
        'patterns': ['EIP191', 'EIP-191', 'signed data'],
        'access': 'G'
    },
    'EIP-712': {
        'url': 'https://eips.ethereum.org/EIPS/eip-712',
        'patterns': ['EIP712', 'EIP-712', 'typed data', 'structured data signing'],
        'access': 'G'
    },
    'EIP-1559': {
        'url': 'https://eips.ethereum.org/EIPS/eip-1559',
        'patterns': ['EIP1559', 'EIP-1559', 'fee market', 'base fee'],
        'access': 'G'
    },
    'EIP-2612': {
        'url': 'https://eips.ethereum.org/EIPS/eip-2612',
        'patterns': ['EIP2612', 'EIP-2612', 'permit', 'gasless approval'],
        'access': 'G'
    },
    'EIP-2930': {
        'url': 'https://eips.ethereum.org/EIPS/eip-2930',
        'patterns': ['EIP2930', 'EIP-2930', 'access list'],
        'access': 'G'
    },
    'EIP-4337': {
        'url': 'https://eips.ethereum.org/EIPS/eip-4337',
        'patterns': ['EIP4337', 'EIP-4337', 'account abstraction', 'smart account'],
        'access': 'G'
    },
    'EIP-4844': {
        'url': 'https://eips.ethereum.org/EIPS/eip-4844',
        'patterns': ['EIP4844', 'EIP-4844', 'blob', 'proto-danksharding'],
        'access': 'G'
    },
    'ERC-20': {
        'url': 'https://eips.ethereum.org/EIPS/eip-20',
        'patterns': ['ERC20', 'ERC-20', 'token standard'],
        'access': 'G'
    },
    'ERC-721': {
        'url': 'https://eips.ethereum.org/EIPS/eip-721',
        'patterns': ['ERC721', 'ERC-721', 'NFT', 'non-fungible'],
        'access': 'G'
    },
    'ERC-1155': {
        'url': 'https://eips.ethereum.org/EIPS/eip-1155',
        'patterns': ['ERC1155', 'ERC-1155', 'multi-token'],
        'access': 'G'
    },

    # =========================================================================
    # NIST - National Institute of Standards and Technology
    # =========================================================================
    'NIST-SP-800-38D': {
        'url': 'https://csrc.nist.gov/publications/detail/sp/800-38d/final',
        'patterns': ['800-38D', 'GCM', 'Galois Counter Mode'],
        'access': 'G'
    },
    'NIST-SP-800-57': {
        'url': 'https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final',
        'patterns': ['800-57', 'key management', 'cryptographic keys'],
        'access': 'G'
    },
    'NIST-SP-800-90A': {
        'url': 'https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final',
        'patterns': ['800-90A', 'DRBG', 'random bit generator'],
        'access': 'G'
    },
    'NIST-SP-800-90B': {
        'url': 'https://csrc.nist.gov/publications/detail/sp/800-90b/final',
        'patterns': ['800-90B', 'entropy source'],
        'access': 'G'
    },
    'NIST-SP-800-132': {
        'url': 'https://csrc.nist.gov/publications/detail/sp/800-132/final',
        'patterns': ['800-132', 'password-based', 'PBKDF'],
        'access': 'G'
    },
    'NIST-SP-800-185': {
        'url': 'https://csrc.nist.gov/publications/detail/sp/800-185/final',
        'patterns': ['800-185', 'SHA-3', 'cSHAKE', 'KMAC'],
        'access': 'G'
    },
    'FIPS-140-3': {
        'url': 'https://csrc.nist.gov/publications/detail/fips/140/3/final',
        'patterns': ['FIPS 140', 'FIPS-140', 'cryptographic module'],
        'access': 'G'
    },
    'FIPS-180-4': {
        'url': 'https://csrc.nist.gov/publications/detail/fips/180/4/final',
        'patterns': ['FIPS 180', 'FIPS-180', 'SHA-1', 'SHA-256', 'SHA-512'],
        'access': 'G'
    },
    'FIPS-186-5': {
        'url': 'https://csrc.nist.gov/publications/detail/fips/186/5/final',
        'patterns': ['FIPS 186', 'FIPS-186', 'digital signature', 'DSA', 'ECDSA'],
        'access': 'G'
    },
    'FIPS-197': {
        'url': 'https://csrc.nist.gov/publications/detail/fips/197/final',
        'patterns': ['FIPS 197', 'FIPS-197', 'AES', 'Advanced Encryption'],
        'access': 'G'
    },
    'FIPS-198-1': {
        'url': 'https://csrc.nist.gov/publications/detail/fips/198/1/final',
        'patterns': ['FIPS 198', 'FIPS-198', 'HMAC'],
        'access': 'G'
    },
    'FIPS-202': {
        'url': 'https://csrc.nist.gov/publications/detail/fips/202/final',
        'patterns': ['FIPS 202', 'FIPS-202', 'SHA-3', 'Keccak'],
        'access': 'G'
    },

    # =========================================================================
    # RFC - IETF Request for Comments
    # =========================================================================
    'RFC-2104': {
        'url': 'https://datatracker.ietf.org/doc/html/rfc2104',
        'patterns': ['RFC 2104', 'RFC2104', 'HMAC'],
        'access': 'G'
    },
    'RFC-3447': {
        'url': 'https://datatracker.ietf.org/doc/html/rfc3447',
        'patterns': ['RFC 3447', 'RFC3447', 'RSA', 'PKCS #1'],
        'access': 'G'
    },
    'RFC-4648': {
        'url': 'https://datatracker.ietf.org/doc/html/rfc4648',
        'patterns': ['RFC 4648', 'RFC4648', 'Base16', 'Base32', 'Base64'],
        'access': 'G'
    },
    'RFC-5869': {
        'url': 'https://datatracker.ietf.org/doc/html/rfc5869',
        'patterns': ['RFC 5869', 'RFC5869', 'HKDF', 'key derivation'],
        'access': 'G'
    },
    'RFC-6090': {
        'url': 'https://datatracker.ietf.org/doc/html/rfc6090',
        'patterns': ['RFC 6090', 'RFC6090', 'elliptic curve'],
        'access': 'G'
    },
    'RFC-6238': {
        'url': 'https://datatracker.ietf.org/doc/html/rfc6238',
        'patterns': ['RFC 6238', 'RFC6238', 'TOTP', 'time-based OTP'],
        'access': 'G'
    },
    'RFC-6979': {
        'url': 'https://datatracker.ietf.org/doc/html/rfc6979',
        'patterns': ['RFC 6979', 'RFC6979', 'deterministic DSA', 'deterministic ECDSA'],
        'access': 'G'
    },
    'RFC-7748': {
        'url': 'https://datatracker.ietf.org/doc/html/rfc7748',
        'patterns': ['RFC 7748', 'RFC7748', 'Curve25519', 'X25519'],
        'access': 'G'
    },
    'RFC-8017': {
        'url': 'https://datatracker.ietf.org/doc/html/rfc8017',
        'patterns': ['RFC 8017', 'RFC8017', 'PKCS #1', 'RSA v2.2'],
        'access': 'G'
    },
    'RFC-8032': {
        'url': 'https://datatracker.ietf.org/doc/html/rfc8032',
        'patterns': ['RFC 8032', 'RFC8032', 'Ed25519', 'EdDSA'],
        'access': 'G'
    },
    'RFC-8446': {
        'url': 'https://datatracker.ietf.org/doc/html/rfc8446',
        'patterns': ['RFC 8446', 'RFC8446', 'TLS 1.3'],
        'access': 'G'
    },
    'RFC-9000': {
        'url': 'https://datatracker.ietf.org/doc/html/rfc9000',
        'patterns': ['RFC 9000', 'RFC9000', 'QUIC'],
        'access': 'G'
    },

    # =========================================================================
    # Post-Quantum Cryptography (NIST PQC)
    # =========================================================================
    'PQC-KYBER': {
        'url': 'https://pq-crystals.org/kyber/',
        'patterns': ['Kyber', 'ML-KEM', 'post-quantum KEM'],
        'access': 'G'
    },
    'PQC-DILITHIUM': {
        'url': 'https://pq-crystals.org/dilithium/',
        'patterns': ['Dilithium', 'ML-DSA', 'post-quantum signature'],
        'access': 'G'
    },
    'PQC-SPHINCS': {
        'url': 'https://sphincs.org/',
        'patterns': ['SPHINCS', 'SLH-DSA', 'hash-based signature'],
        'access': 'G'
    },
    'PQC-FALCON': {
        'url': 'https://falcon-sign.info/',
        'patterns': ['Falcon', 'FN-DSA', 'lattice signature'],
        'access': 'G'
    },

    # =========================================================================
    # Zero-Knowledge Proofs
    # =========================================================================
    'ZK-GROTH16': {
        'url': 'https://eprint.iacr.org/2016/260',
        'patterns': ['Groth16', 'zk-SNARK', 'pairing-based'],
        'access': 'G'
    },
    'ZK-PLONK': {
        'url': 'https://eprint.iacr.org/2019/953',
        'patterns': ['PLONK', 'universal SNARK'],
        'access': 'G'
    },
    'ZK-STARK': {
        'url': 'https://eprint.iacr.org/2018/046',
        'patterns': ['STARK', 'transparent', 'post-quantum ZK'],
        'access': 'G'
    },

    # =========================================================================
    # Common Criteria & Certifications
    # =========================================================================
    'CC-EAL5': {
        'url': 'https://www.commoncriteriaportal.org/cc/',
        'patterns': ['EAL5', 'Common Criteria', 'semiformally'],
        'access': 'G'
    },
    'CC-EAL6': {
        'url': 'https://www.commoncriteriaportal.org/cc/',
        'patterns': ['EAL6', 'semiformal verification'],
        'access': 'G'
    },

    # =========================================================================
    # OWASP Standards
    # =========================================================================
    'OWASP-MASVS': {
        'url': 'https://mas.owasp.org/MASVS/',
        'patterns': ['MASVS', 'Mobile Application Security', 'mobile security'],
        'access': 'G'
    },
    'OWASP-ASVS': {
        'url': 'https://owasp.org/www-project-application-security-verification-standard/',
        'patterns': ['ASVS', 'Application Security Verification'],
        'access': 'G'
    },
    'OWASP-SCSVS': {
        'url': 'https://owasp.org/www-project-smart-contract-security-verification-standard/',
        'patterns': ['SCSVS', 'Smart Contract Security'],
        'access': 'G'
    },

    # =========================================================================
    # Secure Element Standards
    # =========================================================================
    'GLOBALPLATFORM': {
        'url': 'https://globalplatform.org/specs-library/',
        'patterns': ['GlobalPlatform', 'Secure Element', 'TEE'],
        'access': 'G'
    },
    'JAVACARD': {
        'url': 'https://www.oracle.com/java/technologies/javacard-downloads.html',
        'patterns': ['JavaCard', 'Java Card', 'smart card applet'],
        'access': 'G'
    },

    # =========================================================================
    # ISO Standards (Reference only - Paid)
    # =========================================================================
    'ISO-27001': {
        'url': 'https://www.iso.org/standard/27001',
        'patterns': ['ISO 27001', 'ISO/IEC 27001', 'ISMS'],
        'access': 'P'
    },
    'ISO-27002': {
        'url': 'https://www.iso.org/standard/75652.html',
        'patterns': ['ISO 27002', 'ISO/IEC 27002', 'security controls'],
        'access': 'P'
    },
    'ISO-27017': {
        'url': 'https://www.iso.org/standard/43757.html',
        'patterns': ['ISO 27017', 'cloud security'],
        'access': 'P'
    },
    'ISO-27701': {
        'url': 'https://www.iso.org/standard/71670.html',
        'patterns': ['ISO 27701', 'privacy', 'PIMS'],
        'access': 'P'
    },
}


class FullNormScraper:
    """
    Complete norm documentation scraper.
    Seeds official links + scrapes content + generates AI summaries.
    """

    def __init__(self):
        self.headers = get_supabase_headers()
        self.ai_provider = AIProvider()
        self.cache = get_response_cache()
        self.request_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        self.stats = {
            'links_seeded': 0,
            'scraped': 0,
            'summaries': 0,
            'errors': 0,
            'cached': 0
        }

    def load_all_norms(self):
        """Load ALL norms from Supabase (handles pagination)."""
        all_norms = []
        offset = 0
        limit = 1000  # Supabase default limit

        while True:
            url = f"{SUPABASE_URL}/rest/v1/norms?select=id,code,title,description,official_link,access_type,official_doc_summary&offset={offset}&limit={limit}"
            r = requests.get(url, headers=self.headers)
            if r.status_code != 200:
                print(f"Error loading norms: {r.status_code}")
                break

            batch = r.json()
            if not batch:
                break

            all_norms.extend(batch)
            offset += limit

            if len(batch) < limit:
                break

        return all_norms

    def seed_official_links(self):
        """Seed official_link for all norms based on pattern matching."""
        print("\n" + "="*70)
        print("  STEP 1: SEEDING OFFICIAL LINKS")
        print("="*70)

        norms = self.load_all_norms()
        print(f"Loaded {len(norms)} norms from database")

        updates = 0
        for norm in norms:
            code = norm.get('code', '')
            title = norm.get('title', '')
            description = norm.get('description', '')

            # Skip if already has a link
            if norm.get('official_link'):
                continue

            # Find matching official link
            for link_id, link_info in OFFICIAL_LINKS.items():
                patterns = link_info.get('patterns', [])
                matched = False

                for pattern in patterns:
                    pattern_lower = pattern.lower()
                    if (pattern_lower in code.lower() or
                        pattern_lower in title.lower() or
                        pattern_lower in (description or '').lower()):
                        matched = True
                        break

                if matched:
                    # Update norm with official link
                    update_url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm['id']}"
                    r = requests.patch(
                        update_url,
                        headers=get_supabase_headers('return=minimal'),
                        json={
                            'official_link': link_info['url'],
                            'access_type': link_info['access']
                        }
                    )
                    if r.status_code in [200, 204]:
                        print(f"  + {code}: {link_id}")
                        updates += 1
                        self.stats['links_seeded'] += 1
                    break

        print(f"\nSeeded {updates} official links")
        return updates

    def scrape_content(self, url):
        """Scrape content from URL based on domain type."""
        if not url:
            return None

        parsed = urlparse(url)
        domain = parsed.netloc.lower()

        try:
            # GitHub - get raw content
            if 'github.com' in domain or 'raw.githubusercontent.com' in domain:
                if 'raw.githubusercontent.com' in domain:
                    # Already raw URL
                    r = requests.get(url, timeout=15, headers=self.request_headers)
                    if r.status_code == 200:
                        return r.text[:15000]
                elif '.md' in url or '.mediawiki' in url:
                    raw_url = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')
                    r = requests.get(raw_url, timeout=15, headers=self.request_headers)
                    if r.status_code == 200:
                        return r.text[:15000]

            # EIP/ERC - Ethereum
            elif 'eips.ethereum.org' in domain:
                r = requests.get(url, timeout=15, headers=self.request_headers)
                if r.status_code == 200:
                    return self._extract_text(r.text)[:12000]

            # RFC - IETF
            elif 'datatracker.ietf.org' in domain or 'tools.ietf.org' in domain:
                r = requests.get(url, timeout=15, headers=self.request_headers)
                if r.status_code == 200:
                    return self._extract_text(r.text)[:12000]

            # NIST - HTML or PDF
            elif 'nist.gov' in domain:
                # Handle PDF URLs
                if url.endswith('.pdf'):
                    return self._scrape_pdf(url)
                r = requests.get(url, timeout=30, headers=self.request_headers)
                if r.status_code == 200:
                    text = self._extract_text(r.text)
                    # Try to find the main content
                    for marker in ['Abstract', 'Summary', 'Overview', 'Introduction', 'Purpose']:
                        if marker in text:
                            start = text.find(marker)
                            return text[start:start+12000]
                    return text[:12000]

            # Post-Quantum sites
            elif 'pq-crystals.org' in domain or 'sphincs.org' in domain or 'falcon-sign.info' in domain:
                r = requests.get(url, timeout=15, headers=self.request_headers)
                if r.status_code == 200:
                    return self._extract_text(r.text)[:10000]

            # IACR ePrint (ZK proofs)
            elif 'eprint.iacr.org' in domain:
                r = requests.get(url, timeout=15, headers=self.request_headers)
                if r.status_code == 200:
                    return self._extract_text(r.text)[:8000]

            # Generic PDF fallback
            elif url.endswith('.pdf'):
                return self._scrape_pdf(url)

            # Generic HTML fallback
            else:
                r = requests.get(url, timeout=15, headers=self.request_headers)
                if r.status_code == 200:
                    return self._extract_text(r.text)[:10000]

        except Exception as e:
            print(f"      Scraping error: {e}")
            self.stats['errors'] += 1

        return None

    def _scrape_pdf(self, url):
        """Download and extract text from PDF."""
        try:
            import io
            from pypdf import PdfReader

            print(f"      Downloading PDF...")
            r = requests.get(url, timeout=60, headers=self.request_headers)
            if r.status_code != 200:
                print(f"      PDF download failed: {r.status_code}")
                return None

            # Parse PDF
            pdf_file = io.BytesIO(r.content)
            reader = PdfReader(pdf_file)

            text_parts = []
            max_pages = min(len(reader.pages), 30)  # Limit to first 30 pages

            for i in range(max_pages):
                page = reader.pages[i]
                text = page.extract_text()
                if text:
                    text_parts.append(text)

            full_text = "\n".join(text_parts)
            print(f"      PDF extracted: {len(full_text)} chars from {max_pages} pages")

            # Return up to 15000 chars
            return full_text[:15000] if full_text else None

        except Exception as e:
            print(f"      PDF parsing error: {e}")
            return None

    def _extract_text(self, html):
        """Extract text from HTML, removing scripts/styles."""
        from html.parser import HTMLParser

        class TextExtractor(HTMLParser):
            def __init__(self):
                super().__init__()
                self.text = []
                self.skip = False

            def handle_starttag(self, tag, attrs):
                if tag in ['script', 'style', 'nav', 'footer', 'noscript', 'iframe', 'header']:
                    self.skip = True

            def handle_endtag(self, tag):
                if tag in ['script', 'style', 'nav', 'footer', 'noscript', 'iframe', 'header']:
                    self.skip = False

            def handle_data(self, data):
                if not self.skip:
                    text = data.strip()
                    if text:
                        self.text.append(text)

            def get_text(self):
                return ' '.join(self.text)

        parser = TextExtractor()
        try:
            parser.feed(html)
            return parser.get_text()
        except:
            return html[:10000]

    def generate_summary(self, norm, content):
        """Generate AI summary of documentation in 10 parts (~10000 words total)."""
        if not content or len(content) < 100:
            return None

        # Check cache
        import hashlib
        content_hash = hashlib.sha256(content[:8000].encode()).hexdigest()[:16]
        cache_key = f"doc_summary_v3_{norm['code']}_{content_hash}"

        cached = self.cache.get(cache_key, 'gemini_flash', 'doc_summary')
        if cached and len(cached) > 40000:  # Only use cache if it's a full 10k word summary
            self.stats['cached'] += 1
            return cached

        code = norm['code']
        title = norm['title']
        doc = content[:15000]

        # Generate in 10 parts for 10000 words total
        parts = []
        prompts = [
            # Part 1: Executive Summary
            f"""Write PART 1 of a comprehensive analysis of {code}: {title}

DOCUMENTATION: {doc}

## 1. Executive Summary (1000 words)
Write a detailed executive summary covering:
- What this standard does and why it matters
- Key benefits and value proposition
- Target audience and stakeholders
- Critical success factors
- Strategic recommendations

Be thorough and detailed.""",

            # Part 2: Historical Background
            f"""Write PART 2 of a comprehensive analysis of {code}: {title}

DOCUMENTATION: {doc}

## 2. Historical Background and Evolution (1000 words)
- Origins and creation story
- Key contributors and organizations
- Timeline of development
- Major versions and changes
- Competitive landscape and alternatives
- Future roadmap and direction

Be thorough with dates and facts.""",

            # Part 3: Technical Specification Part A
            f"""Write PART 3 of a comprehensive analysis of {code}: {title}

DOCUMENTATION: {doc}

## 3. Technical Specification - Core Concepts (1000 words)
- Fundamental architecture
- Core algorithms explained
- Mathematical foundations
- Data structures and formats
- Protocol messages and flows

Include technical diagrams descriptions.""",

            # Part 4: Technical Specification Part B
            f"""Write PART 4 of a comprehensive analysis of {code}: {title}

DOCUMENTATION: {doc}

## 4. Technical Specification - Parameters (1000 words)
- Key sizes and parameters
- Constants and magic numbers
- Configuration options
- Performance characteristics
- Resource requirements

Be precise with numbers and values.""",

            # Part 5: Security Analysis Part A
            f"""Write PART 5 of a comprehensive analysis of {code}: {title}

DOCUMENTATION: {doc}

## 5. Security Model and Threat Analysis (1000 words)
- Security assumptions
- Threat model
- Attack surface analysis
- Known attack vectors
- Vulnerability history

Include specific attack scenarios.""",

            # Part 6: Security Analysis Part B
            f"""Write PART 6 of a comprehensive analysis of {code}: {title}

DOCUMENTATION: {doc}

## 6. Cryptographic Security Properties (1000 words)
- Security proofs and guarantees
- Resistance to specific attacks
- Quantum computing implications
- Side-channel considerations
- Formal verification status

Be technically rigorous.""",

            # Part 7: Implementation Guide
            f"""Write PART 7 of a comprehensive analysis of {code}: {title}

DOCUMENTATION: {doc}

## 7. Implementation Guide (1000 words)
- Step-by-step implementation checklist
- Required dependencies
- Code structure recommendations
- Testing requirements
- Common pitfalls to avoid

Include pseudocode examples.""",

            # Part 8: Code Examples
            f"""Write PART 8 of a comprehensive analysis of {code}: {title}

DOCUMENTATION: {doc}

## 8. Code Examples and Snippets (1000 words)
Provide detailed code examples in Python/JavaScript showing:
- Basic usage
- Advanced scenarios
- Error handling
- Edge cases
- Performance optimization

Include actual working code.""",

            # Part 9: Use Cases and Adoption
            f"""Write PART 9 of a comprehensive analysis of {code}: {title}

DOCUMENTATION: {doc}

## 9. Use Cases and Industry Adoption (1000 words)
- Primary use cases with examples
- Notable implementations
- Industry adoption statistics
- Case studies
- Success stories and lessons learned

Be specific with real-world examples.""",

            # Part 10: Compliance and Best Practices
            f"""Write PART 10 of a comprehensive analysis of {code}: {title}

DOCUMENTATION: {doc}

## 10. Compliance, Best Practices, and Resources (1000 words)
- Regulatory compliance (GDPR, MiCA, SOC2)
- Security best practices checklist
- Maintenance procedures
- Upgrade strategies
- Official resources and documentation
- Community tools and libraries

Be actionable and practical."""
        ]

        for i, prompt in enumerate(prompts):
            result = self.ai_provider.call(prompt, max_tokens=4000, temperature=0.3)
            if result:
                parts.append(result)
                print(f"      Part {i+1}: {len(result.split())} words")
            time.sleep(0.3)  # Rate limiting between parts

        # Combine all parts
        if len(parts) >= 6:  # At least 6 parts succeeded
            result = "\n\n".join(parts)
            self.cache.set(cache_key, result, 'gemini_flash', 'doc_summary')
            return result

        return None

    def update_norm(self, norm_id, summary, content=None):
        """Update norm with summary and optionally cached content."""
        from datetime import datetime
        url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"

        data = {
            'official_doc_summary': summary,  # No limit - index removed
            'official_scraped_at': datetime.now().isoformat()
        }
        # Skip content to reduce row size
        # if content:
        #     data['official_content'] = content[:50000]

        r = requests.patch(url, headers=get_supabase_headers('return=minimal'), json=data)
        if r.status_code not in [200, 204]:
            print(f"      Save error: {r.status_code} - {r.text[:200]}")
        return r.status_code in [200, 204]

    def scrape_all_norms(self, limit=None, skip_existing=True, force=False):
        """Scrape documentation for all norms with official links."""
        print("\n" + "="*70)
        print("  STEP 2: SCRAPING DOCUMENTATION")
        print("="*70)

        # Reload norms with updated links
        norms = self.load_all_norms()

        # Filter to norms with links and access_type=G
        norms_to_scrape = [
            n for n in norms
            if n.get('official_link') and n.get('access_type') == 'G'
        ]

        if skip_existing and not force:
            norms_to_scrape = [n for n in norms_to_scrape if not n.get('official_doc_summary')]

        if limit:
            norms_to_scrape = norms_to_scrape[:limit]

        print(f"Norms to scrape: {len(norms_to_scrape)}")

        for i, norm in enumerate(norms_to_scrape):
            code = norm['code']
            title = norm.get('title', '')[:40]
            url = norm.get('official_link', '')

            print(f"\n[{i+1}/{len(norms_to_scrape)}] {code}: {title}...")
            print(f"   URL: {url[:60]}...")

            # Scrape content
            content = self.scrape_content(url)
            if not content or len(content) < 100:
                print(f"   Scraping failed or too short")
                self.stats['errors'] += 1
                continue

            print(f"   Scraped: {len(content)} chars")
            self.stats['scraped'] += 1

            # Generate summary
            summary = self.generate_summary(norm, content)
            if not summary:
                print(f"   Summary generation failed")
                self.stats['errors'] += 1
                continue

            print(f"   Summary: {len(summary)} chars {'(cached)' if self.stats['cached'] > 0 else ''}")
            self.stats['summaries'] += 1

            # Update database
            if self.update_norm(norm['id'], summary, content):
                print(f"   Saved to database")
            else:
                print(f"   Save failed")
                self.stats['errors'] += 1

            # Rate limiting
            time.sleep(1)

    def run(self, seed_only=False, scrape_only=False, limit=None, force=False):
        """Run the complete scraping pipeline."""
        print("""
================================================================
     SAFESCORING - COMPLETE NORM DOCUMENTATION SCRAPER
     Official data from BIP, EIP, NIST, RFC, and more
================================================================
""")

        start_time = time.time()

        # Step 1: Seed official links
        if not scrape_only:
            self.seed_official_links()

        # Step 2: Scrape documentation
        if not seed_only:
            self.scrape_all_norms(limit=limit, force=force)

        elapsed = time.time() - start_time

        # Summary
        print(f"""
================================================================
SUMMARY
================================================================
Links seeded:     {self.stats['links_seeded']}
Docs scraped:     {self.stats['scraped']}
Summaries saved:  {self.stats['summaries']}
From cache:       {self.stats['cached']}
Errors:           {self.stats['errors']}
Time:             {elapsed:.1f}s
================================================================
""")


def main():
    parser = argparse.ArgumentParser(description='Complete Norm Documentation Scraper')
    parser.add_argument('--limit', type=int, default=None, help='Max norms to scrape')
    parser.add_argument('--seed-only', action='store_true', help='Only seed official links, no scraping')
    parser.add_argument('--scrape-only', action='store_true', help='Only scrape, skip link seeding')
    parser.add_argument('--force', action='store_true', help='Re-scrape all norms even if already have summaries')

    args = parser.parse_args()

    scraper = FullNormScraper()
    scraper.run(
        seed_only=args.seed_only,
        scrape_only=args.scrape_only,
        limit=args.limit,
        force=args.force
    )


if __name__ == "__main__":
    main()
