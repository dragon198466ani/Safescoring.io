#!/usr/bin/env python3
"""
Update norm titles to include official standard names.
Maps internal criterion names to their official standard references.
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# Official standard mappings: code -> (official_title, official_link, access_type)
OFFICIAL_STANDARDS = {
    # Authentication Standards (NIST)
    'A-CEX-2FA': ('NIST SP 800-63B: Multi-Factor Authentication', 'https://pages.nist.gov/800-63-3/sp800-63b.html', 'G'),
    'A06': ('NIST SP 800-63B: Silent Alert Authentication', 'https://pages.nist.gov/800-63-3/sp800-63b.html', 'G'),
    'A10': ('NIST SP 800-63B: Graduated Response Authentication', 'https://csrc.nist.gov/publications/detail/sp/800-63b/final', 'G'),

    # Duress/Panic Standards (BIP-85)
    'A01': ('BIP-85: Duress PIN Derivation', 'https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki', 'G'),
    'A-DRS-001': ('BIP-85: Duress PIN Support', 'https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki', 'G'),
    'A-DRS-002': ('BIP-85: Duress Mode Indistinguishable', 'https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki', 'G'),
    'A-DRS-003': ('BIP-85: Multiple Duress Levels', 'https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki', 'G'),
    'A-CRYPTO-DURESS': ('BIP-85: Duress PIN / Panic Wallet', 'https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki', 'G'),

    # Wipe/Sanitization (NIST SP 800-88)
    'A02': ('NIST SP 800-88: Secure Wipe PIN', 'https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final', 'G'),
    'A-PNC-002': ('NIST SP 800-88: Instant Wipe Capability', 'https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final', 'G'),
    'A49': ('NIST SP 800-88: Remote Wipe', 'https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final', 'G'),
    'A133': ('NIST SP 800-88: Secure Data Destruction', 'https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final', 'G'),

    # Key Derivation (BIP Standards)
    'S10': ('BIP-32: Hierarchical Deterministic Wallets', 'https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki', 'G'),
    'S11': ('BIP-39: Mnemonic Code for Seed Generation', 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki', 'G'),
    'S12': ('BIP-44: Multi-Account HD Wallets', 'https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki', 'G'),
    'A-CRYPTO-SSS': ('SLIP-39: Shamir Secret Sharing', 'https://github.com/satoshilabs/slips/blob/master/slip-0039.md', 'G'),
    'S-SLIP-001': ('SLIP-39: Shamir Backup', 'https://github.com/satoshilabs/slips/blob/master/slip-0039.md', 'G'),

    # Cryptographic Standards (NIST/FIPS)
    'S01': ('FIPS 197: AES-256 Encryption', 'https://csrc.nist.gov/publications/detail/fips/197/final', 'G'),
    'S02': ('FIPS 186-5: ECDSA Signatures', 'https://csrc.nist.gov/publications/detail/fips/186/5/final', 'G'),
    'S03': ('FIPS 180-4: SHA-256 Hashing', 'https://csrc.nist.gov/publications/detail/fips/180/4/final', 'G'),
    'S95': ('RFC 8018: bcrypt/PBKDF2', 'https://www.rfc-editor.org/rfc/rfc8018', 'G'),
    'S232': ('Noise Protocol Framework', 'https://noiseprotocol.org/noise.html', 'G'),

    # Common Criteria (ISO/IEC 15408)
    'A-CC-001': ('ISO/IEC 15408: Common Criteria EAL5+', 'https://www.commoncriteriaportal.org/cc/', 'G'),
    'A-CC-002': ('ISO/IEC 15408: Common Criteria EAL6+', 'https://www.commoncriteriaportal.org/cc/', 'G'),
    'A-CC-003': ('ISO/IEC 15408: Common Criteria Tamper Detection', 'https://www.commoncriteriaportal.org/cc/', 'G'),
    'A-CC-15408': ('ISO/IEC 15408: Common Criteria Framework', 'https://www.commoncriteriaportal.org/cc/', 'G'),

    # Hardware Security (FIPS 140-3)
    'S-FIPS-140-3': ('FIPS 140-3: Cryptographic Module Validation', 'https://csrc.nist.gov/publications/detail/fips/140/3/final', 'G'),
    'S117': ('Intel SGX: Software Guard Extensions', 'https://www.intel.com/content/www/us/en/developer/tools/software-guard-extensions/overview.html', 'G'),

    # Ethereum Standards (EIPs)
    'E11': ('EIP-20: ERC-20 Token Standard', 'https://eips.ethereum.org/EIPS/eip-20', 'G'),
    'E12': ('EIP-721: ERC-721 NFT Standard', 'https://eips.ethereum.org/EIPS/eip-721', 'G'),
    'E13': ('EIP-1155: Multi Token Standard', 'https://eips.ethereum.org/EIPS/eip-1155', 'G'),
    'E14': ('EIP-1559: Fee Market Change', 'https://eips.ethereum.org/EIPS/eip-1559', 'G'),
    'E15': ('EIP-4337: Account Abstraction', 'https://eips.ethereum.org/EIPS/eip-4337', 'G'),

    # ISO Security Standards
    'F-ISO-27001': ('ISO/IEC 27001: Information Security Management', 'https://www.iso.org/standard/27001', 'P'),
    'F-ISO-27017': ('ISO/IEC 27017: Cloud Security Controls', 'https://www.iso.org/standard/43757.html', 'P'),
    'F-ISO-001': ('ISO/IEC 27001: Information Security', 'https://www.iso.org/standard/27001', 'P'),
    'F-ISO-002': ('ISO/IEC 27002: Security Controls', 'https://www.iso.org/standard/75652.html', 'P'),

    # NIST Cybersecurity Framework
    'F-NIST-CSF2': ('NIST CSF 2.0: Cybersecurity Framework', 'https://www.nist.gov/cyberframework', 'G'),
    'S140': ('BSI IT-Grundschutz: German Security Standard', 'https://www.bsi.bund.de/EN/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/IT-Grundschutz/it-grundschutz_node.html', 'G'),
    'S111': ('PCI DSS v4.0: Payment Card Security', 'https://www.pcisecuritystandards.org/document_library/', 'G'),

    # Physical Security (MIL-STD)
    'F67': ('MIL-STD-810G: Environmental Engineering', 'https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=35978', 'G'),
    'F112': ('MIL-STD-461G: EMI/EMC Requirements', 'https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=36322', 'G'),
    'F113': ('MIL-STD-883: Microelectronics Test Methods', 'https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=36218', 'G'),

    # Accessibility Standards
    'E151': ('EN 301 549: ICT Accessibility Standard', 'https://www.etsi.org/deliver/etsi_en/301500_301599/301549/', 'G'),
    'E152': ('RGAA 4.1: French Accessibility Guidelines', 'https://www.numerique.gouv.fr/publications/rgaa-accessibilite/', 'G'),
    'E157': ('ISO 9241-210: Human-Centred Design', 'https://www.iso.org/standard/77520.html', 'P'),
    'E158': ('ISO 9241-11: Usability Framework', 'https://www.iso.org/standard/63500.html', 'P'),

    # Anti-Money Laundering (FATF)
    'A-CEX-LIMIT': ('FATF R.16: Wire Transfer Rule', 'https://www.fatf-gafi.org/en/topics/fatf-recommendations.html', 'G'),
    'A-CEX-WHITELIST': ('FATF R.16: Travel Rule Compliance', 'https://www.fatf-gafi.org/en/topics/fatf-recommendations.html', 'G'),
}


def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }


def update_norm(norm_id, code, new_title, official_link, access_type):
    """Update norm with official title and link."""
    url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"
    headers = get_headers()
    headers['Prefer'] = 'return=minimal'

    data = {
        'title': new_title,
        'official_link': official_link,
        'access_type': access_type
    }

    r = requests.patch(url, headers=headers, json=data)
    return r.status_code in [200, 204]


def main():
    print("=" * 70)
    print("UPDATE NORM TITLES WITH OFFICIAL STANDARD NAMES")
    print("=" * 70)

    # Get all norms
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,code,title,official_link",
        headers=get_headers()
    )
    norms = r.json()
    print(f"Total norms: {len(norms)}")

    updated = 0
    for norm in norms:
        code = norm['code']
        current_title = norm['title']

        if code in OFFICIAL_STANDARDS:
            new_title, official_link, access_type = OFFICIAL_STANDARDS[code]

            if current_title != new_title:
                if update_norm(norm['id'], code, new_title, official_link, access_type):
                    print(f"OK {code}: {current_title[:30]}... -> {new_title[:40]}...")
                    updated += 1
                else:
                    print(f"ERR {code}: Failed to update")

    print("\n" + "=" * 70)
    print(f"Updated: {updated} norms with official standard names")
    print("=" * 70)


if __name__ == '__main__':
    main()
