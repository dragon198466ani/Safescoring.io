#!/usr/bin/env python3
"""
SAFESCORING.IO - Web Scraper Module
Centralized web scraping for product documentation.
Supports: HTML sites, SPAs (Playwright), GitHub, external docs
"""

import ipaddress
import socket
import requests
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

    # Blocked hostnames/patterns for SSRF protection
    BLOCKED_HOSTS = {
        'localhost', '127.0.0.1', '0.0.0.0', '::1',
        'metadata.google.internal', 'metadata.google',
    }

    def __init__(self):
        self.cache = {}  # Cache for scraped content
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        }

    @staticmethod
    def _is_safe_url(url):
        """Validate URL to prevent SSRF attacks (internal network, cloud metadata, etc.)."""
        try:
            parsed = urlparse(url)
            if parsed.scheme not in ('http', 'https'):
                return False
            hostname = parsed.hostname
            if not hostname:
                return False
            # Block known dangerous hostnames
            if hostname in WebScraper.BLOCKED_HOSTS:
                return False
            # Block AWS/GCP/Azure metadata endpoints
            if hostname.startswith('169.254.') or hostname == '169.254.169.254':
                return False
            # Resolve hostname and check for private/reserved IPs
            try:
                resolved = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
                for _, _, _, _, addr in resolved:
                    ip = ipaddress.ip_address(addr[0])
                    if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local:
                        return False
            except (socket.gaierror, ValueError):
                return False
            return True
        except (ValueError, socket.error):
            return False

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

        if not self._is_safe_url(url):
            print(f"   Blocked unsafe URL: {url}")
            return None

        # Cache check
        if product_id and product_id in self.cache:
            return self.cache[product_id]

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

                if not self._is_safe_url(current_url):
                    continue

                try:
                    r = requests.get(current_url, timeout=10, headers=self.headers)

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

                except (requests.RequestException, ValueError, UnicodeDecodeError) as e:
                    print(f"   Scraping error: {e}")

            # 2. SCRAPE EXTERNAL DOCS
            for doc_url in list(docs_urls)[:3]:
                if doc_url in visited_urls:
                    continue
                visited_urls.add(doc_url)

                if not self._is_safe_url(doc_url):
                    continue

                try:
                    r = requests.get(doc_url, timeout=10, headers=self.headers)
                    if r.status_code == 200:
                        parser = LinkAndTextExtractor(doc_url)
                        parser.feed(r.text)
                        page_content = ' '.join(parser.text)
                        if page_content:
                            all_content.append(f"[DOCS] {page_content[:5000]}")
                            sources_count['docs'] += 1
                except (requests.RequestException, ValueError, UnicodeDecodeError) as e:
                    print(f"   Scraping error: {e}")

            # 3. SCRAPE GITHUB README
            for gh_url in list(github_urls)[:2]:
                if gh_url in visited_urls:
                    continue
                visited_urls.add(gh_url)

                if not self._is_safe_url(gh_url):
                    continue

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

                except (requests.RequestException, ValueError, UnicodeDecodeError) as e:
                    print(f"   Scraping error: {e}")

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
                    except (requests.RequestException, ValueError, UnicodeDecodeError) as e:
                        print(f"   Scraping error: {e}")

            # Combine content
            content = '\n\n'.join(all_content)

            # If too short, try Playwright for SPA
            if len(content) < 500:
                print(f"   Only {len(content)} chars - trying Playwright...")
                playwright_content = self._scrape_with_playwright(url)
                if playwright_content and len(playwright_content) > len(content):
                    content = playwright_content
                    sources_count['site'] = 1

            # Limit size
            content = content[:max_chars]

            # Cache result
            if product_id:
                self.cache[product_id] = content

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
            print(f"   Unexpected scraping error: {type(e).__name__}: {e}")

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

    def clear_cache(self):
        """Clear the scraping cache."""
        self.cache = {}


# Global instance
web_scraper = WebScraper()
