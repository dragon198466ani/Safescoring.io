#!/usr/bin/env python3
"""
SAFESCORING.IO - Update Social Links
Script pour mettre a jour les liens sociaux (Discord, Twitter, Telegram, etc.) des produits.

Usage:
    python update_social_links.py                    # Mode interactif
    python update_social_links.py --csv links.csv   # Import depuis CSV
    python update_social_links.py --list            # Lister tous les produits
"""

import os
import sys
import json
import argparse
import csv

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import requests
from core.config import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers


def get_all_products():
    """Recupere tous les produits avec leurs social_links actuels"""
    url = f"{SUPABASE_URL}/rest/v1/products"
    params = {
        "select": "id,name,slug,url,social_links",
        "order": "name.asc"
    }

    response = requests.get(url, headers=get_supabase_headers(), params=params)

    if response.status_code == 200:
        return response.json()
    else:
        print(f"Erreur lors de la recuperation des produits: {response.status_code}")
        print(response.text)
        return []


def update_product_links(product_id: int, links: dict):
    """
    Met a jour les liens sociaux d'un produit.

    Args:
        product_id: ID du produit
        links: Dict avec les liens (discord, twitter, telegram, github, docs)
    """
    # D'abord recuperer les social_links actuels
    url = f"{SUPABASE_URL}/rest/v1/products"
    params = {"select": "social_links", "id": f"eq.{product_id}"}

    response = requests.get(url, headers=get_supabase_headers(), params=params)

    if response.status_code != 200 or not response.json():
        print(f"Erreur: Produit {product_id} non trouve")
        return False

    current_links = response.json()[0].get('social_links') or {}

    # Ajouter/mettre a jour les liens fournis
    for key, value in links.items():
        if value:  # Seulement si une valeur est fournie
            current_links[key] = value
        elif key in current_links and value == '':
            # Supprimer si valeur vide explicite
            del current_links[key]

    # Mettre a jour dans Supabase
    update_url = f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}"
    update_data = {"social_links": current_links}

    response = requests.patch(
        update_url,
        headers=get_supabase_headers('return=representation'),
        json=update_data
    )

    if response.status_code in [200, 204]:
        return True
    else:
        print(f"Erreur mise a jour: {response.status_code} - {response.text}")
        return False


def update_from_csv(csv_path: str):
    """
    Import les liens depuis un fichier CSV.

    Format CSV attendu:
    slug,discord,twitter,telegram,github,docs
    coolwallet-pro,https://discord.gg/xxx,https://twitter.com/xxx,...
    """
    if not os.path.exists(csv_path):
        print(f"Erreur: Fichier {csv_path} non trouve")
        return

    # Recuperer tous les produits pour mapper slug -> id
    products = get_all_products()
    slug_to_id = {p['slug']: p['id'] for p in products}

    updated = 0
    errors = 0

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            slug = row.get('slug', '').strip()

            if not slug:
                continue

            if slug not in slug_to_id:
                print(f"Produit non trouve: {slug}")
                errors += 1
                continue

            links = {
                'discord': row.get('discord', '').strip(),
                'twitter': row.get('twitter', '').strip(),
                'telegram': row.get('telegram', '').strip(),
                'github': row.get('github', '').strip(),
                'docs': row.get('docs', '').strip(),
            }

            # Filtrer les liens vides
            links = {k: v for k, v in links.items() if v}

            if links:
                product_id = slug_to_id[slug]
                if update_product_links(product_id, links):
                    print(f"[OK] {slug}: {list(links.keys())}")
                    updated += 1
                else:
                    errors += 1

    print(f"\nTermine: {updated} produits mis a jour, {errors} erreurs")


def interactive_mode():
    """Mode interactif pour mettre a jour les liens un par un"""
    products = get_all_products()

    if not products:
        print("Aucun produit trouve")
        return

    print(f"\n{'='*60}")
    print(f"MISE A JOUR DES LIENS SOCIAUX - {len(products)} produits")
    print(f"{'='*60}")
    print("\nCommandes: ")
    print("  [Enter] = Passer au suivant")
    print("  'q' = Quitter")
    print("  'skip N' = Sauter N produits")
    print("  'search XXX' = Chercher un produit")
    print()

    i = 0
    while i < len(products):
        product = products[i]
        current_links = product.get('social_links') or {}

        print(f"\n[{i+1}/{len(products)}] {product['name']}")
        print(f"  Slug: {product['slug']}")
        print(f"  URL: {product.get('url', 'N/A')}")
        print(f"  Liens actuels: {json.dumps(current_links, indent=4) if current_links else 'Aucun'}")

        # Demander les liens
        print("\nEntrez les nouveaux liens (vide = garder actuel, '-' = supprimer):")

        discord = input(f"  Discord [{current_links.get('discord', '')}]: ").strip()

        if discord.lower() == 'q':
            print("Quitte...")
            break
        elif discord.lower().startswith('skip'):
            try:
                skip = int(discord.split()[1])
                i += skip
                continue
            except:
                i += 1
                continue
        elif discord.lower().startswith('search'):
            search_term = discord.split(' ', 1)[1].lower() if ' ' in discord else ''
            for j, p in enumerate(products):
                if search_term in p['name'].lower() or search_term in p['slug'].lower():
                    print(f"  [{j+1}] {p['name']} ({p['slug']})")
            search_idx = input("  Aller au produit #: ").strip()
            if search_idx.isdigit():
                i = int(search_idx) - 1
            continue

        twitter = input(f"  Twitter [{current_links.get('twitter', '')}]: ").strip()
        telegram = input(f"  Telegram [{current_links.get('telegram', '')}]: ").strip()
        github = input(f"  GitHub [{current_links.get('github', '')}]: ").strip()
        docs = input(f"  Docs [{current_links.get('docs', '')}]: ").strip()

        # Preparer les mises a jour
        links = {}

        for key, value, current in [
            ('discord', discord, current_links.get('discord', '')),
            ('twitter', twitter, current_links.get('twitter', '')),
            ('telegram', telegram, current_links.get('telegram', '')),
            ('github', github, current_links.get('github', '')),
            ('docs', docs, current_links.get('docs', '')),
        ]:
            if value == '-':
                links[key] = ''  # Supprimer
            elif value:
                links[key] = value  # Nouveau
            elif current:
                links[key] = current  # Garder actuel

        if links:
            confirm = input(f"\n  Confirmer mise a jour? (o/N): ").strip().lower()
            if confirm == 'o':
                if update_product_links(product['id'], links):
                    print("  [OK] Mis a jour!")
                else:
                    print("  [ERREUR] Echec de la mise a jour")

        i += 1


def list_products():
    """Liste tous les produits avec leurs liens actuels"""
    products = get_all_products()

    print(f"\n{'='*80}")
    print(f"LISTE DES PRODUITS - {len(products)} produits")
    print(f"{'='*80}\n")

    # Stats
    with_discord = 0
    with_twitter = 0
    with_telegram = 0

    for p in products:
        links = p.get('social_links') or {}

        discord = links.get('discord', '')
        twitter = links.get('twitter', '')
        telegram = links.get('telegram', '')

        if discord: with_discord += 1
        if twitter: with_twitter += 1
        if telegram: with_telegram += 1

        status = []
        if discord: status.append('D')
        if twitter: status.append('T')
        if telegram: status.append('TG')

        status_str = f"[{','.join(status)}]" if status else "[--]"
        print(f"{status_str:12} {p['name'][:40]:40} ({p['slug']})")

    print(f"\n{'='*80}")
    print(f"Stats: Discord={with_discord}, Twitter={with_twitter}, Telegram={with_telegram}")
    print(f"{'='*80}")


def export_csv_template():
    """Exporte un template CSV avec tous les produits"""
    products = get_all_products()

    output_path = 'social_links_template.csv'

    with open(output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['slug', 'name', 'discord', 'twitter', 'telegram', 'github', 'docs'])

        for p in products:
            links = p.get('social_links') or {}
            writer.writerow([
                p['slug'],
                p['name'],
                links.get('discord', ''),
                links.get('twitter', ''),
                links.get('telegram', ''),
                links.get('github', ''),
                links.get('docs', ''),
            ])

    print(f"Template exporte: {output_path}")
    print(f"{len(products)} produits")


def main():
    parser = argparse.ArgumentParser(description='Mise a jour des liens sociaux des produits')
    parser.add_argument('--csv', help='Importer depuis un fichier CSV')
    parser.add_argument('--list', action='store_true', help='Lister tous les produits')
    parser.add_argument('--export', action='store_true', help='Exporter template CSV')

    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Erreur: Configuration Supabase manquante")
        print("Verifiez config/env_template_free.txt")
        sys.exit(1)

    if args.csv:
        update_from_csv(args.csv)
    elif args.list:
        list_products()
    elif args.export:
        export_csv_template()
    else:
        interactive_mode()


if __name__ == '__main__':
    main()
