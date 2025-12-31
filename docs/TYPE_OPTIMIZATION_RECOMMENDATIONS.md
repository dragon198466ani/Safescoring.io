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

#### 3. Anti-Coercion
- **Garder**: `AC Phys` (ID 36) pour hardware avec duress PIN
- **Garder**: `AC Digit` (ID 37) pour software avec privacy features
- **Supprimer**: `AC Phygi` (ID 38)
- **Règle**: Un produit ne devrait avoir qu'UN SEUL type AC

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

#### HW Hot vs HW Cold
- `HW Cold` - Hardware wallet air-gapped (Ledger, Trezor)
- `HW Hot` - Hardware wallet connecté (YubiKey?)

**Problème**: La distinction n'est pas claire. YubiKey n'est pas vraiment un wallet.

**Suggestion**: Renommer ou clarifier:
- `HW Cold` = Hardware wallet (garde actuel)
- `HW Hot` = Hardware 2FA/Signer (pour YubiKey, SATSCARD)

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

-- 3. Vérifier qu'aucun produit n'a plus d'un type AC
-- (à exécuter manuellement pour vérification)
SELECT p.name, COUNT(*) as ac_count
FROM products p
JOIN product_type_mapping ptm ON p.id = ptm.product_id
JOIN product_types pt ON ptm.type_id = pt.id
WHERE pt.code LIKE 'AC%'
GROUP BY p.id, p.name
HAVING COUNT(*) > 1;
```

### Tableau de Définition des Types (à mettre à jour)

| Code | Définition | Exemples | Ne PAS utiliser pour |
|------|------------|----------|---------------------|
| `HW Cold` | Hardware wallet air-gapped | Ledger, Trezor, Coldcard | Signing cards (utiliser HW NFC Signer) |
| `HW Hot` | Hardware 2FA/bearer card | YubiKey, SATSCARD | Hardware wallets traditionnels |
| `HW NFC Signer` | Carte NFC de signature | TAPSIGNER, Status Keycard | - |
| `SW Browser` | Extension navigateur UNIQUEMENT | Rabby (browser only) | Wallets multi-platform |
| `SW Mobile` | App mobile UNIQUEMENT | Phoenix, Breez | Wallets multi-platform |
| `Wallet MultiPlatform` | Wallet disponible sur plusieurs plateformes | MetaMask, Exodus, Trust Wallet | - |
| `Wallet MultiSig` | Wallet avec fonctionnalité multi-signature | Casa, Nunchuk, Safe | - |
| `AC Phys` | Anti-coercion physique (duress PIN, etc.) | Coldcard, Trezor | Produits software |
| `AC Digit` | Anti-coercion digital (privacy features) | Samourai, Wasabi | Hardware wallets |
| `Lending` | Protocole de prêt (DeFi ou CeFi) | Aave, Compound, Nexo | - |
| `Card` | Carte crypto CUSTODIALE | Binance Card, Coinbase Card | Cartes non-custodiales |
| `Card Non-Cust` | Carte crypto NON-CUSTODIALE | Gnosis Pay, 1inch Card | Cartes custodiales |
