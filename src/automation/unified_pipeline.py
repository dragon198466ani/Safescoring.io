#!/usr/bin/env python3
"""
SAFESCORING.IO - UNIFIED PIPELINE
=================================

Script unifié qui exécute le workflow COMPLET de mise à jour:

    ÉTAPE 0: Détermination des types de produits (IA + scraping)
    ÉTAPE 1: Génération de l'applicabilité des normes par type
    ÉTAPE 2: Évaluation IA de chaque produit (YES/NO/YESp/N/A/TBD)
    ÉTAPE 3: Calcul des scores SAFE (S/A/F/E)
    ÉTAPE 4: Enregistrement historique (moat tracking)

Usage:
    python -m src.automation.unified_pipeline --mode test          # 1 produit (test)
    python -m src.automation.unified_pipeline --mode partial       # 10 produits
    python -m src.automation.unified_pipeline --mode full          # Tous les produits
    python -m src.automation.unified_pipeline --product "Ledger"   # Filtre par nom
    python -m src.automation.unified_pipeline --step types         # Une seule étape
    python -m src.automation.unified_pipeline --force              # Force tout recalculer

Options:
    --mode test|partial|full    Mode de traitement
    --product <nom>             Filtrer par nom de produit
    --step types|applicability|evaluate|scores|all
    --force                     Force recalcul même si déjà fait
    --no-scrape                 Désactive le scraping web
    --apply-types               Applique automatiquement les corrections de types
    --dry-run                   Simule sans modifier la base

Auteur: SafeScoring.io
Date: 2025-12-30
"""

import os
import sys
import json
import time
import argparse
import requests
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Core imports
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS, get_supabase_headers
from src.core.api_provider import AIProvider
from src.core.scraper import WebScraper


# ============================================================
# CONFIGURATION
# ============================================================

class PipelineConfig:
    """Configuration du pipeline"""

    # Rate limiting
    DELAY_BETWEEN_PRODUCTS = 1.5  # seconds
    DELAY_BETWEEN_BATCHES = 3.0

    # Batch sizes
    BATCH_SIZE_TYPES = 10
    BATCH_SIZE_APPLICABILITY = 30
    BATCH_SIZE_EVALUATION = 25

    # Scraping
    MAX_SCRAPE_PAGES = 5
    MAX_SCRAPE_CHARS = 15000

    # AI
    MAX_TOKENS_TYPES = 1500
    MAX_TOKENS_APPLICABILITY = 2000
    MAX_TOKENS_EVALUATION = 4000


# ============================================================
# UTILITIES
# ============================================================

class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    END = '\033[0m'


def print_banner(step: int, title: str, subtitle: str = ""):
    """Print a step banner"""
    print(f"""
{Colors.BOLD}{Colors.CYAN}{'='*70}
   ÉTAPE {step}: {title}
{'='*70}{Colors.END}
{Colors.YELLOW}{subtitle}{Colors.END}
""")


def print_success(msg: str):
    print(f"{Colors.GREEN}   ✓ {msg}{Colors.END}")


def print_warning(msg: str):
    print(f"{Colors.YELLOW}   ⚠ {msg}{Colors.END}")


def print_error(msg: str):
    print(f"{Colors.RED}   ✗ {msg}{Colors.END}")


def print_info(msg: str):
    print(f"{Colors.CYAN}   ℹ {msg}{Colors.END}")


# ============================================================
# STEP 0: TYPE DETERMINATION (AI + Scraping)
# ============================================================

class TypeDeterminator:
    """
    Détermine et vérifie les types de produits en utilisant l'IA.
    Utilise smart_type_evaluator.py comme référence.
    """

    TYPE_DEFINITIONS = """
## TYPES DE PRODUITS DISPONIBLES

### HARDWARE WALLETS
- **HW Cold**: Hardware wallet air-gapped (Ledger, Trezor, Coldcard). Stockage offline.
- **HW Hot**: Hardware 2FA/bearer card connecté (YubiKey). Pas un wallet complet.
- **HW NFC Signer**: Carte NFC de signature (TAPSIGNER, Status Keycard).

### SOFTWARE WALLETS
- **SW Browser**: Extension navigateur UNIQUEMENT (Rabby browser-only).
- **SW Mobile**: Application mobile UNIQUEMENT (Phoenix, Breez).
- **Wallet MultiPlatform**: Disponible sur PLUSIEURS plateformes (browser + mobile + desktop).
- **Wallet MultiSig**: Wallet avec multi-signature native (Casa, Nunchuk, Safe).

### DEFI
- **DEX**: Decentralized exchange pour swaps (Uniswap, Curve, 1inch).
- **Lending**: Protocole de prêt/emprunt (Aave, Compound, MakerDAO).
- **Yield**: Yield aggregator/optimizer (Yearn, Beefy, Convex).
- **Liq Staking**: Liquid staking (Lido, Rocket Pool, Jito).
- **Derivatives**: Options, perpetuals, futures (dYdX, GMX, Synthetix).
- **DeFi Tools**: Dashboards, portfolio trackers (DeBank, Zapper).

### FINANCE CENTRALISÉE
- **CEX**: Centralized exchange (Binance, Coinbase, Kraken).
- **Card**: Carte crypto CUSTODIALE - exchange garde les fonds.
- **Card Non-Cust**: Carte crypto NON-CUSTODIALE - user garde ses clés.
- **Neobank**: Banque fintech avec crypto (Revolut, N26).
- **Crypto Bank**: Banque crypto régulée (AMINA, Sygnum).

### BACKUP
- **Bkp Physical**: Backup physique métal/steel/titanium (Cryptosteel, Billfodl).
- **Bkp Digital**: Backup digital/cloud (Ledger Recover).
- **Seed Splitter**: Shamir Secret Sharing backup (SeedXOR).

### SÉCURITÉ ANTI-COERCION
- **AC Phys**: Anti-coercion PHYSIQUE. CRITÈRES STRICTS:
  * Duress PIN dédié (PIN qui ouvre wallet leurre)
  * Brick Me PIN (PIN qui détruit le device)
  * Hidden wallet HARDWARE avec PIN dédié
  * PAS juste passphrase basique!
- **AC Digit**: Anti-coercion DIGITAL (CoinJoin natif, Tor intégré).

### CUSTODY
- **Custody MPC**: Multi-Party Computation custody (Fireblocks).
- **Custody MultiSig**: Multi-Signature custody (BitGo).

### AUTRES
- **Bridges**: Cross-chain bridges (Wormhole, Stargate).
- **RWA**: Real World Assets tokenization.
- **Protocol**: Protocole générique.
"""

    SYSTEM_PROMPT = """Tu es un expert en classification de produits crypto/blockchain.
Tu dois déterminer les types corrects pour chaque produit.

{type_definitions}

## RÈGLES IMPORTANTES

1. **Maximum 3 types** par produit (sauf exceptions justifiées)

2. **AC Phys - TRÈS RESTRICTIF**:
   - SEULEMENT si Duress PIN OU Brick Me PIN OU Hidden Wallet HARDWARE dédié
   - Passphrase seule NE SUFFIT PAS (tous les wallets ont passphrase)
   - Exemples valides: Coldcard (duress+brick), Trezor (PIN alternatif), Keystone (dummy wallet)

3. **Wallet MultiPlatform vs SW Browser/Mobile**:
   - Si disponible sur browser ET mobile → Wallet MultiPlatform (pas les deux séparément)

4. **Card vs Card Non-Cust**:
   - Card = custodial (exchange garde les fonds)
   - Card Non-Cust = self-custody (user garde ses clés)

## FORMAT DE RÉPONSE

Réponds UNIQUEMENT avec un JSON valide:
```json
{{
    "product": "Nom du produit",
    "analysis": "Analyse factuelle courte",
    "recommended_types": ["Type1", "Type2"],
    "changes": {{
        "add": ["types à ajouter"],
        "remove": ["types à supprimer"]
    }},
    "confidence": "high/medium/low"
}}
```
"""

    def __init__(self, scrape_enabled: bool = True):
        self.ai_provider = AIProvider()
        self.scraper = WebScraper() if scrape_enabled else None
        self.product_types = {}
        self.type_by_code = {}
        self.current_mappings = {}
        self.corrections = []
        self.verified = []

    def load_data(self):
        """Load product types and current mappings from Supabase"""
        headers = get_supabase_headers()

        # Load product types
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,description&order=code",
            headers=headers
        )
        if r.status_code == 200:
            for t in r.json():
                self.product_types[t['id']] = t
                self.type_by_code[t['code']] = t['id']

        # Load current mappings
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id,is_primary",
            headers=headers
        )
        if r.status_code == 200:
            for m in r.json():
                pid = m['product_id']
                if pid not in self.current_mappings:
                    self.current_mappings[pid] = []
                type_info = self.product_types.get(m['type_id'], {})
                self.current_mappings[pid].append({
                    'type_id': m['type_id'],
                    'type_code': type_info.get('code', '?'),
                    'is_primary': m['is_primary']
                })

    def get_current_types(self, product_id: int) -> List[str]:
        """Get current types for a product"""
        return [m['type_code'] for m in self.current_mappings.get(product_id, [])]

    def scrape_product(self, product: Dict) -> Optional[str]:
        """Scrape product website"""
        if not self.scraper or not product.get('website'):
            return None
        try:
            return self.scraper.scrape_product(
                product,
                max_pages=PipelineConfig.MAX_SCRAPE_PAGES,
                max_chars=PipelineConfig.MAX_SCRAPE_CHARS
            )
        except Exception as e:
            print_warning(f"Scraping failed: {e}")
            return None

    def evaluate_product_types(self, product: Dict, web_content: Optional[str] = None) -> Optional[Dict]:
        """Use AI to determine correct types for a product"""
        current_types = self.get_current_types(product['id'])

        user_prompt = f"""## PRODUIT À ANALYSER

**Nom:** {product['name']}
**Site web:** {product.get('website', 'Non disponible')}
**Types actuels:** {', '.join(current_types) if current_types else 'Aucun'}

"""
        if web_content:
            content_preview = web_content[:10000]
            user_prompt += f"""## CONTENU DU SITE (extrait)

{content_preview}

"""
        user_prompt += "Analyse ce produit et détermine ses types corrects."

        system_prompt = self.SYSTEM_PROMPT.format(type_definitions=self.TYPE_DEFINITIONS)

        try:
            response = self.ai_provider.call(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=PipelineConfig.MAX_TOKENS_TYPES
            )

            if response:
                # Extract JSON
                import re
                json_match = re.search(r'\{[\s\S]*\}', response)
                if json_match:
                    result = json.loads(json_match.group())
                    result['product_id'] = product['id']
                    result['current_types'] = current_types
                    return result
        except Exception as e:
            print_error(f"AI evaluation failed: {e}")

        return None

    def analyze_result(self, result: Dict) -> Tuple[bool, Dict]:
        """Analyze AI result and determine changes needed"""
        if not result:
            return False, {}

        current = set(result.get('current_types', []))
        recommended = set(result.get('recommended_types', []))

        to_add = recommended - current
        to_remove = current - recommended

        needs_change = bool(to_add or to_remove)

        summary = {
            'product_id': result.get('product_id'),
            'product_name': result.get('product', ''),
            'current': list(current),
            'recommended': list(recommended),
            'to_add': list(to_add),
            'to_remove': list(to_remove),
            'analysis': result.get('analysis', ''),
            'confidence': result.get('confidence', 'medium')
        }

        return needs_change, summary

    def apply_corrections(self, corrections: List[Dict], dry_run: bool = False) -> int:
        """Apply type corrections to Supabase"""
        if dry_run:
            print_info("DRY RUN - Aucune modification appliquée")
            return 0

        headers = get_supabase_headers()
        applied = 0

        for c in corrections:
            pid = c['product_id']

            # Remove types
            for type_code in c['to_remove']:
                type_id = self.type_by_code.get(type_code)
                if type_id:
                    r = requests.delete(
                        f"{SUPABASE_URL}/rest/v1/product_type_mapping?product_id=eq.{pid}&type_id=eq.{type_id}",
                        headers=headers
                    )
                    if r.status_code in [200, 204]:
                        print_info(f"[{c['product_name']}] - {type_code}")

            # Add types
            for type_code in c['to_add']:
                type_id = self.type_by_code.get(type_code)
                if type_id:
                    # Check if exists
                    r = requests.get(
                        f"{SUPABASE_URL}/rest/v1/product_type_mapping?product_id=eq.{pid}&type_id=eq.{type_id}",
                        headers=headers
                    )
                    if not r.json():
                        data = {'product_id': pid, 'type_id': type_id, 'is_primary': len(c['to_add']) == 1}
                        r = requests.post(
                            f"{SUPABASE_URL}/rest/v1/product_type_mapping",
                            headers=headers,
                            json=data
                        )
                        if r.status_code in [200, 201]:
                            print_success(f"[{c['product_name']}] + {type_code}")
                            applied += 1

        return applied

    def run(self, products: List[Dict], apply: bool = False, dry_run: bool = False) -> Dict:
        """Run type determination for products"""
        self.load_data()

        corrections = []
        verified = []

        for i, product in enumerate(products):
            print(f"\n[{i+1}/{len(products)}] {product['name']}")
            current_types = self.get_current_types(product['id'])
            print(f"   Types actuels: {', '.join(current_types) if current_types else 'Aucun'}")

            # Scrape
            web_content = None
            if self.scraper and product.get('website'):
                print(f"   Scraping...")
                web_content = self.scrape_product(product)
                if web_content:
                    print(f"   Scraped {len(web_content)} chars")

            # AI evaluation
            print(f"   Analyse IA...")
            result = self.evaluate_product_types(product, web_content)

            if result:
                needs_change, summary = self.analyze_result(result)

                if needs_change:
                    corrections.append(summary)
                    print_warning(f"CHANGEMENT SUGGÉRÉ:")
                    print(f"      Actuel:     {', '.join(summary['current'])}")
                    print(f"      Recommandé: {', '.join(summary['recommended'])}")
                    if summary['to_add']:
                        print(f"      + Ajouter:  {', '.join(summary['to_add'])}")
                    if summary['to_remove']:
                        print(f"      - Supprimer: {', '.join(summary['to_remove'])}")
                else:
                    verified.append(summary)
                    print_success("Types corrects")
            else:
                print_warning("Pas de résultat IA")

            time.sleep(PipelineConfig.DELAY_BETWEEN_PRODUCTS)

        # Apply if requested
        applied = 0
        if apply and corrections:
            print(f"\n{Colors.BOLD}Application des {len(corrections)} corrections...{Colors.END}")
            applied = self.apply_corrections(corrections, dry_run=dry_run)

        return {
            'products_checked': len(products),
            'types_correct': len(verified),
            'corrections_needed': len(corrections),
            'corrections_applied': applied,
            'corrections': corrections
        }


# ============================================================
# STEP 1: APPLICABILITY GENERATION
# ============================================================

class ApplicabilityManager:
    """Gère la génération de l'applicabilité des normes par type"""

    def __init__(self):
        self.ai_provider = AIProvider()
        self.product_types = []
        self.norms = []

    def load_data(self):
        """Load types and norms from Supabase"""
        headers = get_supabase_headers()

        # Load product types
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,description,category&order=code",
            headers=headers
        )
        if r.status_code == 200:
            self.product_types = r.json()
            print_success(f"{len(self.product_types)} types de produits")

        # Load norms
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,description&order=code",
            headers=headers
        )
        if r.status_code == 200:
            self.norms = r.json()
            print_success(f"{len(self.norms)} normes")

    def check_existing(self) -> int:
        """Check how many applicability rules already exist"""
        headers = get_supabase_headers('count=exact')
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norm_applicability?select=id",
            headers=headers
        )
        if r.status_code == 200:
            count = int(r.headers.get('content-range', '0-0/0').split('/')[-1])
            return count
        return 0

    def generate_for_type(self, product_type: Dict, norms_batch: List[Dict]) -> List[Dict]:
        """Generate applicability for a batch of norms for one type"""

        norms_text = "\n".join([
            f"- {n['code']}: {n['title']}" for n in norms_batch
        ])

        prompt = f"""Tu es un expert en évaluation de produits crypto/blockchain.

TYPE DE PRODUIT: {product_type['code']} - {product_type['name']}
Description: {product_type.get('description', 'N/A')}
Catégorie: {product_type.get('category', 'N/A')}

NORMES À ÉVALUER:
{norms_text}

Pour chaque norme, détermine si elle est APPLICABLE (OUI) ou NON-APPLICABLE (NON) pour ce type de produit.

Règles:
- OUI = La norme a du sens pour ce type de produit
- NON = La norme n'a techniquement aucun sens (ex: "screen size" pour un protocole DeFi)
- En cas de doute, préférer OUI

Réponds avec une liste JSON:
```json
[
    {{"code": "NORM_CODE", "applicable": true/false}},
    ...
]
```
"""

        try:
            response = self.ai_provider.call(
                system_prompt="Tu génères des règles d'applicabilité pour l'évaluation de produits crypto.",
                user_prompt=prompt,
                max_tokens=PipelineConfig.MAX_TOKENS_APPLICABILITY
            )

            if response:
                import re
                json_match = re.search(r'\[[\s\S]*\]', response)
                if json_match:
                    return json.loads(json_match.group())
        except Exception as e:
            print_error(f"AI call failed: {e}")

        return []

    def save_applicability(self, type_id: int, results: List[Dict], dry_run: bool = False) -> int:
        """Save applicability rules to Supabase"""
        if dry_run:
            return len(results)

        headers = get_supabase_headers()
        saved = 0

        # Create norm code to ID mapping
        norm_by_code = {n['code']: n['id'] for n in self.norms}

        for r in results:
            norm_id = norm_by_code.get(r.get('code'))
            if not norm_id:
                continue

            data = {
                'norm_id': norm_id,
                'type_id': type_id,
                'is_applicable': r.get('applicable', True)
            }

            # Upsert
            resp = requests.post(
                f"{SUPABASE_URL}/rest/v1/norm_applicability",
                headers={**headers, 'Prefer': 'resolution=merge-duplicates'},
                json=data
            )

            if resp.status_code in [200, 201]:
                saved += 1

        return saved

    def run(self, force: bool = False, dry_run: bool = False) -> Dict:
        """Run applicability generation"""
        self.load_data()

        # Check existing
        existing = self.check_existing()
        expected = len(self.product_types) * len(self.norms)

        if existing >= expected * 0.9 and not force:
            print_info(f"Applicabilité déjà générée ({existing}/{expected} règles)")
            print_info("Utilisez --force pour régénérer")
            return {'rules_existing': existing, 'rules_generated': 0}

        total_generated = 0

        for i, ptype in enumerate(self.product_types):
            print(f"\n[{i+1}/{len(self.product_types)}] Type: {ptype['code']} - {ptype['name']}")

            # Process norms in batches
            for j in range(0, len(self.norms), PipelineConfig.BATCH_SIZE_APPLICABILITY):
                batch = self.norms[j:j + PipelineConfig.BATCH_SIZE_APPLICABILITY]
                print(f"   Batch {j//PipelineConfig.BATCH_SIZE_APPLICABILITY + 1}: {len(batch)} normes...")

                results = self.generate_for_type(ptype, batch)

                if results:
                    saved = self.save_applicability(ptype['id'], results, dry_run=dry_run)
                    total_generated += saved
                    print_success(f"Saved {saved} rules")

                time.sleep(PipelineConfig.DELAY_BETWEEN_BATCHES)

        return {
            'types_processed': len(self.product_types),
            'norms_processed': len(self.norms),
            'rules_generated': total_generated
        }


# ============================================================
# STEP 2: PRODUCT EVALUATION
# ============================================================

class ProductEvaluator:
    """Évalue les produits contre les normes applicables"""

    SYSTEM_PROMPT = """Tu es un expert en sécurité crypto et évaluation de produits blockchain.
Tu utilises la méthodologie SAFE SCORING pour évaluer les produits.

## MÉTHODOLOGIE SAFE

- **S (Security 25%)**: Protection cryptographique, encryption, multisig, audit
- **A (Adversity 25%)**: Résistance aux attaques, gestion des vulnérabilités
- **F (Fidelity 25%)**: Transparence, gouvernance, conformité, audits
- **E (Efficiency 25%)**: Utilisabilité, interface, accessibilité

## SYSTÈME DE NOTATION

- **YES** = Preuve concrète que le produit implémente cette norme
- **YESp** = Imposé par le design du produit (pas besoin de preuve)
- **NO** = Le produit n'implémente PAS cette norme
- **TBD** = Impossible à déterminer (utiliser rarement)

## STANDARDS EVM IMPLICITES

Si le produit est EVM-compatible, les normes suivantes sont automatiquement YES:
- secp256k1, Keccak-256, ECDSA (cryptographie Ethereum)
- EIP-712, EIP-1559, EIP-2612, EIP-4337
- TLS 1.3, HTTPS, HSTS

## FORMAT DE RÉPONSE

Pour chaque norme, réponds:
CODE: RESULT (YES/YESp/NO/TBD)
"""

    def __init__(self, scrape_enabled: bool = True):
        self.ai_provider = AIProvider()
        self.scraper = WebScraper() if scrape_enabled else None
        self.norms = []
        self.applicability = {}
        self.product_types = {}

    def load_data(self):
        """Load norms, applicability and types"""
        headers = get_supabase_headers()

        # Load norms with definitions
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,description&order=code",
            headers=headers
        )
        if r.status_code == 200:
            self.norms = {n['id']: n for n in r.json()}
            print_success(f"{len(self.norms)} normes")

        # Load applicability
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norm_applicability?select=norm_id,type_id,is_applicable",
            headers=headers
        )
        if r.status_code == 200:
            for a in r.json():
                key = (a['type_id'], a['norm_id'])
                self.applicability[key] = a['is_applicable']
            print_success(f"{len(self.applicability)} règles d'applicabilité")

        # Load product types
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name",
            headers=headers
        )
        if r.status_code == 200:
            self.product_types = {t['id']: t for t in r.json()}

    def get_product_types(self, product_id: int) -> List[int]:
        """Get type IDs for a product"""
        headers = get_supabase_headers()
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_type_mapping?product_id=eq.{product_id}&select=type_id",
            headers=headers
        )
        if r.status_code == 200:
            return [m['type_id'] for m in r.json()]
        return []

    def get_applicable_norms(self, product_id: int) -> List[Dict]:
        """Get norms applicable to a product (union of all its types)"""
        type_ids = self.get_product_types(product_id)

        if not type_ids:
            return []

        applicable_norm_ids = set()
        for type_id in type_ids:
            for (tid, nid), is_applicable in self.applicability.items():
                if tid == type_id and is_applicable:
                    applicable_norm_ids.add(nid)

        return [self.norms[nid] for nid in applicable_norm_ids if nid in self.norms]

    def scrape_product(self, product: Dict) -> Optional[str]:
        """Scrape product website"""
        if not self.scraper or not product.get('website'):
            return None
        try:
            return self.scraper.scrape_product(
                product,
                max_pages=PipelineConfig.MAX_SCRAPE_PAGES,
                max_chars=PipelineConfig.MAX_SCRAPE_CHARS
            )
        except Exception:
            return None

    def evaluate_batch(self, product: Dict, norms: List[Dict], web_content: str) -> Dict[str, str]:
        """Evaluate a batch of norms for a product"""

        norms_text = "\n".join([
            f"- {n['code']}: {n['title']}\n  Description: {n.get('description', 'N/A')[:200]}"
            for n in norms
        ])

        content_preview = web_content[:12000] if web_content else "Pas de contenu disponible"

        prompt = f"""## PRODUIT: {product['name']}
Site: {product.get('website', 'N/A')}

## DOCUMENTATION EXTRAITE:
{content_preview}

## NORMES À ÉVALUER:
{norms_text}

Évalue chaque norme et réponds avec le format:
CODE: RESULT

Exemple:
S001: YES
S002: NO
S003: YESp
"""

        try:
            response = self.ai_provider.call(
                system_prompt=self.SYSTEM_PROMPT,
                user_prompt=prompt,
                max_tokens=PipelineConfig.MAX_TOKENS_EVALUATION
            )

            if response:
                return self.parse_evaluation_response(response, norms)
        except Exception as e:
            print_error(f"AI evaluation failed: {e}")

        return {}

    def parse_evaluation_response(self, response: str, norms: List[Dict]) -> Dict[str, str]:
        """Parse AI response to extract evaluations"""
        import re
        results = {}

        valid_results = {'YES', 'YESp', 'NO', 'TBD', 'N/A'}
        norm_codes = {n['code'] for n in norms}

        # Pattern: CODE: RESULT or CODE = RESULT
        pattern = r'([A-Z]\d{3})\s*[:=]\s*(YES(?:p)?|NO|TBD|N/A)'
        matches = re.findall(pattern, response, re.IGNORECASE)

        for code, result in matches:
            code = code.upper()
            result = result.upper()
            if result == 'YESP':
                result = 'YESp'
            if code in norm_codes and result in valid_results:
                results[code] = result

        return results

    def save_evaluations(self, product_id: int, evaluations: Dict[str, str], dry_run: bool = False) -> int:
        """Save evaluations to Supabase"""
        if dry_run:
            return len(evaluations)

        headers = get_supabase_headers()
        saved = 0

        # Create norm code to ID mapping
        norm_by_code = {n['code']: n['id'] for n in self.norms.values()}

        for code, result in evaluations.items():
            norm_id = norm_by_code.get(code)
            if not norm_id:
                continue

            data = {
                'product_id': product_id,
                'norm_id': norm_id,
                'result': result,
                'evaluated_by': 'unified_pipeline_ai',
                'evaluation_date': datetime.now().isoformat()
            }

            # Upsert
            r = requests.post(
                f"{SUPABASE_URL}/rest/v1/evaluations",
                headers={**headers, 'Prefer': 'resolution=merge-duplicates'},
                json=data
            )

            if r.status_code in [200, 201]:
                saved += 1

        return saved

    def check_existing_evaluations(self, product_id: int) -> int:
        """Check if product already has evaluations"""
        headers = get_supabase_headers('count=exact')
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}&select=id",
            headers=headers
        )
        if r.status_code == 200:
            return int(r.headers.get('content-range', '0-0/0').split('/')[-1])
        return 0

    def run(self, products: List[Dict], force: bool = False, dry_run: bool = False) -> Dict:
        """Run evaluation for products"""
        self.load_data()

        total_evaluated = 0
        total_evaluations = 0
        skipped = 0

        for i, product in enumerate(products):
            print(f"\n[{i+1}/{len(products)}] {product['name']}")

            # Check existing
            if not force:
                existing = self.check_existing_evaluations(product['id'])
                if existing > 0:
                    print_info(f"Déjà évalué ({existing} évaluations), skip")
                    skipped += 1
                    continue

            # Get applicable norms
            applicable = self.get_applicable_norms(product['id'])
            if not applicable:
                print_warning("Aucune norme applicable (vérifiez les types)")
                continue

            print(f"   {len(applicable)} normes applicables")

            # Scrape
            web_content = ""
            if self.scraper and product.get('website'):
                print(f"   Scraping...")
                web_content = self.scrape_product(product) or ""

            # Evaluate in batches
            all_evaluations = {}
            for j in range(0, len(applicable), PipelineConfig.BATCH_SIZE_EVALUATION):
                batch = applicable[j:j + PipelineConfig.BATCH_SIZE_EVALUATION]
                print(f"   Évaluation batch {j//PipelineConfig.BATCH_SIZE_EVALUATION + 1}...")

                results = self.evaluate_batch(product, batch, web_content)
                all_evaluations.update(results)

                time.sleep(PipelineConfig.DELAY_BETWEEN_BATCHES)

            # Mark non-applicable as N/A
            all_norm_ids = set(self.norms.keys())
            applicable_ids = {n['id'] for n in applicable}
            for norm_id in all_norm_ids - applicable_ids:
                norm = self.norms[norm_id]
                all_evaluations[norm['code']] = 'N/A'

            # Save
            if all_evaluations:
                saved = self.save_evaluations(product['id'], all_evaluations, dry_run=dry_run)
                total_evaluations += saved
                total_evaluated += 1

                # Count results
                yes_count = sum(1 for r in all_evaluations.values() if r in ['YES', 'YESp'])
                no_count = sum(1 for r in all_evaluations.values() if r == 'NO')
                na_count = sum(1 for r in all_evaluations.values() if r == 'N/A')

                print_success(f"Saved {saved} évaluations (YES:{yes_count} NO:{no_count} N/A:{na_count})")

            time.sleep(PipelineConfig.DELAY_BETWEEN_PRODUCTS)

        return {
            'products_evaluated': total_evaluated,
            'products_skipped': skipped,
            'total_evaluations': total_evaluations
        }


# ============================================================
# STEP 3: SCORE CALCULATION
# ============================================================

class ScoreCalculatorEngine:
    """Calcule les scores SAFE à partir des évaluations"""

    def __init__(self):
        self.norms = {}
        self.definitions = {}

    def load_data(self):
        """Load norms and scoring definitions"""
        headers = get_supabase_headers()

        # Load norms
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar&order=code",
            headers=headers
        )
        if r.status_code == 200:
            self.norms = {n['id']: n for n in r.json()}

        # Load scoring definitions
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/safe_scoring_definitions?select=norm_id,is_essential,is_consumer,is_full",
            headers=headers
        )
        if r.status_code == 200:
            self.definitions = {d['norm_id']: d for d in r.json()}

    def get_evaluations(self, product_id: int) -> List[Dict]:
        """Get all evaluations for a product"""
        headers = get_supabase_headers()
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}&select=norm_id,result",
            headers=headers
        )
        if r.status_code == 200:
            return r.json()
        return []

    def calculate_scores(self, product_id: int) -> Dict:
        """Calculate SAFE scores for a product"""
        evaluations = self.get_evaluations(product_id)

        if not evaluations:
            return {}

        # Initialize counters per pillar and category
        pillars = {'S': {'yes': 0, 'no': 0}, 'A': {'yes': 0, 'no': 0},
                   'F': {'yes': 0, 'no': 0}, 'E': {'yes': 0, 'no': 0}}

        categories = {
            'full': {'yes': 0, 'no': 0, 'na': 0, 'tbd': 0},
            'consumer': {'yes': 0, 'no': 0},
            'essential': {'yes': 0, 'no': 0}
        }

        consumer_pillars = {'S': {'yes': 0, 'no': 0}, 'A': {'yes': 0, 'no': 0},
                           'F': {'yes': 0, 'no': 0}, 'E': {'yes': 0, 'no': 0}}
        essential_pillars = {'S': {'yes': 0, 'no': 0}, 'A': {'yes': 0, 'no': 0},
                             'F': {'yes': 0, 'no': 0}, 'E': {'yes': 0, 'no': 0}}

        for eval in evaluations:
            norm_id = eval['norm_id']
            result = eval['result']

            norm = self.norms.get(norm_id)
            if not norm:
                continue

            pillar = norm['pillar']
            definition = self.definitions.get(norm_id, {})

            is_yes = result in ['YES', 'YESp']
            is_no = result == 'NO'
            is_na = result == 'N/A'
            is_tbd = result == 'TBD'

            # Full scores (exclude N/A and TBD)
            if is_yes:
                pillars[pillar]['yes'] += 1
                categories['full']['yes'] += 1
            elif is_no:
                pillars[pillar]['no'] += 1
                categories['full']['no'] += 1
            elif is_na:
                categories['full']['na'] += 1
            elif is_tbd:
                categories['full']['tbd'] += 1

            # Consumer scores
            if definition.get('is_consumer'):
                if is_yes:
                    consumer_pillars[pillar]['yes'] += 1
                    categories['consumer']['yes'] += 1
                elif is_no:
                    consumer_pillars[pillar]['no'] += 1
                    categories['consumer']['no'] += 1

            # Essential scores
            if definition.get('is_essential'):
                if is_yes:
                    essential_pillars[pillar]['yes'] += 1
                    categories['essential']['yes'] += 1
                elif is_no:
                    essential_pillars[pillar]['no'] += 1
                    categories['essential']['no'] += 1

        # Calculate percentages
        def calc_score(yes, no):
            total = yes + no
            if total == 0:
                return None
            return round((yes / total) * 100, 2)

        scores = {
            # Full scores
            'score_s': calc_score(pillars['S']['yes'], pillars['S']['no']),
            'score_a': calc_score(pillars['A']['yes'], pillars['A']['no']),
            'score_f': calc_score(pillars['F']['yes'], pillars['F']['no']),
            'score_e': calc_score(pillars['E']['yes'], pillars['E']['no']),
            'note_finale': calc_score(categories['full']['yes'], categories['full']['no']),

            # Consumer scores
            's_consumer': calc_score(consumer_pillars['S']['yes'], consumer_pillars['S']['no']),
            'a_consumer': calc_score(consumer_pillars['A']['yes'], consumer_pillars['A']['no']),
            'f_consumer': calc_score(consumer_pillars['F']['yes'], consumer_pillars['F']['no']),
            'e_consumer': calc_score(consumer_pillars['E']['yes'], consumer_pillars['E']['no']),
            'note_consumer': calc_score(categories['consumer']['yes'], categories['consumer']['no']),

            # Essential scores
            's_essential': calc_score(essential_pillars['S']['yes'], essential_pillars['S']['no']),
            'a_essential': calc_score(essential_pillars['A']['yes'], essential_pillars['A']['no']),
            'f_essential': calc_score(essential_pillars['F']['yes'], essential_pillars['F']['no']),
            'e_essential': calc_score(essential_pillars['E']['yes'], essential_pillars['E']['no']),
            'note_essential': calc_score(categories['essential']['yes'], categories['essential']['no']),

            # Stats
            'total_norms_evaluated': len(evaluations),
            'total_yes': categories['full']['yes'],
            'total_no': categories['full']['no'],
            'total_na': categories['full']['na'],
            'total_tbd': categories['full']['tbd']
        }

        return scores

    def save_scores(self, product_id: int, scores: Dict, dry_run: bool = False) -> bool:
        """Save scores to safe_scoring_results"""
        if dry_run:
            return True

        headers = get_supabase_headers('return=minimal')

        data = {
            'product_id': product_id,
            'calculated_at': datetime.now().isoformat(),
            **{k: v for k, v in scores.items() if v is not None}
        }

        # Upsert
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/safe_scoring_results",
            headers={**headers, 'Prefer': 'resolution=merge-duplicates'},
            json=data
        )

        return r.status_code in [200, 201]

    def record_history(self, product_id: int, scores: Dict, dry_run: bool = False) -> bool:
        """Record score snapshot in history"""
        if dry_run:
            return True

        headers = get_supabase_headers()

        data = {
            'product_id': product_id,
            'recorded_at': datetime.now().isoformat(),
            'safe_score': scores.get('note_finale'),
            'score_s': scores.get('score_s'),
            'score_a': scores.get('score_a'),
            'score_f': scores.get('score_f'),
            'score_e': scores.get('score_e'),
            'consumer_score': scores.get('note_consumer'),
            'essential_score': scores.get('note_essential'),
            'triggered_by': 'unified_pipeline'
        }

        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/score_history",
            headers=headers,
            json=data
        )

        return r.status_code in [200, 201]

    def run(self, products: List[Dict], dry_run: bool = False) -> Dict:
        """Calculate scores for all products"""
        self.load_data()

        calculated = 0
        history_recorded = 0

        for i, product in enumerate(products):
            print(f"\n[{i+1}/{len(products)}] {product['name']}")

            scores = self.calculate_scores(product['id'])

            if not scores or scores.get('note_finale') is None:
                print_warning("Pas d'évaluations, skip")
                continue

            # Save scores
            if self.save_scores(product['id'], scores, dry_run=dry_run):
                calculated += 1
                print_success(f"Score SAFE: {scores['note_finale']:.1f}% (S:{scores['score_s']:.0f} A:{scores['score_a']:.0f} F:{scores['score_f']:.0f} E:{scores['score_e']:.0f})")

            # Record history
            if self.record_history(product['id'], scores, dry_run=dry_run):
                history_recorded += 1

        return {
            'scores_calculated': calculated,
            'history_recorded': history_recorded
        }


# ============================================================
# MAIN UNIFIED PIPELINE
# ============================================================

class UnifiedPipeline:
    """Pipeline unifié qui exécute toutes les étapes"""

    def __init__(self):
        self.stats = {
            'start_time': None,
            'end_time': None,
            'duration': 0,
            'step0_types': {},
            'step1_applicability': {},
            'step2_evaluations': {},
            'step3_scores': {}
        }

    def get_products(self, mode: str = 'test', product_filter: str = None) -> List[Dict]:
        """Get products to process based on mode"""
        headers = get_supabase_headers()

        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=*&order=name",
            headers=headers
        )

        if r.status_code != 200:
            return []

        products = r.json()

        # Filter by name
        if product_filter:
            products = [p for p in products if product_filter.lower() in p['name'].lower()]
            print_info(f"Filtre: {len(products)} produits correspondant à '{product_filter}'")
            return products

        # Mode selection
        if mode == 'test':
            return products[:1]
        elif mode == 'partial':
            return products[:10]
        else:
            return products

    def print_final_report(self):
        """Print final execution report"""
        s = self.stats

        print(f"""
{Colors.BOLD}{Colors.GREEN}
╔══════════════════════════════════════════════════════════════════════╗
║                      PIPELINE TERMINÉ                                ║
╚══════════════════════════════════════════════════════════════════════╝
{Colors.END}

{Colors.CYAN}DURÉE TOTALE: {s['duration']:.1f} secondes{Colors.END}

{Colors.BOLD}ÉTAPE 0 - DÉTERMINATION DES TYPES:{Colors.END}
   Produits vérifiés:    {s['step0_types'].get('products_checked', 0)}
   Types corrects:       {s['step0_types'].get('types_correct', 0)}
   Corrections suggérées:{s['step0_types'].get('corrections_needed', 0)}
   Corrections appliquées:{s['step0_types'].get('corrections_applied', 0)}

{Colors.BOLD}ÉTAPE 1 - APPLICABILITÉ DES NORMES:{Colors.END}
   Types traités:        {s['step1_applicability'].get('types_processed', 0)}
   Règles générées:      {s['step1_applicability'].get('rules_generated', 0)}

{Colors.BOLD}ÉTAPE 2 - ÉVALUATIONS IA:{Colors.END}
   Produits évalués:     {s['step2_evaluations'].get('products_evaluated', 0)}
   Produits skippés:     {s['step2_evaluations'].get('products_skipped', 0)}
   Total évaluations:    {s['step2_evaluations'].get('total_evaluations', 0)}

{Colors.BOLD}ÉTAPE 3 - CALCUL DES SCORES:{Colors.END}
   Scores calculés:      {s['step3_scores'].get('scores_calculated', 0)}
   Historique enregistré:{s['step3_scores'].get('history_recorded', 0)}

{'='*70}
""")

    def run(self,
            mode: str = 'test',
            product_filter: str = None,
            step: str = 'all',
            force: bool = False,
            apply_types: bool = False,
            scrape: bool = True,
            dry_run: bool = False):
        """
        Run the unified pipeline

        Args:
            mode: test (1), partial (10), or full (all)
            product_filter: Filter products by name
            step: types, applicability, evaluate, scores, or all
            force: Force re-evaluation even if already done
            apply_types: Auto-apply type corrections
            scrape: Enable web scraping
            dry_run: Simulate without saving
        """

        print(f"""
{Colors.BOLD}{Colors.CYAN}
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║         SAFESCORING.IO - UNIFIED PIPELINE                            ║
║                                                                      ║
║    ÉTAPE 0: Détermination des types (IA + Scraping)                  ║
║    ÉTAPE 1: Applicabilité des normes                                 ║
║    ÉTAPE 2: Évaluation IA des produits                               ║
║    ÉTAPE 3: Calcul des scores SAFE                                   ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
{Colors.END}

{Colors.YELLOW}Configuration:{Colors.END}
   Mode:         {mode}
   Étape:        {step}
   Force:        {force}
   Scraping:     {scrape}
   Apply types:  {apply_types}
   Dry run:      {dry_run}
""")

        self.stats['start_time'] = time.time()

        # Get products
        products = self.get_products(mode, product_filter)

        if not products:
            print_error("Aucun produit trouvé!")
            return

        print(f"\n{Colors.BOLD}Produits à traiter: {len(products)}{Colors.END}\n")

        # ============================================================
        # STEP 0: TYPE DETERMINATION
        # ============================================================
        if step in ['all', 'types']:
            print_banner(0, "DÉTERMINATION DES TYPES", "Utilise l'IA pour vérifier/corriger les types de produits")

            type_det = TypeDeterminator(scrape_enabled=scrape)
            self.stats['step0_types'] = type_det.run(
                products,
                apply=apply_types,
                dry_run=dry_run
            )

        # ============================================================
        # STEP 1: APPLICABILITY
        # ============================================================
        if step in ['all', 'applicability']:
            print_banner(1, "APPLICABILITÉ DES NORMES", "Génère les règles d'applicabilité pour chaque type")

            applicability = ApplicabilityManager()
            self.stats['step1_applicability'] = applicability.run(
                force=force,
                dry_run=dry_run
            )

        # ============================================================
        # STEP 2: PRODUCT EVALUATION
        # ============================================================
        if step in ['all', 'evaluate']:
            print_banner(2, "ÉVALUATION DES PRODUITS", "Évalue chaque produit contre les normes applicables")

            evaluator = ProductEvaluator(scrape_enabled=scrape)
            self.stats['step2_evaluations'] = evaluator.run(
                products,
                force=force,
                dry_run=dry_run
            )

        # ============================================================
        # STEP 3: SCORE CALCULATION
        # ============================================================
        if step in ['all', 'scores']:
            print_banner(3, "CALCUL DES SCORES", "Calcule les scores SAFE à partir des évaluations")

            calculator = ScoreCalculatorEngine()
            self.stats['step3_scores'] = calculator.run(
                products,
                dry_run=dry_run
            )

        # ============================================================
        # FINAL REPORT
        # ============================================================
        self.stats['end_time'] = time.time()
        self.stats['duration'] = self.stats['end_time'] - self.stats['start_time']

        self.print_final_report()

        return self.stats


# ============================================================
# ENTRY POINT
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description='SafeScoring Unified Pipeline - Mise à jour complète des produits',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
  python -m src.automation.unified_pipeline --mode test              # 1 produit (test)
  python -m src.automation.unified_pipeline --mode partial           # 10 produits
  python -m src.automation.unified_pipeline --mode full              # Tous
  python -m src.automation.unified_pipeline --product "Ledger"       # Par nom
  python -m src.automation.unified_pipeline --step types --apply-types  # Juste les types
  python -m src.automation.unified_pipeline --force --mode full      # Force recalcul
  python -m src.automation.unified_pipeline --dry-run                # Simulation
        """
    )

    parser.add_argument('--mode', choices=['test', 'partial', 'full'], default='test',
                        help='Mode: test (1 produit), partial (10), full (tous)')
    parser.add_argument('--product', type=str,
                        help='Filtrer par nom de produit')
    parser.add_argument('--step', choices=['all', 'types', 'applicability', 'evaluate', 'scores'],
                        default='all', help='Étape à exécuter')
    parser.add_argument('--force', action='store_true',
                        help='Force recalcul même si déjà fait')
    parser.add_argument('--apply-types', action='store_true',
                        help='Appliquer automatiquement les corrections de types')
    parser.add_argument('--no-scrape', action='store_true',
                        help='Désactiver le scraping web')
    parser.add_argument('--dry-run', action='store_true',
                        help='Simule sans modifier la base de données')

    args = parser.parse_args()

    pipeline = UnifiedPipeline()
    pipeline.run(
        mode=args.mode,
        product_filter=args.product,
        step=args.step,
        force=args.force,
        apply_types=args.apply_types,
        scrape=not args.no_scrape,
        dry_run=args.dry_run
    )


if __name__ == '__main__':
    main()
