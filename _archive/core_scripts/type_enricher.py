#!/usr/bin/env python3
"""
SAFESCORING.IO - Type Enricher
Enrichit automatiquement les descriptions des types de produits avec l'IA.
Génère des descriptions détaillées, exemples, avantages et inconvénients.
"""

import os
import sys
import json
import requests
import time

# Configuration
def load_config():
    config = {}
    possible_paths = [
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', 'env_template_free.txt'),
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', '.env.txt'),
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
SUPABASE_URL = CONFIG.get('NEXT_PUBLIC_SUPABASE_URL', 'https://ajdncttomdqojlozxjxu.supabase.co')
SUPABASE_KEY = CONFIG.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
MISTRAL_API_KEY = CONFIG.get('MISTRAL_API_KEY', '')


ENRICHMENT_PROMPT = """Tu es un expert en produits crypto et blockchain. Tu dois créer une description DÉTAILLÉE et TECHNIQUE d'un type de produit crypto.

TYPE DE PRODUIT: {type_name} ({type_code})
Catégorie: {category}
Description actuelle: {current_description}

Génère une description COMPLÈTE et STRUCTURÉE avec les sections suivantes:

1. DESCRIPTION (3-5 phrases):
   - Définition précise et technique du type de produit
   - Caractéristiques fondamentales qui le définissent
   - Ce qui le différencie des autres types
   - Public cible et cas d'usage principaux

2. CARACTÉRISTIQUES TECHNIQUES:
   - Architecture typique (hardware/software/hybrid)
   - Méthode de stockage des clés (custodial/non-custodial)
   - Connectivité (air-gapped, Bluetooth, USB, WiFi, Internet)
   - Niveau de sécurité attendu

3. EXEMPLES DE PRODUITS (5-10 produits connus):
   - Liste des produits les plus représentatifs de ce type
   - Inclure les leaders du marché

4. AVANTAGES (5-7 points):
   - Points forts de ce type de produit
   - Bénéfices pour l'utilisateur

5. INCONVÉNIENTS (5-7 points):
   - Limitations et faiblesses
   - Risques potentiels

6. NORMES TYPIQUEMENT APPLICABLES:
   - Types de normes de sécurité pertinentes (S)
   - Types de normes d'adversité pertinentes (A)
   - Types de normes de fiabilité pertinentes (F)
   - Types de normes d'efficacité pertinentes (E)

7. NORMES TYPIQUEMENT NON-APPLICABLES:
   - Types de normes qui n'ont PAS de sens pour ce type
   - Expliquer pourquoi elles sont N/A

FORMAT DE RÉPONSE (JSON):
{{
  "description": "Description complète en 3-5 phrases...",
  "technical_characteristics": "Architecture, stockage clés, connectivité...",
  "examples": "Produit1, Produit2, Produit3...",
  "advantages": "- Avantage 1\\n- Avantage 2\\n- Avantage 3...",
  "disadvantages": "- Inconvénient 1\\n- Inconvénient 2...",
  "applicable_norm_types": "S: sécurité crypto, chiffrement... A: résistance attaques... F: durabilité... E: usabilité...",
  "non_applicable_norm_types": "Normes hardware pour software, normes physiques pour digital..."
}}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après."""


class TypeEnricher:
    """Enrichit les descriptions des types de produits avec l'IA."""
    
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        self.product_types = {}
    
    def load_types(self):
        """Charge les types de produits depuis Supabase."""
        print("\n📂 Chargement des types de produits...")
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/product_types?select=*',
            headers=self.headers
        )
        types_list = r.json() if r.status_code == 200 else []
        self.product_types = {t['id']: t for t in types_list}
        print(f"   ✅ {len(self.product_types)} types loaded")
        return self.product_types
    
    def enrich_type(self, type_id):
        """Enriches a product type with AI."""
        type_info = self.product_types.get(type_id)
        if not type_info:
            print(f"❌ Type {type_id} not found")
            return None
        
        print(f"\n{'='*60}")
        print(f"📝 Enriching: {type_info['name']} ({type_info['code']})")
        print(f"{'='*60}")
        
        prompt = ENRICHMENT_PROMPT.format(
            type_name=type_info['name'],
            type_code=type_info['code'],
            category=type_info.get('category', 'N/A'),
            current_description=type_info.get('description', 'No description')
        )
        
        result = self._call_mistral(prompt)
        
        if not result:
            print("   ⚠️ Pas de réponse de l'IA")
            return None
        
        # Parser le JSON
        try:
            # Nettoyer la réponse
            result = result.strip()
            if result.startswith('```json'):
                result = result[7:]
            if result.startswith('```'):
                result = result[3:]
            if result.endswith('```'):
                result = result[:-3]
            result = result.strip()
            
            # Corriger les échappements problématiques
            # Remplacer les \n littéraux mal échappés dans les strings JSON
            import re
            # Trouver le JSON valide
            json_match = re.search(r'\{[\s\S]*\}', result)
            if json_match:
                result = json_match.group(0)
            
            try:
                data = json.loads(result)
            except json.JSONDecodeError:
                # Essayer de corriger les backslashes mal échappés
                result = result.replace('\\n', '\\\\n').replace('\\"', '"')
                result = re.sub(r'(?<!\\)\\(?!["\\/bfnrtu])', r'\\\\', result)
                data = json.loads(result)
            
            print(f"   ✅ Description générée ({len(data.get('description', ''))} chars)")
            print(f"   ✅ Exemples: {str(data.get('examples', ''))[:50]}...")
            
            return data
            
        except json.JSONDecodeError as e:
            print(f"   ⚠️ Erreur JSON: {e}")
            print(f"   Réponse brute: {result[:200]}...")
            # Fallback: extraire manuellement les champs
            return self._extract_fields_manually(result)
    
    def _call_mistral(self, prompt):
        """Appel API Mistral."""
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
                    'temperature': 0.3,
                    'max_tokens': 2000
                },
                timeout=60
            )
            
            if r.status_code == 200:
                return r.json()['choices'][0]['message']['content']
            elif r.status_code == 429:
                print("      ⏳ Rate limit, attente 10s...")
                time.sleep(10)
                return self._call_mistral(prompt)
            else:
                print(f"      ⚠️ Mistral HTTP {r.status_code}")
        except Exception as e:
            print(f"      ⚠️ Erreur Mistral: {e}")
        return None
    
    def _extract_fields_manually(self, text):
        """Extraction manuelle des champs si le JSON échoue."""
        import re
        
        data = {}
        
        # Extraire description
        desc_match = re.search(r'"description"\s*:\s*"([^"]*(?:\\.[^"]*)*)"', text)
        if desc_match:
            data['description'] = desc_match.group(1).replace('\\n', '\n').replace('\\"', '"')
        
        # Extraire examples
        ex_match = re.search(r'"examples"\s*:\s*"([^"]*(?:\\.[^"]*)*)"', text)
        if ex_match:
            data['examples'] = ex_match.group(1).replace('\\n', '\n').replace('\\"', '"')
        
        # Extraire advantages
        adv_match = re.search(r'"advantages"\s*:\s*"([^"]*(?:\\.[^"]*)*)"', text)
        if adv_match:
            data['advantages'] = adv_match.group(1).replace('\\n', '\n').replace('\\"', '"')
        
        # Extraire disadvantages
        dis_match = re.search(r'"disadvantages"\s*:\s*"([^"]*(?:\\.[^"]*)*)"', text)
        if dis_match:
            data['disadvantages'] = dis_match.group(1).replace('\\n', '\n').replace('\\"', '"')
        
        if data:
            print(f"   ⚠️ Extraction manuelle: {len(data)} champs récupérés")
            return data
        
        return None
    
    def save_enrichment(self, type_id, data, dry_run=False):
        """Sauvegarde l'enrichissement dans Supabase."""
        if dry_run:
            print(f"   🔍 Mode dry-run: pas de sauvegarde")
            return True
        
        update_data = {
            'description': data.get('description', ''),
            'examples': data.get('examples', ''),
            'advantages': data.get('advantages', ''),
            'disadvantages': data.get('disadvantages', '')
        }
        
        r = requests.patch(
            f'{SUPABASE_URL}/rest/v1/product_types?id=eq.{type_id}',
            headers=self.headers,
            json=update_data
        )
        
        if r.status_code in [200, 204]:
            print(f"   💾 Sauvegardé dans Supabase")
            return True
        else:
            print(f"   ❌ Erreur sauvegarde: {r.status_code} - {r.text[:100]}")
            return False
    
    def enrich_all(self, dry_run=True):
        """Enrichit tous les types de produits."""
        self.load_types()
        
        print(f"\n{'='*60}")
        print(f"🚀 ENRICHISSEMENT DE {len(self.product_types)} TYPES")
        print(f"{'='*60}")
        
        success = 0
        for type_id, type_info in self.product_types.items():
            data = self.enrich_type(type_id)
            if data:
                if self.save_enrichment(type_id, data, dry_run=dry_run):
                    success += 1
            time.sleep(1)  # Rate limiting
        
        print(f"\n{'='*60}")
        print(f"📊 RÉSUMÉ: {success}/{len(self.product_types)} types enrichis")
        print(f"{'='*60}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Enrichit les descriptions des types de produits')
    parser.add_argument('--type', type=int, help='ID du type à enrichir (sinon tous)')
    parser.add_argument('--save', action='store_true', help='Sauvegarder les résultats')
    parser.add_argument('--list', action='store_true', help='Lister les types')
    
    args = parser.parse_args()
    
    enricher = TypeEnricher()
    
    if args.list:
        enricher.load_types()
        print("\nTypes de produits:")
        for tid, t in sorted(enricher.product_types.items()):
            desc_len = len(t.get('description') or '')
            print(f"   {tid:3}: {t['code']:15} - {t['name']:30} ({desc_len} chars)")
        return
    
    print("\n" + "╔" + "═"*58 + "╗")
    print("║     🤖 SAFE SCORING - TYPE ENRICHER                      ║")
    print("║     Enrichit les descriptions des types avec IA          ║")
    print("╚" + "═"*58 + "╝")
    
    if args.type:
        enricher.load_types()
        data = enricher.enrich_type(args.type)
        if data and args.save:
            enricher.save_enrichment(args.type, data)
        elif data:
            print("\n📋 Aperçu de l'enrichissement:")
            print(f"   Description: {data.get('description', '')[:200]}...")
            print(f"   Exemples: {data.get('examples', '')}")
    else:
        enricher.enrich_all(dry_run=not args.save)


if __name__ == '__main__':
    main()
