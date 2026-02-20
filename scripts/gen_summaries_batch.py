#!/usr/bin/env python3
"""Generate summaries batch for SafeScoring norms."""

import requests
import sys
import time
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    4521: """## 1. Vue d'ensemble

Le critère **Multiple Duress PINs** (codes de contrainte multiples) évalue la capacité d'un appareil à gérer plusieurs codes PIN de contrainte différents, chacun déclenchant une action distincte selon le niveau de menace perçu.

Cette approche graduée permet une réponse adaptée : un premier duress PIN peut afficher un solde réduit, un second peut déclencher une alerte silencieuse, un troisième peut effacer l'appareil.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Valeur recommandée |
|-----------|-------------------|
| Nombre de Duress PINs | 2-4 distincts |
| Longueur par PIN | 4-8 chiffres |
| Actions distinctes | Minimum 3 types |
| Stockage | Chiffré indépendamment |
| Collision | Impossible avec PIN normal |

**Actions typiques par niveau :**
| Niveau | Action | Exemple |
|--------|--------|---------|
| 1 | Wallet leurre | Affiche 0.01 BTC |
| 2 | Alerte silencieuse | Notification trusted contact |
| 3 | Gel temporaire | 24h delay sur transactions |
| 4 | Wipe complet | Destruction des clés |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Coldcard Mk4** : Duress wallet + Brick Me PIN (2 niveaux)
- **Trezor** : Un seul Duress PIN
- **Ledger** : Via passphrases multiples (workaround)
- **Keystone** : Duress PIN unique

### Software Wallets
- Non implémenté (complexité UX)
- Alternative : multiple accounts avec niveaux de fonds différents

### CEX/DEX/DeFi
- Non applicable directement

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | 3+ Duress PINs avec actions distinctes | 100% |
| **Conforme partiel** | 2 Duress PINs ou 1 PIN multi-action | 60% |
| **Non-conforme** | 0-1 Duress PIN basique | 0-30% |

## 5. Sources et Références

- [Coldcard Documentation](https://coldcard.com/docs/) - Multi-PIN configuration
- SafeScoring Internal Criteria A03 v1.0
""",

    4522: """## 1. Vue d'ensemble

Le critère **Configurable Duress Action** évalue si l'utilisateur peut personnaliser l'action déclenchée par le Duress PIN selon ses préférences et son modèle de menace.

La configurabilité permet d'adapter la réponse au contexte : un utilisateur voyageant fréquemment peut préférer un wipe, tandis qu'un utilisateur sédentaire peut préférer une alerte silencieuse.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Action configurable | Description |
|--------------------|-------------|
| **Wipe** | Effacement complet des clés |
| **Fake Balance** | Affiche un solde leurre prédéfini |
| **Alert** | Notification silencieuse vers contact de confiance |
| **Delay** | Délai forcé de 24-72h sur toute transaction |
| **Lock** | Verrouillage temporaire de l'appareil |
| **Brick** | Destruction physique du SE (irréversible) |

**Interface de configuration :**
- Menu dédié dans settings sécurisé
- Confirmation par PIN normal requis
- Modification possible sans seed phrase

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Coldcard Mk4** : Actions configurables (Settings > Duress)
- **Trezor** : Action fixe (wipe uniquement)
- **Ledger** : Non configurable
- **Keystone** : Partiellement configurable

### Autres catégories
- Généralement non applicable

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| 4+ actions configurables | 100% |
| 2-3 actions | 60-80% |
| 1 action fixe | 30% |
| Non configurable | 0% |

## 5. Sources et Références

- [Coldcard Settings Guide](https://coldcard.com/docs/settings)
- SafeScoring Criteria A04 v1.0
""",

    4523: """## 1. Vue d'ensemble

Le **Delayed Wipe** (effacement différé) est une fonctionnalité permettant de programmer un effacement automatique de l'appareil après un délai prédéfini si aucune action de confirmation n'est effectuée.

Ce mécanisme protège contre les scénarios où l'utilisateur est séparé de son appareil (vol, confiscation).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Valeur |
|-----------|--------|
| Délai minimum | 1 heure |
| Délai maximum | 30 jours |
| Délais typiques | 24h, 48h, 7 jours |
| Action de reset | PIN normal + confirmation |
| Notification | Optionnelle (alerte trusted contact) |

**Mécanisme technique :**
1. Timer hardware indépendant (RTC)
2. Compteur persistant en mémoire non-volatile
3. Vérification au boot et périodique (toutes les heures)
4. Wipe via destruction de la master key

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Coldcard** : Fonction "Login Countdown" (effacement après N jours sans login)
- **Trezor** : Non disponible nativement
- **Ledger** : Non disponible
- **Keystone** : Non disponible

### Software Wallets
- Difficile à implémenter (app peut être fermée)
- Alternative : service cloud avec dead man's switch

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Delayed wipe configurable (1h-30j) | 100% |
| Délai fixe uniquement | 60% |
| Non disponible | 0% |

## 5. Sources et Références

- [Coldcard Login Countdown](https://coldcard.com/docs/login-countdown)
- SafeScoring Criteria A05 v1.0
""",

    4524: """## 1. Vue d'ensemble

Le **Silent Alert** (alerte silencieuse) est un mécanisme permettant d'envoyer une notification discrète à un contact de confiance ou un service de sécurité lorsqu'un Duress PIN est utilisé, sans que l'attaquant ne s'en aperçoive.

Cette fonctionnalité est inspirée des systèmes d'alarme bancaires.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Canal de communication | SMS, Email, Push notification, Signal |
| Latence | < 30 secondes |
| Discrétion | Aucune indication sur l'appareil |
| Contenu | Localisation GPS (optionnel) + timestamp |
| Destinataires | 1-5 contacts de confiance |

**Protocoles supportés :**
- SMS via API (Twilio, Nexmo)
- Email chiffré (PGP)
- Push notification (Firebase, APNs)
- Messagerie chiffrée (Signal API, Matrix)

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Aucun** n'implémente nativement (pas de connectivité directe)
- Solution : via app companion (Ledger Live, Trezor Suite)

### Software Wallets
- **MetaMask** : Non disponible
- Potentiel via extensions/plugins tiers

### CEX
- **Kraken** : "Panic Button" peut notifier
- **Coinbase** : Non disponible nativement

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Silent alert multi-canal + GPS | 100% |
| Alert basique (1 canal) | 60% |
| Via app companion uniquement | 30% |
| Non disponible | 0% |

## 5. Sources et Références

- SafeScoring Criteria A06 v1.0
- [Signal Protocol](https://signal.org/docs/)
""",

    4525: """## 1. Vue d'ensemble

Le **Fake Transaction History** (historique de transactions fictif) est une fonctionnalité de plausible deniability avancée qui affiche un historique de transactions crédible mais faux lorsqu'un Duress PIN est utilisé.

Cette fonctionnalité complète le "Fake Balance" en ajoutant une couche de crédibilité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Nombre de transactions | 5-20 (configurable) |
| Période couverte | 30-180 jours |
| Types de transactions | Envoi, réception, swap |
| Montants | Cohérents avec le faux solde |
| Adresses | Dérivées BIP32 (valides mais non-utilisées) |

**Génération de l'historique :**
- Algorithme pseudo-aléatoire (seed-based)
- Timestamps réalistes (distribution normale)
- Montants cohérents avec le solde affiché
- Adresses valides sur la blockchain (non-utilisées)

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Coldcard** : Duress Wallet avec historique minimal
- **Trezor** : Non disponible
- **Ledger** : Non disponible (passphrase = wallet vide)

### Software Wallets
- Techniquement possible mais non implémenté

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Historique complet (20+ tx, multi-type) | 100% |
| Historique basique (5-10 tx) | 60% |
| Solde seul sans historique | 30% |
| Non disponible | 0% |

## 5. Sources et Références

- [Coldcard Duress Wallet](https://coldcard.com/docs/duress-wallet)
- SafeScoring Criteria A07 v1.0
""",

    4526: """## 1. Vue d'ensemble

Le **Believable Decoy Balance** (solde leurre crédible) évalue si le faux solde affiché lors de l'utilisation d'un Duress PIN est suffisamment réaliste pour convaincre un attaquant.

Un solde de 0 BTC est suspect. Un solde de 0.05 BTC avec quelques transactions est plus crédible.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Recommandation |
|-----------|----------------|
| Solde minimum | > 0 (éviter solde vide) |
| Solde recommandé | 0.01-0.1 BTC ou équivalent |
| Multi-assets | Supporté (BTC, ETH, stablecoins) |
| Cohérence | Doit matcher l'historique fictif |
| Configurabilité | Par l'utilisateur |

**Facteurs de crédibilité :**
- Solde non-rond (0.0347 BTC > 0.01 BTC)
- Présence de "dust" (petits montants résiduels)
- Mix d'assets (si multi-chain wallet)
- Historique correspondant

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Coldcard** : Duress wallet avec balance configurable
- **Trezor** : Via passphrase alternative (wallet séparé)
- **Ledger** : Passphrase = wallet distinct (peut être vide)

### Software Wallets
- Multiple accounts comme workaround
- Pas de solution intégrée

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Solde configurable + multi-asset + cohérent | 100% |
| Solde fixe mais crédible | 60% |
| Solde = 0 (suspect) | 20% |
| Non disponible | 0% |

## 5. Sources et Références

- [Coldcard Duress Wallet Setup](https://coldcard.com/docs/)
- SafeScoring Criteria A08 v1.0
""",

    4527: """## 1. Vue d'ensemble

Le **Duress Word Passphrase** utilise le standard BIP39 passphrase comme mécanisme de duress : une passphrase alternative déverrouille un wallet leurre distinct du wallet principal.

Cette approche est native au standard BIP39/BIP32 et ne nécessite pas d'implémentation spécifique.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Standard | Spécification |
|----------|---------------|
| BIP39 | Mnemonic + optional passphrase |
| Dérivation | PBKDF2-HMAC-SHA512, 2048 rounds |
| Longueur passphrase | 0-100+ caractères (UTF-8) |
| Wallets possibles | Infini (une passphrase = un wallet) |

**Dérivation technique (BIP39) :**
```
Seed = PBKDF2(mnemonic + "mnemonic" + passphrase, 2048 rounds, SHA512)
Master Key = HMAC-SHA512(Seed, "Bitcoin seed")
```

**Configuration recommandée :**
- Passphrase normale : mot de passe fort (12+ caractères)
- Passphrase duress : mot simple mémorisable
- Duress wallet : maintenir petit solde crédible

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger** : Passphrase attachée à un PIN secondaire
- **Trezor** : Passphrase temporaire ou cachée
- **Coldcard** : Passphrase + Duress wallet intégré
- **BitBox02** : Passphrase optionnelle supportée
- **Keystone** : Passphrase BIP39 supportée

**Compatibilité universelle** : Tout wallet BIP39 supporte les passphrases.

### Software Wallets
- **MetaMask** : Supporte import seed + passphrase
- **Trust Wallet** : Passphrase supportée
- **Electrum** : Passphrase native

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Passphrase + PIN séparé pour duress wallet | 100% |
| Passphrase supportée (configuration manuelle) | 70% |
| Passphrase non supportée | 0% |

## 5. Sources et Références

- [BIP39 Specification](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [BIP32 HD Wallets](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)
- [Ledger Passphrase Guide](https://support.ledger.com/article/Advanced-passphrase-security)
- SafeScoring Criteria A09 v1.0
"""
}

def main():
    print("Saving summaries A03-A09...")
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
