#!/usr/bin/env python3
"""
SAFESCORING.IO - Scrape Product Images
Scrape les images OG et screenshots des sites web des produits.
Met à jour automatiquement la colonne media dans Supabase.

Usage:
    python scrape_product_images.py                    # 10 premiers produits
    python scrape_product_images.py --limit 50         # 50 produits
    python scrape_product_images.py --product "Ledger" # Produit spécifique
    python scrape_product_images.py --all              # Tous les produits
    python scrape_product_images.py --resume           # Skip produits avec images

Prérequis:
    ALTER TABLE products ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;
"""

import requests
import sys
import json
import time
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from core.config import SUPABASE_URL, SUPABASE_KEY

SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}


class ProductImageScraper:
    """Scrape product images from websites."""

    def __init__(self):
        self.products = []

        # Stats
        self.stats = {
            'processed': 0,
            'updated': 0,
            'unchanged': 0,
            'errors': 0,
            'no_url': 0,
            'already_has_media': 0
        }

    def load_products(self):
        """Load products from Supabase."""
        print("\n[LOAD] Chargement des produits...")

        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug,url,media&order=name",
            headers=SUPABASE_HEADERS
        )

        if r.status_code == 200:
            self.products = r.json()
            print(f"   {len(self.products)} produits chargés")
        else:
            print(f"   [ERROR] Erreur chargement: {r.status_code}")
            print(f"   {r.text}")
            sys.exit(1)

    def scrape_images(self, url: str) -> List[Dict]:
        """Scrape images from a URL using Microlink API."""
        images = []

        try:
            # Microlink API - Free tier
            microlink_url = f"https://api.microlink.io/?url={requests.utils.quote(url)}"
            r = requests.get(microlink_url, timeout=30)

            if r.status_code != 200:
                return images

            data = r.json()

            if data.get('status') != 'success':
                return images

            # OG Image (principale)
            if data.get('data', {}).get('image', {}).get('url'):
                img_url = data['data']['image']['url']
                # Éviter les images trop petites ou les favicons
                width = data['data']['image'].get('width', 0)
                height = data['data']['image'].get('height', 0)
                if width > 200 or height > 200 or (width == 0 and height == 0):
                    images.append({
                        'url': img_url,
                        'type': 'image',
                        'caption': 'Product image'
                    })

            # Logo (si pas d'image OG)
            if not images and data.get('data', {}).get('logo', {}).get('url'):
                logo_url = data['data']['logo']['url']
                images.append({
                    'url': logo_url,
                    'type': 'image',
                    'caption': 'Logo'
                })

        except requests.exceptions.Timeout:
            print(f"      [TIMEOUT] {url[:50]}...")
        except Exception as e:
            print(f"      [ERROR] {str(e)[:50]}")

        return images

    def update_product_media(self, product_id: int, media: List[Dict]) -> bool:
        """Update product media in Supabase."""
        try:
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}",
                headers=SUPABASE_HEADERS,
                json={'media': media}
            )
            return r.status_code in [200, 204]
        except Exception as e:
            print(f"      [ERROR] Update failed: {e}")
            return False

    def process_product(self, product: Dict, skip_existing: bool = False) -> Dict:
        """Process a single product."""
        name = product['name']
        pid = product['id']
        url = product.get('url')
        current_media = product.get('media') or []

        result = {
            'name': name,
            'status': 'pending',
            'images_found': 0
        }

        # Skip if no URL
        if not url:
            result['status'] = 'no_url'
            self.stats['no_url'] += 1
            return result

        # Skip if already has media
        if skip_existing and current_media and len(current_media) > 0:
            result['status'] = 'already_has_media'
            self.stats['already_has_media'] += 1
            return result

        # Scrape images
        print(f"   Scraping {url[:50]}...")
        images = self.scrape_images(url)

        if not images:
            result['status'] = 'no_images'
            self.stats['errors'] += 1
            print(f"      ❌ Aucune image trouvée")
            return result

        result['images_found'] = len(images)

        # Update Supabase
        if self.update_product_media(pid, images):
            result['status'] = 'updated'
            self.stats['updated'] += 1
            print(f"      ✅ {len(images)} image(s) ajoutée(s)")
        else:
            result['status'] = 'update_error'
            self.stats['errors'] += 1
            print(f"      ❌ Erreur update Supabase")

        self.stats['processed'] += 1
        return result

    def run(self,
            product_filter: str = None,
            limit: int = 10,
            skip_existing: bool = False,
            delay: float = 1.0):
        """Run the image scraping process."""

        print("\n" + "=" * 70)
        print("   SCRAPE PRODUCT IMAGES - Récupération des images produits")
        print("=" * 70)
        print(f"   Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   Delay: {delay}s entre chaque produit")
        if skip_existing:
            print(f"   Mode: Skip produits avec images existantes")

        # Load products
        self.load_products()

        # Filter products
        products = self.products

        if product_filter:
            products = [p for p in products if product_filter.lower() in p['name'].lower()]
            print(f"\n[FILTER] {len(products)} produits contenant '{product_filter}'")

        # Skip products that already have media
        if skip_existing:
            products = [p for p in products if not (p.get('media') and len(p.get('media', [])) > 0)]
            print(f"[RESUME] {len(products)} produits sans images")

        # Filter products with URL
        products = [p for p in products if p.get('url')]
        print(f"[URL] {len(products)} produits avec URL")

        # Apply limit
        if limit and limit < len(products):
            products = products[:limit]

        print(f"\n[START] {len(products)} produits à traiter")
        print("-" * 70)

        results = []

        for i, product in enumerate(products):
            print(f"\n[{i+1}/{len(products)}] {product['name']}")

            result = self.process_product(product, skip_existing)
            results.append(result)

            # Rate limiting
            if i < len(products) - 1:
                time.sleep(delay)

        # Summary
        print("\n" + "=" * 70)
        print("   RÉSUMÉ")
        print("=" * 70)
        print(f"   Traités:           {self.stats['processed']}")
        print(f"   Mis à jour:        {self.stats['updated']}")
        print(f"   Erreurs:           {self.stats['errors']}")
        print(f"   Sans URL:          {self.stats['no_url']}")
        print(f"   Déjà avec images:  {self.stats['already_has_media']}")

        # Show updates
        updates = [r for r in results if r['status'] == 'updated']
        if updates:
            print(f"\n   IMAGES AJOUTÉES ({len(updates)}):")
            for u in updates[:20]:  # Show first 20
                print(f"   • {u['name']}: {u['images_found']} image(s)")
            if len(updates) > 20:
                print(f"   ... et {len(updates) - 20} autres")

        return results


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Scrape Product Images - Récupération des images produits')
    parser.add_argument('--product', type=str, help='Filtrer par nom de produit')
    parser.add_argument('--limit', type=int, default=10, help='Nombre de produits (défaut: 10)')
    parser.add_argument('--all', action='store_true', help='Traiter tous les produits')
    parser.add_argument('--resume', action='store_true', help='Skip produits avec images existantes')
    parser.add_argument('--delay', type=float, default=1.0, help='Délai entre produits (défaut: 1s)')

    args = parser.parse_args()

    scraper = ProductImageScraper()

    limit = None if args.all else args.limit

    scraper.run(
        product_filter=args.product,
        limit=limit,
        skip_existing=args.resume,
        delay=args.delay
    )


if __name__ == "__main__":
    main()
