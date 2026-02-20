#!/usr/bin/env python3
"""
SAFE Warnings - FOCUSED ON THE LINK/ACTION between products
Each warning describes vulnerabilities specific to the INTERACTION between the two types.
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

# FOCUSED WARNINGS: Specific to the LINK/ACTION between two types
# (level, S_security_flaw, A_adversity_risk, F_fidelity_issue, E_efficiency_problem)
SAFE_WARNINGS = {
    # ===== HARDWARE WALLET -> SOFTWARE WALLET (Connection/Signing) =====
    ('HW Cold', 'SW Browser'): (
        'HIGH',
        # S: What can go wrong in the connection/signing flow?
        'WHEN SIGNING VIA BROWSER: The browser displays transaction details that may differ from hardware screen. Malicious dApps can show fake amounts. ALWAYS verify on hardware device before confirming.',
        # A: What attack targets this specific link?
        'CLIPBOARD HIJACK DURING ADDRESS COPY: When copying addresses from browser to send via hardware, malware can replace the address. The hardware will sign the malicious address.',
        # F: What can break in this interaction?
        'USB/BRIDGE CONNECTION FAILURES: After browser wallet updates, hardware bridge extensions may stop working. Transactions fail mid-signing, requiring full restart.',
        # E: What makes this link slow/costly?
        'DOUBLE CONFIRMATION OVERHEAD: Every transaction requires browser approval + hardware confirmation. Batch operations impossible. Each action takes 30-60 seconds.'
    ),

    ('HW Cold', 'SW Mobile'): (
        'HIGH',
        'BLUETOOTH SIGNING VULNERABILITY: During Bluetooth pairing, an attacker within 10m can intercept connection attempts. Pair only in private, trusted locations.',
        'FAKE MOBILE APP ATTACK: When searching for hardware companion app, fake apps with similar names appear. Installing fake app exposes seed phrase recovery.',
        'BLUETOOTH DISCONNECTION MID-SIGN: iOS/Android Bluetooth updates frequently break hardware wallet connections. Transaction may fail after partial signing.',
        'PAIRING DELAY: Initial Bluetooth pairing takes 2-5 minutes. Every reconnection adds 30+ seconds. Not suitable for time-sensitive operations.'
    ),

    ('HW Cold', 'SW Desktop'): (
        'HIGH',
        'USB DRIVER EXPLOIT: When connecting hardware wallet via USB, malicious USB drivers can intercept communications. Use dedicated, clean computer for signing.',
        'CLIPBOARD REPLACEMENT ATTACK: When copying transaction data between desktop app and hardware, clipboard malware replaces destination addresses.',
        'DRIVER INCOMPATIBILITY: Desktop OS updates can break USB drivers. Hardware wallet becomes unrecognizable until driver is fixed.',
        'SYNC WAIT TIME: Desktop apps must sync blockchain before hardware signing works. Can take 10-60 minutes for first use.'
    ),

    # ===== HARDWARE WALLET -> DEFI (Signing Approvals/Transactions) =====
    ('HW Cold', 'DEX'): (
        'HIGH',
        'UNLIMITED APPROVAL TRAP: When hardware signs token approval for DEX, default is often UNLIMITED. If DEX contract is later exploited, ALL approved tokens can be drained.',
        'MEV ATTACK WINDOW: Hardware signing delay (15-30 seconds) gives MEV bots time to front-run your swap. Large trades will be sandwiched.',
        'CONTRACT UPGRADE RISK: After signing approval, DEX can upgrade contract. Your approval now applies to new, potentially malicious code.',
        'FAILED TRANSACTION COST: If gas estimate is wrong, hardware signs a transaction that fails on-chain. Gas is lost, must re-sign with correct parameters.'
    ),

    ('HW Cold', 'Lending'): (
        'HIGH',
        'SLOW COLLATERAL MANAGEMENT: When market crashes, you need to add collateral quickly. Hardware signing takes time. Position may be liquidated before you can save it.',
        'ORACLE MANIPULATION WINDOW: Flash loan attacks manipulate oracle for seconds. Your position is liquidated before hardware can sign rescue transaction.',
        'GOVERNANCE PARAMETER CHANGE: Protocol changes collateral ratio via governance. Your "safe" position becomes liquidatable. Hardware cannot react to parameter changes.',
        'MULTI-STEP DELAYS: Adding collateral requires: unlock hardware > connect > approve > confirm > wait. 5+ minute process during market crash.'
    ),

    ('HW Cold', 'Liq Staking'): (
        'HIGH',
        'SLASHING EVENT DURING STAKE: When you stake via hardware, validator slashing happens at protocol level. Hardware wallet provides zero protection against validator penalties.',
        'LST DEPEG DURING EXIT: When unstaking via hardware, LST may be trading below peg. Hardware signature commits you to unfavorable exchange rate.',
        'WITHDRAWAL QUEUE WAIT: After hardware signs unstake, you enter withdrawal queue. 1-14+ days wait. Hardware cannot speed up protocol mechanics.',
        'REBASING TOKEN CONFUSION: Some LST auto-rebase, changing wallet balance without transaction. Display may not match actual value during hardware signing.'
    ),

    ('HW Cold', 'Bridges'): (
        'MEDIUM',
        'HARDWARE SIGNS BUT BRIDGE CAN FAIL: Your hardware perfectly signs the bridge transaction, but bridge smart contract can be exploited. Hardware security irrelevant to bridge security.',
        'DESTINATION ADDRESS MANIPULATION: When entering destination chain address, attackers can replace it. Hardware signs valid transaction to wrong recipient.',
        'BRIDGE STUCK AFTER SIGNING: Hardware signs source chain transaction, but bridge relay fails. Funds stuck in bridge limbo for hours/days.',
        'MULTI-CHAIN GAS CONFUSION: Hardware shows source chain gas but destination may require additional fees. Transaction completes source-side but stalls on destination.'
    ),

    ('HW Cold', 'CEX'): (
        'MEDIUM',
        'DEPOSIT ADDRESS POISONING: When sending from hardware to CEX, attackers send dust from similar addresses. Accidentally selecting poisoned address = permanent loss.',
        'CUSTODY TRANSFER: Once hardware signs deposit to CEX, you lose control. CEX now holds your crypto. Hardware wallet becomes irrelevant.',
        'WRONG NETWORK DEPOSIT: Hardware signs transaction on wrong network (ERC20 vs BEP20). Funds sent to inaccessible address on CEX.',
        'WITHDRAWAL MINIMUM WAIT: Deposit from hardware must confirm before trading. Can take 10-60 minutes depending on network congestion.'
    ),

    # ===== SOFTWARE WALLET -> DEFI (Approvals/Interactions) =====
    ('SW Browser', 'DEX'): (
        'MEDIUM',
        'PHISHING APPROVAL: Fake DEX site looks identical to real one. One signature gives attacker unlimited access to your tokens. URL verification critical.',
        'EXTENSION HIJACK: Browser extension updates can be compromised. Malicious update replaces transaction data before you sign.',
        'FRONT-RUN EXPOSURE: Every swap broadcasts to mempool before confirmation. MEV bots see your trade and extract value via sandwich attack.',
        'SLIPPAGE vs FAILURE TRADEOFF: Low slippage = transactions fail. High slippage = bots extract more. No good setting for large trades.'
    ),

    ('SW Browser', 'Lending'): (
        'MEDIUM',
        'APPROVAL PHISHING VIA AIRDROP: Fake airdrop claims lead to approval phishing. Signing "claim" transaction actually approves all tokens to attacker.',
        'HEALTH FACTOR IGNORED: Browser wallet shows position but no active alerts. Users ignore liquidation warnings until too late.',
        'RATE SPIKE DURING BORROW: Interest rate can spike to 1000%+ APR during high utilization. Short-term borrow becomes extremely expensive.',
        'GAS WAR DURING CRASH: During market crash, gas prices spike to $500+. Cannot afford to save position, forced liquidation.'
    ),

    ('SW Browser', 'CEX'): (
        'MEDIUM',
        'CLIPBOARD HIJACK ON WITHDRAWAL: When copying exchange deposit address, clipboard malware replaces with attacker address. Funds permanently lost.',
        'PHISHING EMAIL CREDENTIAL THEFT: Fake exchange emails lead to credential theft. Browser wallet unaffected but CEX funds stolen.',
        'WRONG NETWORK SELECTION: Sending ERC20 USDT on BEP20 network (or vice versa) = permanent loss. CEX may not help recover.',
        'EXCHANGE WITHDRAWAL DELAY: During volatility, exchanges pause withdrawals. Funds stuck while market moves against you.'
    ),

    ('SW Mobile', 'DEX'): (
        'MEDIUM',
        'MALICIOUS WALLETCONNECT QR: Scanning QR code connects wallet to attacker dApp. Subsequent approval drains all tokens.',
        'MOBILE OVERLAY ATTACK: Banking trojans overlay fake transaction screens. You approve attacker transaction thinking it is legitimate.',
        'SESSION PERSISTENCE EXPLOIT: WalletConnect sessions stay active for days. Old sessions can be exploited long after original connection.',
        'MOBILE DATA COSTS: Failed transactions still consume mobile data. Complex DEX routes fail often, wasting data and gas.'
    ),

    ('SW Mobile', 'Card'): (
        'MEDIUM',
        'PHONE THEFT = DOUBLE LOSS: Stolen phone gives attacker access to both wallet and card app. SIM PIN and biometrics are bypassable.',
        'SIM SWAP TAKEOVER: Attacker takes over phone number via SIM swap. Resets both wallet and card account. Total loss.',
        'LINKED ACCOUNT SURVEILLANCE: Card purchases + wallet transactions create complete financial profile. No privacy possible.',
        'TOP-UP FAILURE: Card top-up can fail mid-transaction. Wallet shows sent, card shows not received. Manual resolution required.'
    ),

    # ===== CEX -> CEX (Inter-Exchange Transfers) =====
    ('CEX', 'CEX'): (
        'LOW',
        'DOUBLE CUSTODIAL EXPOSURE: Neither exchange gives you key control. Both can freeze, hack, or exit scam. You have zero protection.',
        'COORDINATED REGULATORY ACTION: Regulators can seize assets on multiple exchanges simultaneously. Geographic diversification is illusion.',
        'WITHDRAWAL BLACKLIST: Exchange A may block withdrawals to Exchange B if deemed "risky". Trapped funds with no recourse.',
        'TRANSFER DELAYS: Exchange withdrawals can take hours during high activity. Arbitrage opportunities disappear before transfer completes.'
    ),

    ('CEX', 'DEX'): (
        'MEDIUM',
        'KYC LINKAGE: Withdrawing from KYC CEX to DEX links your identity to on-chain activity. Blockchain analysis tracks all future DEX trades.',
        'WITHDRAWAL TO DEX BLOCKED: CEXs increasingly block withdrawals to "risky" DeFi contracts. Cannot access DEX directly.',
        'TAX REPORTING MISMATCH: CEX provides tax forms, DEX does not. Combining creates complex reporting with potential discrepancies.',
        'TIMING MISMATCH: CEX withdrawal takes 30+ minutes. DEX opportunity gone by the time funds arrive.'
    ),

    ('CEX', 'Card'): (
        'LOW',
        'SINGLE POINT OF FAILURE: Exchange-issued card depends on exchange. Exchange failure = card stops working immediately.',
        'SPENDING SURVEILLANCE: Exchange sees every purchase. Complete financial surveillance of your spending.',
        'ACCOUNT CLOSURE CASCADE: Exchange closes account = card deactivated. No warning, no appeal process.',
        'HIDDEN FEE STACKING: Spread + conversion fee + card fee + ATM fee. Total cost 5-10% per transaction.'
    ),

    ('CEX', 'Lending'): (
        'MEDIUM',
        'CEFI INSOLVENCY RISK: Moving from CEX to CeFi lending (Celsius, BlockFi) resulted in billions lost. "Insured" was marketing lie.',
        'REHYPOTHECATION CHAIN: Your crypto lent multiple times across CeFi platforms. If one fails, cascade affects all.',
        'LOCKED DURING CRASH: CeFi platforms lock withdrawals at first sign of trouble. Cannot exit when you need to.',
        'PROMOTIONAL RATE BAIT: High rates disappear after promotional period. Locked funds earn much less than advertised.'
    ),

    # ===== DEFI -> DEFI (Protocol Interactions) =====
    ('DEX', 'DEX'): (
        'MEDIUM',
        'CASCADING APPROVAL EXPLOIT: Approval on DEX A can be exploited if aggregator routes through compromised DEX B. One approval exposes all.',
        'MULTI-DEX ATTACK: Flash loan attacks exploit price differences across DEXs. Your trade caught in arbitrage extraction.',
        'ROUTING MANIPULATION: Aggregator can be bribed to route through less liquid pools, extracting value from your trade.',
        'COMPOUNDED GAS COSTS: Multi-hop routes through several DEXs multiply gas usage. $100+ fees for complex trades.'
    ),

    ('DEX', 'Lending'): (
        'MEDIUM',
        'ORACLE MANIPULATION ATTACK: Attacker manipulates DEX price, causing lending protocol oracle to trigger your liquidation.',
        'FLASH LOAN LIQUIDATION: Attackers use flash loans to crash price on DEX, liquidate your lending position, profit from the liquidation bonus.',
        'COMPOSABILITY BUG: Smart contract bug in DEX can affect connected lending protocol. One vulnerability cascades to both.',
        'MULTI-TRANSACTION FAILURE: Strategy requires DEX swap then lending deposit. If second transaction fails, exposed to unintended asset.'
    ),

    ('DEX', 'Yield'): (
        'MEDIUM',
        'IMPERMANENT LOSS EXCEEDS YIELD: LP position in volatile pair can lose 50%+ to IL. APY headline is meaningless if principal is destroyed.',
        'REWARD TOKEN WORTHLESS: Yield farming rewards paid in governance tokens. Token dumps 90%+, making actual APY negative.',
        'RUG PULL MECHANICS: Yield farm admin can drain all liquidity. Thousands of rugs, billions lost to "yield farming".',
        'HARVEST GAS > YIELD: For small positions, gas cost to harvest and compound exceeds the yield generated.'
    ),

    ('DEX', 'Bridges'): (
        'MEDIUM',
        'DOUBLE SMART CONTRACT EXPOSURE: Bridge bug + DEX bug = compounded risk. If either fails, your funds are lost.',
        'BRIDGED TOKEN LIQUIDITY CRISIS: Bridged tokens often have thin DEX liquidity. Large sells move price 10%+.',
        'BRIDGE HACK CONTAGION: If bridge is exploited, all bridged tokens on destination DEX become worthless instantly.',
        'MULTI-CHAIN GAS STACK: Source chain gas + bridge fee + destination chain gas. Simple swap costs $30-100.'
    ),

    ('Lending', 'Lending'): (
        'MEDIUM',
        'RECURSIVE LIQUIDATION CASCADE: Borrow from A, deposit to B, borrow from B, deposit to A. One liquidation triggers chain reaction, total loss.',
        'BAD DEBT CONTAGION: Insolvency in one protocol affects all connected protocols. Bad debt spreads through DeFi.',
        'RATE ARBITRAGE EVAPORATES: Interest rate difference between protocols closes faster than you can act. Profit becomes loss.',
        'GOVERNANCE DIVERGENCE: Protocol A changes parameters, Protocol B does not adjust. Your hedged position becomes one-sided risk.'
    ),

    ('Lending', 'Liq Staking'): (
        'MEDIUM',
        'LST DEPEG TRIGGERS LIQUIDATION: stETH traded 5% below ETH in 2022. Positions using stETH as collateral were liquidated despite "overcollateralization".',
        'SLASHING AMPLIFICATION: If validator slashes, your LST collateral loses value AND your position is liquidated. Double loss.',
        'UNSTAKING QUEUE TRAP: Cannot unstake LST fast enough to avoid liquidation. Protocol queue takes days, liquidation takes hours.',
        'ORACLE LAG ON DEPEG: Oracle may not immediately reflect LST depeg. Liquidation happens without warning.'
    ),

    ('Lending', 'Stablecoin'): (
        'MEDIUM',
        'STABLECOIN DEPEG LIQUIDATION: UST collapse liquidated billions in positions. "Stable" collateral went to zero overnight.',
        'REGULATORY FREEZE: USDC froze addresses after Tornado Cash sanctions. Your collateral can be frozen, position liquidated.',
        'BANK RUN DEATH SPIRAL: Mass redemptions trigger stablecoin depeg. Last to exit gets nothing.',
        'HIDDEN BACKING RISK: Stablecoin reserves may not be fully backed. Tether opacity = unknown risk in your collateral.'
    ),

    ('Liq Staking', 'DEX'): (
        'MEDIUM',
        'DEPEG PANIC SLIPPAGE: During market stress, LST liquidity on DEXs evaporates. $100k sell can move price 10%+.',
        'MEV TARGET: LST swaps are profitable for MEV bots. Guaranteed sandwich attack on large trades.',
        'FAKE LST TOKEN SWAP: Scam tokens with similar names to legitimate LSTs. Swap into fake token = total loss.',
        'REBASING DISPLAY BUG: Auto-rebasing LSTs confuse DEX interfaces. Displayed balance may not match actual holdings.'
    ),

    ('Liq Staking', 'Yield'): (
        'MEDIUM',
        'TRIPLE PROTOCOL STACK: Staking protocol + yield protocol + underlying chain. Three things can fail.',
        'UNSUSTAINABLE APY: "30% on staked ETH" = staking reward + unsustainable ponzinomics. Will collapse.',
        'EXIT RACE DYNAMICS: When yield drops, everyone exits simultaneously. Last to exit gets worst slippage.',
        'GOVERNANCE TOKEN COLLAPSE: Yield rewards paid in governance token that dumps 90%+. Actual yield negative.'
    ),

    ('Bridges', 'Bridges'): (
        'LOW',
        'MULTI-HOP EXPONENTIAL RISK: Two bridges = 2x probability of hack. $3B+ lost to bridge exploits. Each hop adds risk.',
        'LIQUIDITY FRAGMENTATION: Multi-hop routes have terrible liquidity at each step. Massive slippage compounds.',
        'SINGLE HOP FAILURE BLOCKS ALL: One bridge congested = entire route blocked. Funds stuck mid-journey.',
        'CUMULATIVE FEES: Bridge fee 1 + bridge fee 2 + gas chain 1 + gas chain 2 + gas chain 3. Total cost 5-10% of transfer.'
    ),

    ('Bridges', 'Lending'): (
        'MEDIUM',
        'BRIDGED COLLATERAL WORTHLESS: If bridge is hacked, your bridged collateral becomes worthless. Instant liquidation.',
        'CANONICAL vs WRAPPED CONFUSION: Protocol may require canonical token, you have bridged version. Cannot use as collateral.',
        'ORACLE MISMATCH: Oracle prices native token, you have bridged version trading at discount. Liquidation.',
        'EMERGENCY EXIT IMPOSSIBLE: Bridge congested during market crash. Cannot rescue position in time.'
    ),

    # ===== BACKUP COMBINATIONS =====
    ('Bkp Physical', 'HW Cold'): (
        'HIGH',
        'SINGLE LOCATION DISASTER: Same fire/flood destroys device AND backup. Geographic separation mandatory.',
        'INHERITANCE FAILURE: Family cannot access funds without seed phrase knowledge. Wealth lost at death.',
        'DEGRADATION OVER TIME: Metal plates corrode, paper degrades. Decade-old backup may be unreadable.',
        'SETUP ERROR PERMANENT: One wrong word in backup = unrecoverable funds. No second chance.'
    ),

    ('Bkp Physical', 'Bkp Physical'): (
        'HIGH',
        'GEOGRAPHIC REDUNDANCY REQUIRED: Two backups in same location = same disaster destroys both. Must be in different cities/countries.',
        'ACCESS SECURITY TRADEOFF: More locations = more potential theft points. Each location is attack vector.',
        'VERSION CONFLICT: Updating backup A but not B creates confusion about which is current.',
        'COST OF PROPER REDUNDANCY: Multiple secure locations (safe deposit boxes, fireproof safes) is expensive.'
    ),

    ('Bkp Digital', 'HW Cold'): (
        'MEDIUM',
        'CLOUD BACKUP BREACH: Digital backup in iCloud/Google Drive can be hacked. Cloud breach = seed phrase exposed.',
        'ENCRYPTION KEY FORGOTTEN: Encrypted backup useless if password is lost. Same problem in different form.',
        'METADATA EXPOSURE: Cloud provider sees backup file metadata. Potential target for sophisticated attacks.',
        'SOFTWARE DEPENDENCY: Encrypted backup requires compatible software to decrypt. May not work in 10 years.'
    ),

    # ===== STABLECOIN COMBINATIONS =====
    ('Stablecoin', 'Stablecoin'): (
        'MEDIUM',
        'CORRELATED FAILURE: All USD stablecoins depend on US banking system. SVB collapse affected USDC. No diversification if same underlying risk.',
        'REGULATORY ATTACK SURFACE: US government can freeze/ban stablecoins via executive action. All USD stablecoins affected.',
        'DEPEG CONTAGION: One stablecoin depeg triggers panic selling across all stablecoins. Correlation spikes during stress.',
        'SWAP SLIPPAGE DURING CRISIS: During depeg, stablecoin-to-stablecoin swaps have 5%+ slippage. "1:1" is fiction.'
    ),

    ('Stablecoin', 'DEX'): (
        'MEDIUM',
        'DEPEG ARBITRAGE TRAP: Buying "cheap" depegged stablecoin hoping for recovery. If peg never returns, total loss.',
        'LP IMPERMANENT LOSS: Stablecoin LP suffers when one token depegs. "Safe" stable LP is not safe.',
        'REGULATORY DEX BLOCK: DEXs may be forced to block stablecoin trading. Liquidity disappears overnight.',
        'MEV ON STABLE PAIRS: Even stablecoin swaps are MEV targets. Bots extract value from every trade.'
    ),

    ('Stablecoin', 'Yield'): (
        'MEDIUM',
        'YIELD SOURCE = RISK SOURCE: High stablecoin yield comes from lending to leveraged traders. Default = your loss.',
        'ANCHOR LESSON: UST 20% yield attracted billions before 100% loss. High stablecoin yield is red flag.',
        'LOCKED DURING BANK RUN: Locked stablecoin positions cannot exit during depeg. Watch value go to zero.',
        'INFLATION ADJUSTED NEGATIVE: After gas, fees, and 5% real inflation, "5% yield" may be negative real return.'
    ),

    # ===== CARD COMBINATIONS =====
    ('Card', 'SW Mobile'): (
        'MEDIUM',
        'PHONE = EVERYTHING: Stolen/hacked phone = wallet + card + 2FA. Single point of failure for all finances.',
        'SIM SWAP CASCADE: Attacker takes over phone number, resets wallet recovery AND card account. Total compromise.',
        'SPENDING PATTERN LINK: Card transactions + on-chain activity = complete deanonymization.',
        'DEAD PHONE CRISIS: Phone battery dies = no wallet, no card, no 2FA codes. Stranded without access.'
    ),

    # ===== CEFI COMBINATIONS =====
    ('Crypto Bank', 'CEX'): (
        'LOW',
        'DUAL COUNTERPARTY RISK: Both institutions can fail. Celsius, FTX, BlockFi all collapsed. Zero protection for either.',
        'REGULATORY LINKAGE: KYC data shared between institutions. Regulatory action affects both accounts.',
        'CREDIT CRUNCH CONTAGION: Crypto bank lending to CEX. CEX failure = crypto bank failure. Interconnected risk.',
        'ILLUSION OF DIVERSIFICATION: Different names, same underlying risk. Industry failure affects all.'
    ),

    ('Crypto Bank', 'Card'): (
        'LOW',
        'SINGLE ENTITY FAILURE: Same company for bank and card. Company fails = lose access to both simultaneously.',
        'COLLATERAL LINK: Crypto bank loan secured by crypto. Price crash = margin call + frozen card. Double impact.',
        'REGULATORY GRAY ZONE: Crypto banks operate without clear regulation. Closure can happen overnight.',
        'FEE EXTRACTION: Account fees + card fees + conversion fees + inactivity fees. Death by thousand cuts.'
    ),

    ('CeFi Lending', 'CEX'): (
        'LOW',
        'CEFI GRAVEYARD: Celsius, BlockFi, Voyager, Genesis, FTX - ALL FAILED. CeFi lending model proven to fail.',
        'COMMINGLED FUNDS: Your deposit mixed with platform trading. Cannot trace or recover in bankruptcy.',
        'MARKETING vs REALITY: "Insured" and "regulated" claims were false. Zero actual protection existed.',
        'WITHDRAWAL GATES: Platforms halt withdrawals at first sign of trouble. By the time you know, too late.'
    ),

    # ===== MULTISIG/MPC COMBINATIONS =====
    ('Custody', 'HW Cold'): (
        'HIGH',
        'TRUST MODEL CONFUSION: Custody = trust institution. HW = trust yourself. Mixing creates unclear responsibility for failures.',
        'KEY HANDOFF RISK: Transferring from custody to self-custody is high-risk. Mistakes during handoff are permanent.',
        'INCOMPATIBLE RECOVERY: Custody uses institutional HSMs, HW uses BIP39. Cannot directly migrate.',
        'COORDINATION BURDEN: Institutional custody requires approval workflows. Cannot move quickly when needed.'
    ),

    ('MultiSig', 'HW Cold'): (
        'HIGH',
        'QUORUM UNAVAILABILITY: 2-of-3 signers where one is traveling. Cannot sign time-sensitive transactions.',
        'CONFIGURATION COMPLEXITY: MultiSig setup is error-prone. Wrong configuration can permanently lock funds.',
        'KEY LOSS DISASTER: If 2-of-3 signers lose keys, funds are permanently inaccessible. No recovery.',
        'SLOW EMERGENCY RESPONSE: Assembling quorum during emergency takes hours/days. Attack may complete before response.'
    ),

    ('MultiSig', 'DEX'): (
        'HIGH',
        'QUORUM DELAY vs OPPORTUNITY: DeFi moves fast. By the time quorum approves, opportunity is gone or conditions changed.',
        'GAS ESTIMATION COMPLEXITY: MultiSig transactions have non-standard gas requirements. Estimation often fails.',
        'PARAMETER AGREEMENT: All signers must agree on exact transaction parameters. Any disagreement = no transaction.',
        'SAFE MODULE VULNERABILITIES: Delegated execution modules can be exploited. Adding convenience adds attack surface.'
    ),

    ('MPC Wallet', 'DEX'): (
        'HIGH',
        'MPC PROVIDER TRUST: Key shares held by provider. Provider compromise or coercion = total loss.',
        'COORDINATION DELAY: MPC signing requires multi-party computation. Adds 1-5 seconds per transaction.',
        'PROPRIETARY SYSTEM LOCK-IN: MPC schemes are proprietary. Cannot migrate to different solution without risk.',
        'SHARE LOSS = FUND LOSS: If key share backup fails, funds may be permanently inaccessible.'
    ),

    ('MPC Wallet', 'HW Cold'): (
        'HIGH',
        'SECURITY MODEL CONFLICT: MPC distributes trust, HW concentrates it. Using both adds complexity without clear benefit.',
        'MIGRATION EXPOSURE: Moving between MPC and HW requires seed exposure. High-risk moment for theft.',
        'OPERATIONAL DUPLICATION: Managing two different security paradigms doubles operational complexity and error potential.',
        'UNCLEAR FALLBACK: Which system is backup for which? Confusion leads to errors during recovery.'
    ),

    # ===== DEX AGGREGATOR COMBINATIONS =====
    ('DEX Agg', 'DEX'): (
        'MEDIUM',
        'AGGREGATOR CONTRACT RISK: Bug in aggregator smart contract affects all routed trades. Single point of failure.',
        'ROUTING BRIBERY: Aggregator can be bribed to route through malicious or less liquid pools.',
        'STALE QUOTE EXECUTION: Quote becomes stale before execution. Final price significantly worse than displayed.',
        'COMPLEX ROUTE GAS: Multi-hop routes through 3+ DEXs consume $50-100+ in gas fees.'
    ),

    ('DEX Agg', 'SW Browser'): (
        'MEDIUM',
        'FAKE AGGREGATOR PHISHING: Identical-looking fake aggregator sites. One approval signature drains wallet.',
        'UNLIMITED APPROVAL REQUEST: Aggregators often request max approval. Compromised aggregator = total token loss.',
        'API DEPENDENCY: Aggregator depends on external APIs for quotes. API failure = cannot trade.',
        'DISPLAYED vs EXECUTED RATE: What you see may not match what you get. Hidden fee extraction.'
    ),

    # ===== DERIVATIVES COMBINATIONS =====
    ('Perps', 'SW Browser'): (
        'MEDIUM',
        'LEVERAGE LIQUIDATION: 10x leverage means 10% adverse move = 100% loss. Most perp traders are liquidated eventually.',
        'FUNDING RATE BLEED: Holding perp position costs 0.01-0.1% every 8 hours. Position bleeds continuously.',
        'ORACLE SCAM WICK: Flash crash liquidates positions, then price recovers. Exchange profits from liquidation. No recourse.',
        'EXCHANGE SEES EVERYTHING: Exchange knows your position, liquidation price, stop loss. May trade against you.'
    ),

    ('Options', 'SW Browser'): (
        'MEDIUM',
        'TIME DECAY CERTAINTY: Options lose value every day. 90%+ expire worthless. Time is always against buyer.',
        'GREEK COMPLEXITY: Delta, gamma, theta, vega, rho - misunderstanding any leads to unexpected losses.',
        'ILLIQUID STRIKES: DeFi option liquidity is thin. Bid-ask spread can be 20%+. Guaranteed loss on entry.',
        'SMART CONTRACT EXERCISE BUG: Contract bug can prevent exercise. Option expires worthless even if in-the-money.'
    ),

    # ===== RWA COMBINATIONS =====
    ('RWA', 'Lending'): (
        'MEDIUM',
        'LEGAL vs SMART CONTRACT: Smart contracts cannot enforce real-world liens. Default recovery requires courts, not code.',
        'ORACLE FRAUD: RWA price oracles can be falsified. No on-chain verification of real asset value.',
        'BANKRUPTCY UNCERTAINTY: Tokenized RWAs may not be recognized in bankruptcy court. Your claim may be worthless.',
        'ILLIQUID COLLATERAL: Cannot sell RWA quickly. Liquidation may be impossible at any reasonable price.'
    ),

    ('RWA', 'DEX'): (
        'MEDIUM',
        'NEAR-ZERO LIQUIDITY: Most RWA tokens have minimal DEX liquidity. 1% of supply for sale moves price 50%+.',
        'TRANSFER RESTRICTIONS: RWA tokens may have compliance-based transfer restrictions. DEX trade blocked.',
        'CUSTODIAN DISCONNECT: RWA token on DEX but real asset with custodian. Custodian failure = worthless token.',
        'PRICE FICTION: DEX price may completely diverge from real asset value. Arbitrage impossible.'
    ),

    # ===== FIAT GATEWAY COMBINATIONS =====
    ('Fiat Gateway', 'SW Browser'): (
        'MEDIUM',
        'KYC DATA BREACH RISK: Fiat gateways collect extensive personal data. Breach exposes identity linked to crypto holdings.',
        'TRANSACTION SURVEILLANCE: Fiat gateways report to authorities. Every purchase tracked and potentially flagged.',
        'BANK ACCOUNT CLOSURE: Banks increasingly close accounts for crypto purchases. Sudden loss of on/off-ramp.',
        'HIGH ENTRY FEE: Fiat gateway fees 3-5%. Significant cost on every purchase.'
    ),

    ('Fiat Gateway', 'SW Mobile'): (
        'MEDIUM',
        'BIOMETRIC BYPASS: Face ID/Touch ID can be forced or bypassed. Attacker with your phone can make purchases.',
        'PUSH NOTIFICATION PHISHING: Fake gateway notifications lead to credential theft.',
        'APP STORE FAKE APPS: Fake gateway apps in app stores steal credentials and funds.',
        'LOCATION EXPOSURE: Mobile gateway apps may track and store location data. Privacy eliminated.'
    ),

    ('Fiat Gateway', 'CEX'): (
        'LOW',
        'DUAL KYC EXPOSURE: Gateway and exchange both have your full identity. Two databases to breach.',
        'REGULATORY DOUBLE REPORTING: Both entities report to regulators. Maximum financial surveillance.',
        'ACCOUNT CORRELATION: Authorities can link gateway and exchange accounts. Complete financial profile.',
        'FEE STACKING: Gateway fee + exchange deposit fee + trading spread. 5-10% round-trip cost.'
    ),

    # ===== L2 COMBINATIONS =====
    ('L2', 'DEX'): (
        'MEDIUM',
        'SEQUENCER CENTRALIZATION: L2 sequencer can censor your transaction. Single entity controls transaction ordering.',
        'ESCAPE HATCH DELAY: If L2 fails, forced withdrawal to L1 takes 7+ days. Funds trapped during crisis.',
        'L2-SPECIFIC EXPLOITS: DEX on L2 may have vulnerabilities not present on L1 version.',
        'BRIDGE DEPENDENCY: L2 DEX depends on bridge security. Bridge hack affects all L2 funds.'
    ),

    ('L2', 'Bridges'): (
        'MEDIUM',
        'BRIDGE AS BOTTLENECK: L2 usability depends on bridge. Bridge congestion = L2 inaccessible.',
        'THIRD-PARTY BRIDGE RISK: Non-canonical bridges are significantly riskier. Billions lost to bridge hacks.',
        'WITHDRAWAL DELAY TRAP: Canonical withdrawal takes 7 days. Cannot exit quickly during emergency.',
        'EXIT GAS SPIKE: L1 gas spike during L2 exit makes withdrawal prohibitively expensive. Trapped by economics.'
    ),

    ('L2', 'Lending'): (
        'MEDIUM',
        'ORACLE LAG: L2 oracle may lag L1 prices. Exploitable price discrepancy at your expense.',
        'FRAGMENTED LIQUIDITY: Same token on multiple L2s fragments liquidity. Thin markets = worse prices.',
        'SEQUENCER DOWN = HELPLESS: If sequencer is down, cannot manage position. May be liquidated while unable to act.',
        'LESS BATTLE-TESTED: L2 lending protocols have shorter track record. More likely to have bugs.'
    ),

    ('L2', 'SW Browser'): (
        'MEDIUM',
        'WRONG NETWORK MISTAKE: Selecting wrong network sends funds to inaccessible address. May be unrecoverable.',
        'RPC RELIABILITY: L2 RPC endpoints less reliable than L1. Frequent connection issues.',
        'CHAIN ID COLLISION: Some L2s have colliding chain IDs. Signature replay attacks possible.',
        'GAS TOKEN CONFUSION: Different L2s use different gas tokens. Insufficient native token = stuck transaction.'
    ),

    # ===== INSURANCE COMBINATIONS =====
    ('Insurance', 'Lending'): (
        'MEDIUM',
        'COVERAGE EXCLUSIONS: Policies have fine print. "Economic exploits" often not covered. Read before buying.',
        'CLAIM DENIAL: Governance can vote to deny claims. Nexus Mutual has denied payouts.',
        'UNDER-CAPITALIZED POOLS: Insurance pools much smaller than DeFi TVL. Major hack = insufficient funds to pay.',
        'PREMIUM EXCEEDS YIELD: Insurance premium on lending may exceed net yield. Paying for protection that costs more than earnings.'
    ),

    ('Insurance', 'DEX'): (
        'MEDIUM',
        'IL NOT COVERED: LP insurance does not cover impermanent loss. Primary LP risk is uninsurable.',
        'PROTOCOL-SPECIFIC LIMITS: Insurance covers specific protocols. Aggregator routing through uncovered DEX = no coverage.',
        'EXPLOIT CLASSIFICATION DISPUTES: Debate over "hack" vs "economic attack". Claims denied on technicality.',
        'SLOW CLAIM PROCESS: Insurance investigation takes weeks. Funds locked during process.'
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

    # Generate contextual default
    hw_types = ['HW Cold', 'HW Wallet', 'Bkp Physical', 'MultiSig', 'MPC Wallet']
    custodial = ['CEX', 'Crypto Bank', 'CeFi Lending', 'Custody', 'Card']
    defi = ['DEX', 'Lending', 'Yield', 'Liq Staking', 'Bridges', 'Perps', 'Options']

    if type_a in hw_types or type_b in hw_types:
        level = 'HIGH'
        s = f'HARDWARE SIGNING REQUIRED: When {type_a} interacts with {type_b}, verify all transaction details on hardware screen before confirming.'
        a = f'SUPPLY CHAIN ATTACK VECTOR: Compromised software between {type_a} and {type_b} can display false transaction data.'
        f = f'UPDATE INCOMPATIBILITY: {type_a} or {type_b} software updates may break the connection. Test after updates.'
        e = f'MANUAL CONFIRMATION DELAY: Every {type_a} to {type_b} action requires physical confirmation. Plan for delays.'
    elif type_a in custodial and type_b in custodial:
        level = 'LOW'
        s = f'ZERO KEY CONTROL: Neither {type_a} nor {type_b} gives you key custody. Total counterparty risk.'
        a = f'COORDINATED FAILURE: {type_a} and {type_b} can both fail simultaneously. No diversification benefit.'
        f = f'PLATFORM LOCK: Both {type_a} and {type_b} controlled by third parties. Account closure traps funds.'
        e = f'HIDDEN FEES: {type_a} to {type_b} transfer may have spreads, fees, delays not disclosed upfront.'
    elif type_a in defi or type_b in defi:
        level = 'MEDIUM'
        s = f'SMART CONTRACT EXPOSURE: {type_a} + {type_b} interaction involves smart contract risk. Code bugs can drain funds.'
        a = f'COMPOSABILITY ATTACK: Flash loans can exploit {type_a}/{type_b} interaction for value extraction.'
        f = f'PROTOCOL CHANGE: {type_a} or {type_b} can modify parameters via governance, changing risk profile.'
        e = f'GAS COSTS: {type_a} to {type_b} operations may require multiple transactions. Plan for $20-100+ in fees.'
    else:
        level = 'MEDIUM'
        s = f'INTERACTION RISKS: Review security implications of connecting {type_a} with {type_b} before proceeding.'
        a = f'ATTACK SURFACE: Combined {type_a}/{type_b} usage creates additional attack vectors. Research carefully.'
        f = f'COMPATIBILITY: {type_a} and {type_b} may have integration issues. Test with small amounts first.'
        e = f'FRICTION COSTS: {type_a} to {type_b} operations may have unexpected fees, delays, or limitations.'

    return (level, s, a, f, e)


def main():
    print("\n" + "=" * 60)
    print("  FOCUSED SAFE WARNINGS - LINK/ACTION SPECIFIC")
    print("=" * 60)

    # Get types
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code', headers=HEADERS)
    types = r.json() if r.status_code == 200 else []
    types_by_id = {t['id']: t['code'] for t in types}
    print(f"\n[OK] {len(types)} types loaded")

    # Update type_compatibility
    print("\n[1/2] Updating type_compatibility...")

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
    print("  FOCUSED SAFE WARNINGS COMPLETE!")
    print("=" * 60)


if __name__ == "__main__":
    main()
