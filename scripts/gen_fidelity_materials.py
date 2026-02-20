#!/usr/bin/env python3
"""Generate summaries for Fidelity durability and materials norms."""

import requests
import sys
import time
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    3966: """## 1. Vue d'ensemble

**Salt Fog Test 500h** évalue la résistance à la corrosion dans un environnement salin, simulant des décennies d'exposition maritime ou côtière en 500 heures de test accéléré.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | ASTM B117 |
|-----------|-----------|
| Concentration NaCl | 5% |
| Température | 35°C |
| pH | 6.5-7.2 |
| Durée | 500 heures |

| Résultat | Rating |
|----------|--------|
| Pas de corrosion | Excellent |
| Corrosion superficielle | Acceptable |
| Corrosion pénétrante | Échec |

## 3. Application aux Produits Crypto

### Metal Backup Solutions
| Produit | Salt Fog |
|---------|----------|
| **Titanium Grade 5** | 1000h+ |
| **316L Stainless** | 500h+ |
| **304 Stainless** | 200-300h |

### Hardware Wallets
- Boîtiers plastique : Non applicable
- Connecteurs USB : Test recommandé

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | 1000h+ sans corrosion | 100% |
| **Bon** | 500h acceptable | 75% |
| **Standard** | 168h (1 semaine) | 50% |

## 5. Sources et Références

- [ASTM B117](https://www.astm.org/b0117-19.html)
- [ISO 9227](https://www.iso.org/standard/63543.html)
""",

    3967: """## 1. Vue d'ensemble

**Explosive Atmosphere** (ATEX) évalue la sécurité d'utilisation d'équipements électroniques dans des environnements avec risque d'explosion (gaz, poussières combustibles).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Zone ATEX | Risque |
|-----------|--------|
| Zone 0/20 | Permanent |
| Zone 1/21 | Fréquent |
| Zone 2/22 | Occasionnel |

| Protection | Method |
|------------|--------|
| Ex d | Enveloppe antidéflagrante |
| Ex e | Sécurité augmentée |
| Ex i | Sécurité intrinsèque |

## 3. Application aux Produits Crypto

- **Hardware wallets** : Non certifiés ATEX (usage normal)
- **Mining equipment** : Peut nécessiter certification
- **Industrial custody** : Environnements spéciaux

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | ATEX Zone 1 certified | 100% |
| **Standard** | Non ATEX (usage bureau) | N/A |

## 5. Sources et Références

- [ATEX Directive 2014/34/EU](https://eur-lex.europa.eu/)
""",

    3982: """## 1. Vue d'ensemble

**HALT Testing** (Highly Accelerated Life Testing) est une méthode de test accéléré pour découvrir les faiblesses de conception en poussant le produit au-delà de ses limites opérationnelles.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Stress | Range |
|--------|-------|
| Température | -100°C to +200°C |
| Vibration | Up to 60 Grms |
| Voltage | ±20% nominal |
| Rate of change | 60°C/min |

| Phase | Objectif |
|-------|----------|
| Cold step | Limite basse |
| Hot step | Limite haute |
| Vibration | Résonances |
| Combined | Stress maximum |

## 3. Application aux Produits Crypto

### Hardware Wallets
| Test | Typical Result |
|------|----------------|
| Cold limit | -40°C to -60°C |
| Hot limit | +85°C to +100°C |
| Vibration | 20-40 Grms |

### Bénéfices
- Découvre faiblesses cachées
- Améliore fiabilité
- Réduit retours terrain

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | HALT completed + issues fixed | 100% |
| **Bon** | HALT performed | 75% |
| **Standard** | Standard testing only | 50% |

## 5. Sources et Références

- [HALT/HASS Best Practices](https://www.qualmark.com/)
""",

    3983: """## 1. Vue d'ensemble

**HASS Testing** (Highly Accelerated Stress Screening) est un processus de production utilisant les résultats HALT pour détecter les défauts de fabrication sur chaque unité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Parameter | HASS vs HALT |
|-----------|--------------|
| Stress level | 80% of HALT limits |
| Duration | Minutes vs hours |
| Purpose | Screen defects |
| Application | Every unit |

| Screen | Duration |
|--------|----------|
| Thermal | 3-5 cycles |
| Vibration | 5-10 minutes |
| Combined | Optimal |

## 3. Application aux Produits Crypto

### Production Screening
- Détecte soudures défectueuses
- Composants hors spec
- Assemblage incorrect

### Hardware Wallet Quality
| Benefit | Impact |
|---------|--------|
| Lower DOA rate | Customer satisfaction |
| Early detection | Cost reduction |
| Reliability | Brand reputation |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | HASS on every unit | 100% |
| **Bon** | Sample HASS | 70% |
| **Standard** | Basic QC only | 40% |

## 5. Sources et Références

- [HASS Guidelines](https://www.thermotron.com/)
""",

    3985: """## 1. Vue d'ensemble

**UN 3481 Lithium Ion** définit les exigences de transport pour les batteries lithium-ion, applicables aux hardware wallets avec batteries internes.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Classification | UN Number |
|----------------|-----------|
| Cells/batteries alone | UN 3480 |
| Packed with equipment | UN 3481 |
| Contained in equipment | UN 3481 |

| Packing | Wh Limit |
|---------|----------|
| Section I | > 100 Wh |
| Section II | ≤ 100 Wh |
| Section II | ≤ 20 Wh (cells) |

| Requirement | Section II |
|-------------|------------|
| UN38.3 test | Required |
| SOC limit | ≤ 30% |
| Packaging | Strong outer |
| Labeling | Lithium battery mark |

## 3. Application aux Produits Crypto

### Hardware Wallets avec batterie
| Device | Battery |
|--------|---------|
| Ledger Nano X | ~100 mAh Li-Po |
| Keystone Pro | 1000 mAh |
| Coldcard | No battery |

### Shipping
- Section II packaging typique
- Pas de cargo aircraft alone
- Labeling requis

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | UN38.3 + proper packaging | 100% |
| **Standard** | Compliance basique | 70% |

## 5. Sources et Références

- [IATA DGR](https://www.iata.org/dgr)
- [UN38.3 Testing](https://unece.org/)
""",

    3990: """## 1. Vue d'ensemble

**Carbon Fiber** est un matériau composite ultra-léger et résistant, potentiellement utilisé pour des solutions de stockage haute performance.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Property | CFRP |
|----------|------|
| Densité | 1.6 g/cm³ |
| Tensile strength | 3500 MPa |
| Modulus | 230 GPa |
| Thermal expansion | Near zero |

| Grade | Application |
|-------|-------------|
| Standard | Consumer goods |
| Aerospace | High performance |
| Pre-preg | Premium |

## 3. Application aux Produits Crypto

### Potential Uses
| Application | Benefit |
|-------------|---------|
| Backup enclosure | Light + strong |
| Wallet case | Premium feel |
| Faraday cage | RF shielding |

### Limitations
- Coût élevé
- Usinage complexe
- Non conducteur (sauf traité)

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Premium** | Aerospace grade CFRP | 100% |
| **Standard** | Consumer CFRP | 75% |

## 5. Sources et Références

- [Carbon Fiber Properties](https://www.toraycma.com/)
""",

    3995: """## 1. Vue d'ensemble

**DLC Coating** (Diamond-Like Carbon) est un revêtement ultra-dur offrant résistance à l'usure, faible friction, et protection contre la corrosion.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Property | DLC |
|----------|-----|
| Hardness | 20-80 GPa |
| Friction coefficient | 0.05-0.15 |
| Thickness | 1-5 μm |
| Max temp | 300-400°C |

| Type | Hardness |
|------|----------|
| a-C:H | 20-40 GPa |
| ta-C | 40-80 GPa |
| DLC+metal | 15-30 GPa |

## 3. Application aux Produits Crypto

### Hardware Protection
| Application | Benefit |
|-------------|---------|
| Metal backups | Scratch resistance |
| Connectors | Wear resistance |
| Premium devices | Durability |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | ta-C DLC coating | 100% |
| **Bon** | Standard DLC | 80% |

## 5. Sources et Références

- [DLC Coating Technology](https://www.oerlikon.com/balzers/)
""",

    4118: """## 1. Vue d'ensemble

**MIL-STD-461G** définit les exigences de compatibilité électromagnétique (EMC) pour les équipements militaires, applicable aux dispositifs haute sécurité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Test | Description |
|------|-------------|
| CE101/102 | Conducted emissions |
| CS101/114/115/116 | Conducted susceptibility |
| RE101/102 | Radiated emissions |
| RS101/103 | Radiated susceptibility |

| Frequency | Range |
|-----------|-------|
| Low | 30 Hz - 10 kHz |
| Mid | 10 kHz - 30 MHz |
| High | 30 MHz - 40 GHz |

## 3. Application aux Produits Crypto

### High Security Applications
| Application | Relevance |
|-------------|-----------|
| Government custody | Required |
| Military HSMs | Mandatory |
| Standard HW wallets | Overkill |

### Benefits
- EMI resistance
- Prevents data leakage
- Coexistence guarantee

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | MIL-STD-461G compliant | 100% |
| **Standard** | CE/FCC compliance | 60% |

## 5. Sources et Références

- [MIL-STD-461G](https://quicksearch.dla.mil/)
""",

    4119: """## 1. Vue d'ensemble

**MIL-STD-883** définit les méthodes de test pour les circuits intégrés et semi-conducteurs de qualité militaire et aérospatiale.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Test Group | Content |
|------------|---------|
| 1000 | Environmental |
| 2000 | Mechanical |
| 3000 | Electrical |
| 4000 | Piece part handling |
| 5000 | Misc tests |

| Key Tests | Purpose |
|-----------|---------|
| 1005 | Steady-state life |
| 1010 | Temperature cycling |
| 1011 | Thermal shock |
| 2001 | Constant acceleration |

## 3. Application aux Produits Crypto

### Secure Elements
| Relevance | Application |
|-----------|-------------|
| SE qualification | High reliability |
| HSM components | Military grade |
| Space crypto | Required |

### Component Selection
- Military temp range (-55°C to +125°C)
- Extended life qualification
- Radiation tolerance options

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | MIL-STD-883 qualified SE | 100% |
| **Industrial** | Industrial grade | 70% |
| **Commercial** | Commercial grade | 50% |

## 5. Sources et Références

- [MIL-STD-883](https://quicksearch.dla.mil/)
""",

    4122: """## 1. Vue d'ensemble

**NASA-STD-8739.4** définit les exigences de workmanship pour l'assemblage électronique des équipements spatiaux, le plus haut standard de qualité de fabrication.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Requirement | Description |
|-------------|-------------|
| Soldering | IPC J-STD-001 Space |
| Crimping | NASA-STD-8739.4 |
| Wire wrap | NASA-STD-8739.4 |
| Conformal coating | Required |

| Classification | Criteria |
|----------------|----------|
| Class 1 | Lowest (ground support) |
| Class 2 | Mid (LEO spacecraft) |
| Class 3 | Highest (deep space) |

## 3. Application aux Produits Crypto

### Ultra-High Reliability
| Application | Relevance |
|-------------|-----------|
| Space-based custody | Required |
| Government HSMs | Recommended |
| Consumer wallets | Overkill |

### Quality Indicators
- Zero defect soldering
- 100% inspection
- Full traceability

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | NASA Class 3 | 100% |
| **Excellent** | IPC Class 3 | 85% |
| **Standard** | IPC Class 2 | 70% |

## 5. Sources et Références

- [NASA Technical Standards](https://standards.nasa.gov/)
""",

    4125: """## 1. Vue d'ensemble

**IEC 60068-2-1** définit les méthodes de test de résistance au froid pour équipements électroniques, standard international de référence.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Test | Condition |
|------|-----------|
| Ad | Cold, gradual change |
| Ab | Cold, sudden change |
| Temperature | -65°C to +5°C |
| Duration | 2h to 96h |

| Severity | Temperature |
|----------|-------------|
| Mild | -5°C |
| Moderate | -25°C |
| Severe | -40°C |
| Extreme | -65°C |

## 3. Application aux Produits Crypto

### Hardware Wallets
| Device | Cold Rating |
|--------|-------------|
| Ledger Nano | 0°C to 40°C (op) |
| Trezor | 0°C to 35°C |
| Coldcard | Similar |

### Storage Conditions
| Condition | Range |
|-----------|-------|
| Operating | 0°C to 40°C |
| Storage | -20°C to 60°C |
| Extreme | -40°C tested |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | -40°C operation tested | 100% |
| **Bon** | -20°C operation | 75% |
| **Standard** | 0°C operation | 50% |

## 5. Sources et Références

- [IEC 60068-2-1](https://webstore.iec.ch/)
"""
}

def main():
    print("Saving Fidelity durability and materials norms...")
    for norm_id, summary in summaries.items():
        url = f'{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}'
        data = {
            'summary': summary,
            'summary_status': 'generated',
            'last_summarized_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }
        resp = requests.patch(url, headers=SUPABASE_HEADERS, json=data)
        print(f'ID {norm_id}: {resp.status_code}')
        time.sleep(0.2)
    print('Done!')

if __name__ == "__main__":
    main()
