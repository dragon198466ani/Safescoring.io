#!/usr/bin/env python3
"""
SAFESCORING.IO - Cache Maintenance Script

Manages all SQLite caches:
- AI Response Cache (api_provider.py)
- Web Scraping Cache (scraper.py)

Usage:
    python scripts/cache_maintenance.py --stats      # Show cache statistics
    python scripts/cache_maintenance.py --cleanup    # Remove expired entries
    python scripts/cache_maintenance.py --purge-all  # Clear ALL cache entries
    python scripts/cache_maintenance.py --vacuum     # Optimize database files
"""

import sys
import os
import sqlite3
import argparse
from datetime import datetime, timedelta

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

# Cache paths
CACHE_DIR = os.path.join(os.path.dirname(__file__), '..', 'cache')
AI_CACHE_DB = os.path.join(CACHE_DIR, 'ai_response_cache.db')
SCRAPING_CACHE_DB = os.path.join(CACHE_DIR, 'scraping_cache.db')


def get_cache_stats(db_path: str, table_name: str) -> dict:
    """Get statistics for a cache database."""
    if not os.path.exists(db_path):
        return {'exists': False, 'entries': 0, 'size_mb': 0}

    stats = {'exists': True}

    try:
        # File size
        stats['size_mb'] = os.path.getsize(db_path) / (1024 * 1024)

        with sqlite3.connect(db_path) as conn:
            # Total entries
            cursor = conn.execute(f'SELECT COUNT(*) FROM {table_name}')
            stats['entries'] = cursor.fetchone()[0]

            # Valid entries (not expired)
            cursor = conn.execute(
                f'SELECT COUNT(*) FROM {table_name} WHERE expires_at > datetime("now")'
            )
            stats['valid_entries'] = cursor.fetchone()[0]

            # Expired entries
            stats['expired_entries'] = stats['entries'] - stats['valid_entries']

            # Oldest entry
            cursor = conn.execute(f'SELECT MIN(created_at) FROM {table_name}')
            oldest = cursor.fetchone()[0]
            stats['oldest_entry'] = oldest if oldest else 'N/A'

            # Newest entry
            cursor = conn.execute(f'SELECT MAX(created_at) FROM {table_name}')
            newest = cursor.fetchone()[0]
            stats['newest_entry'] = newest if newest else 'N/A'

    except sqlite3.Error as e:
        stats['error'] = str(e)

    return stats


def get_ai_cache_detailed_stats() -> dict:
    """Get detailed stats for AI cache including hit rates."""
    if not os.path.exists(AI_CACHE_DB):
        return {}

    stats = {}

    try:
        with sqlite3.connect(AI_CACHE_DB) as conn:
            # Entries by cache type
            cursor = conn.execute('''
                SELECT cache_type, COUNT(*) as count
                FROM cache
                GROUP BY cache_type
            ''')
            stats['by_type'] = {row[0]: row[1] for row in cursor.fetchall()}

            # Entries by model
            cursor = conn.execute('''
                SELECT model, COUNT(*) as count
                FROM cache
                GROUP BY model
            ''')
            stats['by_model'] = {row[0]: row[1] for row in cursor.fetchall()}

            # Check if metrics table exists
            cursor = conn.execute('''
                SELECT name FROM sqlite_master WHERE type='table' AND name='metrics'
            ''')
            if cursor.fetchone():
                # Get metrics summary
                cursor = conn.execute('''
                    SELECT model, call_type,
                           SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) as hits,
                           SUM(CASE WHEN cache_hit = 0 THEN 1 ELSE 0 END) as misses,
                           AVG(latency_ms) as avg_latency
                    FROM metrics
                    GROUP BY model, call_type
                ''')
                stats['metrics'] = []
                for row in cursor.fetchall():
                    total = row[2] + row[3]
                    hit_rate = (row[2] / total * 100) if total > 0 else 0
                    stats['metrics'].append({
                        'model': row[0],
                        'call_type': row[1],
                        'hits': row[2],
                        'misses': row[3],
                        'hit_rate': f"{hit_rate:.1f}%",
                        'avg_latency_ms': int(row[4]) if row[4] else 0
                    })

    except sqlite3.Error:
        pass

    return stats


def cleanup_expired(db_path: str, table_name: str) -> int:
    """Remove expired entries from cache."""
    if not os.path.exists(db_path):
        return 0

    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.execute(
                f'DELETE FROM {table_name} WHERE expires_at < datetime("now")'
            )
            deleted = cursor.rowcount
            conn.commit()
            return deleted
    except sqlite3.Error:
        return 0


def purge_all(db_path: str, table_name: str) -> int:
    """Remove ALL entries from cache."""
    if not os.path.exists(db_path):
        return 0

    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.execute(f'DELETE FROM {table_name}')
            deleted = cursor.rowcount
            conn.commit()
            return deleted
    except sqlite3.Error:
        return 0


def vacuum_database(db_path: str) -> bool:
    """Optimize database file (reclaim space)."""
    if not os.path.exists(db_path):
        return False

    try:
        with sqlite3.connect(db_path) as conn:
            conn.execute('VACUUM')
        return True
    except sqlite3.Error:
        return False


def print_stats():
    """Print statistics for all caches."""
    print("\n" + "=" * 60)
    print("SAFESCORING CACHE STATISTICS")
    print("=" * 60)

    # AI Response Cache
    print("\n[1] AI RESPONSE CACHE")
    print("-" * 40)
    ai_stats = get_cache_stats(AI_CACHE_DB, 'cache')

    if ai_stats.get('exists'):
        print(f"   Database size:    {ai_stats.get('size_mb', 0):.2f} MB")
        print(f"   Total entries:    {ai_stats.get('entries', 0)}")
        print(f"   Valid entries:    {ai_stats.get('valid_entries', 0)}")
        print(f"   Expired entries:  {ai_stats.get('expired_entries', 0)}")
        print(f"   Oldest entry:     {ai_stats.get('oldest_entry', 'N/A')}")
        print(f"   Newest entry:     {ai_stats.get('newest_entry', 'N/A')}")

        # Detailed stats
        detailed = get_ai_cache_detailed_stats()
        if detailed.get('by_type'):
            print("\n   By type:")
            for cache_type, count in detailed['by_type'].items():
                print(f"      {cache_type or 'unknown'}: {count}")

        if detailed.get('by_model'):
            print("\n   By model:")
            for model, count in detailed['by_model'].items():
                print(f"      {model or 'unknown'}: {count}")

        if detailed.get('metrics'):
            print("\n   Metrics (hit rate):")
            for m in detailed['metrics']:
                print(f"      {m['model']}/{m['call_type']}: {m['hit_rate']} "
                      f"({m['hits']} hits, {m['misses']} misses, avg {m['avg_latency_ms']}ms)")
    else:
        print("   Cache not initialized yet")

    # Scraping Cache
    print("\n[2] WEB SCRAPING CACHE")
    print("-" * 40)
    scrape_stats = get_cache_stats(SCRAPING_CACHE_DB, 'scrape_cache')

    if scrape_stats.get('exists'):
        print(f"   Database size:    {scrape_stats.get('size_mb', 0):.2f} MB")
        print(f"   Total entries:    {scrape_stats.get('entries', 0)}")
        print(f"   Valid entries:    {scrape_stats.get('valid_entries', 0)}")
        print(f"   Expired entries:  {scrape_stats.get('expired_entries', 0)}")
        print(f"   Oldest entry:     {scrape_stats.get('oldest_entry', 'N/A')}")
        print(f"   Newest entry:     {scrape_stats.get('newest_entry', 'N/A')}")
    else:
        print("   Cache not initialized yet")

    print()


def main():
    parser = argparse.ArgumentParser(description='Cache Maintenance Script')
    parser.add_argument('--stats', action='store_true', help='Show cache statistics')
    parser.add_argument('--cleanup', action='store_true', help='Remove expired entries')
    parser.add_argument('--purge-all', action='store_true', help='Clear ALL cache entries')
    parser.add_argument('--vacuum', action='store_true', help='Optimize database files')
    parser.add_argument('--ai-only', action='store_true', help='Only process AI cache')
    parser.add_argument('--scrape-only', action='store_true', help='Only process scraping cache')

    args = parser.parse_args()

    # Default to stats if no action specified
    if not (args.stats or args.cleanup or args.purge_all or args.vacuum):
        args.stats = True

    # Determine which caches to process
    process_ai = not args.scrape_only
    process_scrape = not args.ai_only

    if args.stats:
        print_stats()

    if args.cleanup:
        print("\n[CLEANUP] Removing expired cache entries...")

        if process_ai:
            deleted = cleanup_expired(AI_CACHE_DB, 'cache')
            print(f"   AI Cache: {deleted} expired entries removed")

        if process_scrape:
            deleted = cleanup_expired(SCRAPING_CACHE_DB, 'scrape_cache')
            print(f"   Scraping Cache: {deleted} expired entries removed")

        print("   Done!")

    if args.purge_all:
        confirm = input("\nWARNING: This will delete ALL cache entries. Continue? [y/N] ")
        if confirm.lower() == 'y':
            print("\n[PURGE] Clearing all cache entries...")

            if process_ai:
                deleted = purge_all(AI_CACHE_DB, 'cache')
                print(f"   AI Cache: {deleted} entries deleted")

            if process_scrape:
                deleted = purge_all(SCRAPING_CACHE_DB, 'scrape_cache')
                print(f"   Scraping Cache: {deleted} entries deleted")

            print("   Done!")
        else:
            print("   Cancelled.")

    if args.vacuum:
        print("\n[VACUUM] Optimizing database files...")

        if process_ai and os.path.exists(AI_CACHE_DB):
            size_before = os.path.getsize(AI_CACHE_DB)
            if vacuum_database(AI_CACHE_DB):
                size_after = os.path.getsize(AI_CACHE_DB)
                saved = (size_before - size_after) / 1024
                print(f"   AI Cache: OK (saved {saved:.1f} KB)")
            else:
                print("   AI Cache: Failed")

        if process_scrape and os.path.exists(SCRAPING_CACHE_DB):
            size_before = os.path.getsize(SCRAPING_CACHE_DB)
            if vacuum_database(SCRAPING_CACHE_DB):
                size_after = os.path.getsize(SCRAPING_CACHE_DB)
                saved = (size_before - size_after) / 1024
                print(f"   Scraping Cache: OK (saved {saved:.1f} KB)")
            else:
                print("   Scraping Cache: Failed")

        print("   Done!")


if __name__ == '__main__':
    main()
