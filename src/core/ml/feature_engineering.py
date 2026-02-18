"""
Feature Engineering for ML Models

Utilities for creating and transforming features for ML training and inference.

Features:
- Score-based features (current, historical, velocity)
- Risk indicators (incident history, severity patterns)
- Product metadata (age, type, custody status)
- Evaluation quality metrics

Usage:
    from src.core.ml.feature_engineering import FeatureEngineering

    fe = FeatureEngineering()
    features = fe.create_product_features(product_data, scores, incidents)
"""

import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
import math

try:
    import pandas as pd
    import numpy as np
except ImportError:
    print("Please install pandas and numpy: pip install pandas numpy")
    pd = None
    np = None


class FeatureEngineering:
    """
    Feature engineering utilities for ML models.

    Creates normalized and derived features from raw SafeScoring data.
    """

    # Feature definitions
    SCORE_FEATURES = [
        "note_finale", "score_s", "score_a", "score_f", "score_e",
    ]

    DERIVED_FEATURES = [
        "score_velocity", "pillar_variance", "weakest_pillar_score",
        "pillar_imbalance", "score_stability",
    ]

    INCIDENT_FEATURES = [
        "total_incidents", "avg_severity", "days_since_last",
        "incident_frequency", "total_funds_lost",
    ]

    EVALUATION_FEATURES = [
        "tbd_ratio", "critical_norms_failed", "avg_confidence",
        "coverage_ratio",
    ]

    PRODUCT_FEATURES = [
        "product_age_days", "is_custodial", "has_bug_bounty",
    ]

    def __init__(self):
        """Initialize feature engineering utilities."""
        self.feature_stats = {}

    def create_product_features(
        self,
        product: Dict,
        current_scores: Dict,
        score_history: List[Dict] = None,
        incidents: List[Dict] = None,
        evaluations: List[Dict] = None,
    ) -> Dict[str, float]:
        """
        Create all features for a single product.

        Args:
            product: Product metadata (id, type, created_at, etc.)
            current_scores: Current SAFE scores
            score_history: Historical score snapshots (optional)
            incidents: Historical incidents (optional)
            evaluations: Evaluation results (optional)

        Returns:
            Dict of feature name -> value
        """
        features = {}

        # Score features
        features.update(self._create_score_features(current_scores))

        # Derived score features
        features.update(self._create_derived_score_features(current_scores, score_history))

        # Incident features
        features.update(self._create_incident_features(incidents))

        # Evaluation features
        features.update(self._create_evaluation_features(evaluations))

        # Product metadata features
        features.update(self._create_product_features(product))

        return features

    def _create_score_features(self, scores: Dict) -> Dict[str, float]:
        """Extract score features."""
        return {
            "note_finale": self._safe_float(scores.get("note_finale", scores.get("safe_score"))),
            "score_s": self._safe_float(scores.get("score_s", scores.get("security"))),
            "score_a": self._safe_float(scores.get("score_a", scores.get("adversity"))),
            "score_f": self._safe_float(scores.get("score_f", scores.get("fidelity"))),
            "score_e": self._safe_float(scores.get("score_e", scores.get("efficiency"))),
        }

    def _create_derived_score_features(
        self, current_scores: Dict, score_history: List[Dict] = None
    ) -> Dict[str, float]:
        """Create derived features from scores."""
        features = {}

        # Pillar scores
        pillars = [
            self._safe_float(current_scores.get("score_s", 0)),
            self._safe_float(current_scores.get("score_a", 0)),
            self._safe_float(current_scores.get("score_f", 0)),
            self._safe_float(current_scores.get("score_e", 0)),
        ]
        pillars = [p for p in pillars if p > 0]  # Filter zeros

        if pillars:
            # Variance between pillars (higher = unbalanced)
            features["pillar_variance"] = float(np.var(pillars)) if np else sum((p - sum(pillars)/len(pillars))**2 for p in pillars) / len(pillars)

            # Weakest pillar
            features["weakest_pillar_score"] = min(pillars)

            # Imbalance ratio (max/min)
            if min(pillars) > 0:
                features["pillar_imbalance"] = max(pillars) / min(pillars)
            else:
                features["pillar_imbalance"] = 10.0  # Max imbalance

        else:
            features["pillar_variance"] = 0.0
            features["weakest_pillar_score"] = 0.0
            features["pillar_imbalance"] = 1.0

        # Score velocity (change rate over time)
        if score_history and len(score_history) >= 2:
            sorted_history = sorted(score_history, key=lambda x: x.get("recorded_at", ""))
            first_score = self._safe_float(sorted_history[0].get("safe_score", 0))
            last_score = self._safe_float(sorted_history[-1].get("safe_score", 0))

            try:
                first_date = datetime.fromisoformat(sorted_history[0]["recorded_at"].replace("Z", "+00:00"))
                last_date = datetime.fromisoformat(sorted_history[-1]["recorded_at"].replace("Z", "+00:00"))
                days = (last_date - first_date).days
                if days > 0:
                    features["score_velocity"] = (last_score - first_score) / days
                else:
                    features["score_velocity"] = 0.0
            except:
                features["score_velocity"] = 0.0

            # Score stability (std dev of changes)
            if len(score_history) >= 3:
                scores = [self._safe_float(h.get("safe_score", 0)) for h in score_history]
                changes = [scores[i+1] - scores[i] for i in range(len(scores)-1)]
                features["score_stability"] = float(np.std(changes)) if np else (sum((c - sum(changes)/len(changes))**2 for c in changes) / len(changes)) ** 0.5
            else:
                features["score_stability"] = 0.0
        else:
            features["score_velocity"] = 0.0
            features["score_stability"] = 0.0

        return features

    def _create_incident_features(self, incidents: List[Dict] = None) -> Dict[str, float]:
        """Create incident-related features."""
        if not incidents:
            return {
                "total_incidents": 0.0,
                "avg_severity": 0.0,
                "days_since_last": 9999.0,
                "incident_frequency": 0.0,
                "total_funds_lost": 0.0,
            }

        now = datetime.utcnow()

        # Total incidents
        total = len(incidents)

        # Average severity
        severities = [self._safe_float(i.get("severity", 0)) for i in incidents]
        avg_severity = sum(severities) / len(severities) if severities else 0

        # Total funds lost
        funds_lost = sum(self._safe_float(i.get("funds_lost_usd", 0)) for i in incidents)

        # Days since last incident
        incident_dates = []
        for inc in incidents:
            date_str = inc.get("incident_date")
            if date_str:
                try:
                    date = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                    incident_dates.append(date)
                except:
                    pass

        if incident_dates:
            last_incident = max(incident_dates)
            days_since = (now - last_incident.replace(tzinfo=None)).days
        else:
            days_since = 9999

        # Incident frequency (per year)
        if incident_dates and total > 0:
            first_incident = min(incident_dates)
            span_days = (now - first_incident.replace(tzinfo=None)).days
            frequency = (total / max(span_days, 1)) * 365
        else:
            frequency = 0.0

        return {
            "total_incidents": float(total),
            "avg_severity": float(avg_severity),
            "days_since_last": float(min(days_since, 9999)),
            "incident_frequency": float(frequency),
            "total_funds_lost": float(funds_lost),
        }

    def _create_evaluation_features(self, evaluations: List[Dict] = None) -> Dict[str, float]:
        """Create evaluation-related features."""
        if not evaluations:
            return {
                "tbd_ratio": 0.0,
                "critical_norms_failed": 0.0,
                "avg_confidence": 0.5,
                "coverage_ratio": 0.0,
            }

        total = len(evaluations)

        # TBD ratio
        tbd_count = sum(1 for e in evaluations if e.get("result") == "TBD")
        tbd_ratio = tbd_count / total if total > 0 else 0

        # Critical norms failed (assuming is_critical field or code patterns)
        critical_failed = sum(1 for e in evaluations
                              if e.get("result") == "NO" and e.get("is_critical", False))

        # Average confidence
        confidences = [self._safe_float(e.get("confidence", 0.5)) for e in evaluations]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.5

        # Coverage ratio (evaluated / applicable norms)
        applicable = sum(1 for e in evaluations if e.get("result") != "N/A")
        coverage = applicable / total if total > 0 else 0

        return {
            "tbd_ratio": float(tbd_ratio),
            "critical_norms_failed": float(critical_failed),
            "avg_confidence": float(avg_confidence),
            "coverage_ratio": float(coverage),
        }

    def _create_product_features(self, product: Dict) -> Dict[str, float]:
        """Create product metadata features."""
        features = {}

        # Product age
        created_at = product.get("created_at")
        if created_at:
            try:
                created_date = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                age_days = (datetime.utcnow() - created_date.replace(tzinfo=None)).days
            except:
                age_days = 365  # Default
        else:
            age_days = 365

        features["product_age_days"] = float(age_days)

        # Is custodial
        is_custodial = product.get("is_custodial", False)
        if isinstance(is_custodial, bool):
            features["is_custodial"] = 1.0 if is_custodial else 0.0
        else:
            features["is_custodial"] = float(is_custodial) if is_custodial else 0.0

        # Has bug bounty
        has_bounty = product.get("has_bug_bounty", False)
        features["has_bug_bounty"] = 1.0 if has_bounty else 0.0

        return features

    def _safe_float(self, value: Any, default: float = 0.0) -> float:
        """Safely convert value to float."""
        if value is None:
            return default
        try:
            result = float(value)
            if math.isnan(result) or math.isinf(result):
                return default
            return result
        except (ValueError, TypeError):
            return default

    def normalize_features(self, features: Dict[str, float], stats: Dict = None) -> Dict[str, float]:
        """
        Normalize features using z-score normalization.

        Args:
            features: Raw feature dict
            stats: Dict of {feature: {mean, std}} for normalization

        Returns:
            Normalized feature dict
        """
        if not stats:
            return features  # No normalization

        normalized = {}
        for name, value in features.items():
            if name in stats:
                mean = stats[name].get("mean", 0)
                std = stats[name].get("std", 1)
                if std > 0:
                    normalized[name] = (value - mean) / std
                else:
                    normalized[name] = 0.0
            else:
                normalized[name] = value

        return normalized

    def compute_feature_stats(self, features_df) -> Dict[str, Dict]:
        """Compute mean and std for each feature from a DataFrame."""
        stats = {}
        for col in features_df.columns:
            stats[col] = {
                "mean": float(features_df[col].mean()),
                "std": float(features_df[col].std()),
                "min": float(features_df[col].min()),
                "max": float(features_df[col].max()),
            }
        return stats

    @staticmethod
    def get_feature_names() -> List[str]:
        """Get list of all feature names."""
        return (
            FeatureEngineering.SCORE_FEATURES +
            FeatureEngineering.DERIVED_FEATURES +
            FeatureEngineering.INCIDENT_FEATURES +
            FeatureEngineering.EVALUATION_FEATURES +
            FeatureEngineering.PRODUCT_FEATURES
        )


# Convenience functions
def create_features_for_product(
    product: Dict,
    current_scores: Dict,
    score_history: List[Dict] = None,
    incidents: List[Dict] = None,
    evaluations: List[Dict] = None,
) -> Dict[str, float]:
    """
    Convenience function to create features for a product.

    See FeatureEngineering.create_product_features for details.
    """
    fe = FeatureEngineering()
    return fe.create_product_features(product, current_scores, score_history, incidents, evaluations)


if __name__ == "__main__":
    # Test feature engineering
    print("Testing FeatureEngineering...")

    fe = FeatureEngineering()

    # Sample data
    product = {
        "id": 1,
        "created_at": "2023-01-15T00:00:00Z",
        "is_custodial": True,
        "has_bug_bounty": True,
    }

    scores = {
        "note_finale": 72.5,
        "score_s": 80,
        "score_a": 65,
        "score_f": 75,
        "score_e": 70,
    }

    score_history = [
        {"safe_score": 68, "recorded_at": "2023-06-01T00:00:00Z"},
        {"safe_score": 70, "recorded_at": "2023-09-01T00:00:00Z"},
        {"safe_score": 72.5, "recorded_at": "2023-12-01T00:00:00Z"},
    ]

    incidents = [
        {"severity": 3, "incident_date": "2023-03-15T00:00:00Z", "funds_lost_usd": 100000},
        {"severity": 2, "incident_date": "2023-08-20T00:00:00Z", "funds_lost_usd": 50000},
    ]

    evaluations = [
        {"result": "YES", "confidence": 0.9, "is_critical": False},
        {"result": "NO", "confidence": 0.8, "is_critical": True},
        {"result": "TBD", "confidence": 0.5, "is_critical": False},
        {"result": "YES", "confidence": 0.95, "is_critical": False},
        {"result": "N/A", "confidence": 1.0, "is_critical": False},
    ]

    features = fe.create_product_features(product, scores, score_history, incidents, evaluations)

    print("\nGenerated Features:")
    for name, value in sorted(features.items()):
        print(f"  {name}: {value:.4f}")

    print(f"\nTotal features: {len(features)}")
    print("\nSuccess!")
