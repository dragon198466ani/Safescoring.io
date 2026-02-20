#!/usr/bin/env python3
"""Generate summaries for Ecosystem UX norms (E21-E62)."""

import requests
import time
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    3842: """## 1. Vue d'ensemble

Le critère **Accessibility WCAG** (E21) évalue la conformité aux Web Content Accessibility Guidelines pour garantir l'accessibilité des interfaces crypto aux utilisateurs en situation de handicap.

**Importance pour la sécurité crypto** : L'accessibilité permet à tous les utilisateurs de gérer leurs actifs en toute sécurité, sans compromettre la vérification des transactions par des interfaces inadaptées.

## 2. Spécifications Techniques

| Standard | Version | Niveau | Critères |
|----------|---------|--------|----------|
| WCAG | 2.1 | AA (minimum) | 50 critères |
| WCAG | 2.1 | AAA (optimal) | 78 critères |
| WCAG | 2.2 | AA | 55 critères |

**Catégories de conformité** :
- **Perceptible** : Alternatives textuelles, sous-titres, contraste 4.5:1 (AA) / 7:1 (AAA)
- **Utilisable** : Navigation clavier, temps suffisant, pas de saisies
- **Compréhensible** : Texte lisible, prévisible, aide à la saisie
- **Robuste** : Compatible technologies d'assistance

**Outils de validation** : WAVE, axe DevTools, Lighthouse (score ≥90), Pa11y, NVDA/JAWS testing

## 3. Application aux Produits Crypto

| Type de Produit | Importance | Implémentation |
|-----------------|------------|----------------|
| Hardware Wallets | Critique | Écran lisible, boutons tactiles, retour sonore |
| Software Wallets | Très élevée | WCAG 2.1 AA minimum, thèmes contraste |
| CEX/DEX | Très élevée | Formulaires accessibles, navigation clavier |
| DeFi Lending | Élevée | Tableaux de données accessibles |
| Staking | Élevée | Indicateurs visuels et textuels |
| Mobile Apps | Très élevée | VoiceOver/TalkBack support |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Navigation clavier, contraste minimum |
| Intermédiaire | 56-70 | WCAG 2.1 A complet |
| Avancé | 71-85 | WCAG 2.1 AA complet |
| Expert | 86-100 | WCAG 2.1 AAA + tests utilisateurs |

## 5. Sources et Références

- [W3C WCAG 2.1](https://www.w3.org/TR/WCAG21/)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Section 508 Standards](https://www.section508.gov/)""",

    3843: """## 1. Vue d'ensemble

Le critère **Keyboard Navigation** (E22) évalue la capacité à naviguer et effectuer toutes les opérations crypto uniquement au clavier, sans souris.

**Importance pour la sécurité crypto** : La navigation clavier est essentielle pour les utilisateurs à mobilité réduite et offre une méthode de saisie plus sécurisée contre le keylogging visuel.

## 2. Spécifications Techniques

| Fonctionnalité | Raccourci standard | Priorité |
|----------------|-------------------|----------|
| Navigation focus | Tab / Shift+Tab | Critique |
| Activation | Enter / Space | Critique |
| Menus | Arrow keys | Élevée |
| Fermeture modal | Escape | Élevée |
| Skip links | Premier Tab | Moyenne |

**Indicateurs de focus** :
- Outline visible : minimum 2px solid
- Contraste focus : 3:1 minimum
- Zone cliquable : 44x44px minimum (WCAG 2.2)
- Focus trap dans modales : obligatoire

**Séquence logique** : DOM order = visual order, tabindex 0 ou -1 uniquement

## 3. Application aux Produits Crypto

| Type de Produit | Opérations clavier critiques |
|-----------------|------------------------------|
| Hardware Wallets | Impossible (boutons physiques) |
| Software Wallets | Envoi, réception, paramètres |
| CEX | Trading, dépôt, retrait, 2FA |
| DEX | Swap, approval, pools |
| DeFi Lending | Supply, borrow, repay |
| Staking | Stake, unstake, claim |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Navigation Tab basique |
| Intermédiaire | 56-70 | Toutes opérations clavier |
| Avancé | 71-85 | Focus visible, skip links |
| Expert | 86-100 | Raccourcis personnalisés, roving tabindex |

## 5. Sources et Références

- [W3C Keyboard Accessibility](https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html)
- [MDN Keyboard Navigation](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets)""",

    3844: """## 1. Vue d'ensemble

Le critère **Screen Reader Support** (E23) évalue la compatibilité avec les lecteurs d'écran pour les utilisateurs malvoyants.

**Importance pour la sécurité crypto** : Les utilisateurs malvoyants doivent pouvoir vérifier les adresses et montants de transaction de manière fiable via leur lecteur d'écran.

## 2. Spécifications Techniques

| Lecteur d'écran | Plateforme | Part de marché |
|-----------------|------------|----------------|
| NVDA | Windows | 40.6% |
| JAWS | Windows | 40.1% |
| VoiceOver | macOS/iOS | 12.9% |
| TalkBack | Android | 5.2% |
| Narrator | Windows | 1.2% |

**Attributs ARIA requis** :
- `aria-label` : Libellés explicites (ex: "Envoyer 0.5 BTC")
- `aria-describedby` : Descriptions détaillées
- `aria-live="polite"` : Notifications de transaction
- `aria-live="assertive"` : Alertes de sécurité
- `role="alert"` : Messages d'erreur

**Landmarks** : banner, navigation, main, complementary, contentinfo

## 3. Application aux Produits Crypto

| Type de Produit | Support Screen Reader |
|-----------------|----------------------|
| Hardware Wallets | N/A (écran physique) |
| Software Wallets | ARIA complet, live regions |
| CEX | Tableaux accessibles, formulaires |
| DEX | Prix/slippage annoncés |
| DeFi | APY/TVL vocalisés |
| Mobile | VoiceOver/TalkBack natif |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Labels de base |
| Intermédiaire | 56-70 | ARIA landmarks, live regions |
| Avancé | 71-85 | Test NVDA + VoiceOver |
| Expert | 86-100 | Support complet 4 lecteurs |

## 5. Sources et Références

- [W3C WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/)
- [WebAIM Screen Reader Survey](https://webaim.org/projects/screenreadersurvey9/)""",

    3853: """## 1. Vue d'ensemble

Le critère **News Feed** (E32) évalue l'intégration d'un flux d'actualités crypto pertinent et fiable au sein de l'interface.

**Importance pour la sécurité crypto** : Un flux d'actualités intégré permet aux utilisateurs d'être alertés rapidement des incidents de sécurité, hacks et vulnérabilités.

## 2. Spécifications Techniques

| Source | Type | Fréquence mise à jour |
|--------|------|----------------------|
| CoinDesk | Actualités | Temps réel |
| The Block | Analyse | Horaire |
| Rekt News | Incidents | Immédiat |
| DeFi Llama | TVL/Hacks | 5 minutes |
| Twitter/X API | Social | Temps réel |

**Filtrage et catégories** :
- **Sécurité** : Hacks, vulnérabilités, exploits
- **Régulation** : Nouvelles lois, enforcement
- **Protocole** : Updates, forks, governance
- **Marché** : Prix, volumes, liquidations

**Anti-phishing** : Vérification sources, pas de liens directs wallet

## 3. Application aux Produits Crypto

| Type de Produit | Pertinence News Feed |
|-----------------|---------------------|
| Hardware Wallets | Non applicable (pas d'écran adapté) |
| Software Wallets | Alertes sécurité ciblées |
| CEX | News marchés + alertes listing |
| DEX | Updates protocoles intégrés |
| DeFi Lending | Alertes liquidation + governance |
| Staking | Infos validateurs + slashing |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Lien externe actualités |
| Intermédiaire | 56-70 | Flux intégré filtrable |
| Avancé | 71-85 | Alertes personnalisées |
| Expert | 86-100 | ML-curated + notification push |

## 5. Sources et Références

- CoinDesk API Documentation
- The Block Research
- Rekt News Archive""",

    3854: """## 1. Vue d'ensemble

Le critère **Market Data** (E33) évalue la qualité et fiabilité des données de marché affichées (prix, volumes, market cap).

**Importance pour la sécurité crypto** : Des données de marché précises sont essentielles pour éviter les erreurs de trading et détecter les manipulations de prix.

## 2. Spécifications Techniques

| Métrique | Source recommandée | Fréquence |
|----------|-------------------|-----------|
| Prix spot | Agrégation 5+ CEX | 1-5 secondes |
| Volume 24h | CoinGecko/CMC | 1 minute |
| Market Cap | CoinGecko | 5 minutes |
| TVL DeFi | DeFi Llama | 5 minutes |
| Gas fees | Etherscan/Blocknative | 15 secondes |

**Agrégation des prix** :
- Méthode VWAP (Volume-Weighted Average Price)
- Exclusion outliers >2σ
- Minimum 3 sources fiables
- Latence <500ms pour trading

**APIs standard** : CoinGecko (free tier 30 calls/min), CoinMarketCap, Messari, CryptoCompare

## 3. Application aux Produits Crypto

| Type de Produit | Données Marché Requises |
|-----------------|------------------------|
| Hardware Wallets | Prix optionnel (via companion app) |
| Software Wallets | Balance en fiat, prix tokens |
| CEX | Orderbook, depth, trades |
| DEX | Prix AMM, slippage estimé |
| DeFi Lending | Collateral value, liquidation price |
| Staking | APY, rewards estimés |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Prix via 1 source |
| Intermédiaire | 56-70 | Multi-sources, refresh auto |
| Avancé | 71-85 | VWAP, historique |
| Expert | 86-100 | Temps réel <1s, manipulation detection |

## 5. Sources et Références

- [CoinGecko API](https://www.coingecko.com/en/api)
- [DeFi Llama API](https://defillama.com/docs/api)""",

    3863: """## 1. Vue d'ensemble

Le critère **Transaction Speed Options** (E42) évalue la possibilité de choisir la vitesse de confirmation et les frais associés.

**Importance pour la sécurité crypto** : Permettre le choix de vitesse évite les transactions bloquées et les frais excessifs lors de congestion réseau.

## 2. Spécifications Techniques

| Réseau | Slow | Standard | Fast | Instant |
|--------|------|----------|------|---------|
| Bitcoin | 1+ heure | 30-60 min | 10-20 min | Next block |
| Ethereum | 5+ min | 1-3 min | 30s-1 min | 12-15s |
| Polygon | 30s+ | 10-20s | 5-10s | 2s |
| Solana | N/A | 400ms | 400ms | 400ms |

**Estimation des frais (Ethereum)** :
- Slow : Base fee
- Standard : Base fee + 1 gwei priority
- Fast : Base fee + 2-3 gwei priority
- Instant : Base fee + 5+ gwei priority

**Sources gas estimation** : Blocknative, Etherscan Gas Tracker, eth_gasPrice RPC

## 3. Application aux Produits Crypto

| Type de Produit | Options Vitesse |
|-----------------|-----------------|
| Hardware Wallets | 3 niveaux pré-définis |
| Software Wallets | 3-4 niveaux + custom |
| CEX | Fixe (internal ledger) |
| DEX | Priority fee ajustable |
| DeFi Lending | Liquidation = max speed |
| Bridges | Options selon bridge |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Option unique auto |
| Intermédiaire | 56-70 | 3 niveaux pré-définis |
| Avancé | 71-85 | Custom gwei + ETA |
| Expert | 86-100 | MEV protection, RBF support |

## 5. Sources et Références

- [EIP-1559 Specification](https://eips.ethereum.org/EIPS/eip-1559)
- [Blocknative Gas Estimator](https://www.blocknative.com/gas-estimator)""",

    3865: """## 1. Vue d'ensemble

Le critère **Scheduled Transactions** (E44) évalue la capacité de programmer des transactions à exécuter à une date/heure future.

**Importance pour la sécurité crypto** : Les transactions programmées permettent le DCA automatisé et les paiements récurrents sans exposer les clés à des services tiers.

## 2. Spécifications Techniques

| Méthode | Custodial | Décentralisée |
|---------|-----------|---------------|
| CEX Schedule | Oui | Non |
| Gelato Network | Non | Oui |
| Chainlink Automation | Non | Oui |
| Account Abstraction | Non | Oui |

**Paramètres de scheduling** :
- Datetime : Précision à la minute
- Récurrence : Daily, weekly, monthly
- Conditions : Prix, balance, event
- Gas limit : Buffer 20% recommandé

**Coûts additionnels** :
- Gelato : 0.1% transaction + gas
- Chainlink : LINK token pour upkeep
- AA (ERC-4337) : Paymaster ou self-funded

## 3. Application aux Produits Crypto

| Type de Produit | Support Scheduling |
|-----------------|-------------------|
| Hardware Wallets | Non (cold storage) |
| Software Wallets | Via intégration Gelato |
| CEX | Natif (DCA, limit orders) |
| DEX | Smart contracts (Gelato) |
| DeFi Lending | Auto-compound via Gelato |
| Staking | Auto-restake possible |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Liens externes uniquement |
| Intermédiaire | 56-70 | CEX scheduling intégré |
| Avancé | 71-85 | Gelato/Chainlink integration |
| Expert | 86-100 | AA-based scheduling |

## 5. Sources et Références

- [Gelato Network Docs](https://docs.gelato.network/)
- [Chainlink Automation](https://docs.chain.link/chainlink-automation)
- [ERC-4337 Standard](https://eips.ethereum.org/EIPS/eip-4337)""",

    3866: """## 1. Vue d'ensemble

Le critère **Recurring Payments** (E45) évalue le support des paiements récurrents automatiques en crypto.

**Importance pour la sécurité crypto** : Les paiements récurrents doivent être implémentés sans compromettre la garde des clés privées.

## 2. Spécifications Techniques

| Implémentation | Méthode | Sécurité |
|----------------|---------|----------|
| ERC-20 Approve | Pre-approval illimité | Risqué |
| ERC-20 Permit | Signature + deadline | Meilleur |
| Streaming (Superfluid) | Flow rate continu | Excellent |
| Account Abstraction | Session keys | Excellent |

**Superfluid Streaming** :
- Flow rate : tokens/second
- Minimum deposit : 4h de flow
- Liquidation : Buffer < 0
- Networks : Ethereum, Polygon, Arbitrum, Optimism

**Limites recommandées** :
- Maximum par transaction : configurable
- Maximum par période : daily/weekly cap
- Whitelist adresses : obligatoire

## 3. Application aux Produits Crypto

| Type de Produit | Recurring Payments |
|-----------------|-------------------|
| Hardware Wallets | Non supporté |
| Software Wallets | Via AA ou streaming |
| CEX | Natif pour crypto cards |
| DEX | Subscriptions DeFi |
| DeFi Lending | Interest streaming |
| Staking | Reward streaming |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Approve simple |
| Intermédiaire | 56-70 | Permit avec limites |
| Avancé | 71-85 | Superfluid integration |
| Expert | 86-100 | AA session keys |

## 5. Sources et Références

- [Superfluid Protocol](https://docs.superfluid.finance/)
- [EIP-2612 Permit](https://eips.ethereum.org/EIPS/eip-2612)""",

    3869: """## 1. Vue d'ensemble

Le critère **NFC Payments** (E48) évalue le support des paiements sans contact via NFC (Near Field Communication).

**Importance pour la sécurité crypto** : Les paiements NFC doivent combiner la commodité du sans-contact avec la sécurité des transactions crypto signées.

## 2. Spécifications Techniques

| Standard | Fréquence | Portée | Débit |
|----------|-----------|--------|-------|
| NFC-A | 13.56 MHz | <10 cm | 106 kbit/s |
| NFC-B | 13.56 MHz | <10 cm | 106 kbit/s |
| NFC-F | 13.56 MHz | <10 cm | 212/424 kbit/s |

**Implémentations crypto** :
- **Cartes NFC** : Tangem, SafePal, CoolWallet
- **HCE (Host Card Emulation)** : Android wallets
- **Hardware Wallets NFC** : Ledger Stax, Keystone 3

**Protocoles** :
- ISO 14443 : Communication
- ISO 7816 : APDU commands
- EMV : Paiement compatible

## 3. Application aux Produits Crypto

| Type de Produit | Support NFC |
|-----------------|-------------|
| Hardware Wallets | Tangem, Ledger Stax, Keystone 3 |
| Software Wallets | Android HCE, Apple Pay (limité) |
| CEX | Cartes Visa/MC NFC |
| Crypto Cards | Crypto.com, Binance Card |
| Mobile Apps | Google Pay/Apple Pay integration |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | NFC read-only |
| Intermédiaire | 56-70 | Signature NFC |
| Avancé | 71-85 | EMV compatible |
| Expert | 86-100 | Multi-chain NFC + PIN |

## 5. Sources et Références

- [NFC Forum Specifications](https://nfc-forum.org/our-work/specification-releases/)
- [ISO 14443 Standard](https://www.iso.org/standard/73596.html)""",

    3870: """## 1. Vue d'ensemble

Le critère **Biometric Login** (E49) évalue l'utilisation de l'authentification biométrique pour accéder aux applications crypto.

**Importance pour la sécurité crypto** : La biométrie offre un équilibre entre sécurité et commodité, mais ne doit pas être le seul facteur d'authentification pour les opérations sensibles.

## 2. Spécifications Techniques

| Type Biométrie | FAR | FRR | Temps |
|----------------|-----|-----|-------|
| Empreinte | 0.002% | 2% | <500ms |
| Face ID | 0.0001% | 3% | <400ms |
| Iris | 0.0001% | 0.5% | <1s |

**FAR** = False Acceptance Rate, **FRR** = False Rejection Rate

**Implémentations OS** :
- iOS : LocalAuthentication framework, Secure Enclave
- Android : BiometricPrompt API, TEE/SE
- Windows : Windows Hello, TPM

**Niveaux de sécurité Android** :
- Class 3 (Strong) : Hardware-backed
- Class 2 (Weak) : Software-based
- Class 1 : Convenience only

## 3. Application aux Produits Crypto

| Type de Produit | Biométrie Usage |
|-----------------|-----------------|
| Hardware Wallets | Unlock device, NOT signing |
| Software Wallets | Unlock + optionnel signing |
| CEX | Login + withdrawal (2FA) |
| DEX | Via wallet biometrics |
| Mobile Apps | Standard iOS/Android |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Biométrie unlock only |
| Intermédiaire | 56-70 | Class 3 Android / Secure Enclave |
| Avancé | 71-85 | Biométrie + PIN fallback |
| Expert | 86-100 | Multi-biométrie + passkey |

## 5. Sources et Références

- [Apple LocalAuthentication](https://developer.apple.com/documentation/localauthentication)
- [Android BiometricPrompt](https://developer.android.com/reference/android/hardware/biometrics/BiometricPrompt)""",

    3871: """## 1. Vue d'ensemble

Le critère **Face ID Support** (E50) évalue l'intégration de la reconnaissance faciale Apple Face ID pour l'authentification.

**Importance pour la sécurité crypto** : Face ID utilise le Secure Enclave d'Apple avec une probabilité d'erreur de 1:1,000,000, offrant une sécurité supérieure au Touch ID.

## 2. Spécifications Techniques

| Métrique | Valeur |
|----------|--------|
| FAR (False Accept) | 1:1,000,000 |
| Technologie | TrueDepth camera |
| Points de données | 30,000+ points IR |
| Temps reconnaissance | <400ms |
| Secure Enclave | A11+ Bionic |

**Capacités Face ID** :
- Attention awareness : Vérifie que l'utilisateur regarde
- Anti-spoofing : Détection masques/photos
- Adaptation : Apprentissage changements visage
- Darkness : Fonctionne dans l'obscurité (IR)

**Limitations** :
- iOS uniquement
- Ne fonctionne pas avec masque (sans Apple Watch)
- Jumeaux identiques : risque accru

## 3. Application aux Produits Crypto

| Type de Produit | Face ID Integration |
|-----------------|---------------------|
| Hardware Wallets | Via companion app iOS |
| Software Wallets | LocalAuthentication API |
| CEX Apps | Login + confirmation |
| Portfolio Apps | Quick access |
| DeFi Mobile | Transaction approval |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Face ID unlock |
| Intermédiaire | 56-70 | + Attention required |
| Avancé | 71-85 | + Transaction signing |
| Expert | 86-100 | + Passcode fallback enforced |

## 5. Sources et Références

- [Apple Face ID Security](https://support.apple.com/en-us/102381)
- [Face ID White Paper](https://www.apple.com/business/docs/site/FaceID_Security_Guide.pdf)""",

    3872: """## 1. Vue d'ensemble

Le critère **Touch ID Support** (E51) évalue l'intégration de l'authentification par empreinte digitale Apple Touch ID.

**Importance pour la sécurité crypto** : Touch ID offre une authentification rapide et sécurisée avec stockage des données biométriques dans le Secure Enclave.

## 2. Spécifications Techniques

| Métrique | Touch ID Gen 1 | Touch ID Gen 2 |
|----------|----------------|----------------|
| FAR | 1:50,000 | 1:50,000 |
| Reconnaissance | <1s | <0.5s |
| Résolution | 500 ppi | 500 ppi |
| Matériau | Saphir | Saphir |
| Secure Enclave | Oui | Oui |

**Appareils supportés** :
- iPhone : 5S à 8, SE (1ère et 2ème gen)
- iPad : Air 2+, Mini 3+, Pro 9.7"+
- MacBook : Pro 2016+, Air 2018+

**Stockage biométrique** :
- Template mathématique uniquement (pas d'image)
- Chiffré dans Secure Enclave
- Non accessible par iOS ou apps
- Maximum 5 empreintes enregistrées

## 3. Application aux Produits Crypto

| Type de Produit | Touch ID Integration |
|-----------------|----------------------|
| Hardware Wallets | Via companion app |
| Software Wallets | Standard iOS API |
| CEX Apps | Login + confirmations |
| Portfolio Apps | Quick unlock |
| Mobile Trading | Order confirmation |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Touch ID unlock |
| Intermédiaire | 56-70 | + Secure Enclave storage |
| Avancé | 71-85 | + Transaction signing |
| Expert | 86-100 | + Multiple fingers backup |

## 5. Sources et Références

- [Apple Touch ID Security](https://support.apple.com/en-us/102549)
- [iOS Security Guide](https://help.apple.com/pdf/security/en_US/apple-platform-security-guide.pdf)""",

    3873: """## 1. Vue d'ensemble

Le critère **Fingerprint Sensor** (E52) évalue le support des capteurs d'empreintes digitales sur Android et autres plateformes.

**Importance pour la sécurité crypto** : Les capteurs d'empreintes modernes stockent les templates dans un Trusted Execution Environment (TEE) isolé du système principal.

## 2. Spécifications Techniques

| Type Capteur | Technologie | Sécurité | Vitesse |
|--------------|-------------|----------|---------|
| Capacitif | Électrique | Bonne | <0.5s |
| Optique | Lumière | Moyenne | <0.8s |
| Ultrasonique | Ondes | Excellente | <0.6s |
| In-display | Optique/US | Variable | <0.7s |

**Android BiometricPrompt Classes** :
- **BIOMETRIC_STRONG** : TEE/SE required
- **BIOMETRIC_WEAK** : Software acceptable
- **DEVICE_CREDENTIAL** : PIN/Pattern fallback

**Standards** :
- FIDO2 : WebAuthn compatible
- ISO/IEC 19795 : Biometric performance
- Android CDD : Spoof acceptance <7%

## 3. Application aux Produits Crypto

| Type de Produit | Fingerprint Support |
|-----------------|---------------------|
| Hardware Wallets | Ledger Stax (touch), Keystone 3 |
| Software Wallets | Android BiometricPrompt |
| CEX Apps | Login + withdrawal confirm |
| DEX Apps | Via wallet biometrics |
| Security Keys | YubiKey Bio series |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Fingerprint unlock |
| Intermédiaire | 56-70 | BIOMETRIC_STRONG class |
| Avancé | 71-85 | TEE-backed + anti-spoofing |
| Expert | 86-100 | Ultrasonique + FIDO2 |

## 5. Sources et Références

- [Android BiometricPrompt](https://developer.android.com/training/sign-in/biometric-auth)
- [FIDO2 Specifications](https://fidoalliance.org/specifications/)""",

    3874: """## 1. Vue d'ensemble

Le critère **PIN Entry on Device** (E53) évalue la saisie du code PIN directement sur l'écran sécurisé du hardware wallet.

**Importance pour la sécurité crypto** : La saisie PIN sur device empêche les keyloggers et malwares sur l'ordinateur hôte de capturer le code d'accès.

## 2. Spécifications Techniques

| Wallet | Méthode PIN | Longueur | Anti-shoulder |
|--------|-------------|----------|---------------|
| Ledger Nano S/X | Boutons 2 | 4-8 digits | Non |
| Ledger Stax | Écran tactile | 4-8 digits | Oui (shuffle) |
| Trezor Model T | Écran tactile | 1-50 digits | Oui (shuffle) |
| Trezor One | Clavier host | 1-50 digits | Oui (position) |
| Keystone | Écran tactile | 4-12 digits | Oui |

**Protections PIN** :
- Délai croissant : 2^n secondes après n erreurs
- Wipe après échecs : 3-10 tentatives max
- PIN aveugle : Positions randomisées
- Duress PIN : PIN alternatif = wipe

## 3. Application aux Produits Crypto

| Type de Produit | PIN on Device |
|-----------------|---------------|
| Hardware Wallets | Standard requis |
| Software Wallets | N/A (pas de device) |
| Smart Cards (Tangem) | NFC PIN entry |
| Security Keys | Touch uniquement |
| Signing Devices | Écran sécurisé |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | PIN sur host |
| Intermédiaire | 56-70 | PIN sur device, fixe |
| Avancé | 71-85 | PIN shuffle, wipe protection |
| Expert | 86-100 | Duress PIN + délai exponentiel |

## 5. Sources et Références

- [Ledger Security Model](https://www.ledger.com/academy/security)
- [Trezor Security](https://trezor.io/learn/a/pin-protection-on-trezor-devices)""",

    3875: """## 1. Vue d'ensemble

Le critère **Passphrase Entry on Device** (E54) évalue la possibilité de saisir la passphrase BIP-39 directement sur le hardware wallet.

**Importance pour la sécurité crypto** : La saisie passphrase sur device garantit que ce "25ème mot" n'est jamais exposé à l'ordinateur hôte potentiellement compromis.

## 2. Spécifications Techniques

| Wallet | Saisie Passphrase | Méthode | Limite |
|--------|-------------------|---------|--------|
| Ledger Nano S | Non | Host USB | 100 chars |
| Ledger Nano X | Non | Host USB | 100 chars |
| Ledger Stax | Oui | Écran tactile | 100 chars |
| Trezor One | Non | Host USB | 50 chars |
| Trezor Model T | Oui | Écran tactile | 50 chars |
| Keystone 3 | Oui | Écran tactile | 128 chars |

**BIP-39 Passphrase** :
- UTF-8 NFKD normalized
- Dérivation : PBKDF2-HMAC-SHA512
- Iterations : 2048
- Crée wallet "caché" différent

**Sécurité** :
- Clavier QWERTY complet requis
- Pas d'auto-complétion
- Confirmation visuelle obligatoire

## 3. Application aux Produits Crypto

| Type de Produit | Passphrase On-Device |
|-----------------|---------------------|
| Hardware Wallets | Model haut de gamme |
| Air-gapped | Coldcard Mk4, Keystone |
| Smart Cards | Non (interface limitée) |
| Software Wallets | N/A |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Passphrase via host |
| Intermédiaire | 56-70 | Passphrase cachée à l'écran |
| Avancé | 71-85 | Saisie on-device |
| Expert | 86-100 | On-device + confirmation visuelle |

## 5. Sources et Références

- [BIP-39 Specification](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [Trezor Passphrase](https://trezor.io/learn/a/passphrases-and-hidden-wallets)""",

    3876: """## 1. Vue d'ensemble

Le critère **Full Keyboard on Device** (E55) évalue la présence d'un clavier complet sur le hardware wallet pour saisie sécurisée.

**Importance pour la sécurité crypto** : Un clavier complet permet la saisie de passphrases complexes et de labels sans jamais transmettre ces informations à l'ordinateur hôte.

## 2. Spécifications Techniques

| Wallet | Type Clavier | Layout | Caractères |
|--------|--------------|--------|------------|
| Ledger Stax | Tactile QWERTY | Full | A-Z, 0-9, symbols |
| Trezor Model T | Tactile QWERTY | Full | UTF-8 subset |
| Keystone 3 Pro | Tactile QWERTY | Full | A-Z, 0-9, symbols |
| Coldcard Mk4 | Physique numérique | 0-9 + AB | Limited |
| NGRAVE Zero | Tactile QWERTY | Full | A-Z, 0-9, symbols |

**Caractéristiques requises** :
- Majuscules/minuscules
- Chiffres 0-9
- Symboles spéciaux (!@#$%...)
- Espaces
- Caractères accentués (bonus)

**Ergonomie** :
- Taille écran minimum : 2.5"
- Résolution : 240x240 minimum
- Feedback : tactile ou vibration

## 3. Application aux Produits Crypto

| Type de Produit | Full Keyboard |
|-----------------|---------------|
| Hardware Wallets | Premium models |
| Air-gapped | Keystone, NGRAVE |
| Entry-level | Boutons uniquement |
| Smart Cards | Non applicable |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Boutons navigation |
| Intermédiaire | 56-70 | Clavier numérique |
| Avancé | 71-85 | QWERTY basique |
| Expert | 86-100 | QWERTY complet + symboles |

## 5. Sources et Références

- [Ledger Stax Specifications](https://www.ledger.com/stax)
- [Trezor Model T](https://trezor.io/trezor-model-t)
- [Keystone 3 Pro](https://keyst.one/keystone-3-pro)""",

    3879: """## 1. Vue d'ensemble

Le critère **Amount Verification on Device** (E58) évalue l'affichage et la confirmation du montant de transaction sur l'écran sécurisé du hardware wallet.

**Importance pour la sécurité crypto** : La vérification du montant sur device protège contre les malwares qui modifient les transactions avant signature.

## 2. Spécifications Techniques

| Information | Affichage requis |
|-------------|------------------|
| Montant envoyé | Valeur exacte + unité |
| Devise | BTC, ETH, USDT, etc. |
| Décimales | Complètes (8 pour BTC) |
| Équivalent fiat | Optionnel mais recommandé |
| Total avec frais | Montant + gas/fees |

**Formatage sécurisé** :
- Pas de troncature des montants
- Séparateur milliers clair
- Unité toujours visible
- Highlight changements vs preview

**Protections** :
- Comparaison montant host vs device
- Alerte si différence détectée
- Timeout confirmation : 30-60s

## 3. Application aux Produits Crypto

| Type de Produit | Amount on Device |
|-----------------|------------------|
| Hardware Wallets | Standard requis |
| Air-gapped | QR code montant |
| Software Wallets | Écran host (moins sécurisé) |
| CEX | N/A (custodial) |
| Smart Cards | Via app companion |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Montant sur host |
| Intermédiaire | 56-70 | Montant on-device |
| Avancé | 71-85 | + Équivalent fiat |
| Expert | 86-100 | + Comparaison automatique |

## 5. Sources et Références

- [Ledger Transaction Security](https://www.ledger.com/academy/security)
- [Hardware Wallet Best Practices](https://bitcoinops.org/en/topics/hardware-wallet-interface/)""",

    3880: """## 1. Vue d'ensemble

Le critère **Fee Verification on Device** (E59) évalue l'affichage et la confirmation des frais de transaction sur l'écran sécurisé.

**Importance pour la sécurité crypto** : La vérification des frais protège contre les attaques qui gonflent les fees pour voler des fonds (fee siphoning attacks).

## 2. Spécifications Techniques

| Réseau | Composants Fees |
|--------|-----------------|
| Bitcoin | sat/vB × size (vbytes) |
| Ethereum | (Base + Priority) × Gas limit |
| EIP-1559 | Max fee, Max priority fee |
| Solana | Fixed 5000 lamports + priority |

**Informations à afficher** :
- Fee rate (sat/vB ou gwei)
- Fee total estimé
- Pourcentage du montant envoyé
- Alerte si >5% du montant

**Protections** :
- Maximum fee cap configurable
- Alerte fees anormalement élevés
- Comparaison avec fee estimé

## 3. Application aux Produits Crypto

| Type de Produit | Fee Verification |
|-----------------|------------------|
| Hardware Wallets | Affichage on-device |
| Air-gapped | Dans QR transaction |
| Software Wallets | Popup confirmation |
| CEX | Fees fixes/affichés |
| DEX | Gas estimation visible |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Fee total affiché |
| Intermédiaire | 56-70 | Fee breakdown (base+priority) |
| Avancé | 71-85 | % du montant + alertes |
| Expert | 86-100 | Fee cap + anomaly detection |

## 5. Sources et Références

- [EIP-1559 Specification](https://eips.ethereum.org/EIPS/eip-1559)
- [Bitcoin Transaction Fees](https://bitcoinops.org/en/topics/fee-estimation/)""",

    3882: """## 1. Vue d'ensemble

Le critère **Cancel Button Physical** (E61) évalue la présence d'un bouton physique dédié pour annuler les opérations sur le hardware wallet.

**Importance pour la sécurité crypto** : Un bouton cancel physique permet d'annuler instantanément une transaction suspecte, même si l'interface logicielle est compromise.

## 2. Spécifications Techniques

| Wallet | Bouton Cancel | Emplacement | Feedback |
|--------|---------------|-------------|----------|
| Ledger Nano S | Gauche | Physique | LED |
| Ledger Nano X | Gauche | Physique | LED |
| Ledger Stax | Tactile | Écran | Haptic |
| Trezor One | Droit | Physique | Écran |
| Trezor Model T | Tactile | Écran | Tactile |
| Coldcard | X (5) | Physique | Écran |

**Caractéristiques requises** :
- Distinct du bouton confirm
- Accessible rapidement
- Feedback immédiat (visuel/tactile)
- Fonctionnel même si écran freeze

**Comportement** :
- Cancel = retour état précédent
- Pas de timeout automatique sans action
- Log de l'annulation (optionnel)

## 3. Application aux Produits Crypto

| Type de Produit | Physical Cancel |
|-----------------|-----------------|
| Hardware Wallets | Bouton dédié ou navigation |
| Air-gapped | Bouton physique |
| Smart Cards | Via app (pas physique) |
| Security Keys | Pas de cancel (touch=confirm) |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Cancel software only |
| Intermédiaire | 56-70 | Bouton navigation = cancel |
| Avancé | 71-85 | Bouton cancel dédié |
| Expert | 86-100 | Cancel + confirmation sonore/haptic |

## 5. Sources et Références

- [Ledger User Guide](https://support.ledger.com/hc/en-us)
- [Trezor User Manual](https://trezor.io/learn)""",

    3883: """## 1. Vue d'ensemble

Le critère **Navigation Buttons** (E62) évalue la qualité et l'ergonomie des boutons de navigation sur le hardware wallet.

**Importance pour la sécurité crypto** : Des boutons de navigation bien conçus réduisent les erreurs de manipulation lors de la vérification des transactions.

## 2. Spécifications Techniques

| Wallet | Type Boutons | Nombre | Durabilité |
|--------|--------------|--------|------------|
| Ledger Nano S/X | Physique | 2 | 1M cycles |
| Ledger Stax | Tactile | N/A | N/A |
| Trezor One | Physique | 2 | 500K cycles |
| Trezor Model T | Tactile | N/A | N/A |
| Coldcard Mk4 | Physique | 12 (numpad) | 1M cycles |
| Keystone 3 | Physique + tactile | 3 + touch | 500K cycles |

**Fonctions de navigation** :
- Haut/Bas ou Gauche/Droite : Scroll
- Confirm : Validation (souvent les 2 boutons)
- Cancel : Annulation
- Back : Retour menu précédent

**Ergonomie** :
- Espacement suffisant (>5mm)
- Feedback tactile clair
- Résistance : 0.5-1.5N
- Anti-accidental : Confirm nécessite action délibérée

## 3. Application aux Produits Crypto

| Type de Produit | Navigation Quality |
|-----------------|-------------------|
| Hardware Wallets | Variable selon modèle |
| Air-gapped | Généralement superior |
| Entry-level | 2 boutons minimum |
| Premium | Tactile + physique |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | 2 boutons, navigation lente |
| Intermédiaire | 56-70 | Navigation fluide, feedback |
| Avancé | 71-85 | Numpad ou tactile précis |
| Expert | 86-100 | Combinaison optimale + durabilité |

## 5. Sources et Références

- [Hardware Wallet Comparison](https://docs.google.com/spreadsheets/d/1LmtfcGDjg7i-V_cOV3bMVS9hB-qJiM_8KU9jm-4mAcg)
- [Coldcard Specifications](https://coldcard.com/docs/)"""
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
