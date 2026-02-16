#!/usr/bin/env python3
"""
SAFESCORING.IO - FREE monthly automation script
Uses Mistral + Gemini + Supabase according to the automation guide

Usage:
    python monthly_automation.py [--dry-run] [--force]

Options:
    --dry-run : Simulation without modifying the database
    --force   : Force the update even if already done this month
"""

import os
import sys
import json
import time
import hashlib
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple

# APIs IA gratuites
try:
    from mistralai import Mistral
except ImportError:
    print("❌ Installer mistralai: pip install mistralai")
    sys.exit(1)

try:
    import google.generativeai as genai
except ImportError:
    print("❌ Installer google-generativeai: pip install google-generativeai")
    sys.exit(1)

# Scraping
try:
    import requests
    from fake_useragent import UserAgent
except ImportError:
    print("❌ Installer requests et fake-useragent: pip install requests fake-useragent")
    sys.exit(1)

# ============================================
# CONFIGURATION
# ============================================

# Add parent directory to path to access core/
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.config import load_config, CONFIG, SUPABASE_URL, SUPABASE_KEY

MISTRAL_API_KEY = CONFIG.get('MISTRAL_API_KEY', '')
GOOGLE_API_KEY = CONFIG.get('GOOGLE_API_KEY', '')

# Validation
if not all([SUPABASE_URL, SUPABASE_KEY]):
    print("❌ Missing Supabase configuration")
    sys.exit(1)

if not any([MISTRAL_API_KEY, GOOGLE_API_KEY]):
    print("❌ At least one AI key required (Mistral or Gemini)")
    sys.exit(1)

# AI clients
mistral_client = None
if MISTRAL_API_KEY:
    mistral_client = Mistral(api_key=MISTRAL_API_KEY)

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# User agent for scraping
ua = UserAgent()

# ============================================
# CLIENT SUPABASE
# ============================================

class SupabaseClient:
    """Simplified client for Supabase REST API"""
    
    def __init__(self, url: str, key: str):
        self.url = url.rstrip('/')
        self.key = key
        self.headers = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
    
    def test_connection(self) -> bool:
        """Tests the connection to Supabase"""
        try:
            response = requests.get(f"{self.url}/rest/v1/", headers=self.headers, timeout=10)
            return response.status_code == 200
        except (requests.exceptions.RequestException, Exception):
            return False
    
    def get(self, table: str, select: str = "*", filters: Dict = None) -> List[Dict]:
        """Retrieves data"""
        params = {'select': select}
        if filters:
            for key, value in filters.items():
                params[key] = value
        
        try:
            response = requests.get(f"{self.url}/rest/v1/{table}", headers=self.headers, params=params, timeout=30)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Error GET {table}: {response.status_code}")
                return []
        except Exception as e:
            print(f"❌ Exception GET {table}: {e}")
            return []
    
    def post(self, table: str, data: Dict) -> bool:
        """Inserts data"""
        try:
            response = requests.post(f"{self.url}/rest/v1/{table}", headers=self.headers, json=data, timeout=30)
            return response.status_code in [201, 204]
        except Exception as e:
            print(f"❌ Exception POST {table}: {e}")
            return False
    
    def patch(self, table: str, data: Dict, filters: Dict) -> bool:
        """Updates data"""
        params = filters
        try:
            response = requests.patch(f"{self.url}/rest/v1/{table}", headers=self.headers, json=data, params=params, timeout=30)
            return response.status_code in [200, 204]
        except Exception as e:
            print(f"❌ Exception PATCH {table}: {e}")
            return False
    
    def upsert(self, table: str, data: List[Dict]) -> bool:
        """Upsert (insert or update)"""
        try:
            response = requests.post(f"{self.url}/rest/v1/{table}", headers={**self.headers, 'Prefer': 'resolution=merge-duplicates'}, json=data, timeout=30)
            return response.status_code in [201, 204]
        except Exception as e:
            print(f"❌ Exception UPSERT {table}: {e}")
            return False

# ============================================
# CLIENTS IA
# ============================================

class AIAnalyzer:
    """Hybrid AI client (Mistral + Gemini)"""
    
    def __init__(self, mistral_client=None, gemini_model=None):
        self.mistral = mistral_client
        self.gemini = gemini_model
        self.mistral_calls = 0
        self.gemini_calls = 0
        self.last_reset = datetime.now()
    
    def _reset_counters(self):
        """Resets the rate limit counters"""
        if (datetime.now() - self.last_reset).seconds >= 60:
            self.mistral_calls = 0
            self.gemini_calls = 0
            self.last_reset = datetime.now()
    
    def extract_specs(self, content: str, product_name: str) -> Dict:
        """Extracts specifications using AI"""
        self._reset_counters()
        
        # Priority: Mistral (more precise)
        if self.mistral and self.mistral_calls < 50:  # Safety limits
            return self._extract_with_mistral(content, product_name)
        elif self.gemini and self.gemini_calls < 50:
            return self._extract_with_gemini(content, product_name)
        else:
            return self._fallback_specs(product_name)
    
    def _extract_with_mistral(self, content: str, product_name: str) -> Dict:
        """Extraction with Mistral"""
        try:
            prompt = f"""Expert en extraction de données hardware wallet. Produit: {product_name}

Contenu HTML à analyser:
{content[:20000]}

Extrais les spécifications au format JSON strict:
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
  "coins_supported": [],
  "certifications": [],
  "country": null,
  "release_year": null
}}

Réponds UNIQUEMENT avec le JSON, sans autre texte."""
            
            response = self.mistral.chat.complete(
                model="mistral-small-latest",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=2000
            )
            
            self.mistral_calls += 1
            time.sleep(1.5)  # Rate limit Mistral
            
            result = json.loads(response.choices[0].message.content)
            print(f"   ✅ Mistral: {len([k for k, v in result.items() if v is not None and v != '' and v != []])} specs found")
            return result
            
        except Exception as e:
            print(f"   ⚠️  Mistral error: {e}")
            return self._fallback_specs(product_name)
    
    def _extract_with_gemini(self, content: str, product_name: str) -> Dict:
        """Extraction with Gemini (backup)"""
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            prompt = f"""Expert extraction hardware wallet. Product: {product_name}

HTML content:
{content[:25000]}

Extract specifications in strict JSON format:
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
  "coins_supported": [],
  "certifications": [],
  "country": null,
  "release_year": null
}}

Return ONLY the JSON, no other text."""
            
            response = model.generate_content(prompt)
            json_str = response.text.strip()
            
            if '```' in json_str:
                json_str = json_str.split('```')[1].replace('json', '').strip()
            
            self.gemini_calls += 1
            time.sleep(1.2)  # Rate limit Gemini
            
            result = json.loads(json_str)
            print(f"   ✅ Gemini: {len([k for k, v in result.items() if v is not None and v != '' and v != []])} specs found")
            return result
            
        except Exception as e:
            print(f"   ⚠️  Gemini error: {e}")
            return self._fallback_specs(product_name)
    
    def _fallback_specs(self, product_name: str) -> Dict:
        """Fallback specifications"""
        name_lower = product_name.lower()
        
        fallback = {
            "price_eur": None,
            "price_usd": None,
            "chip": None,
            "chip_certification": None,
            "screen_type": None,
            "bluetooth": 'nano' not in name_lower,
            "nfc": False,
            "usb_c": 'x' in name_lower,
            "secure_element": True,
            "open_source_firmware": 'trezor' in name_lower,
            "passphrase_support": True,
            "shamir_backup": 'trezor' in name_lower,
            "multisig_native": False,
            "coins_supported": ["Bitcoin", "Ethereum"],
            "certifications": [],
            "country": None,
            "release_year": None
        }
        
        print(f"   ⚠️  Fallback: default specs")
        return fallback
    
    def evaluate_security(self, specs: Dict, product_name: str) -> Dict:
        """Evaluates security using AI"""
        try:
            if self.mistral and self.mistral_calls < 50:
                return self._evaluate_with_mistral(specs, product_name)
            elif self.gemini:
                return self._evaluate_with_gemini(specs, product_name)
            else:
                return self._fallback_security(product_name)
        except Exception:
            return self._fallback_security(product_name)
    
    def _evaluate_with_mistral(self, specs: Dict, product_name: str) -> Dict:
        """Evaluation with Mistral"""
        prompt = f"""Expert en sécurité des hardware wallets. Évalue : {product_name}

Spécifications:
{json.dumps(specs, indent=2, ensure_ascii=False)}

Évalue la sécurité et retourne un JSON:
{{
  "risk_score": 0-100,
  "vulnerabilities": ["liste des vulnérabilités"],
  "recommendations": ["liste des recommandations"],
  "status": "secure|warning|critical"
}}

Réponds UNIQUEMENT avec le JSON."""
        
        response = self.mistral.chat.complete(
            model="mistral-small-latest",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=1000
        )
        
        self.mistral_calls += 1
        time.sleep(1.5)
        
        return json.loads(response.choices[0].message.content)
    
    def _evaluate_with_gemini(self, specs: Dict, product_name: str) -> Dict:
        """Evaluation with Gemini"""
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""Security expert evaluating hardware wallet: {product_name}

Specifications:
{json.dumps(specs, indent=2)}

Return security evaluation in JSON format:
{{
  "risk_score": 0-100,
  "vulnerabilities": ["list of vulnerabilities"],
  "recommendations": ["list of recommendations"],
  "status": "secure|warning|critical"
}}

Return ONLY the JSON."""
        
        response = model.generate_content(prompt)
        json_str = response.text.strip()
        
        if '```' in json_str:
            json_str = json_str.split('```')[1].replace('json', '').strip()
        
        self.gemini_calls += 1
        time.sleep(1.2)
        
        return json.loads(json_str)
    
    def _fallback_security(self, product_name: str) -> Dict:
        """Fallback evaluation"""
        name_lower = product_name.lower()
        
        if 'trezor' in name_lower:
            return {
                'risk_score': 25,
                'vulnerabilities': [],
                'recommendations': ['Keep firmware up to date', 'Use passphrase'],
                'status': 'secure'
            }
        elif 'ledger' in name_lower:
            return {
                'risk_score': 30,
                'vulnerabilities': [],
                'recommendations': ['Verify authenticity', 'Enable 2FA'],
                'status': 'secure'
            }
        else:
            return {
                'risk_score': 60,
                'vulnerabilities': ['Unknown security model'],
                'recommendations': ['Look for security audits', 'Verify open source'],
                'status': 'warning'
            }

# ============================================
# SCRAPER
# ============================================

def scrape_product_page(url: str) -> Tuple[str, bool]:
    """Scrapes a product page"""
    try:
        headers = {'User-Agent': ua.random}
        response = requests.get(url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            content = response.text
            # Hash to detect changes
            content_hash = hashlib.sha256(content.encode()).hexdigest()
            return content, content_hash
        else:
            print(f"   ❌ HTTP {response.status_code}")
            return "", False
            
    except Exception as e:
        print(f"   ❌ Scraping error: {e}")
        return "", False

# ============================================
# AUTOMATION PRINCIPALE
# ============================================

class MonthlyAutomation:
    """Main monthly automation class"""
    
    def __init__(self, dry_run: bool = False, force: bool = False):
        self.dry_run = dry_run
        self.force = force
        
        # Initialize clients
        self.db = SupabaseClient(SUPABASE_URL, SUPABASE_KEY)
        self.ai = AIAnalyzer(mistral_client, genai.GenerativeModel('gemini-1.5-flash') if GOOGLE_API_KEY else None)
        
        # Statistics
        self.stats = {
            'start_time': datetime.now(),
            'products_total': 0,
            'products_updated': 0,
            'products_skipped': 0,
            'scrapes_success': 0,
            'scrapes_failed': 0,
            'ai_calls': 0,
            'errors': []
        }
    
    def run(self) -> bool:
        """Executes the full automation"""
        print("🗓️  SAFESCORING - FREE MONTHLY AUTOMATION")
        print("=" * 60)
        print(f"⚙️  Mode: {'DRY RUN' if self.dry_run else 'PRODUCTION'}")
        print(f"🔧 Force update: {'YES' if self.force else 'NO'}")
        print()
        
        # Test connection
        if not self.db.test_connection():
            print("❌ Supabase connection error")
            return False
        
        print("✅ Supabase connection OK")
        
        # Check if already executed this month
        if not self.force and not self._should_run():
            print("⏭️  Already executed this month. Use --force to force.")
            return True
        
        # Retrieve the products
        products = self.db.get('products', select="id,name,slug,url,last_monthly_update,specs")
        if not products:
            print("❌ No products found or retrieval error")
            return False
        
        self.stats['products_total'] = len(products)
        print(f"📊 {len(products)} products to process")
        print()
        
        # Process each product
        for i, product in enumerate(products, 1):
            self._process_product(product, i)
            
            # Pause every 10 requests
            if i % 10 == 0:
                print(f"\\n⏸️  Pause 30s (rate limit)...")
                time.sleep(30)
        
        # Finalize
        self._finalize()
        return True
    
    def _should_run(self) -> bool:
        """Checks if the automation should run"""
        # Check the last log
        logs = self.db.get('automation_logs', filters={
            'run_type': 'eq.monthly',
            'run_date': 'gte.' + (datetime.now() - timedelta(days=25)).isoformat()
        })
        
        return len(logs) == 0
    
    def _process_product(self, product: Dict, index: int):
        """Processes an individual product"""
        print(f"📦 [{index}/{self.stats['products_total']}] {product['name']}")
        
        # Check if already up to date
        if not self.force and product.get('last_monthly_update'):
            last_update = datetime.fromisoformat(product['last_monthly_update'].replace('Z', '+00:00'))
            if (datetime.now() - last_update).days < 25:
                print(f"   ⏭️  Already up to date ({last_update.strftime('%d/%m/%Y')})")
                self.stats['products_skipped'] += 1
                return
        
        try:
            # 1. Scrape the page
            if product.get('url'):
                print(f"   🌐 Scraping: {product['url']}")
                content, content_hash = scrape_product_page(product['url'])
                
                if content:
                    self.stats['scrapes_success'] += 1
                else:
                    self.stats['scrapes_failed'] += 1
                    print(f"   ⚠️  Scraping error, using existing data")
            else:
                content = ""
                content_hash = ""
                print(f"   ⚠️  No URL, skipping scrape")
            
            # 2. Extract specifications
            print(f"   🔍 Extracting specs...")
            specs = self.ai.extract_specs(content, product['name'])
            self.stats['ai_calls'] += 1
            
            # 3. Evaluate security
            print(f"   🛡️  Security evaluation...")
            security = self.ai.evaluate_security(specs, product['name'])
            self.stats['ai_calls'] += 1
            
            # 4. Prepare update data
            update_data = {
                'specs': specs,
                'risk_score': security['risk_score'],
                'security_status': security['status'],
                'last_security_scan': datetime.now().isoformat(),
                'last_monthly_update': datetime.now().isoformat()
            }
            
            # 5. Update in database
            if not self.dry_run:
                success = self.db.patch('products', update_data, {'id': f'eq.{product["id"]}'})
                if success:
                    print(f"   ✅ Updated: {security['risk_score']}/100 ({security['status']})")
                    self.stats['products_updated'] += 1
                else:
                    error = f"Error updating product {product['id']}"
                    print(f"   ❌ {error}")
                    self.stats['errors'].append(error)
            else:
                print(f"   🔍 DRY RUN: would be updated ({security['risk_score']}/100)")
            
        except Exception as e:
            error = f"Error product {product['name']}: {str(e)}"
            print(f"   ❌ {error}")
            self.stats['errors'].append(error)
        
        print()  # Empty line between products
    
    def _finalize(self):
        """Finalizes execution and saves logs"""
        end_time = datetime.now()
        duration = int((end_time - self.stats['start_time']).total_seconds())
        
        # Display summary
        print("🎉 AUTOMATION COMPLETED")
        print("=" * 40)
        print(f"⏱️  Total duration: {duration} seconds")
        print(f"📦 Total products: {self.stats['products_total']}")
        print(f"✅ Products updated: {self.stats['products_updated']}")
        print(f"⏭️  Products skipped: {self.stats['products_skipped']}")
        print(f"🌐 Successful scrapes: {self.stats['scrapes_success']}")
        print(f"❌ Failed scrapes: {self.stats['scrapes_failed']}")
        print(f"🤖 AI calls: {self.stats['ai_calls']}")
        print(f"🚨 Errors: {len(self.stats['errors'])}")
        
        if self.stats['errors']:
            print("\\n🚨 Error details:")
            for error in self.stats['errors'][:5]:
                print(f"   - {error}")
            if len(self.stats['errors']) > 5:
                print(f"   ... et {len(self.stats['errors']) - 5} more")
        
        # Save to database
        if not self.dry_run:
            log_data = {
                'run_date': self.stats['start_time'].isoformat(),
                'run_type': 'monthly',
                'products_updated': self.stats['products_updated'],
                'evaluations_count': self.stats['ai_calls'],
                'ai_service': 'mistral',
                'duration_sec': duration,
                'errors': self.stats['errors']
            }
            
            if self.db.post('automation_logs', log_data):
                print("\\n📋 Automation log saved in Supabase")
            else:
                print("\\n⚠️  Error saving log")
        
        print("\\n✨ Next execution: in 1 month (or --force)")

# ============================================
# ENTRY POINT
# ============================================

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='SafeScoring monthly automation')
    parser.add_argument('--dry-run', action='store_true', help='Simulation without modifying the database')
    parser.add_argument('--force', action='store_true', help='Force the update even if already done')
    
    args = parser.parse_args()
    
    # Launch the automation
    automation = MonthlyAutomation(dry_run=args.dry_run, force=args.force)
    success = automation.run()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
