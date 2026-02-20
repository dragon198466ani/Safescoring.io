#!/usr/bin/env python3
"""
Assign official standards to ALL norms.
Maps internal criteria to the most relevant official standard.
"""
import os
import sys
import re
import requests
from datetime import datetime
from dotenv import load_dotenv

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
# COMPREHENSIVE STANDARD MAPPINGS
# Each standard with its official link and keywords for matching
# =============================================================================

STANDARDS_DB = {
    # === CRYPTOGRAPHIC STANDARDS ===
    'NIST SP 800-57': {
        'link': 'https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final',
        'keywords': ['key management', 'key derivation', 'key storage', 'key rotation',
                     'encryption key', 'master key', 'session key', 'ephemeral'],
    },
    'NIST SP 800-90A': {
        'link': 'https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final',
        'keywords': ['random', 'entropy', 'drbg', 'rng', 'randomness'],
    },
    'FIPS 140-3': {
        'link': 'https://csrc.nist.gov/publications/detail/fips/140/3/final',
        'keywords': ['hsm', 'hardware security', 'cryptographic module', 'secure element',
                     'tamper', 'tpm', 'sev', 'sgx', 'trustzone', 'enclave', 'tee'],
    },
    'FIPS 197': {
        'link': 'https://csrc.nist.gov/publications/detail/fips/197/final',
        'keywords': ['aes', 'encryption', 'symmetric', 'cipher', 'encrypt'],
    },
    'FIPS 186-5': {
        'link': 'https://csrc.nist.gov/publications/detail/fips/186/5/final',
        'keywords': ['ecdsa', 'digital signature', 'signing', 'ed25519', 'schnorr'],
    },
    'FIPS 180-4': {
        'link': 'https://csrc.nist.gov/publications/detail/fips/180/4/final',
        'keywords': ['sha', 'sha-256', 'sha-512', 'hash', 'digest'],
    },

    # === AUTHENTICATION & IDENTITY ===
    'NIST SP 800-63B': {
        'link': 'https://pages.nist.gov/800-63-3/sp800-63b.html',
        'keywords': ['authentication', 'mfa', '2fa', 'biometric', 'password', 'passkey',
                     'fido', 'webauthn', 'identity', 'login', 'credential'],
    },

    # === SECURITY CONTROLS ===
    'NIST SP 800-53': {
        'link': 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final',
        'keywords': ['access control', 'audit', 'monitoring', 'incident', 'security control',
                     'logging', 'authorization', 'permission', 'role-based'],
    },
    'NIST SP 800-88': {
        'link': 'https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final',
        'keywords': ['wipe', 'sanitization', 'erase', 'destruction', 'delete', 'purge'],
    },

    # === ISO STANDARDS ===
    'ISO/IEC 27001': {
        'link': 'https://www.iso.org/standard/27001',
        'keywords': ['isms', 'information security', 'security management', 'security policy',
                     'risk management', 'cybersecurity', 'compliance'],
    },
    'ISO/IEC 27002': {
        'link': 'https://www.iso.org/standard/75652.html',
        'keywords': ['security controls', 'best practice', 'security measures'],
    },
    'ISO/IEC 27017': {
        'link': 'https://www.iso.org/standard/43757.html',
        'keywords': ['cloud security', 'cloud service', 'aws', 'azure', 'gcp', 'cloud provider'],
    },
    'ISO/IEC 27035': {
        'link': 'https://www.iso.org/standard/78973.html',
        'keywords': ['incident response', 'incident management', 'breach', 'security incident'],
    },
    'ISO/IEC 29147': {
        'link': 'https://www.iso.org/standard/72311.html',
        'keywords': ['vulnerability disclosure', 'bug bounty', 'responsible disclosure', 'cve'],
    },
    'ISO/IEC 15408': {
        'link': 'https://www.iso.org/standard/72891.html',
        'keywords': ['common criteria', 'eal', 'security evaluation', 'certification'],
    },
    'ISO 22301': {
        'link': 'https://www.iso.org/standard/75106.html',
        'keywords': ['business continuity', 'disaster recovery', 'bcms', 'backup', 'resilience'],
    },
    'ISO 9241': {
        'link': 'https://www.iso.org/standard/77520.html',
        'keywords': ['usability', 'user interface', 'ui', 'ux', 'ergonomic', 'human-computer'],
    },
    'ISO 25010': {
        'link': 'https://www.iso.org/standard/35733.html',
        'keywords': ['software quality', 'quality model', 'reliability', 'maintainability'],
    },

    # === BLOCKCHAIN STANDARDS ===
    'BIP-32': {
        'link': 'https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki',
        'keywords': ['hd wallet', 'hierarchical deterministic', 'derivation path', 'xpub', 'xprv'],
    },
    'BIP-39': {
        'link': 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki',
        'keywords': ['mnemonic', 'seed phrase', '12 words', '24 words', 'recovery phrase', 'backup'],
    },
    'BIP-44': {
        'link': 'https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki',
        'keywords': ['multi-account', 'derivation path', 'coin type', 'm/44'],
    },
    'BIP-340': {
        'link': 'https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki',
        'keywords': ['schnorr', 'schnorr signature', 'bip-340'],
    },
    'BIP-341': {
        'link': 'https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki',
        'keywords': ['taproot', 'p2tr', 'mast'],
    },
    'SLIP-39': {
        'link': 'https://github.com/satoshilabs/slips/blob/master/slip-0039.md',
        'keywords': ['shamir', 'secret sharing', 'sss', 'split', 'threshold'],
    },

    # === ETHEREUM STANDARDS ===
    'EIP-712': {
        'link': 'https://eips.ethereum.org/EIPS/eip-712',
        'keywords': ['typed data', 'structured signing', 'signTypedData'],
    },
    'EIP-1559': {
        'link': 'https://eips.ethereum.org/EIPS/eip-1559',
        'keywords': ['gas', 'base fee', 'priority fee', 'gas estimation'],
    },
    'EIP-4337': {
        'link': 'https://eips.ethereum.org/EIPS/eip-4337',
        'keywords': ['account abstraction', 'smart account', 'bundler', 'paymaster', 'aa'],
    },
    'ERC-20': {
        'link': 'https://eips.ethereum.org/EIPS/eip-20',
        'keywords': ['token', 'fungible', 'transfer', 'approve', 'balance'],
    },
    'ERC-721': {
        'link': 'https://eips.ethereum.org/EIPS/eip-721',
        'keywords': ['nft', 'non-fungible', 'collectible'],
    },
    'ERC-1155': {
        'link': 'https://eips.ethereum.org/EIPS/eip-1155',
        'keywords': ['multi-token', 'batch', 'erc1155'],
    },
    'ERC-4626': {
        'link': 'https://eips.ethereum.org/EIPS/eip-4626',
        'keywords': ['vault', 'yield', 'tokenized vault', 'deposit', 'withdraw'],
    },

    # === WEB STANDARDS ===
    'RFC 8446': {
        'link': 'https://datatracker.ietf.org/doc/html/rfc8446',
        'keywords': ['tls', 'https', 'ssl', 'transport security', 'encryption in transit'],
    },
    'RFC 9106': {
        'link': 'https://datatracker.ietf.org/doc/html/rfc9106',
        'keywords': ['argon2', 'password hashing', 'kdf'],
    },
    'RFC 5869': {
        'link': 'https://datatracker.ietf.org/doc/html/rfc5869',
        'keywords': ['hkdf', 'key derivation function'],
    },

    # === SECURITY TESTING ===
    'OWASP Top 10': {
        'link': 'https://owasp.org/www-project-top-ten/',
        'keywords': ['injection', 'xss', 'csrf', 'sql injection', 'vulnerability', 'penetration'],
    },
    'OWASP ASVS': {
        'link': 'https://owasp.org/www-project-application-security-verification-standard/',
        'keywords': ['security verification', 'application security', 'code review'],
    },
    'OWASP MASVS': {
        'link': 'https://mas.owasp.org/MASVS/',
        'keywords': ['mobile security', 'android', 'ios', 'mobile app'],
    },

    # === COMPLIANCE & AUDIT ===
    'SOC 2 Type II': {
        'link': 'https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2',
        'keywords': ['soc2', 'soc 2', 'trust services', 'audit report', 'attestation'],
    },
    'PCI DSS v4.0': {
        'link': 'https://www.pcisecuritystandards.org/document_library/',
        'keywords': ['pci', 'payment card', 'cardholder', 'merchant', 'card data'],
    },
    'CCSS Level III': {
        'link': 'https://cryptoconsortium.org/standards/ccss',
        'keywords': ['ccss', 'cryptocurrency security', 'cold storage', 'key ceremony'],
    },

    # === REGULATORY ===
    'FATF Travel Rule': {
        'link': 'https://www.fatf-gafi.org/en/topics/virtual-assets.html',
        'keywords': ['aml', 'kyc', 'travel rule', 'fatf', 'anti-money', 'compliance'],
    },
    'GDPR': {
        'link': 'https://gdpr.eu/',
        'keywords': ['privacy', 'personal data', 'data protection', 'consent', 'erasure'],
    },
    'MiCA': {
        'link': 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1114',
        'keywords': ['mica', 'eu regulation', 'crypto regulation', 'casp'],
    },
    'DORA': {
        'link': 'https://eur-lex.europa.eu/eli/reg/2022/2554',
        'keywords': ['dora', 'digital operational resilience', 'ict risk'],
    },

    # === ACCESSIBILITY ===
    'WCAG 2.2': {
        'link': 'https://www.w3.org/TR/WCAG22/',
        'keywords': ['accessibility', 'wcag', 'a11y', 'screen reader', 'contrast', 'keyboard'],
    },

    # === INTEROPERABILITY ===
    'CAIP-2': {
        'link': 'https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md',
        'keywords': ['caip', 'chain agnostic', 'multichain', 'cross-chain'],
    },

    # === ZERO KNOWLEDGE ===
    'ZK-SNARKs': {
        'link': 'https://z.cash/technology/zksnarks/',
        'keywords': ['zk-snark', 'zero knowledge', 'groth16', 'plonk', 'zkp'],
    },
    'ZK-STARKs': {
        'link': 'https://starkware.co/stark/',
        'keywords': ['stark', 'starknet', 'cairo', 'zk-stark'],
    },

    # === SMART CONTRACTS ===
    'EIP-2535': {
        'link': 'https://eips.ethereum.org/EIPS/eip-2535',
        'keywords': ['diamond', 'proxy', 'upgradeable', 'modular'],
    },
    'OpenZeppelin': {
        'link': 'https://docs.openzeppelin.com/contracts/',
        'keywords': ['openzeppelin', 'access control', 'ownable', 'pausable', 'reentrancy'],
    },
}

# Pillar-specific default standards (when no keyword match)
PILLAR_DEFAULTS = {
    'S': 'NIST SP 800-53',  # Security controls
    'A': 'ISO/IEC 27001',   # Information security
    'F': 'ISO 22301',       # Business continuity
    'E': 'ISO 9241',        # Usability
}


def find_best_standard(title, description, pillar):
    """Find the best matching standard for a norm."""
    text = (title + ' ' + (description or '')).lower()

    best_match = None
    best_score = 0

    for std_name, std_info in STANDARDS_DB.items():
        score = 0
        for keyword in std_info['keywords']:
            if keyword.lower() in text:
                # Longer keywords = more specific = higher score
                score += len(keyword)

        if score > best_score:
            best_score = score
            best_match = std_name

    # If no match, use pillar default
    if not best_match or best_score < 5:
        best_match = PILLAR_DEFAULTS.get(pillar, 'ISO/IEC 27001')

    return best_match, STANDARDS_DB.get(best_match, {}).get('link', '')


def update_norm(norm_id, title, official_link=None):
    """Update norm in database."""
    url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"
    headers = get_headers()
    headers['Prefer'] = 'return=minimal'

    data = {'title': title}
    if official_link:
        data['official_link'] = official_link

    r = requests.patch(url, headers=headers, json=data, timeout=30)
    return r.status_code in [200, 204]


def has_standard_prefix(title):
    """Check if title already has a standard prefix."""
    prefixes = ['NIST', 'FIPS', 'RFC', 'BIP-', 'EIP-', 'ERC-', 'SLIP-',
                'ISO', 'OWASP', 'WCAG', 'SOC 2', 'PCI DSS', 'FATF',
                'GDPR', 'MiCA', 'DORA', 'CCSS', 'CAIP', 'ZK-', 'OpenZeppelin']
    return any(title.startswith(p) for p in prefixes)


def main():
    log("=" * 70)
    log("ASSIGN OFFICIAL STANDARDS TO ALL NORMS")
    log("=" * 70)

    # Get all norms with pagination
    log("Fetching all norms...")
    all_norms = []
    offset = 0
    limit = 1000

    while True:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code,title,description,pillar&order=code&offset={offset}&limit={limit}",
            headers=get_headers()
        )
        batch = r.json()
        if not batch:
            break
        all_norms.extend(batch)
        offset += limit
        if len(batch) < limit:
            break

    norms = all_norms
    log(f"Total norms: {len(norms)}")

    updated = 0
    already_ok = 0
    errors = 0

    for i, norm in enumerate(norms):
        norm_id = norm['id']
        code = norm['code']
        title = norm['title'] or ''
        description = norm.get('description') or ''
        pillar = norm.get('pillar') or code[0]

        # Skip if already has a standard prefix
        if has_standard_prefix(title):
            already_ok += 1
            continue

        # Find best matching standard
        std_name, std_link = find_best_standard(title, description, pillar)

        # Create new title with standard prefix
        new_title = f"{std_name}: {title}"

        if update_norm(norm_id, new_title, std_link):
            log(f"OK {code}: {title[:30]}... -> {std_name}")
            updated += 1
        else:
            log(f"ERR {code}")
            errors += 1

        if (i + 1) % 100 == 0:
            log(f"--- Progress: {i+1}/{len(norms)} ---")

    log("")
    log("=" * 70)
    log("COMPLETE:")
    log(f"  - Updated with standard: {updated}")
    log(f"  - Already had standard: {already_ok}")
    log(f"  - Errors: {errors}")
    log("=" * 70)


if __name__ == '__main__':
    main()
