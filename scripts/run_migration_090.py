#!/usr/bin/env python3
"""
Execute Migration 090: Clarify ADVERSITY vs FIDELITY Pillar Definitions

Uses direct REST API calls to Supabase.
"""

import os
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
    print("Please check your .env file")
    exit(1)

# Remove trailing slash if present
SUPABASE_URL = SUPABASE_URL.rstrip("/")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# ============================================================
# ADVERSITY - Protection Against Human Adversaries
# ============================================================
ADVERSITY_UPDATE = {
    "pillar_name": "ADVERSITY - Protection Against Human Adversaries",
    "definition": "Measures the ability to protect users and assets against INTENTIONAL threats from human adversaries: physical coercion, theft, surveillance, legal pressure, and targeted attacks. This pillar focuses exclusively on protection against malicious actors, NOT against accidental damage, wear, or system failures (which belong to Fidelity).",
    "includes": [
        "Anti-coercion mechanisms (duress PIN, panic button) - protection when FORCED by attacker",
        "Hidden wallets and decoy accounts - misleading attackers who demand access",
        "Plausible deniability features (hidden volumes, steganography)",
        "Theft protection (device wipe, kill switch) - defeating thieves",
        "Time-locked withdrawals - preventing quick extraction",
        "Self-destruct on unauthorized access - defeating brute-force attackers",
        "Physical tamper detection - detecting if attacker opened device",
        "Side-channel attack resistance - defeating sophisticated attackers",
        "Privacy features (Tor/VPN, address rotation) - hiding from surveillors",
        "Legal protections and jurisdiction considerations",
        "Geographic distribution of backups - defeating seizure",
        "Social recovery with trusted guardians"
    ],
    "excludes": [
        "Accidental water/drop damage (belongs to F - accidents)",
        "Temperature tolerance (belongs to F - environmental wear)",
        "Battery longevity (belongs to F - degradation over time)",
        "Service uptime (belongs to F - reliability)",
        "Manufacturing quality (belongs to F - build quality)",
        "Warranty and support (belongs to F - vendor reliability)"
    ],
    "keywords": [
        "coercion", "duress", "panic", "hidden", "decoy", "plausible deniability",
        "theft", "stolen", "attacker", "adversary", "tamper", "intrusion",
        "self-destruct", "wipe", "surveillance", "privacy", "Tor", "seizure",
        "legal", "jurisdiction", "opsec", "side-channel"
    ],
    "version": "3.0"
}

# ============================================================
# FIDELITY - Durability, Reliability & Trust Over Time
# ============================================================
FIDELITY_UPDATE = {
    "pillar_name": "FIDELITY - Durability, Reliability & Trust Over Time",
    "definition": "Evaluates protection against NON-INTENTIONAL threats: physical wear, accidental damage, environmental exposure, component failures, and organizational reliability over time. This pillar focuses on how well a product survives NORMAL USE and the passage of time, NOT attacks from adversaries (which belong to Adversity).",
    "includes": [
        "Accidental drop resistance - surviving UNINTENTIONAL falls",
        "Water/dust protection (IP rating) - surviving ACCIDENTAL exposure",
        "Temperature tolerance - operating in normal environments",
        "Material quality - longevity of materials",
        "Manufacturing certifications (CE, FCC, RoHS)",
        "Battery longevity - degradation over time",
        "Service uptime (99.9%+) - surviving system failures",
        "Redundancy and failover mechanisms",
        "Code quality and test coverage",
        "Long-term support (LTS) commitment",
        "Company track record and reputation",
        "Warranty and documentation quality"
    ],
    "excludes": [
        "Tamper detection (belongs to A - INTENTIONAL intrusion)",
        "Duress PIN and hidden wallets (belongs to A - coercion)",
        "Self-destruct on intrusion (belongs to A - attackers)",
        "Privacy features (belongs to A - surveillance)",
        "Side-channel resistance (belongs to A - sophisticated attackers)"
    ],
    "keywords": [
        "reliability", "durability", "quality", "uptime", "availability",
        "warranty", "certification", "CE", "FCC", "IP rating", "accidental",
        "drop test", "temperature", "humidity", "wear", "lifespan",
        "battery life", "degradation", "patch", "maintenance", "support",
        "LTS", "track record", "documentation", "SLA", "failover"
    ],
    "version": "3.0"
}


def update_pillar(pillar_code: str, data: dict) -> bool:
    """Update a pillar definition via REST API."""
    url = f"{SUPABASE_URL}/rest/v1/safe_pillar_definitions?pillar_code=eq.{pillar_code}"

    response = requests.patch(url, headers=headers, json=data)

    if response.status_code in [200, 204]:
        return True
    elif response.status_code == 404:
        print(f"    Table not found - may need to run safe_pillar_definitions.sql first")
        return False
    else:
        print(f"    Error {response.status_code}: {response.text}")
        return False


def verify_updates():
    """Verify the updates were applied."""
    url = f"{SUPABASE_URL}/rest/v1/safe_pillar_definitions?pillar_code=in.(A,F)&select=pillar_code,pillar_name,version"

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return response.json()
    return None


def main():
    print("=" * 60)
    print("Migration 090: Clarify ADVERSITY vs FIDELITY Definitions")
    print("=" * 60)
    print()
    print("KEY DISTINCTION:")
    print("  ADVERSITY (A) = INTENTIONAL human threats (attackers)")
    print("  FIDELITY (F)  = NON-INTENTIONAL failures (wear, accidents)")
    print()

    # Update ADVERSITY
    print("Updating ADVERSITY pillar...")
    if update_pillar("A", ADVERSITY_UPDATE):
        print("  [OK] ADVERSITY updated")
    else:
        print("  [FAILED] ADVERSITY")

    # Update FIDELITY
    print("Updating FIDELITY pillar...")
    if update_pillar("F", FIDELITY_UPDATE):
        print("  [OK] FIDELITY updated")
    else:
        print("  [FAILED] FIDELITY")

    # Verify
    print()
    print("Verifying updates...")
    results = verify_updates()
    if results:
        for row in results:
            print(f"  {row['pillar_code']}: {row['pillar_name']} (v{row['version']})")
    else:
        print("  Could not verify - table may not exist")

    print()
    print("=" * 60)
    print("Migration complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
