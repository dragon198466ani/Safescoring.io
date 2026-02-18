"""
Data Pipeline for ML Training

Extracts and prepares data from SafeScoring database for ML model training.

Features extracted:
- Score-based: SAFE score, pillar scores, score velocity
- Historical: incident counts, time since last incident
- Product: age, TVL, type, custody status
- Evaluation: TBD ratio, critical norms failed, audit recency

Usage:
    pipeline = DataPipeline()
    features, labels = pipeline.prepare_training_data()
"""

import os
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
import json

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

try:
    import pandas as pd
    import numpy as np
except ImportError:
    print("Please install pandas and numpy: pip install pandas numpy")
    pd = None
    np = None

try:
    from supabase import create_client, Client
except ImportError:
    print("Please install supabase: pip install supabase")

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")


class DataPipeline:
    """
    Data extraction and preparation pipeline for ML training.

    Connects to SafeScoring database and extracts features for:
    - Incident prediction
    - Score degradation forecasting
    - Risk profiling
    """

    def __init__(self, supabase_url: str = None, supabase_key: str = None):
        """Initialize the data pipeline with database connection."""
        url = supabase_url or SUPABASE_URL
        key = supabase_key or SUPABASE_KEY

        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")

        self.supabase: Client = create_client(url, key)
        self._cache = {}

    def get_products(self, include_inactive: bool = False) -> pd.DataFrame:
        """Fetch all products with their current scores."""
        query = self.supabase.table("products").select(
            "id, name, slug, url, product_type_id, created_at, updated_at"
        )

        if not include_inactive:
            query = query.eq("is_active", True)

        result = query.execute()
        return pd.DataFrame(result.data) if result.data else pd.DataFrame()

    def get_product_scores(self) -> pd.DataFrame:
        """Fetch current SAFE scores for all products."""
        result = self.supabase.table("safe_scoring_results").select(
            "product_id, note_finale, score_s, score_a, score_f, score_e, "
            "tier, calculated_at, evaluation_method"
        ).execute()

        return pd.DataFrame(result.data) if result.data else pd.DataFrame()

    def get_score_history(self, days: int = 365) -> pd.DataFrame:
        """Fetch historical score snapshots."""
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

        result = self.supabase.table("score_history").select(
            "product_id, safe_score, score_s, score_a, score_f, score_e, "
            "recorded_at"
        ).gte("recorded_at", cutoff).execute()

        return pd.DataFrame(result.data) if result.data else pd.DataFrame()

    def get_incidents(self, days: int = 730) -> pd.DataFrame:
        """Fetch security incidents."""
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

        result = self.supabase.table("security_incidents").select(
            "id, product_id, incident_type, severity, funds_lost_usd, "
            "incident_date, created_at"
        ).gte("incident_date", cutoff).execute()

        return pd.DataFrame(result.data) if result.data else pd.DataFrame()

    def get_evaluations(self) -> pd.DataFrame:
        """Fetch evaluation results (norm compliance)."""
        result = self.supabase.table("evaluations").select(
            "product_id, norm_id, result, confidence, justification_length, "
            "evaluated_at"
        ).execute()

        return pd.DataFrame(result.data) if result.data else pd.DataFrame()

    def get_product_types(self) -> pd.DataFrame:
        """Fetch product type definitions."""
        result = self.supabase.table("product_types").select(
            "id, name, slug, is_custodial, risk_category"
        ).execute()

        return pd.DataFrame(result.data) if result.data else pd.DataFrame()

    def get_norms(self) -> pd.DataFrame:
        """Fetch norms with their metadata."""
        result = self.supabase.table("norms").select(
            "id, code, pillar, weight, is_critical, tier"
        ).execute()

        return pd.DataFrame(result.data) if result.data else pd.DataFrame()

    def compute_score_velocity(self, score_history: pd.DataFrame, window_days: int = 90) -> Dict[int, float]:
        """
        Compute rate of score change for each product.

        Returns dict mapping product_id -> velocity (positive = improving, negative = declining)
        """
        if score_history.empty:
            return {}

        velocities = {}
        cutoff = datetime.utcnow() - timedelta(days=window_days)

        for product_id in score_history["product_id"].unique():
            product_history = score_history[
                (score_history["product_id"] == product_id) &
                (pd.to_datetime(score_history["recorded_at"]) >= cutoff)
            ].sort_values("recorded_at")

            if len(product_history) >= 2:
                first_score = product_history.iloc[0]["safe_score"]
                last_score = product_history.iloc[-1]["safe_score"]
                days = (
                    pd.to_datetime(product_history.iloc[-1]["recorded_at"]) -
                    pd.to_datetime(product_history.iloc[0]["recorded_at"])
                ).days

                if days > 0:
                    velocities[product_id] = (last_score - first_score) / days
                else:
                    velocities[product_id] = 0.0
            else:
                velocities[product_id] = 0.0

        return velocities

    def compute_incident_features(self, incidents: pd.DataFrame) -> Dict[int, Dict]:
        """
        Compute incident-related features for each product.

        Returns dict mapping product_id -> {
            total_incidents: int,
            avg_severity: float,
            total_funds_lost: float,
            days_since_last: int,
            incident_frequency: float (per year)
        }
        """
        if incidents.empty:
            return {}

        features = {}
        now = datetime.utcnow()

        for product_id in incidents["product_id"].dropna().unique():
            product_incidents = incidents[incidents["product_id"] == product_id]

            total = len(product_incidents)
            avg_severity = product_incidents["severity"].mean() if "severity" in product_incidents else 0

            funds_lost = product_incidents["funds_lost_usd"].sum() if "funds_lost_usd" in product_incidents else 0

            # Days since last incident
            if "incident_date" in product_incidents.columns:
                last_incident = pd.to_datetime(product_incidents["incident_date"]).max()
                days_since = (now - last_incident.to_pydatetime()).days if pd.notna(last_incident) else 9999
            else:
                days_since = 9999

            # Incident frequency (per year)
            if "incident_date" in product_incidents.columns and total > 0:
                first_incident = pd.to_datetime(product_incidents["incident_date"]).min()
                span_days = (now - first_incident.to_pydatetime()).days if pd.notna(first_incident) else 365
                frequency = (total / max(span_days, 1)) * 365
            else:
                frequency = 0.0

            features[int(product_id)] = {
                "total_incidents": total,
                "avg_severity": float(avg_severity) if pd.notna(avg_severity) else 0,
                "total_funds_lost": float(funds_lost) if pd.notna(funds_lost) else 0,
                "days_since_last": int(days_since),
                "incident_frequency": float(frequency),
            }

        return features

    def compute_evaluation_features(self, evaluations: pd.DataFrame, norms: pd.DataFrame) -> Dict[int, Dict]:
        """
        Compute evaluation-related features for each product.

        Returns dict mapping product_id -> {
            tbd_ratio: float,
            critical_norms_failed: int,
            avg_confidence: float,
            coverage: float (% of applicable norms evaluated)
        }
        """
        if evaluations.empty:
            return {}

        # Get critical norms
        critical_norm_ids = set(norms[norms.get("is_critical", False) == True]["id"].tolist()) if not norms.empty else set()

        features = {}

        for product_id in evaluations["product_id"].unique():
            product_evals = evaluations[evaluations["product_id"] == product_id]

            total_evals = len(product_evals)
            if total_evals == 0:
                continue

            # TBD ratio
            tbd_count = len(product_evals[product_evals["result"] == "TBD"])
            tbd_ratio = tbd_count / total_evals

            # Critical norms failed
            critical_failed = 0
            if critical_norm_ids:
                critical_evals = product_evals[product_evals["norm_id"].isin(critical_norm_ids)]
                critical_failed = len(critical_evals[critical_evals["result"] == "NO"])

            # Average confidence
            avg_confidence = product_evals["confidence"].mean() if "confidence" in product_evals else 0.5

            features[int(product_id)] = {
                "tbd_ratio": float(tbd_ratio),
                "critical_norms_failed": int(critical_failed),
                "avg_confidence": float(avg_confidence) if pd.notna(avg_confidence) else 0.5,
                "total_evaluations": int(total_evals),
            }

        return features

    def prepare_training_data(self, target_window_days: int = 90) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Prepare training data for incident prediction model.

        Args:
            target_window_days: Look-ahead window for incident prediction

        Returns:
            features (DataFrame): Feature matrix
            labels (Series): Binary labels (1 = incident occurred, 0 = no incident)
        """
        print("[*] Loading data from database...")

        # Load all data
        products = self.get_products()
        scores = self.get_product_scores()
        score_history = self.get_score_history()
        incidents = self.get_incidents()
        evaluations = self.get_evaluations()
        product_types = self.get_product_types()
        norms = self.get_norms()

        print(f"[+] Loaded {len(products)} products, {len(incidents)} incidents")

        # Compute derived features
        print("[*] Computing derived features...")
        velocities = self.compute_score_velocity(score_history)
        incident_features = self.compute_incident_features(incidents)
        eval_features = self.compute_evaluation_features(evaluations, norms)

        # Merge data
        print("[*] Merging features...")
        df = products.copy()

        # Add scores
        if not scores.empty:
            df = df.merge(
                scores[["product_id", "note_finale", "score_s", "score_a", "score_f", "score_e"]],
                left_on="id", right_on="product_id", how="left"
            )

        # Add product type info
        if not product_types.empty:
            df = df.merge(
                product_types[["id", "is_custodial", "risk_category"]],
                left_on="product_type_id", right_on="id", how="left", suffixes=("", "_type")
            )

        # Add velocity
        df["score_velocity"] = df["id"].map(velocities).fillna(0)

        # Add incident features
        for col in ["total_incidents", "avg_severity", "total_funds_lost", "days_since_last", "incident_frequency"]:
            df[col] = df["id"].map(lambda x: incident_features.get(x, {}).get(col, 0))

        # Add evaluation features
        for col in ["tbd_ratio", "critical_norms_failed", "avg_confidence", "total_evaluations"]:
            df[col] = df["id"].map(lambda x: eval_features.get(x, {}).get(col, 0))

        # Compute product age
        df["product_age_days"] = (datetime.utcnow() - pd.to_datetime(df["created_at"])).dt.days

        # Compute pillar variance (higher = unbalanced)
        pillar_cols = ["score_s", "score_a", "score_f", "score_e"]
        df["pillar_variance"] = df[pillar_cols].var(axis=1).fillna(0)

        # Compute weakest pillar
        df["weakest_pillar_score"] = df[pillar_cols].min(axis=1).fillna(0)

        # Create labels: Did an incident occur in the next target_window_days?
        print("[*] Creating labels...")
        cutoff = datetime.utcnow() - timedelta(days=target_window_days)
        recent_incidents = incidents[pd.to_datetime(incidents["incident_date"]) >= cutoff]
        products_with_incidents = set(recent_incidents["product_id"].dropna().unique())
        df["had_incident"] = df["id"].isin(products_with_incidents).astype(int)

        # Select feature columns
        feature_columns = [
            "note_finale", "score_s", "score_a", "score_f", "score_e",
            "score_velocity", "pillar_variance", "weakest_pillar_score",
            "total_incidents", "avg_severity", "days_since_last", "incident_frequency",
            "tbd_ratio", "critical_norms_failed", "avg_confidence",
            "product_age_days", "is_custodial",
        ]

        # Clean data
        features_df = df[feature_columns].fillna(0)
        features_df["is_custodial"] = features_df["is_custodial"].astype(int)
        labels = df["had_incident"]

        print(f"[+] Prepared {len(features_df)} samples with {len(feature_columns)} features")
        print(f"[+] Positive samples (had incident): {labels.sum()}")
        print(f"[+] Negative samples (no incident): {(~labels.astype(bool)).sum()}")

        return features_df, labels

    def save_training_data(self, features: pd.DataFrame, labels: pd.Series, output_dir: str = "data/ml"):
        """Save training data to files."""
        os.makedirs(output_dir, exist_ok=True)

        features.to_csv(f"{output_dir}/features.csv", index=False)
        labels.to_csv(f"{output_dir}/labels.csv", index=False)

        # Save metadata
        metadata = {
            "created_at": datetime.utcnow().isoformat(),
            "num_samples": len(features),
            "num_features": len(features.columns),
            "feature_columns": features.columns.tolist(),
            "positive_samples": int(labels.sum()),
            "negative_samples": int((~labels.astype(bool)).sum()),
        }
        with open(f"{output_dir}/metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)

        print(f"[+] Saved training data to {output_dir}/")

    def load_training_data(self, input_dir: str = "data/ml") -> Tuple[pd.DataFrame, pd.Series]:
        """Load training data from files."""
        features = pd.read_csv(f"{input_dir}/features.csv")
        labels = pd.read_csv(f"{input_dir}/labels.csv").squeeze()

        return features, labels


if __name__ == "__main__":
    # Test data pipeline
    print("Testing DataPipeline...")
    try:
        pipeline = DataPipeline()
        features, labels = pipeline.prepare_training_data()
        pipeline.save_training_data(features, labels)
        print("Success!")
    except Exception as e:
        print(f"Error: {e}")
