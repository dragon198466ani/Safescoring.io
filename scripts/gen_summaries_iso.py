#!/usr/bin/env python3
"""Generate summaries for ISO/IEC and official standards."""

import requests
import sys
import time
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    4700: """## 1. Vue d'ensemble

**ISO/IEC 27001:2022** est la norme internationale de référence pour les systèmes de management de la sécurité de l'information (SMSI). Elle définit les exigences pour établir, implémenter, maintenir et améliorer continuellement un SMSI.

Pour les entreprises crypto, la certification ISO 27001 démontre un engagement formel envers la sécurité de l'information.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Section | Contenu |
|---------|---------|
| Clauses 4-10 | Exigences SMSI |
| Annexe A | 93 contrôles (2022 version) |
| Catégories | Organisationnel, Personnel, Physique, Technologique |

**Contrôles Annexe A (ISO 27001:2022):**
| Catégorie | Nombre | Exemples |
|-----------|--------|----------|
| Organisational | 37 | Policies, roles, threat intelligence |
| People | 8 | Screening, awareness, termination |
| Physical | 14 | Perimeters, equipment, cabling |
| Technological | 34 | Access control, crypto, logging |

**Cycle PDCA:**
| Phase | Activité |
|-------|----------|
| Plan | Établir le SMSI |
| Do | Implémenter et opérer |
| Check | Surveiller et réviser |
| Act | Maintenir et améliorer |

**Certification:**
| Aspect | Détail |
|--------|--------|
| Organisme | Accrédité (ex: BSI, Bureau Veritas) |
| Durée | 3 ans (audits de surveillance annuels) |
| Coût | $10k-100k+ selon taille |

## 3. Application aux Produits Crypto

### CEX
- **Coinbase** : ISO 27001 certifié
- **Kraken** : ISO 27001 certifié
- **Binance** : ISO 27001 certifié
- **Gemini** : SOC 2 + ISO 27001

### Custody Providers
- **BitGo** : ISO 27001 + SOC 2 Type II
- **Fireblocks** : ISO 27001 certifié
- **Anchorage** : Multiple certifications

### Hardware Wallets
- **Ledger** : ISO 27001 pour opérations corporate
- **Fabrication** : Processus certifiés

### DeFi Protocols
- **Généralement non certifié** (décentralisé)
- **Entreprises derrière** peuvent être certifiées
- **Exemple** : Chainlink Labs ISO 27001

### Contrôles pertinents crypto (Annexe A)
| Contrôle | Application crypto |
|----------|-------------------|
| A.8.24 | Use of cryptography |
| A.5.15 | Access control |
| A.8.16 | Monitoring activities |
| A.5.23 | Information security for cloud services |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | ISO 27001 certifié + SOC 2 Type II | 100% |
| **Élevé** | ISO 27001 certifié | 80% |
| **Moyen** | ISO 27001 en cours / SOC 2 seul | 50% |
| **Basique** | Contrôles internes non certifiés | 25% |
| **Insuffisant** | Pas de framework formel | 0% |

## 5. Sources et Références

- [ISO/IEC 27001:2022](https://www.iso.org/standard/27001)
- [ISO 27001 Annex A Controls](https://www.iso.org/standard/75652.html)
- [ISMS Implementation Guide](https://www.iso.org/isoiec-27001-information-security.html)
""",

    4701: """## 1. Vue d'ensemble

**ISO/IEC 27002:2022** fournit les lignes directrices pour la sélection et l'implémentation des contrôles de sécurité listés dans l'Annexe A de ISO 27001. C'est le guide pratique pour les contrôles de sécurité.

Cette norme détaille COMMENT implémenter chaque contrôle, là où 27001 dit QUOI faire.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Structure | 2022 Version |
|-----------|--------------|
| Contrôles | 93 (vs 114 en 2013) |
| Catégories | 4 (vs 14 en 2013) |
| Attributs | 5 types de tags |

**Les 4 catégories de contrôles:**
| Catégorie | Nombre | Focus |
|-----------|--------|-------|
| Organizational controls | 37 | Policies, governance |
| People controls | 8 | HR security |
| Physical controls | 14 | Physical security |
| Technological controls | 34 | IT security |

**Attributs des contrôles (nouveauté 2022):**
| Attribut | Valeurs |
|----------|---------|
| Control type | Preventive, Detective, Corrective |
| InfoSec properties | CIA (Confidentiality, Integrity, Availability) |
| Cybersecurity concepts | Identify, Protect, Detect, Respond, Recover |
| Operational capabilities | 15 capacités (Governance, Asset management, etc.) |
| Security domains | 4 domaines |

**Nouveaux contrôles en 2022:**
| # | Contrôle |
|---|----------|
| 5.7 | Threat intelligence |
| 5.23 | Cloud services security |
| 5.30 | ICT readiness for business continuity |
| 7.4 | Physical security monitoring |
| 8.9 | Configuration management |
| 8.10 | Information deletion |
| 8.11 | Data masking |
| 8.12 | Data leakage prevention |
| 8.16 | Monitoring activities |
| 8.23 | Web filtering |
| 8.28 | Secure coding |

## 3. Application aux Produits Crypto

### Contrôles technologiques pertinents

**A.8.24 - Use of cryptography:**
- Key management policies
- Algorithmes approuvés (AES-256, ECDSA)
- HSM pour clés sensibles

**A.8.5 - Secure authentication:**
- Multi-factor authentication
- Hardware tokens
- Biometrics policies

**A.8.15 - Logging:**
- Transaction logs
- Security events
- Retention requirements

**A.8.16 - Monitoring:**
- Real-time alerting
- Anomaly detection
- Incident correlation

### CEX Implementation
- Tous les contrôles applicables
- Focus sur 8.24 (crypto), 8.5 (auth), 8.15-16 (monitoring)

### Hardware Wallets
- 8.24 : Cryptographic controls in SE
- 8.1 : User endpoint devices
- 8.5 : Authentication (PIN)

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | 90%+ contrôles implémentés et documentés | 100% |
| **Élevé** | 70-90% contrôles avec documentation | 75% |
| **Moyen** | 50-70% contrôles partiellement documentés | 50% |
| **Basique** | Certains contrôles, documentation limitée | 25% |
| **Insuffisant** | Pas de référence à 27002 | 0% |

## 5. Sources et Références

- [ISO/IEC 27002:2022](https://www.iso.org/standard/75652.html)
- [ISO 27002 Controls Mapping](https://www.iso27001security.com/html/27002.html)
""",

    4702: """## 1. Vue d'ensemble

**ISO/IEC 15408 (Common Criteria)** est le standard international pour l'évaluation de la sécurité des produits IT. Il définit les niveaux d'assurance (EAL1-7) et est obligatoire pour les Secure Elements utilisés dans les hardware wallets.

Les certifications CC sont reconnues mutuellement par 31 pays via le CCRA (Common Criteria Recognition Arrangement).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

**Structure ISO 15408:**
| Partie | Contenu |
|--------|---------|
| Part 1 | Introduction et modèle général |
| Part 2 | Security Functional Requirements (SFR) |
| Part 3 | Security Assurance Requirements (SAR) |

**Niveaux d'assurance (EAL):**
| Niveau | Description | Effort |
|--------|-------------|--------|
| EAL1 | Functionally tested | Minimal |
| EAL2 | Structurally tested | Low |
| EAL3 | Methodically tested and checked | Medium |
| EAL4 | Methodically designed, tested, reviewed | Significant |
| **EAL5** | Semi-formally designed and tested | High |
| **EAL6** | Semi-formally verified design and tested | Very high |
| EAL7 | Formally verified design and tested | Extreme |

**EAL5+ et au-delà:**
| Niveau | Signification + |
|--------|-----------------|
| EAL5+ | EAL5 avec contrôles additionnels |
| EAL6+ | Résistance side-channel, fault injection |

**Protection Profiles (PP) pour crypto:**
| PP | Application |
|----|-------------|
| BSI-CC-PP-0084 | Security IC Platform |
| BSI-CC-PP-0099 | Cryptographic Service Provider |
| ANSSI-CC-PP-2014 | Java Card System |

## 3. Application aux Produits Crypto

### Secure Elements certifiés CC
| SE | Certification | Utilisé par |
|----|---------------|-------------|
| ST33J2M0 | CC EAL5+ | Ledger Nano X/S+ |
| ST33K1M5 | CC EAL6+ | Ledger Stax |
| Infineon SLE78 | CC EAL6+ | Banking cards |
| NXP SE050 | CC EAL6+ | Passport (Foundation) |
| OPTIGA Trust M | CC EAL6+ | Various |
| Infineon A7001 | CC EAL6+ | Keystone 3 |

### Hardware Wallets sans CC
| Wallet | Chip | Note |
|--------|------|------|
| Trezor Model T | STM32 MCU | Pas de SE |
| Coldcard Mk4 | ATECC608B | Non certifié CC |
| BitBox02 | ATECC608B | Non certifié CC |

### Implications sécurité
- **CC EAL5+** : Résistance prouvée attaques physiques
- **Non CC** : Vulnérable au glitching (démontré sur Trezor)

### HSMs
| HSM | Certification |
|-----|---------------|
| Thales Luna 7 | CC EAL4+ / FIPS 140-3 L3 |
| nCipher nShield | CC EAL4+ |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | CC EAL6+ pour composants critiques | 100% |
| **Élevé** | CC EAL5+ | 85% |
| **Moyen** | CC EAL4 ou équivalent | 60% |
| **Basique** | Composants non certifiés avec mitigations | 30% |
| **Insuffisant** | Pas de certification sécurité | 0% |

## 5. Sources et Références

- [Common Criteria Portal](https://www.commoncriteriaportal.org/)
- [ISO/IEC 15408-1:2022](https://www.iso.org/standard/72891.html)
- [CCRA Members](https://www.commoncriteriaportal.org/ccra/members/)
- [Certified Products List](https://www.commoncriteriaportal.org/products/)
""",

    4703: """## 1. Vue d'ensemble

**FIPS 140-3** (Federal Information Processing Standard) est le standard américain pour les modules cryptographiques, remplaçant FIPS 140-2. Il définit 4 niveaux de sécurité et est obligatoire pour les systèmes gouvernementaux US.

Pour les crypto-actifs institutionnels, FIPS 140-3 Level 3 est le standard de facto pour les HSMs.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

**Niveaux de sécurité FIPS 140-3:**
| Level | Physical Security | Attack Resistance |
|-------|------------------|-------------------|
| **Level 1** | Production-grade | Aucune spécifique |
| **Level 2** | Tamper-evident seals | Coatings/seals |
| **Level 3** | Tamper-resistant | Zeroization on tamper |
| **Level 4** | Tamper-active | Environmental protection |

**Différences FIPS 140-3 vs 140-2:**
| Aspect | FIPS 140-2 | FIPS 140-3 |
|--------|------------|------------|
| Base | Standalone | ISO/IEC 19790:2012 |
| Testing | Proprietary | ISO/IEC 24759:2017 |
| Algorithm status | Static | Dynamic (CAVP) |
| Effective | 2001 | 2019 |

**Domaines de sécurité (11 sections):**
| # | Domaine |
|---|---------|
| 1 | Cryptographic Module Specification |
| 2 | Cryptographic Module Interfaces |
| 3 | Roles, Services, and Authentication |
| 4 | Software/Firmware Security |
| 5 | Operational Environment |
| 6 | Physical Security |
| 7 | Non-Invasive Security |
| 8 | Sensitive Security Parameter Management |
| 9 | Self-Tests |
| 10 | Life-Cycle Assurance |
| 11 | Mitigation of Other Attacks |

**Algorithmes approuvés (CAVP):**
| Type | Algorithmes |
|------|-------------|
| Symmetric | AES, 3DES (legacy) |
| Hash | SHA-2, SHA-3 |
| Signature | RSA, ECDSA, EdDSA |
| Key Agreement | DH, ECDH |
| RNG | DRBG (SP 800-90A) |

## 3. Application aux Produits Crypto

### HSMs certifiés FIPS 140-3
| HSM | Level | Status |
|-----|-------|--------|
| Thales Luna 7 | Level 3 | Active |
| nCipher nShield | Level 3 | Active |
| AWS CloudHSM | Level 3 | Active |
| Azure Managed HSM | Level 3 | Active |
| Utimaco | Level 4 | Active |

### Cloud HSM Services
| Provider | FIPS Level | Use case |
|----------|-----------|----------|
| AWS CloudHSM | 140-3 L3 | Cloud-native |
| GCP Cloud HSM | 140-3 L3 | Google Cloud |
| Azure Dedicated HSM | 140-2 L3 | Azure (migration) |

### Custody Providers
- **Coinbase Custody** : HSMs FIPS 140-3 L3
- **BitGo** : FIPS compliant infrastructure
- **Anchorage** : Federally regulated, FIPS compliant

### Hardware Wallets
- **Non certifiés FIPS** (coût prohibitif pour consumer)
- **Secure Elements** : CC preferred over FIPS
- **Exception** : YubiHSM 2 (FIPS 140-2 L3, $650)

### CEX Infrastructure
- **Hot wallets** : FIPS HSMs pour signing
- **Cold storage** : Air-gapped + HSM backup

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | FIPS 140-3 Level 3+ pour key management | 100% |
| **Élevé** | FIPS 140-3 Level 2 ou 140-2 Level 3 | 80% |
| **Moyen** | FIPS 140-2 Level 2 | 50% |
| **Basique** | FIPS algorithmes without certification | 25% |
| **Non-conforme** | Pas de conformité FIPS | 0% |

## 5. Sources et Références

- [NIST FIPS 140-3](https://csrc.nist.gov/publications/detail/fips/140/3/final)
- [CMVP Validated Modules](https://csrc.nist.gov/projects/cryptographic-module-validation-program/validated-modules)
- [CAVP Algorithm Testing](https://csrc.nist.gov/projects/cryptographic-algorithm-validation-program)
""",

    4704: """## 1. Vue d'ensemble

**SOC 2 Type II** est un rapport d'audit attestant que les contrôles d'une organisation sont efficaces sur une période prolongée (généralement 6-12 mois). Il couvre les Trust Services Criteria : Security, Availability, Processing Integrity, Confidentiality, Privacy.

Pour les services crypto, SOC 2 Type II est devenu le standard minimum de confiance institutionnelle.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

**Types de rapports SOC:**
| Type | Description | Période |
|------|-------------|---------|
| SOC 1 | Financial reporting controls | Point-in-time ou période |
| **SOC 2 Type I** | Controls design at a point | Snapshot |
| **SOC 2 Type II** | Controls effectiveness over time | 6-12 mois |
| SOC 3 | SOC 2 summary for public | Marketing |

**Trust Services Criteria (TSC):**
| Critère | Focus |
|---------|-------|
| **Security** | Protection contre accès non autorisé |
| **Availability** | Système disponible pour opération |
| **Processing Integrity** | Traitement complet et précis |
| **Confidentiality** | Protection des données confidentielles |
| **Privacy** | Données personnelles (GDPR-like) |

**Points of Focus (exemples Security):**
| Category | Contrôles |
|----------|-----------|
| CC1 | COSO-based environment |
| CC2 | Communication |
| CC3 | Risk assessment |
| CC4 | Monitoring |
| CC5 | Control activities |
| CC6 | Logical access |
| CC7 | System operations |
| CC8 | Change management |
| CC9 | Risk mitigation |

**Coût et durée audit:**
| Taille org | Coût estimé | Durée |
|------------|-------------|-------|
| Startup | $30-50k | 3-6 mois |
| Mid-size | $50-100k | 4-6 mois |
| Enterprise | $100k+ | 6+ mois |

## 3. Application aux Produits Crypto

### CEX avec SOC 2 Type II
- **Coinbase** : SOC 2 Type II ✓
- **Kraken** : SOC 2 Type II ✓
- **Gemini** : SOC 2 Type II ✓
- **Binance.US** : En cours

### Custody Providers
- **BitGo** : SOC 2 Type II + ISO 27001
- **Fireblocks** : SOC 2 Type II
- **Anchorage** : SOC 2 Type II (federal charter)
- **Coinbase Custody** : SOC 2 Type II

### Infrastructure Providers
- **Alchemy** : SOC 2 Type II
- **Infura** : SOC 2 Type II
- **QuickNode** : SOC 2 Type II

### DeFi / Wallets
- **Généralement non audité** (décentralisé)
- **Entreprises** derrière peuvent avoir SOC 2

### Ce que couvre SOC 2 pour crypto:
| Domaine | Contrôles vérifiés |
|---------|-------------------|
| Key management | HSM usage, access controls |
| Authentication | MFA, password policies |
| Monitoring | Logging, alerting |
| Incident response | Procedures, testing |
| Change management | Deployment processes |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | SOC 2 Type II (5 critères) + ISO 27001 | 100% |
| **Élevé** | SOC 2 Type II (Security + 1-2 autres) | 80% |
| **Moyen** | SOC 2 Type I ou en cours Type II | 50% |
| **Basique** | SOC 1 ou contrôles non audités | 25% |
| **Insuffisant** | Pas d'audit indépendant | 0% |

## 5. Sources et Références

- [AICPA SOC 2](https://www.aicpa.org/soc2)
- [Trust Services Criteria](https://www.aicpa.org/resources/landing/trust-services-criteria)
- [SOC Reports Explained](https://www.isaca.org/)
""",

    4705: """## 1. Vue d'ensemble

**BIP-39** (Bitcoin Improvement Proposal 39) définit le standard pour les phrases mnémoniques (seed phrases) utilisées pour générer des clés déterministes. C'est le standard universel pour le backup des wallets crypto.

12 ou 24 mots qui encodent 128-256 bits d'entropie.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

**Paramètres BIP-39:**
| Entropie | Checksum | Total bits | Mots |
|----------|----------|------------|------|
| 128 bits | 4 bits | 132 bits | 12 |
| 160 bits | 5 bits | 165 bits | 15 |
| 192 bits | 6 bits | 198 bits | 18 |
| 224 bits | 7 bits | 231 bits | 21 |
| 256 bits | 8 bits | 264 bits | 24 |

**Wordlist:**
| Langue | Mots | Caractéristique |
|--------|------|-----------------|
| English | 2048 | Référence |
| French | 2048 | Standardisé |
| Spanish | 2048 | Standardisé |
| Japanese | 2048 | Standardisé |
| (8 langues total) | 2048 | Compatibles |

**Propriétés wordlist:**
- 2048 mots = 11 bits par mot
- 4 premiers caractères uniques
- Pas de mots similaires phonétiquement

**Dérivation seed (BIP-39):**
```
Seed = PBKDF2(
  Password: mnemonic_sentence (UTF-8 NFKD),
  Salt: "mnemonic" + passphrase,
  Iterations: 2048,
  Hash: HMAC-SHA512,
  Output: 512 bits
)
```

**Checksum calculation:**
```
checksum = SHA256(entropy)[0:entropy_bits/32]
```

## 3. Application aux Produits Crypto

### Hardware Wallets (tous supportent BIP-39)
| Wallet | Mots par défaut | Passphrase |
|--------|-----------------|------------|
| Ledger | 24 | ✓ |
| Trezor | 12 ou 24 | ✓ |
| Coldcard | 24 | ✓ |
| Keystone | 12 ou 24 | ✓ |
| BitBox02 | 12 ou 24 | ✓ |

### Software Wallets
| Wallet | BIP-39 | Import |
|--------|--------|--------|
| MetaMask | ✓ | ✓ |
| Trust Wallet | ✓ | ✓ |
| Electrum | ✓ (+ propre format) | ✓ |
| Phantom | ✓ | ✓ |

### Compatibilité cross-wallet
- **Même seed** = même wallet partout
- **Attention** : Derivation paths peuvent différer
- **Test** : Toujours vérifier adresses après restore

### Sécurité de l'entropie
| Source | Qualité |
|--------|---------|
| Hardware TRNG | Excellente |
| /dev/urandom | Bonne |
| Dice rolls (casino) | Excellente |
| User-generated | Dangereuse |

### Attaques sur BIP-39
| Attaque | Faisabilité |
|---------|-------------|
| Brute-force 12 mots | Impossible (2^128) |
| Brute-force 24 mots | Impossible (2^256) |
| Weak passphrase | Possible |
| Missing 1 word | ~2048 attempts |
| Typo 1 word | ~2048 × positions |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | 24 mots + TRNG + passphrase forte | 100% |
| **Élevé** | 24 mots + TRNG | 85% |
| **Standard** | 12 mots + TRNG | 70% |
| **Basique** | 12 mots sans vérification entropie | 50% |
| **Non-conforme** | Format propriétaire | 20% |

## 5. Sources et Références

- [BIP-39 Specification](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [BIP-39 Wordlists](https://github.com/bitcoin/bips/tree/master/bip-0039)
- [Ian Coleman BIP-39 Tool](https://iancoleman.io/bip39/)
""",

    4706: """## 1. Vue d'ensemble

**BIP-32** (Bitcoin Improvement Proposal 32) définit les wallets déterministes hiérarchiques (HD Wallets), permettant de dériver un nombre infini de clés depuis une seule seed. C'est la base de tous les wallets modernes.

Un master seed → arbre infini de clés publiques et privées.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

**Dérivation Master Key:**
```
I = HMAC-SHA512(Key="Bitcoin seed", Data=Seed)
Master Private Key = I[0:32]   // 256 bits
Master Chain Code = I[32:64]   // 256 bits
```

**Structure de dérivation:**
| Notation | Signification |
|----------|---------------|
| m | Master private key |
| M | Master public key |
| / | Niveau de dérivation |
| n | Index enfant (0-2^31-1) |
| n' ou nH | Index hardened (2^31 - 2^32-1) |

**Derivation enfant:**
| Type | Input | Output | Sécurité |
|------|-------|--------|----------|
| Normal | Public + chaincode | Public enfant | Public dérivable |
| **Hardened** | Private + chaincode | Private enfant | Private requis |

**Formules de dérivation:**
```
// Normal child derivation
I = HMAC-SHA512(chain_code, public_key || index)
child_key = parse256(I[0:32]) + parent_key
child_chain = I[32:64]

// Hardened child derivation
I = HMAC-SHA512(chain_code, 0x00 || private_key || index)
child_key = parse256(I[0:32]) + parent_key
child_chain = I[32:64]
```

**Extended Keys (xpub/xprv):**
| Préfixe | Version | Network |
|---------|---------|---------|
| xpub | 0x0488B21E | Mainnet public |
| xprv | 0x0488ADE4 | Mainnet private |
| tpub | 0x043587CF | Testnet public |
| tprv | 0x04358394 | Testnet private |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Tous** implémentent BIP-32
- Seed → Master Key dans Secure Element
- Dérivation on-device pour chaque transaction

### Derivation Paths (combiné avec BIP-43/44)
| Path | Usage |
|------|-------|
| m/44'/0'/0' | Bitcoin legacy |
| m/49'/0'/0' | Bitcoin SegWit-compatible |
| m/84'/0'/0' | Bitcoin Native SegWit |
| m/44'/60'/0' | Ethereum |
| m/44'/501'/0' | Solana |

### Watch-only Wallets
- **Export xpub** (extended public key)
- Peut générer adresses sans private key
- Utile pour: comptabilité, monitoring

### Gap Limit
| Standard | Valeur |
|----------|--------|
| BIP-44 default | 20 adresses |
| Electrum | 20 (configurable) |
| Modern wallets | Variable |

### Sécurité
| Risque | Impact |
|--------|--------|
| xprv exposé | Toutes clés compromises |
| xpub exposé | Privacy compromise |
| Chain code leak | Dérivation possible |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | BIP-32 + hardened paths + SE derivation | 100% |
| **Élevé** | BIP-32 complet + hardened par défaut | 85% |
| **Standard** | BIP-32 avec mixed paths | 70% |
| **Basique** | BIP-32 sans hardened | 50% |
| **Non-conforme** | Pas de HD wallet | 0% |

## 5. Sources et Références

- [BIP-32 Specification](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)
- [HD Wallet Explained](https://learnmeabitcoin.com/technical/hd-wallets)
- [Key Derivation Functions](https://en.bitcoin.it/wiki/BIP_0032)
""",

    4707: """## 1. Vue d'ensemble

**BIP-44** définit un standard pour les chemins de dérivation multi-compte et multi-devise dans les HD wallets. Il établit la structure `m/purpose'/coin_type'/account'/change/address_index`.

BIP-44 permet d'utiliser une seule seed pour gérer Bitcoin, Ethereum, et des centaines d'autres cryptos.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

**Structure du path BIP-44:**
```
m / purpose' / coin_type' / account' / change / address_index
```

| Niveau | Description | Valeur |
|--------|-------------|--------|
| purpose' | Toujours 44' pour BIP-44 | Hardened |
| coin_type' | Identifie la crypto | SLIP-0044 |
| account' | Compte utilisateur | 0', 1', 2'... |
| change | Externe (0) ou change (1) | Normal |
| address_index | Index de l'adresse | Normal |

**Coin types (SLIP-0044):**
| coin_type | Cryptocurrency |
|-----------|---------------|
| 0' | Bitcoin |
| 2' | Litecoin |
| 60' | Ethereum |
| 145' | Bitcoin Cash |
| 501' | Solana |
| 118' | Cosmos (ATOM) |
| 354' | Polkadot |
| 1815' | Cardano |

**Chemins complets exemples:**
| Usage | Path |
|-------|------|
| BTC première adresse | m/44'/0'/0'/0/0 |
| BTC change address | m/44'/0'/0'/1/0 |
| ETH première adresse | m/44'/60'/0'/0/0 |
| Second compte BTC | m/44'/0'/1'/0/0 |

**Variantes post-BIP-44:**
| BIP | Purpose | Usage |
|-----|---------|-------|
| BIP-49 | 49' | P2WPKH-in-P2SH (SegWit compat) |
| BIP-84 | 84' | P2WPKH (Native SegWit) |
| BIP-86 | 86' | P2TR (Taproot) |

## 3. Application aux Produits Crypto

### Hardware Wallets
| Wallet | BIP-44 | Multi-coin |
|--------|--------|------------|
| Ledger | ✓ | 5000+ coins |
| Trezor | ✓ | 1000+ coins |
| Coldcard | ✓ | Bitcoin-focused |
| Keystone | ✓ | Multi-chain |

### Software Wallets
| Wallet | Derivation Path |
|--------|-----------------|
| MetaMask | m/44'/60'/0'/0/n (ETH) |
| Phantom | m/44'/501'/0'/0' (Solana) |
| Trust Wallet | BIP-44 pour chaque chain |
| Exodus | BIP-44 multi-coin |

### Ethereum specificity
- **Ledger** : m/44'/60'/0'/0/n
- **Trezor** : m/44'/60'/0'/0/n
- **MetaMask** : m/44'/60'/0'/0/n (même)
- **Some wallets** : m/44'/60'/n'/0/0 (account variation)

### Compatibility issues
| Issue | Cause |
|-------|-------|
| Different addresses | Path variation |
| Missing funds | Wrong derivation |
| Cross-wallet | Verify path matches |

### Account Discovery
- Scanner les addresses avec balance
- Gap limit: 20 addresses sans activité
- Certains wallets: scan profond optionnel

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | BIP-44/49/84/86 support + custom paths | 100% |
| **Élevé** | BIP-44 strict compliance multi-chain | 85% |
| **Standard** | BIP-44 pour principales chains | 70% |
| **Basique** | Single chain BIP-44 | 50% |
| **Non-conforme** | Paths non-standard | 20% |

## 5. Sources et Références

- [BIP-44 Specification](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)
- [SLIP-0044 Coin Types](https://github.com/satoshilabs/slips/blob/master/slip-0044.md)
- [BIP-84 Native SegWit](https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki)
""",

    4708: """## 1. Vue d'ensemble

**SLIP-0039** (Satoshi Labs Improvement Proposal 39) définit un standard pour le backup distribué des seeds via Shamir's Secret Sharing. Développé par Trezor, il permet de diviser une seed en N parts dont M sont nécessaires pour la reconstruction.

Alternative plus robuste au BIP-39 single backup pour les utilisateurs avancés.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

**Paramètres SLIP-0039:**
| Paramètre | Valeurs |
|-----------|---------|
| Shares (N) | 1-16 |
| Threshold (M) | 1-16 (≤ N) |
| Groups | 1-16 |
| Group threshold | 1-16 |
| Entropy | 128 ou 256 bits |

**Format des shares:**
| Bits entropie | Mots par share |
|---------------|----------------|
| 128 bits | 20 mots |
| 256 bits | 33 mots |

**Structure d'une share:**
```
| ID (15 bits) | Iteration exp (4) | Group index (4) |
| Group threshold (4) | Group count (4) |
| Member index (4) | Member threshold (4) |
| Share value | Checksum (30 bits, RS1024) |
```

**Wordlist:**
- 1024 mots (vs 2048 pour BIP-39)
- Mots de 4-8 lettres
- Premiers 4 caractères uniques

**Schémas recommandés:**
| Schéma | Description | Usage |
|--------|-------------|-------|
| 2-of-3 | Simple distribution | Personnel |
| 3-of-5 | Standard sécurisé | Recommandé |
| 2-of-3-groups | Hierarchical | Organisations |

**Mathématique:**
- Shamir Secret Sharing sur GF(256)
- Polynôme de degré (threshold - 1)
- Reconstruction par interpolation de Lagrange

## 3. Application aux Produits Crypto

### Hardware Wallets supportant SLIP-0039
| Wallet | Support | Notes |
|--------|---------|-------|
| **Trezor Model T** | ✓ Natif | Création + Recovery |
| **Trezor Safe 3** | ✓ Natif | Full support |
| Ledger | ✗ | BIP-39 only |
| Coldcard | ✗ | BIP-39 only (Seed XOR) |
| Keystone | ✗ | BIP-39 only |

### Software Support
| Tool | Support |
|------|---------|
| trezor-firmware | Référence |
| python-shamir-mnemonic | Library officielle |
| SeedSigner | ✓ |
| Hermit | ✓ |

### Comparaison avec alternatives
| Méthode | Pro | Con |
|---------|-----|-----|
| SLIP-0039 | Standard, groups | Limited wallet support |
| Seed XOR (Coldcard) | Simple | Coldcard-specific |
| BIP-39 + split manual | Compatible | Error-prone |
| Multi-sig | On-chain security | Different addresses |

### Super Shamir (Groups)
```
Exemple: 2-of-3 groups, chaque groupe est 2-of-3
- Group 1 (Family): 2-of-3 shares
- Group 2 (Friends): 2-of-3 shares
- Group 3 (Lawyer): 2-of-3 shares
Besoin de 2 groupes, donc 4+ shares total
```

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | SLIP-0039 avec groups + on-device recovery | 100% |
| **Élevé** | SLIP-0039 simple scheme | 85% |
| **Moyen** | Shamir custom ou via software | 60% |
| **Basique** | BIP-39 avec split manuel | 30% |
| **Standard** | BIP-39 single backup | 50% |

## 5. Sources et Références

- [SLIP-0039 Specification](https://github.com/satoshilabs/slips/blob/master/slip-0039.md)
- [Trezor Shamir Backup](https://wiki.trezor.io/Shamir_backup)
- [python-shamir-mnemonic](https://github.com/trezor/python-shamir-mnemonic)
""",

    4709: """## 1. Vue d'ensemble

**EIP-712** (Ethereum Improvement Proposal 712) définit un standard pour la signature de données structurées et typées sur Ethereum. Il permet aux utilisateurs de comprendre ce qu'ils signent, contrairement aux signatures de hash bruts.

EIP-712 est essentiel pour la sécurité DeFi : swaps, listings NFT, permits, et plus.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

**Structure d'un message EIP-712:**
```
domainSeparator = hashStruct(EIP712Domain({
  name: "Protocol Name",
  version: "1",
  chainId: 1,
  verifyingContract: 0x...
}))

message = hashStruct(primaryType, messageData)

signature = sign(keccak256(
  "\\x19\\x01" || domainSeparator || message
))
```

**EIP712Domain fields:**
| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| name | string | ✓ | Protocol name |
| version | string | ✓ | Protocol version |
| chainId | uint256 | ✓ | Replay protection |
| verifyingContract | address | ✓ | Contract address |
| salt | bytes32 | Optional | Extra uniqueness |

**Types supportés:**
| Type | Description |
|------|-------------|
| uint256, int256 | Integers |
| address | Ethereum address |
| bool | Boolean |
| bytes, bytes32 | Byte arrays |
| string | UTF-8 string |
| Custom structs | Nested types |
| Arrays | Type[] |

**Exemple Permit (ERC-2612):**
```solidity
struct Permit {
    address owner;
    address spender;
    uint256 value;
    uint256 nonce;
    uint256 deadline;
}
```

## 3. Application aux Produits Crypto

### Usages EIP-712
| Usage | Protocole exemple |
|-------|-------------------|
| Permit (gasless approval) | Uniswap, USDC |
| NFT listing | OpenSea, Blur |
| Order signing | 0x, CoWSwap |
| Meta-transactions | Biconomy |
| Governance votes | Compound, Aave |

### Hardware Wallets
| Wallet | EIP-712 Display |
|--------|-----------------|
| Ledger | ✓ (improved 2023) |
| Trezor | ✓ (limited) |
| GridPlus Lattice | ✓ (best-in-class) |
| Keystone | ✓ |

### Software Wallets
| Wallet | EIP-712 UX |
|--------|------------|
| MetaMask | ✓ Structured display |
| Rabby | ✓ Enhanced parsing |
| Rainbow | ✓ |

### Risques de signature EIP-712
| Risque | Description |
|--------|-------------|
| Permit phishing | Sign ≈ approve |
| SeaPort orders | NFT listing scam |
| Unlimited permit | type(uint256).max |
| Wrong chain | Check chainId! |

### Clear Signing importance
- **Avec EIP-712** : User voit les détails
- **Sans** : Hash only ("blind signing")
- **Best practice** : Toujours vérifier domain et values

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Full EIP-712 decode + risk warnings | 100% |
| **Élevé** | EIP-712 display structuré | 80% |
| **Moyen** | EIP-712 support basique | 50% |
| **Basique** | Raw hash display | 25% |
| **Critique** | Blind signing only | 0% |

## 5. Sources et Références

- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)
- [EIP-2612 Permit](https://eips.ethereum.org/EIPS/eip-2612)
- [Ledger Clear Signing](https://www.ledger.com/blog/world-premiere-ledger-clear-signs-eip-712)
""",

    4710: """## 1. Vue d'ensemble

**ERC-4337** (Account Abstraction) est un standard Ethereum qui transforme les comptes utilisateur en smart contracts programmables. Il permet des fonctionnalités avancées : social recovery, gas sponsoring, batch transactions, et session keys.

ERC-4337 représente l'avenir de l'UX crypto : wallets sans seed phrase visible, avec sécurité améliorée.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

**Architecture ERC-4337:**
| Composant | Rôle |
|-----------|------|
| **UserOperation** | Transaction signée par user |
| **Bundler** | Agrège UserOps, soumet on-chain |
| **EntryPoint** | Contract singleton de validation |
| **Smart Account** | Wallet contract du user |
| **Paymaster** | Sponsorise le gas |
| **Aggregator** | Agrège signatures (optionnel) |

**Structure UserOperation:**
| Field | Type | Description |
|-------|------|-------------|
| sender | address | Smart account address |
| nonce | uint256 | Anti-replay |
| initCode | bytes | Account creation (if new) |
| callData | bytes | Transaction data |
| callGasLimit | uint256 | Execution gas |
| verificationGasLimit | uint256 | Validation gas |
| preVerificationGas | uint256 | Overhead |
| maxFeePerGas | uint256 | EIP-1559 |
| maxPriorityFeePerGas | uint256 | EIP-1559 |
| paymasterAndData | bytes | Paymaster info |
| signature | bytes | Signature (flexible format) |

**Validation flow:**
```
1. Bundler receives UserOperation
2. EntryPoint.handleOps() called
3. Account.validateUserOp() verification
4. If Paymaster: Paymaster.validatePaymasterUserOp()
5. Account execution (callData)
6. Paymaster.postOp() (if applicable)
```

**EntryPoint address:**
- v0.6: 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
- v0.7: 0x0000000071727De22E5E9d8BAf0edAc6f37da032

## 3. Application aux Produits Crypto

### Smart Contract Wallets ERC-4337
| Wallet | Features |
|--------|----------|
| **Safe (ex-Gnosis)** | Multi-sig + 4337 module |
| **Biconomy** | Smart Accounts, SDK |
| **ZeroDev** | Kernel accounts, plugins |
| **Alchemy Account Kit** | Modular smart accounts |
| **Pimlico** | Bundler + Paymaster infra |

### Consumer Wallets
| Wallet | ERC-4337 |
|--------|----------|
| Argent | ✓ (pionnier) |
| Sequence | ✓ |
| Soul Wallet | ✓ |
| Patch Wallet | ✓ (Telegram) |

### Features activées par 4337
| Feature | Benefit |
|---------|---------|
| **Social recovery** | Pas de seed phrase perdue |
| **Gasless tx** | Paymaster sponsorise |
| **Batch transactions** | Multiple ops en une tx |
| **Session keys** | Limited permissions |
| **Custom validation** | Passkeys, multi-sig, etc. |

### Bundler Services
| Provider | Coverage |
|----------|----------|
| Pimlico | Multi-chain |
| Alchemy | Multi-chain |
| Biconomy | Multi-chain |
| StackUp | Multi-chain |

### Limites actuelles
| Limite | Status |
|--------|--------|
| L1 gas cost | Élevé (~42k gas overhead) |
| Native AA (EIP-7702) | En discussion |
| Wallet adoption | En croissance |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | ERC-4337 + social recovery + session keys | 100% |
| **Élevé** | ERC-4337 avec recovery mechanism | 80% |
| **Moyen** | Smart contract wallet (pre-4337) | 60% |
| **Standard** | EOA avec hardware wallet | 70% |
| **Basique** | EOA software wallet only | 40% |

## 5. Sources et Références

- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [ERC-4337 Official Site](https://www.erc4337.io/)
- [Alchemy Account Kit](https://accountkit.alchemy.com/)
- [ZeroDev Documentation](https://docs.zerodev.app/)
""",

    4711: """## 1. Vue d'ensemble

**PCI-DSS** (Payment Card Industry Data Security Standard) est le standard de sécurité pour le traitement des cartes de paiement. Bien que conçu pour les cartes bancaires, ses principes s'appliquent aux exchanges crypto qui traitent des paiements fiat.

Pour les CEX offrant des achats par carte bancaire, la conformité PCI-DSS est obligatoire.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

**12 Exigences PCI-DSS v4.0:**
| # | Exigence |
|---|----------|
| 1 | Install and maintain network security controls |
| 2 | Apply secure configurations |
| 3 | Protect stored account data |
| 4 | Protect cardholder data during transmission |
| 5 | Protect against malicious software |
| 6 | Develop secure systems and software |
| 7 | Restrict access by business need |
| 8 | Identify users and authenticate access |
| 9 | Restrict physical access |
| 10 | Log and monitor all access |
| 11 | Test security regularly |
| 12 | Support security with policies |

**Niveaux de conformité:**
| Level | Transactions/an | Validation |
|-------|-----------------|------------|
| 1 | > 6 million | QSA on-site audit |
| 2 | 1-6 million | SAQ + quarterly scans |
| 3 | 20k-1 million | SAQ + quarterly scans |
| 4 | < 20k e-commerce | SAQ |

**Contrôles clés crypto-pertinents:**
| Control | Application crypto |
|---------|-------------------|
| 3.x | Encryption of sensitive data (keys!) |
| 4.x | Secure transmission (TLS 1.3) |
| 8.x | MFA for admin access |
| 10.x | Comprehensive logging |
| 11.x | Penetration testing |

## 3. Application aux Produits Crypto

### CEX avec PCI-DSS
| Exchange | PCI Level | Notes |
|----------|-----------|-------|
| Coinbase | Level 1 | Card purchases |
| Kraken | Level 1 | Fiat gateway |
| Gemini | Level 1 | Card support |
| Binance | Variable | Regional |

### Payment Processors Crypto
| Provider | PCI Compliance |
|----------|----------------|
| MoonPay | PCI-DSS compliant |
| Simplex | PCI-DSS compliant |
| Wyre | PCI-DSS compliant |
| Ramp | PCI-DSS compliant |

### Scope pour crypto exchanges
| In-scope | Out-of-scope |
|----------|--------------|
| Card payment processing | Crypto trading |
| Fiat on-ramp | Wallet operations |
| KYC/identity data | Blockchain transactions |

### Crypto-specific considerations
- **HSMs** pour key management (aligned avec PCI)
- **Encryption** des données sensibles
- **Access control** strict
- **Logging** exhaustif

### Challenges
| Challenge | Solution |
|-----------|----------|
| Scope creep | Segmentation réseau |
| Key management | HSMs certifiés |
| 24/7 operations | Monitoring continu |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | PCI-DSS Level 1 + SOC 2 + ISO 27001 | 100% |
| **Élevé** | PCI-DSS Level 1 ou 2 | 80% |
| **Moyen** | PCI-DSS Level 3-4 (SAQ) | 60% |
| **Basique** | PCI principes sans certification | 30% |
| **N/A** | Pas de traitement cartes | N/A |

## 5. Sources et Références

- [PCI Security Standards Council](https://www.pcisecuritystandards.org/)
- [PCI-DSS v4.0](https://www.pcisecuritystandards.org/document_library/)
- [PCI-DSS Quick Reference](https://www.pcisecuritystandards.org/pdfs/pci_ssc_quick_guide.pdf)
""",

    4712: """## 1. Vue d'ensemble

**NIST Cybersecurity Framework (CSF) 2.0** est un cadre de référence pour la gestion des risques de cybersécurité, largement adopté par les organisations américaines et internationales. La version 2.0 (2024) ajoute "Govern" comme nouvelle fonction.

Pour les entreprises crypto, NIST CSF offre une structure complète pour évaluer et améliorer leur posture de sécurité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

**6 Fonctions NIST CSF 2.0:**
| Fonction | Description |
|----------|-------------|
| **GOVERN (GV)** | Governance, strategy, risk management (NEW) |
| **IDENTIFY (ID)** | Asset management, risk assessment |
| **PROTECT (PR)** | Access control, training, data security |
| **DETECT (DE)** | Monitoring, anomaly detection |
| **RESPOND (RS)** | Response planning, communications |
| **RECOVER (RC)** | Recovery planning, improvements |

**Catégories par fonction:**
| Fonction | Catégories |
|----------|------------|
| GOVERN | Context, Strategy, Roles, Policy, Oversight |
| IDENTIFY | Asset Mgmt, Risk Assessment, Improvement |
| PROTECT | Identity, Awareness, Data, Platform, Technology |
| DETECT | Continuous Monitoring, Analysis |
| RESPOND | Management, Analysis, Mitigation, Reporting |
| RECOVER | Planning, Communication |

**Implementation Tiers:**
| Tier | Description |
|------|-------------|
| Tier 1 | Partial - ad hoc, reactive |
| Tier 2 | Risk Informed - some processes |
| Tier 3 | Repeatable - formal policies |
| Tier 4 | Adaptive - continuous improvement |

**Profiles:**
| Type | Usage |
|------|-------|
| Current Profile | État actuel |
| Target Profile | État souhaité |
| Gap Analysis | Différence entre les deux |

## 3. Application aux Produits Crypto

### Mapping aux activités crypto
| Function | Crypto Application |
|----------|-------------------|
| GOVERN | Board oversight of crypto risks |
| IDENTIFY | Wallet inventory, key management |
| PROTECT | Multi-sig, cold storage, access control |
| DETECT | On-chain monitoring, anomaly detection |
| RESPOND | Incident response, fund recovery |
| RECOVER | Backup restoration, communication |

### CEX Implementation
| Category | Controls |
|----------|----------|
| ID.AM | Asset inventory (hot/cold wallets) |
| PR.AC | Role-based access, MFA |
| PR.DS | Encryption at rest and transit |
| DE.CM | Real-time transaction monitoring |
| RS.RP | Incident response playbooks |

### DeFi Protocols
| Area | NIST Mapping |
|------|--------------|
| Smart contract audits | ID.RA (Risk Assessment) |
| Bug bounty | ID.RA, DE.CM |
| Pause mechanisms | RS.MI (Mitigation) |
| Protocol upgrades | PR.MA (Maintenance) |

### Custody Providers
- **Full NIST CSF alignment** attendu
- **Tier 3 minimum** pour institutional
- **Documentation** des gaps et roadmap

### Informative References
| Framework | Integration |
|-----------|-------------|
| ISO 27001 | Strong mapping |
| SOC 2 | Trust criteria aligned |
| CIS Controls | Technical implementation |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | NIST CSF Tier 4 + formal assessment | 100% |
| **Élevé** | NIST CSF Tier 3 implementation | 75% |
| **Moyen** | NIST CSF Tier 2 + documented gaps | 50% |
| **Basique** | NIST CSF awareness, Tier 1 | 25% |
| **Insuffisant** | No framework reference | 0% |

## 5. Sources et Références

- [NIST CSF 2.0](https://www.nist.gov/cyberframework)
- [NIST CSF Quick Start](https://www.nist.gov/cyberframework/getting-started)
- [CSF 2.0 Core (Excel)](https://www.nist.gov/cyberframework/framework)
"""
}

def main():
    print("Saving ISO/IEC and official standards summaries...")
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
