"""
Incident Predictor - ML Model for Security Incident Prediction

This module provides:
- IncidentPredictor class: XGBoost + Random Forest ensemble
- Training pipeline with cross-validation
- Prediction API for real-time inference
- Model persistence and versioning

Usage:
    from src.core.ml.incident_predictor import IncidentPredictor, predict_incident_probability

    # Train a new model
    predictor = IncidentPredictor()
    predictor.train(features, labels)
    predictor.save("models/incident_predictor_v1.joblib")

    # Load and predict
    predictor = IncidentPredictor.load("models/incident_predictor_v1.joblib")
    probability = predictor.predict_proba(product_features)
"""

import os
import sys
import json
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any, Union
import warnings

# Suppress sklearn warnings
warnings.filterwarnings("ignore", category=UserWarning)

try:
    import pandas as pd
    import numpy as np
except ImportError:
    print("Please install pandas and numpy: pip install pandas numpy")
    pd = None
    np = None

try:
    from sklearn.ensemble import (
        RandomForestClassifier,
        GradientBoostingClassifier,
        VotingClassifier,
    )
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import cross_val_score, train_test_split, StratifiedKFold
    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score, f1_score,
        roc_auc_score, classification_report, confusion_matrix,
    )
    from sklearn.preprocessing import StandardScaler
    import joblib
except ImportError:
    print("Please install scikit-learn: pip install scikit-learn")
    RandomForestClassifier = None
    joblib = None

try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except ImportError:
    print("XGBoost not available, using sklearn only")
    XGBClassifier = None
    HAS_XGBOOST = False


class IncidentPredictor:
    """
    Ensemble ML model for predicting security incidents.

    Uses a stacking ensemble of:
    - XGBoost (primary, if available)
    - Random Forest (robust baseline)
    - Gradient Boosting (for diversity)
    - Logistic Regression (meta-learner for stacking)

    Features expected:
    - note_finale: Overall SAFE score
    - score_s, score_a, score_f, score_e: Pillar scores
    - score_velocity: Rate of score change
    - pillar_variance: Variance between pillars
    - weakest_pillar_score: Minimum pillar score
    - total_incidents: Historical incident count
    - avg_severity: Average incident severity
    - days_since_last: Days since last incident
    - incident_frequency: Incidents per year
    - tbd_ratio: Ratio of TBD evaluations
    - critical_norms_failed: Count of failed critical norms
    - avg_confidence: Average evaluation confidence
    - product_age_days: Days since product creation
    - is_custodial: Whether product holds user funds
    """

    FEATURE_COLUMNS = [
        "note_finale", "score_s", "score_a", "score_f", "score_e",
        "score_velocity", "pillar_variance", "weakest_pillar_score",
        "total_incidents", "avg_severity", "days_since_last", "incident_frequency",
        "tbd_ratio", "critical_norms_failed", "avg_confidence",
        "product_age_days", "is_custodial",
    ]

    RISK_LEVELS = {
        (0.0, 0.1): "MINIMAL",
        (0.1, 0.25): "LOW",
        (0.25, 0.5): "MEDIUM",
        (0.5, 0.75): "HIGH",
        (0.75, 1.0): "CRITICAL",
    }

    def __init__(self, random_state: int = 42):
        """Initialize the incident predictor."""
        self.random_state = random_state
        self.scaler = StandardScaler()
        self.model = None
        self.feature_importances_ = None
        self.metadata = {
            "created_at": None,
            "trained_at": None,
            "version": "1.0.0",
            "metrics": {},
        }

    def _create_ensemble(self):
        """Create the ensemble model."""
        estimators = []

        # XGBoost (if available)
        if HAS_XGBOOST and XGBClassifier:
            xgb = XGBClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=self.random_state,
                use_label_encoder=False,
                eval_metric="logloss",
            )
            estimators.append(("xgboost", xgb))

        # Random Forest
        rf = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=self.random_state,
            n_jobs=-1,
        )
        estimators.append(("random_forest", rf))

        # Gradient Boosting
        gb = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            random_state=self.random_state,
        )
        estimators.append(("gradient_boosting", gb))

        # Voting classifier (soft voting for probability)
        ensemble = VotingClassifier(
            estimators=estimators,
            voting="soft",
            n_jobs=-1,
        )

        return ensemble

    def train(self, features: pd.DataFrame, labels: pd.Series,
              test_size: float = 0.2, cv_folds: int = 5) -> Dict[str, float]:
        """
        Train the incident prediction model.

        Args:
            features: Feature matrix
            labels: Binary labels (1 = incident, 0 = no incident)
            test_size: Fraction of data for testing
            cv_folds: Number of cross-validation folds

        Returns:
            Dictionary of evaluation metrics
        """
        print("[*] Training incident predictor...")

        # Ensure correct columns
        X = features[self.FEATURE_COLUMNS].copy()
        y = labels.copy()

        # Handle missing values
        X = X.fillna(0)

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=self.random_state, stratify=y
        )

        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # Create and train model
        self.model = self._create_ensemble()
        print(f"[*] Training ensemble with {len(self.model.estimators)} models...")

        self.model.fit(X_train_scaled, y_train)

        # Evaluate
        y_pred = self.model.predict(X_test_scaled)
        y_proba = self.model.predict_proba(X_test_scaled)[:, 1]

        metrics = {
            "accuracy": accuracy_score(y_test, y_pred),
            "precision": precision_score(y_test, y_pred, zero_division=0),
            "recall": recall_score(y_test, y_pred, zero_division=0),
            "f1": f1_score(y_test, y_pred, zero_division=0),
            "roc_auc": roc_auc_score(y_test, y_proba) if len(set(y_test)) > 1 else 0.5,
        }

        # Cross-validation
        print("[*] Running cross-validation...")
        cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=self.random_state)
        cv_scores = cross_val_score(self.model, X_train_scaled, y_train, cv=cv, scoring="roc_auc")
        metrics["cv_roc_auc_mean"] = cv_scores.mean()
        metrics["cv_roc_auc_std"] = cv_scores.std()

        # Compute feature importances (from Random Forest)
        rf_model = self.model.named_estimators_.get("random_forest")
        if rf_model and hasattr(rf_model, "feature_importances_"):
            self.feature_importances_ = dict(zip(self.FEATURE_COLUMNS, rf_model.feature_importances_))

        # Update metadata
        self.metadata["trained_at"] = datetime.utcnow().isoformat()
        self.metadata["metrics"] = metrics
        self.metadata["num_samples"] = len(X)
        self.metadata["positive_samples"] = int(y.sum())

        # Print results
        print(f"\n[+] Training Results:")
        print(f"    Accuracy:  {metrics['accuracy']:.4f}")
        print(f"    Precision: {metrics['precision']:.4f}")
        print(f"    Recall:    {metrics['recall']:.4f}")
        print(f"    F1 Score:  {metrics['f1']:.4f}")
        print(f"    ROC AUC:   {metrics['roc_auc']:.4f}")
        print(f"    CV AUC:    {metrics['cv_roc_auc_mean']:.4f} (±{metrics['cv_roc_auc_std']:.4f})")

        if self.feature_importances_:
            print(f"\n[+] Top 5 Feature Importances:")
            sorted_features = sorted(self.feature_importances_.items(), key=lambda x: x[1], reverse=True)
            for name, importance in sorted_features[:5]:
                print(f"    {name}: {importance:.4f}")

        return metrics

    def predict_proba(self, features: Union[pd.DataFrame, Dict, List]) -> np.ndarray:
        """
        Predict incident probability for products.

        Args:
            features: Feature matrix, dict, or list of feature values

        Returns:
            Array of probabilities (0.0 - 1.0)
        """
        if self.model is None:
            raise ValueError("Model not trained. Call train() first or load a saved model.")

        # Convert to DataFrame if needed
        if isinstance(features, dict):
            features = pd.DataFrame([features])
        elif isinstance(features, list):
            if isinstance(features[0], dict):
                features = pd.DataFrame(features)
            else:
                features = pd.DataFrame([features], columns=self.FEATURE_COLUMNS)

        # Ensure correct columns
        X = features[self.FEATURE_COLUMNS].copy()
        X = X.fillna(0)

        # Scale
        X_scaled = self.scaler.transform(X)

        # Predict
        probabilities = self.model.predict_proba(X_scaled)[:, 1]

        return probabilities

    def predict(self, features: Union[pd.DataFrame, Dict]) -> List[Dict]:
        """
        Predict incident risk with detailed results.

        Args:
            features: Feature matrix or dict of features

        Returns:
            List of prediction results with probability and risk level
        """
        probabilities = self.predict_proba(features)

        results = []
        for prob in probabilities:
            # Determine risk level
            risk_level = "UNKNOWN"
            for (low, high), level in self.RISK_LEVELS.items():
                if low <= prob < high:
                    risk_level = level
                    break

            results.append({
                "incident_probability": float(prob),
                "risk_level": risk_level,
                "confidence": self._compute_confidence(prob),
            })

        return results

    def _compute_confidence(self, probability: float) -> float:
        """Compute prediction confidence based on how extreme the probability is."""
        # Higher confidence for probabilities far from 0.5
        return float(abs(probability - 0.5) * 2)

    def save(self, filepath: str):
        """Save model to file."""
        if self.model is None:
            raise ValueError("No model to save. Train first.")

        os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else ".", exist_ok=True)

        save_data = {
            "model": self.model,
            "scaler": self.scaler,
            "feature_importances": self.feature_importances_,
            "metadata": self.metadata,
            "feature_columns": self.FEATURE_COLUMNS,
        }

        joblib.dump(save_data, filepath)
        print(f"[+] Model saved to {filepath}")

    @classmethod
    def load(cls, filepath: str) -> "IncidentPredictor":
        """Load model from file."""
        save_data = joblib.load(filepath)

        predictor = cls()
        predictor.model = save_data["model"]
        predictor.scaler = save_data["scaler"]
        predictor.feature_importances_ = save_data.get("feature_importances")
        predictor.metadata = save_data.get("metadata", {})

        print(f"[+] Model loaded from {filepath}")
        if predictor.metadata.get("trained_at"):
            print(f"    Trained at: {predictor.metadata['trained_at']}")
        if predictor.metadata.get("metrics"):
            print(f"    ROC AUC: {predictor.metadata['metrics'].get('roc_auc', 'N/A')}")

        return predictor


# Global model instance for API usage
_global_predictor: Optional[IncidentPredictor] = None


def get_predictor(model_path: str = "models/incident_predictor_v1.joblib") -> IncidentPredictor:
    """Get or load the global predictor instance."""
    global _global_predictor

    if _global_predictor is None:
        if os.path.exists(model_path):
            _global_predictor = IncidentPredictor.load(model_path)
        else:
            raise FileNotFoundError(f"Model not found at {model_path}. Train a model first.")

    return _global_predictor


def predict_incident_probability(product_features: Dict) -> Dict:
    """
    Convenience function to predict incident probability for a single product.

    Args:
        product_features: Dict with required feature values

    Returns:
        Dict with incident_probability, risk_level, and confidence
    """
    predictor = get_predictor()
    results = predictor.predict(product_features)
    return results[0]


if __name__ == "__main__":
    # Test the predictor
    print("Testing IncidentPredictor...")

    # Create sample data
    np.random.seed(42)
    n_samples = 1000

    features = pd.DataFrame({
        "note_finale": np.random.uniform(30, 95, n_samples),
        "score_s": np.random.uniform(30, 95, n_samples),
        "score_a": np.random.uniform(30, 95, n_samples),
        "score_f": np.random.uniform(30, 95, n_samples),
        "score_e": np.random.uniform(30, 95, n_samples),
        "score_velocity": np.random.uniform(-0.5, 0.5, n_samples),
        "pillar_variance": np.random.uniform(0, 200, n_samples),
        "weakest_pillar_score": np.random.uniform(20, 80, n_samples),
        "total_incidents": np.random.poisson(1, n_samples),
        "avg_severity": np.random.uniform(0, 5, n_samples),
        "days_since_last": np.random.exponential(100, n_samples),
        "incident_frequency": np.random.exponential(0.5, n_samples),
        "tbd_ratio": np.random.uniform(0, 0.3, n_samples),
        "critical_norms_failed": np.random.poisson(2, n_samples),
        "avg_confidence": np.random.uniform(0.5, 1.0, n_samples),
        "product_age_days": np.random.uniform(30, 1000, n_samples),
        "is_custodial": np.random.choice([0, 1], n_samples),
    })

    # Generate labels correlated with features
    risk_score = (
        (100 - features["note_finale"]) / 100 * 0.3 +
        features["total_incidents"] / 10 * 0.2 +
        features["critical_norms_failed"] / 10 * 0.2 +
        (1 - features["avg_confidence"]) * 0.1 +
        features["is_custodial"] * 0.2
    )
    labels = (risk_score > np.random.uniform(0, 1, n_samples)).astype(int)

    print(f"Generated {n_samples} samples with {labels.sum()} positive cases")

    # Train model
    predictor = IncidentPredictor()
    metrics = predictor.train(features, labels)

    # Save model
    os.makedirs("models", exist_ok=True)
    predictor.save("models/incident_predictor_v1.joblib")

    # Test prediction
    test_product = {
        "note_finale": 45,
        "score_s": 40,
        "score_a": 50,
        "score_f": 45,
        "score_e": 55,
        "score_velocity": -0.1,
        "pillar_variance": 100,
        "weakest_pillar_score": 40,
        "total_incidents": 3,
        "avg_severity": 3.5,
        "days_since_last": 30,
        "incident_frequency": 2.0,
        "tbd_ratio": 0.15,
        "critical_norms_failed": 5,
        "avg_confidence": 0.7,
        "product_age_days": 365,
        "is_custodial": 1,
    }

    result = predictor.predict(test_product)[0]
    print(f"\nTest prediction:")
    print(f"  Probability: {result['incident_probability']:.4f}")
    print(f"  Risk Level:  {result['risk_level']}")
    print(f"  Confidence:  {result['confidence']:.4f}")

    print("\nSuccess!")
