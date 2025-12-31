# 🗓️ SAFESCORING.IO - Automatisation Mensuelle

## 🎯 Objectif

Mise à jour automatique mensuelle des produits dans la base `SAFE_SCORING_V7_FINAL` en utilisant les APIs IA gratuites (Mistral + Gemini) selon le guide d'automatisation.

## 📋 Prérequis

### 1. Configuration
```bash
# Copier le fichier de configuration
cp env_template_free.txt .env
# Éditer .env avec vos clés API
```

### 2. Installer les dépendances
```bash
pip install mistralai google-generativeai requests fake-useragent
```

### 3. Créer les tables Supabase
```bash
# Exécuter le script SQL dans Supabase SQL Editor
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DB < create_tables.sql
```

## 🚀 Utilisation

### Mode normal (production)
```bash
python monthly_automation.py
```

### Mode test (simulation)
```bash
python monthly_automation.py --dry-run
```

### Forcer la mise à jour
```bash
python monthly_automation.py --force
```

### Mode compatibilité (ancien script)
```bash
python supabase_final.py --monthly
```

## 📊 Fonctionnalités

### ✅ Pipeline IA 100% Gratuit
- **Mistral API** : Extraction et évaluation (1 req/sec, 500K tokens/mois)
- **Gemini API** : Backup (60 req/min, 1.5M tokens/jour)
- **Rate limiting** automatique pour respecter les quotas
- **Fallback** si une IA est indisponible

### 🗄️ Base de données Supabase
- **Tables** : `products`, `evaluations`, `automation_logs`, `scrape_cache`
- **JSONB** pour les spécifications et scores
- **Triggers** pour les calculs automatiques
- **Logs** complets des exécutions

### 🌐 Scraping intelligent
- **User-Agent** aléatoire
- **Cache** pour éviter les re-scrapes
- **Hash** de contenu pour détecter les changements
- **Timeout** et gestion d'erreurs

### 📈 Rapports et monitoring
- **Logs détaillés** dans Supabase
- **Statistiques** d'utilisation IA
- **Erreurs** tracking et alertes
- **Performance** monitoring

## 📅 Planification

### Manuel
```bash
# Exécuter manuellement chaque mois
python monthly_automation.py
```

### Automatique avec cron
```bash
# Tous les 1er du mois à 3h du matin
0 3 1 * * /usr/bin/python /path/to/monthly_automation.py

# Ou avec logging
0 3 1 * * /usr/bin/python /path/to/monthly_automation.py >> /var/log/safescoring.log 2>&1
```

### GitHub Actions (recommandé)
```yaml
# .github/workflows/monthly-update.yml
name: Monthly SAFE Update

on:
  schedule:
    - cron: '0 3 1 * *'  # 1er du mois à 3h
  workflow_dispatch:  # Manuel

jobs:
  update:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install mistralai google-generativeai requests fake-useragent
      
      - name: Run automation
        env:
          MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_KEY }}
        run: python monthly_automation.py
```

## 📊 Performance

### Pour 195 produits/mois
| Métrique | Valeur |
|---------|--------|
| **Durée estimée** | 2-3 heures |
| **Coût total** | 0€ (100% gratuit) |
| **Requêtes IA** | ~400 (Mistral) |
| **Tokens utilisés** | ~200K (sur 500K disponibles) |
| **Rate limits** | Respectés automatiquement |

### Répartition par service
| Service | Utilisation | Limite gratuite |
|---------|-------------|-----------------|
| Mistral | 300 req/mois | 500K tokens/mois |
| Gemini | 100 req/mois | 1.5M tokens/jour |
| Supabase | 500 updates | 500MB DB |

## 🔧 Configuration avancée

### Variables d'environnement
```bash
# Delais (secondes)
SCRAPE_DELAY_MIN=2.0
SCRAPE_DELAY_MAX=5.0
MISTRAL_DELAY=1.5
GEMINI_DELAY=1.2

# Batch sizes
BATCH_SIZE_NORMS=35
PRODUCTS_PER_RUN=195

# Modèles IA
MISTRAL_MODEL=mistral-small-latest
GEMINI_MODEL=gemini-1.5-flash
```

### Personnalisation
```python
# Dans monthly_automation.py, modifier les prompts
CUSTOM_SPEC_PROMPT = "..."
CUSTOM_SECURITY_PROMPT = "..."
```

## 🚨 Gestion des erreurs

### Types d'erreurs
1. **Network** : Timeout, HTTP errors
2. **IA API** : Rate limits, parsing errors
3. **Database** : Connection, constraint errors
4. **Parsing** : JSON invalid, missing data

### Stratégies
- **Retry automatique** (3 tentatives)
- **Fallback IA** (Mistral → Gemini → Default)
- **Cache scraping** (éviter re-scrape si erreur)
- **Logs détaillés** pour debugging

### Monitoring
```sql
-- Voir les logs récents
SELECT * FROM automation_logs 
ORDER BY run_date DESC 
LIMIT 10;

-- Statistiques d'utilisation IA
SELECT service, SUM(requests), SUM(tokens_used)
FROM ai_usage_stats 
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY service;
```

## 📈 Évolution

### Phase 1 (Actuelle)
- ✅ Mise à jour mensuelle automatique
- ✅ Extraction specs avec IA
- ✅ Évaluation sécurité
- ✅ Logs complets

### Phase 2 (Prochain)
- 🔄 Scraping multi-sources
- 🔄 Évaluations par normes SAFE
- 🔄 Alertes CVE automatiques
- 🔄 Notifications email/Telegram

### Phase 3 (Futur)
- 📋 Dashboard monitoring
- 📋 API publique
- 📋 Multi-utilisateurs
- 📋 Reports personnalisés

## 🔗 Ressources

- **Guide complet** : `GUIDE_AUTOMATISATION_GRATUITE.md`
- **Schéma base** : `DatabaseERD_WithAutomation.jsx`
- **Script SQL** : `create_tables.sql`
- **Script principal** : `monthly_automation.py`
- **Compatibilité** : `supabase_final.py`

## 💡 Tips

1. **Test en dry-run** avant production
2. **Surveiller les quotas** IA gratuits
3. **Backup régulier** de la base Supabase
4. **Logs monitoring** pour détecter les problèmes
5. **Mettre à jour** les clés API si nécessaire

---

**🎉 Total: 0€/mois pour automatiser 195 produits!**
