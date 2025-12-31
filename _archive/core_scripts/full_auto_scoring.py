#!/usr/bin/env python3
"""
SAFESCORING.IO - Full Auto Scoring
Script unique qui:
1. Évalue automatiquement TOUS les produits sur TOUTES les normes (YES/NO)
2. Calcule les 3 scores SAFE: Full, Consumer, Essential
"""

import os
import sys
import json
import requests
import time
from datetime import datetime

# Configuration
def load_config():
    config = {}
    # Chercher le fichier de config dans plusieurs emplacements
    possible_paths = [
        os.path.join(os.path.dirname(__file__), 'env_template_free.txt'),
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', 'env_template_free.txt'),
        os.path.join(os.path.dirname(__file__), 'config', 'env_template_free.txt'),
    ]
    
    config_path = None
    for path in possible_paths:
        if os.path.exists(path):
            config_path = path
            break
    
    if not config_path:
        print("❌ Fichier de configuration non trouvé!")
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


class FullAutoScoring:
    """Système complet d'évaluation et scoring automatique"""
    
    # Poids des piliers SAFE (égaux)
    PILLAR_WEIGHTS = {'S': 0.25, 'A': 0.25, 'F': 0.25, 'E': 0.25}
    
    # ═══════════════════════════════════════════════════════════════════════════
    # DÉFINITIONS DES CATÉGORIES DE SCORES (indépendant de l'Excel)
    # ═══════════════════════════════════════════════════════════════════════════
    #
    # ESSENTIAL (17% des normes = 153/894)
    #   → Normes critiques de base
    #   → Sécurité minimale requise pour tout utilisateur crypto
    #   → Répartition: S=39, A=35, F=37, E=42
    #
    # CONSUMER (38% des normes = 341/894)
    #   → Normes grand public
    #   → Inclut Essential + features utiles pour utilisateurs standards
    #   → Répartition: S=84, A=80, F=77, E=100
    #
    # FULL (100% des normes = 894)
    #   → Toutes les normes
    #   → Évaluation complète selon les 894 normes internationales
    #   → Répartition: S=253, A=192, F=190, E=259
    #
    # ═══════════════════════════════════════════════════════════════════════════
    
    SCORE_DEFINITIONS = {
        'essential': {
            'description': 'Normes critiques de base (17%) - Sécurité minimale requise pour tout utilisateur crypto',
            'target_count': 153,
            'by_pillar': {'S': 39, 'A': 35, 'F': 37, 'E': 42}
        },
        'consumer': {
            'description': 'Normes grand public (38%) - Inclut Essential + features utiles pour utilisateurs standards',
            'target_count': 341,
            'by_pillar': {'S': 84, 'A': 80, 'F': 77, 'E': 100}
        },
        'full': {
            'description': 'Toutes les normes (100%) - Évaluation complète selon les 894 normes internationales',
            'target_count': 894,
            'by_pillar': {'S': 253, 'A': 192, 'F': 190, 'E': 259}
        }
    }
    
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        self.products = []
        self.norms = []
        self.applicability = {}
        self.scraped_content = {}
    
    def sync_norm_definitions(self):
        """
        Synchronise les définitions Essential/Consumer dans Supabase
        selon les quotas définis dans SCORE_DEFINITIONS
        """
        print("\n🔄 SYNCHRONISATION DES DÉFINITIONS DE NORMES")
        print("=" * 60)
        
        # Charger toutes les normes
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
        
        print(f"   📋 Normes par pilier: S={len(by_pillar['S'])}, A={len(by_pillar['A'])}, F={len(by_pillar['F'])}, E={len(by_pillar['E'])}")
        
        # Déterminer quelles normes sont Essential et Consumer
        essential_ids = set()
        consumer_ids = set()
        
        # Pour chaque pilier, sélectionner les N premières normes
        for pillar in ['S', 'A', 'F', 'E']:
            pillar_norms = by_pillar[pillar]
            
            # Essential: les N premières
            essential_count = self.SCORE_DEFINITIONS['essential']['by_pillar'][pillar]
            for norm in pillar_norms[:essential_count]:
                essential_ids.add(norm['id'])
            
            # Consumer: les N premières (inclut Essential)
            consumer_count = self.SCORE_DEFINITIONS['consumer']['by_pillar'][pillar]
            for norm in pillar_norms[:consumer_count]:
                consumer_ids.add(norm['id'])
        
        print(f"   🎯 Cibles: Essential={len(essential_ids)}, Consumer={len(consumer_ids)}")
        
        # Mettre à jour Supabase
        print("   💾 Mise à jour de Supabase...")
        
        # D'abord, tout mettre à False
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/norms?id=gt.0",
            headers=self.headers,
            json={'is_essential': False, 'consumer': False, 'full': True}
        )
        
        # Mettre à jour les Consumer
        updated_consumer = 0
        for norm_id in consumer_ids:
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}",
                headers=self.headers,
                json={'consumer': True}
            )
            if r.status_code in [200, 204]:
                updated_consumer += 1
        
        # Mettre à jour les Essential
        updated_essential = 0
        for norm_id in essential_ids:
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}",
                headers=self.headers,
                json={'is_essential': True}
            )
            if r.status_code in [200, 204]:
                updated_essential += 1
        
        print(f"""
   ✅ Synchronisation terminée:
      - Full:      {len(norms)} normes (100%)
      - Consumer:  {updated_consumer} normes ({updated_consumer*100//len(norms)}%)
      - Essential: {updated_essential} normes ({updated_essential*100//len(norms)}%)
""")
        
        return {'essential': updated_essential, 'consumer': updated_consumer, 'full': len(norms)}
        
    def load_data(self):
        """Charge toutes les données depuis Supabase"""
        print("\n📂 CHARGEMENT DES DONNÉES")
        print("=" * 60)
        
        # Produits avec leur type
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=id,name,url,type_id&order=name.asc",
            headers=self.headers
        )
        self.products = r.json() if r.status_code == 200 else []
        print(f"   📦 {len(self.products)} produits")
        
        # Normes avec leurs attributs
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code,title,description,pillar,is_essential,consumer,full,official_link",
            headers=self.headers
        )
        self.norms = r.json() if r.status_code == 200 else []
        print(f"   📋 {len(self.norms)} normes")
        
        # Applicabilité (norm_id, type_id) -> is_applicable
        print("   📥 Chargement de l'applicabilité...")
        offset = 0
        while True:
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/norm_applicability?select=norm_id,type_id,is_applicable&limit=1000&offset={offset}",
                headers=self.headers
            )
            data = r.json() if r.status_code == 200 else []
            if not data:
                break
            for row in data:
                key = (row['norm_id'], row['type_id'])
                self.applicability[key] = row['is_applicable']
            offset += 1000
        print(f"   ✅ {len(self.applicability)} règles d'applicabilité")
    
    def scrape_product(self, product):
        """Scrape le contenu du site officiel d'un produit"""
        url = product.get('url')
        if not url:
            return None
        
        # Cache
        if product['id'] in self.scraped_content:
            return self.scraped_content[product['id']]
        
        try:
            # Scraping simple avec requests (pas besoin de Playwright)
            r = requests.get(url, timeout=15, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            if r.status_code == 200:
                # Extraire le texte brut (simplifié)
                from html.parser import HTMLParser
                
                class TextExtractor(HTMLParser):
                    def __init__(self):
                        super().__init__()
                        self.text = []
                        self.skip = False
                    
                    def handle_starttag(self, tag, attrs):
                        if tag in ['script', 'style', 'nav', 'footer', 'header']:
                            self.skip = True
                    
                    def handle_endtag(self, tag):
                        if tag in ['script', 'style', 'nav', 'footer', 'header']:
                            self.skip = False
                    
                    def handle_data(self, data):
                        if not self.skip:
                            text = data.strip()
                            if text:
                                self.text.append(text)
                
                parser = TextExtractor()
                parser.feed(r.text)
                content = ' '.join(parser.text)[:10000]  # Limiter à 10k caractères
                
                self.scraped_content[product['id']] = content
                return content
        except Exception as e:
            pass
        
        return None
    
    def evaluate_with_ai(self, product, norm, product_content=None):
        """Évalue si un produit répond à une norme via IA"""
        
        prompt = f"""Tu es un expert en sécurité crypto. Évalue si ce produit répond à cette norme.

PRODUIT: {product['name']}
URL: {product.get('url', 'N/A')}

NORME: {norm['code']} - {norm['title']}
DESCRIPTION: {norm.get('description', 'N/A')}
LIEN OFFICIEL NORME: {norm.get('official_link', 'N/A')}

{f"CONTENU DU SITE PRODUIT (extrait): {product_content[:2000]}" if product_content else ""}

QUESTION: Ce produit répond-il à cette norme de sécurité ?

Réponds UNIQUEMENT par: YES ou NO
"""
        
        result = None
        
        # Essayer Mistral
        if MISTRAL_API_KEY:
            result = self._call_mistral(prompt)
        
        # Fallback Gemini
        if not result and GEMINI_API_KEY:
            result = self._call_gemini(prompt)
        
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
                    'max_tokens': 10
                },
                timeout=30
            )
            
            if r.status_code == 200:
                content = r.json()['choices'][0]['message']['content'].strip().upper()
                if 'YES' in content:
                    return 'YES'
                elif 'NO' in content:
                    return 'NO'
        except:
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
                    'generationConfig': {'temperature': 0.1, 'maxOutputTokens': 10}
                },
                timeout=30
            )
            
            if r.status_code == 200:
                content = r.json()['candidates'][0]['content']['parts'][0]['text'].strip().upper()
                if 'YES' in content:
                    return 'YES'
                elif 'NO' in content:
                    return 'NO'
        except:
            pass
        return None
    
    def evaluate_all_products(self, limit=None, use_ai=True, force_reevaluate=False):
        """
        ÉTAPE 1: Évalue TOUS les produits sur TOUTES les normes applicables
        Par défaut, ne réévalue PAS les produits qui ont déjà des évaluations valides
        """
        print("\n🤖 ÉTAPE 1: ÉVALUATION AUTOMATIQUE DE TOUS LES PRODUITS")
        print("=" * 60)
        
        products_to_process = self.products[:limit] if limit else self.products
        total_evaluations = 0
        
        for i, product in enumerate(products_to_process):
            print(f"\n[{i+1}/{len(products_to_process)}] 📦 {product['name']}")
            
            type_id = product.get('type_id')
            if not type_id:
                print("   ⚠️  Pas de type_id, skip")
                continue
            
            # Vérifier si le produit a déjà des évaluations valides
            if not force_reevaluate:
                r = requests.get(
                    f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product['id']}&result=eq.YES&select=id",
                    headers=self.headers,
                    timeout=10
                )
                existing_yes = len(r.json()) if r.status_code == 200 else 0
                
                if existing_yes > 50:  # Si plus de 50 YES, les évaluations sont valides
                    print(f"   ✅ Déjà évalué ({existing_yes} YES) - skip")
                    continue
            
            # Scraper le contenu du produit
            product_content = None
            if product.get('url'):
                print(f"   🌐 Scraping {product['url'][:40]}...")
                product_content = self.scrape_product(product)
                if product_content:
                    print(f"   ✅ {len(product_content)} caractères récupérés")
            
            # Évaluer chaque norme applicable
            evaluations = []
            norms_evaluated = 0
            
            for norm in self.norms:
                # Vérifier l'applicabilité
                is_applicable = self.applicability.get((norm['id'], type_id), False)
                
                if not is_applicable:
                    # Norme non applicable -> N/A
                    evaluations.append({
                        'product_id': product['id'],
                        'norm_id': norm['id'],
                        'result': 'N/A',
                        'evaluated_by': 'auto_na',
                        'evaluation_date': datetime.now().strftime('%Y-%m-%d')
                    })
                else:
                    # Norme applicable -> Évaluer avec IA
                    if use_ai and (MISTRAL_API_KEY or GEMINI_API_KEY):
                        result = self.evaluate_with_ai(product, norm, product_content)
                        if result:
                            evaluations.append({
                                'product_id': product['id'],
                                'norm_id': norm['id'],
                                'result': result,
                                'evaluated_by': 'ai_auto',
                                'evaluation_date': datetime.now().strftime('%Y-%m-%d')
                            })
                            norms_evaluated += 1
                            
                            # Rate limiting
                            time.sleep(0.2)
                    else:
                        # Sans IA, mettre NO par défaut
                        evaluations.append({
                            'product_id': product['id'],
                            'norm_id': norm['id'],
                            'result': 'NO',
                            'evaluated_by': 'auto_default',
                            'evaluation_date': datetime.now().strftime('%Y-%m-%d')
                        })
            
            # Sauvegarder les évaluations
            if evaluations:
                self._save_evaluations(product['id'], evaluations)
                total_evaluations += len(evaluations)
                
                # Compter YES/NO/NA
                yes_count = sum(1 for e in evaluations if e['result'] == 'YES')
                no_count = sum(1 for e in evaluations if e['result'] == 'NO')
                na_count = sum(1 for e in evaluations if e['result'] == 'N/A')
                print(f"   📊 {yes_count} YES | {no_count} NO | {na_count} N/A")
        
        print(f"\n✅ {total_evaluations} évaluations créées au total")
    
    def _save_evaluations(self, product_id, evaluations):
        """Sauvegarde les évaluations d'un produit"""
        # Supprimer les anciennes évaluations
        requests.delete(
            f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}",
            headers=self.headers,
            timeout=30
        )
        
        # Insérer les nouvelles par batch
        batch_size = 500
        for i in range(0, len(evaluations), batch_size):
            batch = evaluations[i:i+batch_size]
            requests.post(
                f"{SUPABASE_URL}/rest/v1/evaluations",
                headers=self.headers,
                json=batch,
                timeout=60
            )
    
    def calculate_all_scores(self):
        """
        ÉTAPE 2: Calcule les 3 types de scores SAFE pour TOUS les produits
        - Full: Toutes les normes (full=true)
        - Consumer: Normes consumer (consumer=true)
        - Essential: Normes essentielles (is_essential=true)
        """
        print("\n📊 ÉTAPE 2: CALCUL DES SCORES SAFE (Full, Consumer, Essential)")
        print("=" * 60)
        
        # Créer des maps pour les normes
        norms_by_id = {n['id']: n for n in self.norms}
        
        results = []
        
        for product in self.products:
            # Récupérer les évaluations du produit
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product['id']}&select=norm_id,result",
                headers=self.headers
            )
            evaluations = r.json() if r.status_code == 200 else []
            
            if not evaluations:
                continue
            
            # Calculer les 3 types de scores
            scores = {
                'full': self._calculate_score(evaluations, norms_by_id, 'full'),
                'consumer': self._calculate_score(evaluations, norms_by_id, 'consumer'),
                'essential': self._calculate_score(evaluations, norms_by_id, 'is_essential')
            }
            
            # Sauvegarder dans la colonne scores de products (structure propre)
            # Compter les stats
            yes_count = sum(1 for e in evaluations if e['result'] == 'YES')
            no_count = sum(1 for e in evaluations if e['result'] == 'NO')
            na_count = sum(1 for e in evaluations if e['result'] == 'N/A')
            
            scores_data = {
                'full': {
                    'SAFE': scores['full']['global'],
                    'S': scores['full']['S'],
                    'A': scores['full']['A'],
                    'F': scores['full']['F'],
                    'E': scores['full']['E']
                },
                'consumer': {
                    'SAFE': scores['consumer']['global'],
                    'S': scores['consumer']['S'],
                    'A': scores['consumer']['A'],
                    'F': scores['consumer']['F'],
                    'E': scores['consumer']['E']
                },
                'essential': {
                    'SAFE': scores['essential']['global'],
                    'S': scores['essential']['S'],
                    'A': scores['essential']['A'],
                    'F': scores['essential']['F'],
                    'E': scores['essential']['E']
                },
                'stats': {
                    'total_evaluated': yes_count + no_count + na_count,
                    'yes': yes_count,
                    'no': no_count,
                    'na': na_count
                },
                'calculated_at': datetime.now().isoformat()
            }
            
            # Mettre à jour la colonne scores dans products
            requests.patch(
                f"{SUPABASE_URL}/rest/v1/products?id=eq.{product['id']}",
                headers=self.headers,
                json={'scores': scores_data}
            )
            
            results.append({
                'name': product['name'],
                'full': scores['full']['global'],
                'full_S': scores['full']['S'],
                'full_A': scores['full']['A'],
                'full_F': scores['full']['F'],
                'full_E': scores['full']['E'],
                'consumer': scores['consumer']['global'],
                'consumer_S': scores['consumer']['S'],
                'consumer_A': scores['consumer']['A'],
                'consumer_F': scores['consumer']['F'],
                'consumer_E': scores['consumer']['E'],
                'essential': scores['essential']['global'],
                'essential_S': scores['essential']['S'],
                'essential_A': scores['essential']['A'],
                'essential_F': scores['essential']['F'],
                'essential_E': scores['essential']['E']
            })
        
        # Afficher le classement
        results.sort(key=lambda x: x['full'] or 0, reverse=True)
        
        def fmt(val):
            return f"{val:.0f}" if val else '-'
        
        print(f"\n🏆 CLASSEMENT SAFE SCORING (Top 15)")
        print("=" * 140)
        
        # Header
        print(f"{'Rang':<5} {'Produit':<22} │ {'FULL':^25} │ {'CONSUMER':^25} │ {'ESSENTIAL':^25}")
        print(f"{'':5} {'':22} │ {'Tot':>5} {'S':>5} {'A':>5} {'F':>5} {'E':>5} │ {'Tot':>5} {'S':>5} {'A':>5} {'F':>5} {'E':>5} │ {'Tot':>5} {'S':>5} {'A':>5} {'F':>5} {'E':>5}")
        print("=" * 140)
        
        for i, r in enumerate(results[:15]):
            name = r['name'][:21]
            print(f"{i+1:<5} {name:<22} │ {fmt(r['full']):>5} {fmt(r['full_S']):>5} {fmt(r['full_A']):>5} {fmt(r['full_F']):>5} {fmt(r['full_E']):>5} │ {fmt(r['consumer']):>5} {fmt(r['consumer_S']):>5} {fmt(r['consumer_A']):>5} {fmt(r['consumer_F']):>5} {fmt(r['consumer_E']):>5} │ {fmt(r['essential']):>5} {fmt(r['essential_S']):>5} {fmt(r['essential_A']):>5} {fmt(r['essential_F']):>5} {fmt(r['essential_E']):>5}")
        
        print("=" * 140)
        print(f"\n✅ {len(results)} produits scorés")
        
        return results
    
    def _calculate_score(self, evaluations, norms_by_id, filter_field):
        """
        Calcule le score SAFE filtré par un champ (full, consumer, is_essential)
        Score = (YES + YESp) / (YES + YESp + NO) * 100
        TBD et N/A sont exclus du calcul
        """
        total_yes = 0
        total_no = 0
        
        # Stats par pilier pour info
        pillar_stats = {
            'S': {'yes': 0, 'no': 0},
            'A': {'yes': 0, 'no': 0},
            'F': {'yes': 0, 'no': 0},
            'E': {'yes': 0, 'no': 0}
        }
        
        for eval in evaluations:
            norm = norms_by_id.get(eval['norm_id'])
            if not norm:
                continue
            
            # Filtrer selon le champ
            if not norm.get(filter_field, True):
                continue
            
            result = eval.get('result', 'N/A').upper()
            
            # Exclure N/A et TBD du calcul
            if result in ['N/A', 'TBD']:
                continue
            
            pillar = norm.get('pillar', 'S')
            if pillar not in pillar_stats:
                pillar = 'S'
            
            # YES et YESp comptent comme positifs
            if result in ['YES', 'YESP']:
                total_yes += 1
                pillar_stats[pillar]['yes'] += 1
            elif result == 'NO':
                total_no += 1
                pillar_stats[pillar]['no'] += 1
        
        # Score global simple: YES / Total applicable
        total_applicable = total_yes + total_no
        global_score = round((total_yes / total_applicable) * 100, 1) if total_applicable > 0 else None
        
        # Scores par pilier pour info
        pillar_scores = {}
        for pillar, stats in pillar_stats.items():
            total = stats['yes'] + stats['no']
            if total > 0:
                pillar_scores[pillar] = round((stats['yes'] / total) * 100, 1)
            else:
                pillar_scores[pillar] = None
        
        return {
            'global': global_score,
            'S': pillar_scores.get('S'),
            'A': pillar_scores.get('A'),
            'F': pillar_scores.get('F'),
            'E': pillar_scores.get('E')
        }
    
    def run(self, limit=None, use_ai=True):
        """
        EXÉCUTION COMPLÈTE
        1. Charge les données
        2. Évalue tous les produits (YES/NO via IA)
        3. Calcule les 3 scores SAFE
        """
        print("""
╔══════════════════════════════════════════════════════════════╗
║       🔐 SAFE SCORING - ÉVALUATION AUTOMATIQUE COMPLÈTE      ║
╚══════════════════════════════════════════════════════════════╝
""")
        
        start_time = datetime.now()
        
        # 1. Charger les données
        self.load_data()
        
        # 2. Évaluer tous les produits
        self.evaluate_all_products(limit=limit, use_ai=use_ai)
        
        # 3. Calculer les scores
        results = self.calculate_all_scores()
        
        # Résumé
        duration = datetime.now() - start_time
        print(f"""
╔══════════════════════════════════════════════════════════════╗
║                    ✅ TERMINÉ                                 ║
╠══════════════════════════════════════════════════════════════╣
║  Durée: {str(duration).split('.')[0]:<52} ║
║  Produits évalués: {len(results):<41} ║
║  Normes: {len(self.norms):<51} ║
╚══════════════════════════════════════════════════════════════╝
""")
        
        return results


def main():
    """Point d'entrée"""
    import argparse
    
    parser = argparse.ArgumentParser(description='SAFE SCORING - Évaluation automatique complète')
    parser.add_argument('--limit', type=int, default=None, help='Limite de produits à traiter')
    parser.add_argument('--no-ai', action='store_true', help='Désactiver l\'évaluation IA')
    parser.add_argument('--score-only', action='store_true', help='Calculer les scores uniquement (sans réévaluer)')
    parser.add_argument('--sync', action='store_true', help='Synchroniser les définitions Essential/Consumer dans Supabase')
    
    args = parser.parse_args()
    
    scorer = FullAutoScoring()
    
    if args.sync:
        # Synchroniser les définitions puis recalculer les scores
        scorer.sync_norm_definitions()
        scorer.load_data()
        scorer.calculate_all_scores()
    elif args.score_only:
        scorer.load_data()
        scorer.calculate_all_scores()
    else:
        scorer.run(limit=args.limit, use_ai=not args.no_ai)


if __name__ == "__main__":
    main()
