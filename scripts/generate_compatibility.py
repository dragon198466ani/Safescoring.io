#!/usr/bin/env python3
"""
Generate product compatibility with simple English descriptions.
Creates type_compatibility and product_compatibility tables.
"""

import sys
import json
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
from core.config import SUPABASE_URL, CONFIG
import requests

# Service role to bypass RLS
SERVICE_ROLE_KEY = CONFIG.get('SUPABASE_SERVICE_ROLE_KEY', '')
HEADERS = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

# Simple compatibility descriptions by type pairs
# Format: (type_a, type_b) -> (level, simple_description)
TYPE_COMPATIBILITY_RULES = {
    # Hardware Wallet combinations
    ('HW Cold', 'SW Browser'): ('native', 'Connect hardware wallet to browser extension via USB or Bluetooth to sign transactions securely.'),
    ('HW Cold', 'SW Mobile'): ('native', 'Pair hardware wallet with mobile app via Bluetooth for on-the-go signing.'),
    ('HW Cold', 'SW Desktop'): ('native', 'Connect hardware wallet to desktop app via USB for secure transaction signing.'),
    ('HW Cold', 'CEX'): ('partial', 'Transfer crypto from hardware wallet to exchange. Cannot trade directly.'),
    ('HW Cold', 'DEX'): ('native', 'Connect hardware wallet to DEX via browser extension to swap tokens securely.'),
    ('HW Cold', 'Lending'): ('native', 'Connect hardware wallet to lending protocol to deposit or borrow.'),
    ('HW Cold', 'Liq Staking'): ('native', 'Stake ETH from hardware wallet through liquid staking protocol.'),
    ('HW Cold', 'Bkp Physical'): ('native', 'Store seed phrase backup on metal plate for disaster recovery.'),
    ('HW Cold', 'Bkp Digital'): ('partial', 'Use encrypted digital backup as secondary recovery option.'),
    ('HW Cold', 'Bridges'): ('native', 'Bridge assets across chains while keeping keys on hardware wallet.'),
    ('HW Cold', 'Yield'): ('native', 'Deposit into yield protocols while signing with hardware wallet.'),
    ('HW Cold', 'Card'): ('partial', 'Load card from hardware wallet. Different security models.'),

    # Software Browser Wallet combinations
    ('SW Browser', 'SW Mobile'): ('native', 'Sync wallets using same seed phrase or account recovery.'),
    ('SW Browser', 'DEX'): ('native', 'Connect browser wallet to DEX with one click to swap tokens.'),
    ('SW Browser', 'Lending'): ('native', 'Connect to lending protocol directly from browser extension.'),
    ('SW Browser', 'CEX'): ('partial', 'Transfer from browser wallet to exchange deposit address.'),
    ('SW Browser', 'Liq Staking'): ('native', 'Stake directly from browser wallet interface.'),
    ('SW Browser', 'Bridges'): ('native', 'Bridge tokens across chains using browser wallet.'),
    ('SW Browser', 'Yield'): ('native', 'Deposit into yield farms directly from browser wallet.'),
    ('SW Browser', 'NFT Market'): ('native', 'Connect wallet to buy, sell, or mint NFTs.'),

    # Software Mobile Wallet combinations
    ('SW Mobile', 'DEX'): ('native', 'Connect mobile wallet to DEX via WalletConnect.'),
    ('SW Mobile', 'CEX'): ('partial', 'Transfer crypto to exchange. Use exchange mobile app for trading.'),
    ('SW Mobile', 'Lending'): ('native', 'Access lending protocols from mobile wallet browser.'),
    ('SW Mobile', 'Card'): ('native', 'Link mobile wallet to crypto card for instant spending.'),
    ('SW Mobile', 'Liq Staking'): ('native', 'Stake assets directly from mobile wallet.'),

    # CEX combinations
    ('CEX', 'CEX'): ('native', 'Transfer between exchanges. Check deposit networks match.'),
    ('CEX', 'DEX'): ('partial', 'Withdraw from CEX to wallet, then connect to DEX.'),
    ('CEX', 'Lending'): ('partial', 'Transfer from exchange to lending protocol via wallet.'),
    ('CEX', 'Card'): ('native', 'Link exchange account to card for direct spending.'),
    ('CEX', 'Fiat Gateway'): ('native', 'Buy crypto on exchange or use fiat on-ramp.'),
    ('CEX', 'Liq Staking'): ('partial', 'Withdraw staking tokens from CEX to use in DeFi.'),

    # DEX combinations
    ('DEX', 'DEX'): ('native', 'Use DEX aggregator to find best rates across exchanges.'),
    ('DEX', 'Lending'): ('native', 'Swap tokens on DEX then deposit as collateral.'),
    ('DEX', 'Yield'): ('native', 'Provide liquidity on DEX to earn trading fees.'),
    ('DEX', 'Liq Staking'): ('native', 'Swap for liquid staking tokens or use them in LP.'),
    ('DEX', 'Bridges'): ('native', 'Bridge tokens then swap on destination chain DEX.'),
    ('DEX', 'Stablecoin'): ('native', 'Swap to/from stablecoins for stable value.'),

    # DEX Aggregator combinations
    ('DEX Agg', 'DEX'): ('native', 'Aggregator routes trades through multiple DEXs for best price.'),
    ('DEX Agg', 'SW Browser'): ('native', 'Connect wallet to aggregator to execute optimal swaps.'),
    ('DEX Agg', 'Bridges'): ('native', 'Some aggregators include cross-chain bridging.'),

    # Lending combinations
    ('Lending', 'Lending'): ('partial', 'Move collateral between protocols for better rates.'),
    ('Lending', 'Yield'): ('native', 'Deposit lending tokens into yield optimizer.'),
    ('Lending', 'Stablecoin'): ('native', 'Borrow stablecoins against crypto collateral.'),
    ('Lending', 'Liq Staking'): ('native', 'Use liquid staking tokens as collateral.'),

    # Liquid Staking combinations
    ('Liq Staking', 'Liq Staking'): ('native', 'Stack liquid staking (restaking) for additional yield.'),
    ('Liq Staking', 'Yield'): ('native', 'Deposit liquid staking tokens into yield protocols.'),
    ('Liq Staking', 'DEX'): ('native', 'Trade liquid staking tokens on DEX.'),

    # Bridge combinations
    ('Bridges', 'Bridges'): ('partial', 'Use multiple bridges for different chains or redundancy.'),
    ('Bridges', 'DEX'): ('native', 'Bridge then swap on destination chain.'),
    ('Bridges', 'Lending'): ('native', 'Bridge collateral to lending protocol on another chain.'),

    # Backup combinations
    ('Bkp Physical', 'Bkp Physical'): ('native', 'Use multiple metal backups in different locations.'),
    ('Bkp Physical', 'Bkp Digital'): ('partial', 'Physical for long-term, digital for quick access.'),
    ('Bkp Digital', 'Bkp Digital'): ('partial', 'Multiple encrypted backups in different locations.'),

    # Stablecoin combinations
    ('Stablecoin', 'Stablecoin'): ('native', 'Swap between stablecoins on DEX for best rates.'),
    ('Stablecoin', 'Lending'): ('native', 'Deposit stablecoins to earn yield or use as collateral.'),
    ('Stablecoin', 'Yield'): ('native', 'Deposit stablecoins into yield protocols for stable returns.'),
    ('Stablecoin', 'CEX'): ('native', 'Trade stablecoins on exchange or withdraw to fiat.'),

    # Card combinations
    ('Card', 'Card'): ('partial', 'Use different cards for different spending categories.'),
    ('Card', 'CEX'): ('native', 'Spend directly from exchange balance via card.'),
    ('Card', 'SW Mobile'): ('native', 'Top up card from mobile wallet.'),

    # Crypto Bank combinations
    ('Crypto Bank', 'CEX'): ('native', 'Transfer between bank and exchange accounts.'),
    ('Crypto Bank', 'Card'): ('native', 'Spend crypto bank balance via linked card.'),
    ('Crypto Bank', 'Lending'): ('partial', 'Different services - bank for custody, protocol for DeFi yield.'),
    ('Crypto Bank', 'Fiat Gateway'): ('native', 'Bank provides fiat on/off ramp services.'),

    # Custody combinations
    ('Custody', 'CEX'): ('native', 'Transfer between institutional custody and exchange.'),
    ('Custody', 'Crypto Bank'): ('native', 'Both provide secure storage with different features.'),
    ('Custody', 'HW Cold'): ('partial', 'Different security models - institutional vs personal.'),

    # MPC Wallet combinations
    ('MPC Wallet', 'CEX'): ('native', 'Transfer from MPC wallet to exchange.'),
    ('MPC Wallet', 'DEX'): ('native', 'Connect MPC wallet to DEX for secure trading.'),
    ('MPC Wallet', 'HW Cold'): ('partial', 'Different key management approaches.'),

    # Yield combinations
    ('Yield', 'Yield'): ('native', 'Stack yield strategies for compounded returns.'),
    ('Yield', 'Lending'): ('native', 'Deposit lending tokens into yield optimizer.'),

    # Insurance combinations
    ('Insurance', 'Lending'): ('native', 'Cover lending positions against smart contract risk.'),
    ('Insurance', 'DEX'): ('native', 'Cover LP positions against impermanent loss.'),
    ('Insurance', 'Yield'): ('native', 'Insure yield farming positions.'),

    # Perps/Options combinations
    ('Perps', 'CEX'): ('native', 'Trade perpetuals on centralized exchange.'),
    ('Perps', 'SW Browser'): ('native', 'Connect wallet to decentralized perps platform.'),
    ('Options', 'SW Browser'): ('native', 'Connect wallet to options protocol.'),
    ('Options', 'Lending'): ('partial', 'Use borrowed funds for options trading.'),

    # RWA combinations
    ('RWA', 'Lending'): ('native', 'Use tokenized RWA as collateral.'),
    ('RWA', 'DEX'): ('native', 'Trade tokenized real world assets on DEX.'),
    ('RWA', 'Custody'): ('native', 'Institutional custody for RWA tokens.'),

    # Fiat Gateway combinations
    ('Fiat Gateway', 'SW Browser'): ('native', 'Buy crypto directly into browser wallet.'),
    ('Fiat Gateway', 'SW Mobile'): ('native', 'Buy crypto directly into mobile wallet.'),
    ('Fiat Gateway', 'CEX'): ('native', 'On-ramp to exchange for trading.'),

    # L2 combinations
    ('L2', 'DEX'): ('native', 'Trade on L2 DEX for lower fees.'),
    ('L2', 'Bridges'): ('native', 'Bridge to L2 for cheaper transactions.'),
    ('L2', 'Lending'): ('native', 'Use lending protocols on L2 with lower gas.'),
    ('L2', 'SW Browser'): ('native', 'Add L2 network to browser wallet.'),

    # CeFi Lending combinations
    ('CeFi Lending', 'CEX'): ('native', 'Transfer between CeFi lending and exchange.'),
    ('CeFi Lending', 'Card'): ('native', 'Spend earned yield via linked card.'),
    ('CeFi Lending', 'Crypto Bank'): ('native', 'Similar services with different features.'),

    # MultiSig combinations
    ('MultiSig', 'HW Cold'): ('native', 'Use hardware wallets as MultiSig signers.'),
    ('MultiSig', 'SW Browser'): ('native', 'Sign MultiSig transactions from browser.'),
    ('MultiSig', 'DEX'): ('native', 'Execute DEX trades with MultiSig approval.'),
    ('MultiSig', 'Custody'): ('native', 'MultiSig governance for institutional custody.'),
}

# Default descriptions for type pairs not explicitly defined
DEFAULT_DESCRIPTIONS = {
    'native': 'These products work together seamlessly with direct integration.',
    'partial': 'These products can work together with some manual steps or limitations.',
    'via_bridge': 'These products can connect through an intermediary service.',
    'incompatible': 'These products serve different purposes and don\'t directly integrate.',
}


def get_type_lookup():
    """Get product types from database"""
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,category,is_hardware',
        headers=HEADERS
    )
    if r.status_code == 200:
        return {t['code']: t for t in r.json()}
    return {}


def determine_compatibility(type_a, type_b, type_lookup):
    """Determine compatibility level and description for two types"""

    # Check explicit rules (both directions)
    key1 = (type_a, type_b)
    key2 = (type_b, type_a)

    if key1 in TYPE_COMPATIBILITY_RULES:
        return TYPE_COMPATIBILITY_RULES[key1]
    if key2 in TYPE_COMPATIBILITY_RULES:
        level, desc = TYPE_COMPATIBILITY_RULES[key2]
        return (level, desc)

    # Auto-determine based on categories
    info_a = type_lookup.get(type_a, {})
    info_b = type_lookup.get(type_b, {})

    cat_a = info_a.get('category', '')
    cat_b = info_b.get('category', '')

    # Same category = usually compatible
    if cat_a == cat_b and cat_a:
        return ('native', f'Both are {cat_a} products that work well together.')

    # Wallet + DeFi = usually native
    wallet_cats = ['Software', 'Hardware']
    defi_cats = ['DeFi', 'Exchange']

    if (cat_a in wallet_cats and cat_b in defi_cats) or (cat_b in wallet_cats and cat_a in defi_cats):
        return ('native', f'Connect {type_a} to {type_b} to interact with the protocol.')

    # Hardware + Software = usually compatible
    if info_a.get('is_hardware') != info_b.get('is_hardware'):
        if info_a.get('is_hardware') or info_b.get('is_hardware'):
            return ('native', f'Connect {type_a} with {type_b} for enhanced security.')

    # Financial products = partial
    if cat_a == 'Financial' or cat_b == 'Financial':
        return ('partial', f'Transfer assets between {type_a} and {type_b}.')

    # Default
    return ('partial', f'{type_a} and {type_b} can be used together with some configuration.')


def generate_type_compatibility():
    """Generate type_compatibility table"""
    print("\n" + "=" * 60)
    print("  GENERATING TYPE COMPATIBILITY")
    print("=" * 60)

    type_lookup = get_type_lookup()
    print(f"\n📦 {len(type_lookup)} product types loaded")

    # Check existing
    r = requests.get(f'{SUPABASE_URL}/rest/v1/type_compatibility?select=type_a_id,type_b_id', headers=HEADERS)
    existing = set()
    if r.status_code == 200:
        for row in r.json():
            existing.add((row['type_a_id'], row['type_b_id']))
    print(f"📋 {len(existing)} existing entries")

    # Generate all pairs
    types_list = list(type_lookup.values())
    to_insert = []

    for i, type_a in enumerate(types_list):
        for type_b in types_list[i:]:  # Include self-pairs, avoid duplicates
            if (type_a['id'], type_b['id']) in existing:
                continue
            if (type_b['id'], type_a['id']) in existing:
                continue

            level, description = determine_compatibility(
                type_a['code'], type_b['code'], type_lookup
            )

            to_insert.append({
                'type_a_id': type_a['id'],
                'type_b_id': type_b['id'],
                'is_compatible': level != 'incompatible',
                'compatibility_level': level,
                'description': description,
                'analyzed_by': 'rules_v1',
                'analyzed_at': datetime.utcnow().isoformat()
            })

    print(f"\n➕ {len(to_insert)} new type pairs to insert")

    if to_insert:
        # Insert in batches
        batch_size = 100
        success = 0

        for i in range(0, len(to_insert), batch_size):
            batch = to_insert[i:i+batch_size]
            r = requests.post(
                f'{SUPABASE_URL}/rest/v1/type_compatibility',
                headers=HEADERS,
                json=batch
            )
            if r.status_code in [200, 201]:
                success += len(batch)
            else:
                print(f"   ❌ Batch error: {r.status_code} - {r.text[:100]}")

        print(f"   ✅ {success}/{len(to_insert)} type compatibilities inserted")

    return type_lookup


def generate_product_compatibility(type_lookup):
    """Generate product_compatibility based on type compatibility"""
    print("\n" + "=" * 60)
    print("  GENERATING PRODUCT COMPATIBILITY")
    print("=" * 60)

    # Load products with their types
    print("\n📦 Loading products...")
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id,product_type_mapping(type_id,is_primary)&type_id=not.is.null&limit=500',
        headers=HEADERS
    )
    products = r.json() if r.status_code == 200 else []
    print(f"   {len(products)} products with types")

    # Load type compatibility
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/type_compatibility?select=type_a_id,type_b_id,is_compatible,compatibility_level,description',
        headers=HEADERS
    )
    type_compat = {}
    if r.status_code == 200:
        for row in r.json():
            key1 = (row['type_a_id'], row['type_b_id'])
            key2 = (row['type_b_id'], row['type_a_id'])
            type_compat[key1] = row
            type_compat[key2] = row
    print(f"   {len(type_compat)//2} type compatibility rules loaded")

    # Check existing product compatibility
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_compatibility?select=product_a_id,product_b_id', headers=HEADERS)
    existing = set()
    if r.status_code == 200:
        for row in r.json():
            existing.add((row['product_a_id'], row['product_b_id']))
    print(f"   {len(existing)} existing product compatibilities")

    # Generate product pairs (limit to avoid explosion)
    # Focus on top products by selecting a diverse set
    to_insert = []
    products_processed = 0

    # Take first 200 products for now
    products = products[:200]

    for i, prod_a in enumerate(products):
        for prod_b in products[i+1:]:  # No self-pairs, no duplicates
            if (prod_a['id'], prod_b['id']) in existing:
                continue
            if (prod_b['id'], prod_a['id']) in existing:
                continue

            # Get types (primary type from type_id, or from mapping)
            type_a = prod_a.get('type_id')
            type_b = prod_b.get('type_id')

            if not type_a or not type_b:
                continue

            # Look up type compatibility
            compat = type_compat.get((type_a, type_b))

            if compat:
                # Personalize description
                desc = compat['description']
                # Replace type names with product names
                desc_personalized = f"{prod_a['name']} + {prod_b['name']}: {desc}"

                to_insert.append({
                    'product_a_id': prod_a['id'],
                    'product_b_id': prod_b['id'],
                    'type_compatible': compat['is_compatible'],
                    'ai_compatible': compat['is_compatible'],
                    'ai_confidence': 0.85 if compat['compatibility_level'] == 'native' else 0.70,
                    'ai_method': desc_personalized[:500],
                    'ai_justification': f"Based on {compat['compatibility_level']} compatibility between product types.",
                    'analyzed_at': datetime.utcnow().isoformat(),
                    'analyzed_by': 'type_rules_v1'
                })

        products_processed += 1
        if products_processed % 50 == 0:
            print(f"   Processed {products_processed}/{len(products)} products...")

    print(f"\n➕ {len(to_insert)} new product pairs to insert")

    if to_insert:
        # Insert in batches
        batch_size = 100
        success = 0

        for i in range(0, len(to_insert), batch_size):
            batch = to_insert[i:i+batch_size]
            r = requests.post(
                f'{SUPABASE_URL}/rest/v1/product_compatibility',
                headers=HEADERS,
                json=batch
            )
            if r.status_code in [200, 201]:
                success += len(batch)
            else:
                print(f"   ❌ Batch error: {r.status_code} - {r.text[:100]}")

        print(f"   ✅ {success}/{len(to_insert)} product compatibilities inserted")


def main():
    print("\n" + "=" * 60)
    print("  SAFESCORING - COMPATIBILITY GENERATOR")
    print("=" * 60)

    # Step 1: Generate type compatibility
    type_lookup = generate_type_compatibility()

    # Step 2: Generate product compatibility
    generate_product_compatibility(type_lookup)

    print("\n" + "=" * 60)
    print("  ✅ COMPATIBILITY GENERATION COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
