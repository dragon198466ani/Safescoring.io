#!/usr/bin/env python3
"""Read all sheets to find norm definitions with official references."""
import pandas as pd
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

excel_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'SAFE_SCORING_V7_FINAL.xlsx')
xl = pd.ExcelFile(excel_path)

print('Looking for norm definitions with references...\n')

# Check each sheet for norm definitions
for sheet in xl.sheet_names:
    df = pd.read_excel(xl, sheet_name=sheet)

    # Look for columns that might contain norm codes and references
    cols_lower = [str(c).lower() for c in df.columns]
    has_code = any('code' in c for c in cols_lower)
    has_ref = any('ref' in c or 'link' in c or 'standard' in c for c in cols_lower)

    if has_code or has_ref or 'norm' in sheet.lower():
        print(f'=== {sheet} ===')
        print(f'Columns: {list(df.columns)[:10]}')  # First 10 columns
        if len(df.columns) > 10:
            print(f'  ... and {len(df.columns) - 10} more columns')
        print(f'Rows: {len(df)}')
        print()

# Try reading ÉVALUATIONS COMPLÈTES which might have all norm details
print('\n' + '='*70)
print('=== ÉVALUATIONS COMPLÈTES (Full evaluations) ===')
print('='*70)
df = pd.read_excel(xl, sheet_name='ÉVALUATIONS COMPLÈTES')
print(f'Columns ({len(df.columns)} total):')
for col in df.columns:
    print(f'  - {col}')

print('\nFirst 5 rows (first 10 columns):')
pd.set_option('display.max_columns', 10)
pd.set_option('display.width', 200)
print(df.iloc[:5, :10].to_string())

# Try NORMES HÉRITAGE
print('\n' + '='*70)
print('=== NORMES HÉRITAGE ===')
print('='*70)
df = pd.read_excel(xl, sheet_name='NORMES HÉRITAGE')
print(f'Columns ({len(df.columns)} total):')
for col in df.columns:
    print(f'  - {col}')

print('\nFirst 20 rows:')
pd.set_option('display.max_columns', None)
pd.set_option('display.max_colwidth', 60)
print(df.head(20).to_string())
