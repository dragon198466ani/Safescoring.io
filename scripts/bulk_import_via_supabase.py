"""
Bulk import norms using Supabase REST API directly
"""
import pandas as pd
import requests
import json
import os

# Supabase config
SUPABASE_URL = "https://ajdncttomdqojlozxjxu.supabase.co"
# Get the anon key from the project
SUPABASE_ANON_KEY = "REVOKED_ROTATE_ON_DASHBOARD"

# Try to get service role key from env
SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_ANON_KEY)

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

# Read Excel
excel_path = r'c:\Users\alexa\Desktop\SafeScoring\SAFE_SCORING_V11_COMPLET.xlsx'
df = pd.read_excel(excel_path, sheet_name='Toutes Normes')
print(f"Loaded {len(df)} norms from Excel")

# Prepare data
norms = []
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
    
    norms.append({
        'code': code,
        'pillar': pillar,
        'title': title,
        'description': desc,
        'official_link': link,
        'access_type': access,
        'issuing_authority': source,
        'is_essential': False,
        'consumer': True,
        'full': True
    })

print(f"Prepared {len(norms)} norms for import")

# Import in batches
BATCH_SIZE = 100
total_success = 0
total_errors = 0

for i in range(0, len(norms), BATCH_SIZE):
    batch = norms[i:i+BATCH_SIZE]
    
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/norms",
            headers=headers,
            json=batch
        )
        
        if response.status_code in [200, 201]:
            total_success += len(batch)
            print(f"Batch {i//BATCH_SIZE + 1}: {len(batch)} norms imported")
        else:
            total_errors += len(batch)
            print(f"Batch {i//BATCH_SIZE + 1} error: {response.status_code} - {response.text[:200]}")
    except Exception as e:
        total_errors += len(batch)
        print(f"Batch {i//BATCH_SIZE + 1} exception: {e}")

print(f"\n=== SUMMARY ===")
print(f"Success: {total_success}")
print(f"Errors: {total_errors}")
