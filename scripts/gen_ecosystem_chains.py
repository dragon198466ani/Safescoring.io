#!/usr/bin/env python3
"""Generate summaries for Ecosystem blockchain support norms (E75-E101)."""

import requests
import time
import sys
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    3998: """## 1. Vue d'ensemble

Le critère **Local Backup** (E75) évalue la capacité de créer des sauvegardes locales complètes des données du wallet.

**Importance pour la sécurité crypto** : Les backups locaux permettent la récupération sans dépendance à des services tiers, préservant la souveraineté des données.

## 2. Spécifications Techniques

| Type backup | Contenu | Format |
|-------------|---------|--------|
| Seed phrase | BIP-39 mnemonic | 12/24 mots |
| Extended keys | xpub/xprv | Base58 |
| Wallet file | Keys + metadata | JSON chiffré |
| Full export | Historique + labels | Encrypted archive |

**Formats standards** :
- BIP-39 : Seed phrase universelle
- PSBT : Transactions non signées
- Wallet descriptors : Output scripts
- JSON wallet : Multiplateforme

**Chiffrement backup** :
- AES-256-GCM : Chiffrement symétrique
- scrypt/Argon2 : Dérivation mot de passe
- Age : Modern encryption tool

## 3. Application aux Produits Crypto

| Type de Produit | Local Backup |
|-----------------|--------------|
| Hardware Wallets | Seed phrase only |
| Software Wallets | Full encrypted export |
| CEX | Non applicable (custodial) |
| DEX | Via connected wallet |
| Mobile Wallets | iCloud/Google backup option |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Seed phrase uniquement |
| Intermédiaire | 56-70 | + Labels et historique |
| Avancé | 71-85 | Export chiffré complet |
| Expert | 86-100 | + Vérification intégrité |

## 5. Sources et Références

- [BIP-39 Specification](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [Wallet Backup Best Practices](https://bitcoin.org/en/secure-your-wallet)""",

    3999: """## 1. Vue d'ensemble

Le critère **Aptos** (E76) évalue le support de la blockchain Aptos (APT).

**Importance pour la sécurité crypto** : Aptos utilise le langage Move pour des smart contracts plus sécurisés et une finalité rapide des transactions.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Consensus | AptosBFT (DiemBFT v4) |
| TPS | 100,000+ (théorique) |
| Finalité | <1 seconde |
| Langage | Move |
| VM | Move VM |
| Clés | Ed25519, MultiEd25519 |

**Caractéristiques sécurité Move** :
- Resource-oriented programming
- Formal verification possible
- No reentrancy attacks
- Type safety

**Adresses** :
- Format : 64 caractères hex (32 bytes)
- Préfixe : 0x
- Exemple : 0x1234...abcd

## 3. Application aux Produits Crypto

| Type de Produit | Aptos Support |
|-----------------|---------------|
| Hardware Wallets | Ledger (app), Keystone |
| Software Wallets | Petra, Martian, Pontem |
| CEX | Binance, Coinbase, OKX |
| DEX | PancakeSwap, Liquidswap |
| DeFi | Aries, Thala |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | APT view only |
| Intermédiaire | 56-70 | APT send/receive |
| Avancé | 71-85 | + Tokens APT |
| Expert | 86-100 | + DeFi integration |

## 5. Sources et Références

- [Aptos Documentation](https://aptos.dev/)
- [Move Language](https://move-language.github.io/move/)""",

    4000: """## 1. Vue d'ensemble

Le critère **Near Protocol** (E77) évalue le support de la blockchain NEAR.

**Importance pour la sécurité crypto** : NEAR offre une UX simplifiée avec noms de compte lisibles et récupération sociale native.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Consensus | Nightshade (Proof of Stake) |
| TPS | 100,000 (sharded) |
| Finalité | ~2 secondes |
| Langage | Rust, AssemblyScript |
| Sharding | Dynamic resharding |
| Clés | Ed25519 |

**Noms de compte** :
- Format : username.near
- Sous-comptes : sub.username.near
- Implicite : 64 hex chars

**Récupération sociale** :
- Seedless onboarding possible
- Email/phone recovery
- Multi-party recovery

## 3. Application aux Produits Crypto

| Type de Produit | NEAR Support |
|-----------------|--------------|
| Hardware Wallets | Ledger (app) |
| Software Wallets | NEAR Wallet, MyNearWallet, Meteor |
| CEX | Binance, Coinbase, KuCoin |
| DEX | Ref Finance, Jumbo |
| DeFi | Burrow, Meta Pool |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | NEAR view only |
| Intermédiaire | 56-70 | NEAR send/receive |
| Avancé | 71-85 | + Named accounts |
| Expert | 86-100 | + Staking + DeFi |

## 5. Sources et Références

- [NEAR Documentation](https://docs.near.org/)
- [NEAR White Paper](https://near.org/papers/nightshade/)""",

    4001: """## 1. Vue d'ensemble

Le critère **Fantom** (E78) évalue le support de la blockchain Fantom (FTM).

**Importance pour la sécurité crypto** : Fantom utilise un DAG-based consensus (Lachesis) offrant des transactions rapides et peu coûteuses.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Consensus | Lachesis (aBFT) |
| TPS | 4,500+ |
| Finalité | 1-2 secondes |
| VM | EVM compatible |
| Langage | Solidity |
| Chain ID | 250 |

**Caractéristiques Lachesis** :
- Asynchronous Byzantine Fault Tolerant
- Leaderless consensus
- DAG-based ordering
- Near-instant finality

**Tokens natifs** :
- FTM (Opera mainnet)
- ERC-20 FTM (Ethereum)
- BEP-20 FTM (BSC)

## 3. Application aux Produits Crypto

| Type de Produit | Fantom Support |
|-----------------|----------------|
| Hardware Wallets | Ledger, Trezor (EVM) |
| Software Wallets | MetaMask, Rabby |
| CEX | Binance, Coinbase, Crypto.com |
| DEX | SpookySwap, SpiritSwap |
| DeFi | Geist, Tarot, Beefy |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | FTM view only |
| Intermédiaire | 56-70 | FTM transactions |
| Avancé | 71-85 | + Tokens FTM |
| Expert | 86-100 | + DeFi native |

## 5. Sources et Références

- [Fantom Documentation](https://docs.fantom.foundation/)
- [Lachesis Consensus](https://arxiv.org/abs/2003.03926)""",

    4002: """## 1. Vue d'ensemble

Le critère **Cronos** (E79) évalue le support de la blockchain Cronos (CRO).

**Importance pour la sécurité crypto** : Cronos est la chaîne EVM de Crypto.com, offrant une intégration directe avec l'écosystème Crypto.com.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Consensus | Tendermint (PoA to PoS) |
| TPS | 300+ |
| Finalité | ~5-6 secondes |
| VM | EVM compatible |
| Langage | Solidity |
| Chain ID | 25 |

**Écosystème Crypto.com** :
- Crypto.com App : Exchange + DeFi
- Crypto.com DeFi Wallet
- Crypto.com NFT
- Cronos (EVM chain)

**Bridges** :
- Crypto.com → Cronos : Natif
- Ethereum → Cronos : Bridge
- Cosmos IBC : Inter-blockchain

## 3. Application aux Produits Crypto

| Type de Produit | Cronos Support |
|-----------------|----------------|
| Hardware Wallets | Ledger (EVM) |
| Software Wallets | MetaMask, Crypto.com DeFi Wallet |
| CEX | Crypto.com (native) |
| DEX | VVS Finance, MM Finance |
| DeFi | Tectonic, Ferro Protocol |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | CRO view only |
| Intermédiaire | 56-70 | CRO transactions |
| Avancé | 71-85 | + Tokens Cronos |
| Expert | 86-100 | + DeFi + Bridge |

## 5. Sources et Références

- [Cronos Documentation](https://docs.cronos.org/)
- [Crypto.com Chain](https://crypto.org/)""",

    4003: """## 1. Vue d'ensemble

Le critère **Hedera** (E80) évalue le support du réseau Hedera Hashgraph (HBAR).

**Importance pour la sécurité crypto** : Hedera utilise le consensus Hashgraph pour une finalité rapide avec gouvernance par grandes entreprises.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Consensus | Hashgraph (aBFT) |
| TPS | 10,000+ |
| Finalité | 3-5 secondes |
| Smart Contracts | Solidity (via HTS) |
| Gouvernance | 39 entreprises |

**Services Hedera** :
- HCS (Consensus Service)
- HTS (Token Service)
- HFS (File Service)
- Smart Contracts 2.0

**Caractéristiques Hashgraph** :
- aBFT mathematically proven
- No miners/stakers (council nodes)
- Fixed, predictable fees
- Carbon negative

## 3. Application aux Produits Crypto

| Type de Produit | Hedera Support |
|-----------------|----------------|
| Hardware Wallets | Ledger (app) |
| Software Wallets | HashPack, Blade, Kabila |
| CEX | Binance, Coinbase, OKX |
| DEX | SaucerSwap, HeliSwap |
| DeFi | Stader, DOVU |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | HBAR view only |
| Intermédiaire | 56-70 | HBAR transactions |
| Avancé | 71-85 | + HTS tokens |
| Expert | 86-100 | + NFTs + DeFi |

## 5. Sources et Références

- [Hedera Documentation](https://docs.hedera.com/)
- [Hashgraph Consensus Algorithm](https://www.hedera.com/papers)""",

    4004: """## 1. Vue d'ensemble

Le critère **Algorand** (E81) évalue le support de la blockchain Algorand (ALGO).

**Importance pour la sécurité crypto** : Algorand utilise Pure Proof of Stake avec finalité immédiate et smart contracts formellement vérifiables.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Consensus | Pure Proof of Stake (PPoS) |
| TPS | 6,000+ |
| Finalité | ~3.3 secondes |
| Smart Contracts | TEAL, PyTeal |
| VM | AVM (Algorand VM) |
| Clés | Ed25519 |

**Caractéristiques PPoS** :
- Pas de slashing
- Random committee selection
- Immediate finality
- No forks possible

**Types de comptes** :
- Standard : Ed25519 key pair
- Rekeyed : Changement de clé possible
- Multisig : M-of-N signatures

## 3. Application aux Produits Crypto

| Type de Produit | Algorand Support |
|-----------------|------------------|
| Hardware Wallets | Ledger (app) |
| Software Wallets | Pera, Defly, MyAlgo |
| CEX | Binance, Coinbase, Kraken |
| DEX | Tinyman, Pact, Humble |
| DeFi | Folks Finance, Algofi |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | ALGO view only |
| Intermédiaire | 56-70 | ALGO transactions |
| Avancé | 71-85 | + ASA tokens |
| Expert | 86-100 | + Staking + DeFi |

## 5. Sources et Références

- [Algorand Documentation](https://developer.algorand.org/)
- [Algorand Consensus](https://www.algorand.com/technology/protocol)""",

    4005: """## 1. Vue d'ensemble

Le critère **Stellar** (E82) évalue le support du réseau Stellar (XLM).

**Importance pour la sécurité crypto** : Stellar est optimisé pour les paiements transfrontaliers avec des frais quasi-nuls et une finalité rapide.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Consensus | SCP (Stellar Consensus Protocol) |
| TPS | 1,000+ |
| Finalité | 3-5 secondes |
| Frais | 0.00001 XLM (~$0.000001) |
| Smart Contracts | Soroban (Rust) |

**Caractéristiques Stellar** :
- Federated Byzantine Agreement (FBA)
- Built-in DEX
- Anchors for fiat on/off ramps
- Path payments

**Types d'actifs** :
- XLM : Native token
- Trustlines : Tokens émis
- Soroban tokens : Smart contracts

## 3. Application aux Produits Crypto

| Type de Produit | Stellar Support |
|-----------------|-----------------|
| Hardware Wallets | Ledger (app) |
| Software Wallets | Lobstr, Solar, Freighter |
| CEX | Binance, Coinbase, Kraken |
| DEX | StellarX, StellarTerm |
| DeFi | Soroban ecosystem |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | XLM view only |
| Intermédiaire | 56-70 | XLM send/receive |
| Avancé | 71-85 | + Trustlines |
| Expert | 86-100 | + Soroban + DEX |

## 5. Sources et Références

- [Stellar Documentation](https://developers.stellar.org/)
- [SCP White Paper](https://www.stellar.org/papers/stellar-consensus-protocol)""",

    4006: """## 1. Vue d'ensemble

Le critère **TON** (E83) évalue le support de The Open Network (TON, ex-Telegram Open Network).

**Importance pour la sécurité crypto** : TON est intégré à Telegram avec 800M+ utilisateurs, offrant une adoption massive potentielle.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Consensus | PoS avec sharding |
| TPS | 1M+ (théorique, sharded) |
| Finalité | ~5 secondes |
| Smart Contracts | FunC, Tact |
| VM | TVM (TON Virtual Machine) |

**Architecture TON** :
- Masterchain : Consensus global
- Workchains : Parallel processing
- Shardchains : Dynamic sharding
- Infinite sharding paradigm

**Intégration Telegram** :
- @wallet bot : Wallet intégré
- TON Space : Self-custody
- Telegram Stars : Micro-payments

## 3. Application aux Produits Crypto

| Type de Produit | TON Support |
|-----------------|-------------|
| Hardware Wallets | Ledger (app), Keystone |
| Software Wallets | Tonkeeper, TON Space, MyTonWallet |
| CEX | Binance, OKX, Bybit |
| DEX | STON.fi, DeDust |
| DeFi | TON ecosystem |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | TON view only |
| Intermédiaire | 56-70 | TON transactions |
| Avancé | 71-85 | + Jettons (tokens) |
| Expert | 86-100 | + NFT + DeFi |

## 5. Sources et Références

- [TON Documentation](https://docs.ton.org/)
- [TON White Paper](https://ton.org/whitepaper.pdf)""",

    4007: """## 1. Vue d'ensemble

Le critère **Sei** (E84) évalue le support de la blockchain Sei Network.

**Importance pour la sécurité crypto** : Sei est optimisé pour le trading avec un orderbook on-chain et une finalité sub-seconde.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Consensus | Twin-turbo (Tendermint optimisé) |
| Finalité | ~300ms |
| TPS | 12,500+ |
| VM | EVM + CosmWasm |
| Parallelization | Oui |

**Optimisations trading** :
- Native order matching engine
- Frequent batch auctions
- MEV prevention built-in
- Parallel order execution

**Sei V2** :
- EVM compatibility
- Parallel processing
- SeiDB (optimized storage)

## 3. Application aux Produits Crypto

| Type de Produit | Sei Support |
|-----------------|-------------|
| Hardware Wallets | Ledger (Cosmos) |
| Software Wallets | Compass, Fin |
| CEX | Binance, Coinbase, KuCoin |
| DEX | Astroport, DragonSwap |
| DeFi | Kawa, Yaka Finance |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | SEI view only |
| Intermédiaire | 56-70 | SEI transactions |
| Avancé | 71-85 | + Trading features |
| Expert | 86-100 | + Orderbook + DeFi |

## 5. Sources et Références

- [Sei Documentation](https://docs.sei.io/)
- [Sei White Paper](https://github.com/sei-protocol/sei-chain/blob/main/whitepaper/Sei_Whitepaper.pdf)""",

    4008: """## 1. Vue d'ensemble

Le critère **Injective** (E85) évalue le support du protocole Injective (INJ).

**Importance pour la sécurité crypto** : Injective est une blockchain DeFi avec orderbook décentralisé et trading de dérivés.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Consensus | Tendermint PoS |
| TPS | 10,000+ |
| Finalité | ~1 seconde |
| VM | CosmWasm + inEVM |
| Interoperability | IBC, Wormhole |

**Features trading** :
- Zero gas fees (pour traders)
- Cross-chain orderbook
- Perpetuals, futures, options
- MEV resistant

**inEVM** :
- EVM compatible layer
- Runs on Injective
- Composable with Cosmos

## 3. Application aux Produits Crypto

| Type de Produit | Injective Support |
|-----------------|-------------------|
| Hardware Wallets | Ledger (Cosmos) |
| Software Wallets | Keplr, Leap, Ninji |
| CEX | Binance, Coinbase, OKX |
| DEX | Helix, DojoSwap |
| DeFi | Neptune, Hydro Protocol |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | INJ view only |
| Intermédiaire | 56-70 | INJ transactions |
| Avancé | 71-85 | + Staking |
| Expert | 86-100 | + Trading + DeFi |

## 5. Sources et Références

- [Injective Documentation](https://docs.injective.network/)
- [Injective Protocol](https://injective.com/)""",

    4009: """## 1. Vue d'ensemble

Le critère **Celestia** (E86) évalue le support de Celestia, la première blockchain modulaire de data availability.

**Importance pour la sécurité crypto** : Celestia sépare consensus et data availability, permettant des rollups plus scalables et sécurisés.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Consensus | Tendermint PoS |
| TPS | Variable (DA layer) |
| Block time | ~15 secondes |
| Data availability | DAS (Data Availability Sampling) |
| Blob size | 2MB par bloc |

**Architecture modulaire** :
- Data Availability : Celestia
- Execution : Rollups (Ethereum, Cosmos, custom)
- Settlement : Flexible

**Blobstream** :
- Bridge vers Ethereum
- DA attestations on-chain
- Enables Ethereum rollups on Celestia DA

## 3. Application aux Produits Crypto

| Type de Produit | Celestia Support |
|-----------------|------------------|
| Hardware Wallets | Ledger (Cosmos app) |
| Software Wallets | Keplr, Leap |
| CEX | Binance, OKX, Bybit |
| Rollups | Manta, Eclipse, Dymension |
| Staking | Native delegation |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | TIA view only |
| Intermédiaire | 56-70 | TIA transactions |
| Avancé | 71-85 | + Staking |
| Expert | 86-100 | + Blob posting |

## 5. Sources et Références

- [Celestia Documentation](https://docs.celestia.org/)
- [Data Availability Sampling](https://arxiv.org/abs/1809.09044)""",

    4010: """## 1. Vue d'ensemble

Le critère **zkSync Era** (E87) évalue le support de zkSync Era, le ZK rollup d'Ethereum.

**Importance pour la sécurité crypto** : zkSync Era offre la sécurité d'Ethereum avec des frais réduits grâce aux preuves à connaissance nulle.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Type | ZK Rollup (zkEVM) |
| Sécurité | Ethereum L1 |
| TPS | 2,000+ |
| Finalité | ~1 heure (L1 finality) |
| Preuves | PLONK + Boojum |
| EVM | Type 4 zkEVM |

**Caractéristiques zkSync** :
- Native Account Abstraction
- Paymaster (gas sponsoring)
- LLVM compiler
- Hyperchains (L3s)

**Différence Era vs Lite** :
- Lite : Payments only
- Era : Full smart contracts

## 3. Application aux Produits Crypto

| Type de Produit | zkSync Support |
|-----------------|----------------|
| Hardware Wallets | Ledger (Ethereum app) |
| Software Wallets | MetaMask, Argent, Rabby |
| CEX | Binance, OKX, Bybit |
| DEX | SyncSwap, Mute, SpaceFi |
| DeFi | Reactor Fusion, ZeroLend |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | ETH on zkSync view |
| Intermédiaire | 56-70 | Transactions L2 |
| Avancé | 71-85 | + Tokens + Bridge |
| Expert | 86-100 | + DeFi + Paymaster |

## 5. Sources et Références

- [zkSync Documentation](https://docs.zksync.io/)
- [zkSync Era](https://era.zksync.io/)""",

    4011: """## 1. Vue d'ensemble

Le critère **Linea** (E88) évalue le support de Linea, le ZK rollup développé par ConsenSys (MetaMask).

**Importance pour la sécurité crypto** : Linea offre une intégration native avec MetaMask et l'écosystème ConsenSys.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Type | ZK Rollup (zkEVM) |
| Développeur | ConsenSys |
| TPS | 100+ (current) |
| Finalité | ~8 heures (L1) |
| EVM | Type 2 zkEVM |
| Chain ID | 59144 |

**zkEVM Type 2** :
- Pleine compatibilité bytecode
- Tous opcodes supportés
- Pas de modification Solidity

**Intégration ConsenSys** :
- MetaMask native
- Infura support
- Truffle/Hardhat compatible

## 3. Application aux Produits Crypto

| Type de Produit | Linea Support |
|-----------------|---------------|
| Hardware Wallets | Ledger (EVM) |
| Software Wallets | MetaMask (native), Rabby |
| CEX | Binance, OKX |
| DEX | SyncSwap, Velocore |
| DeFi | LineaBank, Mendi Finance |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | ETH on Linea view |
| Intermédiaire | 56-70 | Transactions L2 |
| Avancé | 71-85 | + Tokens + Bridge |
| Expert | 86-100 | + DeFi ecosystem |

## 5. Sources et Références

- [Linea Documentation](https://docs.linea.build/)
- [ConsenSys zkEVM](https://consensys.io/zkevm)""",

    4012: """## 1. Vue d'ensemble

Le critère **Scroll** (E89) évalue le support de Scroll, le ZK rollup zkEVM natif.

**Importance pour la sécurité crypto** : Scroll vise une compatibilité EVM maximale avec des preuves ZK natives.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Type | ZK Rollup (zkEVM) |
| TPS | 100+ (current) |
| Finalité | ~4 heures (L1) |
| EVM | Type 2-2.5 zkEVM |
| Preuves | zkEVM circuits custom |
| Chain ID | 534352 |

**Architecture Scroll** :
- Sequencer : Ordonne transactions
- Coordinator : Génère preuves
- Roller Network : Provers décentralisés
- Bridge : Canonical L1-L2

**Différenciateurs** :
- Open-source zkEVM
- Prover decentralization focus
- EVM-native approach

## 3. Application aux Produits Crypto

| Type de Produit | Scroll Support |
|-----------------|----------------|
| Hardware Wallets | Ledger (EVM) |
| Software Wallets | MetaMask, Rabby |
| CEX | Binance, OKX, Gate |
| DEX | Ambient, Nuri |
| DeFi | Aave, Rho Markets |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | ETH on Scroll view |
| Intermédiaire | 56-70 | Transactions L2 |
| Avancé | 71-85 | + Tokens + Bridge |
| Expert | 86-100 | + DeFi protocols |

## 5. Sources et Références

- [Scroll Documentation](https://docs.scroll.io/)
- [Scroll Architecture](https://scroll.io/blog/architecture)""",

    4013: """## 1. Vue d'ensemble

Le critère **Blast** (E90) évalue le support de Blast, l'Optimistic rollup avec native yield.

**Importance pour la sécurité crypto** : Blast offre un yield natif sur ETH et stablecoins, générant des revenus passifs automatiques.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Type | Optimistic Rollup |
| Base | OP Stack |
| Yield ETH | ~4% (Lido staking) |
| Yield USDB | ~5% (T-bills) |
| Finalité | ~7 jours (challenge) |
| Chain ID | 81457 |

**Native Yield** :
- ETH → Auto-rebasing
- Stablecoins → USDB (rebasing)
- Gas revenue → Developers
- Points system → Incentives

**Risques** :
- Centralized sequencer (launch)
- Yield source risk (Lido/MakerDAO)
- New protocol risk

## 3. Application aux Produits Crypto

| Type de Produit | Blast Support |
|-----------------|---------------|
| Hardware Wallets | Ledger (EVM) |
| Software Wallets | MetaMask, Rabby |
| CEX | Bitget, MEXC |
| DEX | Thruster, Ambient |
| DeFi | Juice Finance, Particle |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | ETH on Blast view |
| Intermédiaire | 56-70 | Transactions + Yield |
| Avancé | 71-85 | + USDB + Bridge |
| Expert | 86-100 | + DeFi + Points |

## 5. Sources et Références

- [Blast Documentation](https://docs.blast.io/)
- [Blast Mainnet](https://blast.io/)""",

    4014: """## 1. Vue d'ensemble

Le critère **Mode** (E91) évalue le support de Mode Network, l'Optimistic rollup avec séquenceur de frais partagés.

**Importance pour la sécurité crypto** : Mode redistribue les revenus du séquenceur aux développeurs et utilisateurs actifs.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Type | Optimistic Rollup |
| Base | OP Stack |
| TPS | 2000+ |
| Finalité | ~7 jours (challenge) |
| Chain ID | 34443 |
| Sequencer | Centralized (launch) |

**Sequencer Fee Sharing (SFS)** :
- Devs earn % of gas from their contracts
- Registered via SFS contract
- Passive income for builders

**Superchain** :
- Part of OP Superchain
- Shared sequencer future
- Cross-chain messaging

## 3. Application aux Produits Crypto

| Type de Produit | Mode Support |
|-----------------|--------------|
| Hardware Wallets | Ledger (EVM) |
| Software Wallets | MetaMask, Rabby |
| CEX | Bybit, Gate |
| DEX | Kim Exchange, SupSwap |
| DeFi | Ionic, LogX |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | ETH on Mode view |
| Intermédiaire | 56-70 | Transactions L2 |
| Avancé | 71-85 | + Bridge + Tokens |
| Expert | 86-100 | + DeFi + SFS |

## 5. Sources et Références

- [Mode Documentation](https://docs.mode.network/)
- [Mode SFS](https://docs.mode.network/introduction/sequencer-fee-sharing)""",

    4015: """## 1. Vue d'ensemble

Le critère **Manta Pacific** (E92) évalue le support de Manta Pacific, le L2 avec Universal Circuits pour privacy.

**Importance pour la sécurité crypto** : Manta combine la scalabilité d'un L2 avec des options de confidentialité ZK.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Type | Optimistic Rollup + ZK |
| Base | OP Stack + Celestia DA |
| TPS | 2000+ |
| Privacy | Universal Circuits |
| Chain ID | 169 |

**Manta Products** :
- Manta Pacific : L2 EVM
- Manta Atlantic : Polkadot parachain
- zkSBT : Soulbound tokens privés
- NPO : New Paradigm Launchpad

**Universal Circuits** :
- Programmable ZK compliance
- Selective disclosure
- zkBAB (Binance Account Bound) integration

## 3. Application aux Produits Crypto

| Type de Produit | Manta Support |
|-----------------|---------------|
| Hardware Wallets | Ledger (EVM) |
| Software Wallets | MetaMask, Rabby |
| CEX | Binance, OKX, Bybit |
| DEX | QuickSwap, Aperture |
| DeFi | LayerBank, Shoebill |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | ETH on Manta view |
| Intermédiaire | 56-70 | Transactions L2 |
| Avancé | 71-85 | + Privacy features |
| Expert | 86-100 | + zkSBT + DeFi |

## 5. Sources et Références

- [Manta Documentation](https://docs.manta.network/)
- [Universal Circuits](https://www.manta.network/universal-circuits)""",

    4016: """## 1. Vue d'ensemble

Le critère **Mantle** (E93) évalue le support de Mantle Network, le L2 avec data availability modulaire.

**Importance pour la sécurité crypto** : Mantle utilise une DA layer propre (MantleDA) pour réduire les coûts tout en maintenant la sécurité.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Type | Optimistic Rollup |
| Base | OP Stack modifié |
| DA | MantleDA (EigenDA based) |
| TPS | 500+ |
| Chain ID | 5000 |
| Treasury | $3B+ (BitDAO) |

**MantleDA** :
- Based on EigenDA
- Data availability committee
- Reduced calldata costs
- Fallback to Ethereum

**mETH** :
- Liquid staking ETH
- Used as gas token
- Yield-bearing

## 3. Application aux Produits Crypto

| Type de Produit | Mantle Support |
|-----------------|----------------|
| Hardware Wallets | Ledger (EVM) |
| Software Wallets | MetaMask, Rabby |
| CEX | Bybit (native), OKX |
| DEX | Agni Finance, FusionX |
| DeFi | Lendle, INIT Capital |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | ETH on Mantle view |
| Intermédiaire | 56-70 | Transactions + mETH |
| Avancé | 71-85 | + Bridge + Tokens |
| Expert | 86-100 | + DeFi ecosystem |

## 5. Sources et Références

- [Mantle Documentation](https://docs.mantle.xyz/)
- [MantleDA](https://www.mantle.xyz/blog/announcements/introducing-mantleda)""",

    4017: """## 1. Vue d'ensemble

Le critère **Taiko** (E94) évalue le support de Taiko, le rollup "based" décentralisé.

**Importance pour la sécurité crypto** : Taiko est le premier "based rollup" utilisant les validateurs Ethereum comme séquenceur décentralisé.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Type | Based Rollup (ZK) |
| Séquenceur | Ethereum validators |
| TPS | Variable |
| EVM | Type 1 zkEVM |
| Finalité | L1 block time |
| Chain ID | 167000 |

**Based Rollup** :
- Pas de séquenceur centralisé
- L1 validators ordonnent
- Censorship resistance maximale
- Live dès block 1

**Type 1 zkEVM** :
- 100% EVM equivalent
- Aucune modification
- Maximum compatibility
- Longer proving time

## 3. Application aux Produits Crypto

| Type de Produit | Taiko Support |
|-----------------|---------------|
| Hardware Wallets | Ledger (EVM) |
| Software Wallets | MetaMask, Rabby |
| CEX | OKX, Gate |
| DEX | Henjin, Panko |
| DeFi | Avalon Finance |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | ETH on Taiko view |
| Intermédiaire | 56-70 | Transactions L2 |
| Avancé | 71-85 | + Bridge + Tokens |
| Expert | 86-100 | + Proving participation |

## 5. Sources et Références

- [Taiko Documentation](https://docs.taiko.xyz/)
- [Based Rollups](https://taiko.mirror.xyz/7dfMydX1FqEx9_sOvhRt3V8hJksKSIWjzhCVu7FyMZU)""",

    4018: """## 1. Vue d'ensemble

Le critère **Ordinals Support** (E95) évalue le support du protocole Ordinals pour inscrire des données sur Bitcoin.

**Importance pour la sécurité crypto** : Ordinals permet les NFTs et tokens natifs sur Bitcoin, élargissant l'utilité de la blockchain.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Créateur | Casey Rodarmor |
| Launch | Janvier 2023 |
| Taille max | ~4MB (witness) |
| Tracking | Ordinal theory |
| Format | Inscription + content |

**Ordinal Theory** :
- Chaque satoshi numéroté
- FIFO tracking
- Rarity basée sur événements
- "Sat" comme unité fondamentale

**Types d'inscriptions** :
- Image : JPEG, PNG, GIF, WEBP, SVG
- Text : Plain text, JSON
- HTML : Pages web
- Audio/Video : Formats supportés

## 3. Application aux Produits Crypto

| Type de Produit | Ordinals Support |
|-----------------|------------------|
| Hardware Wallets | Ledger (partiel), Keystone |
| Software Wallets | Xverse, Unisat, Hiro |
| CEX | OKX, Binance (trading) |
| Marketplaces | Magic Eden, OrdinalsWallet |
| Indexers | ord, Hiro |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | View inscriptions |
| Intermédiaire | 56-70 | Send/receive inscriptions |
| Avancé | 71-85 | + Inscribe capability |
| Expert | 86-100 | + Rare sat tracking |

## 5. Sources et Références

- [Ordinals Documentation](https://docs.ordinals.com/)
- [Ordinal Theory Handbook](https://ordinals.com/)""",

    4019: """## 1. Vue d'ensemble

Le critère **BRC-20 Tokens** (E96) évalue le support des tokens BRC-20 sur Bitcoin.

**Importance pour la sécurité crypto** : BRC-20 apporte les tokens fongibles à Bitcoin via le protocole Ordinals.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Standard | BRC-20 |
| Base | Ordinals inscriptions |
| Operations | Deploy, Mint, Transfer |
| Format | JSON inscription |
| Tracking | Off-chain indexers |

**Format BRC-20** :
```json
{
  "p": "brc-20",
  "op": "deploy",
  "tick": "ordi",
  "max": "21000000",
  "lim": "1000"
}
```

**Limitations** :
- Indexer-dependent
- High fees pour transfers
- Pas de smart contracts
- Fragmentation standards

## 3. Application aux Produits Crypto

| Type de Produit | BRC-20 Support |
|-----------------|----------------|
| Hardware Wallets | Partiel (via SW wallets) |
| Software Wallets | Xverse, Unisat, OKX Wallet |
| CEX | OKX, Binance, Gate |
| DEX | Unisat Market |
| Indexers | Unisat, BestinSlot |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | View BRC-20 balance |
| Intermédiaire | 56-70 | Transfer BRC-20 |
| Avancé | 71-85 | + Mint participation |
| Expert | 86-100 | + Deploy + indexer integration |

## 5. Sources et Références

- [BRC-20 Standard](https://domo-2.gitbook.io/brc-20-experiment/)
- [Unisat Marketplace](https://unisat.io/)""",

    4020: """## 1. Vue d'ensemble

Le critère **Runes Protocol** (E97) évalue le support du protocole Runes pour les tokens fongibles sur Bitcoin.

**Importance pour la sécurité crypto** : Runes est une amélioration du BRC-20 par Casey Rodarmor, plus efficace et intégré au protocole Bitcoin.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Créateur | Casey Rodarmor |
| Launch | Avril 2024 (halving) |
| Encoding | OP_RETURN |
| UTXO | Natif (pas d'indexer) |
| Efficacité | 1 transaction = 1 transfer |

**Avantages vs BRC-20** :
- UTXO-based (pas d'indexer externe)
- Plus efficace (moins de données)
- Etching (deploy) on-chain
- Protocol-native

**Operations** :
- Etching : Créer une Rune
- Mint : Émettre tokens
- Transfer : Via UTXO

## 3. Application aux Produits Crypto

| Type de Produit | Runes Support |
|-----------------|---------------|
| Hardware Wallets | Ledger (partiel), Keystone |
| Software Wallets | Xverse, OKX Wallet, Unisat |
| CEX | OKX, Binance |
| Marketplaces | Magic Eden, OKX |
| Tools | Ord wallet, Luminex |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | View Runes balance |
| Intermédiaire | 56-70 | Transfer Runes |
| Avancé | 71-85 | + Mint participation |
| Expert | 86-100 | + Etching capability |

## 5. Sources et Références

- [Runes Protocol](https://docs.ordinals.com/runes.html)
- [Casey Rodarmor Runes](https://rodarmor.com/blog/runes/)""",

    4021: """## 1. Vue d'ensemble

Le critère **Atomicals** (E98) évalue le support du protocole Atomicals pour les actifs numériques sur Bitcoin.

**Importance pour la sécurité crypto** : Atomicals offre une alternative aux Ordinals avec un modèle UTXO natif et des fonctionnalités avancées.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Launch | 2023 |
| Model | UTXO-based |
| Tokens | ARC-20 |
| NFTs | Atomicals NFT |
| Names | Realms (.btc names) |

**Types d'Atomicals** :
- NFT : Non-fungible atomical
- FT (ARC-20) : Fungible tokens
- Realms : Naming system
- Containers : Collections

**Différences vs Ordinals** :
- UTXO coloring natif
- Pas besoin de numérotation sat
- Plus flexible pour tokens FT
- Realms namespace

## 3. Application aux Produits Crypto

| Type de Produit | Atomicals Support |
|-----------------|-------------------|
| Hardware Wallets | Limité |
| Software Wallets | Wizz Wallet, Atomicals Wallet |
| CEX | Quelques listés |
| Marketplaces | Atomicals Market, SatsX |
| Tools | atomicals-js CLI |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | View Atomicals |
| Intermédiaire | 56-70 | Transfer NFT/ARC-20 |
| Avancé | 71-85 | + Mint + Realms |
| Expert | 86-100 | + Container management |

## 5. Sources et Références

- [Atomicals Protocol](https://docs.atomicals.xyz/)
- [Atomicals GitHub](https://github.com/atomicals)""",

    4022: """## 1. Vue d'ensemble

Le critère **RGB Protocol** (E99) évalue le support du protocole RGB pour les smart contracts sur Bitcoin/Lightning.

**Importance pour la sécurité crypto** : RGB permet des smart contracts scalables et privés sur Bitcoin sans modifier le protocole base.

## 2. Spécifications Techniques

| Paramètre | Valeur |
|-----------|--------|
| Type | Client-side validation |
| Layer | Bitcoin + Lightning |
| Privacy | Par défaut |
| Scalability | Off-chain data |
| Standard | RGB20 (fungible), RGB21 (NFT) |

**Architecture RGB** :
- Commitments on-chain (OP_RETURN)
- State off-chain (client)
- Validation peer-to-peer
- Lightning integration

**Avantages** :
- Privacy : Données jamais on-chain
- Scalability : État off-chain
- Flexibility : Smart contracts
- Interop : Bitcoin + Lightning

## 3. Application aux Produits Crypto

| Type de Produit | RGB Support |
|-----------------|-------------|
| Hardware Wallets | Très limité |
| Software Wallets | BitMask, MyCitadel |
| CEX | Non encore |
| Infrastructure | LNP/BP Standards |
| Tools | rgb-cli, RGB node |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Awareness only |
| Intermédiaire | 56-70 | RGB20 receive |
| Avancé | 71-85 | + Transfer + Lightning |
| Expert | 86-100 | + Contract deployment |

## 5. Sources et Références

- [RGB Protocol](https://rgb.tech/)
- [LNP/BP Standards](https://github.com/LNP-BP/LNPBPs)""",

    4023: """## 1. Vue d'ensemble

Le critère **Native Staking** (E100) évalue le support du staking natif directement depuis l'interface du wallet.

**Importance pour la sécurité crypto** : Le staking natif permet de générer des revenus sans transférer les actifs vers des protocoles tiers.

## 2. Spécifications Techniques

| Réseau | APY typique | Lock-up | Slashing |
|--------|-------------|---------|----------|
| Ethereum | 3-5% | Variable | Oui |
| Solana | 6-8% | ~2-3 jours | Oui |
| Cardano | 4-5% | Non | Non |
| Polkadot | 12-15% | 28 jours | Oui |
| Cosmos | 15-20% | 21 jours | Oui |

**Types de staking** :
- Solo staking : Run validator (32 ETH)
- Delegated : Déléguer à validateur
- Pooled : Pools de staking
- Liquid : LST (stETH, rETH)

**Considérations** :
- Unbonding period
- Minimum stake amount
- Validator selection
- Reward frequency

## 3. Application aux Produits Crypto

| Type de Produit | Native Staking |
|-----------------|----------------|
| Hardware Wallets | Via companion apps |
| Software Wallets | Intégré (Exodus, Atomic) |
| CEX | Staking as a service |
| Mobile Wallets | One-click staking |
| DeFi Protocols | Liquid staking |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Liens externes |
| Intermédiaire | 56-70 | 1-2 chains supportées |
| Avancé | 71-85 | 5+ chains + validator choice |
| Expert | 86-100 | + Auto-compound + analytics |

## 5. Sources et Références

- [Ethereum Staking](https://ethereum.org/en/staking/)
- [Staking Rewards](https://www.stakingrewards.com/)""",

    4024: """## 1. Vue d'ensemble

Le critère **Liquid Staking** (E101) évalue le support des protocoles de liquid staking (LST).

**Importance pour la sécurité crypto** : Le liquid staking permet de staker tout en gardant la liquidité via des tokens représentatifs.

## 2. Spécifications Techniques

| Protocole | Token | Chain | TVL |
|-----------|-------|-------|-----|
| Lido | stETH | Ethereum | $30B+ |
| Rocket Pool | rETH | Ethereum | $4B+ |
| Marinade | mSOL | Solana | $1B+ |
| Stride | stATOM | Cosmos | $100M+ |
| Jito | jitoSOL | Solana | $2B+ |

**Mécanisme LST** :
1. Déposer native token
2. Recevoir LST (rebasing ou non)
3. Utiliser LST en DeFi
4. Unstake quand souhaité

**Types de LST** :
- Rebasing : stETH (balance augmente)
- Reward-bearing : rETH (valeur augmente)
- Hybrid : Selon protocole

## 3. Application aux Produits Crypto

| Type de Produit | Liquid Staking |
|-----------------|----------------|
| Hardware Wallets | Via DeFi apps |
| Software Wallets | Integration native |
| CEX | Wrapped LST trading |
| DEX | LST pools |
| DeFi Lending | LST as collateral |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | View LST balance |
| Intermédiaire | 56-70 | Stake/unstake via app |
| Avancé | 71-85 | Multiple LST protocols |
| Expert | 86-100 | + DeFi composability |

## 5. Sources et Références

- [Lido Finance](https://lido.fi/)
- [Rocket Pool](https://rocketpool.net/)
- [DeFi Llama LST](https://defillama.com/lsd)"""
}

def main():
    success = 0
    failed = 0

    for norm_id, summary in summaries.items():
        url = f'{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}'
        data = {
            'summary': summary,
            'summary_status': 'generated',
            'last_summarized_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }

        try:
            resp = requests.patch(url, headers=SUPABASE_HEADERS, json=data)
            if resp.status_code == 204:
                print(f"✓ {norm_id}: Updated successfully")
                success += 1
            else:
                print(f"✗ {norm_id}: HTTP {resp.status_code}")
                failed += 1
        except Exception as e:
            print(f"✗ {norm_id}: {e}")
            failed += 1

    print(f"\n=== Results: {success} success, {failed} failed ===")

if __name__ == '__main__':
    main()
