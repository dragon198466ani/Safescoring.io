# PIPELINE DE MISE À JOUR DES DONNÉES - SafeScoring

## Date: 2026-01-10
## Status: OPTIMISÉ

---

## VUE D'ENSEMBLE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PIPELINE DE DONNÉES SAFESCORING                          │
│                                                                             │
│   ÉTAPE 0 → ÉTAPE 1 → ÉTAPE 2 → ÉTAPE 3 → ÉTAPE 4 → ÉTAPE 5 → ÉTAPE 6     │
│   Normes    Produits   Types    Applic.   Éval.    Scores    Compat.       │
│                                                                             │
│   Stratégie IA: 100% optimisée (1000 normes couvertes)                     │
│   Providers: Groq → SambaNova → Cerebras → Gemini (ordre optimisé)         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ÉTAPE 0: MISE À JOUR DES NORMES

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 0: MISE À JOUR DES DONNÉES NORMES                                     │
│ Status: ✅ IMPLÉMENTÉ + CACHE                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ Fichier: src/automation/norm_doc_scraper.py                                 │
│                                                                             │
│ Actions:                                                                    │
│ • Scraper la doc officielle (NIST, EIP, RFC, BIP)                          │
│ • Générer résumé IA → norms.official_doc_summary                           │
│ • Mettre à jour norms.official_link                                        │
│                                                                             │
│ OPTIMISATION APPLIQUÉE (2026-01-10):                                       │
│ ✅ Cache avec hash de contenu ajouté                                       │
│ ✅ Évite les appels IA redondants                                          │
│                                                                             │
│ Tables: norms                                                               │
│ TTL: 30 jours (les normes changent rarement)                               │
│ Fréquence: Mensuel (1er du mois)                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Commande:**
```bash
python -m src.automation.norm_doc_scraper --limit 50
```

---

## ÉTAPE 1: MISE À JOUR DES PRODUITS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 1: MISE À JOUR DES DONNÉES PRODUITS                                   │
│ Status: ✅ IMPLÉMENTÉ + DÉTECTION FERMETURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ Fichiers:                                                                   │
│ • src/core/scraper.py - Scraping contenu                                   │
│ • src/automation/service_status_monitor.py - Détection fermeture           │
│                                                                             │
│ Actions:                                                                    │
│ 1.1 Scraper le site officiel → media.scraped_content                       │
│ 1.2 Extraire les PDFs (audits, whitepapers)                                │
│ 1.3 Scraper GitHub README → media.github_info                              │
│ 1.4 Détecter services fermés (HTTP 404, keywords)                          │
│                                                                             │
│ OPTIMISATION APPLIQUÉE (2026-01-10):                                       │
│ ✅ service_status_monitor.py créé                                          │
│ ✅ Détection automatique: "discontinued", "shutdown", "closed"             │
│ ✅ Log des produits fermés                                                  │
│                                                                             │
│ Tables: products, media                                                     │
│ TTL: 7 jours (cache SQLite)                                                │
│ Fréquence: Hebdomadaire (Lundi 2h UTC)                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Commandes:**
```bash
# Scraping produits
python -m src.core.scraper --product ledger-nano-x

# Détection fermetures
python -m src.automation.service_status_monitor
```

---

## ÉTAPE 2: CLASSIFICATION DES TYPES

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 2: CLASSIFICATION DES TYPES                                           │
│ Status: ✅ OPTIMAL                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ Fichiers:                                                                   │
│ • src/core/smart_type_evaluator.py                                         │
│ • src/automation/handlers/classify_handler.py                              │
│                                                                             │
│ Actions:                                                                    │
│ 2.1 Vérifier que chaque produit a un type_id                               │
│ 2.2 Classifier avec IA si type manquant                                    │
│ 2.3 Créer le mapping product_type_mapping (multi-type supporté)            │
│                                                                             │
│ Méthode IA: call_for_classification()                                      │
│ Providers: Groq → SambaNova → Cerebras (OPTIMISÉ)                          │
│ Cache: 7 jours                                                              │
│                                                                             │
│ Tables: product_type_mapping, product_types                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ÉTAPE 3: GÉNÉRATION APPLICABILITÉ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 3: GÉNÉRATION APPLICABILITÉ (Type × Norm)                             │
│ Status: ✅ OPTIMAL                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ Fichier: src/core/applicability_generator.py                                │
│                                                                             │
│ Actions:                                                                    │
│ 3.1 Pour chaque type, déterminer TRUE/FALSE pour chaque norme              │
│ 3.2 Utiliser règles hardcodées (HARDWARE_ONLY, DEFI_ONLY, etc.)            │
│ 3.3 Compléter avec IA si doute                                             │
│                                                                             │
│ Méthode IA: call_for_applicability()                                       │
│ Stratégie: get_applicability_strategy() par type produit                   │
│ Cache: 7 jours                                                              │
│                                                                             │
│ Tables: norm_applicability (70+ types × 1000 normes)                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ÉTAPE 4: ÉVALUATION PRODUITS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 4: ÉVALUATION PRODUITS (Product × Norm)                               │
│ Status: ✅ OPTIMAL + STRATÉGIE IA COMPLÈTE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Fichier: src/core/smart_evaluator.py                                        │
│                                                                             │
│ Actions:                                                                    │
│ 4.1 Charger le contenu scrapé (étape 1)                                    │
│ 4.2 Filtrer les normes applicables (étape 3)                               │
│ 4.3 Évaluer chaque norme: YES / YESp / NO / TBD                            │
│ 4.4 Valider les inconsistances (norm_dependencies.py)                      │
│ 4.5 Sauvegarder dans evaluations                                           │
│                                                                             │
│ STRATÉGIE IA (OPTIMISÉE 2026-01-10):                                       │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ NORMES NUMÉRIQUES (842):                                                ││
│ │ • CRITICAL (S01-S40, A01-A30): Gemini Pro + Pass2 Review               ││
│ │ • COMPLEX (S41-S90, S221-S260): DeepSeek-R1 (reasoning)                ││
│ │ • MODERATE (S51-S180): Gemini Flash                                     ││
│ │ • SIMPLE/TRIVIAL (F*, E*): Groq (GRATUIT)                              ││
│ │                                                                         ││
│ │ NORMES TEXTE (158) - NOUVEAU:                                          ││
│ │ • S-ADV-*, S-PQC-*, S-NIST-*, S-FIPS-*: CRITICAL + Pass2              ││
│ │ • S-ZK-*, S-PVY-*, A-OWASP-*: COMPLEX (DeepSeek-R1)                   ││
│ │ • S-BIP-*, E-EIP-*, F-ISO-*: SIMPLE (Groq gratuit)                    ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ Méthode IA: call_for_norm() + call_expert()                                │
│ Fichier stratégie: src/core/ai_strategy.py                                 │
│                                                                             │
│ Tables: evaluations                                                         │
│ TRIGGER: → calculate_product_scores() automatique                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Répartition IA (1000 normes):**
| Complexité | Normes | Modèle | Coût |
|------------|--------|--------|------|
| CRITICAL | 94 (9.4%) | Gemini Pro | GRATUIT |
| COMPLEX | 121 (12.1%) | DeepSeek-R1 | GRATUIT |
| MODERATE | 146 (14.6%) | Gemini Flash | GRATUIT |
| SIMPLE | 399 (39.9%) | Groq | GRATUIT |
| TRIVIAL | 240 (24.0%) | Groq | GRATUIT |

---

## ÉTAPE 5: CALCUL DES SCORES

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 5: CALCUL DES SCORES                                                  │
│ Status: ✅ UNIFIÉ (Trigger SQL = source de vérité)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ Fichiers:                                                                   │
│ • config/auto_score_calculation.sql - TRIGGER (source de vérité)           │
│ • src/core/scoring_engine.py - Batch/debug uniquement                      │
│                                                                             │
│ Fonctionnement:                                                             │
│ 1. Trigger SQL se déclenche automatiquement sur INSERT/UPDATE evaluations  │
│ 2. Calcule les scores par pilier (S, A, F, E)                              │
│ 3. Met à jour safe_scoring_results en temps réel                           │
│                                                                             │
│ Python (scoring_engine.py):                                                 │
│ • --recalculate-all: Recalcul batch de tous les produits                   │
│ • --dry-run: Simulation sans écriture                                      │
│ • Debug: Affichage détaillé du calcul                                      │
│                                                                             │
│ Tables: safe_scoring_results, score_history                                │
│ Fréquence: Temps réel (trigger)                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ÉTAPE 6: COMPATIBILITÉ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 6: COMPATIBILITÉ (OPTIONNELLE)                                        │
│ Status: ✅ OPTIMAL                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ Fichiers:                                                                   │
│ • src/core/type_compatibility_generator.py - Type × Type                   │
│ • src/core/update_product_compatibility.py - Product × Product             │
│                                                                             │
│ Actions:                                                                    │
│ 6.1 Type × Type → type_compatibility                                       │
│ 6.2 Product × Product → product_compatibility                              │
│                                                                             │
│ OPTIMISATION APPLIQUÉE (2026-01-10):                                       │
│ ✅ type_compatibility_generator.py: tokens 500 → 800                       │
│                                                                             │
│ Méthode IA: call_for_compatibility() / call_for_product_compatibility()   │
│ Stratégie: get_compatibility_strategy()                                    │
│                                                                             │
│ Tables: type_compatibility, product_compatibility                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PROVIDERS IA (OPTIMISÉ 2026-01-10)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ORDRE DE FALLBACK OPTIMISÉ                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   call() générique:                                                         │
│   1. Groq      (0.83s)  → Le plus rapide, 500K tok/jour                    │
│   2. SambaNova (1.87s)  → ILLIMITÉ                                         │
│   3. Cerebras  (3.29s)  → ILLIMITÉ                                         │
│   4. Gemini    (rate-limited)                                              │
│   5. Ollama    (local, lent)                                               │
│                                                                             │
│   call_for_norm() CRITICAL:                                                │
│   1. OpenRouter Gemini Pro → Meilleure nuance                              │
│   2. OpenRouter DeepSeek-R1 → Meilleur reasoning                           │
│   3. Ollama DeepSeek → Local fallback                                      │
│                                                                             │
│   call_for_norm() SIMPLE/TRIVIAL:                                          │
│   1. Groq      → Gratuit + rapide                                          │
│   2. SambaNova → Gratuit + illimité                                        │
│   3. Cerebras  → Gratuit + illimité                                        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ CAPACITÉ: 8000+ évaluations/jour (gratuit)                                 │
│ COÛT MENSUEL: $0 (100% providers gratuits)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## FICHIERS MODIFIÉS (2026-01-10)

| Fichier | Modification |
|---------|--------------|
| `src/core/ai_strategy.py` | +350 lignes TEXT_NORM_PATTERNS |
| `src/core/api_provider.py` | Ordre fallback optimisé |
| `src/automation/norm_doc_scraper.py` | Cache avec hash contenu |
| `src/core/type_compatibility_generator.py` | Tokens 500 → 800 |
| `src/marketing/seo_generator.py` | Migration call() → call_for_content() |
| `src/automation/service_status_monitor.py` | Créé (détection fermetures) |

---

## COMMANDES PIPELINE COMPLET

```bash
# ÉTAPE 0: Mise à jour normes (mensuel)
python -m src.automation.norm_doc_scraper --limit 100

# ÉTAPE 1: Mise à jour produits (hebdomadaire)
python -m src.automation.service_status_monitor
python -m src.core.scraper --all

# ÉTAPE 2: Classification types
python -m src.automation.unified_pipeline --step classify

# ÉTAPE 3: Génération applicabilité
python -m src.automation.unified_pipeline --step applicability

# ÉTAPE 4: Évaluation produits
python -m src.automation.unified_pipeline --step evaluate --product ledger-nano-x

# ÉTAPE 5: Scores (automatique via trigger)
# Optionnel: recalcul batch
python -m src.core.scoring_engine --recalculate-all

# ÉTAPE 6: Compatibilité
python -m src.core.type_compatibility_generator --generate-all
python -m src.core.update_product_compatibility --product ledger-nano-x
```

---

## RÉSUMÉ OPTIMISATIONS

```
+==================================================================+
|                 PIPELINE SAFESCORING - OPTIMISÉ                   |
+==================================================================+
|                                                                   |
|   STRATÉGIE IA:                                                  |
|   ✅ 1000/1000 normes avec stratégie appropriée                  |
|   ✅ TEXT_NORM_PATTERNS ajoutés (158 normes texte)               |
|   ✅ Ordre fallback optimisé (Groq → SambaNova → Cerebras)       |
|                                                                   |
|   PROGRAMMES:                                                     |
|   ✅ norm_doc_scraper.py - Cache ajouté                          |
|   ✅ type_compatibility_generator.py - Tokens augmentés          |
|   ✅ seo_generator.py - Migré vers call_for_content()            |
|   ✅ service_status_monitor.py - Créé                            |
|                                                                   |
|   CAPACITÉ:                                                       |
|   ✅ 8000+ évaluations/jour                                      |
|   ✅ 100% gratuit                                                 |
|   ✅ Temps moyen: 2-3s par évaluation                            |
|                                                                   |
+==================================================================+
```
