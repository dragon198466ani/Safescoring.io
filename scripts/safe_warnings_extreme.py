#!/usr/bin/env python3
"""
SAFE Pillar Warnings - EXTREME CASES & VULNERABILITIES
Each warning focuses on worst-case scenarios and real flaws.
S = Security flaws, A = Adversity attacks, F = Fidelity bugs, E = Efficiency costs
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

# EXTREME CASE WARNINGS: (level, S_flaw, A_attack, F_bug, E_cost)
# Focus on REAL vulnerabilities and worst-case scenarios
SAFE_WARNINGS = {
    # ============ HARDWARE WALLET COMBINATIONS ============
    ('HW Cold', 'SW Browser'): (
        'HIGH',
        # S: Security flaw
        'BLIND SIGNING RISK: If browser shows different data than hardware screen, ALWAYS trust hardware. Malicious dApps can display fake transaction details.',
        # A: Adversity attack
        'SUPPLY CHAIN ATTACK: Compromised browser extension can replace deposit addresses. Hardware wallet is useless if you sign transactions to attacker address.',
        # F: Fidelity bug
        'FIRMWARE INCOMPATIBILITY: After browser wallet update, hardware may fail to connect. Always test with small amounts after updates.',
        # E: Efficiency cost
        'CONNECTION FAILURES: USB/Bluetooth disconnects mid-transaction can corrupt signing process. May need to restart entire flow.'
    ),
    ('HW Cold', 'SW Mobile'): (
        'HIGH',
        'BLUETOOTH INTERCEPTION: Bluetooth can be sniffed within 10m range. Never pair hardware wallet in public spaces or near unknown devices.',
        'FAKE APP ATTACK: Cloned wallet apps on app stores can steal seeds. Only download from official manufacturer links, never search stores.',
        'PAIRING FAILURES: iOS/Android Bluetooth stack updates frequently break hardware wallet connections. Check compatibility before phone OS updates.',
        'BATTERY DRAIN: Bluetooth hardware wallets drain mobile battery fast. May die mid-transaction leaving funds in limbo.'
    ),
    ('HW Cold', 'SW Desktop'): (
        'HIGH',
        'CLIPBOARD HIJACKING: Desktop malware can replace copied addresses. Hardware screen verification is your ONLY protection.',
        'DRIVER EXPLOIT: USB drivers can be exploited by malware. Use dedicated computer for crypto or boot from clean USB OS.',
        'DEPENDENCY HELL: Desktop app updates can break hardware wallet integration. Keep old versions available for recovery.',
        'SLOW SYNC: Initial blockchain sync can take hours. Hardware wallet useless until desktop app fully synchronized.'
    ),
    ('HW Cold', 'DEX'): (
        'HIGH',
        'UNLIMITED APPROVAL TRAP: DEX may request unlimited token approval. ALWAYS set exact amount needed on hardware screen or risk total loss.',
        'MEV SANDWICH ATTACK: Your signed transaction can be front-run. Hardware signing delay gives attackers more time to position.',
        'CONTRACT UPGRADE RISK: DEX can upgrade contracts after you approve. Your approval may become exploitable post-upgrade.',
        'GAS ESTIMATION FAILURES: Hardware wallet may show outdated gas prices. Transaction can fail after signing, wasting gas.'
    ),
    ('HW Cold', 'Lending'): (
        'HIGH',
        'LIQUIDATION WHILE OFFLINE: If market crashes while hardware wallet unavailable, cannot add collateral. WILL be liquidated.',
        'ORACLE MANIPULATION: Flash loan attacks can manipulate oracle prices for seconds. Your position liquidated before you can react.',
        'GOVERNANCE ATTACK: Protocol parameters can change via governance. Your "safe" ratio may become liquidatable overnight.',
        'SLOW COLLATERAL MANAGEMENT: Adding collateral requires hardware. In fast crash, may not have time to save position.'
    ),
    ('HW Cold', 'Liq Staking'): (
        'HIGH',
        'SLASHING EXPOSURE: Validator slashing affects your stake. Hardware wallet cannot protect against protocol-level penalties.',
        'LST DEPEG ATTACK: Liquid staking token can trade below peg during market stress. Exit may cost 5-20% in slippage.',
        'WITHDRAWAL QUEUE: Unstaking may take days/weeks. Hardware wallet cannot speed up protocol withdrawal queue.',
        'REBASING CONFUSION: Some LSTs rebase, changing balance without transaction. May cause accounting/tax issues.'
    ),
    ('HW Cold', 'Bridges'): (
        'MEDIUM',
        'BRIDGE EXPLOIT: Hardware wallet CANNOT protect against bridge smart contract hacks. Ronin, Wormhole, Nomad lost $2B+ combined.',
        'CHAIN REORG ATTACK: Destination chain can reorg, reversing your bridged funds. Hardware signature is irrelevant to bridge security.',
        'WRAPPED TOKEN DEPEG: Bridged tokens are only IOUs. If bridge is hacked, your wrapped tokens become worthless instantly.',
        'BRIDGE CONGESTION: Popular bridges can take 24h+ during high traffic. Funds stuck with no way to cancel.'
    ),
    ('HW Cold', 'CEX'): (
        'MEDIUM',
        'DEPOSIT ADDRESS POISONING: Attackers send dust from similar addresses to pollute your history. Copy-paste wrong address = total loss.',
        'EXCHANGE INSOLVENCY: Once deposited, your crypto is UNSECURED DEBT. FTX customers lost billions. Hardware wallet useless after deposit.',
        'ACCOUNT FREEZE: Exchange can freeze your account anytime. No legal recourse in most jurisdictions. Funds trapped indefinitely.',
        'NETWORK FEES: Exchange may charge high withdrawal fees. Small deposits may not be economically withdrawable.'
    ),
    ('HW Cold', 'Card'): (
        'MEDIUM',
        'CARD PROVIDER BANKRUPTCY: Crypto card companies can fail (Wirecard). Your loaded balance is unsecured claim.',
        'SPENDING LIMITS: Card transactions reveal your identity and spending patterns. No privacy after conversion to fiat.',
        'CONVERSION RATE RIPOFF: Card providers often use unfavorable conversion rates. 3-5% hidden fees on every purchase.',
        'LOADING DELAYS: Crypto to card balance can take hours. Useless for time-sensitive purchases.'
    ),

    # ============ SOFTWARE WALLET COMBINATIONS ============
    ('SW Browser', 'SW Mobile'): (
        'MEDIUM',
        'SEED PHRASE EXPOSURE: Same seed on multiple devices multiplies attack surface. Compromise of ANY device = total loss.',
        'PHISHING MULTIPLIED: Attacker can phish you on any device. More devices = more attack vectors.',
        'SYNC CONFLICTS: Nonce conflicts between devices can cause stuck transactions or double-spends.',
        'BATTERY/CONNECTIVITY: Mobile wallet useless when phone dead. Browser useless without internet. No redundancy.'
    ),
    ('SW Browser', 'DEX'): (
        'MEDIUM',
        'APPROVAL PHISHING: Fake dApp sites look identical to real ones. One wrong signature = drained wallet.',
        'EXTENSION COMPROMISE: Browser extensions can be hijacked via updates. Millions lost to compromised extensions.',
        'FRONT-RUNNING BOT: Every pending transaction visible to MEV bots. Large swaps WILL be front-run.',
        'SLIPPAGE LOSSES: High slippage settings can cost 5-10% per trade. Low slippage = failed transactions.'
    ),
    ('SW Browser', 'Lending'): (
        'MEDIUM',
        'HEALTH FACTOR IGNORED: Browser wallet shows position but many users ignore liquidation warnings until too late.',
        'AIRDROP PHISHING: Fake lending protocol airdrops lead to approval phishing. Entire wallet drained.',
        'RATE MANIPULATION: Lending rates can spike during high utilization. Interest can compound to 1000%+ APR.',
        'GAS WARS: During market crash, gas spikes to $500+. Cannot afford to save position.'
    ),
    ('SW Browser', 'CEX'): (
        'MEDIUM',
        'WITHDRAWAL ADDRESS ATTACK: Malware can replace exchange withdrawal address in clipboard. Double-check every character.',
        'PHISHING EMAILS: Fake exchange emails lead to credential theft. 2FA bypass attacks increasingly sophisticated.',
        'NETWORK CONFUSION: Sending to wrong network (ERC20 vs BEP20) = permanent loss. Exchange may not help.',
        'WITHDRAWAL DELAYS: Exchanges delay withdrawals during volatility. Stuck on exchange during crash.'
    ),
    ('SW Mobile', 'DEX'): (
        'MEDIUM',
        'WALLETCONNECT HIJACK: Malicious QR codes can connect your wallet to attacker dApp. Verify URL before scanning.',
        'MOBILE MALWARE: Banking trojans can overlay fake transaction screens. You approve attacker transaction.',
        'SESSION PERSISTENCE: WalletConnect sessions stay active. Old sessions can be exploited days later.',
        'MOBILE DATA COSTS: DeFi transactions consume mobile data. Failed transactions still cost data and gas.'
    ),
    ('SW Mobile', 'Card'): (
        'MEDIUM',
        'PHONE THEFT: Stolen phone = access to both wallet AND card if same device. Double wipe needed.',
        'SIM SWAP ATTACK: Attacker takes over phone number, resets both wallet and card accounts.',
        'LOCATION TRACKING: Card + mobile combo creates complete location history. Privacy nightmare.',
        'APP CRASHES: Card app crash during top-up can result in stuck funds or failed loads.'
    ),

    # ============ CEX COMBINATIONS ============
    ('CEX', 'CEX'): (
        'LOW',
        'DOUBLE COUNTERPARTY RISK: Both exchanges can freeze, hack, or exit scam. Not your keys, not your crypto. ZERO protection.',
        'COORDINATED ATTACK: Hackers target multiple exchanges. Bitfinex, Binance, Coincheck all hacked. No diversification benefit.',
        'REGULATORY SEIZURE: Government can seize assets on ALL exchanges simultaneously. Happened in China, India.',
        'ARBITRAGE IMPOSSIBLE: Withdrawal delays make arbitrage between exchanges impractical. Prices can diverge significantly.'
    ),
    ('CEX', 'DEX'): (
        'MEDIUM',
        'KYC DEANONYMIZATION: CEX knows your identity. Blockchain analysis links CEX address to all future DEX activity.',
        'WITHDRAWAL BLACKLIST: CEX may block withdrawals to "risky" DEX contracts. Trapped on exchange.',
        'TAX COMPLEXITY: CEX provides 1099s, DEX does not. Combining creates complex tax reporting requirements.',
        'TIMING MISMATCH: CEX withdrawal takes 30min+. DEX opportunity gone. Arbitrage impossible.'
    ),
    ('CEX', 'Card'): (
        'LOW',
        'SINGLE PROVIDER FAILURE: If exchange fails (FTX), card also stops working immediately. No backup plan.',
        'SPENDING SURVEILLANCE: Exchange + card = complete financial surveillance. Every purchase tracked.',
        'ACCOUNT CLOSURE: Exchange can close account, disabling card. No warning, no appeal.',
        'HIDDEN FEES: Exchange cards have hidden fees: spread, conversion, ATM, inactivity. Total cost 5-10%.'
    ),
    ('CEX', 'Lending'): (
        'MEDIUM',
        'PROOF OF RESERVES FRAUD: CEX may claim 1:1 backing while secretly lending your funds. Cannot verify.',
        'REHYPOTHECATION RISK: Your deposited crypto may be lent out multiple times. Musical chairs of IOUs.',
        'CEFI FAILURES: Celsius, BlockFi, Voyager all collapsed. Customer funds gone. No FDIC insurance.',
        'RATE BAIT-AND-SWITCH: Promotional rates disappear. Actual rates much lower than advertised.'
    ),

    # ============ DEFI COMBINATIONS ============
    ('DEX', 'DEX'): (
        'MEDIUM',
        'CASCADING APPROVAL EXPLOITS: Approval on one DEX can be exploited if contract is compromised. One approval exposes all tokens.',
        'MULTI-PROTOCOL ATTACK: Flash loan attacks exploit multiple DEXs simultaneously. Your funds caught in crossfire.',
        'ROUTING MANIPULATION: Aggregator routing can be manipulated to extract value from your trade.',
        'COMPOUNDED GAS: Trading across multiple DEXs multiplies gas costs. Complex routes can cost $100+ in gas.'
    ),
    ('DEX', 'Lending'): (
        'MEDIUM',
        'ORACLE EXPLOIT: DEX price manipulation can trigger lending liquidations. Flash loan attacks target this.',
        'RECURSIVE LEVERAGE UNWIND: Looping leverage positions can cascade liquidations in volatile markets.',
        'SMART CONTRACT COMPOSABILITY: Bug in one protocol can drain funds from connected protocol.',
        'MULTI-TRANSACTION FAILURE: Complex DeFi strategies require multiple transactions. One failure breaks entire flow.'
    ),
    ('DEX', 'Yield'): (
        'MEDIUM',
        'IMPERMANENT LOSS REKT: LP positions can lose 50%+ to IL in volatile markets. "Yield" is illusion.',
        'REWARD TOKEN COLLAPSE: Farm rewards paid in worthless governance tokens. APY headline is marketing fiction.',
        'RUG PULL: Yield farm developer can drain all liquidity. Thousands of rugs, billions lost.',
        'HARVEST TIMING: Gas costs can exceed yield on small positions. Net negative returns.'
    ),
    ('DEX', 'Bridges'): (
        'MEDIUM',
        'DOUBLE SMART CONTRACT RISK: Bridge bug + DEX bug = compounded vulnerability. Attack surface multiplied.',
        'LIQUIDITY FRAGMENTATION: Bridged tokens often have thin liquidity on destination DEX. Massive slippage.',
        'BRIDGE EXPLOIT CONTAGION: Bridge hack makes all bridged tokens worthless on destination chain.',
        'MULTI-CHAIN GAS NIGHTMARE: Paying gas on multiple chains for single trade. Costs explode.'
    ),
    ('Lending', 'Lending'): (
        'MEDIUM',
        'RECURSIVE LIQUIDATION: Borrow from A, deposit to B, borrow from B, deposit to A. One liquidation triggers chain reaction.',
        'CASCADING BAD DEBT: Protocol insolvency spreads. One protocol bad debt affects all connected protocols.',
        'RATE ARBITRAGE VANISHES: Rate differentials close faster than you can act. Costs exceed profits.',
        'GOVERNANCE DIVERGENCE: Protocols change parameters independently. Your "safe" strategy becomes risky overnight.'
    ),
    ('Lending', 'Liq Staking'): (
        'MEDIUM',
        'LST DEPEG LIQUIDATION: stETH traded at 5% discount in 2022. Many positions liquidated despite being "overcollateralized".',
        'SLASHING AMPLIFIED: Validator slashing reduces collateral value, triggering liquidation. Double whammy.',
        'WITHDRAWAL QUEUE TRAP: Cannot exit LST position fast enough to avoid liquidation. Stuck and rekt.',
        'ORACLE LAG: Oracle may not reflect LST depeg immediately. Liquidation comes without warning.'
    ),
    ('Lending', 'Stablecoin'): (
        'MEDIUM',
        'DEPEG DISASTER: UST collapse triggered $40B+ losses. "Stable" coin can go to zero overnight.',
        'REGULATORY FREEZE: USDC froze addresses after Tornado Cash sanctions. Your collateral can be frozen.',
        'BANK RUN DYNAMICS: Stablecoin redemptions can trigger death spiral. Last out gets nothing.',
        'HIDDEN BACKING RISK: Tether backing opacity. $80B+ of uncertainty. Not truly stable.'
    ),
    ('Liq Staking', 'Liq Staking'): (
        'MEDIUM',
        'RESTAKING SLASHING MULTIPLIER: EigenLayer restaking compounds slashing risk. One bad validator slashes multiple times.',
        'OPERATOR CENTRALIZATION: Few operators control most restaking. Single operator failure affects millions.',
        'COMPLEXITY EXPLOSION: Restaking on restaking creates derivatives nobody understands. Tail risks unknown.',
        'YIELD EXTRACTION: Each restaking layer takes fees. Net yield after all cuts may be minimal.'
    ),
    ('Liq Staking', 'DEX'): (
        'MEDIUM',
        'DEPEG PANIC SELLING: During stress, LST liquidity evaporates. $100k sell can move price 10%+.',
        'SANDWICH ATTACK MAGNET: LST swaps are profitable targets for MEV bots. Guaranteed value extraction.',
        'FAKE LST TOKENS: Scam tokens with similar names. Swap into worthless token, lose everything.',
        'REBASING ACCOUNTING: Auto-rebasing LSTs confuse DEX interfaces. Wrong balance displayed.'
    ),
    ('Liq Staking', 'Yield'): (
        'MEDIUM',
        'TRIPLE PROTOCOL RISK: Staking + yield + underlying protocol. Three things can go wrong.',
        'YIELD STACKING ILLUSION: "30% APY on staked ETH" = Staking reward + ponzinomics. Unsustainable.',
        'EXIT RACE: When yield drops, everyone exits simultaneously. Last out gets worst price.',
        'GOVERNANCE TOKEN DUMP: Yield paid in worthless governance tokens. Selling creates death spiral.'
    ),
    ('Bridges', 'Bridges'): (
        'LOW',
        'MULTI-HOP CATASTROPHE: Each bridge is potential failure point. 2 bridges = 2x hack risk. $3B+ lost to bridge hacks.',
        'LIQUIDITY FRAGMENTATION: Multi-hop routes have terrible liquidity. Massive slippage on each hop.',
        'STUCK FUNDS: One bridge congested = entire route blocked. Funds trapped for days.',
        'GAS HELL: Paying gas on 3+ chains for one transfer. Can cost $50-200 for $1000 transfer.'
    ),
    ('Bridges', 'Lending'): (
        'MEDIUM',
        'BRIDGED COLLATERAL DEVALUE: If bridge is hacked, bridged collateral becomes worthless. Instant liquidation.',
        'ORACLE CONFUSION: Bridged vs native token prices may diverge. Oracle picks wrong price.',
        'CANONICAL VS WRAPPED: Protocol may not accept bridged version. Stuck with wrong token.',
        'EMERGENCY WITHDRAWAL IMPOSSIBLE: Bridge congested during crash. Cannot rescue position in time.'
    ),

    # ============ BACKUP COMBINATIONS ============
    ('Bkp Physical', 'HW Cold'): (
        'HIGH',
        'SINGLE BACKUP FAILURE: One fire, flood, or theft destroys both backup and possibility of recovery. Need geographic distribution.',
        'INHERITANCE PROBLEM: Family cannot access without seed phrase. Funds lost forever at death.',
        'DETERIORATION: Metal plates can corrode, paper degrades. Decade-old backup may be unreadable.',
        'SETUP OVERHEAD: Initial backup creation is one-time but critical. One wrong word = unrecoverable.'
    ),
    ('Bkp Physical', 'Bkp Physical'): (
        'HIGH',
        'GEOGRAPHIC REDUNDANCY: Same location = same disaster risk. Backups must be in different cities/countries.',
        'ACCESS COMPLEXITY: Multiple locations means multiple security concerns. Each location is attack vector.',
        'CONSISTENCY: Updating one backup but not others creates confusion. Which is current?',
        'COST OVERHEAD: Multiple secure storage locations is expensive. Safe deposit boxes, fireproof safes, etc.'
    ),
    ('Bkp Digital', 'HW Cold'): (
        'MEDIUM',
        'CLOUD BREACH: Digital backups in cloud can be hacked. iCloud, Google Drive breaches expose seed phrases.',
        'ENCRYPTION KEY FORGOTTEN: Encrypted backup useless if password forgotten. Same problem, different form.',
        'METADATA EXPOSURE: Cloud providers see backup file metadata. Target for targeted attacks.',
        'DEVICE DEPENDENCY: Encrypted backup requires compatible device/software to decrypt. May not work in 10 years.'
    ),

    # ============ STABLECOIN COMBINATIONS ============
    ('Stablecoin', 'Stablecoin'): (
        'MEDIUM',
        'CORRELATED FAILURE: All USD stablecoins depend on US banking system. SVB collapse affected USDC. Systematic risk.',
        'REGULATORY ATTACK: US government can freeze/ban ALL stablecoins simultaneously. Executive order risk.',
        'DEPEG CONTAGION: One stablecoin depeg creates panic selling of all stablecoins. Correlated failure.',
        'SWAP SLIPPAGE: During crisis, stablecoin swaps have 5%+ slippage. "1:1" is fiction in stress.'
    ),
    ('Stablecoin', 'DEX'): (
        'MEDIUM',
        'DEPEG ARBITRAGE TRAP: Buying "cheap" depegged stablecoin can result in total loss if peg never recovers.',
        'LP IMPERMANENT LOSS: Stablecoin LPs suffer when one token depegs. "Safe" LP is not safe.',
        'REGULATORY BLOCK: DEXs may be forced to block stablecoin trading. Liquidity evaporates instantly.',
        'MEV ON STABLE PAIRS: Even stablecoin swaps are MEV targets. Bots extract value from every trade.'
    ),
    ('Stablecoin', 'Yield'): (
        'MEDIUM',
        'YIELD = RISK: High stablecoin yields come from lending to degens. Counterparty can default.',
        'ANCHOR COLLAPSE: 20% UST yield attracted billions before 100% loss. "Safe" stablecoin yield is oxymoron.',
        'DURATION MISMATCH: Locked stablecoin yields trap funds. Cannot exit during bank run.',
        'REAL YIELD NEGATIVE: After fees, gas, and inflation, "5% yield" may be negative real return.'
    ),

    # ============ CARD COMBINATIONS ============
    ('Card', 'SW Mobile'): (
        'MEDIUM',
        'PHONE = EVERYTHING: Stolen phone = wallet + card + 2FA. Single point of failure for entire financial life.',
        'SIM SWAP DISASTER: Attacker takes over phone number. Resets wallet AND card. Total loss.',
        'SPENDING PATTERN LEAK: Card purchases + on-chain activity = complete financial profile. No privacy.',
        'DEAD BATTERY CRISIS: Phone dies = no card, no wallet, no 2FA. Stranded without access to funds.'
    ),

    # ============ CRYPTO BANK / CEFI COMBINATIONS ============
    ('Crypto Bank', 'CEX'): (
        'LOW',
        'DOUBLE INSOLVENCY RISK: Crypto banks and CEXs both fail. Celsius, Voyager, FTX, BlockFi - all gone. Zero protection.',
        'REHYPOTHECATION CHAIN: Your crypto lent out multiple times across entities. Musical chairs of IOUs.',
        'REGULATORY CRACKDOWN: Regulators can shut down both simultaneously. Operation Chokepoint 2.0.',
        'NO DEPOSIT INSURANCE: Despite "bank" name, no FDIC protection. Marketing lie.'
    ),
    ('Crypto Bank', 'Card'): (
        'LOW',
        'SINGLE ENTITY FAILURE: Same company for banking and card. Company fails = lose both. No backup.',
        'CREDIT RISK: Crypto banks give credit based on crypto collateral. Market crash = margin call + frozen card.',
        'REGULATORY LIMBO: Crypto banks operate in regulatory gray area. Can be shut down overnight.',
        'HIDDEN FEES EVERYWHERE: Account fees, card fees, conversion fees, inactivity fees. Death by 1000 cuts.'
    ),
    ('CeFi Lending', 'CEX'): (
        'LOW',
        'CEFI GRAVEYARD: Celsius, BlockFi, Voyager, Genesis, FTX - ALL DEAD. CeFi model is fundamentally broken.',
        'COMMINGLED FUNDS: Your funds mixed with platform operations. Cannot trace or recover.',
        'FALSE SECURITY: "Insured" and "regulated" marketing was lies. Zero real protection.',
        'WITHDRAWAL GATES: Platforms halt withdrawals at first sign of trouble. You are last to know.'
    ),

    # ============ MULTISIG / CUSTODY COMBINATIONS ============
    ('Custody', 'HW Cold'): (
        'HIGH',
        'DIFFERENT TRUST MODELS: Custody = trust third party. HW = trust yourself. Mixing creates confusion about who controls what.',
        'INSTITUTIONAL KEY MANAGEMENT: Custody uses HSMs, HW uses BIP39. Incompatible recovery procedures.',
        'HANDOFF RISK: Transferring from custody to self-custody is high-risk moment. Mistakes are permanent.',
        'COORDINATION OVERHEAD: Institutional custody requires documentation, approval. Not suitable for quick moves.'
    ),
    ('MultiSig', 'HW Cold'): (
        'HIGH',
        'KEY COORDINATION: All signers must be available. One signer on vacation = funds locked.',
        'COMPLEXITY = ERRORS: MultiSig setup is complex. Configuration errors can lock funds permanently.',
        'QUORUM LOSS: If 2-of-3 signers die/lose keys, funds are GONE. No recovery.',
        'SLOW EMERGENCY RESPONSE: Cannot move funds quickly in emergency. Attack may complete before quorum assembles.'
    ),
    ('MultiSig', 'DEX'): (
        'HIGH',
        'QUORUM DELAY: DeFi opportunities require speed. MultiSig approval takes hours/days. Opportunity gone.',
        'GAS ESTIMATION: MultiSig transactions have different gas requirements. Frequent estimation failures.',
        'SIGNATURE COORDINATION: All signers must agree on exact transaction parameters. Any mismatch = failure.',
        'SAFE MODULE RISKS: Safe modules can be exploited. Delegated execution introduces new attack vectors.'
    ),
    ('MPC Wallet', 'DEX'): (
        'HIGH',
        'MPC PROVIDER TRUST: You trust MPC provider with key shares. Provider compromise = total loss.',
        'COORDINATION LATENCY: MPC signing requires coordination between parties. Adds 1-5 seconds per transaction.',
        'PROPRIETARY LOCK-IN: MPC schemes are proprietary. Cannot easily migrate to different solution.',
        'RECOVERY COMPLEXITY: MPC recovery is complex. Key share loss may mean permanent fund loss.'
    ),
    ('MPC Wallet', 'HW Cold'): (
        'HIGH',
        'INCOMPATIBLE MODELS: MPC distributes trust, HW concentrates it. Using both adds complexity without clear benefit.',
        'MIGRATION RISK: Moving from MPC to HW or vice versa requires exposing seed. High-risk moment.',
        'OPERATIONAL OVERHEAD: Managing two different security systems doubles operational burden.',
        'UNCLEAR RESPONSIBILITY: Who is responsible for what? Confusion leads to mistakes.'
    ),

    # ============ DEX AGGREGATOR COMBINATIONS ============
    ('DEX Agg', 'DEX'): (
        'MEDIUM',
        'AGGREGATOR SMART CONTRACT RISK: Bug in aggregator affects ALL routed trades. Single point of failure for routing.',
        'ROUTING MANIPULATION: Aggregator can be bribed to route through malicious contracts. MEV extraction.',
        'STALE QUOTES: Aggregator quote becomes stale before execution. Final price worse than displayed.',
        'MULTI-HOP GAS: Complex routes through multiple DEXs consume excessive gas. $50+ fees common.'
    ),
    ('DEX Agg', 'SW Browser'): (
        'MEDIUM',
        'PHISHING AGGREGATOR: Fake aggregator sites look identical. One signature drains wallet via approval.',
        'APPROVAL OVERREACH: Aggregators request unlimited approvals. Compromised aggregator = total loss.',
        'API DEPENDENCY: Aggregators depend on external APIs. API down = cannot trade.',
        'RATE DISPLAY MANIPULATION: Displayed rate may not match execution. Hidden fee extraction.'
    ),

    # ============ DERIVATIVES COMBINATIONS ============
    ('Perps', 'SW Browser'): (
        'MEDIUM',
        'LEVERAGE LIQUIDATION: 10x leverage = 10% move against you = 100% LOSS. Most traders lose everything.',
        'FUNDING RATE BLEED: Holding perps costs 0.01-0.1% every 8 hours. Position bleeds value continuously.',
        'ORACLE MANIPULATION: Flash crashes liquidate positions. "Scam wicks" are common. No recourse.',
        'EXCHANGE ADVANTAGE: Exchange sees your position, liquidation price, stop loss. They trade against you.'
    ),
    ('Options', 'SW Browser'): (
        'MEDIUM',
        'TIME DECAY DEATH: Options lose value every day. 90%+ of options expire worthless. Seller always wins long-term.',
        'GREEKS COMPLEXITY: Delta, gamma, theta, vega, rho - misunderstanding any = unexpected losses.',
        'ILLIQUID STRIKES: DeFi option liquidity is thin. Bid-ask spreads can be 20%+. Guaranteed loss on entry.',
        'EXERCISE FAILURE: Smart contract bugs can prevent exercise. Option expires worthless despite being in-the-money.'
    ),

    # ============ RWA COMBINATIONS ============
    ('RWA', 'Lending'): (
        'MEDIUM',
        'REAL WORLD = REAL PROBLEMS: RWA tokens depend on legal system enforcement. Smart contracts cannot foreclose houses.',
        'ORACLE FRAUD: RWA price oracles can be manipulated or falsified. No on-chain verification of real assets.',
        'LEGAL LIMBO: Tokenized RWAs may not be legally recognized. Bankruptcy court may not honor your claim.',
        'ILLIQUIDITY TRAP: RWAs are illiquid. Cannot sell quickly. Liquidation may be impossible at fair price.'
    ),
    ('RWA', 'DEX'): (
        'MEDIUM',
        'ZERO LIQUIDITY: Most RWA tokens have near-zero DEX liquidity. 1% of supply for sale moves price 50%.',
        'COMPLIANCE BLOCK: RWA tokens may have transfer restrictions. DEX trade may be blocked.',
        'CUSTODY MISMATCH: RWA token on DEX but real asset held by custodian. Custodian failure = worthless token.',
        'PRICING FICTION: DEX price may diverge massively from real asset value. Arbitrage impossible.'
    ),

    # ============ FIAT GATEWAY COMBINATIONS ============
    ('Fiat Gateway', 'SW Browser'): (
        'MEDIUM',
        'KYC DATA BREACH: Fiat gateways collect extensive personal data. Data breaches expose identity + crypto holdings.',
        'TRANSACTION MONITORING: Fiat gateways report "suspicious" activity. Your crypto activity is surveilled.',
        'BANK ACCOUNT CLOSURE: Banks close accounts for crypto activity. Sudden loss of fiat off-ramp.',
        'HIGH FEES: Fiat on-ramp fees 3-5%. Every entry costs significant percentage.'
    ),
    ('Fiat Gateway', 'SW Mobile'): (
        'MEDIUM',
        'BIOMETRIC BYPASS: Face ID/Touch ID can be bypassed. Attacker with your phone can buy crypto.',
        'PUSH NOTIFICATION PHISHING: Fake gateway notifications lead to credential theft.',
        'APP STORE RISKS: Fake gateway apps in app stores. Downloads result in credential theft.',
        'LOCATION TRACKING: Mobile gateway apps track location. Privacy completely compromised.'
    ),
    ('Fiat Gateway', 'CEX'): (
        'LOW',
        'DOUBLE KYC: Gateway and exchange both have your identity. Two databases to breach.',
        'REGULATORY DOUBLE JEOPARDY: Both entities report to regulators. Maximum surveillance.',
        'ACCOUNT LINKING: Authorities can link gateway and exchange accounts. Complete financial profile.',
        'FEE STACKING: Gateway fee + exchange fee + spread. 5-10% total cost to buy and sell.'
    ),

    # ============ L2 COMBINATIONS ============
    ('L2', 'DEX'): (
        'MEDIUM',
        'L2 SEQUENCER CENTRALIZATION: Most L2 sequencers are centralized. Single entity can censor your transactions.',
        'ESCAPE HATCH DELAY: If L2 fails, withdrawal to L1 takes 7+ days. Funds trapped during crisis.',
        'L2-SPECIFIC EXPLOITS: L2 DEXs may have unique vulnerabilities not present on L1.',
        'BRIDGE DEPENDENCY: L2 depends on bridge security. Bridge hack = L2 funds at risk.'
    ),
    ('L2', 'Bridges'): (
        'MEDIUM',
        'BRIDGE BOTTLENECK: L2 depends on bridge. Bridge congestion = L2 unusable.',
        'CANONICAL VS THIRD-PARTY: Third-party bridges are riskier. $2B+ lost to bridge hacks.',
        'WITHDRAWAL DELAY TRAP: L2 canonical withdrawal takes 7 days. Cannot exit quickly in emergency.',
        'GAS SPIKE ON EXIT: L1 gas spike during L2 exit makes withdrawal prohibitively expensive.'
    ),
    ('L2', 'Lending'): (
        'MEDIUM',
        'ORACLE DELAY: L2 oracles may lag L1 prices. Arbitrage opportunities at your expense.',
        'LIQUIDITY FRAGMENTATION: Same token on multiple L2s fragments liquidity. Thin markets = bad prices.',
        'SEQUENCER DOWNTIME: If sequencer is down, cannot manage position. May be liquidated while helpless.',
        'L2-SPECIFIC PROTOCOL RISK: L2 lending protocols less battle-tested than L1 equivalents.'
    ),
    ('L2', 'SW Browser'): (
        'MEDIUM',
        'NETWORK CONFUSION: Wrong network selected = funds sent to wrong chain. May be unrecoverable.',
        'RPC FAILURES: L2 RPC endpoints less reliable than L1. Connection issues common.',
        'CHAIN ID COLLISION: Some L2s have colliding chain IDs. Signature replay attacks possible.',
        'GAS TOKEN MISMATCH: Some L2s use ETH, others use native tokens. Gas estimation confusion.'
    ),

    # ============ INSURANCE COMBINATIONS ============
    ('Insurance', 'Lending'): (
        'MEDIUM',
        'COVERAGE GAPS: Insurance policies have exclusions. "Economic exploit" may not be covered. Fine print matters.',
        'CLAIMS DENIED: Nexus Mutual has denied claims. Governance votes against payouts. No guarantee.',
        'UNDERCAPITALIZED: Insurance pools much smaller than total DeFi TVL. Major hack = insufficient coverage.',
        'PREMIUM = YIELD DESTRUCTION: Insurance premium can exceed lending yield. Net negative return.'
    ),
    ('Insurance', 'DEX'): (
        'MEDIUM',
        'IMPERMANENT LOSS NOT COVERED: LP insurance does not cover IL. Main LP risk uninsurable.',
        'PROTOCOL-SPECIFIC ONLY: Insurance covers specific protocols. DEX aggregator routes through uncovered DEX = no coverage.',
        'HACK ATTRIBUTION: Dispute over whether exploit was "hack" or "economic attack". Claims denied.',
        'PAYOUT DELAY: Insurance claim process takes weeks. Funds locked during investigation.'
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

    # Generate extreme default warnings
    hw_types = ['HW Cold', 'HW Wallet', 'Bkp Physical', 'MultiSig', 'MPC Wallet']
    custodial = ['CEX', 'Crypto Bank', 'CeFi Lending', 'Custody', 'Card']
    defi = ['DEX', 'Lending', 'Yield', 'Liq Staking', 'Bridges', 'Perps', 'Options']

    if type_a in hw_types or type_b in hw_types:
        level = 'HIGH'
        s = f'HARDWARE INVOLVED: Verify all details on device screen. Never trust software display alone.'
        a = f'SUPPLY CHAIN RISK: Compromised hardware or software in {type_a}/{type_b} flow can steal funds.'
        f = f'INTEGRATION RISK: {type_a} and {type_b} may have compatibility issues after updates.'
        e = f'MANUAL CONFIRMATION: Hardware signing adds time to every operation. Plan for delays.'
    elif type_a in custodial and type_b in custodial:
        level = 'LOW'
        s = f'DOUBLE CUSTODIAL: Neither {type_a} nor {type_b} gives you key control. Total counterparty risk.'
        a = f'COORDINATED FAILURE: Both {type_a} and {type_b} can fail simultaneously. No protection.'
        f = f'PLATFORM DEPENDENCY: Both {type_a} and {type_b} controlled by third parties. No sovereignty.'
        e = f'HIDDEN COSTS: Both {type_a} and {type_b} extract fees. Total cost higher than visible.'
    elif type_a in defi or type_b in defi:
        level = 'MEDIUM'
        s = f'SMART CONTRACT RISK: {type_a} and {type_b} involve smart contracts. Bugs can drain funds.'
        a = f'COMPOSABILITY ATTACK: {type_a} + {type_b} creates complex attack surface. Flash loan risk.'
        f = f'PROTOCOL CHANGES: {type_a} or {type_b} can change parameters via governance. Risk changes over time.'
        e = f'GAS COSTS: Complex {type_a}/{type_b} interactions consume significant gas. Plan for $20-100+ fees.'
    else:
        level = 'MEDIUM'
        s = f'SECURITY UNKNOWN: {type_a} + {type_b} combination has uncharted risks. Proceed with caution.'
        a = f'ATTACK VECTORS: Combined {type_a}/{type_b} creates new attack surfaces. Research before using.'
        f = f'COMPATIBILITY UNCERTAIN: {type_a} and {type_b} may not work well together. Test with small amounts.'
        e = f'FRICTION EXPECTED: {type_a} to {type_b} flow may have unexpected costs or delays.'

    return (level, s, a, f, e)


def main():
    print("\n" + "=" * 60)
    print("  EXTREME CASE SAFE WARNINGS UPDATE")
    print("=" * 60)

    # Get types
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code', headers=HEADERS)
    types = r.json() if r.status_code == 200 else []
    types_by_id = {t['id']: t['code'] for t in types}
    print(f"\n[OK] {len(types)} types loaded")

    # Update type_compatibility
    print("\n[1/2] Updating type_compatibility with EXTREME warnings...")

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

    print(f"   [OK] {updated}/{len(type_compats)} type compatibilities updated")

    # Update product_compatibility
    print("\n[2/2] Updating product_compatibility...")

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

    print(f"   [OK] {total} product compatibilities updated")

    print("\n" + "=" * 60)
    print("  EXTREME SAFE WARNINGS COMPLETE!")
    print("=" * 60)


if __name__ == "__main__":
    main()
