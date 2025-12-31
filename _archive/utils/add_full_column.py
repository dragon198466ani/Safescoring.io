#!/usr/bin/env python3
"""Ajoute et met à jour la colonne full dans norms"""

import requests

config = {}
with open('env_template_free.txt', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            config[key.strip()] = value.strip()

SUPABASE_URL = config.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

print("📋 Mise à jour colonne 'full' dans norms")
print("=" * 50)

# Mettre à jour toutes les normes avec full=true
r = requests.patch(
    f"{SUPABASE_URL}/rest/v1/norms?id=gte.0",
    headers=headers,
    json={'full': True},
    timeout=60
)

print(f"Status: {r.status_code}")

if r.status_code in [200, 204]:
    # Vérifier
    r2 = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=code,is_essential,consumer,full&limit=5",
        headers=headers
    )
    print("✅ Colonne full mise à TRUE pour toutes les normes")
    print("\nVérification:")
    for n in r2.json():
        print(f"  {n['code']}: essential={n['is_essential']}, consumer={n['consumer']}, full={n['full']}")
    
    # Compter
    r3 = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?full=eq.true&select=id",
        headers=headers
    )
    print(f"\n📊 {len(r3.json())} normes avec full=TRUE")
else:
    print(f"❌ Erreur: {r.text[:200]}")
    print("\n💡 Ajoutez d'abord la colonne dans Supabase SQL Editor:")
    print("   ALTER TABLE norms ADD COLUMN full BOOLEAN DEFAULT TRUE;")
