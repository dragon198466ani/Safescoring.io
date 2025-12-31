#!/usr/bin/env python3
"""
SAFESCORING.IO - Classification IA des Normes
Détermine automatiquement pour chaque norme:
- is_essential: Norme critique/essentielle pour la sécurité
- consumer: Norme applicable aux particuliers (vs entreprises uniquement)

Logique:
- Full = 911 normes (toutes)
- Consumer = sous-ensemble de Full (normes pertinentes pour particuliers)
- Essential = sous-ensemble de Consumer (normes critiques)
"""

import os
import sys
import requests
import time
from datetime import datetime

# Configuration
def load_config():
    config = {}
    possible_paths = [
        os.path.join(os.path.dirname(__file__), 'env_template_free.txt'),
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', 'env_template_free.txt'),
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        config[key.strip()] = value.strip()
            break
    return config

CONFIG = load_config()
SUPABASE_URL = CONFIG.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = CONFIG.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
MISTRAL_API_KEY = CONFIG.get('MISTRAL_API_KEY', '')
GEMINI_API_KEY = CONFIG.get('GOOGLE_GEMINI_API_KEY', '')


class NormClassifier:
    """Classifie les normes via IA"""
    
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        self.norms = []
        self.stats = {'essential': 0, 'consumer': 0, 'total': 0}
    
    def load_norms(self):
        """Charge toutes les normes"""
        print("📂 Chargement des normes...")
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code,title,description,pillar&order=code.asc",
            headers=self.headers
        )
        self.norms = r.json() if r.status_code == 200 else []
        print(f"   ✅ {len(self.norms)} normes chargées")
        return self.norms
    
    def classify_with_ai(self, norm):
        """
        Utilise l'IA pour classifier une norme:
        - is_essential: True si la norme est critique pour la sécurité
        - consumer: True si la norme s'applique aux particuliers
        """
        
        prompt = f"""Tu es un expert en sécurité crypto et en classification de normes.

NORME À CLASSIFIER:
- Code: {norm['code']}
- Titre: {norm['title']}
- Description: {norm.get('description', 'N/A')}
- Pilier: {norm['pillar']} ({'Security' if norm['pillar'] == 'S' else 'Accessibility' if norm['pillar'] == 'A' else 'Functionality' if norm['pillar'] == 'F' else 'Experience'})

QUESTIONS:
1. ESSENTIAL: Cette norme est-elle CRITIQUE/ESSENTIELLE pour la sécurité des fonds crypto ?
   - OUI si: protection des clés privées, chiffrement, authentification, anti-phishing, backup critique
   - NON si: fonctionnalité secondaire, confort, esthétique, option avancée

2. CONSUMER: Cette norme s'applique-t-elle aux PARTICULIERS (vs entreprises/institutionnels) ?
   - OUI si: utilisable par un particulier, wallet personnel, usage quotidien
   - NON si: uniquement pour entreprises, custody institutionnelle, trading pro

Réponds UNIQUEMENT au format JSON:
{{"essential": true/false, "consumer": true/false}}
"""
        
        result = None
        
        # Essayer Mistral
        if MISTRAL_API_KEY:
            result = self._call_mistral(prompt)
        
        # Fallback Gemini
        if not result and GEMINI_API_KEY:
            result = self._call_gemini(prompt)
        
        # Fallback heuristique si pas d'IA
        if not result:
            result = self._heuristic_classify(norm)
        
        return result
    
    def _call_mistral(self, prompt):
        """Appel API Mistral"""
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
                    'max_tokens': 50
                },
                timeout=30
            )
            
            if r.status_code == 200:
                content = r.json()['choices'][0]['message']['content'].strip()
                # Parser le JSON
                import json
                # Nettoyer la réponse
                content = content.replace('```json', '').replace('```', '').strip()
                try:
                    return json.loads(content)
                except:
                    # Essayer de parser manuellement
                    essential = 'true' in content.lower().split('essential')[1].split(',')[0] if 'essential' in content.lower() else False
                    consumer = 'true' in content.lower().split('consumer')[1].split('}')[0] if 'consumer' in content.lower() else False
                    return {'essential': essential, 'consumer': consumer}
        except Exception as e:
            pass
        return None
    
    def _call_gemini(self, prompt):
        """Appel API Gemini"""
        try:
            r = requests.post(
                f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}',
                headers={'Content-Type': 'application/json'},
                json={
                    'contents': [{'parts': [{'text': prompt}]}],
                    'generationConfig': {'temperature': 0.1, 'maxOutputTokens': 50}
                },
                timeout=30
            )
            
            if r.status_code == 200:
                content = r.json()['candidates'][0]['content']['parts'][0]['text'].strip()
                import json
                content = content.replace('```json', '').replace('```', '').strip()
                try:
                    return json.loads(content)
                except:
                    essential = 'true' in content.lower().split('essential')[1].split(',')[0] if 'essential' in content.lower() else False
                    consumer = 'true' in content.lower().split('consumer')[1].split('}')[0] if 'consumer' in content.lower() else False
                    return {'essential': essential, 'consumer': consumer}
        except:
            pass
        return None
    
    def _heuristic_classify(self, norm):
        """Classification heuristique si pas d'IA disponible"""
        code = norm['code'].upper()
        title = norm['title'].lower()
        desc = (norm.get('description') or '').lower()
        pillar = norm['pillar']
        
        # Mots-clés pour Essential
        essential_keywords = [
            'private key', 'seed', 'backup', 'recovery', 'encryption', 'encrypt',
            'authentication', 'auth', '2fa', 'mfa', 'password', 'pin',
            'signature', 'sign', 'verify', 'secure element', 'tamper',
            'phishing', 'malware', 'attack', 'vulnerability', 'exploit',
            'sha', 'aes', 'rsa', 'ed25519', 'ecdsa', 'bip39', 'bip32',
            'cold storage', 'air gap', 'offline'
        ]
        
        # Mots-clés pour NON-Consumer (entreprise uniquement)
        enterprise_keywords = [
            'institutional', 'enterprise', 'corporate', 'custody',
            'compliance', 'audit', 'regulation', 'kyc', 'aml',
            'multi-sig governance', 'treasury', 'batch'
        ]
        
        # Déterminer Essential
        is_essential = False
        if pillar == 'S':  # Security -> plus de chances d'être essential
            is_essential = any(kw in title or kw in desc for kw in essential_keywords)
            # Les normes S01-S20 sont généralement essentielles
            if code.startswith('S') and len(code) == 3:
                try:
                    num = int(code[1:])
                    if num <= 20:
                        is_essential = True
                except:
                    pass
        else:
            is_essential = any(kw in title or kw in desc for kw in essential_keywords)
        
        # Déterminer Consumer
        is_consumer = not any(kw in title or kw in desc for kw in enterprise_keywords)
        
        return {'essential': is_essential, 'consumer': is_consumer}
    
    def classify_all_norms(self, use_ai=True, limit=None):
        """Classifie toutes les normes"""
        print(f"\n🤖 CLASSIFICATION DES NORMES {'(IA)' if use_ai else '(Heuristique)'}")
        print("=" * 60)
        
        norms_to_process = self.norms[:limit] if limit else self.norms
        
        updates = []
        
        for i, norm in enumerate(norms_to_process):
            if use_ai and (MISTRAL_API_KEY or GEMINI_API_KEY):
                result = self.classify_with_ai(norm)
                time.sleep(0.3)  # Rate limiting
            else:
                result = self._heuristic_classify(norm)
            
            if result:
                updates.append({
                    'id': norm['id'],
                    'is_essential': result.get('essential', False),
                    'consumer': result.get('consumer', True)
                })
                
                if result.get('essential'):
                    self.stats['essential'] += 1
                if result.get('consumer'):
                    self.stats['consumer'] += 1
                self.stats['total'] += 1
            
            # Afficher progression
            if (i + 1) % 50 == 0:
                print(f"   📊 {i+1}/{len(norms_to_process)} normes classifiées...")
        
        # Sauvegarder les mises à jour
        print(f"\n💾 Sauvegarde des classifications...")
        self._save_classifications(updates)
        
        # Statistiques finales
        print(f"""
╔══════════════════════════════════════════════════════════════╗
║                 📊 RÉSULTATS CLASSIFICATION                  ║
╠══════════════════════════════════════════════════════════════╣
║  Total normes:     {self.stats['total']:<40} ║
║  Full:             {self.stats['total']:<40} ║
║  Consumer:         {self.stats['consumer']:<40} ║
║  Essential:        {self.stats['essential']:<40} ║
╚══════════════════════════════════════════════════════════════╝
""")
        
        return updates
    
    def _save_classifications(self, updates):
        """Sauvegarde les classifications dans Supabase par batch"""
        success = 0
        batch_size = 50
        
        for i in range(0, len(updates), batch_size):
            batch = updates[i:i+batch_size]
            
            for update in batch:
                r = requests.patch(
                    f"{SUPABASE_URL}/rest/v1/norms?id=eq.{update['id']}",
                    headers=self.headers,
                    json={
                        'is_essential': update['is_essential'],
                        'consumer': update['consumer']
                    },
                    timeout=10
                )
                if r.status_code in [200, 204]:
                    success += 1
            
            print(f"   💾 {min(i+batch_size, len(updates))}/{len(updates)} sauvegardées...")
        
        print(f"   ✅ {success}/{len(updates)} normes mises à jour")
    
    def run(self, use_ai=True, limit=None):
        """Exécution complète"""
        print("""
╔══════════════════════════════════════════════════════════════╗
║     🔐 SAFE SCORING - CLASSIFICATION IA DES NORMES           ║
╚══════════════════════════════════════════════════════════════╝
""")
        
        self.load_norms()
        self.classify_all_norms(use_ai=use_ai, limit=limit)


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Classification IA des normes SAFE')
    parser.add_argument('--no-ai', action='store_true', help='Utiliser heuristique au lieu de IA')
    parser.add_argument('--limit', type=int, default=None, help='Limite de normes à traiter')
    
    args = parser.parse_args()
    
    classifier = NormClassifier()
    classifier.run(use_ai=not args.no_ai, limit=args.limit)


if __name__ == "__main__":
    main()
