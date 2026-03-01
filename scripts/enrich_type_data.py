#!/usr/bin/env python3
"""
Enrich all product_types with description, evaluation_focus, and missing metadata.
Generates data from existing definitions.
"""
import sys, os, time, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
from config import SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_KEY
import requests

write_key = SUPABASE_SERVICE_KEY if SUPABASE_SERVICE_KEY else SUPABASE_KEY
H_WRITE = {
    'apikey': write_key,
    'Authorization': f'Bearer {write_key}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}
H_READ = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}
BASE = SUPABASE_URL + '/rest/v1'

# ============================================
# TYPE ENRICHMENT DATA
# Generated from definitions + domain knowledge
# ============================================
TYPE_DATA = {
    1: {  # Hardware Wallet Cold
        'description': 'Physical device that stores cryptocurrency private keys offline. Air-gapped or USB-connected. Never exposes keys to the internet.',
        'evaluation_focus': 'Secure Element certification, firmware update mechanism, supply chain integrity, physical tamper resistance, key generation entropy, PIN/passphrase protection.',
    },
    2: {  # Browser Extension Wallet
        'description': 'Browser extension (Chrome, Firefox, etc.) that manages crypto keys and enables dApp interaction directly from the browser.',
        'evaluation_focus': 'Extension permissions scope, phishing protection, transaction simulation, key storage encryption, dApp approval UX, auto-lock timeout.',
    },
    3: {  # Mobile Wallet
        'description': 'Smartphone application for managing cryptocurrency. Can be custodial or self-custody. Supports send/receive, sometimes buy/swap.',
        'evaluation_focus': 'Biometric auth, local key encryption, backup mechanism, network privacy, transaction verification UX, OS-level security usage.',
    },
    4: {  # MPC Wallet
        'description': 'Wallet using Multi-Party Computation to split key generation and signing across multiple parties. No single point of failure.',
        'evaluation_focus': 'MPC protocol implementation, key share distribution, threshold scheme, recovery mechanism, audit trail, institutional controls.',
    },
    5: {  # MultiSig Wallet
        'description': 'Wallet requiring multiple signatures (M-of-N) to authorize transactions. Used by teams, DAOs, and institutions.',
        'evaluation_focus': 'Quorum configuration flexibility, co-signer management, transaction proposal flow, time-lock support, hardware signer compatibility.',
    },
    6: {  # Desktop Wallet
        'description': 'Desktop application (Windows, macOS, Linux) for managing cryptocurrency. Typically self-custody with local key storage.',
        'evaluation_focus': 'Local encryption strength, OS integration security, auto-update mechanism, backup/export options, full node support.',
    },
    7: {  # Smart Contract Wallet (AA)
        'description': 'Wallet implemented as a smart contract on-chain, enabling account abstraction features like social recovery, gas sponsorship, and batched transactions.',
        'evaluation_focus': 'Smart contract audit status, upgrade mechanism, social recovery implementation, gas abstraction, module security.',
    },
    8: {  # Digital Backup
        'description': 'Software or service for backing up cryptocurrency keys, seed phrases, or wallet data digitally. Includes encrypted cloud backup and split-key solutions.',
        'evaluation_focus': 'Encryption algorithm, key splitting method, storage provider security, recovery process, access control.',
    },
    9: {  # Physical Backup (Metal)
        'description': 'Metal plate, capsule, or device for physically storing seed phrases or private keys. Resistant to fire, water, and corrosion.',
        'evaluation_focus': 'Material grade (steel type), fire resistance temperature, corrosion resistance, readability after stress, tamper evidence.',
    },
    10: {  # Centralized Exchange
        'description': 'Platform for buying, selling, and trading cryptocurrency via order books. Custodial - holds user funds. Regulated in most jurisdictions.',
        'evaluation_focus': 'Proof of Reserves, cold storage ratio, insurance coverage, regulatory compliance, withdrawal security, 2FA enforcement.',
    },
    11: {  # Decentralized Exchange
        'description': 'On-chain protocol enabling peer-to-peer token swaps without intermediaries. Uses AMM or order book smart contracts.',
        'evaluation_focus': 'Smart contract audit, TVL security, oracle manipulation resistance, MEV protection, governance decentralization.',
    },
    12: {  # DEX Aggregator
        'description': 'Protocol that routes trades across multiple DEXs to find the best price and lowest slippage for users.',
        'evaluation_focus': 'Routing algorithm fairness, smart contract audit, front-running protection, gas efficiency, price accuracy.',
    },
    13: {  # OTC / P2P Trading
        'description': 'Over-the-counter or peer-to-peer trading platform for large orders or direct trades between users, often with escrow.',
        'evaluation_focus': 'Escrow mechanism security, dispute resolution, KYC/AML compliance, counterparty risk mitigation.',
    },
    14: {  # Atomic Swap / Cross-Chain DEX
        'description': 'Protocol enabling trustless exchange of tokens across different blockchains using atomic swap technology (hash time-locked contracts).',
        'evaluation_focus': 'HTLC implementation, cross-chain verification, timeout handling, liquidity depth, refund mechanism.',
    },
    15: {  # AMM / Liquidity Provider
        'description': 'Automated Market Maker protocol where liquidity providers deposit tokens into pools to enable decentralized trading.',
        'evaluation_focus': 'Impermanent loss mitigation, pool contract audit, oracle integration, concentrated liquidity risks, fee structure.',
    },
    16: {  # DeFi Lending Protocol
        'description': 'Protocol enabling decentralized lending and borrowing of crypto assets. Interest rates set algorithmically based on supply/demand.',
        'evaluation_focus': 'Liquidation mechanism, oracle reliability, interest rate model, collateral factor settings, bad debt handling.',
    },
    17: {  # Yield Aggregator
        'description': 'Protocol that automatically optimizes yield farming strategies across multiple DeFi protocols to maximize returns.',
        'evaluation_focus': 'Strategy audit, smart contract risk aggregation, withdrawal mechanism, fee transparency, auto-compound security.',
    },
    18: {  # Liquid Staking
        'description': 'Protocol that issues liquid staking tokens (LSTs) in exchange for staked assets, allowing users to earn staking rewards while maintaining liquidity.',
        'evaluation_focus': 'Validator selection, peg stability, withdrawal mechanism, slashing risk mitigation, governance decentralization.',
    },
    19: {  # DeFi Derivatives
        'description': 'Protocol for trading on-chain derivatives including futures, options, and structured products.',
        'evaluation_focus': 'Oracle manipulation resistance, margin/liquidation engine, settlement mechanism, risk parameter governance.',
    },
    20: {  # Cross-Chain Bridge
        'description': 'Protocol enabling transfer of assets and messages between different blockchains. Critical infrastructure with high security requirements.',
        'evaluation_focus': 'Bridge architecture (lock-mint vs burn-mint), validator set, message verification, rate limiting, emergency pause.',
    },
    21: {  # DeFi Tools & Analytics
        'description': 'Tools for monitoring, analyzing, and managing DeFi positions. Portfolio trackers, yield calculators, risk dashboards.',
        'evaluation_focus': 'Data accuracy, API security, read-only vs write access, privacy of user data, third-party integrations.',
    },
    22: {  # DeFi Insurance
        'description': 'Protocol providing coverage against smart contract failures, hacks, oracle manipulation, and other DeFi-specific risks.',
        'evaluation_focus': 'Claims process, coverage scope, capital pool solvency, pricing model, governance of payouts.',
    },
    23: {  # Token Launchpad
        'description': 'Platform for launching new token projects through IDOs, IEOs, or fair launches. Provides fundraising infrastructure.',
        'evaluation_focus': 'Vetting process, smart contract audit, token distribution fairness, anti-bot measures, refund mechanism.',
    },
    24: {  # Prediction Market
        'description': 'Decentralized platform for betting on real-world event outcomes using crypto. Uses oracle networks for resolution.',
        'evaluation_focus': 'Oracle resolution mechanism, market manipulation resistance, liquidity depth, settlement accuracy.',
    },
    25: {  # Restaking Protocol
        'description': 'Protocol that allows already-staked assets (LSTs) to be re-staked to secure additional protocols, earning extra yield.',
        'evaluation_focus': 'Slashing risk aggregation, operator selection, AVS security, withdrawal queue, compounding risk.',
    },
    26: {  # Streaming Payments
        'description': 'Protocol enabling continuous real-time payment streams. Used for salaries, subscriptions, and token vesting.',
        'evaluation_focus': 'Stream precision, cancellation mechanism, multi-token support, gas efficiency, access control.',
    },
    27: {  # Cross-Chain Aggregator
        'description': 'Aggregator that finds optimal routes for cross-chain transfers across multiple bridges and DEXs.',
        'evaluation_focus': 'Bridge selection safety, routing transparency, fallback mechanism, fee comparison accuracy.',
    },
    28: {  # Intent Protocol
        'description': 'Protocol where users express transaction intents (desired outcomes) and solvers compete to fulfill them optimally.',
        'evaluation_focus': 'Solver reputation system, MEV protection, execution guarantee, price improvement verification.',
    },
    29: {  # Perpetual DEX
        'description': 'Decentralized exchange for trading perpetual futures contracts with leverage. No expiry dates.',
        'evaluation_focus': 'Funding rate mechanism, liquidation engine, oracle reliability, insurance fund, position limit controls.',
    },
    30: {  # Options DEX
        'description': 'Decentralized platform for trading crypto options contracts (calls, puts, exotic options).',
        'evaluation_focus': 'Pricing model accuracy, settlement mechanism, collateral management, Greeks calculation, exercise process.',
    },
    31: {  # Synthetic Assets Protocol
        'description': 'Protocol creating on-chain synthetic versions of real-world or crypto assets, tracking their price via oracles.',
        'evaluation_focus': 'Oracle reliability, collateralization ratio, liquidation mechanism, peg stability, asset listing governance.',
    },
    32: {  # Index Protocol
        'description': 'Protocol creating tokenized baskets or indices of multiple crypto assets for diversified exposure.',
        'evaluation_focus': 'Rebalancing mechanism, constituent selection, NAV tracking accuracy, redemption process.',
    },
    33: {  # Liquidity Locker
        'description': 'Service that locks liquidity pool tokens for a set period, preventing rug pulls by ensuring LP tokens cannot be withdrawn.',
        'evaluation_focus': 'Lock contract audit, unlock conditions, migration support, emergency mechanism, transparency.',
    },
    34: {  # Token Vesting Platform
        'description': 'Platform managing token distribution schedules for teams, investors, and communities with time-based or milestone-based releases.',
        'evaluation_focus': 'Vesting contract audit, cliff/linear schedule accuracy, revocation mechanism, multi-chain support.',
    },
    35: {  # Real World Assets
        'description': 'Platforms tokenizing traditional financial assets like real estate, bonds, commodities, and private credit on blockchain.',
        'evaluation_focus': 'Legal wrapper enforceability, asset custody verification, regulatory compliance, audit frequency, redemption process.',
    },
    36: {  # Stablecoin
        'description': 'Cryptocurrency designed to maintain a stable value relative to a reference asset (usually USD). Can be fiat-backed, crypto-backed, or algorithmic.',
        'evaluation_focus': 'Peg stability mechanism, reserve transparency, audit frequency, redemption process, de-peg risk mitigation.',
    },
    37: {  # Wrapped Asset
        'description': 'Token on one blockchain representing an asset from another blockchain (e.g., WBTC, wETH). Requires a custodian or bridge.',
        'evaluation_focus': 'Minting/burning process, custodian security, proof of reserves, bridge dependency, redemption speed.',
    },
    38: {  # Crypto Card (Custodial)
        'description': 'Debit or prepaid card (Visa/Mastercard) that allows spending cryptocurrency. Custodial - provider holds the crypto until spend.',
        'evaluation_focus': 'Fund security in custody, conversion rate transparency, spending limits, card issuer reliability, regulatory compliance.',
    },
    39: {  # Crypto Card (Non-Custodial)
        'description': 'Crypto spending card where user retains custody of funds until the moment of payment. Self-custody crypto to fiat conversion.',
        'evaluation_focus': 'Self-custody mechanism, conversion timing/rate, smart contract security, privacy of transactions.',
    },
    40: {  # Crypto Bank
        'description': 'Financial institution offering banking services (accounts, cards, transfers) with integrated cryptocurrency features.',
        'evaluation_focus': 'Regulatory licenses, deposit insurance, segregation of funds, security infrastructure, compliance framework.',
    },
    41: {  # Institutional Custody
        'description': 'Enterprise-grade custody solution for institutions holding large amounts of cryptocurrency. Includes insurance, compliance, and governance.',
        'evaluation_focus': 'Insurance coverage, SOC2/ISO certifications, key management architecture, disaster recovery, regulatory compliance.',
    },
    42: {  # CeFi Lending / Earn
        'description': 'Centralized platform offering yield on crypto deposits and crypto-backed loans. Custodial - platform manages the lending.',
        'evaluation_focus': 'Proof of reserves, risk management framework, withdrawal terms, regulatory compliance, insurance.',
    },
    43: {  # Prime Brokerage
        'description': 'Institutional-grade trading and lending services for professional crypto traders and funds.',
        'evaluation_focus': 'Counterparty risk management, margin framework, settlement infrastructure, regulatory status.',
    },
    44: {  # Treasury Management
        'description': 'Tools and protocols for managing organizational crypto treasuries. DAO treasury, corporate treasury, multi-sig management.',
        'evaluation_focus': 'Access control granularity, approval workflows, reporting transparency, integration breadth.',
    },
    45: {  # Oracle Protocol
        'description': 'Decentralized network providing off-chain data (prices, events, randomness) to smart contracts on-chain.',
        'evaluation_focus': 'Data source diversity, update frequency, manipulation resistance, node operator decentralization, fallback mechanism.',
    },
    46: {  # Layer 2 Solution
        'description': 'Scaling solution built on top of a Layer 1 blockchain (rollups, sidechains, state channels) to increase throughput and reduce fees.',
        'evaluation_focus': 'Security inheritance from L1, fraud/validity proof mechanism, finality time, exit mechanism, sequencer decentralization.',
    },
    47: {  # Node / RPC Provider
        'description': 'Service providing blockchain node infrastructure and RPC endpoints for developers and applications.',
        'evaluation_focus': 'Uptime SLA, geographic distribution, rate limiting, data accuracy, latency, privacy policy.',
    },
    48: {  # Blockchain Data Indexer
        'description': 'Service that indexes and organizes blockchain data for efficient querying by dApps and analytics platforms.',
        'evaluation_focus': 'Data completeness, indexing latency, query accuracy, decentralization of indexing, API reliability.',
    },
    49: {  # Block Explorer
        'description': 'Web application for browsing blockchain data: transactions, addresses, blocks, smart contracts, and token information.',
        'evaluation_focus': 'Data accuracy, chain coverage, contract verification, privacy features, API availability.',
    },
    50: {  # Developer Tools
        'description': 'SDKs, APIs, testing frameworks, and development environments for building blockchain applications.',
        'evaluation_focus': 'Documentation quality, security defaults, dependency management, testing capabilities, update frequency.',
    },
    51: {  # Validator / Staking Service
        'description': 'Service running blockchain validators on behalf of stakers. Manages infrastructure, uptime, and slashing risk.',
        'evaluation_focus': 'Uptime track record, slashing history, commission transparency, infrastructure redundancy, governance participation.',
    },
    52: {  # On-Chain Attestation
        'description': 'Protocol for creating verifiable on-chain attestations, credentials, and proofs (e.g., EAS, Verax).',
        'evaluation_focus': 'Schema flexibility, revocation mechanism, privacy features, cross-chain portability, gas efficiency.',
    },
    53: {  # Research & Intelligence
        'description': 'Platform providing crypto market research, on-chain analytics, threat intelligence, or security monitoring.',
        'evaluation_focus': 'Data accuracy, methodology transparency, coverage breadth, alert system, API security.',
    },
    54: {  # Interoperability Protocol
        'description': 'Protocol enabling communication and interoperability between different blockchain networks beyond simple asset bridging.',
        'evaluation_focus': 'Message verification mechanism, cross-chain security model, latency, supported chains, upgrade process.',
    },
    55: {  # Account Abstraction
        'description': 'Infrastructure enabling smart contract wallets with enhanced UX: gasless transactions, social recovery, session keys.',
        'evaluation_focus': 'Bundler decentralization, paymaster security, entry point contract audit, wallet factory security.',
    },
    56: {  # NFT Marketplace
        'description': 'Platform for buying, selling, and trading non-fungible tokens (NFTs). Supports auctions, fixed-price, and offers.',
        'evaluation_focus': 'Royalty enforcement, fraud detection, listing verification, payment security, metadata storage.',
    },
    57: {  # Payment Processor
        'description': 'Service enabling merchants to accept cryptocurrency payments and optionally convert to fiat automatically.',
        'evaluation_focus': 'Settlement reliability, conversion rate transparency, fraud prevention, merchant integration security.',
    },
    58: {  # Fiat On/Off Ramp
        'description': 'Service facilitating conversion between fiat currency and cryptocurrency. Entry and exit points to the crypto ecosystem.',
        'evaluation_focus': 'KYC/AML compliance, supported payment methods, conversion rates, processing speed, geographic coverage.',
    },
    59: {  # Crypto Tax Software
        'description': 'Software for tracking, calculating, and reporting cryptocurrency taxes. Imports transactions from exchanges, wallets, and DeFi.',
        'evaluation_focus': 'Calculation accuracy, jurisdiction coverage, DeFi/NFT support, data import reliability, privacy of financial data.',
    },
    60: {  # Privacy Protocol
        'description': 'Protocol providing transaction privacy on public blockchains. Uses zero-knowledge proofs, mixers, or confidential transactions.',
        'evaluation_focus': 'Privacy guarantee strength (ZK vs mixing), anonymity set size, compliance features, audit status, regulatory positioning.',
    },
    61: {  # Private DeFi Protocol
        'description': 'DeFi protocol with built-in privacy features. Enables private lending, trading, or transfers using ZK technology.',
        'evaluation_focus': 'ZK proof implementation, private state management, compliance hooks, auditability, smart contract security.',
    },
    62: {  # DAO Tools
        'description': 'Tools and platforms for creating, managing, and participating in Decentralized Autonomous Organizations.',
        'evaluation_focus': 'Voting mechanism security, proposal execution safety, treasury management, delegation system, Sybil resistance.',
    },
    63: {  # Protocol / Standard
        'description': 'Set of rules, specifications, or reference implementations for crypto security, key management, or blockchain standards.',
        'evaluation_focus': 'Specification clarity, reference implementation quality, adoption breadth, backward compatibility, security review.',
    },
    64: {  # GameFi Platform
        'description': 'Gaming platform integrating cryptocurrency, NFTs, and play-to-earn mechanics. Includes on-chain games and gaming infrastructure.',
        'evaluation_focus': 'Smart contract audit, token economics sustainability, asset ownership verification, anti-cheat measures.',
    },
    65: {  # Metaverse Platform
        'description': 'Virtual world platform with crypto-native economics, NFT land/assets, and decentralized governance.',
        'evaluation_focus': 'Asset ownership security, smart contract audit, content moderation, economic sustainability.',
    },
    66: {  # SocialFi Platform
        'description': 'Social media platform with integrated crypto features: token-gated content, creator tokens, on-chain reputation.',
        'evaluation_focus': 'Content ownership, token mechanics, privacy features, Sybil resistance, moderation tools.',
    },
    67: {  # Decentralized Messaging
        'description': 'End-to-end encrypted messaging protocol using decentralized infrastructure. No central server holds messages.',
        'evaluation_focus': 'Encryption protocol, key management, metadata protection, message delivery reliability, spam resistance.',
    },
    68: {  # Airdrop / Quest Platform
        'description': 'Platform for distributing tokens via airdrops, quests, bounties, and community engagement tasks.',
        'evaluation_focus': 'Sybil resistance, task verification, token distribution fairness, user data privacy.',
    },
    69: {  # NFT Creation Tools
        'description': 'Tools for creating, minting, and managing NFT collections. Includes no-code minters, generative art tools, and metadata managers.',
        'evaluation_focus': 'Smart contract security, metadata storage (IPFS/Arweave), royalty configuration, batch minting gas efficiency.',
    },
    70: {  # Fan Token Platform
        'description': 'Platform issuing fan tokens for sports teams, entertainment brands, and communities. Includes voting and engagement features.',
        'evaluation_focus': 'Token utility clarity, voting mechanism, partnership authenticity, secondary market liquidity.',
    },
    71: {  # Decentralized Identity
        'description': 'Protocol for self-sovereign digital identity. Users control their credentials without relying on centralized authorities.',
        'evaluation_focus': 'Privacy-preserving verification (ZK), credential revocation, cross-chain portability, recovery mechanism.',
    },
    72: {  # Decentralized Storage
        'description': 'Protocol for storing data across a decentralized network of nodes. Includes file storage, content addressing, and permanence.',
        'evaluation_focus': 'Data redundancy, retrieval reliability, encryption, storage proof mechanism, censorship resistance.',
    },
    73: {  # Decentralized Compute
        'description': 'Protocol providing decentralized computing resources (GPU, CPU) for AI training, rendering, or general computation.',
        'evaluation_focus': 'Compute verification, job scheduling security, provider reputation, data privacy during computation.',
    },
    74: {  # Decentralized VPN
        'description': 'VPN service using a decentralized network of nodes instead of centralized servers. No-log by design.',
        'evaluation_focus': 'Node operator incentives, bandwidth quality, exit node security, payment privacy, DNS leak protection.',
    },
    75: {  # Mining Pool
        'description': 'Pool of miners combining computational power to increase chances of finding blocks. Rewards distributed among participants.',
        'evaluation_focus': 'Payout transparency, hashrate verification, fee structure, block withholding protection, decentralization.',
    },
    76: {  # Decentralized AI Agent
        'description': 'Autonomous AI agent operating on-chain, executing transactions, managing DeFi positions, or providing services using smart contracts.',
        'evaluation_focus': 'Agent authorization scope, fund limit controls, human override mechanism, decision transparency, smart contract audit.',
    },
    77: {  # Security Audit & Bug Bounty
        'description': 'Firm or platform providing smart contract audits, penetration testing, and bug bounty programs for crypto projects.',
        'evaluation_focus': 'Audit methodology, team credentials, report transparency, bug bounty payout track record, coverage scope.',
    },
    78: {  # MEV Protection
        'description': 'Protocol or service protecting users from MEV (Maximal Extractable Value) extraction like front-running and sandwich attacks.',
        'evaluation_focus': 'Protection mechanism (private mempool, batch auctions), transaction privacy, latency impact, MEV rebate distribution.',
    },
    80: {  # Companion / Approval App
        'description': 'Mobile or desktop application serving as management and approval interface for a parent platform. Does not hold keys.',
        'evaluation_focus': 'Authentication strength (2FA, biometrics), session management, push notification security, approval workflow integrity.',
        'examples': '{"BitGo App","Fireblocks Mobile","Anchorage Approval"}',
        'includes': ['Transaction approval/denial', 'Balance monitoring', 'Activity alerts', 'Multi-user approval workflows', 'Push notifications'],
        'excludes': ['Key storage', 'Transaction initiation', 'Direct fund management', 'Seed phrase display'],
        'keywords': ['companion', 'approval', 'approve', 'deny', 'management app', '2FA app', 'authorization'],
        'pillar_weights': {'S': 40, 'A': 25, 'E': 20, 'F': 15},
    },
    81: {  # Physical Funded Coin (Bearer Token)
        'description': 'Physical coin or token pre-loaded with cryptocurrency via an embedded private key under a tamper-evident hologram.',
        'evaluation_focus': 'Hologram tamper-evidence quality, key generation security, material durability, manufacturer trust chain, redemption process.',
        'examples': '{"Casascius Coins","Titan Bitcoin","Lealana Coins","Denarium","BTCC Mint","Ballet REAL Bitcoin"}',
        'includes': ['Tamper-evident hologram', 'Embedded private key', 'Precious metal composition', 'Collectible value', 'One-time cold storage'],
        'excludes': ['Electronic components', 'Firmware', 'Battery', 'Display', 'Bluetooth/USB connectivity'],
        'keywords': ['bearer token', 'physical bitcoin', 'funded coin', 'hologram', 'loaded coin', 'casascius', 'collectible'],
        'pillar_weights': {'S': 30, 'A': 20, 'E': 15, 'F': 35},
    },
}

# ============================================
# APPLY UPDATES
# ============================================
print('=' * 60)
print('  ENRICHING TYPE DATA')
print('=' * 60)

fixed = 0
errors = 0

for type_id, data in TYPE_DATA.items():
    # Build update payload - only include fields that have data
    payload = {}
    if 'description' in data:
        payload['description'] = data['description']
    if 'evaluation_focus' in data:
        payload['evaluation_focus'] = data['evaluation_focus']
    if 'examples' in data:
        payload['examples'] = data['examples']
    if 'includes' in data:
        payload['includes'] = data['includes']
    if 'excludes' in data:
        payload['excludes'] = data['excludes']
    if 'keywords' in data:
        payload['keywords'] = data['keywords']
    if 'pillar_weights' in data:
        payload['pillar_weights'] = data['pillar_weights']

    r = requests.patch(
        f'{BASE}/product_types?id=eq.{type_id}',
        headers=H_WRITE,
        json=payload
    )

    if r.status_code in (200, 204):
        fixed += 1
        print(f'  OK  Type {type_id:3d}')
    else:
        errors += 1
        print(f'  ERR Type {type_id:3d}: {r.status_code} {r.text[:100]}')
    time.sleep(0.02)

print(f'\n{"=" * 60}')
print(f'  DONE: {fixed} types enriched, {errors} errors')
print(f'{"=" * 60}')
