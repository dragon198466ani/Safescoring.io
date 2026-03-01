#!/usr/bin/env python3
"""
Generate norm_applicability for new types 80 (Companion App) and 81 (Bearer Token).
Uses the NORM_APPLICABILITY dict from norm_applicability_complete.py
"""
import sys, os, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
from config import SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_KEY
from norm_applicability_complete import NORM_APPLICABILITY, get_applicable_norms
import requests

write_key = SUPABASE_SERVICE_KEY if SUPABASE_SERVICE_KEY else SUPABASE_KEY
H_WRITE = {
    'apikey': write_key,
    'Authorization': f'Bearer {write_key}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
}
H_READ = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}
BASE = SUPABASE_URL + '/rest/v1'


def fetch_all_norms():
    """Fetch all norms from DB."""
    norms = []
    offset = 0
    while True:
        r = requests.get(
            f'{BASE}/norms?select=id,code&order=id&limit=1000&offset={offset}',
            headers=H_READ
        )
        batch = r.json()
        if not batch:
            break
        norms.extend(batch)
        offset += 1000
    return norms


def generate_for_type(type_id, canonical_type, norms):
    """Generate applicability for a type using canonical type mapping."""
    applicable_codes = set(get_applicable_norms(canonical_type))

    records = []
    for norm in norms:
        code = norm['code']
        is_applicable = code in applicable_codes
        records.append({
            'type_id': type_id,
            'norm_id': norm['id'],
            'is_applicable': is_applicable
        })

    return records


def generate_companion_app(type_id, norms):
    """
    Custom applicability for Companion / Approval App (type 80).

    A companion app is a mobile/desktop app that:
    - Approves/denies transactions from parent platform
    - Shows balances and activity
    - Does NOT hold keys or initiate transactions
    - Has 2FA, biometrics, session management

    Applicable norms: authentication, mobile security, privacy, UX
    NOT applicable: hardware, key management, seed phrases, DeFi, physical
    """
    # Get SW_WALLET norms as base (it's a software app)
    sw_wallet_norms = set(get_applicable_norms('SW_WALLET'))

    # Also get CUSTODY norms (since companion apps are for custody platforms)
    custody_norms = set(get_applicable_norms('CUSTODY'))

    # Combine: norms that apply to BOTH sw_wallet AND custody
    # This gives us the intersection - security/auth norms common to both
    # Plus anything specific to either
    base_norms = sw_wallet_norms | custody_norms

    # Remove norms that don't apply to a companion app
    # Key management / seed norms don't apply (no keys on device)
    key_mgmt_prefixes = [
        'S-BIP32', 'S-BIP39', 'S-BIP44', 'S-BIP84', 'S-BIP85', 'S-BIP86',
        'S-SLIP39',
        'S-KEY-', 'S-SEED-', 'S-PRIV-',
        'S-MULTISIG',
        'A-HDN-',  # Hardware device norms
        'A-DRS-',  # Disaster recovery (seed-based)
        'F-',      # ALL Fidelity/Physical norms
        'E-BAT',   # Battery
        'E-ERGO',  # Ergonomics (physical)
        'E-DEFI',  # DeFi features
        'E-GAS',   # Gas optimization
        'E-L2',    # Layer 2
        'E-CROSS', # Cross-chain
        'E-SC',    # Smart contract
        'E-SWAP',  # Swap features
        'E-STAKE', # Staking
        'E-YIELD', # Yield
        'E-LEND',  # Lending
        'E-FARM',  # Farming
        'E-NFT',   # NFT features
    ]

    records = []
    for norm in norms:
        code = norm['code']
        is_applicable = code in base_norms

        # Override: remove key/seed/physical/defi norms
        if is_applicable:
            for prefix in key_mgmt_prefixes:
                if code.startswith(prefix):
                    is_applicable = False
                    break

        records.append({
            'type_id': type_id,
            'norm_id': norm['id'],
            'is_applicable': is_applicable
        })

    return records


def upsert_batch(records, batch_size=500):
    """Upsert records in batches."""
    total = 0
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        r = requests.post(f'{BASE}/norm_applicability', headers=H_WRITE, json=batch)
        if r.status_code in (200, 201):
            total += len(batch)
        else:
            print(f'  ERR batch {i}: {r.status_code} {r.text[:150]}')
        time.sleep(0.1)
    return total


# ============================================
# MAIN
# ============================================
print('=' * 60)
print('  GENERATE APPLICABILITY FOR NEW TYPES')
print('=' * 60)

# Load all norms
print('\nLoading norms...')
norms = fetch_all_norms()
print(f'  {len(norms)} norms loaded')

# Type 80 - Companion / Approval App
print('\n[TYPE 80] Companion / Approval App')
records_80 = generate_companion_app(80, norms)
applicable_80 = sum(1 for r in records_80 if r['is_applicable'])
print(f'  {applicable_80} applicable / {len(records_80)} total')
saved_80 = upsert_batch(records_80)
print(f'  {saved_80} saved')

# Type 81 - Bearer Token (Physical Funded Coin)
# Closest canonical type: BKP_PHYSICAL
print('\n[TYPE 81] Physical Funded Coin (Bearer Token)')
records_81 = generate_for_type(81, 'BKP_PHYSICAL', norms)
applicable_81 = sum(1 for r in records_81 if r['is_applicable'])
print(f'  {applicable_81} applicable / {len(records_81)} total')
saved_81 = upsert_batch(records_81)
print(f'  {saved_81} saved')

print('\n' + '=' * 60)
print(f'  DONE')
print('=' * 60)
