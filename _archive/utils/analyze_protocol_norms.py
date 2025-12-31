#!/usr/bin/env python3
"""Analyse les normes potentiellement applicables pour Protocol/Guide"""

import requests

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
}

# Récupérer toutes les normes
r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,description&order=code', headers=headers)
all_norms = r.json()

print(f"Total: {len(all_norms)} normes\n")

# Mots-clés pertinents pour Protocol/Guide
# Un protocole/guide peut DOCUMENTER/RECOMMANDER ces pratiques
keywords_include = [
    # Documentation
    'documentation', 'whitepaper', 'guide', 'changelog', 'readme',
    # Standards crypto que le protocole peut recommander
    'bip-', 'bip32', 'bip39', 'bip44', 'slip-', 'eip-',
    # Bonnes pratiques
    'best practice', 'recommendation', 'guideline',
    # Sécurité générale (recommandations)
    'backup', 'recovery', 'seed', 'mnemonic', 'passphrase',
    'encryption', 'hash', 'signature',
    # Transparence
    'open source', 'audit', 'disclosure', 'transparency',
    # Accessibilité
    'wcag', 'accessibility', 'screen reader',
    # Privacy
    'privacy', 'anonymity', 'confidential',
]

# Mots-clés à exclure (hardware, software spécifique, certifications)
keywords_exclude = [
    # Hardware spécifique
    'secure element', 'tpm', 'hsm', 'chip', 'hardware', 'device',
    'usb', 'bluetooth', 'nfc', 'screen', 'button', 'battery',
    'ip67', 'ip68', 'temperature', 'humidity', 'drop', 'shock',
    'waterproof', 'dustproof', 'tamper', 'physical',
    # Certifications (besoin de preuve)
    'iso ', 'soc 2', 'pci', 'fips', 'common criteria', 'eal',
    'mil-std', 'ce marking', 'rohs', 'fcc',
    # Infrastructure
    'server', 'cloud', 'api rate', 'sla', 'uptime', 'redundancy',
    'failover', 'load balancing', 'kubernetes', 'docker',
    # Smart contracts (pas applicable à un guide)
    'reentrancy', 'pausable', 'upgradeable', 'proxy',
    # Biométrie
    'fingerprint', 'face recognition', 'iris', 'biometric',
]

def is_relevant_for_protocol(norm):
    """Vérifie si une norme est pertinente pour un Protocol/Guide"""
    title = norm['title'].lower()
    desc = (norm.get('description') or '').lower()
    text = f"{title} {desc}"
    
    # Exclure si contient des mots-clés d'exclusion
    for kw in keywords_exclude:
        if kw in text:
            return False, f"excluded: {kw}"
    
    # Inclure si contient des mots-clés d'inclusion
    for kw in keywords_include:
        if kw in text:
            return True, f"matched: {kw}"
    
    return False, "no match"

# Analyser par pilier
print("=" * 80)
print("NORMES POTENTIELLEMENT APPLICABLES POUR PROTOCOL/GUIDE")
print("=" * 80)

for pillar in ['S', 'A', 'F', 'E']:
    pillar_norms = [n for n in all_norms if n['pillar'] == pillar]
    relevant = []
    
    for norm in pillar_norms:
        is_rel, reason = is_relevant_for_protocol(norm)
        if is_rel:
            relevant.append((norm, reason))
    
    print(f"\n{'='*40}")
    print(f"PILIER {pillar} - {len(relevant)} normes pertinentes sur {len(pillar_norms)}")
    print(f"{'='*40}")
    
    for norm, reason in relevant:
        print(f"  {norm['code']}: {norm['title'][:50]}")
        # print(f"       ({reason})")

# Normes actuellement configurées
current_codes = [
    'S01', 'S05', 'S09', 'S10', 'S16', 'S17', 'S18', 'S27', 'S76', 'S77', 'S78', 
    'S80', 'S81', 'S83', 'S84', 'S216', 'S217',
    'A75',
    'F149', 'F173', 'F174', 'F175', 'F176', 'F177',
    'E42', 'E110', 'E111', 'E112', 'E113', 'E116', 'E117', 'E148', 'E149', 'E157',
]

print("\n" + "=" * 80)
print("NORMES MANQUANTES (pertinentes mais pas encore configurées)")
print("=" * 80)

for pillar in ['S', 'A', 'F', 'E']:
    pillar_norms = [n for n in all_norms if n['pillar'] == pillar]
    missing = []
    
    for norm in pillar_norms:
        is_rel, reason = is_relevant_for_protocol(norm)
        if is_rel and norm['code'] not in current_codes:
            missing.append(norm)
    
    if missing:
        print(f"\n--- Pilier {pillar} ({len(missing)} manquantes) ---")
        for norm in missing:
            print(f"  '{norm['code']}',  # {norm['title'][:50]}")
