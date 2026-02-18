#!/usr/bin/env python3
"""Generate summaries for BIPs, EIPs, and cryptographic standards."""

import requests
import time
import sys
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    3910: """## 1. Vue d'ensemble

Le critère **BIP-381 Miniscript Descriptors** (S100) évalue le support des descripteurs Miniscript pour Bitcoin.

**Importance pour la sécurité crypto** : BIP-381 standardise la représentation des scripts Bitcoin complexes pour l'interopérabilité entre wallets.

## 2. Spécifications Techniques

| Aspect | Description |
|--------|-------------|
| Standard | BIP-381 |
| Base | Output descriptors |
| Scripts | P2WSH, P2SH |
| Policy | Miniscript language |

**Types de descripteurs** :
- wsh(miniscript) : Witness Script Hash
- sh(wsh(miniscript)) : Nested
- tr(key,{script}) : Taproot

**Exemple** :
```
wsh(and_v(v:pk(Alice),or_d(pk(Bob),after(1000))))
```

**Avantages** :
- Interopérabilité wallets
- Vérification automatisée
- Analyse de coûts
- Backup complet

## 3. Application aux Produits Crypto

| Type de Produit | BIP-381 Support |
|-----------------|-----------------|
| Hardware Wallets | Coldcard, Jade |
| Software Wallets | Sparrow, Specter |
| Multisig | Caravan, Nunchuk |
| Libraries | rust-miniscript |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Single-sig only |
| Intermédiaire | 56-70 | Basic descriptors |
| Avancé | 71-85 | Miniscript read |
| Expert | 86-100 | Full BIP-381 |

## 5. Sources et Références

- [BIP-381](https://github.com/bitcoin/bips/blob/master/bip-0381.mediawiki)
- [Miniscript](https://bitcoin.sipa.be/miniscript/)""",

    3912: """## 1. Vue d'ensemble

Le critère **BIP-388 Wallet Policies** (S102) évalue le support des politiques de wallet standardisées.

**Importance pour la sécurité crypto** : BIP-388 définit un format pour les politiques de multisig et scripts complexes.

## 2. Spécifications Techniques

| Aspect | Description |
|--------|-------------|
| Standard | BIP-388 |
| Format | JSON-based policy |
| Usage | Multisig coordination |
| Devices | Hardware wallets |

**Structure policy** :
```json
{
  "descriptor_template": "wsh(sortedmulti(2,@0,@1,@2))",
  "keys_info": [
    "[fingerprint/derivation]xpub...",
    ...
  ]
}
```

**Avantages** :
- Registration on device
- Display de politique
- Vérification complete
- Backup standardisé

## 3. Application aux Produits Crypto

| Type de Produit | BIP-388 Support |
|-----------------|-----------------|
| Hardware Wallets | Ledger, Jade, Specter DIY |
| Software Wallets | Sparrow, Specter Desktop |
| Coordinators | Caravan, Nunchuk |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | No policy support |
| Intermédiaire | 56-70 | Basic multisig |
| Avancé | 71-85 | Policy registration |
| Expert | 86-100 | Full BIP-388 |

## 5. Sources et Références

- [BIP-388](https://github.com/bitcoin/bips/blob/master/bip-0388.mediawiki)
- [Ledger Wallet Policies](https://github.com/LedgerHQ/app-bitcoin-new/blob/master/doc/wallet.md)""",

    3913: """## 1. Vue d'ensemble

Le critère **BIP-129 BSMS** (S103) évalue le support du Bitcoin Secure Multisig Setup.

**Importance pour la sécurité crypto** : BIP-129 définit un protocole sécurisé pour configurer des multisigs entre appareils.

## 2. Spécifications Techniques

| Aspect | Description |
|--------|-------------|
| Standard | BIP-129 |
| Nom | BSMS (Bitcoin Secure Multisig Setup) |
| Format | CBOR + encryption |
| Transport | QR codes / NFC |

**Étapes BSMS** :
1. Coordinator génère session
2. Signers contribuent xpubs
3. Coordinator compile descriptor
4. Signers vérifient et signent

**Format BSMS** :
- Token encryption : ECDH + ChaCha20
- Data : CBOR encoded
- Transport : Multi-part QR (UR)

## 3. Application aux Produits Crypto

| Type de Produit | BIP-129 Support |
|-----------------|-----------------|
| Hardware Wallets | Coldcard, Passport |
| Software Wallets | Sparrow, Nunchuk |
| Coordinators | Caravan |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Manual setup |
| Intermédiaire | 56-70 | File exchange |
| Avancé | 71-85 | Partial BSMS |
| Expert | 86-100 | Full BIP-129 |

## 5. Sources et Références

- [BIP-129](https://github.com/bitcoin/bips/blob/master/bip-0129.mediawiki)
- [Blockchain Commons BSMS](https://github.com/BlockchainCommons/bsms)""",

    3916: """## 1. Vue d'ensemble

Le critère **EIP-5267 EIP-712 Retrieval** (S106) évalue le support de la récupération des domaines EIP-712.

**Importance pour la sécurité crypto** : EIP-5267 permet aux wallets de vérifier les domaines de signature structurée.

## 2. Spécifications Techniques

| Aspect | Description |
|--------|-------------|
| Standard | EIP-5267 |
| Base | Extension EIP-712 |
| Fonction | eip712Domain() |
| Retour | Domain separator info |

**Interface** :
```solidity
function eip712Domain() external view returns (
    bytes1 fields,
    string name,
    string version,
    uint256 chainId,
    address verifyingContract,
    bytes32 salt,
    uint256[] extensions
);
```

**Avantages** :
- Vérification on-chain du domaine
- Display précis dans wallet
- Détection de phishing
- Audit des signatures

## 3. Application aux Produits Crypto

| Type de Produit | EIP-5267 Support |
|-----------------|------------------|
| Hardware Wallets | Affichage domain |
| Software Wallets | Domain verification |
| Smart Contracts | Implementation |
| DApps | Standard compliant |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | EIP-712 basic |
| Intermédiaire | 56-70 | Domain display |
| Avancé | 71-85 | EIP-5267 query |
| Expert | 86-100 | Full verification |

## 5. Sources et Références

- [EIP-5267](https://eips.ethereum.org/EIPS/eip-5267)
- [EIP-712](https://eips.ethereum.org/EIPS/eip-712)""",

    3918: """## 1. Vue d'ensemble

Le critère **EIP-7702 Account Abstraction EOA** (S108) évalue le support de l'abstraction de compte pour EOA.

**Importance pour la sécurité crypto** : EIP-7702 permet aux EOA d'avoir temporairement du code, facilitant la migration vers l'AA.

## 2. Spécifications Techniques

| Aspect | Description |
|--------|-------------|
| Standard | EIP-7702 |
| Type | EOA code delegation |
| Transaction | Type 0x04 |
| Reversion | Possible (delegation list) |

**Mécanisme** :
- EOA signe une "authorization"
- Transaction inclut delegation
- EOA exécute comme smart contract
- Code réversible par owner

**Avantages vs 4337** :
- Compatible EOA existants
- Pas de bundler requis
- Migration graduelle
- Frais standards

## 3. Application aux Produits Crypto

| Type de Produit | EIP-7702 Support |
|-----------------|------------------|
| Hardware Wallets | Signature type 0x04 |
| Software Wallets | Migration paths |
| Smart Contracts | Delegation targets |
| Infrastructure | RPC support |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | EOA only |
| Intermédiaire | 56-70 | EIP-4337 basic |
| Avancé | 71-85 | EIP-7702 aware |
| Expert | 86-100 | Full support |

## 5. Sources et Références

- [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702)
- [Account Abstraction Roadmap](https://ethereum.org/en/roadmap/account-abstraction/)""",

    3919: """## 1. Vue d'ensemble

Le critère **EIP-3074 AUTH/AUTHCALL** (S109) évalue le support des opcodes d'autorisation.

**Importance pour la sécurité crypto** : EIP-3074 permet aux EOA de déléguer l'exécution à des contrats "invokers".

## 2. Spécifications Techniques

| Aspect | Description |
|--------|-------------|
| Standard | EIP-3074 |
| Opcodes | AUTH, AUTHCALL |
| Status | Superseded by EIP-7702 |
| Risk | High (full delegation) |

**Mécanisme AUTH** :
1. User signe commit message
2. Invoker contract reçoit signature
3. AUTH opcode set authorized
4. AUTHCALL exécute as user

**Risques** :
- Invoker malveillant = drain wallet
- Signature permanente possible
- Pas de révocation native

## 3. Application aux Produits Crypto

| Type de Produit | EIP-3074 Support |
|-----------------|------------------|
| Hardware Wallets | Display warnings |
| Software Wallets | Risk awareness |
| Smart Contracts | Invoker patterns |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | No awareness |
| Intermédiaire | 56-70 | Warning display |
| Avancé | 71-85 | Invoker whitelist |
| Expert | 86-100 | Full analysis |

## 5. Sources et Références

- [EIP-3074](https://eips.ethereum.org/EIPS/eip-3074)
- [EIP-3074 Security Analysis](https://ethereum-magicians.org/t/eip-3074-security-review/5574)""",

    3921: """## 1. Vue d'ensemble

Le critère **PCI DSS** (S111) évalue la conformité au Payment Card Industry Data Security Standard.

**Importance pour la sécurité crypto** : PCI DSS s'applique aux plateformes crypto acceptant les paiements par carte.

## 2. Spécifications Techniques

| Aspect | Description |
|--------|-------------|
| Standard | PCI DSS v4.0 |
| Organisme | PCI SSC |
| Scope | Card data handling |
| Levels | 1-4 (par volume) |

**12 Exigences PCI DSS** :
1. Firewall configuration
2. No vendor defaults
3. Protect cardholder data
4. Encrypt transmission
5. Anti-malware
6. Secure systems
7. Access restriction
8. Unique IDs
9. Physical access
10. Logging/monitoring
11. Regular testing
12. Security policies

## 3. Application aux Produits Crypto

| Type de Produit | PCI DSS |
|-----------------|---------|
| Hardware Wallets | Non applicable |
| CEX avec carte | Level 1-2 requis |
| Crypto Cards | Issuer compliant |
| Payment Gateways | Mandatory |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | No cards |
| Intermédiaire | 56-70 | SAQ compliance |
| Avancé | 71-85 | Level 2-4 |
| Expert | 86-100 | Level 1 ROC |

## 5. Sources et Références

- [PCI DSS v4.0](https://www.pcisecuritystandards.org/document_library/)
- [PCI SSC](https://www.pcisecuritystandards.org/)""",

    3922: """## 1. Vue d'ensemble

Le critère **EMVCo** (S112) évalue la conformité aux standards EMV pour les paiements.

**Importance pour la sécurité crypto** : EMV standardise les paiements par carte et NFC, pertinent pour les crypto cards et wallets avec paiement.

## 2. Spécifications Techniques

| Aspect | Description |
|--------|-------------|
| Standard | EMV Contact/Contactless |
| Organisme | EMVCo (Visa, MC, etc.) |
| Technologies | Chip, NFC, QR |
| Security | Dynamic authentication |

**Specifications EMV** :
- Book 1 : Application Independent ICC to Terminal
- Book 2 : Security and Key Management
- Book 3 : Application Specification
- Book 4 : Cardholder, Attendant, and Acquirer

**EMV Tokenization** :
- Payment Account Reference (PAR)
- Token Service Provider (TSP)
- Provisioning methods

## 3. Application aux Produits Crypto

| Type de Produit | EMVCo |
|-----------------|-------|
| Crypto Cards | Mandatory |
| NFC Wallets | EMV Contactless |
| POS Integration | Terminal compliance |
| Mobile Pay | Tokenization |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | No payment feature |
| Intermédiaire | 56-70 | Basic integration |
| Avancé | 71-85 | EMV certified |
| Expert | 86-100 | Full EMV suite |

## 5. Sources et Références

- [EMVCo Specifications](https://www.emvco.com/specifications/)
- [EMV Tokenisation](https://www.emvco.com/emv-technologies/payment-tokenisation/)""",

    3923: """## 1. Vue d'ensemble

Le critère **GlobalPlatform** (S113) évalue la conformité aux standards GlobalPlatform pour les Secure Elements.

**Importance pour la sécurité crypto** : GlobalPlatform standardise la gestion des applets et clés dans les Secure Elements des hardware wallets.

## 2. Spécifications Techniques

| Aspect | Description |
|--------|-------------|
| Standard | GP Card Specification |
| Version | 2.3.1 |
| Usage | SE/TEE management |
| Security | Certified schemes |

**Composants GP** :
- Card Manager : Gestion applets
- Security Domains : Isolation
- APDU Commands : Communication
- Key Management : Clés symétriques/asymétriques

**GP TEE** :
- Trusted Execution Environment
- Isolation applications
- Secure storage
- Attestation

## 3. Application aux Produits Crypto

| Type de Produit | GlobalPlatform |
|-----------------|----------------|
| Hardware Wallets | Secure Elements GP |
| Smart Cards | GP compliant |
| Mobile TEE | ARM TrustZone + GP |
| Secure Enclaves | GP TEE specs |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | No SE |
| Intermédiaire | 56-70 | SE sans GP |
| Avancé | 71-85 | GP compliant |
| Expert | 86-100 | GP certified |

## 5. Sources et Références

- [GlobalPlatform Specifications](https://globalplatform.org/specs-library/)
- [GP TEE](https://globalplatform.org/specs-library/tee-system-architecture-v1-2/)""",

    3924: """## 1. Vue d'ensemble

Le critère **ETSI EN 319 411** (S114) évalue la conformité aux standards européens pour les services de confiance.

**Importance pour la sécurité crypto** : ETSI EN 319 411 définit les exigences pour les autorités de certification et signatures électroniques.

## 2. Spécifications Techniques

| Aspect | Description |
|--------|-------------|
| Standard | ETSI EN 319 411-1/2 |
| Scope | Trust service providers |
| Usage | eIDAS compliance |
| Levels | NCP, NCP+, LCP, QCP |

**Niveaux de politique** :
- NCP : Normalized Certificate Policy
- NCP+ : Extended validation
- LCP : Lightweight Certificate Policy
- QCP : Qualified Certificate Policy

**Exigences** :
- CA infrastructure
- Key management
- Certificate lifecycle
- Audit logging

## 3. Application aux Produits Crypto

| Type de Produit | ETSI EN 319 411 |
|-----------------|-----------------|
| Hardware Wallets | Signature qualifiée |
| Identity Providers | QCP-n/QCP-l |
| Custodians EU | Compliance obligatoire |
| DID Systems | Trust anchors |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | No trust service |
| Intermédiaire | 56-70 | Self-signed |
| Avancé | 71-85 | NCP compliance |
| Expert | 86-100 | QCP qualified |

## 5. Sources et Références

- [ETSI EN 319 411-1](https://www.etsi.org/deliver/etsi_en/319400_319499/31941101/)
- [eIDAS Regulation](https://digital-strategy.ec.europa.eu/en/policies/eidas-regulation)""",

    3928: """## 1. Vue d'ensemble

Le critère **AMD SEV** (S118) évalue le support de AMD Secure Encrypted Virtualization.

**Importance pour la sécurité crypto** : AMD SEV protège les VM contre l'hyperviseur, crucial pour les services crypto en cloud.

## 2. Spécifications Techniques

| Version | Feature | Protection |
|---------|---------|------------|
| SEV | Memory encryption | VM isolation |
| SEV-ES | Encrypted state | Register protection |
| SEV-SNP | Secure Nested Paging | Full attestation |

**Caractéristiques SEV-SNP** :
- Memory integrity
- VM attestation
- TCB versioning
- Migration control

**Vs Intel SGX** :
- SEV : VM-level encryption
- SGX : Enclave-level
- SEV : Larger TCB
- SGX : Smaller attack surface

## 3. Application aux Produits Crypto

| Type de Produit | AMD SEV |
|-----------------|---------|
| Cloud Wallets | VM protection |
| Key Management | HSM alternative |
| Node Services | Confidential compute |
| Custody Solutions | Attestation |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | No TEE |
| Intermédiaire | 56-70 | SEV basic |
| Avancé | 71-85 | SEV-ES |
| Expert | 86-100 | SEV-SNP + attestation |

## 5. Sources et Références

- [AMD SEV-SNP](https://www.amd.com/en/developer/sev.html)
- [SEV White Paper](https://www.amd.com/system/files/TechDocs/SEV-SNP-strengthening-vm-isolation-with-integrity-protection-and-more.pdf)""",

    3942: """## 1. Vue d'ensemble

Le critère **Mixnet Support** (A87) évalue le support des réseaux de mixage pour l'anonymat des communications.

**Importance pour la sécurité crypto** : Les mixnets protègent contre l'analyse de trafic en mélangeant les messages de multiples utilisateurs.

## 2. Spécifications Techniques

| Mixnet | Type | Latence | Anonymat |
|--------|------|---------|----------|
| Nym | Continuous | Variable | Fort |
| Loopix | Stratified | Poisson | Très fort |
| HOPR | P2P | Faible | Moyen |

**Mécanisme mixnet** :
1. Messages chiffrés en couches (onion)
2. Envoi à travers N mix nodes
3. Chaque node : déchiffre, delay, forward
4. Receiver déchiffre finale

**Vs Tor** :
- Tor : Circuit-based, temps réel
- Mixnet : Store-and-forward, delay

## 3. Application aux Produits Crypto

| Type de Produit | Mixnet Support |
|-----------------|----------------|
| Hardware Wallets | Non applicable |
| Software Wallets | Nym integration possible |
| Privacy Coins | Dandelion++ (limité) |
| Messaging | Signal + mixnet overlay |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Direct connection |
| Intermédiaire | 56-70 | Tor support |
| Avancé | 71-85 | Mixnet compatible |
| Expert | 86-100 | Native mixnet |

## 5. Sources et Références

- [Nym Network](https://nymtech.net/)
- [Loopix Paper](https://arxiv.org/abs/1703.00536)""",

    3943: """## 1. Vue d'ensemble

Le critère **Onion Routing** (A88) évalue le support du routage en oignon (Tor) pour la confidentialité.

**Importance pour la sécurité crypto** : Le routage en oignon masque l'IP source et la destination, protégeant la vie privée des utilisateurs.

## 2. Spécifications Techniques

| Aspect | Description |
|--------|-------------|
| Protocole | Tor (The Onion Router) |
| Layers | 3 relais minimum |
| Chiffrement | AES-128-CTR |
| Circuits | 10 minutes rotation |

**Architecture Tor** :
- Guard node : Point d'entrée stable
- Middle relay : Forwarding
- Exit node : Connexion à destination
- Hidden services : .onion

**Limites** :
- Exit node voit trafic clair
- Timing attacks possibles
- Lent pour gros volumes

## 3. Application aux Produits Crypto

| Type de Produit | Tor Support |
|-----------------|-------------|
| Hardware Wallets | Via companion |
| Software Wallets | Trezor Suite, Wasabi |
| CEX | Souvent bloqué |
| Nodes | Bitcoin Core Tor |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Direct connection |
| Intermédiaire | 56-70 | Tor compatible |
| Avancé | 71-85 | Tor intégré |
| Expert | 86-100 | + Stream isolation |

## 5. Sources et Références

- [Tor Project](https://www.torproject.org/)
- [Bitcoin over Tor](https://bitcoin.org/en/full-node#network-configuration)""",

    3944: """## 1. Vue d'ensemble

Le critère **Traffic Padding** (A89) évalue l'ajout de trafic factice pour masquer les patterns de communication.

**Importance pour la sécurité crypto** : Le padding empêche l'analyse de trafic qui pourrait révéler des patterns de transaction.

## 2. Spécifications Techniques

| Technique | Overhead | Protection |
|-----------|----------|------------|
| Constant rate | 100-500% | Élevée |
| Adaptive | 50-200% | Moyenne |
| Dummy messages | Variable | Moyenne |
| Cover traffic | 200-1000% | Très élevée |

**Méthodes** :
- Constant bitrate : Flux constant
- Burst padding : Gonfler les bursts
- Random delays : Timing jitter
- Chaff injection : Faux paquets

**Implémentation** :
- VPN avec padding
- Mixnet cover traffic
- Protocol-level padding
- Application padding

## 3. Application aux Produits Crypto

| Type de Produit | Traffic Padding |
|-----------------|-----------------|
| Hardware Wallets | Non applicable |
| Software Wallets | Rare |
| Privacy Coins | Dandelion++ (délai) |
| VPN Services | Some premium |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | No padding |
| Intermédiaire | 56-70 | TLS padding |
| Avancé | 71-85 | Application padding |
| Expert | 86-100 | Constant rate |

## 5. Sources et Références

- [Traffic Analysis](https://www.freehaven.net/anonbib/cache/ShsWa02.pdf)
- [Padding Strategies](https://arxiv.org/abs/1711.03656)""",

    4074: """## 1. Vue d'ensemble

Le critère **ML-KEM (Kyber)** (S141) évalue le support de l'algorithme post-quantique ML-KEM.

**Importance pour la sécurité crypto** : ML-KEM (CRYSTALS-Kyber) est le standard NIST pour le chiffrement résistant aux ordinateurs quantiques.

## 2. Spécifications Techniques

| Paramètre | ML-KEM-512 | ML-KEM-768 | ML-KEM-1024 |
|-----------|------------|------------|-------------|
| Sécurité | NIST 1 | NIST 3 | NIST 5 |
| Clé publique | 800 bytes | 1184 bytes | 1568 bytes |
| Ciphertext | 768 bytes | 1088 bytes | 1568 bytes |
| Secret partagé | 32 bytes | 32 bytes | 32 bytes |

**Base mathématique** :
- Module-LWE problem
- Ring structure
- NTT transforms

**Standardisation** :
- NIST FIPS 203 (2024)
- Remplace Kyber draft

## 3. Application aux Produits Crypto

| Type de Produit | ML-KEM Support |
|-----------------|----------------|
| Hardware Wallets | Futur (SE update) |
| Software Wallets | Hybride possible |
| Messaging | Signal PQXDH |
| TLS | Hybride KEM |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Classic only |
| Intermédiaire | 56-70 | PQ awareness |
| Avancé | 71-85 | Hybrid support |
| Expert | 86-100 | Full ML-KEM |

## 5. Sources et Références

- [NIST FIPS 203](https://csrc.nist.gov/pubs/fips/203/final)
- [CRYSTALS-Kyber](https://pq-crystals.org/kyber/)""",

    4075: """## 1. Vue d'ensemble

Le critère **ML-DSA (Dilithium)** (S142) évalue le support de l'algorithme de signature post-quantique ML-DSA.

**Importance pour la sécurité crypto** : ML-DSA (CRYSTALS-Dilithium) est le standard NIST pour les signatures numériques post-quantiques.

## 2. Spécifications Techniques

| Paramètre | ML-DSA-44 | ML-DSA-65 | ML-DSA-87 |
|-----------|-----------|-----------|-----------|
| Sécurité | NIST 2 | NIST 3 | NIST 5 |
| Clé publique | 1312 bytes | 1952 bytes | 2592 bytes |
| Signature | 2420 bytes | 3293 bytes | 4595 bytes |
| Clé privée | 2560 bytes | 4032 bytes | 4896 bytes |

**Base mathématique** :
- Module-LWE et Module-SIS
- Fiat-Shamir with aborts
- Deterministic signing

**Standardisation** :
- NIST FIPS 204 (2024)
- Successeur Dilithium

## 3. Application aux Produits Crypto

| Type de Produit | ML-DSA Support |
|-----------------|----------------|
| Hardware Wallets | Migration future |
| Software Wallets | Hybride possible |
| Blockchain | Signature upgrade path |
| Certificates | X.509 PQ |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | ECDSA only |
| Intermédiaire | 56-70 | PQ roadmap |
| Avancé | 71-85 | Hybrid signatures |
| Expert | 86-100 | Full ML-DSA |

## 5. Sources et Références

- [NIST FIPS 204](https://csrc.nist.gov/pubs/fips/204/final)
- [CRYSTALS-Dilithium](https://pq-crystals.org/dilithium/)""",

    4076: """## 1. Vue d'ensemble

Le critère **SLH-DSA (SPHINCS+)** (S143) évalue le support de l'algorithme de signature hash-based.

**Importance pour la sécurité crypto** : SLH-DSA offre une sécurité post-quantique basée uniquement sur les fonctions de hachage.

## 2. Spécifications Techniques

| Paramètre | SLH-DSA-128s | SLH-DSA-192s | SLH-DSA-256s |
|-----------|--------------|--------------|--------------|
| Sécurité | NIST 1 | NIST 3 | NIST 5 |
| Clé publique | 32 bytes | 48 bytes | 64 bytes |
| Signature | 7856 bytes | 16224 bytes | 29792 bytes |
| Signing time | ~100ms | ~200ms | ~300ms |

**Avantages** :
- Sécurité prouvée (hash security)
- Pas de structure algébrique
- Conservative choice
- Stateless (vs XMSS)

**Inconvénients** :
- Grandes signatures
- Lent à signer

## 3. Application aux Produits Crypto

| Type de Produit | SLH-DSA Support |
|-----------------|-----------------|
| Hardware Wallets | Challenge (taille) |
| Software Wallets | Backup signatures |
| Long-term Storage | Recommandé |
| Certificates | Archive signing |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Classic only |
| Intermédiaire | 56-70 | PQ awareness |
| Avancé | 71-85 | Hash-based option |
| Expert | 86-100 | Full SLH-DSA |

## 5. Sources et Références

- [NIST FIPS 205](https://csrc.nist.gov/pubs/fips/205/final)
- [SPHINCS+](https://sphincs.org/)""",

    4079: """## 1. Vue d'ensemble

Le critère **Argon2id** (S146) évalue l'utilisation de la fonction de dérivation de clé Argon2id.

**Importance pour la sécurité crypto** : Argon2id est le standard moderne pour le hachage de mots de passe et la dérivation de clés.

## 2. Spécifications Techniques

| Paramètre | Minimum | Recommandé | Maximum |
|-----------|---------|------------|---------|
| Memory | 64 MB | 256 MB | 4 GB |
| Iterations | 1 | 3 | 10+ |
| Parallelism | 1 | 4 | 8 |
| Output | 32 bytes | 32 bytes | 64 bytes |

**Variantes Argon2** :
- Argon2d : Data-dependent (side-channel risk)
- Argon2i : Data-independent (GPU resistant)
- Argon2id : Hybrid (recommended)

**Vs autres KDF** :
- scrypt : Moins configurable
- bcrypt : Limité à 72 bytes
- PBKDF2 : Pas memory-hard

## 3. Application aux Produits Crypto

| Type de Produit | Argon2id Usage |
|-----------------|----------------|
| Hardware Wallets | PIN derivation |
| Software Wallets | Password to key |
| Backup Encryption | Key derivation |
| Keystore Files | Modern standard |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | PBKDF2 |
| Intermédiaire | 56-70 | scrypt |
| Avancé | 71-85 | Argon2id basic |
| Expert | 86-100 | Argon2id tuned |

## 5. Sources et Références

- [RFC 9106 - Argon2](https://datatracker.ietf.org/doc/html/rfc9106)
- [Argon2 Reference](https://github.com/P-H-C/phc-winner-argon2)""",

    4080: """## 1. Vue d'ensemble

Le critère **HKDF** (S147) évalue l'utilisation de HMAC-based Key Derivation Function.

**Importance pour la sécurité crypto** : HKDF extrait et expand l'entropie de manière sécurisée pour dériver plusieurs clés.

## 2. Spécifications Techniques

| Phase | Fonction | Input | Output |
|-------|----------|-------|--------|
| Extract | HMAC(salt, IKM) | Initial keying material | PRK |
| Expand | HMAC(PRK, info) | PRK + context | OKM |

**Paramètres** :
- Hash : SHA-256 ou SHA-512
- Salt : Optional, improves security
- Info : Context-specific data
- L : Output length

**Usage** :
```
PRK = HKDF-Extract(salt, IKM)
OKM = HKDF-Expand(PRK, info, L)
```

## 3. Application aux Produits Crypto

| Type de Produit | HKDF Usage |
|-----------------|------------|
| Hardware Wallets | Key derivation |
| Software Wallets | Session keys |
| TLS/HTTPS | Key schedule |
| End-to-end | Signal Protocol |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Direct hash |
| Intermédiaire | 56-70 | HMAC |
| Avancé | 71-85 | HKDF-Extract |
| Expert | 86-100 | Full HKDF |

## 5. Sources et Références

- [RFC 5869 - HKDF](https://datatracker.ietf.org/doc/html/rfc5869)
- [HKDF Paper](https://eprint.iacr.org/2010/264)""",

    4081: """## 1. Vue d'ensemble

Le critère **XChaCha20-Poly1305** (S149) évalue l'utilisation du chiffrement authentifié XChaCha20-Poly1305.

**Importance pour la sécurité crypto** : XChaCha20-Poly1305 offre un chiffrement moderne avec nonce étendu, évitant les collisions.

## 2. Spécifications Techniques

| Aspect | ChaCha20-Poly1305 | XChaCha20-Poly1305 |
|--------|-------------------|-------------------|
| Nonce | 96 bits | 192 bits |
| Counter | 32 bits | 32 bits |
| Key | 256 bits | 256 bits |
| Tag | 128 bits | 128 bits |

**Avantages XChaCha20** :
- Nonce random safe (192 bits)
- Pas de compteur à gérer
- Constant-time implementation
- No AES hardware needed

**Vs AES-GCM** :
- Pas de timing attacks
- Software-friendly
- Larger nonce

## 3. Application aux Produits Crypto

| Type de Produit | XChaCha20 Usage |
|-----------------|-----------------|
| Hardware Wallets | Backup encryption |
| Software Wallets | Local storage |
| Messaging | libsodium default |
| File Encryption | Age, MiniLock |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | AES-CBC |
| Intermédiaire | 56-70 | AES-GCM |
| Avancé | 71-85 | ChaCha20-Poly1305 |
| Expert | 86-100 | XChaCha20-Poly1305 |

## 5. Sources et Références

- [RFC 8439 - ChaCha20-Poly1305](https://datatracker.ietf.org/doc/html/rfc8439)
- [XChaCha20 Draft](https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-xchacha)""",

    4088: """## 1. Vue d'ensemble

Le critère **Formal Verification** (S161) évalue l'utilisation de vérification formelle pour les smart contracts.

**Importance pour la sécurité crypto** : La vérification formelle prouve mathématiquement l'absence de bugs.

## 2. Spécifications Techniques

| Outil | Méthode | Langage |
|-------|---------|---------|
| Certora | SMT solving | Solidity |
| Runtime Verification | K framework | EVM |
| Nethermind Warp | Cairo | Solidity→Cairo |
| Coq/Isabelle | Theorem proving | Custom |

**Techniques** :
- Model checking : États finis
- Theorem proving : Logique
- Symbolic execution : Paths
- Abstract interpretation : Approximation

**Limitations** :
- Coûteux en temps
- Specs peuvent être incomplètes
- Pas tous les bugs

## 3. Application aux Produits Crypto

| Type de Produit | Formal Verification |
|-----------------|---------------------|
| Hardware Wallets | Firmware critique |
| Smart Contracts | DeFi protocols |
| Bridges | Critical security |
| Core Protocols | Consensus code |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | No verification |
| Intermédiaire | 56-70 | Unit tests |
| Avancé | 71-85 | Static analysis |
| Expert | 86-100 | Formal proofs |

## 5. Sources et Références

- [Certora Prover](https://www.certora.com/)
- [Runtime Verification](https://runtimeverification.com/)""",

    4089: """## 1. Vue d'ensemble

Le critère **Slither** (S162) évalue l'utilisation de l'analyseur statique Slither pour Solidity.

**Importance pour la sécurité crypto** : Slither détecte automatiquement les vulnérabilités communes dans les smart contracts.

## 2. Spécifications Techniques

| Aspect | Description |
|--------|-------------|
| Type | Static analyzer |
| Langage | Python |
| Target | Solidity |
| Detectors | 90+ built-in |

**Catégories de détection** :
- High : Reentrancy, unchecked calls
- Medium : Incorrect equality, shadowing
- Low : Missing zero-check, naming
- Informational : Style, optimization

**Intégrations** :
- CI/CD pipelines
- GitHub Actions
- Foundry
- Hardhat

## 3. Application aux Produits Crypto

| Type de Produit | Slither Usage |
|-----------------|---------------|
| DeFi Protocols | Mandatory |
| NFT Contracts | Recommandé |
| Token Contracts | Standard |
| Bridges | Critical |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | No analysis |
| Intermédiaire | 56-70 | Manual review |
| Avancé | 71-85 | Slither run |
| Expert | 86-100 | Slither + custom detectors |

## 5. Sources et Références

- [Slither GitHub](https://github.com/crytic/slither)
- [Trail of Bits Tools](https://www.trailofbits.com/tools)"""
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
