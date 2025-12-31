#!/usr/bin/env python3
"""
SAFESCORING.IO - Multi-Type Manager
Utility to add/remove secondary types for products.
Supports the many-to-many product_type_mapping table.
"""

import requests
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from core.config import SUPABASE_URL, SUPABASE_HEADERS


class MultiTypeManager:
    """Manages multiple types for products"""

    def __init__(self):
        self.products = []
        self.product_types = {}
        self.current_mappings = {}  # {product_id: [type_ids]}

    def load_data(self):
        """Load products, types, and current mappings"""
        print("\n[LOAD] Loading data from Supabase...")

        # Load product types
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name&order=code",
            headers=SUPABASE_HEADERS
        )
        if r.status_code == 200:
            types_list = r.json()
            self.product_types = {t['id']: t for t in types_list}
            self.type_by_code = {t['code']: t for t in types_list}
            print(f"   {len(self.product_types)} product types")

        # Load products
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id&order=name",
            headers=SUPABASE_HEADERS
        )
        if r.status_code == 200:
            self.products = r.json()
            print(f"   {len(self.products)} products")

        # Load current mappings
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id,is_primary&order=is_primary.desc",
            headers=SUPABASE_HEADERS
        )
        if r.status_code == 200:
            for m in r.json():
                pid = m['product_id']
                if pid not in self.current_mappings:
                    self.current_mappings[pid] = []
                self.current_mappings[pid].append({
                    'type_id': m['type_id'],
                    'is_primary': m['is_primary']
                })
            print(f"   {len(self.current_mappings)} products with type mappings")

    def list_types(self):
        """Display all available product types"""
        print("\n" + "=" * 60)
        print("AVAILABLE PRODUCT TYPES")
        print("=" * 60)
        for tid, t in sorted(self.product_types.items(), key=lambda x: x[1]['code']):
            print(f"   [{tid:3}] {t['code']:<15} - {t['name']}")

    def search_products(self, query):
        """Search products by name"""
        results = [p for p in self.products if query.lower() in p['name'].lower()]
        if not results:
            print(f"\n[!] No products found matching '{query}'")
            return []

        print(f"\n[SEARCH] {len(results)} products matching '{query}':")
        for p in results:
            types = self.get_product_types(p['id'])
            type_str = " + ".join([t['code'] for t in types]) if types else "No type"
            print(f"   [{p['id']}] {p['name'][:40]:<40} ({type_str})")
        return results

    def get_product_types(self, product_id):
        """Get all types for a product"""
        if product_id in self.current_mappings:
            return [
                self.product_types.get(m['type_id'], {})
                for m in self.current_mappings[product_id]
            ]
        # Fallback to products.type_id
        product = next((p for p in self.products if p['id'] == product_id), None)
        if product and product.get('type_id'):
            return [self.product_types.get(product['type_id'], {})]
        return []

    def add_type(self, product_id, type_code, is_primary=False):
        """Add a type to a product"""
        if type_code not in self.type_by_code:
            print(f"[ERROR] Unknown type code: {type_code}")
            return False

        type_info = self.type_by_code[type_code]
        type_id = type_info['id']

        # Check if already exists
        if product_id in self.current_mappings:
            existing_types = [m['type_id'] for m in self.current_mappings[product_id]]
            if type_id in existing_types:
                print(f"[INFO] Product already has type {type_code}")
                return True

        # Insert new mapping
        data = {
            'product_id': product_id,
            'type_id': type_id,
            'is_primary': is_primary
        }

        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/product_type_mapping",
            headers=SUPABASE_HEADERS,
            json=data
        )

        if r.status_code in [200, 201]:
            product = next((p for p in self.products if p['id'] == product_id), {})
            print(f"[OK] Added {type_code} to {product.get('name', 'Unknown')}")
            # Update local cache
            if product_id not in self.current_mappings:
                self.current_mappings[product_id] = []
            self.current_mappings[product_id].append({
                'type_id': type_id,
                'is_primary': is_primary
            })
            return True
        else:
            print(f"[ERROR] Failed to add type: {r.status_code} - {r.text}")
            return False

    def remove_type(self, product_id, type_code):
        """Remove a type from a product"""
        if type_code not in self.type_by_code:
            print(f"[ERROR] Unknown type code: {type_code}")
            return False

        type_info = self.type_by_code[type_code]
        type_id = type_info['id']

        r = requests.delete(
            f"{SUPABASE_URL}/rest/v1/product_type_mapping?product_id=eq.{product_id}&type_id=eq.{type_id}",
            headers=SUPABASE_HEADERS
        )

        if r.status_code in [200, 204]:
            product = next((p for p in self.products if p['id'] == product_id), {})
            print(f"[OK] Removed {type_code} from {product.get('name', 'Unknown')}")
            return True
        else:
            print(f"[ERROR] Failed to remove type: {r.status_code}")
            return False

    def show_multi_type_products(self):
        """Show all products with multiple types"""
        print("\n" + "=" * 60)
        print("MULTI-TYPE PRODUCTS")
        print("=" * 60)

        multi_count = 0
        for pid, mappings in self.current_mappings.items():
            if len(mappings) > 1:
                multi_count += 1
                product = next((p for p in self.products if p['id'] == pid), {})
                types = [self.product_types.get(m['type_id'], {}) for m in mappings]
                type_strs = []
                for i, m in enumerate(mappings):
                    t = self.product_types.get(m['type_id'], {})
                    primary = " (PRIMARY)" if m['is_primary'] else ""
                    type_strs.append(f"{t.get('code', '?')}{primary}")
                print(f"   [{pid}] {product.get('name', 'Unknown')[:35]:<35} -> {' + '.join(type_strs)}")

        if multi_count == 0:
            print("   No multi-type products found yet.")
        else:
            print(f"\n   Total: {multi_count} multi-type products")

    def suggest_multi_types(self):
        """Suggest products that might benefit from multiple types"""
        print("\n" + "=" * 60)
        print("SUGGESTED MULTI-TYPE PRODUCTS")
        print("=" * 60)

        suggestions = {
            # Hardware wallets with anti-coercion
            'HW Cold': ['AC Phys'],
            # Software wallets often available on multiple platforms
            'SW Browser': ['SW Mobile'],
            'SW Mobile': ['SW Browser'],
            # DEXs with additional features
            'DEX': ['Lending', 'Yield', 'Derivatives'],
            # CEXs with cards
            'CEX': ['Card'],
            # Crypto banks with cards
            'Crypto Bank': ['Card'],
        }

        for product in self.products:
            pid = product['id']
            current_types = self.get_product_types(pid)
            current_codes = [t.get('code') for t in current_types]

            if not current_codes:
                continue

            # Check suggestions for primary type
            primary_code = current_codes[0] if current_codes else None
            if primary_code in suggestions:
                potential = suggestions[primary_code]
                missing = [s for s in potential if s not in current_codes]
                if missing:
                    name = product['name'][:35]
                    current_str = ' + '.join(current_codes)
                    suggest_str = ', '.join(missing)
                    print(f"   [{pid}] {name:<35} ({current_str})")
                    print(f"         -> Could add: {suggest_str}")

    def batch_add_types(self, mappings):
        """
        Add multiple types at once.
        mappings: list of (product_name_pattern, type_code) tuples
        """
        print("\n[BATCH] Adding types...")

        for pattern, type_code in mappings:
            matches = [p for p in self.products if pattern.lower() in p['name'].lower()]
            for product in matches:
                self.add_type(product['id'], type_code)


def interactive_menu():
    """Interactive menu for managing multi-types"""
    manager = MultiTypeManager()
    manager.load_data()

    while True:
        print("\n" + "=" * 60)
        print("MULTI-TYPE MANAGER")
        print("=" * 60)
        print("  1. List all product types")
        print("  2. Search products")
        print("  3. Show multi-type products")
        print("  4. Add type to product")
        print("  5. Remove type from product")
        print("  6. Suggest multi-types")
        print("  7. Reload data")
        print("  0. Exit")
        print("-" * 60)

        choice = input("Choice: ").strip()

        if choice == '0':
            break
        elif choice == '1':
            manager.list_types()
        elif choice == '2':
            query = input("Search query: ").strip()
            if query:
                manager.search_products(query)
        elif choice == '3':
            manager.show_multi_type_products()
        elif choice == '4':
            pid = input("Product ID: ").strip()
            tcode = input("Type code: ").strip()
            if pid and tcode:
                manager.add_type(int(pid), tcode)
        elif choice == '5':
            pid = input("Product ID: ").strip()
            tcode = input("Type code to remove: ").strip()
            if pid and tcode:
                manager.remove_type(int(pid), tcode)
        elif choice == '6':
            manager.suggest_multi_types()
        elif choice == '7':
            manager.load_data()


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Multi-Type Manager')
    parser.add_argument('--add', nargs=2, metavar=('PRODUCT_ID', 'TYPE_CODE'),
                        help='Add type to product')
    parser.add_argument('--remove', nargs=2, metavar=('PRODUCT_ID', 'TYPE_CODE'),
                        help='Remove type from product')
    parser.add_argument('--list-types', action='store_true',
                        help='List all product types')
    parser.add_argument('--search', type=str, help='Search products')
    parser.add_argument('--show-multi', action='store_true',
                        help='Show multi-type products')
    parser.add_argument('--suggest', action='store_true',
                        help='Suggest multi-type candidates')
    parser.add_argument('--interactive', '-i', action='store_true',
                        help='Interactive menu')

    args = parser.parse_args()

    manager = MultiTypeManager()
    manager.load_data()

    if args.list_types:
        manager.list_types()
    elif args.search:
        manager.search_products(args.search)
    elif args.show_multi:
        manager.show_multi_type_products()
    elif args.suggest:
        manager.suggest_multi_types()
    elif args.add:
        manager.add_type(int(args.add[0]), args.add[1])
    elif args.remove:
        manager.remove_type(int(args.remove[0]), args.remove[1])
    elif args.interactive:
        interactive_menu()
    else:
        interactive_menu()


if __name__ == "__main__":
    main()
