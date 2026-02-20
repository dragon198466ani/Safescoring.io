"""
Import norms from SAFE_SCORING_V11_COMPLET.xlsx to Supabase
"""
import pandas as pd
import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'web', '.env.local'))

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Read Excel
excel_path = os.path.join(os.path.dirname(__file__), '..', 'SAFE_SCORING_V11_COMPLET.xlsx')
df = pd.read_excel(excel_path, sheet_name='Toutes Normes')

print(f"Loaded {len(df)} norms from Excel")
print(f"Columns: {list(df.columns)}")

# Get existing norms codes
existing = supabase.table('norms').select('code').execute()
existing_codes = set(n['code'] for n in existing.data if n.get('code'))
print(f"Existing norms in DB: {len(existing_codes)}")

# Prepare data for insert
new_norms = []
updated_norms = []

for _, row in df.iterrows():
    code = str(row['ID']).strip() if pd.notna(row['ID']) else None
    if not code:
        continue
    
    norm_data = {
        'code': code,
        'pillar': str(row['Pilier']).strip() if pd.notna(row['Pilier']) else None,
        'title': str(row['Norme']).strip() if pd.notna(row['Norme']) else None,
        'description': str(row['Description']).strip() if pd.notna(row['Description']) else None,
        'official_link': str(row['Lien']).strip() if pd.notna(row['Lien']) and str(row['Lien']).startswith('http') else None,
        'access_type': str(row['Accès']).strip() if pd.notna(row['Accès']) else None,
        'issuing_authority': str(row['Source']).strip() if pd.notna(row['Source']) else None,
        'is_essential': False,
        'consumer': True,
        'full': True,
    }
    
    if code in existing_codes:
        updated_norms.append(norm_data)
    else:
        new_norms.append(norm_data)

print(f"New norms to insert: {len(new_norms)}")
print(f"Existing norms to update: {len(updated_norms)}")

# Insert new norms in batches
BATCH_SIZE = 100
inserted = 0
errors = 0

for i in range(0, len(new_norms), BATCH_SIZE):
    batch = new_norms[i:i+BATCH_SIZE]
    try:
        result = supabase.table('norms').insert(batch).execute()
        inserted += len(batch)
        print(f"Inserted batch {i//BATCH_SIZE + 1}: {len(batch)} norms")
    except Exception as e:
        errors += len(batch)
        print(f"Error inserting batch {i//BATCH_SIZE + 1}: {e}")

# Update existing norms
updated = 0
for norm in updated_norms:
    try:
        supabase.table('norms').update({
            'title': norm['title'],
            'description': norm['description'],
            'official_link': norm['official_link'],
            'access_type': norm['access_type'],
            'issuing_authority': norm['issuing_authority'],
        }).eq('code', norm['code']).execute()
        updated += 1
    except Exception as e:
        print(f"Error updating {norm['code']}: {e}")

print(f"\n=== SUMMARY ===")
print(f"Inserted: {inserted}")
print(f"Updated: {updated}")
print(f"Errors: {errors}")

# Verify final count
final = supabase.table('norms').select('id', count='exact').execute()
print(f"Total norms in DB now: {final.count}")
