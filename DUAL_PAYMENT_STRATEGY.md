# Dual Payment Strategy - SafeScoring

## 🎯 Stratégie Globale

SafeScoring utilise une **stratégie de paiement intelligente** qui optimise les revenus crypto tout en restant conforme à la TVA européenne.

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    SAFESCORING.COM                      │
│                                                         │
│              "Where are you located?"                   │
│                                                         │
│         ┌──────────────┴──────────────┐                 │
│         ↓                             ↓                 │
│                                                         │
│   🇪🇺 EUROPE                    🌍 REST OF WORLD        │
│         │                             │                 │
│         ↓                             │                 │
│   "Business or                        │                 │
│    Individual?"                       │                 │
│         │                             │                 │
│    ┌────┴────┐                        │                 │
│    ↓         ↓                        │                 │
│                                       │                 │
│  🏢 B2B    👤 B2C                     │                 │
│    │         │                        │                 │
│    ↓         ↓                        ↓                 │
│                                                         │
│ MOONPAY   LEMON                  MOONPAY                │
│ COMMERCE  SQUEEZY                COMMERCE               │
│    │         │                        │                 │
│    ↓         ↓                        ↓                 │
│                                                         │
│  USDC     FIAT (€)                  USDC                │
│ direct    + TVA gérée              direct               │
│    │         │                        │                 │
│    └─────────┴────────────────────────┘                 │
│                        │                                │
│                        ↓                                │
│                                                         │
│               TON SAFE WALLET                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 📊 Résumé de la Stratégie

| Client Type                        | TVA ? | Solution         | Format  |
|------------------------------------|-------|------------------|---------|
| 🇫🇷 Particulier français           | ✅ 20% | Lemon Squeezy    | Fiat    |
| 🇩🇪 Particulier allemand           | ✅ 19% | Lemon Squeezy    | Fiat    |
| 🇪🇸 Particulier espagnol           | ✅ 21% | Lemon Squeezy    | Fiat    |
| 🏢 Entreprise EU (n° TVA)          | ❌ 0%  | MoonPay Commerce | Crypto  |
| 🇺🇸 Américain                      | ❌ 0%  | MoonPay Commerce | Crypto  |
| 🇯🇵 Japonais                       | ❌ 0%  | MoonPay Commerce | Crypto  |
| 🇧🇷 Brésilien                      | ❌ 0%  | MoonPay Commerce | Crypto  |
| 🌍 Reste du monde                  | ❌ 0%  | MoonPay Commerce | Crypto  |

## 🔑 Avantages Clés

### 1. **Conformité TVA Automatique** 🇪🇺
- Lemon Squeezy = Merchant of Record
- Gère automatiquement la TVA de tous les pays EU
- Factures conformes générées automatiquement
- Protection contre les audits fiscaux

### 2. **Maximum de Revenus Crypto** 💰
- ~85% des revenus reçus en USDC direct
- Pas de conversion fiat → crypto (économie de frais)
- Auto-stake possible via Brahma
- Optimisation fiscale (LLC Wyoming)

### 3. **Expérience Utilisateur Optimale** ✨
- Flow intelligent basé sur la localisation
- Pas de questions inutiles pour les non-EU
- Support crypto natif pour les early adopters
- Paiements fiat traditionnels pour EU B2C

## 📁 Architecture Technique

### Fichiers Créés

```
web/
├── libs/
│   ├── geo-detection.js          # Détection géographique EU vs monde
│   └── moonpay-commerce.js        # SDK MoonPay Commerce
├── app/
│   ├── checkout/
│   │   └── smart/
│   │       └── page.js            # Page checkout intelligente
│   └── api/
│       ├── moonpay/
│       │   └── create-transaction/
│       │       └── route.js       # API MoonPay checkout
│       └── webhook/
│           └── moonpay/
│               └── route.js       # Webhook MoonPay
└── components/
    └── ButtonCheckout.js          # Bouton checkout (mis à jour)

config/
└── migrations/
    └── 210_moonpay_crypto_transactions.sql  # Table transactions crypto
```

### Flow Utilisateur

1. **User clique "Get Started"**
   ```javascript
   ButtonCheckout → router.push('/checkout/smart')
   ```

2. **Détection automatique du pays**
   ```javascript
   // Via Cloudflare header ou browser locale
   const country = detectUserCountry();
   const isEU = isEUCountry(country);
   ```

3. **Routing intelligent**
   ```javascript
   if (isEU && !isBusiness) {
     // → Lemon Squeezy (gère TVA)
     return "lemonsqueezy";
   } else {
     // → MoonPay Commerce (crypto direct)
     return "moonpay";
   }
   ```

4. **Réception du paiement**
   - **Lemon Squeezy**: Virement bancaire → Wise Business
   - **MoonPay**: USDC direct → Safe Wallet

## 🔧 Configuration Requise

### 1. Variables d'Environnement

Ajouter dans `.env` :

```bash
# MoonPay Commerce
NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY=pk_live_xxxxx
MOONPAY_SECRET_KEY=sk_live_xxxxx
MOONPAY_WEBHOOK_SECRET=whsec_xxxxx
MOONPAY_RECEIVER_WALLET_ADDRESS=0xYourSafeWalletAddress

# Lemon Squeezy (déjà configuré)
LEMON_SQUEEZY_API_KEY=xxxxx
LEMON_SQUEEZY_STORE_ID=xxxxx
LEMON_SQUEEZY_WEBHOOK_SECRET=xxxxx
```

### 2. Créer la Table SQL

Exécuter la migration :

```bash
psql $DATABASE_URL < config/migrations/210_moonpay_crypto_transactions.sql
```

Ou via Supabase Dashboard :
1. SQL Editor
2. Copier le contenu de `210_moonpay_crypto_transactions.sql`
3. Run

### 3. Configurer les Webhooks

#### MoonPay Webhook
- URL: `https://safescoring.io/api/webhook/moonpay`
- Events: `transaction.completed`, `transaction.failed`

#### Lemon Squeezy Webhook (déjà configuré)
- URL: `https://safescoring.io/api/webhook/lemonsqueezy`

### 4. Créer votre Safe Wallet

1. Aller sur https://app.safe.global
2. Créer un Safe multisig sur Polygon (low fees)
3. Copier l'adresse dans `MOONPAY_RECEIVER_WALLET_ADDRESS`

## 📈 Estimations de Revenus

### Distribution Géographique (estimation)

| Région         | % Clients | Provider   | Format |
|----------------|-----------|------------|--------|
| 🇺🇸 US         | ~40%      | MoonPay    | Crypto |
| 🌏 Asie        | ~20%      | MoonPay    | Crypto |
| 🏢 EU B2B      | ~15%      | MoonPay    | Crypto |
| 🌍 Autres      | ~10%      | MoonPay    | Crypto |
| 👤 EU B2C      | ~15%      | Lemon Squeezy | Fiat |

**Résultat : ~85% crypto direct, ~15% fiat**

### Calcul d'Exemple

Pour $10,000 de revenus mensuels :

| Provider       | Montant | Format | Destination     |
|----------------|---------|--------|-----------------|
| MoonPay        | $8,500  | USDC   | Safe Wallet     |
| Lemon Squeezy  | $1,500  | EUR    | Wise Business   |

## 🛡️ Conformité Fiscale

### Pour les Particuliers EU (B2C)

✅ **Lemon Squeezy gère tout** :
- Calcul automatique de la TVA par pays
- Collecte de la TVA
- Versement aux autorités fiscales
- Génération de factures conformes

Tu n'as **rien à faire** pour la TVA.

### Pour les Entreprises EU (B2B)

✅ **Autoliquidation (Reverse Charge)** :
- L'entreprise acheteuse gère sa propre TVA
- Tu reçois le paiement HT (sans TVA)
- Pas de TVA à collecter ni reverser

### Pour les Non-EU

✅ **Aucune TVA EU** :
- Ta LLC Wyoming n'a pas d'établissement en EU
- Service digital pur
- Pas de TVA EU applicable

## 🚀 Lancer la Stratégie

### Checklist de Déploiement

- [ ] Créer compte MoonPay Commerce
- [ ] Configurer les variables d'environnement
- [ ] Créer Safe Wallet pour recevoir USDC
- [ ] Exécuter la migration SQL
- [ ] Configurer le webhook MoonPay
- [ ] Tester le flow complet (staging)
- [ ] Déployer en production
- [ ] Monitorer les premiers paiements

### Test en Staging

```bash
# 1. Tester détection géographique
curl https://staging.safescoring.io/checkout/smart?plan=professional

# 2. Tester checkout EU B2C (devrait → Lemon Squeezy)
# Changer VPN → France
# Cliquer "Get Started"
# Vérifier redirection vers Lemon Squeezy

# 3. Tester checkout US (devrait → MoonPay)
# Changer VPN → USA
# Cliquer "Get Started"
# Vérifier redirection vers MoonPay
```

## 📞 Support & Questions

### Problèmes Courants

**Q: Comment vérifier que la détection géo fonctionne ?**
A: Vérifier les headers Cloudflare dans Network tab : `CF-IPCountry`

**Q: Que faire si MoonPay refuse un paiement ?**
A: Fallback automatique vers Lemon Squeezy (TODO: à implémenter)

**Q: Comment tester sans payer ?**
A: Utiliser les sandbox environments de MoonPay et Lemon Squeezy

### Contact

- Tech: [Toi-même]
- MoonPay Support: https://support.moonpay.com
- Lemon Squeezy Support: https://lemonsqueezy.com/help

---

**Note** : Cette stratégie est un **exemple théorique**. Consulte un expert-comptable pour valider la conformité fiscale dans ta juridiction.
