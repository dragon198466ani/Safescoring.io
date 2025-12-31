#!/usr/bin/env python3
"""
Populate Trustpilot and Reddit data for all products.
Creates cache tables and fetches social data.
"""

import requests
import sys
import time
import re
import json
from pathlib import Path
from urllib.parse import urlencode, quote_plus

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
from core.config import SUPABASE_URL, SUPABASE_HEADERS

# Headers for web requests
WEB_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

# Crypto subreddits
CRYPTO_SUBREDDITS = [
    "cryptocurrency", "defi", "ethereum", "bitcoin", "CryptoMarkets", "ethfinance"
]


def create_tables():
    """Create cache tables if they don't exist."""
    print("[1] Vérification des tables de cache...")

    # Check if tables exist by trying to query them
    for table in ['product_trustpilot', 'product_reddit']:
        r = requests.get(f'{SUPABASE_URL}/rest/v1/{table}?limit=1', headers=SUPABASE_HEADERS)
        if r.status_code == 404:
            print(f"   ⚠️ Table '{table}' n'existe pas - créez-la manuellement avec le SQL")
            print(f"   Exécutez: scripts/create_social_tables.sql dans Supabase SQL Editor")
            return False

    print("   ✓ Tables existantes")
    return True


def get_trustpilot_data(product_name: str, product_url: str) -> dict:
    """Fetch Trustpilot data for a product."""
    result = {
        'score': None,
        'total_reviews': 0,
        'trustpilot_url': None,
        'recent_reviews': []
    }

    # Generate possible domains to check
    domains = []

    # From URL
    if product_url:
        try:
            from urllib.parse import urlparse
            parsed = urlparse(product_url)
            hostname = parsed.netloc.replace("www.", "")
            domains.append(hostname)
            # Also try base domain
            parts = hostname.split(".")
            if len(parts) > 2:
                domains.append(".".join(parts[-2:]))
        except:
            pass

    # From product name
    clean_name = re.sub(r'[^a-z0-9\s]', '', product_name.lower()).strip()
    name_no_spaces = clean_name.replace(" ", "")
    name_hyphen = clean_name.replace(" ", "-")

    for tld in ['com', 'io', 'org', 'finance', 'exchange', 'app']:
        domains.append(f"{name_no_spaces}.{tld}")
        if name_hyphen != name_no_spaces:
            domains.append(f"{name_hyphen}.{tld}")

    # First word of name
    if " " in clean_name:
        first_word = clean_name.split()[0]
        domains.append(f"{first_word}.com")
        domains.append(f"{first_word}.io")

    # Remove duplicates
    domains = list(dict.fromkeys(domains))

    # Try each domain
    for domain in domains[:10]:  # Limit to first 10
        try:
            url = f"https://www.trustpilot.com/review/{domain}"
            r = requests.get(url, headers=WEB_HEADERS, timeout=10)

            if r.status_code != 200:
                continue

            html = r.text

            # Check if valid page
            if "reviews" not in html.lower():
                continue

            # Extract score
            score_match = re.search(r'"ratingValue":\s*"?([0-9.]+)"?', html)
            if not score_match:
                score_match = re.search(r'TrustScore[^0-9]*([0-9.]+)', html)

            # Extract review count
            count_match = re.search(r'"reviewCount":\s*"?([0-9,]+)"?', html)
            if not count_match:
                count_match = re.search(r'([\d,]+)\s*(?:total\s*)?reviews?', html, re.I)

            if score_match:
                score = float(score_match.group(1))
                if 1 <= score <= 5:
                    result['score'] = score
                    result['trustpilot_url'] = url
                    if count_match:
                        result['total_reviews'] = int(count_match.group(1).replace(',', ''))

                    # Extract recent reviews from JSON-LD
                    reviews = []
                    review_pattern = r'"@type"\s*:\s*"Review"[^}]*"reviewBody"\s*:\s*"([^"]{10,300})"[^}]*"author"[^}]*"name"\s*:\s*"([^"]+)"[^}]*"reviewRating"[^}]*"ratingValue"\s*:\s*"?(\d)"?'
                    review_matches = re.findall(review_pattern, html, re.DOTALL)

                    for text, author, rating in review_matches[:5]:
                        reviews.append({
                            'text': text.replace('\\n', ' ').strip()[:200],
                            'author': author,
                            'rating': int(rating),
                            'date': ''
                        })

                    # Alternative: simple extraction
                    if not reviews:
                        simple_pattern = r'<p[^>]*class="[^"]*typography_body[^"]*"[^>]*>([^<]{20,200})</p>'
                        simple_matches = re.findall(simple_pattern, html)
                        for i, text in enumerate(simple_matches[:5]):
                            reviews.append({
                                'text': text.strip()[:200],
                                'author': f'User {i+1}',
                                'rating': round(score),
                                'date': ''
                            })

                    result['recent_reviews'] = reviews
                    return result

        except Exception as e:
            continue

    return result


def get_reddit_data(product_name: str, slug: str) -> dict:
    """Fetch Reddit data for a product."""
    result = {
        'total_mentions': 0,
        'sentiment': {'positive': 0, 'neutral': 100, 'negative': 0},
        'posts': []
    }

    # Generate search variants
    variants = [
        product_name.lower(),
        product_name.lower().replace(" ", ""),
        slug
    ]

    # Handle suffixes
    for suffix in ['protocol', 'finance', 'swap', 'exchange', 'network']:
        if product_name.lower().endswith(suffix):
            base = product_name.lower().replace(suffix, "").strip()
            if len(base) >= 3:
                variants.append(base)

    variants = list(set(variants))

    all_posts = []

    # Search crypto subreddits
    for subreddit in CRYPTO_SUBREDDITS[:3]:  # Limit to 3 subreddits
        try:
            search_url = f"https://old.reddit.com/r/{subreddit}/search.json"
            params = {
                'q': product_name,
                'restrict_sr': '1',
                'sort': 'relevance',
                'limit': '25',
                't': 'year'
            }
            r = requests.get(search_url, params=params, headers={
                **WEB_HEADERS,
                "Accept": "application/json"
            }, timeout=10)

            if r.status_code != 200:
                continue

            data = r.json()
            children = data.get('data', {}).get('children', [])

            for child in children:
                post_data = child.get('data', {})
                title = post_data.get('title', '').lower()

                # Check if relevant
                is_relevant = any(v in title for v in variants)
                if not is_relevant:
                    continue

                # Sentiment analysis
                text = title + " " + post_data.get('selftext', '')
                sentiment = analyze_sentiment(text)

                all_posts.append({
                    'title': post_data.get('title', ''),
                    'subreddit': post_data.get('subreddit', ''),
                    'score': post_data.get('score', 0),
                    'comments': post_data.get('num_comments', 0),
                    'url': f"https://reddit.com{post_data.get('permalink', '')}",
                    'created': post_data.get('created_utc', 0),
                    'sentiment': sentiment
                })

            time.sleep(0.5)  # Rate limiting

        except Exception as e:
            continue

    # Deduplicate
    seen_urls = set()
    unique_posts = []
    for post in all_posts:
        if post['url'] not in seen_urls:
            seen_urls.add(post['url'])
            unique_posts.append(post)

    if unique_posts:
        # Calculate sentiment
        sentiments = [p['sentiment'] for p in unique_posts]
        total = len(sentiments)
        pos = sum(1 for s in sentiments if s == 'positive')
        neg = sum(1 for s in sentiments if s == 'negative')
        neu = total - pos - neg

        result['total_mentions'] = total
        result['sentiment'] = {
            'positive': round(pos / total * 100),
            'neutral': round(neu / total * 100),
            'negative': round(neg / total * 100)
        }
        result['posts'] = sorted(unique_posts, key=lambda x: x['created'], reverse=True)[:5]

    return result


def analyze_sentiment(text: str) -> str:
    """Analyze sentiment of text."""
    text_lower = text.lower()

    positive_words = [
        "great", "amazing", "love", "best", "excellent", "awesome", "good",
        "secure", "safe", "trust", "reliable", "bullish", "gem", "legit"
    ]
    negative_words = [
        "bad", "terrible", "worst", "hate", "scam", "fraud", "hack", "hacked",
        "stolen", "avoid", "warning", "rug", "ponzi", "exploit", "rekt"
    ]

    pos_score = sum(1 for w in positive_words if w in text_lower)
    neg_score = sum(1 for w in negative_words if w in text_lower)

    if pos_score > neg_score + 1:
        return "positive"
    if neg_score > pos_score + 1:
        return "negative"
    return "neutral"


def save_trustpilot(product_id: int, data: dict):
    """Save Trustpilot data to database."""
    payload = {
        'product_id': product_id,
        'score': data['score'],
        'total_reviews': data['total_reviews'],
        'trustpilot_url': data['trustpilot_url'],
        'recent_reviews': data['recent_reviews']  # Direct array for JSONB
    }

    # Upsert
    headers = {**SUPABASE_HEADERS, 'Prefer': 'resolution=merge-duplicates'}
    r = requests.post(
        f'{SUPABASE_URL}/rest/v1/product_trustpilot',
        headers=headers,
        json=payload
    )
    return r.status_code in [200, 201]


def save_reddit(product_id: int, data: dict):
    """Save Reddit data to database."""
    payload = {
        'product_id': product_id,
        'total_mentions': data['total_mentions'],
        'sentiment': data['sentiment'],  # Direct object for JSONB
        'posts': data['posts']  # Direct array for JSONB
    }

    # Upsert
    headers = {**SUPABASE_HEADERS, 'Prefer': 'resolution=merge-duplicates'}
    r = requests.post(
        f'{SUPABASE_URL}/rest/v1/product_reddit',
        headers=headers,
        json=payload
    )
    return r.status_code in [200, 201]


def main():
    print("=" * 60)
    print("   POPULATION DES DONNÉES SOCIALES")
    print("=" * 60)
    print()

    # Check tables
    if not create_tables():
        print("\n⚠️ Créez les tables d'abord avec le script SQL")
        return

    # Load products
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,url&order=name', headers=SUPABASE_HEADERS)
    products = r.json()
    print(f"\n[2] {len(products)} produits à traiter\n")

    # Process each product
    stats = {
        'trustpilot_found': 0,
        'reddit_found': 0,
        'errors': 0
    }

    for i, product in enumerate(products, 1):
        name = product['name']
        slug = product['slug']
        url = product.get('url', '')

        print(f"[{i}/{len(products)}] {name}...")

        try:
            # Trustpilot
            tp_data = get_trustpilot_data(name, url)
            if save_trustpilot(product['id'], tp_data):
                if tp_data['score']:
                    print(f"   ✓ Trustpilot: {tp_data['score']}/5 ({tp_data['total_reviews']} avis)")
                    stats['trustpilot_found'] += 1
                else:
                    print(f"   - Trustpilot: non trouvé")

            # Reddit
            reddit_data = get_reddit_data(name, slug)
            if save_reddit(product['id'], reddit_data):
                if reddit_data['total_mentions'] > 0:
                    print(f"   ✓ Reddit: {reddit_data['total_mentions']} mentions, {len(reddit_data['posts'])} posts")
                    stats['reddit_found'] += 1
                else:
                    print(f"   - Reddit: aucune mention")

        except Exception as e:
            print(f"   ✗ Erreur: {e}")
            stats['errors'] += 1

        # Rate limiting (Reddit needs more delay)
        time.sleep(1.5)

    print()
    print("=" * 60)
    print("   RÉSUMÉ")
    print("=" * 60)
    print(f"   Trustpilot trouvé: {stats['trustpilot_found']}/{len(products)}")
    print(f"   Reddit trouvé: {stats['reddit_found']}/{len(products)}")
    print(f"   Erreurs: {stats['errors']}")


if __name__ == "__main__":
    main()
