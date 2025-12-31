#!/usr/bin/env python3
"""
SAFESCORING.IO - AI Norm Classifier

This module uses AI to automatically classify new norms:
- is_essential: Critical norm for basic security
- is_consumer: Relevant norm for consumer users  
- is_full: Always TRUE (all norms)

The AI analyzes the norm description and determines its classification
based on definitions stored in the consumer_type_definitions table.

Workflow:
1. Load definitions from consumer_type_definitions table
2. For each norm, AI uses these definitions to determine TRUE/FALSE
3. Save result to safe_scoring_definitions table
"""

import os
import sys
import json
import requests
from datetime import datetime
from typing import Dict, Optional, Tuple

# Configuration
def load_config():
    """Load configuration from env file"""
    config = {}
    possible_paths = [
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', '.env'),
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', 'env_template_free.txt'),
        os.path.join(os.path.dirname(__file__), 'config', '.env'),
    ]
    
    config_path = None
    for path in possible_paths:
        if os.path.exists(path):
            config_path = path
            break
    
    if not config_path:
        print("\u274c Configuration file not found!")
        return config
    
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


class NormClassifier:
    """
    AI Classifier for SAFE norms.
    
    Automatically determines if a norm is:
    - Essential: Critical for basic security (17% of norms)
    - Consumer: Relevant for consumer users (38% of norms)
    - Full: Always TRUE (100% of norms)
    
    Uses definitions from consumer_type_definitions table in Supabase.
    """
    
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        
        # Load definitions from database
        self.type_definitions = self._load_type_definitions()
        
        # Fallback criteria if database not available
        self.CLASSIFICATION_CRITERIA = {
            'essential': {
                'description': 'Critical norm for basic security',
                'keywords': [
                    'sécurité', 'security', 'authentification', 'authentication',
                    'chiffrement', 'encryption', 'clé privée', 'private key',
                    'seed phrase', 'backup', 'sauvegarde', 'mot de passe', 'password',
                    '2FA', 'MFA', 'biométrie', 'biometric', 'audit', 'certification',
                    'vulnérabilité', 'vulnerability', 'hack', 'breach', 'faille',
                    'protection', 'firewall', 'intrusion', 'malware', 'phishing'
                ],
                'pillar_priority': {'S': 0.4, 'A': 0.2, 'F': 0.2, 'E': 0.2}
            },
            'consumer': {
                'description': 'Relevant norm for consumer users',
                'keywords': [
                    'utilisateur', 'user', 'interface', 'UI', 'UX', 'simple',
                    'facile', 'easy', 'accessible', 'débutant', 'beginner',
                    'tutoriel', 'tutorial', 'guide', 'support', 'aide', 'help',
                    'mobile', 'app', 'application', 'notification', 'alerte',
                    'transaction', 'envoi', 'réception', 'achat', 'vente',
                    'portefeuille', 'wallet', 'solde', 'balance', 'historique'
                ],
                'pillar_priority': {'S': 0.25, 'A': 0.25, 'F': 0.25, 'E': 0.25}
            }
        }
    
    def _load_type_definitions(self) -> Dict:
        """
        Load ESSENTIAL/CONSUMER/FULL definitions from consumer_type_definitions table.
        
        Returns:
            Dict with type_code as key and definition data as value
        """
        try:
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/consumer_type_definitions?is_active=eq.true&order=priority_order.asc",
                headers=self.headers
            )
            
            if r.status_code == 200:
                definitions = {}
                for row in r.json():
                    definitions[row['type_code']] = {
                        'name': row['type_name'],
                        'definition': row['definition'],
                        'target_audience': row.get('target_audience', ''),
                        'inclusion_criteria': row.get('inclusion_criteria', []),
                        'exclusion_criteria': row.get('exclusion_criteria', []),
                        'keywords': row.get('keywords', []),
                        'negative_keywords': row.get('negative_keywords', []),
                        'target_percentage': row.get('target_percentage', 100),
                        'priority_order': row.get('priority_order', 3)
                    }
                print(f"   ✅ Loaded {len(definitions)} type definitions from database")
                return definitions
        except Exception as e:
            print(f"   ⚠️ Could not load definitions from DB: {e}")
        
        return {}
    
    def _init_headers(self):
        """Initialize headers (legacy method for compatibility)"""
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    
    def get_type_definitions(self) -> Dict:
        """
        Get the current type definitions.
        
        Returns:
            Dict with definitions for essential, consumer, full
        """
        if self.type_definitions:
            return self.type_definitions
        return {
            'essential': {'definition': 'Critical norm for basic security', 'keywords': self.CLASSIFICATION_CRITERIA['essential']['keywords']},
            'consumer': {'definition': 'Relevant norm for consumer users', 'keywords': self.CLASSIFICATION_CRITERIA['consumer']['keywords']},
            'full': {'definition': 'All norms', 'keywords': []}
        }
    
    def classify_norm(self, norm: Dict) -> Dict:
        """
        Classify a norm using AI.
        
        Args:
            norm: Dict with id, code, pillar, title, description
            
        Returns:
            Dict with is_essential, is_consumer, is_full, reason, confidence
        """
        # Build prompt for AI
        prompt = self._build_classification_prompt(norm)
        
        # Try Mistral first
        result = None
        ai_service = None
        
        if MISTRAL_API_KEY:
            result = self._call_mistral(prompt)
            ai_service = 'ai_mistral'
        
        # Fallback to Gemini
        if not result and GEMINI_API_KEY:
            result = self._call_gemini(prompt)
            ai_service = 'ai_gemini'
        
        # If no AI available, use heuristic
        if not result:
            result = self._heuristic_classification(norm)
            ai_service = 'heuristic'
        
        result['classification_method'] = ai_service
        result['is_full'] = True  # Always TRUE
        
        return result
    
    def _build_classification_prompt(self, norm: Dict) -> str:
        """Build prompt for AI classification using definitions from database"""
        
        # Get definitions from database or fallback
        defs = self.get_type_definitions()
        
        essential_def = defs.get('essential', {})
        consumer_def = defs.get('consumer', {})
        
        # Build criteria text from database definitions
        essential_criteria = essential_def.get('inclusion_criteria', [])
        essential_keywords = essential_def.get('keywords', [])
        consumer_criteria = consumer_def.get('inclusion_criteria', [])
        consumer_keywords = consumer_def.get('keywords', [])
        
        return f"""You are an expert in crypto security and norm classification.

NORM TO CLASSIFY:
- Code: {norm.get('code', 'N/A')}
- Pillar: {norm.get('pillar', 'N/A')} (S=Security, A=Availability, F=Financial, E=Environmental)
- Title: {norm.get('title', 'N/A')}
- Description: {norm.get('description', 'N/A')}

=== CLASSIFICATION DEFINITIONS (from database) ===

1. ESSENTIAL (is_essential = TRUE if norm matches):
   Definition: {essential_def.get('definition', 'Critical norm for basic security')}
   Target: {essential_def.get('target_audience', 'All users')}
   Target percentage: ~{essential_def.get('target_percentage', 17)}% of norms
   
   Inclusion criteria (norm should match at least one):
   {chr(10).join(f'   - {c}' for c in essential_criteria) if essential_criteria else '   - Security of user funds, protection against hacks, audits, critical risks'}
   
   Keywords suggesting ESSENTIAL:
   {', '.join(essential_keywords[:15]) if essential_keywords else 'sécurité, audit, custody, clés, hack, exploit, fonds, critique'}

2. CONSUMER (is_consumer = TRUE if norm matches):
   Definition: {consumer_def.get('definition', 'Relevant norm for consumer users')}
   Target: {consumer_def.get('target_audience', 'General public users')}
   Target percentage: ~{consumer_def.get('target_percentage', 38)}% of norms
   
   Inclusion criteria (norm should match at least one):
   {chr(10).join(f'   - {c}' for c in consumer_criteria) if consumer_criteria else '   - Ease of use, fee transparency, customer support, clear documentation'}
   
   Keywords suggesting CONSUMER:
   {', '.join(consumer_keywords[:15]) if consumer_keywords else 'utilisateur, frais, support, documentation, simple, accessible'}

IMPORTANT RULES:
- Essential norms are generally also Consumer (if is_essential=true, is_consumer should usually be true)
- is_full is ALWAYS true (not asked here)
- Be conservative: only mark as Essential if truly critical for security

QUESTION: Based on the definitions above, is this norm Essential and/or Consumer?

Respond EXACTLY in this JSON format:
{{
    "is_essential": true/false,
    "is_consumer": true/false,
    "reason": "Short explanation (max 100 characters)",
    "confidence": 0.0-1.0,
    "security_impact": 1-5,
    "user_relevance": 1-5
}}
"""
    
    def _call_mistral(self, prompt: str) -> Optional[Dict]:
        """Mistral API call for classification"""
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
                    'max_tokens': 200,
                    'response_format': {'type': 'json_object'}
                },
                timeout=30
            )
            
            if r.status_code == 200:
                content = r.json()['choices'][0]['message']['content']
                return self._parse_ai_response(content)
        except Exception as e:
            print(f"   ⚠️ Mistral error: {e}")
        return None
    
    def _call_gemini(self, prompt: str) -> Optional[Dict]:
        """Gemini API call for classification"""
        try:
            r = requests.post(
                f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}',
                headers={'Content-Type': 'application/json'},
                json={
                    'contents': [{'parts': [{'text': prompt}]}],
                    'generationConfig': {
                        'temperature': 0.1,
                        'maxOutputTokens': 200,
                        'responseMimeType': 'application/json'
                    }
                },
                timeout=30
            )
            
            if r.status_code == 200:
                content = r.json()['candidates'][0]['content']['parts'][0]['text']
                return self._parse_ai_response(content)
        except Exception as e:
            print(f"   ⚠️ Gemini error: {e}")
        return None
    
    def _parse_ai_response(self, content: str) -> Optional[Dict]:
        """Parse AI JSON response"""
        try:
            # Clean content
            content = content.strip()
            if content.startswith('```json'):
                content = content[7:]
            if content.startswith('```'):
                content = content[3:]
            if content.endswith('```'):
                content = content[:-3]
            
            data = json.loads(content)
            
            return {
                'is_essential': bool(data.get('is_essential', False)),
                'is_consumer': bool(data.get('is_consumer', False)),
                'reason': str(data.get('reason', ''))[:200],
                'confidence': float(data.get('confidence', 0.8)),
                'security_impact': int(data.get('security_impact', 3)),
                'user_relevance': int(data.get('user_relevance', 3))
            }
        except Exception as e:
            print(f"   ⚠️ Parsing error: {e}")
        return None
    
    def _heuristic_classification(self, norm: Dict) -> Dict:
        """Heuristic classification based on keywords"""
        title = (norm.get('title', '') or '').lower()
        description = (norm.get('description', '') or '').lower()
        pillar = norm.get('pillar', 'S')
        text = f"{title} {description}"
        
        # Count Essential keywords
        essential_score = 0
        for keyword in self.CLASSIFICATION_CRITERIA['essential']['keywords']:
            if keyword.lower() in text:
                essential_score += 1
        
        # Count Consumer keywords
        consumer_score = 0
        for keyword in self.CLASSIFICATION_CRITERIA['consumer']['keywords']:
            if keyword.lower() in text:
                consumer_score += 1
        
        # Bonus for S pillar (Security)
        if pillar == 'S':
            essential_score += 2
        
        # Determine classifications
        is_essential = essential_score >= 2
        is_consumer = consumer_score >= 1 or is_essential  # Essential implies Consumer
        
        # Calculate confidence
        max_score = max(essential_score, consumer_score, 1)
        confidence = min(0.5 + (max_score * 0.1), 0.9)
        
        return {
            'is_essential': is_essential,
            'is_consumer': is_consumer,
            'reason': f'Heuristic: {essential_score} essential keywords, {consumer_score} consumer',
            'confidence': confidence,
            'security_impact': min(essential_score + 1, 5),
            'user_relevance': min(consumer_score + 1, 5)
        }
    
    def classify_and_save(self, norm: Dict) -> Dict:
        """
        Classify a norm and save to safe_scoring_definitions.
        
        Args:
            norm: Dict with id, code, pillar, title, description
            
        Returns:
            Dict with classification result
        """
        print(f"   🔍 Classifying {norm.get('code', 'N/A')}...")
        
        # Classify
        result = self.classify_norm(norm)
        
        # Apply hierarchy: Essential ⊂ Consumer ⊂ Full
        # If Essential=True, then Consumer must be True
        # If Consumer=True, then Full must be True (always True anyway)
        is_essential = result['is_essential']
        is_consumer = result['is_consumer']
        
        # Enforce hierarchy: Essential implies Consumer
        if is_essential:
            is_consumer = True
        
        # Prepare data for Supabase
        definition_data = {
            'norm_id': norm['id'],
            'is_essential': is_essential,
            'is_consumer': is_consumer,
            'is_full': True,  # All norms are Full by default
            'classification_method': result['classification_method'],
            'classification_reason': result.get('reason', ''),
            'classification_confidence': result.get('confidence', 0.8),
            'classified_at': datetime.now().isoformat(),
            'classified_by': 'system_auto',
            'criteria_security_impact': result.get('security_impact', 3),
            'criteria_user_relevance': result.get('user_relevance', 3),
            'criteria_complexity': 3  # Default value
        }
        
        # Save to safe_scoring_definitions (upsert)
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/safe_scoring_definitions",
            headers={**self.headers, 'Prefer': 'resolution=merge-duplicates,return=representation'},
            json=definition_data
        )
        
        if r.status_code in [200, 201]:
            status = "✅"
        else:
            # Try update if insert fails
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/safe_scoring_definitions?norm_id=eq.{norm['id']}",
                headers=self.headers,
                json=definition_data
            )
            status = "🔄" if r.status_code in [200, 204] else "❌"
        
        essential_flag = "🔴" if result['is_essential'] else "⚪"
        consumer_flag = "🟡" if result['is_consumer'] else "⚪"
        
        print(f"   {status} {norm.get('code')}: Essential={essential_flag} Consumer={consumer_flag} ({result['classification_method']})")
        
        return result
    
    def classify_all_unclassified(self, limit: int = None) -> int:
        """
        Classify all norms that don't have a definition yet.
        
        Args:
            limit: Maximum number of norms to classify
            
        Returns:
            Number of classified norms
        """
        print("\n🤖 AUTOMATIC NORM CLASSIFICATION")
        print("=" * 60)
        
        # Get norms without definition
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,description&order=pillar.asc,code.asc",
            headers=self.headers
        )
        all_norms = r.json() if r.status_code == 200 else []
        
        # Get already classified norms
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/safe_scoring_definitions?select=norm_id",
            headers=self.headers
        )
        classified_ids = {d['norm_id'] for d in (r.json() if r.status_code == 200 else [])}
        
        # Filter unclassified
        unclassified = [n for n in all_norms if n['id'] not in classified_ids]
        
        if limit:
            unclassified = unclassified[:limit]
        
        print(f"   📋 {len(all_norms)} total norms")
        print(f"   ✅ {len(classified_ids)} already classified")
        print(f"   🔍 {len(unclassified)} to classify")
        
        if not unclassified:
            print("\n   ✅ All norms are already classified!")
            return 0
        
        # Classify each norm
        classified_count = 0
        for i, norm in enumerate(unclassified):
            print(f"\n[{i+1}/{len(unclassified)}]", end="")
            try:
                self.classify_and_save(norm)
                classified_count += 1
            except Exception as e:
                print(f"   ❌ Error: {e}")
        
        print(f"\n✅ {classified_count} norms classified")
        return classified_count
    
    def reclassify_norm(self, norm_id: int) -> Dict:
        """
        Reclassify a specific norm (force re-evaluation).
        
        Args:
            norm_id: ID of norm to reclassify
            
        Returns:
            Dict with classification result
        """
        # Get the norm
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}&select=id,code,pillar,title,description",
            headers=self.headers
        )
        
        if r.status_code != 200 or not r.json():
            raise ValueError(f"Norm {norm_id} not found")
        
        norm = r.json()[0]
        return self.classify_and_save(norm)
    
    def get_classification_stats(self) -> Dict:
        """Return classification statistics"""
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/v_definition_stats_by_pillar",
            headers=self.headers
        )
        
        if r.status_code == 200:
            return r.json()
        return {}


def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='SAFE SCORING - AI Norm Classification')
    parser.add_argument('--all', action='store_true', help='Classify all unclassified norms')
    parser.add_argument('--limit', type=int, default=None, help='Limit of norms to classify')
    parser.add_argument('--norm-id', type=int, help='Reclassify a specific norm by ID')
    parser.add_argument('--stats', action='store_true', help='Show classification statistics')
    
    args = parser.parse_args()
    
    classifier = NormClassifier()
    
    if args.stats:
        print("\n📊 CLASSIFICATION STATISTICS")
        print("=" * 60)
        stats = classifier.get_classification_stats()
        for row in stats:
            print(f"   Pillar {row['pillar']}: {row['total_norms']} norms | "
                  f"Essential: {row['essential_count']} ({row['essential_pct']}%) | "
                  f"Consumer: {row['consumer_count']} ({row['consumer_pct']}%)")
    
    elif args.norm_id:
        print(f"\n🔄 RECLASSIFYING NORM {args.norm_id}")
        result = classifier.reclassify_norm(args.norm_id)
        print(f"   Result: Essential={result['is_essential']}, Consumer={result['is_consumer']}")
    
    elif args.all:
        classifier.classify_all_unclassified(limit=args.limit)
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
