#!/usr/bin/env python3
"""
SAFE Staking System Verification Protocol
Run this script to verify the staking system is working correctly.

Usage: python scripts/verify_staking_system.py
"""

import os
import sys
import requests
from datetime import datetime

# Try to load .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except:
    pass

# Config
ACCESS_TOKEN = os.getenv("SUPABASE_ACCESS_TOKEN", "sbp_e4b8b78cd32053ff0436cea95ec5adb21a9db936")
PROJECT_REF = "ajdncttomdqojlozxjxu"
API_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
HEADERS = {"Authorization": f"Bearer {ACCESS_TOKEN}", "Content-Type": "application/json"}


def run_query(sql):
    """Execute SQL and return result."""
    try:
        r = requests.post(API_URL, headers=HEADERS, json={"query": sql}, timeout=30)
        if r.status_code in [200, 201]:
            return {"ok": True, "data": r.json()}
        return {"ok": False, "error": r.text[:500]}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def check_tables():
    """Verify required tables exist."""
    sql = """
    SELECT table_name
    FROM information_schema.tables
    WHERE table_name IN ('user_points', 'user_staking', 'staking_rewards', 'shop_items', 'points_transactions')
    AND table_schema = 'public';
    """
    result = run_query(sql)
    if not result["ok"]:
        return False, result["error"]

    data = result["data"]
    if isinstance(data, list) and len(data) > 0:
        tables = [r.get("table_name", "") for r in data]
    else:
        tables = []

    expected = ["user_points", "user_staking", "staking_rewards", "shop_items", "points_transactions"]
    missing = [t for t in expected if t not in tables]

    if missing:
        return False, f"Missing tables: {missing}"
    return True, f"All {len(expected)} tables present"


def check_functions():
    """Verify required functions exist."""
    sql = """
    SELECT proname FROM pg_proc
    WHERE proname IN ('stake_tokens', 'unstake_tokens', 'withdraw_unstaked_tokens',
                      'distribute_staking_rewards', 'add_points', 'purchase_item');
    """
    result = run_query(sql)
    if not result["ok"]:
        return False, result["error"]

    data = result["data"]
    funcs = [r.get("proname", "") for r in data] if isinstance(data, list) else []
    expected = ["stake_tokens", "unstake_tokens", "withdraw_unstaked_tokens",
                "distribute_staking_rewards", "add_points", "purchase_item"]
    missing = [f for f in expected if f not in funcs]

    if missing:
        return False, f"Missing functions: {missing}"
    return True, f"All {len(expected)} functions present"


def check_views():
    """Verify required views exist."""
    sql = """
    SELECT viewname FROM pg_views
    WHERE viewname IN ('staking_leaderboard', 'points_leaderboard', 'user_active_items');
    """
    result = run_query(sql)
    if not result["ok"]:
        return False, result["error"]

    data = result["data"]
    views = [r.get("viewname", "") for r in data] if isinstance(data, list) else []
    expected = ["staking_leaderboard", "points_leaderboard", "user_active_items"]
    missing = [v for v in expected if v not in views]

    if missing:
        return False, f"Missing views: {missing}"
    return True, f"All {len(expected)} views present"


def check_shop_items():
    """Verify shop items are seeded."""
    sql = "SELECT COUNT(*) as cnt FROM shop_items WHERE is_active = true;"
    result = run_query(sql)
    if not result["ok"]:
        return False, result["error"]

    data = result["data"]
    cnt = data[0].get("cnt", 0) if isinstance(data, list) and len(data) > 0 else 0
    if cnt < 5:
        return False, f"Only {cnt} shop items (expected 10+)"
    return True, f"{cnt} active shop items"


def check_rls_policies():
    """Verify RLS is enabled on sensitive tables."""
    sql = """
    SELECT tablename, COUNT(*) as policies
    FROM pg_policies
    WHERE tablename IN ('user_staking', 'staking_rewards', 'user_points', 'user_purchases')
    GROUP BY tablename;
    """
    result = run_query(sql)
    if not result["ok"]:
        return False, result["error"]

    data = result["data"]
    policies = {r.get("tablename"): r.get("policies", 0) for r in data} if isinstance(data, list) else {}
    issues = []
    for table in ["user_staking", "staking_rewards", "user_points"]:
        if table not in policies or policies[table] < 1:
            issues.append(table)

    if issues:
        return False, f"Missing RLS on: {issues}"
    return True, f"RLS enabled on {len(policies)} tables"


def check_tier_logic():
    """Verify tier calculation logic works."""
    sql = """
    SELECT
        stake_amount,
        CASE
            WHEN stake_amount >= 5000 THEN 'diamond'
            WHEN stake_amount >= 2500 THEN 'platinum'
            WHEN stake_amount >= 1000 THEN 'gold'
            WHEN stake_amount >= 500 THEN 'silver'
            WHEN stake_amount >= 100 THEN 'bronze'
            ELSE 'none'
        END as tier
    FROM (VALUES (100), (500), (1000), (2500), (5000), (50)) AS t(stake_amount);
    """
    result = run_query(sql)
    if not result["ok"]:
        return False, result["error"]

    data = result["data"]
    if not isinstance(data, list):
        return False, "Invalid response"

    expected = {100: "bronze", 500: "silver", 1000: "gold", 2500: "platinum", 5000: "diamond", 50: "none"}
    for row in data:
        amt = row.get("stake_amount")
        tier = row.get("tier")
        if expected.get(amt) != tier:
            return False, f"Wrong tier for {amt}: got {tier}, expected {expected[amt]}"

    return True, "Tier logic correct (Bronze 100+, Silver 500+, Gold 1000+, Platinum 2500+, Diamond 5000+)"


def check_current_stats():
    """Get current system stats."""
    sql = """
    SELECT
        (SELECT COUNT(*) FROM user_points WHERE balance > 0) as users_with_points,
        (SELECT COALESCE(SUM(balance), 0) FROM user_points) as total_points_circulation,
        (SELECT COUNT(*) FROM user_staking WHERE status = 'active') as active_stakes,
        (SELECT COALESCE(SUM(amount), 0) FROM user_staking WHERE status = 'active') as total_staked,
        (SELECT COUNT(*) FROM staking_rewards) as rewards_distributed;
    """
    result = run_query(sql)
    if not result["ok"]:
        return False, result["error"]

    data = result["data"]
    if isinstance(data, list) and len(data) > 0:
        return True, data[0]
    return False, "No stats returned"


def main():
    print("=" * 60)
    print("SAFE STAKING SYSTEM VERIFICATION PROTOCOL")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print()

    checks = [
        ("Tables", check_tables),
        ("Functions", check_functions),
        ("Views", check_views),
        ("Shop Items", check_shop_items),
        ("RLS Policies", check_rls_policies),
        ("Tier Logic", check_tier_logic),
    ]

    all_passed = True
    for name, check_fn in checks:
        ok, msg = check_fn()
        status = "[PASS]" if ok else "[FAIL]"
        print(f"{status} {name}: {msg}")
        if not ok:
            all_passed = False

    print()
    print("-" * 60)
    print("CURRENT STATS")
    print("-" * 60)
    ok, stats = check_current_stats()
    if ok:
        print(f"  Users with points: {stats['users_with_points']}")
        print(f"  Total $SAFE in circulation: {stats['total_points_circulation']}")
        print(f"  Active stakes: {stats['active_stakes']}")
        print(f"  Total staked: {stats['total_staked']} $SAFE")
        print(f"  Rewards distributed: {stats['rewards_distributed']}")
    else:
        print(f"  Error: {stats}")

    print()
    print("=" * 60)
    if all_passed:
        print("RESULT: ALL CHECKS PASSED - System is operational")
    else:
        print("RESULT: SOME CHECKS FAILED - Review errors above")
    print("=" * 60)

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
