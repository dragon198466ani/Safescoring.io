#!/usr/bin/env python3
"""Batch save summaries for Security norms"""
import os
import requests
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path('c:/Users/alexa/Desktop/SafeScoring/.env'))

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', os.environ.get('SUPABASE_KEY', ''))

def save_summary(norm_id, code, summary):
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    full_summary = f"""# {code} - Resume SafeScoring
**Mis a jour:** {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}

---

{summary}"""
    url = f'{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}'
    r = requests.patch(url, headers=headers, json={
        'summary': full_summary,
        'summary_status': 'ai_generated',
        'last_summarized_at': datetime.now().isoformat() + 'Z'
    }, timeout=30)
    return r.status_code in [200, 204]

SUMMARIES = {
    7513: ("S-AIRGAP-001", """## 1. Vue d'ensemble

La norme S-AIRGAP-001 definit les exigences de verification d'isolation air-gap pour les hardware wallets. Un dispositif air-gapped n'a aucune connexion reseau possible (WiFi, Bluetooth, cellulaire, Ethernet), garantissant que les cles privees ne peuvent jamais etre exposees via un canal de communication compromis.

L'air-gap est considere comme la meilleure protection contre les attaques a distance et les malwares.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| WiFi | Absent | Aucun chipset |
| Bluetooth | Absent | Aucun chipset |
| Cellulaire | Absent | Aucun modem |
| Ethernet | Absent | Aucun port |
| USB data | Optionnel | Si present, disable pour signing |
| Communication | QR/microSD/NFC | Alternatives |
| Verification | FCC ID analysis | Documentation |
| Audit | PCB inspection | Hardware review |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Keystone Pro**: Air-gapped natif, QR uniquement
- **Coldcard Mk4**: Air-gapped optionnel, microSD
- **NGRAVE ZERO**: Air-gapped complet

### Software Wallets
- Non applicable (software requiert connexion)

### CEX/DEX
- Non applicable

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Zero composant reseau, verification PCB | 100% |
| **Conforme partiel** | USB-only, pas de wireless | 50-80% |
| **Non-conforme** | WiFi/BT present | 0-30% |

Verification: Analyse FCC ID, inspection PCB, documentation fabricant.

## 5. Sources et References

- Air-Gap Security Best Practices
- FCC Equipment Database
- Hardware Wallet Security Standards
- SafeScoring Criteria S-AIRGAP-001 v1.0"""),

    7514: ("S-AIRGAP-002", """## 1. Vue d'ensemble

La norme S-AIRGAP-002 verifie l'absence totale de capacite WiFi dans un hardware wallet. La presence d'un chipset WiFi, meme desactive, represente une surface d'attaque potentielle pouvant etre exploitee par des malwares ou des attaques physiques.

Un dispositif conforme ne doit contenir aucun composant WiFi sur son PCB.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Chipset WiFi | Absent | Verification PCB |
| Antenne | Aucune | Inspection visuelle |
| FCC certification | Sans WiFi | Documentation |
| Frequences | Pas de 2.4GHz/5GHz | Spectrum analysis |
| Drivers | Aucun WiFi driver | Firmware analysis |
| Standards absents | 802.11a/b/g/n/ac/ax | IEEE WiFi |
| Test RF | Pas d'emission | EMC test |
| BOM | Verification composants | Supply chain |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Coldcard**: Aucun WiFi
- **Keystone**: Aucun WiFi
- **Ledger Nano S/X**: Nano S sans WiFi, Nano X Bluetooth (non WiFi)

### Software Wallets
- Non applicable

### CEX/DEX
- Non applicable

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Zero composant WiFi verifie | 100% |
| **Conforme partiel** | WiFi present mais desactive hardware | 50-80% |
| **Non-conforme** | WiFi actif ou activable | 0-30% |

Test: Analyse spectrale RF, inspection PCB, documentation FCC.

## 5. Sources et References

- IEEE 802.11 Standards
- FCC Equipment Authorization
- Hardware Security Guidelines
- SafeScoring Criteria S-AIRGAP-002 v1.0"""),

    7515: ("S-AIRGAP-003", """## 1. Vue d'ensemble

La norme S-AIRGAP-003 verifie l'absence de capacite Bluetooth dans un hardware wallet. Bluetooth represente un vecteur d'attaque majeur avec des vulnerabilites historiques (BlueBorne, KNOB, BLURtooth) permettant l'acces a distance sans appairage.

Les wallets securises privilegient des communications hors-bande (QR, microSD).

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Chipset BT | Absent | Verification PCB |
| BT Classic | Non present | BR/EDR |
| BLE | Non present | Low Energy |
| Frequence 2.4GHz | Pas d'emission BT | Test RF |
| Profils BT | Aucun | Stack absent |
| CVE historiques | N/A (pas de BT) | Securite |
| Mesh/Audio | Absent | Profils additionnels |
| Pairing attack | Impossible | Sans materiel |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Coldcard**: Zero Bluetooth
- **Keystone**: Zero Bluetooth
- **Ledger Nano X**: AVEC Bluetooth (non conforme)
- **Trezor Model T**: Zero Bluetooth

### Software Wallets
- Non applicable

### CEX/DEX
- Non applicable

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Aucun chipset Bluetooth | 100% |
| **Conforme partiel** | BT present, firmware lock | 50-80% |
| **Non-conforme** | Bluetooth actif | 0-30% |

Risque: BT est un vecteur d'attaque prouve (BlueBorne = RCE sans auth).

## 5. Sources et References

- Bluetooth SIG Security
- BlueBorne Vulnerability (CVE-2017-0781)
- KNOB Attack Research
- SafeScoring Criteria S-AIRGAP-003 v1.0"""),

    7516: ("S-AIRGAP-004", """## 1. Vue d'ensemble

La norme S-AIRGAP-004 verifie l'absence de modem cellulaire dans les hardware wallets. Les modems 4G/5G representent des surfaces d'attaque complexes avec des baseband processors souvent peu audites et des vulnerabilites SS7/Diameter.

Aucun hardware wallet de securite ne devrait inclure de connectivite cellulaire.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Modem 4G/5G | Absent | Inspection hardware |
| Baseband | Non present | Processeur separe |
| SIM slot | Absent | Pas d'emplacement |
| Antenne cellulaire | Aucune | Design PCB |
| IMEI | N/A | Sans modem |
| Bandes supportees | Aucune | Pas de RF cell |
| Certification | Pas FCC Part 22/24/27 | Documentation |
| eSIM | Absent | Pas de puce eSIM |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Tous HW wallets majeurs**: Aucun modem cellulaire
- Aucun wallet grand public n'inclut de cellulaire

### Software Wallets
- Non applicable (sur smartphone = cellulaire indirect)

### CEX/DEX
- Non applicable

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Zero modem cellulaire | 100% |
| **Conforme partiel** | N/A | N/A |
| **Non-conforme** | Modem cellulaire present | 0-30% |

Note: Aucun HW wallet serieux n'inclut de cellulaire.

## 5. Sources et References

- 3GPP Security Specifications
- Baseband Processor Vulnerabilities
- SS7/Diameter Attack Surface
- SafeScoring Criteria S-AIRGAP-004 v1.0"""),

    8081: ("S-AIRGAP-005", """## 1. Vue d'ensemble

La norme S-AIRGAP-005 definit les exigences pour les wallets utilisant exclusivement les QR codes comme methode de communication. Ce mode garantit un transfert de donnees unidirectionnel et verifiable visuellement, eliminant les risques lies aux connexions filaires ou sans fil.

Les QR codes permettent de transmettre des transactions signees sans jamais connecter le wallet.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Format QR | QR Code version 40 max | ISO 18004 |
| Capacite | 2953 bytes (binaire) | Max payload |
| Animated QR | UR (Uniform Resources) | BC-UR |
| Camera | Input pour PSBT | Lecture tx |
| Ecran | Output pour signature | Affichage |
| Verification | Human-readable preview | UX |
| Protocole | BC-UR, JSON | Standards |
| Compression | zlib optionnel | Large payloads |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Keystone Pro**: QR-only natif
- **NGRAVE ZERO**: QR-only design
- **Passport**: QR + microSD
- **Coldcard Q**: QR + autres

### Software Wallets
- **BlueWallet**: Support QR PSBT
- **Sparrow**: Watch-only + QR

### CEX/DEX
- Non applicable

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | QR-only, camera + ecran quality | 100% |
| **Conforme partiel** | QR + autres methodes | 50-80% |
| **Non-conforme** | Pas de support QR | 0-30% |

UX: QR large et animated pour transactions complexes.

## 5. Sources et References

- ISO/IEC 18004 QR Code Specification
- BC-UR (Blockchain Commons)
- PSBT Specification (BIP-174)
- SafeScoring Criteria S-AIRGAP-005 v1.0"""),

    7518: ("S-AIRGAP-006", """## 1. Vue d'ensemble

La norme S-AIRGAP-006 definit les exigences pour les wallets utilisant le transfert par microSD comme methode de communication air-gapped. Ce mode permet le transfert de fichiers PSBT et de mises a jour firmware sans connexion reseau.

Le microSD offre une capacite superieure aux QR codes pour les transactions complexes.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Format carte | microSD | Standard physique |
| Filesystem | FAT32 | Compatibilite |
| Capacite | 32GB max recommande | Limites FAT32 |
| Format fichiers | .psbt, .json | Standards |
| Chiffrement | Optionnel | Implementation |
| Verification | Hash fichier | Integrite |
| Ejection | Sans corrosion | Qualite slot |
| Ecriture | Read-only optionnel | Securite |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Coldcard**: microSD natif principal
- **Passport**: microSD + QR
- **Keystone**: QR prioritaire, microSD backup

### Software Wallets
- **Sparrow**: Export/import PSBT fichier
- **Electrum**: Support fichier PSBT

### CEX/DEX
- Non applicable

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | microSD robuste, verification hash | 100% |
| **Conforme partiel** | microSD sans verification | 50-80% |
| **Non-conforme** | Pas de support microSD | 0-30% |

Avantage: Capacite superieure pour multisig complexes.

## 5. Sources et References

- SD Card Specification
- PSBT File Format
- Air-Gap Best Practices
- SafeScoring Criteria S-AIRGAP-006 v1.0"""),

    7519: ("S-CARD-001", """## 1. Vue d'ensemble

La norme S-CARD-001 verifie la conformite ISO 7816-1 pour les smart cards utilisees dans les hardware wallets. ISO 7816-1 definit les caracteristiques physiques des cartes a puce, incluant dimensions, flexibilite et resistance aux contraintes environnementales.

Base de la compatibilite avec les lecteurs de cartes standards.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Dimensions | 85.6 x 53.98 x 0.76 mm | ID-1 format |
| Flexibilite | 30mm rayon courbure | Test mecanique |
| Temperature stockage | -35C a +50C | ISO 7816-1 |
| Temperature operation | 0C a +50C | Limites |
| UV resistance | Defini | Section 5 |
| Rayons X | 0.1 Gy max | Tolerance |
| Champ magnetique | 79.5 kA/m | Resistance |
| Electricite statique | 1500V | ESD protection |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger Nano S/X**: Carte interne conforme
- **YubiKey**: Smart card format
- **JavaCard wallets**: ISO 7816-1

### Software Wallets
- Non applicable

### CEX/DEX
- Non applicable

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | ISO 7816-1 certifie | 100% |
| **Conforme partiel** | Dimensions conformes, non certifie | 50-80% |
| **Non-conforme** | Format non standard | 0-30% |

Interoperabilite: Format universel ID-1.

## 5. Sources et References

- ISO/IEC 7816-1:2011 Physical characteristics
- Smart Card Alliance
- EMV Specifications
- SafeScoring Criteria S-CARD-001 v1.0"""),

    7520: ("S-CARD-002", """## 1. Vue d'ensemble

La norme S-CARD-002 verifie la conformite ISO 7816-2 pour la configuration et l'emplacement des contacts electriques sur les smart cards. Cette norme garantit la compatibilite universelle avec tous les lecteurs conformes.

Les 8 contacts definis permettent l'alimentation et la communication avec la puce.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| C1 (VCC) | Alimentation | +5V ou +3V |
| C2 (RST) | Reset | Signal reset |
| C3 (CLK) | Clock | 1-5 MHz |
| C5 (GND) | Ground | Reference |
| C6 (VPP) | Programming | Optional |
| C7 (I/O) | Data | Bidirectionnel |
| C4, C8 | Reserved/AUX | Future use |
| Position | Zone definie | ISO 7816-2 |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Tous SE cards**: Contacts ISO 7816-2
- **Ledger**: Contact module interne
- **SatoshiLabs**: JavaCard

### Software Wallets
- Non applicable

### CEX/DEX
- Non applicable

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | ISO 7816-2 contacts certifies | 100% |
| **Conforme partiel** | Contacts corrects, position approx | 50-80% |
| **Non-conforme** | Contacts non standard | 0-30% |

Critique: Position contacts = compatibilite lecteurs.

## 5. Sources et References

- ISO/IEC 7816-2:2007 Card contacts
- Smart Card Standards
- Contact Module Specifications
- SafeScoring Criteria S-CARD-002 v1.0"""),

    7521: ("S-CARD-003", """## 1. Vue d'ensemble

La norme S-CARD-003 verifie la conformite ISO 7816-3 pour le protocole de transmission avec les smart cards. Cette norme definit les signaux electriques, les protocoles de transmission (T=0, T=1) et les procedures d'initialisation (ATR).

Fondamental pour la communication entre lecteur et carte.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Protocole T=0 | Character-oriented | Half-duplex |
| Protocole T=1 | Block-oriented | Half-duplex |
| ATR | Answer To Reset | Max 33 bytes |
| Clock frequence | 1-5 MHz | ISO 7816-3 |
| Data rate | 9600-115200 baud | Negociable |
| ETU | Elementary Time Unit | 372/fi cycles |
| PPS | Protocol Parameter Selection | Negociation |
| Error detection | Parity (T=0), CRC (T=1) | Controle |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Secure Elements**: Tous conformes ISO 7816-3
- **JavaCard**: T=0 et T=1 support
- **Ledger SE**: Communication conforme

### Software Wallets
- Non applicable directement

### CEX/DEX
- Non applicable

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | ISO 7816-3 T=0 ou T=1 | 100% |
| **Conforme partiel** | ATR conforme, timing approx | 50-80% |
| **Non-conforme** | Protocole proprietaire | 0-30% |

Communication: Base de toute interaction carte-lecteur.

## 5. Sources et References

- ISO/IEC 7816-3:2006 Electrical interface
- EMV Book 1 - Application Independent ICC
- Smart Card Protocol Analysis
- SafeScoring Criteria S-CARD-003 v1.0"""),

    7524: ("S-CARD-006", """## 1. Vue d'ensemble

La norme S-CARD-006 verifie la conformite Java Card 3.0.5 pour les smart cards programmables. Java Card permet l'execution d'applets Java sur des puces securisees, offrant flexibilite et securite pour les applications crypto.

Standard dominant pour les secure elements programmables.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Version | 3.0.5 | Oracle spec |
| VM | Java Card Virtual Machine | Subset Java |
| API | java.lang subset | Limites memoire |
| APDU | ISO 7816-4 | Communication |
| CAP file | Converted Applet | Format |
| Memory | 32-256 KB typ | EEPROM |
| Crypto APIs | JCE subset | Cryptography |
| GlobalPlatform | 2.1.1+ | Card management |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **SatoshiLabs**: Trezor Safe (JavaCard)
- **Status Keycard**: JavaCard applet
- **Ledger**: Proprietary (non JavaCard)

### Software Wallets
- Via hardware JavaCard

### CEX/DEX
- Non applicable

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Java Card 3.0.5 certifie | 100% |
| **Conforme partiel** | Java Card version anterieure | 50-80% |
| **Non-conforme** | Non Java Card | 0-30% |

Avantage: Applets auditables et portables.

## 5. Sources et References

- Java Card 3.0.5 Specification (Oracle)
- GlobalPlatform Card Specification
- Java Card Development Kit
- SafeScoring Criteria S-CARD-006 v1.0"""),

    7048: ("S-NEW-001", """## 1. Vue d'ensemble

La norme S-NEW-001 definit les exigences pour les hardware wallets equipees d'une puce crypto dediee (Secure Element ou crypto accelerator). Cette puce isolee execute les operations cryptographiques sensibles dans un environnement securise.

Distinction entre SE certifie et crypto-chip generique.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Type | Secure Element ou Crypto Chip | Deddie |
| Certification | CC EAL5+ | SE certifies |
| Operations | Sign, verify, derive | Crypto |
| Isolation | Hardware boundary | Protection |
| Side-channel | Protected | SPA/DPA |
| Key storage | Non-exportable | Securite |
| Tamper detection | Active | Physical |
| Exemples | ST33, ATECC608, Optiga | Chips |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger**: ST33 Secure Element (CC EAL5+)
- **Trezor Model T**: ATECC608 (crypto chip)
- **Coldcard Mk4**: ATECC608B x2

### Software Wallets
- Non applicable

### CEX/DEX
- HSMs utilisent SE/crypto chips

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | SE CC EAL5+ ou equivalent | 100% |
| **Conforme partiel** | Crypto chip sans CC | 50-80% |
| **Non-conforme** | Pas de chip dedie | 0-30% |

Critique: Protection materielle des cles privees.

## 5. Sources et References

- Common Criteria EAL5+ Requirements
- STMicroelectronics ST33 Datasheet
- Microchip ATECC608 Specifications
- SafeScoring Criteria S-NEW-001 v1.0"""),

    7049: ("S-NEW-002", """## 1. Vue d'ensemble

La norme S-NEW-002 definit les exigences de blindage du PCB (Printed Circuit Board) pour les hardware wallets. Un PCB blinde protege contre les attaques par emanations electromagnetiques (TEMPEST) et les injections de fautes.

Le blindage ajoute une couche de protection physique contre les attaques sophistiquees.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| EMI shielding | Metal enclosure | Protection |
| Faraday cage | Idealement complet | EMC |
| Grounding | Multi-point | Design PCB |
| Layer count | 4+ couches | Complexite |
| Ground planes | Continues | EMI reduction |
| Signal routing | Controlled impedance | SI |
| Conformal coating | Optionnel | Protection |
| Tamper mesh | Avance | Detection |

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger Stax**: Design blinde
- **Coldcard**: Boitier metallique
- **NGRAVE**: Enclosure protecteur

### Software Wallets
- Non applicable

### CEX/DEX
- HSMs avec blindage avance

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Blindage EMI + tamper mesh | 100% |
| **Conforme partiel** | Boitier metal sans mesh | 50-80% |
| **Non-conforme** | Pas de blindage | 0-30% |

Protection: Contre TEMPEST et fault injection.

## 5. Sources et References

- EMI Shielding Guidelines
- TEMPEST Standards
- PCB Security Design
- SafeScoring Criteria S-NEW-002 v1.0"""),

    7674: ("S-DIY-001", """## 1. Vue d'ensemble

La norme S-DIY-001 couvre les hardware wallets bases sur Raspberry Pi. Ces solutions DIY offrent transparence et auditabilite mais presentent des compromis de securite significatifs par rapport aux dispositifs dedies.

Raspberry Pi n'a pas de Secure Element integre.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Plateforme | Raspberry Pi Zero/3/4 | Options |
| Secure Element | Non integre | Limitation |
| Air-gap | Via configuration | Possible |
| OS | Raspberry Pi OS / Linux | Base |
| Software | Specter DIY, SeedSigner | Options |
| Boot security | Pas de secure boot natif | Risque |
| Stockage cles | SD card (risque) | Vulnerabilite |
| Open source | Oui | Avantage |

## 3. Application aux Produits Crypto

### Hardware Wallets DIY
- **SeedSigner**: Raspberry Pi Zero + camera
- **Specter DIY**: Raspberry Pi build
- **Krux**: Alternatives

### Commercial Wallets
- Aucun wallet commercial n'utilise Raspberry Pi

### Software Wallets
- Non applicable

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Pi + SE externe + air-gap | 100% |
| **Conforme partiel** | Pi air-gapped sans SE | 50-80% |
| **Non-conforme** | Pi connecte, pas de SE | 0-30% |

Risque: Pas de protection hardware native.

## 5. Sources et References

- Raspberry Pi Security Documentation
- SeedSigner Project
- DIY Hardware Wallet Best Practices
- SafeScoring Criteria S-DIY-001 v1.0"""),

    7548: ("S-HSM-001", """## 1. Vue d'ensemble

La norme S-HSM-001 definit les exigences de format rack-mount pour les Hardware Security Modules (HSM) de niveau entreprise. Le format rack 19" permet l'integration dans les datacenters avec gestion centralisee.

Standard pour les HSMs de haute disponibilite.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Format | 19" rack-mount | EIA-310 |
| Hauteur | 1U, 2U ou 4U | Typique |
| Rails | Ajustables | Compatibilite |
| Alimentation | Redundante | HA |
| Ventilation | Front-to-back | Airflow |
| Poids max | 25kg (1U typ) | Capacite rack |
| Depth | 450-800mm | Variable |
| Management | Network + serial | Options |

## 3. Application aux Produits Crypto

### HSMs
- **Thales Luna**: Rack-mount
- **nCipher nShield**: Rack-mount
- **AWS CloudHSM**: Virtual (based on rack HSM)

### Hardware Wallets
- Non applicable (format consumer)

### CEX
- Utilisation HSMs enterprise

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | EIA-310 rack-mount conforme | 100% |
| **Conforme partiel** | Desktop avec option rack | 50-80% |
| **Non-conforme** | N/A pour wallets consumer | N/A |

Enterprise: Standard datacenter pour HSMs.

## 5. Sources et References

- EIA-310 Rack Specifications
- FIPS 140-2 Level 3 Requirements
- HSM Deployment Best Practices
- SafeScoring Criteria S-HSM-001 v1.0"""),

    7549: ("S-HSM-002", """## 1. Vue d'ensemble

La norme S-HSM-002 definit les exigences d'alimentation duale pour les HSMs de haute disponibilite. La redondance electrique garantit la continuite de service en cas de defaillance d'une source d'alimentation.

Critical pour les operations 24/7.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Alimentations | 2 minimum | Redondance |
| Hot-swap | Requis | Maintenance |
| Load sharing | Active-active | Efficacite |
| Input voltage | 100-240V AC | Universal |
| Efficiency | 80+ Gold minimum | PSU rating |
| Monitoring | Status LEDs + alerts | Management |
| Failover | <10ms | Specification |
| UPS compatible | Oui | Integration |

## 3. Application aux Produits Crypto

### HSMs
- **Thales Luna 7**: Dual PSU
- **nCipher nShield**: Redundant power
- **Utimaco CryptoServer**: Hot-swap PSU

### Hardware Wallets
- Non applicable (single battery/USB)

### CEX
- HSMs avec dual power standard

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Dual PSU hot-swap | 100% |
| **Conforme partiel** | Single PSU + UPS | 50-80% |
| **Non-conforme** | Single PSU sans backup | 0-30% |

Haute disponibilite: Zero downtime.

## 5. Sources et References

- FIPS 140-2 Physical Security
- HSM High Availability Design
- Datacenter Power Standards
- SafeScoring Criteria S-HSM-002 v1.0"""),

    7550: ("S-HSM-003", """## 1. Vue d'ensemble

La norme S-HSM-003 definit les exigences de composants hot-swappable pour les HSMs enterprise. Cette capacite permet le remplacement de composants (PSU, ventilateurs, disques) sans interruption de service.

Essential pour les SLAs de haute disponibilite.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| PSU hot-swap | Requis | Alimentation |
| Fan hot-swap | Recommande | Refroidissement |
| Disk hot-swap | Si applicable | Storage |
| Network cards | Hot-plug | Connectivite |
| Detection | Automatique | Management |
| Alert | Pre-failure warning | Monitoring |
| MTTR | <15 minutes | Objectif |
| Spare parts | On-site recommande | Support |

## 3. Application aux Produits Crypto

### HSMs
- **Thales Luna Network**: Full hot-swap
- **nCipher Connect**: Hot-swap support
- **AWS CloudHSM**: Managed (abstrait)

### Hardware Wallets
- Non applicable

### CEX
- HSMs enterprise hot-swap

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | All components hot-swap | 100% |
| **Conforme partiel** | PSU seulement hot-swap | 50-80% |
| **Non-conforme** | Pas de hot-swap | 0-30% |

SLA: 99.99%+ uptime avec hot-swap.

## 5. Sources et References

- FIPS 140-2 Level 3 Operations
- HSM Maintenance Procedures
- High Availability Architecture
- SafeScoring Criteria S-HSM-003 v1.0""")
}

if __name__ == "__main__":
    print("Saving Security summaries (batch 1)...")
    success = 0
    for norm_id, (code, summary) in SUMMARIES.items():
        ok = save_summary(norm_id, code, summary)
        status = "OK" if ok else "FAIL"
        print(f"  {code}: {status}")
        if ok:
            success += 1
    print(f"\nResult: {success}/{len(SUMMARIES)} saved")
