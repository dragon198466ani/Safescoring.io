#!/usr/bin/env python3
"""
SAFESCORING.IO - Méthodologie SAFE™
Définitions complètes des piliers et analyse automatique d'applicabilité
"""

import os
import requests
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════════════
# MÉTHODOLOGIE SAFE SCORING™ - Évaluation Sécurité Crypto
# ═══════════════════════════════════════════════════════════════════════════════
#
# FORMULE: SAFE SCORE = (S × 25%) + (A × 25%) + (F × 25%) + (E × 25%)
#
# ═══════════════════════════════════════════════════════════════════════════════

SAFE_METHODOLOGY = {
    'name': 'SAFE SCORING™',
    'version': '1.0',
    'description': "Méthodologie d'Évaluation Sécurité Crypto",
    'formula': 'SAFE SCORE = (S × 25%) + (A × 25%) + (F × 25%) + (E × 25%)',
    
    'pillars': {
        'S': {
            'name': 'SECURITY',
            'full_name': 'S - SECURITY',
            'weight': 0.25,
            'weight_percent': '25%',
            'description': 'Protection cryptographique et sécurité des actifs',
            'keywords': [
                'AES-256', 'SHA-256', 'ECDSA', 'Secure Element', 
                'certifications EAL5+', 'multi-chaînes', 'multisig',
                'private key', 'seed phrase', 'encryption', 'HSM',
                'cold storage', 'air-gapped', 'tamper-proof', 'PIN',
                'biometric', 'hardware wallet', 'secure enclave'
            ],
            'criteria': [
                'Chiffrement des clés privées (AES-256 minimum)',
                'Algorithmes de signature (ECDSA, Ed25519)',
                'Élément sécurisé certifié (EAL5+ recommandé)',
                'Support multi-signatures',
                'Protection contre les attaques physiques',
                'Génération sécurisée des seeds (BIP39/BIP32)',
                'Isolation des clés (Secure Element, HSM)',
                'Authentification forte (PIN, biométrie)'
            ]
        },
        
        'A': {
            'name': 'ADVERSITY',
            'full_name': 'A - ADVERSITY',
            'weight': 0.25,
            'weight_percent': '25%',
            'description': 'Résistance aux attaques et situations adverses',
            'keywords': [
                'PIN duress', 'wipe automatique', 'hidden wallets',
                'dénégabilité plausible', 'time-locks', 'social recovery',
                'anti-phishing', 'anti-malware', 'brute force protection',
                'passphrase', 'decoy wallet', 'self-destruct'
            ],
            'criteria': [
                'PIN de contrainte (duress PIN)',
                'Effacement automatique après tentatives échouées',
                'Portefeuilles cachés (hidden wallets)',
                'Dénégabilité plausible',
                'Verrouillages temporels (time-locks)',
                'Récupération sociale (social recovery)',
                'Protection anti-phishing',
                'Détection de compromission'
            ]
        },
        
        'F': {
            'name': 'FIDELITY',
            'full_name': 'F - FIDELITY',
            'weight': 0.25,
            'weight_percent': '25%',
            'description': 'Durabilité, fiabilité et qualité de fabrication',
            'keywords': [
                'résistance température', '-40°C/+125°C', 'IP68',
                'feu >1000°C', 'corrosion', 'MIL-STD', 'qualité logicielle',
                'firmware updates', 'open source', 'audit', 'backup',
                'redundancy', 'MTBF', 'warranty'
            ],
            'criteria': [
                'Résistance température extrême (-40°C à +125°C)',
                'Étanchéité (IP68 ou supérieur)',
                'Résistance au feu (>1000°C pour backup)',
                'Résistance à la corrosion',
                'Conformité MIL-STD',
                'Qualité logicielle (audits, tests)',
                'Mises à jour firmware sécurisées',
                'Durée de vie garantie'
            ]
        },
        
        'E': {
            'name': 'EFFICIENCY',
            'full_name': 'E - EFFICIENCY',
            'weight': 0.25,
            'weight_percent': '25%',
            'description': 'Usabilité, accessibilité et expérience utilisateur',
            'keywords': [
                'support multi-chaînes', 'interface intuitive',
                'accessibilité WCAG', 'DeFi', 'dApps', 'documentation',
                'mobile app', 'desktop app', 'browser extension',
                'QR code', 'NFC', 'Bluetooth', 'USB-C'
            ],
            'criteria': [
                'Support multi-chaînes (Bitcoin, Ethereum, etc.)',
                'Interface utilisateur intuitive',
                'Accessibilité (conformité WCAG)',
                'Intégration DeFi/dApps',
                'Documentation complète',
                'Applications multi-plateformes',
                'Connectivité moderne (USB-C, NFC, Bluetooth)',
                'Temps de transaction optimisé'
            ]
        }
    },
    
    'score_categories': {
        'essential': {
            'name': 'Essential',
            'description': 'Normes critiques de base (17%)',
            'definition': 'Sécurité minimale requise pour tout utilisateur crypto',
            'target_count': 153,
            'by_pillar': {'S': 39, 'A': 35, 'F': 37, 'E': 42}
        },
        'consumer': {
            'name': 'Consumer', 
            'description': 'Normes grand public (38%)',
            'definition': 'Inclut Essential + features utiles pour utilisateurs standards',
            'target_count': 341,
            'by_pillar': {'S': 84, 'A': 80, 'F': 77, 'E': 100}
        },
        'full': {
            'name': 'Full',
            'description': 'Toutes les normes (100%)',
            'definition': 'Évaluation complète selon les 894 normes internationales',
            'target_count': 894,
            'by_pillar': {'S': 253, 'A': 192, 'F': 190, 'E': 259}
        }
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# TYPES DE PRODUITS ET OBJECTIFS
# ═══════════════════════════════════════════════════════════════════════════════

PRODUCT_TYPES = {
    'hardware_wallet': {
        'name': 'Hardware Wallet',
        'description': 'Portefeuille matériel pour stockage à froid',
        'objectives': {
            'primary': 'Sécurisation des clés privées hors ligne',
            'secondary': 'Signature sécurisée des transactions',
            'tertiary': 'Backup et récupération'
        },
        'pillar_relevance': {'S': 1.0, 'A': 0.9, 'F': 0.95, 'E': 0.7},
        'applicable_keywords': ['secure element', 'cold storage', 'seed', 'PIN', 'firmware']
    },
    'software_wallet': {
        'name': 'Software Wallet',
        'description': 'Portefeuille logiciel (mobile/desktop)',
        'objectives': {
            'primary': 'Gestion quotidienne des cryptos',
            'secondary': 'Interaction avec DeFi/dApps',
            'tertiary': 'Facilité d\'utilisation'
        },
        'pillar_relevance': {'S': 0.85, 'A': 0.7, 'F': 0.6, 'E': 0.95},
        'applicable_keywords': ['encryption', 'biometric', 'multi-chain', 'dApps', 'mobile']
    },
    'exchange': {
        'name': 'Exchange',
        'description': 'Plateforme d\'échange centralisée',
        'objectives': {
            'primary': 'Trading et conversion de cryptos',
            'secondary': 'Custody des fonds',
            'tertiary': 'Services financiers (staking, lending)'
        },
        'pillar_relevance': {'S': 0.9, 'A': 0.6, 'F': 0.7, 'E': 0.9},
        'applicable_keywords': ['2FA', 'KYC', 'insurance', 'cold storage', 'API']
    },
    'crypto_card': {
        'name': 'Crypto Card',
        'description': 'Carte de paiement crypto',
        'objectives': {
            'primary': 'Paiements en crypto dans le monde réel',
            'secondary': 'Conversion crypto-fiat',
            'tertiary': 'Cashback et récompenses'
        },
        'pillar_relevance': {'S': 0.8, 'A': 0.5, 'F': 0.7, 'E': 0.95},
        'applicable_keywords': ['payment', 'fiat', 'cashback', 'Visa', 'Mastercard']
    },
    'defi_protocol': {
        'name': 'DeFi Protocol',
        'description': 'Protocole de finance décentralisée',
        'objectives': {
            'primary': 'Services financiers décentralisés',
            'secondary': 'Yield farming et staking',
            'tertiary': 'Gouvernance'
        },
        'pillar_relevance': {'S': 0.95, 'A': 0.8, 'F': 0.6, 'E': 0.85},
        'applicable_keywords': ['smart contract', 'audit', 'TVL', 'governance', 'yield']
    },
    'custody_service': {
        'name': 'Custody Service',
        'description': 'Service de garde institutionnel',
        'objectives': {
            'primary': 'Garde sécurisée pour institutions',
            'secondary': 'Conformité réglementaire',
            'tertiary': 'Reporting et audit'
        },
        'pillar_relevance': {'S': 1.0, 'A': 0.95, 'F': 0.9, 'E': 0.6},
        'applicable_keywords': ['institutional', 'insurance', 'SOC2', 'compliance', 'HSM']
    },
    'backup_solution': {
        'name': 'Backup Solution',
        'description': 'Solution de sauvegarde (metal, paper)',
        'objectives': {
            'primary': 'Préservation long terme des seeds',
            'secondary': 'Résistance aux éléments',
            'tertiary': 'Discrétion et sécurité physique'
        },
        'pillar_relevance': {'S': 0.7, 'A': 0.8, 'F': 1.0, 'E': 0.4},
        'applicable_keywords': ['metal', 'fire resistant', 'waterproof', 'seed', 'backup']
    },
    'crypto_bank': {
        'name': 'Crypto Bank',
        'description': 'Banque crypto-friendly',
        'objectives': {
            'primary': 'Services bancaires pour crypto',
            'secondary': 'Pont fiat-crypto',
            'tertiary': 'Conformité et régulation'
        },
        'pillar_relevance': {'S': 0.9, 'A': 0.7, 'F': 0.8, 'E': 0.85},
        'applicable_keywords': ['bank', 'fiat', 'IBAN', 'regulated', 'insurance']
    }
}


# Configuration Supabase
def load_config():
    config = {}
    possible_paths = [
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


class SafeMethodologyManager:
    """Gère la méthodologie SAFE et l'applicabilité des normes"""
    
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        self.methodology = SAFE_METHODOLOGY
        self.product_types = PRODUCT_TYPES
    
    def sync_methodology_to_supabase(self):
        """Synchronise la méthodologie SAFE dans Supabase"""
        print("\n📚 SYNCHRONISATION MÉTHODOLOGIE SAFE")
        print("=" * 60)
        
        # Créer/Mettre à jour la table safe_methodology
        methodology_data = {
            'id': 1,
            'name': self.methodology['name'],
            'version': self.methodology['version'],
            'description': self.methodology['description'],
            'formula': self.methodology['formula'],
            'pillars': self.methodology['pillars'],
            'score_categories': self.methodology['score_categories'],
            'updated_at': datetime.now().isoformat()
        }
        
        # Upsert
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/safe_methodology",
            headers={**self.headers, 'Prefer': 'resolution=merge-duplicates'},
            json=methodology_data
        )
        
        if r.status_code in [200, 201, 204]:
            print("   ✅ Méthodologie SAFE synchronisée")
        else:
            print(f"   ⚠️ Erreur: {r.status_code} - {r.text}")
        
        return methodology_data
    
    def sync_product_types_to_supabase(self):
        """Synchronise les types de produits dans Supabase"""
        print("\n📦 SYNCHRONISATION TYPES DE PRODUITS")
        print("=" * 60)
        
        # Get existing types (structure: id, code, name, category)
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,category",
            headers=self.headers
        )
        existing_types = r.json() if r.status_code == 200 else []
        
        # Mapping des codes Supabase vers les définitions PRODUCT_TYPES
        # Les codes Supabase sont: HW Cold, HW Hot, SW Browser, SW Mobile, DEX, CEX, etc.
        code_mapping = {
            # Hardware Wallets
            'hw cold': 'hardware_wallet',
            'hw hot': 'hardware_wallet',
            # Software Wallets
            'sw browser': 'software_wallet',
            'sw mobile': 'software_wallet',
            # Exchanges
            'dex': 'defi_protocol',
            'cex': 'exchange',
            # DeFi
            'lending': 'defi_protocol',
            'yield': 'defi_protocol',
            'liq staking': 'defi_protocol',
            'derivatives': 'defi_protocol',
            'bridges': 'defi_protocol',
            'defi tools': 'defi_protocol',
            'rwa': 'defi_protocol',
            # Cards
            'card': 'crypto_card',
            'card non-cust': 'crypto_card',
            # Backup
            'bkp digital': 'backup_solution',
            'bkp physical': 'backup_solution',
            # Access Control
            'ac phys': 'custody_service',
            'ac digit': 'custody_service',
            'ac phygi': 'custody_service',
            # Bank
            'crypto bank': 'crypto_bank',
        }
        
        # Stocker les définitions dans self pour l'analyse d'applicabilité
        self.type_definitions = {}
        matched = 0
        
        for t in existing_types:
            type_id = t['id']
            code = t.get('code', '').lower().strip()
            
            # Chercher une correspondance exacte ou partielle
            definition_key = code_mapping.get(code)
            
            if definition_key and definition_key in self.product_types:
                self.type_definitions[type_id] = {
                    'code': code,
                    **self.product_types[definition_key]
                }
                matched += 1
            else:
                # Default values with low pillar_relevance = fewer applicable norms
                self.type_definitions[type_id] = {
                    'code': code,
                    'name': t.get('name', code),
                    'pillar_relevance': {'S': 0.5, 'A': 0.4, 'F': 0.4, 'E': 0.5},
                    'applicable_keywords': [],
                    'objectives': {
                        'primary': 'Service crypto',
                        'secondary': 'Sécurité',
                        'tertiary': 'Accessibilité'
                    }
                }
        
        print(f"   ✅ {len(existing_types)} types de produits chargés")
        print(f"   📊 {matched}/{len(existing_types)} types mappés avec définitions")
        return len(existing_types)
    
    def analyze_norm_applicability(self, norm, product_type_slug):
        """
        Analyse si une norme est applicable à un type de produit
        basé sur les objectifs et les mots-clés
        """
        if product_type_slug not in self.product_types:
            return True  # Par défaut applicable
        
        product_type = self.product_types[product_type_slug]
        norm_title = (norm.get('title') or '').lower()
        norm_desc = (norm.get('description') or '').lower()
        norm_pillar = norm.get('pillar', 'S')
        
        # Score d'applicabilité
        score = 0.0
        
        # 1. Pertinence du pilier pour ce type de produit
        pillar_relevance = product_type['pillar_relevance'].get(norm_pillar, 0.5)
        score += pillar_relevance * 0.4
        
        # 2. Correspondance des mots-clés
        keywords = product_type['applicable_keywords']
        keyword_matches = sum(1 for kw in keywords if kw.lower() in norm_title or kw.lower() in norm_desc)
        keyword_score = min(keyword_matches / 3, 1.0)  # Max 1.0 si 3+ matches
        score += keyword_score * 0.3
        
        # 3. Correspondance avec les objectifs
        objectives_text = ' '.join([
            product_type['objectives']['primary'],
            product_type['objectives']['secondary'],
            product_type['objectives']['tertiary']
        ]).lower()
        
        # Mots communs entre norme et objectifs
        norm_words = set((norm_title + ' ' + norm_desc).split())
        objective_words = set(objectives_text.split())
        common_words = norm_words & objective_words
        objective_score = min(len(common_words) / 5, 1.0)
        score += objective_score * 0.3
        
        # Applicable si score >= 0.3
        return score >= 0.3
    
    def analyze_norm_applicability_by_id(self, norm, type_id):
        """
        Analyse si une norme est applicable à un type de produit (par ID)
        basé sur les objectifs, mots-clés et exclusions spécifiques
        """
        if not hasattr(self, 'type_definitions') or type_id not in self.type_definitions:
            return True  # Par défaut applicable
        
        product_type = self.type_definitions[type_id]
        norm_title = (norm.get('title') or '').lower()
        norm_desc = (norm.get('description') or '').lower()
        norm_pillar = norm.get('pillar', 'S')
        norm_text = norm_title + ' ' + norm_desc
        
        # Exclusions spécifiques par type de produit
        exclusion_keywords = {
            'hardware_wallet': ['smart contract', 'defi', 'lending', 'yield', 'staking', 'liquidity', 'swap', 'dex', 'cex', 'exchange', 'trading', 'kyc', 'bank', 'fiat', 'card', 'payment'],
            'software_wallet': ['secure element', 'tamper', 'physical', 'metal', 'fire', 'water', 'temperature', 'hardware', 'chip'],
            'exchange': ['secure element', 'hardware', 'seed phrase', 'recovery phrase', 'metal backup', 'physical'],
            'defi_protocol': ['secure element', 'hardware', 'physical', 'tamper', 'metal', 'kyc', 'bank', 'fiat', 'card'],
            'crypto_card': ['secure element', 'seed phrase', 'defi', 'smart contract', 'liquidity', 'staking'],
            'backup_solution': ['smart contract', 'defi', 'trading', 'exchange', 'kyc', 'bank', 'software', 'app', 'mobile', 'browser'],
            'custody_service': ['defi', 'swap', 'yield', 'liquidity', 'dex'],
            'crypto_bank': ['defi', 'smart contract', 'liquidity', 'yield farming', 'dex'],
        }
        
        # Vérifier les exclusions
        product_type_key = None
        for key in ['hardware_wallet', 'software_wallet', 'exchange', 'defi_protocol', 'crypto_card', 'backup_solution', 'custody_service', 'crypto_bank']:
            if product_type.get('name', '').lower() == self.product_types.get(key, {}).get('name', '').lower():
                product_type_key = key
                break
        
        if product_type_key and product_type_key in exclusion_keywords:
            for excl in exclusion_keywords[product_type_key]:
                if excl in norm_text:
                    return False  # Norme exclue pour ce type
        
        # Score d'applicabilité
        score = 0.0
        
        # 1. Pertinence du pilier pour ce type de produit (poids réduit)
        pillar_relevance = product_type.get('pillar_relevance', {}).get(norm_pillar, 0.5)
        score += pillar_relevance * 0.3
        
        # 2. Correspondance des mots-clés (poids augmenté)
        keywords = product_type.get('applicable_keywords', [])
        keyword_matches = sum(1 for kw in keywords if kw.lower() in norm_text)
        keyword_score = min(keyword_matches / 2, 1.0) if keywords else 0.3
        score += keyword_score * 0.4
        
        # 3. Correspondance avec les objectifs
        objectives = product_type.get('objectives', {})
        objectives_text = ' '.join([
            objectives.get('primary', ''),
            objectives.get('secondary', ''),
            objectives.get('tertiary', '')
        ]).lower()
        
        # Mots communs entre norme et objectifs
        norm_words = set(norm_text.split())
        objective_words = set(objectives_text.split())
        common_words = norm_words & objective_words
        objective_score = min(len(common_words) / 3, 1.0) if objective_words else 0.3
        score += objective_score * 0.3
        
        # Applicable si score >= 0.5 (seuil plus élevé)
        return score >= 0.5
    
    def update_all_applicability(self, use_ai=True):
        """
        Met à jour l'applicabilité de toutes les normes pour tous les types.
        Utilise l'IA pour analyser si chaque norme est applicable à chaque type.
        """
        print("\n🔄 MISE À JOUR APPLICABILITÉ DES NORMES (IA)")
        print("=" * 60)
        
        # Charger les normes
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code,title,description,pillar",
            headers=self.headers
        )
        norms = r.json() if r.status_code == 200 else []
        print(f"   📋 {len(norms)} normes chargées")
        
        # Charger les types de produits AVEC leurs descriptions depuis Supabase
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,description,advantages,disadvantages",
            headers=self.headers
        )
        types = r.json() if r.status_code == 200 else []
        print(f"   📦 {len(types)} types de produits")
        
        if not types:
            print("   ⚠️ Aucun type de produit trouvé")
            return 0
        
        # Analyser et mettre à jour
        total_updates = 0
        
        for product_type in types:
            type_id = product_type['id']
            type_code = product_type.get('code', '')
            type_name = product_type.get('name', type_code)
            type_desc = product_type.get('description') or ''
            type_advantages = product_type.get('advantages') or ''
            type_disadvantages = product_type.get('disadvantages') or ''
            
            print(f"\n   🔍 Analyse: {type_code} ({type_name})")
            
            # Grouper les normes par pilier pour batch IA
            norms_by_pillar = {'S': [], 'A': [], 'F': [], 'E': []}
            for norm in norms:
                pillar = norm.get('pillar', 'S')
                if pillar in norms_by_pillar:
                    norms_by_pillar[pillar].append(norm)
            
            type_applicable = 0
            batch_data = []
            
            # Analyser par batch de 50 normes avec l'IA
            for pillar, pillar_norms in norms_by_pillar.items():
                batch_size = 50
                for i in range(0, len(pillar_norms), batch_size):
                    batch = pillar_norms[i:i+batch_size]
                    
                    if use_ai:
                        results = self.analyze_applicability_batch_ai(
                            batch, type_code, type_name, type_desc, 
                            type_advantages, type_disadvantages, pillar
                        )
                    else:
                        # Fallback sans IA
                        results = {n['code']: True for n in batch}
                    
                    for norm in batch:
                        is_applicable = results.get(norm['code'], True)
                        if is_applicable:
                            type_applicable += 1
                        
                        batch_data.append({
                            'norm_id': norm['id'],
                            'type_id': type_id,
                            'is_applicable': is_applicable
                        })
            
            # Upsert par batch
            r = requests.post(
                f"{SUPABASE_URL}/rest/v1/norm_applicability",
                headers={**self.headers, 'Prefer': 'resolution=merge-duplicates'},
                json=batch_data
            )
            if r.status_code in [200, 201, 204]:
                total_updates += len(batch_data)
            
            pct = type_applicable * 100 // len(norms) if norms else 0
            print(f"      📊 {type_applicable:>3}/{len(norms)} normes applicables ({pct}%)")
        
        print(f"\n   ✅ {total_updates} règles d'applicabilité mises à jour")
        return total_updates
    
    def analyze_applicability_batch_ai(self, norms_batch, type_code, type_name, type_desc, type_advantages, type_disadvantages, pillar):
        """
        Utilise l'IA pour analyser si un batch de normes est applicable à un type de produit.
        """
        import re
        
        # Construire le prompt
        norms_list = "\n".join([
            f"- {n['code']}: {n.get('title', '')} - {(n.get('description') or '')[:100]}"
            for n in norms_batch
        ])
        
        prompt = f"""Tu es un expert en sécurité crypto. Analyse si chaque norme de sécurité est APPLICABLE à ce type de produit.

TYPE DE PRODUIT: {type_code} - {type_name}
DESCRIPTION: {type_desc}
CARACTÉRISTIQUES: {type_advantages}
LIMITES: {type_disadvantages}

NORMES À ANALYSER (Pilier {pillar}):
{norms_list}

RÈGLES D'APPLICABILITÉ:
- Une norme est APPLICABLE (YES) si elle peut techniquement s'appliquer à ce type de produit
- Une norme est NON-APPLICABLE (NO) si elle concerne une fonctionnalité que ce type de produit NE PEUT PAS avoir

EXEMPLES:
- "Secure Element certification" → NO pour Software Wallet (pas de hardware)
- "Smart contract audit" → NO pour Hardware Wallet (pas de smart contracts)
- "Seed phrase backup" → NO pour CEX (pas de self-custody)
- "KYC verification" → NO pour DEX (décentralisé, pas de KYC)
- "Fire resistance" → NO pour Software Wallet (pas de composant physique)

RÉPONDS UNIQUEMENT avec le format:
CODE: YES ou NO

Exemple:
S-001: YES
S-002: NO
S-003: YES
"""

        # Appeler l'IA (Mistral ou Gemini)
        try:
            response = self.call_ai_api(prompt)
            return self.parse_applicability_response(response, norms_batch)
        except Exception as e:
            print(f"      ⚠️ Erreur IA: {e}")
            # Fallback: tout applicable
            return {n['code']: True for n in norms_batch}
    
    def call_ai_api(self, prompt):
        """Appelle l'API Mistral ou Gemini"""
        # Essayer Mistral d'abord
        mistral_key = CONFIG.get('MISTRAL_API_KEY', '')
        if mistral_key:
            try:
                r = requests.post(
                    "https://api.mistral.ai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {mistral_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "mistral-small-latest",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.1,
                        "max_tokens": 4000
                    },
                    timeout=60
                )
                if r.status_code == 200:
                    return r.json()['choices'][0]['message']['content']
            except Exception as e:
                print(f"      Mistral error: {e}")
        
        # Fallback Gemini
        gemini_key = CONFIG.get('GEMINI_API_KEY', '')
        if gemini_key:
            try:
                r = requests.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}",
                    headers={"Content-Type": "application/json"},
                    json={"contents": [{"parts": [{"text": prompt}]}]},
                    timeout=60
                )
                if r.status_code == 200:
                    return r.json()['candidates'][0]['content']['parts'][0]['text']
            except Exception as e:
                print(f"      Gemini error: {e}")
        
        return ""
    
    def parse_applicability_response(self, response, norms_batch):
        """Parse la réponse de l'IA pour extraire YES/NO par norme"""
        import re
        
        results = {}
        
        for norm in norms_batch:
            code = norm['code']
            # Chercher le pattern "CODE: YES" ou "CODE: NO"
            pattern = rf'{re.escape(code)}[:\s]*(YES|NO|OUI|NON)'
            match = re.search(pattern, response, re.IGNORECASE)
            
            if match:
                answer = match.group(1).upper()
                results[code] = answer in ['YES', 'OUI']
            else:
                # Par défaut applicable si pas trouvé
                results[code] = True
        
        return results
    
    def sync_norm_definitions(self):
        """Synchronise les définitions Essential/Consumer dans les normes"""
        print("\n🎯 SYNCHRONISATION DÉFINITIONS ESSENTIAL/CONSUMER")
        print("=" * 60)
        
        # Charger les normes par pilier
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar&order=pillar.asc,code.asc",
            headers=self.headers
        )
        norms = r.json() if r.status_code == 200 else []
        
        # Grouper par pilier
        by_pillar = {'S': [], 'A': [], 'F': [], 'E': []}
        for norm in norms:
            pillar = norm.get('pillar', 'S')
            if pillar in by_pillar:
                by_pillar[pillar].append(norm)
        
        # Définir Essential et Consumer selon les quotas
        essential_ids = set()
        consumer_ids = set()
        
        categories = self.methodology['score_categories']
        
        for pillar in ['S', 'A', 'F', 'E']:
            pillar_norms = by_pillar[pillar]
            
            essential_count = categories['essential']['by_pillar'][pillar]
            consumer_count = categories['consumer']['by_pillar'][pillar]
            
            for norm in pillar_norms[:essential_count]:
                essential_ids.add(norm['id'])
            
            for norm in pillar_norms[:consumer_count]:
                consumer_ids.add(norm['id'])
        
        print(f"   🎯 Essential: {len(essential_ids)}, Consumer: {len(consumer_ids)}")
        
        # Reset all
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/norms?id=gt.0",
            headers=self.headers,
            json={'is_essential': False, 'consumer': False, 'full': True}
        )
        
        # Update Consumer
        for norm_id in consumer_ids:
            requests.patch(
                f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}",
                headers=self.headers,
                json={'consumer': True}
            )
        
        # Update Essential
        for norm_id in essential_ids:
            requests.patch(
                f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}",
                headers=self.headers,
                json={'is_essential': True}
            )
        
        print(f"   ✅ Définitions synchronisées")
        return {'essential': len(essential_ids), 'consumer': len(consumer_ids)}
    
    def run_full_sync(self):
        """Exécute une synchronisation complète"""
        print("""
╔══════════════════════════════════════════════════════════════╗
║     🔐 SAFE SCORING - SYNCHRONISATION MÉTHODOLOGIE           ║
╚══════════════════════════════════════════════════════════════╝
""")
        
        # 1. Méthodologie
        self.sync_methodology_to_supabase()
        
        # 2. Types de produits
        self.sync_product_types_to_supabase()
        
        # 3. Définitions Essential/Consumer
        self.sync_norm_definitions()
        
        # 4. Applicabilité
        self.update_all_applicability()
        
        print("""
╔══════════════════════════════════════════════════════════════╗
║                    ✅ SYNCHRONISATION TERMINÉE               ║
╚══════════════════════════════════════════════════════════════╝
""")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='SAFE Methodology Manager')
    parser.add_argument('--sync', action='store_true', help='Synchronisation complète')
    parser.add_argument('--methodology', action='store_true', help='Sync méthodologie uniquement')
    parser.add_argument('--applicability', action='store_true', help='Sync applicabilité uniquement')
    parser.add_argument('--definitions', action='store_true', help='Sync définitions Essential/Consumer')
    
    args = parser.parse_args()
    
    manager = SafeMethodologyManager()
    
    if args.sync:
        manager.run_full_sync()
    elif args.methodology:
        manager.sync_methodology_to_supabase()
    elif args.applicability:
        manager.update_all_applicability()
    elif args.definitions:
        manager.sync_norm_definitions()
    else:
        # Par défaut, sync complet
        manager.run_full_sync()


if __name__ == "__main__":
    main()
