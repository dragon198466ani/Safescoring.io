#!/usr/bin/env python3
"""
Verification contextuelle de l'applicabilite des normes
S'assure que chaque norme s'applique dans le bon contexte
"""
import sys
sys.path.insert(0, 'c:/Users/alexa/Desktop/SafeScoring')

from src.core.norm_applicability_complete import NORM_APPLICABILITY, ALL_PRODUCT_TYPES
import requests
from config_helper import SUPABASE_URL, get_supabase_headers

headers = get_supabase_headers()

def get_all_norms():
    """Fetch all norms from database"""
    all_norms = []
    offset = 0
    while True:
        resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=code,pillar,title,description&offset={offset}&limit=1000',
            headers=headers
        )
        if resp.status_code != 200:
            break
        batch = resp.json()
        if not batch:
            break
        all_norms.extend(batch)
        offset += 1000
        if len(batch) < 1000:
            break
    return {n['code']: n for n in all_norms}

# TESTS CONTEXTUELS
print("=" * 80)
print("VERIFICATION CONTEXTUELLE DE L'APPLICABILITE")
print("=" * 80)

norms_db = get_all_norms()
errors = []
warnings = []

# 1. TESTS D'EXCLUSION - Ces normes NE DOIVENT PAS etre dans certains types
EXCLUSION_TESTS = [
    # Norme, Type qui ne doit PAS l'avoir, Raison
    ('S-CEX-COLD', 'HW_WALLET', 'Cold storage CEX ne concerne pas les HW wallets'),
    ('S-CEX-COLD', 'DEX', 'Cold storage CEX ne concerne pas les DEX'),
    ('S-CEX-COLD', 'LENDING', 'Cold storage CEX ne concerne pas le lending'),
    ('S-BRIDGE-AUDIT', 'CEX', 'Audit bridge ne concerne pas les CEX'),
    ('S-BRIDGE-AUDIT', 'HW_WALLET', 'Audit bridge ne concerne pas les wallets'),
    ('S-LST-AUDIT', 'CEX', 'Audit LST ne concerne pas les CEX'),
    ('S-LST-AUDIT', 'HW_WALLET', 'Audit LST ne concerne pas les wallets'),
    ('A-NFT-FRAUD', 'CEX', 'Fraude NFT ne concerne pas les CEX'),
    ('A-NFT-FRAUD', 'LENDING', 'Fraude NFT ne concerne pas le lending'),
    ('S-STAKE-SLASH', 'CEX', 'Slashing ne concerne pas les CEX'),
    ('S-STAKE-SLASH', 'HW_WALLET', 'Slashing ne concerne pas les wallets'),
    ('S-PERP-LIQ', 'HW_WALLET', 'Liquidation perp ne concerne pas les wallets'),
    ('S-PERP-LIQ', 'NFT_MARKET', 'Liquidation perp ne concerne pas les NFT'),
    ('A-LEND-COOL', 'HW_WALLET', 'Cooldown lending ne concerne pas les wallets'),
    ('A-LEND-COOL', 'DEX', 'Cooldown lending ne concerne pas les DEX'),
]

print("\n1. TESTS D'EXCLUSION")
print("-" * 40)
for norm_code, excluded_type, reason in EXCLUSION_TESTS:
    if norm_code in NORM_APPLICABILITY:
        types = NORM_APPLICABILITY[norm_code]
        if excluded_type in types:
            errors.append(f"ERREUR: {norm_code} dans {excluded_type} ({reason})")
            print(f"  [FAIL] {norm_code} dans {excluded_type}")
        else:
            print(f"  [OK] {norm_code} PAS dans {excluded_type}")
    else:
        print(f"  [SKIP] {norm_code} non trouve")

# 2. TESTS D'INCLUSION - Ces normes DOIVENT etre dans certains types
INCLUSION_TESTS = [
    # Norme, Type qui DOIT l'avoir, Raison
    ('S-CEX-COLD', 'CEX', 'Cold storage doit etre dans CEX'),
    ('S-CEX-COLD', 'PRIME', 'Cold storage doit etre dans PRIME (broker)'),
    ('S-BRIDGE-AUDIT', 'BRIDGE', 'Audit bridge doit etre dans BRIDGE'),
    ('S-BRIDGE-AUDIT', 'L2', 'Audit bridge doit etre dans L2'),
    ('S-LST-AUDIT', 'LIQUID_STAKING', 'Audit LST doit etre dans LIQUID_STAKING'),
    ('A-NFT-FRAUD', 'NFT_MARKET', 'Fraude NFT doit etre dans NFT_MARKET'),
    ('S-STAKE-SLASH', 'STAKING', 'Slashing doit etre dans STAKING'),
    ('S-STAKE-SLASH', 'LIQUID_STAKING', 'Slashing doit etre dans LIQUID_STAKING'),
    ('S-PERP-LIQ', 'PERP_DEX', 'Liquidation perp doit etre dans PERP_DEX'),
    ('A-LEND-COOL', 'LENDING', 'Cooldown doit etre dans LENDING'),
    ('A02', 'HW_WALLET', 'Norme anti-coercion A02 pour HW wallets'),
    ('F101', 'HW_WALLET', 'F101 shock recorder pour HW wallets'),
    ('E101', 'LIQUID_STAKING', 'E101 liquid staking pour LIQUID_STAKING'),
    ('E101', 'STAKING', 'E101 liquid staking aussi pour STAKING'),
]

print("\n2. TESTS D'INCLUSION")
print("-" * 40)
for norm_code, required_type, reason in INCLUSION_TESTS:
    if norm_code in NORM_APPLICABILITY:
        types = NORM_APPLICABILITY[norm_code]
        if required_type in types:
            print(f"  [OK] {norm_code} dans {required_type}")
        else:
            errors.append(f"ERREUR: {norm_code} PAS dans {required_type} ({reason})")
            print(f"  [FAIL] {norm_code} PAS dans {required_type}")
    else:
        print(f"  [SKIP] {norm_code} non trouve")

# 3. COHERENCE DES PREFIXES - Verifier que tous les S-CEX sont dans CEX, etc.
PREFIX_TYPE_MAP = {
    'S-CEX': ['CEX', 'PRIME', 'SETTLEMENT'],
    'A-CEX': ['CEX', 'PRIME', 'SETTLEMENT'],
    'F-CEX': ['CEX', 'PRIME', 'SETTLEMENT'],
    'E-CEX': ['CEX', 'PRIME', 'SETTLEMENT'],
    'S-BRIDGE': ['BRIDGE', 'L2', 'CROSS_AGG'],
    'A-BRIDGE': ['BRIDGE', 'L2', 'CROSS_AGG'],
    'S-LST': ['LIQUID_STAKING', 'STAKING'],
    'A-LST': ['LIQUID_STAKING', 'STAKING'],
    'S-STAKE': ['STAKING', 'LIQUID_STAKING', 'MINING'],
    'A-STAKE': ['STAKING', 'LIQUID_STAKING', 'MINING'],
    'S-PERP': ['PERP_DEX', 'SYNTHETICS', 'PREDICTION', 'DEX'],
    'A-PERP': ['PERP_DEX', 'SYNTHETICS', 'PREDICTION', 'DEX'],
    'S-NFT': ['NFT_MARKET', 'LAUNCHPAD', 'SOCIALFI', 'QUEST'],
    'A-NFT': ['NFT_MARKET', 'LAUNCHPAD', 'SOCIALFI', 'QUEST'],
    'S-LEND': ['LENDING', 'YIELD', 'RWA'],
    'A-LEND': ['LENDING', 'YIELD', 'RWA'],
}

print("\n3. COHERENCE DES PREFIXES")
print("-" * 40)
for prefix, expected_types in PREFIX_TYPE_MAP.items():
    matching_norms = [c for c in NORM_APPLICABILITY.keys() if c.startswith(prefix + '-') or c.startswith(prefix + '_')]
    if not matching_norms:
        print(f"  [{prefix}] Aucune norme trouvee")
        continue

    # Verifier que chaque norme avec ce prefix contient au moins un des types attendus
    prefix_ok = True
    for norm_code in matching_norms:
        types = NORM_APPLICABILITY[norm_code]
        has_expected = any(t in types for t in expected_types)
        if not has_expected:
            errors.append(f"ERREUR: {norm_code} n'a aucun type attendu {expected_types}")
            prefix_ok = False

    if prefix_ok:
        print(f"  [OK] {prefix}-* ({len(matching_norms)} normes) -> inclut bien {expected_types[0]}")
    else:
        print(f"  [FAIL] {prefix}-* a des problemes")

# 4. VERIFICATION CONTEXTUELLE BASEE SUR LE CONTENU
print("\n4. VERIFICATION CONTEXTUELLE (contenu)")
print("-" * 40)

# Echantillon de normes pour verification manuelle
CONTENT_CHECKS = [
    # (code, type_attendu, mot_cle_dans_description)
    ('S101', 'HW_WALLET', 'seed'),
    ('S102', 'HW_WALLET', 'secure element'),
    ('A01', 'SW_WALLET', 'seed'),
    ('F01', 'HW_WALLET', 'firmware'),
]

for code, expected_type, keyword in CONTENT_CHECKS:
    if code in norms_db and code in NORM_APPLICABILITY:
        norm = norms_db[code]
        text = f"{norm.get('title', '')} {norm.get('description', '')}".lower()
        types = NORM_APPLICABILITY[code]

        has_keyword = keyword.lower() in text
        has_type = expected_type in types

        if has_type:
            print(f"  [OK] {code}: '{keyword}' -> {expected_type}")
        else:
            warnings.append(f"ATTENTION: {code} contient '{keyword}' mais pas {expected_type}")
            print(f"  [WARN] {code}: '{keyword}' mais PAS {expected_type}")

# 5. STATISTIQUES PAR TYPE
print("\n5. STATISTIQUES")
print("-" * 40)

type_counts = {}
for code, types in NORM_APPLICABILITY.items():
    for t in types:
        type_counts[t] = type_counts.get(t, 0) + 1

# Types critiques avec seuils
CRITICAL_TYPES = {
    'CEX': 100,  # Au moins 100 normes
    'DEX': 80,
    'HW_WALLET': 80,
    'SW_WALLET': 80,
    'LENDING': 50,
    'BRIDGE': 40,
    'STAKING': 40,
    'LIQUID_STAKING': 30,
    'PERP_DEX': 30,
    'NFT_MARKET': 30,
}

for ptype, min_count in CRITICAL_TYPES.items():
    count = type_counts.get(ptype, 0)
    status = "OK" if count >= min_count else "INSUFFISANT"
    print(f"  {ptype:20}: {count:4} normes ({status}, min={min_count})")

# RESUME
print("\n" + "=" * 80)
print("RESUME")
print("=" * 80)

if errors:
    print(f"\n{len(errors)} ERREURS TROUVEES:")
    for e in errors:
        print(f"  - {e}")
else:
    print("\nAucune erreur trouvee!")

if warnings:
    print(f"\n{len(warnings)} AVERTISSEMENTS:")
    for w in warnings:
        print(f"  - {w}")

print(f"\nTotal: {len(NORM_APPLICABILITY)} normes mappees")
print(f"Types: {len(type_counts)} types utilises")

# Code de sortie
sys.exit(1 if errors else 0)
