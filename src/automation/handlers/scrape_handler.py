"""
Scrape Handlers
===============
Gère le scraping des produits et des documents normes officiels.
"""

import os
import time
import hashlib
from datetime import datetime, timedelta

# ============================================
# SCRAPER (utilise le scraper existant)
# ============================================

try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

try:
    from fake_useragent import UserAgent
    ua = UserAgent()
except ImportError:
    ua = None

import requests


def scrape_url(url: str, use_js: bool = True) -> str:
    """Scrape une URL avec Playwright ou requests."""

    if use_js and PLAYWRIGHT_AVAILABLE:
        return _scrape_playwright(url)
    else:
        return _scrape_requests(url)


def _scrape_playwright(url: str) -> str:
    """Scrape avec Playwright (sites dynamiques JS)."""

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
            ]
        )

        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent=ua.random if ua else 'Mozilla/5.0 Chrome/120.0.0.0',
            locale='en-US',
        )

        # Anti-détection
        context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        """)

        page = context.new_page()

        try:
            page.goto(url, wait_until='networkidle', timeout=30000)
            page.wait_for_timeout(2000)

            # Scroll pour charger lazy content
            page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
            page.wait_for_timeout(1000)

            content = page.inner_text('body')
            return content

        except Exception as e:
            print(f"Playwright error: {e}")
            return ""
        finally:
            browser.close()


def _scrape_requests(url: str) -> str:
    """Scrape simple pour pages statiques."""

    try:
        headers = {
            'User-Agent': ua.random if ua else 'Mozilla/5.0 Chrome/120.0.0.0',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
        }

        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()

        # Parser HTML basique
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(response.text, 'html.parser')
            for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
                tag.decompose()
            content = soup.get_text(separator=' ', strip=True)
        except ImportError:
            content = response.text

        return content

    except Exception as e:
        print(f"Requests error: {e}")
        return ""


# ============================================
# CACHE UTILITIES
# ============================================

def get_cache(supabase, url: str) -> str:
    """Récupère contenu depuis cache si valide."""
    try:
        result = supabase.table('scrape_cache').select('content') \
            .eq('url', url) \
            .gt('expires_at', datetime.now().isoformat()) \
            .single() \
            .execute()
        return result.data['content'] if result.data else None
    except:
        return None


def set_cache(supabase, url: str, content: str, days: int = 7):
    """Sauvegarde dans cache."""
    try:
        supabase.table('scrape_cache').upsert({
            'url': url,
            'content': content,
            'content_hash': hashlib.md5(content.encode()).hexdigest(),
            'scraped_at': datetime.now().isoformat(),
            'expires_at': (datetime.now() + timedelta(days=days)).isoformat()
        }).execute()
    except Exception as e:
        print(f"Cache error: {e}")


# ============================================
# AI CLIENT (singleton)
# ============================================

_ai_client = None

def get_ai_client():
    """Récupère ou crée le client IA."""
    global _ai_client
    if _ai_client is None:
        from safescoring_automation_free import HybridAIClient, Config
        _ai_client = HybridAIClient(Config())
    return _ai_client


# ============================================
# HANDLERS
# ============================================

def handle_scrape_product(supabase, task: dict, add_task) -> dict:
    """
    Scrape les URLs d'un produit et extrait les specs.

    Flow:
    1. Récupère URLs du produit
    2. Scrape chaque URL (avec cache)
    3. Extrait specs avec IA
    4. Sauvegarde specs
    5. Déclenche évaluation
    """
    product_id = task['target_id']
    payload = task.get('payload', {})

    # Récupérer produit
    product = supabase.table('products').select('name, slug, urls, type_id') \
        .eq('id', product_id).single().execute()

    if not product.data:
        return {'error': 'Product not found'}

    urls = payload.get('urls') or product.data.get('urls') or []
    if isinstance(urls, str):
        urls = [urls]

    if not urls:
        return {'error': 'No URLs to scrape'}

    # Scraper toutes les URLs
    all_content = ""
    for url in urls:
        print(f"  Scraping: {url[:50]}...")

        # Vérifier cache
        cached = get_cache(supabase, url)
        if cached:
            print(f"  → Cache hit")
            all_content += cached + "\n\n"
        else:
            content = scrape_url(url)
            if content:
                set_cache(supabase, url, content)
                all_content += content + "\n\n"
                print(f"  → Scraped {len(content)} chars")

        time.sleep(2)  # Politesse

    if not all_content.strip():
        return {'error': 'No content scraped'}

    # Extraire specs avec IA
    print(f"  Extracting specs with AI...")
    ai = get_ai_client()
    specs = ai.extract_specs(all_content, product.data['name'])

    if specs:
        # Sauvegarder specs
        supabase.table('products').update({
            'specs': specs,
            'last_scraped_at': datetime.now().isoformat()
        }).eq('id', product_id).execute()

        # Déclencher évaluation si type défini
        if product.data.get('type_id'):
            add_task('evaluate_product', product_id, 'product', priority=3)
        else:
            add_task('classify_type', product_id, 'product', priority=2)

        return {'specs_extracted': len(specs), 'urls_scraped': len(urls)}
    else:
        return {'error': 'AI extraction failed'}


def handle_scrape_norm(supabase, task: dict, add_task) -> dict:
    """
    Scrape le document officiel d'une norme et génère un résumé.

    Flow:
    1. Scrape l'URL officielle
    2. Résume avec IA pour extraire critères d'évaluation
    3. Sauvegarde le résumé
    """
    norm_id = task['target_id']
    payload = task.get('payload', {})
    url = payload.get('url')

    if not url:
        # Récupérer URL depuis la norme
        norm = supabase.table('norms').select('official_url, code') \
            .eq('id', norm_id).single().execute()
        if norm.data:
            url = norm.data.get('official_url')

    if not url:
        return {'error': 'No URL to scrape'}

    # Récupérer info norme
    norm = supabase.table('norms').select('code, description') \
        .eq('id', norm_id).single().execute()

    print(f"  Scraping norm doc: {url[:50]}...")

    # Scraper (cache plus long pour normes officielles)
    cached = get_cache(supabase, url)
    if cached:
        content = cached
        print(f"  → Cache hit")
    else:
        content = scrape_url(url, use_js=False)  # Docs officiels souvent statiques
        if content:
            set_cache(supabase, url, content, days=30)  # Cache 30 jours

    if not content:
        return {'error': 'Scraping failed'}

    # Résumer avec IA
    print(f"  Summarizing with AI...")
    ai = get_ai_client()

    summary_prompt = f"""Analyse ce document officiel de norme/standard.

NORME: {norm.data['code']} - {norm.data['description']}

DOCUMENT:
{content[:20000]}

Extrais les CRITÈRES D'ÉVALUATION précis pour déterminer si un produit respecte cette norme.

Format de réponse:
## Critères pour YES (conforme):
- [critère 1]
- [critère 2]

## Critères pour NO (non conforme):
- [critère 1]
- [critère 2]

## Critères pour N/A (non applicable):
- [critère 1]

## Exemples de produits conformes:
- [exemple si disponible]
"""

    try:
        if ai.gemini:
            summary = ai.gemini._call(summary_prompt)
        elif ai.mistral:
            summary = ai.mistral._call(summary_prompt)
        else:
            summary = content[:5000]  # Fallback: juste tronquer
    except Exception as e:
        print(f"  AI error: {e}")
        summary = content[:5000]

    # Sauvegarder
    supabase.table('norms').update({
        'official_content': summary,
        'official_scraped_at': datetime.now().isoformat()
    }).eq('id', norm_id).execute()

    return {'summarized': True, 'summary_length': len(summary)}
