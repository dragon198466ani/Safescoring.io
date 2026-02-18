# 🔒 SafeScoring - Checklist Sécurité & RGPD Pré-Lancement

## Variables d'Environnement Obligatoires

### 🔴 CRITIQUE (Le serveur ne démarrera pas sans)

```bash
# Générer avec: openssl rand -base64 32
NEXTAUTH_SECRET=<votre-secret-32-chars>
CSRF_SECRET=<votre-secret-32-chars>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### 🟠 HAUTE PRIORITÉ (Fonctionnalités dégradées sans)

```bash
# Rate limiting distribué (OBLIGATOIRE en production multi-instance)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>

# Chiffrement des données sensibles
ENCRYPTION_KEY=<32-chars-min>

# Hachage emails (RGPD)
EMAIL_HASH_SALT=<générer-avec-openssl-rand-hex-32>

# Hachage wallets
WALLET_HASH_SALT=<générer-avec-openssl-rand-hex-32>
```

### 🟡 RECOMMANDÉ

```bash
# CORS
ALLOWED_ORIGINS=https://safescoring.io,https://www.safescoring.io

# Admins (emails séparés par virgule)
ADMIN_EMAILS=admin@safescoring.io
```

---

## Checklist Sécurité

### Authentification & Sessions
- [x] NextAuth avec JWT strategy
- [x] Session binding (device fingerprint + IP)
- [x] Risk assessment sur changement de device/IP
- [x] Brute force protection (lockout progressif)
- [x] IP blocking après violations répétées

### Protection CSRF
- [x] Tokens HMAC-SHA256 avec expiration
- [x] Validation origin/referer sur toutes les routes POST/PUT/DELETE
- [x] Timing-safe comparison pour éviter timing attacks
- [x] CSRF_SECRET obligatoire en production

### Protection XSS
- [x] CSP Level 3 avec nonces dynamiques
- [x] `strict-dynamic` en production (pas de `unsafe-inline`)
- [x] Sanitization HTML avec whitelist de tags
- [x] Échappement automatique des entrées utilisateur

### Protection Injection SQL
- [x] Requêtes paramétrées via Supabase
- [x] Détection patterns SQL injection dans middleware
- [x] Blocage IP sur tentatives détectées

### Headers HTTP
- [x] HSTS avec preload (2 ans)
- [x] X-Frame-Options: DENY
- [x] X-Content-Type-Options: nosniff
- [x] Referrer-Policy: strict-origin-when-cross-origin
- [x] Permissions-Policy (désactive caméra, micro, géoloc, etc.)
- [x] Cross-Origin-Opener-Policy: same-origin
- [x] Cross-Origin-Resource-Policy: same-origin

### Rate Limiting
- [x] Redis (Upstash) pour environnement distribué
- [x] Fallback in-memory pour dev
- [x] Tiers différenciés (public/auth/paid/admin)
- [x] Blocage automatique après violations répétées

### Honeypots
- [x] Chemins WordPress/PHP bloqués
- [x] Accès .env/.git bloqués
- [x] Ban 24h sur déclenchement

---

## Checklist RGPD

### Consentement (Art. 7)
- [x] Cookie banner multi-juridiction (GDPR, CCPA, LGPD, PIPEDA, APPI)
- [x] Consentement granulaire (essentiel/analytics/marketing)
- [x] Versioning du consentement
- [x] Stockage horodaté des préférences

### Droit d'Accès (Art. 15)
- [x] API `/api/user/export` pour télécharger ses données
- [x] Formats JSON et CSV disponibles

### Droit de Rectification (Art. 16)
- [x] API `/api/user/settings` pour modifier ses données
- [x] API `/api/user/preferences` pour préférences

### Droit à l'Effacement (Art. 17)
- [x] API `/api/user/delete` avec confirmation
- [x] Suppression atomique de toutes les données liées
- [x] Audit trail des suppressions

### Droit à la Portabilité (Art. 20)
- [x] Export JSON/CSV machine-readable
- [x] Toutes les données personnelles incluses

### Privacy by Design
- [x] Hachage des emails (HMAC-SHA256)
- [x] Masquage des emails pour affichage
- [x] Pas de stockage de données de carte bancaire
- [x] Anonymisation des logs

### Documentation
- [x] Page `/privacy-policy` complète
- [x] Page `/cookies` avec liste des cookies
- [x] Contact DPO: privacy@safescoring.io

---

## Tests de Sécurité Recommandés

### Avant Lancement
```bash
# 1. Vérifier les headers de sécurité
curl -I https://safescoring.io | grep -E "(Strict-Transport|Content-Security|X-Frame)"

# 2. Tester le rate limiting
for i in {1..100}; do curl -s https://safescoring.io/api/products | head -1; done

# 3. Vérifier CSP
# Ouvrir DevTools > Console, chercher les violations CSP

# 4. Scanner OWASP
# Utiliser OWASP ZAP ou Burp Suite
```

### Outils Recommandés
- [SecurityHeaders.com](https://securityheaders.com) - Score A+
- [Mozilla Observatory](https://observatory.mozilla.org) - Score A+
- [SSL Labs](https://www.ssllabs.com/ssltest/) - Score A+
- [OWASP ZAP](https://www.zaproxy.org/) - Scan vulnérabilités

---

## Monitoring Sécurité

### Logs à Surveiller
- `[SECURITY]` - Événements de sécurité
- `[HONEYPOT]` - Tentatives d'attaque
- `[CSRF]` - Tentatives CSRF bloquées
- `[BRUTE_FORCE]` - Attaques brute force
- `[RGPD]` - Actions liées à la vie privée

### Alertes Recommandées
- Plus de 10 IP bloquées/heure
- Tentatives de login échouées > 50/heure
- Violations CSP répétées
- Accès admin depuis nouvelle IP

---

## Contact Sécurité

- **Email**: security@safescoring.io
- **DPO**: privacy@safescoring.io
- **Bug Bounty**: Contacter security@safescoring.io

---

*Dernière mise à jour: Janvier 2026*
