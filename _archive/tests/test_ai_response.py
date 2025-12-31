#!/usr/bin/env python3
"""Test de la réponse IA pour Glacier Protocol pilier A"""

import requests
import os
from dotenv import load_dotenv

load_dotenv('config/.env.txt')

MISTRAL_API_KEY = os.getenv('MISTRAL_API_KEY')

# Normes A applicables pour Protocol/Guide
norms_a = [
    ('A09', 'Duress word passphrase'),
    ('A32', 'M-of-N configurable'),
    ('A33', 'Threshold signatures TSS'),
    ('A34', 'Social recovery'),
    ('A46', 'Legal documentation'),
    ('A75', 'Privacy by design'),
    ('A78', 'Confidential Transactions'),
    ('A82', 'Coin selection privacy'),
    ('A84', 'UTXO labeling'),
    ('A99', 'Emergency recovery key'),
    ('A100', 'Backup verification'),
    ('A101', 'Recovery drill mode'),
    ('A102', 'Partial seed recovery'),
    ('A103', 'Seed phrase checksum'),
    ('A104', 'Multi-location backup'),
    ('A108', 'Plausible deniability docs'),
    ('A129', 'BIP-85'),
    ('A143', 'Shamir Backup'),
    ('A149', 'UTXO Management'),
    ('A155', 'Location Privacy'),
    ('A162', 'No Seed Request Warning'),
    ('A172', 'Silent Payments (BIP-352)'),
]

norms_text = "\n".join([f"- {code}: {title}" for code, title in norms_a])

prompt = f"""Tu es un expert en sécurité crypto évaluant des produits.

PRODUIT À ÉVALUER:
- Nom: Glacier Protocol
- Type: Protocol/Guide
- Description: Protocole de sécurité pour cold storage Bitcoin

PILIER ÉVALUÉ: A (Adversity - Résilience)

NORMES À ÉVALUER:
{norms_text}

INSTRUCTIONS:
Pour un Protocol/Guide, évalue si le protocole DOCUMENTE ou RECOMMANDE ces pratiques.
Réponds YES si documenté, YESp si logiquement déduit, NO si non applicable, TBD si incertain.

FORMAT (une ligne par norme):
CODE: YES ou YESp ou NO ou TBD

Évalue:"""

print("=" * 60)
print("PROMPT ENVOYÉ:")
print("=" * 60)
print(prompt[:500] + "...")

# Appel Mistral
r = requests.post(
    "https://api.mistral.ai/v1/chat/completions",
    headers={
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json"
    },
    json={
        "model": "mistral-small-latest",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 2000
    }
)

print("\n" + "=" * 60)
print("RÉPONSE MISTRAL:")
print("=" * 60)

if r.status_code == 200:
    response = r.json()['choices'][0]['message']['content']
    print(response)
    
    # Parser
    import re
    print("\n" + "=" * 60)
    print("PARSING:")
    print("=" * 60)
    
    for line in response.split('\n'):
        line = line.strip()
        if not line:
            continue
        match = re.search(r'\b([SAFE])[-_]?(\d+)\b.*?(YESp|YES|NO|TBD|N/?A)', line, re.IGNORECASE)
        if match:
            code = f"{match.group(1).upper()}{match.group(2)}"
            value = match.group(3).upper()
            print(f"  ✅ {code} = {value}")
        else:
            print(f"  ❌ Non parsé: {line[:60]}")
else:
    print(f"Erreur: {r.status_code} - {r.text}")
