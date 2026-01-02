# SafeScoring Marketing Automation

Système automatisé de marketing pour SafeScoring. Surveille les événements crypto, génère du contenu viral, et publie automatiquement sur les réseaux sociaux.

## Architecture

```
src/marketing/
├── __init__.py              # Module exports
├── crypto_monitor.py        # Veille crypto (hacks, news, incidents)
├── content_generator.py     # Génération de contenu IA
├── twitter_publisher.py     # Publication Twitter/X
├── auto_marketing.py        # Orchestrateur principal
└── templates/
    ├── __init__.py
    └── viral_templates.py   # Templates de contenu viral
```

## Installation

### 1. Dépendances

```bash
pip install feedparser schedule tweepy requests
```

### 2. Configuration Twitter (optionnel)

Pour publier automatiquement sur Twitter :

1. Créer une app sur [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Copier le template de credentials :
   ```bash
   cp config/twitter_credentials_template.json config/.twitter_credentials.json
   ```
3. Remplir vos clés API dans `.twitter_credentials.json`

**Note :** Sans configuration Twitter, le contenu est sauvegardé en drafts pour publication manuelle.

## Utilisation

### Mode simple (une exécution)

```bash
# Génère du contenu sans publier (dry-run)
python -m src.marketing.auto_marketing --dry-run

# Génère et publie (si Twitter configuré)
python -m src.marketing.auto_marketing
```

### Mode daemon (continu)

```bash
# Vérifie toutes les 30 minutes
python -m src.marketing.auto_marketing --daemon

# Vérifie toutes les 15 minutes
python -m src.marketing.auto_marketing --daemon --interval 15
```

### Contenu éducatif

```bash
# Génère un thread éducatif
python -m src.marketing.auto_marketing --educational

# Génère le recap hebdomadaire
python -m src.marketing.auto_marketing --weekly
```

### Statut

```bash
python -m src.marketing.auto_marketing --status
```

## Fonctionnement

### 1. Veille Crypto (`CryptoMonitor`)

Surveille plusieurs sources :
- **RSS Feeds** : Rekt News, CoinDesk, Decrypt, Cointelegraph, The Block
- **DeFiLlama API** : Hacks et exploits récents
- **Scoring de pertinence** : 0-100 basé sur les mots-clés sécurité

Chaque événement est catégorisé :
- `HACK` : Hacks et exploits
- `SCAM` : Rug pulls et scams
- `VULNERABILITY` : Failles de sécurité
- `AUDIT` : Audits et revues
- `WALLET` : News hardware/software wallets
- `REGULATION` : Régulation et lois

### 2. Génération de Contenu (`ContentGenerator`)

Utilise l'IA pour générer du contenu adapté à chaque plateforme :

- **Twitter Threads** : Threads viraux sur les hacks (5-7 tweets)
- **Tweets simples** : Alertes rapides
- **Posts LinkedIn** : Contenu professionnel
- **Contenu éducatif** : Threads pédagogiques

L'IA utilise le système `AIProvider` existant avec fallback automatique entre Gemini, Groq, DeepSeek, etc.

### 3. Publication (`TwitterPublisher`)

- Publication automatique via Twitter API v2
- Gestion des threads (reply chain)
- Mode draft si Twitter non configuré
- Export pour Typefully (outil de scheduling externe)

### 4. Orchestration (`MarketingAutomation`)

- **Rate limiting** : Max 5 posts/jour
- **Topic cooldown** : 12h entre posts similaires
- **Scheduling** : Posts éducatifs quotidiens, recap hebdomadaire
- **Stats tracking** : Suivi des performances

## Fichiers générés

```
data/marketing_cache/
├── seen_items.json          # Items déjà traités (évite doublons)
└── events.json              # Événements récents

data/marketing_content/
├── drafts.json              # Contenu en attente de publication
├── posted.json              # Historique des publications
├── stats.json               # Statistiques
└── typefully_export.json    # Export pour Typefully
```

## Templates Viraux

Le fichier `templates/viral_templates.py` contient des templates pré-optimisés :

- **HACK_THREAD_TEMPLATES** : Threads pour incidents de sécurité
- **EDUCATIONAL_TEMPLATES** : Contenu pédagogique
- **ENGAGEMENT_TEMPLATES** : Questions et polls
- **CTA_TEMPLATES** : Appels à l'action
- **HASHTAGS** : Sets de hashtags par sujet

## Configuration avancée

### Modifier les seuils

Dans `auto_marketing.py` :

```python
class MarketingAutomation:
    MIN_RELEVANCE_SCORE = 40    # Score minimum pour générer du contenu
    MAX_DAILY_POSTS = 5          # Limite quotidienne
    TOPIC_COOLDOWN_HOURS = 12    # Délai entre topics similaires
```

### Ajouter des sources RSS

Dans `crypto_monitor.py` :

```python
RSS_FEEDS = {
    'rekt_news': 'https://rekt.news/rss.xml',
    'ma_source': 'https://example.com/rss.xml',  # Ajouter ici
}
```

### Personnaliser les mots-clés

```python
SECURITY_KEYWORDS = [
    'hack', 'exploit', 'vulnerability',
    # Ajouter vos mots-clés
]
```

## Workflow recommandé

### Semaine type

| Jour | Action |
|------|--------|
| Lundi | Thread éducatif (automatique 9h) |
| Mardi | Réaction aux news (daemon) |
| Mercredi | Thread éducatif |
| Jeudi | Réaction aux news |
| Vendredi | Thread éducatif |
| Samedi | - |
| Dimanche | Recap hebdomadaire (automatique 18h) |

### Temps requis

- **Setup initial** : 30 minutes
- **Supervision quotidienne** : 10-15 minutes
- **Validation des drafts** : 5 minutes/draft

## Métriques à suivre

1. **Impressions** : Nombre de vues par tweet
2. **Engagement rate** : (likes + RT + replies) / impressions
3. **Click-through rate** : Clics vers safescoring.io
4. **Conversions** : Inscriptions depuis Twitter

## Troubleshooting

### "Twitter not configured"

Le système fonctionne sans Twitter configuré - le contenu est sauvegardé en drafts.

### "No relevant events found"

Normal si pas de news sécurité récentes. Utilisez `--educational` pour du contenu evergreen.

### Rate limit Twitter

Le système gère automatiquement les rate limits avec des délais entre tweets.

## Prochaines évolutions

- [ ] Support LinkedIn API
- [ ] Support Reddit API
- [ ] Analytics dashboard
- [ ] A/B testing de templates
- [ ] Intégration Typefully directe
