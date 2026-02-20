#!/usr/bin/env python3
"""
Add SAFE pillar-specific warnings to compatibility.
S = Security, A = Adversity, F = Fidelity, E = Efficiency
"""

import sys
import json
from pathlib import Path
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
from core.config import SUPABASE_URL, CONFIG
import requests

SERVICE_ROLE_KEY = CONFIG.get('SUPABASE_SERVICE_ROLE_KEY', '')
HEADERS = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
}

# SAFE warnings by type combination - each pillar has specific concerns
# S = Security, A = Adversity, F = Fidelity, E = Efficiency
SAFE_WARNINGS = {
    # Hardware Wallet + Software Wallet
    ('HW Cold', 'SW Browser'): {
        'security_level': 'HIGH',
        's': 'Verify all transaction details on hardware screen. Never trust browser alone.',
        'a': 'Hardware wallet protects against browser compromises and phishing.',
        'f': 'Established combo used by millions. Wide compatibility with dApps.',
        'e': 'Requires USB/Bluetooth connection. Adds 10-30 seconds per transaction.',
    },
    ('HW Cold', 'SW Mobile'): {
        'security_level': 'HIGH',
        's': 'Keep Bluetooth disabled when not in use. Verify on device screen.',
        'a': 'Mobile + hardware provides strong protection against single point of failure.',
        'f': 'Most hardware wallets support mobile pairing. Check compatibility first.',
        'e': 'Bluetooth pairing needed. Works offline but requires initial setup.',
    },
    ('HW Cold', 'SW Desktop'): {
        'security_level': 'HIGH',
        's': 'Use official desktop apps only. Verify transaction details on device.',
        'a': 'Desktop malware cannot compromise hardware wallet signing.',
        'f': 'Native USB support. Most reliable connection method.',
        'e': 'Fastest hardware wallet interaction. USB direct connection.',
    },

    # Hardware + DeFi
    ('HW Cold', 'DEX'): {
        'security_level': 'HIGH',
        's': 'Review token approval amounts. Use hardware for all signatures.',
        'a': 'Hardware signing prevents approval hijacking attacks.',
        'f': 'Works with all major DEXs via browser extension bridge.',
        'e': 'Each swap requires hardware confirmation. Plan batch operations.',
    },
    ('HW Cold', 'Lending'): {
        'security_level': 'HIGH',
        's': 'Set conservative collateral ratios. Hardware signs all operations.',
        'a': 'Cannot be liquidated by compromised hot wallet.',
        'f': 'Supported by Aave, Compound, Maker and major protocols.',
        'e': 'Collateral management requires multiple signatures.',
    },
    ('HW Cold', 'Liq Staking'): {
        'security_level': 'HIGH',
        's': 'Verify staking contract addresses. Confirm amounts on device.',
        'a': 'Stakes are protected even if browser is compromised.',
        'f': 'Works with Lido, Rocket Pool, and major LST protocols.',
        'e': 'Initial stake and unstake require device confirmation.',
    },
    ('HW Cold', 'Bridges'): {
        'security_level': 'MEDIUM',
        's': 'Use only audited bridges. Verify destination chain and address.',
        'a': 'Hardware protects signing but bridge smart contract risk remains.',
        'f': 'Compatible with major bridges. Verify chain support.',
        'e': 'Bridge times vary by chain. Hardware adds signing step.',
    },

    # Hardware + Centralized
    ('HW Cold', 'CEX'): {
        'security_level': 'MEDIUM',
        's': 'Whitelist withdrawal addresses. Use hardware for receiving only.',
        'a': 'CEX holds custody after deposit. Hardware protects until transfer.',
        'f': 'One-way transfer. Cannot trade directly from hardware wallet.',
        'e': 'Deposit requires network confirmation time.',
    },
    ('HW Cold', 'Card'): {
        'security_level': 'MEDIUM',
        's': 'Card provider holds funds. Transfer only spending amounts.',
        'a': 'Different security models. Hardware for savings, card for spending.',
        'f': 'Manual top-up required. No direct integration.',
        'e': 'Transfer delay before card spending available.',
    },

    # Software Wallet combinations
    ('SW Browser', 'SW Mobile'): {
        'security_level': 'MEDIUM',
        's': 'Use same seed only if both apps are trusted. Consider separate wallets.',
        'a': 'Multiple access points increase attack surface. Secure both devices.',
        'f': 'Most wallets support multi-device sync.',
        'e': 'Instant sync if using same account. Convenient multi-device access.',
    },
    ('SW Browser', 'DEX'): {
        'security_level': 'MEDIUM',
        's': 'Check URL carefully. Revoke unused approvals via Revoke.cash.',
        'a': 'Browser extension vulnerable to phishing. Use bookmarks.',
        'f': 'Native integration. One-click connection.',
        'e': 'Instant transaction signing. Best DeFi experience.',
    },
    ('SW Browser', 'Lending'): {
        'security_level': 'MEDIUM',
        's': 'Monitor health factor. Set up alerts for liquidation risk.',
        'a': 'Hot wallet risk. Do not store all funds in lending.',
        'f': 'Full protocol access from browser.',
        'e': 'Quick position management. Real-time updates.',
    },
    ('SW Browser', 'CEX'): {
        'security_level': 'MEDIUM',
        's': 'Enable 2FA on exchange. Verify withdrawal addresses.',
        'a': 'Exchange holds funds after deposit. Browser wallet risk during transfer.',
        'f': 'Standard deposit flow. Wide chain support.',
        'e': 'Network confirmation required. Varies by chain.',
    },
    ('SW Mobile', 'DEX'): {
        'security_level': 'MEDIUM',
        's': 'Verify WalletConnect sessions. Use official apps only.',
        'a': 'Mobile malware can compromise wallet. Keep device secure.',
        'f': 'WalletConnect v2 widely supported.',
        'e': 'QR scan to connect. Mobile-friendly interfaces.',
    },
    ('SW Mobile', 'Card'): {
        'security_level': 'MEDIUM',
        's': 'Set spending limits on card. Monitor transactions.',
        'a': 'Card provider is custodian. Keep minimal balance.',
        'f': 'Direct integration with some card providers.',
        'e': 'Instant top-up from supported wallets.',
    },

    # CEX combinations
    ('CEX', 'CEX'): {
        'security_level': 'LOW',
        's': 'Both hold your keys. Enable all security features available.',
        'a': 'Double custodial risk. Not your keys, not your crypto.',
        'f': 'Easy transfers if same network supported.',
        'e': 'Fast internal transfers if supported. Otherwise network time.',
    },
    ('CEX', 'DEX'): {
        'security_level': 'MEDIUM',
        's': 'Withdraw to self-custody wallet first for better security.',
        'a': 'CEX to wallet to DEX flow reduces custodial exposure.',
        'f': 'Need intermediate wallet for most DEXs.',
        'e': 'Two-step process adds time and gas costs.',
    },
    ('CEX', 'Card'): {
        'security_level': 'LOW',
        's': 'Both custodial. Exchange may freeze funds.',
        'a': 'Single provider risk if same company.',
        'f': 'Native integration for exchange-issued cards.',
        'e': 'Instant spending from exchange balance.',
    },
    ('CEX', 'Lending'): {
        'security_level': 'MEDIUM',
        's': 'Use self-custody for DeFi. CEX lending has counterparty risk.',
        'a': 'DeFi lending more transparent but has smart contract risk.',
        'f': 'Withdraw to wallet first for DeFi lending.',
        'e': 'Extra step required. Gas costs apply.',
    },

    # DeFi combinations
    ('DEX', 'DEX'): {
        'security_level': 'MEDIUM',
        's': 'Use DEX aggregators for best rates. Check for MEV protection.',
        'a': 'Multiple DEX exposure. Smart contract risk compounds.',
        'f': 'Aggregators route automatically. Wide compatibility.',
        'e': 'Aggregators find optimal routes. Usually gas efficient.',
    },
    ('DEX', 'Lending'): {
        'security_level': 'MEDIUM',
        's': 'Review all approvals. Check liquidation thresholds.',
        'a': 'Compounded smart contract risk. Use audited protocols.',
        'f': 'Common DeFi strategy. Well-supported flow.',
        'e': 'Multiple transactions required. Plan gas costs.',
    },
    ('DEX', 'Yield'): {
        'security_level': 'MEDIUM',
        's': 'Verify yield source. Check for sustainable APY.',
        'a': 'Yield farming adds protocol risk on top of DEX.',
        'f': 'LP tokens widely accepted in yield protocols.',
        'e': 'Compounding may require frequent harvesting.',
    },
    ('DEX', 'Bridges'): {
        'security_level': 'MEDIUM',
        's': 'Verify bridge security audits. Check destination chain DEX.',
        'a': 'Bridge + DEX = multiple smart contract risks.',
        'f': 'Cross-chain aggregators combine both.',
        'e': 'Bridge time + DEX time. Can take minutes to hours.',
    },
    ('Lending', 'Lending'): {
        'security_level': 'MEDIUM',
        's': 'Avoid recursive borrowing loops. Monitor all positions.',
        'a': 'Cascading liquidation risk across protocols.',
        'f': 'Can move collateral between protocols.',
        'e': 'Gas costs for each protocol interaction.',
    },
    ('Lending', 'Liq Staking'): {
        'security_level': 'MEDIUM',
        's': 'LST depeg can trigger liquidation. Use conservative ratios.',
        'a': 'Double exposure: lending + staking risks.',
        'f': 'Major lending protocols accept LSTs as collateral.',
        'e': 'Single transaction to deposit LST as collateral.',
    },
    ('Lending', 'Stablecoin'): {
        'security_level': 'MEDIUM',
        's': 'Monitor stablecoin peg. Diversify across types.',
        'a': 'Stablecoin depeg can affect collateral value.',
        'f': 'Stablecoins widely supported as collateral.',
        'e': 'Stable borrowing costs. Predictable rates.',
    },

    # Liquid Staking
    ('Liq Staking', 'Liq Staking'): {
        'security_level': 'MEDIUM',
        's': 'Restaking adds layers of smart contract risk.',
        'a': 'Slashing risk compounds with restaking.',
        'f': 'EigenLayer and similar protocols enable this.',
        'e': 'Higher yield potential but more complexity.',
    },
    ('Liq Staking', 'DEX'): {
        'security_level': 'MEDIUM',
        's': 'Check LST liquidity before large trades.',
        'a': 'Depeg risk when selling large amounts.',
        'f': 'Major LSTs have deep liquidity on DEXs.',
        'e': 'Instant swap if liquidity available.',
    },
    ('Liq Staking', 'Yield'): {
        'security_level': 'MEDIUM',
        's': 'Verify yield protocol audits. Check for LST support.',
        'a': 'Combined staking and yield farming risks.',
        'f': 'Many yield protocols accept LSTs.',
        'e': 'Compounded yield from staking + yield farming.',
    },

    # Bridges
    ('Bridges', 'Bridges'): {
        'security_level': 'LOW',
        's': 'Multiple hops increase smart contract exposure.',
        'a': 'Each bridge is a potential failure point.',
        'f': 'May be necessary for exotic chain routes.',
        'e': 'Compounded bridging times. High gas costs.',
    },
    ('Bridges', 'Lending'): {
        'security_level': 'MEDIUM',
        's': 'Verify bridged asset is accepted as collateral.',
        'a': 'Bridged assets may have different risk profiles.',
        'f': 'Native vs bridged tokens have different support.',
        'e': 'Bridge time before lending possible.',
    },

    # Backup combinations
    ('Bkp Physical', 'HW Cold'): {
        'security_level': 'HIGH',
        's': 'Store backup separate from device. Test recovery process.',
        'a': 'Metal backup survives fire/flood. Ultimate protection.',
        'f': 'BIP39 standard supported by all hardware wallets.',
        'e': 'One-time setup. No ongoing maintenance.',
    },
    ('Bkp Physical', 'Bkp Physical'): {
        'security_level': 'HIGH',
        's': 'Geographic separation is key. Use different locations.',
        'a': 'Multiple backups protect against localized disasters.',
        'f': 'Same seed on multiple plates for redundancy.',
        'e': 'Additional cost but maximum protection.',
    },
    ('Bkp Digital', 'HW Cold'): {
        'security_level': 'MEDIUM',
        's': 'Encrypt digital backup. Store offline when possible.',
        'a': 'Digital can be compromised. Use as secondary only.',
        'f': 'Encrypted backup as convenience option.',
        'e': 'Faster access than physical but less secure.',
    },

    # Stablecoin combinations
    ('Stablecoin', 'Stablecoin'): {
        'security_level': 'MEDIUM',
        's': 'Diversify across stablecoin types (fiat-backed, algorithmic).',
        'a': 'Single stablecoin depeg affects all holdings.',
        'f': 'Easy to swap between stablecoins on DEXs.',
        'e': 'Low slippage swaps between major stablecoins.',
    },
    ('Stablecoin', 'DEX'): {
        'security_level': 'MEDIUM',
        's': 'Check reserves and audit reports of stablecoin.',
        'a': 'Stablecoin risk + DEX smart contract risk.',
        'f': 'Stablecoins are primary DEX trading pairs.',
        'e': 'Stable value for trading. Predictable outcomes.',
    },
    ('Stablecoin', 'Yield'): {
        'security_level': 'MEDIUM',
        's': 'Verify yield source sustainability. Check protocol audits.',
        'a': 'Yield on stables often comes from lending risk.',
        'f': 'Wide support for stablecoin yield strategies.',
        'e': 'Lower but more predictable returns.',
    },

    # Card combinations
    ('Card', 'SW Mobile'): {
        'security_level': 'MEDIUM',
        's': 'Set spending limits. Use card for small purchases only.',
        'a': 'Card provider holds funds. Hot wallet risk for top-up.',
        'f': 'Many cards support mobile wallet top-up.',
        'e': 'Instant top-up from supported wallets.',
    },

    # Crypto Bank / CeFi
    ('Crypto Bank', 'CEX'): {
        'security_level': 'LOW',
        's': 'Verify both are regulated. Check insurance coverage.',
        'a': 'Double custodial exposure. Counterparty risk.',
        'f': 'Usually easy transfers between institutions.',
        'e': 'Fast fiat and crypto transfers.',
    },
    ('Crypto Bank', 'Card'): {
        'security_level': 'LOW',
        's': 'Same counterparty risk. Check terms and limits.',
        'a': 'Single provider for banking and spending.',
        'f': 'Usually native integration.',
        'e': 'Instant card spending from bank balance.',
    },
    ('CeFi Lending', 'CEX'): {
        'security_level': 'LOW',
        's': 'Counterparty risk on both. Check financial health.',
        'a': 'CeFi has failed before (Celsius, BlockFi). Diversify.',
        'f': 'Easy movement between CeFi services.',
        'e': 'Fast transfers. No gas costs.',
    },

    # Custody / MultiSig
    ('Custody', 'HW Cold'): {
        'security_level': 'HIGH',
        's': 'Different key ownership models. Understand clearly.',
        'a': 'Custody for institutions, hardware for personal.',
        'f': 'Can transfer between but different use cases.',
        'e': 'Transfer requires coordination with custodian.',
    },
    ('MultiSig', 'HW Cold'): {
        'security_level': 'HIGH',
        's': 'Each signer should use hardware wallet. Ultimate security.',
        'a': 'No single point of failure. Multiple approvals required.',
        'f': 'Gnosis Safe + hardware wallets is gold standard.',
        'e': 'Requires multiple signers. Slower but safer.',
    },
    ('MultiSig', 'DEX'): {
        'security_level': 'HIGH',
        's': 'All signers must verify transaction details.',
        'a': 'MultiSig prevents single compromised signer exploit.',
        'f': 'Major DEXs support Safe transactions.',
        'e': 'Requires quorum approval. Plan for delays.',
    },

    # MPC Wallet
    ('MPC Wallet', 'DEX'): {
        'security_level': 'HIGH',
        's': 'MPC distributes key risk. Verify provider security.',
        'a': 'No single key to compromise. Strong protection.',
        'f': 'Looks like normal wallet to DEXs.',
        'e': 'Signing may have slight delay for MPC computation.',
    },
    ('MPC Wallet', 'HW Cold'): {
        'security_level': 'HIGH',
        's': 'Different security models. MPC for convenience, HW for maximum.',
        'a': 'Both protect against single point of failure.',
        'f': 'Can use both for different amounts.',
        'e': 'MPC faster for daily use. HW for large holdings.',
    },

    # DEX Aggregator
    ('DEX Agg', 'DEX'): {
        'security_level': 'MEDIUM',
        's': 'Aggregator routes through multiple DEXs. Check all approvals.',
        'a': 'Multiple DEX exposure. Aggregator adds smart contract.',
        'f': 'Aggregators find best prices automatically.',
        'e': 'Usually better rates than single DEX.',
    },
    ('DEX Agg', 'SW Browser'): {
        'security_level': 'MEDIUM',
        's': 'Verify aggregator site. Check approval amounts.',
        'a': 'Browser wallet risk + aggregator contract risk.',
        'f': 'All major aggregators support browser wallets.',
        'e': 'One-click best-rate swaps.',
    },

    # Perps / Options
    ('Perps', 'SW Browser'): {
        'security_level': 'MEDIUM',
        's': 'Use stop losses. Never risk more than you can lose.',
        'a': 'Leverage multiplies both gains and losses.',
        'f': 'Most perp DEXs require browser wallet.',
        'e': 'Fast execution for trading. Watch funding rates.',
    },
    ('Options', 'SW Browser'): {
        'security_level': 'MEDIUM',
        's': 'Understand Greeks. Options can expire worthless.',
        'a': 'Complex instruments. Start small.',
        'f': 'DeFi options protocols work with standard wallets.',
        'e': 'Premium costs. Time decay applies.',
    },

    # RWA
    ('RWA', 'Lending'): {
        'security_level': 'MEDIUM',
        's': 'Verify RWA tokenization process. Check collateral eligibility.',
        'a': 'RWA adds real-world counterparty risk to DeFi.',
        'f': 'Growing support for RWA in lending protocols.',
        'e': 'May have different liquidation parameters.',
    },
    ('RWA', 'DEX'): {
        'security_level': 'MEDIUM',
        's': 'Check RWA token liquidity. May have restrictions.',
        'a': 'Real-world asset risk + DEX smart contract risk.',
        'f': 'Limited DEX support for some RWAs.',
        'e': 'Liquidity may be thin. Check slippage.',
    },

    # Fiat Gateway
    ('Fiat Gateway', 'SW Browser'): {
        'security_level': 'MEDIUM',
        's': 'Use KYC-compliant gateways. Verify receiving address.',
        'a': 'Fiat gateway holds funds briefly. Quick transfer.',
        'f': 'Most gateways support direct wallet deposits.',
        'e': 'Instant or same-day depending on payment method.',
    },
    ('Fiat Gateway', 'SW Mobile'): {
        'security_level': 'MEDIUM',
        's': 'Verify app authenticity. Use official gateways.',
        'a': 'Brief custodial exposure during purchase.',
        'f': 'Apple/Google Pay support common.',
        'e': 'Mobile-optimized experience. Quick purchases.',
    },
    ('Fiat Gateway', 'CEX'): {
        'security_level': 'LOW',
        's': 'Both require KYC. Check exchange security features.',
        'a': 'Custodial from purchase to trade.',
        'f': 'Many exchanges have built-in fiat gateways.',
        'e': 'Fastest path to trading. One platform.',
    },

    # L2 combinations
    ('L2', 'DEX'): {
        'security_level': 'MEDIUM',
        's': 'Verify L2 security model. Check DEX audit on L2.',
        'a': 'L2 inherits L1 security but has own risks.',
        'f': 'Most popular DEXs deployed on major L2s.',
        'e': 'Significantly lower gas costs. Fast transactions.',
    },
    ('L2', 'Bridges'): {
        'security_level': 'MEDIUM',
        's': 'Use official bridges when possible. Check bridge audit.',
        'a': 'Bridge risk applies. L2 adds complexity.',
        'f': 'Native bridges usually safest option.',
        'e': 'Wait times for L2 withdrawal. Plan ahead.',
    },
    ('L2', 'Lending'): {
        'security_level': 'MEDIUM',
        's': 'Verify lending protocol on L2. May differ from L1 version.',
        'a': 'L2 + lending = compounded smart contract risk.',
        'f': 'Major lending protocols on Arbitrum, Optimism, etc.',
        'e': 'Much lower gas for position management.',
    },
    ('L2', 'SW Browser'): {
        'security_level': 'MEDIUM',
        's': 'Add L2 network to wallet. Verify chain ID.',
        'a': 'Same wallet works across L2s. Manage networks.',
        'f': 'All browser wallets support L2 networks.',
        'e': 'Switch networks for cheaper transactions.',
    },

    # Insurance
    ('Insurance', 'Lending'): {
        'security_level': 'MEDIUM',
        's': 'Read policy carefully. Understand what is covered.',
        'a': 'Insurance reduces but does not eliminate risk.',
        'f': 'Nexus Mutual, InsurAce cover major protocols.',
        'e': 'Premium cost reduces net yield.',
    },
    ('Insurance', 'DEX'): {
        'security_level': 'MEDIUM',
        's': 'Check coverage terms. Not all hacks covered.',
        'a': 'LP insurance available but has limitations.',
        'f': 'Growing insurance options for DeFi.',
        'e': 'Premium varies by protocol risk level.',
    },
}


def get_safe_warnings(type_a_code, type_b_code):
    """Get SAFE pillar warnings for type combination"""
    key1 = (type_a_code, type_b_code)
    key2 = (type_b_code, type_a_code)

    if key1 in SAFE_WARNINGS:
        return SAFE_WARNINGS[key1]
    if key2 in SAFE_WARNINGS:
        return SAFE_WARNINGS[key2]

    # Generate default warnings based on type characteristics
    hw_types = ['HW Cold', 'HW Wallet', 'Bkp Physical', 'MultiSig', 'MPC Wallet']
    custodial_types = ['CEX', 'Crypto Bank', 'CeFi Lending', 'Custody', 'Card']
    defi_types = ['DEX', 'Lending', 'Yield', 'Liq Staking', 'Bridges', 'Perps', 'Options', 'DEX Agg']

    # Determine security level
    if type_a_code in hw_types or type_b_code in hw_types:
        level = 'HIGH'
    elif type_a_code in custodial_types and type_b_code in custodial_types:
        level = 'LOW'
    else:
        level = 'MEDIUM'

    return {
        'security_level': level,
        's': f'Review security practices for both {type_a_code} and {type_b_code}.',
        'a': f'Understand risks of combining {type_a_code} with {type_b_code}.',
        'f': f'Check compatibility between {type_a_code} and {type_b_code}.',
        'e': f'Consider transaction costs and timing for this combination.',
    }


def main():
    print("\n" + "=" * 60)
    print("  ADDING SAFE PILLAR WARNINGS TO COMPATIBILITY")
    print("=" * 60)

    # Load types
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code', headers=HEADERS)
    types_by_id = {t['id']: t['code'] for t in r.json()} if r.status_code == 200 else {}
    print(f"\n📦 {len(types_by_id)} types loaded")

    # Update type_compatibility
    print("\n🔒 Updating type_compatibility with SAFE warnings...")

    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/type_compatibility?select=id,type_a_id,type_b_id,description',
        headers=HEADERS
    )
    type_compats = r.json() if r.status_code == 200 else []
    print(f"   {len(type_compats)} type compatibilities to update")

    updates = 0
    for tc in type_compats:
        type_a = types_by_id.get(tc['type_a_id'], '')
        type_b = types_by_id.get(tc['type_b_id'], '')

        warnings = get_safe_warnings(type_a, type_b)

        # Combine description with method
        full_desc = tc.get('description', '')

        update_data = {
            'security_level': warnings['security_level'],
            'safe_warning_s': warnings['s'],
            'safe_warning_a': warnings['a'],
            'safe_warning_f': warnings['f'],
            'safe_warning_e': warnings['e'],
        }

        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/type_compatibility?id=eq.{tc['id']}",
            headers=HEADERS,
            json=update_data
        )
        if r.status_code in [200, 204]:
            updates += 1
        elif 'does not exist' in str(r.text):
            print(f"   ⚠️ Columns missing. Run migration first!")
            print(f"   SQL: config/migrations/add_compatibility_security_columns.sql")
            return

    print(f"   ✅ {updates}/{len(type_compats)} updated")

    # Update product_compatibility
    print("\n🔒 Updating product_compatibility...")

    # Load products
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,type_id&type_id=not.is.null', headers=HEADERS)
    products = {p['id']: p['type_id'] for p in r.json()} if r.status_code == 200 else {}

    offset = 0
    limit = 500
    total = 0

    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/product_compatibility?select=id,product_a_id,product_b_id&offset={offset}&limit={limit}',
            headers=HEADERS
        )
        prod_compats = r.json() if r.status_code == 200 else []

        if not prod_compats:
            break

        for pc in prod_compats:
            type_a_id = products.get(pc['product_a_id'])
            type_b_id = products.get(pc['product_b_id'])

            if not type_a_id or not type_b_id:
                continue

            type_a = types_by_id.get(type_a_id, '')
            type_b = types_by_id.get(type_b_id, '')

            warnings = get_safe_warnings(type_a, type_b)

            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/product_compatibility?id=eq.{pc['id']}",
                headers=HEADERS,
                json={
                    'security_level': warnings['security_level'],
                    'safe_warning_s': warnings['s'],
                    'safe_warning_a': warnings['a'],
                    'safe_warning_f': warnings['f'],
                    'safe_warning_e': warnings['e'],
                }
            )
            if r.status_code in [200, 204]:
                total += 1

        offset += limit
        print(f"   Processed {offset}...")

    print(f"   ✅ {total} product compatibilities updated")

    print("\n" + "=" * 60)
    print("  ✅ SAFE PILLAR WARNINGS ADDED")
    print("=" * 60)


if __name__ == "__main__":
    main()
