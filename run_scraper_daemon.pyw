"""Daemon scraper - runs without console window"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Redirect output to file
sys.stdout = open('scraper_daemon.log', 'w', encoding='utf-8')
sys.stderr = sys.stdout

from src.automation.norm_doc_scraper import NormDocScraper
from src.core.config import (
    NVIDIA_API_KEYS, GROQ_API_KEYS, SAMBANOVA_API_KEYS,
    CEREBRAS_API_KEYS, GEMINI_API_KEYS
)

print('=' * 50)
print('SAFESCORING SCRAPER DAEMON')
print('=' * 50)
print(f'Groq: {len(GROQ_API_KEYS)} keys (14,400 req/jour)')
print(f'SambaNova: {len(SAMBANOVA_API_KEYS)} keys (ILLIMITÉ)')
print(f'Cerebras: {len(CEREBRAS_API_KEYS)} keys (ILLIMITÉ)')
print(f'NVIDIA: {len(NVIDIA_API_KEYS)} keys (backup)')
print(f'Gemini: {len(GEMINI_API_KEYS)} keys (désactivé)')
print('=' * 50)

# Calculate theoretical RPM
rpm = len(GROQ_API_KEYS)*30 + len(SAMBANOVA_API_KEYS)*25 + len(CEREBRAS_API_KEYS)*30
print(f'RPM théorique max: {rpm}')

# Adapter workers selon Groq disponible
# - Groq actif: 8 workers (rapide, laisse marge)
# - Groq épuisé: 2 workers (évite saturation rate limits SambaNova/Cerebras)
groq_exhausted = os.path.exists('config/.groq_quota_exhausted')
workers = 2 if groq_exhausted else 8
print(f'Workers: {workers} (Groq {"épuisé" if groq_exhausted else "actif"})')
sys.stdout.flush()

scraper = NormDocScraper()
scraper.run_parallel(workers=workers, skip_existing=True)
