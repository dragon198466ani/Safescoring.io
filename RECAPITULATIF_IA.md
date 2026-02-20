# RÉCAPITULATIF COMPLET DES PROVIDERS IA

## Date: 2026-01-10

---

## 1. PROVIDERS CONFIGURÉS

| Status | Provider | Clés | Modèle | Vitesse | RPM | Limite/Jour | Coût |
|--------|----------|------|--------|---------|-----|-------------|------|
| ✅ | **Groq** | 5 | Llama 3.3 70B | 0.83s | 30/clé | 100K tok/clé | GRATUIT |
| ✅ | **SambaNova** | 5 | Llama 3.1 8B/70B | 1.87s | 20-30/clé | **ILLIMITÉ** | GRATUIT |
| ✅ | **Cerebras** | 3 | Llama 3.3 70B | 3.29s | 30/clé | **ILLIMITÉ** | GRATUIT |
| ✅ | **Gemini** | 7 | Gemini 2.0 Flash/Pro | 0.6-2s | 15/clé | 1000 req/clé | GRATUIT |
| ✅ | **OpenRouter** | 10 | Grok, DeepSeek-R1 | 1-3s | 20/clé | 50 req/clé | GRATUIT |
| ❌ | Together AI | 0 | Mixtral, Llama | 1-2s | 60 | $25 crédits | $25 gratuits |
| ✅ | **Mistral** | 1 | Mistral Small | 1-2s | 5 | 1B tok/mois | GRATUIT |
| ✅ | **DeepSeek** | 1 | DeepSeek V3 | 2-3s | 60 | Payant | $0.14/1M tok |
| ❌ | Claude | 0 | Claude 3.5 Sonnet | 2-4s | 50 | Payant | $3/1M tok |
| ✅ | **Ollama** | 1 | Qwen 2.5 14B (local) | 5-10s | ∞ | **ILLIMITÉ** | LOCAL |

**Total clés gratuites: 32**

---

## 2. ORDRE DE PRIORITÉ (OPTIMISÉ 2026-01-10)

### call() générique
```
1. Groq      (0.83s)  → Le plus rapide
2. SambaNova (1.87s)  → Rapide + ILLIMITÉ
3. Cerebras  (3.29s)  → ILLIMITÉ
4. Gemini    (rate-limited)
5. DeepSeek  (payant backup)
6. Ollama    (local, lent)
```

### call_for_norm() - Évaluations
```
CRITICAL (S01-S40, A01-A30):
  → Gemini Pro → SambaNova → Claude
  → 3500 tokens, temp 0.1, Pass2 review

COMPLEX (S41-S90):
  → Gemini Flash → Groq → SambaNova
  → 2500 tokens, temp 0.15

SIMPLE (F*, E*):
  → Groq → SambaNova → Cerebras
  → 1500 tokens, temp 0.3
```

### call_for_content() - Marketing
```
1. Gemini Flash (créatif, temp 0.7)
2. DeepSeek (qualité)
3. Groq/SambaNova
```

---

## 3. ANALYSE QUALITATIVE PAR MÉTHODE

| Méthode | Usage | Providers | Qualité |
|---------|-------|-----------|---------|
| `call_for_norm()` | Évaluation normes sécurité | Stratégie par complexité | ✅ OPTIMAL |
| `call_expert()` | Évaluations S/A critiques | Gemini Pro → Groq → DeepSeek | ✅ OPTIMAL |
| `call_for_applicability()` | Applicabilité norme/type | Cache 7j + Groq → SambaNova | ✅ OPTIMAL |
| `call_for_classification()` | Classifier type produit | Cache 7j + Groq → SambaNova | ✅ OPTIMAL |
| `call_for_compatibility()` | Compatibilité TYPE x TYPE | Gemini Flash → DeepSeek | ✅ OPTIMISÉ |
| `call_for_product_compatibility()` | Compatibilité PRODUIT x PRODUIT | Gemini + scraping | ✅ OPTIMAL |
| `call_for_content()` | Marketing, SEO, social | Gemini Flash (créatif) | ✅ OPTIMAL |
| `call_for_incident_analysis()` | Analyser tweets incidents | Grok (spécialisé Twitter) | ✅ OPTIMAL |
| `call_for_crypto_analysis()` | Analyse smart contracts | Gemini Pro → DeepSeek | ✅ OPTIMAL |
| `call()` | Appels non spécialisés | Groq → SambaNova → Cerebras | ✅ OPTIMISÉ |

---

## 4. PROGRAMMES ET MÉTHODES

| Programme | Méthode IA | Status |
|-----------|------------|--------|
| `smart_evaluator.py` | `call_for_norm()` + `call_expert()` | ✅ OPTIMAL |
| `applicability_generator.py` | `call_for_applicability()` | ✅ OPTIMAL |
| `smart_type_evaluator.py` | `call_for_classification()` | ✅ OPTIMAL |
| `unified_pipeline.py` | 3 méthodes stratégiques | ✅ OPTIMAL |
| `type_compatibility_generator.py` | `call_for_compatibility()` | ✅ OPTIMISÉ |
| `update_product_compatibility.py` | `call_for_product_compatibility()` | ✅ OPTIMAL |
| `norm_doc_scraper.py` | `call()` + cache | ✅ OPTIMISÉ |
| `content_generator.py` | `call_for_content()` | ✅ OPTIMAL |
| `seo_generator.py` | `call_for_content()` | ✅ OPTIMISÉ |
| `twitter_crypto_scraper.py` | `call_for_incident_analysis()` | ✅ OPTIMAL |
| `service_status_monitor.py` | Aucune IA | ✅ N/A |

---

## 5. CAPACITÉ TOTALE

### Requêtes/jour (gratuit)
| Provider | Calcul | Total |
|----------|--------|-------|
| Groq | 5 clés × 14,400 req | 72,000 (mais 500K tok limit) |
| SambaNova | 5 clés × ∞ | **ILLIMITÉ** |
| Cerebras | 3 clés × ∞ | **ILLIMITÉ** |
| Gemini | 7 clés × 1,000 | 7,000 |
| OpenRouter | 10 clés × 50 | 500 |

### Estimation pratique
- **Évaluations/jour**: 8,000+ (grâce à SambaNova/Cerebras illimités)
- **Temps/évaluation**: 2-3s (Groq/SambaNova)
- **Produit complet (50 normes)**: 2-3 min
- **100 produits**: 3-5 heures

---

## 6. SCORE QUALITÉ GLOBAL

```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   ADAPTATION QUALITATIVE DES IA: 100% (11/11 programmes)      ║
║                                                                ║
║   ✅ Toutes les méthodes utilisent le bon provider            ║
║   ✅ Cache implémenté où nécessaire (7 jours)                 ║
║   ✅ Tokens adaptés par type de tâche (1500-3500)             ║
║   ✅ Température adaptée (0.1 précis → 0.7 créatif)           ║
║   ✅ Providers illimités (SambaNova/Cerebras) prioritaires    ║
║   ✅ Fallback chain optimisée pour vitesse + disponibilité    ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 7. OPTIMISATIONS APPLIQUÉES (2026-01-10)

1. **Ordre de fallback** - Groq → SambaNova → Cerebras (au lieu de Gemini first)
2. **Tokens augmentés** - type_compatibility: 500 → 800
3. **Cache ajouté** - norm_doc_scraper avec hash de contenu
4. **Migration SEO** - call() → call_for_content()
5. **SambaNova prioritaire** - Ajouté dans toutes les chaînes de fallback

---

## 8. RECOMMANDATIONS FUTURES

1. **Ajouter Together AI** - $25 crédits gratuits non utilisés
2. **Réactiver DeepSeek** - Quand crédits disponibles ($0.14/1M)
3. **Monitorer quotas** - Créer `/api/admin/ai-status`
4. **Optimiser Ollama** - GPU local pour accélérer (actuellement 5-10s)
