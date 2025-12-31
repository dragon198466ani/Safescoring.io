#!/usr/bin/env python3
"""
SAFESCORING.IO - Deep Scrape & Classify
Scraping approfondi avec recherche intelligente de pages produits.

Stratégie:
1. Page produit spécifique (URL générée à partir du nom)
2. Documentation officielle
3. GitHub README
4. Pages About/Features/Security
5. Recherche web si nécessaire

Usage:
    python deep_scrape_classify.py --limit 10
    python deep_scrape_classify.py --product "Ledger Nano X"
    python deep_scrape_classify.py --all
"""

import requests
import sys
import json
import time
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse, quote_plus

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from core.config import SUPABASE_URL, SUPABASE_HEADERS
from core.api_provider import AIProvider


class SmartHTMLParser(HTMLParser):
    """Extract text and links from HTML."""

    def __init__(self, base_url):
        super().__init__()
        self.base_url = base_url
        self.base_domain = urlparse(base_url).netloc
        self.text = []
        self.links = set()
        self.skip = False
        self.title = ""
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        if tag in ['script', 'style', 'nav', 'footer', 'noscript', 'iframe', 'header']:
            self.skip = True
        if tag == 'title':
            self.in_title = True
        if tag == 'a':
            for attr, value in attrs:
                if attr == 'href' and value:
                    full_url = urljoin(self.base_url, value)
                    if not any(x in full_url for x in ['#', '.pdf', '.zip', 'mailto:', 'tel:', 'javascript:']):
                        self.links.add(full_url)

    def handle_endtag(self, tag):
        if tag in ['script', 'style', 'nav', 'footer', 'noscript', 'iframe', 'header']:
            self.skip = False
        if tag == 'title':
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data.strip()
        elif not self.skip:
            text = data.strip()
            if text and len(text) > 2:
                self.text.append(text)


class DeepScraper:
    """Intelligent deep scraper for product classification."""

    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    }

    # Keywords for important pages
    IMPORTANT_KEYWORDS = [
        'security', 'features', 'about', 'technology', 'how-it-works',
        'docs', 'documentation', 'faq', 'whitepaper', 'audit',
        'architecture', 'protocol', 'smart-contract', 'governance',
        'products', 'solutions', 'specifications', 'overview'
    ]

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(self.HEADERS)
        self.playwright_available = False
        try:
            from playwright.sync_api import sync_playwright
            self.playwright_available = True
        except ImportError:
            pass

    def generate_product_urls(self, base_url: str, product_name: str) -> List[str]:
        """Generate potential product-specific URLs."""
        urls = []
        base = base_url.rstrip('/')

        # Clean product name for URL
        name_slug = product_name.lower()
        name_slug = re.sub(r'[^a-z0-9]+', '-', name_slug).strip('-')
        name_parts = product_name.lower().split()

        # Try various URL patterns
        patterns = [
            f"{base}/products/{name_slug}",
            f"{base}/product/{name_slug}",
            f"{base}/{name_slug}",
            f"{base}/wallets/{name_slug}",
            f"{base}/wallet/{name_slug}",
        ]

        # Add patterns based on name parts (e.g., "nano-x" for "Ledger Nano X")
        if len(name_parts) > 1:
            # Skip company name, use product model
            model_slug = '-'.join(name_parts[1:])
            patterns.extend([
                f"{base}/products/{model_slug}",
                f"{base}/{model_slug}",
            ])

        # Add documentation URLs
        patterns.extend([
            f"{base}/docs",
            f"{base}/documentation",
            f"{base}/learn",
            f"{base}/about",
            f"{base}/security",
            f"{base}/features",
        ])

        return patterns

    def fetch_page(self, url: str, timeout: int = 10) -> Tuple[Optional[str], Optional[str], List[str]]:
        """Fetch a page and return (content, title, links)."""
        try:
            r = self.session.get(url, timeout=timeout)
            if r.status_code == 200:
                parser = SmartHTMLParser(url)
                parser.feed(r.text)
                content = ' '.join(parser.text)
                return content, parser.title, list(parser.links)
        except Exception:
            pass
        return None, None, []

    def fetch_github_readme(self, github_url: str) -> Optional[str]:
        """Fetch GitHub README content."""
        try:
            parsed = urlparse(github_url)
            path_parts = parsed.path.strip('/').split('/')

            if len(path_parts) >= 2:
                owner, repo = path_parts[0], path_parts[1]
                readme_url = f"https://api.github.com/repos/{owner}/{repo}/readme"
                r = self.session.get(
                    readme_url,
                    timeout=10,
                    headers={'Accept': 'application/vnd.github.v3.raw'}
                )
                if r.status_code == 200:
                    return r.text[:8000]
            elif len(path_parts) == 1:
                # Just org name, get top repos
                owner = path_parts[0]
                repos_url = f"https://api.github.com/users/{owner}/repos?sort=stars&per_page=3"
                r = self.session.get(repos_url, timeout=10)
                if r.status_code == 200:
                    repos = r.json()
                    content = []
                    for repo in repos[:2]:
                        readme_url = f"https://api.github.com/repos/{owner}/{repo['name']}/readme"
                        r2 = self.session.get(
                            readme_url,
                            timeout=10,
                            headers={'Accept': 'application/vnd.github.v3.raw'}
                        )
                        if r2.status_code == 200:
                            content.append(f"[{repo['name']}] {r2.text[:4000]}")
                    return '\n\n'.join(content)
        except Exception:
            pass
        return None

    def fetch_with_playwright(self, url: str) -> Tuple[Optional[str], List[str]]:
        """Fetch SPA page using Playwright (for JavaScript-heavy sites)."""
        if not self.playwright_available:
            return None, []

        try:
            from playwright.sync_api import sync_playwright

            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                )
                page = context.new_page()

                page.goto(url, timeout=30000, wait_until='domcontentloaded')
                page.wait_for_timeout(3000)  # Wait for JS to render

                # Extract text content
                content = page.evaluate('''() => {
                    const remove = document.querySelectorAll('script, style, nav, footer, header, aside, iframe, noscript');
                    remove.forEach(el => el.remove());
                    const main = document.querySelector('main, article, .content, #content, .main') || document.body;
                    return main.innerText.substring(0, 25000);
                }''')

                # Extract links
                links = page.evaluate('''() => {
                    return Array.from(document.querySelectorAll('a[href]'))
                        .map(a => a.href)
                        .filter(h => h.startsWith('http'))
                        .slice(0, 50);
                }''')

                browser.close()
                return content, links

        except Exception as e:
            print(f"      [PW] Playwright error: {e}")
        return None, []

    def search_web(self, query: str) -> List[str]:
        """Search web for additional URLs (DuckDuckGo)."""
        try:
            url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
            r = self.session.get(url, timeout=10)
            if r.status_code == 200:
                # Extract result links
                links = re.findall(r'href="(https?://[^"]+)"', r.text)
                # Filter relevant links
                filtered = []
                for link in links[:10]:
                    if 'duckduckgo' not in link and 'google' not in link:
                        filtered.append(link)
                return filtered[:5]
        except Exception:
            pass
        return []

    def deep_scrape(self, product_name: str, base_url: str, max_pages: int = 15) -> Dict:
        """
        Deep scrape a product with intelligent URL discovery.
        Returns dict with content from multiple sources.
        """
        results = {
            'main_page': '',
            'product_page': '',
            'docs': '',
            'github': '',
            'additional': [],
            'sources': []
        }

        visited = set()
        all_content = []

        # 1. Main page (try basic, fallback to Playwright)
        print(f"      [1] Page principale: {base_url}")
        content, title, links = self.fetch_page(base_url)

        # Fallback to Playwright for SPA sites
        if not content or len(content) < 200:
            if self.playwright_available:
                print(f"      [PW] SPA détecté, utilisation Playwright...")
                pw_content, pw_links = self.fetch_with_playwright(base_url)
                if pw_content and len(pw_content) > len(content or ''):
                    content = pw_content
                    links = pw_links
                    print(f"      [PW] {len(content)} chars récupérés")

        if content:
            results['main_page'] = content[:5000]
            results['sources'].append(('main', base_url, len(content)))
            all_content.append(f"[MAIN] {content[:5000]}")
            visited.add(base_url)

        # 2. Try product-specific URLs
        product_urls = self.generate_product_urls(base_url, product_name)
        for url in product_urls:
            if url in visited or len(visited) >= max_pages:
                continue
            visited.add(url)

            content, title, _ = self.fetch_page(url)
            if content and len(content) > 500:
                print(f"      [+] Trouvé: {url[:60]}... ({len(content)} chars)")
                results['product_page'] += f"\n{content[:4000]}"
                results['sources'].append(('product', url, len(content)))
                all_content.append(f"[PRODUCT] {content[:4000]}")
                break  # Found product page

        # 3. Explore important links from main page
        if links:
            important_links = []
            for link in links:
                link_lower = link.lower()
                if any(kw in link_lower for kw in self.IMPORTANT_KEYWORDS):
                    # Prioritize links with product name
                    if product_name.lower().split()[0] in link_lower:
                        important_links.insert(0, link)
                    else:
                        important_links.append(link)

            for link in important_links[:5]:
                if link in visited or len(visited) >= max_pages:
                    continue
                visited.add(link)

                content, title, _ = self.fetch_page(link)
                if content and len(content) > 300:
                    page_name = urlparse(link).path.split('/')[-1] or 'page'
                    print(f"      [+] {page_name}: {len(content)} chars")
                    results['additional'].append(content[:3000])
                    results['sources'].append(('link', link, len(content)))
                    all_content.append(f"[{page_name.upper()}] {content[:3000]}")

        # 4. Look for GitHub
        github_links = [l for l in links if 'github.com' in l]
        if github_links:
            for gh_url in github_links[:2]:
                print(f"      [G] GitHub: {gh_url[:50]}...")
                gh_content = self.fetch_github_readme(gh_url)
                if gh_content:
                    results['github'] += f"\n{gh_content}"
                    results['sources'].append(('github', gh_url, len(gh_content)))
                    all_content.append(f"[GITHUB] {gh_content}")

        # 5. Look for docs links
        doc_links = [l for l in links if any(d in l for d in ['docs.', 'gitbook', 'notion', 'readme.io'])]
        for doc_url in doc_links[:2]:
            if doc_url in visited:
                continue
            visited.add(doc_url)
            print(f"      [D] Docs: {doc_url[:50]}...")
            content, _, _ = self.fetch_page(doc_url)
            if content:
                results['docs'] += f"\n{content[:5000]}"
                results['sources'].append(('docs', doc_url, len(content)))
                all_content.append(f"[DOCS] {content[:5000]}")

        # Combine all content
        results['combined'] = '\n\n---\n\n'.join(all_content)
        results['total_chars'] = len(results['combined'])

        return results


class DeepScrapeClassify:
    """Deep scrape and classify products."""

    # Keyword hints for pre-classification (helps guide AI)
    KEYWORD_HINTS = {
        'HW Cold': [
            'hardware wallet', 'cold storage', 'cold wallet', 'air-gapped', 'airgapped',
            'secure element', 'offline signing', 'physical device', 'usb device',
            'ledger nano', 'trezor', 'coldcard', 'keystone', 'bitbox', 'keepkey',
            'ngrave', 'tangem', 'dcent', "d'cent", 'safepal s1', 'jade wallet',
            'seedsigner', 'specter diy', 'passport', 'krux'
        ],
        'Bkp Physical': [
            'steel backup', 'metal backup', 'seed backup', 'recovery phrase backup',
            'steel plate', 'metal plate', 'titanium', 'fireproof', 'indestructible',
            'cryptosteel', 'billfodl', 'cryptotag', 'seedplate', 'cobo tablet',
            'hodlr', 'blockplate', 'steelwallet', 'coldbit'
        ],
        'Bridges': [
            'cross-chain bridge', 'bridge protocol', 'bridging', 'cross chain',
            'interoperability', 'chain agnostic', 'multichain', 'omnichain',
            'layerzero', 'wormhole', 'stargate', 'across', 'hop protocol',
            'connext', 'celer', 'synapse', 'li.fi', 'socket'
        ],
        'Derivatives': [
            'perpetual', 'perpetuals', 'perps', 'futures', 'options trading',
            'derivatives', 'leverage trading', 'margin trading', 'synthetic',
            'gmx', 'dydx', 'kwenta', 'gains network', 'dopex', 'lyra', 'hegic',
            'synthetix', 'pendle', 'ribbon'
        ],
        'Lending': [
            'lending protocol', 'borrowing', 'collateral', 'loan', 'borrow',
            'supply apy', 'borrow apy', 'liquidation', 'overcollateralized',
            'aave', 'compound', 'maker', 'venus', 'benqi', 'radiant'
        ],
        'DEX Agg': [
            'dex aggregator', 'aggregator', 'best price', 'optimal route',
            'swap aggregat', 'meta-aggregator', 'routing',
            '1inch', 'paraswap', 'kyberswap', 'jupiter', 'cowswap', 'odos'
        ],
        'Liq Staking': [
            'liquid staking', 'staking derivative', 'staked eth', 'steth',
            'liquid restaking', 'lsd', 'lst token',
            'lido', 'rocket pool', 'frax eth', 'marinade', 'jito'
        ],
        'Restaking': [
            'restaking', 'eigenlayer', 'avs', 'actively validated',
            'ether.fi', 'renzo', 'puffer', 'kelp', 'swell'
        ],
        'AA': [
            'account abstraction', 'erc-4337', 'eip-4337', 'bundler', 'paymaster',
            'user operation', 'smart account', 'gasless',
            'pimlico', 'biconomy', 'stackup', 'alchemy aa'
        ],
        'Card': [
            'crypto card', 'debit card', 'visa card', 'mastercard', 'spend crypto',
            'crypto.com card', 'binance card', 'coinbase card'
        ],
    }

    def __init__(self):
        self.ai = AIProvider()
        self.scraper = DeepScraper()

        # Data
        self.products = []
        self.product_types = {}
        self.type_by_code = {}
        self.current_mappings = {}

        # Stats
        self.stats = {
            'processed': 0,
            'updated': 0,
            'unchanged': 0,
            'errors': 0,
            'no_url': 0,
            'low_confidence': 0
        }

    def load_data(self):
        """Load data from Supabase."""
        print("\n[LOAD] Chargement des données...")

        # Product types
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,category,description&order=category,code",
            headers=SUPABASE_HEADERS
        )
        if r.status_code == 200:
            for t in r.json():
                self.product_types[t['id']] = t
                self.type_by_code[t['code']] = t['id']
            print(f"   {len(self.product_types)} types")

        # Products
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=id,name,url&order=name",
            headers=SUPABASE_HEADERS
        )
        if r.status_code == 200:
            self.products = r.json()
            print(f"   {len(self.products)} produits")

        # Current mappings
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id,is_primary",
            headers=SUPABASE_HEADERS
        )
        if r.status_code == 200:
            for m in r.json():
                pid = m['product_id']
                tid = m['type_id']
                if pid not in self.current_mappings:
                    self.current_mappings[pid] = []
                type_info = self.product_types.get(tid, {})
                if type_info:
                    self.current_mappings[pid].append(type_info.get('code', '?'))
            print(f"   {len(self.current_mappings)} mappings")

    def detect_keyword_hints(self, content: str, product_name: str) -> List[str]:
        """Detect likely types based on keywords in content."""
        content_lower = (content + ' ' + product_name).lower()
        hints = []
        scores = {}

        for type_code, keywords in self.KEYWORD_HINTS.items():
            score = 0
            for kw in keywords:
                if kw in content_lower:
                    # Weight by keyword specificity
                    score += 2 if len(kw) > 10 else 1
            if score >= 2:  # Threshold: at least 2 matches
                scores[type_code] = score

        # Sort by score and return top hints
        sorted_hints = sorted(scores.items(), key=lambda x: -x[1])
        hints = [h[0] for h in sorted_hints[:3]]

        return hints

    def get_system_prompt(self, keyword_hints: List[str] = None) -> str:
        """Build system prompt."""
        valid_codes = sorted(self.type_by_code.keys())
        codes_str = ", ".join([f'"{c}"' for c in valid_codes])

        hint_section = ""
        if keyword_hints:
            hint_section = f"""
⚠️ INDICES DÉTECTÉS: {', '.join(keyword_hints)}
Ces indices suggèrent le type probable. Vérifie si c'est correct.
"""

        return f"""Tu es un expert en classification de produits crypto.

# ⛔ RÈGLE CRITIQUE: UTILISE UNIQUEMENT CES CODES EXACTS
{codes_str}

INTERDIT: "Hardware", "Software", "DeFi", "Wallet", "Exchange" - ces mots ne sont PAS des codes valides!
{hint_section}
# GUIDE DE CLASSIFICATION

## 🔐 HARDWARE (appareils physiques)
| Code | Description | Exemples |
|------|-------------|----------|
| HW Cold | Hardware wallet OFFLINE avec écran, boutons, secure element | Ledger Nano X/S, Trezor T/One, Coldcard, Keystone, BitBox02, Jade, D'CENT, SafePal S1, Tangem, SeedSigner, Specter DIY |
| HW Hot | Hardware connecté en permanence | Rare |

⚠️ PIÈGE: Un hardware wallet avec app companion reste "HW Cold" (pas SW Desktop!)

## 💻 SOFTWARE
| Code | Description | Exemples |
|------|-------------|----------|
| SW Browser | Extension navigateur UNIQUEMENT | MetaMask, Rabby, Phantom, Keplr |
| SW Mobile | App mobile UNIQUEMENT | BlueWallet, Muun |
| SW Desktop | App desktop UNIQUEMENT | Electrum, Sparrow, Wasabi |
| MPC Wallet | Wallet avec MPC/TSS | ZenGo, Fireblocks |
| Smart Wallet | Smart contract wallet / AA | Safe, Argent, Sequence |
| MultiSig | Wallet multisig | Gnosis Safe (legacy) |

⚠️ PIÈGE: MetaMask extension = "SW Browser", MetaMask mobile = ajouter "SW Mobile"

## 🏦 EXCHANGE
| Code | Description | Exemples |
|------|-------------|----------|
| CEX | Exchange centralisé | Binance, Coinbase, Kraken |
| DEX | Exchange décentralisé (AMM/orderbook) | Uniswap, Curve, Raydium |
| DEX Agg | Aggregateur qui route vers plusieurs DEX | 1inch, Jupiter, ParaSwap, KyberSwap, CoW Swap |
| AMM | Automated Market Maker (souvent avec DEX) | Curve, Balancer |

⚠️ PIÈGE: 1inch/Jupiter = "DEX Agg" (PAS "DEX"!) - ils agrègent, ne font pas de market making

## 📈 DEFI PROTOCOLS
| Code | Description | Exemples |
|------|-------------|----------|
| Lending | Prêt/emprunt de crypto | Aave, Compound, MakerDAO, Venus |
| Yield | Yield farming/optimizer | Yearn, Beefy, Convex |
| Liq Staking | Liquid staking (stETH, etc.) | Lido, Rocket Pool, Marinade |
| Restaking | Re-staking de LST | EigenLayer, Ether.fi, Renzo |
| Derivatives | Perps/Futures/Options | GMX, dYdX, Kwenta, Gains, Dopex, Pendle |
| Bridges | Cross-chain bridges | Wormhole, LayerZero, Stargate, Across, Li.Fi, Connext |

⚠️ PIÈGES FRÉQUENTS:
- GMX = "Derivatives" (PAS "DEX"!) → perpetual trading
- LayerZero = "Bridges" (PAS "DEX Agg"!) → infrastructure de bridge
- Pendle = "Derivatives" (PAS "Yield"!) → yield tokenization/trading

## 🗄️ BACKUP
| Code | Description | Exemples |
|------|-------------|----------|
| Bkp Physical | Plaque métal/steel pour seed | Cryptosteel, Billfodl, Cryptotag, Keystone Tablet |
| Bkp Digital | Backup cloud/numérique | Ledger Recover |

⚠️ PIÈGE: Hardware wallet ≠ Backup métal! Ledger = "HW Cold", Cryptosteel = "Bkp Physical"

## 💳 FINANCIAL
| Code | Description | Exemples |
|------|-------------|----------|
| Card | Carte crypto CUSTODIAL | Crypto.com Card, Binance Card |
| Card Non-Cust | Carte NON-CUSTODIAL | Gnosis Pay |
| Custody | Custody institutionnel | BitGo, Anchorage |
| Crypto Bank | Banque crypto | Nexo, Seba |

## 🔧 INFRASTRUCTURE
| Code | Description | Exemples |
|------|-------------|----------|
| AA | Account Abstraction (ERC-4337) | Pimlico, Biconomy, Alchemy AA |
| Research | Analytics/Data | Nansen, Dune, Messari |
| DeFi Tools | Outils DeFi | DeBank, Zapper |

# RÈGLE MULTI-TYPE: Ajoute un 2ème type SI la fonction EXISTE dans le produit
- Ajoute un 2ème type si le produit offre VRAIMENT cette fonctionnalité
- Maximum 2 types par produit

✅ EXEMPLES CORRECTS:
- MetaMask → ["SW Browser", "SW Mobile"] (extension + app mobile existent)
- Uniswap → ["DEX", "AMM"] (échange décentralisé + automated market maker)
- OKX Wallet → ["SW Browser", "SW Mobile"] (extension + app mobile)
- Arculus → ["Card", "HW Cold"] (carte de paiement + hardware wallet)

❌ ERREURS:
- Aave → ["Lending", "DEX"] (FAUX - Aave fait du lending, pas d'exchange!)
- Ledger → ["HW Cold", "SW Desktop"] (FAUX - Ledger Live est un produit SÉPARÉ!)

# FORMAT JSON OBLIGATOIRE
Réponds UNIQUEMENT avec ce JSON (pas de texte avant/après):
{{"types": ["CODE_EXACT"], "confidence": "high|medium|low", "reason": "1 phrase"}}
"""

    def classify_with_ai(self, product: Dict, scraped_data: Dict, max_retries: int = 2) -> Optional[Dict]:
        """Classify product with AI, with validation and retry."""
        name = product['name']
        url = product.get('url', 'N/A')
        current_types = self.current_mappings.get(product['id'], [])

        # Build content summary
        content_parts = []
        if scraped_data.get('product_page'):
            content_parts.append(f"=== PAGE PRODUIT ===\n{scraped_data['product_page'][:4000]}")
        if scraped_data.get('main_page'):
            content_parts.append(f"=== PAGE PRINCIPALE ===\n{scraped_data['main_page'][:3000]}")
        if scraped_data.get('docs'):
            content_parts.append(f"=== DOCUMENTATION ===\n{scraped_data['docs'][:3000]}")
        if scraped_data.get('github'):
            content_parts.append(f"=== GITHUB ===\n{scraped_data['github'][:2000]}")

        combined_content = '\n\n'.join(content_parts)[:12000]

        # Detect keyword hints
        keyword_hints = self.detect_keyword_hints(combined_content, name)
        if keyword_hints:
            print(f"      [HINT] Indices détectés: {', '.join(keyword_hints)}")

        for attempt in range(max_retries):
            retry_note = ""
            if attempt > 0:
                retry_note = f"\n\n⚠️ TENTATIVE {attempt + 1}: Ta réponse précédente contenait des codes invalides. Utilise UNIQUEMENT les codes listés ci-dessus!"

            full_prompt = f"""{self.get_system_prompt(keyword_hints)}
{retry_note}
---

# PRODUIT À CLASSIFIER

**Nom:** {name}
**URL:** {url}
**Types actuels:** {', '.join(current_types) if current_types else 'Aucun'}

# CONTENU SCRAPPÉ

{combined_content}

# TÂCHE

Analyse le contenu et détermine le type EXACT pour "{name}".
Réponds avec le JSON uniquement: {{"types": ["CODE"], "confidence": "high", "reason": "..."}}
"""

            try:
                response = self.ai.call(full_prompt, max_tokens=500)
                if response:
                    json_match = re.search(r'\{[\s\S]*?\}', response)
                    if json_match:
                        result = json.loads(json_match.group())
                        raw_types = result.get('types', [])

                        # Validate types
                        valid_types = [t for t in raw_types if t in self.type_by_code]
                        invalid_types = [t for t in raw_types if t not in self.type_by_code]

                        if invalid_types:
                            print(f"      [RETRY] Types invalides: {invalid_types}")
                            continue  # Retry

                        if valid_types:
                            result['types'] = valid_types
                            return result

            except json.JSONDecodeError as e:
                print(f"      [RETRY] JSON invalide: {e}")
                continue
            except Exception as e:
                print(f"      [ERROR] AI: {e}")
                return None

        print(f"      [FAIL] Échec après {max_retries} tentatives")
        return None

    def update_supabase(self, product_id: int, type_codes: List[str]) -> bool:
        """Update product types in Supabase."""
        valid_codes = [c for c in type_codes if c in self.type_by_code]
        if not valid_codes:
            return False

        requests.delete(
            f"{SUPABASE_URL}/rest/v1/product_type_mapping?product_id=eq.{product_id}",
            headers=SUPABASE_HEADERS
        )

        for i, code in enumerate(valid_codes[:2]):
            data = {
                'product_id': product_id,
                'type_id': self.type_by_code[code],
                'is_primary': i == 0
            }
            r = requests.post(
                f"{SUPABASE_URL}/rest/v1/product_type_mapping",
                headers=SUPABASE_HEADERS,
                json=data
            )
            if r.status_code not in [200, 201]:
                return False
        return True

    def process_product(self, product: Dict) -> Dict:
        """Process a single product."""
        name = product['name']
        pid = product['id']
        url = product.get('url')
        current = self.current_mappings.get(pid, [])

        result = {
            'name': name,
            'current': current,
            'new': [],
            'status': 'unchanged',
            'sources': 0
        }

        if not url:
            result['status'] = 'no_url'
            self.stats['no_url'] += 1
            return result

        # Deep scrape
        print(f"   [SCRAPE] Deep scraping {name}...")
        scraped = self.scraper.deep_scrape(name, url)
        result['sources'] = len(scraped.get('sources', []))

        if scraped['total_chars'] < 200:
            print(f"   [WARN] Contenu insuffisant ({scraped['total_chars']} chars)")
            result['status'] = 'no_content'
            self.stats['errors'] += 1
            return result

        print(f"   [INFO] {scraped['total_chars']} chars de {result['sources']} sources")

        # AI classification
        print(f"   [AI] Classification...")
        ai_result = self.classify_with_ai(product, scraped)

        if not ai_result or 'types' not in ai_result:
            print(f"   [WARN] Pas de résultat IA")
            result['status'] = 'ai_error'
            self.stats['errors'] += 1
            return result

        raw_types = ai_result.get('types', [])
        new_types = [t for t in raw_types if t in self.type_by_code]
        invalid = [t for t in raw_types if t not in self.type_by_code]

        if invalid:
            print(f"   [WARN] Types invalides: {invalid}")

        if not new_types:
            print(f"   [WARN] Aucun type valide")
            result['status'] = 'no_valid_types'
            self.stats['errors'] += 1
            return result

        result['new'] = new_types
        result['confidence'] = ai_result.get('confidence', 'medium')
        result['reason'] = ai_result.get('reason', '')

        if set(new_types) == set(current):
            result['status'] = 'unchanged'
            self.stats['unchanged'] += 1
            print(f"   ✓ Inchangé: {' + '.join(current)}")
        else:
            # Check confidence - only update if high confidence
            confidence = result['confidence'].lower() if result.get('confidence') else 'medium'

            if confidence == 'low':
                result['status'] = 'low_confidence'
                self.stats['low_confidence'] += 1
                print(f"   ⚠️ SKIP (low confidence): {' + '.join(current) if current else '∅'} → {' + '.join(new_types)}")
                print(f"      Raison: {result.get('reason', 'N/A')[:80]}")
            elif self.update_supabase(pid, new_types):
                result['status'] = 'updated'
                self.stats['updated'] += 1
                conf_icon = "🔒" if confidence == "high" else "🔓"
                print(f"   {conf_icon} MAJ [{confidence}]: {' + '.join(current) if current else '∅'} → {' + '.join(new_types)}")
                if result.get('reason'):
                    print(f"      Raison: {result['reason'][:80]}")
            else:
                result['status'] = 'update_error'
                self.stats['errors'] += 1

        self.stats['processed'] += 1
        return result

    def run(self, product_filter: str = None, limit: int = 10, delay: float = 2.5):
        """Run the deep scrape and classify."""
        print("\n" + "=" * 70)
        print("   DEEP SCRAPE & CLASSIFY")
        print("   Scraping approfondi + Classification IA")
        print("=" * 70)
        print(f"   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        self.load_data()

        if product_filter:
            products = [p for p in self.products if product_filter.lower() in p['name'].lower()]
            print(f"\n[FILTER] {len(products)} produits: '{product_filter}'")
        else:
            products = self.products[:limit] if limit else self.products

        print(f"\n[START] {len(products)} produits")
        print("-" * 70)

        results = []
        for i, product in enumerate(products):
            print(f"\n[{i+1}/{len(products)}] {product['name']}")
            result = self.process_product(product)
            results.append(result)
            if i < len(products) - 1:
                time.sleep(delay)

        # Summary
        print("\n" + "=" * 70)
        print("   RÉSUMÉ")
        print("=" * 70)
        print(f"   Traités:       {self.stats['processed']}")
        print(f"   Mis à jour:    {self.stats['updated']}")
        print(f"   Inchangés:     {self.stats['unchanged']}")
        print(f"   Low confidence:{self.stats['low_confidence']}")
        print(f"   Erreurs:       {self.stats['errors']}")

        updates = [r for r in results if r['status'] == 'updated']
        if updates:
            print(f"\n   MISES À JOUR ({len(updates)}):")
            for u in updates:
                curr = ' + '.join(u['current']) if u['current'] else '∅'
                new = ' + '.join(u['new'])
                print(f"   • {u['name']}: {curr} → {new}")

        # Show low confidence items for manual review
        low_conf = [r for r in results if r['status'] == 'low_confidence']
        if low_conf:
            print(f"\n   ⚠️ À VÉRIFIER MANUELLEMENT ({len(low_conf)}):")
            for lc in low_conf:
                curr = ' + '.join(lc['current']) if lc['current'] else '∅'
                new = ' + '.join(lc['new'])
                print(f"   • {lc['name']}: {curr} → {new}? ({lc.get('reason', 'N/A')[:50]})")

        return results


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Deep Scrape & Classify')
    parser.add_argument('--product', type=str, help='Filter by product name')
    parser.add_argument('--limit', type=int, default=10, help='Number of products')
    parser.add_argument('--all', action='store_true', help='Process all products')
    parser.add_argument('--delay', type=float, default=2.5, help='Delay between products')
    args = parser.parse_args()

    classifier = DeepScrapeClassify()
    limit = None if args.all else args.limit
    classifier.run(product_filter=args.product, limit=limit, delay=args.delay)


if __name__ == "__main__":
    main()
