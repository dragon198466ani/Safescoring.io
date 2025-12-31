#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAFESCORING.IO - Ré-évaluation de TOUS les DEX avec SAFE v2.0
Lance l'évaluation de tous les produits DEX en utilisant les normes v2.0
"""

import subprocess
import sys
import os

print("="*80)
print("RÉ-ÉVALUATION DEX - SAFE v2.0")
print("="*80)
print()

print("🎯 Cette commande va:")
print("   1. Ré-évaluer TOUS les produits DEX (type_id=39)")
print("   2. Utiliser les 506 normes applicables (incluant F200-F204)")
print("   3. Sauvegarder les résultats dans Supabase")
print()

# Confirm
response = input("Continuer? (o/n): ")
if response.lower() not in ['o', 'oui', 'y', 'yes']:
    print("Annulé.")
    sys.exit(0)

print()
print("="*80)
print("LANCEMENT DE L'ÉVALUATION")
print("="*80)
print()

# Set environment for UTF-8
env = os.environ.copy()
env['PYTHONIOENCODING'] = 'utf-8'
env['PYTHONUNBUFFERED'] = '1'

# Launch evaluation
cmd = [
    sys.executable,
    '-u',  # Unbuffered
    'src/core/smart_evaluator.py',
    '--type', '39',  # DEX type
    '--resume'  # Resume if partially evaluated
]

print(f"Commande: {' '.join(cmd)}")
print()
print("📊 Logs en direct:")
print("-" * 80)
print()

# Run with live output
try:
    proc = subprocess.run(
        cmd,
        env=env,
        cwd=r'c:\Users\alexa\Desktop\SafeScoring',
        text=True,
        encoding='utf-8',
        errors='replace'
    )

    print()
    print("="*80)

    if proc.returncode == 0:
        print("✅ Évaluation terminée avec succès!")
    else:
        print(f"⚠️ Processus terminé avec code: {proc.returncode}")

except KeyboardInterrupt:
    print("\n\n⚠️ Évaluation interrompue par l'utilisateur")
    sys.exit(1)
except Exception as e:
    print(f"\n\n❌ Erreur: {e}")
    sys.exit(1)

print()
print("📊 Pour voir les résultats:")
print("   python monitor_1inch_v2.py")
print()
