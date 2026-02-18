#!/usr/bin/env python3
"""Generate summaries for Adversity privacy norms (A90-A98)."""

import requests
import time
import sys
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    3945: """## 1. Vue d'ensemble

Le critère **Timing Obfuscation** (A90) évalue les techniques de masquage temporel pour empêcher les attaques par analyse de timing.

**Importance pour la sécurité crypto** : Les attaques de timing peuvent révéler des informations sur les clés privées en mesurant le temps d'exécution des opérations cryptographiques.

## 2. Spécifications Techniques

| Technique | Description | Overhead |
|-----------|-------------|----------|
| Constant-time code | Même durée quel que soit l'input | 5-10% |
| Random delays | Ajout aléatoire de délais | 10-20% |
| Dummy operations | Opérations factices intercalées | 15-30% |
| Time padding | Compléter à durée fixe | 20-50% |

**Implémentations cryptographiques** :
- `crypto_verify_32` : libsodium constant-time compare
- `CRYPTO_memcmp` : OpenSSL constant-time compare
- `subtle.ConstantTimeCompare` : Go crypto

**Vulnérabilités timing célèbres** :
- Lucky Thirteen (TLS CBC 2013)
- Raccoon Attack (TLS-DH 2020)
- Hertzbleed (CPU frequency 2022)

## 3. Application aux Produits Crypto

| Type de Produit | Timing Obfuscation |
|-----------------|-------------------|
| Hardware Wallets | Secure Element constant-time |
| Software Wallets | libsodium/OpenSSL constant-time |
| CEX | Server-side timing protection |
| DEX | Smart contract gas timing |
| Bridges | MPC timing coordination |
| Signing Devices | Critical pour signature ECDSA |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Aucune protection explicite |
| Intermédiaire | 56-70 | Librairies constant-time |
| Avancé | 71-85 | Audit timing + random delays |
| Expert | 86-100 | Formal verification timing |

## 5. Sources et Références

- [Timing Attacks on Implementations of Diffie-Hellman, RSA, DSS, and Other Systems](https://paulkocher.com/doc/TimingAttacks.pdf)
- [BearSSL Constant-Time Crypto](https://www.bearssl.org/constanttime.html)""",

    3946: """## 1. Vue d'ensemble

Le critère **Metadata Stripping** (A91) évalue la suppression des métadonnées des fichiers exportés pour protéger la vie privée.

**Importance pour la sécurité crypto** : Les métadonnées peuvent révéler l'identité, la localisation et les habitudes d'utilisation des propriétaires de wallets.

## 2. Spécifications Techniques

| Type fichier | Métadonnées à supprimer |
|--------------|------------------------|
| Images | EXIF, XMP, IPTC |
| PDF | Author, Creation date, Software |
| JSON export | Timestamps, IP, User-Agent |
| Backup files | Creation metadata |

**Outils de stripping** :
- ExifTool : Images (JPEG, PNG, TIFF)
- mat2 : Multiple formats
- qpdf : PDF linearization/sanitization

**Métadonnées crypto-spécifiques** :
- Timestamps de transactions internes
- Labels/notes de wallets
- Historique de connexions
- Device identifiers

## 3. Application aux Produits Crypto

| Type de Produit | Metadata Stripping |
|-----------------|-------------------|
| Hardware Wallets | Export backup anonymisé |
| Software Wallets | Labels optionnels, no timestamps |
| CEX | Rapports fiscaux anonymisés |
| Portfolio Apps | Export sans metadata |
| Backup Solutions | Chiffrement + stripping |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Metadata présentes |
| Intermédiaire | 56-70 | Stripping partiel |
| Avancé | 71-85 | Stripping complet auto |
| Expert | 86-100 | Option export minimal |

## 5. Sources et Références

- [ExifTool Documentation](https://exiftool.org/)
- [mat2 (Metadata Anonymisation Toolkit)](https://0xacab.org/jvoisin/mat2)""",

    3947: """## 1. Vue d'ensemble

Le critère **EXIF Removal** (A92) évalue la suppression automatique des données EXIF des images liées aux transactions crypto.

**Importance pour la sécurité crypto** : Les photos de QR codes, screenshots de wallets ou preuves de transaction peuvent contenir des coordonnées GPS et informations d'appareil.

## 2. Spécifications Techniques

| Tag EXIF | Risque Privacy | Action |
|----------|---------------|--------|
| GPS Latitude/Longitude | Critique | Supprimer |
| DateTime Original | Élevé | Supprimer |
| Camera Model | Moyen | Supprimer |
| Software | Moyen | Supprimer |
| Thumbnail | Élevé | Supprimer |
| Unique ID | Critique | Supprimer |

**Standards EXIF** :
- EXIF 2.32 : 270+ tags possibles
- XMP : Adobe metadata
- IPTC-IIM : Press metadata

**Implémentation** :
```
exiftool -all= image.jpg  # Supprime tout
jhead -purejpg image.jpg  # JPEG only
```

## 3. Application aux Produits Crypto

| Type de Produit | EXIF Handling |
|-----------------|---------------|
| Hardware Wallets | N/A (pas d'images) |
| Software Wallets | Strip QR screenshots |
| CEX | KYC images = conservation sécurisée |
| Support/Chat | Auto-strip uploads |
| Mobile Apps | Strip avant envoi |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Pas de traitement EXIF |
| Intermédiaire | 56-70 | Strip GPS seulement |
| Avancé | 71-85 | Strip complet auto |
| Expert | 86-100 | Avertissement + option |

## 5. Sources et Références

- [EXIF Standard 2.32](https://www.cipa.jp/std/documents/e/DC-008-2012_E.pdf)
- [Privacy Concerns with EXIF Data](https://www.eff.org/deeplinks/2012/04/picture-worth-thousand-words-including-your-location)""",

    3948: """## 1. Vue d'ensemble

Le critère **MAC Address Randomization** (A93) évalue la randomisation de l'adresse MAC pour empêcher le tracking réseau.

**Importance pour la sécurité crypto** : Les adresses MAC fixes permettent de tracker les utilisateurs de wallets mobiles sur les réseaux WiFi publics.

## 2. Spécifications Techniques

| OS | Support MAC Random | Depuis |
|----|-------------------|--------|
| iOS | Par défaut | iOS 14 |
| Android | Option | Android 10 |
| Windows | Option | Windows 10 |
| macOS | Limité | macOS 14 |
| Linux | NetworkManager | 1.4.0 |

**Types de randomisation** :
- **Scanning** : MAC aléatoire pour probe requests
- **Per-network** : MAC unique par SSID
- **Per-connection** : MAC change à chaque connexion

**Format MAC aléatoire** :
- Bit unicast : toujours 0
- Bit local : toujours 1 (02:xx:xx:xx:xx:xx)

## 3. Application aux Produits Crypto

| Type de Produit | MAC Randomization |
|-----------------|-------------------|
| Hardware Wallets | N/A (pas de WiFi natif) |
| Software Wallets | Dépend de l'OS |
| Mobile Wallets | iOS/Android support |
| Desktop Wallets | Configuration manuelle |
| Exchange Apps | Dépend de l'OS |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | MAC fixe par défaut |
| Intermédiaire | 56-70 | Instruction utilisateur |
| Avancé | 71-85 | Recommandation in-app |
| Expert | 86-100 | Vérification MAC status |

## 5. Sources et Références

- [Apple WiFi Privacy](https://support.apple.com/en-us/HT211227)
- [Android MAC Randomization](https://source.android.com/devices/tech/connect/wifi-mac-randomization)""",

    3949: """## 1. Vue d'ensemble

Le critère **DNS over HTTPS** (A94) évalue le support du DoH pour chiffrer les requêtes DNS et protéger la vie privée.

**Importance pour la sécurité crypto** : Les requêtes DNS en clair révèlent les domaines crypto visités (exchanges, DeFi) aux FAI et attaquants réseau.

## 2. Spécifications Techniques

| Protocole | Port | Chiffrement | Standard |
|-----------|------|-------------|----------|
| DNS classique | 53 | Aucun | RFC 1035 |
| DoH | 443 | TLS 1.3 | RFC 8484 |
| DoT | 853 | TLS 1.3 | RFC 7858 |
| DoQ | 853 | QUIC | RFC 9250 |

**Fournisseurs DoH recommandés** :
- Cloudflare : `https://cloudflare-dns.com/dns-query`
- Google : `https://dns.google/dns-query`
- Quad9 : `https://dns.quad9.net/dns-query`
- NextDNS : `https://dns.nextdns.io`

**Configuration** :
- Firefox : Paramètres > DNS over HTTPS
- Chrome : chrome://settings/security
- Système : Requiert configuration réseau

## 3. Application aux Produits Crypto

| Type de Produit | DoH Support |
|-----------------|-------------|
| Hardware Wallets | Via companion app |
| Software Wallets | Dépend navigateur/OS |
| CEX Apps | Backend DoH (transparent) |
| DeFi Frontends | Navigateur DoH |
| Mobile Wallets | OS DoH (iOS 14+, Android 9+) |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | DNS classique |
| Intermédiaire | 56-70 | DoH documenté |
| Avancé | 71-85 | DoH intégré/recommandé |
| Expert | 86-100 | DoH + DNSSEC validation |

## 5. Sources et Références

- [RFC 8484 - DNS over HTTPS](https://datatracker.ietf.org/doc/html/rfc8484)
- [Cloudflare DoH](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/)""",

    3951: """## 1. Vue d'ensemble

Le critère **Traffic Analysis Resistance** (A96) évalue la résistance aux attaques par analyse de trafic réseau.

**Importance pour la sécurité crypto** : L'analyse de trafic peut révéler les patterns de transactions même si le contenu est chiffré.

## 2. Spécifications Techniques

| Technique | Protection | Overhead |
|-----------|------------|----------|
| Traffic padding | Volume constant | 50-200% |
| Timing jitter | Délais aléatoires | 10-30% |
| Dummy traffic | Faux paquets | 100-300% |
| Onion routing | Multi-hop encryption | 200-500% |
| Mixnets | Batch + shuffle | Variable |

**Attaques par analyse de trafic** :
- Timing correlation : Corrélation entrée/sortie Tor
- Volume analysis : Taille des transactions
- Frequency analysis : Patterns temporels
- Website fingerprinting : Identification sites visités

**Contre-mesures** :
- Tor : Onion routing, guard nodes
- I2P : Garlic routing
- Mixnets : Nym, Loopix

## 3. Application aux Produits Crypto

| Type de Produit | Traffic Resistance |
|-----------------|-------------------|
| Hardware Wallets | Limité (USB direct) |
| Software Wallets | Tor integration possible |
| CEX | Backend protection |
| DEX | RPC via Tor/VPN |
| Privacy Coins | Intégré (Monero, Zcash) |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | HTTPS uniquement |
| Intermédiaire | 56-70 | VPN recommandé |
| Avancé | 71-85 | Tor integration |
| Expert | 86-100 | Padding + mixnet |

## 5. Sources et Références

- [Tor Project](https://www.torproject.org/)
- [Traffic Analysis Attacks and Defenses](https://www.freehaven.net/anonbib/cache/ShsWa02.pdf)""",

    3952: """## 1. Vue d'ensemble

Le critère **Fingerprinting Resistance** (A97) évalue la protection contre le fingerprinting de navigateur et d'appareil.

**Importance pour la sécurité crypto** : Le fingerprinting permet de tracker les utilisateurs de DeFi et exchanges même sans cookies, compromettant l'anonymat.

## 2. Spécifications Techniques

| Vecteur | Bits d'entropie | Protection |
|---------|-----------------|------------|
| User-Agent | 10-12 bits | Générique |
| Canvas | 8-10 bits | Noise injection |
| WebGL | 6-8 bits | Désactiver/Spoof |
| Fonts | 8-10 bits | Limiter accès |
| Audio | 6-8 bits | Noise |
| Screen | 4-6 bits | Standard res |

**Total fingerprint** : ~40+ bits = identification unique

**Navigateurs anti-fingerprint** :
- Tor Browser : Uniformisation complète
- Brave : Fingerprint protection native
- Firefox : privacy.resistFingerprinting
- Mullvad Browser : Tor Browser sans Tor

## 3. Application aux Produits Crypto

| Type de Produit | Fingerprinting Protection |
|-----------------|--------------------------|
| Hardware Wallets | N/A |
| Software Wallets | Extension browser |
| CEX Web | Difficile (KYC anyway) |
| DEX | Tor Browser recommandé |
| DeFi | Canvas blocker possible |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Aucune protection |
| Intermédiaire | 56-70 | Documentation privacy |
| Avancé | 71-85 | Recommandation Tor/Brave |
| Expert | 86-100 | Mode privacy intégré |

## 5. Sources et Références

- [AmIUnique.org](https://amiunique.org/)
- [Cover Your Tracks (EFF)](https://coveryourtracks.eff.org/)
- [Tor Browser Design](https://tb-manual.torproject.org/design/)""",

    3953: """## 1. Vue d'ensemble

Le critère **Screen Capture Block** (A98) évalue la protection contre les captures d'écran pour sécuriser les informations sensibles.

**Importance pour la sécurité crypto** : Les captures d'écran peuvent exposer les seed phrases, adresses, et soldes à des malwares ou personnes malveillantes.

## 2. Spécifications Techniques

| Plateforme | Méthode | Efficacité |
|------------|---------|------------|
| Android | FLAG_SECURE | Élevée |
| iOS | UIScreen.captured | Moyenne |
| Windows | SetWindowDisplayAffinity | Élevée |
| macOS | CGSSetWindowSharingState | Moyenne |
| Web | CSS user-select + events | Faible |

**Android FLAG_SECURE** :
```java
getWindow().setFlags(
    WindowManager.LayoutParams.FLAG_SECURE,
    WindowManager.LayoutParams.FLAG_SECURE
);
```

**Limitations** :
- Photos d'écran physiques
- Enregistrement externe
- Screen recording hardware
- Certains root/jailbreak bypass

## 3. Application aux Produits Crypto

| Type de Produit | Screen Capture Block |
|-----------------|---------------------|
| Hardware Wallets | N/A (écran physique) |
| Mobile Wallets | FLAG_SECURE recommandé |
| CEX Apps | Obligatoire zones sensibles |
| Desktop Wallets | SetWindowDisplayAffinity |
| Web Wallets | Limité (CSS only) |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Aucune protection |
| Intermédiaire | 56-70 | Block sur seed phrase |
| Avancé | 71-85 | Block toutes zones sensibles |
| Expert | 86-100 | + Détection recording |

## 5. Sources et Références

- [Android FLAG_SECURE](https://developer.android.com/reference/android/view/WindowManager.LayoutParams#FLAG_SECURE)
- [iOS Screen Recording Detection](https://developer.apple.com/documentation/uikit/uiscreen/2921651-iscaptured)"""
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
