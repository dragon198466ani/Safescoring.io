"""
Run scraper independently - survives disconnection
Usage: python run_scraper_background.py
"""
import sys
sys.path.insert(0, '.')
from src.automation.norm_doc_scraper import NormDocScraper
from src.core.config import NVIDIA_API_KEYS, GROQ_API_KEYS

print(f'=== SCRAPER AUTONOME ===')
print(f'NVIDIA: {len(NVIDIA_API_KEYS)} clés')
print(f'Groq: {len(GROQ_API_KEYS)} clés')
print()

scraper = NormDocScraper()
scraper.run_parallel(workers=6, skip_existing=True)
