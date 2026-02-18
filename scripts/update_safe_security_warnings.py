#!/usr/bin/env python3
"""
Update SAFE pillar warnings with security-focused, actionable advice.
Each warning tells the user exactly what to do to NOT lose money.

S = Security: What you MUST do to protect your funds
A = Adversity: What could go WRONG and how to prevent it
F = Fidelity: What to VERIFY before trusting this combo
E = Efficiency: ERGONOMICS - How many steps, complexity, ease of use
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

# Security-focused SAFE warnings: (level, S, A, F, E)
# Each warning is an ACTION the user must take to stay safe
SAFE_WARNINGS = {
    # ===== HARDWARE WALLET COMBINATIONS =====
    ('HW Cold', 'SW Browser'): (
        'HIGH',
        'NEVER sign a transaction without verifying EVERY detail on your hardware screen. Fake browser popups can show wrong addresses.',
        'If your browser extension is compromised, your hardware wallet is your LAST defense. Never rush signing.',
        'ALWAYS download extensions from official stores only. Verify the publisher matches the hardware manufacturer.',
        'SIMPLE: 3 steps - Install extension, connect device, approve on hardware. First-time setup takes 5-10 min, then instant.'
    ),
    ('HW Cold', 'SW Mobile'): (
        'HIGH',
        'DISABLE Bluetooth immediately after use. Keep your hardware wallet in airplane mode when not transacting.',
        'A compromised phone can show fake transaction details. ALWAYS confirm the exact amount and address on the hardware screen.',
        'Only use the OFFICIAL mobile app from the hardware wallet manufacturer. Third-party apps may steal your data.',
        'MODERATE: 4 steps - Install app, enable Bluetooth, pair device, approve. Pairing takes 2-3 min first time, then seamless.'
    ),
    ('HW Cold', 'SW Desktop'): (
        'HIGH',
        'NEVER enter your seed phrase into desktop software. Your hardware wallet should be the ONLY place your seed exists.',
        'Desktop malware can replace clipboard addresses. ALWAYS verify the destination address character by character on device.',
        'Download ONLY from the official website. Verify the download checksum if available.',
        'SIMPLE: 2 steps - Connect USB, open app. Most plug-and-play. Native desktop apps have the best UX for hardware wallets.'
    ),
    ('HW Cold', 'DEX'): (
        'HIGH',
        'NEVER approve unlimited token amounts. Set exact amounts needed. Revoke approvals after each session via revoke.cash.',
        'Malicious smart contracts can drain approved tokens. If you approved unlimited, your entire balance is at risk.',
        'VERIFY the DEX contract address on multiple sources (official docs, Etherscan, Discord) before first interaction.',
        'MODERATE: 4-5 steps per swap - Connect wallet, select tokens, approve (first time), confirm swap, sign on device. Gets faster with practice.'
    ),
    ('HW Cold', 'Lending'): (
        'HIGH',
        'Set health factor alerts at 1.5 minimum. Below 1.0 means INSTANT liquidation and loss of collateral.',
        'Flash crashes can liquidate you in seconds. NEVER borrow more than 50% of your collateral value.',
        'Only use audited lending protocols (Aave, Compound, Maker). Check audit reports are less than 1 year old.',
        'COMPLEX: 5-7 steps - Connect, approve token, deposit collateral, set parameters, borrow. Requires monitoring. Not for beginners.'
    ),
    ('HW Cold', 'Liq Staking'): (
        'HIGH',
        'NEVER stake more than you can afford to lock. Unstaking can take days to weeks depending on the protocol.',
        'LST tokens can depeg from ETH during market stress. If you borrowed against LST, depeg = liquidation.',
        'Verify the staking contract on the official protocol website. Fake staking sites steal deposits.',
        'SIMPLE: 3 steps - Connect, enter amount, confirm on device. One-click staking on most protocols. Unstaking takes longer (days).'
    ),
    ('HW Cold', 'Bridges'): (
        'MEDIUM',
        'NEVER bridge large amounts in one transaction. Split into smaller amounts to limit loss if bridge is exploited.',
        'Bridge hacks have lost billions. Your hardware wallet CANNOT protect you from smart contract vulnerabilities.',
        'Only use bridges with $100M+ TVL and clean security history. Check rekt.news for past exploits.',
        'MODERATE: 4-6 steps - Select chains, connect wallet, approve, initiate bridge, wait, claim on destination. Wait times vary (5min to 7 days).'
    ),
    ('HW Cold', 'CEX'): (
        'MEDIUM',
        'WHITELIST your CEX deposit address in advance. Triple-check the network (ERC20 vs BEP20 vs native) before sending.',
        'Once funds leave your hardware wallet to CEX, you lose self-custody. CEX can freeze, hack, or go bankrupt.',
        'Enable ALL security features on CEX: 2FA, withdrawal whitelist, anti-phishing code, email confirmations.',
        'SIMPLE: 3 steps - Copy CEX address, send from hardware wallet, wait for confirmations. Standard process, 10-60 min total.'
    ),
    ('HW Cold', 'Card'): (
        'MEDIUM',
        'ONLY transfer spending amounts to card. Never load more than you plan to spend in the next month.',
        'Card providers are custodial. If they freeze your account, those funds are locked. Keep savings on hardware wallet.',
        'Verify the card provider is licensed in your jurisdiction. Unlicensed providers can disappear with funds.',
        'SIMPLE: 2 steps - Send crypto to card address, wait for credit. Top-up takes 10-30 min. Card use is instant like any debit card.'
    ),
    ('HW Cold', 'Yield'): (
        'HIGH',
        'NEVER deposit into yield farms showing 1000%+ APY. These are almost always scams or unsustainable.',
        'Yield can come from token inflation (worthless) or real revenue. Ask: WHERE does the yield come from?',
        'Check if the yield protocol has been audited. Search "protocol name + hack" before depositing.',
        'COMPLEX: 5-8 steps - Connect, approve, deposit, stake LP, claim rewards, compound. Requires regular harvesting. Active management needed.'
    ),

    # ===== SOFTWARE WALLET COMBINATIONS =====
    ('SW Browser', 'SW Mobile'): (
        'MEDIUM',
        'NEVER share the same seed between hot wallets if one holds significant funds. Use separate seeds for different risk levels.',
        'If one device is compromised, all wallets with that seed are at risk. Limit exposure per seed.',
        'Verify both apps are official versions. Check app store reviews for reports of fake apps.',
        'SIMPLE: 1 step - Import seed phrase. Instant sync if same account. Both devices ready in under 5 minutes total.'
    ),
    ('SW Browser', 'DEX'): (
        'MEDIUM',
        'BOOKMARK official DEX URLs. NEVER click DEX links from emails, Discord, or Twitter - they are often phishing.',
        'Your browser extension holds your keys. If you install a malicious extension, all funds can be drained instantly.',
        'Check token contract addresses before swapping. Scam tokens copy real token names but have different contracts.',
        'SIMPLE: 2-3 steps - Connect wallet, select tokens, confirm. One-click experience after first connection. Fastest DeFi UX.'
    ),
    ('SW Browser', 'Lending'): (
        'MEDIUM',
        'Set a calendar reminder to check health factor DAILY when you have open borrows. Liquidation is permanent.',
        'Browser wallets are hot wallets. NEVER deposit your entire portfolio into lending from a browser wallet.',
        'Verify you are on the real protocol URL. lending-aave.com is NOT aave.com - check the exact domain.',
        'MODERATE: 4-5 steps - Connect, approve, supply, enable as collateral, borrow. Dashboard makes monitoring easy. Setup takes 10 min.'
    ),
    ('SW Browser', 'CEX'): (
        'MEDIUM',
        'ALWAYS generate a fresh deposit address and verify the network. Sending ERC20 to BEP20 address = lost funds.',
        'The browser is the weakest link. Clipboard hijacking can replace your address. Verify the first AND last 6 characters.',
        'Enable anti-phishing code on your CEX account. Every legitimate email should contain your code.',
        'SIMPLE: 2 steps - Copy address, send. Standard wallet transfer. Most intuitive crypto operation. 5-30 min depending on network.'
    ),
    ('SW Browser', 'Bridges'): (
        'MEDIUM',
        'VERIFY the destination chain is correct before bridging. Wrong chain = lost funds that are very hard to recover.',
        'Bridge contracts are honeypots for hackers. Never leave funds sitting in bridge contracts - complete the transfer.',
        'Use bridges recommended by the destination chain official docs. Random bridges may be scams.',
        'MODERATE: 4 steps - Select chains, approve, bridge, switch network. UX varies by bridge. Native bridges are simpler than third-party.'
    ),
    ('SW Mobile', 'DEX'): (
        'MEDIUM',
        'DISCONNECT WalletConnect sessions after EVERY use. Old sessions can be exploited if the dApp is compromised.',
        'Mobile malware can overlay fake screens. Always verify transaction details match what you intended.',
        'Only use official DEX mobile apps or WalletConnect. Third-party DEX apps may steal your keys.',
        'MODERATE: 3-4 steps - Scan QR, approve connection, confirm swap in app. WalletConnect adds a step but works well. Mobile UX improving.'
    ),
    ('SW Mobile', 'Card'): (
        'MEDIUM',
        'Set a DAILY spending limit on your crypto card. If your phone is stolen, the limit caps your loss.',
        'Card providers can freeze accounts without warning. Never use crypto card as your only payment method.',
        'Enable transaction notifications. Dispute unauthorized charges within 24 hours for best chance of recovery.',
        'VERY SIMPLE: 1-2 steps - Send to card address or use in-app top-up. Some cards have instant top-up. Use card like any debit card.'
    ),
    ('SW Mobile', 'CEX'): (
        'MEDIUM',
        'Enable biometric + PIN for exchange app. Phone theft should NOT mean exchange account compromise.',
        'QR code scanning can be spoofed. Verify the deposit address shows correctly AFTER scanning.',
        'Use official exchange apps only. Fake apps ranked high in app stores have stolen millions.',
        'SIMPLE: 2 steps - Scan QR from exchange app, confirm send. QR scanning eliminates copy-paste errors. Best mobile UX for CEX deposits.'
    ),

    # ===== CEX COMBINATIONS =====
    ('CEX', 'CEX'): (
        'LOW',
        'NEVER keep more than trading amounts on ANY exchange. Exchange hacks have lost billions in user funds.',
        'Both exchanges hold your keys. If either is hacked, freezes accounts, or goes bankrupt, your funds are at risk.',
        'Verify both exchanges are properly licensed. Unregulated exchanges have higher risk of exit scams.',
        'SIMPLE: 2 steps - Withdraw from A, deposit to B. Standard process everyone knows. Wait time depends on network (10 min to 1 hour).'
    ),
    ('CEX', 'DEX'): (
        'MEDIUM',
        'ALWAYS withdraw to your OWN wallet first, then connect to DEX. Never try to use CEX address with DEX directly.',
        'CEX withdrawal can be delayed or frozen. Plan ahead and withdraw before you urgently need to use DEX.',
        'Some CEX withdrawals go to different contract addresses than deposits. Verify each withdrawal individually.',
        'MODERATE: 4 steps - Withdraw to wallet, wait confirmations, connect to DEX, swap. Two-step process adds 15-60 min. Cannot skip wallet step.'
    ),
    ('CEX', 'Card'): (
        'LOW',
        'Card spending depletes exchange balance. Set up balance alerts to avoid overdraft or failed transactions.',
        'If the exchange suspends your account, your card stops working immediately. Have a backup payment method.',
        'Some exchange cards have poor customer support. Test with small amounts before relying on it.',
        'VERY SIMPLE: 0-1 steps - If same provider, instant. Card spends directly from exchange balance. Best UX for spending crypto.'
    ),
    ('CEX', 'Lending'): (
        'MEDIUM',
        'NEVER send borrowed funds directly back to CEX for trading. You must repay the loan, not trade with it.',
        'DeFi lending requires gas. If you withdraw from CEX without enough ETH for gas, you cannot deposit to lending.',
        'CEX lending (like Binance Earn) is custodial. DeFi lending you control but have smart contract risk.',
        'MODERATE: 5-6 steps - Withdraw, wait, connect to lending, approve, deposit, borrow. More steps than CEX earn but you keep control.'
    ),
    ('CEX', 'Bridges'): (
        'MEDIUM',
        'Withdraw to the CORRECT chain from CEX when possible. Bridging after withdrawal adds unnecessary risk and cost.',
        'Some CEX support direct multi-chain withdrawals. Check before bridging - you may not need a bridge at all.',
        'Bridge liquidity can be low. Large amounts may get stuck or have high slippage.',
        'UNNECESSARY COMPLEXITY: Check if CEX supports direct withdrawal to your target chain first. Avoid bridging if possible. Extra step adds risk.'
    ),

    # ===== DEFI COMBINATIONS =====
    ('DEX', 'DEX'): (
        'MEDIUM',
        'Check SLIPPAGE before large swaps. Low liquidity tokens can lose 10%+ to slippage on a single trade.',
        'MEV bots can sandwich your trade. Use private RPC or flashbots protect to avoid being front-run.',
        'DEX aggregators find best routes but add another smart contract risk layer. Weigh convenience vs security.',
        'SIMPLE: 2-3 steps via aggregator - Connect, swap, confirm. Aggregators handle routing automatically. Best UX for multi-DEX trades.'
    ),
    ('DEX', 'Lending'): (
        'MEDIUM',
        'Check token approval amounts before borrowing. Some lending protocols request unlimited approval by default.',
        'Borrowed funds have liquidation risk. NEVER use borrowed funds for additional leverage without understanding the risks.',
        'Some DEX tokens are not accepted as lending collateral. Verify before swapping specifically to use as collateral.',
        'MODERATE: 5-6 steps - Swap on DEX, approve token, deposit to lending, enable collateral, borrow. Plan the sequence before starting.'
    ),
    ('DEX', 'Yield'): (
        'MEDIUM',
        'NEVER ape into high APY farms without checking: TVL history, team background, audit status, and token unlock schedule.',
        'Impermanent loss can exceed yield rewards. Understand IL before providing liquidity to volatile pairs.',
        'New yield farms often have hidden mint functions. Check if team can mint unlimited tokens (rug pull risk).',
        'COMPLEX: 6-8 steps - Swap to pair tokens, add liquidity, approve LP, stake in farm, claim, compound. Requires ongoing management.'
    ),
    ('DEX', 'Bridges'): (
        'MEDIUM',
        'Verify the bridged token has liquidity on destination chain DEX. Bridging a token with no liquidity = stuck funds.',
        'Bridge exploits often target cross-chain DEX arbitrage. Do not chase small arb opportunities across bridges.',
        'Some bridged tokens have different contract addresses than native tokens. Verify before depositing.',
        'MODERATE: 4-5 steps - Bridge tokens, wait, switch network, swap on destination DEX. Cross-chain aggregators simplify this to 2 steps.'
    ),
    ('Lending', 'Lending'): (
        'MEDIUM',
        'NEVER use borrowed funds as collateral for another borrow (recursive leverage). Cascade liquidation will wipe you out.',
        'Health factors across protocols are independent. A drop in one can liquidate you even if the other is healthy.',
        'Different protocols have different liquidation penalties. Know the exact penalty before depositing.',
        'COMPLEX: Managing 2 protocols doubles complexity. Need 2 dashboards, 2 health factors to monitor. Only for advanced users.'
    ),
    ('Lending', 'Liq Staking'): (
        'MEDIUM',
        'LST as collateral has DOUBLE risk: lending liquidation + LST depeg. Set health factor at 2.0+, not 1.5.',
        'If LST depegs 10%, your effective collateral drops 10%. This can trigger liquidation even without ETH price drop.',
        'Not all lending protocols value LST at 1:1 with ETH. Check the collateral factor before depositing.',
        'MODERATE: 4 steps - Stake ETH for LST, approve, deposit to lending, borrow. Single flow once set up. LST staking itself is simple.'
    ),
    ('Lending', 'Yield'): (
        'MEDIUM',
        'Borrowed funds in yield farms have TRIPLE risk: lending liquidation + IL + farm rug. Size positions accordingly.',
        'Yield farm APY must exceed borrow APR by a significant margin to be profitable after all costs and risks.',
        'If yield farming token dumps, you still owe the borrowed amount. You can end up with debt and worthless tokens.',
        'COMPLEX: 7+ steps - Deposit collateral, borrow, swap, add LP, stake. Monitor 2 protocols constantly. Not recommended for beginners.'
    ),
    ('Lending', 'Stablecoin'): (
        'MEDIUM',
        'Stablecoins CAN depeg. If your collateral is a stablecoin that depegs, you can be liquidated even in a flat market.',
        'Algorithmic stablecoins (like UST was) have higher depeg risk than fiat-backed (USDC, USDT).',
        'Check if the lending protocol adjusts collateral factor during stablecoin stress events. Some do not.',
        'SIMPLE: 3-4 steps - Approve stablecoin, deposit, borrow. Stablecoins simplify the mental model. Less volatile = less monitoring needed.'
    ),

    # ===== LIQUID STAKING =====
    ('Liq Staking', 'Liq Staking'): (
        'MEDIUM',
        'Restaking compounds slashing risk. If base validator is slashed AND restaking protocol fails, you lose TWICE.',
        'Understand the withdrawal queue for each layer. Some restaking has weeks-long exit delays.',
        'Only restake with protocols that have clear insurance or slashing protection mechanisms.',
        'COMPLEX: 5-7 steps - Stake ETH, receive LST, approve LST, restake, approve again, wait. Multiple confirmations. Not beginner friendly.'
    ),
    ('Liq Staking', 'DEX'): (
        'MEDIUM',
        'Check LST liquidity depth before selling large amounts. Thin liquidity = high slippage = significant loss.',
        'During market stress, LST liquidity dries up. You may not be able to exit at fair value when you need to most.',
        'Use specialized LST pools (Curve, Balancer) for better rates than general-purpose DEXs.',
        'SIMPLE: 2 steps - Connect wallet, swap LST for ETH. Instant via Curve/Balancer. Faster than native unstaking (which takes days).'
    ),
    ('Liq Staking', 'Yield'): (
        'MEDIUM',
        'LST in yield farms has staking rewards + farm rewards but also validator risk + smart contract risk + IL.',
        'If validator gets slashed, LST value drops, and your yield farm position loses value too.',
        'Verify the yield farm accepts the specific LST you hold. Not all stETH is accepted everywhere.',
        'MODERATE: 4-5 steps - Stake for LST, approve, deposit to pool, stake LP. Initial setup takes 15-20 min, then passive.'
    ),

    # ===== BRIDGES =====
    ('Bridges', 'Bridges'): (
        'LOW',
        'NEVER chain multiple bridges for a single transfer. Each hop multiplies your risk of losing funds.',
        'Multi-hop bridging has caused millions in losses. If any bridge in the chain fails, your funds are stuck.',
        'Check if native bridges can reach your destination in one hop. Third-party bridges are last resort.',
        'COMPLEX: 6-10 steps per hop - Approve, bridge, wait, switch network, claim. Multi-hop doubles this. Very tedious. Avoid if possible.'
    ),
    ('Bridges', 'Lending'): (
        'MEDIUM',
        'Bridged tokens may have DIFFERENT risk profiles than native tokens. Verify collateral factor for bridged version.',
        'If the bridge is exploited, bridged tokens can become worthless. Your collateral evaporates, liquidation follows.',
        'Some lending protocols do not accept bridged tokens at all. Check before bridging specifically for lending.',
        'COMPLEX: 6-8 steps - Bridge, wait, switch network, approve on new chain, deposit to lending. Need gas on both chains. 20-40 min total.'
    ),

    # ===== BACKUPS =====
    ('Bkp Physical', 'HW Cold'): (
        'HIGH',
        'NEVER store seed backup in the same location as hardware wallet. Fire or theft loses both = total loss.',
        'Test your backup BEFORE you need it. Verify you can restore from the metal plate to a new device.',
        'Consider geographic distribution: one backup at home, one in a bank safe deposit box.',
        'SIMPLE: 1-time setup - Stamp/engrave seed on metal, store securely. One afternoon of work protects for life. No ongoing steps.'
    ),
    ('Bkp Physical', 'Bkp Physical'): (
        'HIGH',
        'Multiple backups in SAME location provides zero protection against local disaster. DISTRIBUTE geographically.',
        'Consider Shamir backup splitting: need 2-of-3 plates to recover. One stolen plate does not compromise funds.',
        'Label backups clearly so trusted family members can find them in emergency. But not so clearly thieves can.',
        'MODERATE: 2-3 steps per backup - Create, verify, distribute geographically. Initial setup takes hours. Annual verification recommended.'
    ),
    ('Bkp Digital', 'HW Cold'): (
        'MEDIUM',
        'NEVER store unencrypted seed phrase digitally. Use strong encryption with a memorable password.',
        'Cloud backups can be hacked. Store encrypted backup on OFFLINE USB drive, not Google Drive or iCloud.',
        'Digital backups should be secondary to physical backups. If encryption is broken, physical backup is safe.',
        'MODERATE: 3-4 steps - Encrypt seed with strong password, save to offline USB, store USB securely. Test restore once.'
    ),

    # ===== STABLECOINS =====
    ('Stablecoin', 'Stablecoin'): (
        'MEDIUM',
        'DIVERSIFY across stablecoin types: fiat-backed (USDC), crypto-collateralized (DAI), to spread depeg risk.',
        'Algorithmic stablecoins have FAILED repeatedly (UST, IRON). Avoid them for significant holdings.',
        'Check reserve audits monthly. If a stablecoin stops publishing audits, consider exiting.',
        'VERY SIMPLE: 2 steps - Connect wallet, swap. Near-zero slippage on Curve. Fastest swaps in all of DeFi.'
    ),
    ('Stablecoin', 'DEX'): (
        'MEDIUM',
        'Always check stablecoin contract address on DEX. Fake stablecoins with same name steal funds.',
        'If a stablecoin shows significantly off-peg on a DEX, do NOT buy the dip - investigate why first.',
        'Curve pools offer best stablecoin rates. General DEXs like Uniswap are usually worse for stable swaps.',
        'SIMPLE: 2 steps - Connect, swap. Curve is optimized for stables. One-click swaps. Best UX for stable pairs.'
    ),
    ('Stablecoin', 'Lending'): (
        'MEDIUM',
        'High stablecoin lending yields often signal high risk. If yield exceeds 10% on stables, investigate the source.',
        'Borrowing stablecoins puts you at mercy of stablecoin price. If stablecoin appreciates, you owe more.',
        'Only lend stablecoins to audited, established protocols. New protocols offering high stable yields are risky.',
        'SIMPLE: 3 steps - Approve, deposit, done. Stablecoin lending is most straightforward DeFi activity. Dashboard shows earnings.'
    ),
    ('Stablecoin', 'Yield'): (
        'MEDIUM',
        'Question any stablecoin yield above 10%. Where does it come from? Token inflation is not real yield.',
        'Stablecoin yield farms can still suffer IL if paired with volatile asset. Stable-stable pairs are safest.',
        'Check if yield is paid in the stablecoin or a farm token. Farm tokens often dump after distribution.',
        'MODERATE: 4-5 steps - Approve, deposit to pool, receive LP, stake LP, claim rewards. Initial setup then periodic harvesting.'
    ),

    # ===== CARDS =====
    ('Card', 'SW Mobile'): (
        'MEDIUM',
        'Set card spending limits LOWER than your mobile wallet balance. Phone theft should not empty your crypto.',
        'Freeze your card immediately if phone is lost. Most card apps allow remote freeze.',
        'Test card functionality with small purchase first. Declined transactions at checkout are embarrassing and problematic.',
        'SIMPLE: 2 steps - Send crypto to card address, wait for confirmation. Most apps have one-tap top-up. Card use like any debit card.'
    ),
    ('Card', 'CEX'): (
        'LOW',
        'Monitor exchange balance if card auto-debits. Overdrawing can trigger margin calls or failed transactions.',
        'Exchange account freeze = card freeze. If you violate exchange ToS, you lose card access too.',
        'Card chargebacks are difficult with crypto cards. Only use for transactions you are certain about.',
        'VERY SIMPLE: 0 steps if same provider - Card spends directly from CEX balance. No top-up needed. Instant spending.'
    ),

    # ===== CEFI / CRYPTO BANKS =====
    ('Crypto Bank', 'CEX'): (
        'LOW',
        'BOTH are custodial. Your funds can be frozen by either entity at any time. Minimize custodial exposure.',
        'Remember Celsius, BlockFi, Voyager? CeFi entities go bankrupt. Never keep more than you can afford to lose.',
        'Verify both institutions are properly licensed and insured. Check insurance covers your amount.',
        'SIMPLE: 2-3 steps - Initiate transfer, confirm via email/2FA, wait. Standard banking UX. Familiar to traditional finance users.'
    ),
    ('Crypto Bank', 'Card'): (
        'LOW',
        'Single entity controls your banking AND spending. If they freeze you, you have no crypto access.',
        'CeFi cards often have lower limits than traditional banks. Know your limits before relying on the card.',
        'Regulatory scrutiny on crypto banks is increasing. Account closures can happen with little warning.',
        'VERY SIMPLE: 1 step if integrated - Just use the card. Same UX as traditional banking. Most user-friendly crypto spending.'
    ),
    ('CeFi Lending', 'CEX'): (
        'LOW',
        'CeFi lending is NOT secured by collateral you control. If they go bankrupt, you are an unsecured creditor.',
        'Celsius, BlockFi, Voyager paid good yields. Users lost billions. High CeFi yield = high counterparty risk.',
        'Prefer DeFi lending where YOU hold collateral over CeFi where they hold your funds.',
        'SIMPLE: 2 steps - Transfer from CEX, enable earn. CeFi is one-click but you give up control. Easiest yield but highest risk.'
    ),

    # ===== CUSTODY / MULTISIG =====
    ('Custody', 'HW Cold'): (
        'HIGH',
        'Understand EXACTLY who holds keys. Custody means THEY hold keys. Your hardware wallet is separate.',
        'Custodians can freeze, delay, or refuse withdrawals. Test withdrawals with small amounts regularly.',
        'Institutional custody has insurance. Verify the insurance covers your deposit amount.',
        'SIMPLE for user: 2-3 steps - Request withdrawal, verify identity, wait. Custodian handles complexity. You just request.'
    ),
    ('MultiSig', 'HW Cold'): (
        'HIGH',
        'Each multisig signer should use their OWN hardware wallet with SEPARATE seed phrase. Shared seeds defeat the purpose.',
        'Test the signing flow with small amounts before securing large funds. Verify all signers can participate.',
        'Plan for signer unavailability. 2-of-3 is common: one signer can be unavailable and you can still transact.',
        'COMPLEX: 5-8 steps per transaction - Create tx, notify signers, each signs on HW, collect signatures, execute. Coordination overhead.'
    ),
    ('MultiSig', 'DEX'): (
        'HIGH',
        'Every signer must independently verify the DEX transaction. Do NOT trust "its the same as last time."',
        'Malicious signers can create transactions that look legitimate but send funds elsewhere. Review carefully.',
        'Safe transaction simulations show expected outcome. Use them before approving any multisig DEX interaction.',
        'COMPLEX: 6-10 steps - Propose tx in Safe, simulate, each signer reviews and signs, execute. Requires coordination. Not for quick trades.'
    ),

    # ===== MPC WALLET =====
    ('MPC Wallet', 'DEX'): (
        'HIGH',
        'MPC security depends on the provider. Research the MPC provider security model before trusting with funds.',
        'If MPC provider is compromised, your keys can be reconstructed. This is different from hardware wallet security.',
        'MPC looks like normal wallet but has different trust assumptions. Understand what you are trusting.',
        'SIMPLE: 2-3 steps - Connect, sign with biometrics/password. UX feels like hot wallet. Signing is instant, no hardware needed.'
    ),
    ('MPC Wallet', 'HW Cold'): (
        'HIGH',
        'MPC for convenience (daily spending), hardware for security (savings). Match wallet type to use case.',
        'Do not consolidate all funds in either. Distribute based on frequency of access needed.',
        'Both have different failure modes. MPC fails if provider fails. Hardware fails if seed is lost.',
        'MODERATE: Transfer between them requires 3-4 steps. MPC is fast to sign, HW needs physical device. Choose based on use case.'
    ),

    # ===== DEX AGGREGATOR =====
    ('DEX Agg', 'DEX'): (
        'MEDIUM',
        'Aggregator adds another smart contract in the chain. If aggregator is exploited, your funds route through compromised contract.',
        'Check aggregator recommended slippage. Setting too low causes failed transactions. Too high enables MEV extraction.',
        'Major aggregators (1inch, Paraswap, CowSwap) have track records. New aggregators may have bugs.',
        'SIMPLE: 2 steps - Connect, swap. Aggregators SIMPLIFY multi-DEX routing into one click. Better UX than using DEXs directly.'
    ),
    ('DEX Agg', 'SW Browser'): (
        'MEDIUM',
        'Verify you are on the official aggregator site. Fake aggregator sites are common phishing targets.',
        'Aggregator approval requests can be for the aggregator contract, not the underlying DEX. Review what you are approving.',
        'Bookmark official aggregator URLs. Never use links from search results or social media.',
        'VERY SIMPLE: 2 steps - Connect wallet, swap. Best DeFi UX available. One interface for all DEXs. Optimal for beginners.'
    ),

    # ===== PERPS / OPTIONS =====
    ('Perps', 'SW Browser'): (
        'MEDIUM',
        'NEVER trade perps with more than you can afford to lose completely. Liquidation = 100% loss of position.',
        'Funding rates can eat your position over time. A 0.1% funding every 8 hours is 10%+ per month.',
        'Set stop-losses BEFORE opening position, not after. The market will not wait for you to "figure it out."',
        'MODERATE: 4-5 steps - Deposit margin, select pair/leverage, set TP/SL, open position, monitor. Interface looks complex but flows logically.'
    ),
    ('Options', 'SW Browser'): (
        'MEDIUM',
        'Options can expire WORTHLESS. Only buy options with money you can afford to lose entirely.',
        'Understand time decay (theta). Holding options that are out-of-the-money bleeds value daily.',
        'Start with simple calls and puts. Do not sell options until you deeply understand the risk.',
        'COMPLEX: 5-7 steps - Deposit, select expiry, strike, type, size, confirm. Options UI requires understanding Greeks. Steep learning curve.'
    ),

    # ===== RWA =====
    ('RWA', 'Lending'): (
        'MEDIUM',
        'RWA tokens have real-world counterparty risk ON TOP of DeFi risk. The issuer can default.',
        'Verify the legal structure. Who holds the real asset? What happens if the issuer goes bankrupt?',
        'RWA liquidation may not be instant like crypto liquidation. Understand the process.',
        'MODERATE: 4-5 steps - Buy RWA token, approve, deposit as collateral, borrow. Standard lending flow once you have the RWA token.'
    ),
    ('RWA', 'DEX'): (
        'MEDIUM',
        'Check RWA token liquidity before buying. Many RWA tokens have minimal DEX liquidity.',
        'RWA tokens may have transfer restrictions. You might buy but not be able to sell.',
        'Verify RWA token contract through the official issuer. Fake RWA tokens exist.',
        'MODERATE: 3-4 steps - Find pool with RWA token, approve, swap. May require KYC with issuer first. Onboarding can be lengthy.'
    ),

    # ===== FIAT GATEWAY =====
    ('Fiat Gateway', 'SW Browser'): (
        'MEDIUM',
        'KYC information you provide can be leaked in data breaches. Only use established, reputable gateways.',
        'Gateway fees vary widely (1-10%). Compare multiple gateways before large purchases.',
        'Verify the crypto arrives at YOUR wallet, not a gateway custody. Some gateways are custodial.',
        'MODERATE: 3-5 steps - Connect wallet, enter amount, KYC (first time), pay, receive. First-time KYC takes 5-15 min. After that, 2 min.'
    ),
    ('Fiat Gateway', 'SW Mobile'): (
        'MEDIUM',
        'Mobile fiat gateways often have lower limits than desktop. Verify limits before counting on a purchase.',
        'Mobile device biometrics can be used for gateway authentication. Keep device secure.',
        'Some mobile gateways require identity photos. Ensure you have good lighting and a stable hand.',
        'MODERATE: 4-5 steps - Open app, enter amount, KYC/verify (first time), pay via Apple/Google Pay. Mobile KYC can be fiddly. Desktop easier.'
    ),
    ('Fiat Gateway', 'CEX'): (
        'LOW',
        'Fiat gateway + CEX means two custodial entities. Minimize time funds spend in either.',
        'Exchange built-in gateways are often cheaper than third-party. Compare fees.',
        'Gateway purchases on CEX may have holds before withdrawal. Check if there is a holding period.',
        'SIMPLE: 2-3 steps via CEX - Select buy, enter amount, pay. CEX built-in gateways have best UX. One-stop shop.'
    ),

    # ===== L2 =====
    ('L2', 'DEX'): (
        'MEDIUM',
        'L2s have different trust assumptions than L1. Understand if the L2 has training wheels (sequencer).',
        'If L2 sequencer goes down, you may not be able to transact. Have an exit plan for emergency.',
        'DEXs on L2 have different liquidity than L1. Large trades may have more slippage.',
        'SIMPLE: 2 steps - Connect (on L2 network), swap. Same UX as L1 but much cheaper. Great for beginners learning DeFi.'
    ),
    ('L2', 'Bridges'): (
        'MEDIUM',
        'ALWAYS prefer native/canonical L2 bridges over third-party bridges. Native bridges have L1 security.',
        'L2 withdrawal to L1 can take 7 days for optimistic rollups. Plan accordingly.',
        'Third-party bridges offer faster exits but with additional smart contract risk.',
        'VARIES: Native bridges are SIMPLE (3 steps) but slow (7 days). Third-party bridges are MODERATE (4-5 steps) but faster (10-30 min).'
    ),
    ('L2', 'Lending'): (
        'MEDIUM',
        'Lending on L2 has same liquidation risks as L1. Health factor monitoring is still essential.',
        'Oracle updates may be slower on L2. Flash crashes on L1 may take time to reflect on L2.',
        'Check if lending protocol on L2 is the same team as L1. Some are forks with different risk.',
        'SIMPLE: 3-4 steps - Same as L1 lending but cheaper gas. More forgiving for beginners to experiment. Rebalancing is affordable.'
    ),
    ('L2', 'SW Browser'): (
        'MEDIUM',
        'ADD L2 networks manually using official documentation. Fake network configurations can steal funds.',
        'Verify chain ID is correct. Wrong chain ID can cause transactions to fail or send to wrong network.',
        'Keep small ETH amounts on L2 for gas. You cannot transact if you have no L2 gas token.',
        'MODERATE: 3-4 steps first time - Add network to wallet, bridge funds, ready. After setup, same UX as L1. Network switching is easy.'
    ),

    # ===== INSURANCE =====
    ('Insurance', 'Lending'): (
        'MEDIUM',
        'READ the policy. Not all hacks are covered. Economic exploits and oracle manipulation often excluded.',
        'Insurance claims require proof and can be disputed. It is not automatic protection.',
        'Check if insurance pool has sufficient capacity to cover your position. Underfunded pools pay out less.',
        'MODERATE: 3-4 steps - Select protocol to cover, choose amount, pay premium, covered. Annual renewal. Claims process can be lengthy.'
    ),
    ('Insurance', 'DEX'): (
        'MEDIUM',
        'LP insurance typically does NOT cover impermanent loss. Only smart contract exploits may be covered.',
        'Coverage limits may be lower than your exposure. Verify coverage amount matches your position.',
        'New insurance protocols are themselves risky. Only use established insurance with claims history.',
        'MODERATE: 3-4 steps - Select coverage, pay premium, done. Set and forget until claim needed. Claims require submitting proof.'
    ),
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

    # Generate contextual default warnings
    hw_types = ['HW Cold', 'HW Wallet', 'Bkp Physical', 'MultiSig', 'MPC Wallet']
    custodial = ['CEX', 'Crypto Bank', 'CeFi Lending', 'Custody', 'Card']
    defi_types = ['DEX', 'Lending', 'Yield', 'Liq Staking', 'Bridges']

    if type_a in hw_types or type_b in hw_types:
        level = 'HIGH'
        s = f'ALWAYS verify transaction details on hardware device. Never blindly sign {type_b} transactions.'
        a = f'Hardware wallet protects your keys but cannot prevent you from approving malicious {type_b} transactions.'
        f = f'Verify {type_b} contract addresses through official sources before first interaction.'
        e = f'MODERATE: 3-4 steps - Connect device, review on screen, confirm on hardware. Each tx requires physical confirmation.'
    elif type_a in custodial and type_b in custodial:
        level = 'LOW'
        s = 'BOTH services hold your keys. Your funds can be frozen by either entity. Minimize custodial exposure.'
        a = 'Counterparty risk on both sides. If either fails, your funds may be lost or locked.'
        f = 'Verify both services are properly licensed and have track record.'
        e = 'SIMPLE: 2-3 steps - Initiate transfer, confirm via 2FA, wait. Standard custodial UX. Familiar banking experience.'
    elif type_a in defi_types or type_b in defi_types:
        level = 'MEDIUM'
        s = f'Review smart contract approvals carefully when connecting {type_a} with {type_b}.'
        a = f'Smart contract risk is present. Both {type_a} and {type_b} can have vulnerabilities.'
        f = 'Only use audited protocols. Check audit dates - old audits may not cover new code.'
        e = f'MODERATE: 4-5 steps - Connect wallet, approve (first time), interact, confirm. DeFi requires understanding each step.'
    else:
        level = 'MEDIUM'
        s = f'Verify addresses and amounts when transferring between {type_a} and {type_b}.'
        a = f'Understand the risks of both {type_a} and {type_b} before combining them.'
        f = f'Ensure {type_a} and {type_b} are compatible before initiating transfers.'
        e = 'VARIES: Complexity depends on combination. Check both products documentation for specific steps required.'

    return (level, s, a, f, e)

def main():
    print("\n" + "=" * 60)
    print("  UPDATING SAFE WARNINGS - SECURITY FOCUSED")
    print("=" * 60)

    # Get types
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code', headers=HEADERS)
    types = r.json() if r.status_code == 200 else []
    types_by_id = {t['id']: t['code'] for t in types}
    print(f"\n📦 {len(types)} types loaded")

    # Update type_compatibility
    print("\n🔒 Updating type_compatibility with security warnings...")

    r = requests.get(f'{SUPABASE_URL}/rest/v1/type_compatibility?select=id,type_a_id,type_b_id', headers=HEADERS)
    type_compats = r.json() if r.status_code == 200 else []

    batch = []
    for tc in type_compats:
        type_a = types_by_id.get(tc['type_a_id'], '')
        type_b = types_by_id.get(tc['type_b_id'], '')
        level, s, a, f, e = get_warning(type_a, type_b)
        batch.append(f"({tc['id']}, '{level}', '{escape_sql(s)}', '{escape_sql(a)}', '{escape_sql(f)}', '{escape_sql(e)}')")

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
    print("\n🔒 Updating product_compatibility with security warnings...")

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
    print("  ✅ SECURITY WARNINGS UPDATED")
    print("=" * 60)

if __name__ == "__main__":
    main()
