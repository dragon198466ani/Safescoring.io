# 🌍 Enhancement des Normes: Scope Géographique & Standards Internationaux

## Vue d'ensemble

Cette migration enrichit la base de données des normes SafeScoring avec:
1. **Colonne geographic_scope** - Indique si une norme est globale ou spécifique à une région
2. **35+ nouvelles normes** basées sur les standards internationaux réels
3. **Mapping vers standards** - Référence exacte (ISO 27001, NIST, CCSS, etc.)
4. **Anti-doublons** - ON CONFLICT DO NOTHING pour éviter les duplications

---

## 📊 Distribution Géographique

### Scopes Disponibles
- **global** - Applicable mondialement (ex: BIP-39, ISO 27001, CCSS)
- **EU** - Spécifique Union Européenne (GDPR, MiCA, ETSI)
- **US** - Spécifique États-Unis (FIPS 140-3, certaines normes NIST)
- **UK** - Spécifique Royaume-Uni (FCA requirements)
- **ASIA / APAC / AMERICAS / AFRICA / MIDDLE_EAST** - Régions spécifiques
- **multi_region** - Applicable à plusieurs régions spécifiques

---

## 🆕 Nouvelles Normes Ajoutées (35+)

### 1. **CCSS (CryptoCurrency Security Standard)** - 4 normes
**Organisme**: C4 - CryptoCurrency Certification Consortium
**Référence**: [CCSS v9.0](https://cryptoconsortium.org/standards-2/)
**Scope**: Global

- `S-CCSS-001` - Level 1 Key Generation (CSPRNG obligatoire)
- `S-CCSS-002` - Level 2 Key Storage Isolation (HSM/air-gapped)
- `S-CCSS-003` - Level 3 Geographic Distribution
- `S-CCSS-004` - Multi-Signature Requirements (minimum 2-of-N)

**Impact**: Comble le gap pour les normes spécifiques au stockage de crypto-actifs.

---

### 2. **NIST/FIPS (National Institute of Standards and Technology)** - 3 normes
**Organisme**: NIST (US Government)
**Scope**: Global (origine US, adoption mondiale)

- `S-NIST-001` - SP 800-38A Block Cipher Modes (CBC, CTR, GCM)
- `S-NIST-002` - SP 800-90A Random Number Generation (DRBG)
- `S-NIST-003` - FIPS 140-3 Cryptographic Module Validation (US-specific)

**Impact**: Ajoute les standards cryptographiques fédéraux américains adoptés mondialement.

---

### 3. **Common Criteria EAL (ISO 15408)** - 3 normes
**Organisme**: Common Criteria Recognition Arrangement
**Scope**: Global

- `A-CC-001` - EAL5+ Certification (hardware wallets standard)
- `A-CC-002` - EAL6+ Military Grade (high-security applications)
- `A-CC-003` - Physical Tamper Detection

**Impact**: Évalue les certifications hardware des wallets physiques.

---

### 4. **ISO 27001 (Information Security Management)** - 4 normes
**Organisme**: ISO/IEC
**Scope**: Global

- `F-ISO-001` - Information Security Policy
- `F-ISO-002` - Asset Management (crypto keys as critical assets)
- `F-ISO-003` - Change Management
- `F-ISO-004` - Incident Response Plan

**Impact**: Standards ISMS appliqués au contexte crypto.

---

### 5. **GDPR (General Data Protection Regulation)** - 3 normes
**Organisme**: European Commission
**Scope**: EU 🇪🇺

- `F-GDPR-001` - Article 25 Privacy by Design
- `F-GDPR-002` - Article 32 Security Measures
- `F-GDPR-003` - Right to Erasure (blockchain context)

**Impact**: Conformité RGPD pour produits crypto servant des utilisateurs européens.

---

### 6. **MiCA (Markets in Crypto-Assets Regulation)** - 3 normes
**Organisme**: European Commission
**Scope**: EU 🇪🇺
**Référence**: [Regulation (EU) 2023/1114](https://eur-lex.europa.eu/eli/reg/2023/1114)

- `F-MICA-001` - Customer Funds Segregation (Article 70)
- `F-MICA-002` - Operational Resilience (Article 72)
- `F-MICA-003` - White Paper Disclosure (Articles 4-8)

**Impact**: Nouveau framework réglementaire UE pour crypto-assets (entrée en vigueur 2024-2025).

---

### 7. **PCI DSS (Payment Card Industry Data Security Standard)** - 2 normes
**Organisme**: PCI Security Standards Council
**Scope**: Global

- `S-PCI-001` - Network Segmentation (crypto + card data)
- `S-PCI-002` - Encryption in Transit (TLS 1.2+)

**Impact**: Pour les crypto payment processors qui traitent aussi des cartes.

---

### 8. **OWASP MASVS (Mobile Application Security Verification Standard)** - 4 normes
**Organisme**: OWASP Foundation
**Scope**: Global

- `A-OWASP-001` - Code Obfuscation (MASVS Level 2)
- `A-OWASP-002` - Root/Jailbreak Detection
- `A-OWASP-003` - Secure Storage (iOS Keychain, Android Keystore)
- `A-OWASP-004` - Runtime Application Self-Protection (RASP)

**Impact**: Sécurité des mobile wallets (iOS/Android).

---

### 9. **SOC 2 (Service Organization Controls)** - 3 normes
**Organisme**: AICPA
**Scope**: Global

- `F-SOC2-001` - Logical Access Controls (CC6.1)
- `F-SOC2-002` - System Monitoring (CC7.2)
- `F-SOC2-003` - Change Management (CC8.1)

**Impact**: Audit des contrôles organisationnels pour crypto service providers.

---

### 10. **ETSI (European Telecommunications Standards Institute)** - 1 norme
**Organisme**: ETSI
**Scope**: EU 🇪🇺

- `S-ETSI-001` - TS 103 097 Secure Communication

---

### 11. **EIP (Ethereum Improvement Proposals)** - 3 normes
**Organisme**: Ethereum Foundation
**Scope**: Global (Ethereum ecosystem)

- `E-EIP-001` - EIP-1559 Transaction Fee Transparency
- `E-EIP-002` - EIP-712 Typed Data Signing (human-readable)
- `E-EIP-003` - EIP-1193 Provider API (browser wallets)

**Impact**: Standards UX pour wallets Ethereum.

---

### 12. **SLIP (SatoshiLabs Improvement Proposals)** - 2 normes
**Organisme**: SatoshiLabs
**Scope**: Global

- `S-SLIP-001` - SLIP-0039 Shamir Secret Sharing (M-of-N recovery)
- `S-SLIP-002` - SLIP-0010 Universal Private Key Derivation

---

## 📈 Statistiques Post-Migration

### Avant Migration
- **Total**: 946 normes
- **Geographic scope**: Non défini
- **Standards mapping**: Partiel

### Après Migration
- **Total**: ~981 normes (946 + 35 nouvelles)
- **Distribution géographique**:
  - Global: ~920 normes (93%)
  - EU-specific: ~9 normes (1%)
  - US-specific: ~3 normes (<1%)
  - Multi-region: ~49 normes (5%)

- **Standards couverts**: 12+ frameworks internationaux
  - CCSS (C4)
  - NIST/FIPS
  - ISO 27001
  - Common Criteria
  - GDPR
  - MiCA
  - PCI DSS
  - OWASP
  - SOC 2
  - ETSI
  - EIP (Ethereum)
  - SLIP (SatoshiLabs)

---

## 🔍 Nouvelles Vues SQL

### 1. `v_norms_by_geography`
Distribution des normes par scope géographique et pilier.

```sql
SELECT * FROM v_norms_by_geography;
```

### 2. `v_standards_coverage`
Mapping vers standards officiels.

```sql
SELECT * FROM v_standards_coverage;
```

### 3. `v_regional_requirements`
Exigences spécifiques par région (hors global).

```sql
SELECT * FROM v_regional_requirements;
```

---

## 🚀 Installation

### 1. Exécuter la Migration

```bash
# Via psql
psql -U postgres -d safescoring -f config/migrations/011_norms_geographic_scope.sql

# OU via Supabase Dashboard
# SQL Editor > Copier-coller le contenu
```

### 2. Vérifier les Résultats

```sql
-- Total des normes
SELECT COUNT(*) FROM norms;

-- Distribution géographique
SELECT geographic_scope, COUNT(*)
FROM norms
GROUP BY geographic_scope
ORDER BY COUNT(*) DESC;

-- Nouveaux standards ajoutés
SELECT issuing_authority, COUNT(*)
FROM norms
WHERE standard_reference IS NOT NULL
GROUP BY issuing_authority
ORDER BY COUNT(*) DESC;
```

### 3. Utiliser les Nouvelles Colonnes

```sql
-- Toutes les normes EU-specific
SELECT code, title, standard_reference
FROM norms
WHERE geographic_scope = 'EU'
ORDER BY code;

-- Normes CCSS
SELECT code, title, description
FROM norms
WHERE issuing_authority = 'C4 - CryptoCurrency Certification Consortium'
ORDER BY code;

-- Normes ISO 27001
SELECT code, title, standard_reference
FROM norms
WHERE standard_reference LIKE 'ISO 27001%'
ORDER BY code;
```

---

## 🎯 Avantages de cette Enhancement

### 1. **Couverture Standards Complète**
- SafeScoring couvre maintenant 12+ frameworks internationaux officiels
- Mapping explicite vers normes externes (ex: "GDPR Article 25", "NIST SP 800-57")
- Traçabilité et justification de chaque norme

### 2. **Compliance Régionale**
- Identification claire des exigences EU (GDPR, MiCA)
- Standards US (FIPS 140-3) vs adoption globale (ISO 27001)
- Facilite les audits de conformité par région

### 3. **Comparabilité avec Concurrents**
- CER.live: Focus exchanges, pas de framework unifié
- DeFiSafety: Seulement DeFi protocols
- CertiK: Smart contracts principalement
- **SafeScoring**: Seul à couvrir wallets + DeFi + exchanges avec standards internationaux mappés

### 4. **Transparence & Crédibilité**
- Chaque norme référence un standard officiel
- Autorités émettrices clairement identifiées
- Utilisateurs peuvent vérifier les sources

---

## 📝 Colonnes Ajoutées

| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `geographic_scope` | VARCHAR(20) | Portée géographique | `'global'`, `'EU'`, `'US'` |
| `regional_details` | JSONB | Détails régionaux | `{"origin": "US", "adoption": "worldwide"}` |
| `standard_reference` | VARCHAR(100) | Référence exacte du standard | `'GDPR Article 25'`, `'NIST SP 800-57'` |
| `issuing_authority` | VARCHAR(100) | Organisme émetteur | `'NIST'`, `'ISO/IEC'`, `'European Commission'` |

---

## 🔐 Anti-Doublons

La migration utilise `ON CONFLICT (code) DO NOTHING` pour:
- ✅ Éviter les duplications si la migration est exécutée plusieurs fois
- ✅ Préserver les normes existantes
- ✅ Ajouter uniquement les nouvelles normes manquantes

---

## 🌐 Sources des Standards

1. **CCSS**: https://cryptoconsortium.org/standards-2/
2. **NIST**: https://csrc.nist.gov/
3. **ISO 27001**: https://www.iso.org/isoiec-27001-information-security.html
4. **Common Criteria**: https://www.commoncriteriaportal.org/
5. **GDPR**: https://gdpr-info.eu/
6. **MiCA**: https://eur-lex.europa.eu/eli/reg/2023/1114
7. **PCI DSS**: https://www.pcisecuritystandards.org/
8. **OWASP MASVS**: https://mas.owasp.org/MASVS/
9. **SOC 2**: https://www.aicpa.org/soc
10. **ETSI**: https://www.etsi.org/
11. **EIP**: https://eips.ethereum.org/
12. **SLIP**: https://github.com/satoshilabs/slips

---

## 🎓 Prochaines Étapes Recommandées

1. **Exécuter la migration** en environnement de test d'abord
2. **Valider les comptages** - devrait passer de 946 à ~981 normes
3. **Mettre à jour le frontend** pour afficher `geographic_scope` dans les détails des normes
4. **Ajouter filtres** par région et par standard dans l'UI
5. **Documenter** les nouvelles normes dans la section Méthodologie

---

## ❓ FAQ

### Q: Pourquoi certaines normes US sont marquées "global"?
**R**: NIST et FIPS sont d'origine US mais largement adoptés mondialement (ex: AES-256, SHA-256). Seules les normes avec exigence légale US-only sont marquées 'US'.

### Q: Comment gérer les produits multi-régionaux?
**R**: Un produit peut se conformer aux normes 'global' + 'EU' + 'US'. Le scoring additionne toutes les normes applicables.

### Q: Que faire si une norme existe déjà avec un code différent?
**R**: Vérifier le contenu. Si doublon sémantique, marquer l'ancienne comme deprecated. Si complémentaires, les garder toutes deux.

### Q: MiCA est-il obligatoire pour tous les produits?
**R**: Non, seulement pour les crypto-asset service providers opérant dans l'UE. C'est une conformité optionnelle hors EU.

---

**Date**: 2026-01-03
**Version**: 1.0
**Auteur**: SafeScoring Standards Enhancement Initiative
