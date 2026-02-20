#!/usr/bin/env python3
"""Generate summaries batch for Adversity norms A-ADD-001 to A-ADD-040."""

import requests
import sys
import time
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    4600: """## 1. Vue d'ensemble

Le critère **Wrench Attack Resistance** évalue la capacité d'un système à protéger les fonds même face à une attaque physique violente ("$5 wrench attack") où l'utilisateur est contraint sous la menace de révéler ses clés.

Ce critère combine plusieurs mécanismes: duress codes, plausible deniability, time-locks et alertes silencieuses.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Mécanisme de défense | Efficacité | Implémentation |
|---------------------|-----------|----------------|
| **Duress PIN** | Haute | PIN alternatif → wallet leurre |
| **Time-locks** | Moyenne | Délai 24-72h sur grosses transactions |
| **Multi-sig** | Très haute | 2-of-3 minimum, clés distribuées |
| **Hidden wallets** | Haute | Passphrase BIP39 secondaire |
| **Geographic locks** | Moyenne | Transactions limitées par région |

**Niveaux de protection recommandés:**
| Montant en custody | Protection minimale |
|--------------------|---------------------|
| < $10,000 | Duress PIN + passphrase |
| $10,000 - $100,000 | + Time-lock 24h |
| $100,000 - $1M | + Multi-sig 2-of-3 |
| > $1M | + Geographic distribution + MPC |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Coldcard Mk4** : Duress wallet + Brick Me PIN + Login Countdown = Protection maximale
- **Trezor Model T** : Passphrase cachée + wipe après 16 tentatives
- **Ledger Nano X** : PIN secondaire avec passphrase, pas de time-lock natif
- **Keystone Pro** : Self-destruct mechanism + fingerprint duress

### Software Wallets
- **Gnosis Safe** : Multi-sig + time-lock modules = excellente protection
- **Argent** : Guardian system + social recovery
- **MetaMask** : Aucune protection native (vulnérable)

### CEX
- **Kraken** : Global Settings Lock (72h) + Master Key
- **Coinbase** : Vault avec time-delay 48h
- **Binance** : Withdrawal whitelist + 24h delay

### DeFi/Smart Contracts
- **Timelock contracts** : OpenZeppelin TimelockController (min 24h delay)
- **Multi-sig wallets** : Safe, Squads (Solana)

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Excellent** | Multi-sig + time-lock + duress + geographic | 100% |
| **Bon** | Duress PIN + passphrase + time-lock | 75% |
| **Basique** | Duress PIN ou passphrase seul | 40% |
| **Insuffisant** | Aucune protection coercition | 0% |

## 5. Sources et Références

- [Coldcard Security Model](https://coldcard.com/docs/security-model)
- [OpenZeppelin TimelockController](https://docs.openzeppelin.com/contracts/4.x/api/governance#TimelockController)
- SafeScoring Criteria A-ADD-001 v1.0
""",

    4601: """## 1. Vue d'ensemble

Le critère **Physical Tamper Evidence** évalue si un appareil présente des signes visibles de tentative d'ouverture ou de manipulation physique, permettant à l'utilisateur de détecter une compromission.

Les mécanismes d'évidence incluent : sceaux holographiques, boîtiers soudés, mesh anti-tamper, et détecteurs d'intrusion.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Mécanisme | Technologie | Niveau de sécurité |
|-----------|-------------|-------------------|
| **Sceau holographique** | Hologramme 3D + numéro série | Basique (copiable) |
| **Ultrasonic welding** | Soudure ultrasonique du boîtier | Moyen |
| **Security mesh** | Grille conductrice sur PCB | Élevé |
| **Epoxy potting** | Encapsulation résine époxy | Très élevé |
| **Active tamper detect** | Capteurs + zeroization | Maximum |

**Standards de référence:**
| Standard | Niveau | Exigence tamper |
|----------|--------|-----------------|
| FIPS 140-3 Level 2 | Basique | Tamper-evident seals |
| FIPS 140-3 Level 3 | Élevé | Tamper-response + zeroization |
| FIPS 140-3 Level 4 | Maximum | Environmental failure protection |
| CC EAL4+ | Élevé | Physical security mechanisms |
| CC EAL5+ | Très élevé | Formal verification + physical |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger Nano X** : Sceau holographique + Secure Element ST33J2M0 (CC EAL5+)
- **Trezor Model T** : Sceau ultrasonique, pas de SE (vulnérable à glitching)
- **Coldcard Mk4** : Sac anti-tamper numéroté + SE ATECC608A + clear case option
- **Keystone Pro** : Self-destruct mesh + fingerprint sensor tamper detect
- **GridPlus Lattice1** : Metal enclosure + tamper-evident packaging

### Software Wallets
- Non applicable (pas de composant physique)

### CEX
- **Infrastructure** : Datacenters avec FIPS 140-3 Level 3 HSMs
- **Coinbase** : HSMs Thales Luna certifiés FIPS 140-3 Level 3
- **Kraken** : nCipher HSMs, audit physique annuel

### Solutions de Stockage Physique
- **Cryptosteel** : Pas de tamper evidence (acier inoxydable visible)
- **Billfodl** : Idem
- **SeedPlate** : Sceau optionnel

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Active tamper detection + auto-zeroization | 100% |
| **Élevé** | Security mesh + epoxy potting | 80% |
| **Moyen** | Ultrasonic welding + holographic seal | 50% |
| **Basique** | Holographic seal uniquement | 25% |
| **Aucun** | Pas de tamper evidence | 0% |

## 5. Sources et Références

- NIST FIPS 140-3 (2019) - Security Requirements for Cryptographic Modules
- Common Criteria ISO/IEC 15408 - Physical Security Requirements
- [Ledger Security Model](https://www.ledger.com/academy/security/the-root-of-trust-our-security-model)
""",

    4602: """## 1. Vue d'ensemble

Le critère **Side-Channel Attack Resistance** évalue la résistance d'un appareil aux attaques par canaux auxiliaires : analyse de consommation électrique (DPA/SPA), émissions électromagnétiques (EMA), timing attacks, et fault injection.

Ces attaques exploitent les fuites d'information physiques lors des opérations cryptographiques.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type d'attaque | Abréviation | Contremesure |
|---------------|-------------|--------------|
| **Simple Power Analysis** | SPA | Algorithmes constant-time |
| **Differential Power Analysis** | DPA | Masking (Boolean/arithmetic) |
| **Electromagnetic Analysis** | EMA | Blindage RF + filtrage |
| **Timing Attack** | TA | Constant-time implementation |
| **Fault Injection** | FI | Détecteurs de glitch + redondance |
| **Laser Fault Injection** | LFI | Light sensors + metal shielding |

**Niveaux de protection par Secure Element:**
| Secure Element | Certification | Résistance SCA |
|----------------|---------------|----------------|
| ST33J2M0 (Ledger) | CC EAL5+ | Très élevée |
| ATECC608B | Non CC | Moyenne (masking) |
| Infineon SLE78 | CC EAL6+ | Maximum |
| SE050 (NXP) | CC EAL6+ | Très élevée |
| OPTIGA Trust M | CC EAL6+ | Très élevée |

**Algorithmes constant-time recommandés:**
- EdDSA/Ed25519 (recommandé pour signatures)
- X25519 (échange de clés)
- AES-GCM avec implémentation bitsliced

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** : ST33J2M0 certifié CC EAL5+, résistance DPA/SPA intégrée
- **Trezor** : Pas de SE, vulnérable aux attaques par glitching (démontré par wallet.fail)
- **Coldcard** : ATECC608B avec countermeasures, moins robuste que SE dédié
- **Keystone Pro** : SE + mesh protection contre EMA
- **BitBox02** : ATECC608B + implémentation constant-time

### Software Wallets
- Vulnérables si exécutés sur hardware non sécurisé
- **Mitigation** : TEE (TrustZone) sur mobile, SGX sur desktop

### CEX Infrastructure
- **HSMs** : Thales Luna, nCipher avec CC EAL4+ minimum
- Résistance SCA obligatoire pour certification PCI-DSS

### DeFi/Smart Contracts
- Non applicable directement (exécution on-chain)
- Risque côté client (signature)

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | SE CC EAL6+ avec résistance DPA/SPA/EMA/FI | 100% |
| **Élevé** | SE CC EAL5+ | 80% |
| **Moyen** | SE basique (ATECC608) + constant-time | 50% |
| **Basique** | Constant-time sans SE | 25% |
| **Vulnérable** | Pas de protection SCA | 0% |

## 5. Sources et Références

- [wallet.fail - Trezor Glitching Attack](https://wallet.fail/)
- NIST SP 800-90B - Entropy Sources
- Common Criteria - AVA_VAN (Vulnerability Analysis)
- [Ledger Donjon Security Research](https://donjon.ledger.com/)
""",

    4603: """## 1. Vue d'ensemble

Le critère **Supply Chain Security** évalue les mesures de protection contre les attaques lors de la fabrication, l'assemblage, le transport et la distribution d'un produit hardware.

Une supply chain compromise peut introduire des backdoors matérielles ou logicielles avant même que l'utilisateur ne reçoive le produit.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Vecteur d'attaque | Risque | Contremesure |
|-------------------|--------|--------------|
| **Fabrication SE** | Backdoor silicon | Audit fab + certification CC |
| **Assemblage PCB** | Composants malveillants | Inspection AOI + X-ray |
| **Firmware** | Backdoor code | Signature + reproducible builds |
| **Transport** | Interception/modification | Tamper-evident packaging |
| **Distribution** | Contrefaçon | Vérification authenticité |

**Standards supply chain:**
| Standard | Scope | Exigences clés |
|----------|-------|----------------|
| ISO 28000 | Supply chain security | Risk management |
| C-TPAT | US Customs | Security criteria |
| AEO | EU Customs | Authorized Economic Operator |
| NIST 800-161 | ICT supply chain | Risk management practices |

**Vérification d'authenticité:**
| Méthode | Fiabilité |
|---------|-----------|
| Numéro série en ligne | Moyenne |
| Attestation cryptographique | Élevée |
| Challenge-response avec SE | Très élevée |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** :
  - Attestation device via Secure Element
  - Firmware signé (ECDSA secp256k1)
  - Genuineness check dans Ledger Live
- **Trezor** :
  - Firmware open-source + reproducible builds
  - Pas d'attestation hardware (pas de SE)
  - Sceau holographique
- **Coldcard** :
  - Bag number verification
  - Firmware verification via PGP
  - Made in Canada (supply chain courte)
- **Keystone** :
  - Open-source firmware
  - Web-based verification tool

### Software Wallets
- **Risque** : Distribution via stores non vérifiés
- **MetaMask** : Signature code + vérification hash
- **Mitigation** : Téléchargement depuis site officiel + vérification PGP/SHA256

### CEX
- **Infrastructure** : Audit supply chain datacenters
- Certification SOC 2 Type II inclut supply chain controls

### Solutions Backup Physique
- **Cryptosteel** : Vérification numéro série en ligne
- Risque contrefaçon élevé sur marketplaces tiers

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Attestation crypto + reproducible builds + audit supply chain | 100% |
| **Élevé** | Attestation device + firmware signé | 75% |
| **Moyen** | Firmware signé + tamper packaging | 50% |
| **Basique** | Sceau holographique uniquement | 25% |
| **Insuffisant** | Aucune vérification | 0% |

## 5. Sources et Références

- NIST SP 800-161 - Supply Chain Risk Management
- [Ledger Genuineness Check](https://support.ledger.com/article/4404389367057)
- [Trezor Firmware Verification](https://wiki.trezor.io/Firmware_verification)
""",

    4604: """## 1. Vue d'ensemble

Le critère **Firmware Update Security** évalue la sécurité du processus de mise à jour du firmware : authentification de l'origine, intégrité du code, protection contre le downgrade, et réversibilité.

Un firmware update non sécurisé peut permettre l'installation de code malveillant.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Mécanisme | Description | Criticité |
|-----------|-------------|-----------|
| **Code signing** | Signature ECDSA/EdDSA du firmware | Obligatoire |
| **Secure boot** | Vérification chaîne de confiance au boot | Obligatoire |
| **Anti-rollback** | Prévention downgrade vers version vulnérable | Élevée |
| **Dual-bank** | 2 partitions pour rollback safe | Recommandé |
| **User consent** | Confirmation utilisateur avant update | Élevée |

**Algorithmes de signature firmware:**
| Algorithme | Taille clé | Sécurité |
|-----------|-----------|----------|
| ECDSA secp256k1 | 256 bits | Standard crypto |
| ECDSA P-256 | 256 bits | Standard NIST |
| EdDSA Ed25519 | 256 bits | Moderne, recommandé |
| RSA-4096 | 4096 bits | Legacy mais robuste |

**Structure firmware sécurisé:**
```
[Header: version, size, signature]
[Bootloader: immutable, vérifie firmware]
[Firmware: signé, vérifié au boot]
[Metadata: hash chain, monotonic counter]
```

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** :
  - Secure boot via SE
  - Signature ECDSA
  - Anti-rollback via monotonic counter
  - User PIN requis pour update
- **Trezor** :
  - Bootloader open-source
  - Signature + hash verification
  - Pas d'anti-rollback hardware (soft only)
  - User confirmation on device
- **Coldcard** :
  - Firmware signé PGP par Coinkite
  - User verification du hash
  - Anti-rollback optionnel
- **BitBox02** :
  - Dual-root attestation (Shift + user)
  - Anti-downgrade

### Software Wallets
- **Auto-update risqué** : Supply chain attack vector
- **Best practice** : Update manuel + vérification hash
- **MetaMask** : Auto-update via Chrome store (risque centralisé)

### CEX Mobile Apps
- Signature via app stores (Google/Apple)
- Risque : stores compromis = mass attack

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Secure boot + signed + anti-rollback HW + dual-bank | 100% |
| **Élevé** | Signed + anti-rollback + user consent | 75% |
| **Moyen** | Signed + user verification | 50% |
| **Basique** | Signed uniquement | 25% |
| **Insuffisant** | Pas de signature firmware | 0% |

## 5. Sources et Références

- NIST SP 800-193 - Platform Firmware Resiliency Guidelines
- [Ledger Firmware Security](https://www.ledger.com/academy/security/the-root-of-trust-our-security-model)
- [Trezor Bootloader](https://docs.trezor.io/trezor-firmware/common/bootloader.html)
""",

    4605: """## 1. Vue d'ensemble

Le critère **Entropy Source Quality** évalue la qualité de la source d'entropie utilisée pour la génération des clés cryptographiques. Une entropie insuffisante ou biaisée compromet toute la sécurité du système.

L'entropie doit provenir de sources physiques (TRNG) et être conditionnée par des DRBG certifiés.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Source d'entropie | Type | Qualité |
|-------------------|------|---------|
| **TRNG hardware** | Bruit thermique/shot noise | Excellente |
| **CPU RDRAND** | Intel/AMD instruction | Bonne (si non seul) |
| **User input** | Mouse/keyboard timing | Supplément |
| **PRNG software** | Math.random(), etc. | INSUFFISANT |

**Standards d'entropie:**
| Standard | Exigence | Test |
|----------|----------|------|
| NIST SP 800-90B | Min 256 bits entropy | Health tests continus |
| BSI AIS 31 | Classes P1/P2 (TRNG) | Tests statistiques |
| FIPS 140-3 | Entropy source validation | CAVP testing |

**Débit entropie minimal:**
| Usage | Bits requis | Fréquence |
|-------|-------------|-----------|
| Seed generation | 256 bits | Une fois |
| Nonce generation | 128+ bits | Par transaction |
| Key derivation | 256 bits | Par dérivation |

**Tests statistiques obligatoires (NIST SP 800-22):**
- Frequency test
- Block frequency test
- Runs test
- Longest run test
- Maurer's universal statistical test

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** : TRNG intégré au SE ST33J2M0 (certifié AIS 31)
- **Trezor** : TRNG STM32 + mix user entropy (dice rolls optionnel)
- **Coldcard** : TRNG ATECC608 + avalanche noise circuit optionnel
- **BitBox02** : TRNG + user entropy + host entropy mixing

### Software Wallets
- **MetaMask** : `crypto.getRandomValues()` (Web Crypto API)
- **Electrum** : `/dev/urandom` + optional dice input
- **Risque** : Dépendance à l'OS pour entropy

### CEX
- **HSMs** : TRNG hardware certifié FIPS 140-3
- Entropie poolée multi-sources

### DeFi/Smart Contracts
- **Problème** : Pas d'entropie native on-chain
- **Solutions** : Chainlink VRF, RANDAO (post-merge)
- **Chainlink VRF v2** :
  - 256 bits verifiable randomness
  - On-chain proof verification

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | TRNG certifié (AIS 31/FIPS) + health tests + user entropy | 100% |
| **Élevé** | TRNG hardware + entropy mixing | 80% |
| **Moyen** | TRNG non certifié + software mixing | 50% |
| **Basique** | OS entropy uniquement | 30% |
| **Critique** | PRNG software seul | 0% |

## 5. Sources et Références

- NIST SP 800-90A/B/C - Random Number Generation
- BSI AIS 31 - Functionality Classes for RNGs
- [Chainlink VRF Documentation](https://docs.chain.link/vrf)
""",

    4606: """## 1. Vue d'ensemble

Le critère **Key Derivation Security** évalue la robustesse du processus de dérivation des clés depuis la seed phrase, incluant l'algorithme de dérivation, les paramètres de durcissement, et la protection contre les attaques par force brute.

La dérivation suit les standards BIP32/BIP39/BIP44 pour les wallets HD (Hierarchical Deterministic).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Standard | Fonction | Paramètres |
|----------|----------|------------|
| **BIP39** | Mnemonic → Seed | PBKDF2-HMAC-SHA512, 2048 rounds |
| **BIP32** | Seed → Master Key | HMAC-SHA512("Bitcoin seed", seed) |
| **BIP44** | Derivation path | m/44'/coin'/account'/change/index |
| **SLIP-0039** | Shamir Backup | 256-bit shares, GF(256) |

**Paramètres de dérivation BIP39:**
| Paramètre | Valeur | Sécurité |
|-----------|--------|----------|
| Iterations PBKDF2 | 2048 | Minimum acceptable |
| Hash function | SHA-512 | 512-bit output |
| Salt | "mnemonic" + passphrase | UTF-8 NFKD |
| Output | 512 bits (64 bytes) | Master seed |

**Derivation paths par réseau:**
| Network | Path | Standard |
|---------|------|----------|
| Bitcoin | m/84'/0'/0' | BIP84 (Native SegWit) |
| Ethereum | m/44'/60'/0'/0 | BIP44 |
| Solana | m/44'/501'/0'/0' | BIP44 |

**Hardened vs Non-hardened:**
| Type | Notation | Sécurité |
|------|----------|----------|
| Hardened | ' ou h (ex: 44') | Privé requis pour dériver |
| Non-hardened | sans ' (ex: 0) | Public key dérivation possible |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** : BIP32/39/44 complet, dérivation dans SE
- **Trezor** : BIP32/39/44 + SLIP-0039 (Shamir)
- **Coldcard** : BIP32/39/44/49/84 + anti-phishing words
- **Keystone** : BIP32/39/44 + multi-chain paths

### Software Wallets
- **MetaMask** : BIP44 Ethereum path, dérivation en JS (ethers.js)
- **Phantom** : BIP44 Solana path
- **Rabby** : Multi-chain BIP44

### Considérations multi-chain
- Chaque blockchain a son coin_type (BIP44)
- Bitcoin: 0, Ethereum: 60, Solana: 501

### DeFi Smart Contract Wallets
- **Pas de dérivation** : Une seule adresse (EOA)
- Account abstraction change ce paradigme

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | BIP39/32/44 complet + hardened derivation + SE | 100% |
| **Élevé** | BIP39/32/44 dans secure environment | 80% |
| **Moyen** | BIP39/32 sans SE | 50% |
| **Basique** | Custom derivation non-standard | 25% |
| **Critique** | Pas de HD wallet | 0% |

## 5. Sources et Références

- [BIP32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)
- [BIP39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [BIP44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)
- [SLIP-0039](https://github.com/satoshilabs/slips/blob/master/slip-0039.md)
""",

    4607: """## 1. Vue d'ensemble

Le critère **Air-Gap Security** évalue l'isolation physique d'un système par rapport aux réseaux (Internet, Bluetooth, NFC, WiFi). Un air-gap complet élimine les vecteurs d'attaque réseau.

Les communications se font via QR codes, carte microSD, ou câble USB avec protocole limité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Niveau d'isolation | Connectivité | Sécurité |
|-------------------|--------------|----------|
| **Air-gap total** | QR code uniquement | Maximum |
| **Air-gap partiel** | QR + microSD | Très élevé |
| **USB limité** | USB data signing only | Élevé |
| **Bluetooth** | BLE chiffré | Moyen (attaques radio) |
| **WiFi/Internet** | Connecté | Minimum |

**Protocoles de communication air-gap:**
| Méthode | Débit | Sécurité |
|---------|-------|----------|
| QR code (animé) | ~500 bytes/s | Excellente |
| MicroSD | MB/s | Très bonne |
| USB HID | KB/s | Bonne (limité) |
| NFC | KB/s | Moyenne |

**Taille transaction typique:**
| Type | Taille | QR frames |
|------|--------|-----------|
| BTC simple | ~250 bytes | 1-2 |
| BTC batched | ~1-5 KB | 3-10 |
| ETH EIP-1559 | ~300 bytes | 1-2 |
| Multi-sig | ~1-3 KB | 2-6 |

## 3. Application aux Produits Crypto

### Hardware Wallets Air-Gapped
- **Keystone Pro** :
  - QR code uniquement
  - Caméra pour scan PSBT
  - Pas de port USB pour data
  - Batterie interne
- **Coldcard Mk4** :
  - MicroSD pour PSBT
  - USB optionnel (power only mode)
  - Virtual disk mode
- **AirGap Vault** :
  - Smartphone dédié air-gapped
  - QR code communication
- **Passport** :
  - QR code primary
  - MicroSD backup
  - Camera scan

### Hardware Wallets Connectés
- **Ledger** : USB + Bluetooth (Nano X) - Pas air-gapped
- **Trezor** : USB obligatoire - Pas air-gapped
- **BitBox02** : USB uniquement - Pas air-gapped

### Software Solutions
- **Sparrow Wallet** : Compatible PSBT pour air-gap
- **Electrum** : Support PSBT/QR
- **BlueWallet** : Watch-only + QR signing

### Coordinateurs Multi-sig
- **Specter Desktop** : Optimisé air-gap + PSBT
- **Caravan (Unchained)** : Support multi-device air-gap

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | QR only, pas de port data | 100% |
| **Très élevé** | QR + microSD, USB power only | 90% |
| **Élevé** | USB limité (signing only) | 70% |
| **Moyen** | Bluetooth chiffré | 50% |
| **Basique** | USB full data | 30% |
| **Minimum** | WiFi/Internet connecté | 0% |

## 5. Sources et Références

- [BIP174 - PSBT](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki)
- [Keystone Air-Gap Design](https://keyst.one/)
- [Coldcard MicroSD Usage](https://coldcard.com/docs/microsd)
""",

    4608: """## 1. Vue d'ensemble

Le critère **Secure Display Verification** évalue si l'appareil dispose d'un écran sécurisé permettant à l'utilisateur de vérifier les détails d'une transaction (adresse, montant) indépendamment de l'ordinateur potentiellement compromis.

Un "trusted display" est essentiel contre les malwares qui modifient les adresses de destination.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type d'écran | Technologie | Sécurité |
|--------------|-------------|----------|
| **E-ink** | Encre électronique | Excellente (visible sans power) |
| **OLED** | Organic LED | Très bonne |
| **LCD** | Liquid Crystal | Bonne |
| **LED segment** | 7-segments | Limitée |
| **Aucun** | - | Critique |

**Résolution minimale recommandée:**
| Usage | Résolution min | Caractères |
|-------|---------------|------------|
| Adresse BTC/ETH complète | 128x64 | 34-42 chars |
| Montant + fee | 96x32 | 20 chars |
| Multi-output | 256x128 | Multiple lines |

**Vérification adresse:**
| Format | Longueur | Affichage requis |
|--------|----------|------------------|
| Bitcoin Legacy | 34 chars | Full ou chunked |
| Bitcoin Bech32 | 42-62 chars | Full ou pagination |
| Ethereum | 42 chars | Full |
| Solana | 44 chars | Full |

## 3. Application aux Produits Crypto

### Hardware Wallets - Écran intégré
- **Ledger Nano X** : OLED 128x64, affichage scrolling
- **Ledger Stax** : E-ink 400x672, full address visible
- **Trezor Model T** : LCD tactile 240x240, couleur
- **Trezor Safe 3** : OLED 128x64
- **Coldcard Mk4** : OLED 128x64 monochrome
- **Keystone Pro** : LCD 480x800 tactile, QR display
- **BitBox02** : OLED 128x64 invisible (toucher pour voir)
- **GridPlus Lattice1** : LCD 320x480 tactile

### Hardware Wallets - Sans écran
- **Ledger Nano S (old)** : Écran minuscule, scrolling lent
- **Trezor One** : OLED 128x64 mais petit

### Software Wallets
- **Dépendent du device** : Écran non sécurisé
- **Risque** : Malware peut modifier affichage

### Multi-sig Coordinators
- Chaque co-signer doit vérifier sur SON écran
- **Sparrow + HW wallets** : Double vérification

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Écran tactile large + adresse complète + QR | 100% |
| **Élevé** | Écran dédié + full address scroll | 80% |
| **Moyen** | Écran petit + adresse tronquée vérifiable | 50% |
| **Basique** | Écran minimal (début/fin adresse) | 30% |
| **Critique** | Pas d'écran (trust host) | 0% |

## 5. Sources et Références

- [Ledger Stax Specs](https://www.ledger.com/stax)
- [Trezor Display Security](https://wiki.trezor.io/Display)
- SafeScoring Criteria A-ADD-008 v1.0
""",

    4609: """## 1. Vue d'ensemble

Le critère **Secure Element Certification** évalue le niveau de certification du Secure Element (SE) utilisé pour stocker et protéger les clés privées. Les certifications Common Criteria (CC) et FIPS 140-3 garantissent un niveau de sécurité audité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Secure Element | Fabricant | Certification | Usage |
|----------------|-----------|---------------|-------|
| **ST33J2M0** | STMicroelectronics | CC EAL5+ | Ledger |
| **ST33K1M5** | STMicroelectronics | CC EAL6+ | Ledger Stax |
| **ATECC608A/B** | Microchip | Non CC | Coldcard, BitBox |
| **SE050** | NXP | CC EAL6+ | Foundation Devices |
| **OPTIGA Trust M** | Infineon | CC EAL6+ | Premium HW |
| **SLE78** | Infineon | CC EAL6+ | Banking |
| **A7001** | Infineon | CC EAL6+ | Keystone 3 |

**Niveaux Common Criteria (EAL):**
| Niveau | Description | Effort audit |
|--------|-------------|--------------|
| EAL1 | Functionally tested | Minimal |
| EAL2 | Structurally tested | Low |
| EAL3 | Methodically tested | Medium |
| EAL4 | Methodically designed, tested | Significant |
| **EAL5** | Semi-formally designed and tested | High |
| **EAL6** | Semi-formally verified design | Very high |
| EAL7 | Formally verified design | Maximum |

**FIPS 140-3 Levels:**
| Level | Physical Security | Attack Resistance |
|-------|------------------|-------------------|
| 1 | Basic | Aucune |
| 2 | Tamper-evident | Coating/seals |
| 3 | Tamper-resistant | Zeroization |
| 4 | Tamper-active | Environmental |

## 3. Application aux Produits Crypto

### Hardware Wallets avec SE certifié
- **Ledger Nano X/S Plus** : ST33J2M0 (EAL5+)
- **Ledger Stax** : ST33K1M5 (EAL6+)
- **Keystone 3 Pro** : Infineon A7001 (EAL6+)
- **Passport (Foundation)** : NXP SE050 (EAL6+)

### Hardware Wallets sans SE certifié CC
- **Trezor Model T/One** : STM32 MCU (pas de SE)
- **Trezor Safe 3** : Optiga Trust M (EAL6+) - nouveau!
- **Coldcard Mk4** : ATECC608B (non certifié CC)
- **BitBox02** : ATECC608B (non certifié CC)

### Impact sécurité
- **Avec SE CC EAL5+** : Résistance prouvée aux attaques physiques
- **Sans SE** : Vulnérable au glitching, probing (démontré sur Trezor)
- **ATECC608** : Protection basique, non auditée formellement

### CEX/Infrastructure
- **HSMs** : FIPS 140-3 Level 3 minimum
- Thales Luna HSM : FIPS 140-3 Level 3

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | SE CC EAL6+ ou FIPS 140-3 L3+ | 100% |
| **Élevé** | SE CC EAL5+ | 85% |
| **Moyen** | SE non-CC (ATECC608) | 50% |
| **Basique** | MCU sans SE | 20% |
| **Critique** | Pas de protection hardware | 0% |

## 5. Sources et Références

- [Common Criteria Portal](https://www.commoncriteriaportal.org/)
- [NIST CMVP (FIPS 140-3)](https://csrc.nist.gov/projects/cryptographic-module-validation-program)
- [Ledger Security Model](https://www.ledger.com/academy/security/the-root-of-trust-our-security-model)
""",

    4610: """## 1. Vue d'ensemble

Le critère **PIN/Password Strength Requirements** évalue les exigences de complexité et de longueur pour les codes d'accès, ainsi que les mécanismes de protection contre le brute-force.

Un PIN faible (4 chiffres) avec tentatives illimitées est catastrophique.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type de PIN | Combinaisons | Temps brute-force |
|-------------|--------------|-------------------|
| 4 chiffres | 10,000 | < 1 seconde |
| 6 chiffres | 1,000,000 | < 1 minute |
| 8 chiffres | 100,000,000 | ~10 minutes |
| 8 alphanum | 2.8 × 10^14 | > 100 ans |

**Protection anti-brute-force:**
| Mécanisme | Description | Efficacité |
|-----------|-------------|-----------|
| **Rate limiting** | Délai exponentiel | Bonne |
| **Attempt counter** | Wipe après N fails | Excellente |
| **Hardware throttle** | SE impose délai | Très bonne |
| **Monotonic counter** | Non-resettable | Maximale |

**Paramètres recommandés (NIST SP 800-63B):**
| Paramètre | Minimum | Recommandé |
|-----------|---------|------------|
| Longueur PIN | 6 digits | 8+ digits |
| Longueur password | 8 chars | 12+ chars |
| Tentatives avant lock | 10 | 3-5 |
| Délai après fail | 30s exponential | Wipe après 10 |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** :
  - PIN 4-8 chiffres
  - 3 fails = délai croissant
  - Device wipe après N fails (configurable)
- **Trezor** :
  - PIN longueur variable
  - Délai exponentiel (2^n secondes)
  - Wipe après 16 tentatives
- **Coldcard** :
  - PIN 4-12 chiffres
  - "Trick PINs" pour duress
  - Bricking possible après fails
- **Keystone** :
  - PIN + fingerprint (optionnel)
  - Pattern lock
  - Wipe after 5 fails

### Software Wallets
- **MetaMask** : Password longueur libre, pas de wipe
- **Risque** : Brute-force possible si accès au vault file

### CEX
- **Best practices** :
  - Password + 2FA obligatoire
  - Rate limiting API
  - Account lockout temporaire
- **Kraken** : Master Key protection
- **Coinbase** : 8+ chars + 2FA

### Smart Contract Wallets
- **Gnosis Safe** : Owner keys, pas de PIN
- **Argent** : Guardian delay, pas de PIN local

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | 8+ digits/chars + wipe after 3-5 + hardware throttle | 100% |
| **Élevé** | 6+ digits + wipe after 10 + exponential delay | 75% |
| **Moyen** | 4+ digits + delay + wipe after 20 | 50% |
| **Basique** | 4 digits + basic delay | 25% |
| **Critique** | Pas de limit ou PIN faible | 0% |

## 5. Sources et Références

- NIST SP 800-63B - Digital Identity Guidelines (Authentication)
- [Ledger PIN Security](https://support.ledger.com/article/Security-best-practices)
- [Trezor PIN Protection](https://wiki.trezor.io/PIN)
""",

    4611: """## 1. Vue d'ensemble

Le critère **Biometric Authentication Security** évalue l'utilisation et la sécurité de l'authentification biométrique (empreinte digitale, reconnaissance faciale) comme facteur additionnel ou alternatif au PIN.

La biométrie ajoute de la commodité mais présente des risques uniques (non-révocable, coercition).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type biométrique | FAR (False Accept) | FRR (False Reject) | Sécurité |
|-----------------|--------------------|--------------------|----------|
| **Fingerprint capacitif** | 0.002% | 2% | Élevée |
| **Fingerprint optique** | 0.1% | 3% | Moyenne |
| **Face ID (3D)** | 0.0001% | 1% | Très élevée |
| **Face 2D** | 1-5% | 5% | Faible |
| **Iris** | 0.0001% | 0.5% | Très élevée |

**Stockage biométrique sécurisé:**
| Méthode | Sécurité |
|---------|----------|
| **TEE (TrustZone)** | Élevée |
| **Secure Element** | Très élevée |
| **Enclave (SGX)** | Élevée |
| **Software** | Faible |

**Standards biométriques:**
| Standard | Scope |
|----------|-------|
| ISO/IEC 24745 | Biometric template protection |
| FIDO2/WebAuthn | Passwordless authentication |
| ISO/IEC 19795 | Biometric testing methodology |

**Attaques biométriques:**
| Attaque | Description | Difficulté |
|---------|-------------|-----------|
| Fake fingerprint | Moulage silicone | Moyenne |
| Photo spoofing | Photo du visage | Facile (2D) |
| Replay attack | Rejouer template | Élevée |
| Coercion | Forcer utilisateur | Facile |

## 3. Application aux Produits Crypto

### Hardware Wallets avec biométrie
- **Keystone Pro** :
  - Fingerprint sensor
  - Anti-spoof detection
  - Duress finger (wipe wallet)
- **D'CENT** :
  - Fingerprint intégré
  - Stockage template dans SE
- **Ellipal** :
  - Fingerprint optionnel
  - Air-gapped

### Hardware Wallets sans biométrie
- **Ledger** : PIN uniquement
- **Trezor** : PIN uniquement
- **Coldcard** : PIN uniquement (design choice)
- **BitBox02** : Pas de biométrie

### Mobile Wallets
- **Trust Wallet** : Face ID / Touch ID iOS
- **MetaMask Mobile** : Biometric unlock option
- **Risque** : Template stocké côté OS, pas wallet

### CEX Apps
- **Coinbase** : Biometric login + 2FA
- **Binance** : Face verification (KYC + login)
- **Kraken** : Touch ID / Face ID support

### Considérations sécurité
- **Biométrie seule = insuffisant** : Doit être combiné avec PIN/password
- **Révocabilité** : Impossible de changer ses empreintes
- **Coercition** : Plus facile à forcer qu'un PIN mémorisé

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Biometric + PIN mandatory + SE storage + anti-spoof | 100% |
| **Élevé** | Biometric + PIN fallback + TEE storage | 75% |
| **Moyen** | Biometric optional + PIN required | 50% |
| **Basique** | Biometric only possible | 25% |
| **Non applicable** | Pas de biométrie | N/A |

## 5. Sources et Références

- ISO/IEC 24745:2022 - Biometric template protection
- FIDO Alliance - Biometric Authentication Standards
- [Keystone Fingerprint Security](https://keyst.one/)
""",

    4612: """## 1. Vue d'ensemble

Le critère **Multi-Signature Support** évalue la capacité d'un produit à supporter les transactions multi-signatures, où plusieurs clés sont nécessaires pour autoriser une transaction (ex: 2-of-3, 3-of-5).

Le multi-sig élimine le single point of failure et protège contre le vol d'une seule clé.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Schéma | Signataires | Seuil | Usage typique |
|--------|-------------|-------|---------------|
| **2-of-3** | 3 | 2 | Personnel |
| **3-of-5** | 5 | 3 | Business |
| **2-of-2** | 2 | 2 | Hot/Cold combo |
| **4-of-7** | 7 | 4 | Treasury DAO |

**Types de multi-sig par blockchain:**
| Blockchain | Méthode | Standard |
|------------|---------|----------|
| **Bitcoin** | P2SH/P2WSH | BIP11, BIP16 |
| **Ethereum** | Smart Contract | ERC-4337 |
| **Solana** | Program (Squads) | Native multi-sig |

**Taille transaction Bitcoin multi-sig:**
| Type | Inputs | Taille (vbytes) |
|------|--------|-----------------|
| 2-of-3 P2WSH | 1 | ~148 |
| 2-of-3 P2SH | 1 | ~297 |
| 3-of-5 P2WSH | 1 | ~197 |

**Formats PSBT (Partially Signed Bitcoin Transaction):**
| Version | Standard | Support |
|---------|----------|---------|
| PSBT v0 | BIP174 | Universel |
| PSBT v2 | BIP370 | Modern wallets |

## 3. Application aux Produits Crypto

### Hardware Wallets - Support multi-sig
- **Coldcard** :
  - Multi-sig natif optimisé
  - Co-signer mode
  - Export XPUB pour coordinateur
- **Ledger** :
  - Support via apps (Spectre, Electrum)
  - PSBT compatible
- **Trezor** :
  - Multi-sig via Electrum, Spectre
  - PSBT support
- **Keystone** :
  - Multi-sig QR-based
  - PSBT air-gapped
- **BitBox02** :
  - Multi-sig natif
  - Specter integration

### Coordinateurs Multi-sig
- **Sparrow Wallet** : Desktop, PSBT, multiple HW support
- **Specter Desktop** : Optimisé multi-sig, air-gap
- **Caravan (Unchained)** : Business-grade
- **Nunchuk** : Mobile multi-sig

### Ethereum Multi-sig
- **Gnosis Safe** :
  - Smart contract wallet
  - N-of-M configurable
  - Module system extensible
  - >$100B+ TVL secured
- **Argent** : Guardian system (social recovery)

### DeFi Protocol Treasuries
- **Multi-sig standard** pour DAO treasuries
- Timelock combiné recommandé

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Multi-sig natif + air-gap + PSBT v2 | 100% |
| **Élevé** | Multi-sig via coordinator + PSBT | 80% |
| **Moyen** | Multi-sig possible mais complexe | 50% |
| **Basique** | Support limité (2-of-2 only) | 30% |
| **Aucun** | Pas de support multi-sig | 0% |

## 5. Sources et Références

- [BIP174 - PSBT](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki)
- [Gnosis Safe](https://safe.global/)
- [Specter Desktop](https://specter.solutions/)
- [Unchained Capital Caravan](https://unchained.com/caravan/)
""",

    4613: """## 1. Vue d'ensemble

Le critère **Shamir Secret Sharing Support** évalue la capacité d'un produit à implémenter le partage de secret de Shamir (SSS), permettant de diviser une seed en N parts dont M sont nécessaires pour la reconstruction.

Shamir offre un backup distribué plus flexible que le multi-sig.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Standard | Implémentation | Compatibilité |
|----------|----------------|---------------|
| **SLIP-0039** | Trezor standard | Trezor, compatible wallets |
| **BIP-39 + SSS** | Custom | Variable |
| **Codex32** | Paper computing | Universal |

**Paramètres SLIP-0039:**
| Paramètre | Valeur |
|-----------|--------|
| Shares | 1-16 parts |
| Threshold | 1-16 (≤ shares) |
| Strength | 128 ou 256 bits |
| Checksum | RS1024 |
| Words per share | 20 ou 33 |

**Schémas recommandés:**
| Schéma | Parts | Seuil | Usage |
|--------|-------|-------|-------|
| 2-of-3 | 3 | 2 | Personnel |
| 3-of-5 | 5 | 3 | Famille |
| 4-of-7 | 7 | 4 | Business |
| 2-of-2 | 2 | 2 | Simple backup |

**Mathématique Shamir:**
- Polynôme de degré (threshold - 1) sur corps fini GF(256)
- Secret = f(0) = coefficient constant
- Chaque share = (x, f(x))
- Reconstruction via interpolation de Lagrange

## 3. Application aux Produits Crypto

### Hardware Wallets avec SLIP-0039
- **Trezor Model T** :
  - SLIP-0039 natif
  - Création et recovery sur device
  - Support "Super Shamir" (groups)
- **Trezor Safe 3** : SLIP-0039 support

### Hardware Wallets sans SLIP-0039 natif
- **Ledger** : Non supporté nativement
- **Coldcard** : Non supporté (BIP-39 only)
- **Keystone** : Non supporté
- **BitBox02** : Non supporté

### Software Solutions
- **Hermit (Unchained)** : SLIP-0039 compatible
- **SeedSigner** : SLIP-0039 support DIY
- **Seedkeeper** : Hardware SLIP-0039

### Alternatives à Shamir
- **Multi-sig** : M-of-N keys (vs M-of-N shares)
- **Seed XOR** : Coldcard feature (2 seeds XOR = real seed)
- **Codex32** : Paper-based Shamir (manual computation)

### Considérations sécurité
- **Avantage** : Backup distribué, perte partielle tolérée
- **Risque** : Reconstruction en un point = single point of failure
- **Best practice** : Combiner avec passphrase

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | SLIP-0039 natif + groups + on-device recovery | 100% |
| **Élevé** | SLIP-0039 compatible + secure recovery | 75% |
| **Moyen** | Shamir custom ou via software | 50% |
| **Basique** | Pas de Shamir, BIP-39 split manual | 20% |
| **Aucun** | Pas de support backup distribué | 0% |

## 5. Sources et Références

- [SLIP-0039](https://github.com/satoshilabs/slips/blob/master/slip-0039.md)
- [Codex32](https://secretcodex32.com/)
- [Trezor Shamir Backup](https://wiki.trezor.io/Shamir_backup)
""",

    4614: """## 1. Vue d'ensemble

Le critère **Passphrase/25th Word Support** évalue le support de la passphrase BIP-39 (parfois appelée "25ème mot"), qui ajoute une couche de protection supplémentaire à la seed phrase et permet la création de wallets cachés.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification BIP-39 |
|-----------|---------------------|
| Longueur max | Illimitée (UTF-8) |
| Caractères | Unicode (NFKD normalisé) |
| Dérivation | PBKDF2(mnemonic + "mnemonic" + passphrase) |
| Iterations | 2048 |
| Output | 512-bit seed |

**Wallets dérivés par passphrase:**
| Passphrase | Résultat |
|------------|----------|
| "" (vide) | Wallet standard |
| "secret123" | Wallet caché #1 |
| "another phrase" | Wallet caché #2 |
| (N passphrases) | N wallets distincts |

**Force d'une passphrase:**
| Type | Entropie estimée |
|------|------------------|
| 8 chars random | ~52 bits |
| 12 chars mixed | ~78 bits |
| 6 mots diceware | ~77 bits |
| 8 mots diceware | ~103 bits |

**Attaque brute-force:**
| Cible | Tentatives/s (GPU) | Temps pour 80 bits |
|-------|-------------------|-------------------|
| BIP-39 | ~50,000 | > 1 milliard d'années |

## 3. Application aux Produits Crypto

### Hardware Wallets - Support complet
- **Ledger** :
  - Passphrase temporaire (session)
  - Passphrase attachée à PIN secondaire
  - Stockée dans SE
- **Trezor** :
  - Passphrase on-host (risqué)
  - Passphrase on-device (Model T)
  - Passphrase cachée (settings)
- **Coldcard** :
  - Passphrase via clavier device
  - Passphrase sauvegardée
  - Anti-phishing words
- **Keystone** :
  - Passphrase support
  - Entry on device
- **BitBox02** :
  - "Optional passphrase"
  - Entry via app + device confirm

### Software Wallets
- **MetaMask** : Support import seed + passphrase
- **Electrum** : Passphrase native
- **Trust Wallet** : Support passphrase
- **Phantom** : Support passphrase

### Risques et considérations
- **Passphrase perdue = fonds perdus** : Pas de recovery
- **Phishing** : Malware peut capturer passphrase sur host
- **Best practice** : Entry sur device uniquement

### Compatibilité cross-wallet
- BIP-39 passphrase = universel
- Même seed + même passphrase = même wallet partout

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Passphrase on-device + PIN dédié + sauvegarde | 100% |
| **Élevé** | Passphrase on-device | 80% |
| **Moyen** | Passphrase on-host avec confirmation device | 50% |
| **Basique** | Passphrase support sans sécurité additionelle | 30% |
| **Aucun** | Pas de support passphrase | 0% |

## 5. Sources et Références

- [BIP-39 Passphrase](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki#from-mnemonic-to-seed)
- [Ledger Passphrase](https://support.ledger.com/article/Advanced-passphrase-security)
- [Trezor Passphrase](https://wiki.trezor.io/Passphrase)
""",

    4615: """## 1. Vue d'ensemble

Le critère **Social Recovery Mechanism** évalue les systèmes permettant de récupérer l'accès à un wallet via l'aide de contacts de confiance (guardians), sans révéler la seed phrase originale.

Alternative moderne au backup seed traditionnel, populaire dans les smart contract wallets.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Mécanisme | Implémentation | Sécurité |
|-----------|----------------|----------|
| **Guardian approval** | M-of-N guardians sign | Élevée |
| **Time-delayed recovery** | Délai obligatoire (24-72h) | Protection anti-vol |
| **Challenge-response** | Guardians répondent à défi | Moyenne |
| **Dead man's switch** | Activation si inactivité | Variable |

**Paramètres typiques:**
| Paramètre | Valeur recommandée |
|-----------|-------------------|
| Nombre de guardians | 3-5 |
| Seuil d'approbation | 2-of-3 ou 3-of-5 |
| Délai de récupération | 24-72 heures |
| Période de contestation | 24 heures |

**Types de guardians:**
| Type | Exemple | Risque |
|------|---------|--------|
| Personnes de confiance | Famille, amis | Collusion |
| Institutions | Argent, services | Centralisation |
| Hardware | Autre wallet | Perte |
| Smart contract | Timelock contract | Bug |

## 3. Application aux Produits Crypto

### Smart Contract Wallets
- **Argent** :
  - Guardian system natif
  - Recovery via 50%+ guardians
  - 24h time-lock
  - Guardians: contacts, hardware, Argent
- **Loopring Wallet** :
  - Social recovery Layer 2
  - Guardians on L2
- **Soul Wallet** :
  - ERC-4337 based
  - Modular guardians

### Account Abstraction (ERC-4337)
- **Social recovery module** : Standard émergent
- **Bundler** approuve recovery après delay
- **Paymaster** peut sponsoriser gas

### Hardware Wallets
- **Non natif** : Hardware wallets = seed-based
- **Workaround** : Multi-sig comme "social recovery"
- **Casa** : Service multi-sig managed avec recovery

### CEX "Recovery"
- **2FA reset** via support = pas vrai social recovery
- **Centralisé** : Trust exchange

### DeFi
- **DAO treasuries** : Multi-sig = forme de social recovery
- **Gnosis Safe** : Add/remove owners par vote

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Social recovery natif + time-lock + contestation | 100% |
| **Élevé** | Guardian system + time-lock | 75% |
| **Moyen** | Multi-sig comme workaround | 50% |
| **Basique** | Recovery via service centralisé | 25% |
| **Aucun** | Seed only, pas de recovery social | 0% |

## 5. Sources et Références

- [ERC-4337 - Account Abstraction](https://eips.ethereum.org/EIPS/eip-4337)
- [Argent Social Recovery](https://www.argent.xyz/security/)
- [Vitalik on Social Recovery](https://vitalik.ca/general/2021/01/11/recovery.html)
""",

    4616: """## 1. Vue d'ensemble

Le critère **Inheritance Planning Features** évalue les mécanismes permettant de transmettre des crypto-actifs aux héritiers en cas de décès ou d'incapacité, tout en maintenant la sécurité pendant la vie du détenteur.

Le "problème du bus" : que se passe-t-il si vous êtes renversé par un bus demain ?

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Mécanisme | Description | Sécurité |
|-----------|-------------|----------|
| **Dead man's switch** | Activation si pas de check-in | Moyenne |
| **Time-locked shares** | Shares activés après délai | Élevée |
| **Multi-sig héritage** | Co-signers héritiers | Élevée |
| **Smart contract** | Trigger on-chain conditions | Automatisé |
| **Service tiers** | Casa, Unchained | Dépendant |

**Paramètres de dead man's switch:**
| Paramètre | Valeur typique |
|-----------|---------------|
| Check-in period | 30-180 jours |
| Warning period | 7-14 jours |
| Révocation | Possible avant expiration |
| Notification | Email/SMS aux bénéficiaires |

**Solutions on-chain:**
| Solution | Mécanisme | Blockchain |
|----------|-----------|------------|
| Sablier | Time-locked streams | EVM |
| Gnosis Safe + timelock | Module inheritance | EVM |
| Bitcoin script | CLTV/CSV timelocks | Bitcoin |

## 3. Application aux Produits Crypto

### Services dédiés
- **Casa** :
  - Multi-sig 3-of-5
  - Key recovery protocol
  - Inheritance protocol documenté
  - $$$$/an
- **Unchained Capital** :
  - Multi-sig collaborative custody
  - Inheritance planning
- **SafeHaven** :
  - Dead man's switch crypto-natif
  - ThorChain integration

### Hardware Wallet Solutions
- **Ledger Recover** : Controversé (seed to custodians)
- **Trezor** : SLIP-0039 shares to family
- **Coldcard** : Seed XOR ou shares manuels

### Smart Contract Solutions
- **Gnosis Safe** :
  - Module: Add recovery after N days
  - Owners can be heirs
- **Custom contracts** :
  - CLTV (CheckLockTimeVerify) Bitcoin
  - Block.timestamp Ethereum

### DIY Solutions
- **Shamir shares** : Distribuer aux héritiers
- **Instructions légales** : Notaire + instructions
- **Risque** : Erreur humaine, outdated info

### CEX
- **Process décès** : Documents légaux requis
- **Coinbase** : Estate planning documentation
- **Binance** : Inheritance claim process

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Inheritance natif + dead man's switch + legal docs | 100% |
| **Élevé** | Multi-sig héritiers + instructions claires | 75% |
| **Moyen** | Shamir shares distribués + testament | 50% |
| **Basique** | Instructions seed dans coffre | 30% |
| **Aucun** | Pas de planification | 0% |

## 5. Sources et Références

- [Casa Inheritance Protocol](https://casa.io/inheritance)
- [Pamela Morgan - Cryptoasset Inheritance Planning](https://www.yourbitcoinisnotforyou.com/)
- [Bitcoin CLTV BIP-65](https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki)
""",

    4617: """## 1. Vue d'ensemble

Le critère **Transaction Simulation** évalue la capacité d'un produit à simuler une transaction avant sa signature, permettant de détecter les comportements malveillants (drainers, approvals illimités, phishing).

La simulation révèle ce qu'une transaction fera réellement, pas ce qu'elle prétend faire.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Méthode de simulation | Précision | Latence |
|----------------------|-----------|---------|
| **eth_call simulation** | Basique | < 100ms |
| **Trace simulation** | Élevée | 100-500ms |
| **Fork simulation** | Complète | 1-5s |
| **Tenderly/Blowfish** | Très élevée | 500ms-2s |

**Éléments détectés par simulation:**
| Élément | Risque détecté |
|---------|----------------|
| Token transfers | Drainer stealing tokens |
| NFT transfers | NFT scam |
| Approvals | Unlimited approval attack |
| ETH transfers | Hidden ETH drain |
| Contract calls | Malicious contract |
| State changes | Unexpected modifications |

**APIs de simulation:**
| Service | Coverage | Prix |
|---------|----------|------|
| Blowfish | EVM chains | Freemium |
| Tenderly | EVM chains | $$ |
| Pocket Universe | EVM | Free extension |
| Fire | EVM | Free |

## 3. Application aux Produits Crypto

### Browser Extensions avec simulation
- **Rabby Wallet** :
  - Pre-sign simulation native
  - Risk warnings color-coded
  - Contract verification
- **Pocket Universe** :
  - Extension overlay sur MetaMask
  - Simulation gratuite
  - Block malicious tx
- **Fire** :
  - Transaction preview
  - Approval detection

### Mobile Wallets
- **Zerion** : Transaction simulation
- **Rainbow** : Simulation intégrée
- **Trust Wallet** : En développement

### MetaMask
- **Blockaid integration** : Simulation native (récent)
- Avant: nécessitait extension tierce

### Hardware Wallets
- **Limitation** : Pas de simulation native (pas de connectivité)
- **Dépend** du software companion pour simulation
- **Ledger Live** : Transaction insights (limité)

### DeFi Protocols
- **Tenderly** : Protocol teams use for testing
- **Users** : Peuvent simuler via UI tiers

### Limitations
- **Simulation ≠ garantie** : État peut changer entre simulation et execution
- **MEV** : Sandwich attacks post-simulation
- **Flash loans** : Complexes à simuler

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Simulation native + risk scoring + block malicious | 100% |
| **Élevé** | Simulation intégrée avec warnings | 75% |
| **Moyen** | Via extension tierce supportée | 50% |
| **Basique** | eth_call basic preview | 25% |
| **Aucun** | Pas de simulation | 0% |

## 5. Sources et Références

- [Blowfish API](https://blowfish.xyz/)
- [Tenderly Simulation](https://tenderly.co/)
- [Rabby Security Features](https://rabby.io/)
""",

    4618: """## 1. Vue d'ensemble

Le critère **Approval Management** évalue la capacité d'un produit à gérer les autorisations (approvals) accordées aux smart contracts, notamment la révocation des approvals illimitées qui représentent un risque majeur.

Un approval illimité permet à un contrat de dépenser TOUS vos tokens à tout moment.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type d'approval | Risque | Exemple |
|-----------------|--------|---------|
| **Unlimited (type(uint256).max)** | Critique | Ancien standard DeFi |
| **Exact amount** | Faible | Best practice |
| **Permit (EIP-2612)** | Moyen | Signature off-chain |
| **Permit2 (Uniswap)** | Configurable | Nouveau standard |

**Standards ERC-20 approval:**
| Fonction | Description |
|----------|-------------|
| `approve(spender, amount)` | Autorise spender |
| `allowance(owner, spender)` | Vérifie autorisation |
| `transferFrom(from, to, amount)` | Utilise approval |

**Permit (EIP-2612):**
| Avantage | Inconvénient |
|----------|--------------|
| Gasless approval | Signature phishing risk |
| One-tx instead of two | Deadline peut être loin |

**Risques approvals illimités:**
| Scénario | Impact |
|----------|--------|
| Protocol hack | Tous tokens drainés |
| Rug pull | Dev drain users |
| Phishing | Signature = perte totale |

## 3. Application aux Produits Crypto

### Outils de révocation
- **Revoke.cash** :
  - Multi-chain support
  - Free to use
  - Batch revocation
- **Etherscan Token Approval** :
  - Native Ethereum
  - Clear interface
- **Unrekt** :
  - Multi-chain
  - Risk scoring

### Wallets avec gestion approvals
- **Rabby** :
  - Approval dashboard intégré
  - Warnings sur unlimited
  - Quick revoke
- **Zerion** :
  - Approval management
  - Portfolio-wide view
- **Rainbow** : En développement

### Hardware Wallets
- **Ledger Live** : Pas de gestion approvals native
- **Trezor Suite** : Pas de gestion approvals native
- Nécessite connexion à Rabby/MetaMask

### Best Practices
- **Révoquer après chaque interaction**
- **Utiliser exact amounts** quand possible
- **Vérifier périodiquement** (revoke.cash)
- **Permit2** : préférer over legacy approvals

### DeFi Protocols - Amélioration
- **Uniswap Permit2** :
  - Expiring approvals
  - Signature-based
  - Batch operations

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Gestion approvals native + warnings + auto-revoke option | 100% |
| **Élevé** | Dashboard approvals + revoke intégré | 75% |
| **Moyen** | Via outils externes supportés | 50% |
| **Basique** | Aucune visibilité, manual revoke via etherscan | 25% |
| **Critique** | Approvals illimités par défaut, pas d'outil | 0% |

## 5. Sources et Références

- [Revoke.cash](https://revoke.cash/)
- [EIP-2612 Permit](https://eips.ethereum.org/EIPS/eip-2612)
- [Uniswap Permit2](https://github.com/Uniswap/permit2)
""",

    4619: """## 1. Vue d'ensemble

Le critère **Address Book Security** évalue les fonctionnalités de carnet d'adresses sécurisé : vérification, whitelist, et protection contre les erreurs d'adresse ou le phishing par adresse similaire.

Une erreur d'un caractère = fonds perdus définitivement.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Protection | Description | Efficacité |
|------------|-------------|------------|
| **Whitelist** | Seules adresses approuvées | Très élevée |
| **First-transfer warning** | Alerte nouvelle adresse | Élevée |
| **ENS/domains** | Human-readable names | Moyenne |
| **Checksum validation** | EIP-55 mixed-case | Basique |
| **Time-lock whitelist** | Délai ajout nouvelle adresse | Très élevée |

**Attaques par adresse:**
| Attaque | Description | Prévention |
|---------|-------------|------------|
| Clipboard hijack | Malware modifie adresse copiée | Vérification visuelle |
| Address poisoning | Tx spam avec adresse similaire | Ne pas copier depuis historique |
| ENS phishing | Domaines similaires | Vérifier l'adresse underlying |
| Zero-value transfer | Pollution historique | Ignorer small tx |

**Format adresses par réseau:**
| Network | Format | Longueur |
|---------|--------|----------|
| Bitcoin (Bech32) | bc1q... | 42-62 chars |
| Ethereum | 0x... | 42 chars |
| Solana | Base58 | 44 chars |
| Cosmos | cosmos1... | 45 chars |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** :
  - Contacts dans Ledger Live
  - Vérification adresse sur device
  - Pas de whitelist-only mode
- **Trezor** :
  - Address labeling dans Suite
  - Verification on device
- **Coldcard** :
  - Address explorer
  - XPUB export pour vérification

### Software Wallets
- **MetaMask** :
  - Contact list
  - Pas de whitelist enforcement
  - First-send warning (récent)
- **Rabby** :
  - Address book
  - Scam detection (blacklists)
  - Recent address warnings
- **Phantom** :
  - Favoris
  - Domain support (.sol)

### CEX
- **Coinbase** :
  - Address whitelist
  - 48h delay new address
  - 2FA pour withdrawal
- **Kraken** :
  - Withdrawal whitelist
  - Time-lock activation
- **Binance** :
  - Address management
  - Whitelist avec délai

### ENS / Naming Services
- **ENS (Ethereum)** : vitalik.eth → 0x...
- **SNS (Solana)** : name.sol
- **Unstoppable Domains** : Multi-chain

### Best Practices
- **Test transaction** : Petit montant d'abord
- **Triple vérification** : Début + milieu + fin
- **Whitelist only** : Quand disponible

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Whitelist-only + time-lock + verification device | 100% |
| **Élevé** | Address book + whitelist + warnings | 75% |
| **Moyen** | Address book + scam detection | 50% |
| **Basique** | Simple address book | 25% |
| **Aucun** | Pas de gestion adresses | 0% |

## 5. Sources et Références

- [EIP-55 - Mixed-case checksum](https://eips.ethereum.org/EIPS/eip-55)
- [ENS Documentation](https://docs.ens.domains/)
- [Address Poisoning Analysis](https://metamask.zendesk.com/hc/en-us/articles/11967455819291)
"""
}

def main():
    print("Saving Adversity summaries A-ADD-001 to A-ADD-020...")
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
