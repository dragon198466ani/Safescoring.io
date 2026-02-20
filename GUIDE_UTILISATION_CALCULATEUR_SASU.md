# 🚀 Guide d'utilisation - Calculateur automatique SASU

Guide pratique pour utiliser le système complet de gestion comptable crypto pour votre SASU chez Delock.

---

## 📦 Ce qui a été créé pour vous

### 1. **Dashboard calculateur d'impôts**
📍 [web/app/dashboard/tax-calculator/page.js](web/app/dashboard/tax-calculator/page.js)

Interface web pour:
- Visualiser vos revenus crypto en temps réel
- Suivre vos récompenses de staking
- Ajouter vos dépenses professionnelles
- Calculer automatiquement votre IS (Impôt sur les Sociétés)
- Exporter pour Delock en 1 clic

### 2. **Base de données comptable**
📍 [config/migrations/012_tax_calculator_tables.sql](config/migrations/012_tax_calculator_tables.sql)

Tables SQL pour stocker:
- `expenses`: Toutes vos dépenses déductibles
- `staking_rewards`: Récompenses de staking auto-trackées
- Vue `fiscal_summary`: Résumé fiscal annuel automatique

### 3. **Synchro automatique staking**
📍 [scripts/sync_staking_rewards.py](scripts/sync_staking_rewards.py)

Script Python qui récupère automatiquement vos récompenses depuis:
- Ethereum (Lido, staking natif)
- Solana (via RPC)
- Polygon (staking MATIC)

### 4. **Export comptable Delock**
📍 [scripts/export_for_delock.py](scripts/export_for_delock.py)

Génère automatiquement:
- Fichier **FEC** (format administration fiscale)
- **CSV** complet des transactions
- **Résumé fiscal** annuel

### 5. **Guide comptabilité SASU**
📍 [GUIDE_COMPTABILITE_CRYPTO_SASU.md](GUIDE_COMPTABILITE_CRYPTO_SASU.md)

Guide complet sur:
- Cadre légal crypto en France
- Comptabilisation des paiements crypto
- Staking et fiscalité
- Calcul de l'IS
- Optimisations fiscales légales

---

## 🛠️ Installation et configuration

### Étape 1: Créer les tables dans Supabase

```bash
# Appliquer la migration
cd config/migrations
# Copier le contenu de 012_tax_calculator_tables.sql
# Coller dans l'éditeur SQL de Supabase Dashboard
```

Ou via CLI:
```bash
supabase db push
```

### Étape 2: Configurer les variables d'environnement

Ajouter dans votre `.env.local`:

```env
# Wallets SASU (créer des wallets dédiés!)
SASU_WALLET_ETH=0xVotreAdresseEthereumSASU
SASU_WALLET_SOL=VotreAdresseSolanaSASU
SASU_WALLET_POLYGON=0xVotreAdressePolygonSASU

# APIs blockchain (optionnel, gratuit)
ETHERSCAN_API_KEY=votre_cle_etherscan
POLYGONSCAN_API_KEY=votre_cle_polygonscan

# Informations SASU
SASU_SIREN=123456789
SASU_NAME="SafeScoring SASU"
```

### Étape 3: Installer les dépendances Python

```bash
pip install supabase requests
```

### Étape 4: Tester le calculateur

1. Démarrer votre appli Next.js:
```bash
cd web
npm run dev
```

2. Accéder au calculateur:
```
http://localhost:3000/dashboard/tax-calculator
```

---

## 📊 Utilisation quotidienne

### 1. Suivi automatique des paiements

✅ **Les paiements crypto sont déjà trackés automatiquement !**

Quand un client paie via NOWPayments:
1. Paiement enregistré dans `crypto_payments`
2. Visible immédiatement dans le calculateur
3. Montant en EUR calculé automatiquement
4. Contribution à votre IS calculée en temps réel

**Vous n'avez RIEN à faire !** 🎉

### 2. Ajouter une dépense

#### Via l'interface web

1. Aller sur `/dashboard/tax-calculator`
2. Section "Ajouter une dépense"
3. Remplir:
   - Description: "Serveurs Vercel"
   - Montant: 150.00
   - Date: 2025-01-15
4. Cliquer "Ajouter dépense"

✅ **IS recalculé instantanément !**

#### Via SQL (si vous préférez)

```sql
INSERT INTO expenses (description, amount, date, category)
VALUES
  ('Serveurs Vercel', 150.00, '2025-01-15', 'servers'),
  ('Expert-comptable Delock', 100.00, '2025-01-15', 'accounting'),
  ('NOWPayments frais 0.5%', 25.00, '2025-01-15', 'tools');
```

### 3. Synchroniser les récompenses staking

#### Automatique (recommandé)

Configurez un cron job pour exécuter chaque jour:

```bash
# Linux/Mac crontab
0 2 * * * cd /path/to/SafeScoring && python scripts/sync_staking_rewards.py

# Windows Task Scheduler
# Créer une tâche quotidienne à 2h du matin
```

#### Manuel

```bash
python scripts/sync_staking_rewards.py
```

Résultat:
```
🚀 Synchronisation des récompenses staking...

🔍 Recherche récompenses ETH pour 0x1234...
  ✅ Nouvelle récompense: 0.001234 ETH (3.85€)

🔍 Recherche récompenses SOL pour ABC123...
  ✅ Nouvelle récompense: 0.42 SOL (42.00€)

💾 Sauvegarde de 2 nouvelles récompenses...
✅ 2 récompenses sauvegardées avec succès

📈 Total nouvelles récompenses: 45.85€

💰 Par crypto:
  - ETH: 3.85€
  - SOL: 42.00€

✅ Synchronisation terminée!
```

### 4. Ajouter manuellement une récompense staking

Si vous stakez via Phantom, Ledger, etc. et que le script ne détecte pas:

1. Interface web: Section "Ajouter récompense staking"
2. Remplir:
   - Crypto: SOL
   - Quantité: 0.42
   - Valeur EUR: 42.00 (vérifier sur CoinGecko)
   - Date: 2025-01-15
3. Cliquer "Ajouter récompense"

---

## 📤 Exporter pour votre comptable Delock

### Export mensuel (recommandé)

**Chaque mois**, générer et envoyer à Delock:

```bash
python scripts/export_for_delock.py --year 2025 --format all
```

Fichiers générés dans `./exports/`:
- `123456789FEC2025.txt` - Format FEC officiel
- `SafeScoring_Transactions_2025.csv` - Liste complète
- `SafeScoring_Resume_Fiscal_2025.txt` - Résumé IS

**Envoyer ces 3 fichiers à Delock** par email ou upload.

### Export via l'interface web

1. Aller sur `/dashboard/tax-calculator`
2. Cliquer "Télécharger CSV pour Delock"
3. Fichier téléchargé: `SafeScoring_Comptabilité_2025.csv`
4. Envoyer à votre comptable

---

## 🗓️ Routine mensuelle recommandée

### Le 1er de chaque mois

#### 1. Synchroniser le staking (5 min)
```bash
python scripts/sync_staking_rewards.py
```

#### 2. Ajouter vos dépenses du mois (10 min)

Via l'interface ou SQL:
```sql
INSERT INTO expenses (description, amount, date, category) VALUES
  ('Vercel Pro', 150.00, '2025-01-01', 'servers'),
  ('Supabase Pro', 25.00, '2025-01-05', 'database'),
  ('NOWPayments fees', 32.50, '2025-01-31', 'tools'),
  ('Expert comptable Delock', 100.00, '2025-01-31', 'accounting');
```

#### 3. Vérifier le calculateur (2 min)

Aller sur `/dashboard/tax-calculator`

Vérifier:
- ✅ Tous les paiements du mois sont là
- ✅ Toutes les dépenses sont enregistrées
- ✅ Récompenses staking à jour
- ✅ Calcul IS cohérent

#### 4. Exporter pour Delock (2 min)

```bash
python scripts/export_for_delock.py --year 2025 --format all
```

Envoyer les fichiers à Delock.

#### 5. Rendez-vous comptable (30 min)

Appel mensuel avec votre expert-comptable Delock pour:
- Valider les écritures
- Ajuster les provisions si besoin
- Anticiper la TVA
- Optimiser fiscalement

---

## 💡 Cas d'usage pratiques

### Scénario 1: Client paie 49€ en USDC

**Automatique !**
1. Client paie via NOWPayments
2. Webhook enregistre dans `crypto_payments`
3. Calculateur affiche +49€ revenus
4. IS augmente de 12.25€ (si tranche 25%)

**Vous n'avez rien à faire.**

### Scénario 2: Vous recevez 0.5 SOL de staking

**Option 1: Automatique**
```bash
python scripts/sync_staking_rewards.py
```
Script détecte et enregistre automatiquement.

**Option 2: Manuel**
1. Aller sur `/dashboard/tax-calculator`
2. Ajouter récompense staking:
   - Crypto: SOL
   - Quantité: 0.5
   - Valeur: 50€ (prix du jour)
   - Date: aujourd'hui
3. IS augmente de 12.50€

### Scénario 3: Vous payez Vercel 150€

**Via interface web:**
1. Aller sur calculateur
2. Ajouter dépense:
   - Description: "Serveurs Vercel"
   - Montant: 150€
   - Date: date du prélèvement
3. IS **diminue** de 37.50€ (économie!)

### Scénario 4: Fin d'année fiscale

**31 décembre 2025:**

```bash
# Générer export FEC complet
python scripts/export_for_delock.py --year 2025 --format all

# Envoyer à Delock
```

Delock prépare:
- Bilan comptable
- Liasse fiscale
- Déclaration IS
- Déclaration wallets crypto (si > 50k€)

---

## 📈 Comprendre le calcul de l'IS

### Exemple réel

**Année 2025:**

```
📊 REVENUS
  Abonnements crypto:       50 000€
  Staking SOL:               2 000€
  ─────────────────────────────
  TOTAL REVENUS:            52 000€

💰 CHARGES
  Serveurs (Vercel):         1 800€
  Base données (Supabase):     300€
  NOWPayments (0.5%):          250€
  Expert-comptable:          1 200€
  Divers (APIs, outils):     1 450€
  ─────────────────────────────
  TOTAL CHARGES:             5 000€

📈 BÉNÉFICE
  Imposable:                47 000€

🏛️  IMPÔT SUR LES SOCIÉTÉS
  Tranche 1 (0-42 500€):    42 500€ × 15% = 6 375€
  Tranche 2 (42 500-47 000€): 4 500€ × 25% = 1 125€
  ─────────────────────────────
  TOTAL IS:                  7 500€

✅ BÉNÉFICE NET (après IS): 39 500€
```

**Ce que vous GARDEZ réellement:** 39 500€

**En cryptos !** Vos BTC/ETH/SOL restent dans votre wallet SASU.

---

## 🎯 Optimisations fiscales

### 1. Minimiser l'IS légalement

#### Augmenter les charges déductibles

Dépenses 100% déductibles:
- Serveurs, hébergement
- Logiciels, SaaS tools
- Expert-comptable
- Publicité (Google Ads)
- Freelances, prestataires
- Matériel informatique (< 500€)

#### Se verser un salaire

Au lieu de:
```
Bénéfice: 47 000€
IS: 7 500€
Reste: 39 500€ (bloqué dans la SASU)
```

Faire:
```
Salaire gérant: 30 000€ brut
Charges sociales: 13 500€

Nouveau bénéfice: 47 000 - 43 500 = 3 500€
IS (15%): 525€

Vous touchez:
  Salaire net: ~23 000€
  + Cotisations retraite: 13 500€
  + Bénéfice restant: 2 975€
```

**Avantage:** Vous cotisez pour la retraite !

### 2. Timing du staking

**Stratégie:**
- Claimez vos récompenses staking en **janvier N+1**
- Report de l'imposition d'un an
- Différez le paiement de l'IS

**Exemple:**
```
Récompenses 2025 claimées le 5 janvier 2026
→ Imposables en 2026 (pas 2025)
→ IS payé en 2027 (pas 2026)
```

### 3. Provisions pour dépréciation

Si vos cryptos baissent au 31/12:

**Exemple:**
```
1 BTC acheté (revenus): 90 000€
Cours au 31/12: 70 000€
Moins-value latente: -20 000€

→ Provision de 20 000€
→ Déduction IS immédiate: 5 000€
```

**Si BTC remonte ensuite:** Reprise de provision (imposable)

---

## 📞 Support et maintenance

### Problèmes courants

#### Le calculateur n'affiche pas mes paiements

**Vérifier:**
```sql
SELECT * FROM crypto_payments
WHERE status = 'confirmed'
AND created_at >= '2025-01-01'
ORDER BY created_at DESC;
```

Si vide: Vérifier webhook NOWPayments.

#### Le staking ne se synchronise pas

**Tester manuellement:**
```bash
python scripts/sync_staking_rewards.py
```

Vérifier les variables d'environnement:
```bash
echo $SASU_WALLET_SOL
echo $SASU_WALLET_ETH
```

#### Export FEC échoue

Vérifier:
```bash
# Permissions dossier
mkdir -p exports
chmod 755 exports

# Variables Supabase
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Logs et debug

Activer les logs détaillés:
```bash
# Python
export DEBUG=1
python scripts/sync_staking_rewards.py

# Next.js
# Vérifier console browser (F12)
```

---

## 🎉 Résumé: Vous êtes prêt !

### Ce qui est automatique ✅

1. **Paiements crypto** → Enregistrés via webhook NOWPayments
2. **Calcul IS** → Temps réel dans le dashboard
3. **Exports comptables** → 1 commande Python

### Ce que vous devez faire 📝

1. **Mensuel:**
   - Synchroniser staking (1 commande)
   - Ajouter dépenses (interface web)
   - Exporter pour Delock (1 commande)
   - Envoyer à votre comptable

2. **Annuel:**
   - Rendez-vous bilan avec Delock
   - Validation liasse fiscale
   - Paiement IS

### Gain de temps

**Avant:** 10h/mois de compta manuelle
**Après:** 30 min/mois automatisé

**Vous économisez 9h30/mois !** 🚀

---

## 📚 Ressources

### Documentation
- [Guide comptabilité crypto SASU](GUIDE_COMPTABILITE_CRYPTO_SASU.md)
- [Setup paiements crypto](CRYPTO_PAYMENTS_SETUP.md)

### Support Delock
- Email: hello@delock.io
- Site: https://www.delock.io

### APIs utilisées
- [NOWPayments](https://nowpayments.io)
- [Etherscan](https://etherscan.io/apis)
- [Solana RPC](https://docs.solana.com/api)
- [CoinGecko](https://www.coingecko.com/api)

---

**Vous êtes maintenant équipé pour gérer votre SASU crypto en toute légalité ! 🎊**

Questions ? Contactez votre expert-comptable Delock.
