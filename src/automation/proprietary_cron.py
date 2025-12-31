"""
SafeScoring - Proprietary Data Cron
Runs automated data collection to build competitive moat.

GPT-PROOF SCHEDULE (Enhanced):
- Incidents: Every 15 minutes
- Hourly score snapshots: Every hour (THE CORE MOAT - 24x faster)
- On-chain metrics: Every hour
- Daily predictions: Daily at 06:00
- Market snapshots: Daily at midnight
- Score history (daily): Daily at 06:00

Each hour of data collection = 1 more hour competitors cannot replicate.
"""

import os
import sys
import json
import time
import schedule
from datetime import datetime
from typing import Dict

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load .env BEFORE importing other modules
try:
    from dotenv import load_dotenv
    env_paths = [
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', '.env'),
        os.path.join(os.path.dirname(__file__), '..', '..', '.env'),
        'config/.env',
        '.env'
    ]
    for env_path in env_paths:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            print(f"[Config] Loaded {env_path}")
            break
except ImportError:
    pass

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Now import modules (they will re-read env vars)
from automation.incident_scraper import IncidentScraper, match_incidents_to_products
from automation.onchain_collector import OnChainCollector, DEFAULT_MAPPINGS
from automation.score_tracker import ScoreTracker

# GPT-Proof collector for hourly snapshots
try:
    from automation.gpt_proof_collector import GPTProofCollector, run_hourly_collection, run_daily_collection
    GPT_PROOF_AVAILABLE = True
except ImportError:
    GPT_PROOF_AVAILABLE = False
    print("[Warning] GPT-Proof collector not available")

import requests


def log_collection(collection_type: str, results: Dict):
    """Log data collection to database."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print(f"[Log] {collection_type}: {results}")
        return

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

    log_entry = {
        "collection_type": collection_type,
        "run_date": datetime.now().isoformat(),
        "items_collected": results.get("total_scraped", results.get("protocols_enriched", 0)),
        "items_saved": results.get("saved_to_db", results.get("protocols_enriched", 0)),
        "errors_count": len(results.get("errors", [])),
        "duration_seconds": results.get("duration_seconds", 0),
    }

    try:
        requests.post(
            f"{SUPABASE_URL}/rest/v1/data_collection_logs",
            headers=headers,
            json=log_entry,
            timeout=30
        )
    except Exception as e:
        print(f"[Log] Error logging: {e}")


def job_scrape_incidents():
    """Scrape security incidents from all sources."""
    print(f"\n[{datetime.now()}] Running incident scraper...")
    start = time.time()

    try:
        scraper = IncidentScraper()
        results = scraper.run_full_scrape()
        match_incidents_to_products()

        results["duration_seconds"] = int(time.time() - start)
        log_collection("incidents", results)

        print(f"[Incidents] Completed in {results['duration_seconds']}s")
        return results

    except Exception as e:
        print(f"[Incidents] Error: {e}")
        log_collection("incidents", {"errors": [str(e)]})
        return {"error": str(e)}


def job_collect_onchain():
    """Collect on-chain data for all mapped products."""
    print(f"\n[{datetime.now()}] Running on-chain collector...")
    start = time.time()

    try:
        collector = OnChainCollector()

        # Get product mappings from database or use defaults
        mappings = get_product_mappings() or DEFAULT_MAPPINGS

        results = collector.run_full_collection(mappings)
        results["duration_seconds"] = int(time.time() - start)

        # Save snapshots to database
        save_onchain_snapshots(results)

        log_collection("onchain", results)
        print(f"[OnChain] Completed in {results['duration_seconds']}s")
        return results

    except Exception as e:
        print(f"[OnChain] Error: {e}")
        log_collection("onchain", {"errors": [str(e)]})
        return {"error": str(e)}


def job_market_snapshot():
    """Create daily market snapshot."""
    print(f"\n[{datetime.now()}] Creating market snapshot...")
    start = time.time()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[Market] Supabase not configured")
        return

    try:
        collector = OnChainCollector()

        # Collect market data
        dex_volumes = collector.get_dex_volumes()
        lending_data = collector.get_lending_data()
        stablecoins = collector.get_stablecoin_data()

        # Calculate totals
        total_dex_volume = sum(d.get("volume_24h", 0) for d in dex_volumes)
        total_supplied = sum(l.get("total_supplied", 0) for l in lending_data)
        total_borrowed = sum(l.get("total_borrowed", 0) for l in lending_data)

        # Get incident count for today
        today = datetime.now().date().isoformat()

        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        }

        snapshot = {
            "snapshot_date": today,
            "total_dex_volume_24h": total_dex_volume,
            "total_lending_supplied": total_supplied,
            "total_lending_borrowed": total_borrowed,
            "top_gainers": json.dumps(sorted(dex_volumes, key=lambda x: x.get("change_1d") or 0, reverse=True)[:5]),
            "top_losers": json.dumps(sorted(dex_volumes, key=lambda x: x.get("change_1d") or 0)[:5]),
        }

        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/market_snapshots",
            headers=headers,
            json=snapshot,
            timeout=30
        )

        duration = int(time.time() - start)
        log_collection("market", {"items_collected": 1, "duration_seconds": duration})

        print(f"[Market] Snapshot saved in {duration}s")

    except Exception as e:
        print(f"[Market] Error: {e}")
        log_collection("market", {"errors": [str(e)]})


def get_product_mappings() -> Dict[str, str]:
    """Get product to DefiLlama slug mappings from database."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return DEFAULT_MAPPINGS

    try:
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        }

        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/products",
            headers=headers,
            params={
                "select": "slug,defillama_slug",
                "defillama_slug": "not.is.null"
            },
            timeout=30
        )

        if response.status_code == 200:
            products = response.json()
            return {p["slug"]: p["defillama_slug"] for p in products if p.get("defillama_slug")}

    except Exception as e:
        print(f"[Mappings] Error: {e}")

    return DEFAULT_MAPPINGS


def save_onchain_snapshots(results: Dict):
    """Save on-chain data as snapshots."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

    # Get product IDs
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/products",
            headers=headers,
            params={"select": "id,slug,defillama_slug"},
            timeout=30
        )

        if response.status_code != 200:
            return

        products = {p.get("defillama_slug") or p.get("slug"): p["id"] for p in response.json()}

        # Save snapshots for each protocol with data
        for protocol in results.get("dex_volumes", []):
            slug = protocol.get("slug")
            if slug in products:
                snapshot = {
                    "product_id": products[slug],
                    "volume_24h": protocol.get("volume_24h", 0),
                    "volume_7d": protocol.get("volume_7d", 0),
                    "chains": json.dumps(protocol.get("chains", [])),
                    "data_source": "defillama",
                }

                requests.post(
                    f"{SUPABASE_URL}/rest/v1/onchain_snapshots",
                    headers=headers,
                    json=snapshot,
                    timeout=30
                )

    except Exception as e:
        print(f"[Snapshots] Error saving: {e}")


def job_score_snapshot():
    """
    Take daily snapshot of ALL scores.
    THIS IS THE REAL MOAT - builds over time, impossible to replicate.
    """
    print(f"\n[{datetime.now()}] Taking score snapshot...")
    start = time.time()

    try:
        tracker = ScoreTracker()
        results = tracker.snapshot_all_scores()
        results["duration_seconds"] = int(time.time() - start)

        log_collection("scores", results)
        print(f"[Scores] Snapshot complete in {results['duration_seconds']}s")
        return results

    except Exception as e:
        print(f"[Scores] Error: {e}")
        log_collection("scores", {"errors": [str(e)]})
        return {"error": str(e)}


def job_hourly_gpt_proof():
    """
    HOURLY GPT-PROOF COLLECTION - THE CORE MOAT BUILDER
    Takes hourly snapshots = 24x more data than daily.
    Each hour creates data competitors cannot replicate.
    """
    print(f"\n[{datetime.now()}] Running HOURLY GPT-Proof collection...")
    start = time.time()

    if not GPT_PROOF_AVAILABLE:
        print("[Hourly] GPT-Proof collector not available, falling back to daily snapshot")
        return job_score_snapshot()

    try:
        run_hourly_collection()
        duration = int(time.time() - start)
        print(f"[Hourly] GPT-Proof collection complete in {duration}s")
        return {"status": "success", "duration_seconds": duration}

    except Exception as e:
        print(f"[Hourly] Error: {e}")
        log_collection("hourly_gpt_proof", {"errors": [str(e)]})
        return {"error": str(e)}


def job_daily_predictions():
    """
    DAILY PREDICTIONS - Track prediction accuracy.
    Proves our methodology WORKS by predicting incidents.
    """
    print(f"\n[{datetime.now()}] Running daily predictions...")
    start = time.time()

    if not GPT_PROOF_AVAILABLE:
        print("[Predictions] GPT-Proof collector not available")
        return {"error": "GPT-Proof collector not available"}

    try:
        run_daily_collection()
        duration = int(time.time() - start)
        print(f"[Predictions] Complete in {duration}s")
        return {"status": "success", "duration_seconds": duration}

    except Exception as e:
        print(f"[Predictions] Error: {e}")
        return {"error": str(e)}


def run_scheduler():
    """Run the scheduled jobs with GPT-PROOF enhancements."""
    print("=" * 60)
    print("SafeScoring GPT-PROOF Data Collector")
    print(f"Started at: {datetime.now().isoformat()}")
    print("=" * 60)
    print("\nGPT-PROOF SCHEDULE:")
    print("  - Incidents: Every 15 minutes")
    print("  - HOURLY SNAPSHOTS: Every hour (24x MOAT BUILDER)")
    print("  - On-chain metrics: Every hour")
    print("  - Daily predictions: Daily at 06:00 (PROVE VALUE)")
    print("  - Daily score snapshot: Daily at 06:00")
    print("  - Market snapshot: Daily at 00:00")
    print("=" * 60)
    print("\nEach hour = 1 more hour competitors cannot catch up!")
    print("=" * 60)

    # Schedule jobs - ENHANCED FOR GPT-PROOF
    schedule.every(15).minutes.do(job_scrape_incidents)
    schedule.every(1).hours.do(job_hourly_gpt_proof)  # HOURLY SNAPSHOTS - THE CORE MOAT
    schedule.every(1).hours.do(job_collect_onchain)
    schedule.every().day.at("06:00").do(job_score_snapshot)  # Daily backup
    schedule.every().day.at("06:00").do(job_daily_predictions)  # Predictions
    schedule.every().day.at("00:00").do(job_market_snapshot)

    # Run initial collection
    print("\n[Init] Running initial GPT-Proof data collection...")
    job_scrape_incidents()
    job_hourly_gpt_proof()  # Start building moat immediately

    # Run scheduler loop
    while True:
        schedule.run_pending()
        time.sleep(60)


def run_once():
    """Run all collections once (for testing)."""
    print("Running all GPT-Proof collections once...")
    job_scrape_incidents()
    job_hourly_gpt_proof()  # THE CORE MOAT
    job_collect_onchain()
    job_score_snapshot()  # Daily backup
    job_daily_predictions()  # Predictions
    job_market_snapshot()
    print("Done! Moat strengthened.")


def run_moat_report():
    """Generate moat strength report."""
    if not GPT_PROOF_AVAILABLE:
        print("[Report] GPT-Proof collector not available")
        return

    collector = GPTProofCollector()
    report = collector.generate_moat_report()
    print(json.dumps(report, indent=2, default=str))


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="SafeScoring GPT-PROOF Data Collector")
    parser.add_argument("--once", action="store_true", help="Run all collections once and exit")
    parser.add_argument("--incidents", action="store_true", help="Run incident scraper only")
    parser.add_argument("--onchain", action="store_true", help="Run on-chain collector only")
    parser.add_argument("--scores", action="store_true", help="Take daily score snapshot")
    parser.add_argument("--hourly", action="store_true", help="Take HOURLY snapshot (THE CORE MOAT)")
    parser.add_argument("--predictions", action="store_true", help="Run prediction tracking")
    parser.add_argument("--market", action="store_true", help="Create market snapshot only")
    parser.add_argument("--report", action="store_true", help="Generate moat strength report")

    args = parser.parse_args()

    if args.once:
        run_once()
    elif args.incidents:
        job_scrape_incidents()
    elif args.onchain:
        job_collect_onchain()
    elif args.scores:
        job_score_snapshot()
    elif args.hourly:
        job_hourly_gpt_proof()
    elif args.predictions:
        job_daily_predictions()
    elif args.report:
        run_moat_report()
    elif args.market:
        job_market_snapshot()
    else:
        run_scheduler()
