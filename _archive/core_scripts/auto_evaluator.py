#!/usr/bin/env python3
"""
SAFESCORING.IO - Auto Evaluator
Évalue automatiquement un produit sur toutes les normes via IA (Mistral/Gemini)
"""

import os
import json
import requests
import time
from datetime import datetime

# Configuration
def load_config():
    config = {}
    config_path = os.path.join(os.path.dirname(__file__), 'env_template_free.txt')
    with open(config_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                config[key.strip()] = value.strip()
    return config

CONFIG = load_config()
SUPABASE_URL = CONFIG.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = CONFIG.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
MISTRAL_API_KEY = CONFIG.get('MISTRAL_API_KEY', '')
GEMINI_API_KEY = CONFIG.get('GOOGLE_GEMINI_API_KEY', '')


class AutoEvaluator:
    """Évaluateur automatique de produits crypto"""
    
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        self.norms_cache = {}
        self.applicability_cache = {}
        
    def load_norms(self):
        """Charge toutes les normes depuis Supabase"""
        print("📋 Chargement des normes...")
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code,title,description,pillar,is_essential",
            headers=self.headers
        )
        if r.status_code == 200:
            for norm in r.json():
                self.norms_cache[norm['id']] = norm
            print(f"   ✅ {len(self.norms_cache)} normes chargées")
        return self.norms_cache
    
    def load_applicability(self, type_id):
        """Charge les normes applicables pour un type de produit"""
        if type_id in self.applicability_cache:
            return self.applicability_cache[type_id]
        
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{type_id}&is_applicable=eq.true&select=norm_id",
            headers=self.headers
        )
        
        applicable_norms = []
        if r.status_code == 200:
            applicable_norms = [row['norm_id'] for row in r.json()]
        
        self.applicability_cache[type_id] = applicable_norms
        return applicable_norms
    
    def get_product(self, product_id):
        """Récupère les infos d'un produit"""
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}&select=*",
            headers=self.headers
        )
        if r.status_code == 200 and r.json():
            return r.json()[0]
        return None
    
    def scrape_product_info(self, product):
        """Récupère les infos du produit depuis son site officiel"""
        url = product.get('url')
        if not url:
            return None
        
        # Import dynamique pour éviter erreur si pas installé
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            print("   ⚠️ Playwright non installé, skip scraping")
            return None
        
        print(f"   🌐 Scraping {url}...")
        
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.goto(url, timeout=30000)
                page.wait_for_load_state('networkidle', timeout=10000)
                
                # Extraire le contenu textuel
                content = page.evaluate('''() => {
                    // Supprimer scripts, styles, nav, footer
                    const remove = document.querySelectorAll('script, style, nav, footer, header, aside');
                    remove.forEach(el => el.remove());
                    return document.body.innerText.substring(0, 15000);
                }''')
                
                browser.close()
                return content
        except Exception as e:
            print(f"   ❌ Erreur scraping: {e}")
            return None
    
    def evaluate_norm_with_ai(self, product, norm, product_info=None):
        """Évalue si un produit répond à une norme via IA"""
        
        prompt = f"""Tu es un expert en sécurité crypto. Évalue si ce produit répond à cette norme.

PRODUIT: {product['name']}
TYPE: {product.get('description', 'N/A')}
URL: {product.get('url', 'N/A')}

NORME: {norm['code']} - {norm['title']}
DESCRIPTION: {norm.get('description', 'N/A')}
PILIER: {norm.get('pillar', 'N/A')}

{f"INFORMATIONS PRODUIT: {product_info[:3000]}" if product_info else ""}

QUESTION: Ce produit répond-il à cette norme de sécurité ?

Réponds UNIQUEMENT par un JSON:
{{"result": "YES" ou "NO", "confidence": 0.0-1.0, "reason": "explication courte"}}
"""
        
        # Essayer Mistral d'abord
        result = self._call_mistral(prompt)
        if not result:
            # Fallback Gemini
            result = self._call_gemini(prompt)
        
        return result
    
    def _call_mistral(self, prompt):
        """Appel API Mistral"""
        if not MISTRAL_API_KEY:
            return None
        
        try:
            r = requests.post(
                'https://api.mistral.ai/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {MISTRAL_API_KEY}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'mistral-small-latest',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'temperature': 0.1,
                    'max_tokens': 200
                },
                timeout=30
            )
            
            if r.status_code == 200:
                content = r.json()['choices'][0]['message']['content']
                return self._parse_ai_response(content)
        except Exception as e:
            print(f"   ⚠️ Mistral error: {e}")
        
        return None
    
    def _call_gemini(self, prompt):
        """Appel API Gemini"""
        if not GEMINI_API_KEY:
            return None
        
        try:
            r = requests.post(
                f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}',
                headers={'Content-Type': 'application/json'},
                json={
                    'contents': [{'parts': [{'text': prompt}]}],
                    'generationConfig': {'temperature': 0.1, 'maxOutputTokens': 200}
                },
                timeout=30
            )
            
            if r.status_code == 200:
                content = r.json()['candidates'][0]['content']['parts'][0]['text']
                return self._parse_ai_response(content)
        except Exception as e:
            print(f"   ⚠️ Gemini error: {e}")
        
        return None
    
    def _parse_ai_response(self, content):
        """Parse la réponse JSON de l'IA"""
        try:
            # Nettoyer le contenu
            content = content.strip()
            if content.startswith('```'):
                content = content.split('```')[1]
                if content.startswith('json'):
                    content = content[4:]
            
            data = json.loads(content)
            return {
                'result': data.get('result', 'NO').upper(),
                'confidence': float(data.get('confidence', 0.5)),
                'reason': data.get('reason', '')
            }
        except:
            # Fallback: chercher YES ou NO dans le texte
            content_upper = content.upper()
            if 'YES' in content_upper:
                return {'result': 'YES', 'confidence': 0.5, 'reason': 'Parsed from text'}
            return {'result': 'NO', 'confidence': 0.5, 'reason': 'Parsed from text'}
    
    def evaluate_product(self, product_id, use_scraping=True):
        """Évalue un produit complet sur toutes les normes applicables"""
        
        print(f"\n🔍 ÉVALUATION PRODUIT ID={product_id}")
        print("=" * 60)
        
        # Charger le produit
        product = self.get_product(product_id)
        if not product:
            print("   ❌ Produit non trouvé")
            return None
        
        print(f"   📦 {product['name']}")
        print(f"   🏷️  Type ID: {product.get('type_id')}")
        
        # Charger les normes si pas fait
        if not self.norms_cache:
            self.load_norms()
        
        # Récupérer les normes applicables
        type_id = product.get('type_id')
        if not type_id:
            print("   ❌ Pas de type_id, impossible de déterminer les normes applicables")
            return None
        
        applicable_norm_ids = self.load_applicability(type_id)
        print(f"   📋 {len(applicable_norm_ids)} normes applicables")
        
        # Scraper les infos produit (optionnel)
        product_info = None
        if use_scraping:
            product_info = self.scrape_product_info(product)
        
        # Évaluer chaque norme
        results = []
        evaluated = 0
        
        for norm_id in applicable_norm_ids:
            norm = self.norms_cache.get(norm_id)
            if not norm:
                continue
            
            # Rate limiting
            time.sleep(0.5)
            
            # Évaluation IA
            ai_result = self.evaluate_norm_with_ai(product, norm, product_info)
            
            if ai_result:
                results.append({
                    'product_id': product_id,
                    'norm_id': norm_id,
                    'result': ai_result['result'],
                    'confidence_score': ai_result['confidence'],
                    'evaluated_by': 'ai_auto',
                    'evaluation_date': datetime.now().strftime('%Y-%m-%d')
                })
                evaluated += 1
                
                icon = '✅' if ai_result['result'] == 'YES' else '❌'
                print(f"   {icon} {norm['code']}: {ai_result['result']} ({ai_result['confidence']:.0%})")
            
            # Limiter pour les tests
            if evaluated >= 10:
                print(f"   ⏸️  Limité à 10 évaluations pour ce test")
                break
        
        # Sauvegarder les résultats
        if results:
            self._save_evaluations(results)
        
        return results
    
    def _save_evaluations(self, evaluations):
        """Sauvegarde les évaluations dans Supabase"""
        print(f"\n💾 Sauvegarde de {len(evaluations)} évaluations...")
        
        # Upsert (mise à jour si existe)
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/evaluations",
            headers={**self.headers, 'Prefer': 'resolution=merge-duplicates'},
            json=evaluations,
            timeout=60
        )
        
        if r.status_code in [200, 201]:
            print(f"   ✅ Sauvegardé")
        else:
            print(f"   ❌ Erreur: {r.status_code} - {r.text[:100]}")


def main():
    """Test de l'évaluateur"""
    evaluator = AutoEvaluator()
    
    # Tester sur un produit (ex: Ledger Nano X)
    # Récupérer un produit avec type_id
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?type_id=not.is.null&limit=1&select=id,name",
        headers=evaluator.headers
    )
    
    if r.status_code == 200 and r.json():
        product = r.json()[0]
        print(f"🧪 Test sur: {product['name']}")
        evaluator.evaluate_product(product['id'], use_scraping=False)
    else:
        print("❌ Aucun produit trouvé pour le test")


if __name__ == "__main__":
    main()
