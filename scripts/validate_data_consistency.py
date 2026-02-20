#!/usr/bin/env python3
"""
Data Consistency Validator for SafeScoring
===========================================
Compares Supabase database values against API responses to detect inconsistencies.

This script helps ensure that:
- Scores displayed on the frontend match the database values
- Null handling is consistent (null vs 0)
- Rounding is applied uniformly
- No data transformation errors occur

Usage:
    python scripts/validate_data_consistency.py
    python scripts/validate_data_consistency.py --product ledger-nano-x
    python scripts/validate_data_consistency.py --all --limit 100
    python scripts/validate_data_consistency.py --all --output report.json

Requirements:
    pip install requests
"""

import sys
import json
import argparse
from datetime import datetime
from typing import Optional, Dict, List

# Use centralized config
try:
    from config_helper import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers
except ImportError:
    import os
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from src.core.config import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers

try:
    import requests
except ImportError:
    print("Missing requests library. Install with: pip install requests")
    sys.exit(1)

# Configuration
API_BASE = os.environ.get("API_BASE_URL", "http://localhost:3000")


class DataConsistencyValidator:
    """Validates data consistency between Supabase and API responses."""

    def __init__(self, api_base: str = API_BASE):
        """Initialize the validator."""
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError(
                "Missing Supabase credentials. Check your .env configuration."
            )

        self.supabase_url = SUPABASE_URL
        self.headers = get_supabase_headers()
        self.api_base = api_base.rstrip("/")
        self.issues: List[Dict] = []
        self.warnings: List[str] = []
        self.stats = {
            "products_checked": 0,
            "issues_found": 0,
            "warnings": 0,
            "api_errors": 0,
            "db_errors": 0,
        }

    def _supabase_query(self, endpoint: str, params: dict = None) -> Optional[Dict]:
        """Execute a Supabase REST API query."""
        try:
            url = f"{self.supabase_url}/rest/v1/{endpoint}"
            response = requests.get(url, headers=self.headers, params=params, timeout=15)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            self.warnings.append(f"Supabase query error: {e}")
            self.stats["db_errors"] += 1
            return None

    def get_db_product(self, slug: str) -> Optional[Dict]:
        """Fetch product directly from Supabase."""
        # Get product basic info
        product = self._supabase_query(
            "products",
            {"slug": f"eq.{slug}", "select": "id,name,slug,url"}
        )
        if not product:
            return None
        product = product[0] if isinstance(product, list) else product

        # Get scoring data
        scores = self._supabase_query(
            "safe_scoring_results",
            {
                "product_id": f"eq.{product['id']}",
                "select": "note_finale,score_s,score_a,score_f,score_e,note_consumer,s_consumer,a_consumer,f_consumer,e_consumer,calculated_at",
                "order": "calculated_at.desc",
                "limit": "1"
            }
        )

        product["safe_scoring_results"] = scores if scores else []
        return product

    def get_api_product(self, slug: str) -> Optional[Dict]:
        """Fetch product from API endpoint."""
        try:
            response = requests.get(
                f"{self.api_base}/api/products/{slug}",
                timeout=15,
                headers={"Accept": "application/json"}
            )
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                self.warnings.append(f"Product {slug} not found in API (404)")
                return None
            else:
                self.warnings.append(f"API error for {slug}: HTTP {response.status_code}")
                self.stats["api_errors"] += 1
                return None
        except requests.exceptions.ConnectionError:
            self.warnings.append(f"Cannot connect to API at {self.api_base}. Is the server running?")
            self.stats["api_errors"] += 1
            return None
        except Exception as e:
            self.warnings.append(f"API request failed for {slug}: {e}")
            self.stats["api_errors"] += 1
            return None

    def get_api_products_list(self, limit: int = 100) -> List[Dict]:
        """Fetch products list from API."""
        try:
            response = requests.get(
                f"{self.api_base}/api/products?limit={limit}",
                timeout=30,
                headers={"Accept": "application/json"}
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("products", [])
            return []
        except Exception as e:
            self.warnings.append(f"Failed to fetch products list: {e}")
            return []

    def compare_scores(self, slug: str, db_data: Dict, api_data: Dict) -> List[Dict]:
        """Compare DB scores against API response."""
        issues = []

        # Get DB scores
        db_scoring = db_data.get("safe_scoring_results", [])
        db_scores = db_scoring[0] if db_scoring else {}

        # Get API scores
        api_scores = api_data.get("scores", {})

        # Map DB fields to API fields
        field_mapping = {
            "note_finale": "total",
            "score_s": "s",
            "score_a": "a",
            "score_f": "f",
            "score_e": "e",
        }

        for db_field, api_field in field_mapping.items():
            db_value = db_scores.get(db_field)
            api_value = api_scores.get(api_field)

            # Issue 1: Null handling inconsistency
            if db_value is None and api_value == 0:
                issues.append({
                    "type": "null_to_zero",
                    "product": slug,
                    "field": api_field,
                    "db_value": None,
                    "api_value": 0,
                    "severity": "medium",
                    "message": f"DB has null but API returns 0 for '{api_field}'"
                })
            elif db_value is not None and api_value is None:
                issues.append({
                    "type": "value_to_null",
                    "product": slug,
                    "field": api_field,
                    "db_value": db_value,
                    "api_value": None,
                    "severity": "high",
                    "message": f"DB has {db_value} but API returns null for '{api_field}'"
                })

            # Issue 2: Rounding inconsistency
            if db_value is not None and api_value is not None:
                db_rounded = round(float(db_value))
                if db_rounded != api_value:
                    issues.append({
                        "type": "rounding_mismatch",
                        "product": slug,
                        "field": api_field,
                        "db_value": db_value,
                        "db_rounded": db_rounded,
                        "api_value": api_value,
                        "severity": "low" if abs(db_rounded - api_value) <= 1 else "medium",
                        "message": f"Rounding mismatch: DB {db_value} -> {db_rounded}, API {api_value}"
                    })

        # Check verified status consistency
        db_has_score = db_scores.get("note_finale") is not None
        api_verified = api_data.get("verified", False)
        if db_has_score and not api_verified:
            issues.append({
                "type": "verified_mismatch",
                "product": slug,
                "field": "verified",
                "db_value": f"has score: {db_scores.get('note_finale')}",
                "api_value": f"verified: {api_verified}",
                "severity": "medium",
                "message": "Product has score in DB but API says not verified"
            })

        return issues

    def validate_product(self, slug: str) -> Dict:
        """Validate a single product."""
        self.stats["products_checked"] += 1

        db_data = self.get_db_product(slug)
        api_data = self.get_api_product(slug)

        if not db_data:
            return {"slug": slug, "status": "not_found_db", "issues": []}

        if not api_data:
            return {"slug": slug, "status": "not_found_api", "issues": []}

        issues = self.compare_scores(slug, db_data, api_data)

        if issues:
            self.issues.extend(issues)
            self.stats["issues_found"] += len(issues)

        return {
            "slug": slug,
            "status": "issues" if issues else "ok",
            "issues_count": len(issues),
            "issues": issues
        }

    def validate_all(self, limit: int = 100) -> Dict:
        """Validate all products (or up to limit)."""
        print(f"Fetching up to {limit} products from database...")

        products = self._supabase_query(
            "products",
            {"select": "slug", "limit": str(limit)}
        )
        if not products:
            print("Error fetching products from database")
            return {"error": "Failed to fetch products"}

        print(f"Found {len(products)} products to validate")

        results = []
        for i, p in enumerate(products):
            slug = p.get("slug")
            if not slug:
                continue

            result = self.validate_product(slug)
            results.append(result)

            if (i + 1) % 10 == 0:
                print(f"  Validated {i + 1}/{len(products)} products...")

            if result["status"] == "issues":
                print(f"  [ISSUE] {slug}: {result['issues_count']} issue(s) found")

        return {
            "timestamp": datetime.now().isoformat(),
            "api_base": self.api_base,
            "stats": self.stats,
            "warnings": self.warnings,
            "issues": self.issues,
            "results": results
        }

    def validate_from_api_list(self, limit: int = 100) -> Dict:
        """Validate products by first fetching list from API."""
        print(f"Fetching products list from API...")

        products = self.get_api_products_list(limit)
        if not products:
            print("No products returned from API")
            return {"error": "No products from API"}

        print(f"Found {len(products)} products to validate")

        results = []
        for i, p in enumerate(products):
            slug = p.get("slug")
            if not slug:
                continue

            db_data = self.get_db_product(slug)
            self.stats["products_checked"] += 1

            if not db_data:
                results.append({"slug": slug, "status": "not_found_db", "issues": []})
                continue

            api_data = {
                "scores": p.get("scores", {}),
                "verified": p.get("verified", False),
            }

            issues = self.compare_scores(slug, db_data, api_data)

            if issues:
                self.issues.extend(issues)
                self.stats["issues_found"] += len(issues)
                print(f"  [ISSUE] {slug}: {len(issues)} issue(s) found")

            results.append({
                "slug": slug,
                "status": "issues" if issues else "ok",
                "issues_count": len(issues),
                "issues": issues
            })

            if (i + 1) % 20 == 0:
                print(f"  Validated {i + 1}/{len(products)} products...")

        return {
            "timestamp": datetime.now().isoformat(),
            "api_base": self.api_base,
            "stats": self.stats,
            "warnings": self.warnings,
            "issues": self.issues,
            "results": results
        }

    def generate_report(self, results: Dict, output_path: Optional[str] = None) -> str:
        """Generate validation report."""
        report = {
            "title": "SafeScoring Data Consistency Report",
            "generated_at": datetime.now().isoformat(),
            "api_base": self.api_base,
            "summary": {
                "total_products": self.stats["products_checked"],
                "total_issues": self.stats["issues_found"],
                "total_warnings": len(self.warnings),
                "api_errors": self.stats["api_errors"],
                "db_errors": self.stats["db_errors"],
                "issue_types": {},
                "severity_counts": {"high": 0, "medium": 0, "low": 0}
            },
            "issues_by_type": {},
            "issues_by_product": {},
            "all_issues": self.issues,
            "warnings": self.warnings
        }

        for issue in self.issues:
            issue_type = issue["type"]
            severity = issue.get("severity", "medium")
            product = issue["product"]

            if issue_type not in report["issues_by_type"]:
                report["issues_by_type"][issue_type] = []
            report["issues_by_type"][issue_type].append(issue)
            report["summary"]["issue_types"][issue_type] = \
                report["summary"]["issue_types"].get(issue_type, 0) + 1

            report["summary"]["severity_counts"][severity] = \
                report["summary"]["severity_counts"].get(severity, 0) + 1

            if product not in report["issues_by_product"]:
                report["issues_by_product"][product] = []
            report["issues_by_product"][product].append(issue)

        # Health score
        total = self.stats["products_checked"]
        if total > 0:
            products_with_issues = len(report["issues_by_product"])
            report["summary"]["health_score"] = round(
                ((total - products_with_issues) / total) * 100, 1
            )
        else:
            report["summary"]["health_score"] = 100

        if output_path:
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            print(f"\nReport saved to: {output_path}")

        return json.dumps(report, indent=2, ensure_ascii=False)


def print_summary(validator: DataConsistencyValidator):
    """Print a human-readable summary."""
    stats = validator.stats
    issues = validator.issues

    print("\n" + "=" * 60)
    print("DATA CONSISTENCY VALIDATION SUMMARY")
    print("=" * 60)

    print(f"\nProducts checked: {stats['products_checked']}")
    print(f"Total issues found: {stats['issues_found']}")
    print(f"Warnings: {len(validator.warnings)}")

    if stats['api_errors'] > 0:
        print(f"API errors: {stats['api_errors']}")
    if stats['db_errors'] > 0:
        print(f"DB errors: {stats['db_errors']}")

    if issues:
        print("\nIssues by type:")
        type_counts = {}
        for issue in issues:
            t = issue["type"]
            type_counts[t] = type_counts.get(t, 0) + 1
        for t, count in sorted(type_counts.items(), key=lambda x: -x[1]):
            print(f"  - {t}: {count}")

        print("\nFirst 5 issues:")
        for issue in issues[:5]:
            print(f"  [{issue['severity'].upper()}] {issue['product']}: {issue['message']}")

    # Health score
    total = stats['products_checked']
    if total > 0:
        products_with_issues = len(set(i['product'] for i in issues))
        health = ((total - products_with_issues) / total) * 100
        print(f"\nHealth score: {health:.1f}%")
        if health >= 95:
            print("Status: EXCELLENT - Data is consistent")
        elif health >= 80:
            print("Status: GOOD - Minor inconsistencies detected")
        elif health >= 60:
            print("Status: WARNING - Significant inconsistencies")
        else:
            print("Status: CRITICAL - Major data consistency issues")

    print("\n" + "=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Validate SafeScoring data consistency between DB and API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python validate_data_consistency.py --product ledger-nano-x
  python validate_data_consistency.py --all --limit 50
  python validate_data_consistency.py --all --output report.json
  python validate_data_consistency.py --api-list --limit 100
        """
    )
    parser.add_argument("--product", "-p", help="Validate specific product by slug")
    parser.add_argument("--all", "-a", action="store_true", help="Validate all products from DB")
    parser.add_argument("--api-list", action="store_true", help="Validate products from API list")
    parser.add_argument("--limit", "-l", type=int, default=100, help="Limit for --all (default: 100)")
    parser.add_argument("--output", "-o", help="Output file for JSON report")
    parser.add_argument("--api-base", default=API_BASE, help=f"API base URL (default: {API_BASE})")
    parser.add_argument("--quiet", "-q", action="store_true", help="Minimal output")

    args = parser.parse_args()

    # Default to checking 10 products if no args
    if not args.product and not args.all and not args.api_list:
        args.all = True
        args.limit = 10
        print("No arguments provided. Validating 10 random products...\n")

    try:
        validator = DataConsistencyValidator(api_base=args.api_base)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)

    if args.product:
        result = validator.validate_product(args.product)
        if not args.quiet:
            if result["status"] == "ok":
                print(f"Product '{args.product}' is consistent")
            else:
                print(f"Product '{args.product}': {result['status']}")
                for issue in result.get("issues", []):
                    print(f"  - [{issue['severity']}] {issue['message']}")

    elif args.api_list:
        results = validator.validate_from_api_list(args.limit)
        if args.output:
            validator.generate_report(results, args.output)
        if not args.quiet:
            print_summary(validator)

    elif args.all:
        results = validator.validate_all(args.limit)
        if args.output:
            validator.generate_report(results, args.output)
        if not args.quiet:
            print_summary(validator)

    # Exit with error code if issues found
    if validator.stats["issues_found"] > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    import os
    main()
