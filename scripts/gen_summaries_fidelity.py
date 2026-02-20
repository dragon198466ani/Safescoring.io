#!/usr/bin/env python3
"""Generate summaries for Fidelity norms - Materials, Durability, Battery, Reliability."""

import requests
import sys
import time
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    # Materials - Metals
    7176: """## 1. Vue d'ensemble

Le critère **Titanium Grade 5** (Ti-6Al-4V) évalue l'utilisation du titane de grade 5, l'alliage de titane le plus utilisé pour les applications nécessitant haute résistance et faible poids.

C'est le standard de l'industrie aéronautique et médicale.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Propriété | Valeur |
|-----------|--------|
| Composition | Ti 90%, Al 6%, V 4% |
| Densité | 4.43 g/cm³ |
| Limite élastique | 880-950 MPa |
| Résistance traction | 950-1100 MPa |
| Dureté | 30-36 HRC |
| Point fusion | 1660°C |
| Corrosion | Excellente |

**Comparaison :**
| Matériau | Résistance | Poids | Coût |
|----------|------------|-------|------|
| Ti Grade 5 | Excellente | Faible | Élevé |
| Acier 316L | Très bonne | Moyen | Moyen |
| Alu 6061 | Bonne | Très faible | Bas |

## 3. Application aux Produits Crypto

### Solutions de Backup
- **Cryptosteel Capsule** : Utilise acier inox (pas Ti)
- **Billfodl** : Acier inox 316
- Plaques titane premium disponibles

### Avantages pour backup crypto
- Résistance feu jusqu'à 1660°C
- Aucune corrosion
- Durée de vie > 100 ans

## 4. Critères d'Évaluation SafeScoring

| Matériau | Points |
|----------|--------|
| Titanium Grade 5 | 100% |
| Titanium Grade 2 | 95% |
| Stainless 316L | 85% |
| Aluminum | 60% |

## 5. Sources et Références

- ASTM B348 (Titanium specifications)
- SafeScoring Criteria F-ADD-001 v1.0
""",

    8072: """## 1. Vue d'ensemble

Le **Titanium Grade 2** est du titane commercialement pur (CP), offrant une excellente résistance à la corrosion et une bonne formabilité, mais moins de résistance mécanique que le Grade 5.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Propriété | Valeur |
|-----------|--------|
| Composition | Ti > 99% |
| Densité | 4.51 g/cm³ |
| Limite élastique | 275-450 MPa |
| Résistance traction | 345-540 MPa |
| Point fusion | 1668°C |

**Avantages :**
- Moins cher que Grade 5
- Plus facile à former
- Excellente corrosion

## 3. Application aux Produits Crypto

- Plaques de backup économiques
- Boîtiers de protection

## 4. Critères d'Évaluation SafeScoring

| Matériau | Points |
|----------|--------|
| Ti Grade 2 | 90% |

## 5. Sources et Références

- ASTM B265
- SafeScoring Criteria F-ADD-002 v1.0
""",

    7178: """## 1. Vue d'ensemble

L'**Acier Inoxydable 304** est l'acier inox le plus courant (18/8 - 18% chrome, 8% nickel), offrant un bon équilibre entre coût et résistance à la corrosion.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Propriété | Valeur |
|-----------|--------|
| Composition | Fe, Cr 18%, Ni 8% |
| Densité | 8.0 g/cm³ |
| Limite élastique | 215 MPa |
| Résistance traction | 505 MPa |
| Dureté | 70-92 HRB |
| Point fusion | 1400-1450°C |

**Limitations :**
- Corrosion possible en milieu salin
- Moins résistant que 316L

## 3. Application aux Produits Crypto

- Plaques backup entrée de gamme
- Boîtiers économiques

## 4. Critères d'Évaluation SafeScoring

| Matériau | Points |
|----------|--------|
| Stainless 304 | 75% |
| Stainless 316L | 85% |

## 5. Sources et Références

- ASTM A240
- SafeScoring Criteria F-ADD-003 v1.0
""",

    7179: """## 1. Vue d'ensemble

L'**Acier Inoxydable 316L** est la version bas carbone du 316, avec addition de molybdène pour une résistance supérieure à la corrosion, particulièrement en environnement salin/acide.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Propriété | Valeur |
|-----------|--------|
| Composition | Fe, Cr 16-18%, Ni 10-14%, Mo 2-3% |
| Densité | 8.0 g/cm³ |
| Limite élastique | 170-310 MPa |
| Résistance traction | 485-680 MPa |
| Point fusion | 1375-1400°C |
| "L" | Low carbon (< 0.03%) |

**Avantages vs 304 :**
- Résistance pitting (corrosion par piqûres)
- Marine grade
- Meilleure soudabilité

## 3. Application aux Produits Crypto

### Solutions Backup
- **Cryptosteel** : Acier inox (type 304/316)
- **Billfodl** : Marine-grade stainless
- Standard pour plaques métal qualité

## 4. Critères d'Évaluation SafeScoring

| Matériau | Points |
|----------|--------|
| Stainless 316L | 85% |

## 5. Sources et Références

- ASTM A240, A276
- SafeScoring Criteria F-ADD-004 v1.0
""",

    8073: """## 1. Vue d'ensemble

L'**Aluminium 6061-T6** est un alliage d'aluminium traité thermiquement, offrant un excellent rapport résistance/poids pour les boîtiers et structures.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Propriété | Valeur |
|-----------|--------|
| Composition | Al, Mg 1%, Si 0.6% |
| Densité | 2.70 g/cm³ |
| Limite élastique | 276 MPa |
| Résistance traction | 310 MPa |
| Point fusion | 582-652°C |
| Dureté | 95 HB |

**"T6" signifie :**
- Solution heat treated
- Artificially aged

## 3. Application aux Produits Crypto

### Hardware Wallets
- Boîtiers légers
- Dissipation thermique

### Limitations pour backup
- Point fusion bas (652°C)
- Pas recommandé pour plaques feu

## 4. Critères d'Évaluation SafeScoring

| Usage | Points |
|-------|--------|
| Boîtier HW | 90% |
| Backup métal | 40% |

## 5. Sources et Références

- ASTM B221
- SafeScoring Criteria F-ADD-005 v1.0
""",

    7181: """## 1. Vue d'ensemble

L'**Aluminium 7075** est un alliage haute résistance utilisé en aéronautique, offrant la meilleure résistance mécanique parmi les aluminiums courants.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Propriété | Valeur |
|-----------|--------|
| Composition | Al, Zn 5.6-6.1%, Mg 2.1-2.9% |
| Densité | 2.81 g/cm³ |
| Limite élastique | 503 MPa (T6) |
| Résistance traction | 572 MPa |
| Point fusion | 477-635°C |

**"Aerospace grade aluminum"**

## 3. Application aux Produits Crypto

- Boîtiers premium
- Protection mécanique

## 4. Critères d'Évaluation SafeScoring

| Matériau | Points |
|----------|--------|
| Al 7075-T6 | 85% |
| Al 6061-T6 | 80% |

## 5. Sources et Références

- ASTM B211
- SafeScoring Criteria F-ADD-006 v1.0
""",

    7182: """## 1. Vue d'ensemble

Le **Laiton (CuZn)** est un alliage cuivre-zinc offrant une bonne usinabilité et résistance à la corrosion, mais des propriétés mécaniques modérées.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Propriété | Valeur |
|-----------|--------|
| Composition | Cu 60-70%, Zn 30-40% |
| Densité | 8.4-8.7 g/cm³ |
| Point fusion | 900-940°C |
| Résistance | 300-500 MPa |

## 3. Application aux Produits Crypto

- Connecteurs
- Pièces décoratives
- Pas recommandé pour backup (ternit)

## 4. Critères d'Évaluation SafeScoring

| Usage | Points |
|-------|--------|
| Connecteurs | 70% |
| Structure | 50% |

## 5. Sources et Références

- SafeScoring Criteria F-ADD-007 v1.0
""",

    7183: """## 1. Vue d'ensemble

Les **Alliages de Cuivre** incluent bronze, cupronickel et autres alliages offrant conductivité électrique et résistance à la corrosion.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Alliage | Propriétés |
|---------|------------|
| Bronze (Cu-Sn) | Résistant, antifric |
| Cupronickel | Marine grade |
| BeCu | Ressorts, outils |

## 3. Application aux Produits Crypto

- Contacts électriques
- Springs et connecteurs
- Pas pour structure principale

## 4. Critères d'Évaluation SafeScoring

| Usage | Points |
|-------|--------|
| Contacts | 80% |

## 5. Sources et Références

- SafeScoring Criteria F-ADD-008 v1.0
""",

    8074: """## 1. Vue d'ensemble

L'**Inconel 625** est un superalliage nickel-chrome offrant une résistance exceptionnelle à haute température et à la corrosion extrême.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Propriété | Valeur |
|-----------|--------|
| Composition | Ni 58%+, Cr 20-23%, Mo 8-10% |
| Densité | 8.44 g/cm³ |
| Point fusion | 1290-1350°C |
| Service temp | Jusqu'à 980°C |
| Résistance | 827-1034 MPa |

## 3. Application aux Produits Crypto

- Plaques backup ultra-premium
- Survit aux incendies les plus intenses
- Coût très élevé

## 4. Critères d'Évaluation SafeScoring

| Matériau | Points |
|----------|--------|
| Inconel 625 | 100% |
| Titanium | 95% |

## 5. Sources et Références

- ASTM B443
- SafeScoring Criteria F-ADD-009 v1.0
""",

    8075: """## 1. Vue d'ensemble

La **Fibre de Carbone** offre un rapport résistance/poids exceptionnel, utilisée pour les boîtiers premium de hardware wallets.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Propriété | Valeur |
|-----------|--------|
| Densité | 1.55-1.60 g/cm³ |
| Résistance traction | 3500-7000 MPa |
| Module Young | 230-540 GPa |
| Température max | 300°C (résine) |

**Types :**
- High strength (3K, 6K, 12K)
- High modulus
- Ultra-high modulus

## 3. Application aux Produits Crypto

### Hardware Wallets
- Boîtiers premium légers
- Aspect distinctif

### Limitations
- Température limitée (résine)
- Conducteur (EMI)
- Coût élevé

## 4. Critères d'Évaluation SafeScoring

| Usage | Points |
|-------|--------|
| Boîtier léger | 90% |
| Protection feu | 40% |

## 5. Sources et Références

- SafeScoring Criteria F-ADD-010 v1.0
""",

    7186: """## 1. Vue d'ensemble

Le critère **Glass Fiber Reinforced** évalue l'utilisation de plastiques renforcés fibre de verre (GFRP) offrant résistance mécanique et isolation électrique.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Propriété | GFRP |
|-----------|------|
| Densité | 1.5-2.0 g/cm³ |
| Résistance | 300-400 MPa |
| Rigidité | Bonne |
| Isolation | Excellente |

## 3. Application aux Produits Crypto

- PCB (FR4)
- Boîtiers isolants
- Structures légères

## 4. Critères d'Évaluation SafeScoring

| Usage | Points |
|-------|--------|
| Structure isolante | 80% |

## 5. Sources et Références

- SafeScoring Criteria F-ADD-011 v1.0
""",

    7187: """## 1. Vue d'ensemble

Le **Ceramic Substrate** (substrat céramique) offre une isolation électrique parfaite et une excellente dissipation thermique pour les composants sensibles.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type | Conductivité thermique |
|------|------------------------|
| Al2O3 (Alumina) | 25-35 W/mK |
| AlN (Aluminum Nitride) | 170-230 W/mK |
| SiC | 120-200 W/mK |

## 3. Application aux Produits Crypto

- Substrat pour Secure Element
- Dissipation thermique
- Isolation haute tension

## 4. Critères d'Évaluation SafeScoring

| Type | Points |
|------|--------|
| AlN ceramic | 100% |
| Al2O3 | 85% |

## 5. Sources et Références

- SafeScoring Criteria F-ADD-012 v1.0
""",

    8076: """## 1. Vue d'ensemble

Le **Verre Saphir** (corindon synthétique) est le matériau le plus dur après le diamant, offrant une résistance aux rayures exceptionnelle pour les écrans.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Propriété | Valeur |
|-----------|--------|
| Dureté | 9 Mohs (diamant = 10) |
| Dureté Vickers | 1800-2200 HV |
| Transmittance | >85% visible |
| Point fusion | 2030°C |

## 3. Application aux Produits Crypto

### Hardware Wallets premium
- Protection écran ultime
- Montres connectées
- Coût élevé

## 4. Critères d'Évaluation SafeScoring

| Verre | Points |
|-------|--------|
| Sapphire | 100% |
| Gorilla Glass | 80% |
| Standard | 50% |

## 5. Sources et Références

- SafeScoring Criteria F-ADD-013 v1.0
""",

    8077: """## 1. Vue d'ensemble

Le **Gorilla Glass** de Corning est un verre aluminosilicate renforcé chimiquement, offrant une excellente résistance aux chocs et rayures à coût modéré.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Version | Résistance chute |
|---------|------------------|
| Gorilla Glass 3 | 1m sur asphalte |
| Gorilla Glass 5 | 1.6m |
| Gorilla Glass 6 | 1.6m multi-drops |
| Victus | 2m |

**Dureté : ~6-7 Mohs**

## 3. Application aux Produits Crypto

### Hardware Wallets avec écran
- Protection écran standard haut de gamme
- Balance coût/performance

## 4. Critères d'Évaluation SafeScoring

| Verre | Points |
|-------|--------|
| Gorilla Glass 5+ | 85% |
| Gorilla Glass 3 | 75% |

## 5. Sources et Références

- Corning Gorilla Glass Specifications
- SafeScoring Criteria F-ADD-014 v1.0
""",

    # Physical resistance
    7190: """## 1. Vue d'ensemble

Le critère **Crush Resistance 20T** évalue la capacité d'un appareil ou plaque de backup à résister à une force d'écrasement de 20 tonnes.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Force | Pression (100mm²) | Équivalent |
|-------|-------------------|------------|
| 10T | 1000 MPa | Véhicule |
| 20T | 2000 MPa | Effondrement |
| 50T | 5000 MPa | Presse industrielle |

**Test typique :**
- Pression hydraulique
- Surface définie
- Mesure déformation

## 3. Application aux Produits Crypto

### Plaques Backup
- **Cryptosteel Capsule** : >20T résistance
- Protection effondrement bâtiment

## 4. Critères d'Évaluation SafeScoring

| Résistance | Points |
|------------|--------|
| >20T | 100% |
| 10-20T | 80% |
| <10T | 50% |

## 5. Sources et Références

- SafeScoring Criteria F-ADD-015 v1.0
""",

    7191: """## 1. Vue d'ensemble

Le critère **Bend Resistance** évalue la résistance à la flexion d'un appareil ou backup, important pour la survie en cas de contrainte mécanique.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Test | Méthode |
|------|---------|
| 3-point bend | ISO 178 |
| 4-point bend | ASTM D790 |
| Angle permanent | <2° déformation |

## 3. Application aux Produits Crypto

- Plaques backup rigides
- Hardware wallets robustes
- Survie poche/chute

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Haute résistance flexion | 100% |
| Moyenne | 70% |

## 5. Sources et Références

- ISO 178
- SafeScoring Criteria F-ADD-016 v1.0
""",

    7192: """## 1. Vue d'ensemble

Le critère **Torsion Resistance** évalue la résistance à la torsion, important pour les appareils manipulés.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Test | Méthode |
|------|---------|
| Torque test | ASTM D5279 |
| Angle max | 10-30° |
| Recovery | <5% permanent |

## 3. Application aux Produits Crypto

- Hardware wallets manipulés
- Plaques rectangulaires

## 4. Critères d'Évaluation SafeScoring

| Niveau | Points |
|--------|--------|
| Haute torsion | 100% |

## 5. Sources et Références

- SafeScoring Criteria F-ADD-017 v1.0
""",

    7193: """## 1. Vue d'ensemble

Le critère **Tensile Strength >500 MPa** garantit une résistance à la traction suffisante pour les matériaux de backup et boîtiers.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Matériau | Résistance traction |
|----------|---------------------|
| Ti Grade 5 | 950-1100 MPa |
| 316L | 485-680 MPa |
| Al 6061 | 310 MPa |
| Al 7075 | 572 MPa |

**500 MPa = niveau acier inox qualité**

## 3. Application aux Produits Crypto

- Garantie intégrité structurelle
- Résistance arrachement

## 4. Critères d'Évaluation SafeScoring

| Résistance | Points |
|------------|--------|
| >800 MPa | 100% |
| 500-800 MPa | 90% |
| <500 MPa | 70% |

## 5. Sources et Références

- ASTM E8
- SafeScoring Criteria F-ADD-018 v1.0
""",

    7194: """## 1. Vue d'ensemble

Le critère **Hardness HRC 50+** spécifie une dureté Rockwell C de 50 ou plus, typique des aciers trempés et outillage.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| HRC | Applications |
|-----|--------------|
| 30-35 | Acier inox standard |
| 45-50 | Outils |
| 55-60 | Lames, matrices |
| 60+ | Céramique, carbure |

## 3. Application aux Produits Crypto

- Plaques backup haute dureté
- Résistance aux impacts localisés

## 4. Critères d'Évaluation SafeScoring

| Dureté | Points |
|--------|--------|
| HRC 55+ | 100% |
| HRC 50-55 | 90% |
| HRC 40-50 | 70% |

## 5. Sources et Références

- ASTM E18
- SafeScoring Criteria F-ADD-019 v1.0
""",

    7195: """## 1. Vue d'ensemble

Le critère **Scratch Resistance 9H** utilise l'échelle de dureté crayon pour qualifier la résistance aux rayures de l'écran ou surface.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Grade | Rayable par |
|-------|-------------|
| 6H | Acier standard |
| 8H | Acier trempé |
| 9H | Quartz (sable) |
| 10H | Corundum |

**9H = ne se raye pas au sable/clés**

## 3. Application aux Produits Crypto

### Hardware Wallets
- Protection écran 9H minimum
- Films protecteurs standard

## 4. Critères d'Évaluation SafeScoring

| Dureté | Points |
|--------|--------|
| 9H | 100% |
| 7-8H | 80% |
| <7H | 50% |

## 5. Sources et Références

- ASTM D3363
- SafeScoring Criteria F-ADD-020 v1.0
""",

    # Battery specs
    7196: """## 1. Vue d'ensemble

Le critère **Li-ion 18650** évalue l'utilisation de cellules lithium-ion format 18650, le standard industriel le plus fiable et remplaçable.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Format | 18mm × 65mm cylindrique |
| Capacité | 2000-3500 mAh |
| Tension | 3.6V nominal |
| Cycles | 500-1000 |
| Marques | Samsung, LG, Panasonic, Sony |

**Avantages :**
- Standard remplaçable
- Haute densité énergétique
- Bien caractérisé

## 3. Application aux Produits Crypto

### Hardware Wallets
- Rare (format trop grand)
- Possible dans designs pro

### Avantage
- Batterie remplaçable par utilisateur

## 4. Critères d'Évaluation SafeScoring

| Type | Points |
|------|--------|
| 18650 remplaçable | 100% |
| Li-Po intégré | 70% |

## 5. Sources et Références

- IEC 62133
- SafeScoring Criteria F-ADD-021 v1.0
""",

    7197: """## 1. Vue d'ensemble

Le critère **Li-Po Pouch** évalue l'utilisation de batteries lithium-polymère en format poche, permettant des designs fins et personnalisés.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Spécification |
|-----------|---------------|
| Format | Pouch flexible |
| Densité | 150-200 Wh/kg |
| Tension | 3.7V nominal |
| Forme | Personnalisable |
| Protection | BMS requis |

**Avantages :**
- Design flexible
- Très fin possible
- Haute densité

**Inconvénients :**
- Non remplaçable facilement
- Gonflement possible avec l'âge

## 3. Application aux Produits Crypto

### Hardware Wallets
- **Ledger Nano X** : Li-Po intégré
- **Keystone** : Li-Po
- Format dominant actuel

## 4. Critères d'Évaluation SafeScoring

| Type | Points |
|------|--------|
| Li-Po qualité + BMS | 90% |
| Li-Po basique | 70% |

## 5. Sources et Références

- SafeScoring Criteria F-ADD-022 v1.0
""",

    7198: """## 1. Vue d'ensemble

Le critère **500+ Charge Cycles** garantit une durée de vie batterie d'au moins 500 cycles de charge complets (0-100%) avant dégradation significative.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Cycles | Capacité restante |
|--------|-------------------|
| 0 | 100% |
| 300 | ~90% |
| 500 | ~80% |
| 800 | ~70% |
| 1000 | ~60% |

**Définition cycle :**
- 0% → 100% = 1 cycle
- 50% → 100% × 2 = 1 cycle

## 3. Application aux Produits Crypto

- ~2 ans d'utilisation quotidienne
- Standard minimum acceptable

## 4. Critères d'Évaluation SafeScoring

| Cycles | Points |
|--------|--------|
| 1000+ | 100% |
| 500-1000 | 85% |
| 300-500 | 60% |

## 5. Sources et Références

- SafeScoring Criteria F-ADD-023 v1.0
""",

    7199: """## 1. Vue d'ensemble

Le critère **1000+ Charge Cycles** garantit une durée de vie batterie premium d'au moins 1000 cycles.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Cycles | Usage équivalent |
|--------|------------------|
| 1000 | ~3-4 ans quotidien |
| 1500 | ~5 ans |
| 2000 | ~6+ ans |

## 3. Application aux Produits Crypto

- Durabilité long terme
- Cellules premium requises

## 4. Critères d'Évaluation SafeScoring

| Cycles | Points |
|--------|--------|
| 1000+ | 100% |

## 5. Sources et Références

- SafeScoring Criteria F-ADD-024 v1.0
""",

    7200: """## 1. Vue d'ensemble

La certification **UN38.3** est obligatoire pour le transport de batteries lithium par voie aérienne, garantissant qu'elles ont passé les tests de sécurité ONU.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Test | Description |
|------|-------------|
| T1 | Altitude (11.6 kPa) |
| T2 | Thermique (-40°C à +75°C) |
| T3 | Vibrations |
| T4 | Choc |
| T5 | Court-circuit externe |
| T6 | Impact |
| T7 | Surcharge |
| T8 | Décharge forcée |

## 3. Application aux Produits Crypto

- Obligatoire pour vente internationale
- Garantie sécurité transport
- Tous les produits sérieux sont certifiés

## 4. Critères d'Évaluation SafeScoring

| Certification | Points |
|---------------|--------|
| UN38.3 certifié | 100% |
| Non certifié | 30% |

## 5. Sources et Références

- UN Manual of Tests and Criteria
- SafeScoring Criteria F-ADD-025 v1.0
""",

    7201: """## 1. Vue d'ensemble

La certification **IEC 62133** est la norme internationale de sécurité pour les batteries lithium-ion et nickel portables.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Test | Description |
|------|-------------|
| Charge continue | Protection surcharge |
| External short | Protection CC |
| Free fall | 1m sur béton |
| Thermal | 70°C pendant 7h |
| Crush | 13kN force |
| Overcharge | 2× capacité |

## 3. Application aux Produits Crypto

- Standard de qualité batterie
- Requis pour CE marking
- UL listing basé sur IEC 62133

## 4. Critères d'Évaluation SafeScoring

| Certification | Points |
|---------------|--------|
| IEC 62133 certifié | 100% |
| Non certifié | 50% |

## 5. Sources et Références

- IEC 62133-2:2017
- SafeScoring Criteria F-ADD-026 v1.0
""",

    7202: """## 1. Vue d'ensemble

Le **BMS Protection** (Battery Management System) évalue la présence d'un circuit de protection gérant charge, décharge, température et équilibrage des cellules.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Protection | Seuil typique |
|------------|---------------|
| Surcharge | 4.25-4.35V |
| Surdécharge | 2.5-3.0V |
| Surcourant | Variable |
| Température | 0-45°C charge |

**Fonctions BMS :**
- Over-voltage protection
- Under-voltage protection
- Over-current protection
- Short-circuit protection
- Thermal protection
- Cell balancing (multi-cell)

## 3. Application aux Produits Crypto

### Hardware Wallets
- Obligatoire pour batteries Li-Po
- Protection utilisateur et appareil

## 4. Critères d'Évaluation SafeScoring

| BMS | Points |
|-----|--------|
| BMS complet | 100% |
| Protection basique | 70% |
| Pas de BMS | 0% |

## 5. Sources et Références

- SafeScoring Criteria F-ADD-027 v1.0
""",

    # Reliability
    7203: """## 1. Vue d'ensemble

Le critère **MTBF > 100,000h** (Mean Time Between Failures) garantit une fiabilité statistique élevée avec un temps moyen entre pannes supérieur à 100,000 heures (~11 ans).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| MTBF | Fiabilité 1 an | Équivalent |
|------|----------------|------------|
| 10,000h | 91.2% | Consumer |
| 50,000h | 98.2% | Prosumer |
| 100,000h | 99.1% | Industrial |
| 500,000h | 99.8% | Telecom |

**Calcul :**
Probabilité survie = e^(-t/MTBF)

## 3. Application aux Produits Crypto

- Niveau industriel recommandé
- Composants qualité requise

## 4. Critères d'Évaluation SafeScoring

| MTBF | Points |
|------|--------|
| >100,000h | 100% |
| 50,000-100,000h | 80% |
| <50,000h | 60% |

## 5. Sources et Références

- MIL-HDBK-217F
- SafeScoring Criteria F-ADD-028 v1.0
""",

    7204: """## 1. Vue d'ensemble

Le critère **Design Life 10 Years** garantit que l'appareil est conçu pour fonctionner de manière fiable pendant au moins 10 ans dans des conditions normales.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Composant | Durée vie typique |
|-----------|-------------------|
| SE (Secure Element) | >20 ans |
| Flash memory | 10-100 ans (dépend cycles) |
| Li-Po batterie | 3-5 ans (capacité) |
| Connecteurs | 10,000-100,000 insertions |

**Facteurs limitants :**
- Batterie (remplaçable idéalement)
- Mémoire flash (wear leveling)
- Usure mécanique

## 3. Application aux Produits Crypto

### Hardware Wallets
- Standard de l'industrie
- Support firmware 10 ans

## 4. Critères d'Évaluation SafeScoring

| Design life | Points |
|-------------|--------|
| 20+ ans | 100% |
| 10-20 ans | 90% |
| 5-10 ans | 70% |
| <5 ans | 40% |

## 5. Sources et Références

- SafeScoring Criteria F-ADD-029 v1.0
""",

    7205: """## 1. Vue d'ensemble

Le critère **Design Life 20 Years** est le niveau premium garantissant une durée de vie de conception de 20 ans ou plus.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Exigence | Spécification |
|----------|---------------|
| Composants | Industrial grade |
| Batterie | Remplaçable |
| Mémoire | Low-cycle flash |
| Matériaux | Pas de dégradation |

**Produits 20+ ans :**
- Plaques métal backup (>100 ans)
- SE (>30 ans rétention données)

## 3. Application aux Produits Crypto

### Solutions Backup
- Plaques métal : durée quasi-illimitée
- Cryptosteel, Billfodl : >20 ans

### Hardware Wallets
- Difficile avec batterie intégrée
- Possible avec batterie remplaçable

## 4. Critères d'Évaluation SafeScoring

| Design life | Points |
|-------------|--------|
| 20+ ans | 100% |
| 10-20 ans | 80% |

## 5. Sources et Références

- SafeScoring Criteria F-ADD-030 v1.0
"""
}

def main():
    print("Saving Fidelity summaries F-ADD-001 to F-ADD-030...")
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
