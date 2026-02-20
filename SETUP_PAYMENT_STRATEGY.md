# 🚀 Quick Start - Dual Payment Strategy

Guide rapide pour déployer la stratégie de paiement dual Lemon Squeezy + MoonPay Commerce.

## ⚡ Setup Rapide (15 min)

### 1. Créer les Comptes (5 min)

#### MoonPay Commerce
```bash
1. Aller sur https://www.moonpay.com/business
2. Créer un compte Business
3. Compléter KYC (prend 1-2 jours)
4. Récupérer les clés API :
   - Dashboard → Settings → API Keys
   - Copier Publishable Key (pk_live_xxxxx)
   - Copier Secret Key (sk_live_xxxxx)
```

#### Safe Wallet
```bash
1. Aller sur https://app.safe.global
2. Connect ton wallet
3. Créer un Safe multisig sur Polygon
4. Copier l'adresse (0x...)
```

### 2. Configuration .env (2 min)

Copier `.env.example` vers `.env` et ajouter :

```bash
# MoonPay
NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY=pk_live_xxxxx
MOONPAY_SECRET_KEY=sk_live_xxxxx
MOONPAY_WEBHOOK_SECRET=whsec_xxxxx
MOONPAY_RECEIVER_WALLET_ADDRESS=0xYourSafeAddress

# Lemon Squeezy (déjà configuré normalement)
LEMON_SQUEEZY_API_KEY=xxxxx
LEMON_SQUEEZY_STORE_ID=xxxxx
```

### 3. Database Migration (2 min)

#### Option A: Via Supabase Dashboard (Recommandé)
```bash
1. Ouvrir https://app.supabase.com
2. Ton projet → SQL Editor
3. Copier le contenu de config/migrations/210_moonpay_crypto_transactions.sql
4. Run
```

#### Option B: Via CLI
```bash
psql $DATABASE_URL < config/migrations/210_moonpay_crypto_transactions.sql
```

### 4. Configurer les Webhooks (3 min)

#### MoonPay Webhook
```bash
1. MoonPay Dashboard → Settings → Webhooks
2. Add Endpoint
   URL: https://safescoring.io/api/webhook/moonpay
3. Events à sélectionner:
   ✅ transaction.completed
   ✅ transaction.failed
   ✅ transaction.pending
4. Copier le Webhook Secret → MOONPAY_WEBHOOK_SECRET
```

#### Lemon Squeezy Webhook (vérifier existant)
```bash
1. Lemon Squeezy Dashboard → Settings → Webhooks
2. Vérifier URL: https://safescoring.io/api/webhook/lemonsqueezy
3. Events:
   ✅ order_created
   ✅ subscription_created
   ✅ subscription_updated
```

### 5. Deploy & Test (3 min)

```bash
# 1. Build
npm run build

# 2. Deploy (Vercel)
vercel --prod

# 3. Test le flow
# Ouvrir https://safescoring.io/pricing
# Cliquer "Get Started" sur un plan
# Vérifier la redirection vers /checkout/smart
```

## ✅ Checklist de Validation

Après déploiement, tester ces scénarios :

### Test 1: EU B2C (Particulier français)
- [ ] Aller sur /checkout/smart?plan=professional
- [ ] Sélectionner France
- [ ] Sélectionner "Individual"
- [ ] Vérifier prix avec TVA 20%
- [ ] Vérifier routing vers Lemon Squeezy

### Test 2: EU B2B (Entreprise allemande)
- [ ] Sélectionner Germany
- [ ] Sélectionner "Business"
- [ ] Entrer un faux VAT: DE123456789
- [ ] Vérifier prix HT (sans TVA)
- [ ] Vérifier routing vers MoonPay

### Test 3: Non-EU (US)
- [ ] Sélectionner United States
- [ ] Vérifier skip de l'étape "Business or Individual"
- [ ] Vérifier prix sans TVA
- [ ] Vérifier routing vers MoonPay

### Test 4: Webhook MoonPay (Test Payment)
```bash
# Faire un vrai paiement test avec MoonPay Sandbox
1. Utiliser MoonPay Sandbox environment
2. Compléter un paiement test
3. Vérifier logs webhook : /api/webhook/moonpay
4. Vérifier table crypto_transactions (status = completed)
5. Vérifier activation subscription dans users table
```

## 🎯 Premier Vrai Paiement

Quand tout est testé :

1. **Passer en Production**
   ```bash
   # Remplacer sandbox keys par live keys
   NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY=pk_live_xxxxx
   MOONPAY_SECRET_KEY=sk_live_xxxxx
   ```

2. **Activer les Paiements**
   ```bash
   # MoonPay Dashboard → Settings → Go Live
   ```

3. **Monitorer**
   ```bash
   # Vérifier Supabase Dashboard
   SELECT * FROM crypto_transactions ORDER BY created_at DESC LIMIT 10;

   # Vérifier Safe Wallet
   https://app.safe.global/balances
   ```

## 📊 Monitoring Setup

### Dashboard Supabase

Créer une vue pour surveiller les paiements :

```sql
CREATE VIEW payment_overview AS
SELECT
  provider,
  status,
  COUNT(*) as count,
  SUM(amount_usd) as total_usd,
  DATE(created_at) as date
FROM crypto_transactions
GROUP BY provider, status, DATE(created_at)
ORDER BY date DESC;
```

### Alerts Email

TODO: Configurer des alertes email pour :
- [ ] Nouveau paiement MoonPay complété
- [ ] Paiement MoonPay échoué
- [ ] Quota MoonPay atteint
- [ ] Anomalie de pricing (TVA incorrecte)

## 🐛 Troubleshooting

### Erreur: "MOONPAY_RECEIVER_WALLET_ADDRESS not configured"
```bash
# Solution
1. Créer Safe Wallet sur Polygon
2. Copier adresse dans .env
3. Redéployer
```

### Erreur: "Invalid VAT format"
```bash
# C'est normal ! La validation VAT est basique (format uniquement)
# Pour validation complète, utiliser l'API VIES (EU)
# TODO: Intégrer https://ec.europa.eu/taxation_customs/vies/
```

### Webhook MoonPay ne fonctionne pas
```bash
# Debug
1. Vérifier MoonPay Dashboard → Webhooks → Recent Deliveries
2. Vérifier logs Vercel
3. Tester signature webhook :
   curl -X POST https://safescoring.io/api/webhook/moonpay \
     -H "moonpay-signature: test" \
     -d '{"type":"transaction.completed","data":{}}'
```

### Détection géographique incorrecte
```bash
# La détection utilise :
# 1. Cloudflare header (le plus fiable)
# 2. Browser locale (fallback)

# Vérifier header Cloudflare :
curl -I https://safescoring.io | grep CF-IPCountry

# Si pas de header → vérifier Cloudflare proxy activé
```

## 💡 Optimisations Futures

- [ ] Fallback automatique si MoonPay rate limit atteint
- [ ] Support multi-crypto (BTC, ETH, SOL en plus de USDC)
- [ ] Intégration VIES API pour validation VAT complète
- [ ] Auto-stake USDC reçus via Brahma
- [ ] Dashboard analytics paiements crypto vs fiat
- [ ] A/B test du flow (1-step vs 3-step checkout)

## 📞 Support

Si problème :

1. **Vérifier logs Vercel** : https://vercel.com/dashboard
2. **Vérifier Supabase logs** : SQL Editor → Recent Queries
3. **MoonPay Support** : https://support.moonpay.com
4. **Lemon Squeezy Support** : https://lemonsqueezy.com/help

---

**Temps total de setup** : ~15-20 minutes (sans compter KYC MoonPay qui prend 1-2 jours)

Une fois validé, la stratégie tourne en automatique ! 🚀
