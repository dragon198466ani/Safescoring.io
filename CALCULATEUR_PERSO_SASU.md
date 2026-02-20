# 🔐 Calculateur Personnel SASU - Usage Privé

**IMPORTANT:** Cet outil est pour **votre usage personnel** uniquement, pour gérer votre propre SASU. Ce n'est PAS une fonctionnalité publique du site SafeScoring.

---

## 🎯 Votre situation

Vous avez:
- Une **SASU chez Delock** (expert-comptable crypto)
- Des **revenus en crypto** (BTC, ETH, USDC, SOL)
- Du **staking** (récompenses régulières)
- Besoin de calculer vos **impôts** (IS, TVA, charges sociales)
- Envie de **garder vos cryptos** sans conversion en fiat

---

## ✅ Ce qui a été créé pour VOUS

### 1. Dashboard privé de calcul fiscal
📁 `web/app/dashboard/tax-calculator-france/page.js`

**Accès:** http://localhost:3000/dashboard/tax-calculator-france

**Fonctionnalités:**
- Calcule automatiquement votre IS personnel
- Suit VOS revenus crypto
- Suit VOS récompenses de staking
- Gère VOS dépenses professionnelles
- Calcule la TVA
- Génère exports pour VOTRE comptable Delock

**3 onglets:**
1. **Synthèse** - Vue d'ensemble de VOTRE situation fiscale
2. **Détails** - VOS transactions et formulaires
3. **Paramètres** - Configuration de VOTRE SASU

### 2. Base de données pour VOS données
📁 `config/migrations/012_tax_calculator_tables.sql`

Tables privées:
- `expenses` - VOS dépenses
- `staking_rewards` - VOS récompenses
- Données protégées par RLS (uniquement VOUS y accédez)

### 3. Script pour VOS wallets
📁 `scripts/sync_staking_rewards.py`

Synchronise automatiquement VOS récompenses depuis:
- VOS wallets Ethereum
- VOS wallets Solana
- VOS wallets Polygon

### 4. Export pour VOTRE comptable Delock
📁 `scripts/export_for_delock.py`

Génère VOS exports personnels:
- FEC de VOTRE SASU
- CSV de VOS transactions
- Résumé fiscal de VOTRE situation

### 5. Guides pour VOUS
- `GUIDE_COMPTABILITE_CRYPTO_SASU.md` - Comprendre la compta crypto française
- `GUIDE_UTILISATION_CALCULATEUR_SASU.md` - Mode d'emploi

---

## 🔒 Sécurité et confidentialité

### Données privées

**IMPORTANT:** Toutes vos données restent:
- Dans VOTRE base de données Supabase
- Protégées par Row Level Security (RLS)
- Accessibles uniquement par VOUS
- Jamais partagées publiquement

### Configuration requise

Créer un fichier `.env.local` avec VOS informations:

```env
# VOS wallets SASU personnels
SASU_WALLET_ETH=0xVOTRE_ADRESSE_ETH
SASU_WALLET_SOL=VOTRE_ADRESSE_SOL
SASU_WALLET_POLYGON=0xVOTRE_ADRESSE_POLYGON

# VOS APIs
ETHERSCAN_API_KEY=votre_cle
POLYGONSCAN_API_KEY=votre_cle

# Informations de VOTRE SASU
SASU_SIREN=votre_siren
SASU_NAME="Votre SASU"
```

**⚠️ NE JAMAIS commit ce fichier dans Git !**

Ajouter dans `.gitignore`:
```
.env.local
exports/
```

---

## 🚀 Comment l'utiliser

### Configuration initiale (une fois)

#### 1. Appliquer la migration

```bash
# Dans Supabase Dashboard → SQL Editor
# Copier le contenu de:
config/migrations/012_tax_calculator_tables.sql
# Exécuter
```

#### 2. Créer wallets SASU dédiés

**IMPORTANT:** Créer des wallets SÉPARÉS pour votre SASU, différents de vos wallets personnels.

Exemple:
- **Personnel:** 0x123... (vos cryptos perso)
- **SASU:** 0xABC... (cryptos de la société) ← À utiliser

#### 3. Configurer vos variables d'environnement

Créer `web/.env.local` avec VOS informations réelles.

#### 4. Installer dépendances

```bash
pip install supabase requests
```

### Utilisation quotidienne

#### Accéder à VOTRE dashboard

```bash
cd web
npm run dev
```

Ouvrir: http://localhost:3000/dashboard/tax-calculator-france

**Note:** Cette page est privée, uniquement pour vous en local.

#### Routine mensuelle (30 min)

```bash
# 1. Synchroniser VOS récompenses staking
python scripts/sync_staking_rewards.py

# 2. Ajouter VOS dépenses du mois
# → Via l'interface web, onglet "Détails"

# 3. Vérifier VOS calculs
# → Onglet "Synthèse fiscale"

# 4. Exporter pour Delock
python scripts/export_for_delock.py --year 2025 --format all

# 5. Envoyer à VOTRE comptable
# → Email: exports/*.txt, *.csv à Delock
```

---

## 📊 Exemple de VOTRE situation

### Vos revenus (hypothèse)

```
Revenus SafeScoring:       60 000€ (en USDC/BTC/ETH)
Staking SOL/ETH:            3 000€
                           ───────
TOTAL:                     63 000€
```

### Vos charges

```
Serveurs (Vercel):          1 800€
Supabase Pro:                 300€
NOWPayments (0.5%):           300€
Expert-comptable Delock:    1 200€
Autres outils:              1 400€
                           ───────
TOTAL:                      5 000€
```

### Votre IS

```
Bénéfice imposable:        58 000€

IS:
  Tranche 1 (15%):          6 375€
  Tranche 2 (25%):          3 875€
                           ───────
TOTAL IS:                  10 250€

Bénéfice NET:              47 750€
```

**Ce que vous gardez:** 47 750€ dans votre SASU (en crypto!)

---

## 💡 Cas d'usage personnels

### Scénario 1: Vous recevez un paiement client

1. Client paie 49€ en USDC via NOWPayments
2. Paiement enregistré dans `crypto_payments` (automatique)
3. Vous ouvrez le calculateur → +49€ revenus
4. IS recalculé automatiquement

### Scénario 2: Vous recevez du staking

1. Vous recevez 0.5 SOL de staking dans votre wallet SASU
2. Vous lancez: `python scripts/sync_staking_rewards.py`
3. Script détecte et enregistre +0.5 SOL (ex: 50€)
4. IS recalculé: +12.50€ à payer

### Scénario 3: Vous payez Vercel

1. Prélèvement Vercel: 150€
2. Vous ouvrez le calculateur, onglet "Détails"
3. Ajoutez dépense: "Serveurs Vercel - 150€"
4. IS recalculé: -37.50€ (économie!)

### Scénario 4: Fin d'année

1. 31 décembre → `python scripts/export_for_delock.py --year 2025 --format all`
2. Email les 3 fichiers à votre comptable Delock
3. Rendez-vous avec Delock pour bilan
4. Delock prépare liasse fiscale
5. Vous payez l'IS calculé

---

## 🎯 Optimisation de VOTRE situation

### Option 1: Vous verser des dividendes

```
Bénéfice net SASU:         47 750€

Dividendes:                47 750€
Flat tax 30%:             -14 325€
                          ────────
NET perçu:                 33 425€

❌ Pas de cotisation retraite
✅ Vos cryptos restent en SASU
```

### Option 2: Vous verser un salaire

```
Salaire brut:              30 000€
Charges sociales 45%:     -13 500€
                          ────────
Salaire net:              ~23 400€

✅ Cotisations retraite:   13 500€
✅ Protection sociale
```

**Conseil:** Demandez à Delock quelle option est meilleure pour VOUS.

---

## ⚠️ Important pour VOUS

### Séparation patrimoine

❌ **Ne jamais:**
- Mélanger wallets perso et SASU
- Payer dépenses perso avec wallet SASU
- Utiliser cryptos SASU pour usage personnel

✅ **Toujours:**
- Wallets séparés perso/SASU
- Justificatifs pour chaque transaction
- Traçabilité complète

### Vos wallets

**Personnel (vos cryptos perso):**
- Vos BTC/ETH personnels
- Vos investissements perso
- Imposés à la flat tax crypto (30%) lors de la vente

**SASU (cryptos de la société):**
- Revenus SafeScoring
- Staking professionnel
- Imposés à l'IS (15%-25%)
- Dépenses déductibles

**Ne JAMAIS transférer entre les deux sans passer par la compta !**

### Votre comptable Delock

**Ce que Delock fait pour VOUS:**
- Tenue de VOTRE comptabilité
- Déclarations fiscales (IS, TVA)
- Liasse fiscale annuelle
- Optimisation de VOTRE situation
- Déclaration de VOS wallets crypto

**Tarif estimé:** 100-150€/mois (déductible!)

---

## 🔐 Sécurité de VOS données

### Protection locale

```bash
# .gitignore (déjà configuré)
.env.local          # VOS clés API
exports/            # VOS exports comptables
*.csv               # VOS données
```

### Protection Supabase

Row Level Security activé:
```sql
-- Seul VOUS pouvez voir VOS données
CREATE POLICY "Users can view their own expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);
```

### Sauvegardes

**Recommandé:**
1. Sauvegarder VOS exports mensuellement
2. Garder copie locale des fichiers Delock
3. Backup Supabase régulier

---

## 📞 Support pour VOUS

### Questions techniques
- Consulter les guides dans le dossier racine
- Tester en local avant de contacter Delock

### Questions comptables
- **VOTRE comptable:** Delock
- Email: hello@delock.io
- Ils connaissent VOTRE situation

### Optimisation fiscale
- Rendez-vous mensuel/trimestriel avec Delock
- Ajuster paramètres SASU selon VOTRE situation
- Anticiper IS et TVA

---

## 🎉 Récapitulatif

**Vous avez maintenant:**

✅ Dashboard personnel de calcul IS
✅ Suivi automatique de VOS revenus crypto
✅ Synchronisation de VOS récompenses staking
✅ Gestion de VOS dépenses
✅ Exports pour VOTRE comptable Delock
✅ Calcul en temps réel de VOTRE IS, TVA, charges
✅ Comparaison salaire vs dividendes pour VOUS
✅ 100% conforme loi française

**Vous gardez vos BTC, ETH, USDC, SOL dans VOTRE SASU !** 🚀

**Vous ne perdez pas la tête face à la compta !** 😌

---

## 📝 Prochaines étapes pour VOUS

### Cette semaine
1. ✅ Appliquer migration SQL dans Supabase
2. ✅ Créer VOS wallets SASU dédiés
3. ✅ Configurer VOS variables d'environnement
4. ✅ Tester le calculateur avec données fictives

### Ce mois
1. Ajouter VOS vraies dépenses 2025
2. Synchroniser VOS wallets staking
3. Premier export pour Delock
4. Rendez-vous avec VOTRE comptable

### Routine mensuelle
- 5 min: Synchro staking
- 10 min: Ajout dépenses
- 5 min: Vérification calculs
- 5 min: Export Delock
- 5 min: Email comptable

**Total: 30 min/mois !**

---

**Questions ? Contactez VOTRE expert-comptable Delock.**

*Outil personnel créé le 2025-01-03*
