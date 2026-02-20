#!/usr/bin/env python3
"""
Product Data Enrichment Script
===============================
Enrichit les données produits directement dans Supabase avec:
- Liens sociaux (Twitter, Discord, Telegram, Reddit, GitHub)
- Slugs DefiLlama et CoinGecko
- Informations de marque (brand)
- Stratégies SAFE basées sur les évaluations

Usage:
    python scripts/enrich_product_data.py --all
    python scripts/enrich_product_data.py --product ledger-nano-x
    python scripts/enrich_product_data.py --interactive
    
Mode interactif: te permet d'enrichir les produits un par un directement
"""

import os
import sys
import json
import argparse
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.supabase_client import get_supabase_client

def enrich_product(supabase, product_id: int, data: dict) -> bool:
    """
    Enrichit un produit avec les données fournies.
    
    Args:
        supabase: Client Supabase
        product_id: ID du produit
        data: Dictionnaire avec les champs à mettre à jour
            - social_links: dict avec twitter, discord, telegram, reddit, github, docs
            - defillama_slug: str
            - coingecko_id: str
            - github_repo: str (format: owner/repo)
            - brand_name: str (créera la marque si elle n'existe pas)
            - description: str
            - short_description: str
    
    Returns:
        bool: True si succès
    """
    try:
        update_data = {}
        
        # Social links
        if "social_links" in data and data["social_links"]:
            # Merge with existing social_links
            existing = supabase.table("products").select("social_links").eq("id", product_id).single().execute()
            existing_links = existing.data.get("social_links") or {}
            merged_links = {**existing_links, **data["social_links"]}
            # Remove empty values
            merged_links = {k: v for k, v in merged_links.items() if v}
            update_data["social_links"] = merged_links
        
        # Direct fields
        direct_fields = ["defillama_slug", "coingecko_id", "github_repo", "description", "short_description"]
        for field in direct_fields:
            if field in data and data[field]:
                update_data[field] = data[field]
        
        # Brand handling
        if "brand_name" in data and data["brand_name"]:
            brand_name = data["brand_name"]
            # Check if brand exists
            brand_result = supabase.table("brands").select("id").eq("name", brand_name).execute()
            if brand_result.data:
                update_data["brand_id"] = brand_result.data[0]["id"]
            else:
                # Create brand
                new_brand = supabase.table("brands").insert({"name": brand_name}).execute()
                if new_brand.data:
                    update_data["brand_id"] = new_brand.data[0]["id"]
                    print(f"  ✓ Created brand: {brand_name}")
        
        # Update product
        if update_data:
            update_data["updated_at"] = datetime.utcnow().isoformat()
            update_data["data_updated_at"] = datetime.utcnow().isoformat()
            
            supabase.table("products").update(update_data).eq("id", product_id).execute()
            print(f"  ✓ Updated product {product_id} with {len(update_data)} fields")
            return True
        
        return False
        
    except Exception as e:
        print(f"  ✗ Error enriching product {product_id}: {e}")
        return False


def sync_social_links_to_sources(supabase, product_id: int) -> int:
    """
    Synchronise les social_links vers la table product_sources.
    
    Returns:
        int: Nombre de sources créées/mises à jour
    """
    try:
        # Get product social_links
        product = supabase.table("products").select("social_links, url").eq("id", product_id).single().execute()
        social_links = product.data.get("social_links") or {}
        website = product.data.get("url")
        
        count = 0
        
        # Map social keys to source types
        type_mapping = {
            "twitter": "twitter",
            "x": "twitter",
            "discord": "discord",
            "telegram": "telegram",
            "reddit": "reddit",
            "github": "github",
            "docs": "documentation",
            "documentation": "documentation",
            "blog": "blog",
            "medium": "medium",
            "youtube": "youtube",
        }
        
        # Add website as official source
        if website and website != "#":
            try:
                supabase.table("product_sources").upsert({
                    "product_id": product_id,
                    "source_type": "official_website",
                    "url": website,
                    "is_official": True,
                    "is_verified": True,
                    "title": "Official Website",
                }, on_conflict="product_id,source_type,url").execute()
                count += 1
            except:
                pass
        
        # Add social links
        for key, url in social_links.items():
            if not url:
                continue
            source_type = type_mapping.get(key.lower(), "other")
            try:
                supabase.table("product_sources").upsert({
                    "product_id": product_id,
                    "source_type": source_type,
                    "url": url,
                    "is_official": True,
                    "is_verified": True,
                }, on_conflict="product_id,source_type,url").execute()
                count += 1
            except:
                pass
        
        return count
        
    except Exception as e:
        print(f"  ✗ Error syncing sources for product {product_id}: {e}")
        return 0


def generate_strategies_from_evaluations(supabase, product_id: int) -> int:
    """
    Génère des stratégies SAFE basées sur les évaluations échouées.
    
    Returns:
        int: Nombre de stratégies créées
    """
    try:
        # Get failed evaluations
        evals = supabase.table("evaluations").select(
            "result, why_this_result, norms(code, pillar, title, is_essential)"
        ).eq("product_id", product_id).in_("result", ["NO", "N"]).execute()
        
        if not evals.data:
            return 0
        
        # Group by pillar
        by_pillar = {"S": [], "A": [], "F": [], "E": []}
        for e in evals.data:
            norm = e.get("norms")
            if norm and norm.get("pillar") in by_pillar:
                by_pillar[norm["pillar"]].append({
                    "code": norm.get("code"),
                    "title": norm.get("title"),
                    "reason": e.get("why_this_result"),
                    "is_essential": norm.get("is_essential", False),
                })
        
        count = 0
        pillar_names = {"S": "Security", "A": "Adversity", "F": "Fidelity", "E": "Efficiency"}
        
        for pillar, failed in by_pillar.items():
            if not failed:
                continue
            
            # Sort by essential first
            failed.sort(key=lambda x: x.get("is_essential", False), reverse=True)
            
            # Take top 3
            for idx, issue in enumerate(failed[:3]):
                try:
                    supabase.table("product_strategies").upsert({
                        "product_id": product_id,
                        "pillar": pillar,
                        "priority": idx + 1,
                        "strategy_title": f"Improve {issue['title']}",
                        "strategy_description": issue.get("reason") or f"Address this {pillar_names[pillar].lower()} requirement.",
                        "risk_level": "high" if pillar == "S" else ("medium" if pillar == "A" else "low"),
                        "is_active": True,
                    }, on_conflict="product_id,pillar,strategy_title").execute()
                    count += 1
                except:
                    pass
        
        # Update priority pillar on product
        if by_pillar:
            # Find pillar with most failures
            pillar_counts = {p: len(f) for p, f in by_pillar.items()}
            priority_pillar = max(pillar_counts, key=pillar_counts.get) if any(pillar_counts.values()) else None
            
            if priority_pillar and pillar_counts[priority_pillar] > 0:
                supabase.table("products").update({
                    "safe_priority_pillar": priority_pillar,
                    "safe_priority_reason": f"{pillar_counts[priority_pillar]} areas to improve in {pillar_names[priority_pillar]}",
                }).eq("id", product_id).execute()
        
        return count
        
    except Exception as e:
        print(f"  ✗ Error generating strategies for product {product_id}: {e}")
        return 0


def enrich_from_csv(supabase, csv_path: str) -> dict:
    """
    Enrichit les produits depuis un fichier CSV.
    
    Format CSV attendu:
    slug,brand,twitter,discord,telegram,reddit,github,docs,defillama_slug,coingecko_id,description
    
    Returns:
        dict: Statistiques d'enrichissement
    """
    import csv
    
    stats = {"processed": 0, "updated": 0, "errors": 0, "not_found": 0}
    
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            stats["processed"] += 1
            slug = row.get("slug", "").strip()
            
            if not slug:
                continue
            
            # Get product
            product = supabase.table("products").select("id").eq("slug", slug).execute()
            if not product.data:
                print(f"✗ Product not found: {slug}")
                stats["not_found"] += 1
                continue
            
            product_id = product.data[0]["id"]
            print(f"\nProcessing: {slug} (ID: {product_id})")
            
            # Build enrichment data
            data = {}
            
            # Social links
            social_links = {}
            for key in ["twitter", "discord", "telegram", "reddit", "github", "docs", "youtube", "medium", "blog"]:
                if row.get(key):
                    social_links[key] = row[key].strip()
            if social_links:
                data["social_links"] = social_links
            
            # Other fields
            if row.get("brand"):
                data["brand_name"] = row["brand"].strip()
            if row.get("defillama_slug"):
                data["defillama_slug"] = row["defillama_slug"].strip()
            if row.get("coingecko_id"):
                data["coingecko_id"] = row["coingecko_id"].strip()
            if row.get("github_repo"):
                data["github_repo"] = row["github_repo"].strip()
            if row.get("description"):
                data["description"] = row["description"].strip()
            
            # Enrich
            if enrich_product(supabase, product_id, data):
                stats["updated"] += 1
                
                # Sync to sources
                sources_count = sync_social_links_to_sources(supabase, product_id)
                print(f"  ✓ Synced {sources_count} sources")
                
                # Generate strategies
                strategies_count = generate_strategies_from_evaluations(supabase, product_id)
                print(f"  ✓ Generated {strategies_count} strategies")
            else:
                stats["errors"] += 1
    
    return stats


def enrich_all_products(supabase) -> dict:
    """
    Enrichit tous les produits avec les stratégies et sources.
    """
    stats = {"processed": 0, "sources_synced": 0, "strategies_generated": 0}
    
    # Get all active products
    products = supabase.table("products").select("id, slug, name").eq("is_active", True).execute()
    
    for product in products.data:
        stats["processed"] += 1
        print(f"\n[{stats['processed']}/{len(products.data)}] {product['name']} ({product['slug']})")
        
        # Sync sources
        sources = sync_social_links_to_sources(supabase, product["id"])
        stats["sources_synced"] += sources
        
        # Generate strategies
        strategies = generate_strategies_from_evaluations(supabase, product["id"])
        stats["strategies_generated"] += strategies
        
        if sources or strategies:
            print(f"  ✓ {sources} sources, {strategies} strategies")
    
    return stats


def interactive_enrich(supabase):
    """
    Mode interactif pour enrichir les produits un par un.
    Plus pratique que le CSV - tu entres les données directement.
    """
    print("\n🎯 Mode interactif - Enrichissement produit")
    print("=" * 50)
    
    while True:
        slug = input("\n📦 Slug du produit (ou 'q' pour quitter): ").strip()
        if slug.lower() == 'q':
            break
        
        # Check if product exists
        product = supabase.table("products").select("id, name, social_links, brand_id").eq("slug", slug).execute()
        if not product.data:
            print(f"  ✗ Produit non trouvé: {slug}")
            continue
        
        product_data = product.data[0]
        print(f"  ✓ Trouvé: {product_data['name']}")
        
        data = {}
        
        # Brand
        brand = input("  🏢 Marque (laisser vide pour ignorer): ").strip()
        if brand:
            data["brand_name"] = brand
        
        # Social links
        print("  📱 Liens sociaux (laisser vide pour ignorer):")
        social_links = {}
        
        twitter = input("    Twitter/X URL: ").strip()
        if twitter:
            social_links["twitter"] = twitter
        
        discord = input("    Discord URL: ").strip()
        if discord:
            social_links["discord"] = discord
        
        telegram = input("    Telegram URL: ").strip()
        if telegram:
            social_links["telegram"] = telegram
        
        reddit = input("    Reddit URL: ").strip()
        if reddit:
            social_links["reddit"] = reddit
        
        github = input("    GitHub URL: ").strip()
        if github:
            social_links["github"] = github
        
        docs = input("    Documentation URL: ").strip()
        if docs:
            social_links["docs"] = docs
        
        if social_links:
            data["social_links"] = social_links
        
        # External IDs
        defillama = input("  📊 DefiLlama slug: ").strip()
        if defillama:
            data["defillama_slug"] = defillama
        
        coingecko = input("  🦎 CoinGecko ID: ").strip()
        if coingecko:
            data["coingecko_id"] = coingecko
        
        github_repo = input("  💻 GitHub repo (owner/repo): ").strip()
        if github_repo:
            data["github_repo"] = github_repo
        
        # Description
        desc = input("  📝 Description (laisser vide pour ignorer): ").strip()
        if desc:
            data["description"] = desc
        
        # Confirm and save
        if data:
            print(f"\n  📋 Données à sauvegarder: {list(data.keys())}")
            confirm = input("  Confirmer? (o/n): ").strip().lower()
            if confirm == 'o':
                if enrich_product(supabase, product_data["id"], data):
                    sync_social_links_to_sources(supabase, product_data["id"])
                    generate_strategies_from_evaluations(supabase, product_data["id"])
                    print("  ✅ Produit enrichi!")
            else:
                print("  ⏭️ Ignoré")
        else:
            print("  ⏭️ Aucune donnée à sauvegarder")
    
    print("\n👋 Terminé!")


def main():
    parser = argparse.ArgumentParser(description="Enrich product data in Supabase")
    parser.add_argument("--all", action="store_true", help="Process all products (sync sources + generate strategies)")
    parser.add_argument("--product", type=str, help="Process a specific product by slug")
    parser.add_argument("--interactive", "-i", action="store_true", help="Mode interactif pour enrichir les produits")
    
    args = parser.parse_args()
    
    supabase = get_supabase_client()
    
    if args.interactive:
        interactive_enrich(supabase)
    
    elif args.product:
        print(f"🔍 Processing product: {args.product}")
        product = supabase.table("products").select("id").eq("slug", args.product).execute()
        if product.data:
            product_id = product.data[0]["id"]
            sync_social_links_to_sources(supabase, product_id)
            generate_strategies_from_evaluations(supabase, product_id)
            print("✅ Done!")
        else:
            print(f"✗ Product not found: {args.product}")
    
    elif args.all:
        print("🔄 Processing all products...")
        stats = enrich_all_products(supabase)
        print(f"\n✅ Done! Processed: {stats['processed']}, Sources: {stats['sources_synced']}, Strategies: {stats['strategies_generated']}")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
