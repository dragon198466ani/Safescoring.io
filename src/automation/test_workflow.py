#!/usr/bin/env python3
"""
SafeScoring - Test du Workflow Automatique
==========================================
Ce script teste que tout fonctionne:
1. Verifie la connexion Supabase
2. Verifie que les tables existent
3. Teste l'ajout d'un produit (trigger)
4. Teste l'ajout d'une norme (trigger)
5. Verifie que les taches sont creees
6. Lance le worker pour traiter les taches

Usage:
    python test_workflow.py --check      # Verifier la config
    python test_workflow.py --test       # Tester les triggers
    python test_workflow.py --process    # Traiter les taches
    python test_workflow.py --all        # Tout faire
"""

import os
import sys
import json
import time
from datetime import datetime
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Load environment
try:
    from dotenv import load_dotenv
    env_paths = [
        Path(__file__).parent.parent.parent / 'config' / '.env',
        Path(__file__).parent.parent.parent / '.env',
        Path('config/.env'),
        Path('.env')
    ]
    for env_path in env_paths:
        if env_path.exists():
            load_dotenv(env_path)
            print(f"[OK] Loaded env from: {env_path}")
            break
except ImportError:
    print("[WARN] python-dotenv not installed")

from supabase import create_client

# ============================================
# CONFIGURATION
# ============================================

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_KEY')

print(f"\n{'='*60}")
print("SAFESCORING WORKFLOW TEST")
print(f"{'='*60}")
print(f"Supabase URL: {SUPABASE_URL[:50] if SUPABASE_URL else 'NOT SET'}...")
print(f"Supabase Key: {'SET' if SUPABASE_KEY else 'NOT SET'}")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("\n❌ Configuration manquante!")
    print("   Vérifiez votre fichier .env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ============================================
# CHECK FUNCTIONS
# ============================================

def check_tables():
    """Verifie que les tables necessaires existent."""
    print("\n[CHECK] Verification des tables...")

    required_tables = ['products', 'norms', 'evaluations', 'task_queue', 'scrape_cache']
    missing = []

    for table in required_tables:
        try:
            result = supabase.table(table).select('*').limit(1).execute()
            print(f"   [OK] {table}")
        except Exception as e:
            print(f"   [FAIL] {table}: {e}")
            missing.append(table)

    if missing:
        print(f"\n[WARN] Tables manquantes: {missing}")
        print("   Executez database/triggers.sql dans Supabase SQL Editor")
        return False

    return True


def check_triggers():
    """Verifie que les triggers sont installes."""
    print("\n[CHECK] Verification des triggers...")

    # On ne peut pas verifier directement les triggers via l'API
    # Mais on peut verifier que les fonctions existent

    try:
        # Tester la fonction get_queue_stats
        result = supabase.rpc('get_queue_stats').execute()
        print("   [OK] Function get_queue_stats existe")
    except Exception as e:
        print(f"   [WARN] Function get_queue_stats: {e}")
        print("   -> Executez database/triggers.sql")

    return True


def get_queue_stats():
    """Affiche les stats de la queue."""
    print("\n[STATS] Stats de la queue:")

    result = supabase.table('task_queue').select('status').execute()

    stats = {'pending': 0, 'processing': 0, 'completed': 0, 'failed': 0}
    for task in result.data:
        status = task.get('status', 'pending')
        if status in stats:
            stats[status] += 1

    print(f"   Pending:    {stats['pending']}")
    print(f"   Processing: {stats['processing']}")
    print(f"   Completed:  {stats['completed']}")
    print(f"   Failed:     {stats['failed']}")

    return stats

# ============================================
# TEST FUNCTIONS
# ============================================

def test_add_product():
    """Teste l'ajout d'un produit (devrait creer des taches via trigger)."""
    print("\n[TEST] Ajout d'un produit...")

    test_product = {
        'name': f'Test Product {datetime.now().strftime("%H%M%S")}',
        'slug': f'test-product-{datetime.now().strftime("%H%M%S")}',
        'brand': 'Test Brand',
        'urls': ['https://example.com/test-product'],
        'is_active': True
    }

    try:
        result = supabase.table('products').insert(test_product).execute()
        product_id = result.data[0]['id']
        print(f"   [OK] Produit cree: ID {product_id}")

        # Verifier si des taches ont ete creees
        time.sleep(1)  # Laisser le trigger s'executer

        tasks = supabase.table('task_queue').select('*').eq('target_id', product_id).execute()

        if tasks.data:
            print(f"   [OK] {len(tasks.data)} tache(s) creee(s) automatiquement!")
            for task in tasks.data:
                print(f"      -> {task['task_type']} (priority: {task['priority']})")
        else:
            print("   [WARN] Aucune tache creee - verifiez les triggers")

        return product_id

    except Exception as e:
        print(f"   [FAIL] Erreur: {e}")
        return None


def test_add_norm():
    """Teste l'ajout d'une norme (devrait creer des taches via trigger)."""
    print("\n[TEST] Ajout d'une norme...")

    test_norm = {
        'code': f'TEST-{datetime.now().strftime("%H%M%S")}',
        'description': 'Test norm for workflow validation',
        'pillar': 'Security',
        'official_url': 'https://example.com/test-norm'
    }

    try:
        result = supabase.table('norms').insert(test_norm).execute()
        norm_id = result.data[0]['id']
        print(f"   [OK] Norme creee: ID {norm_id}")

        # Verifier si des taches ont ete creees
        time.sleep(1)

        tasks = supabase.table('task_queue').select('*').eq('target_id', norm_id).eq('target_type', 'norm').execute()

        if tasks.data:
            print(f"   [OK] {len(tasks.data)} tache(s) creee(s) automatiquement!")
            for task in tasks.data:
                print(f"      -> {task['task_type']}")
        else:
            print("   [WARN] Aucune tache creee - verifiez les triggers")

        return norm_id

    except Exception as e:
        print(f"   [FAIL] Erreur: {e}")
        return None


def cleanup_test_data():
    """Nettoie les donnees de test."""
    print("\n[CLEANUP] Nettoyage des donnees de test...")

    try:
        # Supprimer produits de test
        supabase.table('products').delete().like('slug', 'test-product-%').execute()
        print("   [OK] Produits de test supprimes")

        # Supprimer normes de test
        supabase.table('norms').delete().like('code', 'TEST-%').execute()
        print("   [OK] Normes de test supprimees")

        # Supprimer taches de test
        supabase.table('task_queue').delete().eq('status', 'pending').execute()
        print("   [OK] Taches pending supprimees")

    except Exception as e:
        print(f"   [WARN] Erreur nettoyage: {e}")


def process_one_task():
    """Traite une tache de la queue."""
    print("\n[PROCESS] Traitement d'une tache...")

    # Recuperer une tache
    result = supabase.table('task_queue').select('*').eq('status', 'pending').order('priority').order('created_at').limit(1).execute()

    if not result.data:
        print("   [INFO] Aucune tache en attente")
        return

    task = result.data[0]
    print(f"   [TASK] {task['task_type']} (target: {task['target_type']} #{task['target_id']})")

    # Marquer en cours
    supabase.table('task_queue').update({
        'status': 'processing',
        'started_at': datetime.now().isoformat()
    }).eq('id', task['id']).execute()

    # Simuler traitement
    print("   [PROCESSING] Traitement en cours...")
    time.sleep(2)

    # Marquer termine
    supabase.table('task_queue').update({
        'status': 'completed',
        'completed_at': datetime.now().isoformat()
    }).eq('id', task['id']).execute()

    print("   [OK] Tache terminee!")

# ============================================
# MAIN
# ============================================

def main():
    import argparse

    parser = argparse.ArgumentParser(description='Test SafeScoring Workflow')
    parser.add_argument('--check', action='store_true', help='Vérifier la configuration')
    parser.add_argument('--test', action='store_true', help='Tester les triggers')
    parser.add_argument('--process', action='store_true', help='Traiter les tâches')
    parser.add_argument('--cleanup', action='store_true', help='Nettoyer les données de test')
    parser.add_argument('--all', action='store_true', help='Tout faire')

    args = parser.parse_args()

    if args.all or args.check or not any([args.test, args.process, args.cleanup]):
        check_tables()
        check_triggers()
        get_queue_stats()

    if args.all or args.test:
        test_add_product()
        test_add_norm()
        get_queue_stats()

    if args.all or args.process:
        process_one_task()
        get_queue_stats()

    if args.cleanup:
        cleanup_test_data()

    print(f"\n{'='*60}")
    print("TEST TERMINE")
    print(f"{'='*60}")
    print("\n[NEXT] Prochaines etapes:")
    print("   1. Executez database/triggers.sql dans Supabase SQL Editor")
    print("   2. Lancez le worker: python queue_worker.py")
    print("   3. Accedez a l'admin: http://localhost:3000/admin")


if __name__ == "__main__":
    main()
