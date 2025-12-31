#!/usr/bin/env python3
"""
Ajoute 20+ produits de type Bridges dans Supabase
"""

import requests

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

# Type ID pour Bridges
BRIDGES_TYPE_ID = 45

# Liste des bridges à ajouter (20+)
bridges = [
    # Bridges majeurs
    {"name": "LayerZero", "url": "https://layerzero.network"},
    {"name": "Axelar", "url": "https://axelar.network"},
    {"name": "Multichain (Anyswap)", "url": "https://multichain.org"},
    {"name": "Portal Bridge (Wormhole)", "url": "https://portalbridge.com"},
    {"name": "Polygon Bridge", "url": "https://wallet.polygon.technology/bridge"},
    {"name": "Arbitrum Bridge", "url": "https://bridge.arbitrum.io"},
    {"name": "Optimism Bridge", "url": "https://app.optimism.io/bridge"},
    {"name": "zkSync Bridge", "url": "https://bridge.zksync.io"},
    {"name": "StarkGate (StarkNet)", "url": "https://starkgate.starknet.io"},
    {"name": "Base Bridge", "url": "https://bridge.base.org"},
    
    # Bridges DeFi
    {"name": "Connext", "url": "https://connext.network"},
    {"name": "deBridge", "url": "https://debridge.finance"},
    {"name": "Orbiter Finance", "url": "https://orbiter.finance"},
    {"name": "Bungee Exchange", "url": "https://bungee.exchange"},
    {"name": "Socket", "url": "https://socket.tech"},
    {"name": "LI.FI", "url": "https://li.fi"},
    {"name": "Squid Router", "url": "https://squidrouter.com"},
    {"name": "Allbridge", "url": "https://allbridge.io"},
    {"name": "Hyperlane", "url": "https://hyperlane.xyz"},
    {"name": "Router Protocol", "url": "https://routerprotocol.com"},
    
    # Bridges spécialisés
    {"name": "Ren Bridge", "url": "https://bridge.renproject.io"},
    {"name": "THORChain", "url": "https://thorchain.org"},
    {"name": "Chainflip", "url": "https://chainflip.io"},
    {"name": "Maya Protocol", "url": "https://mayaprotocol.com"},
    {"name": "Gravity Bridge", "url": "https://bridge.blockscape.network"},
]

print(f"🌉 Ajout de {len(bridges)} bridges...")
print("=" * 50)

# Vérifier les existants
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/products?type_id=eq.{BRIDGES_TYPE_ID}&select=name',
    headers=headers
)
existing = [p['name'].lower() for p in r.json()]
print(f"   Bridges existants: {len(existing)}")

added = 0
skipped = 0

for bridge in bridges:
    if bridge['name'].lower() in existing:
        print(f"   ⏭️ {bridge['name']} (existe déjà)")
        skipped += 1
        continue
    
    # Générer un slug à partir du nom
    slug = bridge['name'].lower().replace(' ', '-').replace('(', '').replace(')', '')
    
    data = {
        'name': bridge['name'],
        'slug': slug,
        'url': bridge['url'],
        'type_id': BRIDGES_TYPE_ID
    }
    
    r = requests.post(
        f'{SUPABASE_URL}/rest/v1/products',
        headers=headers,
        json=data
    )
    
    if r.status_code in [200, 201]:
        print(f"   ✅ {bridge['name']}")
        added += 1
    else:
        print(f"   ❌ {bridge['name']}: {r.status_code} - {r.text[:50]}")

print("=" * 50)
print(f"📊 Résumé: {added} ajoutés, {skipped} ignorés")
print(f"   Total bridges: {len(existing) + added}")
