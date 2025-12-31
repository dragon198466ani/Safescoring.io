#!/usr/bin/env python3
"""
SAFESCORING.IO - Norm Applicability Generator
Génère automatiquement la table norm_applicability en comparant chaque norme
avec la description détaillée de chaque type de produit.

Utilise l'IA pour déterminer si une norme est applicable à un type.
"""

import os
import sys
import json
import requests
import time
import re
from datetime import datetime

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


APPLICABILITY_PROMPT = """Tu es un expert en sécurité crypto. Tu dois déterminer si chaque norme est APPLICABLE à un type de produit.

═══════════════════════════════════════════════════════════════════════
TYPE DE PRODUIT: {type_name} ({type_code})
═══════════════════════════════════════════════════════════════════════
Catégorie: {category}

DESCRIPTION DÉTAILLÉE:
{description}

CARACTÉRISTIQUES:
- Exemples: {examples}
- Avantages: {advantages}
- Inconvénients: {disadvantages}

═══════════════════════════════════════════════════════════════════════
NORMES À ÉVALUER (détermine si chaque norme est APPLICABLE à ce type):
═══════════════════════════════════════════════════════════════════════
{norms_text}

═══════════════════════════════════════════════════════════════════════
RÈGLES D'APPLICABILITÉ:
═══════════════════════════════════════════════════════════════════════

APPLICABLE (OUI) = La norme A DU SENS pour ce type de produit
- Le type de produit PEUT potentiellement implémenter cette norme
- Il est PERTINENT de poser la question "est-ce que ce produit respecte cette norme?"
- Même si la plupart des produits de ce type ne l'implémentent pas

NON-APPLICABLE (NON) = La norme N'A AUCUN SENS pour ce type de produit
- Incompatibilité TECHNIQUE FONDAMENTALE
- Le type de produit NE PEUT PAS implémenter cette norme par design
- Il est ABSURDE de poser la question

EXEMPLES:
┌────────────────────────────────────────────────────────────────────┐
│ Type: Software Wallet                                              │
│ - "Secure Element" → NON (pas de hardware)                         │
│ - "Résistance au feu" → NON (pas physique)                         │
│ - "Chiffrement AES-256" → OUI (peut l'implémenter)                 │
│ - "Open source" → OUI (peut être open source)                      │
├────────────────────────────────────────────────────────────────────┤
│ Type: Hardware Wallet Cold                                         │
│ - "Secure Element" → OUI (peut avoir un SE)                        │
│ - "Air-gapped" → OUI (peut être air-gapped)                        │
│ - "Multi-chain DeFi" → NON (cold storage = pas de DeFi)            │
├────────────────────────────────────────────────────────────────────┤
│ Type: DEX (Decentralized Exchange)                                 │
│ - "KYC required" → NON (décentralisé = pas de KYC possible)        │
│ - "Smart contract audit" → OUI (peut être audité)                  │
│ - "Secure Element" → NON (pas de hardware)                         │
├────────────────────────────────────────────────────────────────────┤
│ Type: Protocol/Guide                                               │
│ - "Secure Element" → NON (c'est un document, pas du hardware)      │
│ - "Documentation complète" → OUI (un guide peut être bien documenté)│
│ - "Résistance physique" → NON (pas un objet physique)              │
└────────────────────────────────────────────────────────────────────┘

ATTENTION: 
- Une norme APPLICABLE ne signifie pas que le produit l'implémente
- APPLICABLE = "est-ce que ça a du sens de poser la question?"
- En cas de doute, préférer OUI (applicable)

FORMAT DE RÉPONSE (une ligne par norme):
CODE: OUI ou NON

Évalue chaque norme:"""


class NormApplicabilityGenerator:
    """Génère automatiquement la table norm_applicability."""
    
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        self.product_types = {}
        self.norms = []
        self.norms_by_code = {}
        self.current_applicability = {}
    
    def load_data(self):
        """Loads types and norms from Supabase."""
        print("\n📂 LOADING SUPABASE DATA")
        print("=" * 60)
        
        # Load types
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/product_types?select=*',
            headers=self.headers
        )
        types_list = r.json() if r.status_code == 200 else []
        self.product_types = {t['id']: t for t in types_list}
        print(f"   📁 {len(self.product_types)} product types")
        
        # Load norms
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,description',
            headers=self.headers
        )
        self.norms = r.json() if r.status_code == 200 else []
        self.norms_by_code = {n['code']: n for n in self.norms}
        print(f"   📋 {len(self.norms)} norms")
        
        # Load current applicability
        print("   📊 Loading current applicability...")
        offset = 0
        while True:
            r = requests.get(
                f'{SUPABASE_URL}/rest/v1/norm_applicability?select=norm_id,type_id,is_applicable&limit=1000&offset={offset}',
                headers=self.headers
            )
            data = r.json() if r.status_code == 200 else []
            if not data:
                break
            for row in data:
                key = (row['type_id'], row['norm_id'])
                self.current_applicability[key] = row['is_applicable']
            offset += 1000
        print(f"   ✅ {len(self.current_applicability)} existing rules")
    
    def get_type_context(self, type_info):
        """Builds the complete context of a type."""
        return {
            'name': type_info.get('name', 'Unknown'),
            'code': type_info.get('code', ''),
            'category': type_info.get('category', 'N/A'),
            'description': type_info.get('description', 'No detailed description'),
            'examples': type_info.get('examples', 'No examples'),
            'advantages': type_info.get('advantages', 'N/A'),
            'disadvantages': type_info.get('disadvantages', 'N/A')
        }
    
    def evaluate_batch(self, type_info, norms_batch):
        """Evaluates applicability of a batch of norms for a type."""
        ctx = self.get_type_context(type_info)
        
        norms_text = "\n".join([
            f"- {n['code']}: {n['title']}" + (f" ({n.get('description', '')[:60]})" if n.get('description') else "")
            for n in norms_batch
        ])
        
        prompt = APPLICABILITY_PROMPT.format(
            type_name=ctx['name'],
            type_code=ctx['code'],
            category=ctx['category'],
            description=ctx['description'],
            examples=ctx['examples'],
            advantages=ctx['advantages'],
            disadvantages=ctx['disadvantages'],
            norms_text=norms_text
        )
        
        result = self._call_mistral(prompt)
        
        if not result:
            return {}
        
        # Parse response
        applicability = {}
        
        for line in result.split('\n'):
            line = line.strip()
            if not line:
                continue
            
            match = re.search(r'\b([SAFE])[-_]?(\d+)\b.*?(OUI|NON|YES|NO)', line, re.IGNORECASE)
            
            if match:
                letter = match.group(1).upper()
                number = match.group(2)
                code = f"{letter}{number}"
                value = match.group(3).upper()
                
                norm = self.norms_by_code.get(code)
                if norm:
                    is_applicable = value in ['OUI', 'YES']
                    applicability[norm['id']] = is_applicable
        
        return applicability
    
    def _call_mistral(self, prompt):
        """Mistral API call."""
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
                    'max_tokens': 3000
                },
                timeout=90
            )
            
            if r.status_code == 200:
                return r.json()['choices'][0]['message']['content']
            elif r.status_code == 429:
                print("      ⏳ Rate limit, waiting 10s...")
                time.sleep(10)
                return self._call_mistral(prompt)
            else:
                print(f"      ⚠️ Mistral HTTP {r.status_code}")
        except Exception as e:
            print(f"      ⚠️ Mistral error: {e}")
        return None
    
    def generate_for_type(self, type_id, batch_size=40):
        """Generates applicability for a product type."""
        type_info = self.product_types.get(type_id)
        if not type_info:
            print(f"❌ Type {type_id} not found")
            return {}
        
        print(f"\n{'='*60}")
        print(f"📁 {type_info['name']} ({type_info['code']})")
        print(f"{'='*60}")
        print(f"   Description: {(type_info.get('description') or '')[:100]}...")
        
        all_results = {}
        
        # Group by pillar
        for pillar in ['S', 'A', 'F', 'E']:
            pillar_norms = [n for n in self.norms if n['pillar'] == pillar]
            if not pillar_norms:
                continue
            
            print(f"\n   🔍 Pillar {pillar} ({len(pillar_norms)} norms)")
            
            for i in range(0, len(pillar_norms), batch_size):
                batch = pillar_norms[i:i+batch_size]
                batch_num = i // batch_size + 1
                total_batches = (len(pillar_norms) + batch_size - 1) // batch_size
                
                print(f"      Batch {batch_num}/{total_batches}...", end=" ", flush=True)
                
                results = self.evaluate_batch(type_info, batch)
                all_results.update(results)
                
                applicable = sum(1 for v in results.values() if v)
                print(f"✅ {applicable}/{len(results)} applicable")
                
                time.sleep(0.5)
        
        # Summary
        total_applicable = sum(1 for v in all_results.values() if v)
        pct = 100 * total_applicable // len(all_results) if all_results else 0
        print(f"\n   📊 Total: {total_applicable}/{len(all_results)} norms applicable ({pct}%)")
        
        return all_results
    
    def save_applicability(self, type_id, results, dry_run=False):
        """Saves results to Supabase."""
        if dry_run:
            print(f"   🔍 Dry-run mode: {len(results)} rules to save")
            return
        
        print(f"\n   💾 Saving {len(results)} rules...")
        
        # Delete old rules
        r = requests.delete(
            f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{type_id}',
            headers=self.headers
        )
        
        # Prepare new rules
        records = [
            {'type_id': type_id, 'norm_id': norm_id, 'is_applicable': is_applicable}
            for norm_id, is_applicable in results.items()
        ]
        
        # Insérer par batch
        batch_size = 100
        for i in range(0, len(records), batch_size):
            batch = records[i:i+batch_size]
            r = requests.post(
                f'{SUPABASE_URL}/rest/v1/norm_applicability',
                headers=self.headers,
                json=batch
            )
            if r.status_code not in [200, 201]:
                print(f"      ⚠️ Erreur batch: {r.status_code}")
        
        print(f"   ✅ {len(records)} règles sauvegardées")
    
    def compare_results(self, type_id, new_results):
        """Compare les nouveaux résultats avec l'existant."""
        changes = {'added': 0, 'removed': 0, 'unchanged': 0}
        
        for norm_id, is_applicable in new_results.items():
            key = (type_id, norm_id)
            current = self.current_applicability.get(key)
            
            if current is None:
                changes['added' if is_applicable else 'unchanged'] += 1
            elif current != is_applicable:
                changes['added' if is_applicable else 'removed'] += 1
            else:
                changes['unchanged'] += 1
        
        return changes
    
    def generate_all(self, dry_run=True):
        """Génère l'applicabilité pour tous les types."""
        self.load_data()
        
        print(f"\n{'='*60}")
        print(f"🚀 GÉNÉRATION POUR {len(self.product_types)} TYPES")
        print(f"{'='*60}")
        
        all_stats = []
        
        for type_id, type_info in self.product_types.items():
            results = self.generate_for_type(type_id)
            
            if results:
                changes = self.compare_results(type_id, results)
                
                stats = {
                    'type': type_info['code'],
                    'total': len(results),
                    'applicable': sum(1 for v in results.values() if v),
                    'changes': changes
                }
                all_stats.append(stats)
                
                if not dry_run:
                    self.save_applicability(type_id, results)
        
        # Résumé final
        print(f"\n{'='*60}")
        print("📊 RÉSUMÉ FINAL")
        print(f"{'='*60}")
        
        for stat in all_stats:
            pct = 100 * stat['applicable'] // stat['total'] if stat['total'] else 0
            print(f"   {stat['type']:15} │ {stat['applicable']:3}/{stat['total']:3} ({pct:2}%)")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Génère norm_applicability automatiquement')
    parser.add_argument('--type', type=int, help='ID du type à traiter (sinon tous)')
    parser.add_argument('--save', action='store_true', help='Sauvegarder les résultats')
    parser.add_argument('--list', action='store_true', help='Lister les types')
    
    args = parser.parse_args()
    
    generator = NormApplicabilityGenerator()
    
    if args.list:
        generator.load_data()
        print("\nTypes de produits:")
        for tid, t in sorted(generator.product_types.items()):
            current = sum(1 for k, v in generator.current_applicability.items() if k[0] == tid and v)
            print(f"   {tid:3}: {t['code']:15} - {current:3} normes applicables")
        return
    
    print("\n" + "╔" + "═"*58 + "╗")
    print("║     🤖 SAFE SCORING - NORM APPLICABILITY GENERATOR       ║")
    print("║     Génère automatiquement l'applicabilité des normes    ║")
    print("╚" + "═"*58 + "╝")
    
    if args.type:
        generator.load_data()
        results = generator.generate_for_type(args.type)
        if results:
            changes = generator.compare_results(args.type, results)
            print(f"\n   📝 Changements: +{changes['added']} ajoutées, -{changes['removed']} retirées")
            if args.save:
                generator.save_applicability(args.type, results)
    else:
        generator.generate_all(dry_run=not args.save)


if __name__ == '__main__':
    main()
