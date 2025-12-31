# 🆓 SAFESCORING.IO - Solutions GRATUITES d'Automatisation

## 🎯 Objectif

Automatiser la mise à jour mensuelle des 195 produits **SANS frais** en utilisant:
- **IA locale** (Ollama) ou **API gratuites** (Groq, Gemini)
- **Scraping Python** gratuit (Playwright, Requests)
- **Supabase** tier gratuit

---

## 💰 Comparatif des Coûts

| Solution | Coût/mois | Limites | Performance |
|----------|-----------|---------|-------------|
| **Claude API** | $30-70 | Aucune | ⭐⭐⭐⭐⭐ |
| **Groq API** | **$0** | 30 req/min, 14K tokens | ⭐⭐⭐⭐ |
| **Google Gemini** | **$0** | 60 req/min, 1M tokens/jour | ⭐⭐⭐⭐ |
| **Ollama (local)** | **$0** | CPU/RAM de ton PC | ⭐⭐⭐ |
| **Mistral API** | **$0** | 1 req/sec, limité | ⭐⭐⭐ |
| **OpenRouter** | **$0** | Certains modèles gratuits | ⭐⭐⭐ |

---

## 🏆 RECOMMANDATION: Groq + Gemini (100% Gratuit)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    🆓 ARCHITECTURE 100% GRATUITE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐             │
│  │  SCRAPING    │     │  EXTRACTION  │     │  ÉVALUATION  │             │
│  │  Playwright  │────▶│  Gemini API  │────▶│  Groq API    │             │
│  │  (gratuit)   │     │  (gratuit)   │     │  (gratuit)   │             │
│  └──────────────┘     └──────────────┘     └──────────────┘             │
│         │                    │                    │                      │
│         │                    │                    │                      │
│         ▼                    ▼                    ▼                      │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐             │
│  │ • Anti-detect│     │ • 1M tokens/ │     │ • Llama 3.3  │             │
│  │ • Délais     │     │   jour       │     │   70B        │             │
│  │ • UserAgent  │     │ • 60 req/min │     │ • 30 req/min │             │
│  └──────────────┘     └──────────────┘     └──────────────┘             │
│                                                                          │
│                              │                                           │
│                              ▼                                           │
│                    ┌──────────────────┐                                  │
│                    │    SUPABASE      │                                  │
│                    │   (tier gratuit) │                                  │
│                    │   500MB DB       │                                  │
│                    └──────────────────┘                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 OPTION 1: Groq API (Recommandé - Le plus rapide!)

### Pourquoi Groq?
- **Gratuit** avec limites généreuses
- **Ultra rapide** (500+ tokens/sec vs 50 pour Claude)
- **Llama 3.3 70B** - Qualité proche de Claude
- **Mixtral 8x7B** - Bon pour extraction

### Installation

```bash
pip install groq
```

### Configuration

```python
# .env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx  # Obtenir sur: console.groq.com
```

### Code

```python
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def extract_with_groq(page_content: str, product_name: str) -> dict:
    """Extraction de specs avec Groq (gratuit)."""
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",  # Meilleur modèle gratuit
        messages=[
            {
                "role": "system",
                "content": "Tu es un expert en extraction de données pour hardware wallets. Réponds uniquement en JSON valide."
            },
            {
                "role": "user", 
                "content": f"""Extrais les specs de {product_name} depuis ce contenu:

{page_content[:10000]}

Format JSON:
{{
  "price_eur": null,
  "chip": null,
  "chip_certification": null,
  "bluetooth": false,
  "secure_element": false,
  "open_source": false,
  "coins_supported": null
}}"""
            }
        ],
        temperature=0.1,
        max_tokens=2000,
    )
    
    return json.loads(response.choices[0].message.content)


def evaluate_with_groq(product_specs: dict, norms: list) -> dict:
    """Évaluation SAFE avec Groq (gratuit)."""
    
    norms_text = "\n".join([f"- {n['code']}: {n['description']}" for n in norms])
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": """Tu es un expert en évaluation de sécurité crypto.
Pour chaque norme, réponds:
- "YES" = respectée
- "NO" = non respectée  
- "N/A" = non applicable
Réponds UNIQUEMENT en JSON."""
            },
            {
                "role": "user",
                "content": f"""Produit:
{json.dumps(product_specs, indent=2)}

Normes à évaluer:
{norms_text}

JSON:"""
            }
        ],
        temperature=0.1,
        max_tokens=4000,
    )
    
    return json.loads(response.choices[0].message.content)
```

### Limites Groq (généreuses!)

| Modèle | Requests/min | Tokens/min | Tokens/jour |
|--------|--------------|------------|-------------|
| llama-3.3-70b | 30 | 6,000 | 100,000 |
| mixtral-8x7b | 30 | 5,000 | 100,000 |
| llama-3.1-8b | 30 | 20,000 | 500,000 |

**Pour 195 produits/mois:** ~3,900 requêtes → Largement dans les limites!

---

## 🔧 OPTION 2: Google Gemini (1M tokens/jour gratuit!)

### Pourquoi Gemini?
- **1 million de tokens/jour** gratuit
- **60 requêtes/minute**
- **Gemini 1.5 Flash** - Rapide et capable
- Parfait pour l'extraction de texte long

### Installation

```bash
pip install google-generativeai
```

### Configuration

```python
# .env
GOOGLE_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxxx  # Obtenir sur: aistudio.google.com
```

### Code

```python
import google.generativeai as genai

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

def extract_with_gemini(page_content: str, product_name: str) -> dict:
    """Extraction avec Gemini (gratuit - 1M tokens/jour)."""
    
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""Tu es un expert en extraction de données pour hardware wallets crypto.

PRODUIT: {product_name}

CONTENU DE LA PAGE:
{page_content[:30000]}  # Gemini accepte des contextes ÉNORMES

Extrais les informations au format JSON strict:
{{
  "price_eur": null,
  "price_usd": null,
  "chip": null,
  "chip_certification": null,
  "screen_type": null,
  "bluetooth": false,
  "nfc": false,
  "usb_c": false,
  "secure_element": false,
  "open_source_firmware": false,
  "passphrase_support": false,
  "shamir_backup": false,
  "multisig_native": false,
  "coins_supported": null,
  "certifications": [],
  "country": null
}}

Retourne UNIQUEMENT le JSON, rien d'autre."""

    response = model.generate_content(prompt)
    
    # Parser le JSON
    json_str = response.text.strip()
    if '```' in json_str:
        json_str = json_str.split('```')[1].replace('json', '').strip()
    
    return json.loads(json_str)


def evaluate_with_gemini(product_specs: dict, norms_batch: list) -> dict:
    """Évaluation SAFE avec Gemini."""
    
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    norms_text = "\n".join([f"- {n['code']}: {n['description']}" for n in norms_batch])
    
    prompt = f"""Expert en sécurité crypto - Méthodologie SAFE Scoring.

PRODUIT:
{json.dumps(product_specs, indent=2, ensure_ascii=False)}

NORMES À ÉVALUER:
{norms_text}

Pour chaque norme:
- "YES" = Le produit respecte cette norme
- "NO" = Le produit NE respecte PAS
- "N/A" = Non applicable

Retourne UNIQUEMENT un JSON: {{"CODE1": "YES", "CODE2": "NO", ...}}"""

    response = model.generate_content(prompt)
    
    json_str = response.text.strip()
    if '```' in json_str:
        json_str = json_str.split('```')[1].replace('json', '').strip()
    
    return json.loads(json_str)
```

### Limites Gemini Free

| Métrique | Limite |
|----------|--------|
| Requests/minute | 60 |
| Tokens/minute | 1,000,000 |
| Tokens/jour | 1,500,000 |
| Contexte max | 1M tokens |

**Idéal pour:** Pages longues, extraction massive

---

## 🔧 OPTION 3: Ollama (100% Local, 100% Gratuit, 100% Privé)

### Pourquoi Ollama?
- **Aucune limite** - Tourne sur ton PC
- **Aucun coût** - Modèles open source
- **100% privé** - Données ne quittent pas ton ordi
- **Llama 3.2, Mistral, Qwen** disponibles

### Installation

```bash
# Linux/Mac
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# Télécharger: https://ollama.com/download

# Télécharger un modèle
ollama pull llama3.2        # 3B - Rapide, 2GB RAM
ollama pull llama3.2:7b     # 7B - Équilibré, 8GB RAM
ollama pull mistral         # 7B - Bon pour instruction
ollama pull qwen2.5:14b     # 14B - Plus capable, 16GB RAM
```

### Code

```python
import ollama

def extract_with_ollama(page_content: str, product_name: str) -> dict:
    """Extraction avec Ollama (100% local et gratuit)."""
    
    response = ollama.chat(
        model='llama3.2',  # ou 'mistral', 'qwen2.5:14b'
        messages=[
            {
                'role': 'system',
                'content': 'Tu es un expert en extraction de données. Réponds uniquement en JSON valide.'
            },
            {
                'role': 'user',
                'content': f"""Extrais les specs de {product_name}:

{page_content[:8000]}

JSON format:
{{"price_eur": null, "chip": null, "bluetooth": false, "secure_element": false}}"""
            }
        ],
        options={
            'temperature': 0.1,
            'num_predict': 2000,
        }
    )
    
    return json.loads(response['message']['content'])


def evaluate_with_ollama(product_specs: dict, norms: list) -> dict:
    """Évaluation SAFE avec Ollama local."""
    
    norms_text = "\n".join([f"- {n['code']}: {n['description']}" for n in norms[:30]])  # Batch plus petit
    
    response = ollama.chat(
        model='llama3.2',
        messages=[
            {
                'role': 'system', 
                'content': 'Expert sécurité crypto. Réponds YES/NO/N/A pour chaque norme. JSON uniquement.'
            },
            {
                'role': 'user',
                'content': f"""Produit: {json.dumps(product_specs)}

Normes:
{norms_text}

JSON:"""
            }
        ],
        options={'temperature': 0.1}
    )
    
    return json.loads(response['message']['content'])
```

### Recommandations matériel

| Modèle | RAM minimum | GPU recommandé | Vitesse |
|--------|-------------|----------------|---------|
| llama3.2 (3B) | 4 GB | Non requis | ~30 tok/s |
| llama3.2:7b | 8 GB | 6GB VRAM | ~20 tok/s |
| mistral (7B) | 8 GB | 8GB VRAM | ~25 tok/s |
| qwen2.5:14b | 16 GB | 12GB VRAM | ~15 tok/s |

---

## 🎯 STRATÉGIE HYBRIDE RECOMMANDÉE (0€)

Combiner plusieurs services pour optimiser:

```python
class HybridAIClient:
    """
    Client IA hybride qui utilise plusieurs services gratuits
    pour rester dans les limites de chacun.
    """
    
    def __init__(self):
        # Groq pour évaluation (rapide, 30 req/min)
        self.groq = Groq(api_key=os.getenv("GROQ_API_KEY"))
        
        # Gemini pour extraction (1M tokens/jour)
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.gemini = genai.GenerativeModel('gemini-1.5-flash')
        
        # Ollama en backup (local, illimité)
        self.use_ollama_backup = True
        
        # Compteurs pour rate limiting
        self.groq_calls = 0
        self.gemini_calls = 0
        self.last_reset = datetime.now()
    
    def _reset_counters_if_needed(self):
        """Reset les compteurs toutes les minutes."""
        if (datetime.now() - self.last_reset).seconds >= 60:
            self.groq_calls = 0
            self.gemini_calls = 0
            self.last_reset = datetime.now()
    
    def extract_specs(self, content: str, product_name: str) -> dict:
        """
        Extraction intelligente:
        1. Gemini (contexte long, 60 req/min)
        2. Fallback Ollama si limite atteinte
        """
        self._reset_counters_if_needed()
        
        if self.gemini_calls < 55:  # Marge de sécurité
            self.gemini_calls += 1
            return self._extract_gemini(content, product_name)
        elif self.use_ollama_backup:
            return self._extract_ollama(content, product_name)
        else:
            time.sleep(60)  # Attendre reset
            return self.extract_specs(content, product_name)
    
    def evaluate_norms(self, specs: dict, norms: list) -> dict:
        """
        Évaluation intelligente:
        1. Groq (rapide, 30 req/min)
        2. Fallback Gemini
        3. Fallback Ollama
        """
        self._reset_counters_if_needed()
        
        if self.groq_calls < 25:
            self.groq_calls += 1
            return self._evaluate_groq(specs, norms)
        elif self.gemini_calls < 55:
            self.gemini_calls += 1
            return self._evaluate_gemini(specs, norms)
        elif self.use_ollama_backup:
            return self._evaluate_ollama(specs, norms)
        else:
            time.sleep(60)
            return self.evaluate_norms(specs, norms)
    
    def _extract_gemini(self, content, name):
        # ... code Gemini ci-dessus
        pass
    
    def _extract_ollama(self, content, name):
        # ... code Ollama ci-dessus
        pass
    
    def _evaluate_groq(self, specs, norms):
        # ... code Groq ci-dessus
        pass
    
    def _evaluate_gemini(self, specs, norms):
        # ... code Gemini ci-dessus
        pass
    
    def _evaluate_ollama(self, specs, norms):
        # ... code Ollama ci-dessus
        pass
```

---

## 📊 Calcul pour 195 produits/mois

### Avec Groq + Gemini (gratuit)

| Étape | Requêtes | Service | Dans limite? |
|-------|----------|---------|--------------|
| Scraping | 195 pages | Playwright | ✅ Illimité |
| Extraction specs | 195 | Gemini (1M tok/jour) | ✅ Oui |
| Évaluation (20 normes/batch) | ~3,900 | Groq (30/min) | ✅ ~2h |
| **TOTAL** | ~4,100 | Mix | ✅ **0€** |

### Temps estimé

| Configuration | Durée pour 195 produits |
|---------------|------------------------|
| Groq seul | ~3 heures |
| Gemini seul | ~1 heure |
| Ollama (local) | ~6-12 heures |
| Hybride Groq+Gemini | **~2 heures** |

---

## 🔐 Obtenir les clés API gratuites

### 1. Groq (recommandé)
1. Aller sur [console.groq.com](https://console.groq.com)
2. Créer un compte (Google/GitHub)
3. API Keys → Create API Key
4. Copier `gsk_xxxxx`

### 2. Google Gemini
1. Aller sur [aistudio.google.com](https://aistudio.google.com)
2. Connecter avec compte Google
3. Get API Key → Create API Key
4. Copier `AIza_xxxxx`

### 3. Ollama (local)
```bash
# Aucune clé nécessaire!
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
```

---

## 📁 Script complet gratuit

```python
#!/usr/bin/env python3
"""
SAFESCORING - Automatisation 100% GRATUITE
Utilise Groq + Gemini + Ollama (backup)
"""

import os
import json
import time
from datetime import datetime
from dotenv import load_dotenv

# Services gratuits
from groq import Groq
import google.generativeai as genai
import ollama

# Scraping gratuit
from playwright.sync_api import sync_playwright
from fake_useragent import UserAgent

load_dotenv()

# ============================================
# CONFIGURATION
# ============================================

# Groq (gratuit - 30 req/min)
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Gemini (gratuit - 1M tokens/jour)
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
gemini_model = genai.GenerativeModel('gemini-1.5-flash')

# User Agent
ua = UserAgent()

# ============================================
# SCRAPER GRATUIT
# ============================================

def scrape_page(url: str) -> str:
    """Scrape avec Playwright (gratuit)."""
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=ua.random)
        page = context.new_page()
        
        try:
            page.goto(url, wait_until='networkidle', timeout=30000)
            page.wait_for_timeout(2000)
            content = page.inner_text('body')
            return content
        finally:
            browser.close()

# ============================================
# EXTRACTION AVEC GEMINI (gratuit)
# ============================================

def extract_specs(content: str, product_name: str) -> dict:
    """Extraction avec Gemini (1M tokens/jour gratuit)."""
    
    prompt = f"""Expert extraction hardware wallets. Produit: {product_name}

Contenu:
{content[:25000]}

Extrais en JSON:
{{"price_eur":null,"chip":null,"chip_certification":null,"bluetooth":false,"secure_element":false,"open_source":false,"coins_supported":null,"certifications":[]}}

JSON uniquement:"""

    response = gemini_model.generate_content(prompt)
    json_str = response.text.strip()
    
    if '```' in json_str:
        json_str = json_str.split('```')[1].replace('json', '').strip()
    
    try:
        return json.loads(json_str)
    except:
        return {}

# ============================================
# ÉVALUATION AVEC GROQ (gratuit)
# ============================================

def evaluate_norms(specs: dict, norms: list) -> dict:
    """Évaluation avec Groq Llama 3.3 (gratuit)."""
    
    norms_text = "\n".join([f"- {n['code']}: {n['description']}" for n in norms])
    
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "Expert sécurité crypto. Réponds YES/NO/N/A en JSON."},
            {"role": "user", "content": f"Produit: {json.dumps(specs)}\n\nNormes:\n{norms_text}\n\nJSON:"}
        ],
        temperature=0.1,
        max_tokens=3000,
    )
    
    try:
        return json.loads(response.choices[0].message.content)
    except:
        return {}

# ============================================
# BACKUP OLLAMA (100% local)
# ============================================

def extract_with_ollama(content: str, product_name: str) -> dict:
    """Backup local si limites atteintes."""
    
    response = ollama.chat(
        model='llama3.2',
        messages=[
            {'role': 'system', 'content': 'Expert extraction. JSON only.'},
            {'role': 'user', 'content': f"Extract specs for {product_name}:\n{content[:6000]}\nJSON:"}
        ]
    )
    
    try:
        return json.loads(response['message']['content'])
    except:
        return {}

# ============================================
# MAIN
# ============================================

def process_product(product_id: int, slug: str, url: str, norms: list):
    """Traite un produit complet."""
    
    print(f"\n📦 Processing: {slug}")
    
    # 1. Scraper (gratuit)
    print("  🌐 Scraping...")
    content = scrape_page(url)
    time.sleep(2)  # Politesse
    
    # 2. Extraire specs (Gemini gratuit)
    print("  🔍 Extracting specs (Gemini)...")
    specs = extract_specs(content, slug)
    time.sleep(1)
    
    # 3. Évaluer normes par batch (Groq gratuit)
    print("  🧮 Evaluating norms (Groq)...")
    all_evals = {}
    
    batch_size = 40
    for i in range(0, len(norms), batch_size):
        batch = norms[i:i+batch_size]
        evals = evaluate_norms(specs, batch)
        all_evals.update(evals)
        time.sleep(2)  # Rate limit Groq: 30/min
        print(f"    Batch {i//batch_size + 1}: {len(evals)} evaluated")
    
    return {
        'product_id': product_id,
        'slug': slug,
        'specs': specs,
        'evaluations': all_evals
    }


if __name__ == "__main__":
    print("🚀 SAFESCORING - Automatisation GRATUITE")
    print("=" * 50)
    
    # Exemple
    result = process_product(
        product_id=1,
        slug="ledger-nano-x",
        url="https://www.ledger.com/products/ledger-nano-x",
        norms=[
            {"code": "S001", "description": "Uses certified secure element"},
            {"code": "S002", "description": "PIN protection required"},
            # ... autres normes
        ]
    )
    
    print(f"\n✅ Result: {json.dumps(result, indent=2)}")
```

---

## ✅ Résumé: Stack 100% Gratuit

| Composant | Solution | Coût |
|-----------|----------|------|
| Scraping | Playwright | **0€** |
| Extraction | Gemini API | **0€** |
| Évaluation | Groq API | **0€** |
| Backup | Ollama local | **0€** |
| Database | Supabase Free | **0€** |
| Hosting script | GitHub Actions | **0€** |
| **TOTAL** | | **0€/mois** |

---

## 🗓️ Automatisation gratuite avec GitHub Actions

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
          pip install groq google-generativeai playwright supabase
          playwright install chromium
      
      - name: Run automation
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
        run: python automation_free.py
```

**GitHub Actions Free:** 2,000 minutes/mois → Largement suffisant!

---

**🎉 Total: 0€/mois pour automatiser 195 produits!**
