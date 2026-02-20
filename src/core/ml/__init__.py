"""
SAFESCORING.IO - Proprietary ML Models

This module contains SafeScoring's proprietary machine learning models
that create a competitive moat by reducing API dependencies and
providing unique prediction capabilities.

Models:
- ApplicabilityClassifier: Predicts which norms apply to product types
- EvaluationQualityScorer: Predicts confidence level of AI evaluations
- IncidentPredictor: Predicts probability of security incidents (NEW)
- DataPipeline: Feature extraction for ML training (NEW)
- FeatureEngineering: Feature engineering utilities (NEW)
"""

from .applicability_classifier import (
    ApplicabilityClassifier,
    get_classifier,
    predict_applicability,
)

from .evaluation_quality_scorer import (
    EvaluationQualityScorer,
    get_quality_scorer,
    predict_evaluation_quality,
)

# New incident prediction models
try:
    from .data_pipeline import DataPipeline
    from .feature_engineering import FeatureEngineering
    from .incident_predictor import IncidentPredictor, predict_incident_probability
except ImportError:
    # Models not yet available
    DataPipeline = None
    FeatureEngineering = None
    IncidentPredictor = None
    predict_incident_probability = None

__all__ = [
    'ApplicabilityClassifier',
    'get_classifier',
    'predict_applicability',
    'EvaluationQualityScorer',
    'get_quality_scorer',
    'predict_evaluation_quality',
    # New exports
    'DataPipeline',
    'FeatureEngineering',
    'IncidentPredictor',
    'predict_incident_probability',
]
