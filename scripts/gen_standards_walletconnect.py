#!/usr/bin/env python3
"""Generate summaries for WalletConnect, ISO standards and integration norms."""

import requests
import time
import sys
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    4041: """## 1. Vue d'ensemble

Le critère **WalletConnect v2** (E118) évalue le support de WalletConnect v2 pour la connexion aux DApps.

**Importance pour la sécurité crypto** : WalletConnect v2 améliore la sécurité avec le chiffrement E2E et les sessions multi-chain.

## 2. Spécifications Techniques

| Feature | v1 | v2 |
|---------|----|----|
| Protocol | Bridge | Relay (Irn) |
| Sessions | Single chain | Multi-chain |
| Encryption | AES-256-CBC | X25519 + ChaCha20 |
| Pairing | QR unique | QR réutilisable |
| Push | Non | Oui (Echo) |

**Architecture v2** :
- Pairing : URI pour établir connexion
- Sessions : Namespaces multi-chain
- Events : Notifications temps réel
- Auth : Sign-in with Ethereum

**Namespaces** :
- eip155 : EVM chains
- solana : Solana
- cosmos : Cosmos chains
- polkadot : Polkadot

## 3. Application aux Produits Crypto

| Type de Produit | WalletConnect v2 |
|-----------------|------------------|
| Hardware Wallets | Via companion |
| Mobile Wallets | Standard intégré |
| Desktop Wallets | Support variable |
| Browser Extensions | Alternative à injection |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | WC v1 only |
| Intermédiaire | 56-70 | WC v2 single chain |
| Avancé | 71-85 | WC v2 multi-chain |
| Expert | 86-100 | + Push + Auth |

## 5. Sources et Références

- [WalletConnect v2 Docs](https://docs.walletconnect.com/2.0)
- [WalletConnect Protocol](https://github.com/WalletConnect/walletconnect-specs)""",

    4042: """## 1. Vue d'ensemble

Le critère **Coinbase Wallet SDK** (E119) évalue l'intégration du SDK Coinbase Wallet.

**Importance pour la sécurité crypto** : Le SDK permet une connexion sécurisée entre DApps et Coinbase Wallet sans exposer les clés.

## 2. Spécifications Techniques

| Feature | Description |
|---------|-------------|
| Connection | Smart Wallet / Browser Extension |
| Chains | EVM compatible |
| Mobile | Deep linking |
| Desktop | Browser extension |
| Auth | Sign-in methods |

**Smart Wallet** :
- Account Abstraction (4337)
- Passkeys authentication
- Gas sponsoring possible
- Session keys

**Intégration** :
```javascript
import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk'
const sdk = new CoinbaseWalletSDK({ appName: 'MyDApp' })
```

## 3. Application aux Produits Crypto

| Type de Produit | Coinbase SDK |
|-----------------|--------------|
| Hardware Wallets | Non applicable |
| DApps | Standard integration |
| Mobile Apps | Deep linking |
| CEX | Native Coinbase |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Pas de support |
| Intermédiaire | 56-70 | Basic connection |
| Avancé | 71-85 | Smart Wallet |
| Expert | 86-100 | + Passkeys + Sponsor |

## 5. Sources et Références

- [Coinbase Wallet SDK](https://docs.cloud.coinbase.com/wallet-sdk/)
- [Coinbase Smart Wallet](https://www.smartwallet.dev/)""",

    4043: """## 1. Vue d'ensemble

Le critère **Ledger Live Compatible** (E120) évalue la compatibilité avec Ledger Live.

**Importance pour la sécurité crypto** : Ledger Live est l'interface officielle des hardware wallets Ledger, utilisée par des millions d'utilisateurs.

## 2. Spécifications Techniques

| Feature | Description |
|---------|-------------|
| Plateformes | Windows, macOS, Linux, Mobile |
| Coins | 5,500+ |
| Staking | Native pour certains |
| DApps | Discover tab |
| NFT | Support intégré |

**Intégration DApp** :
- Ledger Connect Kit
- iframe embedding
- WalletConnect
- Manifest submission

**Hardware supporté** :
- Nano S / S Plus
- Nano X
- Stax

## 3. Application aux Produits Crypto

| Type de Produit | Ledger Live |
|-----------------|-------------|
| Hardware Wallets | Ledger officiel |
| DApps | Integration possible |
| Exchanges | API connection |
| Portfolio | Import accounts |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Non compatible |
| Intermédiaire | 56-70 | Basic transactions |
| Avancé | 71-85 | Discover listing |
| Expert | 86-100 | Full integration |

## 5. Sources et Références

- [Ledger Developer Portal](https://developers.ledger.com/)
- [Ledger Connect Kit](https://developers.ledger.com/docs/transport/connect-kit/)""",

    4044: """## 1. Vue d'ensemble

Le critère **Trezor Suite Compatible** (E121) évalue la compatibilité avec Trezor Suite.

**Importance pour la sécurité crypto** : Trezor Suite est l'application officielle des hardware wallets Trezor avec des features avancées de sécurité.

## 2. Spécifications Techniques

| Feature | Description |
|---------|-------------|
| Plateformes | Windows, macOS, Linux, Web |
| Coins | 1,000+ |
| Coinjoin | Native (Wasabi) |
| Tor | Intégré |
| Passphrase | Support complet |

**Features Trezor Suite** :
- Coinjoin privacy
- Tor routing
- Discreet mode
- Custom backends

**Hardware supporté** :
- Trezor One
- Trezor Model T
- Trezor Safe 3

## 3. Application aux Produits Crypto

| Type de Produit | Trezor Suite |
|-----------------|--------------|
| Hardware Wallets | Trezor officiel |
| Third-party HW | Non |
| DApps | Via web wallet |
| Software | Connect API |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Non compatible |
| Intermédiaire | 56-70 | Basic Trezor Connect |
| Avancé | 71-85 | Full Connect API |
| Expert | 86-100 | + Coinjoin support |

## 5. Sources et Références

- [Trezor Developer Documentation](https://docs.trezor.io/)
- [Trezor Connect](https://github.com/trezor/connect)""",

    4045: """## 1. Vue d'ensemble

Le critère **Hardware Wallet Bridge** (E122) évalue le support de bridge pour hardware wallets.

**Importance pour la sécurité crypto** : Les bridges permettent la communication entre navigateurs/apps et hardware wallets.

## 2. Spécifications Techniques

| Bridge | Vendeur | Transport |
|--------|---------|-----------|
| Ledger Live | Ledger | USB HID, BLE |
| Trezor Bridge | Trezor | WebUSB, USB HID |
| Lattice Bridge | GridPlus | WebSocket |
| Keystone | Keystone | QR (air-gapped) |

**Méthodes de connexion** :
- WebUSB : Direct browser access
- USB HID : Via bridge app
- Bluetooth LE : Wireless
- QR codes : Air-gapped

**Sécurité bridges** :
- Communication chiffrée
- Signature verification
- No private key exposure
- MITM protection

## 3. Application aux Produits Crypto

| Type de Produit | HW Bridge Support |
|-----------------|-------------------|
| DApps | Essential for HW |
| Software Wallets | Integration layer |
| Browser Extensions | Native support |
| Mobile Apps | BLE / QR |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Pas de HW support |
| Intermédiaire | 56-70 | 1 vendor support |
| Avancé | 71-85 | Multi-vendor |
| Expert | 86-100 | + Air-gapped QR |

## 5. Sources et Références

- [WebUSB API](https://wicg.github.io/webusb/)
- [Web Bluetooth API](https://webbluetoothcg.github.io/web-bluetooth/)""",

    4046: """## 1. Vue d'ensemble

Le critère **Import/Export Accounts** (E123) évalue les capacités d'import et export de comptes.

**Importance pour la sécurité crypto** : L'interopérabilité entre wallets nécessite des formats d'export sécurisés et standardisés.

## 2. Spécifications Techniques

| Format | Standard | Usage |
|--------|----------|-------|
| BIP-39 | Mnemonic | Seed phrase |
| Keystore | JSON | Ethereum |
| WIF | Base58Check | Bitcoin |
| xpub | BIP-32 | Watch-only |
| Descriptor | BIP-380+ | Output scripts |

**Formats export** :
- JSON encrypted : Keystore v3
- Plain text : Seed (DANGER)
- QR code : Air-gapped
- Hardware : Never exported

**Sécurité export** :
- Encryption obligatoire
- Password strength check
- Secure clipboard handling
- No cloud sync

## 3. Application aux Produits Crypto

| Type de Produit | Import/Export |
|-----------------|---------------|
| Hardware Wallets | xpub export only |
| Software Wallets | Full support |
| CEX | Deposit addresses |
| Watch-only | xpub import |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Seed only |
| Intermédiaire | 56-70 | + Keystore JSON |
| Avancé | 71-85 | + xpub + Descriptors |
| Expert | 86-100 | + QR + Encryption |

## 5. Sources et Références

- [BIP-39 Specification](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [Web3 Secret Storage](https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition)""",

    4047: """## 1. Vue d'ensemble

Le critère **QR Animated (UR)** (E124) évalue le support des QR codes animés (Uniform Resources).

**Importance pour la sécurité crypto** : Les UR permettent de transférer des données volumineuses (PSBT, transactions) via QR codes entre appareils air-gapped.

## 2. Spécifications Techniques

| Standard | Organisme | Application |
|----------|-----------|-------------|
| UR (Uniform Resources) | Blockchain Commons | Multi-part QR |
| BCR-2020-005 | Blockchain Commons | UR specification |
| Fountain Codes | Research | Error correction |

**Types UR** :
- crypto-psbt : PSBT transactions
- crypto-account : Account descriptors
- crypto-output : Output descriptors
- crypto-hdkey : HD keys

**Caractéristiques** :
- Multi-part : Split large data
- Fountain codes : Loss tolerant
- Self-describing : Type in payload
- CBOR encoded : Compact binary

## 3. Application aux Produits Crypto

| Type de Produit | UR Support |
|-----------------|------------|
| Hardware Wallets | Keystone, Jade, Passport |
| Software Wallets | Sparrow, BlueWallet |
| Air-gapped | Essential |
| Mobile Scanners | Standard QR libs |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Static QR only |
| Intermédiaire | 56-70 | Basic animated |
| Avancé | 71-85 | UR standard |
| Expert | 86-100 | + All UR types |

## 5. Sources et Références

- [Blockchain Commons UR](https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-005-ur.md)
- [Fountain Codes](https://en.wikipedia.org/wiki/Fountain_code)""",

    4048: """## 1. Vue d'ensemble

Le critère **CBOR Encoding** (E125) évalue le support de l'encodage CBOR pour les données crypto.

**Importance pour la sécurité crypto** : CBOR est un format binaire compact utilisé dans les standards modernes (UR, FIDO2, COSE).

## 2. Spécifications Techniques

| Caractéristique | CBOR | JSON |
|-----------------|------|------|
| Format | Binaire | Texte |
| Taille | Compact | Verbose |
| Types | Riche | Limité |
| Standard | RFC 8949 | RFC 8259 |
| Parsing | Streaming | Full load |

**Utilisations crypto** :
- Uniform Resources (UR)
- FIDO2/WebAuthn
- COSE signatures
- PSBT extensions

**Types CBOR** :
- Integers : Signed/unsigned
- Byte strings : Binary data
- Text strings : UTF-8
- Arrays/Maps : Collections
- Tags : Semantic meaning

## 3. Application aux Produits Crypto

| Type de Produit | CBOR Usage |
|-----------------|------------|
| Hardware Wallets | UR transactions |
| Security Keys | FIDO2 messages |
| Air-gapped | QR data |
| Protocols | Data serialization |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | JSON only |
| Intermédiaire | 56-70 | CBOR parsing |
| Avancé | 71-85 | Full CBOR support |
| Expert | 86-100 | + COSE + UR |

## 5. Sources et Références

- [RFC 8949 - CBOR](https://datatracker.ietf.org/doc/html/rfc8949)
- [CBOR.io](https://cbor.io/)""",

    4050: """## 1. Vue d'ensemble

Le critère **Transaction Alerts** (E127) évalue le système d'alertes pour les transactions.

**Importance pour la sécurité crypto** : Les alertes temps réel permettent de détecter les transactions non autorisées rapidement.

## 2. Spécifications Techniques

| Type alerte | Trigger | Urgence |
|-------------|---------|---------|
| Incoming | Nouvelle réception | Info |
| Outgoing | Envoi détecté | Haute |
| Large amount | > seuil défini | Critique |
| Failed | Erreur transaction | Moyenne |
| Pending long | > X blocks | Moyenne |

**Canaux de notification** :
- Push mobile
- Email
- SMS (premium)
- In-app
- Telegram/Discord bots

**Paramètres** :
- Seuils personnalisables
- Addresses watchlist
- Frequency settings
- Quiet hours

## 3. Application aux Produits Crypto

| Type de Produit | Transaction Alerts |
|-----------------|-------------------|
| Hardware Wallets | Via companion app |
| Software Wallets | Standard feature |
| CEX | Email/Push |
| Portfolio Apps | Aggregated alerts |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Manual check |
| Intermédiaire | 56-70 | Basic push |
| Avancé | 71-85 | Customizable thresholds |
| Expert | 86-100 | Multi-channel + Smart |

## 5. Sources et Références

- [Push Notification Best Practices](https://developer.apple.com/documentation/usernotifications)
- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)""",

    4051: """## 1. Vue d'ensemble

Le critère **Security Alerts** (E128) évalue le système d'alertes de sécurité.

**Importance pour la sécurité crypto** : Les alertes de sécurité préviennent des menaces comme les approvals malveillants ou les protocoles exploités.

## 2. Spécifications Techniques

| Type alerte | Source | Action |
|-------------|--------|--------|
| Suspicious approval | Contract scan | Revoke |
| Protocol exploit | DeFi feeds | Withdraw |
| Phishing | URL check | Block |
| Wallet drain | Pattern detection | Freeze |
| Price manipulation | Oracle check | Pause |

**Sources de données** :
- Forta Network
- PeckShield
- CertiK alerts
- Rekt News
- Twitter monitoring

**Implémentation** :
- Real-time monitoring
- ML pattern detection
- Community reports
- On-chain analysis

## 3. Application aux Produits Crypto

| Type de Produit | Security Alerts |
|-----------------|-----------------|
| Hardware Wallets | Limité |
| Software Wallets | Intégré |
| Browser Extensions | Domain warnings |
| Portfolio Apps | Protocol monitoring |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Pas d'alertes |
| Intermédiaire | 56-70 | Basic domain check |
| Avancé | 71-85 | Multi-source alerts |
| Expert | 86-100 | + AI detection |

## 5. Sources et Références

- [Forta Network](https://forta.org/)
- [Rekt News](https://rekt.news/)""",

    4052: """## 1. Vue d'ensemble

Le critère **Governance Alerts** (E129) évalue les alertes pour les votes de gouvernance.

**Importance pour la sécurité crypto** : Les votes de gouvernance peuvent modifier les paramètres des protocoles; les alertes permettent de participer activement.

## 2. Spécifications Techniques

| Plateforme | Protocoles | Notification |
|------------|------------|--------------|
| Snapshot | Off-chain | Email/Push |
| Tally | On-chain | Email/Push |
| Boardroom | Multi | Aggregated |
| Custom | Protocol-specific | Variable |

**Types de votes** :
- Snapshot : Off-chain, signalisation
- Governor : On-chain Ethereum
- Cosmos governance : On-chain
- DAO-specific : Aragon, DAOstack

**Informations alertes** :
- New proposal
- Vote deadline approaching
- Quorum status
- Result announcement

## 3. Application aux Produits Crypto

| Type de Produit | Governance Alerts |
|-----------------|-------------------|
| Hardware Wallets | Non applicable |
| Software Wallets | Integration variable |
| CEX | Pas de voting |
| Portfolio Apps | Aggregation possible |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Pas de support |
| Intermédiaire | 56-70 | Links to platforms |
| Avancé | 71-85 | Integrated alerts |
| Expert | 86-100 | + In-app voting |

## 5. Sources et Références

- [Snapshot Documentation](https://docs.snapshot.org/)
- [Tally Documentation](https://docs.tally.xyz/)""",

    4053: """## 1. Vue d'ensemble

Le critère **Airdrop Notifications** (E130) évalue les notifications pour les airdrops et claims.

**Importance pour la sécurité crypto** : Les airdrops ont des deadlines; les notifications évitent de manquer des claims légitimes tout en alertant sur les scams.

## 2. Spécifications Techniques

| Type airdrop | Détection | Risque scam |
|--------------|-----------|-------------|
| Token sent | Balance change | Élevé |
| Claimable | Merkle proof | Moyen |
| NFT drop | Collection update | Élevé |
| Retroactive | Snapshot | Faible |

**Sources de détection** :
- Chain indexing
- Protocol announcements
- Community tracking
- Eligibility checkers

**Filtrage scams** :
- Known scam tokens
- Suspicious contracts
- Unverified sources
- Approve traps

## 3. Application aux Produits Crypto

| Type de Produit | Airdrop Alerts |
|-----------------|----------------|
| Hardware Wallets | Non applicable |
| Software Wallets | Balance detection |
| Portfolio Apps | Claim aggregators |
| Services | Airdrops.io, etc. |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Balance view only |
| Intermédiaire | 56-70 | Token detection |
| Avancé | 71-85 | Claimable alerts |
| Expert | 86-100 | + Scam filtering |

## 5. Sources et Références

- [EarniAirdrops](https://earni.fi/)
- [DeFi Safety Airdrop Guide](https://defisafety.com/)""",

    4054: """## 1. Vue d'ensemble

Le critère **ISO/IEC 27001** (S121) évalue la conformité au standard de management de la sécurité de l'information.

**Importance pour la sécurité crypto** : ISO 27001 établit un cadre SMSI (Système de Management de la Sécurité de l'Information) reconnu internationalement.

## 2. Spécifications Techniques

| Aspect | Description |
|--------|-------------|
| Standard | ISO/IEC 27001:2022 |
| Type | Management system |
| Contrôles | Annexe A : 93 contrôles |
| Certification | Tierce partie accréditée |
| Cycle | 3 ans + audits annuels |

**Domaines ISO 27001** :
- Contexte organisation
- Leadership et engagement
- Planification (risques)
- Support (ressources)
- Opération (contrôles)
- Évaluation performance
- Amélioration continue

**Contrôles Annexe A** :
- A.5 : Politiques
- A.6 : Organisation
- A.7 : RH
- A.8 : Gestion actifs
- A.9 : Contrôle d'accès

## 3. Application aux Produits Crypto

| Type de Produit | ISO 27001 |
|-----------------|-----------|
| Hardware Wallets | Fabricant certifié |
| Software Wallets | Rarement |
| CEX | Fréquent (Coinbase, Kraken) |
| Custodians | Obligatoire pratiquement |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Pas de certification |
| Intermédiaire | 56-70 | En cours |
| Avancé | 71-85 | Certifié |
| Expert | 86-100 | + SOC 2 combiné |

## 5. Sources et Références

- [ISO/IEC 27001:2022](https://www.iso.org/standard/82875.html)
- [ISO 27001 Certification Process](https://www.iso.org/certification.html)""",

    4055: """## 1. Vue d'ensemble

Le critère **ISO/IEC 27002** (S122) évalue l'application des bonnes pratiques de sécurité de l'information.

**Importance pour la sécurité crypto** : ISO 27002 fournit des recommandations détaillées pour implémenter les contrôles de sécurité.

## 2. Spécifications Techniques

| Aspect | Description |
|--------|-------------|
| Standard | ISO/IEC 27002:2022 |
| Type | Code of practice |
| Contrôles | 93 contrôles en 4 thèmes |
| Usage | Guide d'implémentation |

**4 Thèmes de contrôles** :
- Organisationnels (37)
- Personnes (8)
- Physiques (14)
- Technologiques (34)

**Nouveaux contrôles 2022** :
- Threat intelligence
- Cloud security
- ICT readiness
- Information deletion
- Data masking
- Secure coding

## 3. Application aux Produits Crypto

| Type de Produit | ISO 27002 |
|-----------------|-----------|
| Hardware Wallets | Secure development |
| Software Wallets | Code practices |
| CEX | Full implementation |
| Infrastructure | Data centers |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Contrôles partiels |
| Intermédiaire | 56-70 | Contrôles essentiels |
| Avancé | 71-85 | Majorité contrôles |
| Expert | 86-100 | Full compliance |

## 5. Sources et Références

- [ISO/IEC 27002:2022](https://www.iso.org/standard/75652.html)
- [ISO 27002 Controls](https://www.iso27001security.com/html/27002.html)""",

    4056: """## 1. Vue d'ensemble

Le critère **ISO/IEC 27017** (S123) évalue la conformité aux contrôles de sécurité cloud.

**Importance pour la sécurité crypto** : ISO 27017 couvre les aspects sécurité spécifiques au cloud computing, crucial pour les services crypto hébergés.

## 2. Spécifications Techniques

| Aspect | Description |
|--------|-------------|
| Standard | ISO/IEC 27017:2015 |
| Type | Cloud security |
| Base | Extension ISO 27002 |
| Scope | CSP et clients cloud |

**Contrôles cloud-spécifiques** :
- CLD.6.3.1 : Shared roles
- CLD.8.1.5 : Asset removal
- CLD.9.5.1 : Virtual segmentation
- CLD.9.5.2 : VM hardening
- CLD.12.1.5 : Monitoring
- CLD.12.4.5 : Cloud logging
- CLD.13.1.4 : Virtual network security

**Responsabilités** :
- CSP : Infrastructure, isolation
- Client : Data, access, config

## 3. Application aux Produits Crypto

| Type de Produit | ISO 27017 |
|-----------------|-----------|
| Hardware Wallets | Non applicable |
| Cloud Wallets | Très pertinent |
| CEX | Infrastructure cloud |
| Node Services | Infura, Alchemy |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Non cloud ou non certifié |
| Intermédiaire | 56-70 | CSP certifié utilisé |
| Avancé | 71-85 | Compliance partielle |
| Expert | 86-100 | Full certification |

## 5. Sources et Références

- [ISO/IEC 27017:2015](https://www.iso.org/standard/43757.html)
- [CSA STAR](https://cloudsecurityalliance.org/star/)""",

    4057: """## 1. Vue d'ensemble

Le critère **ISO/IEC 27018** (S124) évalue la protection des données personnelles dans le cloud.

**Importance pour la sécurité crypto** : ISO 27018 protège les PII (Personally Identifiable Information) des utilisateurs crypto dans les services cloud.

## 2. Spécifications Techniques

| Aspect | Description |
|--------|-------------|
| Standard | ISO/IEC 27018:2019 |
| Type | Cloud PII protection |
| Régulation | Aligné GDPR |
| Scope | CSP processeurs |

**Principes clés** :
- Consentement pour traitement
- Limitation de la finalité
- Minimisation des données
- Transparence subprocesseurs
- Notification violations

**Contrôles PII** :
- A.1 : Consentement
- A.2 : Objectif
- A.5 : Transparence
- A.9 : Notification
- A.10 : Sous-traitance
- A.11 : Juridictions

## 3. Application aux Produits Crypto

| Type de Produit | ISO 27018 |
|-----------------|-----------|
| Hardware Wallets | Non cloud |
| CEX | KYC data protection |
| Cloud Services | User data |
| Analytics | Pseudonymisation |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Pas de certification |
| Intermédiaire | 56-70 | Privacy policy |
| Avancé | 71-85 | Partial compliance |
| Expert | 86-100 | Full certification |

## 5. Sources et Références

- [ISO/IEC 27018:2019](https://www.iso.org/standard/76559.html)
- [Cloud Privacy Alliance](https://cloudprivacyalliance.org/)""",

    4058: """## 1. Vue d'ensemble

Le critère **ISO/IEC 27701** (S125) évalue le système de management de la vie privée.

**Importance pour la sécurité crypto** : ISO 27701 étend ISO 27001 pour inclure la gestion de la vie privée, crucial pour la conformité GDPR.

## 2. Spécifications Techniques

| Aspect | Description |
|--------|-------------|
| Standard | ISO/IEC 27701:2019 |
| Type | PIMS extension |
| Base | Étend ISO 27001 + 27002 |
| Rôles | Controller + Processor |

**Extension PIMS** :
- Clause 5 : Context organization
- Clause 6 : Leadership privacy
- Clause 7 : Support PIMS
- Clause 8 : Operation PIMS
- Annexe A : Controllers
- Annexe B : Processors

**Mapping régulations** :
- GDPR (EU)
- CCPA (California)
- LGPD (Brazil)
- POPIA (South Africa)

## 3. Application aux Produits Crypto

| Type de Produit | ISO 27701 |
|-----------------|-----------|
| Hardware Wallets | Données limitées |
| CEX | KYC processing |
| Analytics | Data processing |
| Marketing | Consent management |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Pas de PIMS |
| Intermédiaire | 56-70 | Privacy policies |
| Avancé | 71-85 | Partial PIMS |
| Expert | 86-100 | Full 27701 certified |

## 5. Sources et Références

- [ISO/IEC 27701:2019](https://www.iso.org/standard/71670.html)
- [GDPR Compliance](https://gdpr.eu/)"""
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
