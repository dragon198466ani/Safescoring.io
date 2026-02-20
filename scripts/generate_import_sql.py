import pandas as pd

df = pd.read_excel(r'c:\Users\alexa\Desktop\SafeScoring\SAFE_SCORING_V11_COMPLET.xlsx', sheet_name='Toutes Normes')

sql_parts = []
for _, row in df.iterrows():
    code = str(row['ID']).strip() if pd.notna(row['ID']) else None
    if not code:
        continue
    
    pillar = str(row['Pilier']).strip() if pd.notna(row['Pilier']) else None
    if pillar not in ['S', 'A', 'F', 'E']:
        continue
    
    title = str(row['Norme']).strip()[:250].replace("'", "''") if pd.notna(row['Norme']) else code
    desc = str(row['Description']).strip().replace("'", "''") if pd.notna(row['Description']) else ''
    link = str(row['Lien']).strip() if pd.notna(row['Lien']) and str(row['Lien']).startswith('http') else None
    access = str(row['Accès']).strip().replace("'", "''") if pd.notna(row['Accès']) else None
    source = str(row['Source']).strip().replace("'", "''") if pd.notna(row['Source']) else None
    
    link_sql = f"'{link}'" if link else 'NULL'
    access_sql = f"'{access}'" if access else 'NULL'
    source_sql = f"'{source}'" if source else 'NULL'
    
    sql_parts.append(f"('{code}', '{pillar}', '{title}', '{desc}', {link_sql}, {access_sql}, {source_sql}, FALSE, TRUE, TRUE)")

with open(r'c:\Users\alexa\Desktop\SafeScoring\data\import_norms_v11.sql', 'w', encoding='utf-8') as f:
    f.write('-- Import norms from V11 Excel\n')
    f.write('INSERT INTO norms (code, pillar, title, description, official_link, access_type, issuing_authority, is_essential, consumer, "full")\n')
    f.write('VALUES\n')
    f.write(',\n'.join(sql_parts))
    f.write('\nON CONFLICT (code) DO UPDATE SET\n')
    f.write('  title = EXCLUDED.title,\n')
    f.write('  description = EXCLUDED.description,\n')
    f.write('  official_link = COALESCE(EXCLUDED.official_link, norms.official_link),\n')
    f.write('  access_type = COALESCE(EXCLUDED.access_type, norms.access_type),\n')
    f.write('  issuing_authority = COALESCE(EXCLUDED.issuing_authority, norms.issuing_authority);\n')

print(f'Generated SQL with {len(sql_parts)} norms')
