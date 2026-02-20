#!/usr/bin/env python3
"""Generate summaries batch 2 for SafeScoring norms - A10-A20, A100-A115."""

import requests
import sys
import time
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    # A10 - Graduated Response
    4528: """## 1. Vue d'ensemble

Le **Graduated Response** (réponse graduée) est un système de protection multi-niveaux qui adapte automatiquement l'intensité de la réponse de sécurité en fonction du niveau de menace détecté ou du comportement de l'attaquant.

Ce concept s'inspire des protocoles militaires et de sécurité physique. Dans le contexte crypto, il permet une escalade progressive : d'abord un avertissement, puis un délai, puis un gel, enfin un effacement - donnant plusieurs chances à l'utilisateur légitime tout en protégeant contre les attaques.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Niveau | Trigger | Action | Délai reset |
|--------|---------|--------|-------------|
| 1 - Attention | 1-2 erreurs PIN | Avertissement visuel | Immédiat |
| 2 - Alerte | 3-4 erreurs PIN | Délai exponentiel (1min, 5min, 15min) | 24h |
| 3 - Danger | 5-7 erreurs PIN | Gel temporaire (1-24h) | 48h |
| 4 - Critique | 8-9 erreurs PIN | Notification contact de confiance | 72h |
| 5 - Urgence | 10+ erreurs PIN | Wipe automatique | N/A |

**Algorithme de délai exponentiel :**
```
delay(n) = min(base_delay * 2^(n-1), max_delay)
Typiquement: 30s, 1min, 2min, 4min, 8min, 15min, 30min, 1h
```

**Paramètres configurables :**
- Seuils de déclenchement (nombre de tentatives)
- Durées de délai par niveau
- Actions par niveau
- Notifications

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** : Délai exponentiel après erreurs, wipe après 3 PIN
- **Trezor** : Délai progressif (1s → 2s → 4s...), wipe configurable
- **Coldcard** : Countdown to brick configurable
- **BitBox02** : 10 tentatives puis wipe

### Software Wallets
- **MetaMask** : Pas de graduated response natif
- **Trust Wallet** : Verrouillage temporaire possible
- Implémentation côté OS (iOS/Android lockout)

### Exchanges (CEX)
- **Binance** : 2FA lockout progressif, gel compte après anomalies
- **Kraken** : Système anti-brute-force, notifications
- **Coinbase** : Lockout temporaire, vérification additionnelle

### DEX/DeFi
- Non applicable (pas d'authentification centralisée)

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| Complet | 5+ niveaux configurables, actions distinctes | 100% |
| Avancé | 3-4 niveaux, délai exponentiel | 75% |
| Basique | Délai simple + wipe final | 50% |
| Minimal | Wipe après N tentatives uniquement | 25% |

## 5. Sources et Références

- SafeScoring Criteria A10 v1.0
- [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html) - Throttling mechanisms
""",

    # A11 - Hidden Wallet BIP39
    4529: """## 1. Vue d'ensemble

Le **Hidden Wallet BIP39** (portefeuille caché) exploite la fonctionnalité de passphrase du standard BIP39 pour créer un ou plusieurs wallets "cachés" dont l'existence est indétectable sans connaître la passphrase exacte.

Cette fonctionnalité offre une "plausible deniability" : même sous contrainte, l'utilisateur peut révéler son seed phrase sans exposer ses fonds principaux, car l'attaquant ne peut pas prouver l'existence d'autres wallets dérivés avec des passphrases différentes.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Standard | Spécification |
|----------|---------------|
| BIP39 | Passphrase optionnelle (0-50+ caractères) |
| BIP32 | Dérivation HD à partir du seed |
| Algorithme | PBKDF2-HMAC-SHA512 |
| Itérations | 2048 rounds |
| Salt | "mnemonic" + passphrase |

**Calcul du seed BIP39 :**
```
entropy → mnemonic (12/24 mots)
seed = PBKDF2(mnemonic, "mnemonic" + passphrase, 2048, SHA512)
master_key = HMAC-SHA512(seed, "Bitcoin seed")
```

**Propriétés cryptographiques :**
- Chaque passphrase génère un wallet unique et valide
- Impossible de prouver qu'un wallet "caché" existe
- Espace des passphrases : infini (UTF-8 normalisé NFKD)
- Pas de "mauvaise" passphrase (toutes sont valides)

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger Nano** : Passphrase attachée à PIN secondaire (max 100 chars)
- **Trezor** : Passphrase temporaire ou "hidden wallet" permanent
- **Coldcard** : Passphrase + duress wallet intégré
- **BitBox02** : "Optional passphrase" supportée
- **Keystone** : BIP39 passphrase standard

### Software Wallets
- **MetaMask** : Import seed + passphrase supporté
- **Electrum** : Passphrase native, UI dédiée
- **Sparrow** : Passphrase complète BIP39
- **BlueWallet** : Passphrase supportée

### CEX/DEX
- Non applicable (custody centralisée ou smart contracts)

### Solutions Backup
- **Cryptosteel/Billfodl** : Stocker seed séparément de la passphrase
- Recommandation : passphrase mémorisée, jamais écrite avec le seed

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| Complet | Passphrase + PIN dédié + UI intuitive | 100% |
| Standard | Passphrase supportée, config manuelle | 70% |
| Basique | Import passphrase uniquement | 40% |
| Absent | Pas de support passphrase | 0% |

## 5. Sources et Références

- [BIP39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) - Mnemonic code
- [BIP32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki) - HD Wallets
- [Ledger Passphrase](https://support.ledger.com/article/Advanced-passphrase-security)
""",

    # A100 - Backup Verification
    3955: """## 1. Vue d'ensemble

Le **Backup Verification** (vérification de sauvegarde) est un processus permettant de confirmer que la seed phrase ou le backup a été correctement enregistré et peut être utilisé pour restaurer le wallet.

Cette vérification est critique car de nombreuses pertes de fonds proviennent de backups mal recopiés, incomplets ou illisibles. Le critère A100 évalue la présence et la qualité de ce processus de vérification.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Méthode | Description | Fiabilité |
|---------|-------------|-----------|
| Re-saisie complète | Entrer les 24 mots dans l'ordre | 100% |
| Vérification partielle | Confirmer mots aléatoires (ex: mots 3, 12, 19) | 70-90% |
| QR code scan | Scanner le backup et comparer | 95% |
| Checksum verification | Valider le checksum BIP39 | 99.6% |
| Test recovery | Restauration complète sur appareil test | 100% |

**Checksum BIP39 :**
- 24 mots = 256 bits d'entropie + 8 bits checksum
- Checksum = premiers 8 bits de SHA256(entropy)
- Détecte erreurs de transcription avec probabilité 255/256 (99.6%)

**Fréquence recommandée :**
- Vérification initiale : obligatoire
- Re-vérification : tous les 6-12 mois
- Après événement : déménagement, sinistre, mise à jour firmware

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** : Vérification 24 mots obligatoire au setup, "Recovery Check" app
- **Trezor** : Vérification partielle (quelques mots), dry-run recovery possible
- **Coldcard** : "Verify Backup" fonction dédiée, test seed sans effacer
- **BitBox02** : Vérification microSD ou manuelle

### Software Wallets
- **MetaMask** : Quiz de vérification (mots aléatoires)
- **Trust Wallet** : Vérification partielle au setup
- **Electrum** : Entrée complète requise pour confirmer

### Solutions Backup
- **Cryptosteel** : Vérification visuelle uniquement
- Recommandation : test de restauration sur wallet séparé

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| Complet | Vérification 100% + reminder périodique + dry-run | 100% |
| Standard | Vérification complète au setup | 70% |
| Partiel | Vérification de quelques mots | 40% |
| Absent | Pas de vérification intégrée | 0% |

## 5. Sources et Références

- [BIP39 Checksum](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki#checksum)
- SafeScoring Criteria A100 v1.0
""",

    # A101 - Recovery Drill Mode
    3956: """## 1. Vue d'ensemble

Le **Recovery Drill Mode** (mode exercice de récupération) permet de tester le processus de restauration d'un wallet sans risquer les fonds existants. C'est un "dry-run" qui simule une récupération complète.

Cette fonctionnalité est essentielle pour s'assurer que l'utilisateur maîtrise le processus de recovery AVANT une situation d'urgence réelle où le stress peut mener à des erreurs.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Mode | Description | Risque |
|------|-------------|--------|
| Dry-run complet | Simule recovery sans modifier l'état | Aucun |
| Recovery sur appareil test | Vraie restoration sur device séparé | Faible |
| Partial verification | Vérifie seed sans charger le wallet | Aucun |

**Process dry-run typique :**
1. Sélectionner "Recovery Drill" dans settings
2. Entrer les 24 mots de la seed phrase
3. Optionnel : entrer la passphrase
4. Système vérifie validité sans modifier l'état
5. Confirmation : "Backup valide" ou "Erreur détectée"

**Informations vérifiées :**
- Validité checksum BIP39
- Dérivation des premières adresses
- Comparaison avec adresses actuelles (optionnel)

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Coldcard** : "Seed Vault" + dry-run recovery excellent
- **Trezor** : "Dry-run recovery" disponible dans Trezor Suite
- **Ledger** : "Recovery Check" app sur Ledger Live
- **BitBox02** : Non disponible nativement

### Software Wallets
- Généralement non implémenté
- Workaround : restaurer sur wallet temporaire

### Fréquence recommandée
- Tous les 6-12 mois
- Après chaque mise à jour firmware
- Avant tout voyage ou situation à risque

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| Complet | Dry-run natif + verification adresses + reminder | 100% |
| Standard | Dry-run disponible | 70% |
| Manuel | Possible mais pas guidé | 30% |
| Absent | Pas de mode drill | 0% |

## 5. Sources et Références

- [Trezor Dry-Run Recovery](https://wiki.trezor.io/Dry-run_recovery)
- [Coldcard Seed Vault](https://coldcard.com/docs/seed-vault)
- SafeScoring Criteria A101 v1.0
""",

    # A102 - Partial Seed Recovery
    3957: """## 1. Vue d'ensemble

Le **Partial Seed Recovery** évalue la capacité à récupérer un wallet lorsque quelques mots de la seed phrase sont manquants ou illisibles, en utilisant des techniques de brute-force ou de correction d'erreur.

Ceci est particulièrement utile si un backup physique est partiellement endommagé (eau, feu) ou si l'utilisateur a fait une erreur de transcription sur 1-2 mots.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Mots manquants | Combinaisons | Temps (GPU moderne) |
|----------------|--------------|---------------------|
| 1 mot | 2048 | < 1 seconde |
| 2 mots | 4,194,304 | ~10 secondes |
| 3 mots | 8,589,934,592 | ~6 heures |
| 4 mots | 17+ trillion | Impraticable |

**Wordlist BIP39 :**
- 2048 mots standardisés
- Premiers 4 caractères uniques (préfixe suffisant)
- Checksum permet validation rapide

**Outils de recovery :**
- BTCRecover (Python, open-source)
- Seed Savior (service payant)
- Coldcard "Seed XOR" (partial recovery)

**Optimisations :**
- Checksum filtering : élimine 255/256 combinaisons invalides
- Known position : réduit drastiquement l'espace de recherche
- GPU acceleration : 10-100x plus rapide que CPU

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Coldcard** : Support partiel via "Seed XOR" et import
- **Trezor** : Pas de support natif, utiliser BTCRecover
- **Ledger** : Pas de support natif

### Software Wallets
- **Electrum** : Script recovery possible
- **Sparrow** : Import avec mots manquants non supporté

### Outils dédiés
- **BTCRecover** : Open-source, multi-coin
- **hashcat** : GPU brute-force généraliste
- Services professionnels : Wallet Recovery Services

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| Intégré | Recovery partiel natif (1-2 mots) | 100% |
| Guidé | Documentation + outils recommandés | 50% |
| Manuel | Possible mais non documenté | 20% |
| Absent | Pas de solution | 0% |

## 5. Sources et Références

- [BTCRecover](https://github.com/3rdIteration/btcrecover)
- [BIP39 Wordlist](https://github.com/bitcoin/bips/blob/master/bip-0039/english.txt)
- SafeScoring Criteria A102 v1.0
""",

    # A103 - Seed Phrase Checksum
    3958: """## 1. Vue d'ensemble

Le **Seed Phrase Checksum** (somme de contrôle) est un mécanisme intégré au standard BIP39 qui permet de détecter les erreurs de transcription dans une seed phrase avant de l'utiliser pour une restauration.

Le dernier mot (ou partie du dernier mot) de la seed phrase contient des bits de checksum calculés à partir de l'entropie, permettant une validation immédiate.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Longueur seed | Entropie | Checksum | Total bits |
|---------------|----------|----------|------------|
| 12 mots | 128 bits | 4 bits | 132 bits |
| 15 mots | 160 bits | 5 bits | 165 bits |
| 18 mots | 192 bits | 6 bits | 198 bits |
| 21 mots | 224 bits | 7 bits | 231 bits |
| 24 mots | 256 bits | 8 bits | 264 bits |

**Calcul du checksum :**
```
checksum = SHA256(entropy)[0:checksum_length]
mnemonic_bits = entropy || checksum
```

**Probabilité de détection :**
- 24 mots : 255/256 = 99.61% des erreurs détectées
- 12 mots : 15/16 = 93.75% des erreurs détectées

**Types d'erreurs détectées :**
- Mot mal orthographié (si résulte en mot invalide)
- Mot manquant
- Mots intervertis
- Mot substitué par un autre

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Tous** : Validation checksum obligatoire à l'import
- Rejet immédiat si checksum invalide
- Message d'erreur spécifique

### Software Wallets
- **MetaMask** : Validation checksum, message d'erreur
- **Electrum** : Validation + suggestion de correction
- **Trust Wallet** : Validation checksum standard

### Validation en temps réel
- Certains wallets valident mot par mot
- Feedback immédiat si mot hors wordlist

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| Avancé | Checksum + validation temps réel + suggestions | 100% |
| Standard | Validation checksum à l'import | 80% |
| Basique | Validation wordlist uniquement | 40% |
| Absent | Pas de validation | 0% |

## 5. Sources et Références

- [BIP39 Specification](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [BIP39 Checksum](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki#generating-the-mnemonic)
- SafeScoring Criteria A103 v1.0
""",

    # A104 - Multi-location Backup
    3959: """## 1. Vue d'ensemble

Le **Multi-location Backup** (sauvegarde multi-sites) évalue la capacité et les recommandations pour distribuer les backups sur plusieurs emplacements géographiques distincts, protégeant contre les sinistres localisés (incendie, inondation, vol).

Ce critère est particulièrement important pour les montants significatifs où une seule copie représente un risque inacceptable.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Configuration | Sécurité | Praticité |
|---------------|----------|-----------|
| 1 location | Faible | Haute |
| 2 locations | Moyenne | Moyenne |
| 3+ locations | Haute | Basse |
| Shamir 2-of-3 | Très haute | Moyenne |

**Distance recommandée entre sites :**
- Minimum : 10 km (sinistre local)
- Recommandé : 100+ km (sinistre régional)
- Idéal : Pays différents (risque politique)

**Types de stockage par location :**
- Coffre bancaire
- Domicile famille/ami de confiance
- Coffre-fort ignifugé personnel
- Stockage professionnel (ex: Casa)

**Schéma Shamir's Secret Sharing (SLIP39) :**
- 2-of-3 : Tolérance 1 perte, sécurité si 1 compromis
- 3-of-5 : Haute résilience, complexité accrue
- Algorithme : GF(256) polynomial interpolation

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Coldcard** : Support SLIP39 natif
- **Trezor Model T** : SLIP39 "Shamir Backup" intégré
- **Ledger** : BIP39 uniquement (Shamir via tools externes)

### Solutions Backup
- **Cryptosteel Capsule** : Format compact pour coffre bancaire
- **Billfodl** : Plaques métal multi-copies
- **SafeHaven** : Service multi-location géré

### Services custody
- **Casa** : Multi-sig géographiquement distribué
- **Unchained Capital** : Collaborative custody

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| Intégré | Shamir natif + guide multi-location | 100% |
| Guidé | Documentation multi-location | 60% |
| Basique | Supporte copies multiples | 30% |
| Absent | Pas de guidance | 0% |

## 5. Sources et Références

- [SLIP39 Specification](https://github.com/satoshilabs/slips/blob/master/slip-0039.md)
- SafeScoring Criteria A104 v1.0
""",

    # A105 - Encrypted Cloud Backup
    3960: """## 1. Vue d'ensemble

Le **Encrypted Cloud Backup** (sauvegarde cloud chiffrée) évalue les solutions de backup utilisant le stockage cloud avec un chiffrement côté client, offrant résilience géographique sans compromettre la sécurité.

Cette approche est controversée dans la communauté crypto : elle offre une excellente résilience contre la perte physique mais introduit des risques de sécurité si mal implémentée.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Exigence minimum | Recommandé |
|-----------|-----------------|------------|
| Algorithme chiffrement | AES-256-GCM | AES-256-GCM ou ChaCha20-Poly1305 |
| Dérivation clé | PBKDF2 (100k+ rounds) | Argon2id |
| Longueur mot de passe | 12+ caractères | 16+ caractères + diceware |
| Provider cloud | Tout (données chiffrées) | E2E encrypted (Tresorit, ProtonDrive) |

**Architecture sécurisée :**
```
password → Argon2id(password, salt, t=3, m=64MB) → key_256bit
plaintext_seed → AES-256-GCM(key, nonce) → ciphertext
ciphertext → Upload cloud
```

**Risques et mitigations :**
| Risque | Mitigation |
|--------|------------|
| Mot de passe faible | Exiger entropy > 80 bits |
| Compromise cloud | Chiffrement client-side |
| Key logger | 2FA + hardware key |
| Quantum | AES-256 résistant (Grover = 128 bits) |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** : Ledger Recover (controversé, opt-in)
- **Trezor** : Pas de cloud backup intégré
- **Coldcard** : Backup microSD chiffré (local, pas cloud)
- **BitBox02** : Backup microSD optionnel

### Software Wallets
- **Argent** : Social recovery (gardians, pas cloud direct)
- **Trust Wallet** : Pas de cloud backup
- **Coinbase Wallet** : Cloud backup iCloud/Google Drive (chiffré)

### Services dédiés
- **Casa** : Mobile key backup chiffré
- **Unchained** : Pas de cloud (multisig physique)

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| Sécurisé | Argon2id + AES-256-GCM + opt-in explicite | 100% |
| Standard | AES-256 + PBKDF2 fort | 70% |
| Risqué | Chiffrement faible ou clé dérivée simple | 20% |
| Non recommandé | Cloud sans chiffrement client | 0% |

**Note** : Points bonus si opt-in explicite avec warnings clairs.

## 5. Sources et Références

- [Argon2 Specification](https://github.com/P-H-C/phc-winner-argon2)
- [Ledger Recover Whitepaper](https://www.ledger.com/recover)
- SafeScoring Criteria A105 v1.0
""",

    # A106 - Cross-border Legal Support
    3961: """## 1. Vue d'ensemble

Le **Cross-border Legal Support** évalue la documentation et le support fournis pour les situations juridiques transfrontalières : voyage avec hardware wallet, saisie douanière, demandes gouvernementales étrangères.

Ce critère est particulièrement pertinent pour les utilisateurs internationaux ou voyageurs fréquents qui peuvent faire face à des inspections ou confiscations.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Situation | Documentation requise | Action recommandée |
|-----------|----------------------|-------------------|
| Contrôle douanier | FAQ voyage, droits utilisateur | Déclaration optionnelle |
| Saisie appareil | Procédure de réclamation | Contact support juridique |
| Demande données | Politique de confidentialité | Zero-knowledge design |
| Détention | Contacts d'urgence | Duress features |

**Jurisdictions à considérer :**
- **USA** : 5th Amendment, border search exception
- **EU** : GDPR, droit au silence
- **Chine** : Restrictions crypto
- **Russie** : Déclaration obligatoire > 10k USD

**Bonnes pratiques voyage :**
1. Wallet vide ou minimal
2. Backup stocké séparément
3. Passphrase mémorisée (plausible deniability)
4. Connaissance des droits locaux

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** : FAQ voyage basique
- **Trezor** : Documentation plausible deniability
- **Coldcard** : Guide "Border Security" détaillé
- **BitBox02** : Documentation minimale

### Exchanges
- **Kraken** : Guide juridique détaillé, support multilingue
- **Coinbase** : Documentation compliance par pays
- **Binance** : Restrictions géographiques documentées

### Services spécialisés
- **Casa** : Conseil juridique inclus pour clients premium
- Avocats spécialisés crypto (liste maintenue par certains vendors)

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| Complet | Guide juridique multi-pays + contacts avocats + support 24/7 | 100% |
| Standard | FAQ voyage + documentation droits | 60% |
| Basique | Mentions générales | 30% |
| Absent | Pas de documentation | 0% |

## 5. Sources et Références

- [EFF Border Search Guide](https://www.eff.org/issues/border-searches)
- [Coldcard Travel Guide](https://coldcard.com/docs/travel)
- SafeScoring Criteria A106 v1.0
""",

    # A107 - Asset Protection Trust
    3962: """## 1. Vue d'ensemble

Le **Asset Protection Trust** évalue l'intégration ou la documentation concernant les structures juridiques de protection d'actifs (trusts, fondations) pour protéger les crypto-actifs contre les saisies, poursuites, ou successions contestées.

Ce critère concerne principalement les utilisateurs avec des montants significatifs nécessitant une protection juridique formelle.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Structure | Juridiction | Protection | Complexité |
|-----------|-------------|------------|------------|
| Revocable Trust | USA | Faible | Basse |
| Irrevocable Trust | USA | Moyenne | Haute |
| DAPT | Nevada, Delaware, Alaska | Haute | Haute |
| Offshore Trust | Nevis, Cook Islands | Très haute | Très haute |
| Swiss Foundation | Suisse | Haute | Moyenne |

**Domestic Asset Protection Trusts (DAPT) US :**
- Nevada : Pas de délai contestation créanciers
- Delaware : 4 ans contestation
- Alaska : 10 ans de juridisprudence

**Intégration crypto :**
- Multi-sig avec trustee comme cosignataire
- Custody institutionnelle au nom du trust
- Smart contract governance (DAOs)

## 3. Application aux Produits Crypto

### Services Custody
- **Anchorage** : Trusts institutionnels, documentation juridique
- **BitGo** : Trust company régulée
- **Casa** : Partenariats avec avocats spécialisés

### Hardware Wallets
- **Tous** : Pas d'intégration directe (hors périmètre)
- Documentation : rarement abordé

### Solutions multi-sig
- **Gnosis Safe** : Multi-sig compatible structures juridiques
- **Casa** : Multi-sig + conseil juridique

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| Intégré | Partenariats avocats + documentation trust + multi-sig adapté | 100% |
| Guidé | Documentation complète + références juridiques | 60% |
| Mentionné | Abordé dans FAQ | 30% |
| Absent | Non mentionné | 0% |

## 5. Sources et Références

- [Asset Protection Society](https://assetprotectionplanning.com/)
- SafeScoring Criteria A107 v1.0
""",

    # A108 - Plausible Deniability Docs
    3963: """## 1. Vue d'ensemble

Le **Plausible Deniability Documentation** évalue la qualité de la documentation fournie sur les fonctionnalités de plausible deniability : wallets cachés, duress PINs, passphrase BIP39.

Une bonne documentation permet à l'utilisateur de configurer et utiliser ces fonctionnalités correctement pour maximiser leur efficacité en situation réelle.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Fonctionnalité | Niveau deniability | Détectable ? |
|----------------|-------------------|--------------|
| Passphrase BIP39 | Haute | Non (mathématiquement impossible) |
| Duress wallet | Moyenne | Dépend de l'implémentation |
| Hidden volume | Haute | Analyse forensique difficile |
| Decoy OS | Très haute | Requires extensive forensics |

**Documentation requise :**
1. Explication du concept
2. Guide de configuration pas-à-pas
3. Scénarios d'utilisation (exemples concrets)
4. Limitations et risques
5. Maintenance (garder le decoy crédible)

**Erreurs courantes à documenter :**
- Decoy wallet vide (suspect)
- Passphrase trop simple
- Historique de transactions incohérent
- Comportement nerveux (formation nécessaire)

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Coldcard** : Documentation exemplaire (Guide Paranoid, Duress Wallet)
- **Trezor** : Wiki détaillé sur hidden wallet
- **Ledger** : Documentation passphrase basique
- **BitBox02** : Minimale

### Software Wallets
- Généralement peu documenté
- Electrum : Bon guide passphrase

### Qualité documentation
- Format : texte, vidéo, FAQ
- Accessibilité : multilingue si possible
- Mise à jour : régulière avec firmware

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| Exemplaire | Guide complet + vidéos + scénarios + training | 100% |
| Complet | Documentation écrite détaillée | 70% |
| Basique | Mention dans FAQ | 40% |
| Absent | Non documenté | 0% |

## 5. Sources et Références

- [Coldcard Docs](https://coldcard.com/docs/)
- [Trezor Wiki](https://wiki.trezor.io/)
- SafeScoring Criteria A108 v1.0
""",

    # A109 - Travel Advisory Integration
    3964: """## 1. Vue d'ensemble

Le **Travel Advisory Integration** évalue si le produit ou service intègre ou référence des informations sur les restrictions crypto par pays, permettant aux utilisateurs de se préparer avant de voyager.

Ce critère est important car les réglementations crypto varient drastiquement entre pays, de l'acceptation totale à l'interdiction complète.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Pays | Statut crypto | Restrictions |
|------|---------------|--------------|
| El Salvador | Légal (cours légal) | Aucune |
| USA | Légal (régulé) | Reporting > $10k |
| EU | Légal (MiCA 2024) | KYC/AML |
| Chine | Interdit | Trading/mining bannis |
| Maroc | Interdit | Possession illégale |
| Inde | Légal (taxé 30%) | Restrictions bancaires |

**Catégories de risque voyage :**
- **Vert** : Crypto friendly, pas de restrictions
- **Jaune** : Régulé, déclaration possible
- **Orange** : Restrictions, risque de saisie
- **Rouge** : Interdit, risque légal

**Sources de données :**
- Library of Congress (crypto-laws.info)
- Chainalysis regulatory reports
- FATF country assessments

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Coldcard** : Guide voyage intégré
- **Trezor** : Blog articles occasionnels
- **Ledger** : FAQ minimale

### Exchanges
- **Kraken** : Liste pays restreints à jour
- **Binance** : Restrictions géo-bloquantes
- **Coinbase** : Documentation compliance

### Apps mobiles
- **Trust Wallet** : Pas d'advisory
- Potentiel : intégration travel alerts

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| Intégré | Advisory temps réel + alertes + carte interactive | 100% |
| Référencé | Liens vers ressources fiables + mise à jour | 60% |
| Basique | Mention générale voyage | 30% |
| Absent | Non abordé | 0% |

## 5. Sources et Références

- [Library of Congress Crypto Laws](https://www.loc.gov/law/help/cryptocurrency/)
- [Chainalysis Geography of Crypto](https://www.chainalysis.com/reports/)
- SafeScoring Criteria A109 v1.0
""",

    # A110 - Regulatory Compliance Alerts
    3965: """## 1. Vue d'ensemble

Le **Regulatory Compliance Alerts** évalue la capacité d'un produit ou service à notifier les utilisateurs des changements réglementaires qui pourraient affecter leur utilisation ou la légalité de leurs activités crypto.

Ce critère est de plus en plus important avec l'évolution rapide des réglementations crypto mondiales (MiCA, FATF, SEC).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type d'alerte | Urgence | Canal |
|---------------|---------|-------|
| Nouvelle loi adoptée | Haute | Email + In-app |
| Consultation publique | Moyenne | Newsletter |
| Guidance régulateur | Moyenne | Blog |
| Changement fiscal | Haute | Email |
| Sanction pays | Critique | Push + Email |

**Réglementations majeures à surveiller :**
- **MiCA** (EU) : Effective 2024-2025
- **Travel Rule** (FATF) : Seuil $3,000→$0
- **Taxation** : Varies by country
- **Stablecoin rules** : EU, USA evolving

**Fréquence mises à jour :**
- Quotidien : monitoring automatisé
- Hebdo : analyse humaine
- Mensuel : newsletter récap

## 3. Application aux Produits Crypto

### Exchanges
- **Coinbase** : Alerts compliance, blog régulier
- **Kraken** : Notifications restrictions pays
- **Binance** : Alertes géo-restrictions

### Hardware Wallets
- **Ledger** : Blog occasionnel
- **Trezor** : News section
- Non prioritaire (self-custody = moins régulé)

### Services spécialisés
- **Chainalysis** : Intelligence réglementaire
- **Elliptic** : Compliance monitoring
- **Notabene** : Travel rule compliance

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| Proactif | Alertes temps réel + analyse impact + recommandations | 100% |
| Informatif | Newsletter régulière + blog | 60% |
| Réactif | Communication post-changement | 30% |
| Absent | Pas de communication réglementaire | 0% |

## 5. Sources et Références

- [EU MiCA Regulation](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1114)
- [FATF Recommendations](https://www.fatf-gafi.org/recommendations.html)
- SafeScoring Criteria A110 v1.0
"""
}

def main():
    print("Saving summaries A10-A11, A100-A110...")
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
        time.sleep(0.3)
    print(f'\nDone! {len(summaries)} summaries saved.')

if __name__ == "__main__":
    main()
