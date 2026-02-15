#!/usr/bin/env python3
"""
SAFESCORING.IO - Migrate price_details to fees_breakdown JSONB
===============================================================

Reads existing price_details text from the products table and converts
each entry into a structured fees_breakdown JSONB object using the
fee_parser module.

Usage:
    python scripts/migrate_fees_breakdown.py --dry-run
    python scripts/migrate_fees_breakdown.py --product binance
    python scripts/migrate_fees_breakdown.py --force
    python scripts/migrate_fees_breakdown.py

Options:
    --dry-run           Show what would happen without writing to DB
    --product SLUG      Process a single product by slug
    --force             Overwrite existing fees_breakdown data
"""

from __future__ import annotations

import os
import sys
import json
import argparse
import time
from pathlib import Path
from typing import Dict, List, Optional, Any

# Ensure project root is on sys.path so src.utils.fee_parser is importable
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import requests
from src.utils.fee_parser import parse_fees


# ============================================
# CONFIGURATION
# ============================================

def load_env() -> Dict[str, str]:
    """Load .env file from project root."""
    env_path = PROJECT_ROOT / ".env"
    config: Dict[str, str] = {}
    if not env_path.exists():
        return config
    with open(env_path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                config[key.strip()] = value.strip()
    return config


ENV = load_env()
SUPABASE_URL: str = ENV.get("NEXT_PUBLIC_SUPABASE_URL", ENV.get("SUPABASE_URL", ""))
SUPABASE_KEY: str = ENV.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", ENV.get("SUPABASE_KEY", ""))


# ============================================
# SUPABASE REST CLIENT
# ============================================

class SupabaseClient:
    """Lightweight Supabase REST API client (same pattern as price_updater)."""

    def __init__(self, url: str, key: str) -> None:
        self.url: str = url.rstrip("/")
        self.key: str = key
        self.headers: Dict[str, str] = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }

    def test_connection(self) -> bool:
        try:
            resp = requests.get(
                f"{self.url}/rest/v1/",
                headers=self.headers,
                timeout=10,
            )
            return resp.status_code == 200
        except Exception:
            return False

    def get(
        self,
        table: str,
        select: str = "*",
        filters: Optional[Dict[str, str]] = None,
    ) -> List[Dict[str, Any]]:
        params: Dict[str, str] = {"select": select}
        if filters:
            params.update(filters)
        try:
            resp = requests.get(
                f"{self.url}/rest/v1/{table}",
                headers=self.headers,
                params=params,
                timeout=30,
            )
            if resp.status_code == 200:
                return resp.json()
            print(f"  [ERROR] GET {table}: HTTP {resp.status_code}")
            return []
        except Exception as exc:
            print(f"  [ERROR] GET {table}: {exc}")
            return []

    def patch(
        self,
        table: str,
        data: Dict[str, Any],
        filters: Dict[str, str],
    ) -> bool:
        try:
            resp = requests.patch(
                f"{self.url}/rest/v1/{table}",
                headers=self.headers,
                json=data,
                params=filters,
                timeout=30,
            )
            return resp.status_code in (200, 204)
        except Exception as exc:
            print(f"  [ERROR] PATCH {table}: {exc}")
            return False


# ============================================
# MIGRATION LOGIC
# ============================================

def run_migration(
    db: SupabaseClient,
    dry_run: bool = False,
    slug: Optional[str] = None,
    force: bool = False,
) -> None:
    """Migrate price_details text into structured fees_breakdown JSONB."""

    print()
    print("=" * 64)
    print("  SAFESCORING - Migrate price_details -> fees_breakdown")
    print("=" * 64)
    print()
    print(f"  Dry-run : {'YES' if dry_run else 'NO'}")
    print(f"  Force   : {'YES' if force else 'NO'}")
    if slug:
        print(f"  Product : {slug}")
    print()

    # ------------------------------------------------------------------
    # 1. Fetch products with price_details not null
    # ------------------------------------------------------------------
    filters: Dict[str, str] = {
        "price_details": "not.is.null",
    }
    if slug:
        filters["slug"] = f"eq.{slug}"

    products = db.get(
        "products",
        "id,name,slug,price_eur,price_details,fees_breakdown",
        filters,
    )

    if not products:
        print("  No products found with price_details.")
        return

    print(f"  Products with price_details: {len(products)}")
    print()
    print("-" * 64)

    # ------------------------------------------------------------------
    # 2. Process each product
    # ------------------------------------------------------------------
    stats = {
        "total": len(products),
        "updated": 0,
        "skipped": 0,
        "errors": 0,
    }

    for idx, product in enumerate(products, 1):
        p_name = product.get("name", "?")
        p_slug = product.get("slug", "?")
        p_id = product.get("id")
        price_eur = product.get("price_eur")
        price_details = product.get("price_details", "")
        existing_breakdown = product.get("fees_breakdown")

        print(f"\n  [{idx}/{stats['total']}] {p_name}  ({p_slug})")
        print(f"    price_eur     : {price_eur}")
        print(f"    price_details : {price_details}")

        # Skip if fees_breakdown already exists and --force is not set
        if existing_breakdown and not force:
            print(f"    => SKIPPED (fees_breakdown already set, use --force)")
            stats["skipped"] += 1
            continue

        # Parse the fees
        try:
            breakdown = parse_fees(
                price_eur=price_eur,
                price_details=price_details,
                source="migration",
            )
        except Exception as exc:
            print(f"    => ERROR parsing: {exc}")
            stats["errors"] += 1
            continue

        if breakdown is None:
            print(f"    => SKIPPED (parser returned None)")
            stats["skipped"] += 1
            continue

        fee_count = len(breakdown.get("fees", []))
        has_cost = "product_cost" in breakdown
        print(f"    => Parsed: {fee_count} fee(s){', +product_cost' if has_cost else ''}")

        if dry_run:
            # Show the JSON that would be written
            preview = json.dumps(breakdown, indent=2, ensure_ascii=False)
            # Indent each line for readability
            for line in preview.split("\n"):
                print(f"       {line}")
            stats["updated"] += 1
            continue

        # Write to Supabase
        success = db.patch(
            "products",
            {"fees_breakdown": json.dumps(breakdown, ensure_ascii=False)},
            {"id": f"eq.{p_id}"},
        )

        if success:
            print(f"    => UPDATED in Supabase")
            stats["updated"] += 1
        else:
            print(f"    => ERROR writing to Supabase")
            stats["errors"] += 1

    # ------------------------------------------------------------------
    # 3. Summary
    # ------------------------------------------------------------------
    print()
    print("=" * 64)
    print("  SUMMARY")
    print("=" * 64)
    print(f"    Total products : {stats['total']}")
    print(f"    Updated        : {stats['updated']}")
    print(f"    Skipped        : {stats['skipped']}")
    print(f"    Errors         : {stats['errors']}")
    print("=" * 64)
    print()


# ============================================
# MAIN
# ============================================

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Migrate price_details text to structured fees_breakdown JSONB",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would happen without writing to the database",
    )
    parser.add_argument(
        "--product",
        type=str,
        default=None,
        help="Process a single product by slug",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing fees_breakdown data",
    )
    args = parser.parse_args()

    # Validate configuration
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("\n  ERROR: SUPABASE_URL and SUPABASE_KEY must be set in .env")
        sys.exit(1)

    db = SupabaseClient(SUPABASE_URL, SUPABASE_KEY)

    if not db.test_connection():
        print("\n  ERROR: Cannot connect to Supabase")
        sys.exit(1)

    print("  Supabase connection: OK")

    run_migration(
        db=db,
        dry_run=args.dry_run,
        slug=args.product,
        force=args.force,
    )


if __name__ == "__main__":
    main()
