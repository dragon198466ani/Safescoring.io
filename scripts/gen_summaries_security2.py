#!/usr/bin/env python3
"""Generate summaries for Security norms - S-ADD-021 to S-ADD-050."""

import requests
import sys
import time
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    # S-ADD-021: Hardware Firewall
    7106: """## 1. Vue d'ensemble

Le **Hardware Firewall** dans le contexte des hardware wallets désigne un mécanisme matériel d'isolation entre les différentes zones mémoire et périphériques, empêchant un composant compromis d'accéder aux données sensibles d'un autre.

Contrairement aux firewalls réseau, ce firewall hardware protège les bus internes du microcontrôleur.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Mécanisme | MPU/MMU hardware |
| Granularité | Régions mémoire (4KB-256KB) |
| Protections | Read/Write/Execute permissions |
| Exceptions | Violation triggers secure exception |

**Implémentations :**
- **STM32 Firewall** : Isolation code/data segments
- **ARM TrustZone** : Secure/Non-secure worlds
- **RISC-V PMP** : Physical Memory Protection

**Configuration typique :**
```
Region 0: Bootloader (RX, secure)
Region 1: Application (RWX, non-secure)
Region 2: Secrets (R, secure only)
Region 3: Peripherals (RW, access control)
```

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** : ST33 SE + MCU with firewall
- **Coldcard** : STM32L4 firewall entre app et SE
- **Trezor** : Moins d'isolation (MCU unique)

### Importance
- Empêche app malveillante d'accéder aux clés
- Limite impact d'une vulnérabilité

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Hardware firewall + TrustZone + SE | 100% |
| Hardware firewall seul | 70% |
| Software isolation uniquement | 30% |

## 5. Sources et Références

- [STM32 Firewall AN4838](https://www.st.com/resource/en/application_note/an4838.pdf)
- SafeScoring Criteria S-ADD-021 v1.0
""",

    # S-ADD-022: Secure Debug Disabled
    7107: """## 1. Vue d'ensemble

Le critère **Secure Debug Disabled** vérifie que les interfaces de debug (JTAG, SWD) sont désactivées en production, empêchant un attaquant de lire la mémoire ou contrôler l'exécution.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Interface | Description | Risque |
|-----------|-------------|--------|
| JTAG | IEEE 1149.1 | Accès mémoire complet |
| SWD | ARM Serial Wire Debug | Contrôle MCU |
| UART boot | Serial bootloader | Firmware extraction |

**Méthodes de désactivation :**
| Méthode | Réversibilité | Sécurité |
|---------|---------------|----------|
| Option bytes | Réversible avec clé | Moyenne |
| Fuse blow (RDP2) | Permanent | Haute |
| Remove pads | Physique | Moyenne |

**STM32 RDP Levels :**
- RDP0 : Debug fully enabled
- RDP1 : Debug disabled, can revert (wipes flash)
- RDP2 : Debug permanently disabled

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** : Debug désactivé (SE + MCU)
- **Coldcard** : RDP2 en production
- **Trezor** : Debug désactivé mais pads présents

### Vérification
- Test avec debugger doit échouer
- Absence de réponse JTAG/SWD

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Permanent disable (fuse) | 100% |
| Soft disable avec auth | 70% |
| Debug accessible | 0% |

## 5. Sources et Références

- [ARM CoreSight Debug](https://developer.arm.com/documentation/)
- SafeScoring Criteria S-ADD-022 v1.0
""",

    # S-ADD-023: JTAG Disabled
    8062: """## 1. Vue d'ensemble

Le critère **JTAG Disabled** vérifie spécifiquement que l'interface JTAG (Joint Test Action Group, IEEE 1149.1) est désactivée, car c'est la méthode la plus commune pour attaquer les microcontrôleurs.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Standard | IEEE 1149.1 (JTAG) |
| Signaux | TCK, TMS, TDI, TDO, TRST |
| Capacités | Boundary scan, debug, flash |
| Vitesse | Jusqu'à 50 MHz |

**Risques si activé :**
- Lecture/écriture mémoire arbitraire
- Extraction firmware complet
- Modification code en exécution
- Bypass de toute protection logicielle

**Désactivation :**
- Fuse programming (permanent)
- Debug authentication (clé requise)
- Pin removal (physique)

## 3. Application aux Produits Crypto

### Hardware Wallets
- Tous doivent désactiver JTAG en production
- Vérifiable avec scanner JTAG

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| JTAG fusé off | 100% |
| JTAG disabled réversible | 60% |
| JTAG accessible | 0% |

## 5. Sources et Références

- IEEE 1149.1 Standard
- SafeScoring Criteria S-ADD-023 v1.0
""",

    # S-ADD-024: SWD Disabled
    7109: """## 1. Vue d'ensemble

Le critère **SWD Disabled** vérifie que l'interface SWD (Serial Wire Debug) d'ARM est désactivée. SWD est une alternative à JTAG avec seulement 2 fils mais des capacités similaires.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Signaux | SWDIO, SWCLK (2 fils) |
| Vitesse | Jusqu'à 50 MHz |
| Capacités | Debug, flash, trace |
| Compatibilité | ARM Cortex-M uniquement |

**Avantages attaquant :**
- Moins de signaux = plus facile à connecter
- Même capacités que JTAG
- Souvent oublié quand JTAG désactivé

**Désactivation :**
- Même méthodes que JTAG
- Attention : désactiver les DEUX

## 3. Application aux Produits Crypto

### Hardware Wallets ARM
- Trezor, Coldcard, Ledger MCU : ARM Cortex
- Tous doivent désactiver SWD

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| SWD + JTAG fusés off | 100% |
| Un seul désactivé | 50% |
| Accessibles | 0% |

## 5. Sources et Références

- ARM CoreSight SWD Protocol
- SafeScoring Criteria S-ADD-024 v1.0
""",

    # S-ADD-025 to S-ADD-030: Fingerprint sensors
    7110: """## 1. Vue d'ensemble

Le **Capacitive Fingerprint** désigne les capteurs d'empreintes digitales capacitifs qui mesurent les différences de capacité électrique entre les crêtes et vallées de l'empreinte.

C'est la technologie la plus courante dans les smartphones et hardware wallets avec biométrie.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Technologie | Capacitive sensing |
| Résolution | 500-700 dpi |
| Surface | 10x10mm à 15x15mm |
| FAR typique | < 0.002% |
| FRR typique | < 2% |
| Temps capture | < 300ms |

**Avantages :**
- Mature et fiable
- Faible coût
- Difficile à tromper avec images 2D

**Limitations :**
- Sensible à l'humidité/sécheresse
- Usure possible du capteur
- Latent fingerprint possible

## 3. Application aux Produits Crypto

### Hardware Wallets avec fingerprint
- **Keystone** : Capteur capacitif intégré
- Pas encore standard dans l'industrie

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Fingerprint + PIN fallback + anti-spoof | 100% |
| Fingerprint basique | 70% |
| Pas de biométrie | N/A |

## 5. Sources et Références

- ISO/IEC 19795 Biometric Performance Testing
- SafeScoring Criteria S-ADD-025 v1.0
""",

    7111: """## 1. Vue d'ensemble

Le **Optical Fingerprint** désigne les capteurs d'empreintes optiques qui utilisent une source lumineuse et un capteur CMOS pour capturer l'image de l'empreinte.

Moins courant dans les hardware wallets mais utilisé dans les smartphones récents (sous l'écran).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Technologie | CMOS + LED/OLED light |
| Résolution | 300-500 dpi |
| Placement | Sous écran possible |
| FAR | 0.01% - 0.001% |
| FRR | 1% - 3% |

**Avantages :**
- Grande surface de capture
- Intégration sous écran
- Moins sensible à l'humidité

**Limitations :**
- Plus facile à tromper (photos)
- Consommation plus élevée
- Plus cher

## 3. Application aux Produits Crypto

- Rare dans hardware wallets actuels
- Potentiel futur avec écrans intégrés

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Optical + liveness detection | 90% |
| Optical basique | 60% |

## 5. Sources et Références

- SafeScoring Criteria S-ADD-026 v1.0
""",

    7112: """## 1. Vue d'ensemble

Le **Ultrasonic Fingerprint** utilise des ondes ultrasoniques pour créer une image 3D de l'empreinte, offrant une sécurité supérieure aux méthodes optiques ou capacitives.

Technologie la plus avancée mais aussi la plus coûteuse.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Technologie | Piezoelectric ultrasound |
| Fréquence | 5-20 MHz |
| Capture | 3D depth map |
| FAR | < 0.0001% |
| FRR | < 1% |
| Anti-spoof | Natif (3D) |

**Avantages :**
- Image 3D (difficile à falsifier)
- Fonctionne avec doigts mouillés/sales
- Liveness detection intrinsèque

**Limitations :**
- Coût élevé
- Taille du module
- Consommation

## 3. Application aux Produits Crypto

- Non disponible actuellement dans hardware wallets
- Technologie premium pour futur

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Ultrasonic fingerprint | 100% |
| Capacitive avec anti-spoof | 80% |

## 5. Sources et Références

- Qualcomm 3D Sonic Sensor
- SafeScoring Criteria S-ADD-027 v1.0
""",

    7113: """## 1. Vue d'ensemble

Le **Multi-finger Support** évalue la capacité d'enregistrer et utiliser plusieurs doigts pour l'authentification, offrant flexibilité et résilience (si un doigt est blessé).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Recommandation |
|-----------|----------------|
| Doigts minimum | 2 (fallback) |
| Doigts recommandés | 4-6 |
| Stockage template | 1-2 KB par doigt |
| Limite pratique | 10 doigts max |

**Configuration recommandée :**
- Index droit + Index gauche (usage normal)
- Pouce (usage rapide)
- Doigt de backup (annulaire)

## 3. Application aux Produits Crypto

- Augmente usabilité
- Résilience si blessure
- Permet accès d'urgence (trusted person)

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| 4+ doigts supportés | 100% |
| 2-3 doigts | 70% |
| 1 doigt uniquement | 40% |

## 5. Sources et Références

- SafeScoring Criteria S-ADD-028 v1.0
""",

    7114: """## 1. Vue d'ensemble

Le critère **FAR < 0.001%** (False Acceptance Rate) mesure la probabilité qu'un système biométrique accepte incorrectement un imposteur. Un FAR de 0.001% signifie 1 fausse acceptation sur 100,000 tentatives.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Niveau FAR | Qualité | Sécurité |
|------------|---------|----------|
| 1% | Faible | Non recommandé |
| 0.1% | Moyenne | Acceptable |
| 0.01% | Bonne | Standard |
| 0.001% | Excellente | Haute sécurité |
| 0.0001% | Premium | Très haute sécurité |

**Standards :**
- **FIDO2** : FAR < 0.01% requis
- **NIST** : FAR dépend de l'application
- **Banque** : FAR < 0.001% typique

**Facteurs influençant FAR :**
- Qualité du capteur
- Algorithme de matching
- Conditions environnementales
- Taille de la base d'utilisateurs

## 3. Application aux Produits Crypto

- Hardware wallets avec biométrie doivent viser FAR < 0.001%
- Balance avec FRR (trop strict = utilisateur bloqué)

## 4. Critères d'Évaluation SafeScoring

| FAR | Points |
|-----|--------|
| < 0.0001% | 100% |
| < 0.001% | 90% |
| < 0.01% | 70% |
| > 0.01% | 40% |

## 5. Sources et Références

- ISO/IEC 19795-1 Biometric Performance Testing
- SafeScoring Criteria S-ADD-029 v1.0
""",

    7115: """## 1. Vue d'ensemble

Le critère **FRR < 1%** (False Rejection Rate) mesure la probabilité qu'un système biométrique rejette incorrectement un utilisateur légitime. Un FRR de 1% signifie 1 rejet sur 100 tentatives légitimes.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Niveau FRR | Expérience utilisateur |
|------------|------------------------|
| 5% | Frustrante |
| 2% | Acceptable |
| 1% | Bonne |
| 0.5% | Excellente |
| 0.1% | Premium |

**Trade-off FAR/FRR :**
- Diminuer FAR augmente FRR (et vice versa)
- Optimal : FAR < 0.001% et FRR < 1%
- EER (Equal Error Rate) : point où FAR = FRR

## 3. Application aux Produits Crypto

- FRR trop élevé = utilisateurs frustrés
- Doit avoir PIN fallback obligatoire

## 4. Critères d'Évaluation SafeScoring

| FRR | Points |
|-----|--------|
| < 0.5% | 100% |
| < 1% | 90% |
| < 2% | 70% |
| > 2% | 50% |

## 5. Sources et Références

- ISO/IEC 19795-1
- SafeScoring Criteria S-ADD-030 v1.0
""",

    # S-ADD-031 to S-ADD-034: RNG
    7116: """## 1. Vue d'ensemble

Le **Thermal Noise RNG** (Random Number Generator basé sur le bruit thermique) exploite les fluctuations thermiques aléatoires dans les résistances ou transistors pour générer de l'entropie.

C'est l'une des sources d'entropie physique les plus fiables.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Source | Johnson-Nyquist noise |
| Formule | V² = 4kTRΔf |
| Température | Augmente avec T |
| Débit typique | 100 kbps - 10 Mbps |
| Qualité | Haute entropie |

**Avantages :**
- Source physique vraiment aléatoire
- Difficile à manipuler
- Base théorique solide (thermodynamique)

**Post-processing :**
- Von Neumann debiasing
- Hash (SHA-256) pour uniformité
- Health monitoring continu

## 3. Application aux Produits Crypto

### Secure Elements
- La plupart utilisent thermal noise TRNG
- SE050, ATECC608, ST33 : TRNG intégré

### Hardware Wallets
- Essentiel pour génération de seed
- Qualité RNG = sécurité des clés

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Thermal TRNG + health tests | 100% |
| Autre TRNG physique | 90% |
| PRNG seul | 30% |

## 5. Sources et Références

- NIST SP 800-90B (Entropy Sources)
- SafeScoring Criteria S-ADD-031 v1.0
""",

    7117: """## 1. Vue d'ensemble

Le **Shot Noise RNG** exploite le bruit de grenaille (shot noise) généré par le passage discret d'électrons à travers une jonction semi-conductrice.

Source d'entropie quantique au niveau fondamental.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Source | Discrete electron flow |
| Formule | I² = 2qIΔf |
| Origine | Quantique |
| Débit | Variable |

**Caractéristiques :**
- Basé sur discrétion de la charge
- Indépendant de la température
- Origine quantique (vraiment aléatoire)

## 3. Application aux Produits Crypto

- Utilisé dans certains TRNG avancés
- Combiné avec autres sources

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Shot noise TRNG | 100% |

## 5. Sources et Références

- SafeScoring Criteria S-ADD-032 v1.0
""",

    7118: """## 1. Vue d'ensemble

Le **Ring Oscillator RNG** utilise plusieurs oscillateurs en anneau dont la phase relative varie de manière imprévisible pour générer de l'entropie.

Très courant dans les FPGA et MCU sans TRNG dédié.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Structure | Odd number of inverters in ring |
| Source entropie | Jitter de phase |
| Débit | 1-100 Mbps |
| Implémentation | Full digital (no analog) |

**Avantages :**
- Pure digital, facile à implémenter
- Fonctionne dans FPGA/ASIC
- Faible surface

**Risques :**
- Peut être manipulé (EM injection)
- Jitter peut être déterministe
- Nécessite multiple oscillators

## 3. Application aux Produits Crypto

- Fallback si pas de TRNG dédié
- Doit être combiné avec autres sources

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Ring osc + thermal + mixing | 90% |
| Ring oscillator seul | 60% |

## 5. Sources et Références

- SafeScoring Criteria S-ADD-033 v1.0
""",

    7119: """## 1. Vue d'ensemble

Le critère **NIST SP 800-90B Compliant** vérifie que la source d'entropie est conforme aux recommandations du NIST pour les générateurs d'entropie.

NIST SP 800-90B définit les tests et exigences pour valider les sources d'entropie.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Test | Description |
|------|-------------|
| Sanity Check | Données non constantes |
| Collision Test | Distribution uniforme |
| Markov Test | Indépendance |
| Compression Test | Entropie suffisante |
| Restart Test | Reproductibilité |
| Min-entropy | ≥ 0.5 bits/sample minimum |

**Exigences NIST SP 800-90B :**
- Health tests continus
- Min-entropy estimation
- Documentation source d'entropie
- Conditioning components

**Certification :**
- CAVP (Cryptographic Algorithm Validation Program)
- CMVP (Cryptographic Module Validation Program)

## 3. Application aux Produits Crypto

### Secure Elements
- SE certifiés passent généralement
- ST33, SE050 : conformes

### Importance
- Garantie qualité entropie
- Requis pour FIPS 140-3

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| NIST SP 800-90B certified | 100% |
| Tests passés (non certifié) | 80% |
| Non vérifié | 40% |

## 5. Sources et Références

- [NIST SP 800-90B](https://csrc.nist.gov/publications/detail/sp/800-90b/final)
- SafeScoring Criteria S-ADD-034 v1.0
""",

    # S-ADD-035 to S-ADD-038: Boot Security
    7120: """## 1. Vue d'ensemble

L'**Immutable Bootloader** est un bootloader stocké en mémoire non-modifiable (ROM, OTP fuses) qui ne peut être altéré même par le fabricant après production.

C'est la base de la chaîne de confiance (Root of Trust).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Stockage | ROM, OTP, fuses |
| Taille | 4KB - 64KB typique |
| Modifiable | Non (par design) |
| Fonctions | Verify signature, load next stage |

**Responsabilités :**
- Vérifier signature du stage suivant
- Initialiser hardware sécurité de base
- Configurer protections mémoire
- Pas de fonctionnalité updatable

**Implémentations :**
- **STM32** : System Memory Boot (option bytes)
- **NXP** : ROM bootloader
- **SE** : Embedded boot ROM

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** : Boot ROM dans SE
- **Coldcard** : Bootloader en OTP
- **Trezor** : Bootloader flashable (moins sécurisé)

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Immutable boot ROM | 100% |
| OTP fused bootloader | 90% |
| Flash bootloader (protected) | 60% |
| Modifiable bootloader | 30% |

## 5. Sources et Références

- SafeScoring Criteria S-ADD-035 v1.0
""",

    8063: """## 1. Vue d'ensemble

Le **Measured Boot** (démarrage mesuré) enregistre cryptographiquement chaque étape du boot (hash de chaque composant) dans un registre sécurisé (PCR/TPM), permettant une vérification a posteriori de l'intégrité.

Contrairement au Secure Boot qui bloque un boot invalide, le Measured Boot permet au système de démarrer mais enregistre les anomalies.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Mécanisme | Extend PCRs avec hashes |
| Hash | SHA-256 typique |
| Stockage | TPM, SE, secure storage |
| Registres | PCR0-PCR23 (TPM) |

**Processus :**
```
PCR[n] = SHA256(PCR[n-1] || measurement)
```

**Composants mesurés :**
- Bootloader
- Firmware
- Configuration
- Application

## 3. Application aux Produits Crypto

### Hardware Wallets
- Moins courant que secure boot
- Utile pour forensics
- Combiné avec remote attestation

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Measured + Secure boot | 100% |
| Measured boot seul | 70% |
| Secure boot seul | 80% |

## 5. Sources et Références

- TCG (Trusted Computing Group) Specs
- SafeScoring Criteria S-ADD-036 v1.0
""",

    7122: """## 1. Vue d'ensemble

Le **Hardware Root of Trust** (racine de confiance matérielle) est un composant hardware immuable qui sert de fondation à toute la chaîne de sécurité. Il contient les clés et code initiaux auxquels tout le reste fait confiance.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Composant | Rôle |
|-----------|------|
| Boot ROM | Code initial immuable |
| Root keys | Clés de vérification signatures |
| Fuses | Configuration sécurité |
| Secure storage | Stockage secrets initiaux |

**Propriétés requises :**
- Immuable (non modifiable)
- Isolé (non accessible au software)
- Authentique (vérifié à la fabrication)
- Unique (clés per-device)

**Exemples :**
- Intel Boot Guard
- ARM TrustZone
- Apple Secure Enclave
- TPM (Trusted Platform Module)

## 3. Application aux Produits Crypto

### Hardware Wallets
- SE = Hardware Root of Trust
- Clés dérivées depuis root key unique
- Base de toute la sécurité

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Dedicated SE as RoT | 100% |
| MCU with RoT features | 70% |
| No hardware RoT | 30% |

## 5. Sources et Références

- TCG Root of Trust Specifications
- SafeScoring Criteria S-ADD-037 v1.0
""",

    8064: """## 1. Vue d'ensemble

La **Secure Boot Chain** (chaîne de démarrage sécurisée) désigne le processus où chaque étape du boot vérifie cryptographiquement la suivante avant de lui transférer le contrôle.

Si une étape est compromise, le boot s'arrête ou déclenche une action de sécurité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Étape | Vérifie | Signé par |
|-------|---------|-----------|
| ROM | Bootloader | OEM root key |
| Bootloader | Firmware | Firmware signing key |
| Firmware | App | App signing key |

**Algorithmes signature :**
- ECDSA P-256 ou Ed25519 (rapide)
- RSA-2048/4096 (legacy)

**Réponse à échec :**
- Halt (stop boot)
- Recovery mode
- Alert + continue (logging)

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** : Chaîne complète SE → MCU → App
- **Coldcard** : Boot sécurisé multi-stage
- **Trezor** : Bootloader → Firmware

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Full chain with HW RoT | 100% |
| Partial chain (bootloader vérifié) | 70% |
| No secure boot | 20% |

## 5. Sources et Références

- UEFI Secure Boot Specification
- SafeScoring Criteria S-ADD-038 v1.0
""",

    # S-ADD-039 to S-ADD-043: Certifications
    7124: """## 1. Vue d'ensemble

La certification **CC EAL4+** (Common Criteria Evaluation Assurance Level 4 augmenté) est un niveau de certification de sécurité reconnu internationalement qui évalue la conception et l'implémentation d'un produit contre des menaces définies.

EAL4+ est le niveau minimum recommandé pour les composants de sécurité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Niveau | Description | Rigueur |
|--------|-------------|---------|
| EAL1 | Fonctionnellement testé | Minimale |
| EAL2 | Structurellement testé | Basse |
| EAL3 | Méthodiquement testé | Moyenne |
| **EAL4** | Méthodiquement conçu, testé | Élevée |
| EAL5 | Semi-formellement conçu | Très élevée |
| EAL6 | Semi-formellement vérifié | Très haute |
| EAL7 | Formellement vérifié | Maximum |

**EAL4+ inclut :**
- ADV: Development documentation
- ALC: Life-cycle support
- ATE: Testing
- AVA: Vulnerability assessment (AVA_VAN.3+)

**Coût certification :**
- EAL4 : $100k - $300k
- Durée : 6-12 mois

## 3. Application aux Produits Crypto

### Secure Elements certifiés EAL4+
- Niveau minimum pour stockage clés crypto
- Moins cher que EAL5+

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| EAL5+ | 100% |
| EAL4+ | 80% |
| EAL3 | 50% |
| Non certifié | 30% |

## 5. Sources et Références

- [Common Criteria Portal](https://www.commoncriteriaportal.org/)
- ISO/IEC 15408
- SafeScoring Criteria S-ADD-039 v1.0
""",

    7125: """## 1. Vue d'ensemble

La certification **CC EAL5** est le niveau de sécurité recommandé pour les Secure Elements utilisés dans les hardware wallets. Il requiert une conception semi-formelle et des tests rigoureux.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Aspect | EAL5 Requirement |
|--------|------------------|
| Design | Semi-formal specification |
| Testing | Complete coverage |
| Vulnerability | AVA_VAN.4 (high attack potential) |
| Code | Modular, auditable |

**Produits certifiés EAL5+ :**
- ST33 (Ledger) : EAL6+
- ATECC608 : EAL5+
- SE050 : EAL6+
- OPTIGA Trust M : EAL6+

**Coût :**
- $300k - $500k
- Durée : 12-18 mois

## 3. Application aux Produits Crypto

### Standard pour hardware wallets sérieux
- Ledger, Keystone : EAL5+ SE
- Garantie contre attaques sophistiquées

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| EAL5 | 90% |
| EAL6+ | 100% |

## 5. Sources et Références

- Common Criteria CC v3.1
- SafeScoring Criteria S-ADD-040 v1.0
""",

    7126: """## 1. Vue d'ensemble

La certification **FIPS 140-3 Level 2** est le standard américain pour les modules cryptographiques, niveau 2 exigeant une protection physique de base et une authentification basée sur les rôles.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Aspect | Level 2 Requirement |
|--------|---------------------|
| Tamper evidence | Seals/coatings |
| Authentication | Role-based |
| Physical security | Production-grade |
| Self-tests | Power-up + conditional |

**Niveaux FIPS 140-3 :**
| Level | Physical Security |
|-------|-------------------|
| 1 | Aucune exigence |
| 2 | Tamper evidence (scellés) |
| 3 | Tamper resistance + response |
| 4 | Environmental protection |

**Algorithmes FIPS approved :**
- AES (128/192/256)
- SHA-2, SHA-3
- RSA (2048+)
- ECDSA (P-256, P-384, P-521)

## 3. Application aux Produits Crypto

- Niveau 2 : standard pour cloud HSM
- Hardware wallets : souvent non certifiés FIPS

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| FIPS 140-3 Level 3+ | 100% |
| FIPS 140-3 Level 2 | 80% |
| Non certifié FIPS | 60% |

## 5. Sources et Références

- [NIST FIPS 140-3](https://csrc.nist.gov/publications/detail/fips/140/3/final)
- SafeScoring Criteria S-ADD-041 v1.0
""",

    7127: """## 1. Vue d'ensemble

**FIPS 140-3 Level 3** exige une résistance physique aux tentatives de manipulation (tamper resistance) et l'effacement automatique des clés en cas de détection d'intrusion.

C'est le standard pour les HSM de production et les applications haute sécurité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Aspect | Level 3 Requirement |
|--------|---------------------|
| Tamper resistance | Hard coating/enclosure |
| Tamper response | Key zeroization |
| Authentication | Identity-based (multi-factor) |
| Interfaces | Separate input/output |
| Physical | Environmental protection partielle |

**Key zeroization :**
- Effacement automatique si intrusion détectée
- Temps < 100ms
- Vérifié par tests

## 3. Application aux Produits Crypto

### HSMs certifiés Level 3
- Thales Luna
- AWS CloudHSM
- Azure Dedicated HSM

### Hardware Wallets
- Peu sont Level 3 (coût)
- SE équivalent via CC EAL5+

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| FIPS 140-3 Level 3 | 100% |
| CC EAL5+ (équivalent) | 95% |
| Level 2 | 70% |

## 5. Sources et Références

- NIST FIPS 140-3
- SafeScoring Criteria S-ADD-042 v1.0
""",

    7128: """## 1. Vue d'ensemble

**FIPS 140-3 Level 4** est le niveau maximum, exigeant une protection environnementale complète (température, voltage) et une enveloppe physique imperméable aux attaques.

Très peu de produits atteignent ce niveau.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Aspect | Level 4 Requirement |
|--------|---------------------|
| Tamper | Complete envelope |
| Environmental | T, V, frequency monitoring |
| EFP/EFT | Protection obligatoire |
| Zeroization | Instantanée multi-trigger |
| Testing | Penetration testing requis |

**Protections environnementales :**
- Température : -100°C à +200°C détection
- Voltage : glitch detection
- EM : shielding complet
- Light : decapsulation detection

## 3. Application aux Produits Crypto

- Rare (HSM militaire/gouvernemental)
- Aucun hardware wallet consumer n'est Level 4

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| FIPS 140-3 Level 4 | 100% |
| Level 3 | 85% |

## 5. Sources et Références

- NIST FIPS 140-3
- SafeScoring Criteria S-ADD-043 v1.0
""",

    # S-ADD-044 to S-ADD-050: HSM and Security Features
    7129: """## 1. Vue d'ensemble

Un **Tamper-responsive HSM** (Hardware Security Module) est un module qui non seulement détecte les tentatives d'intrusion mais y répond automatiquement (typiquement en effaçant les clés).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Trigger | Response |
|---------|----------|
| Case opening | Key zeroization |
| Voltage anomaly | Shutdown + wipe |
| Temperature extreme | Alert + wipe |
| Probing detected | Immediate zeroization |

**Temps de réponse :**
- Détection : < 1ms
- Zeroization : < 100ms
- Total : < 200ms

## 3. Application aux Produits Crypto

### Enterprise Custody
- Fireblocks, BitGo : HSM tamper-responsive
- Anchorage : HSM fleet

### Hardware Wallets
- Coldcard : Tamper detection
- Ledger SE : Tamper sensors

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Full tamper-responsive HSM | 100% |
| SE with tamper detection | 80% |
| Basic tamper evidence | 50% |

## 5. Sources et Références

- SafeScoring Criteria S-ADD-044 v1.0
""",

    7130: """## 1. Vue d'ensemble

La **Key Zeroization** (mise à zéro des clés) est le processus d'effacement irréversible et complet des clés cryptographiques de la mémoire en réponse à un événement de sécurité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Exigence |
|-----------|----------|
| Temps | < 100ms (FIPS 140-3 Level 3) |
| Méthode | Overwrite + verify |
| Trigger | Tamper, panic, command |
| Couverture | Tous les secrets |

**Méthodes :**
- Active zeroization (écrire des zéros)
- Key destruction (désactiver accès)
- Physical destruction (fuse blow)

**Vérification :**
- Re-lecture après effacement
- Test fonctionnel (clé inutilisable)

## 3. Application aux Produits Crypto

### Toutes catégories
- Fonction critique pour tout stockage de clés
- Doit être testable

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Zeroization < 100ms + verified | 100% |
| Zeroization disponible | 80% |
| Pas de zeroization | 20% |

## 5. Sources et Références

- FIPS 140-3 Section 7.9
- SafeScoring Criteria S-ADD-045 v1.0
""",

    7131: """## 1. Vue d'ensemble

Le **Battery-backed Key Storage** utilise une batterie de secours pour maintenir les clés en RAM sécurisée même en cas de perte d'alimentation principale, permettant une zeroization contrôlée au lieu d'une perte de données.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Type batterie | Lithium coin cell, supercap |
| Durée backup | 1-10 ans |
| Tension | 3.0-3.3V |
| Courant | < 1µA (sleep) |

**Avantages :**
- Zeroization même sans alimentation
- Protection contre power-off attacks
- Tamper response même hors tension

## 3. Application aux Produits Crypto

### HSMs
- Standard dans HSM enterprise
- Permet audit même après incident

### Hardware Wallets
- Rare (coût, taille)
- Coldcard Mk4 : supercap pour tamper

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Battery backup + tamper | 100% |
| Supercap short-term | 70% |
| No backup power | 50% |

## 5. Sources et Références

- SafeScoring Criteria S-ADD-046 v1.0
""",

    8065: """## 1. Vue d'ensemble

Un **Secure Enclave** est un environnement d'exécution isolé hardware qui protège les données et le code même si le système d'exploitation principal est compromis.

Exemples : Apple Secure Enclave, ARM TrustZone, Intel SGX.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Implementation | Vendor | Isolation |
|----------------|--------|-----------|
| Secure Enclave | Apple | Separate chip |
| TrustZone | ARM | Same chip, HW partition |
| SGX | Intel | Encrypted memory enclaves |
| SEV | AMD | VM encryption |

**Propriétés :**
- Mémoire chiffrée et isolée
- Code vérifié au chargement
- Communication contrôlée avec monde normal
- Attestation possible

## 3. Application aux Produits Crypto

### Software Wallets mobiles
- iOS : Secure Enclave pour clés
- Android : TEE (TrustZone)

### Hardware Wallets
- SE dédié > Enclave intégrée
- Mais enclave utile pour MCU host

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Dedicated SE | 100% |
| Secure Enclave + software | 80% |
| TEE basique | 60% |
| No enclave | 30% |

## 5. Sources et Références

- Apple Secure Enclave Documentation
- ARM TrustZone Architecture
- SafeScoring Criteria S-ADD-047 v1.0
""",

    8066: """## 1. Vue d'ensemble

La **Memory Isolation** (isolation mémoire) garantit que différents composants logiciels ne peuvent pas accéder à la mémoire les uns des autres, protégeant les secrets même si un composant est compromis.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Mécanisme | Description |
|-----------|-------------|
| MPU | Memory Protection Unit |
| MMU | Memory Management Unit |
| SMPU | Secure MPU (TrustZone) |
| IOMMU | I/O memory protection |

**Configuration typique :**
- Regions read-only pour code
- Regions no-execute pour données
- Secrets en secure-only region

## 3. Application aux Produits Crypto

### Hardware Wallets
- Isolation entre app et SE communication
- Protection des buffers sensibles

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Full memory isolation (SE + MPU) | 100% |
| MPU configured properly | 70% |
| No memory protection | 20% |

## 5. Sources et Références

- ARM MPU Technical Reference
- SafeScoring Criteria S-ADD-048 v1.0
""",

    7134: """## 1. Vue d'ensemble

La **Secure World Isolation** (via ARM TrustZone) crée deux mondes distincts (Secure/Normal) avec des ressources hardware séparées, le monde Normal ne pouvant pas accéder au monde Secure.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Aspect | Secure World | Normal World |
|--------|--------------|--------------|
| Access | Full | Restricted |
| Memory | Secure RAM/Flash | Normal RAM |
| Peripherals | Secure-assignable | Remaining |
| Execution | TEE (Trusted) | REE (Rich) |

**Transition :**
- SMC (Secure Monitor Call) uniquement
- Moniteur contrôle transitions
- Context switch hardware

## 3. Application aux Produits Crypto

### MCU avec TrustZone (STM32U5)
- Secrets dans Secure World
- App dans Normal World
- Communication via SMC

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| TrustZone + TEE certifié | 90% |
| TrustZone basique | 70% |
| No world isolation | 40% |

## 5. Sources et Références

- ARM TrustZone for Cortex-M
- SafeScoring Criteria S-ADD-049 v1.0
""",

    8067: """## 1. Vue d'ensemble

La **Remote Attestation** (attestation distante) permet à un serveur de vérifier cryptographiquement l'état d'intégrité d'un appareil distant, confirmant que le firmware et la configuration sont authentiques.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Composant | Rôle |
|-----------|------|
| Attestation key | Signe les mesures |
| PCR values | État mesuré |
| Quote | Signature sur PCRs |
| Verifier | Serveur qui vérifie |

**Protocole typique :**
1. Verifier envoie nonce
2. Device mesure son état
3. Device signe (nonce + mesures)
4. Verifier vérifie signature + valeurs attendues

## 3. Application aux Produits Crypto

### Enterprise
- Vérifier intégrité avant opérations
- Detect firmware compromise

### Hardware Wallets
- Potential pour vérification remote
- Ledger Genuine Check (basique)

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Full remote attestation | 100% |
| Device attestation locale | 70% |
| Genuine check basique | 50% |
| Pas d'attestation | 30% |

## 5. Sources et Références

- TCG Remote Attestation
- SafeScoring Criteria S-ADD-050 v1.0
"""
}

def main():
    print("Saving Security summaries S-ADD-021 to S-ADD-050...")
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
        time.sleep(0.2)
    print(f'\nDone! {success}/{len(summaries)} summaries saved.')

if __name__ == "__main__":
    main()
