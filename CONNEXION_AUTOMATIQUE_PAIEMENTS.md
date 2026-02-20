# ✅ Connexion Automatique des Paiements

**Situation:** Tous vos paiements (crypto ET carte bancaire) alimentent **automatiquement** votre calculateur fiscal SASU.

---

## 🔄 Comment ça fonctionne

### 1. Paiements CRYPTO (NOWPayments) ✅ Déjà connecté

```
Client paie en BTC/ETH/USDC/SOL via NOWPayments
         ↓
Webhook: /api/webhook/nowpayments
         ↓
Enregistré dans: crypto_payments (table SQL)
         ↓
Visible dans: Calculateurs fiscaux
```

**Code:** [web/app/api/webhook/nowpayments/route.js](web/app/api/webhook/nowpayments/route.js) ✅

**Ce qui est enregistré:**
- Montant (en valeur EUR)
- Crypto utilisée (BTC, ETH, SOL, USDC)
- Plan (explorer, pro, enterprise)
- Status (confirmed)
- Date

### 2. Paiements FIAT (Lemon Squeezy) ✅ NOUVEAU - Connecté

```
Client paie par carte bancaire via Lemon Squeezy
         ↓
Webhook: /api/webhook/lemonsqueezy
         ↓
Enregistré dans: fiat_payments (table SQL) ← NOUVEAU
         ↓
Visible dans: Calculateurs fiscaux
```

**Code:** [web/app/api/webhook/lemonsqueezy/route.js](web/app/api/webhook/lemonsqueezy/route.js) ✅ Modifié

**Ce qui est enregistré:**
- Montant TTC (en EUR)
- Montant HT (calculé automatiquement)
- TVA (calculée automatiquement)
- Plan (explorer, pro, enterprise)
- Status (confirmed)
- Date
- Email client

---

## 📊 Tables SQL créées

### Migration 013: fiat_payments

📁 [config/migrations/013_fiat_payments.sql](config/migrations/013_fiat_payments.sql)

**Tables:**
- `fiat_payments` - Tous les paiements carte bancaire
- `all_revenues` (vue) - TOUS les revenus combinés (crypto + fiat)

**À appliquer:**
```bash
# Dans Supabase Dashboard → SQL Editor
# Copier le contenu de: config/migrations/013_fiat_payments.sql
# Exécuter
```

---

## 💰 Vue Unifiée: All Revenues

La vue SQL `all_revenues` combine **automatiquement** les deux sources:

```sql
SELECT
  'crypto' as source,
  amount_usdc as amount_ttc,
  amount_usdc / 1.20 as amount_ht,
  tier,
  created_at
FROM crypto_payments
WHERE status = 'confirmed'

UNION ALL

SELECT
  'fiat' as source,
  amount_eur as amount_ttc,
  amount_ht,
  tier,
  payment_date
FROM fiat_payments
WHERE status = 'confirmed';
```

**Résultat:** Vous voyez TOUS vos revenus dans une seule requête ! 🎉

---

## 🧮 Calculateurs mis à jour

### 1. Calculateur fiscal France

📁 [web/app/dashboard/tax-calculator-france/page.js](web/app/dashboard/tax-calculator-france/page.js)

**Utilise:**
- `crypto_payments` - Paiements crypto
- `fiat_payments` - Paiements carte bancaire (NOUVEAU)
- `staking_rewards` - Récompenses staking
- `expenses` - Dépenses

**Calcule:**
- IS sur TOUS les revenus (crypto + fiat)
- TVA sur TOUS les revenus
- Bénéfice imposable total

### 2. Calculateur obligations FIAT

📁 [web/app/dashboard/fiat-obligations/page.js](web/app/dashboard/fiat-obligations/page.js)

**Utilise:**
- Tous les revenus (crypto + fiat)
- Calcule combien convertir en fiat
- Prend en compte les paiements déjà en EUR (Lemon Squeezy)

**Logique:**
```
Revenus crypto:     40 000€ (BTC, ETH, SOL)
Revenus fiat:       20 000€ (Lemon Squeezy - déjà en EUR)
                    ───────────
TOTAL revenus:      60 000€

Obligations FIAT:   18 000€ (IS + TVA + CFE)

Déjà en EUR:        20 000€ (Lemon Squeezy) ✅
Manque:                  0€

Crypto à convertir:      0€ (vous avez déjà assez de fiat!)
Crypto à garder:    40 000€ 🚀
```

**Résultat:** Si vous recevez des paiements carte bancaire, vous avez **moins besoin** de convertir vos cryptos ! 🎯

---

## 📈 Exemple complet année 2025

### Vos revenus

```
CRYPTO (NOWPayments):
  - 50 clients à 49€/mois en USDC
  - Total: 24 500€
  - Staking SOL: 2 000€
  ───────────────────────
  Sous-total crypto: 26 500€

FIAT (Lemon Squeezy):
  - 30 clients à 49€/mois par carte
  - Total: 14 700€
  ───────────────────────
  Sous-total fiat: 14 700€

═══════════════════════════════
TOTAL REVENUS: 41 200€
═══════════════════════════════
```

### Obligations fiscales

```
IS (15%):            4 680€
TVA (nette):         6 200€
CFE:                   500€
Delock:              1 200€
───────────────────────
TOTAL à payer:      12 580€
```

### Stratégie optimale

```
FIAT déjà reçu (Lemon Squeezy): 14 700€ ✅

Besoin FIAT total:              12 580€
Déjà disponible:               -14 700€
───────────────────────────────────────
SURPLUS FIAT:                    2 120€

CRYPTO à convertir:                  0€ ✅
CRYPTO à garder:                26 500€ 🚀

Bonus: Le surplus de 2 120€ peut être:
  - Converti en crypto (USDC → BTC)
  - Gardé en EUR pour sécurité
  - Utilisé pour payer dépenses futures
```

**Conclusion:** Grâce au mix crypto + fiat, vous pouvez garder **100% de vos cryptos** ! 🎉

---

## 🎯 Avantages du système automatique

### 1. Gain de temps

❌ **Avant (manuel):**
```
1. Recevoir paiement Lemon Squeezy
2. Noter manuellement dans Excel
3. Calculer TVA à la main
4. Importer dans compta
5. Risque d'oubli ou erreur
```

✅ **Maintenant (automatique):**
```
1. Recevoir paiement
   → Webhook enregistre tout automatiquement
2. Ouvrir calculateur
   → Tout est déjà là !
```

**Temps économisé:** 30 min/jour = 15h/mois ! 🚀

### 2. Précision

- ✅ Montants HT/TVA calculés automatiquement
- ✅ Pas d'erreur de saisie manuelle
- ✅ Toujours à jour en temps réel
- ✅ Historique complet conservé

### 3. Optimisation fiscale

- ✅ Voit le **vrai mix** crypto/fiat
- ✅ Sait exactement combien convertir
- ✅ Maximise les cryptos gardés
- ✅ Minimise les conversions inutiles

---

## 🔧 Configuration requise

### Étape 1: Appliquer la migration SQL

```bash
# Supabase Dashboard → SQL Editor
# Copier: config/migrations/013_fiat_payments.sql
# Exécuter
```

**Vérifie que les tables existent:**
```sql
SELECT * FROM fiat_payments LIMIT 1;
SELECT * FROM all_revenues LIMIT 10;
```

### Étape 2: Tester les webhooks

**NOWPayments (crypto):**
```bash
# Test déjà fait, fonctionne ✅
```

**Lemon Squeezy (fiat):**
```bash
# Faire un paiement test
# Vérifier dans Supabase:
SELECT * FROM fiat_payments ORDER BY created_at DESC LIMIT 5;
```

### Étape 3: Utiliser les calculateurs

```bash
cd web
npm run dev

# Ouvrir:
http://localhost:3000/dashboard/tax-calculator-france
http://localhost:3000/dashboard/fiat-obligations
```

**Vous devriez voir:**
- Paiements crypto (NOWPayments)
- Paiements fiat (Lemon Squeezy)
- Total combiné automatiquement

---

## 📊 Où voir vos données

### Dans Supabase Dashboard

**Paiements crypto:**
```sql
SELECT
  created_at::date as date,
  tier,
  amount_usdc,
  status
FROM crypto_payments
WHERE status = 'confirmed'
ORDER BY created_at DESC;
```

**Paiements fiat:**
```sql
SELECT
  payment_date::date as date,
  tier,
  amount_eur as ttc,
  amount_ht as ht,
  tva_amount as tva
FROM fiat_payments
WHERE status = 'confirmed'
ORDER BY payment_date DESC;
```

**Tout combiné:**
```sql
SELECT
  source,
  payment_date::date as date,
  tier,
  amount_ttc,
  amount_ht
FROM all_revenues
ORDER BY payment_date DESC
LIMIT 50;
```

### Dans les calculateurs

**Calculateur fiscal France:**
- Section "Détails" → Onglet "Paiements crypto"
- Voir aussi les paiements fiat
- Total combiné

**Calculateur obligations FIAT:**
- Carte "Crypto reçus" → Inclut tout
- Déjà en FIAT → Montant Lemon Squeezy
- À convertir → Crypto restants

---

## 🎉 Résumé

**Vous avez maintenant:**

✅ **Automatisation complète**
- Crypto (NOWPayments) → `crypto_payments`
- Fiat (Lemon Squeezy) → `fiat_payments`
- Vue unifiée → `all_revenues`

✅ **Calculateurs intelligents**
- Savent combien vous avez en crypto
- Savent combien vous avez en fiat
- Optimisent la conversion automatiquement

✅ **Zéro saisie manuelle**
- Webhooks enregistrent tout
- Calculs automatiques HT/TVA
- Mise à jour temps réel

✅ **Maximum de crypto gardé**
- Si paiements fiat suffisent → 0€ crypto à convertir
- Si paiements fiat insuffisants → Conversion minimale
- Toujours le calcul optimal

---

## 🚀 Prochaines étapes

### 1. Appliquer la migration (5 min)

```bash
# Supabase → SQL Editor
# Copier 013_fiat_payments.sql
# Exécuter
```

### 2. Tester avec un vrai paiement (10 min)

- Faire paiement test Lemon Squeezy
- Vérifier dans Supabase `fiat_payments`
- Ouvrir calculateur → voir apparaître

### 3. Routine mensuelle (5 min)

```bash
# Ouvrir calculateurs
http://localhost:3000/dashboard/tax-calculator-france

# Tout est déjà là automatiquement ! 🎉
```

---

**Vous ne perdez plus la tête, tout est automatique !** 😌🚀

*Créé le 2025-01-03*
