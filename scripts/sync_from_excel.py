#!/usr/bin/env python3
"""
Sync norm titles and sources from the Excel reference file.
Uses ÉVALUATIONS DÉTAIL sheet as the source of truth.
"""
import pandas as pd
import os
import sys
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# Official links for standards mentioned in Source column
OFFICIAL_LINKS = {
    # NIST Standards
    'NIST FIPS 197': ('FIPS 197', 'https://csrc.nist.gov/publications/detail/fips/197/final'),
    'NIST FIPS 180-4': ('FIPS 180-4', 'https://csrc.nist.gov/publications/detail/fips/180/4/final'),
    'NIST FIPS 202': ('FIPS 202', 'https://csrc.nist.gov/publications/detail/fips/202/final'),
    'NIST FIPS 186-4': ('FIPS 186-4', 'https://csrc.nist.gov/publications/detail/fips/186/4/final'),
    'NIST FIPS 186-5': ('FIPS 186-5', 'https://csrc.nist.gov/publications/detail/fips/186/5/final'),
    'NIST FIPS 140-3': ('FIPS 140-3', 'https://csrc.nist.gov/publications/detail/fips/140/3/final'),
    'NIST SP 800-57': ('NIST SP 800-57', 'https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final'),
    'NIST SP 800-63': ('NIST SP 800-63B', 'https://pages.nist.gov/800-63-3/sp800-63b.html'),
    'NIST SP 800-88': ('NIST SP 800-88', 'https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final'),
    'NIST SP 800-90': ('NIST SP 800-90A', 'https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final'),
    'NIST SP 800-132': ('NIST SP 800-132', 'https://csrc.nist.gov/publications/detail/sp/800-132/final'),
    'NIST SP 800-53': ('NIST SP 800-53', 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final'),
    'NIST CSF': ('NIST CSF 2.0', 'https://www.nist.gov/cyberframework'),

    # RFC Standards
    'RFC 2104': ('RFC 2104', 'https://www.rfc-editor.org/rfc/rfc2104'),
    'RFC 4648': ('RFC 4648', 'https://www.rfc-editor.org/rfc/rfc4648'),
    'RFC 5869': ('RFC 5869', 'https://www.rfc-editor.org/rfc/rfc5869'),
    'RFC 6979': ('RFC 6979', 'https://www.rfc-editor.org/rfc/rfc6979'),
    'RFC 7748': ('RFC 7748', 'https://www.rfc-editor.org/rfc/rfc7748'),
    'RFC 7914': ('RFC 7914', 'https://www.rfc-editor.org/rfc/rfc7914'),
    'RFC 8017': ('RFC 8017', 'https://www.rfc-editor.org/rfc/rfc8017'),
    'RFC 8032': ('RFC 8032', 'https://www.rfc-editor.org/rfc/rfc8032'),
    'RFC 8439': ('RFC 8439', 'https://www.rfc-editor.org/rfc/rfc8439'),
    'RFC 8446': ('RFC 8446', 'https://www.rfc-editor.org/rfc/rfc8446'),
    'RFC 9106': ('RFC 9106', 'https://www.rfc-editor.org/rfc/rfc9106'),

    # ISO Standards
    'ISO/IEC 10118-3': ('ISO/IEC 10118-3', 'https://www.iso.org/standard/67116.html'),
    'ISO/IEC 15408': ('ISO/IEC 15408', 'https://www.commoncriteriaportal.org/'),
    'ISO/IEC 18033': ('ISO/IEC 18033', 'https://www.iso.org/standard/54531.html'),
    'ISO/IEC 27001': ('ISO/IEC 27001', 'https://www.iso.org/standard/27001'),
    'ISO/IEC 27002': ('ISO/IEC 27002', 'https://www.iso.org/standard/75652.html'),
    'ISO/IEC 27017': ('ISO/IEC 27017', 'https://www.iso.org/standard/43757.html'),
    'ISO 22301': ('ISO 22301', 'https://www.iso.org/standard/75106.html'),
    'ISO 17712': ('ISO 17712', 'https://www.iso.org/standard/73842.html'),

    # Bitcoin Standards
    'BIP-32': ('BIP-32', 'https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki'),
    'BIP-39': ('BIP-39', 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki'),
    'BIP-44': ('BIP-44', 'https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki'),
    'BIP-49': ('BIP-49', 'https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki'),
    'BIP-84': ('BIP-84', 'https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki'),
    'BIP-85': ('BIP-85', 'https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki'),
    'BIP-86': ('BIP-86', 'https://github.com/bitcoin/bips/blob/master/bip-0086.mediawiki'),
    'BIP-340': ('BIP-340', 'https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki'),
    'BIP-341': ('BIP-341', 'https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki'),
    'BIP-342': ('BIP-342', 'https://github.com/bitcoin/bips/blob/master/bip-0342.mediawiki'),
    'BIP-141': ('BIP-141', 'https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki'),
    'BIP-174': ('BIP-174', 'https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki'),
    'Bitcoin': ('BIP Standards', 'https://github.com/bitcoin/bips'),

    # SLIP Standards
    'SLIP-39': ('SLIP-39', 'https://github.com/satoshilabs/slips/blob/master/slip-0039.md'),
    'SLIP-0039': ('SLIP-39', 'https://github.com/satoshilabs/slips/blob/master/slip-0039.md'),
    'SLIP-0044': ('SLIP-0044', 'https://github.com/satoshilabs/slips/blob/master/slip-0044.md'),
    'Trezor': ('SatoshiLabs SLIP', 'https://github.com/satoshilabs/slips'),

    # Ethereum Standards
    'EIP-20': ('ERC-20', 'https://eips.ethereum.org/EIPS/eip-20'),
    'EIP-155': ('EIP-155', 'https://eips.ethereum.org/EIPS/eip-155'),
    'EIP-191': ('EIP-191', 'https://eips.ethereum.org/EIPS/eip-191'),
    'EIP-712': ('EIP-712', 'https://eips.ethereum.org/EIPS/eip-712'),
    'EIP-721': ('ERC-721', 'https://eips.ethereum.org/EIPS/eip-721'),
    'EIP-1155': ('ERC-1155', 'https://eips.ethereum.org/EIPS/eip-1155'),
    'EIP-1559': ('EIP-1559', 'https://eips.ethereum.org/EIPS/eip-1559'),
    'EIP-2333': ('EIP-2333', 'https://eips.ethereum.org/EIPS/eip-2333'),
    'EIP-2612': ('EIP-2612', 'https://eips.ethereum.org/EIPS/eip-2612'),
    'EIP-4337': ('EIP-4337', 'https://eips.ethereum.org/EIPS/eip-4337'),
    'EIP-4626': ('ERC-4626', 'https://eips.ethereum.org/EIPS/eip-4626'),
    'EIP-6551': ('ERC-6551', 'https://eips.ethereum.org/EIPS/eip-6551'),
    'Ethereum': ('Ethereum Standards', 'https://ethereum.org/'),

    # Security/Industry Standards
    'SEC 2': ('SEC 2', 'https://www.secg.org/sec2-v2.pdf'),
    'SECG': ('SECG', 'https://www.secg.org/'),
    'Common Criteria': ('ISO/IEC 15408', 'https://www.commoncriteriaportal.org/'),
    'CC': ('ISO/IEC 15408', 'https://www.commoncriteriaportal.org/'),
    'SOC 2': ('SOC 2 Type II', 'https://www.aicpa.org/resources/landing/soc-2'),
    'PCI DSS': ('PCI DSS v4.0', 'https://www.pcisecuritystandards.org/'),
    'OWASP': ('OWASP', 'https://owasp.org/'),
    'CCSS': ('CCSS', 'https://cryptoconsortium.org/certifications/ccss/'),
    'FATF': ('FATF', 'https://www.fatf-gafi.org/'),
    'GDPR': ('GDPR', 'https://gdpr.eu/'),
    'MiCA': ('MiCA', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1114'),
    'DORA': ('DORA', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32022R2554'),

    # Hardware/TEE
    'GlobalPlatform': ('GlobalPlatform TEE', 'https://globalplatform.org/specs-library/'),
    'TCG': ('TCG TPM 2.0', 'https://trustedcomputinggroup.org/'),
    'ARM TrustZone': ('ARM TrustZone', 'https://developer.arm.com/documentation/102418/latest/'),
    'Intel SGX': ('Intel SGX', 'https://www.intel.com/content/www/us/en/developer/tools/software-guard-extensions/overview.html'),
    'AMD SEV': ('AMD SEV-SNP', 'https://www.amd.com/en/developer/sev.html'),

    # DeFi
    'Uniswap': ('Uniswap', 'https://docs.uniswap.org/'),
    'Aave': ('Aave', 'https://docs.aave.com/'),
    'Compound': ('Compound', 'https://docs.compound.finance/'),
    'Chainlink': ('Chainlink', 'https://docs.chain.link/'),
    'MakerDAO': ('MakerDAO', 'https://docs.makerdao.com/'),

    # ZK
    'ZK': ('ZK Proofs', 'https://zkproof.org/'),
    'zkSNARK': ('Groth16/PLONK', 'https://eprint.iacr.org/'),
    'zkSTARK': ('STARKs', 'https://starkware.co/'),

    # Default/Internal
    'Interne': ('Internal Criterion', None),
    'Industrie': ('Industry Standard', None),
    'Recherche': ('Research', None),
    'Technique': ('Technical Criterion', None),
    'Fonctionnel': ('Functional Criterion', None),
    'Best Practice': ('Best Practice', None),
}


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }


def get_standard_info(source):
    """Get standard name and link from source."""
    if not source or pd.isna(source):
        return None, None

    source = str(source).strip()

    # Direct lookup
    if source in OFFICIAL_LINKS:
        return OFFICIAL_LINKS[source]

    # Partial match
    for key, (name, link) in OFFICIAL_LINKS.items():
        if key in source or source in key:
            return (name, link)

    # If source looks like a standard reference, use it as-is
    if any(prefix in source for prefix in ['NIST', 'RFC', 'ISO', 'BIP', 'EIP', 'SLIP']):
        return (source, None)

    return (source, None)


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


def is_good_standard(source):
    """Check if source is a real official standard (not internal/generic)."""
    if not source or pd.isna(source):
        return False

    source = str(source).strip().lower()

    # Skip internal/generic sources
    bad_sources = ['interne', 'industrie', 'recherche', 'technique', 'fonctionnel',
                   'best practice', 'bitcoin', 'ethereum', 'trezor', 'nan', '']

    if source in bad_sources:
        return False

    # Good sources have official standard identifiers
    good_prefixes = ['nist', 'fips', 'rfc', 'iso', 'iec', 'bip-', 'eip-', 'erc-',
                     'slip', 'sec ', 'soc', 'pci', 'fatf', 'gdpr', 'mica', 'dora',
                     'owasp', 'ccss', 'common criteria', 'cc eal']

    return any(prefix in source for prefix in good_prefixes)


def main():
    log("=" * 70)
    log("SYNC NORMS FROM EXCEL (INSPIRED, NOT COPIED)")
    log("=" * 70)

    # Read Excel file
    excel_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'SAFE_SCORING_V7_FINAL.xlsx')
    log(f"Reading Excel: {excel_path}")

    df = pd.read_excel(excel_path, sheet_name='ÉVALUATIONS DÉTAIL')

    # Find the header row (row with "ID", "Pilier", etc.)
    header_row = None
    for i in range(10):
        row = df.iloc[i]
        if 'ID' in str(row.values) or 'Norme' in str(row.values):
            header_row = i
            break

    if header_row is None:
        log("ERROR: Could not find header row")
        return

    # Re-read with correct header
    df = pd.read_excel(excel_path, sheet_name='ÉVALUATIONS DÉTAIL', header=header_row)
    log(f"Found {len(df)} rows after header row {header_row}")

    # Identify columns
    id_col = None
    norm_col = None
    desc_col = None
    source_col = None

    for col in df.columns:
        col_str = str(col).lower()
        if col_str == 'id' or 'code' in col_str:
            id_col = col
        elif 'norme' in col_str and 'cat' not in col_str:
            norm_col = col
        elif 'description' in col_str:
            desc_col = col
        elif 'source' in col_str or 'ref' in col_str:
            source_col = col

    log(f"Columns: ID={id_col}, Norm={norm_col}, Desc={desc_col}, Source={source_col}")

    if not all([id_col, norm_col]):
        # Try positional
        cols = df.columns
        id_col = cols[0]  # First col is ID
        norm_col = cols[3]  # Fourth is Norme
        desc_col = cols[4]  # Fifth is Description
        source_col = cols[5]  # Sixth is Source
        log(f"Using positional: ID={id_col}, Norm={norm_col}, Desc={desc_col}, Source={source_col}")

    # Get all norms from database
    log("Fetching norms from database...")
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,code,title&order=code&limit=2000",
        headers=get_headers()
    )
    db_norms = {n['code']: n for n in r.json()}
    log(f"Found {len(db_norms)} norms in database")

    # Process Excel rows
    updated = 0
    skipped_no_std = 0
    skipped_same = 0
    not_found = 0

    for _, row in df.iterrows():
        code = str(row[id_col]).strip() if pd.notna(row[id_col]) else ''

        # Skip non-norm rows
        if not code or not code[0] in 'SAFE' or len(code) < 2:
            continue

        norm_name = str(row[norm_col]).strip() if pd.notna(row[norm_col]) else ''
        description = str(row[desc_col]).strip() if pd.notna(row[desc_col]) else ''
        source = str(row[source_col]).strip() if pd.notna(row[source_col]) else ''

        if not norm_name:
            continue

        # Check if norm exists in database
        if code not in db_norms:
            not_found += 1
            continue

        # ONLY update if Excel has a REAL official standard reference
        if not is_good_standard(source):
            skipped_no_std += 1
            continue

        # Get standard info from source
        std_name, std_link = get_standard_info(source)

        # Build new title with official standard
        if std_name:
            new_title = f"{std_name}: {norm_name}"
        else:
            new_title = norm_name

        db_norm = db_norms[code]
        current_title = db_norm['title']

        # Only update if different and we have a good standard
        if new_title != current_title:
            if update_norm(db_norm['id'], new_title, std_link):
                log(f"OK {code}: {source} -> {new_title[:40]}...")
                updated += 1
            else:
                log(f"ERR {code}")
        else:
            skipped_same += 1

    log("")
    log("=" * 70)
    log(f"COMPLETE:")
    log(f"  - Updated: {updated}")
    log(f"  - Already correct: {skipped_same}")
    log(f"  - Skipped (no official std): {skipped_no_std}")
    log(f"  - Not in DB: {not_found}")
    log("=" * 70)


if __name__ == '__main__':
    main()
