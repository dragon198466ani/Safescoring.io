#!/usr/bin/env python3
"""Generate summaries for Ecosystem UX norms (E63-E74, E102-E130)."""

import requests
import time
import sys
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    3884: """## 1. Vue d'ensemble

Le critère **Scroll Wheel** (E63) évalue la présence d'une molette de défilement sur le hardware wallet.

**Importance pour la sécurité crypto** : Une molette permet une navigation plus rapide et précise lors de la vérification de longues adresses ou listes.

## 2. Spécifications Techniques

| Wallet | Type Scroll | Direction | Feedback |
|--------|-------------|-----------|----------|
| Coldcard Mk4 | Mécanique | Vertical | Clic |
| Ledger Flex | Tactile (swipe) | Multi | Haptic |
| SafePal S1 | Boutons D-pad | Multi | Écran |
| Keystone 3 | Tactile | Multi | Visual |

**Avantages molette** :
- Navigation rapide dans les listes
- Scroll précis pour adresses
- Moins de pressions boutons
- Fatigue réduite

**Types d'implémentation** :
- Mécanique : Encoder rotatif
- Tactile : Gesture recognition
- D-pad : Boutons directionnels

## 3. Application aux Produits Crypto

| Type de Produit | Scroll Wheel |
|-----------------|--------------|
| Hardware Wallets | Premium models |
| Desktop Apps | Mouse wheel |
| Mobile Apps | Touch scroll |
| Security Keys | Non applicable |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Boutons haut/bas seulement |
| Intermédiaire | 56-70 | D-pad navigation |
| Avancé | 71-85 | Scroll tactile |
| Expert | 86-100 | Molette mécanique + feedback |

## 5. Sources et Références

- [Coldcard Specifications](https://coldcard.com/docs/coldcard-mk4)
- [UI/UX Best Practices](https://www.nngroup.com/)""",

    3885: """## 1. Vue d'ensemble

Le critère **Gesture Controls** (E64) évalue le support des contrôles gestuels pour l'interaction.

**Importance pour la sécurité crypto** : Les gestes permettent une interaction intuitive mais doivent être configurés pour éviter les actions accidentelles.

## 2. Spécifications Techniques

| Geste | Action typique | Risque accidentel |
|-------|----------------|-------------------|
| Swipe left/right | Navigate | Faible |
| Swipe up/down | Scroll | Faible |
| Long press | Context menu | Moyen |
| Double tap | Confirm | Moyen |
| Pinch | Zoom | Faible |
| Shake | Cancel/Undo | Élevé |

**Implémentation sécurisée** :
- Confirmation explicite pour actions critiques
- Timeout pour gestes sensibles
- Option désactiver certains gestes
- Feedback visuel/haptic

## 3. Application aux Produits Crypto

| Type de Produit | Gesture Support |
|-----------------|-----------------|
| Hardware Wallets | Écrans tactiles premium |
| Mobile Wallets | Standard iOS/Android |
| Desktop Apps | Trackpad gestures |
| Web Apps | Mouse gestures (limité) |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Tap uniquement |
| Intermédiaire | 56-70 | Swipe + tap |
| Avancé | 71-85 | Full gesture set |
| Expert | 86-100 | Customizable + protection |

## 5. Sources et Références

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/gestures)
- [Material Design Gestures](https://m3.material.io/foundations/interaction/states/overview)""",

    3886: """## 1. Vue d'ensemble

Le critère **Voice Commands** (E65) évalue le support des commandes vocales pour l'interaction.

**Importance pour la sécurité crypto** : Les commandes vocales améliorent l'accessibilité mais posent des risques de confidentialité et d'activation accidentelle.

## 2. Spécifications Techniques

| Plateforme | Assistant | Privacy |
|------------|-----------|---------|
| iOS | Siri | On-device possible |
| Android | Google Assistant | Cloud processing |
| Custom | Wake word local | On-device |
| Amazon | Alexa | Cloud processing |

**Commandes sécurisées** :
- Check balance : OK (read-only)
- Send transaction : RISQUÉ (confirmation requise)
- Show seed : INTERDIT
- Navigate menu : OK

**Implémentation recommandée** :
- Commandes read-only seulement
- Pas d'opérations financières par voix
- Wake word personnalisé
- Processing local préféré

## 3. Application aux Produits Crypto

| Type de Produit | Voice Commands |
|-----------------|----------------|
| Hardware Wallets | Non recommandé |
| Mobile Wallets | Accessibilité uniquement |
| CEX Apps | Balance check possible |
| Smart Home | Dangereux |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Pas de voice |
| Intermédiaire | 56-70 | Read-only commands |
| Avancé | 71-85 | + On-device processing |
| Expert | 86-100 | + Customizable + auth |

## 5. Sources et Références

- [Apple Siri Privacy](https://www.apple.com/privacy/features/)
- [Voice UI Best Practices](https://developer.amazon.com/en-US/docs/alexa/alexa-design/get-started.html)""",

    3891: """## 1. Vue d'ensemble

Le critère **Miniscript Support** (E70) évalue le support de Miniscript pour les scripts Bitcoin avancés.

**Importance pour la sécurité crypto** : Miniscript permet de créer des conditions de dépense complexes et vérifiables pour Bitcoin.

## 2. Spécifications Techniques

| Composant | Description |
|-----------|-------------|
| Miniscript | Langage structuré sur Bitcoin Script |
| Descriptors | Description des outputs |
| Policy | Conditions de dépense |
| Analysis | Vérification automatique |

**Exemples de policies** :
```
and(pk(A),or(pk(B),after(1000)))
thresh(2,pk(A),pk(B),pk(C))
or(pk(main),and(pk(backup),after(90d)))
```

**Avantages** :
- Scripts vérifiables
- Composition sécurisée
- Analysis de coûts
- Hardware wallet friendly

## 3. Application aux Produits Crypto

| Type de Produit | Miniscript Support |
|-----------------|-------------------|
| Hardware Wallets | Ledger, Coldcard, Jade |
| Software Wallets | Sparrow, Specter, Liana |
| Multisig | Caravan, Nunchuk |
| Lightning | Limited |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Single-sig only |
| Intermédiaire | 56-70 | Basic multisig |
| Avancé | 71-85 | Miniscript read |
| Expert | 86-100 | Full Miniscript + policies |

## 5. Sources et Références

- [Bitcoin Miniscript](https://bitcoin.sipa.be/miniscript/)
- [BIP-379 Miniscript](https://github.com/bitcoin/bips/blob/master/bip-0379.mediawiki)""",

    3894: """## 1. Vue d'ensemble

Le critère **Multiple Device Sync** (E73) évalue la synchronisation entre plusieurs appareils.

**Importance pour la sécurité crypto** : La sync multi-device doit maintenir la sécurité sans exposer les clés privées.

## 2. Spécifications Techniques

| Méthode Sync | Sécurité | Données |
|--------------|----------|---------|
| xpub sync | Élevée | Read-only |
| Encrypted cloud | Moyenne | Metadata |
| Local network | Élevée | Direct |
| QR code | Très élevée | Manual |

**Données synchronisables** :
- Adresses (watch-only)
- Labels et notes
- Historique transactions
- Paramètres interface
- JAMAIS : Clés privées, seed

**Protocoles** :
- BIP-129 BSMS : Multisig coordination
- UR (Uniform Resources) : QR data
- Custom encrypted sync

## 3. Application aux Produits Crypto

| Type de Produit | Multi-Device Sync |
|-----------------|-------------------|
| Hardware Wallets | Via software companion |
| Software Wallets | Native sync possible |
| CEX | Account-based (cloud) |
| Watch-only | xpub sharing |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Manual export/import |
| Intermédiaire | 56-70 | xpub sync |
| Avancé | 71-85 | Encrypted cloud sync |
| Expert | 86-100 | E2E encrypted + selective |

## 5. Sources et Références

- [BIP-129 BSMS](https://github.com/bitcoin/bips/blob/master/bip-0129.mediawiki)
- [Uniform Resources](https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-005-ur.md)""",

    3895: """## 1. Vue d'ensemble

Le critère **Cloud Backup Encrypted** (E74) évalue les options de backup cloud chiffré.

**Importance pour la sécurité crypto** : Le backup cloud est pratique mais doit être chiffré côté client pour éviter les risques de compromission.

## 2. Spécifications Techniques

| Service | Chiffrement | Client-side |
|---------|-------------|-------------|
| iCloud Keychain | AES-256 | Oui |
| Google Drive | AES-256 | Serveur |
| Dropbox | AES-256 | Serveur |
| Custom E2E | Variable | Oui |

**Chiffrement recommandé** :
- AES-256-GCM : Données
- scrypt/Argon2id : Dérivation mot de passe
- PBKDF2 : Minimum acceptable
- Clé indépendante du provider

**Risques cloud** :
- Account compromise
- Provider breach
- Government access
- Key escrow (certains services)

## 3. Application aux Produits Crypto

| Type de Produit | Cloud Backup |
|-----------------|--------------|
| Hardware Wallets | Généralement non |
| Software Wallets | Optionnel, E2E |
| Mobile Wallets | iOS Keychain / Android Keystore |
| CEX | N/A (custodial) |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Cloud sans E2E |
| Intermédiaire | 56-70 | Provider encryption |
| Avancé | 71-85 | Client-side E2E |
| Expert | 86-100 | E2E + key derivation forte |

## 5. Sources et Références

- [Apple iCloud Security](https://support.apple.com/en-us/HT202303)
- [Cryptographic Best Practices](https://www.owasp.org/index.php/Cryptographic_Storage_Cheat_Sheet)""",

    4025: """## 1. Vue d'ensemble

Le critère **DEX Aggregator** (E102) évalue l'intégration d'agrégateurs DEX pour optimiser les swaps.

**Importance pour la sécurité crypto** : Les agrégateurs trouvent les meilleurs prix mais ajoutent une couche de smart contracts et de confiance.

## 2. Spécifications Techniques

| Agrégateur | Chains | Sources | Routing |
|------------|--------|---------|---------|
| 1inch | 11+ | 300+ | Pathfinder |
| 0x | 8+ | 100+ | Swap API |
| ParaSwap | 7+ | 100+ | MultiPath |
| CowSwap | Ethereum | MEV protect | Batch |
| Jupiter | Solana | 30+ | Metis |

**Avantages agrégation** :
- Meilleurs prix (arbitrage)
- Routing optimal (split trades)
- Moins de slippage
- Gas optimization

**Risques** :
- Smart contract additionnel
- Routing complexity
- Dependency externe

## 3. Application aux Produits Crypto

| Type de Produit | DEX Aggregator |
|-----------------|----------------|
| Hardware Wallets | Via DApp browser |
| Software Wallets | Integration native |
| CEX | Non applicable |
| Mobile Wallets | 1inch, Jupiter common |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Single DEX |
| Intermédiaire | 56-70 | 1 aggregator |
| Avancé | 71-85 | Multiple aggregators |
| Expert | 86-100 | + MEV protection |

## 5. Sources et Références

- [1inch Documentation](https://docs.1inch.io/)
- [Jupiter Documentation](https://docs.jup.ag/)""",

    4026: """## 1. Vue d'ensemble

Le critère **Bridge Integration** (E103) évalue l'intégration de bridges cross-chain dans l'interface.

**Importance pour la sécurité crypto** : Les bridges sont des points de risque majeurs; une bonne intégration doit informer des risques et utiliser des bridges audités.

## 2. Spécifications Techniques

| Bridge | Type | TVL | Sécurité |
|--------|------|-----|----------|
| Stargate | Omnichain | $500M+ | LayerZero |
| Across | Optimistic | $100M+ | UMA oracle |
| Hop | Native + AMM | $50M+ | Bonders |
| Synapse | AMM | $100M+ | Validators |
| Wormhole | Guardian | $1B+ | 19 guardians |

**Types de bridges** :
- Lock & Mint : Original locked, wrapped minted
- Burn & Mint : Native on both chains
- Liquidity Network : AMM pools
- Atomic Swap : Trustless (rare)

**Risques bridges** :
- Smart contract exploits
- Oracle manipulation
- Validator collusion

## 3. Application aux Produits Crypto

| Type de Produit | Bridge Integration |
|-----------------|-------------------|
| Hardware Wallets | Via DApp browser |
| Software Wallets | Integrated or link |
| CEX | Internal bridging |
| Portfolio Apps | Multi-chain view |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Liens externes |
| Intermédiaire | 56-70 | 1-2 bridges intégrés |
| Avancé | 71-85 | Aggregator (LI.FI, Socket) |
| Expert | 86-100 | + Risk warnings + audited |

## 5. Sources et Références

- [L2Beat Bridges](https://l2beat.com/bridges)
- [DeFi Llama Bridges](https://defillama.com/bridges)""",

    4027: """## 1. Vue d'ensemble

Le critère **Yield Farming Display** (E104) évalue l'affichage des opportunités et positions de yield farming.

**Importance pour la sécurité crypto** : Un bon affichage permet de comprendre les risques (IL, smart contract) et les rendements réels.

## 2. Spécifications Techniques

| Métrique | Description | Source |
|----------|-------------|--------|
| APY | Annual Percentage Yield | Protocol |
| APR | Annual Percentage Rate | Calculé |
| TVL | Total Value Locked | DeFi Llama |
| IL | Impermanent Loss | Calculé |
| Rewards | Tokens earned | Contract |

**Informations essentielles** :
- APY breakdown (base + rewards)
- IL estimation
- Lock-up periods
- Protocol risk score
- Audit status

**Calculs** :
- APY = (1 + APR/n)^n - 1
- IL = 2*sqrt(p) / (1+p) - 1

## 3. Application aux Produits Crypto

| Type de Produit | Yield Display |
|-----------------|---------------|
| Hardware Wallets | Via companion apps |
| Software Wallets | DeBank, Zapper |
| CEX | Earn products |
| Portfolio Apps | Aggregated view |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | APY simple |
| Intermédiaire | 56-70 | APY + TVL |
| Avancé | 71-85 | + IL + Breakdown |
| Expert | 86-100 | + Risk score + Historical |

## 5. Sources et Références

- [DeFi Llama](https://defillama.com/)
- [DeBank](https://debank.com/)""",

    4028: """## 1. Vue d'ensemble

Le critère **LP Position Tracking** (E105) évalue le suivi des positions de liquidity provider.

**Importance pour la sécurité crypto** : Le tracking LP permet de surveiller l'impermanent loss et les rewards accumulés.

## 2. Spécifications Techniques

| Protocole | Type LP | Tracking |
|-----------|---------|----------|
| Uniswap V2 | Constant Product | ERC-20 LP token |
| Uniswap V3 | Concentrated | NFT position |
| Curve | StableSwap | LP token |
| Balancer | Weighted | BPT token |

**Métriques LP** :
- Position value (token A + B)
- IL (vs HODL)
- Fees earned
- Rewards (farming)
- Range (V3)

**Tracking challenges** :
- V3 NFT positions complexes
- Multi-pool farming
- Historical data

## 3. Application aux Produits Crypto

| Type de Produit | LP Tracking |
|-----------------|-------------|
| Hardware Wallets | Limité |
| Portfolio Apps | DeBank, Zapper, Zerion |
| DEX Native | Position page |
| Analytics | Revert, APY.Vision |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Balance LP tokens |
| Intermédiaire | 56-70 | + Value breakdown |
| Avancé | 71-85 | + IL calculation |
| Expert | 86-100 | + Historical + Alerts |

## 5. Sources et Références

- [Revert Finance](https://revert.finance/)
- [APY.Vision](https://apy.vision/)""",

    4029: """## 1. Vue d'ensemble

Le critère **Lending Protocols** (E106) évalue l'intégration des protocoles de lending DeFi.

**Importance pour la sécurité crypto** : L'intégration lending doit afficher clairement les risques de liquidation et les taux variables.

## 2. Spécifications Techniques

| Protocole | TVL | Chains | Model |
|-----------|-----|--------|-------|
| Aave | $10B+ | 8+ | Pool-based |
| Compound | $3B+ | 2 | Pool-based |
| MakerDAO | $8B+ | 1 | CDP |
| Morpho | $2B+ | 2 | P2P matching |
| Spark | $3B+ | 1 | Fork Aave |

**Métriques lending** :
- Supply APY
- Borrow APY
- Utilization rate
- Health factor
- Liquidation threshold

**Risques** :
- Liquidation cascade
- Oracle failure
- Smart contract exploit
- Bad debt accumulation

## 3. Application aux Produits Crypto

| Type de Produit | Lending Integration |
|-----------------|---------------------|
| Hardware Wallets | Via DApp browser |
| Software Wallets | Embedded UIs |
| CEX | Centralized lending |
| Portfolio Apps | Position aggregation |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Links externes |
| Intermédiaire | 56-70 | 1-2 protocols |
| Avancé | 71-85 | + Health monitoring |
| Expert | 86-100 | + Liquidation alerts |

## 5. Sources et Références

- [Aave Documentation](https://docs.aave.com/)
- [DeFi Safety](https://www.defisafety.com/)""",

    4030: """## 1. Vue d'ensemble

Le critère **NFT Marketplace** (E107) évalue l'intégration de marketplaces NFT dans l'interface.

**Importance pour la sécurité crypto** : Les marketplaces NFT impliquent des approvals de tokens; une bonne intégration doit alerter sur les permissions accordées.

## 2. Spécifications Techniques

| Marketplace | Chains | Fees | Protocol |
|-------------|--------|------|----------|
| OpenSea | Multi | 2.5% | Seaport |
| Blur | ETH | 0% | Blend |
| Magic Eden | Multi | 2% | Custom |
| LooksRare | ETH | 2% | Custom |
| Tensor | SOL | 0% | Compressed |

**Standards NFT** :
- ERC-721 : NFT unique
- ERC-1155 : Multi-token
- Metaplex : Solana standard
- Ordinals : Bitcoin inscriptions

**Risques marketplaces** :
- Malicious approvals
- Fake collections
- Wash trading
- Rugpulls

## 3. Application aux Produits Crypto

| Type de Produit | NFT Marketplace |
|-----------------|-----------------|
| Hardware Wallets | Limité (signing) |
| Software Wallets | Browser + embed |
| Mobile Wallets | Native integration |
| Portfolio Apps | Collection view |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | NFT display only |
| Intermédiaire | 56-70 | Send/receive NFT |
| Avancé | 71-85 | 1-2 marketplaces |
| Expert | 86-100 | + Aggregator + warnings |

## 5. Sources et Références

- [OpenSea Documentation](https://docs.opensea.io/)
- [Seaport Protocol](https://github.com/ProjectOpenSea/seaport)""",

    4033: """## 1. Vue d'ensemble

Le critère **Screen Reader NVDA** (E110) évalue la compatibilité avec le lecteur d'écran NVDA sous Windows.

**Importance pour la sécurité crypto** : NVDA est le lecteur d'écran open-source le plus utilisé; sa compatibilité permet aux utilisateurs malvoyants de gérer leurs crypto en sécurité.

## 2. Spécifications Techniques

| Caractéristique | NVDA |
|-----------------|------|
| Licence | Open source (GPL) |
| Plateforme | Windows 7+ |
| Part de marché | 40.6% |
| Speech | eSpeak NG, Windows |
| Braille | Support natif |

**Compatibilité requise** :
- ARIA landmarks
- Focus management
- Live regions (transactions)
- Form labeling
- Table navigation

**Test NVDA** :
1. Navigation Tab
2. Lecture formulaires
3. Tableaux transactions
4. Alertes live regions
5. Modales accessibles

## 3. Application aux Produits Crypto

| Type de Produit | NVDA Support |
|-----------------|--------------|
| Hardware Wallets | Companion apps |
| Desktop Wallets | Windows apps |
| Web Wallets | Browser-based |
| CEX Web | Full ARIA |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Basic reading |
| Intermédiaire | 56-70 | Full navigation |
| Avancé | 71-85 | Forms + tables |
| Expert | 86-100 | User tested |

## 5. Sources et Références

- [NVDA User Guide](https://www.nvaccess.org/files/nvda/documentation/userGuide.html)
- [WAI-ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)""",

    4034: """## 1. Vue d'ensemble

Le critère **Screen Reader VoiceOver** (E111) évalue la compatibilité avec VoiceOver sur iOS et macOS.

**Importance pour la sécurité crypto** : VoiceOver est le lecteur d'écran natif d'Apple, utilisé par des millions d'utilisateurs.

## 2. Spécifications Techniques

| Plateforme | Version | Part marché |
|------------|---------|-------------|
| iOS | Depuis iOS 3 | 12.9% |
| macOS | Depuis OS X 10.4 | Inclus |
| Gestures | iOS specific | Swipe, rotor |
| Braille | Support | BrailleScreen |

**Gestes VoiceOver iOS** :
- Swipe gauche/droite : Navigation
- Double tap : Activation
- Rotor : Options contextuelles
- 3 finger swipe : Scroll

**Implémentation** :
- UIAccessibility (iOS)
- NSAccessibility (macOS)
- accessibilityLabel obligatoire
- accessibilityHint recommandé

## 3. Application aux Produits Crypto

| Type de Produit | VoiceOver Support |
|-----------------|-------------------|
| Hardware Wallets | iOS companion |
| iOS Wallets | Native required |
| macOS Wallets | Desktop apps |
| Web Apps | Safari + ARIA |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Labels basiques |
| Intermédiaire | 56-70 | Full navigation |
| Avancé | 71-85 | Rotor actions |
| Expert | 86-100 | User tested |

## 5. Sources et Références

- [Apple VoiceOver](https://www.apple.com/accessibility/vision/)
- [iOS Accessibility Programming Guide](https://developer.apple.com/accessibility/ios/)""",

    4036: """## 1. Vue d'ensemble

Le critère **Large Text Support** (E113) évalue le support des grandes tailles de texte pour accessibilité.

**Importance pour la sécurité crypto** : Les utilisateurs malvoyants doivent pouvoir lire clairement les adresses et montants pour éviter les erreurs.

## 2. Spécifications Techniques

| Plateforme | Dynamic Type | Tailles |
|------------|--------------|---------|
| iOS | UIFontMetrics | xSmall → AX5 |
| Android | sp units | 12sp → 30sp+ |
| Web | rem units | 1rem → 2rem+ |
| Windows | System scale | 100% → 400% |

**Niveaux recommandés** :
- Normal : 16px base
- Large : 20-24px
- Extra large : 28-32px
- Accessibility : 40px+

**Implémentation** :
- Relative units (rem, sp)
- Layout flexible (no truncation)
- Min touch target 44x44px
- Reflow at 400% zoom

## 3. Application aux Produits Crypto

| Type de Produit | Large Text |
|-----------------|------------|
| Hardware Wallets | Fixed screen size |
| Mobile Apps | Dynamic Type |
| Desktop Apps | System scaling |
| Web Apps | Browser zoom |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Fixed text |
| Intermédiaire | 56-70 | 2-3 sizes |
| Avancé | 71-85 | System settings respect |
| Expert | 86-100 | Full Dynamic Type |

## 5. Sources et Références

- [Apple Dynamic Type](https://developer.apple.com/design/human-interface-guidelines/typography)
- [WCAG 1.4.4 Resize Text](https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html)""",

    4037: """## 1. Vue d'ensemble

Le critère **Voice Control** (E114) évalue le support du contrôle vocal pour l'accessibilité.

**Importance pour la sécurité crypto** : Le contrôle vocal permet aux utilisateurs à mobilité réduite d'interagir avec leurs wallets.

## 2. Spécifications Techniques

| Plateforme | Fonctionnalité | Commandes |
|------------|----------------|-----------|
| iOS | Voice Control | "Tap [element]" |
| macOS | Voice Control | "Click [label]" |
| Android | Voice Access | "Tap [number]" |
| Windows | Voice Access | "Click [name]" |

**Commandes typiques** :
- Navigation : "Go to settings"
- Action : "Tap send button"
- Dictation : "Type amount 0.1"
- Scroll : "Scroll down"

**Implémentation** :
- Labels accessibles obligatoires
- Noms uniques pour éléments
- Pas de texte dans images

## 3. Application aux Produits Crypto

| Type de Produit | Voice Control |
|-----------------|---------------|
| Hardware Wallets | Non applicable |
| Mobile Wallets | OS voice control |
| Desktop Wallets | OS voice control |
| Web Apps | Browser support |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Non testé |
| Intermédiaire | 56-70 | Basic navigation |
| Avancé | 71-85 | Full interaction |
| Expert | 86-100 | + Custom commands |

## 5. Sources et Références

- [Apple Voice Control](https://support.apple.com/en-us/HT210417)
- [Android Voice Access](https://support.google.com/accessibility/android/answer/6151848)""",

    4038: """## 1. Vue d'ensemble

Le critère **Haptic Feedback** (E115) évalue le retour haptique pour confirmation d'actions.

**Importance pour la sécurité crypto** : Le feedback haptique confirme les actions sans regarder l'écran, important pour les utilisateurs malvoyants.

## 2. Spécifications Techniques

| Plateforme | API | Intensités |
|------------|-----|------------|
| iOS | UIFeedbackGenerator | Light, Medium, Heavy |
| Android | Vibrator | Duration, Pattern |
| Taptic Engine | iPhone | Précision fine |
| Hardware | Motors | Variable |

**Types de feedback** :
- Selection : Léger (navigation)
- Impact : Moyen (confirmation)
- Notification : Pattern (alertes)
- Error : Double (échec)

**Utilisation crypto** :
- Transaction confirmée
- Bouton pressé (HW wallet)
- Erreur de saisie
- Navigation menu

## 3. Application aux Produits Crypto

| Type de Produit | Haptic Feedback |
|-----------------|-----------------|
| Hardware Wallets | Ledger Stax, Keystone |
| Mobile Wallets | Standard iOS/Android |
| Desktop | Limité (trackpad Mac) |
| Security Keys | Touch confirm |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Pas de haptic |
| Intermédiaire | 56-70 | Basic vibration |
| Avancé | 71-85 | Contextual feedback |
| Expert | 86-100 | Custom patterns |

## 5. Sources et Références

- [Apple Haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)
- [Android Haptics](https://developer.android.com/develop/ui/views/haptics)""",

    4039: """## 1. Vue d'ensemble

Le critère **Color Blind Mode** (E116) évalue le support des modes daltoniens.

**Importance pour la sécurité crypto** : 8% des hommes sont daltoniens; les indicateurs de sécurité doivent être compréhensibles sans couleur seule.

## 2. Spécifications Techniques

| Type daltonisme | Population | Couleurs affectées |
|-----------------|------------|-------------------|
| Deutéranomalie | 6% hommes | Vert |
| Protanomalie | 1% hommes | Rouge |
| Tritanomalie | 0.01% | Bleu |
| Achromatopsie | 0.003% | Toutes |

**Techniques d'adaptation** :
- Motifs en plus de couleurs
- Icônes + couleurs
- Labels textuels
- Contraste suffisant

**Combinaisons à éviter** :
- Rouge/Vert (classique)
- Orange/Vert
- Bleu/Violet
- Rose/Gris

## 3. Application aux Produits Crypto

| Type de Produit | Color Blind Mode |
|-----------------|------------------|
| Hardware Wallets | Écran + motifs |
| Software Wallets | Mode disponible |
| CEX | Souvent manquant |
| Charts | Critical (trading) |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Couleur seule |
| Intermédiaire | 56-70 | + Icônes |
| Avancé | 71-85 | Mode dédié |
| Expert | 86-100 | + User tested |

## 5. Sources et Références

- [Color Blindness Simulator](https://www.color-blindness.com/coblis-color-blindness-simulator/)
- [WCAG 1.4.1 Use of Color](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html)""",

    4040: """## 1. Vue d'ensemble

Le critère **Dyslexia Font Option** (E117) évalue le support de polices adaptées à la dyslexie.

**Importance pour la sécurité crypto** : 10-15% de la population est dyslexique; une police adaptée réduit les erreurs de lecture d'adresses.

## 2. Spécifications Techniques

| Police | Licence | Caractéristiques |
|--------|---------|------------------|
| OpenDyslexic | Open | Lettres lestées |
| Lexie Readable | Gratuit | Formes distinctes |
| Dyslexie | Payant | Weighted bottom |
| Comic Sans | Standard | Formes irrégulières |

**Caractéristiques polices dyslexie** :
- Base lourde (ancrage)
- Lettres distinctes (b/d, p/q)
- Espacement généreux
- Ascendantes/descendantes longues

**Paramètres supplémentaires** :
- Line spacing : 1.5x minimum
- Letter spacing : +0.12em
- Word spacing : +0.16em
- Column width : 60-70 caractères

## 3. Application aux Produits Crypto

| Type de Produit | Dyslexia Font |
|-----------------|---------------|
| Hardware Wallets | Non (écran limité) |
| Software Wallets | Option possible |
| Web Apps | Custom fonts |
| Mobile | System font override |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Police standard |
| Intermédiaire | 56-70 | High readability font |
| Avancé | 71-85 | Dyslexia font option |
| Expert | 86-100 | + Spacing controls |

## 5. Sources et Références

- [OpenDyslexic Font](https://opendyslexic.org/)
- [British Dyslexia Association Style Guide](https://www.bdadyslexia.org.uk/advice/employers/creating-a-dyslexia-friendly-workplace/dyslexia-friendly-style-guide)"""
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
