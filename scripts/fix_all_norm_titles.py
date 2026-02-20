#!/usr/bin/env python3
"""
Fix ALL norm titles with official standard names.
Uses AI to research and find the correct official standard for each norm.
"""
import os
import sys
import requests
import time
import re
import json
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
GROQ_API_KEY = os.getenv('GROQ_API_KEY')

# Known official standards database
KNOWN_STANDARDS = {
    # Cryptographic Standards
    'aes': ('FIPS 197', 'AES', 'https://csrc.nist.gov/publications/detail/fips/197/final'),
    'sha-256': ('FIPS 180-4', 'SHA-256', 'https://csrc.nist.gov/publications/detail/fips/180/4/final'),
    'sha-512': ('FIPS 180-4', 'SHA-512', 'https://csrc.nist.gov/publications/detail/fips/180/4/final'),
    'ecdsa': ('FIPS 186-5', 'ECDSA', 'https://csrc.nist.gov/publications/detail/fips/186/5/final'),
    'rsa': ('RFC 8017', 'PKCS#1 RSA', 'https://www.rfc-editor.org/rfc/rfc8017'),
    'ed25519': ('RFC 8032', 'Ed25519', 'https://www.rfc-editor.org/rfc/rfc8032'),
    'chacha20': ('RFC 8439', 'ChaCha20-Poly1305', 'https://www.rfc-editor.org/rfc/rfc8439'),
    'argon2': ('RFC 9106', 'Argon2', 'https://www.rfc-editor.org/rfc/rfc9106'),
    'bcrypt': ('OpenBSD', 'bcrypt', 'https://www.usenix.org/legacy/events/usenix99/provos/provos.pdf'),
    'pbkdf2': ('RFC 8018', 'PBKDF2', 'https://www.rfc-editor.org/rfc/rfc8018'),
    'scrypt': ('RFC 7914', 'scrypt', 'https://www.rfc-editor.org/rfc/rfc7914'),

    # Bitcoin Standards (BIPs)
    'bip32': ('BIP-32', 'HD Wallets', 'https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki'),
    'bip39': ('BIP-39', 'Mnemonic Seed', 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki'),
    'bip44': ('BIP-44', 'Multi-Account HD', 'https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki'),
    'bip85': ('BIP-85', 'Deterministic Entropy', 'https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki'),
    'bip141': ('BIP-141', 'SegWit', 'https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki'),
    'bip174': ('BIP-174', 'PSBT', 'https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki'),
    'slip39': ('SLIP-39', 'Shamir Backup', 'https://github.com/satoshilabs/slips/blob/master/slip-0039.md'),

    # Ethereum Standards (EIPs)
    'erc20': ('EIP-20', 'ERC-20 Token', 'https://eips.ethereum.org/EIPS/eip-20'),
    'erc721': ('EIP-721', 'ERC-721 NFT', 'https://eips.ethereum.org/EIPS/eip-721'),
    'erc1155': ('EIP-1155', 'Multi Token', 'https://eips.ethereum.org/EIPS/eip-1155'),
    'eip1559': ('EIP-1559', 'Fee Market', 'https://eips.ethereum.org/EIPS/eip-1559'),
    'eip4337': ('EIP-4337', 'Account Abstraction', 'https://eips.ethereum.org/EIPS/eip-4337'),
    'eip712': ('EIP-712', 'Typed Signing', 'https://eips.ethereum.org/EIPS/eip-712'),

    # NIST Standards
    'nist 800-53': ('NIST SP 800-53', 'Security Controls', 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final'),
    'nist 800-63': ('NIST SP 800-63', 'Digital Identity', 'https://pages.nist.gov/800-63-3/'),
    'nist 800-88': ('NIST SP 800-88', 'Media Sanitization', 'https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final'),
    'nist csf': ('NIST CSF 2.0', 'Cybersecurity Framework', 'https://www.nist.gov/cyberframework'),
    'fips 140': ('FIPS 140-3', 'Crypto Module', 'https://csrc.nist.gov/publications/detail/fips/140/3/final'),

    # ISO Standards
    'iso 27001': ('ISO/IEC 27001', 'ISMS', 'https://www.iso.org/standard/27001'),
    'iso 27002': ('ISO/IEC 27002', 'Security Controls', 'https://www.iso.org/standard/75652.html'),
    'iso 27017': ('ISO/IEC 27017', 'Cloud Security', 'https://www.iso.org/standard/43757.html'),
    'iso 27701': ('ISO/IEC 27701', 'Privacy', 'https://www.iso.org/standard/71670.html'),
    'iso 15408': ('ISO/IEC 15408', 'Common Criteria', 'https://www.commoncriteriaportal.org/cc/'),
    'iso 22301': ('ISO 22301', 'Business Continuity', 'https://www.iso.org/standard/75106.html'),
    'iso 9241': ('ISO 9241', 'Ergonomics', 'https://www.iso.org/standard/77520.html'),

    # Military Standards
    'mil-std-810': ('MIL-STD-810', 'Environmental Test', 'https://quicksearch.dla.mil/'),
    'mil-std-461': ('MIL-STD-461', 'EMI/EMC', 'https://quicksearch.dla.mil/'),
    'mil-std-883': ('MIL-STD-883', 'Microelectronics', 'https://quicksearch.dla.mil/'),

    # Hardware Security
    'common criteria': ('ISO/IEC 15408', 'Common Criteria', 'https://www.commoncriteriaportal.org/'),
    'eal': ('ISO/IEC 15408', 'Common Criteria EAL', 'https://www.commoncriteriaportal.org/'),
    'tpm': ('TCG TPM 2.0', 'TPM', 'https://trustedcomputinggroup.org/resource/tpm-library-specification/'),
    'secure element': ('GlobalPlatform', 'Secure Element', 'https://globalplatform.org/specs-library/'),
    'intel sgx': ('Intel SGX', 'Software Guard Extensions', 'https://www.intel.com/content/www/us/en/developer/tools/software-guard-extensions/overview.html'),
    'arm trustzone': ('ARM TrustZone', 'TrustZone', 'https://developer.arm.com/documentation/102418/latest/'),
    'amd sev': ('AMD SEV', 'Secure Encrypted Virtualization', 'https://www.amd.com/en/developer/sev.html'),

    # Authentication
    'fido': ('FIDO2', 'Fast Identity Online', 'https://fidoalliance.org/specifications/'),
    'webauthn': ('WebAuthn', 'Web Authentication', 'https://www.w3.org/TR/webauthn/'),
    'oauth': ('OAuth 2.0', 'Authorization', 'https://oauth.net/2/'),
    'totp': ('RFC 6238', 'TOTP', 'https://www.rfc-editor.org/rfc/rfc6238'),
    'hotp': ('RFC 4226', 'HOTP', 'https://www.rfc-editor.org/rfc/rfc4226'),

    # Network/TLS
    'tls': ('RFC 8446', 'TLS 1.3', 'https://www.rfc-editor.org/rfc/rfc8446'),
    'noise': ('Noise Protocol', 'Noise Framework', 'https://noiseprotocol.org/noise.html'),

    # Compliance
    'pci dss': ('PCI DSS v4.0', 'Payment Card', 'https://www.pcisecuritystandards.org/'),
    'soc 2': ('SOC 2', 'Service Organization', 'https://www.aicpa.org/resources/landing/soc-2'),
    'gdpr': ('GDPR', 'Data Protection', 'https://gdpr-info.eu/'),
    'fatf': ('FATF', 'AML/CFT', 'https://www.fatf-gafi.org/'),

    # DeFi Protocols
    'uniswap': ('Uniswap', 'AMM Protocol', 'https://docs.uniswap.org/'),
    'aave': ('Aave', 'Lending Protocol', 'https://docs.aave.com/'),
    'compound': ('Compound', 'Lending Protocol', 'https://docs.compound.finance/'),
    'chainlink': ('Chainlink', 'Oracle Network', 'https://docs.chain.link/'),

    # Physical Standards
    'ip67': ('IEC 60529', 'IP67 Rating', 'https://www.iec.ch/ip-ratings'),
    'ip68': ('IEC 60529', 'IP68 Rating', 'https://www.iec.ch/ip-ratings'),
}


def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }


def call_groq(prompt, retry=0):
    """Call Groq API to research official standard name."""
    try:
        r = requests.post('https://api.groq.com/openai/v1/chat/completions',
            headers={'Authorization': f'Bearer {GROQ_API_KEY}', 'Content-Type': 'application/json'},
            json={
                'model': 'llama-3.3-70b-versatile',
                'messages': [{'role': 'user', 'content': prompt}],
                'max_tokens': 500,
                'temperature': 0.1
            },
            timeout=60)
        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content']
        elif r.status_code == 429 and retry < 2:
            time.sleep(30)
            return call_groq(prompt, retry + 1)
    except Exception as e:
        print(f'  API error: {e}')
    return None


def find_official_standard(code, title, description):
    """Find the official standard name for a norm."""
    search_text = f"{code} {title} {description or ''}".lower()

    # Check known standards first
    for keyword, (std_name, std_title, std_link) in KNOWN_STANDARDS.items():
        if keyword in search_text:
            return std_name, std_title, std_link

    return None, None, None


def format_official_title(std_name, original_title):
    """Format the official title properly."""
    if std_name:
        # Check if title already contains the standard name
        if std_name.lower() in original_title.lower():
            return original_title
        return f"{std_name}: {original_title}"
    return original_title


def update_norm(norm_id, new_title, official_link):
    """Update norm in database."""
    url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"
    headers = get_headers()
    headers['Prefer'] = 'return=minimal'

    data = {'title': new_title}
    if official_link:
        data['official_link'] = official_link

    r = requests.patch(url, headers=headers, json=data)
    return r.status_code in [200, 204]


def main():
    print("=" * 70)
    print("FIX ALL NORM TITLES WITH OFFICIAL STANDARD NAMES")
    print("=" * 70)

    # Get all norms
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,code,title,description,official_link&order=code",
        headers=get_headers()
    )
    norms = r.json()
    print(f"Total norms: {len(norms)}")

    updated = 0
    skipped = 0

    for i, norm in enumerate(norms):
        code = norm['code']
        title = norm['title']
        description = norm.get('description', '')
        current_link = norm.get('official_link')

        # Find official standard
        std_name, std_title, std_link = find_official_standard(code, title, description)

        if std_name:
            new_title = format_official_title(std_name, title)

            # Only update if title changed
            if new_title != title:
                link_to_use = std_link if not current_link else current_link

                if update_norm(norm['id'], new_title, link_to_use):
                    print(f"[{i+1}/{len(norms)}] OK {code}: {title[:25]}... -> {new_title[:35]}...")
                    updated += 1
                else:
                    print(f"[{i+1}/{len(norms)}] ERR {code}")
            else:
                skipped += 1
        else:
            skipped += 1

        # Progress indicator every 100
        if (i + 1) % 100 == 0:
            print(f"--- Progress: {i+1}/{len(norms)} ({updated} updated, {skipped} skipped) ---")

    print("\n" + "=" * 70)
    print(f"COMPLETE: {updated} updated, {skipped} skipped")
    print("=" * 70)


if __name__ == '__main__':
    main()
