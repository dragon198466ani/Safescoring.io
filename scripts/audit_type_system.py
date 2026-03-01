#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
COMPREHENSIVE TYPE SYSTEM AUDIT
Verifies: flags, definitions, pre-filtering rules, TYPE_ALIASES coverage,
NORM_CATEGORIES coverage, and identifies optimization gaps.
"""
import sys, os, re, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
from config import SUPABASE_URL, SUPABASE_KEY
import requests

HR = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json'}
BASE = SUPABASE_URL + '/rest/v1'

def load_all(table, select, filters=''):
    items = []
    offset = 0
    while True:
        r = requests.get(f'{BASE}/{table}?select={select}&order=id&limit=1000&offset={offset}{filters}', headers=HR)
        if r.status_code != 200: break
        batch = r.json()
        if not batch: break
        items.extend(batch)
        offset += 1000
    return items

# =====================================================================
# LOAD ALL DATA
# =====================================================================
print('Loading data...')
types = requests.get(f'{BASE}/product_types?select=*&order=id&limit=200', headers=HR).json()
norms = load_all('norms', 'id,code,title,pillar,description')
products = load_all('products', 'id,name,type_id,is_active', '&is_active=eq.true')

# Count products per type
from collections import Counter
prod_per_type = Counter(p.get('type_id') for p in products)

print(f'Loaded: {len(types)} types, {len(norms)} norms, {len(products)} active products')

total_issues = 0

# =====================================================================
# SECTION 1: FLAGS AUDIT (is_hardware, is_wallet, is_defi, is_protocol)
# =====================================================================
print(f'\n{"="*70}')
print(f'  SECTION 1: FLAGS AUDIT')
print(f'{"="*70}')

# Expected flags based on deep domain knowledge
EXPECTED_FLAGS = {
    # id: (is_hardware, is_wallet, is_defi, is_protocol, reason)
    1:  (True,  True,  False, False, 'HW Cold - physical hardware wallet'),
    2:  (False, True,  False, False, 'SW Desktop - software wallet'),
    3:  (False, True,  False, False, 'SW Mobile - software wallet'),
    4:  (False, True,  False, False, 'SW Browser - software wallet (extension)'),
    5:  (False, True,  False, False, 'MPC Wallet - software wallet with MPC'),
    6:  (False, True,  False, False, 'Smart Wallet (AA) - software wallet'),
    7:  (False, True,  False, False, 'Wallet Multisig - software wallet'),
    8:  (False, False, False, False, 'Custody MPC - custodial service, not a wallet'),
    9:  (True,  False, False, False, 'Physical Backup - metal plate, hardware'),
    10: (False, False, False, False, 'CEX - centralized exchange'),
    11: (False, False, True,  True,  'DEX - decentralized exchange, DeFi protocol'),
    12: (False, False, True,  True,  'DEX Aggregator - DeFi protocol'),
    13: (False, False, False, True,  'AMM - automated market maker, protocol'),
    14: (False, False, False, False, 'P2P Exchange - peer-to-peer marketplace'),
    15: (False, False, True,  True,  'Derivatives DEX - DeFi protocol'),
    16: (False, False, True,  True,  'Lending - DeFi lending protocol'),
    17: (False, False, True,  True,  'Yield - DeFi yield protocol'),
    18: (False, False, True,  True,  'Liquid Staking - DeFi protocol'),
    19: (False, False, True,  True,  'Staking - DeFi staking'),
    20: (False, False, False, False, 'OTC Desk - over-the-counter trading'),
    21: (False, False, False, True,  'Protocol - generic protocol'),
    22: (False, False, True,  True,  'Bridges - DeFi cross-chain bridge'),
    23: (False, False, False, True,  'Oracle - data feed protocol'),
    24: (False, False, True,  True,  'Stablecoin - DeFi token protocol'),
    25: (False, False, True,  True,  'Restaking - DeFi restaking protocol'),
    26: (False, False, True,  True,  'Index Fund - DeFi index protocol'),
    27: (False, False, True,  True,  'Synthetics - DeFi synthetic assets'),
    28: (False, False, False, False, 'NFT Marketplace - marketplace platform'),
    29: (False, False, True,  True,  'Insurance - DeFi insurance protocol'),
    30: (False, False, True,  True,  'Options - DeFi options protocol'),
    31: (False, False, False, False, 'Launchpad - token launch platform'),
    32: (False, False, True,  True,  'Prediction Market - DeFi prediction'),
    33: (False, False, True,  True,  'DeFi Tools - DeFi utilities'),
    34: (False, False, False, True,  'DAO - governance protocol'),
    35: (False, False, True,  True,  'RWA - real world assets tokenization'),
    36: (False, False, False, False, 'Crypto Bank - banking service'),
    37: (False, False, False, False, 'Crypto Card - payment card'),
    38: (False, False, False, False, 'Fiat Gateway - payment on/off ramp'),
    39: (False, False, False, True,  'Payment Streaming - payment protocol'),
    40: (False, False, False, False, 'Neobank - banking service'),
    41: (False, False, False, False, 'Custody Multisig - custodial service'),
    42: (False, True,  False, False, 'Wallet Multiplatform - multi-platform wallet'),
    43: (False, False, False, False, 'Trading Bot - automated trading'),
    44: (False, False, False, False, 'Tax & Compliance - tax tools'),
    45: (False, False, False, True,  'Messaging - messaging protocol'),
    46: (False, False, False, True,  'L2 - layer 2 protocol'),
    47: (False, False, False, True,  'Privacy Protocol - privacy technology'),
    48: (False, False, False, True,  'Identity - identity protocol'),
    49: (False, False, False, True,  'Attestation - attestation protocol'),
    50: (False, False, False, True,  'dVPN - decentralized VPN protocol'),
    51: (False, False, False, True,  'Storage - decentralized storage protocol'),
    52: (False, False, False, True,  'Compute - decentralized compute protocol'),
    53: (False, False, False, False, 'Research/Analytics - info service'),
    54: (False, False, False, False, 'Explorer - blockchain explorer'),
    55: (False, False, False, True,  'Node/RPC - infrastructure protocol'),
    56: (False, False, False, False, 'Dev Tools - developer tools'),
    57: (False, False, False, False, 'Security - security service'),
    58: (False, True,  False, False, 'BKP Digital - digital backup wallet'),
    59: (False, False, False, True,  'Data Indexer - data indexing protocol'),
    60: (False, False, False, False, 'Enterprise Custody - custodial service'),
    61: (False, False, False, False, 'Institutional (Prime) - prime broker'),
    62: (False, False, False, False, 'Inheritance - inheritance service'),
    63: (False, False, False, True,  'Infrastructure - infrastructure protocol'),
    64: (False, False, False, False, 'Seed Splitter - seed management tool'),
    65: (True,  True,  False, False, 'Airgap Signer - hardware signing device'),
    66: (False, False, False, True,  'SocialFi - social finance protocol'),
    67: (False, False, False, True,  'Atomic Swap - swap protocol'),
    68: (False, False, False, False, 'Mining/Compute Pool - mining service'),
    69: (False, False, True,  True,  'Vault/Yield Agg - DeFi yield aggregator'),
    70: (False, False, True,  True,  'Locker/Vesting - DeFi token locking'),
    71: (False, False, False, True,  'Quest Platform - quest/airdrop protocol'),
    72: (False, False, False, True,  'MEV Protection - MEV protocol'),
    73: (False, False, False, True,  'Intent Protocol - intent-based protocol'),
    74: (False, False, False, False, 'Cross-chain Aggregator - aggregator service'),
    75: (False, False, False, True,  'Settlement - settlement protocol'),
    76: (False, False, False, True,  'Treasury - treasury protocol'),
    77: (False, False, False, True,  'AI Agent - AI protocol'),
    78: (False, False, False, False, 'CeFi Lending - centralized lending'),
    79: (True,  True,  False, False, 'HW NFC Signer - hardware NFC signing device'),
    80: (False, True,  False, False, 'Companion App - wallet companion'),
    81: (True,  False, False, False, 'Bearer Token - physical token'),
}

flag_issues = []
for t in types:
    tid = t['id']
    if tid not in EXPECTED_FLAGS:
        flag_issues.append(f'  [!] Type {tid} ({t.get("name")}) - NOT IN EXPECTED FLAGS')
        continue

    exp_hw, exp_wal, exp_defi, exp_proto, reason = EXPECTED_FLAGS[tid]
    actual_hw = bool(t.get('is_hardware'))
    actual_wal = bool(t.get('is_wallet'))
    actual_defi = bool(t.get('is_defi'))
    actual_proto = bool(t.get('is_protocol'))

    mismatches = []
    if actual_hw != exp_hw: mismatches.append(f'is_hardware={actual_hw} (expected {exp_hw})')
    if actual_wal != exp_wal: mismatches.append(f'is_wallet={actual_wal} (expected {exp_wal})')
    if actual_defi != exp_defi: mismatches.append(f'is_defi={actual_defi} (expected {exp_defi})')
    if actual_proto != exp_proto: mismatches.append(f'is_protocol={actual_proto} (expected {exp_proto})')

    if mismatches:
        flag_issues.append(f'  [X] [{tid}] {t.get("name","?")} ({reason}): {", ".join(mismatches)}')

if flag_issues:
    print(f'\n  FLAG MISMATCHES: {len(flag_issues)}')
    for i in flag_issues:
        try: print(i)
        except: pass
    total_issues += len(flag_issues)
else:
    print(f'\n  All flags correct (0 mismatches)')

# Summary of flags
hw = [t for t in types if t.get('is_hardware')]
wal = [t for t in types if t.get('is_wallet')]
defi = [t for t in types if t.get('is_defi')]
proto = [t for t in types if t.get('is_protocol')]
none_flags = [t for t in types if not any([t.get('is_hardware'), t.get('is_wallet'), t.get('is_defi'), t.get('is_protocol')])]

print(f'\n  Flag summary:')
print(f'    is_hardware=true:  {len(hw)} types -> {[t["id"] for t in hw]}')
print(f'    is_wallet=true:    {len(wal)} types -> {[t["id"] for t in wal]}')
print(f'    is_defi=true:      {len(defi)} types -> {[t["id"] for t in defi]}')
print(f'    is_protocol=true:  {len(proto)} types -> {[t["id"] for t in proto]}')
print(f'    NO flags at all:   {len(none_flags)} types -> {[t["id"] for t in none_flags]}')

# =====================================================================
# SECTION 2: DEFINITIONS QUALITY AUDIT
# =====================================================================
print(f'\n{"="*70}')
print(f'  SECTION 2: DEFINITIONS & DESCRIPTIONS QUALITY')
print(f'{"="*70}')

quality_issues = []
for t in types:
    tid = t['id']
    name = t.get('name', '?')
    code = t.get('code', '?')

    # Check definition
    defn = t.get('definition') or ''
    desc = t.get('description') or ''
    ef = t.get('evaluation_focus') or ''
    pw = t.get('pillar_weights')
    rf = t.get('risk_factors')
    ex = t.get('examples') or ''
    inc = t.get('includes')
    exc = t.get('excludes')
    kw = t.get('keywords')

    issues = []

    # Definition quality
    if len(defn) < 50:
        issues.append(f'definition too short ({len(defn)} chars)')
    if len(desc) < 30:
        issues.append(f'description too short ({len(desc)} chars)')
    if len(ef) < 30:
        issues.append(f'evaluation_focus too short ({len(ef)} chars)')

    # Check if definition mentions key characteristics
    if t.get('is_hardware') and 'hardware' not in defn.lower() and 'physical' not in defn.lower() and 'device' not in defn.lower():
        issues.append('is_hardware=true but definition lacks hardware/physical/device keyword')
    if t.get('is_defi') and 'defi' not in defn.lower() and 'decentralized' not in defn.lower() and 'smart contract' not in defn.lower() and 'protocol' not in defn.lower():
        issues.append('is_defi=true but definition lacks DeFi/decentralized/smart contract keyword')

    # Check pillar_weights format
    if pw:
        if isinstance(pw, str):
            try: pw = json.loads(pw)
            except: issues.append('pillar_weights: invalid JSON')
        if isinstance(pw, dict):
            for pillar in ['S', 'A', 'F', 'E']:
                if pillar not in pw:
                    issues.append(f'pillar_weights missing pillar {pillar}')
            total = sum(pw.get(p, 0) for p in ['S', 'A', 'F', 'E'])
            if abs(total - 100) > 1:
                issues.append(f'pillar_weights sum={total} (should be 100)')
    else:
        issues.append('no pillar_weights')

    # Check risk_factors
    if rf:
        if isinstance(rf, str):
            try: rf = json.loads(rf)
            except: issues.append('risk_factors: invalid JSON')
        if isinstance(rf, list) and len(rf) < 2:
            issues.append(f'risk_factors too few ({len(rf)})')
    else:
        issues.append('no risk_factors')

    # Check examples
    if not ex or len(str(ex)) < 5:
        issues.append('no examples')

    # Check includes/excludes
    if not inc:
        issues.append('no includes')
    if not exc:
        issues.append('no excludes')

    # Check keywords
    if not kw:
        issues.append('no keywords')

    if issues:
        quality_issues.append((tid, name, code, issues))

if quality_issues:
    print(f'\n  Types with quality issues: {len(quality_issues)}')
    for tid, name, code, issues in quality_issues:
        cnt = prod_per_type.get(tid, 0)
        try:
            print(f'  [{tid}] {code:15s} {name:35s} ({cnt} products) -> {len(issues)} issues:')
            for i in issues:
                print(f'        - {i}')
        except: pass
    total_issues += len(quality_issues)
else:
    print(f'\n  All types have complete quality data')

# =====================================================================
# SECTION 3: NORM_CATEGORIES COVERAGE
# =====================================================================
print(f'\n{"="*70}')
print(f'  SECTION 3: NORM_CATEGORIES PRE-FILTERING COVERAGE')
print(f'{"="*70}')

# Import the actual categories
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))

# Read the NORM_CATEGORIES from applicability_generator
norm_cats_in_code = {}
with open(os.path.join(os.path.dirname(__file__), '..', 'src', 'core', 'applicability_generator.py'), 'r') as f:
    content = f.read()
    # Extract NORM_CATEGORIES dict
    match = re.search(r'NORM_CATEGORIES\s*=\s*\{([^}]+)\}', content, re.DOTALL)
    if match:
        for line in match.group(1).split('\n'):
            m = re.match(r"\s*'([A-Z]\d+)'\s*:\s*'([^']+)'", line)
            if m:
                norm_cats_in_code[m.group(1)] = m.group(2)

# Check how many norms are covered by NORM_CATEGORIES
norms_with_cat = set()
norms_without_cat = set()
for n in norms:
    code = n.get('code', '')
    if code in norm_cats_in_code:
        norms_with_cat.add(code)
    else:
        norms_without_cat.add(code)

print(f'\n  Norms with category mapping (pre-filterable): {len(norms_with_cat)}/{len(norms)}')
print(f'  Norms WITHOUT category mapping (always need AI): {len(norms_without_cat)}/{len(norms)}')
print(f'  Pre-filtering coverage: {len(norms_with_cat)/len(norms)*100:.1f}%')

# Break down by pillar
for pillar in ['S', 'A', 'F', 'E']:
    p_norms = [n for n in norms if n.get('pillar') == pillar]
    p_covered = [n for n in p_norms if n.get('code') in norm_cats_in_code]
    print(f'    Pillar {pillar}: {len(p_covered)}/{len(p_norms)} covered ({len(p_covered)/max(len(p_norms),1)*100:.0f}%)')

# List categories and their coverage
print(f'\n  HARDWARE_ONLY_CATEGORIES ({len([c for c in norm_cats_in_code.values() if c in ["Auth","Biometrie","Firmware","Boot","SE","Secure Element","TEE","Anti-Tamper","Batterie","Ergo","Meca","Environ","Materiaux","Chimique","Feu","EM","MIL","Space","Transport"]])} norms):')
hw_cats = ['Auth', 'Biometrie', 'Firmware', 'Boot', 'SE', 'TEE', 'Anti-Tamper', 'Batterie', 'Ergo',
           'Meca', 'Environ', 'Materiaux', 'Chimique', 'Feu', 'EM']
for cat in hw_cats:
    cnt = sum(1 for v in norm_cats_in_code.values() if v == cat)
    print(f'    {cat}: {cnt} norms')

print(f'\n  DEFI_ONLY_CATEGORIES:')
defi_cats = ['DeFi', 'Gas', 'L2', 'Cross-chain', 'SC Audit', 'Blockchain']
for cat in defi_cats:
    cnt = sum(1 for v in norm_cats_in_code.values() if v == cat)
    print(f'    {cat}: {cnt} norms')

print(f'\n  WALLET_ONLY_CATEGORIES:')
wal_cats = ['BIP']
for cat in wal_cats:
    cnt = sum(1 for v in norm_cats_in_code.values() if v == cat)
    print(f'    {cat}: {cnt} norms')

# =====================================================================
# SECTION 4: TYPE_ALIASES COVERAGE
# =====================================================================
print(f'\n{"="*70}')
print(f'  SECTION 4: TYPE_ALIASES MAPPING COVERAGE')
print(f'{"="*70}')

# Check if every type code in the DB maps to a canonical type
db_codes = {t.get('code', '').upper(): t for t in types}
# Load TYPE_ALIASES from the file
aliases = {}
with open(os.path.join(os.path.dirname(__file__), '..', 'src', 'core', 'norm_applicability_complete.py'), 'r', encoding='utf-8') as f:
    in_aliases = False
    for line in f:
        if 'TYPE_ALIASES' in line and '=' in line:
            in_aliases = True
            continue
        if in_aliases:
            if line.strip() == '}':
                break
            m = re.match(r"\s+'([^']+)'\s*:\s*'([^']+)'", line)
            if m:
                aliases[m.group(1)] = m.group(2)

# Also load ALL_PRODUCT_TYPES (canonical types)
canonical_types = set()
with open(os.path.join(os.path.dirname(__file__), '..', 'src', 'core', 'norm_applicability_complete.py'), 'r', encoding='utf-8') as f:
    in_canon = False
    for line in f:
        if 'ALL_PRODUCT_TYPES' in line and '=' in line:
            in_canon = True
            continue
        if in_canon:
            if line.strip() == ']':
                break
            m = re.match(r"\s+'([^']+)'", line)
            if m:
                canonical_types.add(m.group(1))

print(f'\n  Canonical types: {len(canonical_types)}')
print(f'  TYPE_ALIASES entries: {len(aliases)}')
print(f'  DB type codes: {len(db_codes)}')

unmapped = []
for code, t in db_codes.items():
    if code in canonical_types:
        continue  # Is itself canonical
    if code in aliases:
        continue  # Has an alias
    # Also check with underscores/spaces
    alt1 = code.replace(' ', '_')
    alt2 = code.replace('_', ' ')
    if alt1 in aliases or alt2 in aliases or alt1 in canonical_types or alt2 in canonical_types:
        continue
    unmapped.append((t['id'], t.get('name'), code))

if unmapped:
    print(f'\n  UNMAPPED DB CODES (no alias to canonical type): {len(unmapped)}')
    for tid, name, code in unmapped:
        cnt = prod_per_type.get(tid, 0)
        try:
            print(f'    [{tid}] code="{code}" name="{name}" ({cnt} products)')
        except: pass
    total_issues += len(unmapped)
else:
    print(f'\n  All DB type codes are mapped to canonical types')

# Check for canonical types with no alias back to any DB code
alias_targets = set(aliases.values())
unused_canonical = canonical_types - alias_targets
# Also check if a canonical type is itself a DB code (uppercase match)
for ct in list(unused_canonical):
    for code in db_codes:
        if code == ct or code.replace(' ', '_') == ct or code.replace('_', ' ') == ct:
            unused_canonical.discard(ct)
            break

if unused_canonical:
    print(f'\n  Canonical types with NO alias from any DB code: {len(unused_canonical)}')
    for ct in sorted(unused_canonical):
        print(f'    {ct}')

# =====================================================================
# SECTION 5: PRE-FILTERING OPTIMIZATION ANALYSIS
# =====================================================================
print(f'\n{"="*70}')
print(f'  SECTION 5: PRE-FILTERING OPTIMIZATION ANALYSIS')
print(f'{"="*70}')

# Identify norm groups that could benefit from pre-filtering but aren't covered
# Group norms by prefix pattern
norm_prefixes = Counter()
for n in norms:
    code = n.get('code', '')
    # Extract prefix (letters before numbers)
    m = re.match(r'^([A-Z][-A-Z]*)', code)
    if m:
        prefix = m.group(1)
        norm_prefixes[prefix] += 1

print(f'\n  Norm code prefixes (potential category groups):')
prefix_groups = sorted(norm_prefixes.items(), key=lambda x: -x[1])
for prefix, cnt in prefix_groups[:30]:
    covered = sum(1 for n in norms if n.get('code','').startswith(prefix) and n.get('code') in norm_cats_in_code)
    if covered == 0 and cnt >= 3:
        print(f'    {prefix}: {cnt} norms (0% pre-filtered) <-- OPTIMIZATION OPPORTUNITY')
    elif covered < cnt:
        print(f'    {prefix}: {cnt} norms ({covered} pre-filtered, {cnt-covered} need AI)')
    else:
        print(f'    {prefix}: {cnt} norms (fully pre-filtered)')

# Identify missing pre-filter categories
print(f'\n  MISSING PRE-FILTER CATEGORIES (norm groups not in NORM_CATEGORIES):')
missing_prefilter = []

# Norms that should be hardware-only
hw_keywords = ['pin', 'wipe', 'firmware', 'secure element', 'battery', 'tamper',
               'biometric', 'physical', 'boot', 'display', 'button', 'usb', 'nfc']
defi_keywords = ['smart contract', 'liquidity', 'impermanent loss', 'flash loan',
                 'oracle manipulation', 'rug pull', 'governance attack', 'tvl',
                 'amm', 'yield farm', 'token economics']
wallet_keywords = ['seed phrase', 'mnemonic', 'bip-32', 'bip-39', 'bip-44',
                   'key derivation', 'passphrase', 'recovery phrase']
kyc_keywords = ['kyc', 'know your customer', 'identity verification', 'aml',
                'sanctions', 'compliance', 'regulatory']

potential_hw = []
potential_defi = []
potential_wallet = []
potential_kyc = []

for n in norms:
    code = n.get('code', '')
    if code in norm_cats_in_code:
        continue  # Already categorized

    title = (n.get('title') or '').lower()
    desc = (n.get('description') or '').lower()
    combined = title + ' ' + desc

    if any(kw in combined for kw in hw_keywords):
        potential_hw.append((code, title[:60]))
    if any(kw in combined for kw in defi_keywords):
        potential_defi.append((code, title[:60]))
    if any(kw in combined for kw in wallet_keywords):
        potential_wallet.append((code, title[:60]))
    if any(kw in combined for kw in kyc_keywords):
        potential_kyc.append((code, title[:60]))

if potential_hw:
    print(f'\n    Hardware-related norms NOT pre-filtered ({len(potential_hw)}):')
    for code, title in potential_hw[:15]:
        print(f'      {code}: {title}')
    if len(potential_hw) > 15:
        print(f'      ... and {len(potential_hw)-15} more')

if potential_defi:
    print(f'\n    DeFi-related norms NOT pre-filtered ({len(potential_defi)}):')
    for code, title in potential_defi[:15]:
        print(f'      {code}: {title}')
    if len(potential_defi) > 15:
        print(f'      ... and {len(potential_defi)-15} more')

if potential_wallet:
    print(f'\n    Wallet-related norms NOT pre-filtered ({len(potential_wallet)}):')
    for code, title in potential_wallet[:15]:
        print(f'      {code}: {title}')
    if len(potential_wallet) > 15:
        print(f'      ... and {len(potential_wallet)-15} more')

if potential_kyc:
    print(f'\n    KYC-related norms NOT pre-filtered ({len(potential_kyc)}):')
    for code, title in potential_kyc[:15]:
        print(f'      {code}: {title}')
    if len(potential_kyc) > 15:
        print(f'      ... and {len(potential_kyc)-15} more')

total_potential = len(potential_hw) + len(potential_defi) + len(potential_wallet) + len(potential_kyc)
print(f'\n  Total norms that COULD be pre-filtered: ~{total_potential}')
print(f'  Current pre-filtering saves: {len(norms_with_cat)} AI calls per type')
print(f'  With improvements: ~{len(norms_with_cat) + total_potential} AI calls per type could be saved')
print(f'  That is {(len(norms_with_cat) + total_potential)/len(norms)*100:.0f}% of norms (vs {len(norms_with_cat)/len(norms)*100:.0f}% currently)')

# =====================================================================
# SECTION 6: PILLAR WEIGHTS ANALYSIS
# =====================================================================
print(f'\n{"="*70}')
print(f'  SECTION 6: PILLAR WEIGHTS ANALYSIS')
print(f'{"="*70}')

for t in types:
    pw = t.get('pillar_weights')
    if not pw: continue
    if isinstance(pw, str):
        try: pw = json.loads(pw)
        except: continue
    if not isinstance(pw, dict): continue

    s = pw.get('S', 0)
    a = pw.get('A', 0)
    f_val = pw.get('F', 0)
    e = pw.get('E', 0)
    total = s + a + f_val + e

    flags = []
    if t.get('is_hardware'): flags.append('HW')
    if t.get('is_wallet'): flags.append('WAL')
    if t.get('is_defi'): flags.append('DEFI')
    if t.get('is_protocol'): flags.append('PROTO')
    flag_str = ','.join(flags) if flags else '-'

    # Check weight consistency with type
    weight_issues = []
    if t.get('is_hardware') and f_val < 15:
        weight_issues.append(f'HW type but F={f_val}% (expected >= 15% for physical durability)')
    if not t.get('is_hardware') and f_val > 25:
        weight_issues.append(f'Non-HW but F={f_val}% (unusually high for non-physical)')
    if t.get('is_defi') and s < 20:
        weight_issues.append(f'DeFi but S={s}% (smart contract security critical)')

    cnt = prod_per_type.get(t['id'], 0)
    try:
        status = ' '.join(weight_issues) if weight_issues else ''
        print(f'  [{t["id"]:2d}] {t.get("code","?"):15s} S={s:2d}% A={a:2d}% F={f_val:2d}% E={e:2d}% | {flag_str:12s} | {cnt:3d} prods {status}')
    except: pass

    if weight_issues:
        total_issues += len(weight_issues)

# =====================================================================
# SECTION 7: FRENCH TEXT CHECK
# =====================================================================
print(f'\n{"="*70}')
print(f'  SECTION 7: FRENCH TEXT IN CODE FILES')
print(f'{"="*70}')

# Check for French in NORM_CATEGORIES, HARDWARE_ONLY_CATEGORIES, etc.
french_in_code = []
french_words_code = ['Biometrie', 'Meca', 'Environ', 'Materiaux', 'Chimique', 'Batterie', 'Ergo']
for fw in french_words_code:
    # These are category names in the code
    if fw in str(norm_cats_in_code.values()):
        french_in_code.append(f'NORM_CATEGORIES uses French category: "{fw}"')

# Check applicability_rules.py
with open(os.path.join(os.path.dirname(__file__), '..', 'src', 'core', 'applicability_rules.py'), 'r', encoding='utf-8') as f:
    rules_content = f.read()
    for fw in french_words_code:
        if fw in rules_content:
            french_in_code.append(f'applicability_rules.py uses French category: "{fw}"')

# Check norm_applicability_complete.py header
with open(os.path.join(os.path.dirname(__file__), '..', 'src', 'core', 'norm_applicability_complete.py'), 'r', encoding='utf-8') as f:
    header = ''
    for i, line in enumerate(f):
        if i > 10: break
        header += line
    if 'Applicabilite' in header:
        french_in_code.append('norm_applicability_complete.py has French docstring')
    if 'Genere' in header:
        french_in_code.append('norm_applicability_complete.py has French "Genere"')

if french_in_code:
    print(f'\n  French text in code files: {len(french_in_code)}')
    for f in french_in_code:
        print(f'    {f}')
    total_issues += len(french_in_code)
else:
    print(f'\n  No French text found in code files')

# =====================================================================
# SECTION 8: PRODUCT-TO-TYPE COVERAGE
# =====================================================================
print(f'\n{"="*70}')
print(f'  SECTION 8: TYPE USAGE & COVERAGE')
print(f'{"="*70}')

empty_types = []
for t in types:
    cnt = prod_per_type.get(t['id'], 0)
    if cnt == 0:
        empty_types.append(t)

print(f'\n  Types with 0 products: {len(empty_types)}')
for t in empty_types:
    try:
        print(f'    [{t["id"]}] {t.get("code","?"):15s} {t.get("name","?")}')
    except: pass

# Top types by product count
sorted_types = sorted(types, key=lambda t: prod_per_type.get(t['id'], 0), reverse=True)
print(f'\n  Top 15 types by product count:')
for t in sorted_types[:15]:
    cnt = prod_per_type.get(t['id'], 0)
    try:
        print(f'    [{t["id"]:2d}] {t.get("code","?"):15s} {t.get("name","?"):35s} {cnt} products')
    except: pass

# =====================================================================
# SUMMARY
# =====================================================================
print(f'\n{"="*70}')
print(f'  AUDIT SUMMARY')
print(f'{"="*70}')
print(f'  Total issues found: {total_issues}')
print(f'  Pre-filtering coverage: {len(norms_with_cat)/len(norms)*100:.1f}% ({len(norms_with_cat)}/{len(norms)} norms)')
print(f'  Potential improvement: ~{total_potential} more norms could be pre-filtered')
print(f'  Unmapped type codes: {len(unmapped)}')
print(f'  French in code: {len(french_in_code)}')
print(f'  Empty types (0 products): {len(empty_types)}')
print(f'{"="*70}')
