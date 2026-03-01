#!/usr/bin/env python3
"""
SAFESCORING.IO - Web Scraper Module
Centralized web scraping for product documentation.
Supports: HTML sites, SPAs (Playwright), GitHub, external docs
"""

import requests
import sqlite3
import os
import time as _time
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse


class LinkAndTextExtractor(HTMLParser):
    """HTML parser that extracts text and links."""

    def __init__(self, base_url):
        super().__init__()
        self.base_url = base_url
        self.base_domain = urlparse(base_url).netloc
        self.text = []
        self.links = set()
        self.external_docs = set()
        self.github_links = set()
        self.skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ['script', 'style', 'nav', 'footer', 'noscript', 'iframe']:
            self.skip = True

        if tag == 'a':
            for attr, value in attrs:
                if attr == 'href' and value:
                    full_url = urljoin(self.base_url, value)
                    parsed = urlparse(full_url)

                    if 'github.com' in parsed.netloc:
                        self.github_links.add(full_url)
                    elif any(doc in parsed.netloc for doc in ['docs.', 'gitbook.io', 'notion.', 'readme.io', 'gitbook.com']):
                        self.external_docs.add(full_url)
                    elif parsed.netloc == self.base_domain or not parsed.netloc:
                        if not any(x in full_url for x in ['#', '.pdf', '.zip', 'mailto:', 'tel:', 'javascript:']):
                            self.links.add(full_url)

    def handle_endtag(self, tag):
        if tag in ['script', 'style', 'nav', 'footer', 'noscript', 'iframe']:
            self.skip = False

    def handle_data(self, data):
        if not self.skip:
            text = data.strip()
            if text and len(text) > 2:
                self.text.append(text)


class WebScraper:
    """Web scraper for product documentation."""

    # Important pages to search (keywords in URLs)
    IMPORTANT_KEYWORDS = [
        'security', 'secure', 'safety', 'protection', 'privacy',
        'features', 'feature', 'specs', 'specifications',
        'about', 'technology', 'tech', 'how-it-works',
        'docs', 'documentation', 'faq', 'help', 'support',
        'audit', 'audits', 'certif', 'compliance', 'transparency',
        'backup', 'recovery', 'seed', 'wallet', 'whitepaper',
        'architecture', 'protocol', 'smart-contract', 'governance'
    ]

    # Common docs subdomain patterns to try
    DOCS_SUBDOMAIN_PATTERNS = [
        'docs.{domain}',
        'documentation.{domain}',
        'wiki.{domain}',
        'support.{domain}',
        'learn.{domain}',
        'help.{domain}',
    ]

    # Persistent cache TTL (7 days)
    CACHE_TTL_SECONDS = 7 * 24 * 3600

    def __init__(self):
        self.cache = {}  # In-memory cache for current session
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        }
        # Alternative headers for sites that block common user agents
        self._alt_headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        }
        # Persistent SQLite cache
        self._db_path = self._init_persistent_cache()

    def _init_persistent_cache(self):
        """Initialize SQLite persistent cache for scraped content."""
        cache_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'cache')
        os.makedirs(cache_dir, exist_ok=True)
        db_path = os.path.join(cache_dir, 'scraping_cache.db')
        try:
            with sqlite3.connect(db_path) as conn:
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS scrape_cache (
                        product_id INTEGER PRIMARY KEY,
                        content TEXT NOT NULL,
                        content_length INTEGER,
                        scraped_at REAL NOT NULL
                    )
                ''')
                conn.commit()
        except sqlite3.Error as e:
            print(f"   [CACHE] SQLite init error: {e}")
            return None
        return db_path

    def _get_cached_content(self, product_id):
        """Get cached content if fresh (within TTL)."""
        if not self._db_path or not product_id:
            return None
        try:
            with sqlite3.connect(self._db_path) as conn:
                cursor = conn.execute(
                    'SELECT content, scraped_at FROM scrape_cache WHERE product_id = ?',
                    (product_id,)
                )
                row = cursor.fetchone()
                if row:
                    content, scraped_at = row
                    age = _time.time() - scraped_at
                    if age < self.CACHE_TTL_SECONDS:
                        return content
        except sqlite3.Error:
            pass
        return None

    def _save_cached_content(self, product_id, content):
        """Save scraped content to persistent cache."""
        if not self._db_path or not product_id or not content:
            return
        try:
            with sqlite3.connect(self._db_path) as conn:
                conn.execute(
                    'INSERT OR REPLACE INTO scrape_cache (product_id, content, content_length, scraped_at) VALUES (?, ?, ?, ?)',
                    (product_id, content, len(content), _time.time())
                )
                conn.commit()
        except sqlite3.Error:
            pass

    def scrape_product(self, product, max_pages=12, max_chars=20000):
        """
        Scrape complete product content from multiple sources.
        Returns scraped content or None.
        """
        description = product.get('description') or ''
        if '[CLOSED]' in description:
            print(f"   Skipping closed service")
            return f"[CLOSED SERVICE] {description}"

        url = product.get('url')
        product_id = product.get('id')
        specs = product.get('specs') or {}
        doc_urls = specs.get('doc_urls') or {}

        if not url:
            return None

        # In-memory cache check (current session)
        if product_id and product_id in self.cache:
            return self.cache[product_id]

        # Persistent SQLite cache check (across sessions, TTL 7 days)
        cached = self._get_cached_content(product_id)
        if cached:
            self.cache[product_id] = cached  # Promote to in-memory
            print(f"   [CACHE HIT] {len(cached)} chars (persistent cache)")
            return cached

        all_content = []
        visited_urls = set()
        sources_count = {'site': 0, 'docs': 0, 'github': 0}

        # Priority pages to visit
        base_url = url.rstrip('/')
        priority_pages = [
            url,
            f"{base_url}/security",
            f"{base_url}/audits",
            f"{base_url}/audit",
            f"{base_url}/docs",
            f"{base_url}/about",
            f"{base_url}/features",
            f"{base_url}/portfolio",
            f"{base_url}/wallet",
            f"{base_url}/privacy",
            f"{base_url}/terms",
        ]
        urls_to_visit = priority_pages.copy()
        github_urls = set()
        docs_urls = set()

        try:
            # 1. SCRAPE MAIN SITE
            while urls_to_visit and len(visited_urls) < max_pages:
                current_url = urls_to_visit.pop(0)

                if current_url in visited_urls:
                    continue

                visited_urls.add(current_url)

                try:
                    r = requests.get(current_url, timeout=15, headers=self.headers)

                    # Retry with alternative headers on 403/406
                    if r.status_code in [403, 406]:
                        r = requests.get(current_url, timeout=15, headers=self._alt_headers)

                    if r.status_code == 200:
                        parser = LinkAndTextExtractor(current_url)
                        parser.feed(r.text)

                        github_urls.update(parser.github_links)
                        docs_urls.update(parser.external_docs)

                        page_content = ' '.join(parser.text)
                        if page_content:
                            page_name = urlparse(current_url).path.split('/')[-1] or 'home'
                            all_content.append(f"[SITE:{page_name}] {page_content[:4000]}")
                            sources_count['site'] += 1

                        for link in parser.links:
                            if link not in visited_urls:
                                link_lower = link.lower()
                                if any(kw in link_lower for kw in self.IMPORTANT_KEYWORDS):
                                    urls_to_visit.append(link)
                    elif r.status_code != 404:
                        print(f"   HTTP {r.status_code} for {current_url[:60]}")

                except requests.exceptions.Timeout:
                    print(f"   Timeout: {current_url[:60]}")
                except Exception as e:
                    print(f"   Error scraping {current_url[:40]}: {type(e).__name__}")

            # 2. SCRAPE EXTERNAL DOCS
            for doc_url in list(docs_urls)[:3]:
                if doc_url in visited_urls:
                    continue
                visited_urls.add(doc_url)

                try:
                    r = requests.get(doc_url, timeout=10, headers=self.headers)
                    if r.status_code == 200:
                        parser = LinkAndTextExtractor(doc_url)
                        parser.feed(r.text)
                        page_content = ' '.join(parser.text)
                        if page_content:
                            all_content.append(f"[DOCS] {page_content[:5000]}")
                            sources_count['docs'] += 1
                except Exception:
                    pass

            # 3. SCRAPE GITHUB README
            for gh_url in list(github_urls)[:2]:
                if gh_url in visited_urls:
                    continue
                visited_urls.add(gh_url)

                try:
                    parsed = urlparse(gh_url)
                    path_parts = parsed.path.strip('/').split('/')

                    if len(path_parts) >= 2:
                        owner, repo = path_parts[0], path_parts[1]

                        readme_url = f"https://api.github.com/repos/{owner}/{repo}/readme"
                        r = requests.get(readme_url, timeout=10, headers={'Accept': 'application/vnd.github.v3.raw'})

                        if r.status_code == 200:
                            readme_content = r.text[:6000]
                            all_content.append(f"[GITHUB:{repo}] {readme_content}")
                            sources_count['github'] += 1
                        else:
                            r = requests.get(gh_url, timeout=10, headers=self.headers)
                            if r.status_code == 200:
                                parser = LinkAndTextExtractor(gh_url)
                                parser.feed(r.text)
                                page_content = ' '.join(parser.text)
                                if page_content:
                                    all_content.append(f"[GITHUB:{repo}] {page_content[:4000]}")
                                    sources_count['github'] += 1

                except Exception:
                    pass

            # 4. USE DOC_URLS FROM SUPABASE
            if doc_urls:
                for url_type, doc_url in doc_urls.items():
                    if doc_url in visited_urls:
                        continue
                    visited_urls.add(doc_url)

                    try:
                        if 'github.com' in doc_url and url_type == 'github':
                            parsed = urlparse(doc_url)
                            path_parts = parsed.path.strip('/').split('/')
                            if len(path_parts) >= 1:
                                owner = path_parts[0]
                                repos_url = f"https://api.github.com/users/{owner}/repos?sort=stars&per_page=3"
                                r = requests.get(repos_url, timeout=10)
                                if r.status_code == 200:
                                    repos = r.json()
                                    for repo in repos[:2]:
                                        readme_url = f"https://api.github.com/repos/{owner}/{repo['name']}/readme"
                                        r2 = requests.get(readme_url, timeout=10, headers={'Accept': 'application/vnd.github.v3.raw'})
                                        if r2.status_code == 200:
                                            all_content.append(f"[GITHUB:{repo['name']}] {r2.text[:5000]}")
                                            sources_count['github'] += 1
                        else:
                            r = requests.get(doc_url, timeout=10, headers=self.headers)
                            if r.status_code == 200:
                                parser = LinkAndTextExtractor(doc_url)
                                parser.feed(r.text)
                                page_content = ' '.join(parser.text)
                                if page_content:
                                    all_content.append(f"[{url_type.upper()}] {page_content[:5000]}")
                                    sources_count['docs'] += 1
                    except Exception:
                        pass

            # Combine content
            content = '\n\n'.join(all_content)

            # Try docs subdomains if we got very little content
            if len(content) < 3000:
                parsed_url = urlparse(url)
                domain = parsed_url.netloc.replace('www.', '')
                for pattern in self.DOCS_SUBDOMAIN_PATTERNS:
                    docs_sub_url = f"https://{pattern.format(domain=domain)}"
                    if docs_sub_url not in visited_urls:
                        try:
                            r = requests.get(docs_sub_url, timeout=10, headers=self.headers, allow_redirects=True)
                            if r.status_code == 200 and len(r.text) > 500:
                                parser = LinkAndTextExtractor(docs_sub_url)
                                parser.feed(r.text)
                                page_content = ' '.join(parser.text)
                                if page_content and len(page_content) > 200:
                                    all_content.append(f"[DOCS:{pattern.split('.')[0]}] {page_content[:5000]}")
                                    sources_count['docs'] += 1
                                    break  # Found docs, stop trying patterns
                        except Exception:
                            pass
                content = '\n\n'.join(all_content)[:max_chars]

            # If still too short, try Playwright for SPA
            if len(content) < 2000:
                print(f"   Only {len(content)} chars - trying Playwright...")
                playwright_content = self._scrape_with_playwright(url)
                if playwright_content and len(playwright_content) > len(content):
                    content = playwright_content
                    sources_count['site'] = 1

            # If still too short, try CoinGecko enrichment as last resort
            if len(content) < 1000:
                product_name = product.get('name', '')
                product_slug = product.get('slug', '')
                cg_content = self._enrich_with_coingecko(product_name, product_slug)
                if cg_content:
                    content = content + '\n\n' + cg_content if content else cg_content

            # Limit size
            content = content[:max_chars]

            # Cache result (in-memory + persistent)
            if product_id:
                self.cache[product_id] = content
                self._save_cached_content(product_id, content)

            # Display summary
            total_sources = sources_count['site'] + sources_count['docs'] + sources_count['github']
            if total_sources > 0:
                parts = []
                if sources_count['site'] > 0:
                    parts.append(f"{sources_count['site']} site")
                if sources_count['docs'] > 0:
                    parts.append(f"{sources_count['docs']} docs")
                if sources_count['github'] > 0:
                    parts.append(f"{sources_count['github']} github")
                print(f"   {' + '.join(parts)} = {len(content)} chars")

            return content

        except Exception as e:
            print(f"   Scraping error: {e}")

        return None

    def _scrape_with_playwright(self, url):
        """Fallback scraping with Playwright for SPA sites."""
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            print("   Playwright not installed")
            return None

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                )
                page = context.new_page()

                page.goto(url, timeout=30000, wait_until='domcontentloaded')
                page.wait_for_timeout(3000)

                content = page.evaluate('''() => {
                    const remove = document.querySelectorAll('script, style, nav, footer, header, aside, iframe, noscript');
                    remove.forEach(el => el.remove());

                    const main = document.querySelector('main, article, .content, #content, .main') || document.body;
                    return main.innerText.substring(0, 20000);
                }''')

                browser.close()
                print(f"   Playwright: {len(content)} chars")
                return content

        except Exception as e:
            print(f"   Playwright error: {e}")
            return None

    def _enrich_with_coingecko(self, product_name, product_slug=None):
        """Fallback enrichment via CoinGecko free API when scraping fails.
        Returns additional context about the crypto project or None."""
        try:
            # Search by name on CoinGecko
            search_term = product_slug or product_name.lower().replace(' ', '-')
            search_url = f"https://api.coingecko.com/api/v3/search?query={requests.utils.quote(product_name)}"
            r = requests.get(search_url, timeout=10, headers={
                'Accept': 'application/json',
                'User-Agent': 'SafeScoring/1.0'
            })

            if r.status_code != 200:
                return None

            data = r.json()
            coins = data.get('coins', [])
            if not coins:
                return None

            # Take best match
            coin = coins[0]
            coin_id = coin.get('id')
            if not coin_id:
                return None

            # Get detailed info
            detail_url = f"https://api.coingecko.com/api/v3/coins/{coin_id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=true&sparkline=false"
            r2 = requests.get(detail_url, timeout=10, headers={
                'Accept': 'application/json',
                'User-Agent': 'SafeScoring/1.0'
            })

            if r2.status_code != 200:
                return None

            info = r2.json()
            parts = []

            # Description
            desc = info.get('description', {}).get('en', '')
            if desc:
                # Strip HTML tags
                import re
                desc_clean = re.sub(r'<[^>]+>', '', desc)[:3000]
                parts.append(f"[COINGECKO:description] {desc_clean}")

            # Categories
            categories = info.get('categories', [])
            if categories:
                parts.append(f"[COINGECKO:categories] {', '.join(c for c in categories if c)}")

            # Platforms (blockchain deployments)
            platforms = info.get('platforms', {})
            if platforms:
                chains = [k for k in platforms.keys() if k]
                parts.append(f"[COINGECKO:platforms] {', '.join(chains)}")

            # Developer data (GitHub)
            dev = info.get('developer_data', {})
            if dev:
                repos = info.get('repos_url', {}).get('github', [])
                if repos:
                    parts.append(f"[COINGECKO:github] {', '.join(repos[:3])}")
                forks = dev.get('forks', 0)
                stars = dev.get('stars', 0)
                if forks or stars:
                    parts.append(f"[COINGECKO:dev] Stars: {stars}, Forks: {forks}")

            # Links
            links = info.get('links', {})
            homepage = links.get('homepage', [])
            if homepage and homepage[0]:
                parts.append(f"[COINGECKO:homepage] {homepage[0]}")

            if parts:
                content = '\n'.join(parts)
                print(f"   [COINGECKO] Enriched with {len(content)} chars")
                return content

        except Exception as e:
            print(f"   [COINGECKO] Error: {type(e).__name__}")

        return None

    def clear_cache(self):
        """Clear the scraping cache (in-memory only)."""
        self.cache = {}

    def clear_persistent_cache(self):
        """Clear the persistent SQLite cache."""
        if self._db_path:
            try:
                with sqlite3.connect(self._db_path) as conn:
                    conn.execute('DELETE FROM scrape_cache')
                    conn.commit()
                print("[CACHE] Persistent cache cleared")
            except sqlite3.Error:
                pass
        self.cache = {}


# Global instance
web_scraper = WebScraper()
