#!/usr/bin/env python3
"""
SAFESCORING.IO - Evaluation Quality Scorer (Proprietary ML Model)

Predicts the confidence/quality level of AI-generated evaluations.
This reduces manual review needs and ensures data quality.

Model: Gradient Boosting classifier trained on validation cache data
Input: Evaluation result, justification text features, norm metadata
Output: Quality level (HIGH/MEDIUM/LOW) with confidence score
"""

import os
import json
import pickle
import re
import hashlib
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Tuple

# Try importing ML libraries
try:
    import numpy as np
    import pandas as pd
    from sklearn.preprocessing import LabelEncoder
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report, accuracy_score
    from sklearn.feature_extraction.text import TfidfVectorizer
    import lightgbm as lgb
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False

from ..config import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers

# Model storage
MODEL_DIR = Path(__file__).parent / "models"
MODEL_PATH = MODEL_DIR / "quality_scorer.pkl"
METADATA_PATH = MODEL_DIR / "quality_scorer_metadata.json"


class EvaluationQualityScorer:
    """
    Proprietary ML model for predicting evaluation quality.

    Uses text features from justifications combined with metadata
    to predict whether an AI evaluation is HIGH, MEDIUM, or LOW quality.
    """

    # Quality level mapping
    QUALITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH']

    # Keywords that indicate high quality justifications
    HIGH_QUALITY_KEYWORDS = [
        'implemented', 'supports', 'uses', 'provides', 'includes',
        'verified', 'confirmed', 'documented', 'according to',
        'specification', 'standard', 'compliant', 'certified',
        'audit', 'security', 'encryption', 'algorithm',
    ]

    # Keywords that indicate low quality justifications
    LOW_QUALITY_KEYWORDS = [
        'unclear', 'unknown', 'not found', 'no information',
        'cannot determine', 'appears to', 'might', 'possibly',
        'assumed', 'likely', 'probably', 'maybe',
    ]

    def __init__(self):
        self.model = None
        self.tfidf = None
        self.pillar_encoder = None
        self.result_encoder = None
        self.metadata = {}
        self.is_loaded = False

        self._load_model()

    def _load_model(self) -> bool:
        """Load trained model from disk."""
        if not ML_AVAILABLE:
            return False

        if MODEL_PATH.exists() and METADATA_PATH.exists():
            try:
                with open(MODEL_PATH, 'rb') as f:
                    data = pickle.load(f)
                    self.model = data['model']
                    self.tfidf = data['tfidf']
                    self.pillar_encoder = data['pillar_encoder']
                    self.result_encoder = data['result_encoder']

                with open(METADATA_PATH, 'r') as f:
                    self.metadata = json.load(f)

                self.is_loaded = True
                print(f"[ML] Loaded quality scorer (accuracy: {self.metadata.get('accuracy', 0):.2%})")
                return True
            except Exception as e:
                print(f"[ML] Failed to load quality scorer: {e}")
                return False
        return False

    def _extract_text_features(self, justification: str) -> Dict:
        """Extract handcrafted features from justification text."""
        if not justification:
            justification = ""

        text_lower = justification.lower()

        features = {
            # Length features
            'char_count': len(justification),
            'word_count': len(justification.split()),
            'sentence_count': len(re.findall(r'[.!?]+', justification)) or 1,

            # Quality indicator counts
            'high_quality_keywords': sum(1 for kw in self.HIGH_QUALITY_KEYWORDS if kw in text_lower),
            'low_quality_keywords': sum(1 for kw in self.LOW_QUALITY_KEYWORDS if kw in text_lower),

            # Structure features
            'has_numbers': int(bool(re.search(r'\d', justification))),
            'has_technical_terms': int(bool(re.search(r'(AES|RSA|SHA|ECC|BIP|EIP|RFC|ISO|NIST|FIPS)', justification, re.I))),
            'has_urls': int(bool(re.search(r'https?://', justification))),
            'has_version': int(bool(re.search(r'v?\d+\.\d+', justification))),

            # Punctuation features
            'question_marks': justification.count('?'),
            'exclamation_marks': justification.count('!'),

            # Capitalization (all caps often indicates copying)
            'caps_ratio': sum(1 for c in justification if c.isupper()) / max(len(justification), 1),
        }

        return features

    def _label_quality(self, row: Dict) -> str:
        """
        Label evaluation quality based on heuristics.
        Used to generate training labels from existing data.
        """
        justification = row.get('justification', '') or ''
        result = row.get('result', 'TBD')

        # Start with MEDIUM
        score = 50

        # Length scoring
        word_count = len(justification.split())
        if word_count >= 30:
            score += 20
        elif word_count >= 15:
            score += 10
        elif word_count < 5:
            score -= 20

        # Technical terms
        if re.search(r'(AES|RSA|SHA|ECC|BIP|EIP|RFC)', justification, re.I):
            score += 15

        # Uncertainty indicators
        if any(kw in justification.lower() for kw in self.LOW_QUALITY_KEYWORDS):
            score -= 25

        # High quality indicators
        high_kw_count = sum(1 for kw in self.HIGH_QUALITY_KEYWORDS if kw in justification.lower())
        score += high_kw_count * 5

        # Result type impact
        if result == 'TBD':
            score -= 10
        elif result == 'N/A':
            score += 5  # N/A is often correct

        # Classify
        if score >= 70:
            return 'HIGH'
        elif score >= 40:
            return 'MEDIUM'
        else:
            return 'LOW'

    def _fetch_training_data(self) -> Optional[pd.DataFrame]:
        """Fetch evaluation data for training."""
        import requests

        headers = get_supabase_headers()

        # Fetch evaluations with justifications
        url = f"{SUPABASE_URL}/rest/v1/evaluations?select=*,norms(code,pillar,is_essential)&limit=10000"

        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"[ML] Failed to fetch training data: {response.status_code}")
            return None

        data = response.json()
        if not data:
            print("[ML] No training data found")
            return None

        records = []
        for row in data:
            if row.get('norms'):
                records.append({
                    'result': row.get('result', 'TBD'),
                    'justification': row.get('justification', ''),
                    'pillar': row['norms'].get('pillar', 'S'),
                    'is_essential': row['norms'].get('is_essential', False),
                    'norm_code': row['norms'].get('code', ''),
                })

        df = pd.DataFrame(records)

        # Generate quality labels
        df['quality'] = df.apply(self._label_quality, axis=1)

        print(f"[ML] Loaded {len(df)} training samples")
        print(f"[ML] Quality distribution: {df['quality'].value_counts().to_dict()}")

        return df

    def train(self, force: bool = False) -> Dict:
        """Train the quality scorer model."""
        if not ML_AVAILABLE:
            return {'error': 'ML libraries not installed'}

        if self.is_loaded and not force:
            return {'status': 'already_trained', 'metadata': self.metadata}

        print("[ML] Training quality scorer...")

        df = self._fetch_training_data()
        if df is None:
            return {'error': 'Failed to fetch training data'}

        # Extract features
        text_features = pd.DataFrame([
            self._extract_text_features(j)
            for j in df['justification']
        ])

        # Encode categorical features
        self.pillar_encoder = LabelEncoder()
        self.result_encoder = LabelEncoder()

        df['pillar_encoded'] = self.pillar_encoder.fit_transform(df['pillar'])
        df['result_encoded'] = self.result_encoder.fit_transform(df['result'])
        df['is_essential_encoded'] = df['is_essential'].astype(int)

        # TF-IDF on justifications
        self.tfidf = TfidfVectorizer(max_features=100, ngram_range=(1, 2))
        tfidf_features = self.tfidf.fit_transform(df['justification'].fillna('')).toarray()

        # Combine all features
        categorical_features = df[['pillar_encoded', 'result_encoded', 'is_essential_encoded']].values
        X = np.hstack([text_features.values, categorical_features, tfidf_features])

        # Encode target
        quality_encoder = LabelEncoder()
        y = quality_encoder.fit_transform(df['quality'])

        # Train/test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        # Train model
        train_data = lgb.Dataset(X_train, label=y_train)
        test_data = lgb.Dataset(X_test, label=y_test, reference=train_data)

        params = {
            'objective': 'multiclass',
            'num_class': 3,
            'metric': 'multi_logloss',
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.05,
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
        y_pred = np.argmax(self.model.predict(X_test), axis=1)
        accuracy = accuracy_score(y_test, y_pred)

        # Save model
        MODEL_DIR.mkdir(parents=True, exist_ok=True)

        with open(MODEL_PATH, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'tfidf': self.tfidf,
                'pillar_encoder': self.pillar_encoder,
                'result_encoder': self.result_encoder,
            }, f)

        self.metadata = {
            'trained_at': datetime.now().isoformat(),
            'samples': len(df),
            'accuracy': float(accuracy),
            'quality_distribution': df['quality'].value_counts().to_dict(),
        }

        with open(METADATA_PATH, 'w') as f:
            json.dump(self.metadata, f, indent=2)

        self.is_loaded = True

        print(f"[ML] Training complete. Accuracy: {accuracy:.2%}")

        return {
            'status': 'trained',
            'accuracy': accuracy,
            'samples': len(df),
        }

    def predict(
        self,
        result: str,
        justification: str,
        pillar: str = 'S',
        is_essential: bool = False
    ) -> Dict:
        """
        Predict quality level for an evaluation.

        Args:
            result: Evaluation result (YES/YESp/NO/N/A/TBD)
            justification: Justification text
            pillar: Norm pillar (S/A/F/E)
            is_essential: Whether norm is essential

        Returns:
            Dict with quality level and confidence
        """
        if not self.is_loaded:
            # Fallback to heuristic scoring
            return self._heuristic_quality(result, justification, pillar, is_essential)

        if not ML_AVAILABLE:
            return self._heuristic_quality(result, justification, pillar, is_essential)

        try:
            # Extract features
            text_features = self._extract_text_features(justification)

            # Encode categorical
            try:
                pillar_encoded = self.pillar_encoder.transform([pillar])[0]
            except ValueError:
                pillar_encoded = 0

            try:
                result_encoded = self.result_encoder.transform([result])[0]
            except ValueError:
                result_encoded = 0

            # TF-IDF
            tfidf_features = self.tfidf.transform([justification or '']).toarray()

            # Combine
            X = np.hstack([
                list(text_features.values()),
                [pillar_encoded, result_encoded, int(is_essential)],
                tfidf_features.flatten()
            ]).reshape(1, -1)

            # Predict
            probs = self.model.predict(X)[0]
            predicted_class = np.argmax(probs)
            confidence = float(probs[predicted_class])

            return {
                'quality': self.QUALITY_LEVELS[predicted_class],
                'confidence': confidence,
                'probabilities': {
                    'LOW': float(probs[0]),
                    'MEDIUM': float(probs[1]),
                    'HIGH': float(probs[2]),
                }
            }

        except Exception as e:
            print(f"[ML] Prediction error: {e}")
            return self._heuristic_quality(result, justification, pillar, is_essential)

    def _heuristic_quality(
        self,
        result: str,
        justification: str,
        pillar: str,
        is_essential: bool
    ) -> Dict:
        """Fallback heuristic-based quality prediction."""
        row = {
            'result': result,
            'justification': justification,
            'pillar': pillar,
            'is_essential': is_essential,
        }
        quality = self._label_quality(row)

        return {
            'quality': quality,
            'confidence': 0.7 if quality == 'MEDIUM' else 0.6,
            'method': 'heuristic',
        }

    def needs_review(
        self,
        result: str,
        justification: str,
        pillar: str = 'S',
        is_essential: bool = False
    ) -> bool:
        """
        Check if an evaluation needs manual review.

        Returns True for LOW quality or low confidence evaluations.
        """
        prediction = self.predict(result, justification, pillar, is_essential)

        return (
            prediction['quality'] == 'LOW' or
            prediction.get('confidence', 0) < 0.6
        )


# Global singleton
_scorer = None

def get_quality_scorer() -> EvaluationQualityScorer:
    """Get or create the global quality scorer instance."""
    global _scorer
    if _scorer is None:
        _scorer = EvaluationQualityScorer()
    return _scorer


def predict_evaluation_quality(
    result: str,
    justification: str,
    pillar: str = 'S',
    is_essential: bool = False
) -> Dict:
    """
    Convenience function to predict evaluation quality.
    """
    scorer = get_quality_scorer()
    return scorer.predict(result, justification, pillar, is_essential)


# CLI interface
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Evaluation Quality Scorer")
    parser.add_argument("--train", action="store_true", help="Train the model")
    parser.add_argument("--evaluate", type=str, help="Evaluate justification text")
    parser.add_argument("--result", type=str, default="YES", help="Evaluation result")
    parser.add_argument("--force", action="store_true", help="Force retraining")

    args = parser.parse_args()

    scorer = EvaluationQualityScorer()

    if args.train:
        result = scorer.train(force=args.force)
        print(json.dumps(result, indent=2))

    elif args.evaluate:
        result = scorer.predict(args.result, args.evaluate)
        print(json.dumps(result, indent=2))

    else:
        parser.print_help()
