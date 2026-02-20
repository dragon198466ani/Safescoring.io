#!/usr/bin/env python3
"""
Complete norm fixing script - ONLY use real official standards.
Removes vendor names and fake standards, adds real official references.
"""
import os
import sys
import re
import requests
from datetime import datetime
from dotenv import load_dotenv

# Fix encoding for Windows
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }


# =============================================================================
# REAL OFFICIAL STANDARDS MAPPING
# Only standards with FREE official documentation
# =============================================================================

REAL_STANDARDS = {
    # NIST Standards (Free - csrc.nist.gov)
    'NIST SP 800-53': {
        'name': 'NIST SP 800-53',
        'link': 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final',
        'keywords': ['access control', 'security controls', 'audit', 'accountability'],
    },
    'NIST SP 800-57': {
        'name': 'NIST SP 800-57',
        'link': 'https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final',
        'keywords': ['key management', 'key derivation', 'key storage'],
    },
    'NIST SP 800-63B': {
        'name': 'NIST SP 800-63B',
        'link': 'https://pages.nist.gov/800-63-3/sp800-63b.html',
        'keywords': ['authentication', 'identity', 'mfa', '2fa', 'biometric', 'password'],
    },
    'NIST SP 800-88': {
        'name': 'NIST SP 800-88',
        'link': 'https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final',
        'keywords': ['wipe', 'sanitization', 'erase', 'destruction', 'media'],
    },
    'NIST SP 800-90A': {
        'name': 'NIST SP 800-90A',
        'link': 'https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final',
        'keywords': ['random', 'drbg', 'entropy', 'rng'],
    },
    'FIPS 140-3': {
        'name': 'FIPS 140-3',
        'link': 'https://csrc.nist.gov/publications/detail/fips/140/3/final',
        'keywords': ['hsm', 'cryptographic module', 'hardware security'],
    },
    'FIPS 186-5': {
        'name': 'FIPS 186-5',
        'link': 'https://csrc.nist.gov/publications/detail/fips/186/5/final',
        'keywords': ['dsa', 'ecdsa', 'digital signature', 'signing'],
    },
    'FIPS 197': {
        'name': 'FIPS 197',
        'link': 'https://csrc.nist.gov/publications/detail/fips/197/final',
        'keywords': ['aes', 'encryption', 'block cipher'],
    },
    'FIPS 180-4': {
        'name': 'FIPS 180-4',
        'link': 'https://csrc.nist.gov/publications/detail/fips/180/4/final',
        'keywords': ['sha', 'sha-256', 'sha-512', 'hash'],
    },
    'FIPS 202': {
        'name': 'FIPS 202',
        'link': 'https://csrc.nist.gov/publications/detail/fips/202/final',
        'keywords': ['sha-3', 'keccak', 'shake'],
    },

    # BIP Standards (Free - GitHub)
    'BIP-32': {
        'name': 'BIP-32',
        'link': 'https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki',
        'keywords': ['hd wallet', 'hierarchical deterministic', 'key derivation', 'xpub', 'xprv'],
    },
    'BIP-39': {
        'name': 'BIP-39',
        'link': 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki',
        'keywords': ['mnemonic', 'seed phrase', '12 words', '24 words', 'recovery phrase'],
    },
    'BIP-44': {
        'name': 'BIP-44',
        'link': 'https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki',
        'keywords': ['multi-account', 'derivation path', 'coin type'],
    },
    'BIP-84': {
        'name': 'BIP-84',
        'link': 'https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki',
        'keywords': ['native segwit', 'bech32', 'bc1'],
    },
    'BIP-85': {
        'name': 'BIP-85',
        'link': 'https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki',
        'keywords': ['deterministic entropy', 'child seed', 'derived seed'],
    },
    'BIP-340': {
        'name': 'BIP-340',
        'link': 'https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki',
        'keywords': ['schnorr', 'schnorr signature'],
    },
    'BIP-341': {
        'name': 'BIP-341',
        'link': 'https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki',
        'keywords': ['taproot', 'p2tr'],
    },
    'BIP-65': {
        'name': 'BIP-65',
        'link': 'https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki',
        'keywords': ['timelock', 'cltv', 'checklocktimeverify'],
    },
    'BIP-112': {
        'name': 'BIP-112',
        'link': 'https://github.com/bitcoin/bips/blob/master/bip-0112.mediawiki',
        'keywords': ['csv', 'checksequenceverify', 'relative timelock'],
    },
    'BIP-174': {
        'name': 'BIP-174',
        'link': 'https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki',
        'keywords': ['psbt', 'partially signed'],
    },

    # SLIP Standards (Free - GitHub)
    'SLIP-39': {
        'name': 'SLIP-39',
        'link': 'https://github.com/satoshilabs/slips/blob/master/slip-0039.md',
        'keywords': ['shamir', 'sss', 'secret sharing', 'split seed'],
    },
    'SLIP-44': {
        'name': 'SLIP-44',
        'link': 'https://github.com/satoshilabs/slips/blob/master/slip-0044.md',
        'keywords': ['coin type', 'registered coins'],
    },

    # RFC Standards (Free - IETF)
    'RFC 8446': {
        'name': 'RFC 8446',
        'link': 'https://datatracker.ietf.org/doc/html/rfc8446',
        'keywords': ['tls', 'tls 1.3', 'transport layer security'],
    },
    'RFC 9106': {
        'name': 'RFC 9106',
        'link': 'https://datatracker.ietf.org/doc/html/rfc9106',
        'keywords': ['argon2', 'password hashing'],
    },
    'RFC 5869': {
        'name': 'RFC 5869',
        'link': 'https://datatracker.ietf.org/doc/html/rfc5869',
        'keywords': ['hkdf', 'key derivation'],
    },
    'RFC 8439': {
        'name': 'RFC 8439',
        'link': 'https://datatracker.ietf.org/doc/html/rfc8439',
        'keywords': ['chacha20', 'poly1305'],
    },
    'RFC 7693': {
        'name': 'RFC 7693',
        'link': 'https://datatracker.ietf.org/doc/html/rfc7693',
        'keywords': ['blake2'],
    },
    'RFC 8017': {
        'name': 'RFC 8017',
        'link': 'https://datatracker.ietf.org/doc/html/rfc8017',
        'keywords': ['rsa', 'pkcs'],
    },
    'RFC 8032': {
        'name': 'RFC 8032',
        'link': 'https://datatracker.ietf.org/doc/html/rfc8032',
        'keywords': ['ed25519', 'eddsa', 'edwards curve'],
    },

    # EIP/ERC Standards (Free - Ethereum)
    'EIP-712': {
        'name': 'EIP-712',
        'link': 'https://eips.ethereum.org/EIPS/eip-712',
        'keywords': ['typed data', 'structured signing', 'eth_signTypedData'],
    },
    'EIP-1559': {
        'name': 'EIP-1559',
        'link': 'https://eips.ethereum.org/EIPS/eip-1559',
        'keywords': ['gas', 'base fee', 'priority fee', 'eip-1559'],
    },
    'EIP-4337': {
        'name': 'EIP-4337',
        'link': 'https://eips.ethereum.org/EIPS/eip-4337',
        'keywords': ['account abstraction', 'smart account', 'bundler', 'paymaster'],
    },
    'ERC-20': {
        'name': 'ERC-20',
        'link': 'https://eips.ethereum.org/EIPS/eip-20',
        'keywords': ['token', 'fungible token', 'erc20', 'transfer'],
    },
    'ERC-721': {
        'name': 'ERC-721',
        'link': 'https://eips.ethereum.org/EIPS/eip-721',
        'keywords': ['nft', 'non-fungible', 'erc721'],
    },
    'ERC-1155': {
        'name': 'ERC-1155',
        'link': 'https://eips.ethereum.org/EIPS/eip-1155',
        'keywords': ['multi-token', 'erc1155'],
    },
    'ERC-4626': {
        'name': 'ERC-4626',
        'link': 'https://eips.ethereum.org/EIPS/eip-4626',
        'keywords': ['vault', 'yield vault', 'tokenized vault'],
    },

    # OWASP Standards (Free)
    'OWASP Top 10': {
        'name': 'OWASP Top 10',
        'link': 'https://owasp.org/www-project-top-ten/',
        'keywords': ['injection', 'xss', 'csrf', 'broken access', 'security misconfiguration'],
    },
    'OWASP ASVS': {
        'name': 'OWASP ASVS',
        'link': 'https://owasp.org/www-project-application-security-verification-standard/',
        'keywords': ['application security', 'verification'],
    },

    # WCAG (Free)
    'WCAG 2.2': {
        'name': 'WCAG 2.2',
        'link': 'https://www.w3.org/TR/WCAG22/',
        'keywords': ['accessibility', 'wcag', 'a11y'],
    },

    # ISO Standards (Reference only - paid)
    'ISO/IEC 27001': {
        'name': 'ISO/IEC 27001',
        'link': 'https://www.iso.org/standard/27001',
        'keywords': ['isms', 'information security management'],
        'paid': True,
    },
    'ISO/IEC 15408': {
        'name': 'ISO/IEC 15408',
        'link': 'https://www.iso.org/standard/72891.html',
        'keywords': ['common criteria', 'eal', 'security evaluation'],
        'paid': True,
    },
    'ISO 22301': {
        'name': 'ISO 22301',
        'link': 'https://www.iso.org/standard/75106.html',
        'keywords': ['business continuity', 'bcms'],
        'paid': True,
    },

    # SOC 2 (Reference)
    'SOC 2 Type II': {
        'name': 'SOC 2 Type II',
        'link': 'https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2',
        'keywords': ['soc2', 'soc 2', 'trust services'],
    },

    # PCI DSS (Free)
    'PCI DSS v4.0': {
        'name': 'PCI DSS v4.0',
        'link': 'https://www.pcisecuritystandards.org/document_library/',
        'keywords': ['pci', 'payment card', 'card data'],
    },

    # FATF (Free)
    'FATF Travel Rule': {
        'name': 'FATF Travel Rule',
        'link': 'https://www.fatf-gafi.org/en/topics/virtual-assets.html',
        'keywords': ['aml', 'kyc', 'travel rule', 'fatf'],
    },

    # MiCA (Free)
    'MiCA': {
        'name': 'MiCA',
        'link': 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1114',
        'keywords': ['mica', 'eu regulation', 'crypto regulation'],
    },

    # GDPR (Free)
    'GDPR': {
        'name': 'GDPR',
        'link': 'https://gdpr.eu/tag/gdpr/',
        'keywords': ['gdpr', 'data protection', 'privacy', 'right to erasure'],
    },
}

# Vendor/fake standards to REMOVE from titles
FAKE_STANDARDS = [
    'GlobalPlatform SE',
    'GlobalPlatform TEE',
    'Avail',
    'Simple Power Analysis',
    'Electromagnetic Analysis',
    'Differential Power Analysis',
    'Voltage Glitching',
    'Side-Channel Attacks',
    'Hardware Security Module',
    'Security Audit',
    'Formal Verification',
    'Chainlink PoR',
    'Chainlink',
    'Forta Network',
    'Immunefi',
    'Nexus Mutual',
    'Safe (Gnosis)',
    'OpenZeppelin',
    'Flashbots Protect',
    'Hardware Wallet',
    'SEC (USA)',
    'CFTC (USA)',
    'MAS (Singapore)',
    'Cross-Chain Bridge',
    'Ethereum Staking',
    'Bitcoin CLTV/CSV',
    'ENS',
    'Reproducible Builds',
    'SLSA',
    'Sigstore/Cosign',
    'VeraCrypt Hidden Volumes',
    'Pyth Network',
    'LayerZero',
    'WalletConnect v2',
    'STARKs',
    'Groth16',
    'Arbitrum Orbit',
    'OP Stack',
    'Scroll zkEVM',
    'zkEVM',
    'Aztec Noir',
    'Echidna',
    'EAS',
    'CIS Controls v8',
    'BSI IT-Grundschutz',
    'CAIP Standards',
    'Foundation Devices',
    'CCSS Level III',
    'MPC Protocols',
    'Noise Protocol',
    'libsodium/NaCl',
    'TCG TPM 2.0',
    'AMD SEV-SNP',
    'Intel SGX/TDX',
    'STMicro ST33',
    'Infineon SLE78/Optiga',
    'BLS12-381',
    'KZG Commitment',
    'bcrypt',
    'ERC-6900/7579',
]


def find_real_standard(title, description):
    """Find the best matching REAL standard for a norm."""
    text = (title + ' ' + (description or '')).lower()

    for std_name, std_info in REAL_STANDARDS.items():
        # Check if any keyword matches
        for keyword in std_info['keywords']:
            if keyword.lower() in text:
                return std_name, std_info

    return None, None


def clean_title(title):
    """Remove fake standard prefix from title."""
    for fake in FAKE_STANDARDS:
        if title.startswith(f"{fake}: "):
            return title[len(fake) + 2:].strip()
    return title


def update_norm(norm_id, title=None, official_link=None, description=None):
    """Update norm in database."""
    url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"
    headers = get_headers()
    headers['Prefer'] = 'return=minimal'

    data = {}
    if title:
        data['title'] = title
    if official_link:
        data['official_link'] = official_link
    if description:
        data['description'] = description

    if not data:
        return True

    r = requests.patch(url, headers=headers, json=data, timeout=30)
    return r.status_code in [200, 204]


def main():
    log("=" * 70)
    log("COMPLETE NORM FIXING - REAL STANDARDS ONLY")
    log("=" * 70)

    # Fetch all norms
    log("Fetching all norms...")
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,code,title,description,official_link&order=code&limit=2000",
        headers=get_headers()
    )
    norms = r.json()
    log(f"Total norms: {len(norms)}")

    stats = {
        'fixed_with_real_std': 0,
        'cleaned_fake_std': 0,
        'already_ok': 0,
        'internal_criteria': 0,
        'errors': 0,
    }

    for i, norm in enumerate(norms):
        norm_id = norm['id']
        code = norm['code']
        title = norm['title'] or ''
        description = norm['description'] or ''
        current_link = norm['official_link'] or ''

        # Check if title has a fake standard prefix
        has_fake = any(title.startswith(f"{fake}: ") for fake in FAKE_STANDARDS)

        if has_fake:
            # Clean the title
            clean = clean_title(title)

            # Try to find a REAL standard match
            std_name, std_info = find_real_standard(clean, description)

            if std_name:
                # Found a real standard - update with it
                new_title = f"{std_info['name']}: {clean}"
                new_link = std_info['link']

                if update_norm(norm_id, title=new_title, official_link=new_link):
                    log(f"OK {code}: {title[:30]}... -> {new_title[:40]}...")
                    stats['fixed_with_real_std'] += 1
                else:
                    log(f"ERR {code}")
                    stats['errors'] += 1
            else:
                # No real standard found - just remove the fake prefix
                if update_norm(norm_id, title=clean, official_link=None):
                    log(f"CLEAN {code}: Removed fake standard, kept: {clean[:40]}...")
                    stats['cleaned_fake_std'] += 1
                else:
                    log(f"ERR {code}")
                    stats['errors'] += 1
        else:
            # Check if title already has a real standard
            has_real = any(title.startswith(f"{std}: ") or title.startswith(std)
                          for std in REAL_STANDARDS.keys())

            if has_real:
                stats['already_ok'] += 1
            else:
                # Internal criteria - no standard prefix
                stats['internal_criteria'] += 1

        # Progress
        if (i + 1) % 100 == 0:
            log(f"--- Progress: {i+1}/{len(norms)} ---")

    log("")
    log("=" * 70)
    log("COMPLETE:")
    log(f"  - Fixed with real standard: {stats['fixed_with_real_std']}")
    log(f"  - Cleaned fake standard: {stats['cleaned_fake_std']}")
    log(f"  - Already OK: {stats['already_ok']}")
    log(f"  - Internal criteria (no std): {stats['internal_criteria']}")
    log(f"  - Errors: {stats['errors']}")
    log("=" * 70)


if __name__ == '__main__':
    main()
