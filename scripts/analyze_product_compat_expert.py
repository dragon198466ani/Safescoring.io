#!/usr/bin/env python3
"""
EXPERT Product Compatibility Analysis by Claude
Based on deep knowledge of crypto products, integrations, and real-world usage.
Each pair is analyzed with specific, actionable information.
"""

import requests
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

# ===== EXPERT PRODUCT COMPATIBILITY ANALYSIS =====
# Format: (product_a_slug, product_b_slug): {
#   'compatible': True/False,
#   'method': how they work together,
#   's': security warning for this specific pair,
#   'a': adversity warning for this specific pair,
#   'f': fidelity warning for this specific pair,
#   'e': efficiency warning for this specific pair,
# }

PRODUCT_ANALYSIS = {
    # ===== LEDGER NANO X COMBINATIONS =====
    ('ledger-nano-x', 'metamask'): {
        'compatible': True,
        'method': 'Native integration via Ledger Live or direct MetaMask hardware wallet connection',
        'level': 'HIGH',
        's': 'LEDGER+METAMASK: Always verify transaction details on Ledger screen. MetaMask can display incorrect data if browser is compromised. The Ledger Nano X screen is your only source of truth.',
        'a': 'SUPPLY CHAIN: If MetaMask extension is malicious (fake extension, compromised update), it can display wrong recipient. Ledger protects signing but cannot verify MetaMask displays correct address.',
        'f': 'BLUETOOTH ISSUES: Ledger Nano X Bluetooth pairing with MetaMask Mobile can be unreliable. USB connection via Ledger Live is more stable. After MetaMask updates, reconnection may be required.',
        'e': 'EACH TRANSACTION: Every swap, approval, or transfer requires physical button press on Ledger. For multiple transactions, expect 30-60 seconds per operation. Batch operations not possible.',
    },
    ('ledger-nano-x', 'uniswap'): {
        'compatible': True,
        'method': 'Via MetaMask/Rabby connected to Ledger, then access Uniswap dApp',
        'level': 'HIGH',
        's': 'TOKEN APPROVAL: When approving tokens for Uniswap, Ledger shows approval amount. NEVER approve unlimited amount. Set exact swap amount to prevent future exploits.',
        'a': 'MEV SANDWICH: Hardware signing takes 15-30 seconds. During this time, MEV bots can position for sandwich attack. Use Uniswap MEV protection or private mempool for large swaps.',
        'f': 'UNISWAP V3 DISPLAY: Complex V3 position NFTs may not display correctly on Ledger screen. Trust the contract address, not the displayed metadata.',
        'e': 'TWO-STEP PROCESS: Swap requires approval tx (if first time) + swap tx. Each needs Ledger confirmation. Minimum 1 minute for simple swap.',
    },
    ('ledger-nano-x', 'aave'): {
        'compatible': True,
        'method': 'Via browser wallet connected to Ledger, then access Aave dApp',
        'level': 'HIGH',
        's': 'COLLATERAL MANAGEMENT: When adding/removing collateral on Aave, Ledger shows only transaction data. Monitor Aave health factor separately - Ledger cannot warn about liquidation risk.',
        'a': 'ORACLE ATTACK: Flash loan attacks can manipulate Aave oracles. Your position can be liquidated in seconds. Ledger cannot protect against oracle manipulation - only your own position monitoring can.',
        'f': 'E-MODE COMPLEXITY: Aave E-mode transactions may show complex calldata on Ledger. Verify you are interacting with official Aave contract address.',
        'e': 'EMERGENCY DELAYS: In market crash, you need to add collateral fast. Ledger signing takes time. Consider keeping small amount in hot wallet for emergency top-ups.',
    },
    ('ledger-nano-x', 'lido'): {
        'compatible': True,
        'method': 'Via browser wallet connected to Ledger, then access Lido staking interface',
        'level': 'HIGH',
        's': 'STAKING CONTRACT: Verify Lido contract address on Ledger screen before staking. Phishing sites use similar domains. Official: stake.lido.fi',
        'a': 'SLASHING EXPOSURE: Once you stake via Ledger, your ETH is exposed to validator slashing risk. Ledger cannot protect against Lido validator penalties.',
        'f': 'STETH REBASING: stETH balance increases daily without transactions. Your wallet may show different amount than expected. This is normal rebasing behavior.',
        'e': 'WITHDRAWAL QUEUE: Unstaking from Lido takes 1-5 days depending on queue. Ledger signature commits you to withdrawal process that cannot be cancelled.',
    },
    ('ledger-nano-x', 'binance'): {
        'compatible': True,
        'method': 'One-way deposit from Ledger to Binance. No direct integration.',
        'level': 'MEDIUM',
        's': 'DEPOSIT ADDRESS: When sending from Ledger to Binance, ALWAYS verify the FULL address on Ledger screen. Address poisoning attacks send dust from similar addresses. One wrong character = permanent loss.',
        'a': 'CUSTODY TRANSFER: Once confirmed on Ledger, funds sent to Binance are under Binance custody. FTX-style insolvency risk applies after deposit. Ledger protection ends at deposit.',
        'f': 'NETWORK SELECTION: Binance supports multiple networks (ERC20, BEP20, Arbitrum). Sending on wrong network may result in loss. Verify network on both Ledger and Binance.',
        'e': 'CONFIRMATION WAIT: After Ledger signs, network confirmation takes 2-30 minutes. Funds unavailable for trading until confirmed. Plan for delays.',
    },

    # ===== TREZOR COMBINATIONS =====
    ('trezor-model-t', 'metamask'): {
        'compatible': True,
        'method': 'Native MetaMask hardware wallet integration via WebUSB',
        'level': 'HIGH',
        's': 'TREZOR+METAMASK: Verify all transaction details on Trezor touchscreen. MetaMask displays can be manipulated. Trezor screen is truth.',
        'a': 'USB FIRMWARE: Trezor requires firmware updates. Only update from official trezor.io/start. Fake update sites exist to steal seeds.',
        'f': 'BRIDGE SOFTWARE: Trezor Bridge must be running for MetaMask connection. After Bridge updates, restart browser for reconnection.',
        'e': 'TOUCHSCREEN CONFIRMATION: Each transaction requires touchscreen approval. Slower than button-based devices for multiple operations.',
    },
    ('trezor-safe-3', 'uniswap'): {
        'compatible': True,
        'method': 'Via MetaMask connected to Trezor Safe 3, then access Uniswap',
        'level': 'HIGH',
        's': 'APPROVAL LIMIT: Trezor Safe 3 shows token approval amounts. Set specific amount, not unlimited. Check contract address matches Uniswap Router.',
        'a': 'SECURE ELEMENT: Trezor Safe 3 uses secure element for key storage. More resistant to physical attacks than Model T, but verify genuine device.',
        'f': 'NEW MODEL: Trezor Safe 3 is newer model. Some dApps may have display issues. Verify transaction intent before signing.',
        'e': 'HAPTIC FEEDBACK: Trezor Safe 3 has haptic confirmation. Slightly faster UX than older models but still requires physical interaction.',
    },

    # ===== METAMASK COMBINATIONS =====
    ('metamask', 'uniswap'): {
        'compatible': True,
        'method': 'Native dApp connection via MetaMask browser extension',
        'level': 'MEDIUM',
        's': 'PHISHING RISK: Fake Uniswap sites look identical. ALWAYS verify URL: app.uniswap.org. One wrong approval = drained wallet.',
        'a': 'EXTENSION COMPROMISE: MetaMask extension updates can be hijacked. Millions lost to fake extensions. Verify extension ID in browser settings.',
        'f': 'POPUP BLOCKED: MetaMask popup may be blocked by browser. Enable popups for Uniswap domain or transaction will hang.',
        'e': 'GAS ESTIMATION: MetaMask gas estimation for Uniswap swaps can be inaccurate during high volatility. Manual gas adjustment may be needed.',
    },
    ('metamask', 'aave'): {
        'compatible': True,
        'method': 'Native dApp connection via MetaMask browser extension',
        'level': 'MEDIUM',
        's': 'APPROVAL PHISHING: Fake Aave sites request token approvals. Always verify: app.aave.com. Check approval amount in MetaMask popup.',
        'a': 'LIQUIDATION RISK: MetaMask holds your keys but cannot protect against Aave liquidation. Monitor health factor independently.',
        'f': 'MULTI-CHAIN: Aave runs on multiple chains. Ensure MetaMask is on correct network before interacting.',
        'e': 'MULTIPLE TXS: Supplying, borrowing, repaying each require separate transactions. Plan for 3-5 transactions for complex positions.',
    },
    ('metamask', 'lido'): {
        'compatible': True,
        'method': 'Native dApp connection via MetaMask browser extension',
        'level': 'MEDIUM',
        's': 'STAKE.LIDO.FI: Only official staking interface. Verify domain exactly. Phishing sites widespread.',
        'a': 'SMART CONTRACT RISK: Lido is battle-tested but smart contract risk exists. Staked ETH exposed to Lido contract vulnerabilities.',
        'f': 'STETH COMPATIBILITY: stETH received may not display correctly in all MetaMask views. Asset is valid even if display glitches.',
        'e': 'NO INSTANT UNSTAKE: Staking is instant, unstaking takes days. No emergency exit option.',
    },

    # ===== DEFI PROTOCOL COMBINATIONS =====
    ('aave', 'lido'): {
        'compatible': True,
        'method': 'stETH from Lido can be used as collateral on Aave V3',
        'level': 'MEDIUM',
        's': 'STETH COLLATERAL: Using stETH as Aave collateral exposes you to both Lido AND Aave smart contract risks. Double exposure.',
        'a': 'DEPEG LIQUIDATION: If stETH depegs from ETH (happened in 2022), your collateral value drops but debt stays same. Liquidation risk increases.',
        'f': 'E-MODE BOOST: Aave E-mode for stETH/ETH allows higher LTV. But depeg risk makes this aggressive - conservative users should avoid E-mode.',
        'e': 'YIELD STACKING: stETH earns staking yield while collateral. Net yield = staking yield - borrow cost. Calculate actual returns.',
    },
    ('uniswap', 'aave'): {
        'compatible': True,
        'method': 'Swap tokens on Uniswap, then deposit to Aave. Separate transactions.',
        'level': 'MEDIUM',
        's': 'SWAP THEN SUPPLY: After Uniswap swap, new tokens need Aave approval. Two approval transactions = two phishing opportunities. Verify both.',
        'a': 'ORACLE DIFFERENCES: Uniswap uses AMM price, Aave uses Chainlink oracle. Price differences can be exploited by attackers.',
        'f': 'TOKEN COMPATIBILITY: Not all Uniswap tokens are Aave-supported collateral. Check Aave docs before swapping for collateral.',
        'e': 'GAS COSTS: Swap tx + approval tx + supply tx = 3 transactions. During high gas, can cost $50-200 total.',
    },
    ('curve', 'aave'): {
        'compatible': True,
        'method': 'LP tokens from Curve can be used in some Aave markets or as collateral via integrations',
        'level': 'MEDIUM',
        's': 'LP TOKEN COMPLEXITY: Curve LP tokens represent basket of assets. Value depends on pool composition. Harder to audit than single assets.',
        'a': 'DEPEG CONTAGION: Curve pools with stablecoins affected if any stablecoin depegs. LP value can drop significantly.',
        'f': 'GAUGE REWARDS: Curve gauges for LP tokens not directly usable in Aave. Must choose between Curve rewards or Aave collateral.',
        'e': 'GAS INTENSIVE: Curve swaps are expensive. Adding Aave on top multiplies transaction costs.',
    },
    ('lido', 'eigenlayer'): {
        'compatible': True,
        'method': 'stETH from Lido can be restaked on EigenLayer for additional yield',
        'level': 'MEDIUM',
        's': 'TRIPLE PROTOCOL RISK: Ethereum staking risk + Lido risk + EigenLayer risk. Each layer adds smart contract exposure.',
        'a': 'RESTAKING SLASHING: EigenLayer restaking amplifies slashing penalties. Bad operator behavior can result in significant losses.',
        'f': 'WITHDRAWAL COMPLEXITY: Exiting requires: EigenLayer unstake -> Lido unstake -> ETH. Multi-step process takes weeks.',
        'e': 'YIELD OPTIMIZATION: Extra yield from restaking may be marginal. Calculate if added complexity worth 1-3% additional APY.',
    },

    # ===== CEX -> DEFI COMBINATIONS =====
    ('binance', 'aave'): {
        'compatible': False,
        'method': 'NO DIRECT CONNECTION. Must withdraw from Binance to wallet, then deposit to Aave.',
        'level': 'MEDIUM',
        's': 'TWO-STEP REQUIRED: Binance -> Your Wallet -> Aave. Each step is attack opportunity. Verify addresses at each stage.',
        'a': 'WITHDRAWAL DELAYS: Binance may delay withdrawals during volatility. Cannot quickly respond to Aave position needs.',
        'f': 'NETWORK MISMATCH: Binance may default to BEP20. Aave on Ethereum needs ERC20. Wrong network = stuck funds.',
        'e': 'DOUBLE FEES: Binance withdrawal fee + Ethereum gas for Aave deposit. Can be $20-50 total.',
    },
    ('binance', 'uniswap'): {
        'compatible': False,
        'method': 'NO DIRECT CONNECTION. Must withdraw from Binance to wallet, then use Uniswap.',
        'level': 'MEDIUM',
        's': 'INTERMEDIATE WALLET: Binance -> Your Wallet -> Uniswap. More steps = more phishing opportunities.',
        'a': 'ARBITRAGE IMPOSSIBLE: By the time funds reach wallet, arbitrage opportunity is gone. Cannot react to price movements.',
        'f': 'CHAIN COMPATIBILITY: Binance withdrawal to Ethereum, then Uniswap. Or Arbitrum for lower fees.',
        'e': 'WITHDRAWAL WAIT: Binance withdrawal confirmation takes 10-60 minutes. Add Uniswap swap time.',
    },
    ('coinbase', 'aave'): {
        'compatible': False,
        'method': 'NO DIRECT CONNECTION. Must withdraw from Coinbase to wallet, then deposit to Aave.',
        'level': 'MEDIUM',
        's': 'COINBASE VAULT: If using Coinbase Vault, withdrawal requires 48h wait. Cannot respond to Aave liquidation in time.',
        'a': 'US REGULATORY RISK: Coinbase is US-regulated. May restrict withdrawals to DeFi addresses in future.',
        'f': 'COINBASE WALLET OPTION: Can use Coinbase Wallet (self-custody) for direct Aave access. But this is different from Coinbase exchange.',
        'e': 'BASE CHAIN OPTION: Coinbase offers cheap Base L2 withdrawals. Aave on Base available for lower fees.',
    },
    ('kraken', 'lido'): {
        'compatible': False,
        'method': 'NO DIRECT CONNECTION. Must withdraw from Kraken to wallet, then stake on Lido.',
        'level': 'MEDIUM',
        's': 'ALTERNATIVE: Kraken offers native ETH staking. May be simpler than withdrawing to Lido. Compare yields and risks.',
        'a': 'KRAKEN STAKING: Kraken staking is custodial but regulated. Different risk profile than Lido smart contract.',
        'f': 'WITHDRAWAL LIMITS: Kraken may have daily withdrawal limits. Large positions take multiple days to move.',
        'e': 'DIRECT VS DEFI: Kraken staking = no gas fees, simpler. Lido = DeFi composability, more steps.',
    },

    # ===== SOFTWARE WALLET COMBINATIONS =====
    ('metamask', 'phantom-wallet'): {
        'compatible': False,
        'method': 'Different ecosystems: MetaMask = Ethereum, Phantom = Solana. Cannot directly interact.',
        'level': 'LOW',
        's': 'ECOSYSTEM SEPARATION: MetaMask and Phantom operate on different blockchains. No shared assets unless bridged.',
        'a': 'BRIDGE REQUIRED: To move assets between MetaMask (ETH) and Phantom (SOL), bridge is needed. Bridge = additional risk.',
        'f': 'NO INTEROP: Apps designed for MetaMask will not work with Phantom and vice versa.',
        'e': 'PARALLEL USAGE: Can use both wallets for respective ecosystems. No integration overhead because no integration.',
    },
    ('metamask', 'rainbow'): {
        'compatible': True,
        'method': 'Both are Ethereum wallets. Can import same seed phrase. Same addresses.',
        'level': 'MEDIUM',
        's': 'SEED SHARING: Importing same seed to both wallets means compromise of either = compromise of both.',
        'a': 'DOUBLE EXPOSURE: Two wallet apps = two attack surfaces. More apps with your seed = more risk.',
        'f': 'NONCE CONFLICTS: Sending from both wallets simultaneously can cause nonce issues. Transactions may fail.',
        'e': 'REDUNDANT ACCESS: Useful for accessing from desktop (MetaMask) and mobile (Rainbow). But not simultaneous.',
    },

    # ===== SAFE (MULTISIG) COMBINATIONS =====
    ('ledger-nano-x', 'argent'): {
        'compatible': True,
        'method': 'Argent supports hardware wallet as signer. Ledger can be guardian or owner.',
        'level': 'HIGH',
        's': 'SOCIAL RECOVERY: Argent uses social recovery with guardians. Ledger as guardian provides hardware security for recovery.',
        'a': 'GUARDIAN SECURITY: If Ledger is guardian, guardian recovery requires hardware access. Protects against remote guardian compromise.',
        'f': 'MOBILE-FIRST: Argent is mobile-first. Ledger integration works but UX is designed for mobile.',
        'e': 'GUARDIAN ACTIONS: Guardian operations (recovery, locking) require Ledger transaction. Not instant response.',
    },

    # ===== BRIDGE COMBINATIONS =====
    ('metamask', 'arbitrum-one'): {
        'compatible': True,
        'method': 'MetaMask can add Arbitrum network. Native bridge via bridge.arbitrum.io',
        'level': 'MEDIUM',
        's': 'BRIDGE TO L2: Official Arbitrum bridge is safe. Third-party bridges have higher risk. Always use bridge.arbitrum.io for large amounts.',
        'a': 'CANONICAL WITHDRAWAL: Withdrawing from Arbitrum to Ethereum takes 7 days (challenge period). Cannot speed up.',
        'f': 'NETWORK SWITCHING: MetaMask can switch between Ethereum and Arbitrum. Ensure correct network before signing.',
        'e': 'CHEAP GAS: Arbitrum transactions cost 5-20x less than Ethereum mainnet. Worth bridging for frequent DeFi use.',
    },

    # ===== LENDING COMBINATIONS =====
    ('aave', 'compound'): {
        'compatible': True,
        'method': 'Both lending protocols. Can move positions between them. Each requires separate wallet connection.',
        'level': 'MEDIUM',
        's': 'PROTOCOL COMPARISON: Both audited, battle-tested. Aave has more features (flash loans, E-mode). Compound simpler.',
        'a': 'RATE ARBITRAGE: Interest rates differ. Can borrow from one, supply to other. But spreads are usually minimal.',
        'f': 'GOVERNANCE TOKENS: Aave has AAVE, Compound has COMP. Rewards differ. Factor into yield calculation.',
        'e': 'MIGRATION COST: Moving position requires: withdraw from A + deposit to B = 2 transactions + gas.',
    },
    ('aave', 'morpho'): {
        'compatible': True,
        'method': 'Morpho is Aave optimizer. Deposits to Morpho go to Aave but with better rates.',
        'level': 'MEDIUM',
        's': 'ADDITIONAL LAYER: Morpho adds smart contract layer on top of Aave. Extra smart contract risk.',
        'a': 'RATE OPTIMIZATION: Morpho matches lenders/borrowers peer-to-peer for better rates. Fallback to Aave pool.',
        'f': 'MORPHO AAVE vs MORPHO BLUE: Different Morpho products. Morpho Aave is optimizer. Morpho Blue is standalone.',
        'e': 'SIMILAR UX: Using Morpho feels like Aave. Better rates with similar experience.',
    },

    # ===== LIQUID STAKING COMBINATIONS =====
    ('lido', 'rocket-pool'): {
        'compatible': False,
        'method': 'Competing liquid staking protocols. Both give you LST for staked ETH.',
        'level': 'MEDIUM',
        's': 'DIVERSIFICATION: Splitting stake between Lido (stETH) and Rocket Pool (rETH) reduces protocol-specific risk.',
        'a': 'DIFFERENT MODELS: Lido = permissioned operators. Rocket Pool = permissionless. Different decentralization profiles.',
        'f': 'LST DIFFERENCES: stETH rebases (balance changes). rETH accrues value (balance stays same, value increases).',
        'e': 'BOTH HAVE QUEUES: Unstaking from either takes days. No instant redemption.',
    },
    ('lido', 'curve'): {
        'compatible': True,
        'method': 'stETH/ETH pool on Curve allows trading stETH <-> ETH with low slippage',
        'level': 'MEDIUM',
        's': 'LP POSITION: Providing liquidity to stETH/ETH pool exposes you to impermanent loss if stETH depegs.',
        'a': 'DEPEG SCENARIO: In June 2022, stETH traded at 5% discount. LPs suffered IL. Pool provided exit liquidity.',
        'f': 'GAUGE REWARDS: Curve gauge for stETH/ETH pool earns CRV + LDO rewards. Boosted with veCRV.',
        'e': 'YIELD COMBO: LP yield + staking yield + CRV rewards + LDO rewards. Complex to calculate true APY.',
    },

    # ===== DEX AGGREGATOR COMBINATIONS =====
    ('1inch', 'uniswap'): {
        'compatible': True,
        'method': '1inch aggregates Uniswap liquidity. Swaps may route through Uniswap.',
        'level': 'MEDIUM',
        's': 'AGGREGATOR ADDS CONTRACT: 1inch swap goes through 1inch contract then to Uniswap. Two contract risks.',
        'a': 'ROUTING OPTIMIZATION: 1inch finds best route across DEXs. May split trades across multiple pools.',
        'f': 'FUSION MODE: 1inch Fusion uses order flow auctions. Different execution model than direct Uniswap.',
        'e': 'BETTER RATES USUALLY: 1inch typically finds better rates than direct Uniswap for large swaps.',
    },
    ('1inch', 'curve'): {
        'compatible': True,
        'method': '1inch routes stablecoin swaps through Curve for best rates',
        'level': 'MEDIUM',
        's': 'STABLE SWAPS: Curve pools optimized for stablecoin swaps. 1inch detects this and routes accordingly.',
        'a': 'CURVE POOL RISK: If Curve pool has imbalanced assets, even 1inch route may have poor execution.',
        'f': 'AUTOMATIC ROUTING: No user action needed. 1inch automatically uses Curve when optimal.',
        'e': 'MINIMAL SLIPPAGE: Curve + 1inch = very low slippage for large stablecoin swaps.',
    },
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


def get_product_id(slug):
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?slug=eq.{slug}&select=id', headers=HEADERS)
    data = r.json() if r.status_code == 200 else []
    return data[0]['id'] if data else None


def main():
    print("\n" + "=" * 60)
    print("  EXPERT PRODUCT COMPATIBILITY ANALYSIS BY CLAUDE")
    print("=" * 60)

    print(f"\n[INFO] Analyzing {len(PRODUCT_ANALYSIS)} product pairs...")

    updated = 0
    inserted = 0
    not_found = []

    for (slug_a, slug_b), analysis in PRODUCT_ANALYSIS.items():
        id_a = get_product_id(slug_a)
        id_b = get_product_id(slug_b)

        if not id_a:
            not_found.append(slug_a)
            continue
        if not id_b:
            not_found.append(slug_b)
            continue

        level = analysis.get('level', 'MEDIUM')
        s = escape_sql(analysis['s'])
        a = escape_sql(analysis['a'])
        f = escape_sql(analysis['f'])
        e = escape_sql(analysis['e'])
        method = escape_sql(analysis.get('method', ''))
        compatible = analysis.get('compatible', True)

        # Use UPSERT (INSERT ON CONFLICT) to create or update
        sql = f"""
        INSERT INTO product_compatibility (product_a_id, product_b_id, security_level, safe_warning_s, safe_warning_a, safe_warning_f, safe_warning_e, description, is_compatible)
        VALUES ({id_a}, {id_b}, '{level}', '{s}', '{a}', '{f}', '{e}', '{method}', {str(compatible).lower()})
        ON CONFLICT (product_a_id, product_b_id) DO UPDATE SET
            security_level = EXCLUDED.security_level,
            safe_warning_s = EXCLUDED.safe_warning_s,
            safe_warning_a = EXCLUDED.safe_warning_a,
            safe_warning_f = EXCLUDED.safe_warning_f,
            safe_warning_e = EXCLUDED.safe_warning_e,
            description = EXCLUDED.description,
            is_compatible = EXCLUDED.is_compatible
        """

        ok, resp = execute_sql(sql)
        if ok:
            updated += 1
            print(f"   [OK] {slug_a} <-> {slug_b}")
        else:
            # Try reverse order
            sql2 = f"""
            INSERT INTO product_compatibility (product_a_id, product_b_id, security_level, safe_warning_s, safe_warning_a, safe_warning_f, safe_warning_e, description, is_compatible)
            VALUES ({id_b}, {id_a}, '{level}', '{s}', '{a}', '{f}', '{e}', '{method}', {str(compatible).lower()})
            ON CONFLICT (product_a_id, product_b_id) DO UPDATE SET
                security_level = EXCLUDED.security_level,
                safe_warning_s = EXCLUDED.safe_warning_s,
                safe_warning_a = EXCLUDED.safe_warning_a,
                safe_warning_f = EXCLUDED.safe_warning_f,
                safe_warning_e = EXCLUDED.safe_warning_e,
                description = EXCLUDED.description,
                is_compatible = EXCLUDED.is_compatible
            """
            ok2, _ = execute_sql(sql2)
            if ok2:
                updated += 1
                print(f"   [OK] {slug_a} <-> {slug_b} (reversed)")
            else:
                print(f"   [ERR] {slug_a} <-> {slug_b}: {resp[:100]}")

    print(f"\n[RESULT] Updated {updated}/{len(PRODUCT_ANALYSIS)} product pairs")

    if not_found:
        print(f"\n[WARN] Products not found: {set(not_found)}")

    print("\n" + "=" * 60)
    print("  EXPERT ANALYSIS COMPLETE!")
    print("=" * 60)


if __name__ == "__main__":
    main()
