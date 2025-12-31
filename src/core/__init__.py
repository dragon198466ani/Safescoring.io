"""
SAFESCORING.IO - Core Module

WORKFLOW: Applicability (TRUE/FALSE) -> Smart Evaluator (YES/NO/N/A/TBD) -> Score Calculator

Main components:
- config: Configuration and API keys
- api_provider: AI API calls (DeepSeek, Claude, Gemini, Ollama, Mistral)
- scraper: Web scraping for product documentation
- smart_evaluator: Product evaluation with AI
- score_calculator: SAFE score calculation
- moat_manager: Score history tracking
"""

from .config import (
    SUPABASE_URL,
    SUPABASE_KEY,
    SUPABASE_HEADERS,
    get_supabase_headers,
)

from .api_provider import (
    AIProvider,
    ai_provider,
    parse_evaluation_response,
    parse_applicability_response,
)

from .scraper import (
    WebScraper,
    web_scraper,
)

from .smart_evaluator import SmartEvaluator
from .score_calculator import ScoreCalculator

__all__ = [
    # Config
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'SUPABASE_HEADERS',
    'get_supabase_headers',
    # AI
    'AIProvider',
    'ai_provider',
    'parse_evaluation_response',
    'parse_applicability_response',
    # Scraper
    'WebScraper',
    'web_scraper',
    # Main classes
    'SmartEvaluator',
    'ScoreCalculator',
]
