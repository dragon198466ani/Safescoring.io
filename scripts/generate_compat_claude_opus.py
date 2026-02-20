#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAFESCORING - Generate Product Compatibility with Claude Opus Analysis
=======================================================================
Uses Claude Opus to analyze each product pair and generate SAFE warnings.
Format: SITUATION → CAS EXTREME → SOLUTION

Run: python scripts/generate_compat_claude_opus.py [--limit N]
"""

import os
import sys
import requests
import time
import json
from datetime import datetime
from typing import Dict, List, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.core.config import SUPABASE_URL, get_supabase_headers, CLAUDE_API_KEY, GEMINI_API_KEYS


class ClaudeOpusCompatibility:
    """Generate product compatibility using Claude Opus for each analysis"""

    # Type code categories
    WALLET_HW = {'HW Cold'}
    WALLET_SW = {'SW Browser', 'SW Mobile', 'SW Desktop', 'Smart Wallet', 'MPC Wallet', 'MultiSig'}
    WALLET_ALL = WALLET_HW | WALLET_SW
    DEFI = {'DEX', 'DEX Agg', 'AMM', 'Lending', 'Yield', 'Derivatives', 'Liq Staking', 'DeFi Tools', 'Bridges'}
    BACKUP = {'Bkp Physical', 'Bkp Digital'}
    EXCHANGE = {'CEX'}

    def __init__(self):
        self.headers = get_supabase_headers()
        self.products = []
        self.product_types = {}
        self.product_type_mapping = {}
        self.type_compatibility = {}
        self.existing = set()
        self.stats = {'created': 0, 'errors': 0, 'api_calls': 0}

    def load_data(self):
        """Load data from Supabase"""
        print("[LOAD] Loading data...")

        # Load ALL products with pagination
        self.products = []
        offset = 0
        batch_size = 1000
        while True:
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug,url,type_id,description&offset={offset}&limit={batch_size}",
                headers=self.headers
            )
            if r.status_code != 200:
                break
            batch = r.json()
            if not batch:
                break
            self.products.extend(batch)
            offset += batch_size
            if len(batch) < batch_size:
                break
        print(f"   {len(self.products)} products loaded")

        r = requests.get(f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,category", headers=self.headers)
        self.product_types = {t['id']: t for t in r.json()} if r.status_code == 200 else {}

        r = requests.get(f"{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id", headers=self.headers)
        if r.status_code == 200:
            for m in r.json():
                if m['product_id'] not in self.product_type_mapping:
                    self.product_type_mapping[m['product_id']] = []
                self.product_type_mapping[m['product_id']].append(m['type_id'])

        for p in self.products:
            if p['id'] not in self.product_type_mapping and p.get('type_id'):
                self.product_type_mapping[p['id']] = [p['type_id']]

        r = requests.get(f"{SUPABASE_URL}/rest/v1/type_compatibility?select=*", headers=self.headers)
        if r.status_code == 200:
            for tc in r.json():
                self.type_compatibility[(tc['type_a_id'], tc['type_b_id'])] = tc
                self.type_compatibility[(tc['type_b_id'], tc['type_a_id'])] = tc

        # Load existing compatibilities
        offset = 0
        while True:
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/product_compatibility?select=product_a_id,product_b_id&offset={offset}&limit={batch_size}",
                headers=self.headers
            )
            if r.status_code != 200:
                break
            batch = r.json()
            if not batch:
                break
            for pc in batch:
                self.existing.add((pc['product_a_id'], pc['product_b_id']))
                self.existing.add((pc['product_b_id'], pc['product_a_id']))
            offset += batch_size
            if len(batch) < batch_size:
                break
        print(f"   {len(self.existing)//2} existing compatibilities")

    def get_type_codes(self, product: Dict) -> set:
        """Get type codes for a product"""
        type_ids = self.product_type_mapping.get(product['id'], [])
        return {self.product_types.get(tid, {}).get('code', '') for tid in type_ids}

    def get_type_name(self, codes: set) -> str:
        """Get human-readable type name"""
        if codes & self.WALLET_HW:
            return "Hardware Wallet (cold storage)"
        elif codes & self.WALLET_SW:
            return "Software Wallet"
        elif codes & self.DEFI:
            return "DeFi Protocol"
        elif codes & self.BACKUP:
            return "Physical Backup (seed storage)"
        elif codes & self.EXCHANGE:
            return "Centralized Exchange (CEX)"
        return list(codes)[0] if codes else "Unknown"

    def call_claude_opus(self, prompt: str, max_tokens: int = 2000) -> Optional[str]:
        """Call Claude Opus 4.5 via Claude Code CLI (FREE with subscription)"""
        import subprocess
        import tempfile

        try:
            # Write prompt to temp file to avoid command line length limits
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
                f.write(prompt)
                prompt_file = f.name

            try:
                # Use PowerShell to pipe file content to claude CLI via stdin
                claude_path = os.path.expanduser('~\\AppData\\Roaming\\npm\\claude.cmd')

                # Pipe the file content to claude via stdin
                ps_command = f'Get-Content -Path "{prompt_file}" -Raw | & "{claude_path}" -p - --output-format text'

                result = subprocess.run(
                    ['powershell', '-Command', ps_command],
                    capture_output=True,
                    text=True,
                    timeout=300,  # 5 min timeout
                    encoding='utf-8'
                )
            finally:
                try:
                    os.remove(prompt_file)
                except:
                    pass

            self.stats['api_calls'] += 1

            if result.returncode == 0 and result.stdout.strip():
                response = result.stdout.strip()
                print(f"      [CLAUDE-CODE] Opus 4.5 OK ({len(response)} chars)")
                return response
            elif result.stderr:
                stderr = result.stderr.strip()
                if 'rate limit' in stderr.lower():
                    print("      [CLAUDE-CODE] Rate limited - waiting 60s...")
                    time.sleep(60)
                    return self.call_claude_opus(prompt, max_tokens)
                print(f"      [CLAUDE-CODE] Error: {stderr[:200]}")
            else:
                print(f"      [CLAUDE-CODE] No response (returncode={result.returncode})")

        except subprocess.TimeoutExpired:
            print("      [CLAUDE-CODE] Timeout (5 min)")
        except FileNotFoundError:
            print("      [CLAUDE-CODE] CLI not found - install with: npm install -g @anthropic-ai/claude-code")
        except Exception as e:
            print(f"      [CLAUDE-CODE] Error: {e}")
        return None

    def analyze_with_claude(self, pa: Dict, pb: Dict) -> Optional[Dict]:
        """Use Claude Opus to analyze product compatibility"""
        codes_a = self.get_type_codes(pa)
        codes_b = self.get_type_codes(pb)
        type_a = self.get_type_name(codes_a)
        type_b = self.get_type_name(codes_b)

        prompt = f"""Tu es un expert en securite crypto qui conseille des utilisateurs lambda.
Analyse cette combinaison de 2 produits et genere des conseils SAFE specifiques.

PRODUIT A: {pa['name']}
- Type: {type_a}
- URL: {pa.get('url', 'N/A')}
- Description: {(pa.get('description') or '')[:300]}

PRODUIT B: {pb['name']}
- Type: {type_b}
- URL: {pb.get('url', 'N/A')}
- Description: {(pb.get('description') or '')[:300]}

GENERE 4 conseils au format STRICT suivant (JSON):

{{
  "safe_warning_s": "SECURITE (X/10) - SITUATION: [Action concrete que lutilisateur fait en utilisant les 2 produits ensemble]. CAS EXTREME: [Scenario catastrophe reel type hack, phishing]. SOLUTION: 1) [Reaction immediate] 2) [Action corrective] 3) Pour eviter: [Prevention specifique aux 2 produits]",

  "safe_warning_a": "ADVERSITE (X/10) - SITUATION: [Action concrete avec les 2 produits quand une attaque PHYSIQUE arrive]. CAS EXTREME: [Agression, vol, kidnapping, chantage, $5 wrench attack]. SOLUTION: 1) [Reaction - ex: wallet leurre, passphrase 25eme mot] 2) [Action immediate] 3) Pour eviter: [Prevention]",

  "safe_warning_f": "FIABILITE (X/10) - SITUATION: [Utilisation des 2 produits quand lun deux a un probleme]. CAS EXTREME: [Hack du protocole, faillite exchange type FTX, panne materielle]. SOLUTION: 1) [Reaction] 2) [Recovery avec seed BIP39] 3) Pour eviter: [Backup, diversification]",

  "safe_warning_e": "EFFICACITE (X/10) - SITUATION: [Action quotidienne entre les 2 produits]. OPTIMISATION: 1) [Nombre detapes] 2) [Reduire les frais - L2, timing] 3) [Gagner du temps] 4) [Conseil pratique]",

  "security_level": "HIGH/MEDIUM/LOW",
  "ai_confidence": 0.85,
  "ai_method": "[Comment utiliser {pa['name']} avec {pb['name']} en 1 phrase]"
}}

REGLES IMPORTANTES:
- SITUATION doit decrire lACTION CONCRETE que lutilisateur fait avec les 2 produits
- Pilier A (Adversite) = UNIQUEMENT attaques physiques humaines (pas de hacks techniques)
- Utilise les vrais noms des produits ({pa['name']}, {pb['name']})
- Inclus les URLs officielles quand pertinent
- Scores: S=securite technique, A=attaques physiques, F=fiabilite long terme, E=cout/temps
- Reponds UNIQUEMENT avec le JSON, pas de texte avant ou apres."""

        response = self.call_claude_opus(prompt)
        if not response:
            return None

        try:
            # Parse JSON from response
            json_match = response.strip()
            if json_match.startswith('```'):
                json_match = json_match.split('```')[1]
                if json_match.startswith('json'):
                    json_match = json_match[4:]
            data = json.loads(json_match)

            # Add default values
            data['type_compatible'] = True
            data['ai_compatible'] = True
            data['ai_confidence'] = data.get('ai_confidence', 0.85)
            data['ai_justification'] = f"Claude Opus analysis of {pa['name']} + {pb['name']}"
            data['analyzed_by'] = 'claude_opus_realtime'

            return data

        except json.JSONDecodeError as e:
            print(f"      JSON parse error: {e}")
            print(f"      Response: {response[:500]}")
            return None

    def save_compat(self, pa_id: int, pb_id: int, data: Dict) -> bool:
        """Save compatibility to database"""
        if pa_id > pb_id:
            pa_id, pb_id = pb_id, pa_id

        record = {
            'product_a_id': pa_id,
            'product_b_id': pb_id,
            'type_compatible': data.get('type_compatible', True),
            'ai_compatible': data.get('ai_compatible', True),
            'ai_confidence': data.get('ai_confidence', 0.85),
            'ai_method': (data.get('ai_method', '') or '')[:500],
            'ai_justification': (data.get('ai_justification', '') or '')[:500],
            'security_level': data.get('security_level', 'MEDIUM'),
            'safe_warning_s': (data.get('safe_warning_s', '') or '')[:500],
            'safe_warning_a': (data.get('safe_warning_a', '') or '')[:500],
            'safe_warning_f': (data.get('safe_warning_f', '') or '')[:500],
            'safe_warning_e': (data.get('safe_warning_e', '') or '')[:500],
            'analyzed_at': datetime.now().isoformat(),
            'analyzed_by': data.get('analyzed_by', 'claude_opus_realtime')
        }

        r = requests.post(f"{SUPABASE_URL}/rest/v1/product_compatibility", headers=self.headers, json=record)
        if r.status_code in [200, 201]:
            return True
        r = requests.patch(f"{SUPABASE_URL}/rest/v1/product_compatibility?product_a_id=eq.{pa_id}&product_b_id=eq.{pb_id}", headers=self.headers, json=record)
        return r.status_code in [200, 201, 204]

    def run(self, limit: int = None):
        """Generate compatibility with Claude Opus analysis"""
        print("""
====================================================================
  SAFESCORING - Claude Opus Product Compatibility Analysis
  Real-time SAFE analysis for each product pair
====================================================================
""")
        self.load_data()

        # Priority products
        priority = self.WALLET_HW | self.WALLET_SW | self.DEFI | self.BACKUP | self.EXCHANGE
        priority_products = [p for p in self.products if self.get_type_codes(p) & priority]
        print(f"[INFO] {len(priority_products)} priority products")

        pairs = []
        for i, pa in enumerate(priority_products):
            for pb in priority_products[i+1:]:
                if (pa['id'], pb['id']) not in self.existing:
                    pairs.append((pa, pb))

        if limit:
            pairs = pairs[:limit]
        print(f"[INFO] {len(pairs)} pairs to analyze with Claude Opus")

        for idx, (pa, pb) in enumerate(pairs):
            print(f"[{idx+1}/{len(pairs)}] {pa['name']} x {pb['name']}...")

            try:
                data = self.analyze_with_claude(pa, pb)
                if data and self.save_compat(pa['id'], pb['id'], data):
                    self.stats['created'] += 1
                    print(f"   OK - S={data.get('safe_warning_s', '')[:50]}...")
                else:
                    self.stats['errors'] += 1
            except Exception as e:
                print(f"   ERROR: {e}")
                self.stats['errors'] += 1

            # Rate limiting: 1 request per 2 seconds
            time.sleep(2)

        print(f"""
====================================================================
                         COMPLETED
====================================================================
  Created/Updated: {self.stats['created']:5}
  API Calls:       {self.stats['api_calls']:5}
  Errors:          {self.stats['errors']:5}
====================================================================
""")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=10, help='Number of pairs to analyze (default: 10)')
    args = parser.parse_args()

    gen = ClaudeOpusCompatibility()
    gen.run(limit=args.limit)
