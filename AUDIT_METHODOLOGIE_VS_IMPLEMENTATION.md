# AUDIT : Methodologie SAFE vs Implementation Reelle

## Date : 2026-02-06

---

## 1. RESUME EXECUTIF

L'evaluateur IA produit des scores **gonfles** (moyenne 90.2%) car les prompts
contredisent directement la methodologie "Evidence-Based" affichee sur le site.

| Metrique | Site promet | Code fait | Ecart |
|----------|-----------|-----------|-------|
| Base d'evaluation | Evidence verifiable | "Reasonable inference" + "Default to YES" | CRITIQUE |
| Score moyen attendu | 50-70% (bon produit) | 90.2% reel | +20-40 points |
| Distribution | 4 niveaux differencies | 93% dans "Excellent" | Inutile |
| Pilier F moyen | Variable | ~100% partout | Aucune discrimination |

---

## 2. CONTRADICTIONS DETECTEES

### 2.1 "Evidence-Based" vs "Default to YES"

**Page /methodology :**
> "Each evaluation is backed by verifiable evidence:
> documentation, audits, certifications, or direct verification"

**smart_evaluator.py ligne 852-857 :**
> "CRITICAL PRINCIPLE - DEFAULT TO YES:
> When in doubt between YES and NO -> choose YES
> When no explicit evidence -> choose YESp
> Only use NO when EXPLICIT evidence the feature is MISSING"

**Impact :** L'IA dit YES a 89-99% des normes sans preuve.

### 2.2 Seuils inutiles

**score-utils.js :**
- EXCELLENT >= 80 (vert)
- GOOD >= 60 (ambre)
- FAIR >= 40 (orange)
- POOR < 20 (rouge)

**Realite DB :**
- 93% des 1547 produits >= 80 (tout est "Excellent")
- 4% entre 60-79
- 3% en dessous de 60

**Consequence :** Un utilisateur ne peut pas differencier Ledger d'un scam.

### 2.3 Scores attendus vs reels

**Prompt (ligne 882-886) dit :**
- Top hardware wallets : 70-90%
- Good software wallets : 60-75%
- Solid DeFi protocols : 55-70%

**Base de donnees montre :**
- Quasi tous les produits : 85-99%
- Le prompt est ignore par l'IA car le "DEFAULT TO YES" prime.

### 2.4 Incoherence pilier A

| Fichier | Nom |
|---------|-----|
| score-utils.js | ~~Accessibility~~ -> Adversity (corrige) |
| methodology page | Adversity |
| smart_evaluator.py | Attack Resistance & Resilience |
| Pillars.js | Duress & Coercion Resistance |

**Correction appliquee :** score-utils.js aligne sur "Adversity".

---

## 3. CAUSE RACINE

Le prompt d'evaluation (smart_evaluator.py lignes 847-893) contient :

```
GENEROUS EVALUATION RULES (IMPORTANT)
CRITICAL PRINCIPLE - DEFAULT TO YES
Silence on a feature = NOT a reason for NO (use YESp or YES)
HARDWARE WALLET DEFAULTS: default to YES/YESp unless explicitly contradicted
```

Cela signifie :
- Pas de preuve = YES (au lieu de TBD)
- Pas d'info = YESp (au lieu de N/A ou TBD)
- Seule une contradiction explicite = NO

L'IA fait exactement ce qu'on lui demande : elle dit YES a tout.

---

## 4. CORRECTIONS PROPOSEES (prompts)

### 4.1 Remplacer "DEFAULT TO YES" par "EVIDENCE REQUIRED"

**AVANT (ligne 852-857) :**
```
CRITICAL PRINCIPLE - DEFAULT TO YES:
- When in doubt between YES and NO -> choose YES
- When no explicit evidence either way -> choose YESp
- Only use NO when there's EXPLICIT evidence the feature is MISSING
```

**APRES :**
```
CRITICAL PRINCIPLE - EVIDENCE REQUIRED:
- YES = Documented in official sources, audit reports, or verifiable source code
- YESp = Mathematically inherent to the protocol (secp256k1 for ETH, Ed25519 for SOL)
- NO = No evidence found, or norm clearly not applicable to product's architecture
- TBD = Partial evidence exists but insufficient to confirm or deny (max 10%)

DEFAULT: If no documentation or evidence exists -> NO (not YES)
SILENCE is NOT evidence of implementation.
```

### 4.2 Supprimer "BE GENEROUS" des prompts piliers

- Pilier F prompt : "BE GENEROUS FOR ESTABLISHED PRODUCTS" -> "VERIFY CLAIMS WITH EVIDENCE"
- Pilier E prompt : "BE GENEROUS BUT ACCURATE" -> "BE ACCURATE AND SPECIFIC"
- Prompt DeFi : "2+ years = YES for security" -> "2+ years = CONSIDER positively, but still require evidence"

### 4.3 Aligner les scores attendus avec les seuils du site

**AVANT :**
```
- Top hardware wallets: 70-90%
- Good software wallets: 60-75%
- Solid DeFi: 55-70%
```

**APRES (aligne avec score-utils.js) :**
```
- Top hardware wallets (Ledger Nano X, Trezor Safe 5): 65-80%
- Good software wallets (MetaMask, Trust Wallet): 50-65%
- Solid DeFi protocols (Aave, Uniswap): 45-60%
- Average products: 30-50%
- Poor products / new unaudited: 10-30%

Seuls les produits EXCEPTIONNELS avec certifications multiples >= 80% (vert/SAFE)
La majorite des bons produits = 50-70% (ambre/OK)
```

### 4.4 Durcir les criteres YESp

**AVANT :**
```
YESp = Inherent to technology/protocol, OR standard practice, OR reasonably assumed
```

**APRES :**
```
YESp = UNIQUEMENT les proprietes mathematiques/protocolaires INEVITABLES :
- secp256k1 pour toute transaction ETH (cryptographiquement obligatoire)
- SHA-256 pour tout block Bitcoin (consensus l'impose)
- TLS pour tout site HTTPS (transport layer)
JAMAIS YESp pour : features, UI, support, compliance, audits, governance
```

---

## 5. IMPACT ESTIME DU RECALIBRAGE

| Categorie | Score actuel | Score apres correction | Seuil site |
|-----------|-------------|----------------------|------------|
| Ledger Nano X | ~95% | ~70-80% | EXCELLENT (vert) |
| MetaMask | ~92% | ~55-65% | GOOD (ambre) |
| Uniswap | ~90% | ~50-60% | GOOD (ambre) |
| Binance | ~91% | ~60-70% | GOOD (ambre) |
| Petit projet non audite | ~85% | ~25-35% | FAIR/RISKY |
| Scam/abandonware | ~80% | ~5-15% | RISKY (rouge) |

**Benefice :** Les scores deviennent UTILES et DIFFERENCIANTS.
Un Ledger a 75% et un scam a 15% = l'utilisateur VOIT la difference.

---

## 6. PLAN D'ACTION

### Phase 1 - IMMEDIATE (sans toucher aux evaluations en cours)
- [x] Corriger nommage pilier A (Accessibility -> Adversity)
- [x] Regenerer le JSON export depuis la DB
- [ ] Appliquer les nouveaux prompts dans smart_evaluator.py

### Phase 2 - RE-EVALUATION (apres fin des evaluations en cours)
- [ ] Appliquer les prompts corriges
- [ ] Re-evaluer un echantillon de 10 produits references
- [ ] Valider que la distribution correspond aux attentes
- [ ] Si OK, lancer la re-evaluation complete

### Phase 3 - RECALIBRAGE
- [ ] Recalculer tous les scores
- [ ] Mettre a jour les rankings
- [ ] Communiquer le changement aux utilisateurs

---

## 7. FICHIERS CONCERNES

| Fichier | Modification |
|---------|-------------|
| `src/core/smart_evaluator.py` | Prompts L39-207 + L847-893 |
| `web/libs/score-utils.js` | Nommage pilier A (FAIT) |
| `web/app/methodology/page.js` | Aucune (deja correct) |
| `web/components/Pillars.js` | Verifier coherence |
| `src/core/scoring_engine.py` | Aucune (logique correcte) |
