#!/usr/bin/env python3
"""
🚀 SAFESCORING.IO - Automatisation 100% GRATUITE
================================================

Ce script utilise uniquement des services GRATUITS:
- Groq API (Llama 3.3 70B) - Évaluation SAFE
- Google Gemini API - Extraction specs  
- Ollama (local) - Backup illimité
- Playwright - Scraping
- Supabase - Database (tier gratuit)

Usage:
    python safescoring_automation_free.py --mode test    # 3 produits
    python safescoring_automation_free.py --mode full    # Tous les produits
    python safescoring_automation_free.py --mode cve     # CVE seulement

Auteur: Dragon67 / safescoring.io
Coût: 0€/mois
"""

import os
import sys
import json
import time
import random
import argparse
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from abc import ABC, abstractmethod

# ============================================
# VÉRIFICATION DES DÉPENDANCES
# ============================================

def check_dependencies():
    """Vérifie que toutes les dépendances sont installées."""
    missing = []
    
    try:
        from mistralai import Mistral
    except ImportError:
        missing.append('mistralai')
    
    try:
        import google.generativeai as genai
    except ImportError:
        missing.append('google-generativeai')
    
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        missing.append('playwright')
    
    try:
        from supabase import create_client
    except ImportError:
        missing.append('supabase')
    
    try:
        from fake_useragent import UserAgent
    except ImportError:
        missing.append('fake-useragent')
    
    try:
        from dotenv import load_dotenv
    except ImportError:
        missing.append('python-dotenv')
    
    try:
        import requests
    except ImportError:
        missing.append('requests')
    
    if missing:
        print("❌ Dépendances manquantes:")
        print(f"   pip install {' '.join(missing)}")
        if 'playwright' in missing:
            print("   playwright install chromium")
        sys.exit(1)
    
    return True

check_dependencies()

# Imports après vérification
from mistralai import Mistral
import google.generativeai as genai
from playwright.sync_api import sync_playwright
from supabase import create_client
from fake_useragent import UserAgent
from dotenv import load_dotenv
import requests

# Charger .env
load_dotenv()


# ============================================
# CONFIGURATION
# ============================================

@dataclass
class Config:
    """Configuration centralisée."""
    
    # API Keys (gratuites!)
    MISTRAL_API_KEY: str = os.getenv('MISTRAL_API_KEY', '')
    GOOGLE_API_KEY: str = os.getenv('GOOGLE_API_KEY', '')
    SUPABASE_URL: str = os.getenv('SUPABASE_URL', '')
    SUPABASE_KEY: str = os.getenv('SUPABASE_SERVICE_KEY', '')
    
    # Telegram (optionnel)
    TELEGRAM_BOT_TOKEN: str = os.getenv('TELEGRAM_BOT_TOKEN', '')
    TELEGRAM_CHAT_ID: str = os.getenv('TELEGRAM_ADMIN_CHAT_ID', '')
    
    # Paramètres
    SCRAPE_DELAY_MIN: float = 2.0
    SCRAPE_DELAY_MAX: float = 5.0
    MISTRAL_DELAY: float = 1.5  # 1 req/sec
    GEMINI_DELAY: float = 1.2  # 60 req/min = 1 sec entre chaque
    BATCH_SIZE_NORMS: int = 35  # Normes par batch pour évaluation
    
    # Modèles
    MISTRAL_MODEL: str = "mistral-small-latest"
    GEMINI_MODEL: str = "gemini-1.5-flash"
    OLLAMA_MODEL: str = "llama3.2"
    
    @classmethod
    def validate(cls) -> bool:
        """Vérifie la configuration."""
        config = cls()
        errors = []
        
        if not config.MISTRAL_API_KEY and not config.GOOGLE_API_KEY:
            errors.append("Au moins MISTRAL_API_KEY ou GOOGLE_API_KEY requis")
        
        if not config.SUPABASE_URL:
            errors.append("SUPABASE_URL manquant")
        
        if not config.SUPABASE_KEY:
            errors.append("SUPABASE_SERVICE_KEY manquant")
        
        if errors:
            print("❌ Erreurs de configuration:")
            for e in errors:
                print(f"   • {e}")
            print("\n📝 Créez un fichier .env avec les clés API (voir env_template.txt)")
            return False
        
        print("✅ Configuration validée")
        return True


# ============================================
# SOURCES DES PRODUITS
# ============================================

PRODUCT_SOURCES = {
    # === LEDGER ===
    "ledger-nano-x": {
        "brand": "Ledger",
        "name": "Ledger Nano X",
        "urls": ["https://www.ledger.com/products/ledger-nano-x"],
        "type": "HW Cold Wallet"
    },
    "ledger-nano-s-plus": {
        "brand": "Ledger",
        "name": "Ledger Nano S Plus",
        "urls": ["https://www.ledger.com/products/ledger-nano-s-plus"],
        "type": "HW Cold Wallet"
    },
    "ledger-stax": {
        "brand": "Ledger",
        "name": "Ledger Stax",
        "urls": ["https://www.ledger.com/products/ledger-stax"],
        "type": "HW Cold Wallet"
    },
    "ledger-flex": {
        "brand": "Ledger",
        "name": "Ledger Flex",
        "urls": ["https://www.ledger.com/products/ledger-flex"],
        "type": "HW Cold Wallet"
    },
    
    # === TREZOR ===
    "trezor-model-t": {
        "brand": "Trezor",
        "name": "Trezor Model T",
        "urls": ["https://trezor.io/trezor-model-t"],
        "type": "HW Cold Wallet"
    },
    "trezor-model-one": {
        "brand": "Trezor",
        "name": "Trezor Model One",
        "urls": ["https://trezor.io/trezor-model-one"],
        "type": "HW Cold Wallet"
    },
    "trezor-safe-3": {
        "brand": "Trezor",
        "name": "Trezor Safe 3",
        "urls": ["https://trezor.io/trezor-safe-3"],
        "type": "HW Cold Wallet"
    },
    "trezor-safe-5": {
        "brand": "Trezor",
        "name": "Trezor Safe 5",
        "urls": ["https://trezor.io/trezor-safe-5"],
        "type": "HW Cold Wallet"
    },
    
    # === COLDCARD ===
    "coldcard-mk4": {
        "brand": "Coinkite",
        "name": "Coldcard MK4",
        "urls": ["https://coldcard.com/"],
        "type": "HW Cold Wallet"
    },
    "coldcard-q": {
        "brand": "Coinkite",
        "name": "Coldcard Q",
        "urls": ["https://coldcard.com/q"],
        "type": "HW Cold Wallet"
    },
    
    # === AUTRES WALLETS ===
    "bitbox02": {
        "brand": "Shift Crypto",
        "name": "BitBox02",
        "urls": ["https://shiftcrypto.ch/bitbox02/"],
        "type": "HW Cold Wallet"
    },
    "keystone-3-pro": {
        "brand": "Keystone",
        "name": "Keystone 3 Pro",
        "urls": ["https://keyst.one/keystone-3-pro"],
        "type": "HW Cold Wallet"
    },
    "jade": {
        "brand": "Blockstream",
        "name": "Blockstream Jade",
        "urls": ["https://blockstream.com/jade/"],
        "type": "HW Cold Wallet"
    },
    "passport": {
        "brand": "Foundation",
        "name": "Passport",
        "urls": ["https://foundationdevices.com/passport/"],
        "type": "HW Cold Wallet"
    },
    
    # === BACKUP DEVICES ===
    "cryptosteel-capsule": {
        "brand": "Cryptosteel",
        "name": "Cryptosteel Capsule",
        "urls": ["https://cryptosteel.com/product/cryptosteel-capsule/"],
        "type": "Backup Physical"
    },
    "billfodl": {
        "brand": "Privacy Pros",
        "name": "Billfodl",
        "urls": ["https://privacypros.io/products/the-billfodl/"],
        "type": "Backup Physical"
    },
    "cryptotag-zeus": {
        "brand": "Cryptotag",
        "name": "Cryptotag Zeus",
        "urls": ["https://cryptotag.io/products/zeus/"],
        "type": "Backup Physical"
    },
    
    # Ajouter plus de produits selon ta base...
}


# ============================================
# LOGGER
# ============================================

class Logger:
    """Logger simple avec couleurs."""
    
    COLORS = {
        'reset': '\033[0m',
        'red': '\033[91m',
        'green': '\033[92m',
        'yellow': '\033[93m',
        'blue': '\033[94m',
        'purple': '\033[95m',
        'cyan': '\033[96m',
    }
    
    @staticmethod
    def _log(level: str, color: str, message: str):
        timestamp = datetime.now().strftime('%H:%M:%S')
        c = Logger.COLORS.get(color, '')
        r = Logger.COLORS['reset']
        print(f"{c}[{timestamp}] {level}: {message}{r}")
    
    @staticmethod
    def info(msg): Logger._log('INFO', 'blue', msg)
    
    @staticmethod
    def success(msg): Logger._log('OK', 'green', msg)
    
    @staticmethod
    def warning(msg): Logger._log('WARN', 'yellow', msg)
    
    @staticmethod
    def error(msg): Logger._log('ERROR', 'red', msg)
    
    @staticmethod
    def debug(msg): Logger._log('DEBUG', 'purple', msg)

log = Logger()


# ============================================
# CLIENTS IA GRATUITS
# ============================================

class AIClient(ABC):
    """Interface pour les clients IA."""
    
    @abstractmethod
    def extract_specs(self, content: str, product_name: str) -> Dict:
        pass
    
    @abstractmethod
    def evaluate_norms(self, specs: Dict, norms: List[Dict]) -> Dict:
        pass


class MistralClient(AIClient):
    """Client Mistral AI (GRATUIT - Français! 🇫🇷)."""
    
    def __init__(self, api_key: str):
        from mistralai import Mistral
        self.client = Mistral(api_key=api_key)
        self.model = "mistral-small-latest"
        self.delay = 1.5  # 1 req/sec
        
    def _call(self, user: str, max_tokens: int = 3000) -> str:
        """Appel API avec gestion d'erreurs."""
        try:
            response = self.client.chat.complete(
                model=self.model,
                messages=[{"role": "user", "content": user}],
                temperature=0.1,
                max_tokens=max_tokens,
            )
            time.sleep(self.delay)
            return response.choices[0].message.content
        except Exception as e:
            log.error(f"Mistral API error: {e}")
            raise
    
    def extract_specs(self, content: str, product_name: str) -> Dict:
        """Extraction de specs avec Mistral."""
        
        user = f"""Tu es un expert en extraction de données pour hardware wallets crypto.
Extrais UNIQUEMENT les informations présentes dans le texte.
Réponds UNIQUEMENT en JSON valide.

Produit: {product_name}

Contenu de la page:
{content[:10000]}

Extrais au format JSON strict:
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
  "air_gapped": false,
  "qr_code": false,
  "coins_supported": null,
  "certifications": [],
  "country_origin": null
}}

Règles: null si non trouvé, true/false pour booléens.

JSON:"""

        result = self._call(user)
        return self._parse_json(result)
    
    def evaluate_norms(self, specs: Dict, norms: List[Dict]) -> Dict:
        """Évaluation SAFE avec Mistral."""
        
        norms_text = "\n".join([f"- {n['code']}: {n['description']}" for n in norms])
        
        user = f"""Expert sécurité crypto - Méthodologie SAFE Scoring.

PRODUIT:
{json.dumps(specs, indent=2, ensure_ascii=False)}

NORMES:
{norms_text}

Pour chaque: "YES" (respecte), "NO" (non), "N/A" (non applicable)
En cas de doute → "NO"

JSON uniquement: {{"CODE1": "YES", "CODE2": "NO", ...}}"""

        result = self._call(user, max_tokens=4000)
        return self._parse_json(result)
    
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
        except json.JSONDecodeError as e:
            log.warning(f"JSON parse error: {e}")
            return {}


class GeminiClient(AIClient):
    """Client Google Gemini (GRATUIT - 1M tokens/jour!)."""
    
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(Config.GEMINI_MODEL)
        self.delay = Config.GEMINI_DELAY
    
    def _call(self, prompt: str) -> str:
        """Appel API Gemini."""
        try:
            response = self.model.generate_content(prompt)
            time.sleep(self.delay)
            return response.text
        except Exception as e:
            log.error(f"Gemini API error: {e}")
            raise
    
    def extract_specs(self, content: str, product_name: str) -> Dict:
        """Extraction avec Gemini (contexte énorme possible!)."""
        
        prompt = f"""Tu es un expert en extraction de données pour hardware wallets crypto.

PRODUIT: {product_name}

CONTENU DE LA PAGE:
{content[:25000]}

Extrais les informations au format JSON strict:
{{
  "price_eur": null,
  "price_usd": null,
  "chip": null,
  "chip_certification": null,
  "screen_type": null,
  "screen_resolution": null,
  "bluetooth": false,
  "nfc": false,
  "usb_c": false,
  "usb_micro": false,
  "battery_mah": null,
  "secure_element": false,
  "open_source_firmware": false,
  "open_source_hardware": false,
  "passphrase_support": false,
  "shamir_backup": false,
  "multisig_native": false,
  "air_gapped": false,
  "qr_code": false,
  "microsd": false,
  "coins_supported": null,
  "firmware_version": null,
  "certifications": [],
  "dimensions_mm": null,
  "weight_g": null,
  "warranty_years": null,
  "country_origin": null
}}

Règles:
- null si non trouvé
- true/false pour booléens
- Certifications exactes (ex: "CC EAL5+")

Retourne UNIQUEMENT le JSON, rien d'autre:"""

        result = self._call(prompt)
        return self._parse_json(result)
    
    def evaluate_norms(self, specs: Dict, norms: List[Dict]) -> Dict:
        """Évaluation avec Gemini."""
        
        norms_text = "\n".join([f"- {n['code']}: {n['description']}" for n in norms])
        
        prompt = f"""Expert sécurité crypto - Méthodologie SAFE Scoring.

PRODUIT:
{json.dumps(specs, indent=2, ensure_ascii=False)}

NORMES:
{norms_text}

Pour chaque norme:
- "YES" = respectée
- "NO" = non respectée
- "N/A" = non applicable

JSON uniquement: {{"CODE1": "YES", ...}}"""

        result = self._call(prompt)
        return self._parse_json(result)
    
    def _parse_json(self, text: str) -> Dict:
        """Parse JSON."""
        try:
            text = text.strip()
            if '```' in text:
                text = text.split('```')[1].replace('json', '').strip()
            return json.loads(text)
        except:
            return {}


class OllamaClient(AIClient):
    """Client Ollama (100% LOCAL et GRATUIT - Illimité!)."""
    
    def __init__(self, model: str = None):
        self.model = model or Config.OLLAMA_MODEL
        self._check_ollama()
    
    def _check_ollama(self):
        """Vérifie si Ollama est disponible."""
        try:
            import ollama
            self.ollama = ollama
            # Vérifier si le modèle est téléchargé
            models = ollama.list()
            model_names = [m['name'].split(':')[0] for m in models.get('models', [])]
            if self.model.split(':')[0] not in model_names:
                log.warning(f"Modèle {self.model} non trouvé. Run: ollama pull {self.model}")
        except ImportError:
            log.warning("Ollama non installé. Backup local non disponible.")
            self.ollama = None
        except Exception as e:
            log.warning(f"Ollama non accessible: {e}")
            self.ollama = None
    
    def _call(self, system: str, user: str) -> str:
        """Appel Ollama local."""
        if not self.ollama:
            raise RuntimeError("Ollama non disponible")
        
        response = self.ollama.chat(
            model=self.model,
            messages=[
                {'role': 'system', 'content': system},
                {'role': 'user', 'content': user}
            ],
            options={'temperature': 0.1, 'num_predict': 3000}
        )
        return response['message']['content']
    
    def extract_specs(self, content: str, product_name: str) -> Dict:
        """Extraction locale."""
        system = "Expert extraction données. JSON uniquement."
        user = f"""Extrais specs de {product_name}:
{content[:6000]}

JSON: {{"price_eur":null,"chip":null,"bluetooth":false,"secure_element":false}}"""
        
        result = self._call(system, user)
        return self._parse_json(result)
    
    def evaluate_norms(self, specs: Dict, norms: List[Dict]) -> Dict:
        """Évaluation locale (batch plus petit)."""
        norms_text = "\n".join([f"- {n['code']}: {n['description']}" for n in norms[:25]])
        
        system = "Expert sécurité crypto. Réponds YES/NO/N/A en JSON."
        user = f"Produit: {json.dumps(specs)}\n\nNormes:\n{norms_text}\n\nJSON:"
        
        result = self._call(system, user)
        return self._parse_json(result)
    
    def _parse_json(self, text: str) -> Dict:
        try:
            text = text.strip()
            if '```' in text:
                text = text.split('```')[1].replace('json', '').strip()
            return json.loads(text)
        except:
            return {}


class HybridAIClient:
    """
    Client hybride intelligent qui utilise plusieurs services gratuits.
    
    Stratégie:
    - Gemini pour extraction (1M tokens/jour, contexte long)
    - Mistral pour évaluation (français, 500K tokens/mois)
    - Ollama en backup (illimité, local)
    """
    
    def __init__(self, config: Config):
        self.config = config
        
        # Initialiser les clients disponibles
        self.mistral = None
        self.gemini = None
        self.ollama = None
        
        if config.MISTRAL_API_KEY:
            try:
                self.mistral = MistralClient(config.MISTRAL_API_KEY)
                log.success("Mistral client initialisé 🇫🇷")
            except Exception as e:
                log.warning(f"Mistral non disponible: {e}")
        
        if config.GOOGLE_API_KEY:
            try:
                self.gemini = GeminiClient(config.GOOGLE_API_KEY)
                log.success("Gemini client initialisé")
            except Exception as e:
                log.warning(f"Gemini non disponible: {e}")
        
        try:
            self.ollama = OllamaClient()
            if self.ollama.ollama:
                log.success("Ollama client initialisé (backup local)")
        except:
            pass
        
        # Compteurs pour rate limiting
        self.mistral_calls = 0
        self.gemini_calls = 0
        self.last_reset = datetime.now()
    
    def _reset_counters(self):
        """Reset les compteurs toutes les minutes."""
        if (datetime.now() - self.last_reset).seconds >= 60:
            self.mistral_calls = 0
            self.gemini_calls = 0
            self.last_reset = datetime.now()
    
    def extract_specs(self, content: str, product_name: str) -> Dict:
        """
        Extraction specs (préférence: Gemini > Mistral > Ollama).
        Gemini est préféré car il accepte des contextes très longs.
        """
        self._reset_counters()
        
        # Essayer Gemini d'abord (1M tokens/jour!)
        if self.gemini and self.gemini_calls < 55:
            try:
                self.gemini_calls += 1
                log.debug(f"Extraction avec Gemini ({self.gemini_calls}/60)")
                return self.gemini.extract_specs(content, product_name)
            except Exception as e:
                log.warning(f"Gemini failed: {e}")
        
        # Fallback Mistral
        if self.mistral and self.mistral_calls < 50:
            try:
                self.mistral_calls += 1
                log.debug(f"Extraction avec Mistral ({self.mistral_calls}/60)")
                return self.mistral.extract_specs(content, product_name)
            except Exception as e:
                log.warning(f"Mistral failed: {e}")
        
        # Fallback Ollama (illimité)
        if self.ollama and self.ollama.ollama:
            try:
                log.debug("Extraction avec Ollama (local)")
                return self.ollama.extract_specs(content, product_name)
            except Exception as e:
                log.warning(f"Ollama failed: {e}")
        
        log.error("Aucun service IA disponible pour extraction!")
        return {}
    
    def evaluate_norms(self, specs: Dict, norms: List[Dict]) -> Dict:
        """
        Évaluation normes (préférence: Mistral > Gemini > Ollama).
        Mistral est préféré car français et rapide.
        """
        self._reset_counters()
        
        # Essayer Mistral d'abord (français!)
        if self.mistral and self.mistral_calls < 50:
            try:
                self.mistral_calls += 1
                log.debug(f"Évaluation avec Mistral ({self.mistral_calls}/60)")
                return self.mistral.evaluate_norms(specs, norms)
            except Exception as e:
                log.warning(f"Mistral failed: {e}")
        
        # Fallback Gemini
        if self.gemini and self.gemini_calls < 55:
            try:
                self.gemini_calls += 1
                log.debug(f"Évaluation avec Gemini ({self.gemini_calls}/60)")
                return self.gemini.evaluate_norms(specs, norms)
            except Exception as e:
                log.warning(f"Gemini failed: {e}")
        
        # Fallback Ollama
        if self.ollama and self.ollama.ollama:
            try:
                log.debug("Évaluation avec Ollama (local)")
                return self.ollama.evaluate_norms(specs, norms)
            except Exception as e:
                log.warning(f"Ollama failed: {e}")
        
        # Attendre reset des quotas
        log.warning("Rate limit atteint, attente 60s...")
        time.sleep(60)
        self._reset_counters()
        return self.evaluate_norms(specs, norms)


# ============================================
# SCRAPER
# ============================================

class SmartScraper:
    """Scraper avec anti-détection."""
    
    def __init__(self):
        self.ua = UserAgent()
    
    def random_delay(self):
        """Délai aléatoire humain."""
        delay = random.uniform(Config.SCRAPE_DELAY_MIN, Config.SCRAPE_DELAY_MAX)
        time.sleep(delay)
    
    def scrape(self, url: str, use_playwright: bool = True) -> str:
        """
        Scrape une page web.
        
        Args:
            url: URL à scraper
            use_playwright: True pour JS, False pour statique
        """
        log.info(f"Scraping: {url[:60]}...")
        
        if use_playwright:
            return self._scrape_playwright(url)
        else:
            return self._scrape_requests(url)
    
    def _scrape_playwright(self, url: str) -> str:
        """Scrape avec Playwright (sites JS)."""
        
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                ]
            )
            
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent=self.ua.random,
                locale='en-US',
            )
            
            # Anti-détection
            context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3]});
            """)
            
            page = context.new_page()
            
            try:
                page.goto(url, wait_until='networkidle', timeout=30000)
                page.wait_for_timeout(2000)
                
                # Scroll pour charger lazy content
                page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
                page.wait_for_timeout(1000)
                
                content = page.inner_text('body')
                log.success(f"Scraped {len(content)} chars")
                return content
                
            except Exception as e:
                log.error(f"Playwright error: {e}")
                return ""
            finally:
                browser.close()
    
    def _scrape_requests(self, url: str) -> str:
        """Scrape simple pour pages statiques."""
        
        try:
            headers = {
                'User-Agent': self.ua.random,
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
            }
            
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            # Parser avec BeautifulSoup si disponible
            try:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(response.text, 'html.parser')
                for tag in soup(['script', 'style', 'nav', 'footer']):
                    tag.decompose()
                content = soup.get_text(separator=' ', strip=True)
            except ImportError:
                content = response.text
            
            log.success(f"Scraped {len(content)} chars")
            return content
            
        except Exception as e:
            log.error(f"Requests error: {e}")
            return ""


# ============================================
# CVE SCRAPER (NVD API - GRATUIT)
# ============================================

class CVEScraper:
    """Scraper CVE depuis NVD (gratuit)."""
    
    NVD_API = "https://services.nvd.nist.gov/rest/json/cves/2.0"
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('NVD_API_KEY', '')
    
    def get_recent_cves(self, keywords: List[str], days: int = 30) -> List[Dict]:
        """Recherche CVE récentes."""
        
        log.info(f"Recherche CVE pour: {', '.join(keywords[:3])}...")
        
        all_cves = []
        
        for keyword in keywords:
            time.sleep(1 if self.api_key else 6)  # Rate limit NVD
            
            params = {
                'keywordSearch': keyword,
                'pubStartDate': (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%dT00:00:00.000'),
                'pubEndDate': datetime.now().strftime('%Y-%m-%dT23:59:59.999'),
            }
            
            headers = {'apiKey': self.api_key} if self.api_key else {}
            
            try:
                response = requests.get(self.NVD_API, params=params, headers=headers, timeout=30)
                response.raise_for_status()
                data = response.json()
                
                for vuln in data.get('vulnerabilities', []):
                    cve = vuln.get('cve', {})
                    all_cves.append({
                        'cve_id': cve.get('id'),
                        'description': self._get_description(cve),
                        'severity': self._get_severity(cve),
                        'published': cve.get('published'),
                        'keyword': keyword,
                    })
                    
            except Exception as e:
                log.warning(f"CVE fetch error for '{keyword}': {e}")
        
        # Dédupliquer
        seen = set()
        unique = []
        for cve in all_cves:
            if cve['cve_id'] and cve['cve_id'] not in seen:
                seen.add(cve['cve_id'])
                unique.append(cve)
        
        log.success(f"Trouvé {len(unique)} CVE uniques")
        return unique
    
    def _get_description(self, cve: dict) -> str:
        for desc in cve.get('descriptions', []):
            if desc.get('lang') == 'en':
                return desc.get('value', '')[:500]
        return ''
    
    def _get_severity(self, cve: dict) -> str:
        metrics = cve.get('metrics', {})
        for v in ['cvssMetricV31', 'cvssMetricV30', 'cvssMetricV2']:
            if v in metrics:
                return metrics[v][0].get('cvssData', {}).get('baseSeverity', 'UNKNOWN')
        return 'UNKNOWN'


# ============================================
# CLIENT SUPABASE
# ============================================

class SupabaseClient:
    """Client Supabase."""
    
    def __init__(self, url: str, key: str):
        self.client = create_client(url, key)
    
    def get_products(self, limit: int = None) -> List[Dict]:
        """Récupère les produits."""
        query = self.client.table('products').select(
            'id, slug, name, type_id, specs, scores'
        ).eq('is_active', True)
        
        if limit:
            query = query.limit(limit)
        
        result = query.execute()
        return result.data
    
    def get_product_by_slug(self, slug: str) -> Optional[Dict]:
        """Récupère un produit par slug."""
        result = self.client.table('products').select('*').eq('slug', slug).single().execute()
        return result.data
    
    def get_norms_for_type(self, type_id: int) -> List[Dict]:
        """Récupère les normes applicables à un type."""
        result = self.client.table('norm_applicability').select(
            'norms(id, code, pillar, description, is_essential, is_consumer)'
        ).eq('product_type_id', type_id).eq('is_applicable', True).execute()
        
        return [r['norms'] for r in result.data if r.get('norms')]
    
    def get_all_norms(self) -> List[Dict]:
        """Récupère toutes les normes."""
        result = self.client.table('norms').select('id, code, pillar, description').execute()
        return result.data
    
    def update_product_specs(self, product_id: int, specs: Dict):
        """Met à jour les specs."""
        self.client.table('products').update({
            'specs': specs,
            'updated_at': datetime.now().isoformat()
        }).eq('id', product_id).execute()
    
    def upsert_evaluations(self, product_id: int, evaluations: Dict[str, str]) -> int:
        """Insert/update les évaluations."""
        
        # Map code -> id
        norms = self.client.table('norms').select('id, code').execute()
        norm_map = {n['code']: n['id'] for n in norms.data}
        
        records = []
        for code, result in evaluations.items():
            if code in norm_map and result in ('YES', 'NO', 'N/A'):
                records.append({
                    'product_id': product_id,
                    'norm_id': norm_map[code],
                    'result': result,
                    'evaluated_at': datetime.now().isoformat(),
                    'evaluated_by': 'automation-ai'
                })
        
        if records:
            self.client.table('evaluations').upsert(
                records,
                on_conflict='product_id,norm_id'
            ).execute()
        
        return len(records)
    
    def create_alert(self, cve: Dict, product_ids: List[int] = None):
        """Crée une alerte."""
        self.client.table('security_alerts').insert({
            'alert_type': 'CVE',
            'severity': cve['severity'].lower() if cve['severity'] != 'UNKNOWN' else 'medium',
            'title': cve['cve_id'],
            'description': cve['description'],
            'cve_id': cve['cve_id'],
            'affected_product_ids': product_ids or [],
            'is_published': False,
            'created_at': datetime.now().isoformat()
        }).execute()
    
    def log_automation(self, stats: Dict):
        """Log le run."""
        try:
            self.client.table('automation_logs').insert({
                'run_date': datetime.now().isoformat(),
                'products_updated': stats.get('products_updated', 0),
                'evaluations_count': stats.get('evaluations_count', 0),
                'cves_found': stats.get('cves_found', 0),
                'ai_service': stats.get('ai_service', 'hybrid'),
                'duration_sec': stats.get('duration', 0),
                'errors': stats.get('errors', [])
            }).execute()
        except:
            pass  # Table peut ne pas exister


# ============================================
# NOTIFICATIONS
# ============================================

def send_telegram(message: str, config: Config):
    """Envoie notification Telegram."""
    if not config.TELEGRAM_BOT_TOKEN or not config.TELEGRAM_CHAT_ID:
        return
    
    try:
        requests.post(
            f"https://api.telegram.org/bot{config.TELEGRAM_BOT_TOKEN}/sendMessage",
            json={
                'chat_id': config.TELEGRAM_CHAT_ID,
                'text': message,
                'parse_mode': 'Markdown'
            },
            timeout=10
        )
    except:
        pass


# ============================================
# MAIN
# ============================================

def run_automation(mode: str = 'test'):
    """
    Exécute l'automatisation.
    
    Args:
        mode: 'test' (3 produits), 'full' (tous), 'cve' (CVE seulement)
    """
    
    print("\n" + "=" * 60)
    print(f"🚀 SAFESCORING.IO - Automatisation GRATUITE ({mode.upper()})")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Validation
    config = Config()
    if not Config.validate():
        return None
    
    start_time = time.time()
    stats = {
        'products_updated': 0,
        'evaluations_count': 0,
        'cves_found': 0,
        'ai_service': 'hybrid',
        'errors': []
    }
    
    # Initialiser les composants
    ai_client = HybridAIClient(config)
    scraper = SmartScraper()
    db = SupabaseClient(config.SUPABASE_URL, config.SUPABASE_KEY)
    
    # ============================================
    # ÉTAPE 1: CVE
    # ============================================
    if mode in ['full', 'cve']:
        log.info("📡 Recherche des CVE récentes...")
        
        cve_scraper = CVEScraper()
        keywords = ['ledger wallet', 'trezor wallet', 'coldcard', 'hardware wallet',
                    'bitcoin wallet vulnerability', 'cryptocurrency wallet exploit']
        
        cves = cve_scraper.get_recent_cves(keywords, days=30)
        stats['cves_found'] = len(cves)
        
        for cve in cves:
            if cve['severity'] in ['HIGH', 'CRITICAL']:
                try:
                    db.create_alert(cve)
                    log.warning(f"🚨 Alerte créée: {cve['cve_id']} ({cve['severity']})")
                except Exception as e:
                    log.error(f"Erreur création alerte: {e}")
    
    if mode == 'cve':
        duration = time.time() - start_time
        stats['duration'] = round(duration, 1)
        log.success(f"Terminé en {duration:.1f}s - {stats['cves_found']} CVE trouvées")
        return stats
    
    # ============================================
    # ÉTAPE 2: SCRAPING & ÉVALUATION
    # ============================================
    log.info("📦 Chargement des produits...")
    
    # Charger depuis Supabase ou utiliser les sources locales
    try:
        products = db.get_products()
        log.success(f"{len(products)} produits depuis Supabase")
    except Exception as e:
        log.warning(f"Supabase error: {e}, utilisation sources locales")
        products = [{'slug': slug, 'name': data['name'], 'id': i+1} 
                    for i, (slug, data) in enumerate(PRODUCT_SOURCES.items())]
    
    # Limiter en mode test
    if mode == 'test':
        products = products[:3]
    
    log.info(f"Traitement de {len(products)} produits...")
    
    for i, product in enumerate(products):
        slug = product.get('slug', '')
        product_id = product.get('id')
        name = product.get('name', slug)
        
        print(f"\n{'─' * 50}")
        log.info(f"[{i+1}/{len(products)}] 📦 {name}")
        
        try:
            # Vérifier si on a une source
            source = PRODUCT_SOURCES.get(slug)
            
            if source:
                # Scraper les pages
                all_content = ""
                for url in source.get('urls', []):
                    scraper.random_delay()
                    content = scraper.scrape(url)
                    all_content += f"\n\n{content}"
                
                if all_content.strip():
                    # Extraire specs avec IA
                    log.info("🔍 Extraction des specs...")
                    specs = ai_client.extract_specs(all_content, name)
                    
                    if specs:
                        # Sauvegarder specs
                        db.update_product_specs(product_id, specs)
                        log.success(f"Specs extraites: {len(specs)} champs")
                    else:
                        specs = product.get('specs', {}) or {}
                        log.warning("Extraction specs échouée, utilisation existantes")
                else:
                    specs = product.get('specs', {}) or {}
                    log.warning("Scraping échoué, utilisation specs existantes")
            else:
                specs = product.get('specs', {}) or {}
                log.info("Pas de source configurée, utilisation specs existantes")
            
            # Récupérer les normes applicables
            type_id = product.get('type_id', 1)
            try:
                norms = db.get_norms_for_type(type_id)
            except:
                norms = db.get_all_norms()[:100]  # Fallback
            
            if norms and specs:
                log.info(f"🧮 Évaluation contre {len(norms)} normes...")
                
                # Évaluer par batch
                all_evaluations = {}
                batch_size = Config.BATCH_SIZE_NORMS
                
                for batch_start in range(0, len(norms), batch_size):
                    batch = norms[batch_start:batch_start + batch_size]
                    
                    try:
                        evals = ai_client.evaluate_norms(specs, batch)
                        all_evaluations.update(evals)
                        log.debug(f"Batch {batch_start//batch_size + 1}: {len(evals)} évaluées")
                    except Exception as e:
                        log.error(f"Erreur batch: {e}")
                
                # Sauvegarder les évaluations
                if all_evaluations:
                    count = db.upsert_evaluations(product_id, all_evaluations)
                    stats['evaluations_count'] += count
                    log.success(f"✅ {count} évaluations sauvegardées")
            
            stats['products_updated'] += 1
            
        except Exception as e:
            error = f"{slug}: {str(e)}"
            stats['errors'].append(error)
            log.error(f"Erreur: {e}")
    
    # ============================================
    # RAPPORT FINAL
    # ============================================
    duration = time.time() - start_time
    stats['duration'] = round(duration, 1)
    
    print("\n" + "=" * 60)
    print("📊 RAPPORT FINAL")
    print("=" * 60)
    print(f"  ✅ Produits traités: {stats['products_updated']}")
    print(f"  ✅ Évaluations MAJ: {stats['evaluations_count']}")
    print(f"  🚨 CVE trouvées: {stats['cves_found']}")
    print(f"  ❌ Erreurs: {len(stats['errors'])}")
    print(f"  ⏱️  Durée: {duration:.1f} secondes")
    print(f"  💰 Coût: 0€ (100% gratuit!)")
    
    # Log dans Supabase
    try:
        db.log_automation(stats)
    except:
        pass
    
    # Notification Telegram
    msg = f"""🤖 *SAFESCORING Automation Complete*

📊 *Mode:* {mode}
• Produits: {stats['products_updated']}
• Évaluations: {stats['evaluations_count']}
• CVE: {stats['cves_found']}
• Erreurs: {len(stats['errors'])}
• Durée: {duration:.1f}s
• Coût: 0€ ✅"""
    
    send_telegram(msg, config)
    
    return stats


# ============================================
# ENTRY POINT
# ============================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description='SAFESCORING - Automatisation 100% Gratuite',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
  python safescoring_automation_free.py --mode test    # Tester sur 3 produits
  python safescoring_automation_free.py --mode full    # Tous les produits
  python safescoring_automation_free.py --mode cve     # CVE seulement

Services gratuits utilisés:
  - Groq API: Llama 3.3 70B (30 req/min)
  - Google Gemini: 1M tokens/jour
  - Ollama: Local, illimité (backup)
  - NVD API: CVE gratuites
        """
    )
    
    parser.add_argument(
        '--mode',
        choices=['test', 'full', 'cve'],
        default='test',
        help='Mode: test (3 produits), full (tous), cve (CVE seulement)'
    )
    
    args = parser.parse_args()
    
    try:
        stats = run_automation(args.mode)
        if stats:
            sys.exit(0)
        else:
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n⚠️ Interrompu par l'utilisateur")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ Erreur fatale: {e}")
        sys.exit(1)
