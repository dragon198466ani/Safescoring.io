#!/usr/bin/env python3
"""
Analyse complète de toutes les feuilles Excel
"""

import pandas as pd

excel_file = 'SAFE_SCORING_V7_FINAL.xlsx'
excel = pd.ExcelFile(excel_file)

print('📊 ANALYSE COMPLÈTE DE TOUTES LES FEUILLES')
print('=' * 70)

for sheet in excel.sheet_names:
    print(f'\n📋 FEUILLE: {sheet}')
    print('-' * 50)
    
    df_full = pd.read_excel(excel_file, sheet_name=sheet)
    df = pd.read_excel(excel_file, sheet_name=sheet, nrows=5)
    
    print(f'   Lignes: {len(df_full)}')
    print(f'   Colonnes: {len(df.columns)}')
    
    # Premières colonnes
    cols = [str(c)[:35] for c in df.columns[:10]]
    print(f'   Colonnes: {cols}')
    
    # Aperçu des données
    print(f'   Aperçu ligne 0:')
    if len(df) > 0:
        for i, col in enumerate(df.columns[:5]):
            val = str(df.iloc[0][col])[:50] if pd.notna(df.iloc[0][col]) else 'NaN'
            print(f'      {str(col)[:20]}: {val}')
