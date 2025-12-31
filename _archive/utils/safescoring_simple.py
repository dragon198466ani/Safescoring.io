#!/usr/bin/env python3
"""
SAFESCORING.IO - Automatisation 100% GRATUITE (Version Simplifiée)
==================================================================

VERSION LÉGÈRE - Utilise httpx au lieu du SDK Supabase
Pas besoin de compiler quoi que ce soit!

Usage:
    python safescoring_simple.py --mode test    # Test avec 3 produits
    python safescoring_simple.py --mode full    # Tous les produits
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass

# Vérification des dépendances
def check_dependencies():
    """Vérifie que les dépendances sont installées."""
    missing = []
    
    try:
        import httpx
    except ImportError:
        missing.append('httpx')
    
    try:
        import google.generativeai
    except ImportError:
        missing.append('google-generativeai')
    
    try:
        from dotenv import load_dotenv
    except ImportError:
        missing.append('python-dotenv')
    
    if missing:
        print("❌ Dépendances manquantes:")
        print(f"   pip install {' '.join(missing)}")
        sys.exit(1)
    
    return True

check_dependencies()

# Imports après vérification
import httpx
import google.generativeai as genai
from dotenv import load_dotenv

# Charger .env
load_dotenv()


# ============================================
# CONFIGURATION
# ============================================

@dataclass
class Config:
    """Configuration centralisée."""
    
    # API Keys
    GOOGLE_API_KEY: str = os.getenv('GOOGLE_API_KEY', '')
    MISTRAL_API_KEY: str = os.getenv('MISTRAL_API_KEY', '')
    SUPABASE_URL: str = os.getenv('SUPABASE_URL', '')
    SUPABASE_KEY: str = os.getenv('SUPABASE_SERVICE_KEY', '')
    
    @classmethod
    def validate(cls) -> bool:
        """Vérifie la configuration."""
        config = cls()
        errors = []
        
        if not config.GOOGLE_API_KEY and not config.MISTRAL_API_KEY:
            errors.append("GOOGLE_API_KEY ou MISTRAL_API_KEY requis")
        
        if errors:
            print("❌ Erreurs de configuration:")
            for e in errors:
                print(f"   • {e}")
            print("\n📝 Créez un fichier .env avec vos clés API")
            return False
        
        print("✅ Configuration validée")
        return True


# ============================================
# LOGGER SIMPLE
# ============================================

class Logger:
    """Logger simple avec couleurs."""
    
    COLORS = {
        'red': '\033[91m',
        'green': '\033[92m',
        'yellow': '\033[93m',
        'blue': '\033[94m',
        'magenta': '\033[95m',
        'cyan': '\033[96m',
        'reset': '\033[0m'
    }
    
    @staticmethod
    def _log(color: str, prefix: str, msg: str):
        c = Logger.COLORS.get(color, '')
        r = Logger.COLORS['reset']
        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"{c}[{timestamp}] {prefix} {msg}{r}")
    
    @staticmethod
    def info(msg): Logger._log('blue', 'ℹ️', msg)
    
    @staticmethod
    def success(msg): Logger._log('green', '✅', msg)
    
    @staticmethod
    def warning(msg): Logger._log('yellow', '⚠️', msg)
    
    @staticmethod
    def error(msg): Logger._log('red', '❌', msg)
    
    @staticmethod
    def step(msg): Logger._log('cyan', '📦', msg)

log = Logger()


# ============================================
# CLIENT SUPABASE SIMPLE (avec httpx)
# ============================================

class SimpleSupabaseClient:
    """Client Supabase léger utilisant httpx."""
    
    def __init__(self, url: str, key: str):
        self.url = url.rstrip('/')
        self.key = key
        self.headers = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    
    def select(self, table: str, columns: str = '*', filters: Dict = None, limit: int = None) -> List[Dict]:
        """SELECT depuis une table."""
        url = f"{self.url}/rest/v1/{table}?select={columns}"
        
        if filters:
            for key, value in filters.items():
                url += f"&{key}=eq.{value}"
        
        if limit:
            url += f"&limit={limit}"
        
        try:
            with httpx.Client(timeout=30) as client:
                response = client.get(url, headers=self.headers)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            log.error(f"Supabase SELECT error: {e}")
            return []
    
    def insert(self, table: str, data: Dict) -> Optional[Dict]:
        """INSERT dans une table."""
        url = f"{self.url}/rest/v1/{table}"
        
        try:
            with httpx.Client(timeout=30) as client:
                response = client.post(url, headers=self.headers, json=data)
                response.raise_for_status()
                result = response.json()
                return result[0] if result else None
        except Exception as e:
            log.error(f"Supabase INSERT error: {e}")
            return None
    
    def update(self, table: str, data: Dict, filters: Dict) -> bool:
        """UPDATE une table."""
        url = f"{self.url}/rest/v1/{table}"
        
        for key, value in filters.items():
            url += f"?{key}=eq.{value}"
        
        try:
            with httpx.Client(timeout=30) as client:
                response = client.patch(url, headers=self.headers, json=data)
                response.raise_for_status()
                return True
        except Exception as e:
            log.error(f"Supabase UPDATE error: {e}")
            return False
    
    def upsert(self, table: str, data: Dict) -> bool:
        """UPSERT (insert or update)."""
        url = f"{self.url}/rest/v1/{table}"
        headers = {**self.headers, 'Prefer': 'resolution=merge-duplicates'}
        
        try:
            with httpx.Client(timeout=30) as client:
                response = client.post(url, headers=headers, json=data)
                response.raise_for_status()
                return True
        except Exception as e:
            log.error(f"Supabase UPSERT error: {e}")
            return False


# ============================================
# CLIENT IA GEMINI
# ============================================

class GeminiClient:
    """Client Google Gemini (GRATUIT - 1.5M tokens/jour)."""
    
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        self.delay = 1.2  # 60 req/min
    
    def extract_specs(self, content: str, product_name: str) -> Dict:
        """Extraction de specs avec Gemini."""
        
        prompt = f"""Tu es un expert en extraction de données pour hardware wallets crypto.
Extrais UNIQUEMENT les informations présentes dans le texte.
Réponds UNIQUEMENT en JSON valide.

Produit: {product_name}

Contenu de la page:
{content[:15000]}

Extrais au format JSON strict:
{{
  "price_eur": null,
  "chip": null,
  "chip_certification": null,
  "screen_type": null,
  "bluetooth": false,
  "nfc": false,
  "usb_c": false,
  "secure_element": false,
  "open_source_firmware": false,
  "passphrase_support": false,
  "multisig_native": false,
  "air_gapped": false,
  "coins_supported": null,
  "certifications": [],
  "country_origin": null
}}

Règles: null si non trouvé, true/false pour booléens.

JSON:"""

        try:
            response = self.model.generate_content(prompt)
            time.sleep(self.delay)
            return self._parse_json(response.text)
        except Exception as e:
            log.error(f"Gemini error: {e}")
            return {}
    
    def evaluate_norms(self, specs: Dict, norms: List[Dict]) -> Dict:
        """Évaluation SAFE avec Gemini."""
        
        norms_text = "\n".join([f"- {n['code']}: {n['description']}" for n in norms])
        
        prompt = f"""Expert sécurité crypto - Méthodologie SAFE Scoring.

PRODUIT:
{json.dumps(specs, indent=2, ensure_ascii=False)}

NORMES:
{norms_text}

Pour chaque norme:
- "YES" = Le produit respecte clairement cette norme
- "NO" = Le produit NE respecte PAS cette norme
- "N/A" = Non applicable à ce type de produit

En cas de doute → "NO"

JSON uniquement: {{"CODE1": "YES", "CODE2": "NO", ...}}"""

        try:
            response = self.model.generate_content(prompt)
            time.sleep(self.delay)
            return self._parse_json(response.text)
        except Exception as e:
            log.error(f"Gemini error: {e}")
            return {}
    
    def _parse_json(self, text: str) -> Dict:
        """Parse JSON depuis la réponse."""
        try:
            text = text.strip()
            if '```' in text:
                text = text.split('```')[1]
                if text.startswith('json'):
                    text = text[4:]
                text = text.strip()
            return json.loads(text)
        except Exception as e:
            log.warning(f"JSON parse error: {e}")
            return {}


# ============================================
# SCRAPER SIMPLE (sans Playwright)
# ============================================

class SimpleScraper:
    """Scraper simple avec httpx (pas de JavaScript)."""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    
    def scrape(self, url: str) -> str:
        """Récupère le contenu d'une page."""
        try:
            with httpx.Client(timeout=30, follow_redirects=True) as client:
                response = client.get(url, headers=self.headers)
                response.raise_for_status()
                return response.text
        except Exception as e:
            log.error(f"Scrape error for {url}: {e}")
            return ""


# ============================================
# MODE DÉMO (sans Supabase)
# ============================================

def run_demo_mode():
    """Mode démo sans connexion Supabase."""
    
    print("\n" + "="*60)
    print("🎮 MODE DÉMO - Test sans Supabase")
    print("="*60 + "\n")
    
    config = Config()
    
    # Vérifier qu'on a au moins une clé API
    if not config.GOOGLE_API_KEY:
        log.error("GOOGLE_API_KEY manquant dans .env")
        print("\n📝 Crée un fichier .env avec:")
        print("   GOOGLE_API_KEY=AIza_ta_cle_ici")
        print("\n🔗 Obtenir la clé: https://aistudio.google.com")
        return
    
    # Initialiser Gemini
    log.info("Initialisation de Gemini...")
    try:
        ai = GeminiClient(config.GOOGLE_API_KEY)
        log.success("Gemini initialisé!")
    except Exception as e:
        log.error(f"Erreur Gemini: {e}")
        return
    
    # Produits de test (données simulées)
    test_products = [
        {
            "name": "Ledger Nano X",
            "specs": {
                "price_eur": 149,
                "chip": "ST33J2M0",
                "chip_certification": "CC EAL5+",
                "bluetooth": True,
                "secure_element": True,
                "open_source_firmware": False,
                "passphrase_support": True,
                "coins_supported": 5500
            }
        },
        {
            "name": "Trezor Model T",
            "specs": {
                "price_eur": 219,
                "chip": "STM32F427",
                "chip_certification": None,
                "bluetooth": False,
                "secure_element": False,
                "open_source_firmware": True,
                "passphrase_support": True,
                "coins_supported": 1800
            }
        },
        {
            "name": "Coldcard Mk4",
            "specs": {
                "price_eur": 157,
                "chip": "ATECC608A",
                "chip_certification": None,
                "bluetooth": False,
                "secure_element": True,
                "open_source_firmware": True,
                "passphrase_support": True,
                "air_gapped": True,
                "coins_supported": 1
            }
        }
    ]
    
    # Normes de test
    test_norms = [
        {"code": "S-SEC-001", "description": "Uses a certified secure element (CC EAL5+ or higher)"},
        {"code": "S-SEC-002", "description": "Firmware is open source and auditable"},
        {"code": "A-COE-001", "description": "Supports hidden wallets via passphrase"},
        {"code": "A-COE-002", "description": "Supports air-gapped operation (no direct connection)"},
        {"code": "F-DUR-001", "description": "Has Bluetooth connectivity"},
        {"code": "E-USA-001", "description": "Supports more than 1000 cryptocurrencies"},
    ]
    
    print(f"\n📦 Test avec {len(test_products)} produits et {len(test_norms)} normes\n")
    
    results = []
    
    for i, product in enumerate(test_products, 1):
        log.step(f"[{i}/{len(test_products)}] {product['name']}")
        
        # Évaluer avec Gemini
        log.info("Évaluation avec Gemini...")
        evaluations = ai.evaluate_norms(product['specs'], test_norms)
        
        if evaluations:
            log.success(f"Évaluation terminée: {len(evaluations)} normes")
            
            # Afficher les résultats
            print(f"\n   📊 Résultats pour {product['name']}:")
            for code, result in evaluations.items():
                emoji = "✅" if result == "YES" else "❌" if result == "NO" else "➖"
                print(f"      {emoji} {code}: {result}")
            
            results.append({
                "product": product['name'],
                "evaluations": evaluations,
                "yes_count": sum(1 for v in evaluations.values() if v == "YES"),
                "no_count": sum(1 for v in evaluations.values() if v == "NO"),
                "na_count": sum(1 for v in evaluations.values() if v == "N/A")
            })
        else:
            log.warning("Pas de résultat")
        
        print()
    
    # Résumé final
    print("\n" + "="*60)
    print("📊 RÉSUMÉ FINAL")
    print("="*60)
    
    for r in results:
        total = r['yes_count'] + r['no_count']
        score = (r['yes_count'] / total * 100) if total > 0 else 0
        print(f"\n   {r['product']}:")
        print(f"      ✅ YES: {r['yes_count']}")
        print(f"      ❌ NO: {r['no_count']}")
        print(f"      ➖ N/A: {r['na_count']}")
        print(f"      📈 Score: {score:.0f}%")
    
    print("\n" + "="*60)
    print("🎉 TEST RÉUSSI!")
    print("="*60)
    print("\n💡 Pour utiliser avec ta vraie base Supabase:")
    print("   1. Ajoute SUPABASE_URL et SUPABASE_SERVICE_KEY dans .env")
    print("   2. Lance: python safescoring_simple.py --mode full")
    print()


# ============================================
# MODE COMPLET (avec Supabase)
# ============================================

def run_full_mode():
    """Mode complet avec Supabase."""
    
    print("\n" + "="*60)
    print("🚀 MODE COMPLET - Avec Supabase")
    print("="*60 + "\n")
    
    config = Config()
    
    # Vérifier la config
    if not config.SUPABASE_URL or not config.SUPABASE_KEY:
        log.warning("Supabase non configuré - Passage en mode démo")
        run_demo_mode()
        return
    
    if not config.GOOGLE_API_KEY:
        log.error("GOOGLE_API_KEY manquant")
        return
    
    # Initialiser les clients
    log.info("Initialisation...")
    
    try:
        db = SimpleSupabaseClient(config.SUPABASE_URL, config.SUPABASE_KEY)
        ai = GeminiClient(config.GOOGLE_API_KEY)
        scraper = SimpleScraper()
        log.success("Clients initialisés!")
    except Exception as e:
        log.error(f"Erreur initialisation: {e}")
        return
    
    # Charger les produits
    log.info("Chargement des produits...")
    products = db.select('products', 'id,name,url,specs', limit=100)
    
    if not products:
        log.warning("Aucun produit trouvé - Passage en mode démo")
        run_demo_mode()
        return
    
    log.success(f"{len(products)} produits chargés")
    
    # Charger les normes
    log.info("Chargement des normes...")
    norms = db.select('norms', 'id,code,description,pillar')
    log.success(f"{len(norms)} normes chargées")
    
    # Traiter chaque produit
    stats = {"processed": 0, "evaluations": 0, "errors": 0}
    
    for i, product in enumerate(products, 1):
        log.step(f"[{i}/{len(products)}] {product['name']}")
        
        try:
            # Scraper si URL disponible
            specs = product.get('specs', {})
            if product.get('url') and not specs:
                log.info(f"Scraping {product['url']}...")
                content = scraper.scrape(product['url'])
                if content:
                    specs = ai.extract_specs(content, product['name'])
                    if specs:
                        db.update('products', {'specs': specs}, {'id': product['id']})
            
            if not specs:
                log.warning("Pas de specs, skip")
                continue
            
            # Évaluer par batch de 30 normes
            batch_size = 30
            all_evals = {}
            
            for j in range(0, len(norms), batch_size):
                batch = norms[j:j+batch_size]
                evals = ai.evaluate_norms(specs, batch)
                all_evals.update(evals)
            
            # Sauvegarder les évaluations
            for norm in norms:
                code = norm['code']
                if code in all_evals:
                    db.upsert('product_norm_evaluations', {
                        'product_id': product['id'],
                        'norm_id': norm['id'],
                        'evaluation': all_evals[code],
                        'evaluated_at': datetime.now().isoformat()
                    })
                    stats['evaluations'] += 1
            
            stats['processed'] += 1
            log.success(f"Évalué: {len(all_evals)} normes")
            
        except Exception as e:
            log.error(f"Erreur: {e}")
            stats['errors'] += 1
        
        print()
    
    # Résumé
    print("\n" + "="*60)
    print("📊 RÉSUMÉ FINAL")
    print("="*60)
    print(f"   ✅ Produits traités: {stats['processed']}")
    print(f"   📝 Évaluations: {stats['evaluations']}")
    print(f"   ❌ Erreurs: {stats['errors']}")
    print(f"   💰 Coût: 0€")
    print("="*60 + "\n")


# ============================================
# MAIN
# ============================================

def main():
    parser = argparse.ArgumentParser(description='SafeScoring Automation (Simple)')
    parser.add_argument('--mode', choices=['test', 'full', 'demo'], default='test',
                        help='Mode: test (démo), full (avec Supabase)')
    
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print("🔒 SAFESCORING.IO - Automatisation GRATUITE")
    print("   Version Simplifiée (sans SDK Supabase)")
    print("="*60)
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🎮 Mode: {args.mode}")
    print("="*60 + "\n")
    
    if args.mode in ['test', 'demo']:
        run_demo_mode()
    else:
        run_full_mode()


if __name__ == "__main__":
    main()
