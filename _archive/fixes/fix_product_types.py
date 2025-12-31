#!/usr/bin/env python3
"""Corrige les erreurs de catégorisation des produits"""

import requests

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# Mapping des types
TYPE_IDS = {
    'HW Cold': 29,
    'HW Hot': 30,
    'SW Browser': 31,
    'SW Mobile': 32,
    'Bkp Digital': 33,
    'Bkp Physical': 34,
    'Card': 35,
    'AC Phys': 36,
    'AC Digit': 37,
    'AC Phygi': 38,
    'DEX': 39,
    'CEX': 40,
    'Lending': 41,
    'Yield': 42,
    'Liq Staking': 43,
    'Derivatives': 44,
    'Bridges': 45,
    'DeFi Tools': 46,
    'RWA': 47,
    'Crypto Bank': 48,
    'Card Non-Cust': 49,
    'Protocol': 50,
}

# Corrections à appliquer (product_id, nouveau_type)
corrections = [
    # Erreurs critiques
    (249, 'DEX', '1inch - était HW Hot, est un agrégateur DEX'),
    (266, 'Crypto Bank', 'BitGo - était Card, est une plateforme custody institutionnelle'),
    (307, 'Crypto Bank', 'Fireblocks - était Card, est une infrastructure custody'),
    
    # Hardware wallets mal classés
    (379, 'HW Cold', 'Satochip - était HW Hot, est un cold storage sans Bluetooth/WiFi'),
    (285, 'HW Cold', 'Coinkite TAPSIGNER - était HW Hot, est air-gapped'),
    
    # Backups mal classés
    # CryptoTag Zeus - ID à trouver
    (407, 'Bkp Digital', 'Trezor Shamir Backup - était AC Digit, est une sauvegarde numérique'),
    
    # Cartes
    (348, 'Card', 'Mercuryo Card - était Card Non-Cust, est custodial'),
    
    # Autres
    (393, 'AC Phygi', 'Status Keycard - était HW Hot, combine physique et digital'),
    (341, 'SW Browser', 'Liana Wallet - était AC Digit, est une extension navigateur'),
]

# Trouver l'ID de CryptoTag Zeus
r = requests.get(f'{SUPABASE_URL}/rest/v1/products?name=ilike.*CryptoTag*&select=id,name,type_id', headers=headers)
cryptotag = r.json()
if cryptotag:
    print(f"CryptoTag trouvé: {cryptotag}")
    corrections.append((cryptotag[0]['id'], 'Bkp Physical', 'CryptoTag Zeus - était Bkp Digital, est du métal physique'))

# Trouver Keystone Tablet
r = requests.get(f'{SUPABASE_URL}/rest/v1/products?name=ilike.*Keystone Tablet*&select=id,name,type_id', headers=headers)
keystone = r.json()
if keystone:
    print(f"Keystone Tablet trouvé: {keystone}")
    # Note: Keystone Tablet pourrait être Bkp Physical (c'est une plaque métal) pas HW Cold
    corrections.append((keystone[0]['id'], 'Bkp Physical', 'Keystone Tablet - est une plaque métal pour seed'))

print(f"\n{'='*70}")
print(f"CORRECTIONS À APPLIQUER: {len(corrections)}")
print(f"{'='*70}\n")

success = 0
failed = 0

for product_id, new_type, description in corrections:
    new_type_id = TYPE_IDS.get(new_type)
    if not new_type_id:
        print(f"❌ Type inconnu: {new_type}")
        failed += 1
        continue
    
    # Mettre à jour le produit
    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}',
        headers=headers,
        json={'type_id': new_type_id}
    )
    
    if r.status_code in [200, 204]:
        print(f"✅ {description}")
        print(f"   → Nouveau type: {new_type} (id={new_type_id})")
        success += 1
    else:
        print(f"❌ Erreur pour {description}: {r.status_code} - {r.text}")
        failed += 1

print(f"\n{'='*70}")
print(f"RÉSUMÉ: {success} corrections réussies, {failed} échecs")
print(f"{'='*70}")

# Supprimer les évaluations des produits corrigés pour les réévaluer
print("\n🗑️ Suppression des évaluations obsolètes...")
product_ids = [c[0] for c in corrections]
for pid in product_ids:
    r = requests.delete(f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{pid}', headers=headers)
    if r.status_code in [200, 204]:
        print(f"   ✅ Évaluations supprimées pour produit {pid}")
