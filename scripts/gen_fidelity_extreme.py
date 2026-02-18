#!/usr/bin/env python3
"""Generate summaries for Fidelity extreme environment norms (F81-F110)."""

import requests
import time
import sys
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    3968: """## 1. Vue d'ensemble

Le critère **Nuclear Hardening** (F81) évalue la résistance aux effets des radiations nucléaires et impulsions électromagnétiques (EMP).

**Importance pour la sécurité crypto** : Les dispositifs crypto utilisés dans des contextes de haute sécurité (bunkers, installations critiques) doivent résister aux EMP et radiations.

## 2. Spécifications Techniques

| Standard | Paramètre | Valeur |
|----------|-----------|--------|
| MIL-STD-461G | RS105 | EMP haute altitude |
| MIL-STD-883 | Method 1019 | Dose totale ionisante |
| JEDEC JESD89A | SEU | Single Event Upset |
| IEC 61000-2-9 | HEMP | 50 kV/m E-field |

**Niveaux de radiation** :
- Total Ionizing Dose (TID) : >100 krad(Si) pour grade espace
- Single Event Latchup (SEL) : Immune jusqu'à 75 MeV·cm²/mg
- EMP : Protection cage Faraday + surge protection

**Techniques de hardening** :
- Blindage métallique (mu-metal)
- Composants radiation-hardened
- Triple modular redundancy (TMR)

## 3. Application aux Produits Crypto

| Type de Produit | Nuclear Hardening |
|-----------------|------------------|
| Hardware Wallets | Non standard |
| Military Crypto | MIL-STD-461G requis |
| Satellite Wallets | Space-grade components |
| Bunker Storage | EMP protection |
| Critical Infrastructure | Faraday cage storage |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Pas de protection spéciale |
| Intermédiaire | 56-70 | Surge protection basique |
| Avancé | 71-85 | EMP bag/cage stockage |
| Expert | 86-100 | Rad-hard components |

## 5. Sources et Références

- [MIL-STD-461G](https://quicksearch.dla.mil/Transient/A0636F6B2A4548EBA99B0CFEA6D4E7A8.pdf)
- [JEDEC JESD89A](https://www.jedec.org/standards-documents/docs/jesd-89a)""",

    3969: """## 1. Vue d'ensemble

Le critère **Space Qualification** (F82) évalue la certification pour utilisation dans l'environnement spatial.

**Importance pour la sécurité crypto** : Les applications satellite et spatiales nécessitent des composants qualifiés pour le vide, les radiations et les températures extrêmes.

## 2. Spécifications Techniques

| Standard | Application | Paramètres |
|----------|-------------|------------|
| ECSS-Q-ST-60C | ESA | Qualification EEE parts |
| MIL-PRF-38535 | US DoD | QML space grade |
| NASA-STD-8739.4 | NASA | Workmanship |
| GSFC-STD-7000 | NASA | GEVS testing |

**Environnement spatial** :
- Vide : <10⁻⁶ Torr
- Température : -150°C à +150°C
- Radiation : 10-100 krad/an LEO
- Vibration : 10-2000 Hz launch
- Outgassing : <1% TML, <0.1% CVCM

**Classes de qualification** :
- Class S : Flight critical
- Class B : Standard flight
- Class K : Commercial enhanced

## 3. Application aux Produits Crypto

| Type de Produit | Space Qualification |
|-----------------|---------------------|
| Hardware Wallets | Non standard |
| Satellite Crypto | ECSS/MIL-PRF required |
| Space Blockchain | Research phase |
| Ground Backup | Standard commercial |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Commercial grade |
| Intermédiaire | 56-70 | Extended temp range |
| Avancé | 71-85 | Class K commercial |
| Expert | 86-100 | Class S flight |

## 5. Sources et Références

- [ECSS-Q-ST-60C](https://ecss.nl/standard/ecss-q-st-60c-rev-2-electrical-electronic-and-electromechanical-eee-components/)
- [NASA-STD-8739.4](https://standards.nasa.gov/standard/NASA/NASA-STD-87394)""",

    3970: """## 1. Vue d'ensemble

Le critère **Cryogenic -196°C** (F83) évalue la résistance aux températures cryogéniques de l'azote liquide.

**Importance pour la sécurité crypto** : Le stockage cryogénique offre une protection extrême contre les attaques physiques et une préservation à très long terme.

## 2. Spécifications Techniques

| Niveau | Température | Application |
|--------|-------------|-------------|
| Standard | -20°C à +50°C | Usage normal |
| Industrial | -40°C à +85°C | Environnements difficiles |
| Military | -55°C à +125°C | MIL-STD |
| Cryogenic | -196°C (LN2) | Archivage extrême |
| Deep Cryo | -269°C (LHe) | Recherche |

**Effets du froid extrême** :
- Fragilisation métaux (ductile-brittle transition)
- Contraction thermique différentielle
- Batteries : inopérantes <-40°C
- LCD : temps de réponse infini

**Matériaux cryo-compatibles** :
- Acier inoxydable 316L
- Aluminium 6061-T6
- PTFE (Teflon)
- Saphir

## 3. Application aux Produits Crypto

| Type de Produit | Cryogenic Resistance |
|-----------------|---------------------|
| Hardware Wallets | Généralement non testé |
| Metal Backups | Acier inox cryo-safe |
| Paper Backups | Papier archival cryo-safe |
| USB Storage | Non recommandé |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | -20°C standard |
| Intermédiaire | 56-70 | -40°C industrial |
| Avancé | 71-85 | -55°C military |
| Expert | 86-100 | -196°C cryogenic |

## 5. Sources et Références

- [NIST Cryogenic Materials Data](https://trc.nist.gov/cryogenics/)
- [MIL-STD-810H Low Temperature](https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=36026)""",

    3971: """## 1. Vue d'ensemble

Le critère **Solar Radiation** (F84) évalue la résistance aux radiations solaires pour les applications extérieures et spatiales.

**Importance pour la sécurité crypto** : Les dispositifs exposés au soleil intense ou utilisés en altitude/espace subissent des radiations UV et particules solaires.

## 2. Spécifications Techniques

| Type radiation | Énergie | Protection |
|----------------|---------|------------|
| UV-A (315-400nm) | 3.1-3.9 eV | UV coating |
| UV-B (280-315nm) | 3.9-4.4 eV | UV filter |
| UV-C (<280nm) | >4.4 eV | Atmosphère (sol) |
| Protons solaires | MeV-GeV | Blindage masse |
| Électrons | keV-MeV | Blindage Al |

**Standards de test** :
- ISO 4892-2 : Xenon arc weathering
- ASTM G154 : UV fluorescent exposure
- MIL-STD-810H : Solar radiation (Method 505)

**Intensité solaire** :
- Sol (AM1.5) : 1000 W/m²
- LEO : 1361 W/m² (constante solaire)
- Mercure : 9000 W/m²

## 3. Application aux Produits Crypto

| Type de Produit | Solar Radiation |
|-----------------|-----------------|
| Hardware Wallets | UV degradation écran |
| Metal Backups | Résistant (métal) |
| Mobile Wallets | Écran lisibilité |
| Outdoor Nodes | Boîtier UV-resistant |
| Satellite Crypto | Blindage radiation |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Indoor use only |
| Intermédiaire | 56-70 | UV coating écran |
| Avancé | 71-85 | ISO 4892-2 testé |
| Expert | 86-100 | Space-grade |

## 5. Sources et Références

- [ISO 4892-2:2013](https://www.iso.org/standard/55945.html)
- [MIL-STD-810H Method 505](https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=36026)""",

    3972: """## 1. Vue d'ensemble

Le critère **Vacuum Exposure** (F85) évalue la résistance au vide pour les applications spatiales et de haute altitude.

**Importance pour la sécurité crypto** : Les dispositifs crypto pour satellites ou haute altitude doivent fonctionner dans le vide sans outgassing ni défaillance.

## 2. Spécifications Techniques

| Altitude | Pression | Application |
|----------|----------|-------------|
| Niveau mer | 101.3 kPa | Standard |
| Avion (12km) | 20 kPa | Vol commercial |
| Armstrong (19km) | 6.3 kPa | Limite physiologique |
| LEO (400km) | 10⁻⁹ Pa | Station spatiale |
| Deep space | 10⁻¹⁴ Pa | Interplanétaire |

**Standards de test** :
- ASTM E595 : Outgassing
- ECSS-Q-ST-70-02C : Thermal vacuum
- MIL-STD-810H : Low pressure (Method 500)

**Critères outgassing** :
- TML (Total Mass Loss) : <1.0%
- CVCM (Collected Volatile Condensable Material) : <0.1%

## 3. Application aux Produits Crypto

| Type de Produit | Vacuum Compatibility |
|-----------------|---------------------|
| Hardware Wallets | Non testé standard |
| Satellite Keys | ECSS qualification |
| Metal Backups | Excellent (pas outgas) |
| Plastic Components | Outgassing possible |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Atmospheric only |
| Intermédiaire | 56-70 | 20kPa altitude |
| Avancé | 71-85 | ASTM E595 pass |
| Expert | 86-100 | ECSS space qualified |

## 5. Sources et Références

- [ASTM E595](https://www.astm.org/e0595-15r21.html)
- [NASA Outgassing Database](https://outgassing.nasa.gov/)""",

    3973: """## 1. Vue d'ensemble

Le critère **Biological Resistance** (F86) évalue la résistance aux agents biologiques (moisissures, bactéries, champignons).

**Importance pour la sécurité crypto** : Le stockage long terme dans des environnements humides nécessite une protection contre la dégradation biologique.

## 2. Spécifications Techniques

| Agent | Conditions | Protection |
|-------|------------|------------|
| Moisissures | >70% HR, 25-35°C | Antifongique |
| Bactéries | Nutriments, humidité | Antibactérien |
| Algues | Lumière, eau | Pas de lumière |
| Rongeurs | Accessible | Boîtier métal |

**Standards de test** :
- ASTM G21 : Fungal growth resistance
- MIL-STD-810H : Fungus (Method 508)
- ISO 846 : Plastics - fungal attack

**Matériaux résistants** :
- Métaux : Naturellement résistants
- Plastiques : Additifs antifongiques
- Papier : Encapsulation requise
- Électronique : Conformal coating

## 3. Application aux Produits Crypto

| Type de Produit | Biological Resistance |
|-----------------|----------------------|
| Hardware Wallets | Plastique/métal OK |
| Metal Backups | Excellent |
| Paper Backups | Vulnerable sans protection |
| USB Drives | Connecteur peut corroder |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Matériaux standards |
| Intermédiaire | 56-70 | Conformal coating |
| Avancé | 71-85 | ASTM G21 testé |
| Expert | 86-100 | MIL-STD-810H Method 508 |

## 5. Sources et Références

- [ASTM G21](https://www.astm.org/g0021-21.html)
- [MIL-STD-810H Method 508](https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=36026)""",

    3974: """## 1. Vue d'ensemble

Le critère **Insect/Rodent Proof** (F87) évalue la protection contre les nuisibles pour le stockage sécurisé.

**Importance pour la sécurité crypto** : Les backups et hardware wallets stockés long terme doivent être protégés contre les rongeurs et insectes.

## 2. Spécifications Techniques

| Nuisible | Risque | Protection |
|----------|--------|------------|
| Souris | Ronge plastique, câbles | Boîtier métal |
| Rats | Force mâchoire 500N | Acier >0.8mm |
| Termites | Mange cellulose | Pas de bois/papier |
| Cafards | Attirés électronique | Joints étanches |

**Standards** :
- UL 2050 : Rodent-resistant enclosures
- NEMA 4X : Protection environnementale
- IP68 : Étanchéité totale

**Caractéristiques anti-nuisibles** :
- Pas d'ouvertures >6mm (souris)
- Matériaux non-comestibles
- Pas d'attractifs (colle, plastique doux)
- Joints non-organiques

## 3. Application aux Produits Crypto

| Type de Produit | Pest Resistance |
|-----------------|-----------------|
| Hardware Wallets | Plastique = vulnérable |
| Metal Backups | Excellent |
| Paper Backups | Très vulnérable |
| Safe Storage | Coffre acier requis |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Plastique standard |
| Intermédiaire | 56-70 | Boîtier métal |
| Avancé | 71-85 | IP67+ étanche |
| Expert | 86-100 | UL 2050 certified |

## 5. Sources et Références

- [UL 2050 Standard](https://standardscatalog.ul.com/standards/en/standard_2050_2)
- [NEMA Enclosure Types](https://www.nema.org/standards/view/Enclosures-for-Electrical-Equipment-1000-Volts-Maximum)""",

    3975: """## 1. Vue d'ensemble

Le critère **Condensation Resistance** (F88) évalue la résistance aux dommages causés par la condensation.

**Importance pour la sécurité crypto** : Les changements de température causent de la condensation qui peut endommager l'électronique et corroder les contacts.

## 2. Spécifications Techniques

| Condition | Risque | Mitigation |
|-----------|--------|------------|
| Point de rosée | Condensation | Dessicant |
| Cycle thermique | Water pooling | Drainage |
| Humidité >95% | Saturation | Joints étanches |
| Δ Température | Choc thermique | Acclimatation |

**Standards de test** :
- MIL-STD-810H : Humidity (Method 507)
- IEC 60068-2-30 : Damp heat cyclic
- IEC 60529 : IP rating condensation

**Protection** :
- Conformal coating : Parylene, silicone
- Dessicant packs : Silica gel, montmorillonite
- Heated enclosure : Anti-condensation
- Hydrophobic nano-coating

## 3. Application aux Produits Crypto

| Type de Produit | Condensation Protection |
|-----------------|------------------------|
| Hardware Wallets | Conformal coating variable |
| Metal Backups | Peut condenser mais résiste |
| Paper Backups | Très vulnérable |
| Cold Storage | Acclimatation requise |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Pas de protection |
| Intermédiaire | 56-70 | IP54 splash |
| Avancé | 71-85 | Conformal coating |
| Expert | 86-100 | MIL-STD-810H Method 507 |

## 5. Sources et Références

- [MIL-STD-810H Method 507](https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=36026)
- [IEC 60068-2-30](https://webstore.iec.ch/publication/502)""",

    3976: """## 1. Vue d'ensemble

Le critère **Ballistic Resistance** (F89) évalue la résistance aux projectiles pour les solutions de stockage haute sécurité.

**Importance pour la sécurité crypto** : Les coffres-forts crypto haute valeur peuvent nécessiter une protection balistique contre les attaques armées.

## 2. Spécifications Techniques

| Niveau NIJ | Menace | Calibre |
|------------|--------|---------|
| Level I | Faible | .22 LR, .380 ACP |
| Level IIA | Léger | 9mm, .40 S&W |
| Level II | Moyen | 9mm, .357 Mag |
| Level IIIA | Élevé | .44 Mag, 9mm SMG |
| Level III | Fusil | 7.62x51mm NATO |
| Level IV | AP | .30-06 AP |

**Standards** :
- NIJ 0101.07 : Body armor
- UL 752 : Bullet-resisting equipment
- EN 1063 : Glass in building

**Matériaux balistiques** :
- Acier AR500 : 6mm+ pour Level III
- Céramique : Al₂O₃, B₄C pour Level IV
- UHMWPE : Dyneema, Spectra

## 3. Application aux Produits Crypto

| Type de Produit | Ballistic Protection |
|-----------------|---------------------|
| Hardware Wallets | Non (trop petit) |
| Crypto Safes | UL 752 Level 3-5 |
| Vault Storage | UL 752 Level 8+ |
| Bunker | NIJ Level IV walls |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Pas de protection |
| Intermédiaire | 56-70 | UL 752 Level 1 |
| Avancé | 71-85 | UL 752 Level 3-5 |
| Expert | 86-100 | UL 752 Level 8+ |

## 5. Sources et Références

- [NIJ 0101.07](https://nij.ojp.gov/library/publications/ballistic-resistance-body-armor-nij-standard-010107)
- [UL 752 Standard](https://standardscatalog.ul.com/standards/en/standard_752)""",

    3977: """## 1. Vue d'ensemble

Le critère **Explosion Proof** (F90) évalue la certification pour environnements explosifs (ATEX/IECEx).

**Importance pour la sécurité crypto** : Les dispositifs crypto utilisés dans les industries pétrolières, minières ou chimiques doivent être certifiés ATEX.

## 2. Spécifications Techniques

| Zone | Atmosphère | Fréquence |
|------|------------|-----------|
| Zone 0 | Explosive continue | Permanent |
| Zone 1 | Explosive probable | Fréquent |
| Zone 2 | Explosive rare | Accidentel |
| Zone 20 | Poussière continue | Permanent |
| Zone 21 | Poussière probable | Fréquent |
| Zone 22 | Poussière rare | Accidentel |

**Standards** :
- ATEX 2014/34/EU : Directive européenne
- IECEx : Certification internationale
- NEC/CEC : Amérique du Nord

**Méthodes de protection** :
- Ex d : Enveloppe antidéflagrante
- Ex e : Sécurité augmentée
- Ex i : Sécurité intrinsèque
- Ex p : Surpression interne

## 3. Application aux Produits Crypto

| Type de Produit | ATEX Certification |
|-----------------|-------------------|
| Hardware Wallets | Non certifié standard |
| Industrial Crypto | Ex i possible |
| Mining Operations | Zone 2 minimum |
| Oil/Gas Crypto | ATEX requis |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Non ATEX |
| Intermédiaire | 56-70 | Zone 2/22 |
| Avancé | 71-85 | Zone 1/21 |
| Expert | 86-100 | Zone 0/20 |

## 5. Sources et Références

- [ATEX Directive 2014/34/EU](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014L0034)
- [IECEx System](https://www.iecex.com/)""",

    3978: """## 1. Vue d'ensemble

Le critère **Fatigue Testing** (F91) évalue la résistance à la fatigue mécanique sur cycles répétés.

**Importance pour la sécurité crypto** : Les boutons, connecteurs USB et charnières subissent des milliers de cycles d'utilisation au cours de la vie du produit.

## 2. Spécifications Techniques

| Composant | Cycles minimum | Standard |
|-----------|----------------|----------|
| Boutons | 100,000 | IEC 61058 |
| USB-C | 10,000 | USB-IF |
| Écran tactile | 1,000,000 touches | - |
| Charnières | 20,000 | - |
| Batterie | 500 charge cycles | IEC 62133 |

**Standards de test** :
- ASTM E466 : Fatigue testing metals
- IEC 61058-1 : Switches
- USB-IF : Connector durability

**Courbe S-N** :
- Stress vs Number of cycles
- Endurance limit : stress below which no fatigue failure
- Steel : ~10⁶ cycles for endurance limit

## 3. Application aux Produits Crypto

| Type de Produit | Fatigue Critical Components |
|-----------------|---------------------------|
| Hardware Wallets | Boutons, USB, écran |
| Mobile Wallets | Écran tactile, batterie |
| Backup Devices | Connecteurs |
| Security Keys | Bouton, USB |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Non testé |
| Intermédiaire | 56-70 | 10K cycles USB |
| Avancé | 71-85 | 100K cycles boutons |
| Expert | 86-100 | HALT testé |

## 5. Sources et Références

- [ASTM E466](https://www.astm.org/e0466-21.html)
- [USB-IF Compliance](https://www.usb.org/compliance)""",

    3979: """## 1. Vue d'ensemble

Le critère **Creep Resistance** (F92) évalue la résistance à la déformation lente sous charge constante (fluage).

**Importance pour la sécurité crypto** : Les boîtiers et composants sous tension mécanique peuvent se déformer au fil du temps, compromettant l'étanchéité.

## 2. Spécifications Techniques

| Matériau | Température fluage | Résistance |
|----------|-------------------|------------|
| Aluminium | >150°C | Faible |
| Acier | >400°C | Bonne |
| Titane | >300°C | Excellente |
| PEEK | >150°C | Bonne (plastiques) |
| ABS | >50°C | Faible |

**Standards** :
- ASTM E139 : Creep testing
- ISO 899 : Plastics creep
- ASTM D2990 : Tensile creep plastics

**Facteurs de fluage** :
- Température : Principal facteur
- Contrainte : Proportionnel
- Temps : Logarithmique
- Microstructure : Taille grain

## 3. Application aux Produits Crypto

| Type de Produit | Creep Concerns |
|-----------------|----------------|
| Hardware Wallets | Boîtier plastique sous clip |
| Metal Backups | Négligeable |
| Safes | Joints, charnières |
| Mobile Devices | Batterie gonflée |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | ABS standard |
| Intermédiaire | 56-70 | Polycarbonate |
| Avancé | 71-85 | PEEK/métal |
| Expert | 86-100 | ISO 899 testé |

## 5. Sources et Références

- [ASTM E139](https://www.astm.org/e0139-11r18.html)
- [ISO 899-1:2017](https://www.iso.org/standard/65108.html)""",

    3980: """## 1. Vue d'ensemble

Le critère **Tensile Strength Test** (F93) évalue la résistance à la traction des matériaux et composants.

**Importance pour la sécurité crypto** : La résistance à la traction détermine si un câble, boîtier ou backup métallique résiste aux forces d'arrachement.

## 2. Spécifications Techniques

| Matériau | Résistance traction | Élongation |
|----------|---------------------|------------|
| Acier 304 | 515 MPa | 40% |
| Titane Grade 5 | 950 MPa | 14% |
| Aluminium 6061 | 310 MPa | 12% |
| Cuivre | 220 MPa | 45% |
| ABS | 40 MPa | 10% |

**Standards** :
- ASTM E8/E8M : Metals tensile test
- ISO 527 : Plastics tensile
- ASTM D638 : Plastics tensile properties

**Propriétés mesurées** :
- Ultimate Tensile Strength (UTS)
- Yield Strength (0.2% offset)
- Elongation at break
- Modulus of elasticity

## 3. Application aux Produits Crypto

| Type de Produit | Tensile Relevance |
|-----------------|-------------------|
| Hardware Wallets | Câble USB, lanyard |
| Metal Backups | Résistance plaque |
| Security Cables | Force arrachement |
| Safe Anchoring | Câbles fixation |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Plastique standard |
| Intermédiaire | 56-70 | Aluminium |
| Avancé | 71-85 | Acier inox |
| Expert | 86-100 | Titane/ASTM tested |

## 5. Sources et Références

- [ASTM E8/E8M](https://www.astm.org/e0008_e0008m-22.html)
- [ISO 527-1:2019](https://www.iso.org/standard/75824.html)""",

    3981: """## 1. Vue d'ensemble

Le critère **Hardness Rockwell C** (F94) évalue la dureté des métaux utilisés selon l'échelle Rockwell C.

**Importance pour la sécurité crypto** : La dureté détermine la résistance aux rayures, perçage et attaques mécaniques sur les boîtiers et backups métalliques.

## 2. Spécifications Techniques

| Matériau | Dureté HRC | Application |
|----------|------------|-------------|
| Acier doux | 10-20 | Boîtiers standard |
| Acier trempé | 40-50 | Coffres |
| Acier outil | 55-65 | Outils perçage |
| Carbure tungstène | 65-70 | Pointes forage |
| AR500 | 50-55 | Plaques balistiques |

**Standards** :
- ASTM E18 : Rockwell hardness
- ISO 6508 : Metallic materials Rockwell
- HRC : Indenteur cône diamant, 150 kgf

**Relation dureté-sécurité** :
- <30 HRC : Facile à percer
- 30-45 HRC : Résistant outils standard
- >45 HRC : Requiert outils spéciaux
- >55 HRC : Anti-drill

## 3. Application aux Produits Crypto

| Type de Produit | Hardness Requirement |
|-----------------|---------------------|
| Hardware Wallets | Non critique (plastique) |
| Metal Backups | 30-40 HRC optimal |
| Safe Doors | >50 HRC anti-drill |
| Lock Mechanisms | 55+ HRC |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Plastique ou <20 HRC |
| Intermédiaire | 56-70 | 20-35 HRC |
| Avancé | 71-85 | 35-50 HRC |
| Expert | 86-100 | >50 HRC anti-drill |

## 5. Sources et Références

- [ASTM E18](https://www.astm.org/e0018-22.html)
- [ISO 6508-1:2016](https://www.iso.org/standard/59684.html)""",

    3984: """## 1. Vue d'ensemble

Le critère **ISTA 3A Packaging** (F97) évalue la conformité aux standards d'emballage ISTA pour le transport.

**Importance pour la sécurité crypto** : Un emballage certifié ISTA garantit que le hardware wallet arrive intact et non compromis.

## 2. Spécifications Techniques

| Test ISTA 3A | Description | Sévérité |
|--------------|-------------|----------|
| Drop test | 10 drops, angles variés | Élevée |
| Vibration | Random 0.5 PSD, 60 min | Moyenne |
| Compression | 300 kg, 72 heures | Élevée |
| Atmosphérique | -18°C à +40°C | Moyenne |

**Séquence ISTA 3A** :
1. Conditionnement atmosphérique
2. Compression
3. Vibration aléatoire
4. Chocs/drops
5. Inspection finale

**Niveaux ISTA** :
- ISTA 1A : Basic (moins de 150 lbs)
- ISTA 2A : Enhanced
- ISTA 3A : General simulation
- ISTA 3E : e-Commerce focused

## 3. Application aux Produits Crypto

| Type de Produit | ISTA Relevance |
|-----------------|----------------|
| Hardware Wallets | ISTA 3A recommandé |
| Metal Backups | Packaging critique |
| Security Keys | ISTA 1A minimum |
| Accessories | Standard packaging |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Packaging standard |
| Intermédiaire | 56-70 | Drop tested |
| Avancé | 71-85 | ISTA 2A certified |
| Expert | 86-100 | ISTA 3A certified |

## 5. Sources et Références

- [ISTA 3A Procedure](https://ista.org/test_procedures.php)
- [ISTA Testing Labs](https://ista.org/certified_labs.php)""",

    3986: """## 1. Vue d'ensemble

Le critère **Air Transport Safe** (F99) évalue la conformité aux réglementations de transport aérien.

**Importance pour la sécurité crypto** : Les hardware wallets contiennent des batteries lithium soumises à des règles strictes pour le transport aérien.

## 2. Spécifications Techniques

| Réglementation | Organisme | Application |
|----------------|-----------|-------------|
| UN 3481 | ONU | Lithium-ion avec équipement |
| UN 3091 | ONU | Lithium métal avec équipement |
| IATA DGR | IATA | Transport aérien |
| 49 CFR 173 | US DOT | Transport USA |

**Limites batteries lithium-ion** :
- Passager : ≤100 Wh (bagages cabine)
- Fret : ≤100 Wh individual, ≤2 per package
- Cargo only : >100 Wh, ≤160 Wh avec approval

**Exigences emballage** :
- Protection court-circuit
- Emballage robuste
- Marquage UN 3481
- Document expédition

## 3. Application aux Produits Crypto

| Type de Produit | Air Transport |
|-----------------|---------------|
| Hardware Wallets | <20 Wh = OK cabine |
| Backup Devices | Sans batterie = OK |
| Mobile avec wallet | <100 Wh = OK cabine |
| Mining Equipment | Restrictions cargo |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Batterie >100 Wh |
| Intermédiaire | 56-70 | Batterie <100 Wh |
| Avancé | 71-85 | <20 Wh + UN marking |
| Expert | 86-100 | Sans batterie |

## 5. Sources et Références

- [IATA Dangerous Goods Regulations](https://www.iata.org/dgr)
- [UN 3481 Specifications](https://unece.org/transport/dangerous-goods)""",

    3987: """## 1. Vue d'ensemble

Le critère **Maritime Transport** (F100) évalue la conformité aux réglementations de transport maritime.

**Importance pour la sécurité crypto** : Le transport maritime expose à l'humidité, sel et vibrations prolongées nécessitant une protection spécifique.

## 2. Spécifications Techniques

| Réglementation | Application | Organisme |
|----------------|-------------|-----------|
| IMDG Code | Marchandises dangereuses | IMO |
| SOLAS | Safety of Life at Sea | IMO |
| ISO 668 | Containers | ISO |
| MIL-STD-810H | Method 509 Salt fog | DoD |

**Conditions maritimes** :
- Humidité : 80-100% HR
- Sel : Brouillard salin
- Vibration : 2-200 Hz, voyage
- Température : -20°C à +60°C container

**Protection requise** :
- VCI (Vapor Corrosion Inhibitor)
- Dessicants
- Emballage étanche
- Conteneur climatisé (option)

## 3. Application aux Produits Crypto

| Type de Produit | Maritime Transport |
|-----------------|-------------------|
| Hardware Wallets | VCI packaging |
| Metal Backups | Résiste bien |
| Bulk Shipments | Container climatisé |
| Paper Backups | Étanchéité critique |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Standard packaging |
| Intermédiaire | 56-70 | Moisture barrier |
| Avancé | 71-85 | VCI + dessicant |
| Expert | 86-100 | MIL-STD-810H salt fog |

## 5. Sources et Références

- [IMDG Code](https://www.imo.org/en/publications/Pages/IMDG%20Code.aspx)
- [ISO 668:2020](https://www.iso.org/standard/76912.html)""",

    3988: """## 1. Vue d'ensemble

Le critère **Shock Recorder** (F101) évalue l'inclusion d'indicateurs de chocs pour détecter les manipulations durant le transport.

**Importance pour la sécurité crypto** : Les enregistreurs de chocs révèlent si un colis a été mal manipulé ou potentiellement ouvert et refermé.

## 2. Spécifications Techniques

| Type indicateur | Seuil | Réutilisable |
|-----------------|-------|--------------|
| ShockWatch | 5-100g | Non |
| SpotSee | 25-100g | Non |
| Drop-N-Tell | 15-50g | Non |
| Électronique | 1-200g | Oui |

**Enregistreurs électroniques** :
- MSR DataLogger : ±200g, 3 axes
- Lansmont Saver : 100g, 1000 événements
- SpotBot : Cloud-connected

**Informations enregistrées** :
- Magnitude du choc (g)
- Direction (3 axes)
- Timestamp
- Température (certains)
- Humidité (certains)

## 3. Application aux Produits Crypto

| Type de Produit | Shock Recording |
|-----------------|-----------------|
| Hardware Wallets | Indicateur adhésif |
| High-value Shipments | DataLogger |
| Bulk Orders | Random sampling |
| Institutional | Mandatory logging |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Aucun indicateur |
| Intermédiaire | 56-70 | ShockWatch simple |
| Avancé | 71-85 | Multi-indicateurs |
| Expert | 86-100 | DataLogger électronique |

## 5. Sources et Références

- [SpotSee ShockWatch](https://www.spotsee.io/indicators/shockwatch)
- [Lansmont Testing](https://www.lansmont.com/)""",

    3989: """## 1. Vue d'ensemble

Le critère **Temperature Logger** (F102) évalue l'inclusion d'enregistreurs de température pour le transport.

**Importance pour la sécurité crypto** : Les températures extrêmes peuvent endommager les batteries lithium et composants électroniques des hardware wallets.

## 2. Spécifications Techniques

| Type logger | Plage | Précision | Autonomie |
|-------------|-------|-----------|-----------|
| USB logger | -40 à +85°C | ±0.5°C | 2 ans |
| Indicateurs | Seuils fixes | N/A | Usage unique |
| BLE logger | -30 à +70°C | ±0.3°C | 6 mois |
| NFC logger | -40 à +85°C | ±0.5°C | 1 an |

**Seuils critiques** :
- Batterie Li-ion : -20°C à +60°C
- LCD : -30°C à +70°C
- Électronique : -40°C à +85°C (industrial)

**Standards** :
- FDA 21 CFR Part 11 (pharma)
- GDP (Good Distribution Practice)
- EN 12830 (food cold chain)

## 3. Application aux Produits Crypto

| Type de Produit | Temp Logging |
|-----------------|--------------|
| Hardware Wallets | Indicateur seuil |
| Batteries spare | USB logger |
| Institutional | Continuous logging |
| Cold storage | Monitoring permanent |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Aucun logging |
| Intermédiaire | 56-70 | Indicateur min/max |
| Avancé | 71-85 | USB logger |
| Expert | 86-100 | Real-time BLE/NFC |

## 5. Sources et Références

- [Onset HOBO Loggers](https://www.onsetcomp.com/)
- [Testo Temperature Monitoring](https://www.testo.com/)""",

    3991: """## 1. Vue d'ensemble

Le critère **Tungsten Alloy** (F104) évalue l'utilisation d'alliages de tungstène pour la protection et la durabilité.

**Importance pour la sécurité crypto** : Le tungstène offre une densité et dureté exceptionnelles pour les boîtiers de protection haute sécurité.

## 2. Spécifications Techniques

| Propriété | Tungstène | Acier | Titane |
|-----------|-----------|-------|--------|
| Densité | 19.3 g/cm³ | 7.9 g/cm³ | 4.5 g/cm³ |
| Point fusion | 3422°C | 1538°C | 1668°C |
| Dureté (HV) | 350-450 | 150-300 | 250-350 |
| Module Young | 411 GPa | 200 GPa | 116 GPa |

**Alliages tungstène courants** :
- W-Ni-Fe : 90-97% W, usinable
- W-Ni-Cu : Non magnétique
- WC (carbure) : Outils, >1600 HV

**Applications sécurité** :
- Blindage radiations (X-ray, gamma)
- Anti-perçage (dureté extrême)
- Poids dissuasif (densité)

## 3. Application aux Produits Crypto

| Type de Produit | Tungsten Application |
|-----------------|---------------------|
| Hardware Wallets | Non (trop lourd/cher) |
| Ultra-secure Vaults | Couche blindage |
| Metal Backups | Possible mais rare |
| Tamper-proof | Insert anti-drill |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Acier standard |
| Intermédiaire | 56-70 | Acier trempé |
| Avancé | 71-85 | Titane |
| Expert | 86-100 | Tungstène/WC inserts |

## 5. Sources et Références

- [ASTM B777 - Tungsten Alloys](https://www.astm.org/b0777-15.html)
- [Tungsten Properties (MatWeb)](https://www.matweb.com/)""",

    3992: """## 1. Vue d'ensemble

Le critère **Inconel 625** (F105) évalue l'utilisation de superalliage Inconel 625 pour résistance extrême.

**Importance pour la sécurité crypto** : L'Inconel 625 offre une résistance exceptionnelle à la corrosion et aux hautes températures pour les applications critiques.

## 2. Spécifications Techniques

| Propriété | Inconel 625 | Acier 316L |
|-----------|-------------|------------|
| Composition | Ni-Cr-Mo-Nb | Fe-Cr-Ni |
| Résist. traction | 827 MPa | 515 MPa |
| Limite élastique | 414 MPa | 205 MPa |
| Temp. max | 980°C | 870°C |
| Corrosion | Excellente | Bonne |

**Résistance corrosion** :
- Eau de mer : Excellente
- Acides : Excellente (HCl, H₂SO₄)
- Stress corrosion : Immune
- Pitting : PREN >50

**Standards** :
- ASTM B443 : Plate/sheet
- ASTM B446 : Rod/bar
- AMS 5666 : Aerospace

## 3. Application aux Produits Crypto

| Type de Produit | Inconel 625 Use |
|-----------------|-----------------|
| Hardware Wallets | Non (surqualifié) |
| Marine Storage | Excellent |
| Long-term Vaults | Corrosion-proof |
| Extreme Environments | Recommandé |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Acier carbone |
| Intermédiaire | 56-70 | Acier 316L |
| Avancé | 71-85 | Titane Grade 5 |
| Expert | 86-100 | Inconel 625/Hastelloy |

## 5. Sources et Références

- [ASTM B443](https://www.astm.org/b0443-19.html)
- [Special Metals Inconel 625](https://www.specialmetals.com/documents/technical-bulletins/inconel/inconel-alloy-625.pdf)""",

    3993: """## 1. Vue d'ensemble

Le critère **Hastelloy C-276** (F106) évalue l'utilisation de superalliage Hastelloy pour résistance chimique extrême.

**Importance pour la sécurité crypto** : Hastelloy C-276 offre la meilleure résistance à la corrosion chimique pour stockage en environnements hostiles.

## 2. Spécifications Techniques

| Propriété | Hastelloy C-276 | Inconel 625 |
|-----------|-----------------|-------------|
| Composition | Ni-Mo-Cr-W | Ni-Cr-Mo-Nb |
| Résist. traction | 785 MPa | 827 MPa |
| PREN | >69 | >50 |
| Pitting temp. | >150°C | >85°C |
| Coût relatif | 1.3x | 1x |

**Résistance chimique** :
- HCl concentré : Excellent
- H₂SO₄ : Excellent
- Oxydants + réducteurs : Unique
- Chlorures chauds : Excellent

**Standards** :
- ASTM B574 : Rod/bar
- ASTM B575 : Plate/sheet
- UNS N10276

## 3. Application aux Produits Crypto

| Type de Produit | Hastelloy Use |
|-----------------|---------------|
| Hardware Wallets | Non (surqualifié) |
| Chemical Plant Storage | Requis |
| Geothermal/Mining | Recommandé |
| Ultimate Long-term | Option premium |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Plastique/Al |
| Intermédiaire | 56-70 | Acier inox |
| Avancé | 71-85 | Inconel |
| Expert | 86-100 | Hastelloy C-276 |

## 5. Sources et Références

- [ASTM B575](https://www.astm.org/b0575-18.html)
- [Haynes International C-276](https://www.haynesintl.com/alloys/alloy-portfolio_/Corrosion-resistant-Alloys/HASTELLOY-C-276-alloy)""",

    3994: """## 1. Vue d'ensemble

Le critère **Graphene Coating** (F107) évalue l'utilisation de revêtements au graphène pour protection avancée.

**Importance pour la sécurité crypto** : Les revêtements graphène offrent une protection anti-corrosion, conductivité thermique et résistance mécanique exceptionnelles.

## 2. Spécifications Techniques

| Propriété | Graphène | Valeur |
|-----------|----------|--------|
| Épaisseur | Monocouche | 0.335 nm |
| Résist. traction | Théorique | 130 GPa |
| Conductivité therm. | Plan | 5000 W/m·K |
| Imperméabilité | Gaz | Totale (He inclus) |
| Transparence | Optique | 97.7% |

**Applications coating** :
- Anti-corrosion : Barrière imperméable
- Dissipation thermique : Électronique
- Anti-rayures : Surface dure
- Hydrophobe : Contact angle >90°

**Méthodes de dépôt** :
- CVD (Chemical Vapor Deposition)
- Spray coating (graphène oxide)
- Dip coating

## 3. Application aux Produits Crypto

| Type de Produit | Graphene Coating |
|-----------------|------------------|
| Hardware Wallets | R&D phase |
| Premium Devices | Anti-corrosion |
| Metal Backups | Protection long-terme |
| Heat Sinks | Dissipation SE |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Pas de coating |
| Intermédiaire | 56-70 | Coating standard |
| Avancé | 71-85 | Ceramic/DLC |
| Expert | 86-100 | Graphene coating |

## 5. Sources et Références

- [Graphene Flagship](https://graphene-flagship.eu/)
- [Nature: Graphene Coatings](https://www.nature.com/subjects/graphene)""",

    3996: """## 1. Vue d'ensemble

Le critère **Aerogel Insulation** (F109) évalue l'utilisation d'aérogel pour isolation thermique extrême.

**Importance pour la sécurité crypto** : L'aérogel offre la meilleure isolation thermique connue, protégeant les dispositifs contre températures extrêmes et feu.

## 2. Spécifications Techniques

| Propriété | Aérogel silice | Air |
|-----------|----------------|-----|
| Densité | 1-2 mg/cm³ | 1.2 mg/cm³ |
| Conductivité | 0.015 W/m·K | 0.026 W/m·K |
| Point fusion | >1200°C | N/A |
| Porosité | >99% | N/A |
| Surface spécif. | 500-1000 m²/g | N/A |

**Types d'aérogel** :
- Silice : Isolation thermique
- Carbone : Supercapacitors
- Polymère : Flexible
- Hybride : Applications variées

**Applications** :
- NASA : Isolation spatiale
- Construction : Isolation bâtiment
- Vêtements : Protection froid
- Électronique : Dissipation/protection

## 3. Application aux Produits Crypto

| Type de Produit | Aerogel Application |
|-----------------|---------------------|
| Hardware Wallets | Protection feu |
| Extreme Storage | Isolation thermique |
| Vault Lining | Fire resistance |
| Transport Cases | Température stable |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Mousse standard |
| Intermédiaire | 56-70 | Fibre céramique |
| Avancé | 71-85 | Isolation minérale |
| Expert | 86-100 | Aerogel |

## 5. Sources et Références

- [NASA Aerogel](https://www.nasa.gov/topics/technology/features/aerogels.html)
- [Aspen Aerogels](https://www.aerogel.com/)""",

    3997: """## 1. Vue d'ensemble

Le critère **Molybdenum Alloy** (F110) évalue l'utilisation d'alliages de molybdène pour applications haute température.

**Importance pour la sécurité crypto** : Le molybdène offre une résistance exceptionnelle aux hautes températures et au fluage pour stockage sécurisé.

## 2. Spécifications Techniques

| Propriété | Molybdène | Tungstène |
|-----------|-----------|-----------|
| Densité | 10.2 g/cm³ | 19.3 g/cm³ |
| Point fusion | 2623°C | 3422°C |
| Conductivité | 138 W/m·K | 173 W/m·K |
| Module Young | 329 GPa | 411 GPa |

**Alliages courants** :
- TZM (Ti-Zr-Mo) : Haute résistance
- Mo-La₂O₃ : Ductilité améliorée
- Mo-W : Résistance corrosion

**Applications** :
- Aerospace : Tuyères, boucliers thermiques
- Électronique : Dissipateurs chaleur
- Verre : Électrodes fusion
- Nucléaire : Composants réacteur

## 3. Application aux Produits Crypto

| Type de Produit | Molybdenum Use |
|-----------------|----------------|
| Hardware Wallets | Non standard |
| High-temp Vaults | Structural |
| Fire Safes | Heat shields |
| Extreme Backup | Long-term storage |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Score | Critères |
|--------|-------|----------|
| Basique | 40-55 | Acier standard |
| Intermédiaire | 56-70 | Acier inox HT |
| Avancé | 71-85 | Inconel |
| Expert | 86-100 | Molybdène/TZM |

## 5. Sources et Références

- [ASTM B386 - Molybdenum Plate](https://www.astm.org/b0386-03r18.html)
- [IMOA (International Molybdenum Association)](https://www.imoa.info/)"""
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
