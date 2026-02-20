#!/usr/bin/env python3
"""Generate summaries batch for Adversity norms A-ADD-021 to A-ADD-040."""

import requests
import sys
import time
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    4620: """## 1. Vue d'ensemble

Le critère **Blind Signing Prevention** évalue si un produit empêche la signature aveugle de transactions, où l'utilisateur signe sans comprendre le contenu réel de ce qu'il approuve.

Le blind signing est la cause principale des pertes par phishing dans l'écosystème crypto.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type de signature | Visibilité | Risque |
|-------------------|------------|--------|
| **Clear signing** | Données lisibles | Faible |
| **Blind signing** | Hash uniquement | Critique |
| **Typed data (EIP-712)** | Structuré, lisible | Faible |
| **Personal sign** | Message texte | Moyen |

**Standards de signature Ethereum:**
| Standard | Format | Usage |
|----------|--------|-------|
| eth_sign | Keccak256(message) | Legacy, dangereux |
| personal_sign | "\\x19Ethereum Signed Message" + msg | Messages |
| EIP-712 | Typed structured data | DeFi, NFT |
| EIP-191 | Version byte prefix | Generic |

**Risques blind signing:**
| Scénario | Impact |
|----------|--------|
| Drainer signature | Perte totale tokens |
| NFT listing phishing | NFT volés |
| Permit signature | Approval sans gas |
| SetApprovalForAll | Collection entière |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** :
  - Clear signing pour apps natives
  - "Blind signing" setting (désactivé par défaut)
  - EIP-712 display amélioré (récent)
- **Trezor** :
  - Clear signing Bitcoin
  - Ethereum: display limité (amélioration en cours)
- **Coldcard** :
  - Bitcoin PSBT fully decoded
  - Pas d'Ethereum
- **Keystone** :
  - Decode on-device
  - QR = tout visible
- **GridPlus Lattice1** :
  - ABI decoding avancé
  - Contract verification

### Software Wallets
- **Rabby** :
  - Transaction decoding
  - Human-readable display
  - Risk warnings
- **MetaMask** :
  - Amélioration EIP-712
  - Contract interaction display
  - Blockaid integration
- **Rainbow** :
  - Clear transaction preview

### DeFi Best Practices
- **EIP-712** : Standard pour typed data
- **Domain separator** : Empêche replay cross-chain
- **Contract verification** : Sourcify, Etherscan

### Problème persistant
- **Nouveaux contrats** : ABI inconnue = blind sign
- **Proxy contracts** : Implementation cachée
- **Complex calls** : Multi-hop difficult to parse

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Clear signing obligatoire + ABI decode + warnings | 100% |
| **Élevé** | Clear signing par défaut + EIP-712 support | 80% |
| **Moyen** | Blind signing possible mais warned | 50% |
| **Basique** | Blind signing enabled par défaut | 20% |
| **Critique** | Pas de visibilité transaction | 0% |

## 5. Sources et Références

- [EIP-712 - Typed Data](https://eips.ethereum.org/EIPS/eip-712)
- [Ledger Clear Signing](https://www.ledger.com/blog/new-feature-clear-signing)
- [GridPlus ABI Decoding](https://gridplus.io/)
""",

    4621: """## 1. Vue d'ensemble

Le critère **Network Fee Protection** évalue les mécanismes de protection contre les frais de réseau excessifs ou manipulés, incluant les attaques par fee sniping et les erreurs utilisateur.

Payer 10 ETH de gas pour une transaction de 0.1 ETH est une erreur coûteuse et irréversible.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Protection | Description | Efficacité |
|------------|-------------|------------|
| **Fee estimation** | Calcul automatique optimal | Bonne |
| **Max fee cap** | Limite maximale configurable | Très bonne |
| **Fee warning** | Alerte si fee > X% de tx | Bonne |
| **EIP-1559 support** | Base fee + priority fee | Excellente |
| **RBF protection** | Replace-by-fee awareness | Moyenne |

**Structure fee EIP-1559 (Ethereum):**
| Paramètre | Description |
|-----------|-------------|
| baseFee | Fee minimum (burned) |
| maxPriorityFeePerGas | Tip to miner |
| maxFeePerGas | Maximum total |
| gasLimit | Max gas units |

**Fee typiques par réseau (2024):**
| Network | Fee typique | Fee max observé |
|---------|-------------|-----------------|
| Ethereum | $1-50 | $500+ (congestion) |
| Bitcoin | $0.5-20 | $100+ |
| Solana | $0.001 | $0.01 |
| Polygon | $0.01 | $0.1 |
| Arbitrum | $0.1-1 | $5 |

**Attaques fee-related:**
| Attaque | Description |
|---------|-------------|
| Fee sniping | Manipuler estimation |
| Sandwich | MEV autour de tx |
| Gas griefing | Contract consomme tout gas |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** :
  - Fee estimation via Ledger Live
  - Custom fee possible
  - Warning si très élevé
- **Trezor** :
  - Fee presets (low/normal/high)
  - Custom fee option
  - Suite estimation
- **Coldcard** :
  - Manual fee setting (PSBT)
  - Affiche fee sur device

### Software Wallets
- **MetaMask** :
  - Gas estimation API
  - Advanced gas controls
  - EIP-1559 native
  - "Market" / "Aggressive" / "Low"
- **Rabby** :
  - Fee comparison
  - "This fee is X times higher" warnings
  - Historical fee data

### CEX
- **Fixed fees** : Pas de gas user-facing
- **Withdrawal fees** : Published, prévisibles
- **Binance/Coinbase** : Fee absorbé pour petits montants

### DeFi
- **DEX aggregators** : Gas optimization
  - 1inch: Gas optimized routing
  - Paraswap: Fee estimation
- **Flashbots Protect** : MEV protection = fee savings

### Layer 2 Solutions
- **Arbitrum/Optimism** : 10-100x moins cher
- **zkSync** : Compression = fees réduits
- **Base** : Low fees L2

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | EIP-1559 + estimation + cap + warnings + MEV protect | 100% |
| **Élevé** | Smart estimation + warnings + custom control | 75% |
| **Moyen** | Basic estimation + manual override | 50% |
| **Basique** | Manual fee only | 25% |
| **Risqué** | No fee control/visibility | 0% |

## 5. Sources et Références

- [EIP-1559](https://eips.ethereum.org/EIPS/eip-1559)
- [Flashbots Protect](https://protect.flashbots.net/)
- [ETH Gas Station](https://ethgasstation.info/)
""",

    4622: """## 1. Vue d'ensemble

Le critère **Replay Attack Protection** évalue les mécanismes de protection contre les attaques par rejeu, où une transaction valide sur une chaîne est rejouée sur une autre chaîne (fork) ou à un autre moment.

Les forks (ETH/ETC, BCH/BSV) ont historiquement causé des pertes massives par replay.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Protection | Mécanisme | Efficacité |
|------------|-----------|------------|
| **Chain ID (EIP-155)** | ID unique par réseau | Très élevée |
| **Nonce** | Compteur séquentiel | Élevée |
| **Domain separator** | EIP-712 chain binding | Très élevée |
| **Signature scheme** | Différent par réseau | Variable |

**Chain IDs principaux:**
| Network | Chain ID |
|---------|----------|
| Ethereum Mainnet | 1 |
| Goerli Testnet | 5 |
| Polygon | 137 |
| Arbitrum One | 42161 |
| Optimism | 10 |
| BSC | 56 |
| Avalanche C-Chain | 43114 |

**EIP-155 Transaction signature:**
```
v = chain_id * 2 + 35 + recovery_id
```

**Scénarios de replay:**
| Scénario | Risque |
|----------|--------|
| Hard fork (ETH/ETC) | Tx valide sur les deux |
| L2 bridge replay | Cross-chain exploit |
| Testnet → Mainnet | Rare mais possible |

## 3. Application aux Produits Crypto

### Wallets - Protection native
- **MetaMask** :
  - EIP-155 obligatoire
  - Chain ID vérification
  - Network switching clear
- **Ledger** :
  - Chain ID display
  - Signature inclut chain
- **Trezor** :
  - EIP-155 support
  - Network verification

### Multi-chain Wallets
- **Rabby** :
  - Multi-chain native
  - Clear chain indication
  - Wrong network warnings
- **Rainbow** :
  - Chain selector visible
  - Tx bound to chain

### Bridges - Risque élevé
- **Wormhole** : Signature verification per chain
- **LayerZero** : Cross-chain message verification
- **Stargate** : Delta algorithm protection

### Bitcoin
- **Pas de Chain ID** : Utilise sighash flags
- **SegWit** : Improved signature scheme
- **Forks** : BCH, BSV ont différentes règles

### Smart Contracts
- **EIP-712 domain** :
  ```solidity
  bytes32 DOMAIN_SEPARATOR = keccak256(
    abi.encode(
      TYPE_HASH,
      NAME_HASH,
      VERSION_HASH,
      block.chainid,  // Replay protection
      address(this)
    )
  );
  ```

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | EIP-155 + EIP-712 domain + clear chain display | 100% |
| **Élevé** | Chain ID enforcement + warnings | 80% |
| **Moyen** | Basic chain ID support | 50% |
| **Basique** | Manual chain verification | 25% |
| **Vulnérable** | No replay protection | 0% |

## 5. Sources et Références

- [EIP-155 - Replay Protection](https://eips.ethereum.org/EIPS/eip-155)
- [EIP-712 - Domain Separator](https://eips.ethereum.org/EIPS/eip-712)
- [Chainlist.org](https://chainlist.org/)
""",

    4623: """## 1. Vue d'ensemble

Le critère **MEV Protection** évalue les mécanismes de protection contre le MEV (Maximal Extractable Value), anciennement "Miner Extractable Value" - les profits extraits par réorganisation ou insertion de transactions.

Le MEV cause des pertes estimées à $1B+ par an pour les utilisateurs DeFi.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type de MEV | Description | Perte typique |
|-------------|-------------|---------------|
| **Sandwich attack** | Tx entre front-run et back-run | 0.5-5% du swap |
| **Front-running** | Copie tx avant vous | Variable |
| **Back-running** | Arbitrage après vous | Indirect |
| **Liquidation** | Course aux liquidations | N/A (protocole) |
| **JIT liquidity** | Just-in-time LP | Indirect |

**Volume MEV (Ethereum):**
| Période | MEV extrait |
|---------|-------------|
| 2021 | ~$700M |
| 2022 | ~$500M |
| 2023 | ~$300M (post-merge) |

**Solutions techniques:**
| Solution | Mécanisme | Protection |
|----------|-----------|------------|
| **Flashbots Protect** | Private mempool | Très élevée |
| **MEV Blocker** | Rebate system | Élevée |
| **Cowswap** | Batch auctions | Très élevée |
| **Private RPC** | Direct to builder | Élevée |

## 3. Application aux Produits Crypto

### RPC Protégés
- **Flashbots Protect** :
  - RPC: https://rpc.flashbots.net
  - Tx envoyées directement aux builders
  - Pas de mempool public
  - Gratuit
- **MEV Blocker (CoW)** :
  - RPC avec rebates
  - Partie du MEV retournée
- **Bloxroute** :
  - Private transactions
  - Enterprise focus

### DEX avec protection native
- **CoWSwap** :
  - Batch auctions (pas d'ordre)
  - MEV-resistant by design
  - Coincidence of Wants
- **1inch Fusion** :
  - Dutch auctions
  - Resolvers compete
- **Matcha** :
  - MEV protection option

### Wallets
- **MetaMask** :
  - Pas de protection native
  - User doit configurer RPC
- **Rabby** :
  - Flashbots integration option
  - MEV warnings

### Agrégateurs
- **1inch** : Pro mode avec protection
- **Paraswap** : MEV protection flag
- **0x API** : Slippage protection

### L2 Solutions
- **Moins de MEV** : Sequencers centralisés (pour l'instant)
- **Arbitrum** : FCFS ordering
- **Optimism** : Sequencer fair ordering

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | MEV protection native + batch auctions | 100% |
| **Élevé** | Private RPC intégré + warnings | 75% |
| **Moyen** | MEV protection optionnelle | 50% |
| **Basique** | Slippage protection only | 25% |
| **Vulnérable** | Public mempool, pas de protection | 0% |

## 5. Sources et Références

- [Flashbots](https://www.flashbots.net/)
- [MEV Blocker](https://mevblocker.io/)
- [CoWSwap](https://cow.fi/)
- [Flashbots Dashboard](https://explore.flashbots.net/)
""",

    4624: """## 1. Vue d'ensemble

Le critère **Phishing Domain Protection** évalue les mécanismes de détection et blocage des sites de phishing qui imitent des protocoles légitimes pour voler les clés ou signatures des utilisateurs.

Le phishing représente >50% des pertes crypto individuelles.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Méthode de phishing | Technique | Détection |
|--------------------|-----------|-----------|
| **Typosquatting** | uniswαp.org (α grec) | Difficile |
| **Homoglyph** | unіswap.org (і cyrillique) | Moyenne |
| **Subdomain** | uniswap.scam.com | Facile |
| **Similar TLD** | uniswap.io vs .org | Moyenne |
| **Punycode** | xn--unswap-xxx | Moyenne |

**Bases de données phishing:**
| Source | Coverage | Update |
|--------|----------|--------|
| MetaMask blocklist | Large | Temps réel |
| PhishFort | Extensive | Continu |
| Chainabuse | Community | Continu |
| ScamSniffer | Focused | Temps réel |

**Caractéristiques sites phishing:**
| Signal | Poids |
|--------|-------|
| Domaine récent (<30j) | Élevé |
| Certificat nouveau | Moyen |
| Copie pixel-perfect | Élevé |
| Pop-up wallet connect | Très élevé |
| URL parameters suspects | Moyen |

## 3. Application aux Produits Crypto

### Browser Extensions
- **MetaMask** :
  - Blocklist intégrée
  - Warning page on phishing
  - Community reports
- **Rabby** :
  - Phishing detection
  - Domain age check
  - Risk warnings
- **Pocket Universe** :
  - Pre-transaction check
  - Domain verification

### Services de détection
- **ScamSniffer** :
  - Browser extension
  - Real-time detection
  - API disponible
- **Web3 Antivirus** :
  - Multi-layer protection
  - ML-based detection
- **Blowfish** :
  - API protection
  - Domain analysis

### Wallets Mobile
- **Trust Wallet** : DApp browser with filtering
- **MetaMask Mobile** : Same protection as extension
- **Phantom** : Blocklist Solana scams

### CEX
- **Phishing moins pertinent** : Login 2FA protège
- **Email phishing** : Plus grand risque
- **Coinbase/Binance** : Anti-phishing code emails

### Best Practices
- **Bookmark** les vrais sites
- **Vérifier** certificat et domaine
- **Ne jamais** cliquer liens Discord/Telegram
- **Hardware wallet** : Vérifier sur device

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Blocklist temps réel + ML detection + domain analysis | 100% |
| **Élevé** | Blocklist maintenue + warnings | 75% |
| **Moyen** | Blocklist basique | 50% |
| **Basique** | Pas de protection, user awareness | 25% |
| **Vulnérable** | Aucune protection | 0% |

## 5. Sources et Références

- [ScamSniffer](https://scamsniffer.io/)
- [PhishFort](https://www.phishfort.com/)
- [Chainabuse](https://www.chainabuse.com/)
- [MetaMask Phishing Detection](https://metamask.io/phishing.html)
""",

    4625: """## 1. Vue d'ensemble

Le critère **Contract Verification** évalue la capacité d'un produit à vérifier qu'un smart contract est légitime avant d'interagir : code source vérifié, audits, réputation, et absence de fonctions malveillantes.

Un contrat non vérifié peut contenir n'importe quel code malveillant.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type de vérification | Source | Fiabilité |
|---------------------|--------|-----------|
| **Source code match** | Etherscan/Sourcify | Très élevée |
| **Audit report** | Firms (Trail of Bits, etc.) | Élevée |
| **Bytecode analysis** | Decompilation | Moyenne |
| **Reputation score** | DeFiLlama, DeBank | Moyenne |
| **Age & TVL** | On-chain data | Indicative |

**Plateformes de vérification:**
| Plateforme | Coverage |
|------------|----------|
| Etherscan | EVM chains |
| Sourcify | Decentralized |
| Tenderly | Analysis tools |
| DefiLlama | Protocol data |

**Red flags dans les contrats:**
| Red flag | Risque |
|----------|--------|
| Non-vérifié | Critique |
| Owner peut mint | Élevé |
| Proxy sans timelock | Élevé |
| Blacklist function | Moyen |
| Pause function | Moyen (si justifié) |
| Hidden fees | Élevé |

**Audit firms réputées:**
| Firm | Spécialité |
|------|------------|
| Trail of Bits | Security research |
| OpenZeppelin | Smart contracts |
| Consensys Diligence | Ethereum |
| Certik | Volume audits |
| Spearbit | Senior auditors |

## 3. Application aux Produits Crypto

### Wallets avec vérification
- **Rabby** :
  - Contract source check
  - Risk level display
  - Interaction history
- **MetaMask** :
  - Contract name (if verified)
  - Etherscan link
  - Blockaid scanning
- **Zerion** :
  - Protocol labels
  - Risk warnings

### Outils d'analyse
- **De.Fi Scanner** :
  - Automated audit
  - Risk score
  - Token analysis
- **TokenSniffer** :
  - Honeypot detection
  - Contract analysis
- **GoPlus Security** :
  - API security check
  - Multi-chain

### DeFi Aggregators
- **1inch** : Verified contracts only
- **Paraswap** : Audit requirements
- **CoWSwap** : Vetted integrations

### Hardware Wallets
- **Limitation** : Pas d'analyse native
- **Dépend** du companion software
- **Lattice1** : Contract labels

### Best Practices pour users
1. Vérifier sur Etherscan (verified ✓)
2. Chercher audit report
3. Check TVL et historique
4. Ne jamais être le premier

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Auto-verification + audit check + risk score | 100% |
| **Élevé** | Source verification + warnings unverified | 75% |
| **Moyen** | Basic contract info display | 50% |
| **Basique** | Link to explorer only | 25% |
| **Aucun** | No contract information | 0% |

## 5. Sources et Références

- [Etherscan Verified Contracts](https://etherscan.io/contractsVerified)
- [Sourcify](https://sourcify.dev/)
- [De.Fi Security Scanner](https://de.fi/scanner)
- [DeFiLlama](https://defillama.com/)
""",

    4626: """## 1. Vue d'ensemble

Le critère **Hardware Security Module Integration** évalue l'utilisation d'HSMs (Hardware Security Modules) pour la protection des clés à l'échelle institutionnelle, offrant une sécurité certifiée FIPS 140-3 Level 3+.

Les HSMs sont le standard pour la custody institutionnelle et les infrastructures critiques.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| HSM Model | Certification | Crypto Support |
|-----------|---------------|----------------|
| **Thales Luna 7** | FIPS 140-3 L3 | ECC, RSA, AES |
| **nCipher nShield** | FIPS 140-3 L3 | Full suite |
| **AWS CloudHSM** | FIPS 140-3 L3 | Cloud-native |
| **Utimaco** | FIPS 140-3 L3 | Banking |
| **Securosys** | FIPS 140-3 L3 | Blockchain-focused |

**Caractéristiques HSM:**
| Feature | Description |
|---------|-------------|
| Key ceremony | Secure key generation |
| Tamper response | Auto-destruction if tampered |
| Audit logging | Immutable logs |
| Clustering | High availability |
| PKCS#11 | Standard API |

**HSM vs Hardware Wallet:**
| Aspect | HSM | HW Wallet |
|--------|-----|-----------|
| Prix | $10k-100k+ | $50-500 |
| Certif | FIPS 140-3 L3 | CC EAL5+ |
| Throughput | 1000+ sig/s | 1-10 sig/s |
| Use case | Institutional | Individual |
| Management | IT team | Self |

## 3. Application aux Produits Crypto

### Custody Providers
- **Coinbase Custody** :
  - HSMs Thales Luna
  - SOC 2 Type II
  - Insurance $320M
- **BitGo** :
  - HSM-backed multi-sig
  - $250M insurance
- **Anchorage** :
  - Federally chartered
  - HSM infrastructure
- **Fireblocks** :
  - MPC + HSM hybrid
  - SGX enclaves

### CEX Infrastructure
- **Binance** : HSM for hot wallet signing
- **Kraken** : Air-gapped HSMs
- **Coinbase** : Multi-layer HSM architecture

### MPC vs HSM
| Aspect | MPC | HSM |
|--------|-----|-----|
| Key location | Distributed | Centralized |
| Certification | Variable | FIPS standard |
| Flexibility | High | Lower |
| Recovery | Complex | Standard |

**MPC Providers:**
- Fireblocks, Curv (PayPal), ZenGo

### Enterprise Solutions
- **Ledger Enterprise** : HSM + Ledger Vault
- **Securosys Primus HSM** : Blockchain-specific
- **Unbound CORE** : Virtual HSM

### Self-custody avec HSM
- Possible mais complexe
- YubiHSM 2 : ~$650, FIPS 140-2 L3
- Pour power users/small institutions

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | FIPS 140-3 L3 HSM + multi-layer + audit | 100% |
| **Élevé** | FIPS 140-3 L2 HSM | 80% |
| **Moyen** | Cloud HSM (AWS/GCP/Azure) | 60% |
| **Basique** | SE certifié (EAL5+) | 40% |
| **Insuffisant** | Pas de HSM/SE | 0% |

## 5. Sources et Références

- [NIST FIPS 140-3](https://csrc.nist.gov/publications/detail/fips/140/3/final)
- [Thales Luna HSM](https://cpl.thalesgroup.com/encryption/hardware-security-modules)
- [Fireblocks Security](https://www.fireblocks.com/security/)
""",

    4627: """## 1. Vue d'ensemble

Le critère **MPC (Multi-Party Computation) Security** évalue l'utilisation de la computation multipartite pour distribuer les clés privées entre plusieurs parties, éliminant le single point of failure sans les complexités du multi-sig on-chain.

Le MPC permet de signer sans jamais reconstruire la clé complète.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Protocole MPC | Type | Parties |
|---------------|------|---------|
| **GG18/GG20** | Threshold ECDSA | t-of-n |
| **CGGMP** | Threshold ECDSA | t-of-n (improved) |
| **FROST** | Threshold Schnorr | t-of-n |
| **Lindell17** | 2-party ECDSA | 2-of-2 |

**Avantages MPC vs Multi-sig:**
| Aspect | MPC | Multi-sig |
|--------|-----|-----------|
| On-chain footprint | Single sig | Multiple sigs |
| Gas cost | Normal | 2-3x+ |
| Privacy | Élevée | Visible on-chain |
| Blockchain support | Universal | Chain-specific |
| Key rotation | Possible | New addresses |

**Sécurité MPC:**
| Propriété | Description |
|-----------|-------------|
| Key shares | Jamais recombinées |
| Proactive security | Refresh shares régulier |
| Verifiable shares | Participants peuvent vérifier |
| Byzantine fault tolerance | Résiste aux malveillants |

**Latence signature MPC:**
| Setup | Latence typique |
|-------|-----------------|
| 2-of-2 | 50-200ms |
| 2-of-3 | 100-500ms |
| 3-of-5 | 200ms-1s |

## 3. Application aux Produits Crypto

### MPC Wallets Consumer
- **ZenGo** :
  - 2-of-2 MPC (device + server)
  - 3D FaceLock recovery
  - Non-custodial
- **Coinbase Wallet** :
  - MPC backup option
  - Recovery via cloud
- **OKX Wallet** :
  - MPC technology
  - Keyless experience

### MPC Institutional
- **Fireblocks** :
  - MPC-CMP protocol
  - SGX enclaves
  - $30B+ daily volume
- **Curv (PayPal)** :
  - Acquired by PayPal
  - GG20 protocol
- **Unbound Security** :
  - CORE platform
  - Virtual HSM

### Custody avec MPC
- **BitGo** : MPC + multi-sig hybrid
- **Anchorage** : MPC for operations
- **Copper** : ClearLoop avec MPC

### Limitations MPC
- **Trust server** : Pour 2-of-2 consumer
- **Complexité** : Implementation bugs possibles
- **Recovery** : Dépend du provider

### Hardware + MPC
- **Ledger Enterprise** : MPC governance
- **Fireblocks + HSM** : Hybrid approach

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | MPC t-of-n (t≥2, n≥3) + proactive security + HSM | 100% |
| **Élevé** | MPC 2-of-3 + refresh | 80% |
| **Moyen** | MPC 2-of-2 avec recovery robuste | 60% |
| **Basique** | MPC 2-of-2 simple | 40% |
| **N/A** | Pas de MPC | N/A |

## 5. Sources et Références

- [GG20 Protocol Paper](https://eprint.iacr.org/2020/540)
- [FROST Specification](https://eprint.iacr.org/2020/852)
- [Fireblocks MPC-CMP](https://www.fireblocks.com/what-is-mpc/)
- [ZenGo Security Model](https://zengo.com/security/)
""",

    4628: """## 1. Vue d'ensemble

Le critère **Backup Encryption Standard** évalue la qualité du chiffrement utilisé pour protéger les backups de seeds ou clés : algorithme, gestion des clés, et résistance aux attaques.

Un backup non chiffré ou mal chiffré équivaut à pas de protection.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Algorithme | Key Size | Sécurité | Usage |
|------------|----------|----------|-------|
| **AES-256-GCM** | 256 bits | Très élevée | Standard recommandé |
| **ChaCha20-Poly1305** | 256 bits | Très élevée | Alternative moderne |
| **AES-256-CBC** | 256 bits | Élevée | Legacy |
| **XChaCha20** | 256 bits | Très élevée | Extended nonce |

**Dérivation de clé (KDF):**
| KDF | Paramètres recommandés | Résistance |
|-----|----------------------|------------|
| **Argon2id** | m=64MB, t=3, p=4 | Maximale |
| **scrypt** | N=2^20, r=8, p=1 | Très élevée |
| **PBKDF2** | 600,000+ iterations | Élevée |
| **bcrypt** | cost=12+ | Élevée |

**Temps de crack par KDF (GPU):**
| KDF | 8-char password |
|-----|-----------------|
| PBKDF2 (10k iter) | Minutes |
| PBKDF2 (600k iter) | Jours |
| Argon2id (64MB) | Mois-années |
| scrypt (N=2^20) | Mois-années |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** :
  - Seed dans SE (pas de backup chiffré exportable)
  - Recovery phrase = backup
- **Trezor** :
  - SLIP-0039 shares
  - Passphrase = KDF additionnel
- **Coldcard** :
  - Encrypted backup sur microSD
  - AES-256-CTR
  - 12 words comme key
- **BitBox02** :
  - Backup sur microSD chiffré
  - Device password as key

### Software Wallets
- **MetaMask** :
  - Vault chiffré AES-256-GCM
  - PBKDF2 pour dérivation
  - ~600k iterations (récent)
- **Electrum** :
  - Wallet file chiffré
  - AES-256-CBC
- **Exodus** :
  - Backup email chiffré
  - Local encryption

### Cloud Backup (risqué)
- **iCloud Keychain** : AES-256, end-to-end
- **Google Backup** : AES-256, mais Google access
- **Risque** : Law enforcement, hacks

### Best Practices
1. **Offline backup** préféré
2. **Strong KDF** (Argon2id)
3. **Passphrase forte** (20+ chars ou diceware)
4. **Multiple locations** géographiques

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | AES-256-GCM + Argon2id + offline | 100% |
| **Élevé** | AES-256 + strong KDF | 80% |
| **Moyen** | AES-256 + PBKDF2 (iterations élevés) | 60% |
| **Basique** | AES + weak KDF | 30% |
| **Critique** | Pas de chiffrement ou faible | 0% |

## 5. Sources et Références

- [NIST SP 800-132 - KDF Recommendations](https://csrc.nist.gov/publications/detail/sp/800-132/final)
- [Argon2 Specification](https://www.rfc-editor.org/rfc/rfc9106)
- [AES-GCM (NIST SP 800-38D)](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
""",

    4629: """## 1. Vue d'ensemble

Le critère **Geographic Redundancy** évalue la distribution géographique des backups et systèmes pour protéger contre les catastrophes locales (incendie, inondation, vol, saisie).

La règle 3-2-1 : 3 copies, 2 types de média, 1 off-site.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Niveau de redundance | Protection | Complexité |
|---------------------|------------|------------|
| **Même location** | Aucune | Minimale |
| **Ville différente** | Catastrophe locale | Faible |
| **Pays différent** | Catastrophe nationale | Moyenne |
| **Continent différent** | Catastrophe régionale | Élevée |
| **Juridictions multiples** | Saisie légale | Très élevée |

**Risques par type:**
| Risque | Probabilité | Impact |
|--------|-------------|--------|
| Incendie maison | 1/3000/an | Total |
| Cambriolage | 1/50/an | Partiel-Total |
| Inondation | Variable | Total |
| Saisie légale | Rare | Total |
| EMP/Catastrophe | Très rare | Régional |

**Solutions de stockage:**
| Solution | Durabilité | Accès |
|----------|------------|-------|
| Coffre-fort maison | 1-2h feu | Immédiat |
| Coffre bancaire | Institutionnel | Heures ouvrées |
| Coffre privé | Variable | 24/7 possible |
| Chez famille | Dépendant | Variable |
| Cloud chiffré | Élevée | Instant |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Backup seed** : 2-3 copies recommandées
- **Metal backup** : Résistant feu/eau
- **Distribution** : Maison + coffre + famille

### Multi-sig Géographique
- **Casa** :
  - 3-of-5 multi-sig
  - Clés distribuées géographiquement
  - Mobile + Hardware + Casa key
- **Unchained** :
  - 2-of-3 collaborative
  - Unchained holds 1 key
  - Geographic distribution

### Shamir Shares
- **SLIP-0039** :
  - 2-of-3 minimum pour geo-redundance
  - Une share par location
- **Exemple** :
  - Share 1: Maison
  - Share 2: Coffre banque
  - Share 3: Famille autre ville

### CEX/Custody
- **Coinbase Custody** : Multi-datacenter
- **BitGo** : Geo-distributed HSMs
- **Fireblocks** : Global infrastructure

### Solutions physiques
- **Cryptosteel Capsule** : Coffre-fort résistant
- **Billfodl** : Distribution possible
- **SeedPlate** : Multiple copies

### Considérations légales
- **Juridictions** : Éviter une seule juridiction
- **Trusts** : Structures offshore légales
- **Attention** : Compliance fiscale obligatoire

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Multi-continent + multi-juridiction + multi-sig | 100% |
| **Élevé** | Multi-pays + 3 copies + different media | 80% |
| **Moyen** | Multi-ville + 2 copies | 50% |
| **Basique** | 2 copies même ville | 25% |
| **Critique** | 1 seule copie | 0% |

## 5. Sources et Références

- [Casa Geographic Distribution](https://casa.io/security)
- [Glacier Protocol](https://glacierprotocol.org/) - Deep cold storage
- [3-2-1 Backup Rule](https://www.backblaze.com/blog/the-3-2-1-backup-strategy/)
""",

    4630: """## 1. Vue d'ensemble

Le critère **Disaster Recovery Plan** évalue l'existence et la qualité d'un plan de récupération après sinistre : procédures documentées, tests réguliers, et temps de récupération définis.

Sans plan testé, la récupération sous stress est vouée à l'échec.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Métrique DR | Description | Cible |
|-------------|-------------|-------|
| **RTO** | Recovery Time Objective | < 24h |
| **RPO** | Recovery Point Objective | 0 (pas de perte) |
| **MTTR** | Mean Time To Recovery | < 4h |
| **Test frequency** | Fréquence des tests DR | Annuel minimum |

**Composants d'un DR plan:**
| Composant | Contenu |
|-----------|---------|
| Inventaire | Liste de tous les assets |
| Procédures | Step-by-step recovery |
| Contacts | Personnes à contacter |
| Locations | Où sont les backups |
| Tests | Résultats des derniers tests |
| Updates | Dernière mise à jour du plan |

**Scénarios à couvrir:**
| Scénario | Fréquence test |
|----------|----------------|
| Perte device | Annuel |
| Perte backup | Annuel |
| Décès/incapacité | Planifié |
| Compromission | Annuel |
| Catastrophe naturelle | Documentation |

## 3. Application aux Produits Crypto

### Pour Individus
- **Documentation** :
  - Où sont les seeds/backups
  - Comment les utiliser
  - Qui contacter
- **Test annuel** :
  - Restore sur device neuf
  - Vérifier tous les backups lisibles
  - Update procédures

### Pour Enterprises
- **SOC 2 Type II** : DR plan obligatoire
- **ISO 27001** : Business continuity requirements
- **Testing** : Tabletop exercises + real drills

### Custody Providers
- **Coinbase** :
  - DR plan audité SOC 2
  - Multi-datacenter
  - Documented procedures
- **BitGo** :
  - Geographic redundancy
  - Regular DR tests
  - Published RTO/RPO

### Multi-sig Recovery
- **Casa** :
  - Recovery protocol documenté
  - Health check annuel
  - Emergency access
- **Unchained** :
  - Collaborative recovery
  - Support during crisis

### Hardware Wallet Recovery
- **Test recommandé** :
  1. Factory reset device
  2. Restore from seed
  3. Verify all accounts present
  4. Document time taken

### Inheritance comme DR
- **Dead man's switch** intégré au DR
- **Instructions** pour héritiers
- **Test** : Héritiers peuvent-ils récupérer ?

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | DR documenté + testé annuellement + RTO<4h | 100% |
| **Élevé** | DR documenté + testé + RTO<24h | 75% |
| **Moyen** | DR documenté, non testé | 50% |
| **Basique** | Backups existent, pas de plan | 25% |
| **Critique** | Pas de DR plan | 0% |

## 5. Sources et Références

- [NIST SP 800-34 - Contingency Planning](https://csrc.nist.gov/publications/detail/sp/800-34/rev-1/final)
- [ISO 22301 - Business Continuity](https://www.iso.org/iso-22301-business-continuity.html)
- [Casa Emergency Access](https://casa.io/)
""",

    4631: """## 1. Vue d'ensemble

Le critère **Rate Limiting & Throttling** évalue les mécanismes de limitation de débit qui protègent contre les abus : brute-force, DDoS, et extraction massive de données.

Sans rate limiting, un attaquant peut tester des millions de combinaisons.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type de limite | Application | Valeur typique |
|----------------|-------------|----------------|
| **Login attempts** | Auth | 5/minute, 20/heure |
| **API calls** | REST API | 100-1000/minute |
| **Withdrawals** | CEX | 3/jour sans 2FA |
| **Password reset** | Account | 3/heure |
| **Transaction signing** | Wallet | Illimité (user control) |

**Algorithmes de rate limiting:**
| Algorithme | Description | Use case |
|------------|-------------|----------|
| Token bucket | Burst allowed | API general |
| Leaky bucket | Constant rate | Streaming |
| Fixed window | Simple counter | Basic |
| Sliding window | Smooth limiting | Precise |

**Réponse aux violations:**
| Action | Sévérité |
|--------|----------|
| 429 Too Many Requests | Standard |
| Temporary block (15min) | Moyen |
| Account lock (1h) | Élevé |
| Permanent block | Sévère |
| CAPTCHA challenge | Intermédiaire |

## 3. Application aux Produits Crypto

### CEX
- **Coinbase** :
  - API: 10,000 requests/hour
  - Login: 5 attempts then CAPTCHA
  - Withdrawal: Whitelist + delay
- **Binance** :
  - API: Weight-based limits
  - Order limits par seconde
  - IP-based restrictions
- **Kraken** :
  - Tier-based API limits
  - Rate limit headers

### Hardware Wallets
- **Ledger** :
  - PIN: 3 wrong = increasing delay
  - Wipe after 3 more wrong
- **Trezor** :
  - Exponential delay (2^n seconds)
  - 16 attempts = wipe
- **Coldcard** :
  - Configurable attempts
  - Trick PINs = instant action

### Software Wallets
- **MetaMask** :
  - Pas de rate limit local (user control)
  - Infura/Alchemy: API limits
- **Risk** : Malware peut signer rapidement

### DeFi Protocols
- **Smart contracts** : Gas = natural limit
- **Flashbots** : Bundle limits
- **APIs** :
  - 1inch: 1 req/sec free tier
  - Uniswap: SDK rate limits

### Infrastructure
- **RPC providers** :
  - Alchemy: 300M CU/month free
  - Infura: 100k req/day free
  - QuickNode: Plan-based

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Multi-layer rate limits + adaptive + account lock | 100% |
| **Élevé** | Rate limit + exponential backoff + lock | 75% |
| **Moyen** | Basic rate limiting | 50% |
| **Basique** | Simple limits, easily bypassed | 25% |
| **Vulnérable** | Pas de rate limiting | 0% |

## 5. Sources et Références

- [OWASP Rate Limiting](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/12-API_Testing/04-Testing_for_Resource_Consumption)
- [RFC 6585 - 429 Status Code](https://www.rfc-editor.org/rfc/rfc6585)
- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
""",

    4632: """## 1. Vue d'ensemble

Le critère **Session Management Security** évalue la sécurité de la gestion des sessions utilisateur : durée, invalidation, détection d'anomalies, et protection contre le vol de session.

Une session volée = accès complet au compte.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre session | Valeur recommandée | Risque si violé |
|-------------------|-------------------|-----------------|
| **Durée maximale** | 24h-7j | Session permanente |
| **Idle timeout** | 15-30 min | Poste non verrouillé |
| **Token rotation** | À chaque action sensible | Token theft |
| **Binding** | IP + User-Agent | Session hijacking |

**Types de tokens:**
| Type | Storage | Sécurité |
|------|---------|----------|
| JWT | Client-side | Moyenne (si bien impl) |
| Session cookie | Server-side | Élevée |
| Refresh token | Secure storage | Élevée |
| Access token | Memory | Moyenne |

**Attributs cookies sécurisés:**
```
Set-Cookie: session=abc123;
  HttpOnly;      // Pas accessible via JS
  Secure;        // HTTPS only
  SameSite=Strict; // CSRF protection
  Path=/;
  Max-Age=86400; // 24h
```

**Détection d'anomalies:**
| Signal | Action |
|--------|--------|
| IP change | Re-auth ou warning |
| Device change | 2FA obligatoire |
| Location change | Verification |
| Concurrent sessions | Alert |

## 3. Application aux Produits Crypto

### CEX
- **Coinbase** :
  - Session timeout configurable
  - Device management
  - IP whitelist option
  - Concurrent session alerts
- **Binance** :
  - Device management
  - Session activity log
  - 2FA pour nouvelles sessions
- **Kraken** :
  - Global Settings Lock
  - Session timeout
  - IP restrictions

### Software Wallets
- **MetaMask** :
  - Auto-lock timeout
  - No server session (local only)
  - Password to unlock
- **Rabby** :
  - Session settings
  - Auto-lock configurable

### Mobile Wallets
- **Trust Wallet** : Biometric + timeout
- **Coinbase Wallet** : App lock settings
- **Phantom** : Auto-lock

### DeFi Interfaces
- **Web apps** :
  - WalletConnect sessions
  - Session expiration variable
- **WalletConnect v2** :
  - Session namespaces
  - Expiry: 7 days default

### Hardware Wallets
- **Auto-lock** : Configurable (1-10 min)
- **Session = device unlock**
- **Ledger** : 10 min default
- **Trezor** : Configurable

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Short timeout + rotation + binding + anomaly detection | 100% |
| **Élevé** | Timeout + device management + 2FA new device | 75% |
| **Moyen** | Configurable timeout + basic session management | 50% |
| **Basique** | Fixed timeout, no management | 25% |
| **Vulnérable** | Long/no timeout, no protection | 0% |

## 5. Sources et Références

- [OWASP Session Management](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/)
- [RFC 6265 - HTTP Cookies](https://www.rfc-editor.org/rfc/rfc6265)
- [WalletConnect v2 Specs](https://docs.walletconnect.com/)
""",

    4633: """## 1. Vue d'ensemble

Le critère **Two-Factor Authentication Quality** évalue la qualité et la diversité des options 2FA proposées, en distinguant les méthodes fortes (hardware keys, TOTP) des méthodes faibles (SMS).

SMS 2FA a été compromis dans de nombreuses attaques SIM swap.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Méthode 2FA | Sécurité | Vulnérabilité |
|-------------|----------|---------------|
| **Hardware key (FIDO2)** | Très élevée | Perte physique |
| **TOTP (Authenticator)** | Élevée | Phishing, backup codes |
| **Push notification** | Moyenne | MFA fatigue |
| **SMS** | Faible | SIM swap, interception |
| **Email** | Faible | Account takeover |

**Standards 2FA:**
| Standard | Protocol | Support |
|----------|----------|---------|
| FIDO2/WebAuthn | Challenge-response | Moderne |
| TOTP | RFC 6238 | Universel |
| HOTP | RFC 4226 | Legacy |
| U2F | FIDO 1.0 | Deprecated |

**Hardware keys populaires:**
| Device | Prix | Features |
|--------|------|----------|
| YubiKey 5 NFC | ~$50 | FIDO2, NFC, USB |
| YubiKey 5C | ~$55 | USB-C, FIDO2 |
| Thetis Pro | ~$30 | FIDO2, budget |
| Google Titan | ~$30 | FIDO2, Bluetooth |
| Ledger (FIDO) | Inclus | FIDO app |

**TOTP parameters:**
| Paramètre | Valeur standard |
|-----------|-----------------|
| Algorithm | HMAC-SHA1 (ou SHA256/512) |
| Digits | 6 |
| Period | 30 seconds |
| Secret | 160+ bits |

## 3. Application aux Produits Crypto

### CEX
- **Coinbase** :
  - Hardware keys (FIDO2) ✓
  - TOTP ✓
  - SMS (déconseillé) ✓
  - Coinbase Security Key
- **Kraken** :
  - Hardware keys ✓
  - TOTP ✓
  - Master Key (additional 2FA)
  - No SMS option (sécurité)
- **Binance** :
  - TOTP ✓
  - Hardware keys ✓
  - SMS (marchés émergents)
  - Binance Authenticator

### Hardware Wallets
- **Pas de 2FA traditionnel** : PIN = single factor
- **Ledger** : FIDO U2F app (peut servir de 2FA)
- **Trezor** : U2F/FIDO2 support

### Software Wallets
- **MetaMask** : Pas de 2FA (local password)
- **Rabby** : Pas de 2FA
- **Note** : Hardware wallet = meilleur que 2FA

### Best Practices
1. **FIDO2 hardware key** : Primaire
2. **TOTP** : Backup
3. **Backup codes** : Stockés offline
4. **Jamais SMS** pour crypto

### Authenticator Apps
- **Authy** : Cloud backup (risqué)
- **Google Authenticator** : Local only
- **Aegis** : Open source, encrypted backup
- **1Password** : Integrated TOTP

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | FIDO2 obligatoire + TOTP backup + no SMS | 100% |
| **Élevé** | FIDO2 + TOTP options | 80% |
| **Moyen** | TOTP obligatoire | 60% |
| **Basique** | TOTP optionnel | 40% |
| **Faible** | SMS only ou pas de 2FA | 0% |

## 5. Sources et Références

- [FIDO Alliance](https://fidoalliance.org/)
- [RFC 6238 - TOTP](https://www.rfc-editor.org/rfc/rfc6238)
- [NIST SP 800-63B - Authentication](https://pages.nist.gov/800-63-3/sp800-63b.html)
""",

    4634: """## 1. Vue d'ensemble

Le critère **IP/Geolocation Restrictions** évalue la capacité de restreindre l'accès basé sur l'adresse IP ou la localisation géographique, protégeant contre les accès non autorisés depuis des régions suspectes.

Un accès depuis un pays inhabituel = signal d'alarme fort.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type de restriction | Granularité | Efficacité |
|--------------------|-------------|------------|
| **IP whitelist** | Adresse exacte | Très élevée |
| **IP range** | Subnet /24, /16 | Élevée |
| **Country block** | Par pays | Moyenne |
| **ASN block** | Par provider | Moyenne |
| **VPN detection** | Heuristique | Variable |

**Bases de données géolocalisation:**
| Provider | Précision pays | Précision ville |
|----------|---------------|-----------------|
| MaxMind | 99%+ | 75-80% |
| IP2Location | 99%+ | 80%+ |
| ipinfo.io | 99%+ | Variable |

**Signaux d'anomalie géo:**
| Signal | Risk score |
|--------|------------|
| Nouveau pays | Élevé |
| Changement rapide de pays | Très élevé |
| Pays à haut risque | Élevé |
| VPN/Proxy détecté | Moyen |
| TOR exit node | Élevé |

## 3. Application aux Produits Crypto

### CEX
- **Coinbase** :
  - Country restrictions (compliance)
  - New location = verification
  - VPN blocked pour certaines régions
- **Kraken** :
  - Geographic restrictions
  - IP whitelist pour API
  - Alerts on new IPs
- **Binance** :
  - Regional restrictions
  - IP whitelist withdrawals
  - Device + location binding

### API Security
- **IP whitelist obligatoire** pour:
  - Withdrawal API
  - Trading API (high frequency)
- **API keys** avec IP restriction

### Hardware Wallets
- **Non applicable** : Pas de connexion directe
- **Companion apps** : Peuvent implémenter

### Software Wallets
- **Non applicable** : Local operation
- **RPC endpoints** : Provider peut restricter

### DeFi
- **Frontend restrictions** :
  - Uniswap: OFAC compliance
  - Aave: Geo-blocking certains pays
- **Smart contracts** : Pas de restriction on-chain
- **Workaround** : Direct contract interaction

### Limitations
- **VPN bypass** : Facile à contourner
- **False positives** : Voyageurs légitimes
- **Privacy concerns** : Tracking users

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | IP whitelist + geo alerts + anomaly detection | 100% |
| **Élevé** | IP restrictions + new location 2FA | 75% |
| **Moyen** | Geo-blocking + basic alerts | 50% |
| **Basique** | Country restrictions only | 25% |
| **Aucun** | Pas de restrictions géo | 0% |

## 5. Sources et Références

- [MaxMind GeoIP](https://www.maxmind.com/)
- [OFAC Sanctions](https://ofac.treasury.gov/)
- [Cloudflare IP Geolocation](https://www.cloudflare.com/learning/ddos/glossary/ip-geolocation/)
""",

    4635: """## 1. Vue d'ensemble

Le critère **Withdrawal Delay & Limits** évalue les mécanismes de délai et de plafond sur les retraits, créant une fenêtre de temps pour détecter et annuler les transactions frauduleuses.

Un délai de 24-72h peut sauver des millions en cas de compromission.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type de limite | Valeur typique | Protection |
|----------------|---------------|------------|
| **Daily limit** | Variable par tier | Limite pertes quotidiennes |
| **Per-tx limit** | % du daily | Limite single theft |
| **New address delay** | 24-72h | Empêche drain rapide |
| **Whitelist cooldown** | 24-48h | Vérifie nouvelles adresses |

**Tiers de retrait CEX typiques:**
| Tier | Verification | Daily limit |
|------|--------------|-------------|
| Unverified | Email only | $1,000-10,000 |
| Basic KYC | ID + selfie | $50,000-100,000 |
| Enhanced | Address proof | $500,000+ |
| Institutional | Full due diligence | Illimité |

**Délais recommandés:**
| Action | Délai minimum |
|--------|---------------|
| Nouvelle adresse whitelist | 24h |
| Gros retrait (>10% balance) | 24h |
| Changement settings sécurité | 48h |
| 2FA device change | 24-48h |

## 3. Application aux Produits Crypto

### CEX
- **Coinbase** :
  - Vault: 48h withdrawal delay
  - Instant send to contacts
  - Tiered limits
- **Kraken** :
  - Global Settings Lock (72h)
  - Address whitelist
  - Tiered withdrawal limits
- **Gemini** :
  - Withdrawal allowlist
  - 7-day delay new addresses
  - Approval for large withdrawals
- **Binance** :
  - 24h for new address
  - Withdrawal whitelist
  - Risk-based limits

### Smart Contract Wallets
- **Gnosis Safe** :
  - Time-lock module (custom delay)
  - Daily spending limits
  - Recovery delay
- **Argent** :
  - Daily limit without guardian
  - Large tx need guardian approval
  - 24h delay

### Hardware Wallets
- **Pas de limite native** : User responsibility
- **Workaround** : Multi-sig avec time-lock

### DeFi Time-locks
- **OpenZeppelin TimelockController** :
  - Minimum delay configurable
  - Typically 24h-7 days
- **DAO treasuries** : Multi-day delays standard

### Self-custody Best Practices
- **Multi-sig** pour gros montants
- **Time-lock scripts** Bitcoin (CLTV)
- **Smart contract limits** Ethereum

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Time-lock + whitelist + daily limits + alerts | 100% |
| **Élevé** | Whitelist delay + per-tx limits | 75% |
| **Moyen** | Daily limits + new address delay | 50% |
| **Basique** | Daily limits only | 25% |
| **Risqué** | No limits or delays | 0% |

## 5. Sources et Références

- [Gnosis Safe Modules](https://docs.safe.global/safe-smart-account/modules)
- [OpenZeppelin TimelockController](https://docs.openzeppelin.com/contracts/4.x/api/governance#TimelockController)
- [Kraken Security Features](https://support.kraken.com/hc/en-us/articles/360000426923)
""",

    4636: """## 1. Vue d'ensemble

Le critère **Emergency Contact System** évalue les mécanismes permettant de contacter rapidement le support ou des personnes de confiance en cas d'urgence : compromission détectée, accès suspect, ou demande de gel de compte.

Chaque minute compte lors d'une attaque active.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Canal d'urgence | Temps de réponse | Efficacité |
|-----------------|------------------|------------|
| **Hotline téléphone** | < 5 minutes | Très élevée |
| **Chat in-app** | 5-30 minutes | Élevée |
| **Email priorité** | 1-24 heures | Moyenne |
| **Ticket support** | 24-72 heures | Faible pour urgence |
| **Social media** | Variable | Dernier recours |

**Actions d'urgence typiques:**
| Action | Description |
|--------|-------------|
| Account freeze | Blocage immédiat toutes opérations |
| Withdrawal halt | Stop retraits uniquement |
| Password reset | Changement forcé credentials |
| 2FA reset | Désactivation 2FA compromise |
| Investigation | Analyse forensique |

**Informations à fournir en urgence:**
| Information | Importance |
|-------------|------------|
| Account identifier | Critique |
| Dernière activité légitime | Élevée |
| Activité suspecte observée | Élevée |
| Méthode de compromission (si connue) | Moyenne |

## 3. Application aux Produits Crypto

### CEX
- **Coinbase** :
  - Phone support (paid tiers)
  - Account lock via app
  - @CoinbaseSupport Twitter
- **Kraken** :
  - 24/7 live chat
  - Phone callback
  - Account lock feature
- **Binance** :
  - Live chat 24/7
  - Disable account button
  - @BinanceHelpDesk
- **Gemini** :
  - Phone support
  - Instant account freeze

### Custody Providers
- **Casa** :
  - Emergency access protocol
  - Dedicated support line
  - Scheduled health checks
- **BitGo** :
  - 24/7 SOC
  - Emergency contacts
  - Incident response team
- **Anchorage** :
  - Dedicated CSM
  - Emergency procedures

### Hardware Wallets
- **Pas d'urgence "externe"** : Self-custody
- **Emergency** = move funds to new seed
- **Ledger** : Support ticket (pas d'urgence immédiate)

### DeFi
- **Pas de support centralisé**
- **Discord/Telegram** pour communautés
- **Risque** : Scammers imitent support

### Self-custody Emergency
- **Trusted contacts** : Liste de personnes à contacter
- **Dead man's switch** : Si vous êtes incapacité
- **Recovery procedure** documentée

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | 24/7 hotline + instant freeze + dedicated team | 100% |
| **Élevé** | 24/7 chat + self-service freeze | 75% |
| **Moyen** | Business hours support + freeze option | 50% |
| **Basique** | Email/ticket only | 25% |
| **Aucun** | Pas de support d'urgence | 0% |

## 5. Sources et Références

- [Coinbase Phone Support](https://help.coinbase.com/en/contact-us)
- [Kraken Security Practices](https://www.kraken.com/features/security)
- [Casa Emergency Access](https://casa.io/)
""",

    4637: """## 1. Vue d'ensemble

Le critère **Audit Trail & Logging** évalue la qualité des journaux d'activité : exhaustivité, immutabilité, rétention, et accessibilité pour investigation post-incident.

Sans logs, impossible de comprendre ce qui s'est passé lors d'une compromission.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Événement à logger | Priorité | Rétention min |
|-------------------|----------|---------------|
| **Login/Logout** | Critique | 1 an |
| **Transactions** | Critique | 7 ans (réglementaire) |
| **Settings changes** | Élevée | 1 an |
| **API calls** | Moyenne | 90 jours |
| **Failed attempts** | Élevée | 1 an |
| **IP addresses** | Moyenne | 90 jours |

**Format de log recommandé:**
| Champ | Description |
|-------|-------------|
| timestamp | ISO 8601, UTC |
| event_type | Catégorie d'événement |
| user_id | Identifiant utilisateur |
| ip_address | Source de la requête |
| user_agent | Browser/app info |
| action | Action effectuée |
| result | Success/failure |
| details | Context additionnel |

**Standards de logging:**
| Standard | Application |
|----------|-------------|
| SOC 2 | Type II audit trail |
| PCI-DSS | Financial logging |
| GDPR | Data access logs |
| ISO 27001 | Security events |

## 3. Application aux Produits Crypto

### CEX
- **Coinbase** :
  - Activity log complet
  - Export CSV disponible
  - API access logs
  - Tax reporting (7+ years)
- **Kraken** :
  - Detailed history
  - Export multiple formats
  - API call logs
- **Binance** :
  - Transaction history
  - Login history
  - Security alerts log

### Hardware Wallets
- **Logging limité** (privacy by design)
- **Ledger Live** : Transaction history
- **Trezor Suite** : Activity logs locaux
- **On-device** : Pas de logs persistants

### Software Wallets
- **MetaMask** :
  - Activity tab (recent tx)
  - Pas d'export natif
  - Clear activity possible
- **Rabby** :
  - Transaction history
  - Contract interactions
  - Better than MetaMask

### Blockchain (immutable log)
- **On-chain** = audit trail parfait
- **Block explorers** :
  - Etherscan
  - Blockchair
  - Solscan
- **Limitation** : Privacy réduite

### Custody/Enterprise
- **BitGo** :
  - Comprehensive audit logs
  - SOC 2 compliant
  - Custom retention
- **Fireblocks** :
  - Full activity trail
  - Policy engine logs
  - Exportable

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Comprehensive logs + immutable + 7y retention + export | 100% |
| **Élevé** | Full activity log + 1y retention + export | 75% |
| **Moyen** | Basic logs + 90d retention | 50% |
| **Basique** | Recent activity only | 25% |
| **Insuffisant** | No logging ou logs effaçables | 0% |

## 5. Sources et Références

- [SOC 2 Logging Requirements](https://www.aicpa.org/soc2)
- [NIST SP 800-92 - Log Management](https://csrc.nist.gov/publications/detail/sp/800-92/final)
- [PCI-DSS Requirement 10](https://www.pcisecuritystandards.org/)
""",

    4638: """## 1. Vue d'ensemble

Le critère **Incident Response Capability** évalue la capacité d'une organisation à détecter, répondre et récupérer d'incidents de sécurité : équipe dédiée, procédures, et temps de réponse.

Les premières heures après une détection sont critiques.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Métrique IR | Définition | Cible |
|-------------|------------|-------|
| **MTTD** | Mean Time To Detect | < 24h |
| **MTTR** | Mean Time To Respond | < 1h |
| **MTTC** | Mean Time To Contain | < 4h |
| **MTTR** | Mean Time To Recover | < 24h |

**Phases de réponse incident (NIST):**
| Phase | Activités |
|-------|-----------|
| **Preparation** | Plans, équipe, outils |
| **Detection** | Monitoring, alertes |
| **Containment** | Isoler la menace |
| **Eradication** | Supprimer la cause |
| **Recovery** | Restaurer opérations |
| **Lessons Learned** | Post-mortem |

**Équipe IR typique:**
| Rôle | Responsabilité |
|------|----------------|
| IR Manager | Coordination |
| Security Analyst | Investigation technique |
| Communications | Stakeholders, public |
| Legal | Implications légales |
| Executive | Décisions critiques |

## 3. Application aux Produits Crypto

### CEX
- **Coinbase** :
  - Security team 24/7
  - Bug bounty program
  - Public incident reports
  - Rapid response history
- **Kraken** :
  - Security-first culture
  - Regular red team exercises
  - Transparent incident handling
- **Binance** :
  - SAFU fund ($1B+)
  - Security team global
  - Post-incident transparency

### DeFi Protocols
- **Monitoring** :
  - Forta Network (automated detection)
  - OpenZeppelin Defender
  - Hypernative
- **Response** :
  - War rooms Discord/Telegram
  - White hat rescue operations
  - Protocol pause mechanisms

**DeFi incident examples:**
| Protocol | Incident | Response |
|----------|----------|----------|
| Euler | $197M hack | White hat negotiation |
| Wormhole | $320M exploit | Jump covered |
| Ronin | $625M hack | Reimbursement |

### Hardware Wallets
- **Limited applicability** : Self-custody
- **Ledger** : Security bulletins, firmware updates
- **Trezor** : Responsible disclosure

### Custody Providers
- **24/7 SOC** obligatoire
- **Insurance** requirements
- **Regular testing** (pen tests, tabletops)

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | 24/7 SOC + documented IR + <1h MTTR + insurance | 100% |
| **Élevé** | IR team + documented procedures + <4h MTTR | 75% |
| **Moyen** | Basic IR capability + <24h response | 50% |
| **Basique** | Ad-hoc response capability | 25% |
| **Insuffisant** | No IR capability | 0% |

## 5. Sources et Références

- [NIST SP 800-61 - Incident Handling](https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final)
- [SANS Incident Handler's Handbook](https://www.sans.org/white-papers/)
- [Forta Network](https://forta.org/)
""",

    4639: """## 1. Vue d'ensemble

Le critère **Bug Bounty Program Quality** évalue la qualité du programme de bug bounty : scope, récompenses, réactivité, et historique de paiements.

Un bon bug bounty attire les meilleurs chercheurs avant les hackers malveillants.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Sévérité | Payout typique crypto | Payout traditionnel |
|----------|----------------------|---------------------|
| **Critical** | $100k - $10M+ | $10k - $100k |
| **High** | $10k - $100k | $5k - $20k |
| **Medium** | $1k - $10k | $1k - $5k |
| **Low** | $100 - $1k | $100 - $500 |

**Plus gros payouts crypto:**
| Program | Payout | Vulnérabilité |
|---------|--------|---------------|
| Wormhole | $10M | Bridge exploit |
| Aurora | $6M | Inflation bug |
| Polygon | $2M | Plasma vulnerability |
| Optimism | $2M | Infinite mint |

**Plateformes de bug bounty:**
| Plateforme | Focus |
|------------|-------|
| Immunefi | Crypto/DeFi leader |
| HackerOne | Enterprise, some crypto |
| Bugcrowd | Enterprise |
| Code4rena | Competitive audits |
| Sherlock | DeFi insurance + audits |

**Caractéristiques bon programme:**
| Facteur | Importance |
|---------|------------|
| Scope clair | Critique |
| Payout rapide | Élevée |
| Safe harbor | Élevée |
| Communication claire | Élevée |
| Historique de paiements | Indicative |

## 3. Application aux Produits Crypto

### CEX
- **Coinbase** :
  - HackerOne program
  - Max: $1M+ for critical
  - Historique solide
- **Kraken** :
  - Bug bounty actif
  - Transparent payouts
  - Responsive team
- **Binance** :
  - Large bounty pool
  - Multiple payouts

### DeFi Protocols (Immunefi)
- **MakerDAO** : Up to $10M
- **Compound** : Up to $150k
- **Aave** : Up to $250k
- **Uniswap** : Up to $2.25M
- **Lido** : Up to $2M

### Hardware Wallets
- **Ledger Donjon** :
  - Bounty program actif
  - Research publications
  - Responsible disclosure
- **Trezor** :
  - Bug bounty
  - Open-source focus
- **Coldcard** :
  - Informal program
  - Community-driven

### L2 & Infrastructure
- **Optimism** : Up to $2M
- **Arbitrum** : Up to $2M
- **Chainlink** : Up to $100k

### Évaluation d'un programme
1. **Scope** : Couvre tous les contrats critiques ?
2. **Rewards** : Proportionnels au risque ?
3. **Response time** : < 24h premier contact ?
4. **Payment history** : Track record ?
5. **Safe harbor** : Protection légale chercheurs ?

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | $1M+ critical + historique + <24h response | 100% |
| **Élevé** | $100k+ critical + good track record | 75% |
| **Moyen** | Active program + reasonable rewards | 50% |
| **Basique** | Program exists, low rewards | 25% |
| **Aucun** | No bug bounty program | 0% |

## 5. Sources et Références

- [Immunefi](https://immunefi.com/)
- [HackerOne Crypto Programs](https://hackerone.com/)
- [Code4rena](https://code4rena.com/)
- [Sherlock](https://www.sherlock.xyz/)
"""
}

def main():
    print("Saving Adversity summaries A-ADD-021 to A-ADD-040...")
    for norm_id, summary in summaries.items():
        url = f'{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}'
        data = {
            'summary': summary,
            'summary_status': 'generated',
            'last_summarized_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }
        resp = requests.patch(url, headers=SUPABASE_HEADERS, json=data)
        print(f'ID {norm_id}: {resp.status_code}')
        time.sleep(0.3)
    print('Done!')

if __name__ == "__main__":
    main()
