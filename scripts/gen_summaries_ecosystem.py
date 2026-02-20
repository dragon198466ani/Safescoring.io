#!/usr/bin/env python3
"""Generate summaries for Ecosystem norms - E-ADD-001 to E-ADD-030."""

import requests
import sys
import time
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    # Camera features
    7224: """## 1. Vue d'ensemble

Le critère **Auto-focus Camera** évalue la présence d'une caméra avec mise au point automatique pour le scan de QR codes, seed phrases sur plaques métal, ou preuves de backup.

L'auto-focus est essentiel pour une capture fiable sans manipulation utilisateur.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Type | Phase detection / Contrast AF |
| Distance focus | 5cm - infini |
| Temps AF | < 500ms |
| Modes | Macro, normal, continuous |

## 3. Application aux Produits Crypto

### Hardware Wallets avec caméra
- **Keystone Pro** : Caméra QR avec AF
- **Ellipal** : Caméra air-gapped avec AF
- **NGRAVE** : Scanner QR intégré

### Use cases
- Scan QR codes transactions
- Vérification backup métal
- Import addresses

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Auto-focus rapide (<300ms) | 100% |
| Auto-focus standard | 80% |
| Fixed focus | 50% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-001 v1.0
""",

    7225: """## 1. Vue d'ensemble

Le critère **Macro Lens** évalue la capacité de la caméra à effectuer une mise au point rapprochée pour scanner des QR codes de petite taille ou lire des inscriptions fines sur des plaques de backup métal.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Distance minimum | 3-10cm |
| Magnification | 1:2 à 1:1 |
| Champ de vision | 20-40mm @ 5cm |
| Résolution effective | >5 MP pour détails |

## 3. Application aux Produits Crypto

- Scan de QR codes compacts
- Lecture gravure sur métal
- Vérification détails sécurité

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Macro < 5cm | 100% |
| Macro < 10cm | 80% |
| Pas de macro | 50% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-002 v1.0
""",

    7226: """## 1. Vue d'ensemble

Le **LED Flash** améliore la capture d'image en conditions de faible luminosité, permettant le scan de QR codes dans l'obscurité ou la vérification de backups dans un coffre.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Puissance | 1-5W LED |
| Température | 5000-6500K (daylight) |
| Modes | On, Off, Auto, Torch |
| Couverture | ≥ zone caméra |

## 3. Application aux Produits Crypto

- Scan dans coffre-fort sombre
- Vérification de nuit
- Situations d'urgence

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| LED flash intégré | 100% |
| Pas de flash | 60% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-003 v1.0
""",

    7227: """## 1. Vue d'ensemble

Le critère **5MP+ Resolution** garantit une résolution de caméra suffisante pour capturer des QR codes denses et des détails fins avec fiabilité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Résolution | Pixels | QR density max |
|------------|--------|----------------|
| 2 MP | 1920x1080 | Version 10 |
| 5 MP | 2592x1944 | Version 20 |
| 8 MP | 3264x2448 | Version 30 |
| 12 MP | 4032x3024 | Version 40 |

**QR Code versions :**
- V10 : 57x57 modules
- V20 : 97x97 modules
- V40 : 177x177 modules (max)

## 3. Application aux Produits Crypto

- 5MP suffisant pour la plupart des QR codes crypto
- 8MP+ recommandé pour PSBT complexes

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| 8MP+ | 100% |
| 5-8MP | 90% |
| 2-5MP | 70% |
| <2MP | 40% |

## 5. Sources et Références

- ISO/IEC 18004 (QR Code)
- SafeScoring Criteria E-ADD-004 v1.0
""",

    # Display features
    7228: """## 1. Vue d'ensemble

Le critère **Resolution 320x240+** définit la résolution minimale d'écran pour afficher correctement les informations de transaction et les adresses complètes.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Résolution | Caractères | Lignes |
|------------|------------|--------|
| 128x64 | ~20 | 4 |
| 320x240 | ~40 | 15 |
| 480x320 | ~60 | 20 |

**320x240 (QVGA) :**
- Adresse Bitcoin complète visible
- Montant + frais lisibles
- QR code affichable (petit)

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger Nano X** : 128x64 (insuffisant)
- **Trezor Model T** : 240x240 (limite)
- **Keystone** : 480x800 (excellent)

## 4. Critères d'Évaluation SafeScoring

| Résolution | Points |
|------------|--------|
| 480x320+ | 100% |
| 320x240 | 80% |
| 128x64 | 50% |
| < 128x64 | 20% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-005 v1.0
""",

    7229: """## 1. Vue d'ensemble

Le critère **Resolution 480x320+** recommande une résolution supérieure pour une expérience utilisateur optimale, permettant l'affichage de QR codes lisibles et de transactions détaillées.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Résolution | Diagonale typique | PPI |
|------------|-------------------|-----|
| 480x320 | 3.5" | 165 |
| 480x800 | 4.0" | 233 |
| 720x1280 | 5.0" | 294 |

**Avantages 480x320+ :**
- QR code scannable par smartphone
- Transactions multi-output lisibles
- UI moderne possible

## 3. Application aux Produits Crypto

### Wallets avec écran HD
- **Keystone Pro** : 4" IPS 480x800
- **Ellipal Titan** : 4" touchscreen
- **NGRAVE ZERO** : 4" color

## 4. Critères d'Évaluation SafeScoring

| Résolution | Points |
|------------|--------|
| 720p+ | 100% |
| 480x320 | 90% |
| 320x240 | 70% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-006 v1.0
""",

    7230: """## 1. Vue d'ensemble

Le critère **IPS Display** évalue l'utilisation d'un écran IPS (In-Plane Switching) offrant de larges angles de vue et une reproduction fidèle des couleurs.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | IPS | TN | OLED |
|-----------|-----|-----|------|
| Angle de vue | 178° | 90° | 180° |
| Couleurs | 16.7M | 262K | 16.7M |
| Temps réponse | 4-8ms | 1-2ms | 0.1ms |
| Consommation | Moyenne | Basse | Variable |

**Avantages IPS :**
- Lisibilité sous tous les angles
- Couleurs précises (vérification visuelle)
- Pas de burn-in

## 3. Application aux Produits Crypto

- Vérification transactions à plusieurs personnes
- Affichage précis des QR codes couleur
- Usage en environnement varié

## 4. Critères d'Évaluation SafeScoring

| Type | Points |
|------|--------|
| AMOLED | 100% |
| IPS | 95% |
| TN | 60% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-007 v1.0
""",

    7231: """## 1. Vue d'ensemble

Le critère **TFT Display** note l'utilisation d'un écran TFT (Thin-Film Transistor), technologie standard pour les écrans LCD actifs.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type TFT | Caractéristique |
|----------|-----------------|
| TN-TFT | Rapide, angles limités |
| IPS-TFT | Angles larges |
| VA-TFT | Contraste élevé |

## 3. Application aux Produits Crypto

- Standard dans hardware wallets
- IPS-TFT préféré pour angles de vue

## 4. Critères d'Évaluation SafeScoring

| Type | Points |
|------|--------|
| IPS-TFT | 100% |
| VA-TFT | 90% |
| TN-TFT | 70% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-008 v1.0
""",

    7232: """## 1. Vue d'ensemble

Le critère **Brightness 500+ nits** garantit une luminosité suffisante pour une lisibilité en extérieur ou sous éclairage direct.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Luminosité | Environnement |
|------------|---------------|
| 200 nits | Intérieur faible |
| 350 nits | Intérieur normal |
| 500 nits | Intérieur lumineux |
| 700+ nits | Extérieur soleil |

## 3. Application aux Produits Crypto

- Usage mobile (outdoor)
- Environnements variés
- Vérification urgente n'importe où

## 4. Critères d'Évaluation SafeScoring

| Luminosité | Points |
|------------|--------|
| 700+ nits | 100% |
| 500-700 nits | 90% |
| 350-500 nits | 70% |
| < 350 nits | 50% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-009 v1.0
""",

    7233: """## 1. Vue d'ensemble

Le critère **Brightness Auto-adjust** évalue la capacité de l'écran à ajuster automatiquement sa luminosité selon l'éclairage ambiant.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Composant | Fonction |
|-----------|----------|
| Capteur ALS | Mesure lumière ambiante |
| Algorithme | Mapping lux → nits |
| Range | 10-1000 lux typique |

**Avantages :**
- Économie batterie (moins lumineux si possible)
- Confort visuel
- Discrétion (faible luminosité la nuit)

## 3. Application aux Produits Crypto

- Usage prolongé confortable
- Discrétion en environnement sombre
- Préservation batterie

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Auto-adjust avec capteur | 100% |
| Ajustement manuel facile | 70% |
| Luminosité fixe | 40% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-010 v1.0
""",

    # Input methods
    7234: """## 1. Vue d'ensemble

Le critère **Joystick Navigation** évalue l'utilisation d'un joystick (mini-stick ou D-pad) pour la navigation dans les menus, offrant un contrôle directionnel intuitif.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type | Directions | Confirmation |
|------|------------|--------------|
| D-pad | 4 (UDLR) | Bouton séparé |
| Mini-stick | 360° | Click intégré |
| Joystick analogique | 360° + pression | Variable |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Coldcard** : Joystick 5 directions
- **BitBox02** : Touch sliders

## 4. Critères d'Évaluation SafeScoring

| Type | Points |
|------|--------|
| Joystick + boutons dédiés | 100% |
| D-pad | 80% |
| 2 boutons seulement | 50% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-011 v1.0
""",

    7235: """## 1. Vue d'ensemble

Le critère **Rotary Encoder** évalue l'utilisation d'un encodeur rotatif pour la sélection rapide dans les listes (ex: wordlist BIP39) et les ajustements de valeurs.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Type | Incremental encoder |
| Résolution | 12-24 positions/tour |
| Click | Optional push button |
| Durée vie | >100,000 rotations |

**Avantages :**
- Sélection rapide dans wordlist (2048 mots)
- Ajustement montants/frais
- Intuitif (tourner = défiler)

## 3. Application aux Produits Crypto

- Pas courant dans hardware wallets
- Potentiel pour améliorer UX seed entry

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Rotary encoder intégré | 100% |
| Pas d'encoder | N/A |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-012 v1.0
""",

    7236: """## 1. Vue d'ensemble

Le critère **Capacitive Touch** évalue l'utilisation de boutons tactiles capacitifs qui détectent le toucher sans pression mécanique.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Technologie | Capacitance sensing |
| Sensibilité | Configurable |
| Feedback | Visuel/haptic |
| Durabilité | Pas d'usure mécanique |

**Avantages :**
- Pas de pièces mobiles
- Étanchéité facilitée
- Feedback configurable

**Inconvénients :**
- Pas de feedback tactile natif
- Gants peuvent bloquer

## 3. Application aux Produits Crypto

### Hardware Wallets
- **BitBox02** : Touch sliders capacitifs
- **Ledger Nano X** : Boutons capacitifs

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Capacitive + haptic feedback | 100% |
| Capacitive seul | 80% |
| Boutons mécaniques | 70% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-013 v1.0
""",

    7237: """## 1. Vue d'ensemble

Le critère **Multi-touch Screen** évalue la présence d'un écran tactile multi-points permettant des gestes comme pinch-to-zoom ou swipe.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Touch points | Gestes supportés |
|--------------|------------------|
| 1 point | Tap, drag |
| 2 points | Pinch, rotate |
| 5+ points | Gestes avancés |

## 3. Application aux Produits Crypto

### Hardware Wallets tactiles
- **Trezor Model T** : Touchscreen capacitif
- **Keystone Pro** : Multi-touch IPS
- **Ellipal Titan** : Touchscreen

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Multi-touch responsive | 100% |
| Single-touch | 70% |
| Pas d'écran tactile | 50% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-014 v1.0
""",

    7238: """## 1. Vue d'ensemble

Le critère **Gesture Control** évalue le support de contrôles par gestes pour une interaction naturelle (swipe, tap patterns, shake).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Geste | Action typique |
|-------|----------------|
| Swipe L/R | Navigation pages |
| Swipe up | Confirmer |
| Swipe down | Annuler/retour |
| Long press | Menu contextuel |
| Double tap | Sélection |

## 3. Application aux Produits Crypto

- UX moderne et intuitive
- Moins de boutons physiques
- Accessibilité améliorée

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Gestes complets + personnalisables | 100% |
| Gestes basiques | 80% |
| Pas de gestes | 60% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-015 v1.0
""",

    # Connectivity
    7239: """## 1. Vue d'ensemble

Le critère **USB 3.0 Speed** évalue la vitesse de connexion USB pour les transferts de données (firmware updates, exports).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Version | Vitesse | Nom commercial |
|---------|---------|----------------|
| USB 2.0 | 480 Mbps | Hi-Speed |
| USB 3.0 | 5 Gbps | SuperSpeed |
| USB 3.1 | 10 Gbps | SuperSpeed+ |
| USB 3.2 | 20 Gbps | SuperSpeed+ |

## 3. Application aux Produits Crypto

- Firmware updates rapides
- Export de données (PSBT, logs)
- Moins d'attente utilisateur

### Hardware Wallets
- La plupart : USB 2.0 (suffisant)
- USB 3.0 : confort mais pas critique

## 4. Critères d'Évaluation SafeScoring

| Version | Points |
|---------|--------|
| USB 3.0+ | 100% |
| USB 2.0 | 80% |

## 5. Sources et Références

- USB-IF Specifications
- SafeScoring Criteria E-ADD-016 v1.0
""",

    7240: """## 1. Vue d'ensemble

Le critère **USB PD Charging** évalue le support de USB Power Delivery pour une charge rapide standardisée.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Profile | Voltage | Power |
|---------|---------|-------|
| 5V/3A | 5V | 15W |
| 9V/3A | 9V | 27W |
| 15V/3A | 15V | 45W |
| 20V/5A | 20V | 100W |

## 3. Application aux Produits Crypto

- Charge rapide avant usage urgent
- Compatibilité chargeurs universels
- Futur-proof

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| USB PD (27W+) | 100% |
| USB standard (5V/2A) | 70% |

## 5. Sources et Références

- USB Power Delivery Specification
- SafeScoring Criteria E-ADD-017 v1.0
""",

    7241: """## 1. Vue d'ensemble

Le critère **Bluetooth LE** évalue la présence de Bluetooth Low Energy pour la communication sans fil avec smartphones/ordinateurs.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Version | Débit | Portée | Consommation |
|---------|-------|--------|--------------|
| BLE 4.2 | 1 Mbps | 50m | ~10mA TX |
| BLE 5.0 | 2 Mbps | 200m | ~8mA TX |
| BLE 5.2 | 2 Mbps | 200m | ~6mA TX |

**Sécurité BLE :**
- Pairing avec PIN
- Encryption AES-128
- Risque : interception possible

## 3. Application aux Produits Crypto

### Hardware Wallets avec BLE
- **Ledger Nano X** : BLE pour mobile
- **CoolWallet** : BLE only

### Considérations
- Confort vs sécurité
- Air-gap compromis
- Option désactivable recommandée

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| BLE optionnel/désactivable | 90% |
| BLE obligatoire | 70% |
| Pas de wireless (air-gap strict) | 100% |

## 5. Sources et Références

- Bluetooth SIG Specifications
- SafeScoring Criteria E-ADD-018 v1.0
""",

    7242: """## 1. Vue d'ensemble

Le critère **NFC Tap-to-Sign** évalue la capacité de signer des transactions via NFC (Near Field Communication) en tapant l'appareil sur un smartphone.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Fréquence | 13.56 MHz |
| Distance | < 4 cm |
| Débit | 424 kbps |
| Standard | ISO 14443 |

**Avantages :**
- Interaction rapide (tap)
- Pas de câble
- Intuitif pour utilisateur mobile

## 3. Application aux Produits Crypto

### Produits avec NFC
- **Keystone** : NFC signing
- **Satochip** : Carte NFC
- **CoolWallet** : NFC backup

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| NFC optionnel | 90% |
| NFC obligatoire | 75% |
| Pas de NFC | 100% (air-gap) |

## 5. Sources et Références

- ISO/IEC 14443
- SafeScoring Criteria E-ADD-019 v1.0
""",

    7243: """## 1. Vue d'ensemble

Le critère **Dual USB Ports** évalue la présence de deux ports USB, permettant connexion simultanée à deux appareils ou utilisation de clés de sécurité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Configuration | Usage |
|---------------|-------|
| USB-A + USB-C | PC legacy + mobile |
| 2x USB-C | Moderne, symétrique |
| USB + microSD | Data + storage |

## 3. Application aux Produits Crypto

- Connexion PC + validation externe
- Clé sécurité FIDO2 en parallèle
- Flexibilité usage

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Dual USB | 100% |
| Single USB universel | 80% |
| Propriétaire | 50% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-020 v1.0
""",

    # Form factors
    7244: """## 1. Vue d'ensemble

Le critère **Mini Form < 30g** évalue les appareils ultra-compacts de moins de 30 grammes, optimisés pour le transport quotidien discret.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Produit | Poids | Dimensions |
|---------|-------|------------|
| Ledger Nano S | 16.2g | 57x17x9mm |
| Trezor One | 12g | 60x30x6mm |
| Ledger Nano X | 34g | 72x19x12mm |

**Avantages mini form :**
- Porte-clés
- Discrétion
- Toujours sur soi

**Inconvénients :**
- Petit écran
- Batterie limitée ou absente
- Manipulation difficile

## 3. Application aux Produits Crypto

### Hardware Wallets mini
- **Ledger Nano S Plus** : 21g
- **Trezor One** : 12g
- **BitBox02** : 12g

## 4. Critères d'Évaluation SafeScoring

| Form | Points |
|------|--------|
| < 30g + fonctionnel | 90% |
| 30-50g | 100% (équilibré) |
| > 100g | 80% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-021 v1.0
""",

    7245: """## 1. Vue d'ensemble

Le critère **Compact Form 50-100g** désigne le format équilibré entre portabilité et fonctionnalités, avec écran plus grand et batterie possible.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Range | Caractéristiques typiques |
|-------|---------------------------|
| 50-70g | Écran moyen, batterie petite |
| 70-100g | Écran large, batterie 500mAh |

## 3. Application aux Produits Crypto

### Exemples
- **Keystone Essential** : ~50g
- Format intermédiaire optimal

## 4. Critères d'Évaluation SafeScoring

| Poids | Points |
|-------|--------|
| 50-100g | 100% |
| < 50g | 90% |
| > 100g | 85% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-022 v1.0
""",

    7246: """## 1. Vue d'ensemble

Le critère **Professional Form 100-200g** désigne les appareils plus robustes avec écrans larges, caméras, et batteries importantes, destinés à un usage professionnel.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Produit | Poids | Caractéristiques |
|---------|-------|------------------|
| Keystone Pro | ~150g | 4" écran, caméra, batterie |
| NGRAVE ZERO | ~130g | Écran couleur, biométrie |
| Ellipal Titan | ~200g | Air-gapped, robuste |

## 3. Application aux Produits Crypto

- Usage bureau/coffre
- Fonctionnalités avancées
- Pas portable au quotidien

## 4. Critères d'Évaluation SafeScoring

| Poids | Points |
|-------|--------|
| 100-200g fonctionnel | 100% |
| > 200g | 80% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-023 v1.0
""",

    8078: """## 1. Vue d'ensemble

Le critère **Modular Design** évalue si l'appareil a une conception modulaire permettant le remplacement ou l'upgrade de composants (batterie, écran, SE).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Module | Remplaçable ? |
|--------|---------------|
| Batterie | Recommandé |
| Écran | Optionnel |
| SE | Généralement non |
| Boîtier | Optionnel |

**Avantages :**
- Réparation facilitée
- Durabilité accrue
- Évolution possible

## 3. Application aux Produits Crypto

- Rare dans hardware wallets actuels
- GridPlus : certaine modularité
- Futur : designs plus modulaires

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Modulaire (batterie + autres) | 100% |
| Batterie remplaçable | 80% |
| Monolithique | 60% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-024 v1.0
""",

    # Ergonomics
    7248: """## 1. Vue d'ensemble

Le critère **Contoured Grip** évalue la présence de formes ergonomiques facilitant la prise en main et réduisant le risque de chute.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Élément | Bénéfice |
|---------|----------|
| Courbes ergonomiques | Confort main |
| Grip zones | Anti-glissement |
| Poids équilibré | Stabilité |

## 3. Application aux Produits Crypto

- Usage prolongé confortable
- Moins de risque de chute
- Important pour appareils > 50g

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Ergonomie étudiée | 100% |
| Design plat standard | 70% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-025 v1.0
""",

    7249: """## 1. Vue d'ensemble

Le critère **Soft-touch Coating** évalue la présence d'un revêtement soft-touch offrant une meilleure prise et un toucher agréable.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type | Propriétés |
|------|------------|
| Polyuréthane | Durable, soft |
| Silicone | Très soft, marques |
| Rubber coating | Grip maximal |

## 3. Application aux Produits Crypto

- Prise sécurisée
- Aspect premium
- Traces de doigts possibles

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Soft-touch quality | 100% |
| Plastique standard | 70% |
| Métal nu | 80% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-026 v1.0
""",

    7250: """## 1. Vue d'ensemble

Le critère **Thumb-reachable Buttons** vérifie que tous les boutons sont accessibles avec le pouce lors d'une utilisation à une main.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Zone | Accessibilité |
|------|---------------|
| Centre | Facile |
| Coins | Difficile |
| Bords | Moyen |

**Design recommandé :**
- Boutons principaux au centre
- Confirmation accessible au pouce
- Navigation dans zone naturelle

## 3. Application aux Produits Crypto

- Usage à une main (l'autre tient le phone)
- Opérations rapides possibles

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Tous boutons accessibles | 100% |
| Partiellement accessible | 70% |
| Deux mains requises | 50% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-027 v1.0
""",

    7251: """## 1. Vue d'ensemble

Le critère **Low Fatigue Design** évalue si l'appareil est conçu pour minimiser la fatigue lors d'opérations longues (ex: signing multiples transactions).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Facteur | Impact fatigue |
|---------|----------------|
| Poids | Plus lourd = plus de fatigue |
| Boutons | Trop durs = fatigue doigts |
| Écran | Trop petit = fatigue yeux |
| Feedback | Absent = stress |

## 3. Application aux Produits Crypto

- Sessions de batch signing
- Gestion portfolio importante
- Usage professionnel prolongé

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Design anti-fatigue | 100% |
| Standard | 70% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-028 v1.0
""",

    # Battery
    7252: """## 1. Vue d'ensemble

Le critère **Standby 6 Months** vérifie que l'appareil peut rester en veille pendant 6 mois sans recharge, prêt à l'emploi en cas d'urgence.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Consommation standby | Autonomie |
|---------------------|-----------|
| 10 µA | > 1 an |
| 50 µA | ~6 mois |
| 100 µA | ~3 mois |

**Batterie typique :**
- 500 mAh → 50µA → 10,000h ≈ 14 mois

## 3. Application aux Produits Crypto

- Appareil stocké dans coffre
- Disponible pour urgence
- Pas de recharge fréquente requise

## 4. Critères d'Évaluation SafeScoring

| Standby | Points |
|---------|--------|
| > 12 mois | 100% |
| 6-12 mois | 90% |
| 3-6 mois | 70% |
| < 3 mois | 50% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-029 v1.0
""",

    7253: """## 1. Vue d'ensemble

Le critère **Standby 12 Months** exige une autonomie en veille d'un an minimum, idéale pour le stockage long terme.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Batterie | Consommation max | Autonomie 1 an |
|----------|------------------|----------------|
| 300 mAh | 34 µA | ✓ |
| 500 mAh | 57 µA | ✓ |
| 1000 mAh | 114 µA | ✓ |

**Facteurs clés :**
- Deep sleep mode efficace
- RTC low power
- Pas de drain parasite

## 3. Application aux Produits Crypto

- Cold storage long terme
- Backup de backup
- Situations d'urgence différées

## 4. Critères d'Évaluation SafeScoring

| Standby | Points |
|---------|--------|
| > 12 mois | 100% |
| 6-12 mois | 80% |

## 5. Sources et Références

- SafeScoring Criteria E-ADD-030 v1.0
"""
}

def main():
    print("Saving Ecosystem summaries E-ADD-001 to E-ADD-030...")
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
