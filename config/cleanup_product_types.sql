-- ============================================================
-- CLEANUP & COMPLETE DEFINITIONS - product_types
-- ============================================================
-- Complete script with all information for each type
-- Execute in Supabase SQL Editor
-- ============================================================

-- STEP 1: Backup
CREATE TABLE IF NOT EXISTS product_types_backup AS SELECT * FROM product_types;

-- STEP 2: Clear and reset
TRUNCATE product_types RESTART IDENTITY CASCADE;

-- STEP 2.5: Add is_safe_applicable column if not exists
-- TRUE = SAFE cryptographic security score applies (manages keys/assets)
-- FALSE = SAFE score not applicable (read-only, services, no asset custody)
ALTER TABLE product_types ADD COLUMN IF NOT EXISTS is_safe_applicable BOOLEAN DEFAULT TRUE;

-- ============================================================
-- STEP 3: INSERT 60 TYPES WITH COMPLETE DEFINITIONS
-- ============================================================

-- ============================================================
-- CATEGORY: HARDWARE (2 types)
-- ============================================================

INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'HW Cold',
    'Hardware Wallet Cold',
    'Hardware Wallet Cold',
    'Hardware',
    'Physical device that stores private keys offline in a Secure Element chip. Requires physical confirmation to sign transactions. Offers the highest level of security for self-custody by isolating keys from internet-connected devices.',
    ARRAY[
        'Offline storage (air-gapped)',
        'Certified Secure Element chip (EAL5+/EAL6+)',
        'Physical transaction confirmation (buttons, screen)',
        'Offline key generation',
        'Seed phrase backup (BIP39)',
        'Signed firmware updates',
        'Multi-cryptocurrency support',
        'PIN protection with wipe after failed attempts'
    ],
    ARRAY[
        'Permanent internet connection',
        'Custodial services',
        'Trading or exchange functions',
        'Cloud key storage'
    ],
    ARRAY[
        'Supply chain attacks (compromised devices)',
        'Firmware vulnerabilities',
        'Physical theft without PIN',
        'Memory extraction (models without Secure Element)',
        'Device loss/destruction',
        'Manufacturer discontinuation'
    ],
    ARRAY['Ledger Nano X', 'Ledger Nano S Plus', 'Trezor Model T', 'Trezor Safe 3', 'Coldcard Mk4', 'BitBox02', 'Keystone Pro'],
    ARRAY['hardware wallet', 'cold storage', 'cold wallet', 'secure element', 'offline', 'ledger', 'trezor', 'coldcard', 'bitbox', 'air-gapped'],
    TRUE,
    FALSE,
    TRUE
);
-- NOTE: "HW Hot" removed - Not standard industry terminology
-- Hardware wallets are by definition "cold storage" (offline)
-- Hot wallets are software-based (always connected to internet)
-- Products previously typed as "HW Hot" should use "HW Cold" instead

-- ============================================================
-- CATEGORY: SOFTWARE (6 types)
-- ============================================================

INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'SW Browser',
    'Browser Extension Wallet',
    'Browser Extension Wallet',
    'Software',
    'Browser extension that stores private keys and allows interaction with DApps directly from the browser. Primary interface for Web3 and DeFi applications. Keys are encrypted locally with user password.',
    ARRAY[
        'Chrome/Firefox/Brave extension',
        'Direct DApp connection',
        'In-browser transaction signing',
        'WalletConnect support',
        'Multi-account management',
        'Pre-transaction risk detection (Rabby)',
        'Seed phrase import/export',
        'Multiple EVM network support'
    ],
    ARRAY[
        'Hardware security',
        'Offline storage',
        'Custodial services'
    ],
    ARRAY[
        'Malware and keyloggers on device',
        'Malicious browser extensions',
        'Phishing attacks',
        'Malicious websites',
        'Password weakness (40 bits average)',
        'Supply chain vulnerabilities',
        'Data theft via QR code sync',
        'Clipboard hijacking'
    ],
    ARRAY['MetaMask', 'Rabby Wallet', 'Phantom', 'Rainbow', 'Coinbase Wallet', 'Frame', 'Zerion'],
    ARRAY['browser wallet', 'extension', 'metamask', 'rabby', 'web3', 'dapp', 'chrome extension', 'EVM'],
    FALSE,
    FALSE,
    TRUE
),
(
    'SW Mobile',
    'Mobile Wallet',
    'Mobile Wallet',
    'Software',
    'Smartphone application (iOS/Android) that stores private keys on the mobile device. Offers portability and convenience for daily transactions with biometric authentication. Security depends on device security.',
    ARRAY[
        'Native iOS and Android app',
        'Biometric authentication (Face ID, fingerprint)',
        'QR code scanning for payments',
        'Push notifications for transactions',
        'WalletConnect for DApps',
        'Multi-chain support',
        'Integrated swaps and staking',
        'Encrypted cloud backup (optional)'
    ],
    ARRAY[
        'Hardware security modules',
        'Desktop-only features',
        'Custodial services'
    ],
    ARRAY[
        'Mobile malware and spyware',
        'SIM swapping attacks',
        'Device theft or loss',
        'Fake apps on stores',
        'Screen capture malware',
        'Mobile clipboard hijacking',
        'Cloud backup vulnerabilities',
        'Unauthorized access if device unlocked'
    ],
    ARRAY['Trust Wallet', 'Exodus Mobile', 'Rainbow', 'Argent', 'Coinbase Wallet', 'Blue Wallet', 'Phantom Mobile', 'Zerion'],
    ARRAY['mobile wallet', 'iOS', 'Android', 'smartphone', 'app', 'biometric', 'QR code', 'portable', 'trust wallet'],
    FALSE,
    FALSE,
    TRUE
),
(
    'MPC Wallet',
    'MPC Wallet',
    'MPC Wallet',
    'Software',
    'Wallet using Multi-Party Computation to split private keys into multiple shares across different parties or devices. No single point has the complete key, enabling keyless signing without seed phrase exposure.',
    ARRAY[
        'Distributed key generation (DKG)',
        'Threshold signatures (TSS)',
        'No single point of key exposure',
        'Keyless user experience',
        'Social/cloud recovery options',
        'Cross-device key shares',
        'Biometric authentication',
        'No seed phrase required'
    ],
    ARRAY[
        'Traditional seed phrase wallets',
        'Hardware wallets with full key',
        'Simple hot wallets',
        'Multi-sig (different architecture)'
    ],
    ARRAY[
        'MPC protocol vulnerabilities',
        'Key share compromise across parties',
        'Recovery mechanism weaknesses',
        'Vendor dependency for key shares',
        'Complex cryptographic implementation',
        'Collusion between share holders',
        'Network latency affecting signing'
    ],
    ARRAY['ZenGo', 'Fireblocks MPC', 'Coinbase WaaS', 'Dfns', 'Liminal', 'Fordefi', 'Qredo'],
    ARRAY['MPC', 'multi-party computation', 'threshold signature', 'TSS', 'keyless', 'zengo', 'distributed key'],
    FALSE,
    FALSE,
    TRUE
),
(
    'MultiSig',
    'MultiSig Wallet',
    'MultiSig Wallet',
    'Software',
    'Wallet requiring multiple signatures (M-of-N) to authorize transactions. Keys are held by different parties or devices, providing shared control and eliminating single points of failure.',
    ARRAY[
        'M-of-N signature threshold',
        'Multiple independent signers',
        'On-chain verification',
        'Transaction proposals and approvals',
        'Spending policies and limits',
        'Signer management',
        'Hardware wallet integration',
        'Timelock and recovery options'
    ],
    ARRAY[
        'Single-signature wallets',
        'MPC wallets (different architecture)',
        'Custodial solutions',
        'Social recovery wallets'
    ],
    ARRAY[
        'Signer coordination complexity',
        'Key loss if threshold not met',
        'Smart contract vulnerabilities (for smart contract multisigs)',
        'Higher transaction fees (multiple sigs)',
        'Social engineering across signers',
        'Signer availability issues',
        'Recovery complexity'
    ],
    ARRAY['Safe (Gnosis Safe)', 'Casa', 'Unchained', 'Electrum Multisig', 'Caravan', 'Sparrow Multisig', 'Nunchuk'],
    ARRAY['multisig', 'multi-signature', 'M-of-N', 'safe', 'gnosis', 'threshold', 'shared custody', 'collaborative'],
    FALSE,
    FALSE,
    TRUE
),
(
    'SW Desktop',
    'Desktop Wallet',
    'Desktop Wallet',
    'Software',
    'Standalone application installed on desktop computer (Windows, macOS, Linux) for managing cryptocurrency. Offers full-featured interface with local key storage, often supporting multiple assets and advanced features.',
    ARRAY[
        'Native desktop application',
        'Local encrypted key storage',
        'Multi-cryptocurrency support',
        'Built-in exchange/swap features',
        'Portfolio tracking',
        'Hardware wallet integration',
        'Full node connection option',
        'Backup and restore functionality'
    ],
    ARRAY[
        'Browser extensions',
        'Mobile-only wallets',
        'Web-based wallets',
        'Custodial services'
    ],
    ARRAY[
        'Desktop malware and keyloggers',
        'Unencrypted memory exposure',
        'System compromise',
        'Backup file theft',
        'Phishing via fake downloads',
        'Auto-update vulnerabilities',
        'Operating system vulnerabilities',
        'Physical access to unlocked computer'
    ],
    ARRAY['Exodus', 'Electrum', 'Sparrow', 'Atomic Wallet', 'Wasabi', 'Ledger Live', 'Trezor Suite', 'Bitcoin Core'],
    ARRAY['desktop wallet', 'software wallet', 'exodus', 'electrum', 'sparrow', 'atomic', 'PC wallet', 'Mac wallet'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Smart Wallet',
    'Smart Contract Wallet (AA)',
    'Smart Contract Wallet (AA)',
    'Software',
    'Wallet powered by smart contracts using Account Abstraction (ERC-4337). Enables advanced features like social recovery, gasless transactions, session keys, and batched operations without seed phrase dependency.',
    ARRAY[
        'Account Abstraction (ERC-4337)',
        'Social recovery options',
        'Gasless/sponsored transactions',
        'Session keys for DApps',
        'Batched transactions',
        'Spending limits and guards',
        'Multi-factor authentication',
        'Programmable security rules'
    ],
    ARRAY[
        'Traditional EOA wallets',
        'Hardware wallets (different architecture)',
        'MPC wallets (different key management)',
        'Basic browser extensions'
    ],
    ARRAY[
        'Smart contract vulnerabilities',
        'Bundler/paymaster centralization',
        'Recovery mechanism compromise',
        'Gas sponsorship failures',
        'Upgrade mechanism risks',
        'Guardian collusion (social recovery)',
        'Dependency on AA infrastructure',
        'Cross-chain complexity'
    ],
    ARRAY['Argent', 'Sequence', 'Privy', 'Safe (AA mode)', 'Biconomy', 'ZeroDev', 'Stackup', 'Alchemy Account Kit'],
    ARRAY['smart wallet', 'account abstraction', 'AA', 'ERC-4337', 'social recovery', 'gasless', 'argent', 'smart contract wallet'],
    FALSE,
    FALSE,
    TRUE
);

-- ============================================================
-- CATEGORY: BACKUP (2 types)
-- ============================================================

INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'Bkp Digital',
    'Digital Backup',
    'Digital Backup',
    'Backup',
    'Secure storage solution for seed phrases and private keys in encrypted digital format. Includes password managers, encrypted files, cloud services with client-side encryption, and secret sharing schemes (Shamir).',
    ARRAY[
        'Encrypted seed phrase storage',
        'Password manager integration',
        'Cloud backup with client encryption',
        'Shamir secret sharing (SLIP39)',
        'Encrypted USB drives',
        'Multi-location redundancy',
        'Backup version control',
        'Inheritance features'
    ],
    ARRAY[
        'Physical/metal backups',
        'Paper wallets',
        'Unencrypted cloud storage'
    ],
    ARRAY[
        'Encryption key management',
        'Cloud provider breaches',
        'Password manager vulnerabilities',
        'Digital decay and obsolescence',
        'Access recovery complexity',
        'Centralized storage risks',
        'Inheritance access challenges'
    ],
    ARRAY['1Password', 'Bitwarden', 'Trezor Suite backup', 'Casa', 'Unchained', 'Keeper'],
    ARRAY['backup', 'digital', 'encrypted', 'cloud', 'password manager', 'shamir', 'SLIP39', 'secret sharing'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Bkp Physical',
    'Physical Backup (Metal)',
    'Physical Backup (Metal)',
    'Backup',
    'Durable physical storage for seed phrases using fire, water, and corrosion resistant materials. Typically steel plates, capsules, or specialized devices designed for long-term preservation.',
    ARRAY[
        'Stainless steel plates (316 marine grade)',
        'Titanium capsules',
        'Fire resistance (>1500°C)',
        'Water and corrosion resistance',
        'Tamper-evident seals',
        'Tile or punch system',
        '12-24 word capacity',
        'Compact and discreet'
    ],
    ARRAY[
        'Digital storage',
        'Paper wallets (not durable)',
        'Electronic devices',
        'Cloud solutions'
    ],
    ARRAY[
        'Physical theft',
        'Discovery by unauthorized parties',
        'Single point of failure (one location)',
        'Natural disasters at storage location',
        'Inheritance discovery issues',
        'Stamping/punching errors',
        'Deterioration over decades'
    ],
    ARRAY['Cryptosteel Capsule', 'Billfodl', 'Blockplate', 'SteelWallet', 'Hodlr Swiss', 'Cobo Tablet', 'Coldti'],
    ARRAY['metal backup', 'steel plate', 'titanium', 'fire resistant', 'seed storage', 'cryptosteel', 'billfodl', 'indestructible'],
    TRUE,
    FALSE,
    TRUE
);

-- ============================================================
-- CATEGORY: EXCHANGE (6 types: CEX, DEX, DEX Agg, OTC, NFT Market, Atomic Swap)
-- ============================================================

INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'CEX',
    'Centralized Exchange',
    'Centralized Exchange',
    'Exchange',
    'Custodial trading platform operated by a company that holds user funds and facilitates trading via centralized order book. Users trust the exchange with custody of their assets. Offers high liquidity and simple interface.',
    ARRAY[
        'Custodial wallet services',
        'Spot, margin, futures trading',
        'Fiat ramps (wire, card)',
        'KYC/AML compliance',
        'Customer support',
        'Insurance funds (some)',
        'Staking and earn products',
        'API for trading bots',
        'Mobile and web apps'
    ],
    ARRAY[
        'User control of private keys',
        'Non-custodial trading',
        'Anonymous trading (KYC required)'
    ],
    ARRAY[
        'Hacks and security breaches (Mt. Gox, FTX)',
        'Insolvency and bankruptcy',
        'Regulatory actions and account freezes',
        'Withdrawal restrictions',
        'Internal fraud',
        'Hot wallet exposure',
        'Proof of reserves validity',
        'Counterparty risk'
    ],
    ARRAY['Binance', 'Coinbase', 'Kraken', 'OKX', 'Bybit', 'Crypto.com', 'Bitstamp', 'Gemini'],
    ARRAY['CEX', 'centralized exchange', 'exchange', 'trading', 'binance', 'coinbase', 'kraken', 'KYC', 'custodial'],
    FALSE,
    TRUE,
    TRUE
),
(
    'DEX',
    'Decentralized Exchange',
    'Decentralized Exchange',
    'Exchange',
    'Non-custodial trading platform using smart contracts for peer-to-peer exchange directly from user wallets. Users maintain full control of funds throughout the trading process.',
    ARRAY[
        'AMM (Automated Market Maker) or on-chain order book',
        'Smart contract trading',
        'Liquidity pools',
        'Swaps without intermediary custody',
        'Yield farming and liquidity mining',
        'Governance tokens',
        'Cross-chain swaps (some)',
        'DEX aggregation (multi-DEX routing)'
    ],
    ARRAY[
        'Custodial fund storage',
        'KYC/AML requirements (usually)',
        'Direct fiat ramps',
        'Centralized order matching'
    ],
    ARRAY[
        'Smart contract vulnerabilities',
        'Impermanent loss for LPs',
        'Front-running and MEV attacks',
        'Rug pulls on new tokens',
        'Oracle manipulation',
        'Flash loan attacks',
        'Bridge exploits for cross-chain',
        'High slippage on low liquidity'
    ],
    ARRAY['Uniswap', 'Curve Finance', 'PancakeSwap', 'SushiSwap', 'dYdX', 'Raydium', 'Orca'],
    ARRAY['DEX', 'decentralized exchange', 'AMM', 'swap', 'liquidity pool', 'uniswap', 'defi', 'non-custodial'],
    FALSE,
    FALSE,
    TRUE
),
(
    'DEX Agg',
    'DEX Aggregator',
    'DEX Aggregator',
    'Exchange',
    'Service that aggregates liquidity from multiple DEXs to find optimal swap routes. Splits orders across protocols to minimize slippage and maximize returns. Does not hold liquidity but routes trades.',
    ARRAY[
        'Multi-DEX routing',
        'Split order execution',
        'Gas optimization',
        'Price comparison across DEXs',
        'MEV protection features',
        'Limit order functionality',
        'Cross-protocol arbitrage',
        'Best price discovery'
    ],
    ARRAY[
        'Single DEX trading',
        'Liquidity provision',
        'CEX trading',
        'Cross-chain aggregation (different type)'
    ],
    ARRAY[
        'Smart contract vulnerabilities',
        'Routing algorithm errors',
        'Stale price data',
        'Failed transactions',
        'MEV extraction on routes',
        'Gas estimation failures',
        'Partial fill losses',
        'Protocol dependency risks'
    ],
    ARRAY['1inch', 'Paraswap', 'Matcha', 'Jupiter', 'CowSwap', 'OpenOcean', 'KyberSwap', 'Odos'],
    ARRAY['aggregator', '1inch', 'paraswap', 'jupiter', 'swap', 'routing', 'best price', 'DEX aggregator'],
    FALSE,
    FALSE,
    TRUE
),
(
    'OTC',
    'OTC / P2P Trading',
    'OTC / P2P Trading',
    'Exchange',
    'Over-the-counter or peer-to-peer trading platform enabling direct trades between buyers and sellers. Often used for large trades to avoid slippage, or for fiat-to-crypto with local payment methods.',
    ARRAY[
        'Direct buyer-seller matching',
        'Escrow services',
        'Multiple payment methods',
        'Local currency support',
        'Reputation systems',
        'Trade dispute resolution',
        'Large block trades',
        'Privacy-focused trading',
        'No order book slippage'
    ],
    ARRAY[
        'Order book exchanges',
        'AMM DEXs',
        'Institutional dark pools',
        'Automated trading'
    ],
    ARRAY[
        'Counterparty fraud',
        'Escrow failures',
        'Payment reversal scams',
        'Price manipulation',
        'Identity theft',
        'Regulatory enforcement',
        'Money laundering exposure',
        'Platform exit scams'
    ],
    ARRAY['Paxful', 'Bisq', 'Hodl Hodl', 'Binance P2P', 'OKX P2P', 'Remitano', 'AgoraDesk', 'Noones'],
    ARRAY['OTC', 'P2P', 'peer-to-peer', 'escrow', 'local', 'direct trade', 'cash', 'private'],
    FALSE,
    NULL,
    TRUE
),
(
    'Atomic Swap',
    'Atomic Swap / Cross-Chain DEX',
    'Atomic Swap / Cross-Chain DEX',
    'Exchange',
    'Trustless peer-to-peer exchange of cryptocurrencies across different blockchains using hash time-locked contracts (HTLCs). No intermediary holds funds; either both parties receive their assets or the trade is cancelled.',
    ARRAY[
        'Hash time-locked contracts (HTLCs)',
        'Cross-chain trading without bridges',
        'Trustless execution',
        'No custodial risk',
        'Multi-chain liquidity pools',
        'Streaming swaps (THORChain)',
        'Native asset trading',
        'Decentralized orderbook'
    ],
    ARRAY[
        'Centralized exchanges',
        'Bridge-based cross-chain',
        'Wrapped assets',
        'Single-chain DEXs'
    ],
    ARRAY[
        'Liquidity fragmentation',
        'Smart contract vulnerabilities',
        'Timeout/refund complexity',
        'Front-running on destination chain',
        'Slippage on large trades',
        'Limited trading pairs',
        'Network congestion issues',
        'Impermanent loss for LPs'
    ],
    ARRAY['THORChain', 'Komodo', 'Liquality', 'AtomicDEX', 'Portal (Wormhole)', 'Chainflip', 'Maya Protocol'],
    ARRAY['atomic swap', 'cross-chain', 'HTLC', 'thorchain', 'trustless', 'native swap', 'decentralized exchange'],
    FALSE,
    FALSE,
    TRUE
);

-- ============================================================
-- CATEGORY: DEFI (19 types: AMM, Lending, Yield, Liq Staking, Restaking, Derivatives, Perps, Options, Synthetics, Index, Locker, Vesting, etc.)
-- ============================================================

INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'AMM',
    'AMM / Liquidity Provider',
    'AMM / Liquidity Provider',
    'DeFi',
    'Providing liquidity to Automated Market Maker pools in exchange for trading fees and rewards. LPs deposit token pairs into pools and receive LP tokens representing their share. Subject to impermanent loss.',
    ARRAY[
        'Liquidity pool deposits',
        'LP token issuance',
        'Trading fee distribution',
        'Concentrated liquidity (v3)',
        'Liquidity mining rewards',
        'Range orders',
        'Single-sided liquidity',
        'Multi-asset pools'
    ],
    ARRAY[
        'Trading/swapping on DEX',
        'Yield farming (separate layer)',
        'Staking tokens',
        'Lending protocols'
    ],
    ARRAY[
        'Impermanent loss',
        'Smart contract vulnerabilities',
        'Rug pulls (token value collapse)',
        'LP token exploits',
        'High gas costs for rebalancing',
        'Concentrated liquidity range risks',
        'Protocol fee changes',
        'MEV sandwich attacks on LPs'
    ],
    ARRAY['Uniswap LP', 'Curve LP', 'Balancer LP', 'SushiSwap LP', 'PancakeSwap LP', 'Raydium LP', 'Trader Joe', 'Velodrome'],
    ARRAY['AMM', 'liquidity provider', 'LP', 'liquidity pool', 'impermanent loss', 'uniswap', 'curve', 'farming'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Lending',
    'DeFi Lending Protocol',
    'DeFi Lending Protocol',
    'DeFi',
    'Decentralized platform enabling users to lend crypto assets to earn interest or borrow against collateral via smart contracts, without traditional financial intermediaries.',
    ARRAY[
        'Over-collateralized borrowing',
        'Interest-bearing deposits',
        'Liquidation mechanisms',
        'Variable and stable rates',
        'Flash loans',
        'Governance tokens',
        'Multi-collateral support',
        'Interest rate models'
    ],
    ARRAY[
        'Unsecured loans',
        'Traditional credit scoring',
        'Fiat currency loans',
        'Custodial fund management'
    ],
    ARRAY[
        'Smart contract exploits',
        'Oracle manipulation attacks',
        'Cascading liquidations',
        'Bad debt accumulation',
        'Governance attacks',
        'Interest rate model failures',
        'Collateral token depeg'
    ],
    ARRAY['Aave', 'Compound', 'MakerDAO', 'Spark Protocol', 'Venus', 'Benqi', 'Morpho'],
    ARRAY['lending', 'borrowing', 'collateral', 'interest', 'aave', 'compound', 'liquidation', 'CDP', 'flash loan'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Yield',
    'Yield Aggregator',
    'Yield Aggregator',
    'DeFi',
    'DeFi protocol that automatically optimizes yield farming strategies across multiple protocols to maximize returns. Automates the process of moving funds between different yield opportunities.',
    ARRAY[
        'Auto-compounding rewards',
        'Strategy vaults',
        'Multi-protocol optimization',
        'Gas cost optimization',
        'Harvest automation',
        'Performance fees',
        'Strategy diversification',
        'Yield comparison tools'
    ],
    ARRAY[
        'Direct lending (aggregates lending protocols)',
        'Manual yield farming',
        'Custodial management',
        'Guaranteed returns'
    ],
    ARRAY[
        'Strategy smart contract bugs',
        'Underlying protocol failures',
        'Composability risk (multiple protocols)',
        'Impermanent loss in LP strategies',
        'Strategy manipulation',
        'Admin key compromise',
        'Cross-protocol oracle failures'
    ],
    ARRAY['Yearn Finance', 'Beefy Finance', 'Convex Finance', 'Harvest Finance', 'Sommelier', 'Concentrator'],
    ARRAY['yield', 'aggregator', 'vault', 'auto-compound', 'yearn', 'beefy', 'convex', 'strategy', 'APY'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Liq Staking',
    'Liquid Staking',
    'Liquid Staking',
    'DeFi',
    'Protocol enabling users to stake proof-of-stake tokens while receiving a liquid derivative token (LST) representing their staked position. Allows earning staking rewards while maintaining liquidity.',
    ARRAY[
        'Staking derivative tokens (stETH, rETH, etc.)',
        'Staking rewards distribution',
        'Validator node operation',
        'Unstaking/withdrawal mechanisms',
        'DeFi composability of LSTs',
        'Slashing protection',
        'Distributed validator sets',
        'Governance participation'
    ],
    ARRAY[
        'Direct validator operation by user',
        'Locked staking without liquidity',
        'Custodial staking services',
        'Non-tokenized staking'
    ],
    ARRAY[
        'Validator slashing events',
        'LST depeg vs underlying',
        'Smart contract vulnerabilities',
        'Stake centralization',
        'Withdrawal queue delays',
        'Oracle price manipulation',
        'Regulatory classification uncertainty'
    ],
    ARRAY['Lido Finance', 'Rocket Pool', 'Coinbase cbETH', 'Frax ETH', 'Ankr', 'Swell', 'EigenLayer'],
    ARRAY['liquid staking', 'LST', 'stETH', 'rETH', 'lido', 'rocket pool', 'staking derivative', 'validator', 'restaking'],
    FALSE,
    NULL,
    TRUE
),
(
    'Derivatives',
    'DeFi Derivatives',
    'DeFi Derivatives',
    'DeFi',
    'Platform enabling decentralized trading of financial derivatives including perpetual futures, options, and synthetic assets via smart contracts, without centralized intermediaries.',
    ARRAY[
        'Perpetual futures contracts',
        'Options trading',
        'Synthetic assets',
        'Leveraged trading',
        'Funding rate mechanisms',
        'Liquidation engines',
        'Oracle price feeds',
        'Cross-margin and isolated margin'
    ],
    ARRAY[
        'Spot trading only',
        'Centralized order matching',
        'Traditional regulated derivatives',
        'Custodial margin management'
    ],
    ARRAY[
        'Oracle manipulation for liquidations',
        'Smart contract exploits',
        'Cascading liquidations',
        'Funding rate attacks',
        'Insurance fund depletion',
        'Synthetic asset depeg',
        'Losses amplified by high leverage'
    ],
    ARRAY['dYdX', 'GMX', 'Gains Network', 'Synthetix', 'Perpetual Protocol', 'Kwenta', 'Vertex', 'Hyperliquid'],
    ARRAY['derivatives', 'perpetual', 'futures', 'options', 'leverage', 'synthetic', 'dydx', 'gmx', 'perps'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Bridges',
    'Cross-Chain Bridge',
    'Cross-Chain Bridge',
    'Infrastructure',
    'Protocol enabling transfer of assets and data between different blockchain networks. Bridges lock assets on one chain and mint equivalent representations on another, enabling cross-chain interoperability.',
    ARRAY[
        'Asset locking and minting',
        'Wrapped token issuance',
        'Multi-chain connectivity',
        'Validator or relayer networks',
        'Message passing',
        'Liquidity pools for fast exits',
        'Native asset bridging',
        'Cross-chain messaging'
    ],
    ARRAY[
        'Single-chain operations',
        'Centralized exchanges for cross-chain',
        'Atomic swaps (different mechanism)',
        'Canonical L2 rollup bridges'
    ],
    ARRAY[
        'Bridge smart contract exploits (highest risk)',
        'Validator collusion',
        'Oracle manipulation',
        'Wrapped token backing issues',
        'Cross-chain replay attacks',
        'Liquidity fragmentation',
        'Admin key compromise'
    ],
    ARRAY['LayerZero', 'Wormhole', 'Stargate', 'Across Protocol', 'Hop Protocol', 'Synapse', 'Axelar', 'Celer'],
    ARRAY['bridge', 'cross-chain', 'multichain', 'wrapped', 'layerzero', 'wormhole', 'interoperability'],
    FALSE,
    FALSE,
    TRUE
),
(
    'DeFi Tools',
    'DeFi Tools & Analytics',
    'DeFi Tools & Analytics',
    'DeFi',
    'Platforms providing portfolio tracking, yield analysis, risk assessment, and market data for DeFi users. Aggregate data across protocols and chains to provide position visibility.',
    ARRAY[
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
    ARRAY[
        'Direct trading or swapping',
        'Custodial services',
        'Asset management',
        'Protocol operation'
    ],
    ARRAY[
        'Wallet connection vulnerabilities',
        'Data accuracy issues',
        'Privacy concerns (wallet tracking)',
        'Phishing via fake tools',
        'API key exposure',
        'Incorrect tax calculations'
    ],
    ARRAY['DeBank', 'Zapper', 'Zerion', 'Nansen', 'Dune Analytics', 'DeFiLlama', 'Arkham', 'Token Terminal'],
    ARRAY['defi tools', 'analytics', 'portfolio', 'tracker', 'debank', 'zapper', 'zerion', 'dashboard'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Insurance',
    'DeFi Insurance',
    'DeFi Insurance',
    'DeFi',
    'Decentralized insurance protocol providing coverage against smart contract failures, hacks, stablecoin depegs, and other DeFi risks. Users pay premiums and can file claims for covered events.',
    ARRAY[
        'Smart contract cover',
        'Protocol hack coverage',
        'Stablecoin depeg protection',
        'Slashing insurance',
        'Parametric insurance',
        'Claims assessment process',
        'Premium pricing models',
        'Cover capacity pools',
        'Governance for claims'
    ],
    ARRAY[
        'Traditional insurance',
        'Centralized insurance products',
        'Exchange insurance funds',
        'Self-insurance reserves'
    ],
    ARRAY[
        'Claims assessment manipulation',
        'Insufficient cover capacity',
        'Oracle failures for triggers',
        'Smart contract vulnerabilities in insurance protocol',
        'Correlated risks (systemic events)',
        'Governance attacks on claims',
        'Premium mispricing'
    ],
    ARRAY['Nexus Mutual', 'InsurAce', 'Unslashed', 'Risk Harbor', 'Neptune Mutual', 'Ease.org', 'OpenCover'],
    ARRAY['insurance', 'cover', 'protection', 'nexus mutual', 'claims', 'premium', 'smart contract cover', 'defi insurance'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Launchpad',
    'Token Launchpad',
    'Token Launchpad',
    'DeFi',
    'Platform for launching new token projects through Initial DEX Offerings (IDO), Initial Exchange Offerings (IEO), or other token sale mechanisms. Provides vetting, fundraising, and distribution infrastructure.',
    ARRAY[
        'IDO/IEO token sales',
        'Project vetting and due diligence',
        'Tiered allocation systems',
        'Token vesting schedules',
        'KYC integration',
        'Multi-chain launches',
        'Staking for allocation',
        'Whitelist management'
    ],
    ARRAY[
        'Secondary market trading',
        'DEX liquidity provision',
        'Venture capital funding',
        'Airdrops (different mechanism)'
    ],
    ARRAY[
        'Project rug pulls post-launch',
        'Vetting failure (scam projects)',
        'Token unlock dumps',
        'Smart contract vulnerabilities',
        'Allocation manipulation',
        'Regulatory securities issues',
        'Bot/sybil attacks on allocation'
    ],
    ARRAY['Binance Launchpad', 'Coinlist', 'DAO Maker', 'Polkastarter', 'Seedify', 'Fjord Foundry', 'Camelot', 'Impossible Finance'],
    ARRAY['launchpad', 'IDO', 'IEO', 'token sale', 'presale', 'allocation', 'vesting', 'fundraising'],
    FALSE,
    NULL,
    TRUE
),
(
    'Prediction',
    'Prediction Market',
    'Prediction Market',
    'DeFi',
    'Decentralized platform enabling users to bet on outcomes of future events (elections, sports, crypto prices, world events). Uses smart contracts for trustless settlement based on oracle-verified results.',
    ARRAY[
        'Event outcome betting',
        'Binary and multi-outcome markets',
        'Liquidity pools for markets',
        'Oracle-based resolution',
        'Order book or AMM trading',
        'Market creation by users',
        'Real-time odds and pricing',
        'Settlement automation'
    ],
    ARRAY[
        'Traditional gambling/casinos',
        'Sports betting platforms (centralized)',
        'Options trading (different purpose)',
        'Insurance protocols'
    ],
    ARRAY[
        'Oracle manipulation',
        'Market manipulation',
        'Regulatory uncertainty (gambling laws)',
        'Liquidity issues for niche markets',
        'Smart contract vulnerabilities',
        'Resolution disputes',
        'Front-running on outcomes',
        'Wash trading'
    ],
    ARRAY['Polymarket', 'Augur', 'Gnosis (Conditional Tokens)', 'Azuro', 'Overtime Markets', 'PlotX', 'Hedgehog'],
    ARRAY['prediction market', 'betting', 'polymarket', 'augur', 'outcome', 'event', 'forecast', 'odds'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Restaking',
    'Restaking Protocol',
    'Restaking Protocol',
    'DeFi',
    'Protocol enabling staked assets (like stETH) to be restaked to secure additional networks and services (AVS). Extends cryptoeconomic security beyond the base layer, earning additional yield from multiple sources.',
    ARRAY[
        'Restaking of LSTs and native ETH',
        'Actively Validated Services (AVS)',
        'Shared security model',
        'Additional yield generation',
        'Liquid Restaking Tokens (LRTs)',
        'Operator delegation',
        'Slashing conditions across services',
        'Points and rewards systems'
    ],
    ARRAY[
        'Basic liquid staking (single layer)',
        'Direct validator operation',
        'Traditional DeFi yield',
        'Non-restaking staking pools'
    ],
    ARRAY[
        'Compounded slashing risk',
        'Smart contract vulnerabilities (multiple layers)',
        'AVS security failures',
        'Operator misbehavior',
        'LRT depeg risk',
        'Withdrawal queue congestion',
        'Systemic risk to Ethereum security',
        'Complex risk assessment'
    ],
    ARRAY['EigenLayer', 'Symbiotic', 'Karak', 'EtherFi', 'Renzo', 'Puffer', 'Kelp DAO', 'Swell (restaking)'],
    ARRAY['restaking', 'eigenlayer', 'AVS', 'LRT', 'liquid restaking', 'shared security', 'etherfi', 'renzo'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Streaming',
    'Streaming Payments',
    'Streaming Payments',
    'DeFi',
    'Protocol enabling continuous, real-time token transfers (money streaming) for payroll, subscriptions, and vesting. Tokens flow per-second rather than discrete transactions, enabling programmable payment flows.',
    ARRAY[
        'Real-time token streaming',
        'Per-second payment flows',
        'Payroll automation',
        'Subscription payments',
        'Vesting schedules',
        'Multi-recipient streams',
        'Claimable balances',
        'Stream management (pause, cancel, modify)'
    ],
    ARRAY[
        'Traditional batch payments',
        'One-time transfers',
        'Escrow services',
        'Invoice-based payments'
    ],
    ARRAY[
        'Smart contract vulnerabilities',
        'Stream cancellation disputes',
        'Token balance management',
        'Gas costs for claiming',
        'Integration complexity',
        'Recipient address errors',
        'Protocol upgrade risks'
    ],
    ARRAY['Superfluid', 'Sablier', 'LlamaPay', 'Drips', 'Calamus', 'Zebec', 'StreamFlow'],
    ARRAY['streaming', 'superfluid', 'sablier', 'payroll', 'real-time payments', 'money streaming', 'vesting'],
    FALSE,
    FALSE,
    TRUE
),
(
    'CrossAgg',
    'Cross-Chain Aggregator',
    'Cross-Chain Aggregator',
    'DeFi',
    'Meta-aggregator that combines multiple bridges and DEXs to find optimal routes for cross-chain swaps. Compares paths across protocols to minimize fees, slippage, and execution time for multi-chain transactions.',
    ARRAY[
        'Multi-bridge aggregation',
        'Cross-chain swap optimization',
        'Route comparison and selection',
        'Gas cost optimization',
        'Slippage minimization',
        'Single transaction experience',
        'Multi-chain token support',
        'Real-time quote comparison'
    ],
    ARRAY[
        'Single bridge protocols',
        'Native DEX aggregators (same-chain)',
        'Manual bridge selection',
        'CEX for cross-chain'
    ],
    ARRAY[
        'Aggregated bridge vulnerabilities',
        'Route execution failures',
        'Quote accuracy issues',
        'Partial fill risks',
        'Gas estimation errors',
        'Dependency on multiple protocols',
        'Stuck transactions',
        'Slippage across hops'
    ],
    ARRAY['Li.Fi', 'Socket', 'Squid Router', 'Bungee', 'Rango Exchange', 'XY Finance', 'Via Protocol', 'deBridge'],
    ARRAY['cross-chain', 'aggregator', 'lifi', 'socket', 'squid', 'multi-chain', 'bridge aggregator', 'swap'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Intent',
    'Intent Protocol',
    'Intent Protocol',
    'DeFi',
    'Trading protocol where users express desired outcomes (intents) rather than specific execution paths. Solvers compete to fill orders optimally, often providing better prices than traditional AMMs through off-chain liquidity.',
    ARRAY[
        'Intent-based order expression',
        'Solver competition for execution',
        'Batch auction mechanisms',
        'MEV protection by design',
        'Gasless order submission',
        'Coincidence of Wants (CoW) matching',
        'Off-chain liquidity access',
        'Surplus sharing with users'
    ],
    ARRAY[
        'Traditional AMM swaps',
        'Order book exchanges',
        'Direct DEX interaction',
        'Manual trade execution'
    ],
    ARRAY[
        'Solver centralization',
        'Execution guarantee delays',
        'Quote manipulation',
        'Solver collusion',
        'Order expiration risks',
        'Limited token support',
        'Complexity for users',
        'Dependency on solver network'
    ],
    ARRAY['CoW Protocol', 'UniswapX', '1inch Fusion', 'Bebop', 'Hashflow', 'Flood', 'PropellerSwap', 'Anoma'],
    ARRAY['intent', 'solver', 'CoW', 'uniswapx', 'fusion', 'batch auction', 'intent-based', 'MEV protection'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Perps',
    'Perpetual DEX',
    'Perpetual DEX',
    'DeFi',
    'Decentralized exchange specialized in perpetual futures trading with leverage. Users can go long or short on crypto assets with up to 100x leverage, using on-chain or hybrid order books.',
    ARRAY[
        'Perpetual futures contracts',
        'Leverage trading (up to 100x)',
        'Long and short positions',
        'Funding rate mechanism',
        'Cross and isolated margin',
        'Liquidation engine',
        'On-chain or hybrid orderbook',
        'Multi-collateral support'
    ],
    ARRAY[
        'Spot DEX trading',
        'CEX perpetuals',
        'Options trading',
        'Lending protocols'
    ],
    ARRAY[
        'Liquidation cascades',
        'Oracle manipulation',
        'Smart contract exploits',
        'Funding rate volatility',
        'Insurance fund depletion',
        'High leverage losses',
        'Liquidity gaps',
        'Protocol insolvency'
    ],
    ARRAY['GMX', 'dYdX', 'Hyperliquid', 'Vertex', 'Kwenta', 'Gains Network', 'Perpetual Protocol', 'Drift'],
    ARRAY['perpetual', 'perps', 'leverage', 'futures', 'GMX', 'dYdX', 'short', 'long', 'margin'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Options',
    'Options DEX',
    'Options DEX',
    'DeFi',
    'Decentralized platform for trading crypto options contracts. Users can buy calls/puts or sell covered options, with premiums determined by on-chain pricing models or auctions.',
    ARRAY[
        'Call and put options',
        'European and American style',
        'Options vaults (DOVs)',
        'Automated market making for options',
        'Greeks calculation on-chain',
        'Collateralized option writing',
        'Structured products',
        'Options spreads'
    ],
    ARRAY[
        'Perpetual futures',
        'Spot trading',
        'Binary options (gambling)',
        'CEX options'
    ],
    ARRAY[
        'Pricing model risks',
        'Low liquidity/wide spreads',
        'Smart contract vulnerabilities',
        'Oracle manipulation',
        'Impermanent loss for LPs',
        'Complex Greeks exposure',
        'Vault strategy failures',
        'Regulatory uncertainty'
    ],
    ARRAY['Dopex', 'Lyra', 'Opyn', 'Hegic', 'Premia', 'Ribbon Finance', 'Thetanuts', 'Aevo'],
    ARRAY['options', 'calls', 'puts', 'dopex', 'lyra', 'DeFi options', 'DOV', 'vault', 'premium'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Synthetics',
    'Synthetic Assets Protocol',
    'Synthetic Assets Protocol',
    'DeFi',
    'Protocol creating synthetic assets that track the price of real-world assets (stocks, commodities, forex) or crypto without holding the underlying. Uses collateralization and oracles for price tracking.',
    ARRAY[
        'Synthetic asset minting',
        'Over-collateralization',
        'Oracle price feeds',
        'Debt pool mechanism',
        'Trading synthetic exposure',
        'Multi-asset synthetics (stocks, forex, commodities)',
        'Inverse synthetics',
        'Staking for collateral'
    ],
    ARRAY[
        'Wrapped assets (1:1 backed)',
        'Tokenized securities (real backing)',
        'Stablecoins',
        'Perpetual futures'
    ],
    ARRAY[
        'Oracle failure/manipulation',
        'Collateral liquidation cascades',
        'Debt pool imbalance',
        'Peg deviation',
        'Regulatory crackdown (securities)',
        'Smart contract risks',
        'Front-running minting/burning',
        'Liquidity crises'
    ],
    ARRAY['Synthetix', 'UMA', 'Mirror Protocol (defunct)', 'Kwenta', 'dHEDGE', 'Thales', 'Lyra (synths)'],
    ARRAY['synthetic', 'synth', 'synthetix', 'sUSD', 'debt pool', 'collateral', 'exposure', 'derivative'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Index',
    'Index Protocol',
    'Index Protocol',
    'DeFi',
    'Protocol creating tokenized crypto index funds that track baskets of assets. Users can buy a single token representing diversified exposure to multiple cryptocurrencies or DeFi tokens.',
    ARRAY[
        'Basket of underlying tokens',
        'Automated rebalancing',
        'Single token exposure',
        'Streaming fees',
        'Minting and redemption',
        'Governance over composition',
        'Thematic indices (DeFi, L1s, etc.)',
        'Leverage and inverse indices'
    ],
    ARRAY[
        'Single asset holding',
        'Manual portfolio management',
        'ETFs (traditional)',
        'Yield aggregators'
    ],
    ARRAY[
        'Underlying token risks',
        'Rebalancing slippage',
        'Smart contract vulnerabilities',
        'Concentration risk',
        'Fee drag on performance',
        'Liquidity for redemption',
        'Governance attacks on composition',
        'Regulatory uncertainty'
    ],
    ARRAY['Index Coop', 'DeFi Pulse Index (DPI)', 'Enzyme', 'Set Protocol', 'PieDAO', 'Indexed Finance (hacked)', 'Balancer pools'],
    ARRAY['index', 'DPI', 'basket', 'diversified', 'index coop', 'rebalancing', 'ETF', 'portfolio'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Locker',
    'Liquidity Locker',
    'Liquidity Locker',
    'DeFi',
    'Service for locking LP tokens or project tokens for a specified period. Used by projects to prove commitment and prevent rug pulls by making liquidity immovable for a set timeframe.',
    ARRAY[
        'Time-locked LP tokens',
        'Vesting schedules',
        'Lock extensions',
        'Proof of locked liquidity',
        'Multi-token support',
        'Lock verification badges',
        'Unlocking notifications',
        'Migration support'
    ],
    ARRAY[
        'Staking (earns rewards)',
        'Vesting contracts (team tokens)',
        'Yield farming',
        'Liquidity provision'
    ],
    ARRAY[
        'Smart contract vulnerabilities',
        'Lock expiration dumps',
        'Fake lock proofs',
        'Migration exploits',
        'Platform shutdown',
        'Underlying LP token risks',
        'No protection against token value drop',
        'Centralization of locker service'
    ],
    ARRAY['Unicrypt', 'Team Finance', 'PinkLock', 'Mudra Locker', 'TrustSwap', 'DxLock', 'Floki Locker'],
    ARRAY['locker', 'lock', 'LP lock', 'liquidity lock', 'unicrypt', 'team finance', 'vesting', 'rug proof'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Vesting',
    'Token Vesting Platform',
    'Token Vesting Platform',
    'DeFi',
    'Platform for creating and managing token vesting schedules for team members, investors, and advisors. Automates token distribution over time with cliff periods and linear/custom release curves.',
    ARRAY[
        'Cliff periods',
        'Linear vesting schedules',
        'Custom release curves',
        'Multi-beneficiary support',
        'Revocable and irrevocable vests',
        'On-chain transparency',
        'Claiming interface',
        'Admin controls'
    ],
    ARRAY[
        'Liquidity locking (LP tokens)',
        'Staking rewards',
        'Airdrops (immediate)',
        'Streaming payments'
    ],
    ARRAY[
        'Smart contract vulnerabilities',
        'Admin key compromise',
        'Token value decline during vest',
        'Gas costs for claiming',
        'Schedule modification attacks',
        'Platform dependency',
        'Regulatory issues (securities)',
        'Revocation disputes'
    ],
    ARRAY['Hedgey', 'Sablier', 'LlamaPay', 'TokenVesting', 'Magna', 'Superfluid vesting', 'OpenZeppelin vesting'],
    ARRAY['vesting', 'cliff', 'token release', 'schedule', 'hedgey', 'team tokens', 'investor tokens', 'unlock'],
    FALSE,
    FALSE,
    TRUE
);

-- ============================================================
-- CATEGORY: ASSET (3 types: RWA, Stablecoin, Wrapped)
-- ============================================================

INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'RWA',
    'Real World Assets',
    'Real World Assets',
    'Asset',
    'Platforms tokenizing traditional financial assets like real estate, bonds, commodities, and private credit on blockchain. Bridge traditional finance and DeFi by bringing off-chain assets on-chain.',
    ARRAY[
        'Tokenized securities',
        'Real estate tokenization',
        'On-chain government bonds (T-Bills)',
        'Private credit protocols',
        'Commodity tokenization',
        'Legal wrapper structures',
        'Compliance frameworks',
        'Dividend/yield distribution'
    ],
    ARRAY[
        'Purely crypto-native assets',
        'Algorithmic stablecoins',
        'NFT collectibles',
        'DeFi without real backing'
    ],
    ARRAY[
        'Regulatory uncertainty',
        'Legal enforceability of token rights',
        'Counterparty risk (asset custodians)',
        'Audit and verification challenges',
        'Liquidity constraints',
        'Jurisdictional complexities',
        'Asset valuation accuracy'
    ],
    ARRAY['Ondo Finance', 'Maple Finance', 'Centrifuge', 'Goldfinch', 'TrueFi', 'Backed Finance', 'RealT', 'Swarm'],
    ARRAY['RWA', 'real world assets', 'tokenized', 'treasury', 'bonds', 'real estate', 'ondo', 'maple', 'T-bills'],
    FALSE,
    NULL,
    TRUE
),
(
    'Stablecoin',
    'Stablecoin',
    'Stablecoin',
    'Asset',
    'Cryptocurrency designed to maintain stable value relative to a reference asset (usually USD). Mechanisms include fiat reserves, crypto collateral, or algorithmic supply adjustment.',
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
        'Wrapped assets',
        'Non-stable synthetic assets'
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
    ARRAY['USDC', 'USDT', 'DAI', 'FRAX', 'PYUSD', 'LUSD', 'GHO', 'crvUSD', 'USDP'],
    ARRAY['stablecoin', 'stable', 'USDC', 'USDT', 'DAI', 'dollar', 'peg', 'reserve', 'fiat-backed'],
    FALSE,
    NULL,
    TRUE
),
(
    'Wrapped',
    'Wrapped Asset',
    'Wrapped Asset',
    'Asset',
    'Token representing another asset on a different blockchain, enabling cross-chain liquidity. Backed 1:1 by the underlying asset held by custodians or via decentralized mechanisms like bridges or smart contracts.',
    ARRAY[
        '1:1 backing by underlying asset',
        'Cross-chain representation',
        'Custodial or decentralized backing',
        'Proof of Reserve audits',
        'Minting and redemption mechanisms',
        'Multi-chain availability',
        'DeFi compatibility',
        'Bridge integration'
    ],
    ARRAY[
        'Native tokens',
        'Stablecoins',
        'Synthetic assets (not 1:1 backed)',
        'Liquid staking tokens'
    ],
    ARRAY[
        'Custodian insolvency or fraud',
        'Bridge exploits',
        'Depeg from underlying',
        'Smart contract vulnerabilities',
        'Centralization of custodians',
        'Redemption delays',
        'Proof of Reserve failures',
        'Regulatory seizure of reserves'
    ],
    ARRAY['WBTC', 'wstETH', 'renBTC', 'tBTC', 'WETH', 'cbBTC', 'sBTC', 'BTCB'],
    ARRAY['wrapped', 'WBTC', 'wstETH', 'cross-chain', 'bridge', 'tokenized', 'backed', 'collateral'],
    FALSE,
    NULL,
    TRUE
);

-- ============================================================
-- CATEGORY: FINANCIAL (10 types: Card, Card Non-Cust, Crypto Bank, Payment, Custody, Fiat Gateway, Tax, CeFi Lending, Prime Brokerage, Treasury)
-- ============================================================

INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'Card',
    'Crypto Card (Custodial)',
    'Crypto Card (Custodial)',
    'Financial',
    'Payment card (debit/credit) issued by centralized provider allowing cryptocurrency spending at traditional merchants. Provider holds custody of funds and converts crypto to fiat at point of sale.',
    ARRAY[
        'Visa or Mastercard branded card',
        'Custodial crypto storage',
        'Auto crypto-to-fiat conversion',
        'Cashback rewards in crypto',
        'Mobile management app',
        'Transaction tracking',
        'Spending limits and controls',
        'Virtual and physical cards'
    ],
    ARRAY[
        'Non-custodial solutions',
        'Direct blockchain payments',
        'Self-custody of funds',
        'Decentralized protocols'
    ],
    ARRAY[
        'Custodial counterparty risk',
        'Exchange rate volatility',
        'Service discontinuation',
        'Regulatory restrictions',
        'Account freezing',
        'KYC/AML requirements',
        'Hidden conversion fees'
    ],
    ARRAY['Crypto.com Card', 'Binance Card', 'Coinbase Card', 'Nexo Card', 'Wirex Card', 'Bitpanda Card'],
    ARRAY['crypto card', 'debit card', 'visa', 'mastercard', 'cashback', 'spending', 'custodial', 'fiat'],
    FALSE,
    TRUE,
    TRUE
),
(
    'Card Non-Cust',
    'Crypto Card (Non-Custodial)',
    'Crypto Card (Non-Custodial)',
    'Financial',
    'Card allowing spending directly from self-custody wallet without depositing funds to centralized platform. Card converts crypto to fiat at point of sale while keeping funds in wallet until spending.',
    ARRAY[
        'Direct wallet connection',
        'Real-time crypto-fiat conversion',
        'Self-custody until spending',
        'Multiple wallet support',
        'Physical and/or virtual cards',
        'Spending limits and controls',
        'Transaction notifications',
        'Multi-chain support',
        'Cashback in crypto/stablecoins'
    ],
    ARRAY[
        'Pre-funded custodial cards',
        'Centralized balance holding',
        'Exchange-issued cards (custodial)',
        'Traditional debit cards'
    ],
    ARRAY[
        'Payment smart contract vulnerability',
        'Price slippage during conversion',
        'Card issuer insolvency',
        'Network congestion preventing payments',
        'Regulatory restrictions',
        'Merchant acceptance issues'
    ],
    ARRAY['Gnosis Pay', 'Holyheld', 'Immersve', 'Fuse', 'Metamask Card'],
    ARRAY['crypto card', 'non-custodial', 'self-custody', 'gnosis pay', 'holyheld', 'debit card', 'web3 card'],
    FALSE,
    FALSE,
    TRUE
);

-- Crypto Bank (Financial category)
INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'Crypto Bank',
    'Crypto Bank',
    'Crypto Bank',
    'Financial',
    'Financial institution designed for digital asset economy, offering banking services like accounts, payments, and loans while integrating crypto support. May be regulated as bank or EMI (Electronic Money Institution).',
    ARRAY[
        'Fiat and crypto accounts',
        'IBAN/bank account numbers',
        'Debit cards with crypto conversion',
        'Wire transfers and SEPA',
        'Crypto custody services',
        'Interest on deposits',
        'Loans against crypto collateral',
        'Regulatory licenses (banking, EMI)'
    ],
    ARRAY[
        'Non-custodial services',
        'Pure DeFi protocols',
        'Unlicensed operations',
        'Trading-only platforms'
    ],
    ARRAY[
        'Regulatory risk and license revocation',
        'Counterparty risk',
        'Insolvency (not always FDIC/FSCS insured)',
        'Crypto custody security',
        'Bank run scenarios',
        'Interest rate risk',
        'Compliance failures'
    ],
    ARRAY['SEBA Bank', 'Sygnum', 'Anchorage Digital', 'Revolut', 'N26 (crypto)', 'Wirex', 'Juno'],
    ARRAY['crypto bank', 'banking', 'IBAN', 'fiat', 'regulated', 'EMI', 'seba', 'sygnum', 'neobank'],
    FALSE,
    TRUE,
    TRUE
);

-- Custody (Financial category)
INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'Custody',
    'Institutional Custody',
    'Institutional Custody',
    'Financial',
    'Enterprise-grade custodial solution for institutions, funds, and high-net-worth individuals. Provides secure storage with regulatory compliance, insurance, and advanced access controls. Often uses HSMs, MPC, or multi-sig.',
    ARRAY[
        'HSM-based key storage',
        'Multi-signature or MPC architecture',
        'Role-based access controls',
        'Regulatory compliance (SOC2, ISO27001)',
        'Insurance coverage',
        'Audit trails and reporting',
        'Whitelisting and policy engine',
        'API integration for trading',
        'Cold and hot wallet segregation'
    ],
    ARRAY[
        'Retail self-custody solutions',
        'Consumer wallets',
        'DeFi protocols',
        'Non-regulated services'
    ],
    ARRAY[
        'Insider threats and collusion',
        'Key ceremony failures',
        'Regulatory changes',
        'Insurance coverage gaps',
        'Operational errors',
        'Vendor lock-in',
        'Business continuity risks'
    ],
    ARRAY['Fireblocks', 'BitGo', 'Copper', 'Anchorage', 'Coinbase Custody', 'Fidelity Digital Assets', 'Gemini Custody'],
    ARRAY['custody', 'institutional', 'enterprise', 'HSM', 'SOC2', 'insurance', 'fireblocks', 'bitgo', 'qualified custodian'],
    FALSE,
    TRUE,
    TRUE
),
(
    'CeFi Lending',
    'CeFi Lending / Earn',
    'CeFi Lending / Earn',
    'Financial',
    'Centralized platform offering interest on crypto deposits and crypto-backed loans. Unlike DeFi, users deposit funds with a custodial service that manages lending activities. Higher counterparty risk.',
    ARRAY[
        'Interest-bearing crypto accounts',
        'Crypto-backed loans',
        'Fixed and variable rates',
        'Institutional lending desk',
        'Fiat loan options',
        'Flexible withdrawal terms',
        'Insurance coverage (varies)',
        'Referral programs'
    ],
    ARRAY[
        'DeFi lending protocols (non-custodial)',
        'Self-custody staking',
        'P2P lending',
        'Traditional bank savings'
    ],
    ARRAY[
        'Platform insolvency (Celsius, BlockFi)',
        'Custodial risk',
        'Withdrawal freezes',
        'Rehypothecation of assets',
        'Regulatory enforcement',
        'Lack of transparency',
        'Rate changes without notice',
        'No deposit insurance'
    ],
    ARRAY['Nexo', 'Ledn', 'YouHodler', 'Haru Invest', 'CoinLoan', 'Midas (defunct)', 'BlockFi (bankrupt)', 'Celsius (bankrupt)'],
    ARRAY['CeFi', 'earn', 'interest', 'nexo', 'ledn', 'crypto lending', 'yield', 'savings'],
    FALSE,
    TRUE,
    TRUE
),
(
    'Prime',
    'Prime Brokerage',
    'Prime Brokerage',
    'Financial',
    'Institutional-grade service providing crypto trading, custody, lending, and settlement under one platform. Serves hedge funds, asset managers, and institutions with credit facilities and unified account management.',
    ARRAY[
        'Multi-exchange execution',
        'Unified margin accounts',
        'Credit/leverage facilities',
        'Custody integration',
        'OTC trading desk',
        'Settlement and clearing',
        'Portfolio financing',
        'Institutional reporting'
    ],
    ARRAY[
        'Retail trading platforms',
        'Single exchange accounts',
        'DeFi protocols',
        'Self-custody solutions'
    ],
    ARRAY[
        'Counterparty credit risk',
        'Platform insolvency',
        'Margin call execution',
        'Custody security',
        'Regulatory compliance',
        'Operational failures',
        'Rehypothecation risks',
        'Concentration risk'
    ],
    ARRAY['FalconX', 'Hidden Road', 'Galaxy Digital', 'Genesis (bankrupt)', 'B2C2', 'Cumberland', 'Wintermute', 'GSR'],
    ARRAY['prime broker', 'institutional', 'OTC', 'credit', 'falconx', 'galaxy', 'hedge fund', 'execution'],
    FALSE,
    TRUE,
    TRUE
),
(
    'Treasury',
    'Treasury Management',
    'Treasury Management',
    'Financial',
    'Platform for managing organizational crypto treasury operations including multi-sig wallets, payment workflows, budgeting, and financial reporting. Used by DAOs, companies, and protocols.',
    ARRAY[
        'Multi-sig wallet management',
        'Payment workflows and approvals',
        'Budget tracking and allocation',
        'Financial reporting and analytics',
        'Payroll and contributor payments',
        'Token streaming integration',
        'Accounting integrations',
        'Role-based access control'
    ],
    ARRAY[
        'Personal wallets',
        'DeFi protocols',
        'Simple multi-sig only',
        'Traditional banking'
    ],
    ARRAY[
        'Multi-sig key compromise',
        'Access control mismanagement',
        'Payment approval failures',
        'Integration vulnerabilities',
        'Unauthorized transactions',
        'Reporting inaccuracies',
        'Platform dependency',
        'Governance disputes'
    ],
    ARRAY['Gnosis Safe (Safe)', 'Parcel', 'Coinshift', 'Utopia Labs', 'Multis', 'Request Finance', 'Llama', 'Den'],
    ARRAY['treasury', 'multi-sig', 'DAO treasury', 'payroll', 'gnosis safe', 'corporate', 'budget', 'payment'],
    FALSE,
    FALSE,
    TRUE
);

-- ============================================================
-- CATEGORY: INFRASTRUCTURE (13 types: Bridges, Oracle, L2, Node/RPC, Identity, Data Indexer, Explorer, Dev Tools, Validator, Attestation, Research, Interoperability, Account Abstraction)
-- ============================================================

INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'Oracle',
    'Oracle Protocol',
    'Oracle Protocol',
    'Infrastructure',
    'Decentralized data feed protocol providing off-chain data (prices, events, randomness) to smart contracts. Critical infrastructure for DeFi, enabling contracts to react to real-world information.',
    ARRAY[
        'Price feeds for DeFi',
        'Decentralized node network',
        'Data aggregation and validation',
        'Proof of Reserve feeds',
        'VRF (Verifiable Random Function)',
        'Cross-chain data delivery',
        'Custom data feeds',
        'Staking and incentive mechanisms'
    ],
    ARRAY[
        'On-chain data only',
        'Centralized API providers',
        'Single source data feeds',
        'Manual data entry'
    ],
    ARRAY[
        'Oracle manipulation attacks',
        'Flash loan exploits via oracles',
        'Data source compromise',
        'Node collusion',
        'Latency and stale data',
        'Single oracle dependency',
        'Economic attacks on node incentives'
    ],
    ARRAY['Chainlink', 'Pyth Network', 'Band Protocol', 'API3', 'Redstone', 'DIA', 'UMA', 'Chronicle'],
    ARRAY['oracle', 'price feed', 'chainlink', 'pyth', 'data feed', 'VRF', 'off-chain data', 'decentralized oracle'],
    FALSE,
    FALSE,
    TRUE
),
(
    'L2',
    'Layer 2 Solution',
    'Layer 2 Solution',
    'Infrastructure',
    'Scaling solution built on top of a Layer 1 blockchain to increase throughput and reduce fees while inheriting security from the base layer. Includes rollups (optimistic and ZK), state channels, and sidechains.',
    ARRAY[
        'Transaction batching and compression',
        'Lower gas fees',
        'Higher throughput (TPS)',
        'Bridge to L1',
        'Data availability solutions',
        'Fraud proofs (optimistic)',
        'Validity proofs (ZK)',
        'Native token and ecosystem',
        'EVM compatibility (most)'
    ],
    ARRAY[
        'Layer 1 blockchains',
        'Independent sidechains',
        'Cross-chain bridges (separate category)',
        'Off-chain databases'
    ],
    ARRAY[
        'Sequencer centralization',
        'Bridge vulnerabilities',
        'Withdrawal delays (optimistic)',
        'Data availability failures',
        'Upgrade mechanism risks',
        'L1 congestion affecting exits',
        'Smart contract bugs in rollup',
        'Regulatory classification'
    ],
    ARRAY['Arbitrum', 'Optimism', 'zkSync', 'Polygon zkEVM', 'Base', 'Linea', 'Scroll', 'StarkNet', 'Mantle'],
    ARRAY['L2', 'layer 2', 'rollup', 'optimistic', 'ZK', 'scaling', 'arbitrum', 'optimism', 'zkSync'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Node RPC',
    'Node / RPC Provider',
    'Node / RPC Provider',
    'Infrastructure',
    'Service providing access to blockchain nodes via RPC (Remote Procedure Call) endpoints. Enables developers and applications to interact with blockchains without running their own full nodes.',
    ARRAY[
        'RPC endpoint access',
        'Full node infrastructure',
        'Multi-chain support',
        'Archive node data',
        'WebSocket connections',
        'API rate limiting tiers',
        'Enhanced APIs (NFT, token, etc.)',
        'Dedicated nodes',
        'Geographic distribution'
    ],
    ARRAY[
        'Self-hosted nodes',
        'Validator operations',
        'Block production',
        'Consensus participation'
    ],
    ARRAY[
        'Centralization of node access',
        'Service outages affecting DApps',
        'Rate limiting during high demand',
        'Data accuracy and latency',
        'Privacy (IP tracking)',
        'Single point of failure',
        'Vendor lock-in',
        'MEV extraction by providers'
    ],
    ARRAY['Infura', 'Alchemy', 'QuickNode', 'Ankr', 'GetBlock', 'Chainstack', 'DRPC', 'Blast API', 'NodeReal'],
    ARRAY['RPC', 'node', 'infura', 'alchemy', 'quicknode', 'endpoint', 'API', 'blockchain access', 'provider'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Data Indexer',
    'Blockchain Data Indexer',
    'Blockchain Data Indexer',
    'Infrastructure',
    'Protocol or service that indexes blockchain data and provides queryable APIs for DApps. Transforms raw blockchain data into structured, searchable formats enabling efficient data retrieval for applications.',
    ARRAY[
        'Blockchain data indexing',
        'GraphQL/REST APIs',
        'Subgraph deployment',
        'Real-time data streaming',
        'Historical data access',
        'Multi-chain indexing',
        'Custom schema definitions',
        'Decentralized query network'
    ],
    ARRAY[
        'Raw RPC node access',
        'Block explorers (user-facing)',
        'Analytics dashboards',
        'On-chain data only'
    ],
    ARRAY[
        'Indexer reliability and uptime',
        'Data accuracy and consistency',
        'Query latency issues',
        'Centralization of data access',
        'Subgraph versioning risks',
        'Cost of indexing and queries',
        'Data synchronization delays',
        'Schema migration complexity'
    ],
    ARRAY['The Graph', 'Covalent', 'Goldsky', 'Subsquid', 'Envio', 'Moralis', 'Bitquery', 'Dune'],
    ARRAY['indexer', 'the graph', 'subgraph', 'GraphQL', 'data', 'covalent', 'blockchain data', 'API'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Explorer',
    'Block Explorer',
    'Block Explorer',
    'Infrastructure',
    'Web-based tool for viewing and searching blockchain data including transactions, addresses, blocks, and smart contracts. Essential infrastructure for transparency and verification of on-chain activity.',
    ARRAY[
        'Transaction lookup and tracking',
        'Address balance and history',
        'Block information',
        'Smart contract verification',
        'Token transfers and holdings',
        'Gas tracker',
        'API access for developers',
        'Multi-chain support',
        'Analytics and charts'
    ],
    ARRAY[
        'Data indexing protocols (backend)',
        'Portfolio trackers',
        'DeFi analytics platforms',
        'Node providers'
    ],
    ARRAY[
        'Data accuracy and delays',
        'Centralized infrastructure',
        'API rate limiting',
        'Privacy concerns (address tracking)',
        'Phishing via fake explorers',
        'Incorrect token labeling',
        'Service availability'
    ],
    ARRAY['Etherscan', 'Solscan', 'Blockscout', 'Polygonscan', 'Arbiscan', 'BscScan', 'Blockchain.com', 'Mempool.space'],
    ARRAY['explorer', 'etherscan', 'block explorer', 'transaction', 'blockchain explorer', 'solscan', 'scan'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Dev Tools',
    'Developer Tools',
    'Developer Tools',
    'Infrastructure',
    'Frameworks, SDKs, and development environments for building decentralized applications and smart contracts. Includes testing, deployment, and debugging tools for blockchain developers.',
    ARRAY[
        'Smart contract development frameworks',
        'Testing and simulation environments',
        'Deployment pipelines',
        'SDK and API libraries',
        'IDE plugins and extensions',
        'Contract verification tools',
        'Gas optimization tools',
        'Multi-chain deployment'
    ],
    ARRAY[
        'End-user applications',
        'Node infrastructure',
        'Block explorers',
        'Audit services'
    ],
    ARRAY[
        'Dependency vulnerabilities',
        'Outdated tooling',
        'Configuration errors',
        'Testing coverage gaps',
        'Deployment script bugs',
        'Version compatibility issues',
        'Supply chain attacks on packages'
    ],
    ARRAY['Hardhat', 'Foundry', 'Remix', 'thirdweb', 'Truffle', 'Brownie', 'Anchor', 'Tenderly'],
    ARRAY['developer', 'SDK', 'hardhat', 'foundry', 'remix', 'framework', 'smart contract development', 'testing'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Validator',
    'Validator / Staking Service',
    'Validator / Staking Service',
    'Infrastructure',
    'Professional service operating validator nodes for proof-of-stake networks. Provides infrastructure, monitoring, and slashing protection for institutional and retail delegators seeking staking rewards.',
    ARRAY[
        'Validator node operation',
        'Multi-chain staking support',
        'Institutional-grade infrastructure',
        'Slashing protection and insurance',
        'Uptime monitoring and SLAs',
        'Reward distribution',
        'Non-custodial delegation',
        'White-label staking solutions'
    ],
    ARRAY[
        'Liquid staking protocols (different model)',
        'Self-operated validators',
        'Custodial staking on exchanges',
        'Mining operations'
    ],
    ARRAY[
        'Validator slashing events',
        'Infrastructure downtime',
        'Key management failures',
        'Operator centralization',
        'Fee structure changes',
        'Network-specific risks',
        'Regulatory uncertainty',
        'Counterparty risk'
    ],
    ARRAY['Figment', 'Staked', 'Kiln', 'P2P Validator', 'Chorus One', 'Blockdaemon', 'Everstake', 'Allnodes'],
    ARRAY['validator', 'staking service', 'figment', 'kiln', 'delegation', 'node operator', 'proof of stake'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Attestation',
    'On-Chain Attestation',
    'On-Chain Attestation',
    'Infrastructure',
    'Protocol for creating, managing, and verifying on-chain attestations and verifiable credentials. Enables trustless verification of claims about addresses, identities, or actions without revealing underlying data.',
    ARRAY[
        'On-chain attestation creation',
        'Schema registry and management',
        'Attestation verification',
        'Revocation mechanisms',
        'Linked attestation chains',
        'Privacy-preserving proofs',
        'Cross-chain attestations',
        'Timestamp verification'
    ],
    ARRAY[
        'Traditional identity verification',
        'Off-chain credentials only',
        'Centralized KYC services',
        'Simple wallet signatures'
    ],
    ARRAY[
        'False attestation risks',
        'Schema standardization challenges',
        'Privacy leakage concerns',
        'Attestor reliability',
        'Revocation timing issues',
        'Gas costs for on-chain storage',
        'Cross-chain verification complexity',
        'Sybil attestation attacks'
    ],
    ARRAY['EAS (Ethereum Attestation Service)', 'Sign Protocol', 'Verax', 'Clique', 'Coinbase Verifications', 'Intuition', 'Karma3'],
    ARRAY['attestation', 'EAS', 'sign protocol', 'verifiable', 'credential', 'on-chain proof', 'verification'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Research',
    'Research & Intelligence',
    'Research & Intelligence',
    'Infrastructure',
    'Platform providing cryptocurrency research, market data, analytics, and intelligence reports. Offers fundamental analysis, on-chain metrics, and industry insights for informed investment and development decisions.',
    ARRAY[
        'Research reports and analysis',
        'On-chain data analytics',
        'Market data and metrics',
        'Token fundamental analysis',
        'Industry intelligence',
        'Real-time data feeds',
        'Historical data access',
        'Custom dashboards and alerts'
    ],
    ARRAY[
        'Trading platforms',
        'Portfolio tracking (consumer)',
        'News aggregators only',
        'Social sentiment tools'
    ],
    ARRAY[
        'Data accuracy and timeliness',
        'Analysis bias',
        'Subscription cost barriers',
        'Information asymmetry',
        'Outdated research',
        'Conflict of interest',
        'Data source reliability',
        'Methodology transparency'
    ],
    ARRAY['Messari', 'Delphi Digital', 'The Block', 'Token Terminal', 'Kaiko', 'Glassnode', 'IntoTheBlock', 'Santiment'],
    ARRAY['research', 'analytics', 'messari', 'delphi', 'intelligence', 'on-chain data', 'metrics', 'reports'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Interop',
    'Interoperability Protocol',
    'Interoperability Protocol',
    'Infrastructure',
    'Cross-chain messaging and asset transfer protocol enabling communication between different blockchains. Facilitates token transfers, arbitrary message passing, and cross-chain contract calls.',
    ARRAY[
        'Cross-chain messaging',
        'Token bridge functionality',
        'Arbitrary message passing',
        'Multi-chain deployment',
        'Relayer networks',
        'Verification mechanisms',
        'Omnichain applications',
        'Cross-chain contract calls'
    ],
    ARRAY[
        'Single-chain protocols',
        'Centralized bridges',
        'Atomic swaps (different mechanism)',
        'Sidechains'
    ],
    ARRAY[
        'Message verification failures',
        'Relayer centralization',
        'Replay attacks',
        'Oracle manipulation',
        'Smart contract vulnerabilities',
        'Destination chain exploits',
        'Finality assumptions',
        'Governance attacks'
    ],
    ARRAY['LayerZero', 'Wormhole', 'Axelar', 'Chainlink CCIP', 'Hyperlane', 'Celer cBridge', 'Multichain (defunct)', 'Router Protocol'],
    ARRAY['interoperability', 'cross-chain', 'layerzero', 'wormhole', 'messaging', 'omnichain', 'bridge', 'CCIP'],
    FALSE,
    FALSE,
    TRUE
),
(
    'AA',
    'Account Abstraction',
    'Account Abstraction',
    'Infrastructure',
    'Infrastructure enabling smart contract wallets with programmable validation logic (ERC-4337). Includes bundlers, paymasters, and entry point contracts that enable gasless transactions and custom authentication.',
    ARRAY[
        'ERC-4337 implementation',
        'Bundler services',
        'Paymaster for gas sponsorship',
        'Custom signature validation',
        'Social recovery modules',
        'Session keys',
        'Batched transactions',
        'Multi-chain account sync'
    ],
    ARRAY[
        'EOA wallets (traditional)',
        'Regular smart contract wallets',
        'Meta-transactions (different approach)',
        'Custodial solutions'
    ],
    ARRAY[
        'Bundler centralization',
        'Paymaster insolvency',
        'Entry point vulnerabilities',
        'Module security risks',
        'Gas estimation failures',
        'Mempool manipulation',
        'Recovery mechanism failures',
        'Complexity attacks'
    ],
    ARRAY['Pimlico', 'Stackup', 'Biconomy', 'Alchemy AA', 'ZeroDev', 'Safe (AA modules)', 'Candide', 'Etherspot'],
    ARRAY['account abstraction', 'ERC-4337', 'bundler', 'paymaster', 'smart account', 'gasless', 'AA', 'pimlico'],
    FALSE,
    FALSE,
    TRUE
);

-- NFT Market (Exchange category - inserted here for logical grouping)
INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'NFT Market',
    'NFT Marketplace',
    'NFT Marketplace',
    'Exchange',
    'Platform for buying, selling, and trading Non-Fungible Tokens (NFTs). Provides discovery, listing, auction mechanisms, and royalty enforcement for digital collectibles, art, and tokenized assets.',
    ARRAY[
        'NFT listing and discovery',
        'Auction and fixed-price sales',
        'Collection management',
        'Royalty enforcement',
        'Multi-chain support',
        'Aggregator functionality',
        'Rarity tools and analytics',
        'Creator verification',
        'Lazy minting'
    ],
    ARRAY[
        'Fungible token exchanges',
        'NFT creation tools only',
        'Custodial NFT storage',
        'Gaming platforms (unless marketplace)'
    ],
    ARRAY[
        'Smart contract vulnerabilities',
        'Wash trading and fake volume',
        'Stolen NFT listings',
        'Royalty bypass',
        'Phishing and scam listings',
        'Metadata and IPFS availability',
        'Platform rug pulls',
        'Regulatory uncertainty'
    ],
    ARRAY['OpenSea', 'Blur', 'Magic Eden', 'LooksRare', 'X2Y2', 'Tensor', 'Foundation', 'Rarible'],
    ARRAY['NFT', 'marketplace', 'opensea', 'blur', 'collectibles', 'digital art', 'auction', 'royalties'],
    FALSE,
    FALSE,
    TRUE
);

-- Payment (Financial category)
INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'Payment',
    'Payment Processor',
    'Payment Processor',
    'Financial',
    'Service enabling merchants and businesses to accept cryptocurrency payments. Handles payment processing, conversion, settlement, and provides checkout integration for e-commerce and point-of-sale.',
    ARRAY[
        'Merchant payment gateway',
        'Checkout integration (API, plugins)',
        'Multi-cryptocurrency support',
        'Instant fiat conversion',
        'Invoice generation',
        'Point-of-sale solutions',
        'Settlement in fiat or crypto',
        'Payment links and QR codes',
        'Volatility protection'
    ],
    ARRAY[
        'P2P payments between individuals',
        'Exchange trading',
        'Wallet-to-wallet transfers',
        'DeFi protocols'
    ],
    ARRAY[
        'Custodial risk during settlement',
        'Exchange rate volatility',
        'Regulatory compliance issues',
        'Chargeback and fraud disputes',
        'Integration security vulnerabilities',
        'Service availability',
        'KYC/AML requirements for merchants'
    ],
    ARRAY['BitPay', 'BTCPay Server', 'Coinbase Commerce', 'CoinGate', 'NOWPayments', 'Flexa', 'Strike', 'OpenNode'],
    ARRAY['payment', 'merchant', 'processor', 'checkout', 'commerce', 'bitpay', 'POS', 'gateway'],
    FALSE,
    NULL,
    TRUE
);

-- Fiat Gateway (Financial category)
INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'Fiat Gateway',
    'Fiat On/Off Ramp',
    'Fiat On/Off Ramp',
    'Financial',
    'Service enabling users to convert fiat currency to cryptocurrency (on-ramp) or crypto to fiat (off-ramp). Provides API/widget integration for wallets and DApps to offer seamless fiat-crypto conversion.',
    ARRAY[
        'Fiat to crypto conversion',
        'Crypto to fiat conversion',
        'Widget/API integration',
        'Multiple payment methods (card, bank, Apple Pay)',
        'KYC/AML compliance',
        'Multi-currency support',
        'Instant or near-instant delivery',
        'White-label solutions',
        'Global coverage'
    ],
    ARRAY[
        'Full exchange trading',
        'Custodial wallet services',
        'Direct P2P trading',
        'Merchant payment processing'
    ],
    ARRAY[
        'High fees and spread',
        'KYC data privacy concerns',
        'Transaction limits',
        'Geographic restrictions',
        'Payment method failures',
        'Regulatory compliance changes',
        'Fraud and chargeback exposure',
        'Service availability'
    ],
    ARRAY['MoonPay', 'Transak', 'Ramp Network', 'Banxa', 'Wyre', 'Sardine', 'Simplex', 'Alchemy Pay'],
    ARRAY['on-ramp', 'off-ramp', 'fiat', 'moonpay', 'transak', 'ramp', 'buy crypto', 'sell crypto', 'fiat gateway'],
    FALSE,
    TRUE,
    TRUE
);

-- Tax Tools (Financial category)
INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'Tax',
    'Crypto Tax Software',
    'Crypto Tax Software',
    'Financial',
    'Software for tracking cryptocurrency transactions and generating tax reports. Aggregates data from exchanges, wallets, and DeFi protocols to calculate capital gains, income, and produce tax-compliant reports.',
    ARRAY[
        'Transaction aggregation',
        'Exchange and wallet imports',
        'DeFi transaction support',
        'Capital gains calculation',
        'Tax loss harvesting tools',
        'Multiple accounting methods (FIFO, LIFO, HIFO)',
        'Tax report generation',
        'Multi-jurisdiction support'
    ],
    ARRAY[
        'General accounting software',
        'Exchange built-in reports',
        'Manual spreadsheet tracking',
        'Tax advisory services'
    ],
    ARRAY[
        'Data import accuracy',
        'DeFi transaction classification',
        'Missing or incomplete data',
        'Jurisdiction-specific rules',
        'Cost basis tracking complexity',
        'NFT and airdrop handling',
        'Regulatory changes',
        'Privacy concerns (data sharing)'
    ],
    ARRAY['Koinly', 'CoinTracker', 'TokenTax', 'CoinLedger', 'Accointing', 'ZenLedger', 'TaxBit', 'Recap'],
    ARRAY['tax', 'crypto tax', 'koinly', 'cointracker', 'capital gains', 'tax report', 'accounting', 'FIFO'],
    FALSE,
    FALSE,
    TRUE
);

-- ============================================================
-- CATEGORY: PRIVACY (2 types: Privacy, Private DeFi)
-- ============================================================

INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'Privacy',
    'Privacy Protocol',
    'Privacy Protocol',
    'Privacy',
    'Protocol or tool designed to enhance transaction privacy and break on-chain traceability. Uses techniques like mixing, zero-knowledge proofs, or ring signatures to obscure sender, receiver, or amounts.',
    ARRAY[
        'Transaction mixing/tumbling',
        'Zero-knowledge proofs',
        'Shielded transactions',
        'Ring signatures',
        'Stealth addresses',
        'Confidential transactions',
        'Note-based systems',
        'Compliance options (some)'
    ],
    ARRAY[
        'Standard transparent wallets',
        'Public blockchain explorers',
        'KYC-compliant services',
        'Custodial services'
    ],
    ARRAY[
        'Regulatory sanctions and bans',
        'Smart contract vulnerabilities',
        'Deanonymization attacks',
        'Low anonymity set',
        'Timing analysis',
        'Compliance tool detection',
        'Protocol shutdown risk',
        'Legal liability for users'
    ],
    ARRAY['Tornado Cash', 'Railgun', 'Aztec', 'Zcash', 'Monero', 'Secret Network', 'Panther Protocol', 'Nocturne'],
    ARRAY['privacy', 'mixer', 'anonymous', 'zero-knowledge', 'shielded', 'confidential', 'mixing', 'untraceable'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Private DeFi',
    'Private DeFi Protocol',
    'Private DeFi Protocol',
    'Privacy',
    'DeFi protocols built with privacy-preserving technology, enabling confidential trading, lending, and transactions. Uses ZK-proofs or encrypted computation to hide transaction details while maintaining DeFi functionality.',
    ARRAY[
        'Private token swaps',
        'Confidential lending/borrowing',
        'Shielded yield farming',
        'Private liquidity provision',
        'Encrypted order books',
        'ZK-proof verification',
        'Compliant privacy options',
        'Private smart contracts'
    ],
    ARRAY[
        'Public DeFi protocols',
        'Simple mixers',
        'Privacy coins (not DeFi)',
        'Centralized private trading'
    ],
    ARRAY[
        'Regulatory uncertainty',
        'Smart contract complexity',
        'ZK-proof vulnerabilities',
        'Limited liquidity',
        'Compliance challenges',
        'Trusted setup risks (some)',
        'MEV in private pools',
        'Cross-chain privacy leakage'
    ],
    ARRAY['Aztec Connect', 'Penumbra', 'Secret Network DeFi', 'Railgun (DeFi)', 'Renegade', 'Shade Protocol', 'Portal Gate'],
    ARRAY['private DeFi', 'confidential', 'ZK DeFi', 'shielded', 'aztec', 'penumbra', 'secret', 'encrypted'],
    FALSE,
    FALSE,
    TRUE
);

-- ============================================================
-- CATEGORY: GOVERNANCE (1 type)
-- ============================================================

INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'DAO',
    'DAO Tools',
    'DAO Tools',
    'Governance',
    'Tools and platforms for creating and managing Decentralized Autonomous Organizations. Provides voting, proposal management, treasury control, and member coordination for on-chain governance.',
    ARRAY[
        'Proposal creation and voting',
        'Token-weighted governance',
        'Treasury management',
        'Multi-sig execution',
        'Delegation systems',
        'Off-chain voting (Snapshot)',
        'On-chain execution',
        'Membership management',
        'Governance analytics'
    ],
    ARRAY[
        'Centralized corporate governance',
        'Simple multi-sig wallets',
        'Token distribution platforms',
        'Social coordination tools'
    ],
    ARRAY[
        'Governance attacks (vote buying)',
        'Low voter participation',
        'Whale domination',
        'Flash loan governance attacks',
        'Proposal spam',
        'Smart contract vulnerabilities',
        'Execution delays exploitation',
        'Sybil attacks'
    ],
    ARRAY['Snapshot', 'Tally', 'Aragon', 'DAOstack', 'Colony', 'Boardroom', 'Zodiac', 'Governor (OpenZeppelin)'],
    ARRAY['DAO', 'governance', 'voting', 'proposal', 'treasury', 'snapshot', 'aragon', 'decentralized organization'],
    FALSE,
    FALSE,
    TRUE
);

-- ============================================================
-- CATEGORY: STANDARD (1 type)
-- ============================================================

INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'Protocol',
    'Protocol / Standard',
    'Protocol / Standard',
    'Standard',
    'Set of rules, specifications, or best practices for crypto security, key management, or wallet implementation. Reference documents, libraries, or frameworks that other products implement.',
    ARRAY[
        'Security standards and frameworks',
        'Key derivation specifications (BIP32, BIP39, BIP44)',
        'Signature schemes and algorithms',
        'Best practice guidelines',
        'Implementation libraries',
        'Audit frameworks',
        'Certification programs',
        'Educational resources'
    ],
    ARRAY[
        'End-user products',
        'Consumer applications',
        'Trading platforms',
        'Custodial services'
    ],
    ARRAY[
        'Specification ambiguity',
        'Implementation errors by adopters',
        'Outdated recommendations',
        'Lack of maintenance',
        'Incomplete threat models',
        'Adoption fragmentation'
    ],
    ARRAY['BIP39', 'BIP32', 'BIP44', 'SLIP39', 'CCSS (CryptoCurrency Security Standard)', 'OpenZeppelin', 'ERC standards'],
    ARRAY['protocol', 'standard', 'BIP', 'specification', 'framework', 'best practice', 'reference', 'ERC'],
    FALSE,
    FALSE,
    TRUE
);

-- ============================================================
-- CATEGORY: CONSUMER (7 types: GameFi, Metaverse, SocialFi, Messaging, Quest, NFT Tools, Fan Token)
-- ============================================================

INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'GameFi',
    'GameFi Platform',
    'GameFi Platform',
    'Consumer',
    'Blockchain-based gaming platform integrating play-to-earn mechanics, in-game NFT assets, and token economies. Players can earn, trade, and own digital assets with real value through gameplay.',
    ARRAY[
        'Play-to-earn mechanics',
        'In-game NFT assets (characters, items, land)',
        'Native game tokens',
        'On-chain asset ownership',
        'Marketplace for trading',
        'Guild and scholarship systems',
        'Cross-game interoperability (some)',
        'Staking and rewards'
    ],
    ARRAY[
        'Traditional gaming (no blockchain)',
        'Pure NFT collectibles',
        'Casino/gambling platforms',
        'Metaverse without gaming'
    ],
    ARRAY[
        'Token economic collapse',
        'Smart contract vulnerabilities',
        'Game abandonment by developers',
        'Ponzi-like reward structures',
        'NFT liquidity issues',
        'Regulatory uncertainty',
        'Bot exploitation',
        'Server centralization'
    ],
    ARRAY['Axie Infinity', 'Immutable X', 'Gala Games', 'Illuvium', 'Gods Unchained', 'Star Atlas', 'Big Time', 'Pixels'],
    ARRAY['gamefi', 'play-to-earn', 'P2E', 'gaming', 'NFT game', 'axie', 'blockchain game'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Metaverse',
    'Metaverse Platform',
    'Metaverse Platform',
    'Consumer',
    'Virtual world platform with blockchain-based ownership of land, avatars, and digital assets. Users can explore, socialize, build, and trade in persistent 3D environments with real economic value.',
    ARRAY[
        'Virtual land ownership (NFTs)',
        'Avatar customization and ownership',
        'User-generated content and building',
        'Social spaces and events',
        'Virtual real estate marketplace',
        'In-world economy and commerce',
        'Wearables and accessories (NFTs)',
        'Cross-platform interoperability'
    ],
    ARRAY[
        'GameFi (gameplay focus)',
        'VR-only applications',
        'Centralized virtual worlds (Roblox, Fortnite)',
        'Pure NFT collections'
    ],
    ARRAY[
        'Land value speculation and crashes',
        'Low user adoption/empty worlds',
        'Platform abandonment',
        'Technical scalability issues',
        'NFT liquidity for assets',
        'High entry costs (land, wearables)',
        'Centralized server infrastructure',
        'Regulatory uncertainty'
    ],
    ARRAY['Decentraland', 'The Sandbox', 'Otherside', 'Somnium Space', 'Spatial', 'Voxels', 'Horizon Worlds (Web2)', 'Roblox (Web2)'],
    ARRAY['metaverse', 'virtual world', 'decentraland', 'sandbox', 'virtual land', 'avatar', 'virtual real estate', '3D'],
    FALSE,
    FALSE,
    TRUE
);

-- SocialFi (Consumer category)
INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'SocialFi',
    'SocialFi Platform',
    'SocialFi Platform',
    'Consumer',
    'Decentralized social networking protocol or platform enabling users to own their social graph, content, and monetize their influence. Users control their data and can port it across applications.',
    ARRAY[
        'Decentralized social graph',
        'User-owned content and data',
        'Token-based monetization',
        'Creator tokens and social tokens',
        'Cross-platform portability',
        'On-chain reputation',
        'Censorship resistance',
        'Direct creator-fan economics'
    ],
    ARRAY[
        'Traditional social media (Web2)',
        'Centralized platforms',
        'Pure messaging apps',
        'Content-only platforms'
    ],
    ARRAY[
        'Network effect challenges',
        'Content moderation complexity',
        'Speculation on social tokens',
        'Privacy concerns (public blockchain)',
        'Scalability limitations',
        'User experience friction',
        'Regulatory uncertainty',
        'Sybil attacks on reputation'
    ],
    ARRAY['Lens Protocol', 'Farcaster', 'Friend.tech', 'DeSo', 'CyberConnect', 'Minds', 'Steemit', 'Mirror'],
    ARRAY['socialfi', 'social', 'web3 social', 'lens', 'farcaster', 'creator', 'social graph', 'decentralized social'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Messaging',
    'Decentralized Messaging',
    'Decentralized Messaging',
    'Consumer',
    'Decentralized communication protocol enabling encrypted messaging without centralized servers. Messages are stored and routed through distributed networks, ensuring privacy and censorship resistance.',
    ARRAY[
        'End-to-end encryption',
        'Decentralized message routing',
        'Wallet-to-wallet messaging',
        'No central server',
        'Censorship resistance',
        'Group messaging',
        'Protocol interoperability',
        'On-chain identity integration'
    ],
    ARRAY[
        'Centralized messengers (WhatsApp, Telegram)',
        'Email services',
        'Social media DMs',
        'Enterprise communication tools'
    ],
    ARRAY[
        'Message delivery reliability',
        'Spam and abuse',
        'Key management complexity',
        'Network availability',
        'Metadata leakage',
        'User adoption challenges',
        'Cross-protocol compatibility',
        'Storage limitations'
    ],
    ARRAY['XMTP', 'Status', 'Waku', 'Push Protocol', 'Dialect', 'Notifi', 'WalletConnect Chat', 'Berty'],
    ARRAY['messaging', 'chat', 'XMTP', 'status', 'encrypted', 'wallet chat', 'decentralized messaging', 'communication'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Quest',
    'Airdrop / Quest Platform',
    'Airdrop / Quest Platform',
    'Consumer',
    'Platform for discovering and completing on-chain tasks (quests) to earn tokens, NFTs, or points. Used for airdrops, user acquisition, and community building. Aggregates opportunities across protocols.',
    ARRAY[
        'Quest and task completion',
        'Airdrop aggregation',
        'Points and rewards systems',
        'On-chain credential verification',
        'Learn-to-earn programs',
        'Community engagement campaigns',
        'Multi-chain quest support',
        'Leaderboards and competitions'
    ],
    ARRAY[
        'Direct protocol airdrops',
        'Social media campaigns',
        'Traditional referral programs',
        'Bounty platforms (bug bounties)'
    ],
    ARRAY[
        'Airdrop scams and phishing',
        'Sybil farming dilution',
        'Quest completion verification issues',
        'Token value volatility',
        'Platform reliability',
        'Privacy concerns (wallet tracking)',
        'Regulatory uncertainty (securities)',
        'Gas costs exceeding rewards'
    ],
    ARRAY['Galxe', 'Layer3', 'Rabbithole', 'Zealy', 'QuestN', 'Crew3', 'Intract', 'DeBank Quest'],
    ARRAY['quest', 'airdrop', 'galxe', 'layer3', 'rabbithole', 'points', 'earn', 'tasks', 'rewards'],
    FALSE,
    FALSE,
    TRUE
),
(
    'NFT Tools',
    'NFT Creation Tools',
    'Outils de Création NFT',
    'Consumer',
    'Platform for creating, minting, and managing NFT collections. Provides smart contract deployment, metadata management, royalty configuration, and distribution tools for creators without coding knowledge.',
    ARRAY[
        'No-code NFT minting',
        'Smart contract deployment',
        'Metadata management (IPFS, Arweave)',
        'Royalty configuration',
        'Edition and drop management',
        'Allowlist and presale tools',
        'Multi-chain support',
        'Creator dashboard and analytics'
    ],
    ARRAY[
        'NFT marketplaces (trading focus)',
        'GameFi NFTs',
        'General art creation tools',
        'Wallet apps'
    ],
    ARRAY[
        'Smart contract vulnerabilities',
        'Metadata storage reliability',
        'Royalty enforcement limitations',
        'Platform dependency',
        'Gas cost volatility',
        'Copyright and IP issues',
        'Marketplace delisting',
        'Regulatory uncertainty'
    ],
    ARRAY['Manifold', 'Zora', 'Foundation Create', 'Highlight', 'Decent', 'ThirdWeb NFT', 'Bueno', 'NiftyKit'],
    ARRAY['NFT tools', 'minting', 'manifold', 'zora', 'creator tools', 'NFT drop', 'smart contract', 'collection'],
    FALSE,
    TRUE,
    TRUE
),
(
    'Fan Token',
    'Fan Token Platform',
    'Plateforme Fan Token',
    'Consumer',
    'Platform enabling sports teams, celebrities, and brands to issue fan tokens. Token holders gain access to exclusive content, voting rights on minor decisions, rewards, and community membership.',
    ARRAY[
        'Fan token issuance',
        'Voting and polls for holders',
        'Exclusive content and rewards',
        'Gamification and points',
        'Merchandise and ticket discounts',
        'Meet-and-greet opportunities',
        'Leaderboards and fan engagement',
        'Secondary market trading'
    ],
    ARRAY[
        'Utility tokens (protocol governance)',
        'NFT collections',
        'Pure collectibles',
        'Sports betting platforms'
    ],
    ARRAY[
        'Token price speculation',
        'Limited utility delivery',
        'Team/brand dependency',
        'Regulatory scrutiny (securities)',
        'Fan exploitation concerns',
        'Liquidity issues',
        'Promise vs delivery gap',
        'Centralized control'
    ],
    ARRAY['Chiliz', 'Socios', 'Rally', 'BitCI', 'Santos FC Fan Token', 'PSG Fan Token', 'Juventus Fan Token'],
    ARRAY['fan token', 'chiliz', 'socios', 'sports', 'voting', 'fan engagement', 'team token', 'community'],
    FALSE,
    TRUE,
    TRUE
);

-- Identity (Infrastructure category)
INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'Identity',
    'Decentralized Identity',
    'Decentralized Identity',
    'Infrastructure',
    'Protocol or service enabling self-sovereign digital identity, verifiable credentials, and decentralized identifiers (DIDs). Users control their identity data without centralized authorities.',
    ARRAY[
        'Decentralized identifiers (DIDs)',
        'Verifiable credentials',
        'Self-sovereign identity',
        'On-chain attestations',
        'KYC/proof of humanity',
        'Domain names as identity (ENS)',
        'Soulbound tokens (SBTs)',
        'Privacy-preserving verification'
    ],
    ARRAY[
        'Centralized KYC providers',
        'Traditional identity documents',
        'Social login (OAuth)',
        'Custodial identity services'
    ],
    ARRAY[
        'Privacy risks (on-chain data)',
        'Key loss = identity loss',
        'Fake identity/sybil attacks',
        'Regulatory compliance challenges',
        'Interoperability fragmentation',
        'Adoption barriers',
        'Biometric data security',
        'Irreversible attestations'
    ],
    ARRAY['ENS', 'Worldcoin', 'Polygon ID', 'Civic', 'Gitcoin Passport', 'BrightID', 'Spruce', 'Unstoppable Domains'],
    ARRAY['identity', 'DID', 'ENS', 'KYC', 'verification', 'soulbound', 'attestation', 'self-sovereign'],
    FALSE,
    FALSE,
    TRUE
);

-- ============================================================
-- CATEGORY: DEPIN (4 types: Storage, Compute, dVPN, Mining)
-- ============================================================

INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'Storage',
    'Decentralized Storage',
    'Decentralized Storage',
    'DePIN',
    'Protocol for storing data across a distributed network of nodes rather than centralized servers. Provides censorship-resistant, redundant storage with cryptographic proofs of data availability.',
    ARRAY[
        'Distributed file storage',
        'Content addressing (CID/hash)',
        'Proof of storage/spacetime',
        'Data redundancy and replication',
        'Permanent/persistent storage',
        'Encryption options',
        'Storage marketplace',
        'Retrieval networks'
    ],
    ARRAY[
        'Centralized cloud storage (AWS, GCP)',
        'Traditional databases',
        'CDN services',
        'Local storage solutions'
    ],
    ARRAY[
        'Data availability guarantees',
        'Retrieval speed/latency',
        'Storage provider reliability',
        'Economic sustainability',
        'Data loss if network fails',
        'Illegal content liability',
        'Complexity for end users',
        'Cost volatility'
    ],
    ARRAY['Filecoin', 'Arweave', 'IPFS', 'Storj', 'Sia', 'Ceramic', 'Akord', 'Web3.Storage'],
    ARRAY['storage', 'filecoin', 'arweave', 'IPFS', 'decentralized storage', 'permanent', 'distributed'],
    FALSE,
    FALSE,
    TRUE
);

-- Compute (DePIN category)
INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'Compute',
    'Decentralized Compute',
    'Decentralized Compute',
    'DePIN',
    'Protocol providing distributed computing resources (GPU, CPU) through a decentralized network. Enables access to computational power for AI training, rendering, scientific computing without centralized providers.',
    ARRAY[
        'Distributed GPU/CPU marketplace',
        'AI/ML training infrastructure',
        'Rendering services',
        'Serverless compute',
        'Verifiable computation',
        'Task scheduling and allocation',
        'Provider staking and reputation',
        'Pay-per-use pricing'
    ],
    ARRAY[
        'Centralized cloud compute (AWS, GCP)',
        'Traditional data centers',
        'On-premise servers',
        'Blockchain validators (different purpose)'
    ],
    ARRAY[
        'Computation verification challenges',
        'Provider reliability',
        'Data privacy during compute',
        'Latency and performance',
        'Resource availability',
        'Economic sustainability',
        'Hardware heterogeneity',
        'Malicious compute providers'
    ],
    ARRAY['Render Network', 'Akash', 'Golem', 'io.net', 'Gensyn', 'Together AI', 'Flux', 'iExec'],
    ARRAY['compute', 'GPU', 'AI', 'render', 'akash', 'decentralized compute', 'DePIN', 'distributed computing'],
    FALSE,
    FALSE,
    TRUE
),
(
    'dVPN',
    'Decentralized VPN',
    'Decentralized VPN',
    'DePIN',
    'Decentralized Virtual Private Network using distributed node operators instead of centralized servers. Provides censorship-resistant, private internet access with token incentives for bandwidth providers.',
    ARRAY[
        'Distributed node network',
        'Encrypted traffic routing',
        'No-logs by design',
        'Token-incentivized bandwidth',
        'Geographic distribution',
        'Pay-per-use model',
        'Censorship resistance',
        'Multi-hop routing options'
    ],
    ARRAY[
        'Centralized VPN services',
        'Tor network (different architecture)',
        'Enterprise VPN solutions',
        'ISP services'
    ],
    ARRAY[
        'Node operator reliability',
        'Bandwidth quality variance',
        'Exit node legal liability',
        'Traffic analysis attacks',
        'Malicious node operators',
        'Connection stability',
        'Speed limitations',
        'Regulatory concerns'
    ],
    ARRAY['Orchid', 'Mysterium', 'Sentinel', 'Deeper Network', 'NYM', 'Boring Protocol', 'Hopr'],
    ARRAY['dVPN', 'decentralized VPN', 'privacy', 'bandwidth', 'orchid', 'mysterium', 'sentinel', 'anonymous'],
    FALSE,
    FALSE,
    TRUE
),
(
    'Mining',
    'Mining Pool',
    'Mining Pool',
    'DePIN',
    'Pooled mining infrastructure for Proof-of-Work networks where miners combine hash power to increase probability of finding blocks. Rewards are distributed proportionally among participants minus pool fees.',
    ARRAY[
        'Hash power aggregation',
        'Block reward distribution',
        'PPLNS/PPS payment methods',
        'Mining software integration',
        'Real-time hashrate monitoring',
        'Multi-coin mining support',
        'Stratum protocol support',
        'Payout thresholds and scheduling'
    ],
    ARRAY[
        'Solo mining',
        'Cloud mining contracts',
        'Proof-of-Stake validation',
        'Hardware sales'
    ],
    ARRAY[
        'Pool centralization risks',
        'Payout delays or defaults',
        'Pool hopping attacks',
        'Selfish mining strategies',
        'Regulatory restrictions (energy)',
        'Hash rate fluctuations',
        'Pool fee changes',
        '51% attack concerns'
    ],
    ARRAY['Foundry USA', 'F2Pool', 'Antpool', 'Braiins Pool', 'ViaBTC', 'Poolin', 'Luxor', 'Ocean'],
    ARRAY['mining', 'pool', 'hashrate', 'bitcoin mining', 'PoW', 'ASIC', 'F2Pool', 'foundry'],
    FALSE,
    FALSE,
    TRUE
);

-- ============================================================
-- CATEGORY: AI (1 type)
-- ============================================================

INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'AI Agent',
    'Decentralized AI Agent',
    'Decentralized AI Agent',
    'AI',
    'Autonomous AI agents operating on blockchain infrastructure. Includes AI-powered trading bots, autonomous economic agents, decentralized AI networks, and agent-to-agent communication protocols.',
    ARRAY[
        'Autonomous agent execution',
        'On-chain AI interactions',
        'Agent-to-agent protocols',
        'Token-incentivized AI services',
        'Decentralized inference',
        'AI model marketplaces',
        'Autonomous trading agents',
        'Multi-agent systems'
    ],
    ARRAY[
        'Centralized AI services (OpenAI, etc.)',
        'Traditional trading bots',
        'Off-chain AI models',
        'Simple automation scripts'
    ],
    ARRAY[
        'AI model reliability',
        'Agent misbehavior',
        'Economic attack vectors',
        'Inference verification',
        'Model bias and errors',
        'Unintended autonomous actions',
        'Regulatory uncertainty',
        'Resource consumption costs'
    ],
    ARRAY['Fetch.ai', 'Autonolas', 'SingularityNET', 'Bittensor', 'Virtuals Protocol', 'AI16z', 'AIXBT', 'Spectral'],
    ARRAY['AI agent', 'autonomous', 'fetch.ai', 'autonolas', 'bittensor', 'decentralized AI', 'agent', 'inference'],
    FALSE,
    FALSE,
    TRUE
);

-- ============================================================
-- CATEGORY: SECURITY (2 types)
-- ============================================================

INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'Security',
    'Security Audit & Bug Bounty',
    'Security Audit & Bug Bounty',
    'Security',
    'Security services for blockchain projects including smart contract audits, penetration testing, and bug bounty platforms. Critical infrastructure for identifying vulnerabilities before exploitation.',
    ARRAY[
        'Smart contract audits',
        'Security assessments',
        'Bug bounty programs',
        'Penetration testing',
        'Formal verification',
        'Security monitoring',
        'Incident response',
        'Vulnerability disclosure'
    ],
    ARRAY[
        'In-house security teams',
        'General IT security firms',
        'Insurance providers',
        'Legal services'
    ],
    ARRAY[
        'Audit quality variance',
        'False sense of security post-audit',
        'Auditor reputation risks',
        'Bug bounty payout disputes',
        'Responsible disclosure failures',
        'Scope limitations',
        'Time constraints on audits',
        'Evolving attack vectors'
    ],
    ARRAY['CertiK', 'Trail of Bits', 'OpenZeppelin', 'Immunefi', 'Code4rena', 'Sherlock', 'Spearbit', 'Consensys Diligence'],
    ARRAY['audit', 'security', 'bug bounty', 'certik', 'immunefi', 'smart contract audit', 'penetration test', 'vulnerability'],
    FALSE,
    FALSE,
    TRUE
),
(
    'MEV',
    'MEV Protection',
    'MEV Protection',
    'Security',
    'Tools and services protecting users from Maximal Extractable Value (MEV) exploitation including sandwich attacks, front-running, and back-running. Routes transactions through private mempools or uses cryptographic protection.',
    ARRAY[
        'Private transaction submission',
        'Sandwich attack protection',
        'Front-running prevention',
        'Private mempool access',
        'MEV-aware routing',
        'Flashbots integration',
        'Order flow auction',
        'Transaction privacy'
    ],
    ARRAY[
        'Standard public mempool transactions',
        'MEV extraction tools (searchers)',
        'Block building services',
        'Validator MEV strategies'
    ],
    ARRAY[
        'Private mempool centralization',
        'Latency and execution delays',
        'Failed transaction inclusion',
        'Limited protocol support',
        'Censorship concerns',
        'Service availability',
        'Trust in MEV protection providers',
        'Incomplete protection coverage'
    ],
    ARRAY['Flashbots Protect', 'MEV Blocker', 'CoW Protocol', 'MEVBlocker', 'Bloxroute', 'Eden Network', 'PropellerHeads', 'Blocknative'],
    ARRAY['MEV', 'flashbots', 'sandwich attack', 'front-running', 'private mempool', 'MEV protection', 'order flow'],
    FALSE,
    FALSE,
    TRUE
);

-- ============================================================
-- STEP 3.5: Set is_safe_applicable values
-- ============================================================
-- TRUE = SAFE cryptographic security score applies (manages keys/assets)
-- FALSE = SAFE score not applicable (read-only, services, no asset custody)

-- First, set all to TRUE (default for asset-managing types)
UPDATE product_types SET is_safe_applicable = TRUE;

-- Then set FALSE for types that don't manage assets directly
UPDATE product_types SET is_safe_applicable = FALSE
WHERE code IN (
    -- Infrastructure (read-only/services)
    'Oracle',
    'Node RPC',
    'Data Indexer',
    'Explorer',
    'Dev Tools',
    'Attestation',
    'Research',
    'Identity',
    -- Financial (service only)
    'Tax',
    -- Governance
    'DAO',
    -- Standard
    'Protocol',
    -- Consumer (no asset custody)
    'SocialFi',
    'Messaging',
    'Quest',
    -- DePIN (infrastructure services)
    'Storage',
    'Compute',
    'dVPN',
    'Mining',
    -- AI
    'AI Agent',
    -- Security (services)
    'Security',
    'MEV'
);

-- ============================================================
-- STEP 4: Add default pillar_weights
-- ============================================================

UPDATE product_types
SET pillar_weights = '{"S": 25, "A": 25, "F": 25, "E": 25}'::jsonb
WHERE pillar_weights IS NULL;

-- ============================================================
-- STEP 5: Final verification
-- ============================================================

SELECT
    id,
    code,
    name,
    category,
    LEFT(definition, 50) || '...' as definition_preview,
    is_hardware,
    is_custodial,
    is_safe_applicable
FROM product_types
ORDER BY id;

-- ============================================================
-- RESULT: 78 types logically organized by category (HW Hot removed)
-- ============================================================
--
-- HARDWARE (1)         : HW Cold                                       [SAFE: ALL]  (HW Hot removed - not standard)
-- SOFTWARE (6)         : SW Browser, SW Mobile, SW Desktop, MPC, MultiSig, Smart Wallet  [SAFE: ALL]
-- BACKUP (2)           : Bkp Digital, Bkp Physical                    [SAFE: ALL]
-- EXCHANGE (6)         : CEX, DEX, DEX Agg, OTC, NFT Market, Atomic Swap [SAFE: ALL]
-- DEFI (19)            : AMM, Lending, Yield, Liq Staking, Perps, Options, Synthetics, Index, Locker, Vesting, etc. [SAFE: ALL]
-- ASSET (3)            : RWA, Stablecoin, Wrapped                     [SAFE: ALL]
-- FINANCIAL (10)       : Card, Card Non-Cust, Crypto Bank, Custody, Payment, Fiat Gateway, Tax, CeFi Lending, Prime Brokerage, Treasury [SAFE: 9/10]
-- INFRASTRUCTURE (13)  : Bridges, L2, Validator, Interoperability, Account Abstraction [SAFE] | Oracle, Node/RPC, etc. [NO SAFE]
-- PRIVACY (2)          : Privacy, Private DeFi                        [SAFE: ALL]
-- GOVERNANCE (1)       : DAO                                          [SAFE: NONE]
-- STANDARD (1)         : Protocol                                     [SAFE: NONE]
-- CONSUMER (7)         : GameFi, Metaverse, NFT Tools, Fan Token [SAFE] | SocialFi, Messaging, Quest [NO SAFE]
-- DEPIN (4)            : Storage, Compute, dVPN, Mining               [SAFE: NONE]
-- AI (1)               : AI Agent                                     [SAFE: NONE]
-- SECURITY (2)         : Security Audit, MEV Protection               [SAFE: NONE]
--
-- TOTAL: 79 types across 15 categories
-- SAFE APPLICABLE: 57 types | NOT APPLICABLE: 22 types
-- ============================================================

-- Verification: Count SAFE applicable types
SELECT
    is_safe_applicable,
    COUNT(*) as count
FROM product_types
GROUP BY is_safe_applicable;

SELECT 'Done! 79 product types created with complete definitions.' as status;
