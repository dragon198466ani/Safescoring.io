#!/usr/bin/env python3
"""Read Excel file with norms and show structure."""
import pandas as pd
import os
import sys

# Fix encoding for Windows
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Read Excel file
excel_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'SAFE_SCORING_V7_FINAL.xlsx')
xl = pd.ExcelFile(excel_path)

print('Sheets:', xl.sheet_names)
print()

# Read each sheet
for sheet in xl.sheet_names:
    print(f'\n{"="*70}')
    print(f'=== {sheet} ===')
    print(f'{"="*70}')
    df = pd.read_excel(xl, sheet_name=sheet)
    print('Columns:', list(df.columns))
    print(f'Total rows: {len(df)}')
    print('\nFirst 15 rows:')
    pd.set_option('display.max_columns', None)
    pd.set_option('display.width', 200)
    pd.set_option('display.max_colwidth', 50)
    print(df.head(15).to_string())
