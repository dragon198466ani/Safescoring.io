"""
Generate a complete SQL file for importing all norms from V11 Excel
Splits into multiple migration files to avoid size limits
"""
import pandas as pd
import os
import re

def clean_text(text, max_len=None):
    """Clean text for SQL insertion"""
    if pd.isna(text):
        return None
    text = str(text).strip()
    # Escape single quotes
    text = text.replace("'", "''")
    # Remove problematic characters
    text = re.sub(r'[^\x20-\x7E\u00C0-\u017F]', '', text)
    if max_len:
        text = text[:max_len]
    return text

# Read Excel
excel_path = r'c:\Users\alexa\Desktop\SafeScoring\SAFE_SCORING_V11_COMPLET.xlsx'
df = pd.read_excel(excel_path, sheet_name='Toutes Normes')

print(f"Loaded {len(df)} norms from Excel")

# Prepare all norms
all_values = []
for _, row in df.iterrows():
    code = clean_text(row['ID'], 20)
    if not code:
        continue
    
    pillar = clean_text(row['Pilier'], 1)
    if pillar not in ['S', 'A', 'F', 'E']:
        continue
    
    title = clean_text(row['Norme'], 200) or code
    desc = clean_text(row['Description']) or ''
    link = str(row['Lien']).strip() if pd.notna(row['Lien']) and str(row['Lien']).startswith('http') else None
    access = clean_text(row['Accès'], 50)
    source = clean_text(row['Source'], 100)
    
    link_sql = f"'{link}'" if link else 'NULL'
    access_sql = f"'{access}'" if access else 'NULL'
    source_sql = f"'{source}'" if source else 'NULL'
    
    all_values.append(f"('{code}', '{pillar}', '{title}', '{desc}', {link_sql}, {access_sql}, {source_sql}, FALSE, TRUE, TRUE)")

print(f"Prepared {len(all_values)} norms")

# Split into batches of 200 for migrations
batch_size = 200
output_dir = r'c:\Users\alexa\Desktop\SafeScoring\config\migrations'

for i in range(0, len(all_values), batch_size):
    batch = all_values[i:i+batch_size]
    batch_num = i // batch_size
    
    sql = f'''-- Migration: Import norms V11 batch {batch_num}
-- Auto-generated from SAFE_SCORING_V11_COMPLET.xlsx

INSERT INTO norms (code, pillar, title, description, official_link, access_type, issuing_authority, is_essential, consumer, "full")
VALUES
{",".join(batch)}
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  official_link = COALESCE(EXCLUDED.official_link, norms.official_link),
  access_type = COALESCE(EXCLUDED.access_type, norms.access_type),
  issuing_authority = COALESCE(EXCLUDED.issuing_authority, norms.issuing_authority);
'''
    
    filename = os.path.join(output_dir, f'086_import_norms_v11_part{batch_num:02d}.sql')
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(sql)
    
    print(f"Created {filename} with {len(batch)} norms")

print(f"\nTotal: {(len(all_values) + batch_size - 1) // batch_size} migration files created")
