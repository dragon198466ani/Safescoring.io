"""
Import all norms from SAFE_SCORING_V11_COMPLET.xlsx to Supabase
Uses supabase-py with service role key
"""
import pandas as pd
import os
import sys

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client

# Supabase credentials - from project ajdncttomdqojlozxjxu
SUPABASE_URL = "https://ajdncttomdqojlozxjxu.supabase.co"

# Read service role key from environment or prompt
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
if not SUPABASE_KEY:
    print("Please set SUPABASE_SERVICE_ROLE_KEY environment variable")
    print("You can find it in Supabase Dashboard > Settings > API > service_role key")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Read Excel
excel_path = os.path.join(os.path.dirname(__file__), '..', 'SAFE_SCORING_V11_COMPLET.xlsx')
df = pd.read_excel(excel_path, sheet_name='Toutes Normes')

print(f"Loaded {len(df)} norms from Excel")

# Prepare data
norms_to_upsert = []
for _, row in df.iterrows():
    code = str(row['ID']).strip()[:20] if pd.notna(row['ID']) else None
    if not code:
        continue
    
    pillar = str(row['Pilier']).strip()[:1] if pd.notna(row['Pilier']) else None
    if pillar not in ['S', 'A', 'F', 'E']:
        continue
    
    title = str(row['Norme']).strip()[:200] if pd.notna(row['Norme']) else code
    desc = str(row['Description']).strip() if pd.notna(row['Description']) else ''
    link = str(row['Lien']).strip() if pd.notna(row['Lien']) and str(row['Lien']).startswith('http') else None
    access = str(row['Accès']).strip()[:50] if pd.notna(row['Accès']) else None
    source = str(row['Source']).strip()[:100] if pd.notna(row['Source']) else None
    
    norms_to_upsert.append({
        'code': code,
        'pillar': pillar,
        'title': title,
        'description': desc,
        'official_link': link,
        'access_type': access,
        'issuing_authority': source,
        'is_essential': False,
        'consumer': True,
        'full': True,
    })

print(f"Prepared {len(norms_to_upsert)} norms for upsert")

# Upsert in batches
BATCH_SIZE = 100
total_upserted = 0
errors = 0

for i in range(0, len(norms_to_upsert), BATCH_SIZE):
    batch = norms_to_upsert[i:i+BATCH_SIZE]
    try:
        result = supabase.table('norms').upsert(batch, on_conflict='code').execute()
        total_upserted += len(batch)
        print(f"Batch {i//BATCH_SIZE + 1}/{(len(norms_to_upsert) + BATCH_SIZE - 1)//BATCH_SIZE}: {len(batch)} norms upserted")
    except Exception as e:
        errors += len(batch)
        print(f"Error in batch {i//BATCH_SIZE + 1}: {e}")

print(f"\n=== SUMMARY ===")
print(f"Total upserted: {total_upserted}")
print(f"Errors: {errors}")

# Verify final count
final = supabase.table('norms').select('id', count='exact').execute()
print(f"Total norms in DB: {final.count}")
