#!/usr/bin/env python3
"""
SafeScoring - Test Workflow Simple (compatible Python 3.14)
============================================================
Utilise requests directement au lieu du client Supabase.
"""

import os
import sys
import json
import time
import requests
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
    ]
    for env_path in env_paths:
        if env_path.exists():
            load_dotenv(env_path)
            print(f"[OK] Loaded env from: {env_path}")
            break
except ImportError:
    pass

# Configuration
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

print(f"\n{'='*60}")
print("SAFESCORING WORKFLOW TEST (Simple)")
print(f"{'='*60}")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[FAIL] Configuration manquante!")
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}


def api_get(table, params=None):
    """GET request to Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    resp = requests.get(url, headers=HEADERS, params=params, timeout=30)
    return resp.json() if resp.status_code == 200 else []


def api_post(table, data):
    """POST request to Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    resp = requests.post(url, headers=HEADERS, json=data, timeout=30)
    if resp.status_code in [200, 201]:
        return resp.json()
    else:
        print(f"      [DEBUG] Status: {resp.status_code}")
        print(f"      [DEBUG] Response: {resp.text[:200]}")
        return None


def api_delete(table, params):
    """DELETE request to Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    resp = requests.delete(url, headers=HEADERS, params=params, timeout=30)
    return resp.status_code in [200, 204]


def check_tables():
    """Verifie que les tables existent."""
    print("\n[CHECK] Verification des tables...")

    tables = ['products', 'norms', 'evaluations', 'task_queue']

    for table in tables:
        try:
            data = api_get(table, {"limit": 1})
            if isinstance(data, list):
                print(f"   [OK] {table}")
            else:
                print(f"   [FAIL] {table}: {data}")
        except Exception as e:
            print(f"   [FAIL] {table}: {e}")


def get_queue_stats():
    """Affiche les stats de la queue."""
    print("\n[STATS] Queue stats:")

    try:
        tasks = api_get('task_queue', {"select": "status"})
        stats = {'pending': 0, 'processing': 0, 'completed': 0, 'failed': 0}

        for task in tasks:
            status = task.get('status', 'pending')
            if status in stats:
                stats[status] += 1

        print(f"   Pending:    {stats['pending']}")
        print(f"   Processing: {stats['processing']}")
        print(f"   Completed:  {stats['completed']}")
        print(f"   Failed:     {stats['failed']}")
        return stats
    except Exception as e:
        print(f"   [FAIL] {e}")
        return {}


def test_add_product():
    """Teste l'ajout d'un produit."""
    print("\n[TEST] Ajout d'un produit...")

    # Colonnes existantes dans la DB
    test_product = {
        'name': f'Test Product {datetime.now().strftime("%H%M%S")}',
        'slug': f'test-product-{datetime.now().strftime("%H%M%S")}',
        'url': 'https://example.com/test-product'
    }

    try:
        result = api_post('products', test_product)
        if result and len(result) > 0:
            product_id = result[0]['id']
            print(f"   [OK] Produit cree: ID {product_id}")

            # Attendre trigger
            time.sleep(1)

            # Verifier taches
            tasks = api_get('task_queue', {
                "target_id": f"eq.{product_id}",
                "target_type": "eq.product"
            })

            if tasks:
                print(f"   [OK] {len(tasks)} tache(s) creee(s) par trigger!")
                for task in tasks:
                    print(f"      -> {task['task_type']}")
            else:
                print("   [WARN] Aucune tache - executez triggers.sql")

            return product_id
        else:
            print(f"   [FAIL] Erreur creation: {result}")
            return None
    except Exception as e:
        print(f"   [FAIL] {e}")
        return None


def test_add_norm():
    """Teste l'ajout d'une norme."""
    print("\n[TEST] Ajout d'une norme...")

    # Colonnes existantes: pillar est char(1) donc S/A/F/E
    test_norm = {
        'code': f'TEST-{datetime.now().strftime("%H%M%S")}',
        'description': 'Test norm for workflow',
        'pillar': 'S',  # S=Security, A=Accessibility, F=Freedom, E=Experience
        'title': 'Test Norm'
    }

    try:
        result = api_post('norms', test_norm)
        if result and len(result) > 0:
            norm_id = result[0]['id']
            print(f"   [OK] Norme creee: ID {norm_id}")

            time.sleep(1)

            tasks = api_get('task_queue', {
                "target_id": f"eq.{norm_id}",
                "target_type": "eq.norm"
            })

            if tasks:
                print(f"   [OK] {len(tasks)} tache(s) creee(s) par trigger!")
                for task in tasks:
                    print(f"      -> {task['task_type']}")
            else:
                print("   [WARN] Aucune tache - executez triggers.sql")

            return norm_id
        else:
            print(f"   [FAIL] Erreur: {result}")
            return None
    except Exception as e:
        print(f"   [FAIL] {e}")
        return None


def cleanup():
    """Nettoie les donnees de test."""
    print("\n[CLEANUP] Nettoyage...")

    # Supprimer produits test
    api_delete('products', {"slug": "like.test-product-%"})
    print("   [OK] Produits test supprimes")

    # Supprimer normes test
    api_delete('norms', {"code": "like.TEST-%"})
    print("   [OK] Normes test supprimees")


def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--test', action='store_true')
    parser.add_argument('--cleanup', action='store_true')
    parser.add_argument('--all', action='store_true')

    args = parser.parse_args()

    if args.all or args.check or not any([args.test, args.cleanup]):
        check_tables()
        get_queue_stats()

    if args.all or args.test:
        test_add_product()
        test_add_norm()
        get_queue_stats()

    if args.cleanup:
        cleanup()

    print(f"\n{'='*60}")
    print("TERMINE")
    print(f"{'='*60}")
    print("\n[NEXT STEPS]")
    print("   1. Executez database/triggers.sql dans Supabase SQL Editor")
    print("   2. Re-executez: python test_workflow_simple.py --test")
    print("   3. Lancez: python queue_worker.py")


if __name__ == "__main__":
    main()
