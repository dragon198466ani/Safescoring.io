#!/usr/bin/env python3
"""Met à jour la définition complète du type Protocol/Guide"""

import requests
import json

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'REVOKED_ROTATE_ON_DASHBOARD'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# Définition complète et détaillée du type Protocol/Guide
update_data = {
    "description": """DOCUMENTATION de sécurité crypto. PAS un logiciel, PAS un hardware.
Méthodologie écrite décrivant des PROCÉDURES de sécurité à suivre.
Le protocole RECOMMANDE des pratiques mais ne les IMPLÉMENTE pas lui-même.

CARACTÉRISTIQUES CLÉS:
• Document textuel (PDF, site web, GitHub)
• Instructions étape par étape
• Recommandations de bonnes pratiques
• Aucun code exécutable propre
• Aucun matériel physique
• Référence des standards (BIP, SLIP, etc.)

CE QUI EST ÉVALUABLE:
• Qualité de la documentation
• Standards crypto RECOMMANDÉS (BIP-32, BIP-39, SLIP-39...)
• Bonnes pratiques de backup/recovery DOCUMENTÉES
• Accessibilité du document (WCAG)
• Transparence (open source, audit)

CE QUI N'EST PAS ÉVALUABLE:
• Implémentation technique (pas de code)
• Résistance physique (pas de hardware)
• Certifications produit (ISO, SOC2...)
• Performance logicielle
• Secure Element, HSM, TPM
• Interface utilisateur logicielle""",

    "examples": """• Glacier Protocol - Protocole cold storage Bitcoin multi-sig
• 10x Security Bitcoin Guide - Guide sécurité Bitcoin
• Jameson Lopp's Security Guide - Ressources sécurité crypto
• Bitcoin.org Security Guide - Guide officiel Bitcoin
• Multisig Setup Guides - Guides configuration multisig
• Seed Phrase Best Practices - Bonnes pratiques seed phrase
• Air-gapped Signing Tutorials - Tutoriels signature offline""",

    "advantages": """• ZÉRO surface d'attaque logicielle
• ZÉRO dépendance matérielle
• Accessible gratuitement (souvent open source)
• Éducatif et pédagogique
• Applicable avec n'importe quel wallet
• Versionné et auditable (GitHub)
• Traduit en plusieurs langues
• Communauté de contributeurs""",

    "disadvantages": """• PAS d'implémentation technique
• Dépend de l'utilisateur pour l'exécution
• Peut devenir obsolète si pas maintenu
• Erreur humaine possible lors du suivi
• PAS de support technique direct
• Nécessite compétences techniques pour suivre
• PAS de garantie de résultat"""
}

# Mettre à jour le type 50
r = requests.patch(
    f'{SUPABASE_URL}/rest/v1/product_types?id=eq.50',
    headers=headers,
    json=update_data
)

if r.status_code in [200, 204]:
    print("✅ Type Protocol/Guide mis à jour avec succès!")
    print("\n" + "=" * 60)
    print("NOUVELLE DÉFINITION:")
    print("=" * 60)
    
    # Récupérer et afficher
    r2 = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?id=eq.50&select=*', headers=headers)
    data = r2.json()[0]
    
    print(f"\n📋 Description:\n{data['description']}")
    print(f"\n📦 Exemples:\n{data['examples']}")
    print(f"\n✅ Avantages:\n{data['advantages']}")
    print(f"\n❌ Inconvénients:\n{data['disadvantages']}")
else:
    print(f"❌ Erreur: {r.status_code} - {r.text}")
