#!/usr/bin/env python3
"""
Fast SAFE pillar warnings update via Supabase Management API.
Uses SQL UPDATE instead of individual PATCH requests.
"""

import requests
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
from core.config import CONFIG

TOKEN = 'sbp_e4b8b78cd32053ff0436cea95ec5adb21a9db936'
PROJECT_REF = 'ajdncttomdqojlozxjxu'

SUPABASE_URL = CONFIG.get('SUPABASE_URL', 'https://ajdncttomdqojlozxjxu.supabase.co')
SERVICE_ROLE_KEY = CONFIG.get('SUPABASE_SERVICE_ROLE_KEY', '')
HEADERS = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
}

# SAFE warnings: (level, S, A, F, E)
SAFE_WARNINGS = {
    ('HW Cold', 'SW Browser'): ('HIGH', 'Verify all transaction details on hardware screen.', 'Hardware wallet protects against browser compromises.', 'Established combo used by millions.', 'Requires USB/Bluetooth connection.'),
    ('HW Cold', 'SW Mobile'): ('HIGH', 'Keep Bluetooth disabled when not in use.', 'Mobile + hardware provides strong protection.', 'Most hardware wallets support mobile pairing.', 'Bluetooth pairing needed.'),
    ('HW Cold', 'SW Desktop'): ('HIGH', 'Use official desktop apps only.', 'Desktop malware cannot compromise hardware signing.', 'Native USB support. Most reliable.', 'Fastest hardware wallet interaction.'),
    ('HW Cold', 'DEX'): ('HIGH', 'Review token approval amounts carefully.', 'Hardware signing prevents approval hijacking.', 'Works with all major DEXs.', 'Each swap requires hardware confirmation.'),
    ('HW Cold', 'Lending'): ('HIGH', 'Set conservative collateral ratios.', 'Cannot be liquidated by compromised hot wallet.', 'Supported by Aave, Compound, Maker.', 'Collateral management requires signatures.'),
    ('HW Cold', 'Liq Staking'): ('HIGH', 'Verify staking contract addresses.', 'Stakes protected even if browser compromised.', 'Works with Lido, Rocket Pool.', 'Initial stake requires device confirmation.'),
    ('HW Cold', 'Bridges'): ('MEDIUM', 'Use only audited bridges.', 'Hardware protects signing but bridge risk remains.', 'Compatible with major bridges.', 'Bridge times vary by chain.'),
    ('HW Cold', 'CEX'): ('MEDIUM', 'Whitelist withdrawal addresses.', 'CEX holds custody after deposit.', 'One-way transfer to CEX.', 'Deposit requires network confirmation.'),
    ('HW Cold', 'Card'): ('MEDIUM', 'Card provider holds funds after transfer.', 'Different security models.', 'Manual top-up required.', 'Transfer delay before spending.'),
    ('SW Browser', 'SW Mobile'): ('MEDIUM', 'Use same seed only if both apps trusted.', 'Multiple access points increase surface.', 'Most wallets support multi-device.', 'Instant sync if same account.'),
    ('SW Browser', 'DEX'): ('MEDIUM', 'Check URL carefully. Revoke unused approvals.', 'Browser extension vulnerable to phishing.', 'Native integration. One-click connection.', 'Instant transaction signing.'),
    ('SW Browser', 'Lending'): ('MEDIUM', 'Monitor health factor. Set alerts.', 'Hot wallet risk. Do not store all funds.', 'Full protocol access from browser.', 'Quick position management.'),
    ('SW Browser', 'CEX'): ('MEDIUM', 'Enable 2FA on exchange.', 'Exchange holds funds after deposit.', 'Standard deposit flow.', 'Network confirmation required.'),
    ('SW Mobile', 'DEX'): ('MEDIUM', 'Verify WalletConnect sessions.', 'Mobile malware can compromise wallet.', 'WalletConnect v2 widely supported.', 'QR scan to connect.'),
    ('SW Mobile', 'Card'): ('MEDIUM', 'Set spending limits on card.', 'Card provider is custodian.', 'Direct integration with some providers.', 'Instant top-up from supported wallets.'),
    ('CEX', 'CEX'): ('LOW', 'Both hold your keys. Enable security.', 'Double custodial risk.', 'Easy transfers if same network.', 'Fast internal transfers.'),
    ('CEX', 'DEX'): ('MEDIUM', 'Withdraw to self-custody first.', 'CEX to wallet to DEX reduces exposure.', 'Need intermediate wallet for most DEXs.', 'Two-step process adds time and gas.'),
    ('CEX', 'Card'): ('LOW', 'Both custodial. Exchange may freeze funds.', 'Single provider risk if same company.', 'Native integration for exchange cards.', 'Instant spending from balance.'),
    ('CEX', 'Lending'): ('MEDIUM', 'Use self-custody for DeFi.', 'DeFi lending more transparent but has SC risk.', 'Withdraw to wallet first for DeFi.', 'Extra step required. Gas costs apply.'),
    ('DEX', 'DEX'): ('MEDIUM', 'Use DEX aggregators for best rates.', 'Multiple DEX exposure compounds risk.', 'Aggregators route automatically.', 'Usually gas efficient.'),
    ('DEX', 'Lending'): ('MEDIUM', 'Review all approvals carefully.', 'Compounded smart contract risk.', 'Common DeFi strategy.', 'Multiple transactions required.'),
    ('DEX', 'Yield'): ('MEDIUM', 'Verify yield source sustainability.', 'Yield farming adds protocol risk.', 'LP tokens widely accepted.', 'Compounding may require harvesting.'),
    ('DEX', 'Bridges'): ('MEDIUM', 'Verify bridge security audits.', 'Bridge + DEX = multiple SC risks.', 'Cross-chain aggregators combine both.', 'Bridge time + DEX time.'),
    ('Lending', 'Lending'): ('MEDIUM', 'Avoid recursive borrowing loops.', 'Cascading liquidation risk.', 'Can move collateral between protocols.', 'Gas costs for each interaction.'),
    ('Lending', 'Liq Staking'): ('MEDIUM', 'LST depeg can trigger liquidation.', 'Double exposure: lending + staking.', 'Major protocols accept LSTs.', 'Single transaction to deposit.'),
    ('Lending', 'Stablecoin'): ('MEDIUM', 'Monitor stablecoin peg.', 'Depeg can affect collateral value.', 'Stablecoins widely supported.', 'Stable borrowing costs.'),
    ('Liq Staking', 'Liq Staking'): ('MEDIUM', 'Restaking adds smart contract risk.', 'Slashing risk compounds.', 'EigenLayer and similar enable this.', 'Higher yield but more complexity.'),
    ('Liq Staking', 'DEX'): ('MEDIUM', 'Check LST liquidity before large trades.', 'Depeg risk when selling large amounts.', 'Major LSTs have deep liquidity.', 'Instant swap if liquidity available.'),
    ('Liq Staking', 'Yield'): ('MEDIUM', 'Verify yield protocol audits.', 'Combined staking and yield risks.', 'Many yield protocols accept LSTs.', 'Compounded yield.'),
    ('Bridges', 'Bridges'): ('LOW', 'Multiple hops increase exposure.', 'Each bridge is potential failure point.', 'May be necessary for exotic routes.', 'Compounded times. High gas.'),
    ('Bridges', 'Lending'): ('MEDIUM', 'Verify bridged asset is accepted.', 'Bridged assets may have different risks.', 'Native vs bridged have different support.', 'Bridge time before lending.'),
    ('Bkp Physical', 'HW Cold'): ('HIGH', 'Store backup separate from device.', 'Metal backup survives fire/flood.', 'BIP39 standard supported.', 'One-time setup.'),
    ('Bkp Physical', 'Bkp Physical'): ('HIGH', 'Geographic separation is key.', 'Multiple backups protect against disasters.', 'Same seed on multiple plates.', 'Additional cost but maximum protection.'),
    ('Bkp Digital', 'HW Cold'): ('MEDIUM', 'Encrypt digital backup.', 'Digital can be compromised.', 'Encrypted backup as convenience.', 'Faster access but less secure.'),
    ('Stablecoin', 'Stablecoin'): ('MEDIUM', 'Diversify across stablecoin types.', 'Single depeg affects all holdings.', 'Easy to swap on DEXs.', 'Low slippage swaps.'),
    ('Stablecoin', 'DEX'): ('MEDIUM', 'Check reserves and audits.', 'Stablecoin + DEX SC risks.', 'Stablecoins are primary DEX pairs.', 'Stable value for trading.'),
    ('Stablecoin', 'Yield'): ('MEDIUM', 'Verify yield sustainability.', 'Yield often comes from lending risk.', 'Wide support for stable strategies.', 'Lower but predictable returns.'),
    ('Card', 'SW Mobile'): ('MEDIUM', 'Set spending limits.', 'Card provider holds funds.', 'Many cards support mobile top-up.', 'Instant top-up from wallets.'),
    ('Crypto Bank', 'CEX'): ('LOW', 'Verify both are regulated.', 'Double custodial exposure.', 'Usually easy transfers.', 'Fast fiat and crypto transfers.'),
    ('Crypto Bank', 'Card'): ('LOW', 'Same counterparty risk.', 'Single provider for banking and spending.', 'Usually native integration.', 'Instant card spending.'),
    ('CeFi Lending', 'CEX'): ('LOW', 'Counterparty risk on both.', 'CeFi has failed before. Diversify.', 'Easy movement between services.', 'Fast transfers. No gas.'),
    ('Custody', 'HW Cold'): ('HIGH', 'Different key ownership models.', 'Custody for institutions, HW for personal.', 'Can transfer between.', 'Requires custodian coordination.'),
    ('MultiSig', 'HW Cold'): ('HIGH', 'Each signer should use hardware.', 'No single point of failure.', 'Gnosis Safe + HW is gold standard.', 'Requires multiple signers.'),
    ('MultiSig', 'DEX'): ('HIGH', 'All signers must verify details.', 'MultiSig prevents single compromise.', 'Major DEXs support Safe transactions.', 'Requires quorum approval.'),
    ('MPC Wallet', 'DEX'): ('HIGH', 'MPC distributes key risk.', 'No single key to compromise.', 'Looks like normal wallet to DEXs.', 'Slight delay for MPC computation.'),
    ('MPC Wallet', 'HW Cold'): ('HIGH', 'Different security models.', 'Both protect against single failure.', 'Can use both for different amounts.', 'MPC faster for daily use.'),
    ('DEX Agg', 'DEX'): ('MEDIUM', 'Aggregator routes through multiple DEXs.', 'Multiple DEX exposure.', 'Aggregators find best prices.', 'Usually better rates.'),
    ('DEX Agg', 'SW Browser'): ('MEDIUM', 'Verify aggregator site.', 'Browser wallet + aggregator SC risk.', 'All aggregators support browser wallets.', 'One-click best-rate swaps.'),
    ('Perps', 'SW Browser'): ('MEDIUM', 'Use stop losses always.', 'Leverage multiplies gains and losses.', 'Most perp DEXs require browser wallet.', 'Fast execution. Watch funding rates.'),
    ('Options', 'SW Browser'): ('MEDIUM', 'Understand Greeks. Options expire.', 'Complex instruments. Start small.', 'DeFi options work with standard wallets.', 'Premium costs. Time decay.'),
    ('RWA', 'Lending'): ('MEDIUM', 'Verify RWA tokenization process.', 'RWA adds real-world counterparty risk.', 'Growing support in lending.', 'May have different liquidation params.'),
    ('RWA', 'DEX'): ('MEDIUM', 'Check RWA token liquidity.', 'Real-world + DEX SC risks.', 'Limited DEX support for some RWAs.', 'Liquidity may be thin.'),
    ('Fiat Gateway', 'SW Browser'): ('MEDIUM', 'Use KYC-compliant gateways.', 'Fiat gateway holds funds briefly.', 'Most gateways support direct deposits.', 'Instant or same-day.'),
    ('Fiat Gateway', 'SW Mobile'): ('MEDIUM', 'Verify app authenticity.', 'Brief custodial exposure during purchase.', 'Apple/Google Pay common.', 'Mobile-optimized. Quick purchases.'),
    ('Fiat Gateway', 'CEX'): ('LOW', 'Both require KYC.', 'Custodial from purchase to trade.', 'Many exchanges have built-in fiat.', 'Fastest path to trading.'),
    ('L2', 'DEX'): ('MEDIUM', 'Verify L2 security model.', 'L2 inherits L1 security but has own risks.', 'Most DEXs deployed on major L2s.', 'Much lower gas. Fast transactions.'),
    ('L2', 'Bridges'): ('MEDIUM', 'Use official bridges when possible.', 'Bridge risk applies.', 'Native bridges usually safest.', 'Wait times for L2 withdrawal.'),
    ('L2', 'Lending'): ('MEDIUM', 'Verify lending protocol on L2.', 'L2 + lending = compounded SC risk.', 'Major protocols on Arbitrum, Optimism.', 'Much lower gas for management.'),
    ('L2', 'SW Browser'): ('MEDIUM', 'Add L2 network to wallet.', 'Same wallet works across L2s.', 'All browser wallets support L2.', 'Switch networks for cheaper tx.'),
    ('Insurance', 'Lending'): ('MEDIUM', 'Read policy carefully.', 'Insurance reduces but does not eliminate risk.', 'Nexus Mutual, InsurAce cover majors.', 'Premium reduces net yield.'),
    ('Insurance', 'DEX'): ('MEDIUM', 'Check coverage terms.', 'LP insurance has limitations.', 'Growing insurance for DeFi.', 'Premium varies by risk level.'),
}

def escape_sql(s):
    return s.replace("'", "''") if s else ''

def execute_sql(query):
    r = requests.post(
        f'https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query',
        headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'},
        json={'query': query}
    )
    return r.status_code == 201, r.text

def get_warning(type_a, type_b):
    key1 = (type_a, type_b)
    key2 = (type_b, type_a)

    if key1 in SAFE_WARNINGS:
        return SAFE_WARNINGS[key1]
    if key2 in SAFE_WARNINGS:
        return SAFE_WARNINGS[key2]

    hw_types = ['HW Cold', 'HW Wallet', 'Bkp Physical', 'MultiSig', 'MPC Wallet']
    custodial = ['CEX', 'Crypto Bank', 'CeFi Lending', 'Custody', 'Card']

    if type_a in hw_types or type_b in hw_types:
        level = 'HIGH'
    elif type_a in custodial and type_b in custodial:
        level = 'LOW'
    else:
        level = 'MEDIUM'

    s = f'Review security for {type_a} and {type_b}.'
    a = f'Understand risks of combining {type_a} with {type_b}.'
    f = f'Check compatibility between {type_a} and {type_b}.'
    e = 'Consider transaction costs and timing.'
    return (level, s, a, f, e)

def main():
    print("\n" + "=" * 60)
    print("  FAST SAFE PILLAR WARNINGS UPDATE")
    print("=" * 60)

    # Get types
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code', headers=HEADERS)
    types = r.json() if r.status_code == 200 else []
    types_by_id = {t['id']: t['code'] for t in types}
    print(f"\n📦 {len(types)} types loaded")

    # Update type_compatibility
    print("\n🔒 Updating type_compatibility...")

    r = requests.get(f'{SUPABASE_URL}/rest/v1/type_compatibility?select=id,type_a_id,type_b_id', headers=HEADERS)
    type_compats = r.json() if r.status_code == 200 else []

    # Batch update
    batch = []
    for tc in type_compats:
        type_a = types_by_id.get(tc['type_a_id'], '')
        type_b = types_by_id.get(tc['type_b_id'], '')
        level, s, a, f, e = get_warning(type_a, type_b)
        batch.append(f"({tc['id']}, '{level}', '{escape_sql(s)}', '{escape_sql(a)}', '{escape_sql(f)}', '{escape_sql(e)}')")

    # Execute in chunks
    chunk_size = 200
    updated = 0
    for i in range(0, len(batch), chunk_size):
        chunk = batch[i:i+chunk_size]
        sql = f"""
        UPDATE type_compatibility AS tc
        SET security_level = v.level,
            safe_warning_s = v.s,
            safe_warning_a = v.a,
            safe_warning_f = v.f,
            safe_warning_e = v.e
        FROM (VALUES {','.join(chunk)}) AS v(id, level, s, a, f, e)
        WHERE tc.id = v.id::bigint
        """
        ok, _ = execute_sql(sql)
        if ok:
            updated += len(chunk)

    print(f"   ✅ {updated}/{len(type_compats)} type compatibilities updated")

    # Update product_compatibility
    print("\n🔒 Updating product_compatibility...")

    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,type_id&type_id=not.is.null', headers=HEADERS)
    products = {p['id']: p['type_id'] for p in r.json()} if r.status_code == 200 else {}
    print(f"   {len(products)} products loaded")

    offset = 0
    limit = 500
    total = 0

    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/product_compatibility?select=id,product_a_id,product_b_id&offset={offset}&limit={limit}',
            headers=HEADERS
        )
        compats = r.json() if r.status_code == 200 else []

        if not compats:
            break

        batch = []
        for pc in compats:
            type_a_id = products.get(pc['product_a_id'])
            type_b_id = products.get(pc['product_b_id'])

            if not type_a_id or not type_b_id:
                continue

            type_a = types_by_id.get(type_a_id, '')
            type_b = types_by_id.get(type_b_id, '')
            level, s, a, f, e = get_warning(type_a, type_b)
            batch.append(f"({pc['id']}, '{level}', '{escape_sql(s)}', '{escape_sql(a)}', '{escape_sql(f)}', '{escape_sql(e)}')")

        if batch:
            sql = f"""
            UPDATE product_compatibility AS pc
            SET security_level = v.level,
                safe_warning_s = v.s,
                safe_warning_a = v.a,
                safe_warning_f = v.f,
                safe_warning_e = v.e
            FROM (VALUES {','.join(batch)}) AS v(id, level, s, a, f, e)
            WHERE pc.id = v.id::bigint
            """
            ok, _ = execute_sql(sql)
            if ok:
                total += len(batch)

        offset += limit
        if offset % 2000 == 0:
            print(f"   Processed {offset}...")

    print(f"   ✅ {total} product compatibilities updated")

    print("\n" + "=" * 60)
    print("  ✅ SAFE PILLAR WARNINGS COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    main()
