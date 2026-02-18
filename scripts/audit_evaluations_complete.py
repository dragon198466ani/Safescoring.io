#!/usr/bin/env python3
"""
SAFESCORING.IO - Audit Complet des Evaluations Produits
========================================================
Ce script verifie que TOUS les produits ont ete evalues avec TOUTES les normes
applicables et genere un rapport detaille incluant:
- Fiche produit complete
- Legalisation par pays
- Etat des evaluations
"""

import os
import sys
import json
import requests
import pandas as pd
from datetime import datetime
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
from core.config import SUPABASE_URL, get_supabase_headers

# Configuration
EXCEL_FILE = os.path.join(os.path.dirname(__file__), '..', 'SAFE_SCORING_V12_all_normes.xlsx')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'audit_reports')


class EvaluationAuditor:
    def __init__(self):
        self.headers = get_supabase_headers()
        self.service_headers = get_supabase_headers(use_service_key=True)

        # Data containers
        self.products = []
        self.norms = []
        self.evaluations = []
        self.applicability = {}
        self.product_types = {}
        self.types_map = {}

        # Incidents
        self.security_incidents = []
        self.incident_impacts = []
        self.physical_incidents = []
        self.physical_impacts = []
        self.institutional_incidents = []

        # Stats
        self.stats = {
            'total_products': 0,
            'products_evaluated': 0,
            'products_incomplete': 0,
            'products_no_eval': 0,
            'total_norms': 0,
            'total_evaluations': 0,
            'missing_evaluations': 0,
            'total_security_incidents': 0,
            'total_physical_incidents': 0,
            'total_institutional_incidents': 0,
        }

    def load_all_data(self):
        """Charge toutes les donnees depuis Supabase."""
        print("\n" + "=" * 70)
        print("CHARGEMENT DES DONNEES SUPABASE")
        print("=" * 70)

        # 1. Products (colonnes existantes)
        print("\n[1/11] Chargement des produits...")
        self.products = self._fetch_all('products',
            'id,name,slug,url,type_id,country_origin,headquarters,countries_operating,description,is_active,last_evaluated_at')
        print(f"      {len(self.products)} produits charges")

        # 2. Product Types
        print("[2/11] Chargement des types de produits...")
        types = self._fetch_all('product_types', 'id,code,name,category')
        self.types_map = {t['id']: t for t in types}
        print(f"      {len(types)} types charges")

        # 3. Norms
        print("[3/11] Chargement des normes...")
        self.norms = self._fetch_all('norms', 'id,code,pillar,title,is_essential')
        self.norms_by_id = {n['id']: n for n in self.norms}
        self.norms_by_code = {n['code']: n for n in self.norms}
        print(f"      {len(self.norms)} normes chargees")

        # 4. Applicability
        print("[4/11] Chargement de l'applicabilite...")
        apps = self._fetch_all('norm_applicability', 'type_id,norm_id,is_applicable')
        for a in apps:
            if a['type_id'] not in self.applicability:
                self.applicability[a['type_id']] = {}
            self.applicability[a['type_id']][a['norm_id']] = a['is_applicable']
        print(f"      {len(apps)} regles d'applicabilite")

        # 5. Product Type Mapping
        print("[5/11] Chargement du mapping produit-type...")
        mappings = self._fetch_all('product_type_mapping', 'product_id,type_id,is_primary')
        for m in mappings:
            if m['product_id'] not in self.product_types:
                self.product_types[m['product_id']] = []
            self.product_types[m['product_id']].append(m['type_id'])
        # Fallback pour products avec type_id direct
        for p in self.products:
            if p['id'] not in self.product_types and p.get('type_id'):
                self.product_types[p['id']] = [p['type_id']]
        print(f"      {len(self.product_types)} produits avec types")

        # 6. Evaluations
        print("[6/11] Chargement des evaluations...")
        self.evaluations = self._fetch_all('evaluations',
            'id,product_id,norm_id,result,why_this_result,evaluated_by,evaluation_date,confidence_score')
        # Index par produit
        self.evals_by_product = defaultdict(list)
        for e in self.evaluations:
            self.evals_by_product[e['product_id']].append(e)
        print(f"      {len(self.evaluations)} evaluations chargees")

        # 7. Country profiles (legalisation)
        print("[7/11] Chargement des profils pays...")
        self.country_profiles = self._fetch_all('country_crypto_profiles',
            'country_code,country_name,crypto_stance,crypto_legal,trading_allowed')
        self.countries_map = {c['country_code']: c for c in self.country_profiles}
        print(f"      {len(self.country_profiles)} profils pays charges")

        # 8. Security Incidents (hacks, exploits, etc.)
        print("[8/11] Chargement des incidents de securite...")
        self.security_incidents = self._fetch_all('security_incidents',
            'id,incident_id,title,incident_type,severity,funds_lost_usd,incident_date,status,affected_product_ids')
        self.incidents_by_id = {i['id']: i for i in self.security_incidents}
        print(f"      {len(self.security_incidents)} incidents de securite")

        # 9. Incident Product Impact
        print("[9/11] Chargement des impacts incidents...")
        self.incident_impacts = self._fetch_all('incident_product_impact',
            'incident_id,product_id,impact_level,funds_lost_usd')
        self.impacts_by_product = defaultdict(list)
        for imp in self.incident_impacts:
            self.impacts_by_product[imp['product_id']].append(imp)
        print(f"      {len(self.incident_impacts)} impacts produits")

        # 10. Physical Incidents (kidnappings, robberies, etc.)
        print("[10/11] Chargement des incidents physiques...")
        self.physical_incidents = self._fetch_all('physical_incidents',
            'id,title,slug,incident_type,date,location_country,severity_score,amount_stolen_usd,status')
        print(f"      {len(self.physical_incidents)} incidents physiques")

        # 11. Institutional Incidents (government data breaches)
        print("[11/11] Chargement des incidents institutionnels...")
        self.institutional_incidents = self._fetch_all('institutional_incidents',
            'id,title,incident_type,country_code,institution_type,incident_date,severity_score,crypto_holders_targeted')
        print(f"      {len(self.institutional_incidents)} incidents institutionnels")

        print("\n   CHARGEMENT TERMINE")

    def _fetch_all(self, table, columns='*', max_retries=3):
        """Fetch all rows from a table with pagination and retry logic."""
        import time as time_module
        all_data = []
        offset = 0
        limit = 1000

        while True:
            url = f"{SUPABASE_URL}/rest/v1/{table}?select={columns}&offset={offset}&limit={limit}"

            for attempt in range(max_retries):
                try:
                    r = requests.get(url, headers=self.headers, timeout=60)
                    break
                except requests.exceptions.ConnectionError as e:
                    if attempt < max_retries - 1:
                        print(f"      Retry {attempt+1}/{max_retries} pour {table}...")
                        time_module.sleep(2)
                    else:
                        print(f"      ERREUR connexion {table}: {e}")
                        return all_data

            if r.status_code != 200:
                print(f"      ERREUR: {r.status_code} - {r.text[:200]}")
                break
            data = r.json()
            if not data:
                break
            all_data.extend(data)
            offset += limit
            if len(data) < limit:
                break
            time_module.sleep(0.2)  # Rate limiting
        return all_data

    def get_applicable_norms(self, product_id):
        """Get all applicable norms for a product based on its types."""
        type_ids = self.product_types.get(product_id, [])
        applicable_norm_ids = set()

        for type_id in type_ids:
            if type_id in self.applicability:
                for norm_id, is_applicable in self.applicability[type_id].items():
                    if is_applicable:
                        applicable_norm_ids.add(norm_id)

        return [self.norms_by_id[nid] for nid in applicable_norm_ids if nid in self.norms_by_id]

    def audit_product(self, product):
        """Audit complet d'un produit."""
        product_id = product['id']

        # Get product types
        type_ids = self.product_types.get(product_id, [])
        type_names = [self.types_map.get(tid, {}).get('name', '?') for tid in type_ids]

        # Get applicable norms
        applicable_norms = self.get_applicable_norms(product_id)
        applicable_norm_ids = {n['id'] for n in applicable_norms}

        # Get existing evaluations
        evals = self.evals_by_product.get(product_id, [])
        evaluated_norm_ids = {e['norm_id'] for e in evals}

        # Find missing evaluations
        missing_norm_ids = applicable_norm_ids - evaluated_norm_ids
        missing_norms = [self.norms_by_id[nid] for nid in missing_norm_ids if nid in self.norms_by_id]

        # Count by result
        result_counts = defaultdict(int)
        for e in evals:
            result_counts[e['result']] += 1

        # Count by pillar
        pillar_stats = defaultdict(lambda: {'yes': 0, 'no': 0, 'tbd': 0, 'na': 0, 'total': 0})
        for e in evals:
            norm = self.norms_by_id.get(e['norm_id'])
            if norm:
                pillar = norm['pillar']
                pillar_stats[pillar]['total'] += 1
                if e['result'] in ['YES', 'YESp']:
                    pillar_stats[pillar]['yes'] += 1
                elif e['result'] == 'NO':
                    pillar_stats[pillar]['no'] += 1
                elif e['result'] == 'TBD':
                    pillar_stats[pillar]['tbd'] += 1
                elif e['result'] == 'N/A':
                    pillar_stats[pillar]['na'] += 1

        # Legalisation/Operation info
        countries_operating = product.get('countries_operating') or []
        country_origin = product.get('country_origin') or ''

        # Security incidents for this product
        product_security_incidents = []
        for inc in self.security_incidents:
            affected = inc.get('affected_product_ids') or []
            if product_id in affected:
                product_security_incidents.append({
                    'title': inc.get('title'),
                    'type': inc.get('incident_type'),
                    'severity': inc.get('severity'),
                    'date': inc.get('incident_date'),
                    'funds_lost': inc.get('funds_lost_usd'),
                })

        # Physical incidents (not linked to specific products in current schema)
        product_physical_incidents = []
        # Note: physical_incidents n'a pas de colonne products_compromised
        # On pourrait les lier via physical_incident_product_impact si disponible

        # Total funds lost from incidents
        total_funds_lost = sum(i.get('funds_lost') or 0 for i in product_security_incidents)

        return {
            'id': product_id,
            'name': product['name'],
            'slug': product.get('slug', ''),
            'url': product.get('url', ''),
            'types': type_names,
            'country_origin': country_origin,
            'headquarters': product.get('headquarters', ''),
            'countries_operating': countries_operating,
            'num_countries_operating': len(countries_operating) if isinstance(countries_operating, list) else 0,
            'is_active': product.get('is_active', True),
            'last_evaluated_at': product.get('last_evaluated_at', ''),
            'applicable_norms': len(applicable_norms),
            'evaluated_norms': len(evals),
            'missing_norms': len(missing_norms),
            'missing_norm_codes': [n['code'] for n in missing_norms],
            'result_counts': dict(result_counts),
            'pillar_stats': dict(pillar_stats),
            'is_complete': len(missing_norms) == 0,
            'completeness_pct': round(100 * len(evals) / len(applicable_norms), 1) if applicable_norms else 0,
            # Incidents
            'security_incidents': product_security_incidents,
            'security_incident_count': len(product_security_incidents),
            'physical_incidents': product_physical_incidents,
            'physical_incident_count': len(product_physical_incidents),
            'total_funds_lost_usd': total_funds_lost,
        }

    def run_full_audit(self):
        """Execute l'audit complet."""
        print("\n" + "=" * 70)
        print("AUDIT COMPLET DES EVALUATIONS")
        print("=" * 70)

        # Load data
        self.load_all_data()

        # Audit each product
        print("\n" + "-" * 70)
        print("ANALYSE PRODUIT PAR PRODUIT")
        print("-" * 70)

        audit_results = []
        complete_count = 0
        incomplete_count = 0
        no_eval_count = 0

        for i, product in enumerate(self.products, 1):
            result = self.audit_product(product)
            audit_results.append(result)

            status = ""
            if result['evaluated_norms'] == 0:
                status = "AUCUNE EVAL"
                no_eval_count += 1
            elif result['is_complete']:
                status = "COMPLET"
                complete_count += 1
            else:
                status = f"INCOMPLET (-{result['missing_norms']} normes)"
                incomplete_count += 1

            # Print progress every 20 products
            if i % 20 == 0 or i == len(self.products):
                print(f"   [{i}/{len(self.products)}] Audites...")

        # Summary stats
        self.stats['total_products'] = len(self.products)
        self.stats['products_evaluated'] = complete_count
        self.stats['products_incomplete'] = incomplete_count
        self.stats['products_no_eval'] = no_eval_count
        self.stats['total_norms'] = len(self.norms)
        self.stats['total_evaluations'] = len(self.evaluations)
        self.stats['total_security_incidents'] = len(self.security_incidents)
        self.stats['total_physical_incidents'] = len(self.physical_incidents)
        self.stats['total_institutional_incidents'] = len(self.institutional_incidents)
        self.stats['products_with_incidents'] = len([r for r in audit_results if r['security_incident_count'] > 0])
        self.stats['total_funds_lost'] = sum(r['total_funds_lost_usd'] for r in audit_results)

        return audit_results

    def generate_report(self, audit_results):
        """Generate detailed report."""
        print("\n" + "=" * 70)
        print("RAPPORT D'AUDIT")
        print("=" * 70)

        # Create output directory
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        # 1. Summary
        total_products = self.stats['total_products'] or 1  # Avoid division by zero
        print("\n### RESUME ###")
        print(f"   Total produits:      {self.stats['total_products']}")
        print(f"   Produits complets:   {self.stats['products_evaluated']} ({100*self.stats['products_evaluated']/total_products:.1f}%)")
        print(f"   Produits incomplets: {self.stats['products_incomplete']}")
        print(f"   Sans evaluation:     {self.stats['products_no_eval']}")
        print(f"   Total normes:        {self.stats['total_norms']}")
        print(f"   Total evaluations:   {self.stats['total_evaluations']}")
        print(f"\n### INCIDENTS ###")
        print(f"   Incidents securite:     {self.stats['total_security_incidents']}")
        print(f"   Incidents physiques:    {self.stats['total_physical_incidents']}")
        print(f"   Incidents instit.:      {self.stats['total_institutional_incidents']}")
        print(f"   Produits avec incidents: {self.stats.get('products_with_incidents', 0)}")
        print(f"   Total fonds perdus:     ${self.stats.get('total_funds_lost', 0):,.0f}")

        # 2. Products without evaluations
        no_eval_products = [r for r in audit_results if r['evaluated_norms'] == 0]
        if no_eval_products:
            print(f"\n### PRODUITS SANS EVALUATION ({len(no_eval_products)}) ###")
            for p in no_eval_products[:20]:
                print(f"   - {p['name']} ({p['types']})")
            if len(no_eval_products) > 20:
                print(f"   ... et {len(no_eval_products) - 20} autres")

        # 3. Incomplete products
        incomplete_products = [r for r in audit_results if 0 < r['evaluated_norms'] and not r['is_complete']]
        if incomplete_products:
            print(f"\n### PRODUITS INCOMPLETS ({len(incomplete_products)}) ###")
            for p in sorted(incomplete_products, key=lambda x: x['missing_norms'], reverse=True)[:20]:
                print(f"   - {p['name']}: {p['completeness_pct']}% ({p['missing_norms']} normes manquantes)")

        # 4. Products with incidents
        with_incidents = [r for r in audit_results if r['security_incident_count'] > 0]
        if with_incidents:
            print(f"\n### PRODUITS AVEC INCIDENTS DE SECURITE ({len(with_incidents)}) ###")
            for p in sorted(with_incidents, key=lambda x: x['total_funds_lost_usd'], reverse=True)[:20]:
                print(f"   - {p['name']}: {p['security_incident_count']} incidents (${p['total_funds_lost_usd']:,.0f} perdus)")

        # 5. Products with most countries
        with_countries = [r for r in audit_results if r['num_countries_operating'] > 0]
        if with_countries:
            print(f"\n### TOP 10 PRODUITS PAR COUVERTURE GEOGRAPHIQUE ###")
            for p in sorted(with_countries, key=lambda x: x['num_countries_operating'], reverse=True)[:10]:
                print(f"   - {p['name']}: {p['num_countries_operating']} pays")

        # 6. Save detailed JSON report
        json_path = os.path.join(OUTPUT_DIR, f'audit_evaluations_{timestamp}.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump({
                'timestamp': timestamp,
                'stats': self.stats,
                'products': audit_results
            }, f, indent=2, ensure_ascii=False)
        print(f"\n   Rapport JSON: {json_path}")

        # 7. Save product fiches
        fiches_path = os.path.join(OUTPUT_DIR, f'fiches_produits_{timestamp}.txt')
        with open(fiches_path, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write("FICHES PRODUITS COMPLETES - SAFESCORING.IO\n")
            f.write(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
            f.write("=" * 80 + "\n\n")

            for p in sorted(audit_results, key=lambda x: x['name']):
                f.write("-" * 80 + "\n")
                f.write(f"PRODUIT: {p['name']}\n")
                f.write("-" * 80 + "\n")
                f.write(f"  Slug:           {p['slug']}\n")
                f.write(f"  URL:            {p['url']}\n")
                f.write(f"  Types:          {', '.join(p['types'])}\n")
                f.write(f"  Pays d'origine: {p['country_origin'] or 'N/A'}\n")
                f.write(f"  Siege:          {p['headquarters'] or 'N/A'}\n")
                f.write(f"  Actif:          {'Oui' if p.get('is_active') else 'Non'}\n")
                f.write(f"  Derniere eval:  {p.get('last_evaluated_at') or 'Jamais'}\n")
                f.write(f"\n  GEOGRAPHIE:\n")
                f.write(f"    Pays operation:  {p['num_countries_operating']} pays\n")
                if p['countries_operating'] and isinstance(p['countries_operating'], list):
                    f.write(f"    Liste:           {', '.join(p['countries_operating'][:20])}\n")
                f.write(f"\n  EVALUATIONS:\n")
                f.write(f"    Normes applicables: {p['applicable_norms']}\n")
                f.write(f"    Normes evaluees:    {p['evaluated_norms']}\n")
                f.write(f"    Completude:         {p['completeness_pct']}%\n")
                f.write(f"    Resultats: {p['result_counts']}\n")
                f.write(f"\n  SCORES PAR PILIER:\n")
                for pillar in ['S', 'A', 'F', 'E']:
                    if pillar in p['pillar_stats']:
                        ps = p['pillar_stats'][pillar]
                        score = 100 * ps['yes'] / (ps['total'] - ps['na']) if (ps['total'] - ps['na']) > 0 else 0
                        f.write(f"    {pillar}: {score:.1f}% ({ps['yes']} YES, {ps['no']} NO, {ps['tbd']} TBD)\n")

                if p['missing_norm_codes']:
                    f.write(f"\n  NORMES MANQUANTES ({len(p['missing_norm_codes'])}):\n")
                    for code in p['missing_norm_codes'][:30]:
                        f.write(f"    - {code}\n")
                    if len(p['missing_norm_codes']) > 30:
                        f.write(f"    ... et {len(p['missing_norm_codes']) - 30} autres\n")

                # Security incidents
                if p['security_incidents']:
                    f.write(f"\n  INCIDENTS SECURITE ({p['security_incident_count']}):\n")
                    for inc in p['security_incidents']:
                        f.write(f"    - [{inc.get('severity', 'N/A')}] {inc.get('title', 'N/A')}\n")
                        f.write(f"      Type: {inc.get('type', 'N/A')} | Date: {inc.get('date', 'N/A')}\n")
                        if inc.get('funds_lost'):
                            f.write(f"      Fonds perdus: ${inc['funds_lost']:,.0f}\n")

                # Physical incidents
                if p['physical_incidents']:
                    f.write(f"\n  INCIDENTS PHYSIQUES ({p['physical_incident_count']}):\n")
                    for inc in p['physical_incidents']:
                        f.write(f"    - [{inc.get('severity', 'N/A')}/10] {inc.get('title', 'N/A')}\n")
                        f.write(f"      Type: {inc.get('type', 'N/A')} | Pays: {inc.get('country', 'N/A')}\n")

                if p['total_funds_lost_usd'] > 0:
                    f.write(f"\n  TOTAL FONDS PERDUS: ${p['total_funds_lost_usd']:,.0f}\n")

                f.write("\n")

        print(f"   Fiches produits: {fiches_path}")

        # 8. Save missing evaluations list (for re-evaluation)
        missing_path = os.path.join(OUTPUT_DIR, f'missing_evaluations_{timestamp}.json')
        missing_data = []
        for p in audit_results:
            if p['missing_norm_codes']:
                missing_data.append({
                    'product_id': p['id'],
                    'product_name': p['name'],
                    'missing_norms': p['missing_norm_codes']
                })
        with open(missing_path, 'w', encoding='utf-8') as f:
            json.dump(missing_data, f, indent=2)
        print(f"   Evaluations manquantes: {missing_path}")

        return json_path, fiches_path, missing_path


def compare_with_excel():
    """Compare Supabase data with Excel files."""
    print("\n" + "=" * 70)
    print("COMPARAISON AVEC EXCEL")
    print("=" * 70)

    # Check multiple Excel files
    excel_files = [
        os.path.join(os.path.dirname(__file__), '..', 'SAFE_SCORING_V12_all_normes.xlsx'),
        os.path.join(os.path.dirname(__file__), '..', 'crypto_reglementation_complete (1).xlsx'),
        os.path.join(os.path.dirname(__file__), '..', 'SAFE_CATALOGUE_v7.xlsx'),
    ]

    results = {}

    for excel_file in excel_files:
        if not os.path.exists(excel_file):
            continue

        filename = os.path.basename(excel_file)
        print(f"\n   Fichier: {filename}")

        try:
            xl = pd.ExcelFile(excel_file)
            print(f"      Feuilles: {', '.join(xl.sheet_names[:5])}{'...' if len(xl.sheet_names) > 5 else ''}")

            for sheet in xl.sheet_names[:10]:
                try:
                    df = pd.read_excel(excel_file, sheet_name=sheet)
                    print(f"      - {sheet}: {len(df)} lignes")
                    results[f"{filename}:{sheet}"] = len(df)
                except Exception:
                    pass

        except Exception as e:
            print(f"      ERREUR: {e}")

    return results


def main():
    print("\n" + "=" * 70)
    print("SAFESCORING.IO - AUDIT COMPLET DES EVALUATIONS")
    print("=" * 70)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Run audit
    auditor = EvaluationAuditor()
    results = auditor.run_full_audit()

    # Generate reports
    json_path, fiches_path, missing_path = auditor.generate_report(results)

    # Compare with Excel
    excel_df = compare_with_excel()

    print("\n" + "=" * 70)
    print("AUDIT TERMINE")
    print("=" * 70)
    print(f"\nRapports generes dans: {OUTPUT_DIR}")

    # Summary action items
    incomplete = [r for r in results if not r['is_complete'] and r['evaluated_norms'] > 0]
    no_eval = [r for r in results if r['evaluated_norms'] == 0]
    no_geo = [r for r in results if r.get('num_countries_operating', 0) == 0]

    print(f"\n### ACTIONS REQUISES ###")
    if no_eval:
        print(f"   - {len(no_eval)} produits n'ont AUCUNE evaluation -> Lancer eval_fast.py")
    if incomplete:
        print(f"   - {len(incomplete)} produits ont des evaluations incompletes -> Re-evaluer")
    if no_geo:
        print(f"   - {len(no_geo)} produits sans couverture geographique -> Enrichir geographie")

    if not no_eval and not incomplete:
        print("   TOUS LES PRODUITS SONT COMPLETEMENT EVALUES!")


if __name__ == "__main__":
    main()
