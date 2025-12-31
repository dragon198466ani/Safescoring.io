#!/usr/bin/env python3
"""Configure les normes applicables pour le type Protocol/Guide"""

import requests

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

PROTOCOL_TYPE_ID = 50

# Récupérer toutes les normes
r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar', headers=headers)
all_norms = r.json()
print(f"Total normes: {len(all_norms)}")

# Normes applicables pour un Protocol/Guide (documentation de sécurité)
# TRÈS RESTRICTIF: Un protocole/guide est de la DOCUMENTATION, pas un produit
# Seules les normes liées à la qualité de la documentation sont applicables

# Normes spécifiques à inclure pour Protocol/Guide
# PRINCIPE: Le protocole RECOMMANDE des pratiques mais ne les IMPLÉMENTE pas
# On évalue si le protocole DOCUMENTE/RECOMMANDE ces bonnes pratiques
include_codes = [
    # ═══════════════════════════════════════════════════════════════════════════
    # SECURITY (S) - Standards et bonnes pratiques RECOMMANDÉS par le protocole
    # ═══════════════════════════════════════════════════════════════════════════
    
    # --- Standards BIP Bitcoin recommandés ---
    'S16',   # BIP-32 HD Wallets - Recommande wallets HD?
    'S17',   # BIP-39 Mnemonic - Recommande seed phrase 12/24 mots?
    'S18',   # BIP-44 Multi-account - Recommande structure multi-compte?
    'S19',   # BIP-49 SegWit P2SH - Recommande SegWit?
    'S20',   # BIP-84 Native SegWit - Recommande bech32?
    'S21',   # BIP-85 Child seeds - Recommande dérivation seeds enfants?
    'S22',   # BIP-86 Taproot - Recommande Taproot?
    'S23',   # BIP-141 SegWit - Recommande SegWit?
    'S24',   # BIP-174 PSBT - Recommande PSBT pour multisig?
    'S25',   # BIP-370 PSBTv2 - Recommande PSBTv2?
    'S26',   # BIP-341 Taproot scripts - Recommande Tapscript?
    'S96',   # BIP-322 Generic Signing - Recommande signature messages?
    'S97',   # BIP-329 Wallet Labels - Recommande labeling?
    'S98',   # BIP-352 Silent Payments - Recommande Silent Payments?
    'S99',   # BIP-380 Miniscript - Recommande Miniscript?
    'S100',  # BIP-381 Miniscript descriptors
    'S101',  # BIP-327 MuSig2 - Recommande MuSig2?
    'S102',  # BIP-388 Wallet Policies
    'S103',  # BIP-129 BSMS - Recommande BSMS pour multisig?
    
    # --- Standards SLIP recommandés ---
    'S27',   # SLIP-39 Shamir - Recommande Shamir backup?
    
    # --- Bonnes pratiques sécurité DOCUMENTÉES ---
    'S76',   # Open source code - Recommande outils open source?
    'S78',   # Third-party audit - Recommande audits?
    'S80',   # PIN 4-8 digits - Recommande PIN fort?
    'S81',   # BIP-39 Passphrase - Recommande passphrase (25e mot)?
    'S83',   # Limited attempts - Recommande limite tentatives?
    'S84',   # Wipe after failures - Recommande wipe après échecs?
    
    # ═══════════════════════════════════════════════════════════════════════════
    # ADVERSITY (A) - Résilience et backup RECOMMANDÉS par le protocole
    # ═══════════════════════════════════════════════════════════════════════════
    
    # --- Backup & Recovery documentés ---
    'A09',   # Duress word passphrase - Documente wallet leurre?
    'A32',   # M-of-N configurable - Documente multisig M-of-N?
    'A33',   # Threshold signatures TSS - Documente TSS?
    'A34',   # Social recovery - Documente social recovery?
    'A99',   # Emergency recovery key - Documente clé urgence?
    'A100',  # Backup verification - Documente vérification backup?
    'A101',  # Recovery drill mode - Documente tests de recovery?
    'A102',  # Partial seed recovery - Documente recovery partielle?
    'A103',  # Seed phrase checksum - Documente checksum seed?
    'A104',  # Multi-location backup - Documente stockage multi-sites?
    'A108',  # Plausible deniability docs - Documente déni plausible?
    'A129',  # BIP-85 - Documente BIP-85?
    'A143',  # Shamir Backup - Documente Shamir?
    
    # --- Privacy documentée ---
    'A75',   # Privacy by design - Documente privacy?
    'A78',   # Confidential Transactions - Documente CT?
    'A82',   # Coin selection privacy - Documente sélection UTXO?
    'A84',   # UTXO labeling - Documente labeling UTXO?
    'A149',  # UTXO Management - Documente gestion UTXO?
    'A155',  # Location Privacy - Documente privacy localisation?
    'A162',  # No Seed Request Warning - Avertit sur phishing seed?
    'A172',  # Silent Payments (BIP-352) - Documente Silent Payments?
    
    # --- Documentation légale ---
    'A46',   # Legal documentation - Inclut aspects légaux?
    
    # --- Normes A candidates pour NO ---
    'A19',   # Steganographic backup - Documente backup stéganographique?
    'A76',   # CoinJoin support - Documente CoinJoin?
    'A160',  # Phishing Awareness - Avertit sur phishing?
    'A105',  # Encrypted cloud backup - Documente backup cloud chiffré?
    
    # ═══════════════════════════════════════════════════════════════════════════
    # FIDELITY (F) - Qualité de la DOCUMENTATION elle-même
    # ═══════════════════════════════════════════════════════════════════════════
    
    # --- Qualité documentation ---
    'F144',  # Backup & Recovery - Section backup/recovery?
    'F149',  # Responsible Disclosure - Politique disclosure?
    'F154',  # Disaster Recovery Plan - Plan disaster recovery?
    'F174',  # Security Whitepaper - Whitepaper sécurité?
    'F175',  # Architecture Documentation - Doc architecture?
    'F176',  # Changelog Maintained - Changelog maintenu?
    'F177',  # Migration Guides - Guides migration versions?
    
    # --- Normes F candidates pour NO ---
    'F139',  # Semantic Versioning - Utilise semver?
    'F146',  # Bug Bounty Program - Programme bug bounty?
    'F150',  # Incident Response Plan - Plan réponse incident?
    'F190',  # Version Deprecation Policy - Politique dépréciation?
    'F191',  # LTS Support - Support long terme?
    
    # ═══════════════════════════════════════════════════════════════════════════
    # EFFICIENCY (E) - Accessibilité et UX de la DOCUMENTATION
    # ═══════════════════════════════════════════════════════════════════════════
    
    # --- Accessibilité document ---
    'E42',   # WCAG Accessibility - Document accessible?
    'E72',   # Complete documentation - Documentation complète?
    'E147',  # WCAG 2.2 Level A
    'E148',  # WCAG 2.2 Level AA
    'E149',  # WCAG 2.2 Level AAA
    'E150',  # Section 508 - Conforme Section 508?
    'E167',  # API Documentation - Si API mentionnée, documentée?
    'E168',  # User Guide - Guide utilisateur clair?
    
    # --- Pratiques RECOMMANDÉES par le protocole ---
    'E182',  # Offline Transaction Signing - Recommande signature offline?
    'E185',  # Air-gapped Signing - Recommande air-gapped?
    'E186',  # Seed Import - Documente import seed?
    
    # --- Normes E candidates pour NO ---
    'E73',   # Video tutorials - Tutoriels vidéo?
    'E74',   # Responsive support <24h - Support réactif?
    'E169',  # Community Forum - Forum communautaire?
    'E170',  # Multi-language Support - Multi-langue?
]

# Filtrer les normes applicables
applicable_norms = []
for norm in all_norms:
    code = norm['code']
    if code in include_codes:
        applicable_norms.append(norm)

print(f"\nNormes applicables pour Protocol/Guide: {len(applicable_norms)}")

# Afficher les normes sélectionnées
print("\nNormes sélectionnées:")
for norm in sorted(applicable_norms, key=lambda x: x['code'])[:30]:
    print(f"  {norm['code']}: {norm['title'][:50]}")
print(f"  ... et {len(applicable_norms) - 30} autres" if len(applicable_norms) > 30 else "")

# Créer les entrées d'applicabilité
print(f"\nCréation de {len(applicable_norms)} règles d'applicabilité...")

applicability_data = [
    {
        'norm_id': norm['id'],
        'type_id': PROTOCOL_TYPE_ID,
        'is_applicable': True
    }
    for norm in applicable_norms
]

# Insérer par batch
batch_size = 100
for i in range(0, len(applicability_data), batch_size):
    batch = applicability_data[i:i+batch_size]
    r = requests.post(
        f'{SUPABASE_URL}/rest/v1/norm_applicability',
        headers=headers,
        json=batch
    )
    if r.status_code in [200, 201]:
        print(f"  ✅ Batch {i//batch_size + 1}: {len(batch)} règles créées")
    else:
        print(f"  ❌ Batch {i//batch_size + 1}: {r.status_code} - {r.text[:100]}")

print("\n✅ Configuration terminée!")
