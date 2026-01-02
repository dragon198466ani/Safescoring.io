# 🚀 SafeScoring - Checklist Déploiement

## 📋 Statut Global
- [ ] **Site web déployé**
- [ ] **Marketing automation activé**
- [ ] **Monitoring en place**

---

## 1️⃣ COMPTES À CRÉER (gratuit)

### Obligatoires
- [ ] **Vercel** - vercel.com (hébergement Next.js)
- [ ] **Supabase** - supabase.com (base de données - déjà fait?)
- [ ] **Resend** - resend.com (emails transactionnels, 3000/mois gratuit)

### Réseaux sociaux
- [ ] **Twitter/X** - Créer compte @SafeScoring
- [ ] **Reddit** - Créer compte u/SafeScoring
- [ ] **Discord** - Créer serveur SafeScoring
- [ ] **Telegram** - Créer bot via @BotFather

### Optionnels (pour plus tard)
- [ ] LinkedIn Company Page
- [ ] YouTube Channel
- [ ] Medium Publication

---

## 2️⃣ CLÉS API À OBTENIR

### IA (au moins 1 requis)
- [ ] **Gemini** - aistudio.google.com/apikey (gratuit)
- [ ] **Groq** - console.groq.com (gratuit, rapide)
- [ ] DeepSeek (backup)

### Twitter (pour automation)
1. Aller sur developer.twitter.com
2. Créer un projet + app
3. Récupérer:
   - [ ] `TWITTER_API_KEY`
   - [ ] `TWITTER_API_SECRET`
   - [ ] `TWITTER_ACCESS_TOKEN`
   - [ ] `TWITTER_ACCESS_SECRET`
   - [ ] `TWITTER_BEARER_TOKEN`

### Reddit (pour automation)
1. Aller sur reddit.com/prefs/apps
2. Créer une "script" app
3. Récupérer:
   - [ ] `REDDIT_CLIENT_ID`
   - [ ] `REDDIT_CLIENT_SECRET`
   - [ ] `REDDIT_USERNAME`
   - [ ] `REDDIT_PASSWORD`

### Telegram
1. Parler à @BotFather sur Telegram
2. `/newbot` → suivre instructions
3. Récupérer:
   - [ ] `TELEGRAM_BOT_TOKEN`

### Discord
1. Aller sur discord.com/developers/applications
2. Créer une application → Bot
3. Récupérer:
   - [ ] `DISCORD_BOT_TOKEN`

### Email (Resend)
1. Créer compte sur resend.com
2. Vérifier ton domaine
3. Récupérer:
   - [ ] `RESEND_API_KEY`

---

## 3️⃣ CONFIGURATION GITHUB SECRETS

Aller dans: Repository → Settings → Secrets and variables → Actions

### Secrets requis
```
# Base de données
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJxxx...

# IA
GEMINI_API_KEY=xxx
GROQ_API_KEY=xxx

# Email
RESEND_API_KEY=re_xxx
ADMIN_EMAIL=ton@email.com

# Twitter
TWITTER_API_KEY=xxx
TWITTER_API_SECRET=xxx
TWITTER_ACCESS_TOKEN=xxx
TWITTER_ACCESS_SECRET=xxx
TWITTER_BEARER_TOKEN=xxx

# Reddit
REDDIT_CLIENT_ID=xxx
REDDIT_CLIENT_SECRET=xxx
REDDIT_USERNAME=SafeScoring
REDDIT_PASSWORD=xxx

# Telegram
TELEGRAM_BOT_TOKEN=xxx

# Discord
DISCORD_BOT_TOKEN=xxx

# Options
AUTO_POST=false          # Mettre true quand prêt
AUTO_REPLY=false         # Mettre true quand prêt
SENDER_NAME=Alex         # Ton prénom pour les emails
```

---

## 4️⃣ DÉPLOIEMENT VERCEL

### Étapes
1. [ ] Push le code sur GitHub
2. [ ] Aller sur vercel.com
3. [ ] "Import Project" → sélectionner le repo
4. [ ] Configurer:
   - Framework: Next.js
   - Root Directory: `web`
   - Build Command: `npm run build`
5. [ ] Ajouter les variables d'environnement (même que GitHub Secrets)
6. [ ] Déployer

### Domaine
- [ ] Acheter domaine `safescoring.io` (Namecheap, Gandi, etc.)
- [ ] Configurer DNS sur Vercel
- [ ] Activer HTTPS (automatique)

---

## 5️⃣ BASE DE DONNÉES

### Migrations à exécuter dans Supabase SQL Editor
```sql
-- 1. Newsletter subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    source TEXT DEFAULT 'website',
    status TEXT DEFAULT 'active',
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    resubscribed_at TIMESTAMPTZ
);

-- 2. Testimonials
CREATE TABLE IF NOT EXISTS testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_name TEXT NOT NULL,
    author_handle TEXT,
    quote TEXT NOT NULL,
    source TEXT DEFAULT 'website',
    rating INT DEFAULT 5,
    verified BOOLEAN DEFAULT FALSE,
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Marketing metrics
CREATE TABLE IF NOT EXISTS marketing_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id TEXT,
    channel TEXT,
    impressions INT DEFAULT 0,
    clicks INT DEFAULT 0,
    engagements INT DEFAULT 0,
    conversions INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Marketing conversions
CREATE TABLE IF NOT EXISTS marketing_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT,
    conversion_type TEXT,
    value DECIMAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6️⃣ TESTS AVANT LANCEMENT

### Site web
- [ ] Page d'accueil charge correctement
- [ ] Liste des produits fonctionne
- [ ] Page produit individuel fonctionne
- [ ] Comparaison fonctionne
- [ ] Recherche fonctionne
- [ ] Newsletter inscription fonctionne

### APIs
- [ ] `/api/products/[slug]/score` retourne du JSON
- [ ] `/api/badge/[slug]` retourne du SVG
- [ ] `/api/widget/[slug]` retourne du HTML
- [ ] `/api/search?q=ledger` fonctionne

### Marketing (tester manuellement)
```bash
# Tester le content monitoring
python -m src.marketing.auto_marketing --test

# Tester le quality control
python -m src.marketing.quality_control

# Tester une génération SEO
python -m src.marketing.seo_generator --test
```

---

## 7️⃣ LANCEMENT PROGRESSIF

### Semaine 1: Soft Launch
- [ ] Déployer le site
- [ ] Annoncer sur Twitter personnel
- [ ] Poster sur 1-2 subreddits pertinents
- [ ] Activer GitHub Actions (DRY_RUN=true)

### Semaine 2: Marketing Passif
- [ ] Vérifier que les drafts sont de qualité
- [ ] Activer AUTO_POST=true si OK
- [ ] Configurer Telegram bot
- [ ] Activer backlink outreach

### Semaine 3+: Scale
- [ ] Analyser les métriques
- [ ] Ajuster les fréquences si besoin
- [ ] Ajouter plus de produits
- [ ] Répondre aux feedbacks

---

## 8️⃣ MONITORING

### Dashboards à surveiller
- [ ] Vercel Analytics (trafic)
- [ ] Supabase Dashboard (DB usage)
- [ ] GitHub Actions (runs status)
- [ ] Resend Dashboard (emails sent)

### Alertes à configurer
- [ ] Vercel: alerte si site down
- [ ] GitHub Actions: notification si workflow fail
- [ ] Email hebdo automatique (déjà configuré)

---

## 📞 SUPPORT

Si problème:
- Vérifier les logs GitHub Actions
- Vérifier les logs Vercel
- Vérifier Supabase logs

---

## ✅ CHECKLIST RAPIDE

```
□ Comptes créés (Vercel, Resend, Twitter Dev, Reddit)
□ Clés API obtenues
□ GitHub Secrets configurés
□ Migrations DB exécutées
□ Site déployé sur Vercel
□ Domaine configuré
□ Tests passés
□ Lancement!
```

---

*Dernière mise à jour: Janvier 2026*
