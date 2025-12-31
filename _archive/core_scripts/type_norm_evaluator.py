#!/usr/bin/env python3
"""
SAFESCORING.IO - Type x Norm Evaluator
Automatically evaluates which norms are applicable to each product type.
Inspired by smart_evaluator (product x norm).

Uses AI to determine if a norm is applicable to a product type
based on:
- Detailed type description
- Norm definition
- Technical common sense
"""

import os
import sys
import json
import requests
import time
import re
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

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
SUPABASE_KEY = CONFIG.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk')
MISTRAL_API_KEY = CONFIG.get('MISTRAL_API_KEY', '')


# ═══════════════════════════════════════════════════════════════════════════════
# PROMPT SYSTÈME - Évaluation Type x Norme
# ═══════════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """You are an expert in crypto security and blockchain product classification.
You must determine if a security norm is APPLICABLE to a product type.

APPLICABILITY RULES:
1. APPLICABLE = This norm makes sense for this product type
   - The product type CAN implement this norm
   - The norm is relevant for evaluating this product type
   
2. NOT-APPLICABLE = This norm makes NO sense for this product type
   - Fundamental technical incompatibility
   - The product type CANNOT implement this norm by design

EXAMPLES:
- "Secure Element" for "Software Wallet" → NOT-APPLICABLE (no hardware)
- "Secure Element" for "Hardware Wallet" → APPLICABLE
- "Multi-chain support" for "DEX" → APPLICABLE
- "Fire resistance" for "Software Wallet" → NOT-APPLICABLE (not physical)
- "Fire resistance" for "Backup Physical" → APPLICABLE
- "KYC required" for "DEX" → NOT-APPLICABLE (decentralized by design)
- "KYC required" for "CEX" → APPLICABLE

NOTE: A norm can be APPLICABLE even if the product doesn't implement it.
Applicability = "does it make sense to ask the question?"
"""


class TypeNormEvaluator:
    """
    Type x Norm applicability evaluator with AI.
    """
    
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        self.product_types = {}
        self.norms = []
        self.norms_by_id = {}
        self.current_applicability = {}  # {(type_id, norm_id): is_applicable}
        
    def load_data(self):
        """Loads product types and norms from Supabase"""
        print("\n📂 LOADING SUPABASE DATA")
        print("=" * 60)
        
        # Load product types
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,description,examples,advantages,disadvantages,category',
            headers=self.headers
        )
        types_list = r.json() if r.status_code == 200 else []
        self.product_types = {t['id']: t for t in types_list}
        print(f"   📁 {len(self.product_types)} product types")
        
        # Load norms
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,description,is_essential,consumer',
            headers=self.headers
        )
        self.norms = r.json() if r.status_code == 200 else []
        self.norms_by_id = {n['id']: n for n in self.norms}
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
        print(f"   ✅ {len(self.current_applicability)} existing applicability rules")
        
    def get_type_description(self, type_info):
        """Builds a complete description of the product type"""
        desc = f"""TYPE: {type_info.get('name', 'Unknown')} ({type_info.get('code', '')})
Category: {type_info.get('category', 'N/A')}

DESCRIPTION:
{type_info.get('description', 'No description')}

PRODUCT EXAMPLES:
{type_info.get('examples', 'No examples')}

ADVANTAGES:
{type_info.get('advantages', 'N/A')}

DISADVANTAGES:
{type_info.get('disadvantages', 'N/A')}"""
        return desc
    
    def evaluate_batch_applicability(self, type_info, norms_batch):
        """
        Evaluates applicability of a batch of norms for a product type.
        Returns a dict {norm_id: True/False}
        """
        type_desc = self.get_type_description(type_info)
        
        # Build norms list
        norms_text = "\n".join([
            f"- {n['code']}: {n['title']}" + (f" ({n.get('description', '')[:80]})" if n.get('description') else "")
            for n in norms_batch
        ])
        
        prompt = f"""{SYSTEM_PROMPT}

PRODUCT TYPE TO EVALUATE:
{type_desc}

NORMS TO EVALUATE (determine if each norm is APPLICABLE to this type):
{norms_text}

For each norm, answer:
- YES = The norm is applicable (makes sense to evaluate for this type)
- NO = The norm is not applicable (incompatible by design)

FORMAT (one line per norm, nothing else):
CODE: YES or NO

Evaluate:"""

        result = self._call_mistral(prompt)
        
        if not result:
            return {}
        
        # Parse response
        applicability = {}
        
        for line in result.split('\n'):
            line = line.strip()
            if not line:
                continue
            
            # Look for pattern like "S01: YES" or "A12: NO"
            match = re.search(r'\b([SAFE])[-_]?(\d+)\b.*?(YES|NO|APPLICABLE|NOT.?APPLICABLE)', line, re.IGNORECASE)
            
            if match:
                letter = match.group(1).upper()
                number = match.group(2)
                code = f"{letter}{number}"
                value = match.group(3).upper().replace('-', '').replace(' ', '')
                
                # Find norm ID
                norm = next((n for n in norms_batch if n['code'] == code), None)
                if norm:
                    is_applicable = value in ['YES', 'APPLICABLE']
                    applicability[norm['id']] = is_applicable
        
        return applicability
    
    def _call_mistral(self, prompt):
        """Mistral API call"""
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
                    'max_tokens': 2000
                },
                timeout=60
            )
            
            if r.status_code == 200:
                return r.json()['choices'][0]['message']['content']
            elif r.status_code == 429:
                print("      ⏳ Rate limit, waiting 5s...")
                time.sleep(5)
                return self._call_mistral(prompt)  # Retry
            else:
                print(f"      ⚠️ Mistral HTTP {r.status_code}")
        except Exception as e:
            print(f"      ⚠️ Mistral error: {e}")
        return None
    
    def evaluate_type(self, type_id, pillar=None, batch_size=30):
        """
        Evaluates all norms for a product type.
        Optionally filter by pillar (S, A, F, E).
        """
        type_info = self.product_types.get(type_id)
        if not type_info:
            print(f"❌ Type {type_id} not found")
            return {}
        
        print(f"\n{'='*60}")
        print(f"📁 {type_info['name']} ({type_info['code']})")
        print(f"{'='*60}")
        
        # Filter norms by pillar if specified
        norms_to_evaluate = self.norms
        if pillar:
            norms_to_evaluate = [n for n in self.norms if n['pillar'] == pillar]
        
        print(f"   📋 {len(norms_to_evaluate)} norms to evaluate")
        
        all_results = {}
        
        # Group by pillar
        pillars = ['S', 'A', 'F', 'E'] if not pillar else [pillar]
        
        for p in pillars:
            pillar_norms = [n for n in norms_to_evaluate if n['pillar'] == p]
            if not pillar_norms:
                continue
                
            print(f"\n   🔍 Pillar {p} ({len(pillar_norms)} norms)")
            
            # Evaluate by batch
            for i in range(0, len(pillar_norms), batch_size):
                batch = pillar_norms[i:i+batch_size]
                batch_num = i // batch_size + 1
                total_batches = (len(pillar_norms) + batch_size - 1) // batch_size
                
                print(f"      Batch {batch_num}/{total_batches} ({len(batch)} norms)...", end=" ", flush=True)
                
                results = self.evaluate_batch_applicability(type_info, batch)
                all_results.update(results)
                
                applicable = sum(1 for v in results.values() if v)
                print(f"✅ {applicable}/{len(results)} applicable")
                
                time.sleep(0.5)  # Rate limiting
        
        # Summary
        total_applicable = sum(1 for v in all_results.values() if v)
        print(f"\n   📊 Result: {total_applicable}/{len(all_results)} norms applicable ({100*total_applicable//len(all_results) if all_results else 0}%)")
        
        return all_results
    
    def save_applicability(self, type_id, results, dry_run=False):
        """
        Saves applicability results to Supabase.
        """
        if dry_run:
            print(f"\n   🔍 Dry-run mode: {len(results)} rules to save")
            return
        
        print(f"\n   💾 Saving {len(results)} rules...")
        
        # Prepare data
        records = []
        for norm_id, is_applicable in results.items():
            records.append({
                'type_id': type_id,
                'norm_id': norm_id,
                'is_applicable': is_applicable
            })
        
        # Delete old rules for this type
        r = requests.delete(
            f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{type_id}',
            headers=self.headers
        )
        
        # Insert new rules by batch
        batch_size = 100
        for i in range(0, len(records), batch_size):
            batch = records[i:i+batch_size]
            r = requests.post(
                f'{SUPABASE_URL}/rest/v1/norm_applicability',
                headers={**self.headers, 'Prefer': 'return=minimal'},
                json=batch
            )
            if r.status_code not in [200, 201]:
                print(f"      ⚠️ Batch error {i//batch_size + 1}: {r.status_code}")
        
        print(f"   ✅ {len(records)} rules saved")
    
    def compare_with_current(self, type_id, new_results):
        """
        Compares new results with current applicability.
        """
        changes = {'added': [], 'removed': [], 'unchanged': 0}
        
        for norm_id, is_applicable in new_results.items():
            key = (type_id, norm_id)
            current = self.current_applicability.get(key)
            norm = self.norms_by_id.get(norm_id, {})
            
            if current is None:
                if is_applicable:
                    changes['added'].append(norm.get('code', norm_id))
            elif current != is_applicable:
                if is_applicable:
                    changes['added'].append(norm.get('code', norm_id))
                else:
                    changes['removed'].append(norm.get('code', norm_id))
            else:
                changes['unchanged'] += 1
        
        return changes
    
    def run_full_evaluation(self, type_ids=None, dry_run=True):
        """
        Evaluates all product types (or a specific list).
        """
        self.load_data()
        
        if type_ids is None:
            type_ids = list(self.product_types.keys())
        
        print(f"\n{'='*60}")
        print(f"🚀 EVALUATING {len(type_ids)} PRODUCT TYPES")
        print(f"{'='*60}")
        
        all_stats = []
        
        for type_id in type_ids:
            results = self.evaluate_type(type_id)
            
            if results:
                # Comparer avec l'existant
                changes = self.compare_with_current(type_id, results)
                type_info = self.product_types[type_id]
                
                stats = {
                    'type': type_info['code'],
                    'total': len(results),
                    'applicable': sum(1 for v in results.values() if v),
                    'added': len(changes['added']),
                    'removed': len(changes['removed'])
                }
                all_stats.append(stats)
                
                if changes['added'] or changes['removed']:
                    print(f"\n   📝 Changes detected:")
                    if changes['added']:
                        print(f"      + {len(changes['added'])} norms added: {', '.join(changes['added'][:10])}...")
                    if changes['removed']:
                        print(f"      - {len(changes['removed'])} norms removed: {', '.join(changes['removed'][:10])}...")
                
                # Sauvegarder si pas en dry-run
                if not dry_run:
                    self.save_applicability(type_id, results)
        
        # Final summary
        print(f"\n{'='*60}")
        print("📊 FINAL SUMMARY")
        print(f"{'='*60}")
        
        for stat in all_stats:
            pct = 100 * stat['applicable'] // stat['total'] if stat['total'] else 0
            print(f"   {stat['type']:15} │ {stat['applicable']:3}/{stat['total']:3} ({pct:2}%) │ +{stat['added']} -{stat['removed']}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Evaluates norm applicability by product type')
    parser.add_argument('--type', type=int, help='Type ID to evaluate (otherwise all)')
    parser.add_argument('--pillar', choices=['S', 'A', 'F', 'E'], help='Pillar to evaluate')
    parser.add_argument('--save', action='store_true', help='Save results (otherwise dry-run)')
    parser.add_argument('--list-types', action='store_true', help='List available types')
    
    args = parser.parse_args()
    
    evaluator = TypeNormEvaluator()
    
    if args.list_types:
        evaluator.load_data()
        print("\nAvailable product types:")
        for tid, t in sorted(evaluator.product_types.items()):
            print(f"   {tid:3}: {t['code']:15} - {t['name']}")
        return
    
    print("\n" + "╔" + "═"*58 + "╗")
    print("║     🤖 SAFE SCORING - TYPE x NORM EVALUATOR              ║")
    print("║     Evaluates norm applicability by type               ║")
    print("╚" + "═"*58 + "╝")
    
    if args.type:
        evaluator.load_data()
        results = evaluator.evaluate_type(args.type, pillar=args.pillar)
        if results and args.save:
            evaluator.save_applicability(args.type, results)
    else:
        type_ids = [args.type] if args.type else None
        evaluator.run_full_evaluation(type_ids=type_ids, dry_run=not args.save)


if __name__ == '__main__':
    main()
