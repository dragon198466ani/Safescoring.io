# Recommandations d'Optimisation des Types

## Analyse - Décembre 2024

### Types à SUPPRIMER (non utilisés ou redondants)

| Type | ID | Raison |
|------|-----|--------|
| `Crypto Payments` | 73 | 0 utilisations, redondant avec Card/Neobank |
| `AC Phygi` | 38 | 0 utilisations, concept flou (phygital = physical + digital?) |

### Types à FUSIONNER

#### 1. Lending
- **Garder**: `Lending` (ID 41) pour tout lending
- **Supprimer**: `Crypto Lending` (ID 72)
- **Migration**: Nexo, BlockFi → utiliser `Lending` avec tag "CeFi"

#### 2. Software Wallets
- **Garder**: `Wallet MultiPlatform` (ID 74) pour wallets cross-platform
- **Garder**: `SW Mobile` (ID 32) pour mobile-only
- **Garder**: `SW Browser` (ID 31) pour browser-only
- **Règle**: Ne PAS combiner SW Mobile + SW Browser, utiliser Wallet MultiPlatform à la place

### Types à CLARIFIER

#### Custody
Les 3 types custody se chevauchent:
- `Custody MPC` - Custody utilisant Multi-Party Computation
- `Custody MultiSig` - Custody utilisant MultiSignature
- `Enterprise Custody` - Custody pour entreprises

**Suggestion**:
- Garder les 3 mais définir clairement:
  - MPC = technologie de signing
  - MultiSig = technologie de signing
  - Enterprise = niveau de service (peut utiliser MPC ou MultiSig)

#### HW Hot vs HW Cold - RESOLVED
- `HW Cold` - Hardware wallet (Ledger, Trezor, Coldcard)

**DÉCISION**: `HW Hot` a été SUPPRIMÉ car:
1. La terminologie standard de l'industrie: Hot = Software, Cold = Hardware
2. Les hardware wallets sont par définition du "cold storage" (offline)
3. YubiKey et SATSCARD sont des NFC signers, pas des wallets

**SOLUTION APPLIQUÉE**:
- `HW Cold` = Tous les hardware wallets (Ledger, Trezor, etc.)
- `HW NFC Signer` = Cartes NFC (TAPSIGNER, SATSCARD, Status Keycard)
- YubiKey retiré car c'est un security key 2FA, pas un crypto wallet

### Types à GARDER TELS QUELS

Ces types sont bien définis et utilisés correctement:
- `Bridges` (31 utilisations)
- `DEX` (26 utilisations)
- `Card` / `Card Non-Cust` (bien différenciés)
- `Bkp Physical` / `Bkp Digital` (bien différenciés)
- `CEX` (exchanges centralisés)
- `Neobank` (banques fintech)
- `Lending` (protocoles DeFi)
- `Yield` (yield aggregators)
- `Liq Staking` (liquid staking)
- `Derivatives` (options, perps)
- `RWA` (real world assets)
- `DeFi Tools` (dashboards)

### Actions SQL Recommandées

```sql
-- 1. Supprimer les types non utilisés
DELETE FROM product_types WHERE code IN ('Crypto Payments', 'AC Phygi');

-- 2. Migrer Crypto Lending vers Lending
UPDATE product_type_mapping
SET type_id = (SELECT id FROM product_types WHERE code = 'Lending')
WHERE type_id = (SELECT id FROM product_types WHERE code = 'Crypto Lending');

DELETE FROM product_types WHERE code = 'Crypto Lending';

```

### Tableau de Définition des Types (à mettre à jour)

| Code | Définition | Exemples | Ne PAS utiliser pour |
|------|------------|----------|---------------------|
| `HW Cold` | Hardware wallet (tous les HW sont "cold" par définition) | Ledger, Trezor, Coldcard | Signing cards (utiliser HW NFC Signer) |
| ~~`HW Hot`~~ | **SUPPRIMÉ** - Terminologie non standard | - | - |
| `HW NFC Signer` | Carte NFC de signature/bearer | TAPSIGNER, SATSCARD, Status Keycard | - |
| `SW Browser` | Extension navigateur UNIQUEMENT | Rabby (browser only) | Wallets multi-platform |
| `SW Mobile` | App mobile UNIQUEMENT | Phoenix, Breez | Wallets multi-platform |
| `Wallet MultiPlatform` | Wallet disponible sur plusieurs plateformes | MetaMask, Exodus, Trust Wallet | - |
| `Wallet MultiSig` | Wallet avec fonctionnalité multi-signature | Casa, Nunchuk, Safe | - |
| `Lending` | Protocole de prêt (DeFi ou CeFi) | Aave, Compound, Nexo | - |
| `Card` | Carte crypto CUSTODIALE | Binance Card, Coinbase Card | Cartes non-custodiales |
| `Card Non-Cust` | Carte crypto NON-CUSTODIALE | Gnosis Pay, 1inch Card | Cartes custodiales |
