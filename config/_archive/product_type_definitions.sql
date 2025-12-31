-- ============================================================
-- PRODUCT TYPE DEFINITIONS - Comprehensive Update
-- ============================================================
-- Updates all product types with detailed definitions
-- for AI evaluation and documentation
-- ============================================================

-- ============================================================
-- 1. ADD MISSING COLUMNS IF NOT EXISTS
-- ============================================================

ALTER TABLE product_types
ADD COLUMN IF NOT EXISTS name VARCHAR(100),
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS definition TEXT,
ADD COLUMN IF NOT EXISTS includes TEXT[],
ADD COLUMN IF NOT EXISTS excludes TEXT[],
ADD COLUMN IF NOT EXISTS risk_factors TEXT[],
ADD COLUMN IF NOT EXISTS evaluation_focus JSONB,
ADD COLUMN IF NOT EXISTS pillar_weights JSONB,
ADD COLUMN IF NOT EXISTS keywords TEXT[],
ADD COLUMN IF NOT EXISTS examples TEXT[],
ADD COLUMN IF NOT EXISTS is_hardware BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_custodial BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS version VARCHAR(20) DEFAULT '1.0';

-- ============================================================
-- 2. UPDATE PRODUCT TYPE DEFINITIONS
-- ============================================================

-- ============================================================
-- HARDWARE WALLETS
-- ============================================================

UPDATE product_types SET
    definition = 'A Hardware Wallet is a physical device that stores cryptocurrency private keys offline in a secure element, requiring physical confirmation for transactions. It provides the highest level of security for self-custody by keeping keys isolated from internet-connected devices.',
    includes = ARRAY[
        'Dedicated hardware device for key storage',
        'Secure Element or HSM chip',
        'Physical transaction confirmation (buttons, touchscreen)',
        'Offline key generation and storage',
        'Support for multiple cryptocurrencies',
        'Backup via seed phrase (BIP39)',
        'Firmware updates for security patches',
        'Companion software/app for management'
    ],
    excludes = ARRAY[
        'Hot wallet functionality (keys never online)',
        'Custodial services',
        'Trading or exchange features',
        'DeFi protocol integration (wallet only signs)'
    ],
    risk_factors = ARRAY[
        'Supply chain attacks (tampered devices)',
        'Firmware vulnerabilities',
        'Physical theft without PIN protection',
        'Seed phrase exposure',
        'Manufacturer discontinuation'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Secure Element certification", "Firmware signing", "PIN protection", "Seed generation quality"]},
        "A": {"weight": 0.25, "focus": ["Duress PIN", "Hidden wallets", "Tamper resistance", "Backup options"]},
        "F": {"weight": 0.25, "focus": ["Build quality", "Durability", "Warranty", "Company track record"]},
        "E": {"weight": 0.25, "focus": ["Supported coins", "Ease of use", "Display quality", "Connectivity"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['hardware wallet', 'cold storage', 'secure element', 'offline', 'physical device', 'ledger', 'trezor', 'coldcard', 'bitbox', 'keystone'],
    examples = ARRAY['Ledger Nano X', 'Trezor Model T', 'Coldcard Mk4', 'BitBox02', 'Keystone Pro'],
    is_hardware = TRUE,
    is_custodial = FALSE,
    version = '2.0'
WHERE code = 'HW Cold';

-- ============================================================
-- SOFTWARE WALLETS (HOT WALLETS)
-- ============================================================

UPDATE product_types SET
    definition = 'A Software Wallet (Hot Wallet) is a digital application that stores cryptocurrency private keys on an internet-connected device (mobile, desktop, or browser). It offers convenience and accessibility but with higher security risks compared to hardware wallets.',
    includes = ARRAY[
        'Mobile app, desktop app, or browser extension',
        'Private key storage on device',
        'Real-time balance and transaction viewing',
        'Direct blockchain interaction',
        'DeFi and dApp connectivity',
        'Token swaps and staking features',
        'Multi-chain support',
        'WalletConnect integration'
    ],
    excludes = ARRAY[
        'Physical hardware components',
        'Offline key storage (keys are on connected device)',
        'Custodial services (user holds keys)',
        'Exchange or trading platform features'
    ],
    risk_factors = ARRAY[
        'Malware and keyloggers on host device',
        'Phishing attacks',
        'Device theft or compromise',
        'Malicious browser extensions',
        'App store fake apps',
        'Clipboard hijacking'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Encryption quality", "Key derivation", "Biometric protection", "Code audits"]},
        "A": {"weight": 0.25, "focus": ["Backup encryption", "Social recovery", "Transaction limits", "Address whitelisting"]},
        "F": {"weight": 0.25, "focus": ["App stability", "Update frequency", "Company reputation", "Open source status"]},
        "E": {"weight": 0.25, "focus": ["Multi-chain support", "DeFi features", "UX quality", "Speed"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['software wallet', 'hot wallet', 'mobile wallet', 'desktop wallet', 'browser extension', 'metamask', 'trust wallet', 'exodus', 'phantom'],
    examples = ARRAY['MetaMask', 'Trust Wallet', 'Phantom', 'Exodus', 'Rabby', 'Rainbow'],
    is_hardware = FALSE,
    is_custodial = FALSE,
    version = '2.0'
WHERE code = 'SW Browser';

-- ============================================================
-- DECENTRALIZED EXCHANGES (DEX)
-- ============================================================

UPDATE product_types SET
    definition = 'A Decentralized Exchange (DEX) is a non-custodial trading platform using smart contracts to enable peer-to-peer cryptocurrency trading directly from user wallets. Users maintain full control of their funds throughout the trading process.',
    includes = ARRAY[
        'Automated Market Maker (AMM) or order book system',
        'Smart contract-based trading',
        'Liquidity pools',
        'Token swaps without intermediary custody',
        'Yield farming and liquidity mining',
        'Governance tokens',
        'Cross-chain swaps (some DEXs)',
        'DEX aggregation (routing through multiple DEXs)'
    ],
    excludes = ARRAY[
        'Custodial fund storage',
        'KYC/AML requirements (usually)',
        'Fiat on/off ramps (direct)',
        'Centralized order matching',
        'Account creation or email login'
    ],
    risk_factors = ARRAY[
        'Smart contract vulnerabilities',
        'Impermanent loss for LPs',
        'Front-running and MEV attacks',
        'Rug pulls on new tokens',
        'Oracle manipulation',
        'Flash loan attacks',
        'Bridge exploits for cross-chain'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Smart contract audits", "Bug bounty program", "TVL security", "Oracle security"]},
        "A": {"weight": 0.25, "focus": ["MEV protection", "Slippage controls", "Emergency pause", "Governance security"]},
        "F": {"weight": 0.25, "focus": ["Protocol uptime", "Team track record", "Code open source", "Incident history"]},
        "E": {"weight": 0.25, "focus": ["Supported chains", "Liquidity depth", "Fees", "Swap speed"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['DEX', 'decentralized exchange', 'AMM', 'swap', 'liquidity pool', 'uniswap', 'sushiswap', '1inch', 'curve', 'pancakeswap'],
    examples = ARRAY['Uniswap', '1inch', 'Curve Finance', 'PancakeSwap', 'dYdX', 'SushiSwap'],
    is_hardware = FALSE,
    is_custodial = FALSE,
    version = '2.0'
WHERE code = 'DEX';

-- ============================================================
-- CENTRALIZED EXCHANGES (CEX)
-- ============================================================

UPDATE product_types SET
    definition = 'A Centralized Exchange (CEX) is a custodial trading platform operated by a company that holds user funds and facilitates cryptocurrency trading through a centralized order book. Users trust the exchange with custody of their assets.',
    includes = ARRAY[
        'Custodial wallet services',
        'Order book trading (spot, margin, futures)',
        'Fiat on/off ramps',
        'KYC/AML compliance',
        'Customer support',
        'Insurance funds (some exchanges)',
        'Staking and earn products',
        'API for trading bots',
        'Mobile and web applications'
    ],
    excludes = ARRAY[
        'User control of private keys',
        'Non-custodial trading',
        'Anonymous trading (KYC required)',
        'Smart contract-based execution'
    ],
    risk_factors = ARRAY[
        'Exchange hacks and security breaches',
        'Insolvency and bankruptcy (FTX, Mt. Gox)',
        'Regulatory actions and account freezes',
        'Withdrawal restrictions',
        'Internal fraud',
        'Hot wallet exposure',
        'Proof of reserves validity'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Cold storage ratio", "2FA enforcement", "Withdrawal security", "Insurance fund"]},
        "A": {"weight": 0.25, "focus": ["Proof of reserves", "Regulatory compliance", "Account recovery", "Jurisdiction"]},
        "F": {"weight": 0.25, "focus": ["Company history", "Incident response", "Uptime", "Financial transparency"]},
        "E": {"weight": 0.25, "focus": ["Trading pairs", "Fees", "Liquidity", "UX quality"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['CEX', 'centralized exchange', 'exchange', 'trading platform', 'binance', 'coinbase', 'kraken', 'KYC', 'custodial'],
    examples = ARRAY['Binance', 'Coinbase', 'Kraken', 'OKX', 'Bybit', 'Crypto.com'],
    is_hardware = FALSE,
    is_custodial = TRUE,
    version = '2.0'
WHERE code = 'CEX';

-- ============================================================
-- DEFI LENDING PROTOCOLS
-- ============================================================

UPDATE product_types SET
    definition = 'A DeFi Lending Protocol is a decentralized platform that enables users to lend their crypto assets to earn interest or borrow against their holdings through smart contracts, without traditional financial intermediaries.',
    includes = ARRAY[
        'Collateralized borrowing',
        'Interest-bearing deposits',
        'Liquidation mechanisms',
        'Variable and stable interest rates',
        'Flash loans',
        'Governance tokens',
        'Multi-collateral support',
        'Interest rate models'
    ],
    excludes = ARRAY[
        'Unsecured lending (over-collateralized only)',
        'Traditional credit scoring',
        'Fiat currency lending',
        'Custodial fund management'
    ],
    risk_factors = ARRAY[
        'Smart contract exploits',
        'Oracle manipulation attacks',
        'Cascading liquidations',
        'Bad debt accumulation',
        'Governance attacks',
        'Interest rate model failures',
        'Collateral token depegs'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Smart contract audits", "Oracle security", "Liquidation mechanism", "Access controls"]},
        "A": {"weight": 0.25, "focus": ["Bad debt handling", "Emergency shutdown", "Governance timelock", "Insurance fund"]},
        "F": {"weight": 0.25, "focus": ["Protocol uptime", "TVL history", "Team reputation", "Audit history"]},
        "E": {"weight": 0.25, "focus": ["Supported assets", "Interest rates", "UX", "Gas efficiency"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['lending', 'borrowing', 'collateral', 'interest', 'aave', 'compound', 'maker', 'liquidation', 'CDP', 'flash loan'],
    examples = ARRAY['Aave', 'Compound', 'MakerDAO', 'Spark Protocol', 'Venus', 'Benqi'],
    is_hardware = FALSE,
    is_custodial = FALSE,
    version = '2.0'
WHERE code = 'Lending';

-- ============================================================
-- YIELD AGGREGATORS
-- ============================================================

UPDATE product_types SET
    definition = 'A Yield Aggregator is a DeFi protocol that automatically optimizes yield farming strategies across multiple protocols to maximize returns for depositors. It automates the process of moving funds between different yield opportunities.',
    includes = ARRAY[
        'Auto-compounding of rewards',
        'Strategy vaults',
        'Multi-protocol optimization',
        'Gas cost optimization',
        'Harvest automation',
        'Performance fees',
        'Strategy diversification',
        'Yield comparison tools'
    ],
    excludes = ARRAY[
        'Direct lending (aggregates lending protocols)',
        'Manual yield farming',
        'Custodial management',
        'Guaranteed returns'
    ],
    risk_factors = ARRAY[
        'Strategy smart contract bugs',
        'Underlying protocol failures',
        'Composability risk (multiple protocols)',
        'Impermanent loss in LP strategies',
        'Strategy manipulation',
        'Admin key compromise',
        'Oracle failures across protocols'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Vault contract audits", "Strategy audits", "Admin controls", "Underlying protocol security"]},
        "A": {"weight": 0.25, "focus": ["Emergency withdrawal", "Strategy timelock", "Loss mitigation", "Insurance"]},
        "F": {"weight": 0.25, "focus": ["Historical performance", "Team track record", "TVL stability", "Incident response"]},
        "E": {"weight": 0.25, "focus": ["APY accuracy", "Supported strategies", "Fees", "UX"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['yield', 'aggregator', 'vault', 'auto-compound', 'yearn', 'beefy', 'convex', 'harvest', 'strategy'],
    examples = ARRAY['Yearn Finance', 'Beefy Finance', 'Convex Finance', 'Harvest Finance', 'Pickle Finance'],
    is_hardware = FALSE,
    is_custodial = FALSE,
    version = '2.0'
WHERE code = 'Yield';

-- ============================================================
-- LIQUID STAKING
-- ============================================================

UPDATE product_types SET
    definition = 'A Liquid Staking Protocol allows users to stake their proof-of-stake tokens while receiving a liquid derivative token (LST) that represents their staked position. This enables users to earn staking rewards while maintaining liquidity.',
    includes = ARRAY[
        'Staking derivative tokens (stETH, rETH, etc.)',
        'Staking rewards distribution',
        'Validator node operation',
        'Unstaking/withdrawal mechanisms',
        'DeFi composability of LSTs',
        'Slashing protection',
        'Distributed validator sets',
        'Governance participation'
    ],
    excludes = ARRAY[
        'Direct validator operation by users',
        'Locked staking without liquidity',
        'Custodial staking services',
        'Non-tokenized staking'
    ],
    risk_factors = ARRAY[
        'Validator slashing events',
        'LST depeg from underlying',
        'Smart contract vulnerabilities',
        'Centralization of stake',
        'Withdrawal queue delays',
        'Oracle price manipulation',
        'Regulatory classification uncertainty'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Smart contract audits", "Validator security", "Slashing protection", "Oracle security"]},
        "A": {"weight": 0.25, "focus": ["Withdrawal mechanisms", "Depeg protection", "Insurance", "Validator diversity"]},
        "F": {"weight": 0.25, "focus": ["Protocol uptime", "Validator performance", "Team reputation", "TVL stability"]},
        "E": {"weight": 0.25, "focus": ["Staking APY", "LST liquidity", "DeFi integrations", "Fees"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['liquid staking', 'LST', 'stETH', 'rETH', 'lido', 'rocket pool', 'staking derivative', 'validator'],
    examples = ARRAY['Lido Finance', 'Rocket Pool', 'Coinbase cbETH', 'Frax ETH', 'Ankr'],
    is_hardware = FALSE,
    is_custodial = FALSE,
    version = '2.0'
WHERE code = 'Liq Staking';

-- ============================================================
-- DEFI DERIVATIVES
-- ============================================================

UPDATE product_types SET
    definition = 'A DeFi Derivatives Platform enables decentralized trading of financial derivatives including perpetual futures, options, and synthetic assets through smart contracts, without centralized intermediaries.',
    includes = ARRAY[
        'Perpetual futures contracts',
        'Options trading',
        'Synthetic assets',
        'Leverage trading',
        'Funding rate mechanisms',
        'Liquidation engines',
        'Oracle price feeds',
        'Cross-margin and isolated margin'
    ],
    excludes = ARRAY[
        'Spot trading only',
        'Centralized order matching',
        'Traditional derivatives (regulated)',
        'Custodial margin management'
    ],
    risk_factors = ARRAY[
        'Oracle manipulation for liquidations',
        'Smart contract exploits',
        'Cascading liquidations',
        'Funding rate attacks',
        'Insurance fund depletion',
        'Synthetic asset depegs',
        'High leverage magnified losses'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Oracle security", "Liquidation mechanism", "Smart contract audits", "Price manipulation protection"]},
        "A": {"weight": 0.25, "focus": ["Insurance fund", "ADL mechanism", "Position limits", "Emergency shutdown"]},
        "F": {"weight": 0.25, "focus": ["Protocol uptime", "Team track record", "Audit history", "TVL stability"]},
        "E": {"weight": 0.25, "focus": ["Trading pairs", "Leverage options", "Fees", "UI/UX"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['derivatives', 'perpetual', 'futures', 'options', 'leverage', 'synthetic', 'dydx', 'gmx', 'gains'],
    examples = ARRAY['dYdX', 'GMX', 'Gains Network', 'Synthetix', 'Perpetual Protocol', 'Kwenta'],
    is_hardware = FALSE,
    is_custodial = FALSE,
    version = '2.0'
WHERE code = 'Derivatives';

-- ============================================================
-- CROSS-CHAIN BRIDGES
-- ============================================================

UPDATE product_types SET
    definition = 'A Cross-Chain Bridge is a protocol that enables the transfer of assets and data between different blockchain networks. Bridges lock assets on one chain and mint equivalent representations on another, enabling cross-chain interoperability.',
    includes = ARRAY[
        'Asset locking and minting',
        'Wrapped token issuance',
        'Multi-chain connectivity',
        'Validator or relayer networks',
        'Message passing',
        'Liquidity pools for fast exits',
        'Native asset bridging',
        'Cross-chain messaging'
    ],
    excludes = ARRAY[
        'Single-chain operations',
        'Centralized exchanges for cross-chain',
        'Atomic swaps (different mechanism)',
        'Layer 2 rollup bridges (canonical)'
    ],
    risk_factors = ARRAY[
        'Bridge smart contract exploits (highest risk category)',
        'Validator collusion',
        'Oracle manipulation',
        'Wrapped token backing issues',
        'Cross-chain replay attacks',
        'Liquidity fragmentation',
        'Admin key compromise'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Smart contract audits", "Validator security", "Multi-sig setup", "Oracle security"]},
        "A": {"weight": 0.25, "focus": ["Emergency pause", "Insurance fund", "Incident response", "Withdrawal limits"]},
        "F": {"weight": 0.25, "focus": ["Bridge history", "Team reputation", "TVL stability", "Audit frequency"]},
        "E": {"weight": 0.25, "focus": ["Supported chains", "Transfer speed", "Fees", "UX"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['bridge', 'cross-chain', 'multichain', 'wrapped', 'layerzero', 'wormhole', 'stargate', 'across', 'hop'],
    examples = ARRAY['LayerZero', 'Wormhole', 'Stargate', 'Across Protocol', 'Hop Protocol', 'Synapse'],
    is_hardware = FALSE,
    is_custodial = FALSE,
    version = '2.0'
WHERE code = 'Bridges';

-- ============================================================
-- DEFI TOOLS & ANALYTICS
-- ============================================================

UPDATE product_types SET
    definition = 'DeFi Tools & Analytics platforms provide portfolio tracking, yield analysis, risk assessment, and market data for DeFi users. They aggregate data across protocols and chains to give users visibility into their positions.',
    includes = ARRAY[
        'Portfolio tracking and aggregation',
        'Yield farming analytics',
        'Gas price tracking',
        'Transaction history',
        'Tax reporting tools',
        'Risk scoring',
        'Protocol analytics',
        'Wallet tracking',
        'Alert systems'
    ],
    excludes = ARRAY[
        'Direct trading or swapping',
        'Custodial services',
        'Asset management',
        'Protocol operation'
    ],
    risk_factors = ARRAY[
        'Wallet connection vulnerabilities',
        'Data accuracy issues',
        'Privacy concerns (wallet tracking)',
        'Phishing through fake tools',
        'API key exposure',
        'Incorrect tax calculations'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Wallet connection security", "Data handling", "No signing required", "API security"]},
        "A": {"weight": 0.25, "focus": ["Privacy features", "Data export", "Account recovery", "No custody risk"]},
        "F": {"weight": 0.25, "focus": ["Data accuracy", "Update frequency", "Company reputation", "Service uptime"]},
        "E": {"weight": 0.25, "focus": ["Chain coverage", "Protocol coverage", "Features", "UX"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['defi tools', 'analytics', 'portfolio', 'tracker', 'debank', 'zapper', 'zerion', 'nansen', 'dune'],
    examples = ARRAY['DeBank', 'Zapper', 'Zerion', 'Nansen', 'Dune Analytics', 'DeFiLlama'],
    is_hardware = FALSE,
    is_custodial = FALSE,
    version = '2.0'
WHERE code = 'DeFi Tools';

-- ============================================================
-- REAL WORLD ASSETS (RWA)
-- ============================================================

UPDATE product_types SET
    definition = 'Real World Assets (RWA) platforms tokenize traditional financial assets such as real estate, bonds, commodities, and private credit on blockchain. They bridge traditional finance with DeFi by bringing off-chain assets on-chain.',
    includes = ARRAY[
        'Tokenized securities',
        'Real estate tokenization',
        'Treasury bonds on-chain',
        'Private credit protocols',
        'Commodity tokenization',
        'Legal wrapper structures',
        'Compliance frameworks',
        'Dividend/yield distribution'
    ],
    excludes = ARRAY[
        'Pure crypto-native assets',
        'Algorithmic stablecoins',
        'NFT collectibles',
        'DeFi without real-world backing'
    ],
    risk_factors = ARRAY[
        'Regulatory uncertainty',
        'Legal enforceability of token rights',
        'Counterparty risk (asset custodians)',
        'Audit and verification challenges',
        'Liquidity constraints',
        'Jurisdiction complexities',
        'Asset valuation accuracy'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Smart contract security", "Oracle security", "Custody arrangements", "Access controls"]},
        "A": {"weight": 0.25, "focus": ["Legal structure", "Regulatory compliance", "Asset verification", "Insurance"]},
        "F": {"weight": 0.25, "focus": ["Legal entity reputation", "Audit history", "Track record", "Transparency"]},
        "E": {"weight": 0.25, "focus": ["Asset variety", "Yield rates", "Liquidity", "UX"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['RWA', 'real world assets', 'tokenized', 'treasury', 'bonds', 'real estate', 'ondo', 'maple', 'centrifuge'],
    examples = ARRAY['Ondo Finance', 'Maple Finance', 'Centrifuge', 'Goldfinch', 'TrueFi', 'Backed Finance'],
    is_hardware = FALSE,
    is_custodial = NULL,
    version = '2.0'
WHERE code = 'RWA';

-- ============================================================
-- CRYPTO BANKS
-- ============================================================

UPDATE product_types SET
    definition = 'A Crypto-Native Bank is a financial institution designed for the digital asset economy, offering banking services like accounts, payments, and lending while integrating cryptocurrency support. May be regulated as a bank or EMI.',
    includes = ARRAY[
        'Fiat and crypto accounts',
        'IBAN/bank account numbers',
        'Debit cards with crypto conversion',
        'Wire transfers and SEPA',
        'Crypto custody services',
        'Interest on deposits',
        'Loans against crypto collateral',
        'Regulatory licenses (banking, EMI)'
    ],
    excludes = ARRAY[
        'Non-custodial services',
        'Pure DeFi protocols',
        'Unlicensed operations',
        'Trading-only platforms'
    ],
    risk_factors = ARRAY[
        'Regulatory risk and license revocation',
        'Counterparty risk',
        'Insolvency (not always FDIC/FSCS insured)',
        'Crypto custody security',
        'Bank run scenarios',
        'Interest rate risk',
        'Compliance failures'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Custody security", "Account security", "2FA enforcement", "Insurance coverage"]},
        "A": {"weight": 0.25, "focus": ["Regulatory licenses", "Deposit insurance", "Jurisdiction", "Account recovery"]},
        "F": {"weight": 0.25, "focus": ["Company financials", "Regulatory standing", "Track record", "Transparency"]},
        "E": {"weight": 0.25, "focus": ["Services offered", "Supported currencies", "Fees", "UX"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['crypto bank', 'banking', 'IBAN', 'fiat', 'regulated', 'EMI', 'seba', 'sygnum', 'anchorage'],
    examples = ARRAY['SEBA Bank', 'Sygnum', 'Anchorage Digital', 'Revolut', 'Wirex'],
    is_hardware = FALSE,
    is_custodial = TRUE,
    version = '2.0'
WHERE code = 'Crypto Bank';

-- ============================================================
-- NON-CUSTODIAL CRYPTO CARDS
-- ============================================================

UPDATE product_types SET
    definition = 'A Non-Custodial Crypto Card allows users to spend cryptocurrency directly from their self-custody wallet without depositing funds to a centralized platform. The card converts crypto to fiat at the point of sale.',
    includes = ARRAY[
        'Direct wallet connection',
        'Real-time crypto-to-fiat conversion',
        'Self-custody of funds until spend',
        'Multiple wallet support',
        'Physical and/or virtual cards',
        'Spending limits and controls',
        'Transaction notifications',
        'Multi-chain support'
    ],
    excludes = ARRAY[
        'Pre-funded custodial cards',
        'Centralized balance holding',
        'Exchange-issued cards (custodial)',
        'Traditional debit cards'
    ],
    risk_factors = ARRAY[
        'Smart contract vulnerability in payment contract',
        'Price slippage during conversion',
        'Card provider insolvency',
        'Network congestion preventing payments',
        'Regulatory restrictions',
        'Merchant acceptance issues'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Wallet connection security", "Conversion contract audit", "Spending limits", "Anti-fraud"]},
        "A": {"weight": 0.25, "focus": ["No custody risk", "Card replacement", "Spending controls", "Privacy"]},
        "F": {"weight": 0.25, "focus": ["Card issuer reputation", "Service uptime", "Support quality", "Track record"]},
        "E": {"weight": 0.25, "focus": ["Supported chains", "Conversion fees", "Card fees", "UX"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['crypto card', 'non-custodial card', 'debit card', 'spend', 'gnosis pay', 'holyheld', 'metamask card'],
    examples = ARRAY['Gnosis Pay', 'Holyheld', 'Immersve', 'Monolith'],
    is_hardware = FALSE,
    is_custodial = FALSE,
    version = '2.0'
WHERE code = 'Card Non-Cust';

-- ============================================================
-- ANTI-COERCION PHYSICAL (AC Phys)
-- ============================================================

UPDATE product_types SET
    definition = 'Anti-Coercion Physical products are hardware devices or physical tools specifically designed to protect cryptocurrency holders against physical threats, coercion, and theft. They focus on real-world adversarial scenarios.',
    includes = ARRAY[
        'Duress PIN functionality',
        'Hidden wallet features',
        'Tamper-evident enclosures',
        'Self-destruct mechanisms',
        'Decoy displays',
        'Physical backup solutions (steel plates)',
        'Faraday protection',
        'Anti-forensic features'
    ],
    excludes = ARRAY[
        'Standard hardware wallets without anti-coercion',
        'Software-only solutions',
        'Basic backup tools',
        'Standard safes without crypto features'
    ],
    risk_factors = ARRAY[
        'Complexity leading to user lockout',
        'False sense of security',
        'Failure of anti-tamper mechanisms',
        'Limited testing against real threats',
        'Legal implications of duress features'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Underlying crypto security", "Duress mechanism security", "Key protection"]},
        "A": {"weight": 0.25, "focus": ["Coercion protection effectiveness", "Tamper resistance", "Plausible deniability", "Self-destruct reliability"]},
        "F": {"weight": 0.25, "focus": ["Build quality", "Durability", "Company reputation", "Testing history"]},
        "E": {"weight": 0.25, "focus": ["Ease of setup", "Daily usability", "Recovery process"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['anti-coercion', 'duress', 'physical protection', 'tamper', 'self-destruct', 'hidden wallet', 'steel backup'],
    examples = ARRAY['Coldcard (duress features)', 'Cryptosteel', 'Billfodl', 'SteelWallet'],
    is_hardware = TRUE,
    is_custodial = FALSE,
    version = '2.0'
WHERE code = 'AC Phys';

-- ============================================================
-- ANTI-COERCION DIGITAL (AC Digit)
-- ============================================================

UPDATE product_types SET
    definition = 'Anti-Coercion Digital products are software solutions designed to protect cryptocurrency holders against digital threats, surveillance, and forced disclosure. They focus on privacy and plausible deniability in digital contexts.',
    includes = ARRAY[
        'Hidden encrypted volumes',
        'Plausible deniability systems',
        'Decoy wallet software',
        'Privacy-focused wallets',
        'Encrypted communication',
        'Dead man switches',
        'Time-locked transactions',
        'Multi-party computation wallets'
    ],
    excludes = ARRAY[
        'Standard wallets without privacy features',
        'Hardware solutions',
        'Basic encryption tools',
        'VPNs alone (unless integrated)'
    ],
    risk_factors = ARRAY[
        'Software vulnerabilities',
        'User error in privacy setup',
        'Metadata leakage',
        'Legal risks of privacy tools',
        'Complexity of proper usage',
        'Key management across hidden systems'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Encryption strength", "Code audits", "Key management", "Zero-knowledge proofs"]},
        "A": {"weight": 0.25, "focus": ["Privacy effectiveness", "Plausible deniability", "Dead man switches", "Surveillance resistance"]},
        "F": {"weight": 0.25, "focus": ["Development activity", "Team reputation", "Open source status", "Audit history"]},
        "E": {"weight": 0.25, "focus": ["Usability", "Recovery options", "Integration with other tools"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['privacy', 'plausible deniability', 'hidden', 'encrypted', 'dead man switch', 'time-lock', 'zero knowledge'],
    examples = ARRAY['Wasabi Wallet', 'Samourai Wallet', 'Sparrow Wallet', 'VeraCrypt'],
    is_hardware = FALSE,
    is_custodial = FALSE,
    version = '2.0'
WHERE code = 'AC Digit';

-- ============================================================
-- ANTI-COERCION PHYGITAL (AC Phygi)
-- ============================================================

UPDATE product_types SET
    definition = 'Anti-Coercion Phygital products combine hardware and software elements to provide comprehensive protection against both physical and digital threats. They integrate physical security with digital privacy features.',
    includes = ARRAY[
        'Hardware wallet with advanced privacy software',
        'Air-gapped devices with privacy features',
        'Hardware-backed hidden wallets',
        'Combined physical and digital duress systems',
        'Multi-signature with distributed physical keys',
        'Geographically distributed key shares',
        'Hardware-enforced time locks'
    ],
    excludes = ARRAY[
        'Pure hardware solutions',
        'Pure software solutions',
        'Standard multi-sig without anti-coercion',
        'Basic backup strategies'
    ],
    risk_factors = ARRAY[
        'System complexity',
        'Integration vulnerabilities',
        'Single point of failure if poorly designed',
        'User error across multiple systems',
        'Maintenance complexity',
        'Recovery complexity'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Hardware security", "Software security", "Integration security", "Key protection"]},
        "A": {"weight": 0.25, "focus": ["Combined threat protection", "Redundancy", "Geographic distribution", "Recovery options"]},
        "F": {"weight": 0.25, "focus": ["System reliability", "Component quality", "Support", "Documentation"]},
        "E": {"weight": 0.25, "focus": ["Setup complexity", "Daily usability", "Maintenance burden"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['phygital', 'hybrid', 'combined security', 'multi-location', 'distributed keys', 'air-gapped privacy'],
    examples = ARRAY['Coldcard + Sparrow combo', 'Trezor + Wasabi', 'Multi-location Shamir setup'],
    is_hardware = NULL,
    is_custodial = FALSE,
    version = '2.0'
WHERE code = 'AC Phygi';

-- ============================================================
-- HARDWARE WALLET HOT (HW Hot)
-- ============================================================

UPDATE product_types SET
    definition = 'A Hardware Wallet Hot is a physical device that stores cryptocurrency private keys but is designed to be connected to the internet for regular transactions. It offers hardware-level security with the convenience of hot wallet functionality, typically via USB or Bluetooth.',
    includes = ARRAY[
        'Physical device with secure element',
        'USB or Bluetooth connectivity',
        'Regular internet connection for transactions',
        'Real-time portfolio management',
        'DApp and DeFi connectivity',
        'Physical transaction confirmation',
        'Firmware updates via internet',
        'Companion app integration'
    ],
    excludes = ARRAY[
        'Air-gapped operation (requires connection)',
        'Pure cold storage (designed for active use)',
        'Custodial services',
        'Exchange functionality'
    ],
    risk_factors = ARRAY[
        'Internet exposure during use',
        'Bluetooth vulnerabilities',
        'USB attack vectors',
        'Firmware update attacks',
        'Companion app compromises',
        'Physical theft while connected'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Secure Element", "Connection security", "Firmware signing", "Encryption"]},
        "A": {"weight": 0.25, "focus": ["Backup options", "Recovery mechanisms", "PIN protection", "Device locking"]},
        "F": {"weight": 0.25, "focus": ["Build quality", "Battery life", "Connectivity reliability", "Update frequency"]},
        "E": {"weight": 0.25, "focus": ["Supported chains", "DApp compatibility", "Transaction speed", "User interface"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['hardware wallet', 'hot wallet', 'connected', 'USB', 'bluetooth', 'ledger live', 'secure element'],
    examples = ARRAY['Ledger Nano X (connected mode)', 'Ledger Stax', 'Trezor Safe 3', 'GridPlus Lattice1'],
    is_hardware = TRUE,
    is_custodial = FALSE,
    version = '2.0'
WHERE code = 'HW Hot';

-- ============================================================
-- SOFTWARE WALLET MOBILE (SW Mobile)
-- ============================================================

UPDATE product_types SET
    definition = 'A Mobile Software Wallet is a smartphone application that stores cryptocurrency private keys on the mobile device. It offers portability and convenience for everyday transactions, with security dependent on device security and app implementation.',
    includes = ARRAY[
        'iOS or Android native app',
        'Private key storage on mobile device',
        'Biometric authentication (Face ID, fingerprint)',
        'QR code scanning for payments',
        'Push notifications for transactions',
        'WalletConnect for DApps',
        'Multi-chain support',
        'Token swaps and staking'
    ],
    excludes = ARRAY[
        'Hardware security modules',
        'Desktop-only features',
        'Browser extension functionality',
        'Custodial services'
    ],
    risk_factors = ARRAY[
        'Mobile malware and spyware',
        'SIM swapping attacks',
        'Device theft or loss',
        'Fake apps in app stores',
        'Screen capture malware',
        'Clipboard hijacking on mobile',
        'Backup to cloud vulnerabilities'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Key storage encryption", "Biometric integration", "App security", "Network security"]},
        "A": {"weight": 0.25, "focus": ["Cloud backup security", "Recovery options", "Multi-device sync", "Export options"]},
        "F": {"weight": 0.25, "focus": ["App stability", "Update frequency", "Developer reputation", "App store rating"]},
        "E": {"weight": 0.25, "focus": ["Supported networks", "Transaction speed", "Gas estimation", "User experience"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['mobile wallet', 'iOS', 'Android', 'smartphone', 'app', 'biometric', 'QR code', 'portable'],
    examples = ARRAY['Trust Wallet', 'Exodus Mobile', 'Rainbow', 'Argent', 'Coinbase Wallet', 'Blue Wallet'],
    is_hardware = FALSE,
    is_custodial = FALSE,
    version = '2.0'
WHERE code = 'SW Mobile';

-- ============================================================
-- BACKUP DIGITAL (Bkp Digital)
-- ============================================================

UPDATE product_types SET
    definition = 'A Digital Backup solution provides secure storage of cryptocurrency seed phrases and private keys in encrypted digital format. This includes password managers, encrypted files, cloud backup services with encryption, and digital secret sharing schemes.',
    includes = ARRAY[
        'Encrypted seed phrase storage',
        'Password manager integration',
        'Cloud backup with client-side encryption',
        'Digital secret sharing (Shamir)',
        'Encrypted USB drives',
        'Air-gapped digital backup devices',
        'Multi-location digital redundancy',
        'Version control for backups'
    ],
    excludes = ARRAY[
        'Physical/metal backups',
        'Paper wallets',
        'Hardware wallet storage',
        'Unencrypted cloud storage'
    ],
    risk_factors = ARRAY[
        'Encryption key management',
        'Cloud provider breaches',
        'Password manager vulnerabilities',
        'Digital decay and format obsolescence',
        'Access recovery complexity',
        'Centralized storage risks',
        'Inheritance access challenges'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Encryption strength", "Key derivation", "Zero-knowledge architecture", "Access controls"]},
        "A": {"weight": 0.25, "focus": ["Redundancy options", "Recovery procedures", "Multi-location support", "Inheritance features"]},
        "F": {"weight": 0.25, "focus": ["Service longevity", "Company reputation", "Data portability", "Standards compliance"]},
        "E": {"weight": 0.25, "focus": ["Ease of setup", "Recovery testing", "Platform support", "Integration options"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['backup', 'digital', 'encrypted', 'cloud', 'password manager', 'shamir', 'secret sharing', 'redundancy'],
    examples = ARRAY['1Password', 'Bitwarden', 'Trezor Suite backup', 'Unchained Capital Vault', 'Casa'],
    is_hardware = FALSE,
    is_custodial = FALSE,
    version = '2.0'
WHERE code = 'Bkp Digital';

-- ============================================================
-- BACKUP PHYSICAL (Bkp Physical)
-- ============================================================

UPDATE product_types SET
    definition = 'A Physical Backup solution provides durable, offline storage of cryptocurrency seed phrases using physical materials resistant to fire, water, and corrosion. Typically metal plates, capsules, or specialized devices designed for long-term seed phrase preservation.',
    includes = ARRAY[
        'Metal seed storage plates',
        'Stainless steel capsules',
        'Titanium backup devices',
        'Fire-resistant storage',
        'Water-resistant construction',
        'Tamper-evident seals',
        'Anti-corrosion materials',
        'Physical security features'
    ],
    excludes = ARRAY[
        'Digital storage',
        'Paper backups (not durable)',
        'Electronic devices',
        'Cloud solutions'
    ],
    risk_factors = ARRAY[
        'Physical theft',
        'Discovery by unauthorized parties',
        'Single point of failure (one location)',
        'Natural disasters at storage location',
        'Inheritance discovery issues',
        'Incorrect word stamping',
        'Physical deterioration over decades'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Tamper evidence", "Anti-theft features", "Discretion/concealment", "Construction security"]},
        "A": {"weight": 0.25, "focus": ["Fire resistance", "Water resistance", "Corrosion resistance", "Material durability"]},
        "F": {"weight": 0.25, "focus": ["Material quality", "Manufacturing precision", "Brand reputation", "Warranty"]},
        "E": {"weight": 0.25, "focus": ["Ease of stamping", "Word capacity", "Size/portability", "Instructions clarity"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['metal backup', 'steel plate', 'titanium', 'fire resistant', 'physical', 'seed storage', 'cryptosteel', 'billfodl'],
    examples = ARRAY['Cryptosteel Capsule', 'Billfodl', 'Blockplate', 'SteelWallet', 'Hodlr Swiss', 'Cobo Tablet'],
    is_hardware = TRUE,
    is_custodial = FALSE,
    version = '2.0'
WHERE code = 'Bkp Physical';

-- ============================================================
-- CUSTODIAL CRYPTO CARD (Card)
-- ============================================================

UPDATE product_types SET
    definition = 'A Custodial Crypto Card is a payment card (debit/credit) issued by a centralized provider that allows spending cryptocurrency at traditional merchants. The provider holds custody of funds and converts crypto to fiat at point of sale.',
    includes = ARRAY[
        'Visa or Mastercard branded card',
        'Custodial crypto storage',
        'Automatic crypto-to-fiat conversion',
        'Cashback rewards in crypto',
        'Mobile app for management',
        'Transaction tracking',
        'Spending limits and controls',
        'Virtual and physical cards'
    ],
    excludes = ARRAY[
        'Non-custodial solutions',
        'Direct blockchain payments',
        'Self-custody of funds',
        'Decentralized protocols'
    ],
    risk_factors = ARRAY[
        'Custodial counterparty risk',
        'Exchange rate volatility',
        'Service discontinuation',
        'Regulatory restrictions',
        'Account freezing',
        'KYC/AML requirements',
        'Hidden conversion fees'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Custody security", "2FA options", "Card security features", "Fraud protection"]},
        "A": {"weight": 0.25, "focus": ["Insurance coverage", "Fund recovery", "Geographic availability", "Backup cards"]},
        "F": {"weight": 0.25, "focus": ["Company financial health", "Regulatory compliance", "Track record", "User reviews"]},
        "E": {"weight": 0.25, "focus": ["Supported cryptos", "Reward rates", "Fee structure", "Spending limits"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['crypto card', 'debit card', 'credit card', 'visa', 'mastercard', 'cashback', 'spending', 'custodial'],
    examples = ARRAY['Crypto.com Card', 'Binance Card', 'Coinbase Card', 'Nexo Card', 'BlockFi Card'],
    is_hardware = FALSE,
    is_custodial = TRUE,
    version = '2.0'
WHERE code = 'Card';

-- ============================================================
-- PROTOCOL/STANDARD (Protocol)
-- ============================================================

UPDATE product_types SET
    definition = 'A Protocol or Standard is a set of rules, specifications, or best practices for cryptocurrency security, key management, or wallet implementation. These are reference documents, libraries, or frameworks that other products implement.',
    includes = ARRAY[
        'Security standards and frameworks',
        'Key derivation specifications (BIP32, BIP39, BIP44)',
        'Signature schemes and algorithms',
        'Best practice guidelines',
        'Implementation libraries',
        'Audit frameworks',
        'Certification programs',
        'Educational resources'
    ],
    excludes = ARRAY[
        'End-user products',
        'Consumer applications',
        'Trading platforms',
        'Custodial services'
    ],
    risk_factors = ARRAY[
        'Specification ambiguity',
        'Implementation errors by adopters',
        'Outdated recommendations',
        'Lack of maintenance',
        'Incomplete threat models',
        'Adoption fragmentation'
    ],
    evaluation_focus = '{
        "S": {"weight": 0.25, "focus": ["Cryptographic soundness", "Threat model completeness", "Peer review status", "Known vulnerabilities"]},
        "A": {"weight": 0.25, "focus": ["Backward compatibility", "Migration paths", "Recovery procedures", "Version management"]},
        "F": {"weight": 0.25, "focus": ["Community adoption", "Maintenance activity", "Organization backing", "Industry recognition"]},
        "E": {"weight": 0.25, "focus": ["Implementation clarity", "Reference implementations", "Documentation quality", "Tool support"]}
    }',
    pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}',
    keywords = ARRAY['protocol', 'standard', 'BIP', 'specification', 'framework', 'best practice', 'reference', 'guideline'],
    examples = ARRAY['BIP39', 'BIP32', 'SLIP39', 'CryptoCurrency Security Standard (CCSS)', 'OpenZeppelin'],
    is_hardware = FALSE,
    is_custodial = FALSE,
    version = '2.0'
WHERE code = 'Protocol';

-- ============================================================
-- STABLECOINS
-- ============================================================

INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, evaluation_focus, pillar_weights, keywords, examples, is_hardware, is_custodial, version)
VALUES (
    'Stablecoin',
    'Stablecoin',
    'Stablecoin',
    'DeFi',
    'A Stablecoin is a cryptocurrency designed to maintain a stable value relative to a reference asset (usually USD). Mechanisms include fiat reserves, crypto collateral, or algorithmic supply adjustment.',
    ARRAY[
        'Fiat-backed (USDC, USDT)',
        'Crypto-collateralized (DAI)',
        'Algorithmic (FRAX)',
        'Commodity-backed (PAXG)',
        'Reserve management',
        'Minting and redemption mechanisms',
        'Peg maintenance systems',
        'Attestations and audits'
    ],
    ARRAY[
        'Volatile cryptocurrencies',
        'Equity tokens',
        'Wrapped assets (different category)',
        'Synthetic non-stable assets'
    ],
    ARRAY[
        'Depeg risk',
        'Reserve backing uncertainty',
        'Regulatory seizure of reserves',
        'Bank run scenarios',
        'Oracle manipulation (crypto-backed)',
        'Smart contract risk',
        'Counterparty risk (issuers)'
    ],
    '{
        "S": {"weight": 0.25, "focus": ["Smart contract security", "Minting mechanism", "Oracle security", "Access controls"]},
        "A": {"weight": 0.25, "focus": ["Reserve transparency", "Redemption mechanisms", "Regulatory compliance", "Insurance"]},
        "F": {"weight": 0.25, "focus": ["Issuer reputation", "Audit history", "Reserve attestations", "Track record"]},
        "E": {"weight": 0.25, "focus": ["Chain availability", "Liquidity", "DeFi integrations", "Transfer speed"]}
    }',
    '{"S": 25, "A": 25, "F": 25, "E": 25}',
    ARRAY['stablecoin', 'stable', 'USDC', 'USDT', 'DAI', 'FRAX', 'peg', 'dollar', 'reserve'],
    ARRAY['USDC', 'USDT', 'DAI', 'FRAX', 'PYUSD', 'LUSD'],
    FALSE,
    NULL,
    '2.0'
) ON CONFLICT (code) DO UPDATE SET
    definition = EXCLUDED.definition,
    includes = EXCLUDED.includes,
    excludes = EXCLUDED.excludes,
    risk_factors = EXCLUDED.risk_factors,
    evaluation_focus = EXCLUDED.evaluation_focus,
    pillar_weights = EXCLUDED.pillar_weights,
    keywords = EXCLUDED.keywords,
    examples = EXCLUDED.examples,
    version = EXCLUDED.version;

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pt_code ON product_types(code);
CREATE INDEX IF NOT EXISTS idx_pt_category ON product_types(category);
CREATE INDEX IF NOT EXISTS idx_pt_is_hardware ON product_types(is_hardware);
CREATE INDEX IF NOT EXISTS idx_pt_is_custodial ON product_types(is_custodial);

-- ============================================================
-- 4. VIEW: Product Type Summary
-- ============================================================

CREATE OR REPLACE VIEW v_product_type_summary AS
SELECT
    code,
    name,
    category,
    LEFT(definition, 100) || '...' as short_definition,
    array_length(includes, 1) as includes_count,
    array_length(risk_factors, 1) as risk_count,
    pillar_weights,
    is_hardware,
    is_custodial,
    version
FROM product_types
ORDER BY category, name;

-- ============================================================
-- 5. FUNCTION: Get Pillar Weights for Product
-- ============================================================

CREATE OR REPLACE FUNCTION get_pillar_weights(p_product_type_code VARCHAR)
RETURNS JSONB AS $$
DECLARE
    v_weights JSONB;
BEGIN
    SELECT pillar_weights INTO v_weights
    FROM product_types
    WHERE code = p_product_type_code;

    -- Default weights if not found
    IF v_weights IS NULL THEN
        v_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}';
    END IF;

    RETURN v_weights;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. COMMENTS
-- ============================================================

COMMENT ON COLUMN product_types.definition IS 'Clear definition of what this product type is';
COMMENT ON COLUMN product_types.includes IS 'Features and aspects included in this type';
COMMENT ON COLUMN product_types.excludes IS 'What this type does NOT include (for clarity)';
COMMENT ON COLUMN product_types.risk_factors IS 'Key risk factors specific to this product type';
COMMENT ON COLUMN product_types.evaluation_focus IS 'How each SAFE pillar should be weighted and what to focus on';
COMMENT ON COLUMN product_types.pillar_weights IS 'SAFE pillar weights for scoring (S, A, F, E percentages)';
COMMENT ON COLUMN product_types.is_hardware IS 'TRUE if physical device, FALSE if software, NULL if hybrid';
COMMENT ON COLUMN product_types.is_custodial IS 'TRUE if custodial, FALSE if non-custodial, NULL if varies';

-- ============================================================
-- 7. VERIFICATION
-- ============================================================

SELECT
    code,
    name,
    category,
    CASE WHEN definition IS NOT NULL THEN 'Yes' ELSE 'No' END as has_definition,
    array_length(includes, 1) as includes_count,
    array_length(risk_factors, 1) as risks_count,
    is_hardware,
    is_custodial,
    version
FROM product_types
ORDER BY category, name;

-- ============================================================
-- END OF SCRIPT
-- ============================================================

SELECT 'Product Type Definitions v2.0 updated successfully!' as status;
