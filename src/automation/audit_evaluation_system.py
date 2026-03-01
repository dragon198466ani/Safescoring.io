#!/usr/bin/env python3
"""
SAFESCORING.IO - Evaluation System Auditor
Comprehensive audit of the evaluation pipeline:
1. Types: DB types vs hardcoded TYPE_ALIASES sync check
2. Applicability: Norm coverage per product type
3. Evaluations: Distribution analysis for aberrant scores (100% and <10%)
4. Cross-validation: Norm dependencies consistency

Usage:
    python -m src.automation.audit_evaluation_system
    python -m src.automation.audit_evaluation_system --section types
    python -m src.automation.audit_evaluation_system --section scores
    python -m src.automation.audit_evaluation_system --section all
"""

import sys
import os
import argparse
import json
from datetime import datetime
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS
from src.core.supabase_pagination import fetch_all
from src.core.norm_applicability_complete import ALL_PRODUCT_TYPES, TYPE_ALIASES, NORM_APPLICABILITY


def audit_types():
    """Audit 1: Compare DB product_types vs hardcoded TYPE_ALIASES."""
    print("\n" + "=" * 70)
    print("   AUDIT 1: Product Types — DB vs Hardcoded")
    print("=" * 70)

    # Fetch product_types from Supabase
    db_types = fetch_all('product_types', select='id,code,name,is_hardware,is_wallet,is_defi,is_protocol', order='code')
    print(f"\n   DB product_types: {len(db_types)} types")

    # Hardcoded types
    print(f"   Hardcoded ALL_PRODUCT_TYPES: {len(ALL_PRODUCT_TYPES)} canonical types")
    print(f"   Hardcoded TYPE_ALIASES: {len(TYPE_ALIASES)} aliases")

    # DB type codes
    db_type_codes = set()
    db_type_by_code = {}
    for t in db_types:
        code = t.get('code', '').upper()
        if code:
            db_type_codes.add(code)
            db_type_by_code[code] = t

    # Hardcoded canonical + aliases (all known types)
    hardcoded_all = set(ALL_PRODUCT_TYPES)
    alias_sources = set(TYPE_ALIASES.keys())
    alias_targets = set(TYPE_ALIASES.values())

    # Find DB types NOT in hardcoded (neither canonical nor alias)
    missing_in_hardcoded = []
    for code in sorted(db_type_codes):
        if code not in hardcoded_all and code not in alias_sources:
            missing_in_hardcoded.append(code)

    if missing_in_hardcoded:
        print(f"\n   🔴 DB TYPES NOT IN HARDCODED ({len(missing_in_hardcoded)}):")
        print(f"      These types have NO applicability rules → products with these types get ZERO norms")
        for code in missing_in_hardcoded:
            t = db_type_by_code.get(code, {})
            name = t.get('name', '?')
            print(f"      - {code} ({name})")
    else:
        print(f"\n   ✅ All DB types are covered by hardcoded rules")

    # Find hardcoded types NOT in DB
    hardcoded_not_in_db = sorted(hardcoded_all - db_type_codes - alias_sources)
    if hardcoded_not_in_db:
        print(f"\n   ⚠️  HARDCODED TYPES NOT IN DB ({len(hardcoded_not_in_db)}):")
        print(f"      These canonical types exist in rules but not in the database")
        for code in hardcoded_not_in_db:
            print(f"      - {code}")

    # Check alias targets point to valid canonical types
    bad_aliases = []
    for alias, target in TYPE_ALIASES.items():
        if target not in hardcoded_all:
            bad_aliases.append((alias, target))
    if bad_aliases:
        print(f"\n   🔴 BROKEN ALIASES ({len(bad_aliases)}):")
        for alias, target in bad_aliases:
            print(f"      - {alias} → {target} (target not in ALL_PRODUCT_TYPES)")

    # Fetch products and check type assignment
    products = fetch_all('products', select='id,name,type_id', order='name')
    product_type_mapping = fetch_all('product_type_mapping', select='product_id,type_id', order='product_id')

    # Count products per type
    type_id_to_code = {t['id']: t.get('code', '').upper() for t in db_types}
    products_per_type = defaultdict(int)

    # Products with old type_id
    products_with_type = 0
    products_without_type = 0
    products_with_mapping = set()

    for p in products:
        if p.get('type_id'):
            products_with_type += 1
            type_code = type_id_to_code.get(p['type_id'], 'UNKNOWN')
            products_per_type[type_code] += 1
        else:
            products_without_type += 1

    for m in product_type_mapping:
        products_with_mapping.add(m['product_id'])
        type_code = type_id_to_code.get(m['type_id'], 'UNKNOWN')
        products_per_type[type_code] += 1

    print(f"\n   Products with type_id: {products_with_type}")
    print(f"   Products with multi-type mapping: {len(products_with_mapping)}")
    print(f"   Products WITHOUT any type: {products_without_type}")

    if products_without_type > 0:
        print(f"\n   🔴 PRODUCTS WITHOUT TYPE ({products_without_type}):")
        no_type = [p for p in products if not p.get('type_id')]
        for p in no_type[:20]:
            has_mapping = p['id'] in products_with_mapping
            mapping_str = " (has multi-type mapping)" if has_mapping else " ← NO TYPE AT ALL"
            print(f"      [{p['id']:>4}] {p['name'][:40]}{mapping_str}")
        if len(no_type) > 20:
            print(f"      ... and {len(no_type) - 20} more")

    # Products with types that are missing from hardcoded rules
    if missing_in_hardcoded:
        orphan_type_ids = {t['id'] for t in db_types if t.get('code', '').upper() in missing_in_hardcoded}
        orphan_products = [p for p in products if p.get('type_id') in orphan_type_ids]
        if orphan_products:
            print(f"\n   🔴 PRODUCTS WITH UNMAPPED TYPES ({len(orphan_products)}):")
            print(f"      These products use types that have NO applicability rules")
            for p in orphan_products[:20]:
                type_code = type_id_to_code.get(p.get('type_id'), 'UNKNOWN')
                print(f"      [{p['id']:>4}] {p['name'][:40]} (type: {type_code})")
            if len(orphan_products) > 20:
                print(f"      ... and {len(orphan_products) - 20} more")

    return {
        'db_types': len(db_types),
        'hardcoded_types': len(ALL_PRODUCT_TYPES),
        'missing_in_hardcoded': missing_in_hardcoded,
        'products_without_type': products_without_type,
    }


def audit_applicability():
    """Audit 2: Check norm applicability coverage."""
    print("\n" + "=" * 70)
    print("   AUDIT 2: Norm Applicability Coverage")
    print("=" * 70)

    # Fetch from Supabase
    norms = fetch_all('norms', select='id,code,pillar,is_essential,consumer,full,title', order='code')
    norm_applicability = fetch_all('norm_applicability', select='norm_id,type_id,is_applicable', order='norm_id')
    db_types = fetch_all('product_types', select='id,code,name', order='code')

    type_id_to_code = {t['id']: t.get('code', '').upper() for t in db_types}
    norm_id_to_code = {n['id']: n.get('code', '') for n in norms}

    print(f"\n   Norms in DB: {len(norms)}")
    print(f"   Norm applicability rows: {len(norm_applicability)}")
    print(f"   Product types: {len(db_types)}")

    # Count applicable norms per type
    applicable_per_type = defaultdict(int)
    total_per_type = defaultdict(int)

    for na in norm_applicability:
        type_code = type_id_to_code.get(na['type_id'], 'UNKNOWN')
        total_per_type[type_code] += 1
        if na.get('is_applicable'):
            applicable_per_type[type_code] += 1

    # Norms per pillar
    norms_per_pillar = defaultdict(int)
    essential_per_pillar = defaultdict(int)
    for n in norms:
        pillar = n.get('pillar', '?')
        norms_per_pillar[pillar] += 1
        if n.get('is_essential'):
            essential_per_pillar[pillar] += 1

    print(f"\n   Norms per pillar:")
    for p in ['S', 'A', 'F', 'E']:
        print(f"      {p}: {norms_per_pillar.get(p, 0)} total, {essential_per_pillar.get(p, 0)} essential")

    # Types with very few or very many applicable norms
    print(f"\n   Applicable norms per type:")
    type_stats = []
    for type_code in sorted(applicable_per_type.keys()):
        applicable = applicable_per_type[type_code]
        total = total_per_type[type_code]
        pct = round(applicable / len(norms) * 100, 1) if len(norms) > 0 else 0
        type_stats.append((type_code, applicable, pct))
        icon = '🔴' if pct < 5 else '🟡' if pct < 20 else '✅'
        print(f"      {icon} {type_code:<25} {applicable:>4} applicable ({pct}%)")

    # Types with ZERO applicability rows (missing from norm_applicability table)
    types_with_rules = set(type_id_to_code[na['type_id']] for na in norm_applicability if na['type_id'] in type_id_to_code)
    all_db_codes = set(type_id_to_code.values())
    types_without_rules = all_db_codes - types_with_rules
    if types_without_rules:
        print(f"\n   🔴 TYPES WITH ZERO APPLICABILITY RULES ({len(types_without_rules)}):")
        for code in sorted(types_without_rules):
            print(f"      - {code}")

    # Check hardcoded NORM_APPLICABILITY vs DB norm_applicability
    hardcoded_norm_count = len(NORM_APPLICABILITY)
    print(f"\n   Hardcoded NORM_APPLICABILITY entries: {hardcoded_norm_count}")
    print(f"   DB norm_applicability rows: {len(norm_applicability)}")

    return {
        'norms_total': len(norms),
        'applicability_rows': len(norm_applicability),
        'types_without_rules': sorted(types_without_rules),
    }


def audit_scores():
    """Audit 3: Analyze score distribution and aberrant scores."""
    print("\n" + "=" * 70)
    print("   AUDIT 3: Score Distribution & Aberrant Scores")
    print("=" * 70)

    # Fetch scores
    scores = fetch_all('safe_scoring_results',
                       select='product_id,note_finale,score_s,score_a,score_f,score_e,total_norms_evaluated,total_yes,total_no,total_na,total_tbd',
                       order='note_finale')
    products = fetch_all('products', select='id,name,slug,type_id,url', order='name')
    db_types = fetch_all('product_types', select='id,code,name', order='code')

    product_by_id = {p['id']: p for p in products}
    type_id_to_code = {t['id']: t.get('code', '').upper() for t in db_types}

    print(f"\n   Products with scores: {len(scores)}")
    print(f"   Total products: {len(products)}")

    if not scores:
        print("   ⚠️  No scores found!")
        return {}

    # Score distribution
    score_values = [s['note_finale'] for s in scores if s.get('note_finale') is not None]
    if score_values:
        avg = sum(score_values) / len(score_values)
        median = sorted(score_values)[len(score_values) // 2]
        print(f"\n   Score stats (note_finale):")
        print(f"      Average: {avg:.1f}%")
        print(f"      Median: {median:.1f}%")
        print(f"      Min: {min(score_values):.1f}%")
        print(f"      Max: {max(score_values):.1f}%")

        # Distribution buckets
        buckets = {'0-10%': 0, '10-20%': 0, '20-30%': 0, '30-40%': 0, '40-50%': 0,
                   '50-60%': 0, '60-70%': 0, '70-80%': 0, '80-90%': 0, '90-100%': 0}
        for v in score_values:
            if v <= 10: buckets['0-10%'] += 1
            elif v <= 20: buckets['10-20%'] += 1
            elif v <= 30: buckets['20-30%'] += 1
            elif v <= 40: buckets['30-40%'] += 1
            elif v <= 50: buckets['40-50%'] += 1
            elif v <= 60: buckets['50-60%'] += 1
            elif v <= 70: buckets['60-70%'] += 1
            elif v <= 80: buckets['70-80%'] += 1
            elif v <= 90: buckets['80-90%'] += 1
            else: buckets['90-100%'] += 1

        print(f"\n   Score distribution:")
        for bucket, count in buckets.items():
            bar = '█' * (count * 2) if count < 40 else '█' * 80
            print(f"      {bucket:>8} | {bar} {count}")

    # Aberrant scores: 100% and < 10%
    perfect_scores = [s for s in scores if s.get('note_finale') is not None and s['note_finale'] >= 99.0]
    very_low_scores = [s for s in scores if s.get('note_finale') is not None and s['note_finale'] < 10.0]

    if perfect_scores:
        print(f"\n   🔴 PERFECT SCORES (≥99%) — {len(perfect_scores)} products:")
        print(f"      Likely caused by: few applicable norms + all YES/YESp")
        for s in perfect_scores[:15]:
            p = product_by_id.get(s['product_id'], {})
            name = p.get('name', f"ID:{s['product_id']}")
            type_code = type_id_to_code.get(p.get('type_id'), '?')
            yes = s.get('total_yes', 0)
            no = s.get('total_no', 0)
            na = s.get('total_na', 0)
            total = s.get('total_norms_evaluated', 0)
            score_base = yes + no
            print(f"      {s['note_finale']:>5.1f}% | {name[:35]:<35} | type:{type_code:<15} | Y:{yes} N:{no} NA:{na} total:{total}")

    if very_low_scores:
        print(f"\n   🔴 VERY LOW SCORES (<10%) — {len(very_low_scores)} products:")
        print(f"      Likely caused by: scraping failed + TBD→NO + many applicable norms")
        for s in very_low_scores[:15]:
            p = product_by_id.get(s['product_id'], {})
            name = p.get('name', f"ID:{s['product_id']}")
            type_code = type_id_to_code.get(p.get('type_id'), '?')
            url = p.get('url', 'NO URL')
            yes = s.get('total_yes', 0)
            no = s.get('total_no', 0)
            na = s.get('total_na', 0)
            tbd = s.get('total_tbd', 0)
            total = s.get('total_norms_evaluated', 0)
            print(f"      {s['note_finale']:>5.1f}% | {name[:35]:<35} | type:{type_code:<15} | Y:{yes} N:{no} NA:{na} TBD:{tbd}")

    # Analyze YES/NO ratio per type
    print(f"\n   Average score by product type:")
    type_scores = defaultdict(list)
    for s in scores:
        if s.get('note_finale') is not None:
            p = product_by_id.get(s['product_id'], {})
            type_code = type_id_to_code.get(p.get('type_id'), 'UNKNOWN')
            type_scores[type_code].append(s['note_finale'])

    type_avg = []
    for type_code, vals in type_scores.items():
        avg = sum(vals) / len(vals)
        type_avg.append((type_code, avg, len(vals)))

    type_avg.sort(key=lambda x: x[1])
    for type_code, avg, count in type_avg:
        icon = '🔴' if avg < 15 else '🟡' if avg < 40 else '✅'
        print(f"      {icon} {type_code:<25} avg:{avg:>5.1f}% ({count} products)")

    # Products with ZERO evaluations but in products table
    product_ids_with_scores = {s['product_id'] for s in scores}
    products_without_scores = [p for p in products if p['id'] not in product_ids_with_scores]
    if products_without_scores:
        print(f"\n   ⚠️  Products WITHOUT any scores: {len(products_without_scores)}")
        for p in products_without_scores[:10]:
            print(f"      [{p['id']:>4}] {p['name'][:40]}")

    return {
        'total_scores': len(scores),
        'perfect_scores': len(perfect_scores),
        'very_low_scores': len(very_low_scores),
        'products_without_scores': len(products_without_scores),
    }


def audit_evaluations_detail():
    """Audit 4: Detailed evaluation analysis for worst/best products."""
    print("\n" + "=" * 70)
    print("   AUDIT 4: Detailed Evaluation Analysis (Top/Bottom)")
    print("=" * 70)

    scores = fetch_all('safe_scoring_results',
                       select='product_id,note_finale,score_s,score_a,score_f,score_e',
                       order='note_finale')
    products = fetch_all('products', select='id,name,slug,type_id,url', order='name')
    product_by_id = {p['id']: p for p in products}

    if not scores:
        print("   No scores found.")
        return

    # Pick 3 worst and 3 best
    scored = [s for s in scores if s.get('note_finale') is not None]
    if len(scored) < 6:
        print("   Not enough scored products for analysis.")
        return

    worst_3 = scored[:3]
    best_3 = scored[-3:]
    targets = worst_3 + best_3

    for s in targets:
        pid = s['product_id']
        p = product_by_id.get(pid, {})
        name = p.get('name', f'ID:{pid}')
        url = p.get('url', 'NO URL')

        print(f"\n   {'─' * 60}")
        print(f"   {name} — {s['note_finale']:.1f}%")
        print(f"   URL: {url[:60]}")
        print(f"   S:{s.get('score_s', '?')}  A:{s.get('score_a', '?')}  F:{s.get('score_f', '?')}  E:{s.get('score_e', '?')}")

        # Fetch evaluations for this product
        evals = fetch_all('evaluations',
                          select='norm_id,result,why_this_result,evaluated_by',
                          filters={'product_id': f'eq.{pid}'},
                          order='norm_id')

        if not evals:
            print(f"   ⚠️  No evaluations found!")
            continue

        # Count results
        result_counts = defaultdict(int)
        for e in evals:
            result_counts[e.get('result', 'UNKNOWN')] += 1

        total = len(evals)
        print(f"   Evaluations: {total}")
        for result, count in sorted(result_counts.items(), key=lambda x: -x[1]):
            pct = round(count / total * 100, 1)
            print(f"      {result:<6} {count:>4} ({pct}%)")

        # Show NO evaluations with reasons (first 5)
        no_evals = [e for e in evals if e.get('result') == 'NO']
        if no_evals:
            print(f"   Sample NO reasons ({min(5, len(no_evals))}/{len(no_evals)}):")
            for e in no_evals[:5]:
                reason = (e.get('why_this_result') or 'no reason')[:80]
                print(f"      - {reason}")


def run_full_audit(section='all'):
    """Run the full audit."""
    print("=" * 70)
    print("   SAFESCORING — EVALUATION SYSTEM AUDIT")
    print(f"   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    results = {}

    if section in ('all', 'types'):
        results['types'] = audit_types()

    if section in ('all', 'applicability'):
        results['applicability'] = audit_applicability()

    if section in ('all', 'scores'):
        results['scores'] = audit_scores()

    if section in ('all', 'detail'):
        audit_evaluations_detail()

    # Final summary
    print(f"\n{'=' * 70}")
    print("   AUDIT SUMMARY")
    print(f"{'=' * 70}")

    if 'types' in results:
        t = results['types']
        missing = t.get('missing_in_hardcoded', [])
        print(f"   Types: {t.get('db_types', 0)} DB / {t.get('hardcoded_types', 0)} hardcoded — {len(missing)} MISSING")
        if missing:
            print(f"      → ACTION: Add TYPE_ALIASES for: {', '.join(missing[:10])}")

    if 'applicability' in results:
        a = results['applicability']
        no_rules = a.get('types_without_rules', [])
        print(f"   Applicability: {a.get('norms_total', 0)} norms, {a.get('applicability_rows', 0)} rules — {len(no_rules)} types WITHOUT rules")
        if no_rules:
            print(f"      → ACTION: Generate applicability for: {', '.join(no_rules[:10])}")

    if 'scores' in results:
        s = results['scores']
        print(f"   Scores: {s.get('perfect_scores', 0)} at 100%, {s.get('very_low_scores', 0)} below 10%")
        print(f"   Products without scores: {s.get('products_without_scores', 0)}")

    print(f"\n{'=' * 70}")

    return results


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Audit evaluation system')
    parser.add_argument('--section', choices=['all', 'types', 'applicability', 'scores', 'detail'],
                        default='all', help='Which section to audit')
    args = parser.parse_args()

    run_full_audit(section=args.section)
