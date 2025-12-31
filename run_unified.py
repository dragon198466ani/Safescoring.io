#!/usr/bin/env python3
"""
SAFESCORING.IO - Script de lancement unifié
===========================================

Lance le pipeline complet de mise à jour des produits.

Usage rapide:
    python run_unified.py                     # Mode test (1 produit)
    python run_unified.py partial             # 10 produits
    python run_unified.py full                # Tous les produits
    python run_unified.py full --force        # Force recalcul
    python run_unified.py --product "Ledger"  # Un produit spécifique

Options:
    test|partial|full     Mode de traitement
    --product <nom>       Filtrer par nom
    --step <étape>        types, applicability, evaluate, scores, all
    --force               Force recalcul
    --apply-types         Applique les corrections de types
    --no-scrape           Désactive le scraping
    --dry-run             Simulation (pas de modifications)
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.automation.unified_pipeline import main

if __name__ == '__main__':
    main()
