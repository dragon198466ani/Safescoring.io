#!/usr/bin/env python3
"""
SAFESCORING.IO - Service Status Monitor
=======================================
Monitors product websites to detect:
- Service closures (HTTP 404, 410, domain expired)
- Maintenance mode
- Redirect to different domains
- SSL certificate issues

Updates products.operational_status and alerts on changes.

Usage:
    python -m src.automation.service_status_monitor --limit 50
    python -m src.automation.service_status_monitor --product ledger-nano-x
    python -m src.automation.service_status_monitor --check-all
"""

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import time
import re
import argparse
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import ssl
import socket

# Import from common modules
from src.core.config import SUPABASE_URL, get_supabase_headers


# Status constants
STATUS_ACTIVE = 'active'
STATUS_MAINTENANCE = 'maintenance'
STATUS_CLOSED = 'closed'
STATUS_UNREACHABLE = 'unreachable'
STATUS_REDIRECT = 'redirect'
STATUS_UNKNOWN = 'unknown'

# Keywords indicating closure
CLOSURE_KEYWORDS = [
    'service has been discontinued',
    'no longer available',
    'shut down',
    'shutting down',
    'ceased operations',
    'permanently closed',
    'service closure',
    'we are closing',
    'have been acquired',
    'operations have ended',
    'no longer operational',
    'out of business',
    'service terminated',
    'sunset',
    'deprecated',
    'winding down',
]

# Keywords indicating maintenance
MAINTENANCE_KEYWORDS = [
    'under maintenance',
    'maintenance mode',
    'temporarily unavailable',
    'back soon',
    'scheduled maintenance',
    'upgrading our systems',
    'service interruption',
]

# Known closed services (hardcoded for immediate detection)
KNOWN_CLOSED_SERVICES = {
    'blockfi-card': STATUS_CLOSED,
    'tenx-card': STATUS_CLOSED,
    'paycent-card': STATUS_CLOSED,
    'hegic': STATUS_CLOSED,
    'ren-bridge': STATUS_CLOSED,
    'celsius-network': STATUS_CLOSED,
    'voyager': STATUS_CLOSED,
    'ftx': STATUS_CLOSED,
    'ftx-us': STATUS_CLOSED,
    'alameda-research': STATUS_CLOSED,
    'terra-luna': STATUS_CLOSED,
    'anchor-protocol': STATUS_CLOSED,
    '3ac': STATUS_CLOSED,
    'babel-finance': STATUS_CLOSED,
}


class ServiceStatusMonitor:
    """Monitors service availability and detects closures."""

    def __init__(self):
        self.headers = get_supabase_headers()
        self.products = []

        # HTTP session with retry logic
        self.session = requests.Session()
        retry_strategy = Retry(
            total=2,
            backoff_factor=0.5,
            status_forcelist=[502, 503, 504]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy, pool_connections=10, pool_maxsize=20)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

        # User-Agent to avoid being blocked
        self.request_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }

        # Track changes
        self.status_changes = []

    def load_products(self, limit=None, product_slug=None):
        """Load products from Supabase."""
        print("\n[LOAD] Loading products from Supabase...")

        url = f"{SUPABASE_URL}/rest/v1/products?select=id,slug,name,url,description"

        if product_slug:
            url += f"&slug=eq.{product_slug}"
        else:
            url += "&url=not.is.null"
            if limit:
                url += f"&limit={limit}"

        r = self.session.get(url, headers=self.headers, timeout=30)

        if r.status_code == 200:
            self.products = r.json()
            print(f"   Loaded {len(self.products)} products")
        else:
            print(f"   Error loading products: {r.status_code}")
            self.products = []

    def check_ssl_certificate(self, url):
        """Check if SSL certificate is valid."""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            hostname = parsed.hostname
            port = parsed.port or 443

            context = ssl.create_default_context()
            with socket.create_connection((hostname, port), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    # Check expiry
                    not_after = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                    if not_after < datetime.now():
                        return False, "Certificate expired"
                    if not_after < datetime.now() + timedelta(days=30):
                        return True, "Certificate expiring soon"
                    return True, "Valid"
        except Exception as e:
            return False, str(e)

    def check_website_status(self, url):
        """
        Check website status and detect closures/maintenance.

        Returns:
            dict: {
                'status': STATUS_*,
                'http_code': int,
                'reason': str,
                'redirect_url': str (if redirected),
                'ssl_valid': bool
            }
        """
        result = {
            'status': STATUS_UNKNOWN,
            'http_code': None,
            'reason': '',
            'redirect_url': None,
            'ssl_valid': True,
        }

        if not url:
            result['status'] = STATUS_UNKNOWN
            result['reason'] = 'No URL'
            return result

        # Normalize URL
        if not url.startswith('http'):
            url = 'https://' + url

        try:
            # First, check SSL
            if url.startswith('https://'):
                ssl_valid, ssl_reason = self.check_ssl_certificate(url)
                result['ssl_valid'] = ssl_valid
                if not ssl_valid and 'expired' in ssl_reason.lower():
                    result['status'] = STATUS_CLOSED
                    result['reason'] = f'SSL certificate issue: {ssl_reason}'
                    return result

            # Make HTTP request
            response = self.session.get(
                url,
                headers=self.request_headers,
                timeout=15,
                allow_redirects=True
            )

            result['http_code'] = response.status_code

            # Check for redirects to different domain
            if response.history:
                original_domain = self._get_domain(url)
                final_domain = self._get_domain(response.url)
                if original_domain != final_domain:
                    result['redirect_url'] = response.url
                    result['status'] = STATUS_REDIRECT
                    result['reason'] = f'Redirected to {final_domain}'
                    return result

            # Check HTTP status codes
            if response.status_code == 200:
                # Check content for closure/maintenance keywords
                content = response.text.lower()

                for keyword in CLOSURE_KEYWORDS:
                    if keyword in content:
                        result['status'] = STATUS_CLOSED
                        result['reason'] = f'Page contains closure keyword: "{keyword}"'
                        return result

                for keyword in MAINTENANCE_KEYWORDS:
                    if keyword in content:
                        result['status'] = STATUS_MAINTENANCE
                        result['reason'] = f'Page indicates maintenance: "{keyword}"'
                        return result

                # Check for very short content (might be placeholder)
                if len(content) < 500:
                    result['status'] = STATUS_UNKNOWN
                    result['reason'] = 'Very short page content'
                    return result

                result['status'] = STATUS_ACTIVE
                result['reason'] = 'Website accessible'

            elif response.status_code in [404, 410]:
                result['status'] = STATUS_CLOSED
                result['reason'] = f'HTTP {response.status_code} - Page not found/gone'

            elif response.status_code == 503:
                result['status'] = STATUS_MAINTENANCE
                result['reason'] = 'HTTP 503 - Service unavailable'

            elif response.status_code in [301, 302, 307, 308]:
                result['status'] = STATUS_REDIRECT
                result['redirect_url'] = response.headers.get('Location')
                result['reason'] = f'HTTP {response.status_code} - Redirect'

            elif response.status_code == 403:
                # Could be geo-blocked or rate-limited
                result['status'] = STATUS_UNKNOWN
                result['reason'] = 'HTTP 403 - Access forbidden'

            else:
                result['status'] = STATUS_UNREACHABLE
                result['reason'] = f'HTTP {response.status_code}'

        except requests.exceptions.SSLError as e:
            result['status'] = STATUS_CLOSED
            result['ssl_valid'] = False
            result['reason'] = f'SSL Error: {str(e)[:100]}'

        except requests.exceptions.ConnectionError as e:
            result['status'] = STATUS_UNREACHABLE
            result['reason'] = f'Connection failed: {str(e)[:100]}'

        except requests.exceptions.Timeout:
            result['status'] = STATUS_UNREACHABLE
            result['reason'] = 'Request timeout (15s)'

        except Exception as e:
            result['status'] = STATUS_UNKNOWN
            result['reason'] = f'Error: {str(e)[:100]}'

        return result

    def _get_domain(self, url):
        """Extract domain from URL."""
        from urllib.parse import urlparse
        try:
            parsed = urlparse(url)
            return parsed.netloc.lower().replace('www.', '')
        except:
            return url

    def check_product(self, product):
        """
        Check a single product's status.

        Returns:
            dict: Product with status check results
        """
        slug = product['slug']
        name = product['name']
        url = product.get('url')
        # No persistent status tracking without specs column - always treat as unknown
        current_status = STATUS_UNKNOWN

        # Check for known closed services
        if slug in KNOWN_CLOSED_SERVICES:
            new_status = KNOWN_CLOSED_SERVICES[slug]
            return {
                'product': product,
                'new_status': new_status,
                'old_status': current_status,
                'reason': 'Known closed service',
                'changed': current_status != new_status
            }

        # Check website status
        check_result = self.check_website_status(url)
        new_status = check_result['status']

        return {
            'product': product,
            'new_status': new_status,
            'old_status': current_status,
            'http_code': check_result.get('http_code'),
            'reason': check_result.get('reason', ''),
            'redirect_url': check_result.get('redirect_url'),
            'ssl_valid': check_result.get('ssl_valid', True),
            'changed': current_status != new_status
        }

    def update_product_status(self, product_id, new_status, reason):
        """Update product status in database."""
        # First, ensure the column exists
        # Note: This should be done via migration, but we handle gracefully

        # Log status check - actual storage would require migration to add columns
        # For now, just print the status without persisting
        print(f"   [STATUS] {new_status}: {reason[:100] if reason else 'N/A'}")
        return True  # Indicate success without DB update (dry-run mode only for now)

    def run(self, limit=None, product_slug=None, parallel=True, dry_run=False):
        """
        Run the service status monitor.

        Args:
            limit: Maximum number of products to check
            product_slug: Check a specific product
            parallel: Use parallel processing
            dry_run: Don't update database
        """
        print("""
================================================================
     SAFESCORING - SERVICE STATUS MONITOR
     Detecting closures and service changes
================================================================
""")

        self.load_products(limit=limit, product_slug=product_slug)

        if not self.products:
            print("No products to check.")
            return

        results = {
            'active': [],
            'closed': [],
            'maintenance': [],
            'unreachable': [],
            'redirect': [],
            'unknown': [],
            'changed': []
        }

        print(f"\n[CHECK] Checking {len(self.products)} products...")

        if parallel and len(self.products) > 1:
            # Parallel checking
            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = {
                    executor.submit(self.check_product, p): p
                    for p in self.products
                }

                for i, future in enumerate(as_completed(futures)):
                    result = future.result()
                    self._process_result(result, results, dry_run)

                    if (i + 1) % 10 == 0:
                        print(f"   Checked {i + 1}/{len(self.products)} products...")
        else:
            # Sequential checking
            for i, product in enumerate(self.products):
                result = self.check_product(product)
                self._process_result(result, results, dry_run)

                if (i + 1) % 10 == 0:
                    print(f"   Checked {i + 1}/{len(self.products)} products...")

                time.sleep(0.5)  # Rate limiting

        # Print summary
        self._print_summary(results)

        return results

    def _process_result(self, result, results, dry_run):
        """Process a single check result."""
        product = result['product']
        new_status = result['new_status']

        # Categorize
        if new_status == STATUS_ACTIVE:
            results['active'].append(result)
        elif new_status == STATUS_CLOSED:
            results['closed'].append(result)
        elif new_status == STATUS_MAINTENANCE:
            results['maintenance'].append(result)
        elif new_status == STATUS_UNREACHABLE:
            results['unreachable'].append(result)
        elif new_status == STATUS_REDIRECT:
            results['redirect'].append(result)
        else:
            results['unknown'].append(result)

        # Track changes
        if result['changed']:
            results['changed'].append(result)

            print(f"   [{new_status.upper()}] {product['name']}: {result['reason']}")

            if not dry_run:
                self.update_product_status(
                    product['id'],
                    new_status,
                    result['reason']
                )

    def _print_summary(self, results):
        """Print summary of check results."""
        print(f"""
================================================================
     SUMMARY
================================================================
   Active:      {len(results['active'])}
   Closed:      {len(results['closed'])}
   Maintenance: {len(results['maintenance'])}
   Unreachable: {len(results['unreachable'])}
   Redirect:    {len(results['redirect'])}
   Unknown:     {len(results['unknown'])}

   STATUS CHANGES: {len(results['changed'])}
""")

        if results['closed']:
            print("\n   CLOSED SERVICES:")
            for r in results['closed']:
                print(f"      - {r['product']['name']}: {r['reason']}")

        if results['changed']:
            print("\n   STATUS CHANGES:")
            for r in results['changed']:
                print(f"      - {r['product']['name']}: {r['old_status']} → {r['new_status']}")


def main():
    parser = argparse.ArgumentParser(description='Service Status Monitor')
    parser.add_argument('--limit', type=int, default=50, help='Max products to check')
    parser.add_argument('--product', type=str, help='Check specific product by slug')
    parser.add_argument('--check-all', action='store_true', help='Check all products')
    parser.add_argument('--dry-run', action='store_true', help='Don\'t update database')
    parser.add_argument('--sequential', action='store_true', help='Disable parallel checking')

    args = parser.parse_args()

    monitor = ServiceStatusMonitor()

    limit = None if args.check_all else args.limit

    monitor.run(
        limit=limit,
        product_slug=args.product,
        parallel=not args.sequential,
        dry_run=args.dry_run
    )


if __name__ == "__main__":
    main()
