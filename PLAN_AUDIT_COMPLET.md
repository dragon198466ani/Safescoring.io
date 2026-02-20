# Plan d'Audit et Optimisation Complet - SafeScoring

## Objectifs
1. **Mobile-first, Tablet-first, Desktop-first** - Optimiser le responsive design
2. **Cohérence données** - Aligner frontend avec Supabase
3. **Automatisation** - Synchronisation automatique des données

---

## PARTIE 1: RESPONSIVE DESIGN (Mobile/Tablet/Desktop)

### 1.1 Problèmes Critiques (CRITICAL)

| Composant | Fichier | Ligne | Problème | Solution |
|-----------|---------|-------|----------|----------|
| SetupCard grille | SetupCard.js | 273, 299 | 4-6 colonnes sur mobile = illisible | `grid-cols-2 sm:grid-cols-3 md:grid-cols-4` |
| Boutons touch | SetupCard.js | 77 | Bouton 40px < 44px minimum | Utiliser `btn-sm` (48px) |
| Leaderboard table | Leaderboard.js | 110-121 | Colonnes non-responsives | Cacher colonnes sur mobile avec `hidden sm:table-cell` |

### 1.2 Problèmes Haute Priorité (HIGH)

| Composant | Fichier | Ligne | Problème | Solution |
|-----------|---------|-------|----------|----------|
| ProductsPreview | ProductsPreview.js | 97 | Manque breakpoint `md:` | `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4` |
| SetupCreator modal | SetupCreator.js | 155 | max-w-lg trop étroit tablette | `max-w-lg md:max-w-2xl` |
| Header menu mobile | Header.js | 150 | max-w-sm trop étroit tablette | `max-w-sm md:max-w-md` |
| Dashboard pillars | dashboard/page.js | 77 | Saut 2→4 colonnes | `grid-cols-2 sm:grid-cols-3 md:grid-cols-4` |

### 1.3 Problèmes Moyens (MEDIUM)

| Composant | Fichier | Ligne | Problème | Solution |
|-----------|---------|-------|----------|----------|
| Pillars sizing | Pillars.js | 181 | Taille hardcodée | `sm:w-24 sm:h-24` |
| AIChat width | AIChat.js | 221 | 420px dépasse mobile | `w-full md:w-[420px]` |
| SetupCreator height | SetupCreator.js | 177 | 60vh trop court tablette | `max-h-[60vh] md:max-h-[75vh]` |

---

## PARTIE 2: INCOHÉRENCES DONNÉES (Frontend vs Backend)

### 2.1 Problèmes de Cache Multi-Couches

```
PROBLÈME: 4 couches de cache non-synchronisées

Couche 1: ISR (Next.js) → 1 heure
Couche 2: API Cache → 5 min + stale-while-revalidate 1h
Couche 3: Hooks Cache → 5-60 min selon endpoint
Couche 4: Component State → 1 heure (SAFEBreakdown)

RÉSULTAT: Scores peuvent être jusqu'à 2h en retard
```

### 2.2 Incohérences de Calcul

| Problème | Localisation | Impact |
|----------|--------------|--------|
| Arrondi Math.round() | Leaderboard:49, supabase-optimized:212 | 79.6 → 80 (SAFE) vs 79 (OK) |
| Seuils hardcodés 3x | design-tokens, ScoreBadge, ScoreCircle | Couleurs différentes même score |
| Pillar code mismatch | SAFEBreakdown:66 | `scores['s']` vs `pillar.code='S'` |
| Fallback à 0 pour null | Leaderboard:49 | Score 0 = non-évalué indistinguable |

### 2.3 Problèmes de Synchronisation Base de Données

| Problème | Table | Impact |
|----------|-------|--------|
| Scores périmés | safe_scoring_results | calculated_at < MAX(evaluations.evaluation_date) |
| Classification dupliquée | norms vs safe_scoring_definitions | is_essential peut différer |
| Applicabilité non-respectée | evaluations | Evaluations pour normes non-applicables comptées |
| Multi-types ignorés | products | Score unique pour produit multi-type |
| Poids normes hardcodés | scoring_engine.py | Pas dans la DB, risque de désynchronisation |

---

## PARTIE 3: AUTOMATISATION

### 3.1 Déjà Automatisé

| Process | Fréquence | Source |
|---------|-----------|--------|
| Prix crypto | Quotidien 6h UTC | data-refresh-pipeline.yml |
| Scraping produits | Hebdo (Lundi) | data-refresh-pipeline.yml |
| Incidents sécurité | Toutes les 6h | incident-scraper.yml |
| Backup DB | Quotidien 3h UTC | backup.yml |
| Documentation normes | Mensuel | norm-doc-scraper.yml |

### 3.2 À Automatiser (Priorité Critique)

1. **Invalidation Cache Automatique**
   - Quand: Après recalcul scores
   - Action: Appeler `/api/admin/invalidate-cache`
   - Bénéfice: Données toujours fraîches

2. **Classification Type Produit**
   - Quand: Nouveau produit ajouté
   - Action: Auto-trigger classify_handler
   - Bénéfice: Produits immédiatement évaluables

3. **Matrice Applicabilité**
   - Quand: Nouvelle norme/type ajouté
   - Action: Régénérer matrice norm_applicability
   - Bénéfice: Évaluations possibles sans intervention

4. **Validation Qualité Évaluations**
   - Quand: Après évaluation IA
   - Action: Vérifier cohérence, confiance
   - Bénéfice: Prévenir hallucinations IA

### 3.3 À Automatiser (Haute Priorité)

5. **Alertes Données Périmées**
   - Check: Produits non-scrapés > 7 jours
   - Check: Scores > 30 jours
   - Action: Email admin

6. **Monitoring Performance**
   - Track: Durée pipelines GitHub Actions
   - Alert: Si durée > 2x historique

7. **Tracking Coûts API**
   - Monitor: Quotas API (OpenRouter, etc.)
   - Alert: Si usage > 80%

---

## PARTIE 4: PLAN D'IMPLÉMENTATION

### Phase 1: Corrections Critiques (Semaine 1-2)

**Responsive:**
- [ ] Fix SetupCard grids (lignes 273, 299)
- [ ] Fix touch targets (min 44px)
- [ ] Fix Leaderboard responsive columns

**Données:**
- [ ] Centraliser seuils scores dans design-tokens.js
- [ ] Fix pillar code lowercase/uppercase
- [ ] Ajouter distinction null vs 0 (N/A vs score réel)

**Automation:**
- [ ] Ajouter cache invalidation après recalcul scores

### Phase 2: Haute Priorité (Semaine 3-4)

**Responsive:**
- [ ] Ajouter breakpoints `md:` manquants
- [ ] Élargir modals/menus pour tablettes

**Données:**
- [ ] Implémenter trigger SQL: evaluation INSERT → recalcul score
- [ ] Ajouter colonne `weight` dans table norms
- [ ] Filtrer evaluations par applicabilité dans scoring

**Automation:**
- [ ] Auto-classification types produits
- [ ] Alertes données périmées

### Phase 3: Optimisation (Semaine 5-6)

**Responsive:**
- [ ] Audit complet tous composants
- [ ] Tests sur vrais appareils

**Données:**
- [ ] Consolider norms + safe_scoring_definitions
- [ ] Ajouter scores par type produit

**Automation:**
- [ ] Dashboard monitoring performance
- [ ] Validation qualité évaluations

---

## PARTIE 5: FICHIERS À MODIFIER

### Responsive Design
```
web/components/SetupCard.js (lignes 77, 273, 299)
web/components/Leaderboard.js (lignes 110-121)
web/components/ProductsPreview.js (ligne 97)
web/components/SetupCreator.js (lignes 155, 177)
web/components/Header.js (ligne 150)
web/app/dashboard/page.js (ligne 77)
web/components/Pillars.js (ligne 181)
web/components/AIChat.js (ligne 221)
```

### Cohérence Données
```
web/libs/design-tokens.js (centraliser seuils)
web/components/ScoreBadge.js (utiliser design-tokens)
web/components/ScoreCircle.js (utiliser design-tokens)
web/app/products/[slug]/page.js (utiliser design-tokens)
web/app/leaderboard/page.js (lignes 49-55, distinction null)
web/components/SAFEBreakdown.js (ligne 66, fix pillar codes)
src/core/scoring_engine.py (filtrer par applicabilité)
```

### Automation
```
src/automation/data_refresh_pipeline.py (ajouter cache invalidation)
.github/workflows/data-refresh-pipeline.yml (ajouter steps)
config/migrations/ (triggers SQL)
web/app/api/admin/invalidate-cache/route.js (améliorer)
```

---

## PARTIE 6: MÉTRIQUES DE SUCCÈS

| Métrique | Avant | Objectif |
|----------|-------|----------|
| Touch targets < 44px | 3+ violations | 0 |
| Composants sans md: breakpoint | 5+ | 0 |
| Délai cache max | 2h+ | < 5 min |
| Scores périmés (> 30j) | Variable | 0 |
| Interventions manuelles/semaine | Plusieurs | < 2 |

---

## Commandes pour Démarrer

```bash
# Voir l'état actuel des données
curl http://localhost:3000/api/admin/data-freshness

# Recalculer tous les scores
curl -X POST http://localhost:3000/api/admin/recalculate-scores

# Invalider tous les caches
curl -X POST http://localhost:3000/api/admin/invalidate-cache -d '{"type":"all"}'
```
