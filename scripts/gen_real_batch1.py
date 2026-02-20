#!/usr/bin/env python3
"""Generate summaries for actual norms in database - Batch 1."""

import requests
import sys
import time
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    3819: """## 1. Vue d'ensemble

Le critère **CRC Verification** (Cyclic Redundancy Check) évalue l'utilisation de codes de redondance cyclique pour détecter les erreurs de transmission ou de stockage des données critiques comme les seeds et les transactions.

Le CRC permet de détecter les corruptions de données avant qu'elles ne causent des pertes de fonds.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Algorithme CRC | Polynomial | Détection |
|----------------|-----------|-----------|
| CRC-8 | 0x07 | 1 bit error |
| CRC-16 | 0x8005 | Burst up to 16 bits |
| CRC-32 | 0x04C11DB7 | Standard Ethernet |
| CRC-32C | 0x1EDC6F41 | iSCSI, hardware accelerated |

**Utilisation dans crypto:**
| Application | CRC utilisé |
|-------------|-------------|
| BIP-39 checksum | SHA-256 based (pas CRC) |
| Bitcoin addresses | Double SHA-256 |
| Ethereum addresses | Keccak256 + EIP-55 |
| QR codes backup | Reed-Solomon |

**Différence CRC vs Checksum cryptographique:**
| Aspect | CRC | SHA/Keccak |
|--------|-----|------------|
| Vitesse | Très rapide | Plus lent |
| Sécurité | Détection erreurs | Intégrité + sécurité |
| Collision | Facile à forger | Résistant |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Communication USB** : CRC pour intégrité paquets
- **Storage interne** : Checksums sur données sensibles
- **Coldcard** : CRC sur fichiers microSD

### Backup Solutions
- **Cryptosteel/Billfodl** : Pas de CRC (physique)
- **QR Backups** : Reed-Solomon error correction
- **PSBT files** : Checksum intégré

### Software Wallets
- **Transaction broadcast** : CRC réseau
- **File storage** : Filesystem CRC

### CEX Infrastructure
- **Database** : Checksums sur balances
- **API** : Validation intégrité responses

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | CRC + crypto checksum sur données critiques | 100% |
| **Élevé** | CRC sur communications + storage | 75% |
| **Moyen** | CRC basique | 50% |
| **Basique** | Pas de vérification explicite | 25% |

## 5. Sources et Références

- [CRC Algorithm](https://en.wikipedia.org/wiki/Cyclic_redundancy_check)
- [BIP-39 Checksum](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
""",

    3820: """## 1. Vue d'ensemble

Le critère **Self-test at Boot** évalue si un appareil exécute des tests d'auto-diagnostic au démarrage pour vérifier l'intégrité du firmware, du Secure Element, et des composants critiques avant toute opération.

Un self-test détecte les compromissions ou dysfonctionnements avant qu'ils ne causent des dommages.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Test | Description | Standard |
|------|-------------|----------|
| **POST** | Power-On Self-Test | FIPS 140-3 |
| **KAT** | Known Answer Tests | FIPS 140-3 |
| **Integrity check** | Firmware signature | Common Criteria |
| **RNG test** | Entropy source health | NIST SP 800-90B |

**Tests FIPS 140-3 requis:**
| Test | Fréquence | Failure action |
|------|-----------|----------------|
| Crypto algorithm KAT | Boot + periodique | Zeroization |
| Software integrity | Boot | Halt |
| RNG health | Continu | Halt |
| Critical functions | Boot | Halt |

**Durée de boot typique (avec self-tests):**
| Device | Boot time | Tests inclus |
|--------|-----------|--------------|
| Ledger Nano | 2-3s | Secure boot + SE check |
| Trezor | 1-2s | Firmware verify |
| Coldcard | 3-5s | Full POST |
| HSMs | 30-60s | Complete FIPS tests |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** :
  - Secure boot chain
  - SE attestation check
  - Firmware integrity verification
- **Trezor** :
  - Bootloader verification
  - Firmware hash check
- **Coldcard** :
  - Extensive boot checks
  - "Brick Me" PIN protection
  - Anti-phishing words

### HSMs
- **Full FIPS 140-3 POST** obligatoire
- **Algorithmes KAT** : AES, RSA, ECDSA, SHA
- **Durée** : 30-60 secondes typique

### Software Wallets
- **Limited** : OS-level integrity seulement
- **Mobile** : App signature vérification
- **Browser** : Extension hash

### CEX Infrastructure
- **Servers** : Secure boot UEFI
- **HSMs** : Full POST
- **Network** : Integrity monitoring

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Full POST + KAT + integrity + halt on failure | 100% |
| **Élevé** | Boot verification + SE check | 80% |
| **Moyen** | Firmware signature only | 50% |
| **Basique** | Minimal boot checks | 25% |
| **Insuffisant** | No self-test | 0% |

## 5. Sources et Références

- [FIPS 140-3 Self-tests](https://csrc.nist.gov/publications/detail/fips/140/3/final)
- [NIST SP 800-90B Health Tests](https://csrc.nist.gov/publications/detail/sp/800-90b/final)
""",

    3821: """## 1. Vue d'ensemble

Le critère **Hermetic Seals** évalue l'utilisation de joints hermétiques pour protéger les composants électroniques contre l'humidité, la poussière, et les tentatives d'intrusion physique.

Les seals hermétiques sont essentiels pour la durabilité et la tamper-evidence des hardware wallets.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type de seal | Protection | Durabilité |
|--------------|-----------|------------|
| **Ultrasonic welding** | Très élevée | Permanent |
| **Epoxy potting** | Maximum | Irréversible |
| **Gaskets (O-rings)** | Eau/poussière | Remplaçable |
| **Adhesive seals** | Basique | Tamper-evident |

**Standards de protection:**
| Standard | Niveau | Description |
|----------|--------|-------------|
| IP67 | Élevé | Dust-tight, 1m water 30min |
| IP68 | Très élevé | Dust-tight, deeper water |
| MIL-STD-810 | Militaire | Environmental testing |

**Matériaux de sealing:**
| Matériau | Usage | Résistance |
|----------|-------|------------|
| Silicone | Gaskets | -60°C to 200°C |
| EPDM | O-rings | UV, ozone resistant |
| Epoxy | Potting | Chimique, mécanique |
| Polyuréthane | Coating | Flexible, durable |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger Nano** :
  - Boîtier ultrasonique soudé
  - Pas de vis apparentes
  - Tamper-evident design
- **Trezor** :
  - Ultrasonic welding
  - Ouverture = trace visible
- **Coldcard** :
  - Clear case option (inspection)
  - Sac anti-tamper numéroté
- **Keystone Pro** :
  - Self-destruct mesh
  - Sealed enclosure

### Metal Backup Solutions
- **Cryptosteel** : Acier inoxydable 316L
- **Billfodl** : Métal, pas de seal (design ouvert)
- **SeedPlate** : Titane, gravure permanente

### Considérations environnementales
| Facteur | Impact |
|---------|--------|
| Humidité | Corrosion PCB |
| Poussière | Court-circuits |
| Température | Batterie, écran |
| UV | Dégradation plastiques |

### HSMs
- **FIPS 140-3 Level 3+** : Tamper-evident enclosures
- **Potting** : Pour key zeroization

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | IP67+ rating + tamper-evident + potting | 100% |
| **Élevé** | Ultrasonic seal + tamper indication | 80% |
| **Moyen** | Basic sealing, tamper-evident | 50% |
| **Basique** | Standard enclosure | 25% |
| **Insuffisant** | No protection | 0% |

## 5. Sources et Références

- [IP Rating Guide](https://www.iec.ch/ip-ratings)
- [MIL-STD-810H](https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=36027)
- [FIPS 140-3 Physical Security](https://csrc.nist.gov/publications/detail/fips/140/3/final)
""",

    3822: """## 1. Vue d'ensemble

Le critère **Multi-chain 10+** évalue si un wallet ou une plateforme supporte au moins 10 blockchains différentes, offrant une diversification et une accessibilité accrue à l'écosystème crypto.

Le support multi-chain réduit la nécessité de multiples wallets.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Top 10 chains par TVL | TVL (2024) | Type |
|----------------------|------------|------|
| Ethereum | $50B+ | Smart contracts |
| Bitcoin | $1B+ (wrapped) | Store of value |
| Solana | $5B+ | High performance |
| Arbitrum | $15B+ | L2 Rollup |
| Optimism | $8B+ | L2 Rollup |
| Polygon | $1B+ | Sidechain |
| BSC | $5B+ | EVM compatible |
| Avalanche | $1B+ | Multi-chain |
| Base | $8B+ | L2 Coinbase |
| Sui | $1B+ | Move-based |

**Catégories de chains:**
| Type | Exemples |
|------|----------|
| EVM Compatible | ETH, Polygon, BSC, Arbitrum, Optimism |
| Non-EVM L1 | Solana, Cosmos, Polkadot, Near |
| Bitcoin-like | BTC, LTC, BCH, Doge |
| Move-based | Sui, Aptos |

**Challenges multi-chain:**
| Challenge | Solution |
|-----------|----------|
| Different address formats | Derivation per chain |
| Different signing | Chain-specific libraries |
| Different RPC | Multi-provider support |
| Gas tokens | Chain-native tokens |

## 3. Application aux Produits Crypto

### Hardware Wallets
| Wallet | Chains supportées |
|--------|-------------------|
| **Ledger** | 5000+ coins/tokens |
| **Trezor** | 1000+ coins/tokens |
| **Keystone** | 5500+ coins |
| **Coldcard** | Bitcoin-only |

### Software Wallets Multi-chain
| Wallet | Chains |
|--------|--------|
| **Trust Wallet** | 70+ chains |
| **MetaMask** | EVM chains only |
| **Rabby** | 100+ EVM chains |
| **Exodus** | 260+ assets |

### CEX
- **Binance** : 350+ coins
- **Coinbase** : 200+ coins
- **Kraken** : 200+ coins

### DeFi Aggregators
| Aggregator | Coverage |
|------------|----------|
| 1inch | 10+ chains |
| Paraswap | 7+ chains |
| Li.Fi | 20+ chains |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | 100+ chains avec full feature support | 100% |
| **Excellent** | 50-100 chains | 90% |
| **Bon** | 20-50 chains | 75% |
| **Standard** | 10-20 chains | 60% |
| **Minimal** | <10 chains | 40% |

## 5. Sources et Références

- [DeFiLlama Chains](https://defillama.com/chains)
- [CoinGecko Chain List](https://www.coingecko.com/en/categories/ethereum-ecosystem)
""",

    3823: """## 1. Vue d'ensemble

Le critère **Multi-chain 50+** représente un niveau avancé de support multi-chain, couvrant la majorité des écosystèmes actifs et permettant aux utilisateurs d'accéder à presque toutes les opportunités DeFi.

50+ chains couvre virtuellement tout l'écosystème crypto actif.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Catégorie | Chains incluses |
|-----------|-----------------|
| **EVM L1** | Ethereum, BSC, Avalanche, Fantom, Gnosis, Celo, Cronos |
| **EVM L2** | Arbitrum, Optimism, Base, zkSync, Polygon zkEVM, Linea, Scroll |
| **Non-EVM** | Solana, Cosmos ecosystem, Polkadot, Near, Sui, Aptos |
| **Bitcoin ecosystem** | BTC, Lightning, Stacks, RGB |
| **Sidechains** | Polygon PoS, xDai, Palm |

**Infrastructure requise pour 50+ chains:**
| Composant | Requirement |
|-----------|-------------|
| RPC endpoints | 50+ providers |
| Address derivation | Multiple standards |
| Signing | Chain-specific cryptography |
| Transaction building | Various formats |
| Fee estimation | Per-chain logic |

**Wallets atteignant 50+ chains:**
| Wallet | Chains | Method |
|--------|--------|--------|
| Trust Wallet | 70+ | Native |
| Rabby | 100+ | EVM focus |
| Exodus | 50+ | Native |
| Ledger Live | 50+ | Apps |

## 3. Application aux Produits Crypto

### Software Wallets
- **Trust Wallet** : 70+ blockchains natives
- **Rabby** : 100+ EVM chains
- **Rainbow** : EVM multi-chain
- **Phantom** : Solana, Ethereum, Polygon, Bitcoin

### Hardware Wallets
- **Ledger** : Via apps (5000+ assets)
- **Trezor** : Support étendu
- **Keystone** : 5500+ assets

### Bridges & Aggregators
| Protocol | Chains connectées |
|----------|------------------|
| LayerZero | 50+ |
| Wormhole | 30+ |
| Axelar | 50+ |
| Li.Fi | 20+ |

### Défis à 50+ chains
| Défi | Impact |
|------|--------|
| Security audits | Multiplicité |
| UX complexity | Chain switching |
| Maintenance | Updates constants |
| RPC reliability | Multi-provider |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | 100+ chains, excellent UX | 100% |
| **Excellent** | 50-100 chains | 90% |
| **Bon** | 30-50 chains | 75% |
| **Standard** | 10-30 chains | 60% |
| **Basique** | <10 chains | 40% |

## 5. Sources et Références

- [DefiLlama All Chains](https://defillama.com/chains)
- [Chainlist](https://chainlist.org/)
""",

    3824: """## 1. Vue d'ensemble

Le critère **Multi-chain 100+** représente le niveau maximum de couverture multi-chain, incluant virtuellement toutes les blockchains avec une activité significative, y compris les testnets et les chains émergentes.

100+ chains est le standard pour les wallets professionnels et institutionnels.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type de chain | Nombre approximatif |
|---------------|---------------------|
| EVM Mainnets | 100+ |
| EVM Testnets | 200+ |
| Non-EVM L1 | 30+ |
| Cosmos chains | 50+ |
| Polkadot parachains | 40+ |
| Total actifs | 500+ |

**Répartition par catégorie:**
| Écosystème | Chains majeures |
|------------|-----------------|
| Ethereum L2s | Arbitrum, Optimism, Base, zkSync, Linea, Scroll, Polygon zkEVM, Starknet |
| Alt L1 | Solana, Avalanche, Near, Sui, Aptos, Sei, Injective |
| Cosmos | Cosmos Hub, Osmosis, Celestia, dYdX, Stride, Juno, Evmos |
| Bitcoin | Bitcoin, Lightning, Stacks, RSK, Liquid |
| Gaming | Ronin, Immutable X, Beam |

**Infrastructure massive:**
| Composant | Scale |
|-----------|-------|
| RPC management | Load balancing 100+ |
| Security monitoring | Per-chain alerts |
| Gas oracle | Multi-chain feeds |
| Price feeds | 1000+ tokens |

## 3. Application aux Produits Crypto

### Professional Wallets
| Wallet | Coverage |
|--------|----------|
| **Rabby** | 200+ EVM chains |
| **Trust Wallet** | 100+ chains |
| **Ledger** | Via apps (5000+ assets) |

### Institutional Solutions
- **Fireblocks** : 40+ nativement
- **BitGo** : 600+ coins
- **Anchorage** : 100+ assets

### Infrastructure Providers
| Provider | Chains |
|----------|--------|
| Alchemy | 40+ |
| Infura | 10+ |
| QuickNode | 30+ |
| Ankr | 50+ |

### Considerations
| Aspect | Challenge |
|--------|-----------|
| Security | Audit impossible pour toutes |
| Support | Maintenance élevée |
| UX | Overwhelm utilisateurs |
| Reliability | Chains instables |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | 200+ chains, coverage complet | 100% |
| **Excellent** | 100-200 chains | 95% |
| **Très bon** | 50-100 chains | 85% |
| **Bon** | 20-50 chains | 70% |
| **Standard** | <20 chains | 50% |

## 5. Sources et Références

- [Chainlist - All EVM Chains](https://chainlist.org/)
- [Cosmos Ecosystem](https://cosmos.network/ecosystem)
- [Polkadot Parachains](https://polkadot.network/ecosystem/)
""",

    3825: """## 1. Vue d'ensemble

Le critère **NFT Support** évalue la capacité d'un wallet à afficher, gérer, transférer et interagir avec les NFTs (Non-Fungible Tokens) sur différentes blockchains.

Les NFTs représentent une part significative de l'activité crypto et nécessitent un support dédié.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Standard NFT | Blockchain | Features |
|--------------|-----------|----------|
| **ERC-721** | Ethereum/EVM | Single NFT |
| **ERC-1155** | Ethereum/EVM | Multi-token (fungible + NFT) |
| **SPL NFT** | Solana | Metaplex standard |
| **CW-721** | Cosmos | CosmWasm NFTs |
| **Ordinals** | Bitcoin | Inscriptions |

**Données NFT à afficher:**
| Donnée | Source |
|--------|--------|
| Image/Media | IPFS, Arweave, centralized |
| Metadata | Token URI |
| Collection | Contract info |
| Traits/Attributes | Metadata JSON |
| Rarity | Third-party APIs |

**Formats média supportés:**
| Format | Usage |
|--------|-------|
| PNG/JPEG | Images statiques |
| GIF | Animations simples |
| MP4/WebM | Vidéos |
| GLB/GLTF | 3D models |
| SVG | Vecteurs on-chain |
| Audio | Music NFTs |

## 3. Application aux Produits Crypto

### Software Wallets
| Wallet | NFT Support |
|--------|-------------|
| **MetaMask** | ERC-721/1155, basic display |
| **Rainbow** | Excellent gallery |
| **Phantom** | Solana + ETH NFTs |
| **Trust Wallet** | Multi-chain NFTs |
| **Zerion** | Portfolio + NFTs |

### Hardware Wallets
| Wallet | NFT Support |
|--------|-------------|
| **Ledger** | Via Ledger Live (limited) |
| **Trezor** | Via web wallets |
| **Keystone** | NFT signing |

### NFT Marketplaces
| Marketplace | Chains |
|-------------|--------|
| OpenSea | ETH, Polygon, Base, etc. |
| Blur | ETH focused |
| Magic Eden | Solana, ETH, BTC |
| Tensor | Solana |

### Features avancées
| Feature | Description |
|---------|-------------|
| Gallery view | Visual portfolio |
| Hidden/Spam filter | Security |
| Bulk transfer | Efficiency |
| Listing | Direct marketplace |
| Floor price | Valuation |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Multi-chain NFT + gallery + listing + spam filter | 100% |
| **Excellent** | Multi-chain + good display | 80% |
| **Bon** | Single chain, full feature | 60% |
| **Basique** | NFT display basic | 40% |
| **Minimal** | NFT send only | 20% |

## 5. Sources et Références

- [ERC-721 Standard](https://eips.ethereum.org/EIPS/eip-721)
- [ERC-1155 Standard](https://eips.ethereum.org/EIPS/eip-1155)
- [Metaplex NFT Standard](https://docs.metaplex.com/)
""",

    3826: """## 1. Vue d'ensemble

Le critère **DeFi Integration** évalue la capacité d'un wallet à interagir nativement avec les protocoles de finance décentralisée : swaps, lending, staking, et yield farming sans quitter l'application.

L'intégration DeFi native améliore la sécurité en évitant les sites tiers potentiellement malveillants.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Catégorie DeFi | Protocoles majeurs | TVL (2024) |
|----------------|-------------------|------------|
| **DEX** | Uniswap, Curve, Balancer | $10B+ |
| **Lending** | Aave, Compound, MakerDAO | $20B+ |
| **Liquid Staking** | Lido, Rocket Pool | $30B+ |
| **Yield** | Yearn, Convex | $5B+ |
| **Bridges** | Stargate, Across | $5B+ |

**Intégrations typiques:**
| Feature | Implementation |
|---------|----------------|
| Swap | DEX aggregator (1inch, 0x) |
| Bridge | Multi-bridge aggregator |
| Stake | Direct protocol integration |
| Lend/Borrow | Protocol interfaces |
| Yield | Vault strategies |

**APIs/SDKs utilisés:**
| Provider | Service |
|----------|---------|
| 1inch | Swap aggregation |
| Li.Fi | Bridge + swap |
| Socket | Cross-chain |
| Paraswap | DEX routing |

## 3. Application aux Produits Crypto

### Wallets avec DeFi intégré
| Wallet | Features |
|--------|----------|
| **Rabby** | Swap, multi-chain, approvals |
| **MetaMask** | Swap (via MetaMask Swaps) |
| **Trust Wallet** | Swap, stake, earn |
| **Zerion** | Full DeFi dashboard |
| **Rainbow** | Swap intégré |

### Hardware Wallets
- **Ledger Live** : Swap, stake via partenaires
- **Trezor Suite** : Swap via SideShift
- **Limitation** : Interactions complexes via dApps

### CEX with DeFi
| CEX | DeFi Features |
|-----|---------------|
| Coinbase | Earn (staking) |
| Binance | Earn, Launchpool |
| Kraken | Staking |

### Risques intégration DeFi
| Risque | Mitigation |
|--------|-----------|
| Smart contract bug | Audit, insurance |
| Slippage | Protection MEV |
| Impermanent loss | Clear warnings |
| Protocol hack | Diversification |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Full DeFi suite + security features | 100% |
| **Excellent** | Swap + stake + bridge intégrés | 80% |
| **Bon** | Swap + 1-2 autres features | 60% |
| **Basique** | Swap uniquement | 40% |
| **Minimal** | Via dApps externes only | 20% |

## 5. Sources et Références

- [DeFiLlama](https://defillama.com/)
- [1inch API](https://docs.1inch.io/)
- [Li.Fi Documentation](https://docs.li.fi/)
""",

    3827: """## 1. Vue d'ensemble

Le critère **Staking Support** évalue la capacité d'un wallet à permettre le staking de crypto-actifs : Proof-of-Stake natif, liquid staking, et délégation, avec une visibilité claire sur les rewards et les risques.

Le staking représente $100B+ en valeur lockée et est une source majeure de yield crypto.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type de staking | Mécanisme | Risques |
|-----------------|-----------|---------|
| **Native PoS** | Validator/Délégation | Slashing, unbonding |
| **Liquid staking** | Token dérivé (stETH) | Smart contract, depeg |
| **Restaking** | Re-stake LST (EigenLayer) | Slashing multiple |
| **Pool staking** | Mutualisé | Operator risk |

**APY typiques (2024):**
| Asset | APY natif | Liquid staking |
|-------|-----------|----------------|
| ETH | 3-4% | 3-5% (stETH) |
| SOL | 6-8% | 7-9% (mSOL) |
| ATOM | 15-20% | 15-20% |
| DOT | 12-15% | 12-15% |

**Liquid staking tokens:**
| Token | Protocol | Underlying |
|-------|----------|------------|
| stETH | Lido | ETH |
| rETH | Rocket Pool | ETH |
| mSOL | Marinade | SOL |
| stATOM | Stride | ATOM |

**Risques de slashing:**
| Network | Conditions | Pénalité |
|---------|-----------|----------|
| Ethereum | Double sign, downtime | 0.5-100% |
| Cosmos | Double sign | 5% |
| Solana | Pas de slashing | N/A |

## 3. Application aux Produits Crypto

### Wallets avec Staking
| Wallet | Staking features |
|--------|------------------|
| **Ledger Live** | ETH, DOT, ATOM, SOL |
| **Trust Wallet** | Multi-chain staking |
| **Phantom** | SOL native + mSOL |
| **Keplr** | Cosmos ecosystem |
| **Polkadot.js** | DOT staking |

### Liquid Staking Platforms
| Platform | Assets |
|----------|--------|
| Lido | ETH, SOL, MATIC |
| Rocket Pool | ETH |
| Marinade | SOL |
| Stride | Cosmos chains |

### CEX Staking
| CEX | Offering |
|-----|----------|
| Coinbase | ETH, SOL, ATOM |
| Kraken | Multiple assets |
| Binance | ETH, BNB, etc. |

### Considerations
| Aspect | Wallet | CEX |
|--------|--------|-----|
| Control | Self-custody | Custodial |
| Rewards | Direct | Fee-reduced |
| Flexibility | Immediate liquid | Lock periods |
| Risk | Self-managed | Platform risk |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Multi-chain + liquid + native + analytics | 100% |
| **Excellent** | Native + liquid staking | 80% |
| **Bon** | Multi-chain native staking | 60% |
| **Basique** | Single chain staking | 40% |
| **Minimal** | Via external dApps | 20% |

## 5. Sources et Références

- [Staking Rewards](https://www.stakingrewards.com/)
- [Lido Finance](https://lido.fi/)
- [Rocket Pool](https://rocketpool.net/)
""",

    3828: """## 1. Vue d'ensemble

Le critère **WalletConnect** évalue le support du protocole WalletConnect pour connecter un wallet à des dApps de manière sécurisée, sans exposer les clés privées au site web.

WalletConnect v2 est le standard pour les connexions wallet-dApp sur mobile et multi-chain.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Version | Features | Status |
|---------|----------|--------|
| **WalletConnect v1** | Single chain, QR code | Deprecated |
| **WalletConnect v2** | Multi-chain, pairing | Current |
| **WalletConnect Web3Modal** | UI components | Current |

**Architecture WalletConnect v2:**
| Composant | Rôle |
|-----------|------|
| Pairing | Établit connexion |
| Session | Maintient permissions |
| Relay | Serveur de messages |
| Sign API | Signature requests |
| Auth API | Authentication |

**Namespaces (v2):**
| Namespace | Chains |
|-----------|--------|
| eip155 | Ethereum, EVM chains |
| solana | Solana |
| cosmos | Cosmos ecosystem |
| polkadot | Polkadot |

**Session properties:**
| Property | Description |
|----------|-------------|
| chains | Chains autorisées |
| methods | Méthodes permises |
| events | Events souscrits |
| expiry | Durée de session (7 jours default) |

## 3. Application aux Produits Crypto

### Mobile Wallets
| Wallet | WalletConnect |
|--------|---------------|
| **MetaMask Mobile** | v2 ✓ |
| **Trust Wallet** | v2 ✓ |
| **Rainbow** | v2 ✓ |
| **Phantom** | v2 ✓ |
| **Argent** | v2 ✓ |

### Hardware Wallets
| Wallet | WalletConnect |
|--------|---------------|
| **Ledger Live** | v2 (via mobile) |
| **Keystone** | v2 via QR |
| **GridPlus** | v2 ✓ |

### Browser Extensions
| Wallet | WalletConnect |
|--------|---------------|
| **MetaMask** | Injected preferred |
| **Rabby** | v2 + injected |
| **Frame** | v2 ✓ |

### dApp Integration
| Framework | Support |
|-----------|---------|
| wagmi/viem | Native |
| ethers.js | Via provider |
| web3.js | Via provider |
| Web3Modal | Native |

### Security Considerations
| Aspect | WalletConnect |
|--------|---------------|
| Key exposure | Keys never leave wallet |
| Phishing | Domain verification important |
| Session hijack | Encrypted relay |
| Permissions | Granular control |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | WC v2 + multi-chain + session management | 100% |
| **Excellent** | WC v2 full support | 85% |
| **Bon** | WC v2 basic | 70% |
| **Legacy** | WC v1 only | 40% |
| **Aucun** | No WalletConnect | 0% |

## 5. Sources et Références

- [WalletConnect v2 Docs](https://docs.walletconnect.com/)
- [Web3Modal](https://web3modal.com/)
- [WalletConnect GitHub](https://github.com/WalletConnect)
""",

    3829: """## 1. Vue d'ensemble

Le critère **Browser Extension** évalue la disponibilité d'un wallet sous forme d'extension de navigateur (Chrome, Firefox, Brave, Edge), permettant une interaction fluide avec les dApps web.

Les extensions browser sont le mode d'interaction principal pour les utilisateurs DeFi.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Browser | Extension Store | Market Share |
|---------|-----------------|--------------|
| Chrome | Chrome Web Store | 65% |
| Firefox | Firefox Add-ons | 3% |
| Brave | Chrome Web Store | 1% |
| Edge | Edge Add-ons / CWS | 5% |
| Safari | App Store | 18% |

**Manifest versions:**
| Version | Status | Key changes |
|---------|--------|-------------|
| Manifest v2 | Deprecated 2024 | Full capabilities |
| Manifest v3 | Current | Service workers, limited APIs |

**Injection methods:**
| Method | Description |
|--------|-------------|
| `window.ethereum` | Standard EIP-1193 |
| `window.solana` | Solana wallets |
| Content scripts | Page injection |
| Background scripts | Persistent logic |

**Permissions typiques:**
| Permission | Usage |
|------------|-------|
| activeTab | Current tab access |
| storage | Settings persistence |
| notifications | Transaction alerts |
| webRequest | RPC interception |

## 3. Application aux Produits Crypto

### Extensions populaires
| Wallet | Chrome | Firefox | Brave | Safari |
|--------|--------|---------|-------|--------|
| **MetaMask** | ✓ | ✓ | ✓ | ✗ |
| **Rabby** | ✓ | ✓ | ✓ | ✗ |
| **Phantom** | ✓ | ✓ | ✓ | ✓ |
| **Coinbase Wallet** | ✓ | ✗ | ✓ | ✗ |
| **Trust Wallet** | ✓ | ✗ | ✓ | ✗ |

### Hardware Wallet Companions
| Extension | Hardware |
|-----------|----------|
| MetaMask | Ledger, Trezor |
| Rabby | Ledger, Trezor, Keystone |
| Frame | All major HW |

### Security Considerations
| Risque | Mitigation |
|--------|-----------|
| Extension malveillante | Official sources only |
| Clipboard access | Minimal permissions |
| Phishing popups | Domain verification |
| Supply chain | Open source audit |

### Alternatives aux extensions
| Alternative | Use case |
|-------------|----------|
| WalletConnect | Mobile-first |
| Desktop apps | Better security |
| Hardware wallets | Maximum security |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Multi-browser + Manifest v3 + HW support | 100% |
| **Excellent** | Chrome + Firefox + HW support | 85% |
| **Bon** | Chrome + major features | 70% |
| **Basique** | Chrome only | 50% |
| **Aucun** | No browser extension | 0% |

## 5. Sources et Références

- [EIP-1193 Provider API](https://eips.ethereum.org/EIPS/eip-1193)
- [Chrome Extensions Manifest v3](https://developer.chrome.com/docs/extensions/mv3/)
- [MetaMask Documentation](https://docs.metamask.io/)
""",

    3830: """## 1. Vue d'ensemble

Le critère **Mobile App iOS** évalue la disponibilité et la qualité d'une application mobile pour iOS (iPhone, iPad), incluant les fonctionnalités, la sécurité biométrique, et l'intégration avec l'écosystème Apple.

iOS représente ~50% du marché mobile dans les pays développés.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| iOS Requirement | Minimum |
|-----------------|---------|
| iOS Version | 14.0+ (recommandé 15+) |
| Device | iPhone 8+ |
| Storage | 100-500 MB |
| Keychain | Secure Enclave |

**Sécurité iOS native:**
| Feature | Description |
|---------|-------------|
| Secure Enclave | Hardware key storage |
| Face ID | 3D facial recognition |
| Touch ID | Fingerprint |
| Keychain | Encrypted storage |
| App Sandbox | Isolation |

**Apple App Store requirements:**
| Requirement | Impact crypto |
|-------------|---------------|
| Review guidelines | Wallet functionality OK |
| IAP rules | No crypto purchase via IAP |
| Privacy labels | Data disclosure |
| Notarization | Code signing |

**Frameworks crypto:**
| Framework | Usage |
|-----------|-------|
| CryptoKit | Crypto operations |
| LocalAuthentication | Biometrics |
| Security.framework | Keychain |
| Network.framework | Connectivity |

## 3. Application aux Produits Crypto

### Wallets iOS
| Wallet | App Store | Biometrics | Hardware |
|--------|-----------|------------|----------|
| **MetaMask** | ✓ | ✓ | Via WC |
| **Trust Wallet** | ✓ | ✓ | Limited |
| **Phantom** | ✓ | ✓ | Via WC |
| **Rainbow** | ✓ | ✓ | Via WC |
| **Coinbase Wallet** | ✓ | ✓ | Via WC |

### CEX Apps iOS
| CEX | Features |
|-----|----------|
| Coinbase | Full trading, card |
| Binance | Full features |
| Kraken | Trading, staking |

### Hardware Wallet Apps
| Hardware | iOS App |
|----------|---------|
| Ledger | Ledger Live Mobile |
| Trezor | Limited (web-based) |
| Keystone | Keystone App |

### iOS-specific features
| Feature | Benefit |
|---------|---------|
| Secure Enclave | Key protection |
| iCloud Keychain | Backup (controversial) |
| Push notifications | Transaction alerts |
| Widgets | Balance display |
| Apple Watch | Quick access |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Full features + Secure Enclave + HW support | 100% |
| **Excellent** | Native app + biometrics + WalletConnect | 85% |
| **Bon** | Native app + core features | 70% |
| **Basique** | Basic wallet functionality | 50% |
| **Web only** | No native app | 20% |

## 5. Sources et Références

- [Apple CryptoKit](https://developer.apple.com/documentation/cryptokit)
- [Apple Secure Enclave](https://support.apple.com/guide/security/secure-enclave-sec59b0b31ff/web)
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
""",

    3831: """## 1. Vue d'ensemble

Le critère **Mobile App Android** évalue la disponibilité et la qualité d'une application mobile pour Android, incluant les fonctionnalités, la sécurité, et la compatibilité avec la diversité des appareils Android.

Android représente ~70% du marché mobile mondial.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Android Requirement | Minimum |
|--------------------|---------|
| Android Version | 8.0+ (API 26) |
| Target SDK | 33+ (Android 13) |
| Storage | 50-300 MB |
| Hardware security | StrongBox/TEE |

**Sécurité Android:**
| Feature | Description |
|---------|-------------|
| StrongBox | Hardware security module |
| TEE (TrustZone) | Trusted execution |
| Android Keystore | Key storage |
| Biometric API | Fingerprint, face |
| SafetyNet/Play Integrity | Device attestation |

**Niveaux de sécurité hardware:**
| Level | Security |
|-------|----------|
| TEE only | Moyenne |
| StrongBox | Élevée |
| Secure Element | Maximum |

**Google Play requirements:**
| Requirement | Status |
|-------------|--------|
| Crypto wallets | Allowed |
| Token sales | Restricted |
| Data safety | Mandatory disclosure |
| App signing | Play App Signing |

## 3. Application aux Produits Crypto

### Wallets Android
| Wallet | Play Store | Biometrics | Hardware |
|--------|------------|------------|----------|
| **MetaMask** | ✓ | ✓ | Via WC |
| **Trust Wallet** | ✓ | ✓ | Limited |
| **Phantom** | ✓ | ✓ | Via WC |
| **Coinbase Wallet** | ✓ | ✓ | Via WC |
| **Exodus** | ✓ | ✓ | Limited |

### CEX Apps Android
| CEX | APK Direct | Play Store |
|-----|------------|------------|
| Binance | ✓ | ✓ (regional) |
| Coinbase | ✗ | ✓ |
| Kraken | ✗ | ✓ |

### Hardware Wallet Apps
| Hardware | Android App |
|----------|-------------|
| Ledger | Ledger Live Mobile |
| Trezor | Trezor Suite Lite |
| Keystone | Keystone App |
| Coldcard | NFC support apps |

### Android-specific considerations
| Aspect | Challenge |
|--------|-----------|
| Fragmentation | 1000s de devices |
| Root detection | Security risk |
| Custom ROMs | Potential issues |
| Updates | OEM dependent |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Full features + StrongBox + HW support | 100% |
| **Excellent** | Native app + biometrics + WalletConnect | 85% |
| **Bon** | Native app + TEE + core features | 70% |
| **Basique** | Basic wallet, software security | 50% |
| **Web only** | No native app | 20% |

## 5. Sources et Références

- [Android Keystore](https://developer.android.com/training/articles/keystore)
- [StrongBox Keymaster](https://source.android.com/security/keystore/implementer-ref)
- [Google Play Policy](https://support.google.com/googleplay/android-developer/answer/9876821)
"""
}

def main():
    print("Saving real norm summaries batch 1 (E/F ecosystem norms)...")
    for norm_id, summary in summaries.items():
        url = f'{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}'
        data = {
            'summary': summary,
            'summary_status': 'generated',
            'last_summarized_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }
        resp = requests.patch(url, headers=SUPABASE_HEADERS, json=data)
        print(f'ID {norm_id}: {resp.status_code}')
        time.sleep(0.2)
    print('Done!')

if __name__ == "__main__":
    main()
