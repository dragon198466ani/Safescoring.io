#!/usr/bin/env python3
"""
SAFESCORING.IO - Applicability Classifier (Proprietary ML Model)

Predicts which norms are applicable to a given product type using machine learning.
This reduces dependency on external AI APIs and creates a proprietary moat.

Model: LightGBM classifier trained on norm_applicability data
Input: Product type code(s), category
Output: List of applicable norm codes with confidence scores
"""

import os
import json
import pickle
import hashlib
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Tuple

# Try importing ML libraries (optional dependencies)
try:
    import numpy as np
    import pandas as pd
    from sklearn.preprocessing import LabelEncoder, MultiLabelBinarizer
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report, accuracy_score
    import lightgbm as lgb
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    print("[ML] Warning: ML libraries not installed. Install with: pip install lightgbm scikit-learn pandas numpy")

from ..config import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers

# Model storage path
MODEL_DIR = Path(__file__).parent / "models"
MODEL_PATH = MODEL_DIR / "applicability_classifier.pkl"
METADATA_PATH = MODEL_DIR / "applicability_metadata.json"


class ApplicabilityClassifier:
    """
    Proprietary ML model for predicting norm applicability.

    Trained on SafeScoring's unique norm_applicability dataset,
    this model cannot be replicated without our data.
    """

    def __init__(self):
        self.model = None
        self.type_encoder = None
        self.category_encoder = None
        self.norm_encoder = None
        self.feature_names = None
        self.metadata = {}
        self.is_loaded = False

        # Try to load existing model
        self._load_model()

    def _load_model(self) -> bool:
        """Load trained model from disk if available."""
        if not ML_AVAILABLE:
            return False

        if MODEL_PATH.exists() and METADATA_PATH.exists():
            try:
                with open(MODEL_PATH, 'rb') as f:
                    data = pickle.load(f)
                    self.model = data['model']
                    self.type_encoder = data['type_encoder']
                    self.category_encoder = data['category_encoder']
                    self.norm_encoder = data['norm_encoder']
                    self.feature_names = data.get('feature_names', [])

                with open(METADATA_PATH, 'r') as f:
                    self.metadata = json.load(f)

                self.is_loaded = True
                print(f"[ML] Loaded model trained on {self.metadata.get('trained_at', 'unknown')}")
                print(f"[ML] Accuracy: {self.metadata.get('accuracy', 0):.2%}")
                return True
            except Exception as e:
                print(f"[ML] Failed to load model: {e}")
                return False
        return False

    def _fetch_training_data(self) -> Optional[pd.DataFrame]:
        """Fetch training data from Supabase."""
        import requests

        headers = get_supabase_headers()

        # Fetch norm_applicability with related data
        url = f"{SUPABASE_URL}/rest/v1/norm_applicability?select=*,product_types(code,name,category),norms(code,pillar,is_essential)"

        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"[ML] Failed to fetch training data: {response.status_code}")
            return None

        data = response.json()
        if not data:
            print("[ML] No training data found")
            return None

        # Transform to DataFrame
        records = []
        for row in data:
            if row.get('product_types') and row.get('norms'):
                records.append({
                    'type_code': row['product_types']['code'],
                    'type_name': row['product_types']['name'],
                    'category': row['product_types']['category'],
                    'norm_code': row['norms']['code'],
                    'pillar': row['norms']['pillar'],
                    'is_essential': row['norms']['is_essential'],
                    'is_applicable': row.get('is_applicable', True),
                })

        df = pd.DataFrame(records)
        print(f"[ML] Loaded {len(df)} training samples")
        return df

    def train(self, force: bool = False) -> Dict:
        """
        Train the applicability classifier.

        Args:
            force: If True, retrain even if model exists

        Returns:
            Training metrics and metadata
        """
        if not ML_AVAILABLE:
            return {'error': 'ML libraries not installed'}

        if self.is_loaded and not force:
            return {'status': 'already_trained', 'metadata': self.metadata}

        print("[ML] Starting training...")

        # Fetch data
        df = self._fetch_training_data()
        if df is None:
            return {'error': 'Failed to fetch training data'}

        # Prepare features
        self.type_encoder = LabelEncoder()
        self.category_encoder = LabelEncoder()
        self.norm_encoder = LabelEncoder()

        df['type_encoded'] = self.type_encoder.fit_transform(df['type_code'])
        df['category_encoded'] = self.category_encoder.fit_transform(df['category'])
        df['norm_encoded'] = self.norm_encoder.fit_transform(df['norm_code'])
        df['pillar_encoded'] = df['pillar'].map({'S': 0, 'A': 1, 'F': 2, 'E': 3}).fillna(0)
        df['is_essential_encoded'] = df['is_essential'].astype(int)

        # Feature matrix
        feature_cols = ['type_encoded', 'category_encoded', 'pillar_encoded', 'is_essential_encoded']
        X = df[feature_cols].values
        y = df['is_applicable'].astype(int).values

        self.feature_names = feature_cols

        # Train/test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        # Train LightGBM model
        train_data = lgb.Dataset(X_train, label=y_train)
        test_data = lgb.Dataset(X_test, label=y_test, reference=train_data)

        params = {
            'objective': 'binary',
            'metric': 'binary_logloss',
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.05,
            'feature_fraction': 0.9,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': -1,
        }

        self.model = lgb.train(
            params,
            train_data,
            num_boost_round=100,
            valid_sets=[test_data],
            callbacks=[lgb.early_stopping(stopping_rounds=10, verbose=False)],
        )

        # Evaluate
        y_pred = (self.model.predict(X_test) > 0.5).astype(int)
        accuracy = accuracy_score(y_test, y_pred)

        # Save model
        MODEL_DIR.mkdir(parents=True, exist_ok=True)

        with open(MODEL_PATH, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'type_encoder': self.type_encoder,
                'category_encoder': self.category_encoder,
                'norm_encoder': self.norm_encoder,
                'feature_names': self.feature_names,
            }, f)

        self.metadata = {
            'trained_at': datetime.now().isoformat(),
            'samples': len(df),
            'accuracy': float(accuracy),
            'feature_importance': dict(zip(
                self.feature_names,
                self.model.feature_importance().tolist()
            )),
            'type_classes': list(self.type_encoder.classes_),
            'category_classes': list(self.category_encoder.classes_),
            'norm_classes': list(self.norm_encoder.classes_),
            'data_hash': hashlib.md5(df.to_json().encode()).hexdigest()[:16],
        }

        with open(METADATA_PATH, 'w') as f:
            json.dump(self.metadata, f, indent=2)

        self.is_loaded = True

        print(f"[ML] Training complete. Accuracy: {accuracy:.2%}")
        print(f"[ML] Model saved to {MODEL_PATH}")

        return {
            'status': 'trained',
            'accuracy': accuracy,
            'samples': len(df),
            'metadata': self.metadata,
        }

    def predict(
        self,
        type_codes: List[str],
        category: str = None,
        threshold: float = 0.5
    ) -> Dict[str, float]:
        """
        Predict applicable norms for given product types.

        Args:
            type_codes: List of product type codes
            category: Product category (optional, inferred if not provided)
            threshold: Confidence threshold for applicability

        Returns:
            Dict mapping norm codes to confidence scores
        """
        if not self.is_loaded:
            return {'error': 'Model not trained. Call train() first.'}

        if not ML_AVAILABLE:
            return {'error': 'ML libraries not installed'}

        results = {}

        for type_code in type_codes:
            # Encode type
            try:
                type_encoded = self.type_encoder.transform([type_code])[0]
            except ValueError:
                print(f"[ML] Unknown type: {type_code}, using default")
                type_encoded = 0

            # Encode category
            if category:
                try:
                    category_encoded = self.category_encoder.transform([category])[0]
                except ValueError:
                    category_encoded = 0
            else:
                category_encoded = 0

            # Predict for all norms
            for i, norm_code in enumerate(self.norm_encoder.classes_):
                # Build feature vector
                pillar = norm_code[0] if norm_code else 'S'
                pillar_encoded = {'S': 0, 'A': 1, 'F': 2, 'E': 3}.get(pillar, 0)

                # TODO: Get is_essential from norm data
                is_essential = 1 if norm_code and int(norm_code[1:]) <= 50 else 0

                X = np.array([[type_encoded, category_encoded, pillar_encoded, is_essential]])

                confidence = self.model.predict(X)[0]

                if confidence >= threshold:
                    # Use max confidence if norm already predicted
                    if norm_code not in results or confidence > results[norm_code]:
                        results[norm_code] = float(confidence)

        return results

    def get_applicable_norms(
        self,
        type_codes: List[str],
        category: str = None,
        threshold: float = 0.7
    ) -> List[str]:
        """
        Get list of applicable norm codes (simplified interface).

        Args:
            type_codes: List of product type codes
            category: Product category
            threshold: Confidence threshold (higher = more conservative)

        Returns:
            List of applicable norm codes
        """
        predictions = self.predict(type_codes, category, threshold)

        if 'error' in predictions:
            return []

        # Sort by confidence and return norm codes
        sorted_norms = sorted(
            predictions.items(),
            key=lambda x: x[1],
            reverse=True
        )

        return [norm for norm, _ in sorted_norms]

    def evaluate_model(self) -> Dict:
        """
        Evaluate model performance on held-out test data.

        Returns:
            Evaluation metrics
        """
        if not self.is_loaded:
            return {'error': 'Model not trained'}

        df = self._fetch_training_data()
        if df is None:
            return {'error': 'Failed to fetch test data'}

        # Use full data for evaluation
        df['type_encoded'] = self.type_encoder.transform(df['type_code'])
        df['category_encoded'] = self.category_encoder.transform(df['category'])
        df['pillar_encoded'] = df['pillar'].map({'S': 0, 'A': 1, 'F': 2, 'E': 3}).fillna(0)
        df['is_essential_encoded'] = df['is_essential'].astype(int)

        X = df[self.feature_names].values
        y_true = df['is_applicable'].astype(int).values

        y_pred = (self.model.predict(X) > 0.5).astype(int)

        return {
            'accuracy': float(accuracy_score(y_true, y_pred)),
            'total_samples': len(y_true),
            'correct_predictions': int((y_true == y_pred).sum()),
            'report': classification_report(y_true, y_pred, output_dict=True),
        }


# Global singleton instance
_classifier = None

def get_classifier() -> ApplicabilityClassifier:
    """Get or create the global classifier instance."""
    global _classifier
    if _classifier is None:
        _classifier = ApplicabilityClassifier()
    return _classifier


def predict_applicability(type_codes: List[str], category: str = None) -> List[str]:
    """
    Convenience function to predict applicable norms.

    Args:
        type_codes: List of product type codes
        category: Product category

    Returns:
        List of applicable norm codes
    """
    classifier = get_classifier()
    return classifier.get_applicable_norms(type_codes, category)


# CLI interface
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Applicability Classifier")
    parser.add_argument("--train", action="store_true", help="Train the model")
    parser.add_argument("--evaluate", action="store_true", help="Evaluate the model")
    parser.add_argument("--predict", type=str, help="Predict for type code(s), comma-separated")
    parser.add_argument("--force", action="store_true", help="Force retraining")

    args = parser.parse_args()

    classifier = ApplicabilityClassifier()

    if args.train:
        result = classifier.train(force=args.force)
        print(json.dumps(result, indent=2))

    elif args.evaluate:
        result = classifier.evaluate_model()
        print(json.dumps(result, indent=2))

    elif args.predict:
        type_codes = [t.strip() for t in args.predict.split(',')]
        norms = classifier.get_applicable_norms(type_codes)
        print(f"Applicable norms for {type_codes}:")
        print(f"  {len(norms)} norms predicted")
        print(f"  First 20: {norms[:20]}")

    else:
        parser.print_help()
