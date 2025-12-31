#!/usr/bin/env python3
"""
SAFESCORING.IO - Évaluation parallèle
Lance plusieurs instances de l'évaluateur pour accélérer le traitement
Chaque instance traite une plage spécifique de produits
"""

import subprocess
import sys
import time
import requests
from collections import Counter
import argparse

# Configuration Supabase
SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
}


def get_progress():
    """Récupère la progression actuelle"""
    r = requests.get(f'{SUPABASE_URL}/rest/v1/evaluations?select=product_id', headers=HEADERS)
    evals = r.json()
    counts = Counter(e['product_id'] for e in evals)
    
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name&order=name.asc', headers=HEADERS)
    products = r.json()
    
    evaluated = [p for p in products if counts.get(p['id'], 0) > 0]
    not_evaluated = [p for p in products if counts.get(p['id'], 0) == 0]
    
    return evaluated, not_evaluated, products


def main():
    parser = argparse.ArgumentParser(description='Évaluation parallèle')
    parser.add_argument('--workers', type=int, default=4, help='Nombre de workers (défaut: 4)')
    args = parser.parse_args()
    
    print("""
╔══════════════════════════════════════════════════════════════╗
║     🚀 SAFE SCORING - ÉVALUATION PARALLÈLE                   ║
╚══════════════════════════════════════════════════════════════╝
""")
    
    # Vérifier la progression
    evaluated, not_evaluated, products = get_progress()
    print(f"📊 Progression: {len(evaluated)}/{len(products)} produits évalués")
    print(f"   Restants: {len(not_evaluated)}")
    
    if not not_evaluated:
        print("✅ Tous les produits sont déjà évalués!")
        return
    
    # Nombre de workers
    num_workers = min(args.workers, len(not_evaluated))
    
    # Calculer les plages pour chaque worker
    # Chaque worker commence à un index différent et traite sa portion
    chunk_size = len(products) // num_workers
    
    print(f"\n🔧 Lancement de {num_workers} workers...")
    print(f"   Chaque worker traite ~{chunk_size} produits")
    
    # Lancer les workers
    processes = []
    for i in range(num_workers):
        start_idx = i * chunk_size
        # Le dernier worker prend tout ce qui reste
        limit = chunk_size if i < num_workers - 1 else len(products) - start_idx
        
        # Trouver le premier produit de cette plage
        first_product = products[start_idx]['name'] if start_idx < len(products) else "N/A"
        
        print(f"\n   Worker {i+1}: index {start_idx} -> {start_idx + limit - 1}")
        print(f"      Premier: {first_product}")
        print(f"      Limite: {limit} produits")
        
        # Lancer le worker avec -u pour unbuffered output
        cmd = [
            sys.executable,
            '-u',  # Unbuffered output
            'src/core/smart_evaluator.py',
            '--start', str(start_idx),
            '--limit', str(limit),
            '--worker', str(i+1),
            '--resume'
        ]
        
        # Créer un fichier log pour chaque worker
        log_file = open(f'worker_{i+1}.log', 'w', encoding='utf-8')
        
        # Définir l'environnement avec UTF-8 et unbuffered
        import os
        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'
        env['PYTHONUNBUFFERED'] = '1'
        
        proc = subprocess.Popen(
            cmd,
            stdout=log_file,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            env=env,
            cwd='c:\\Users\\alexa\\Desktop\\SafeScoring'
        )
        processes.append((i+1, proc, log_file, first_product))
    
    print(f"\n✅ {len(processes)} workers lancés!")
    print("   Logs: worker_1.log, worker_2.log, ...")
    print("\n📊 Surveillance de la progression (Ctrl+C pour arrêter)...")
    
    last_count = len(evaluated)
    start_time = time.time()
    
    try:
        while True:
            time.sleep(30)
            
            # Vérifier la progression
            evaluated, not_evaluated, _ = get_progress()
            current_count = len(evaluated)
            
            # Calculer la vitesse
            elapsed = time.time() - start_time
            speed = (current_count - last_count) / (elapsed / 60) if elapsed > 60 else 0
            
            # Estimer le temps restant
            if speed > 0:
                eta_minutes = len(not_evaluated) / speed
                eta_str = f"~{eta_minutes:.0f}min" if eta_minutes < 60 else f"~{eta_minutes/60:.1f}h"
            else:
                eta_str = "calcul..."
            
            # Vérifier quels workers sont encore actifs
            active_workers = sum(1 for _, p, _, _ in processes if p.poll() is None)
            
            print(f"\r   📊 {current_count}/{len(products)} ({current_count*100//len(products)}%) | "
                  f"Restants: {len(not_evaluated)} | "
                  f"Workers actifs: {active_workers}/{len(processes)} | "
                  f"ETA: {eta_str}     ", end="", flush=True)
            
            # Vérifier si tous les workers ont terminé
            all_done = all(p.poll() is not None for _, p, _, _ in processes)
            if all_done or len(not_evaluated) == 0:
                print(f"\n\n✅ Terminé! {current_count} produits évalués.")
                break
                
    except KeyboardInterrupt:
        print("\n\n⚠️ Arrêt demandé...")
        for i, proc, log_file, _ in processes:
            proc.terminate()
            log_file.close()
        print("   Workers arrêtés.")
    
    # Fermer les fichiers log
    for _, _, log_file, _ in processes:
        log_file.close()


if __name__ == '__main__':
    main()
