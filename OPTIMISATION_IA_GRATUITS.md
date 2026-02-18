# OPTIMISATION DES PROVIDERS IA GRATUITS

## Date: 2026-01-10

---

## 1. ÉTAT ACTUEL DES PROVIDERS

### Temps de Réponse Mesurés (prompt simple)

| Provider | Temps | Status | Limite Quotidienne |
|----------|-------|--------|-------------------|
| **Groq** | 0.83s | ✅ Disponible | 100K tokens/clé/jour |
| **SambaNova** | 1.87s | ✅ Disponible | **ILLIMITÉ** |
| **Cerebras** | 3.29s | ✅ Disponible | **ILLIMITÉ** |
| Gemini | 0.63s | ⚠️ Rate limited | 1000 req/clé/jour |

### Clés Configurées

| Provider | Clés | Capacité Totale |
|----------|------|-----------------|
| Gemini | 7 | 7,000 req/jour |
| Groq | 5 | 500K tokens/jour |
| Cerebras | 3 | **ILLIMITÉ** |
| SambaNova | 5 | **ILLIMITÉ** |
| OpenRouter | 10 | 500 req/jour (gratuit) |

---

## 2. PROBLÈMES IDENTIFIÉS

### 2.1. SambaNova sous-utilisé
SambaNova a **pas de limite quotidienne** mais n'est utilisé que comme fallback tertiaire.
Il devrait être prioritaire quand Groq est épuisé.

### 2.2. Ordre de fallback non optimal
Actuellement: `Gemini → Cerebras → Groq → DeepSeek → Ollama`

Optimal: `Groq → SambaNova → Cerebras → Gemini → Ollama`

### 2.3. Gemini monopolise les appels
Gemini est souvent utilisé en premier mais s'épuise vite (rate limit 15 RPM).

---

## 3. OPTIMISATIONS RECOMMANDÉES

### 3.1. Nouvel ordre de fallback (SPEED + UNLIMITED)

```python
# OPTIMAL: Speed first, then unlimited quota
apis = [
    ('Groq', groq_available, self._call_groq_rotation),      # 0.83s, 500K/jour
    ('SambaNova', sambanova_available, self._call_sambanova_rotation),  # 1.87s, ILLIMITÉ
    ('Cerebras', cerebras_available, self._call_cerebras_rotation),     # 3.29s, ILLIMITÉ
    ('Gemini', gemini_available, self._call_gemini_rotation),           # 0.63s mais rate-limited
    ('Ollama', ollama_available, self._call_ollama),                    # Local, lent
]
```

### 3.2. Stratégie par type de tâche

| Type de Tâche | Provider Principal | Fallback |
|---------------|-------------------|----------|
| Évaluation normes (CRITICAL) | Gemini Pro | SambaNova |
| Évaluation normes (SIMPLE) | Groq | SambaNova |
| Classification | Groq | Cerebras |
| Compatibilité | SambaNova | Cerebras |
| Contenu marketing | Gemini Flash | SambaNova |
| Résumés docs | Groq | SambaNova |

### 3.3. Rotation intelligente des quotas

```python
def get_best_provider_for_task(task_type):
    """Sélectionne le provider optimal selon quota et vitesse."""

    # Si Groq a encore du quota → utiliser (le plus rapide)
    if not groq_quota_exhausted:
        return 'Groq'

    # Sinon → SambaNova (illimité, rapide)
    if sambanova_available:
        return 'SambaNova'

    # Sinon → Cerebras (illimité)
    if cerebras_available:
        return 'Cerebras'

    # Fallback → Gemini (rate-limited mais bonne qualité)
    return 'Gemini'
```

---

## 4. ESTIMATION DES TEMPS D'ANALYSE

### 4.1. Temps par opération (moyenne)

| Opération | Tokens | Temps Groq | Temps SambaNova |
|-----------|--------|------------|-----------------|
| Évaluation 1 norme | ~1500 | 2-3s | 3-5s |
| Classification produit | ~1000 | 1-2s | 2-3s |
| Compatibilité types | ~800 | 1-2s | 2-3s |
| Résumé documentation | ~800 | 1-2s | 2-3s |

### 4.2. Temps pour batch complet

| Opération | Quantité | Temps Total (Groq) | Temps Total (SambaNova) |
|-----------|----------|--------------------|-----------------------|
| Évaluer 1 produit (50 normes) | 50 | ~2-3 min | ~3-5 min |
| Classer 100 produits | 100 | ~3-5 min | ~5-8 min |
| Générer 50 compatibilités types | 50 | ~2-3 min | ~3-5 min |

### 4.3. Capacité quotidienne théorique

Avec rotation optimale:
- **Groq (5 clés)**: ~500K tokens = ~300-400 évaluations
- **SambaNova (5 clés)**: **ILLIMITÉ** = ~5000+ évaluations/jour
- **Cerebras (3 clés)**: **ILLIMITÉ** = ~3000+ évaluations/jour

**Total journalier possible: 8000+ évaluations**

---

## 5. ACTIONS IMMÉDIATES

### 5.1. Modifier l'ordre de fallback dans api_provider.py

```python
# Ligne ~210 - Modifier l'ordre des APIs
apis = [
    ('Groq', groq_available, self._call_groq_rotation),  # Fastest
    ('SambaNova', len(SAMBANOVA_API_KEYS) > 0, self._call_sambanova_rotation),  # Unlimited!
    ('Cerebras', cerebras_available, self._call_cerebras_rotation),  # Unlimited
    ('Gemini', gemini_available, lambda p, t, temp: self._call_gemini_rotation(p, t, temp, model=model)),
    ('DeepSeek', DEEPSEEK_API_KEY, self._call_deepseek),
    ('Ollama', self._check_ollama_available(), self._call_ollama),
]
```

### 5.2. Ajouter SambaNova dans call_for_norm()

Actuellement SambaNova n'est pas utilisé pour les évaluations de normes.
L'ajouter comme fallback après Groq.

### 5.3. Surveiller les quotas en temps réel

Ajouter un endpoint `/api/admin/ai-status` pour voir:
- Clés disponibles par provider
- Quotas restants
- Temps de réponse moyen

---

## 6. RÉSUMÉ

| Métrique | Avant | Après Optimisation |
|----------|-------|-------------------|
| Providers illimités utilisés | Peu | SambaNova + Cerebras |
| Évaluations/jour max | ~1000 | **8000+** |
| Temps moyen/évaluation | 3-5s | **2-3s** |
| Blocage quota | Fréquent | Rare |

**Gain potentiel: 8x plus d'évaluations par jour**
