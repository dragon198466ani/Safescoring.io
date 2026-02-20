#!/usr/bin/env python3
"""Read ÉVALUATIONS DÉTAIL sheet."""
import pandas as pd
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

excel_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'SAFE_SCORING_V7_FINAL.xlsx')
xl = pd.ExcelFile(excel_path)

# Read ÉVALUATIONS DÉTAIL
df = pd.read_excel(xl, sheet_name='ÉVALUATIONS DÉTAIL')

print(f'Columns ({len(df.columns)} total):')
# First 30 columns
for i, col in enumerate(df.columns[:30]):
    print(f'  {i}: {col}')

print(f'\nRows: {len(df)}')

# Show content
pd.set_option('display.max_columns', 10)
pd.set_option('display.width', 200)
pd.set_option('display.max_colwidth', 50)

print('\n\nFirst 20 rows (columns 0-5):')
print(df.iloc[:20, :6].to_string())

# Look for rows that might be norm definitions
print('\n\nLooking for norm codes in first column...')
first_col = df.iloc[:, 0].astype(str)
norm_rows = first_col[first_col.str.match(r'^[SAFE]\d+$', na=False) | first_col.str.match(r'^[SAFE]-', na=False)]
print(f'Found {len(norm_rows)} norm code rows')
if len(norm_rows) > 0:
    print('Sample:')
    for idx in norm_rows.index[:20]:
        row = df.iloc[idx, :6]
        print(f'  {list(row)}')
