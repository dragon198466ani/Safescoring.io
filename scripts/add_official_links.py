#!/usr/bin/env python3
"""Add official links to norms missing them"""
import requests
import re

from config_helper import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers

headers = get_supabase_headers()

# Official link sources by keyword in title/description
LINK_SOURCES = {
    # Security Standards
    'iso 27001': 'https://www.iso.org/isoiec-27001-information-security.html',
    'iso 27002': 'https://www.iso.org/standard/75652.html',
    'iso 27017': 'https://www.iso.org/standard/43757.html',
    'iso 27018': 'https://www.iso.org/standard/76559.html',
    'iso 27701': 'https://www.iso.org/standard/71670.html',
    'iso 22301': 'https://www.iso.org/standard/75106.html',
    'iso 9001': 'https://www.iso.org/iso-9001-quality-management.html',
    'nist': 'https://www.nist.gov/cyberframework',
    'nist sp 800': 'https://csrc.nist.gov/publications/sp800',
    'owasp': 'https://owasp.org/',
    'owasp top 10': 'https://owasp.org/www-project-top-ten/',
    'cis': 'https://www.cisecurity.org/',
    'cis controls': 'https://www.cisecurity.org/controls',
    'pci dss': 'https://www.pcisecuritystandards.org/',
    'pci': 'https://www.pcisecuritystandards.org/',
    'soc 2': 'https://www.aicpa.org/resources/landing/soc-2',
    'soc2': 'https://www.aicpa.org/resources/landing/soc-2',

    # Crypto Specific
    'eip-': 'https://eips.ethereum.org/',
    'bip-': 'https://github.com/bitcoin/bips',
    'bip32': 'https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki',
    'bip39': 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki',
    'bip44': 'https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki',
    'ccss': 'https://www.ccss.info/',
    'cryptocurrency security': 'https://www.ccss.info/',

    # Regulatory
    'gdpr': 'https://gdpr.eu/',
    'mifid': 'https://www.esma.europa.eu/policy-rules/mifid-ii-and-mifir',
    'mica': 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1114',
    'fatf': 'https://www.fatf-gafi.org/',
    'aml': 'https://www.fatf-gafi.org/recommendations.html',
    'kyc': 'https://www.fatf-gafi.org/recommendations.html',
    'dora': 'https://www.eiopa.europa.eu/browse/digital-operational-resilience-act-dora_en',

    # Hardware/Firmware
    'fips 140': 'https://csrc.nist.gov/projects/cryptographic-module-validation-program',
    'fips': 'https://csrc.nist.gov/projects/cryptographic-module-validation-program',
    'common criteria': 'https://www.commoncriteriaportal.org/',
    'eal': 'https://www.commoncriteriaportal.org/',
    'tpm': 'https://trustedcomputinggroup.org/resource/tpm-library-specification/',
    'secure element': 'https://globalplatform.org/specs-library/',

    # DeFi Specific
    'smart contract': 'https://docs.soliditylang.org/',
    'solidity': 'https://docs.soliditylang.org/',
    'openzeppelin': 'https://docs.openzeppelin.com/',
    'chainlink': 'https://docs.chain.link/',
    'oracle': 'https://docs.chain.link/',
    'uniswap': 'https://docs.uniswap.org/',
    'aave': 'https://docs.aave.com/',
    'compound': 'https://docs.compound.finance/',

    # General crypto
    'encryption': 'https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines',
    'aes': 'https://csrc.nist.gov/publications/detail/fips/197/final',
    'rsa': 'https://www.rfc-editor.org/rfc/rfc8017',
    'ecdsa': 'https://csrc.nist.gov/publications/detail/fips/186/4/final',
    'sha-256': 'https://csrc.nist.gov/publications/detail/fips/180/4/final',
    'sha256': 'https://csrc.nist.gov/publications/detail/fips/180/4/final',
    'tls': 'https://www.rfc-editor.org/rfc/rfc8446',
    'ssl': 'https://www.rfc-editor.org/rfc/rfc8446',
    'https': 'https://www.rfc-editor.org/rfc/rfc2818',

    # Backup and Recovery
    'backup': 'https://www.nist.gov/privacy-framework/nist-sp-800-34',
    'disaster recovery': 'https://www.nist.gov/privacy-framework/nist-sp-800-34',
    'business continuity': 'https://www.iso.org/standard/75106.html',

    # Authentication
    'mfa': 'https://pages.nist.gov/800-63-3/sp800-63b.html',
    '2fa': 'https://pages.nist.gov/800-63-3/sp800-63b.html',
    'multi-factor': 'https://pages.nist.gov/800-63-3/sp800-63b.html',
    'authentication': 'https://pages.nist.gov/800-63-3/sp800-63b.html',
    'fido': 'https://fidoalliance.org/specifications/',
    'webauthn': 'https://www.w3.org/TR/webauthn/',
    'passkey': 'https://fidoalliance.org/passkeys/',

    # Default fallbacks by pillar prefix
    'default_s': 'https://www.ccss.info/',
    'default_a': 'https://www.ccss.info/',
    'default_f': 'https://www.nist.gov/cyberframework',
    'default_e': 'https://ethereum.org/en/developers/docs/',
}

def find_official_link(code, title, description):
    """Find best matching official link for a norm"""
    text = f"{title} {description}".lower()

    # Check each source
    for keyword, url in LINK_SOURCES.items():
        if keyword.startswith('default_'):
            continue
        if keyword in text:
            return url

    # Check code patterns
    if re.search(r'eip-?\d+', code.lower()):
        return 'https://eips.ethereum.org/'
    if re.search(r'bip-?\d+', code.lower()):
        return 'https://github.com/bitcoin/bips'

    # Fallback by pillar
    if code.startswith('S'):
        return LINK_SOURCES['default_s']
    elif code.startswith('A'):
        return LINK_SOURCES['default_a']
    elif code.startswith('F'):
        return LINK_SOURCES['default_f']
    elif code.startswith('E'):
        return LINK_SOURCES['default_e']

    return 'https://www.ccss.info/'

def main():
    print('AJOUT DES LIENS OFFICIELS MANQUANTS')
    print('=' * 70)

    # Get norms missing official_link
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/norms?official_link=is.null&select=code,title,description',
        headers=headers
    )

    if resp.status_code != 200:
        print(f'Error: {resp.status_code}')
        return

    norms = resp.json()
    print(f'Normes sans lien officiel: {len(norms)}')
    print('-' * 70)

    success = 0
    errors = 0

    for norm in norms:
        code = norm['code']
        title = norm.get('title', '')
        description = norm.get('description', '')

        link = find_official_link(code, title, description)

        resp = requests.patch(
            f'{SUPABASE_URL}/rest/v1/norms?code=eq.{code}',
            headers=headers,
            json={'official_link': link}
        )

        if resp.status_code in [200, 204]:
            success += 1
            if success % 50 == 0:
                print(f'[{success}/{len(norms)}] Progression...')
        else:
            errors += 1
            print(f'[ERR] {code}: {resp.status_code}')

    print()
    print('=' * 70)
    print(f'RESULTAT: {success} liens ajoutes, {errors} erreurs')

if __name__ == '__main__':
    main()
