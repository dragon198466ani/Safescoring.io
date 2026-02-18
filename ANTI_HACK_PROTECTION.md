# Protection Anti-Hack SafeScoring

## Vue d'Ensemble des Menaces

| Menace | Impact | Probabilité | Protection |
|--------|--------|-------------|------------|
| Suppression de données | CRITIQUE | Moyenne | Backups, RLS |
| Vol de secrets | CRITIQUE | Moyenne | Rotation, Vault |
| Défacement du site | Haute | Faible | Git, Vercel |
| DDoS | Haute | Moyenne | Cloudflare |
| Injection SQL | Haute | Faible | Parameterized queries |
| Compromission admin | CRITIQUE | Faible | MFA, Audit logs |

---

## 1. Protection des Accès

### Supabase (Base de données)

```sql
-- ACTIVER Row Level Security sur TOUTES les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs ne voient que leurs propres données
CREATE POLICY "Users see own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- INTERDIRE les suppressions massives
CREATE POLICY "No mass delete" ON products
  FOR DELETE USING (false);  -- Seul admin via service_role

-- Limiter les updates
CREATE POLICY "Users update own setups" ON setups
  FOR UPDATE USING (auth.uid() = user_id);
```

### Vercel (Hébergement)

1. **Activer Protection Déploiement**
   ```
   Vercel Dashboard > Project > Settings > General
   ☑️ Require approval for deployments
   ```

2. **Restreindre les Membres**
   ```
   Vercel Dashboard > Team Settings > Members
   - Limiter les admins au minimum
   - Utiliser SSO si possible
   ```

3. **Activer MFA**
   ```
   Vercel Dashboard > Account > Security
   ☑️ Two-factor authentication
   ```

### GitHub (Code)

1. **Branch Protection**
   ```
   Settings > Branches > Add rule
   ☑️ Require pull request reviews
   ☑️ Require status checks
   ☑️ Require signed commits
   ☑️ Do not allow force pushes
   ☑️ Do not allow deletions
   ```

2. **Secret Scanning**
   ```
   Settings > Security > Secret scanning
   ☑️ Enable
   ☑️ Push protection
   ```

---

## 2. Rotation des Secrets

### Script de Rotation Automatique

```bash
#!/bin/bash
# rotate_secrets.sh - À exécuter mensuellement

echo "🔄 Rotation des secrets SafeScoring"
echo "===================================="

# 1. Générer nouveaux secrets
NEW_NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEW_CSRF_SECRET=$(openssl rand -base64 32)
NEW_WALLET_SALT=$(openssl rand -hex 32)

# 2. Mettre à jour Vercel
vercel env rm NEXTAUTH_SECRET production
echo "$NEW_NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET production

vercel env rm CSRF_SECRET production
echo "$NEW_CSRF_SECRET" | vercel env add CSRF_SECRET production

# 3. Redéployer
vercel --prod

# 4. Sauvegarder dans gestionnaire de secrets
echo "Nouveaux secrets générés - Sauvegarder dans 1Password/Vault"
```

### Fréquence de Rotation

| Secret | Fréquence | Méthode |
|--------|-----------|---------|
| NEXTAUTH_SECRET | Mensuel | Automatique |
| SUPABASE_SERVICE_ROLE_KEY | Trimestriel | Manuel (Dashboard) |
| API Keys utilisateurs | Sur demande | Dashboard |
| WALLET_HASH_SALT | Jamais* | - |

*Le sel de hachage ne doit pas être changé sinon les wallets existants ne matcheront plus.

---

## 3. Monitoring et Alertes

### Cloudflare (WAF + DDoS)

```
1. Ajouter domaine à Cloudflare
2. Activer:
   - WAF (Web Application Firewall)
   - Bot Fight Mode
   - DDoS Protection (automatique)
   - Rate Limiting Rules
```

### Alertes Supabase

```sql
-- Créer fonction d'alerte pour suppressions suspectes
CREATE OR REPLACE FUNCTION alert_suspicious_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Log la tentative de suppression
  INSERT INTO security_events (
    event_type,
    severity,
    details
  ) VALUES (
    'SUSPICIOUS_DELETE',
    'high',
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'deleted_id', OLD.id,
      'timestamp', NOW()
    )
  );

  -- Notifier via webhook (Telegram, Slack, etc.)
  PERFORM net.http_post(
    url := 'https://api.telegram.org/bot<TOKEN>/sendMessage',
    body := jsonb_build_object(
      'chat_id', '<CHAT_ID>',
      'text', '🚨 ALERTE: Suppression suspecte détectée sur ' || TG_TABLE_NAME
    )
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Attacher aux tables critiques
CREATE TRIGGER alert_product_delete
  BEFORE DELETE ON products
  FOR EACH ROW
  EXECUTE FUNCTION alert_suspicious_delete();
```

### Vercel Logs

```javascript
// middleware.js - Logging des accès suspects
if (suspiciousActivity) {
  // Envoyer à service de logging externe
  fetch('https://api.logtail.com/v1/logs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LOGTAIL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      level: 'warn',
      message: 'Suspicious activity detected',
      clientId,
      path: request.url,
      timestamp: new Date().toISOString(),
    }),
  });
}
```

---

## 4. Plan de Récupération

### Scénario: Base de données supprimée

```
TEMPS ESTIMÉ: 30 minutes - 2 heures

1. [5 min] Confirmer l'incident
   - Vérifier Supabase Dashboard
   - Identifier l'étendue des dégâts

2. [10 min] Activer le mode maintenance
   - vercel env add MAINTENANCE_MODE true production
   - Redéployer

3. [30-60 min] Restaurer la base de données
   - Option A: PITR (Point in Time Recovery)
     Supabase Dashboard > Database > Backups > Restore

   - Option B: Backup manuel
     psql $DATABASE_URL < backup_YYYYMMDD.sql

4. [15 min] Vérifier l'intégrité
   - Compter les enregistrements
   - Vérifier les relations

5. [5 min] Désactiver le mode maintenance
   - vercel env rm MAINTENANCE_MODE production
   - Redéployer
```

### Scénario: Secrets compromis

```
TEMPS ESTIMÉ: 15-30 minutes

1. [IMMÉDIAT] Révoquer les secrets compromis
   - Supabase: Dashboard > Settings > API > Regenerate keys
   - Vercel: Supprimer et recréer les env vars

2. [5 min] Invalider toutes les sessions
   - Changer NEXTAUTH_SECRET
   - Tous les JWT deviennent invalides

3. [10 min] Auditer l'accès
   - Vérifier les logs Supabase
   - Identifier les actions malveillantes

4. [5 min] Redéployer
   - vercel --prod

5. [Post-incident] Analyser la fuite
   - Comment le secret a été compromis?
   - Mettre en place des protections
```

---

## 5. Checklist Sécurité Hebdomadaire

```markdown
## Revue Sécurité - Semaine du ___/___/___

### Accès et Permissions
- [ ] Vérifier les membres de l'équipe Vercel
- [ ] Vérifier les accès Supabase
- [ ] Vérifier les collaborateurs GitHub
- [ ] Révoquer les accès inutilisés

### Secrets
- [ ] Vérifier que les secrets ne sont pas dans le code (trufflehog)
- [ ] Confirmer que .env n'est pas commité

### Backups
- [ ] Vérifier le dernier backup automatique
- [ ] Tester la restauration (environnement de test)

### Logs
- [ ] Vérifier les tentatives de connexion échouées
- [ ] Vérifier les erreurs 500 inhabituelles
- [ ] Vérifier les alertes de sécurité

### Dépendances
- [ ] Exécuter npm audit
- [ ] Mettre à jour les dépendances critiques
```

---

## 6. Contacts d'Urgence

```
INCIDENT SÉCURITÉ:
-----------------
1. Responsable Sécurité: [EMAIL/TÉLÉPHONE]
2. Backup: [EMAIL/TÉLÉPHONE]

FOURNISSEURS:
-------------
- Vercel Support: support@vercel.com
- Supabase Support: support@supabase.io
- Cloudflare Emergency: [Si Enterprise]

LÉGAL (si breach de données):
-----------------------------
- CNIL: notifications@cnil.fr (72h max)
- Avocat: [CONTACT]
```

---

## 7. Commandes d'Urgence

```bash
# Mettre le site en maintenance immédiatement
vercel env add MAINTENANCE_MODE true production && vercel --prod

# Révoquer tous les tokens JWT (changer le secret)
NEW_SECRET=$(openssl rand -base64 32)
vercel env rm NEXTAUTH_SECRET production
echo "$NEW_SECRET" | vercel env add NEXTAUTH_SECRET production
vercel --prod

# Bloquer une IP dans Cloudflare
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/firewall/access_rules/rules" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"mode":"block","configuration":{"target":"ip","value":"1.2.3.4"},"notes":"Blocked - suspicious activity"}'

# Restaurer le dernier backup Supabase
supabase db restore --project-ref $PROJECT_ID --backup-id latest
```

---

**Document mis à jour le:** $(date)
**Prochaine revue:** Dans 1 mois
