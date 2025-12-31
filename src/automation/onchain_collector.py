"""
SafeScoring - On-Chain Data Collector
Collects proprietary on-chain data that creates competitive moat.

Data collected:
- TVL (Total Value Locked) history
- Transaction volumes
- User counts
- Chain distribution
- Protocol health metrics
"""

import os
import json
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    from dotenv import load_dotenv
    # Try multiple .env locations
    env_paths = [
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', '.env'),
        os.path.join(os.path.dirname(__file__), '..', '..', '.env'),
        'config/.env',
        '.env'
    ]
    for env_path in env_paths:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            break
except ImportError:
    pass

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")


class OnChainCollector:
    """
    Collects on-chain data from multiple sources.
    This data enriches product profiles and creates unique insights.
    """

    def __init__(self):
        self.defillama_base = "https://api.llama.fi"
        self.headers = {
            "User-Agent": "SafeScoring/1.0 (Security Research)",
            "Accept": "application/json"
        }
        self.cache = {}

    def get_protocol_tvl(self, protocol_slug: str) -> Optional[Dict]:
        """
        Get TVL data for a specific protocol from DefiLlama.
        Returns current TVL + historical data.
        """
        try:
            response = requests.get(
                f"{self.defillama_base}/protocol/{protocol_slug}",
                headers=self.headers,
                timeout=30
            )

            if response.status_code != 200:
                return None

            data = response.json()

            # Handle TVL which can be a number or a list
            tvl_raw = data.get("tvl", 0)
            tvl_history = []

            if isinstance(tvl_raw, list):
                tvl_history = tvl_raw
                current_tvl = tvl_raw[-1].get("totalLiquidityUSD", 0) if tvl_raw else 0
            else:
                current_tvl = float(tvl_raw) if tvl_raw else 0

            # Safe mcap/tvl ratio
            mcap = data.get("mcap", 0) or 0
            tvl_for_ratio = max(current_tvl, 1)

            # Extract key metrics
            result = {
                "protocol": protocol_slug,
                "name": data.get("name", protocol_slug),
                "current_tvl": current_tvl,
                "tvl_change_1d": self._calculate_change(tvl_history, 1),
                "tvl_change_7d": self._calculate_change(tvl_history, 7),
                "tvl_change_30d": self._calculate_change(tvl_history, 30),
                "chains": list(data.get("chainTvls", {}).keys()),
                "chain_tvls": data.get("chainTvls", {}),
                "category": data.get("category", "Unknown"),
                "audits": data.get("audits", []),
                "audit_count": len(data.get("audits", [])),
                "mcap_tvl_ratio": mcap / tvl_for_ratio,
                "twitter": data.get("twitter"),
                "url": data.get("url"),
                "collected_at": datetime.now().isoformat(),
            }

            # Get TVL history for charts
            if tvl_history:
                result["tvl_history"] = [
                    {"date": item.get("date"), "tvl": item.get("totalLiquidityUSD")}
                    for item in tvl_history[-90:]  # Last 90 days
                ]

            return result

        except Exception as e:
            print(f"[DefiLlama] Error fetching {protocol_slug}: {e}")
            return None

    def get_all_protocols_tvl(self) -> List[Dict]:
        """Get TVL ranking for all protocols."""
        try:
            response = requests.get(
                f"{self.defillama_base}/protocols",
                headers=self.headers,
                timeout=60
            )

            if response.status_code != 200:
                return []

            protocols = response.json()

            # Extract key metrics for each
            results = []
            for p in protocols[:500]:  # Top 500
                results.append({
                    "slug": p.get("slug"),
                    "name": p.get("name"),
                    "tvl": p.get("tvl", 0),
                    "change_1d": p.get("change_1d"),
                    "change_7d": p.get("change_7d"),
                    "chains": p.get("chains", []),
                    "category": p.get("category"),
                })

            return results

        except Exception as e:
            print(f"[DefiLlama] Error fetching all protocols: {e}")
            return []

    def get_chain_tvl(self, chain: str) -> Optional[Dict]:
        """Get TVL data for a specific blockchain."""
        try:
            response = requests.get(
                f"{self.defillama_base}/v2/historicalChainTvl/{chain}",
                headers=self.headers,
                timeout=30
            )

            if response.status_code != 200:
                return None

            data = response.json()

            if not data:
                return None

            current_tvl = data[-1].get("tvl", 0) if data else 0
            week_ago_tvl = data[-7].get("tvl", 0) if len(data) >= 7 else current_tvl

            return {
                "chain": chain,
                "current_tvl": current_tvl,
                "change_7d": ((current_tvl - week_ago_tvl) / max(week_ago_tvl, 1)) * 100,
                "history": data[-30:],  # Last 30 days
                "collected_at": datetime.now().isoformat(),
            }

        except Exception as e:
            print(f"[DefiLlama] Error fetching chain {chain}: {e}")
            return None

    def get_dex_volumes(self) -> List[Dict]:
        """Get DEX trading volumes."""
        try:
            response = requests.get(
                f"{self.defillama_base}/overview/dexs",
                headers=self.headers,
                timeout=30
            )

            if response.status_code != 200:
                return []

            data = response.json()
            protocols = data.get("protocols", [])

            return [
                {
                    "name": p.get("name"),
                    "slug": p.get("slug"),
                    "volume_24h": p.get("total24h", 0),
                    "volume_7d": p.get("total7d", 0),
                    "change_1d": p.get("change_1d"),
                    "chains": p.get("chains", []),
                }
                for p in protocols[:100]
            ]

        except Exception as e:
            print(f"[DefiLlama] Error fetching DEX volumes: {e}")
            return []

    def get_lending_data(self) -> List[Dict]:
        """Get lending protocol data."""
        try:
            response = requests.get(
                f"{self.defillama_base}/lends",
                headers=self.headers,
                timeout=30
            )

            if response.status_code != 200:
                return []

            protocols = response.json()

            return [
                {
                    "name": p.get("name"),
                    "slug": p.get("slug"),
                    "total_supplied": p.get("totalSupplyUsd", 0),
                    "total_borrowed": p.get("totalBorrowUsd", 0),
                    "utilization": p.get("totalBorrowUsd", 0) / max(p.get("totalSupplyUsd", 1), 1),
                    "chains": p.get("chains", []),
                }
                for p in protocols[:50]
            ]

        except Exception as e:
            print(f"[DefiLlama] Error fetching lending data: {e}")
            return []

    def get_stablecoin_data(self) -> List[Dict]:
        """Get stablecoin market data."""
        try:
            response = requests.get(
                f"{self.defillama_base}/stablecoins",
                headers=self.headers,
                timeout=30
            )

            if response.status_code != 200:
                return []

            data = response.json()
            stables = data.get("peggedAssets", [])

            return [
                {
                    "name": s.get("name"),
                    "symbol": s.get("symbol"),
                    "circulating": s.get("circulating", {}).get("peggedUSD", 0),
                    "price": s.get("price", 1),
                    "peg_deviation": abs(1 - s.get("price", 1)),
                    "chains": list(s.get("chainCirculating", {}).keys()),
                }
                for s in stables[:30]
            ]

        except Exception as e:
            print(f"[DefiLlama] Error fetching stablecoin data: {e}")
            return []

    def get_yields_data(self, protocol_slug: str = None) -> List[Dict]:
        """Get yield/APY data for protocols."""
        try:
            response = requests.get(
                f"{self.defillama_base}/pools",
                headers=self.headers,
                timeout=60
            )

            if response.status_code != 200:
                return []

            data = response.json()
            pools = data.get("data", [])

            # Filter by protocol if specified
            if protocol_slug:
                pools = [p for p in pools if p.get("project") == protocol_slug]

            return [
                {
                    "pool_id": p.get("pool"),
                    "project": p.get("project"),
                    "chain": p.get("chain"),
                    "symbol": p.get("symbol"),
                    "tvl": p.get("tvlUsd", 0),
                    "apy": p.get("apy", 0),
                    "apy_base": p.get("apyBase", 0),
                    "apy_reward": p.get("apyReward", 0),
                    "il_risk": p.get("ilRisk", "unknown"),
                }
                for p in pools[:200]
            ]

        except Exception as e:
            print(f"[DefiLlama] Error fetching yields: {e}")
            return []

    def _calculate_change(self, tvl_history, days: int) -> float:
        """Calculate percentage change over N days."""
        # Handle case where tvl is a number, not a list
        if not isinstance(tvl_history, list):
            return 0.0

        if not tvl_history or len(tvl_history) < days + 1:
            return 0.0

        try:
            current = tvl_history[-1].get("totalLiquidityUSD", 0) if isinstance(tvl_history[-1], dict) else 0
            past = tvl_history[-(days + 1)].get("totalLiquidityUSD", 0) if isinstance(tvl_history[-(days + 1)], dict) else 0

            if past == 0:
                return 0.0

            return ((current - past) / past) * 100
        except (TypeError, AttributeError):
            return 0.0

    def enrich_product_with_onchain(self, product_slug: str, defillama_slug: str = None) -> Dict:
        """
        Enrich a SafeScoring product with on-chain data.
        This creates PROPRIETARY data that competitors can't easily replicate.
        """
        slug = defillama_slug or product_slug

        # Collect all data
        protocol_data = self.get_protocol_tvl(slug)

        if not protocol_data:
            return {"error": f"Protocol {slug} not found on DefiLlama"}

        # Calculate health score based on on-chain metrics
        health_indicators = {
            "tvl_trend": "positive" if protocol_data.get("tvl_change_7d", 0) > 0 else "negative",
            "multi_chain": len(protocol_data.get("chains", [])) > 1,
            "has_audits": protocol_data.get("audit_count", 0) > 0,
            "tvl_stability": abs(protocol_data.get("tvl_change_7d", 0)) < 20,
        }

        health_score = sum([
            25 if health_indicators["tvl_trend"] == "positive" else 0,
            25 if health_indicators["multi_chain"] else 0,
            25 if health_indicators["has_audits"] else 0,
            25 if health_indicators["tvl_stability"] else 0,
        ])

        return {
            "product_slug": product_slug,
            "defillama_slug": slug,
            "onchain_data": protocol_data,
            "health_indicators": health_indicators,
            "health_score": health_score,
            "enriched_at": datetime.now().isoformat(),
        }

    def save_onchain_snapshot(self, product_id: int, data: Dict) -> bool:
        """
        Save on-chain data snapshot to database.
        Creates historical record for trend analysis.
        """
        if not SUPABASE_URL or not SUPABASE_KEY:
            print("[Supabase] Not configured")
            return False

        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
        }

        # Update product specs with on-chain data
        specs_update = {
            "onchain": {
                "tvl": data.get("onchain_data", {}).get("current_tvl"),
                "tvl_change_7d": data.get("onchain_data", {}).get("tvl_change_7d"),
                "chains": data.get("onchain_data", {}).get("chains"),
                "health_score": data.get("health_score"),
                "last_updated": datetime.now().isoformat(),
            }
        }

        try:
            # Get current specs
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/products",
                headers=headers,
                params={"id": f"eq.{product_id}", "select": "specs"},
                timeout=30
            )

            current_specs = {}
            if response.status_code == 200 and response.json():
                current_specs = response.json()[0].get("specs", {}) or {}

            # Merge specs
            current_specs.update(specs_update)

            # Update product
            response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/products",
                headers={**headers, "Prefer": "return=minimal"},
                params={"id": f"eq.{product_id}"},
                json={"specs": current_specs},
                timeout=30
            )

            return response.status_code in [200, 204]

        except Exception as e:
            print(f"[Supabase] Error saving snapshot: {e}")
            return False

    def run_full_collection(self, product_mappings: Dict[str, str] = None) -> Dict:
        """
        Run full on-chain data collection.

        Args:
            product_mappings: Dict mapping SafeScoring slugs to DefiLlama slugs
                             e.g., {"uniswap": "uniswap", "aave-v3": "aave"}
        """
        print("=" * 50)
        print("SafeScoring On-Chain Collector")
        print(f"Started at: {datetime.now().isoformat()}")
        print("=" * 50)

        results = {
            "protocols_enriched": 0,
            "dex_volumes": [],
            "lending_data": [],
            "total_tvl_tracked": 0,
            "timestamp": datetime.now().isoformat(),
        }

        # Collect market-wide data
        print("[1/4] Collecting DEX volumes...")
        results["dex_volumes"] = self.get_dex_volumes()

        print("[2/4] Collecting lending data...")
        results["lending_data"] = self.get_lending_data()

        print("[3/4] Collecting stablecoin data...")
        results["stablecoins"] = self.get_stablecoin_data()

        # Enrich specific products if mappings provided
        if product_mappings:
            print(f"[4/4] Enriching {len(product_mappings)} products...")

            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = {
                    executor.submit(self.enrich_product_with_onchain, slug, defillama_slug): slug
                    for slug, defillama_slug in product_mappings.items()
                }

                for future in as_completed(futures):
                    slug = futures[future]
                    try:
                        data = future.result()
                        if "error" not in data:
                            results["protocols_enriched"] += 1
                            tvl = data.get("onchain_data", {}).get("current_tvl", 0)
                            results["total_tvl_tracked"] += tvl
                    except Exception as e:
                        print(f"Error enriching {slug}: {e}")

        print("=" * 50)
        print(f"Collection complete: {results['protocols_enriched']} protocols enriched")
        print(f"Total TVL tracked: ${results['total_tvl_tracked']:,.0f}")
        print("=" * 50)

        return results


# Product slug mappings (SafeScoring -> DefiLlama)
DEFAULT_MAPPINGS = {
    "uniswap": "uniswap",
    "aave": "aave",
    "compound": "compound-finance",
    "makerdao": "makerdao",
    "lido": "lido",
    "curve": "curve-dex",
    "convex": "convex-finance",
    "yearn": "yearn-finance",
    "sushiswap": "sushiswap",
    "balancer": "balancer",
    "pancakeswap": "pancakeswap",
    "gmx": "gmx",
    "dydx": "dydx",
    "1inch": "1inch-network",
    "opensea": "opensea",
}


if __name__ == "__main__":
    collector = OnChainCollector()
    results = collector.run_full_collection(DEFAULT_MAPPINGS)
    print(json.dumps(results, indent=2, default=str))
