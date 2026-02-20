#!/usr/bin/env python3
"""Read DÉFINITIONS NORMES sheet from Excel."""
import pandas as pd
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

excel_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'SAFE_SCORING_V7_FINAL.xlsx')
xl = pd.ExcelFile(excel_path)

# Read the norms definition sheet
df = pd.read_excel(xl, sheet_name='DÉFINITIONS NORMES')

print('Columns:', list(df.columns))
print(f'Total rows: {len(df)}')
print()

pd.set_option('display.max_columns', None)
pd.set_option('display.width', 300)
pd.set_option('display.max_colwidth', 80)

# Show first 30 rows
print('First 50 rows:')
print(df.head(50).to_string())

# Show unique values in certain columns
print('\n\n=== Sample of norms by pillar ===')
if 'pillar' in df.columns or 'PILLAR' in df.columns:
    pillar_col = 'pillar' if 'pillar' in df.columns else 'PILLAR'
    for pillar in df[pillar_col].unique()[:5]:
        print(f'\n{pillar}:')
        subset = df[df[pillar_col] == pillar].head(10)
        for _, row in subset.iterrows():
            code = row.get('code') or row.get('CODE') or row.get('Code') or ''
            title = row.get('title') or row.get('TITLE') or row.get('Title') or row.get('Nom') or ''
            ref = row.get('official_reference') or row.get('Référence') or row.get('reference') or ''
            print(f'  {code}: {title[:60]} | Ref: {ref}')
