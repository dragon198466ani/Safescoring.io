#!/usr/bin/env python3
"""Generate summaries for Security norms - Secure Elements and Attack Resistance."""

import requests
import sys
import time
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    # S-ADD-001: ATECC608A
    7086: """## 1. Vue d'ensemble

Le **ATECC608A** est un Secure Element (SE) fabriqué par Microchip Technology, conçu pour le stockage sécurisé de clés cryptographiques et l'exécution d'opérations cryptographiques dans un environnement protégé contre les attaques physiques et logiques.

Ce composant est certifié Common Criteria EAL5+ et est largement utilisé dans les solutions IoT, hardware wallets, et systèmes d'authentification. Il offre une protection matérielle contre les attaques side-channel et les tentatives d'extraction de clés.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Fabricant | Microchip Technology |
| Certification | Common Criteria EAL5+ (AVA_VAN.5) |
| Algorithmes | ECDSA P-256, ECDH, SHA-256, AES-128 |
| Stockage clés | 16 slots (256 bits chacun) |
| Interface | I²C (jusqu'à 1 MHz) |
| Tension | 2.0V - 5.5V |
| Température | -40°C à +85°C (Industrial) |
| Package | SOIC-8, UDFN-8 |
| Courant actif | 3-16 mA |
| Courant sleep | < 150 nA |

**Fonctionnalités cryptographiques :**
- ECDSA sign/verify (NIST P-256)
- ECDH key agreement
- SHA-256 hardware accelerator
- AES-128 encrypt/decrypt
- Monotonic counters (anti-replay)
- Random Number Generator (TRNG)

**Protections matérielles :**
- Tamper detection mesh
- Active shield
- Glitch detection
- Environmental monitors (voltage, temperature)
- DPA/SPA countermeasures

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Trezor Safe 3** : Utilise ATECC608A comme SE additionnel
- **GridPlus Lattice1** : ATECC608A pour signature
- **Coinkite products** : ATECC608 family

### Software Wallets
- Non applicable directement (composant hardware)
- Peut être intégré via clés hardware USB

### CEX/DEX
- Non applicable (composant embarqué)

### Solutions Backup
- **Clés hardware** : ATECC608 dans YubiKey-like devices

### Limitations
- Courbe P-256 uniquement (pas secp256k1 Bitcoin natif)
- Nécessite calcul externe pour Bitcoin/Ethereum

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| Conforme complet | ATECC608A/B + firmware sécurisé + anti-tampering | 100% |
| Conforme partiel | ATECC608 sans toutes protections activées | 70% |
| Alternative | Autre SE équivalent CC EAL5+ | 80% |

## 5. Sources et Références

- [Microchip ATECC608A Datasheet](https://www.microchip.com/en-us/product/ATECC608A)
- [Common Criteria Portal - ATECC608A](https://www.commoncriteriaportal.org/)
- SafeScoring Criteria S-ADD-001 v1.0
""",

    # S-ADD-002: ATECC608B
    7087: """## 1. Vue d'ensemble

Le **ATECC608B** est l'évolution du ATECC608A avec des améliorations de sécurité et de fonctionnalités. Il offre une meilleure résistance aux attaques et des capacités cryptographiques étendues.

Principal changement : amélioration des contremesures DPA/SPA et support de fonctionnalités Trust Platform plus avancées.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Fabricant | Microchip Technology |
| Certification | Common Criteria EAL6+ (en cours) |
| Algorithmes | ECDSA P-256, ECDH, SHA-256, AES-128-GCM |
| Stockage clés | 16 slots (256 bits) + secure boot support |
| Interface | I²C (jusqu'à 1 MHz), SWI optionnel |
| Trust Platform | TrustFLEX, TrustCUSTOM support |
| IO Protection | Enhanced I/O encryption |

**Améliorations vs ATECC608A :**
- Contremesures DPA/SPA renforcées
- AES-GCM support (authenticated encryption)
- Secure boot verification améliorée
- Trust Platform pre-provisioning

## 3. Application aux Produits Crypto

### Hardware Wallets
- Adoption croissante dans les nouveaux designs
- Compatible pin-to-pin avec ATECC608A

### Recommandation
- Préférer ATECC608B pour nouveaux designs
- Migration transparente depuis ATECC608A

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| ATECC608B implémenté | 100% |
| ATECC608A | 90% |
| Autre SE EAL5+ | 80% |

## 5. Sources et Références

- [Microchip ATECC608B](https://www.microchip.com/en-us/product/ATECC608B)
- SafeScoring Criteria S-ADD-002 v1.0
""",

    # S-ADD-003: OPTIGA Trust M
    7088: """## 1. Vue d'ensemble

Le **OPTIGA Trust M** est un Secure Element d'Infineon Technologies offrant des fonctionnalités de sécurité avancées avec support natif des courbes elliptiques utilisées en crypto (incluant secp256k1).

Point fort : support natif secp256k1 (Bitcoin/Ethereum) contrairement à l'ATECC608 qui ne supporte que P-256.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Fabricant | Infineon Technologies |
| Certification | CC EAL6+ (high), BSI |
| Courbes ECC | NIST P-256/384/521, Brainpool, **secp256k1** |
| Algorithmes | ECDSA, ECDH, RSA-2048, SHA-256/384/512, AES-128/256 |
| Stockage | Multiple key objects |
| Interface | I²C |
| Température | -40°C à +105°C |
| Anti-tamper | Comprehensive (shield, sensors) |

**Support cryptographique crypto-native :**
- **secp256k1** : Bitcoin, Ethereum signatures natives
- **Ed25519** : Support Solana, Cardano
- RSA-2048/4096 pour compatibilité legacy

**Protections :**
- Active shield mesh
- Voltage/temperature monitoring
- Light sensors (decapsulation detection)
- Clock glitch detection
- DPA/SPA hardened design

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Potentiel élevé** : Support natif secp256k1
- Candidat idéal pour Bitcoin/Ethereum wallets
- Certains designs l'utilisent déjà

### Avantage clé
- Signature Bitcoin/Ethereum 100% dans le SE
- Pas besoin de calcul externe (contrairement ATECC608)

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| OPTIGA Trust M (secp256k1 natif) | 100% |
| ATECC608 + calcul externe | 85% |
| MCU sans SE | 30% |

## 5. Sources et Références

- [Infineon OPTIGA Trust M](https://www.infineon.com/cms/en/product/security-smart-card-solutions/optiga-embedded-security-solutions/optiga-trust/optiga-trust-m-sls32aia/)
- SafeScoring Criteria S-ADD-003 v1.0
""",

    # S-ADD-004: OPTIGA Trust X
    7089: """## 1. Vue d'ensemble

Le **OPTIGA Trust X** est la version simplifiée de l'OPTIGA Trust M, optimisée pour l'IoT et les applications nécessitant moins de fonctionnalités mais maintenant un haut niveau de sécurité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Fabricant | Infineon Technologies |
| Certification | CC EAL6+ |
| Courbes ECC | NIST P-256, P-384 (pas secp256k1) |
| Algorithmes | ECDSA, ECDH, SHA-256, AES-128 |
| Interface | I²C |
| Use case | IoT authentication |

**Différence vs Trust M :**
- Pas de support secp256k1
- Moins de slots de stockage
- Prix inférieur
- Adapté IoT, moins adapté crypto

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Moins adapté** : pas de secp256k1
- Possible pour auth/secure boot uniquement
- Trust M préféré pour signatures crypto

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| OPTIGA Trust X (auth only) | 60% |
| Préférer Trust M pour crypto | - |

## 5. Sources et Références

- [Infineon OPTIGA Trust X](https://www.infineon.com/optiga-trust-x)
- SafeScoring Criteria S-ADD-004 v1.0
""",

    # S-ADD-005: SE050
    7090: """## 1. Vue d'ensemble

Le **SE050** est un Secure Element de NXP Semiconductors offrant les plus hauts niveaux de certification (CC EAL6+) et un support étendu des algorithmes cryptographiques incluant les courbes utilisées en blockchain.

C'est l'un des SE les plus avancés disponibles commercialement, utilisé dans des applications haute sécurité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Fabricant | NXP Semiconductors |
| Certification | CC EAL6+ (AVA_VAN.5) |
| Courbes ECC | NIST P-256/384/521, Brainpool 256/384/512, **secp256k1**, Ed25519 |
| Algorithmes | ECDSA, ECDH, RSA-2048/3072/4096, AES-128/192/256, SHA-1/256/384/512 |
| Stockage | 50+ secure objects |
| Interface | I²C (jusqu'à 3.4 MHz) |
| Tension | 1.62V - 5.5V |
| Température | -40°C à +105°C |
| FIPS | 140-2 Level 3 (option) |

**Capacités avancées :**
- Attestation de clés
- Secure boot signing
- Session keys avec ECDH
- Monotonic counters (anti-replay)
- Crypto object access policies

**Support blockchain natif :**
- secp256k1 : Bitcoin, Ethereum
- Ed25519 : Solana, Cardano, Polkadot
- Keccak/SHA-3 : Ethereum

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** : Utilise famille SE similaire (ST33)
- **Keystone** : Possibilité d'intégration
- Excellente option pour hardware wallets pro

### CEX Custody
- Utilisé dans HSMs et solutions custody institutionnelles

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| SE050 (EAL6+, secp256k1) | 100% |
| SE EAL5+ équivalent | 90% |
| SE sans secp256k1 natif | 70% |

## 5. Sources et Références

- [NXP SE050 Product Page](https://www.nxp.com/products/security-and-authentication/edgelock-se050-plug-trust-secure-element:SE050)
- [SE050 Datasheet](https://www.nxp.com/docs/en/data-sheet/SE050-DATASHEET.pdf)
- SafeScoring Criteria S-ADD-005 v1.0
""",

    # S-ADD-006: SE051
    7091: """## 1. Vue d'ensemble

Le **SE051** est l'évolution du SE050 avec des améliorations de performance et des fonctionnalités additionnelles pour les applications IoT industrielles et blockchain avancées.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Fabricant | NXP Semiconductors |
| Certification | CC EAL6+ (pending), FIPS 140-3 |
| Améliorations | Performance +30%, lower power, industrial temp |
| Courbes | Toutes SE050 + options additionnelles |
| Post-quantum | Préparation PQC (software updatable) |

**Nouveautés vs SE050 :**
- Cryptoprocesseur plus rapide
- Consommation réduite
- Extended temperature range
- Firmware updateable pour futures algos (PQC)

## 3. Application aux Produits Crypto

- Recommandé pour nouveaux designs hardware wallets
- Forward-compatible post-quantum

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| SE051 | 100% |
| SE050 | 95% |

## 5. Sources et Références

- [NXP SE051](https://www.nxp.com/products/security-and-authentication/edgelock/se051-plug-and-trust-secure-element:SE051)
- SafeScoring Criteria S-ADD-006 v1.0
""",

    # S-ADD-007: A71CH
    7092: """## 1. Vue d'ensemble

Le **A71CH** est un Secure Element de NXP optimisé pour les applications d'authentification IoT et les petits appareils connectés avec contraintes de coût.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Fabricant | NXP Semiconductors |
| Certification | CC EAL5+ |
| Courbes ECC | NIST P-256 uniquement |
| Algorithmes | ECDSA, ECDH, SHA-256, AES-128 |
| Stockage | Limited key slots |
| Interface | I²C |
| Target | IoT, cost-sensitive |

**Limitations pour crypto :**
- Pas de secp256k1 (Bitcoin)
- Pas de Ed25519
- Adapté auth, pas signing blockchain

## 3. Application aux Produits Crypto

### Utilisation limitée
- Secure boot validation
- Device authentication
- Pas recommandé comme SE principal wallet

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| A71CH (auth only) | 40% |
| Préférer SE050/SE051 | - |

## 5. Sources et Références

- [NXP A71CH](https://www.nxp.com/products/security-and-authentication/authentication/a71ch-plug-trust-secure-element:A71CH)
- SafeScoring Criteria S-ADD-007 v1.0
""",

    # S-ADD-008: Temperature Attack Protection
    7093: """## 1. Vue d'ensemble

La **Temperature Attack Protection** (protection contre les attaques thermiques) évalue les mécanismes de défense d'un appareil contre les manipulations de température utilisées pour compromettre la sécurité du Secure Element.

Les attaques thermiques exploitent le comportement anormal des composants électroniques à des températures extrêmes pour induire des erreurs ou extraire des informations.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Plage normale | -20°C à +70°C (consumer) |
| Plage industrielle | -40°C à +85°C |
| Plage extended | -40°C à +105°C |
| Attaque cold | < -40°C (data remanence) |
| Attaque hot | > 125°C (fault injection) |

**Types d'attaques thermiques :**
| Attaque | Température | Effet recherché |
|---------|-------------|-----------------|
| Cold boot | < -20°C | Ralentir decay SRAM, extraire clés |
| Freeze spray | -50°C | Data remanence mémoire |
| Hot fault | > 100°C | Fault injection, bit flips |
| Thermal cycling | ±50°C rapide | Fatigue, désoudage |

**Contremesures :**
- Capteurs de température intégrés
- Shutdown automatique hors plage
- Zeroization rapide si anomalie
- Masquage thermique des clés
- SRAM randomization au boot

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** : Capteurs température, shutdown
- **Coldcard** : Operating range -10°C à +50°C
- **Trezor** : Protection basique

### Secure Elements
- **SE050** : Sensors intégrés, shutdown auto
- **ATECC608** : Température monitoring
- **ST33** (Ledger) : Comprehensive thermal protection

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| Complet | Sensors + shutdown + zeroization + alerts | 100% |
| Standard | Sensors + shutdown | 70% |
| Basique | Passive protection | 40% |
| Absent | Pas de protection thermique | 0% |

## 5. Sources et Références

- [Cold Boot Attacks](https://citp.princeton.edu/our-work/memory/)
- SafeScoring Criteria S-ADD-008 v1.0
""",

    # S-ADD-009: FIB Attack Resistance
    7094: """## 1. Vue d'ensemble

La **FIB Attack Resistance** (résistance aux attaques FIB - Focused Ion Beam) évalue la protection contre les attaques de laboratoire utilisant des faisceaux d'ions focalisés pour modifier ou sonder les circuits intégrés au niveau microscopique.

Les attaques FIB sont parmi les plus sophistiquées et nécessitent un équipement coûteux (>$500k) et une expertise avancée.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Équipement | FIB/SEM station ($500k-$2M) |
| Résolution | 5-50 nm |
| Attaques possibles | Circuit edit, probing, bypass |
| Temps attaque | Heures à jours |
| Coût attaque | $10k-$100k par tentative |

**Types d'attaques FIB :**
| Type | Description | Contremesure |
|------|-------------|--------------|
| Circuit edit | Couper/reconnecter pistes | Mesh shields |
| Micro-probing | Sonder signaux internes | Active shields |
| ROM edit | Modifier firmware | Integrity checks |
| Fuse bypass | Contourner sécurité | Redundancy |

**Contremesures CC EAL5+ :**
- Multi-layer active shields
- Dummy metal layers
- Encrypted buses
- Randomized layout
- Integrity monitoring

## 3. Application aux Produits Crypto

### Secure Elements
- **CC EAL5+** : Requis pour résistance FIB basique
- **CC EAL6+** : Résistance avancée (SE050, OPTIGA)
- Ledger ST33 : Résistance FIB documentée

### Hardware Wallets
- SE certifiés offrent protection native
- MCU seul : vulnérable

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| SE CC EAL6+ (FIB resistant) | 100% |
| SE CC EAL5+ | 80% |
| SE non certifié | 40% |
| Sans SE | 10% |

## 5. Sources et Références

- [FIB Attacks on Smartcards](https://www.iacr.org/archive/ches2002/24620244/24620244.pdf)
- [Common Criteria - Attack Potential](https://www.commoncriteriaportal.org/)
- SafeScoring Criteria S-ADD-009 v1.0
""",

    # S-ADD-010: Probing Attack Resistance
    7095: """## 1. Vue d'ensemble

La **Probing Attack Resistance** évalue la protection contre les attaques par sondage physique où un attaquant utilise des micro-sondes pour lire directement les signaux électriques sur le circuit intégré.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Équipement | Probing station + microscope |
| Taille sondes | 100nm - 1µm |
| Signaux ciblés | Bus de données, clés en transit |
| Protection | Active shields, encryption |

**Contremesures :**
- Active shielding mesh
- Bus encryption (scrambling)
- Dummy operations
- Détection de contact
- Zeroization on tamper

## 3. Application aux Produits Crypto

### Secure Elements
- Tous SE certifiés CC EAL5+ incluent protection probing
- Design rules : critical signals sous mesh

### Hardware Wallets
- Protection dépend du SE utilisé

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| SE avec active mesh + detection | 100% |
| SE avec passive protection | 70% |
| MCU standard | 20% |

## 5. Sources et Références

- SafeScoring Criteria S-ADD-010 v1.0
""",

    # S-ADD-011: X-ray Attack Resistance
    7096: """## 1. Vue d'ensemble

La **X-ray Attack Resistance** évalue la protection contre les techniques d'imagerie par rayons X utilisées pour analyser la structure interne des circuits intégrés et potentiellement identifier des faiblesses.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Technique | X-ray tomography, CT scan |
| Résolution | 1-10 µm |
| Information révélée | Layout, routing, structure |
| Coût équipement | $50k-$200k |

**Contremesures :**
- Multi-layer metallisation
- Dummy structures
- Randomized layout
- Encrypted flash (contenu illisible même si layout visible)

## 3. Application aux Produits Crypto

### Secure Elements
- CC EAL5+ : Design résistant à l'analyse X-ray
- Layout analysis ne révèle pas les clés

### Note
- X-ray seul ne permet pas extraction de clés
- Combiné avec autres attaques (FIB) plus dangereux

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| SE certifié + encrypted storage | 100% |
| SE certifié standard | 80% |
| MCU standard | 40% |

## 5. Sources et Références

- SafeScoring Criteria S-ADD-011 v1.0
""",

    # S-ADD-012: Power Analysis Countermeasures
    7097: """## 1. Vue d'ensemble

Les **Power Analysis Countermeasures** (contremesures contre l'analyse de puissance) évaluent la protection contre les attaques SPA (Simple Power Analysis) et DPA (Differential Power Analysis) qui exploitent les variations de consommation électrique pour extraire des informations sur les clés cryptographiques.

Ces attaques sont parmi les plus pratiques et ne nécessitent pas d'équipement très coûteux.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Attaque | Complexité | Équipement | Efficacité |
|---------|------------|------------|------------|
| SPA | Basse | Oscilloscope $1k | Simple clés |
| DPA | Moyenne | Scope + PC | AES, RSA keys |
| HO-DPA | Haute | Scope avancé | Masked implem |

**Contremesures standardisées :**
| Technique | Description | Overhead |
|-----------|-------------|----------|
| Masking | Randomize intermédiaires | 2-4x |
| Shuffling | Ordre opérations aléatoire | 1.5x |
| Dummy ops | Opérations factices | 1.2x |
| Constant power | Consommation constante | 2-3x |
| Dual-rail logic | Encoding auto-complémentaire | 2x |

**Mesures quantitatives :**
- Traces nécessaires pour DPA (sans protection) : ~1,000
- Avec masking 1er ordre : ~1,000,000
- Avec masking 2ème ordre : >100,000,000

## 3. Application aux Produits Crypto

### Secure Elements
- **SE050** : DPA-resistant (contremesures intégrées)
- **ATECC608** : Hardened against DPA
- **ST33** : Comprehensive SCA protection

### Hardware Wallets
- **Ledger** : ST33 SE (high DPA resistance)
- **Trezor** : MCU software masking
- **Coldcard** : SE + software countermeasures

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| Complet | Hardware masking + shuffling + constant-time | 100% |
| Avancé | Hardware DPA protection | 80% |
| Basique | Software masking | 50% |
| Absent | Pas de protection | 0% |

## 5. Sources et Références

- [DPA Attack](https://www.paulkocher.com/doc/DifferentialPowerAnalysis.pdf) - Kocher et al.
- [NIST Side-Channel Recommendations](https://csrc.nist.gov/)
- SafeScoring Criteria S-ADD-012 v1.0
""",

    # S-ADD-013: EM Analysis Countermeasures
    7098: """## 1. Vue d'ensemble

Les **EM Analysis Countermeasures** (contremesures contre l'analyse électromagnétique) évaluent la protection contre les attaques SEMA (Simple EM Analysis) et DEMA (Differential EM Analysis) qui mesurent les émissions électromagnétiques pour extraire des informations cryptographiques.

Ces attaques sont similaires au power analysis mais peuvent être réalisées sans contact physique.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Équipement | Sonde EM + oscilloscope |
| Distance | 1mm - 10cm |
| Fréquence | 100MHz - 10GHz |
| Résolution spatiale | ~100µm |

**Contremesures :**
- Blindage EM (Faraday cage dans package)
- Réduction émissions (filtering)
- Masking (comme DPA)
- Randomisation timing
- Package métallique

## 3. Application aux Produits Crypto

### Secure Elements
- **CC EAL5+** : Protection EM requise
- **SE050, ATECC608** : Contremesures intégrées

### Hardware Wallets
- Packaging métal aide mais insuffisant seul
- Protection SE principale

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| SE + shielding complet | 100% |
| SE avec contremesures | 80% |
| MCU avec masking | 50% |

## 5. Sources et Références

- [EM Analysis of Smartcards](https://www.iacr.org/)
- SafeScoring Criteria S-ADD-013 v1.0
""",

    # S-ADD-014: Timing Attack Countermeasures
    7099: """## 1. Vue d'ensemble

Les **Timing Attack Countermeasures** (contremesures contre les attaques temporelles) évaluent la protection contre les attaques qui exploitent les variations du temps d'exécution des opérations cryptographiques pour déduire des informations sur les clés secrètes.

Ces attaques sont souvent réalisables à distance (réseau) et ne nécessitent pas d'accès physique.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Attaque | Vecteur | Précision requise |
|---------|---------|-------------------|
| Cache timing | Local | ~1 ns |
| Remote timing | Network | ~1 µs |
| Spectre/Meltdown | CPU | ~1 ns |

**Contremesures :**
| Technique | Description |
|-----------|-------------|
| Constant-time | Temps identique quel que soit l'input |
| Blinding | Randomiser les inputs |
| Time padding | Ajouter délai aléatoire |
| Cache isolation | Flush cache avant/après |

**Algorithmes vulnérables (si mal implémentés) :**
- RSA (branching sur bits clé)
- ECDSA (scalar multiplication)
- AES (table lookup)

**Implémentations constante-time :**
- libsodium : Constant-time by design
- OpenSSL : BN_bn2bin_padded, etc.
- BoringSSL : Hardened

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** : Constant-time dans applet
- **Trezor** : trezor-crypto library (constant-time)
- **Coldcard** : Careful implementation

### Software Wallets
- Dépend de la crypto library utilisée
- libsecp256k1 (Bitcoin) : Constant-time

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Constant-time vérifié + fuzzé | 100% |
| Library réputée (libsecp256k1) | 90% |
| Implémentation non vérifiée | 40% |

## 5. Sources et Références

- [Timing Attacks on Implementations of DH, RSA, DSS](http://www.cryptography.com/timingattack)
- [libsecp256k1](https://github.com/bitcoin-core/secp256k1)
- SafeScoring Criteria S-ADD-014 v1.0
""",

    # S-ADD-015: Fault Injection Countermeasures
    7100: """## 1. Vue d'ensemble

Les **Fault Injection Countermeasures** (contremesures contre l'injection de fautes) évaluent la protection contre les attaques qui perturbent intentionnellement le fonctionnement du processeur (glitch voltage, laser, EM) pour induire des erreurs exploitables.

Ces attaques peuvent forcer un appareil à révéler des secrets ou contourner des vérifications de sécurité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type | Équipement | Coût | Efficacité |
|------|------------|------|------------|
| Voltage glitch | Générateur d'impulsions | $1k | Haute |
| Clock glitch | Générateur de signaux | $1k | Haute |
| EM fault | Sonde EM + amplificateur | $10k | Moyenne |
| Laser fault | Laser + positionnement | $50k | Très haute |
| Light fault | Flash intense | $100 | Basse |

**Contremesures matérielles :**
- Capteurs de glitch (voltage, clock)
- Redundant execution
- Error detection codes (EDC)
- Zeroization on fault
- Light sensors (decapsulation)

**Contremesures logicielles :**
- Double computation + compare
- Integrity checks périodiques
- Canaries
- Defensive coding (avoid == comparisons)

## 3. Application aux Produits Crypto

### Secure Elements
- **CC EAL5+** : Mandatory fault protection
- **SE050** : Comprehensive fault detection
- **ST33** : Advanced glitch detection

### Hardware Wallets
- **Ledger** : SE protection + software checks
- **Coldcard** : Glitch detection active
- **Trezor** : Software countermeasures

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| SE + software double-check | 100% |
| SE protection seule | 80% |
| Software countermeasures | 50% |
| Absent | 10% |

## 5. Sources et Références

- [Fault Attacks on RSA](https://eprint.iacr.org/2003/075.pdf)
- [Practical Fault Attack on BB84](https://www.iacr.org/)
- SafeScoring Criteria S-ADD-015 v1.0
""",

    # S-ADD-016: MCU STM32L4
    7101: """## 1. Vue d'ensemble

Le **STM32L4** est une famille de microcontrôleurs ARM Cortex-M4 de STMicroelectronics, largement utilisée dans les hardware wallets et appareils IoT pour sa combinaison performance/consommation et ses fonctionnalités de sécurité.

Contrairement aux Secure Elements, les MCU STM32 ne sont pas certifiés CC EAL5+ mais offrent des fonctionnalités de sécurité de base.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Fabricant | STMicroelectronics |
| Core | ARM Cortex-M4F @ 80-120 MHz |
| Flash | 256KB - 2MB |
| RAM | 64KB - 640KB |
| Crypto | AES-256 hardware (certains modèles) |
| RNG | TRNG (True Random Number Generator) |
| Secure boot | ECDSA signature verification |
| Protection | RDP levels, PCROP, firewall |

**Fonctionnalités de sécurité :**
| Feature | Description |
|---------|-------------|
| RDP Level 2 | Protection lecture flash (permanent) |
| PCROP | Code protection (execute-only) |
| Firewall | Isolation segments mémoire |
| AES accelerator | Hardware AES-128/256 |
| TRNG | Random number generation |
| Tamper detection | 5 tamper inputs |

**Limitations sécurité :**
- Pas de certification CC EAL
- Vulnérable aux attaques invasives sophistiquées
- Pas de secp256k1 hardware (calcul software)

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Trezor One** : STM32F2
- **Trezor Model T** : STM32F4
- **Coldcard** : STM32L4 + SE
- **Ledger** : STM32WB (host) + SE (crypto)

### Recommandation
- MCU STM32 pour logique + SE pour crypto
- MCU seul : sécurité insuffisante pour clés de valeur

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| STM32 + SE dédié | 90% |
| STM32 hardened (RDP2 + PCROP) | 50% |
| STM32 basique | 30% |

## 5. Sources et Références

- [STM32L4 Reference Manual](https://www.st.com/resource/en/reference_manual/rm0351-stm32l4x5-and-stm32l4x6-advanced-armbased-32bit-mcus-stmicroelectronics.pdf)
- SafeScoring Criteria S-ADD-016 v1.0
""",

    # S-ADD-017: MCU STM32U5
    7102: """## 1. Vue d'ensemble

Le **STM32U5** est la génération la plus récente de MCU ultra-low-power de STMicroelectronics avec des améliorations significatives en matière de sécurité, incluant les premières certifications PSA et SESIP.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Fabricant | STMicroelectronics |
| Core | ARM Cortex-M33 @ 160 MHz |
| TrustZone | Arm TrustZone-M intégré |
| Certification | PSA Certified Level 2, SESIP |
| Crypto | AES-256, SHA-256, PKA (ECC), TRNG |
| Flash | 512KB - 4MB |
| Secure storage | OTFDEC (encrypted flash) |

**Améliorations vs STM32L4 :**
- TrustZone : isolation hardware secure/non-secure
- PKA : Hardware accelerator ECC (y compris secp256k1)
- OTFDEC : Chiffrement flash on-the-fly
- SRAM ECC : Détection erreurs mémoire
- Certifications sécurité (PSA, SESIP)

## 3. Application aux Produits Crypto

### Hardware Wallets
- Futur candidat pour wallets sans SE
- TrustZone + PKA offrent protection décente
- Toujours inférieur à SE EAL5+ pour haute valeur

### Recommandation
- Acceptable pour wallets d'entrée de gamme
- SE recommandé pour montants significatifs

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| STM32U5 TrustZone + SE | 95% |
| STM32U5 seul (bien configuré) | 60% |
| STM32L4 seul | 40% |

## 5. Sources et Références

- [STM32U5 Security](https://www.st.com/en/microcontrollers-microprocessors/stm32u5-series/security.html)
- [PSA Certified](https://www.psacertified.org/)
- SafeScoring Criteria S-ADD-017 v1.0
""",

    # S-ADD-018: Secure Memory Encryption
    7103: """## 1. Vue d'ensemble

La **Secure Memory Encryption** évalue les mécanismes de chiffrement de la mémoire (RAM, Flash) pour protéger les données sensibles au repos et pendant l'exécution.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type | Algorithme | Protection |
|------|------------|------------|
| RAM encryption | AES-XTS | Cold boot attacks |
| Flash encryption | AES-256 | Extraction physique |
| On-the-fly (OTFDEC) | AES-CTR | Transparent |

**Implémentations :**
- **STM32U5 OTFDEC** : AES-256-CTR pour flash
- **SE050** : Encrypted secure storage
- **Intel TME** : Total Memory Encryption

## 3. Application aux Produits Crypto

### Secure Elements
- Encryption intégrée et obligatoire
- Clés de chiffrement uniques par device

### Hardware Wallets
- **Coldcard** : Flash storage chiffré
- **Ledger** : SE encrypted storage

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Full memory encryption (RAM + Flash) | 100% |
| Flash encryption only | 70% |
| Sensitive areas only | 40% |

## 5. Sources et Références

- SafeScoring Criteria S-ADD-018 v1.0
""",

    # S-ADD-019: Secure Key Storage
    7104: """## 1. Vue d'ensemble

Le **Secure Key Storage** évalue les mécanismes de stockage sécurisé des clés cryptographiques, garantissant qu'elles ne peuvent être extraites même avec un accès physique complet à l'appareil.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Niveau | Méthode | Protection |
|--------|---------|------------|
| Software | Encrypted file + key derivation | Faible |
| Hardware (fuse) | OTP fuses | Moyenne |
| Secure Element | Dedicated secure storage | Haute |
| HSM | Tamper-resistant enclosure | Très haute |

**Best practices :**
- Clés générées dans le SE, jamais exportées
- Wrapping keys pour transfert sécurisé
- Access control policies strictes
- Zeroization capability

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** : Clés dans ST33 (CC EAL6+)
- **Trezor** : Clés dans flash MCU (moins sécurisé)
- **Coldcard** : SE pour master secret

### Software Wallets
- OS keychain (iOS Secure Enclave, Android Keystore)
- Moins sécurisé que SE dédié

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| SE CC EAL5+ storage | 100% |
| Hardware security module | 90% |
| MCU secure storage | 50% |
| Encrypted file only | 20% |

## 5. Sources et Références

- SafeScoring Criteria S-ADD-019 v1.0
""",

    # S-ADD-020: Isolated Crypto Processor
    7105: """## 1. Vue d'ensemble

L'**Isolated Crypto Processor** évalue la présence d'un processeur cryptographique isolé qui exécute les opérations sensibles dans un environnement séparé du processeur principal.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Architecture | Isolation | Exemples |
|--------------|-----------|----------|
| Secure Element | Physique (chip séparé) | SE050, ST33, ATECC |
| TrustZone | Logique (même chip) | ARM Cortex-M33/A |
| Enclave | Hardware (même die) | Intel SGX, AMD SEV |
| Coprocessor | Bus séparé | Crypto accelerator |

**Avantages isolation :**
- Side-channel réduit (moins de leakage)
- Attack surface minimale
- Firmware séparé et auditable
- Memory protection

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** : SE isolé (ST33) + MCU application
- **Trezor Safe 3** : MCU + ATECC608 isolé
- **Coldcard** : MCU + SE + ATECC

### Recommandation
- SE physiquement séparé = meilleure isolation
- TrustZone = acceptable pour valeur moyenne

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| SE isolé + MCU séparé | 100% |
| TrustZone avec MPU | 70% |
| Crypto coprocessor | 60% |
| MCU monolithique | 30% |

## 5. Sources et Références

- [ARM TrustZone](https://www.arm.com/technologies/trustzone-for-cortex-m)
- SafeScoring Criteria S-ADD-020 v1.0
"""
}

def main():
    print("Saving Security summaries S-ADD-001 to S-ADD-020...")
    success = 0
    for norm_id, summary in summaries.items():
        url = f'{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}'
        data = {
            'summary': summary,
            'summary_status': 'generated',
            'last_summarized_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }
        resp = requests.patch(url, headers=SUPABASE_HEADERS, json=data)
        status = "OK" if resp.status_code in [200, 204] else f"ERR {resp.status_code}"
        print(f'ID {norm_id}: {status}')
        if resp.status_code in [200, 204]:
            success += 1
        time.sleep(0.3)
    print(f'\nDone! {success}/{len(summaries)} summaries saved.')

if __name__ == "__main__":
    main()
