# 🚀 Guide: ShipFast + Supabase SafeScoring + Lemon Squeezy

## Vue d'ensemble

Cette intégration connecte **ShipFast** (boilerplate Next.js) à votre base de données **Supabase SafeScoring** existante, en utilisant **Lemon Squeezy** pour les paiements (au lieu de Stripe).

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ShipFast      │────▶│    Supabase     │◀────│  Lemon Squeezy  │
│   (Next.js)     │     │  SafeScoring    │     │   (Paiements)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │   NextAuth            │   PostgreSQL          │   Webhooks
        │   Google OAuth        │   RLS Security        │   Subscriptions
        └───────────────────────┴───────────────────────┘
```

---

## 📋 Étapes d'installation

### 1. Préparer la base Supabase

Exécutez le script SQL pour ajouter la table `users` :

```bash
# Dans Supabase Dashboard > SQL Editor
# Copiez le contenu de: config/add_users_table.sql
```

Ce script ajoute :
- Table `users` pour NextAuth
- Colonnes Lemon Squeezy dans `subscriptions`
- Vue `user_dashboard_view`
- Fonction `check_user_limits()`

### 2. Configurer Lemon Squeezy

1. **Créer un compte** : https://lemonsqueezy.com

2. **Créer un Store** :
   - Dashboard > Settings > Stores
   - Notez le `Store ID`

3. **Créer les produits** (plans SafeScoring) :
   - Dashboard > Products > New Product
   - Créez 3 variants :
     - **Basic** : 19.99€/mois
     - **Pro** : 49.99€/mois
   - Notez les `Variant IDs`

4. **Créer l'API Key** :
   - Dashboard > Settings > API Keys
   - Créez une clé avec permissions `read` et `write`

5. **Configurer le Webhook** :
   - Dashboard > Settings > Webhooks
   - URL : `https://votre-domaine.com/api/webhook/lemon-squeezy`
   - Events à activer :
     - `subscription_created`
     - `subscription_updated`
     - `subscription_cancelled`
     - `subscription_resumed`
     - `subscription_expired`
     - `subscription_payment_success`
     - `subscription_payment_failed`
     - `order_created`
     - `order_refunded`
   - Notez le `Webhook Secret`

### 3. Configurer les variables d'environnement

```bash
cd ship-fast-ts-main
cp .env.safescoring .env.local
```

Éditez `.env.local` avec vos valeurs :

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=générer_avec_openssl_rand_base64_32

# Google OAuth (optionnel)
GOOGLE_ID=votre_google_client_id
GOOGLE_SECRET=votre_google_client_secret

# Supabase (vos clés existantes)
NEXT_PUBLIC_SUPABASE_URL=https://ajdncttomdqojlozxjxu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # Dashboard > Settings > API

# Lemon Squeezy
LEMON_SQUEEZY_API_KEY=votre_api_key
LEMON_SQUEEZY_STORE_ID=votre_store_id
LEMON_SQUEEZY_WEBHOOK_SECRET=votre_webhook_secret
LEMON_SQUEEZY_VARIANT_BASIC=123457
LEMON_SQUEEZY_VARIANT_PRO=123458
```

### 4. Installer les dépendances

```bash
cd ship-fast-ts-main
npm install
```

### 5. Lancer le serveur de développement

```bash
npm run dev
```

---

## 🔧 Fichiers créés/modifiés

### Nouveaux fichiers

| Fichier | Description |
|---------|-------------|
| `libs/supabase.ts` | Client Supabase + fonctions CRUD |
| `libs/lemon-squeezy.ts` | API Lemon Squeezy (checkout, subscriptions) |
| `app/api/webhook/lemon-squeezy/route.ts` | Webhook handler |
| `app/api/lemon-squeezy/create-checkout/route.ts` | Créer un checkout |
| `.env.safescoring` | Template de configuration |
| `config/add_users_table.sql` | Migration SQL |

### Fichiers modifiés

| Fichier | Changements |
|---------|-------------|
| `config.ts` | Plans Lemon Squeezy, branding SafeScoring |
| `package.json` | Ajout `@supabase/supabase-js` |

---

## 🛒 Utilisation du checkout

### Côté client (React)

```tsx
import config from "@/config";

function PricingButton({ planCode }: { planCode: string }) {
  const plan = config.lemonSqueezy.plans.find(p => p.planCode === planCode);
  
  const handleCheckout = async () => {
    const res = await fetch("/api/lemon-squeezy/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        variantId: plan.variantId,
        mode: "subscription" 
      }),
    });
    
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  return (
    <button onClick={handleCheckout}>
      S'abonner - {plan.price}€/mois
    </button>
  );
}
```

### Vérifier l'accès utilisateur

```tsx
import { getUserById } from "@/libs/supabase";

async function checkAccess(userId: string) {
  const user = await getUserById(userId);
  
  if (!user?.has_access) {
    // Rediriger vers la page pricing
    return redirect("/pricing");
  }
  
  // L'utilisateur a accès
  return user;
}
```

---

## 📊 Accéder aux données SafeScoring

### Récupérer les produits

```tsx
import { getProducts, getProductBySlug } from "@/libs/supabase";

// Liste des produits
const products = await getProducts(50);

// Un produit spécifique
const ledger = await getProductBySlug("ledger-nano-x");
```

### Récupérer les scores d'un produit

```tsx
import { getProductScores } from "@/libs/supabase";

const scores = await getProductScores(productId);
// Retourne les évaluations avec les normes SAFE
```

### Gérer les setups utilisateur

```tsx
import { getUserSetups, createUserSetup, countUserSetups } from "@/libs/supabase";

// Vérifier les limites
const setupCount = await countUserSetups(userId);
const plan = await getUserSubscription(userId);

if (setupCount >= plan.max_setups) {
  throw new Error("Limite de setups atteinte");
}

// Créer un setup
const setup = await createUserSetup({
  user_id: userId,
  name: "Mon setup DeFi",
  products: [
    { product_id: 1, role: "primary" },
    { product_id: 5, role: "backup" }
  ]
});
```

---

## 🔐 Sécurité

### Row Level Security (RLS)

Les politiques RLS sont configurées pour :
- Les utilisateurs ne voient que leurs propres données
- Les webhooks utilisent la `service_role_key` pour les opérations admin

### Variables sensibles

**NE JAMAIS exposer côté client** :
- `SUPABASE_SERVICE_ROLE_KEY`
- `LEMON_SQUEEZY_API_KEY`
- `LEMON_SQUEEZY_WEBHOOK_SECRET`

---

## 🧪 Tester les webhooks en local

Utilisez [ngrok](https://ngrok.com/) pour exposer votre serveur local :

```bash
# Terminal 1: Lancer Next.js
npm run dev

# Terminal 2: Exposer avec ngrok
ngrok http 3000
```

Configurez l'URL ngrok dans Lemon Squeezy :
```
https://abc123.ngrok.io/api/webhook/lemon-squeezy
```

---

## 📝 Mapping des plans

| Plan SafeScoring | Lemon Squeezy Variant | Prix | Limites |
|------------------|----------------------|------|---------|
| `free` | (pas de paiement) | 0€ | 10 produits, 1 setup |
| `basic` | `LEMON_SQUEEZY_VARIANT_BASIC` | 19.99€/mois | 50 produits, 5 setups |
| `pro` | `LEMON_SQUEEZY_VARIANT_PRO` | 49.99€/mois | 200 produits, 20 setups |

---

## 🚨 Troubleshooting

### Erreur "Invalid webhook signature"

- Vérifiez que `LEMON_SQUEEZY_WEBHOOK_SECRET` est correct
- Assurez-vous que le webhook est configuré avec le bon secret dans Lemon Squeezy

### Erreur "User not found"

- Vérifiez que l'utilisateur existe dans la table `users`
- Assurez-vous que le `user_id` est passé dans les `custom_data` du checkout

### Les types TypeScript ne fonctionnent pas

```bash
npm install
# Les erreurs disparaîtront après l'installation des dépendances
```

---

## 🔗 Ressources

- [Lemon Squeezy API Docs](https://docs.lemonsqueezy.com/api)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [NextAuth.js](https://next-auth.js.org/)
- [ShipFast Docs](https://shipfa.st/docs)

---

## ✅ Checklist de déploiement

- [ ] Script SQL exécuté dans Supabase
- [ ] Produits créés dans Lemon Squeezy
- [ ] Webhook configuré avec la bonne URL
- [ ] Variables d'environnement configurées
- [ ] `npm install` exécuté
- [ ] Test du checkout en local
- [ ] Test du webhook avec ngrok
- [ ] Déploiement sur Vercel/Netlify
- [ ] URL de webhook mise à jour en production
