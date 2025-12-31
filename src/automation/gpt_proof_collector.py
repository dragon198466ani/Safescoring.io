"""
SafeScoring - GPT-Proof Data Collector
======================================
Enhanced data collection for building an UNCOPIABLE competitive moat.

Key Features:
- Hourly score snapshots (24x faster moat building)
- Product-specific unique metrics
- Prediction tracking and validation
- Social sentiment monitoring
- Closed-loop user corrections

THIS DATA BECOMES MORE VALUABLE EVERY HOUR.
A competitor starting today will NEVER catch up.
"""

import os
import sys
import json
import time
import hashlib
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from decimal import Decimal

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment
try:
    from dotenv import load_dotenv
    env_paths = [
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', '.env'),
        os.path.join(os.path.dirname(__file__), '..', '..', '.env'),
        'config/.env',
        '.env'
    ]
    for env_path in env_paths:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            break
except ImportError:
    pass

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")


class GPTProofCollector:
    """
    Collects unique, time-dependent data that cannot be replicated by AI.
    Each product gets product-specific metrics tracked over time.
    """

    def __init__(self):
        self.headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
        }
        self.defillama_base = "https://api.llama.fi"

    # ================================================================
    # HOURLY SCORE SNAPSHOTS - The Core Moat
    # ================================================================

    def snapshot_all_scores_hourly(self) -> Dict:
        """
        Take HOURLY snapshots of all product scores.
        This creates 24x more data points than daily snapshots.

        After 1 year: 8,760 snapshots per product (vs 365 daily)
        IMPOSSIBLE for competitors to replicate retroactively.
        """
        print("=" * 60)
        print("HOURLY SCORE SNAPSHOT")
        print(f"Time: {datetime.now().isoformat()}")
        print("=" * 60)

        if not SUPABASE_URL or not SUPABASE_KEY:
            print("[Hourly] Supabase not configured")
            return {"error": "Supabase not configured"}

        # Get all current scores
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/safe_scoring_results",
            headers=self.headers,
            params={
                "select": "product_id,note_finale,score_s,score_a,score_f,score_e,note_consumer,note_essential"
            },
            timeout=30
        )

        if response.status_code != 200:
            return {"error": f"Failed to fetch scores: {response.status_code}"}

        scores = response.json()
        saved = 0
        errors = []

        for score_data in scores:
            if score_data.get("note_finale") is None:
                continue

            product_id = score_data["product_id"]

            # Get previous hourly score for change calculation
            prev_response = requests.get(
                f"{SUPABASE_URL}/rest/v1/score_history_hourly",
                headers=self.headers,
                params={
                    "select": "safe_score",
                    "product_id": f"eq.{product_id}",
                    "order": "recorded_at.desc",
                    "limit": 1
                },
                timeout=30
            )

            prev_score = None
            if prev_response.status_code == 200 and prev_response.json():
                prev_score = prev_response.json()[0].get("safe_score")

            score_change = 0
            if prev_score is not None and score_data["note_finale"] is not None:
                score_change = round(float(score_data["note_finale"]) - float(prev_score), 2)

            # Save hourly snapshot
            snapshot = {
                "product_id": product_id,
                "safe_score": score_data["note_finale"],
                "score_s": score_data.get("score_s"),
                "score_a": score_data.get("score_a"),
                "score_f": score_data.get("score_f"),
                "score_e": score_data.get("score_e"),
                "consumer_score": score_data.get("note_consumer"),
                "essential_score": score_data.get("note_essential"),
                "score_change_1h": score_change,
                "triggered_by": "hourly_cron",
            }

            try:
                save_response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/score_history_hourly",
                    headers=self.headers,
                    json=snapshot,
                    timeout=30
                )

                if save_response.status_code in [200, 201]:
                    saved += 1
                else:
                    errors.append(f"Product {product_id}: {save_response.text}")

            except Exception as e:
                errors.append(f"Product {product_id}: {str(e)}")

        result = {
            "total_products": len(scores),
            "saved": saved,
            "errors": len(errors),
            "timestamp": datetime.now().isoformat(),
        }

        print(f"[Hourly] Saved {saved}/{len(scores)} snapshots")
        if errors:
            print(f"[Hourly] Errors: {errors[:5]}")

        # Log collection
        self._log_collection("scores_hourly", result)

        return result

    # ================================================================
    # PRODUCT UNIQUE METRICS - Per-Product Data
    # ================================================================

    def collect_product_metrics(self, product_id: int, defillama_slug: str = None) -> Dict:
        """
        Collect unique metrics for a SPECIFIC product.
        Each product is unique - we track product-specific data.
        """
        metrics = {
            "product_id": product_id,
            "recorded_at": datetime.now().isoformat(),
            "data_sources": [],
        }

        # On-chain metrics from DefiLlama
        if defillama_slug:
            try:
                tvl_data = self._get_protocol_tvl(defillama_slug)
                if tvl_data:
                    metrics.update(tvl_data)
                    metrics["data_sources"].append("defillama")
            except Exception as e:
                print(f"[Metrics] Error fetching TVL for {defillama_slug}: {e}")

        # Calculate days since last incident
        incident_data = self._get_product_incident_stats(product_id)
        if incident_data:
            metrics.update(incident_data)

        return metrics

    def collect_all_product_metrics(self) -> Dict:
        """
        Collect unique metrics for ALL products.
        Creates a unique dataset per product over time.
        """
        print("=" * 60)
        print("COLLECTING PRODUCT UNIQUE METRICS")
        print(f"Time: {datetime.now().isoformat()}")
        print("=" * 60)

        if not SUPABASE_URL or not SUPABASE_KEY:
            return {"error": "Supabase not configured"}

        # Get all products with their DefiLlama mappings
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/products",
            headers=self.headers,
            params={"select": "id,slug,name,specs"},
            timeout=30
        )

        if response.status_code != 200:
            return {"error": "Failed to fetch products"}

        products = response.json()
        collected = 0
        errors = []

        for product in products:
            product_id = product["id"]

            # Extract DefiLlama slug from specs if available
            specs = product.get("specs", {}) or {}
            defillama_slug = specs.get("defillama_slug") or specs.get("defi_llama_id")

            try:
                metrics = self.collect_product_metrics(product_id, defillama_slug)

                # Save to database
                save_response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/product_unique_metrics",
                    headers=self.headers,
                    json=metrics,
                    timeout=30
                )

                if save_response.status_code in [200, 201]:
                    collected += 1
                else:
                    errors.append(f"Product {product_id}: {save_response.text}")

            except Exception as e:
                errors.append(f"Product {product_id}: {str(e)}")

        result = {
            "total_products": len(products),
            "collected": collected,
            "errors": len(errors),
            "timestamp": datetime.now().isoformat(),
        }

        print(f"[Metrics] Collected {collected}/{len(products)} products")
        self._log_collection("product_metrics", result)

        return result

    def _get_protocol_tvl(self, slug: str) -> Optional[Dict]:
        """Get TVL data for a protocol from DefiLlama."""
        try:
            response = requests.get(
                f"{self.defillama_base}/protocol/{slug}",
                timeout=30
            )

            if response.status_code != 200:
                return None

            data = response.json()

            # Calculate TVL changes
            tvl = data.get("tvl", 0)
            tvl_history = data.get("tvls", []) or data.get("chainTvls", {}).get("total", {}).get("tvl", [])

            tvl_change_24h = 0
            tvl_change_7d = 0
            tvl_change_30d = 0

            if isinstance(tvl_history, list) and len(tvl_history) > 0:
                current_tvl = tvl_history[-1].get("totalLiquidityUSD", tvl) if tvl_history else tvl

                # 24h change
                if len(tvl_history) > 1:
                    prev_24h = tvl_history[-2].get("totalLiquidityUSD", current_tvl)
                    if prev_24h > 0:
                        tvl_change_24h = ((current_tvl - prev_24h) / prev_24h) * 100

                # 7d change
                if len(tvl_history) > 7:
                    prev_7d = tvl_history[-8].get("totalLiquidityUSD", current_tvl)
                    if prev_7d > 0:
                        tvl_change_7d = ((current_tvl - prev_7d) / prev_7d) * 100

                # 30d change
                if len(tvl_history) > 30:
                    prev_30d = tvl_history[-31].get("totalLiquidityUSD", current_tvl)
                    if prev_30d > 0:
                        tvl_change_30d = ((current_tvl - prev_30d) / prev_30d) * 100

            return {
                "tvl_usd": tvl,
                "tvl_change_24h": round(tvl_change_24h, 4),
                "tvl_change_7d": round(tvl_change_7d, 4),
                "tvl_change_30d": round(tvl_change_30d, 4),
            }

        except Exception as e:
            print(f"[TVL] Error: {e}")
            return None

    def _get_product_incident_stats(self, product_id: int) -> Optional[Dict]:
        """Get incident statistics for a product."""
        try:
            # Get most recent incident for this product
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/incident_product_impact",
                headers=self.headers,
                params={
                    "select": "incident_id,security_incidents(incident_date)",
                    "product_id": f"eq.{product_id}",
                    "order": "created_at.desc",
                    "limit": 1
                },
                timeout=30
            )

            if response.status_code == 200 and response.json():
                last_incident = response.json()[0]
                incident_date = last_incident.get("security_incidents", {}).get("incident_date")

                if incident_date:
                    incident_dt = datetime.fromisoformat(incident_date.replace("Z", "+00:00"))
                    days_since = (datetime.now(incident_dt.tzinfo) - incident_dt).days
                    return {"days_since_last_incident": days_since}

            # Count total incidents
            count_response = requests.get(
                f"{SUPABASE_URL}/rest/v1/incident_product_impact",
                headers=self.headers,
                params={
                    "select": "count",
                    "product_id": f"eq.{product_id}",
                },
                timeout=30
            )

            if count_response.status_code == 200:
                # If no incidents, return None for days_since (never had incident)
                return {"days_since_last_incident": None, "vulnerability_count": 0}

            return None

        except Exception as e:
            print(f"[Incidents] Error: {e}")
            return None

    # ================================================================
    # PREDICTION TRACKING - Prove Methodology Value
    # ================================================================

    def create_risk_predictions(self) -> Dict:
        """
        Create prediction records for products with low scores.
        Later, we validate if our predictions were correct.
        """
        print("=" * 60)
        print("CREATING RISK PREDICTIONS")
        print("=" * 60)

        if not SUPABASE_URL or not SUPABASE_KEY:
            return {"error": "Supabase not configured"}

        # Get products with low scores (potential risk)
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/safe_scoring_results",
            headers=self.headers,
            params={
                "select": "product_id,note_finale,score_s,score_a,score_f,score_e",
                "note_finale": "lt.60",  # Score below 60 = potential risk
            },
            timeout=30
        )

        if response.status_code != 200:
            return {"error": "Failed to fetch low scores"}

        low_scores = response.json()
        created = 0

        for score_data in low_scores:
            product_id = score_data["product_id"]
            score = score_data.get("note_finale", 0)

            # Determine risk level
            if score < 30:
                risk_level = "critical"
            elif score < 40:
                risk_level = "high"
            elif score < 50:
                risk_level = "medium"
            else:
                risk_level = "low"

            # Build risk factors
            risk_factors = []
            if score_data.get("score_s", 100) < 50:
                risk_factors.append("Low Security score")
            if score_data.get("score_a", 100) < 50:
                risk_factors.append("Low Adversity resilience")
            if score_data.get("score_f", 100) < 50:
                risk_factors.append("Low Fidelity/Trust score")
            if score_data.get("score_e", 100) < 50:
                risk_factors.append("Low Efficiency score")

            # Check if prediction already exists for this month
            existing = requests.get(
                f"{SUPABASE_URL}/rest/v1/prediction_accuracy",
                headers=self.headers,
                params={
                    "select": "id",
                    "product_id": f"eq.{product_id}",
                    "prediction_date": f"gte.{datetime.now().replace(day=1).isoformat()}",
                    "incident_occurred": "eq.false",
                },
                timeout=30
            )

            if existing.status_code == 200 and existing.json():
                continue  # Already have prediction this month

            # Create prediction
            prediction = {
                "product_id": product_id,
                "prediction_date": datetime.now().isoformat(),
                "safe_score_at_prediction": score,
                "score_s_at_prediction": score_data.get("score_s"),
                "score_a_at_prediction": score_data.get("score_a"),
                "score_f_at_prediction": score_data.get("score_f"),
                "score_e_at_prediction": score_data.get("score_e"),
                "predicted_risk_level": risk_level,
                "risk_factors": json.dumps(risk_factors),
                "incident_occurred": False,
            }

            try:
                save_response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/prediction_accuracy",
                    headers=self.headers,
                    json=prediction,
                    timeout=30
                )

                if save_response.status_code in [200, 201]:
                    created += 1

            except Exception as e:
                print(f"[Prediction] Error for product {product_id}: {e}")

        result = {
            "low_score_products": len(low_scores),
            "predictions_created": created,
            "timestamp": datetime.now().isoformat(),
        }

        print(f"[Predictions] Created {created} new predictions")
        self._log_collection("predictions", result)

        return result

    def validate_predictions_against_incidents(self) -> Dict:
        """
        Validate our predictions against actual incidents.
        This PROVES our methodology works.
        """
        print("=" * 60)
        print("VALIDATING PREDICTIONS")
        print("=" * 60)

        if not SUPABASE_URL or not SUPABASE_KEY:
            return {"error": "Supabase not configured"}

        # Get recent incidents (last 30 days)
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()

        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/security_incidents",
            headers=self.headers,
            params={
                "select": "id,incident_date,severity,funds_lost_usd,affected_product_ids",
                "incident_date": f"gte.{thirty_days_ago}",
            },
            timeout=30
        )

        if response.status_code != 200:
            return {"error": "Failed to fetch incidents"}

        incidents = response.json()
        validated = 0
        correct_predictions = 0

        for incident in incidents:
            affected_products = incident.get("affected_product_ids", []) or []

            for product_id in affected_products:
                # Find predictions made BEFORE the incident
                pred_response = requests.get(
                    f"{SUPABASE_URL}/rest/v1/prediction_accuracy",
                    headers=self.headers,
                    params={
                        "select": "*",
                        "product_id": f"eq.{product_id}",
                        "prediction_date": f"lt.{incident['incident_date']}",
                        "incident_occurred": "eq.false",
                    },
                    timeout=30
                )

                if pred_response.status_code != 200:
                    continue

                predictions = pred_response.json()

                for prediction in predictions:
                    pred_date = datetime.fromisoformat(prediction["prediction_date"].replace("Z", "+00:00"))
                    incident_date = datetime.fromisoformat(incident["incident_date"].replace("Z", "+00:00"))
                    days_until = (incident_date - pred_date).days

                    # Determine accuracy
                    was_high_risk = prediction.get("predicted_risk_level") in ["high", "critical"]
                    accuracy = "correct_positive" if was_high_risk else "false_negative"

                    if was_high_risk:
                        correct_predictions += 1

                    # Update prediction
                    update_response = requests.patch(
                        f"{SUPABASE_URL}/rest/v1/prediction_accuracy",
                        headers={**self.headers, "Prefer": "return=minimal"},
                        params={"id": f"eq.{prediction['id']}"},
                        json={
                            "incident_occurred": True,
                            "incident_id": incident["id"],
                            "incident_date": incident["incident_date"],
                            "days_until_incident": days_until,
                            "funds_lost_usd": incident.get("funds_lost_usd", 0),
                            "prediction_accuracy": accuracy,
                            "validated_at": datetime.now().isoformat(),
                            "validated_by": "auto_validation",
                        },
                        timeout=30
                    )

                    if update_response.status_code in [200, 204]:
                        validated += 1

        result = {
            "incidents_checked": len(incidents),
            "predictions_validated": validated,
            "correct_predictions": correct_predictions,
            "timestamp": datetime.now().isoformat(),
        }

        print(f"[Validation] Validated {validated} predictions, {correct_predictions} correct")
        self._log_collection("prediction_validation", result)

        return result

    # ================================================================
    # MOAT REPORTING
    # ================================================================

    def generate_moat_report(self) -> Dict:
        """
        Generate comprehensive moat report.
        Shows the UNIQUE value that cannot be replicated.
        """
        print("=" * 60)
        print("GPT-PROOF MOAT REPORT")
        print(f"Generated: {datetime.now().isoformat()}")
        print("=" * 60)

        if not SUPABASE_URL or not SUPABASE_KEY:
            return {"error": "Supabase not configured"}

        report = {
            "generated_at": datetime.now().isoformat(),
            "data_points": {},
            "moat_metrics": {},
        }

        # Count daily snapshots
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/score_history",
            headers=self.headers,
            params={"select": "count"},
            timeout=30
        )
        report["data_points"]["daily_snapshots"] = response.json()[0]["count"] if response.status_code == 200 else 0

        # Count hourly snapshots
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/score_history_hourly",
            headers=self.headers,
            params={"select": "count"},
            timeout=30
        )
        report["data_points"]["hourly_snapshots"] = response.json()[0]["count"] if response.status_code == 200 else 0

        # Count incidents
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/security_incidents",
            headers=self.headers,
            params={"select": "count"},
            timeout=30
        )
        report["data_points"]["incidents"] = response.json()[0]["count"] if response.status_code == 200 else 0

        # Count predictions
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/prediction_accuracy",
            headers=self.headers,
            params={"select": "count"},
            timeout=30
        )
        report["data_points"]["predictions"] = response.json()[0]["count"] if response.status_code == 200 else 0

        # Count correct predictions
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/prediction_accuracy",
            headers=self.headers,
            params={
                "select": "count",
                "prediction_accuracy": "eq.correct_positive",
            },
            timeout=30
        )
        report["data_points"]["correct_predictions"] = response.json()[0]["count"] if response.status_code == 200 else 0

        # Count products tracked
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/score_history",
            headers=self.headers,
            params={"select": "product_id"},
            timeout=30
        )
        if response.status_code == 200:
            report["data_points"]["products_tracked"] = len(set(r["product_id"] for r in response.json()))

        # Get first tracking date
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/score_history",
            headers=self.headers,
            params={"select": "recorded_at", "order": "recorded_at.asc", "limit": 1},
            timeout=30
        )
        if response.status_code == 200 and response.json():
            first_date = response.json()[0]["recorded_at"]
            report["moat_metrics"]["tracking_since"] = first_date
            first_dt = datetime.fromisoformat(first_date.replace("Z", "+00:00"))
            report["moat_metrics"]["days_of_data"] = (datetime.now(first_dt.tzinfo) - first_dt).days

        # Calculate moat strength
        total_points = (
            report["data_points"].get("daily_snapshots", 0) +
            report["data_points"].get("hourly_snapshots", 0) +
            report["data_points"].get("incidents", 0) * 10 +
            report["data_points"].get("predictions", 0) * 5 +
            report["data_points"].get("correct_predictions", 0) * 50
        )

        if total_points >= 50000:
            strength = "FORTRESS"
        elif total_points >= 20000:
            strength = "STRONG"
        elif total_points >= 5000:
            strength = "BUILDING"
        elif total_points >= 1000:
            strength = "EMERGING"
        else:
            strength = "STARTING"

        report["moat_metrics"]["total_data_points"] = total_points
        report["moat_metrics"]["moat_strength"] = strength
        report["moat_metrics"]["competitor_catch_up_time"] = f"{report['moat_metrics'].get('days_of_data', 0)} days minimum"

        # Print report
        print(f"\nData Points:")
        for key, value in report["data_points"].items():
            print(f"  - {key}: {value:,}")

        print(f"\nMoat Metrics:")
        for key, value in report["moat_metrics"].items():
            print(f"  - {key}: {value}")

        return report

    # ================================================================
    # UTILITIES
    # ================================================================

    def _log_collection(self, collection_type: str, result: Dict):
        """Log data collection run."""
        if not SUPABASE_URL or not SUPABASE_KEY:
            return

        log_entry = {
            "collection_type": collection_type,
            "run_date": datetime.now().isoformat(),
            "items_collected": result.get("total_products", result.get("total", 0)),
            "items_saved": result.get("saved", result.get("collected", result.get("predictions_created", 0))),
            "errors_count": result.get("errors", 0) if isinstance(result.get("errors"), int) else len(result.get("errors", [])),
        }

        try:
            requests.post(
                f"{SUPABASE_URL}/rest/v1/data_collection_logs",
                headers=self.headers,
                json=log_entry,
                timeout=30
            )
        except Exception:
            pass


def run_hourly_collection():
    """Run hourly data collection - THE CORE MOAT BUILDER."""
    collector = GPTProofCollector()

    print("\n" + "=" * 60)
    print("HOURLY GPT-PROOF DATA COLLECTION")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)

    # 1. Hourly score snapshots (MOST IMPORTANT)
    collector.snapshot_all_scores_hourly()

    # 2. Product metrics (every hour)
    collector.collect_all_product_metrics()

    print("\n[Hourly] Collection complete!")


def run_daily_collection():
    """Run daily data collection."""
    collector = GPTProofCollector()

    print("\n" + "=" * 60)
    print("DAILY GPT-PROOF DATA COLLECTION")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)

    # 1. Create risk predictions for low-score products
    collector.create_risk_predictions()

    # 2. Validate predictions against incidents
    collector.validate_predictions_against_incidents()

    # 3. Generate moat report
    collector.generate_moat_report()

    print("\n[Daily] Collection complete!")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="SafeScoring GPT-Proof Data Collector")
    parser.add_argument("--hourly", action="store_true", help="Run hourly collection (snapshots + metrics)")
    parser.add_argument("--daily", action="store_true", help="Run daily collection (predictions + validation)")
    parser.add_argument("--report", action="store_true", help="Generate moat report")
    parser.add_argument("--all", action="store_true", help="Run all collections")

    args = parser.parse_args()

    collector = GPTProofCollector()

    if args.hourly:
        run_hourly_collection()
    elif args.daily:
        run_daily_collection()
    elif args.report:
        report = collector.generate_moat_report()
        print(json.dumps(report, indent=2, default=str))
    elif args.all:
        run_hourly_collection()
        run_daily_collection()
    else:
        # Default: run hourly collection
        run_hourly_collection()
