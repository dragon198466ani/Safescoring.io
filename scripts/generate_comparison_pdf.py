#!/usr/bin/env python3
"""
Generate PDF comparison report for Morpho vs Aave evaluations
"""
import sys
sys.path.insert(0, 'c:/Users/alexa/Desktop/SafeScoring')

import requests
from fpdf import FPDF
from datetime import datetime
from scripts.config_helper import SUPABASE_URL, get_supabase_headers

headers = get_supabase_headers()

def clean_text(text):
    """Clean text for latin-1 compatibility"""
    if not text:
        return ''
    replacements = {
        '\u2265': '>=', '\u2264': '<=', '\u2260': '!=',
        '\u2019': "'", '\u2018': "'", '\u201c': '"', '\u201d': '"',
        '\u2013': '-', '\u2014': '-', '\u2026': '...',
        '\u00e9': 'e', '\u00e8': 'e', '\u00ea': 'e',
        '\u00e0': 'a', '\u00e2': 'a',
        '\u00f9': 'u', '\u00fb': 'u',
        '\u00ee': 'i', '\u00ef': 'i',
        '\u00f4': 'o', '\u00e7': 'c',
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return ''.join(c if ord(c) < 256 else '?' for c in text)


def main():
    print('Chargement des donnees...')

    # 1. Load all norms
    all_norms = []
    offset = 0
    while True:
        resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title&order=pillar,code&offset={offset}&limit=1000',
            headers=headers
        )
        if resp.status_code != 200 or not resp.json():
            break
        all_norms.extend(resp.json())
        offset += 1000
        if len(resp.json()) < 1000:
            break
    print(f'  {len(all_norms)} normes chargees')

    # 2. Load Morpho evaluations (with pagination)
    morpho_evals = {}
    offset = 0
    while True:
        resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.229&select=norm_id,result&offset={offset}&limit=1000',
            headers=headers
        )
        if resp.status_code != 200 or not resp.json():
            break
        for e in resp.json():
            morpho_evals[e['norm_id']] = e['result']
        offset += 1000
        if len(resp.json()) < 1000:
            break
    print(f'  Morpho: {len(morpho_evals)} evaluations')

    # 3. Load Aave evaluations (with pagination)
    aave_evals = {}
    offset = 0
    while True:
        resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.120&select=norm_id,result&offset={offset}&limit=1000',
            headers=headers
        )
        if resp.status_code != 200 or not resp.json():
            break
        for e in resp.json():
            aave_evals[e['norm_id']] = e['result']
        offset += 1000
        if len(resp.json()) < 1000:
            break
    print(f'  Aave: {len(aave_evals)} evaluations')

    # 4. Load scores
    resp = requests.get(f'{SUPABASE_URL}/rest/v1/safe_scoring_results?product_id=eq.229', headers=headers)
    morpho_score = resp.json()[0] if resp.json() else {}

    resp = requests.get(f'{SUPABASE_URL}/rest/v1/safe_scoring_results?product_id=eq.120', headers=headers)
    aave_score = resp.json()[0] if resp.json() else {}

    print('\nGeneration du PDF...')

    # Create PDF
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Title
    pdf.set_font('Helvetica', 'B', 16)
    pdf.cell(0, 10, 'SafeScoring - Comparatif Morpho vs Aave', new_x='LMARGIN', new_y='NEXT', align='C')
    pdf.set_font('Helvetica', '', 10)
    pdf.cell(0, 6, f'Genere le {datetime.now().strftime("%Y-%m-%d %H:%M")} - {len(all_norms)} normes', new_x='LMARGIN', new_y='NEXT', align='C')
    pdf.ln(10)

    # Score summary
    pdf.set_font('Helvetica', 'B', 14)
    pdf.cell(0, 8, 'RESUME DES SCORES SAFE', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(3)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.set_fill_color(200, 200, 200)
    pdf.cell(70, 7, 'Metrique', 1, 0, 'C', True)
    pdf.cell(35, 7, 'Morpho', 1, 0, 'C', True)
    pdf.cell(35, 7, 'Aave', 1, 0, 'C', True)
    pdf.cell(35, 7, 'Difference', 1, 1, 'C', True)

    pdf.set_font('Helvetica', '', 10)
    scores = [
        ('Note Finale', 'note_finale'),
        ('Security (S)', 'score_s'),
        ('Anti-coercion (A)', 'score_a'),
        ('Fiability (F)', 'score_f'),
        ('Ecosystem (E)', 'score_e'),
    ]

    for label, key in scores:
        m_val = morpho_score.get(key) or 0
        a_val = aave_score.get(key) or 0
        diff = a_val - m_val if m_val and a_val else 0

        pdf.cell(70, 6, label, 1, 0)
        pdf.cell(35, 6, f'{m_val}%' if m_val else 'N/A', 1, 0, 'C')
        pdf.cell(35, 6, f'{a_val}%' if a_val else 'N/A', 1, 0, 'C')
        pdf.cell(35, 6, f'{diff:+.1f}%' if diff else '-', 1, 1, 'C')

    pdf.ln(10)

    # Stats
    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(0, 8, 'STATISTIQUES DES EVALUATIONS', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(3)

    def count_results(evals):
        counts = {'YES': 0, 'YESp': 0, 'NO': 0, 'TBD': 0, 'N/A': 0}
        for r in evals.values():
            if r in counts:
                counts[r] += 1
        return counts

    m_counts = count_results(morpho_evals)
    a_counts = count_results(aave_evals)

    pdf.set_font('Helvetica', 'B', 9)
    pdf.cell(50, 6, 'Resultat', 1, 0, 'C', True)
    pdf.cell(35, 6, 'Morpho', 1, 0, 'C', True)
    pdf.cell(35, 6, 'Aave', 1, 0, 'C', True)
    pdf.cell(50, 6, 'Description', 1, 1, 'C', True)

    pdf.set_font('Helvetica', '', 9)
    result_desc = {
        'YES': 'Conforme',
        'YESp': 'Conforme (inherent)',
        'NO': 'Non conforme',
        'TBD': 'A verifier',
        'N/A': 'Non applicable'
    }
    for res in ['YES', 'YESp', 'NO', 'TBD', 'N/A']:
        pdf.cell(50, 5, res, 1, 0, 'C')
        pdf.cell(35, 5, str(m_counts.get(res, 0)), 1, 0, 'C')
        pdf.cell(35, 5, str(a_counts.get(res, 0)), 1, 0, 'C')
        pdf.cell(50, 5, result_desc[res], 1, 1)

    # Evaluation tables by pillar
    pillars = {'S': 'Security', 'A': 'Anti-coercion', 'F': 'Fiability', 'E': 'Ecosystem'}

    for pillar_code, pillar_name in pillars.items():
        pillar_norms = [n for n in all_norms if n.get('pillar') == pillar_code]

        if not pillar_norms:
            continue

        pdf.add_page()
        pdf.set_font('Helvetica', 'B', 14)
        pdf.cell(0, 8, f'PILIER {pillar_code}: {pillar_name.upper()} ({len(pillar_norms)} normes)', new_x='LMARGIN', new_y='NEXT')
        pdf.ln(3)

        # Header
        pdf.set_font('Helvetica', 'B', 8)
        pdf.set_fill_color(220, 220, 220)
        pdf.cell(22, 6, 'Code', 1, 0, 'C', True)
        pdf.cell(88, 6, 'Titre', 1, 0, 'C', True)
        pdf.cell(22, 6, 'Morpho', 1, 0, 'C', True)
        pdf.cell(22, 6, 'Aave', 1, 0, 'C', True)
        pdf.cell(22, 6, 'Match', 1, 1, 'C', True)

        pdf.set_font('Helvetica', '', 7)

        matches = 0
        for norm in pillar_norms:
            nid = norm['id']
            code = clean_text(norm.get('code', ''))[:18]
            title = clean_text(norm.get('title', ''))[:55]

            m_result = morpho_evals.get(nid, '-')
            a_result = aave_evals.get(nid, '-')

            is_match = m_result == a_result
            if is_match:
                matches += 1

            pdf.cell(22, 4.5, code, 1, 0)
            pdf.cell(88, 4.5, title, 1, 0)
            pdf.cell(22, 4.5, m_result, 1, 0, 'C')
            pdf.cell(22, 4.5, a_result, 1, 0, 'C')
            pdf.cell(22, 4.5, 'OK' if is_match else 'DIFF', 1, 1, 'C')

        # Stats
        pdf.ln(2)
        pdf.set_font('Helvetica', 'I', 8)
        pct = 100 * matches // len(pillar_norms) if pillar_norms else 0
        pdf.cell(0, 5, f'Pilier {pillar_code}: {matches}/{len(pillar_norms)} identiques ({pct}%)', new_x='LMARGIN', new_y='NEXT')

    # Final page - Notable differences
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 14)
    pdf.cell(0, 8, 'DIFFERENCES NOTABLES (YES/NO uniquement)', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(3)

    pdf.set_font('Helvetica', '', 8)
    diff_count = 0
    for norm in all_norms:
        nid = norm['id']
        m_result = morpho_evals.get(nid, '-')
        a_result = aave_evals.get(nid, '-')

        # Show only significant differences (YES vs NO or similar)
        significant = (
            (m_result in ['YES', 'YESp'] and a_result == 'NO') or
            (a_result in ['YES', 'YESp'] and m_result == 'NO')
        )
        if significant:
            code = clean_text(norm.get('code', ''))
            title = clean_text(norm.get('title', ''))[:40]
            pdf.cell(0, 4.5, f'{code}: {title} | Morpho={m_result}, Aave={a_result}', new_x='LMARGIN', new_y='NEXT')
            diff_count += 1
            if diff_count >= 80:
                pdf.cell(0, 5, '... (voir details par pilier)', new_x='LMARGIN', new_y='NEXT')
                break

    if diff_count == 0:
        pdf.cell(0, 5, 'Aucune difference significative YES/NO trouvee', new_x='LMARGIN', new_y='NEXT')

    # Save
    output_path = 'c:/Users/alexa/Desktop/SafeScoring/comparatif_morpho_aave.pdf'
    pdf.output(output_path)
    print(f'\nPDF genere: {output_path}')
    print(f'  {len(all_norms)} normes comparees')
    print(f'  Morpho: {len(morpho_evals)} evaluations')
    print(f'  Aave: {len(aave_evals)} evaluations')


if __name__ == '__main__':
    main()
