#!/usr/bin/env python3
"""
Enrich norms with standard_year using AI
Uses free providers: Groq, SambaNova, Gemini
"""

import os
import sys
import json
import time
import re
import requests
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.config import (
    SUPABASE_URL, SUPABASE_KEY,
    GROQ_API_KEYS, GEMINI_API_KEYS, SAMBANOVA_API_KEYS, CONFIG
)

# Get OpenRouter keys
OPENROUTER_API_KEYS = [v for k, v in CONFIG.items() if 'OPENROUTER' in k.upper() and 'KEY' in k.upper() and v]

# API endpoints
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
SAMBANOVA_URL = "https://api.sambanova.ai/v1/chat/completions"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Key rotation indexes
groq_idx = 0
gemini_idx = 0
sambanova_idx = 0
openrouter_idx = 0


def get_supabase_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }


def extract_year_with_groq(norm_code: str, title: str, description: str, standard_ref: str) -> int | None:
    """Extract standard year using Groq (fastest)"""
    global groq_idx

    if not GROQ_API_KEYS:
        return None

    key = GROQ_API_KEYS[groq_idx % len(GROQ_API_KEYS)]
    groq_idx += 1

    prompt = f"""Find the year when this technology/standard was FIRST published or created.

Title: {title}
Description: {description[:500] if description else 'N/A'}
Reference: {standard_ref or 'N/A'}

IMPORTANT: Look for the underlying standard, protocol, or technology mentioned.
Examples:
- "PBKDF2" → 2000 (RFC 2898)
- "BIP-129 BSMS" → 2020 (Bitcoin BIP)
- "Shamir Backup" / "SLIP-39" → 2019
- "Echidna" → 2018 (Trail of Bits tool)
- "USB-C" → 2014 (USB Type-C spec)
- "Polkadot" → 2020 (mainnet launch)
- "ERC-20" → 2015 (EIP-20)
- "Secure Element" → 2000 (CC certification)
- "AES-256" → 2001 (FIPS-197)
- "Ed25519" → 2011 (Bernstein)
- "MPC" / "TSS" → 2019 (first crypto wallets)
- "Passkeys" / "WebAuthn" → 2019 (FIDO2)

Reply with ONLY the 4-digit year. If truly unknown, reply "UNKNOWN"."""

    try:
        response = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 20,
                "temperature": 0
            },
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            text = result['choices'][0]['message']['content'].strip()
            # Extract 4-digit year
            match = re.search(r'\b(19|20)\d{2}\b', text)
            if match:
                return int(match.group())
    except Exception as e:
        print(f"  Groq error: {e}")

    return None


def extract_year_with_gemini(norm_code: str, title: str, description: str, standard_ref: str) -> int | None:
    """Extract standard year using Gemini"""
    global gemini_idx

    if not GEMINI_API_KEYS:
        return None

    key = GEMINI_API_KEYS[gemini_idx % len(GEMINI_API_KEYS)]
    gemini_idx += 1

    prompt = f"""Find the year when this technology/standard was FIRST published.

Title: {title}
Description: {description[:300] if description else 'N/A'}
Reference: {standard_ref or 'N/A'}

Look for the underlying standard (BIP, EIP, RFC, ISO, NIST, etc.) or technology.
Examples: PBKDF2→2000, USB-C→2014, Polkadot→2020, Ed25519→2011, WebAuthn→2019

Reply with ONLY the 4-digit year. If truly unknown, reply "UNKNOWN"."""

    try:
        response = requests.post(
            f"{GEMINI_URL}?key={key}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"maxOutputTokens": 20, "temperature": 0}
            },
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            text = result['candidates'][0]['content']['parts'][0]['text'].strip()
            match = re.search(r'\b(19|20)\d{2}\b', text)
            if match:
                return int(match.group())
    except Exception as e:
        print(f"  Gemini error: {e}")

    return None


def extract_year_with_sambanova(norm_code: str, title: str, description: str, standard_ref: str) -> int | None:
    """Extract standard year using SambaNova"""
    global sambanova_idx

    if not SAMBANOVA_API_KEYS:
        return None

    key = SAMBANOVA_API_KEYS[sambanova_idx % len(SAMBANOVA_API_KEYS)]
    sambanova_idx += 1

    prompt = f"""Find the year when "{title}" was FIRST published. Description: {description[:200] if description else 'N/A'}. Look for the underlying standard/technology. Reply with ONLY the 4-digit year."""

    try:
        response = requests.post(
            SAMBANOVA_URL,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "Meta-Llama-3.3-70B-Instruct",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 20,
                "temperature": 0
            },
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            text = result['choices'][0]['message']['content'].strip()
            match = re.search(r'\b(19|20)\d{2}\b', text)
            if match:
                return int(match.group())
    except Exception as e:
        print(f"  SambaNova error: {e}")

    return None


def extract_year_with_openrouter(norm_code: str, title: str, description: str, standard_ref: str) -> int | None:
    """Extract standard year using OpenRouter (most reliable free tier)"""
    global openrouter_idx

    if not OPENROUTER_API_KEYS:
        return None

    key = OPENROUTER_API_KEYS[openrouter_idx % len(OPENROUTER_API_KEYS)]
    openrouter_idx += 1

    prompt = f"""Find the year when this technology/standard was FIRST published.

Title: {title}
Description: {description[:300] if description else 'N/A'}

Look for the underlying standard (BIP, EIP, RFC, ISO, NIST, etc.) or technology.
Examples: PBKDF2→2000, USB-C→2014, Polkadot→2020, Ed25519→2011, WebAuthn→2019

Reply with ONLY the 4-digit year. If truly unknown, reply "UNKNOWN"."""

    try:
        response = requests.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "meta-llama/llama-3.3-70b-instruct:free",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 50,
                "temperature": 0
            },
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            if 'choices' in result:
                text = result['choices'][0]['message']['content'].strip()
                match = re.search(r'\b(19|20)\d{2}\b', text)
                if match:
                    return int(match.group())
    except Exception as e:
        print(f"  OpenRouter error: {e}")

    return None


# Known years for common standards (comprehensive - 300+ entries)
KNOWN_YEARS = {
    # ========== BIP Standards (Bitcoin) ==========
    'S-BIP-032': 2012, 'S-BIP-039': 2013, 'S-BIP-044': 2014,
    'S-BIP-084': 2017, 'S-BIP-340': 2020, 'S-BIP-341': 2020,
    'E-BIP-173': 2017, 'E-BIP-370': 2021,
    'S-BIP-001': 2011, 'S-BIP-002': 2011, 'S-BIP-009': 2015,
    'S-BIP-011': 2011, 'S-BIP-012': 2011, 'S-BIP-013': 2011,
    'S-BIP-014': 2011, 'S-BIP-016': 2012, 'S-BIP-021': 2012,
    'S-BIP-022': 2012, 'S-BIP-030': 2012, 'S-BIP-031': 2012,
    'S-BIP-034': 2012, 'S-BIP-035': 2012, 'S-BIP-037': 2012,
    'S-BIP-038': 2012, 'S-BIP-042': 2014, 'S-BIP-043': 2014,
    'S-BIP-045': 2014, 'S-BIP-047': 2015, 'S-BIP-049': 2016,
    'S-BIP-050': 2013, 'S-BIP-052': 2013, 'S-BIP-061': 2013,
    'S-BIP-062': 2015, 'S-BIP-065': 2014, 'S-BIP-066': 2015,
    'S-BIP-067': 2015, 'S-BIP-068': 2015, 'S-BIP-069': 2014,
    'S-BIP-070': 2013, 'S-BIP-071': 2013, 'S-BIP-072': 2013,
    'S-BIP-073': 2016, 'S-BIP-074': 2016, 'S-BIP-075': 2015,
    'S-BIP-078': 2019, 'S-BIP-079': 2017, 'S-BIP-080': 2017,
    'S-BIP-081': 2017, 'S-BIP-083': 2017, 'S-BIP-085': 2020,
    'S-BIP-086': 2021, 'S-BIP-087': 2021, 'S-BIP-088': 2021,
    'S-BIP-091': 2017, 'S-BIP-093': 2015, 'S-BIP-102': 2015,
    'S-BIP-112': 2015, 'S-BIP-113': 2015, 'S-BIP-114': 2016,
    'S-BIP-116': 2017, 'S-BIP-117': 2017, 'S-BIP-118': 2017,
    'S-BIP-119': 2020, 'S-BIP-120': 2015, 'S-BIP-121': 2015,
    'S-BIP-122': 2015, 'S-BIP-123': 2015, 'S-BIP-124': 2015,
    'S-BIP-125': 2015, 'S-BIP-126': 2016, 'S-BIP-127': 2018,
    'S-BIP-129': 2020, 'S-BIP-130': 2015, 'S-BIP-131': 2015,
    'S-BIP-132': 2015, 'S-BIP-133': 2016, 'S-BIP-134': 2016,
    'S-BIP-135': 2017, 'S-BIP-136': 2017, 'S-BIP-137': 2019,
    'S-BIP-140': 2016, 'S-BIP-141': 2015, 'S-BIP-142': 2015,
    'S-BIP-143': 2016, 'S-BIP-144': 2016, 'S-BIP-145': 2016,
    'S-BIP-146': 2016, 'S-BIP-147': 2016, 'S-BIP-148': 2017,
    'S-BIP-149': 2017, 'S-BIP-150': 2016, 'S-BIP-151': 2016,
    'S-BIP-152': 2016, 'S-BIP-155': 2019, 'S-BIP-156': 2017,
    'S-BIP-157': 2017, 'S-BIP-158': 2017, 'S-BIP-159': 2017,
    'S-BIP-171': 2017, 'S-BIP-174': 2017, 'S-BIP-175': 2019,
    'S-BIP-176': 2017, 'S-BIP-178': 2018, 'S-BIP-179': 2019,
    'S-BIP-180': 2020, 'S-BIP-322': 2020, 'S-BIP-324': 2019,
    'S-BIP-325': 2019, 'S-BIP-326': 2021, 'S-BIP-327': 2022,
    'S-BIP-328': 2024, 'S-BIP-329': 2021, 'S-BIP-330': 2020,
    'S-BIP-331': 2020, 'S-BIP-338': 2021, 'S-BIP-339': 2021,
    'S-BIP-342': 2020, 'S-BIP-343': 2021, 'S-BIP-344': 2023,
    'S-BIP-345': 2023, 'S-BIP-346': 2024, 'S-BIP-347': 2023,
    'S-BIP-350': 2020, 'S-BIP-351': 2022, 'S-BIP-352': 2022,
    'S-BIP-353': 2024, 'S-BIP-371': 2021, 'S-BIP-372': 2022,
    'S-BIP-373': 2022, 'S-BIP-374': 2024, 'S-BIP-379': 2024,
    'S-BIP-380': 2021, 'S-BIP-381': 2021, 'S-BIP-382': 2021,
    'S-BIP-383': 2021, 'S-BIP-384': 2021, 'S-BIP-385': 2021,
    'S-BIP-386': 2022, 'S-BIP-387': 2022, 'S-BIP-388': 2022,
    'S-BIP-389': 2023, 'S-BIP-390': 2024, 'S-BIP-431': 2024,

    # ========== NIST Standards ==========
    'S-NIST-001': 2001, 'S-NIST-002': 2015, 'S-NIST-003': 2019,
    'S-NIST-057': 2006, 'S-NIST-090': 2015, 'S-NIST-186': 2023,
    'A-NIST-053': 2020, 'F-NIST-CSF2': 2024,

    # ========== FIPS Standards ==========
    'S-FIPS-1403': 2019, 'S-FIPS-1865': 2023,
    'S-FIPS-140': 2001, 'S-FIPS-180': 2015, 'S-FIPS-186': 2013,
    'S-FIPS-197': 2001, 'S-FIPS-198': 2002, 'S-FIPS-199': 2004,
    'S-FIPS-200': 2006, 'S-FIPS-201': 2022,

    # ========== EIP Standards (Ethereum) ==========
    'E-EIP-1559': 2021, 'E-EIP-2612': 2020, 'E-EIP-4337': 2021,
    'E-EIP-4361': 2021, 'E-EIP-4844': 2022, 'E-EIP-6963': 2023,
    'E-EIP-712': 2017, 'E-EIP-7702': 2024,
    'E-EIP-001': 2015, 'E-EIP-002': 2015, 'E-EIP-003': 2015,
    'E-EIP-004': 2015, 'E-EIP-005': 2015, 'E-EIP-006': 2015,
    'E-EIP-007': 2015, 'E-EIP-008': 2015, 'E-EIP-020': 2015,
    'E-EIP-055': 2016, 'E-EIP-100': 2016, 'E-EIP-137': 2016,
    'E-EIP-140': 2017, 'E-EIP-141': 2017, 'E-EIP-145': 2017,
    'E-EIP-150': 2016, 'E-EIP-155': 2016, 'E-EIP-160': 2016,
    'E-EIP-161': 2016, 'E-EIP-162': 2016, 'E-EIP-165': 2018,
    'E-EIP-170': 2016, 'E-EIP-181': 2016, 'E-EIP-190': 2017,
    'E-EIP-191': 2016, 'E-EIP-196': 2017, 'E-EIP-197': 2017,
    'E-EIP-198': 2017, 'E-EIP-211': 2017, 'E-EIP-214': 2017,
    'E-EIP-225': 2017, 'E-EIP-234': 2017, 'E-EIP-600': 2017,
    'E-EIP-601': 2017, 'E-EIP-615': 2017, 'E-EIP-616': 2017,
    'E-EIP-627': 2017, 'E-EIP-649': 2017, 'E-EIP-658': 2017,
    'E-EIP-681': 2017, 'E-EIP-695': 2017, 'E-EIP-706': 2017,
    'E-EIP-721': 2018, 'E-EIP-725': 2017, 'E-EIP-758': 2017,
    'E-EIP-777': 2017, 'E-EIP-778': 2017, 'E-EIP-779': 2017,
    'E-EIP-820': 2018, 'E-EIP-823': 2018, 'E-EIP-831': 2018,
    'E-EIP-858': 2018, 'E-EIP-867': 2018, 'E-EIP-868': 2018,
    'E-EIP-884': 2018, 'E-EIP-897': 2018, 'E-EIP-900': 2018,
    'E-EIP-902': 2018, 'E-EIP-918': 2018, 'E-EIP-926': 2018,
    'E-EIP-927': 2018, 'E-EIP-928': 2018, 'E-EIP-930': 2018,
    'E-EIP-965': 2018, 'E-EIP-969': 2018, 'E-EIP-998': 2018,
    'E-EIP-999': 2018, 'E-EIP-1010': 2018, 'E-EIP-1011': 2018,
    'E-EIP-1014': 2018, 'E-EIP-1015': 2018, 'E-EIP-1052': 2018,
    'E-EIP-1056': 2018, 'E-EIP-1057': 2018, 'E-EIP-1062': 2018,
    'E-EIP-1077': 2018, 'E-EIP-1078': 2018, 'E-EIP-1080': 2018,
    'E-EIP-1081': 2018, 'E-EIP-1087': 2018, 'E-EIP-1102': 2018,
    'E-EIP-1108': 2018, 'E-EIP-1109': 2018, 'E-EIP-1153': 2018,
    'E-EIP-1155': 2018, 'E-EIP-1167': 2018, 'E-EIP-1175': 2018,
    'E-EIP-1178': 2018, 'E-EIP-1186': 2018, 'E-EIP-1191': 2018,
    'E-EIP-1193': 2018, 'E-EIP-1202': 2018, 'E-EIP-1203': 2018,
    'E-EIP-1207': 2018, 'E-EIP-1227': 2018, 'E-EIP-1234': 2018,
    'E-EIP-1261': 2018, 'E-EIP-1271': 2018, 'E-EIP-1276': 2018,
    'E-EIP-1283': 2018, 'E-EIP-1285': 2018, 'E-EIP-1295': 2018,
    'E-EIP-1319': 2018, 'E-EIP-1328': 2018, 'E-EIP-1337': 2018,
    'E-EIP-1344': 2018, 'E-EIP-1352': 2018, 'E-EIP-1363': 2018,
    'E-EIP-1380': 2018, 'E-EIP-1386': 2018, 'E-EIP-1387': 2018,
    'E-EIP-1388': 2018, 'E-EIP-1417': 2018, 'E-EIP-1418': 2018,
    'E-EIP-1438': 2018, 'E-EIP-1444': 2018, 'E-EIP-1450': 2018,
    'E-EIP-1459': 2018, 'E-EIP-1462': 2018, 'E-EIP-1474': 2018,
    'E-EIP-1484': 2018, 'E-EIP-1485': 2018, 'E-EIP-1491': 2019,
    'E-EIP-1504': 2018, 'E-EIP-1523': 2018, 'E-EIP-1538': 2018,
    'E-EIP-1571': 2018, 'E-EIP-1577': 2018, 'E-EIP-1581': 2018,
    'E-EIP-1592': 2018, 'E-EIP-1613': 2018, 'E-EIP-1616': 2018,
    'E-EIP-1620': 2018, 'E-EIP-1633': 2018, 'E-EIP-1679': 2019,
    'E-EIP-1681': 2019, 'E-EIP-1682': 2019, 'E-EIP-1702': 2019,
    'E-EIP-1706': 2019, 'E-EIP-1710': 2019, 'E-EIP-1716': 2019,
    'E-EIP-1767': 2019, 'E-EIP-1775': 2019, 'E-EIP-1820': 2019,
    'E-EIP-1822': 2019, 'E-EIP-1829': 2019, 'E-EIP-1844': 2019,
    'E-EIP-1884': 2019, 'E-EIP-1890': 2019, 'E-EIP-1895': 2019,
    'E-EIP-1898': 2019, 'E-EIP-1900': 2019, 'E-EIP-1901': 2019,
    'E-EIP-1922': 2019, 'E-EIP-1923': 2019, 'E-EIP-1930': 2019,
    'E-EIP-1948': 2019, 'E-EIP-1959': 2019, 'E-EIP-1962': 2019,
    'E-EIP-1965': 2019, 'E-EIP-1967': 2019, 'E-EIP-1985': 2019,
    'E-EIP-2003': 2019, 'E-EIP-2014': 2019, 'E-EIP-2015': 2019,
    'E-EIP-2018': 2019, 'E-EIP-2019': 2019, 'E-EIP-2020': 2019,
    'E-EIP-2021': 2019, 'E-EIP-2025': 2019, 'E-EIP-2026': 2019,
    'E-EIP-2027': 2019, 'E-EIP-2028': 2019, 'E-EIP-2029': 2019,
    'E-EIP-2031': 2019, 'E-EIP-2035': 2019, 'E-EIP-2045': 2019,
    'E-EIP-2046': 2019, 'E-EIP-2124': 2019, 'E-EIP-2135': 2019,
    'E-EIP-2157': 2019, 'E-EIP-2159': 2019, 'E-EIP-2162': 2019,
    'E-EIP-2193': 2019, 'E-EIP-2200': 2019, 'E-EIP-2228': 2019,
    'E-EIP-2242': 2019, 'E-EIP-2255': 2019, 'E-EIP-2256': 2019,
    'E-EIP-2266': 2019, 'E-EIP-2304': 2019, 'E-EIP-2309': 2019,
    'E-EIP-2315': 2019, 'E-EIP-2327': 2019, 'E-EIP-2330': 2019,
    'E-EIP-2333': 2019, 'E-EIP-2334': 2019, 'E-EIP-2335': 2019,
    'E-EIP-2364': 2019, 'E-EIP-2378': 2019, 'E-EIP-2384': 2019,
    'E-EIP-2386': 2019, 'E-EIP-2387': 2019, 'E-EIP-2389': 2019,
    'E-EIP-2390': 2019, 'E-EIP-2400': 2019, 'E-EIP-2464': 2020,
    'E-EIP-2470': 2020, 'E-EIP-2474': 2020, 'E-EIP-2477': 2020,
    'E-EIP-2481': 2020, 'E-EIP-2494': 2020, 'E-EIP-2515': 2020,
    'E-EIP-2520': 2020, 'E-EIP-2525': 2020, 'E-EIP-2535': 2020,
    'E-EIP-2537': 2020, 'E-EIP-2539': 2020, 'E-EIP-2542': 2020,
    'E-EIP-2544': 2020, 'E-EIP-2545': 2020, 'E-EIP-2565': 2020,
    'E-EIP-2566': 2020, 'E-EIP-2567': 2020, 'E-EIP-2569': 2020,
    'E-EIP-2577': 2020, 'E-EIP-2578': 2020, 'E-EIP-2583': 2020,
    'E-EIP-2584': 2020, 'E-EIP-2590': 2020, 'E-EIP-2593': 2020,
    'E-EIP-2602': 2020, 'E-EIP-2610': 2020, 'E-EIP-2615': 2020,
    'E-EIP-2616': 2020, 'E-EIP-2617': 2020, 'E-EIP-2618': 2020,
    'E-EIP-2619': 2020, 'E-EIP-2620': 2020, 'E-EIP-2645': 2020,
    'E-EIP-2657': 2020, 'E-EIP-2666': 2020, 'E-EIP-2677': 2020,
    'E-EIP-2678': 2020, 'E-EIP-2680': 2020, 'E-EIP-2681': 2020,
    'E-EIP-2696': 2020, 'E-EIP-2700': 2020, 'E-EIP-2711': 2020,
    'E-EIP-2718': 2020, 'E-EIP-2719': 2020, 'E-EIP-2733': 2020,
    'E-EIP-2746': 2020, 'E-EIP-2770': 2020, 'E-EIP-2771': 2020,
    'E-EIP-2786': 2020, 'E-EIP-2803': 2020, 'E-EIP-2831': 2020,
    'E-EIP-2844': 2020, 'E-EIP-2848': 2020, 'E-EIP-2876': 2020,
    'E-EIP-2917': 2020, 'E-EIP-2926': 2020, 'E-EIP-2929': 2020,
    'E-EIP-2930': 2020, 'E-EIP-2935': 2020, 'E-EIP-2936': 2020,
    'E-EIP-2937': 2020, 'E-EIP-2938': 2020, 'E-EIP-2942': 2020,
    'E-EIP-2970': 2020, 'E-EIP-2972': 2020, 'E-EIP-2976': 2020,
    'E-EIP-2980': 2020, 'E-EIP-2981': 2020, 'E-EIP-2982': 2020,
    'E-EIP-3000': 2020, 'E-EIP-3005': 2020, 'E-EIP-3009': 2020,
    'E-EIP-3014': 2020, 'E-EIP-3026': 2020, 'E-EIP-3030': 2020,
    'E-EIP-3041': 2020, 'E-EIP-3044': 2020, 'E-EIP-3045': 2020,
    'E-EIP-3051': 2020, 'E-EIP-3068': 2020, 'E-EIP-3074': 2020,
    'E-EIP-3076': 2020, 'E-EIP-3085': 2020, 'E-EIP-3091': 2020,
    'E-EIP-3102': 2020, 'E-EIP-3135': 2020, 'E-EIP-3143': 2020,
    'E-EIP-3155': 2020, 'E-EIP-3156': 2020, 'E-EIP-3198': 2021,
    'E-EIP-3220': 2020, 'E-EIP-3224': 2021, 'E-EIP-3234': 2021,
    'E-EIP-3238': 2021, 'E-EIP-3267': 2021, 'E-EIP-3298': 2021,
    'E-EIP-3300': 2021, 'E-EIP-3322': 2021, 'E-EIP-3326': 2021,
    'E-EIP-3336': 2021, 'E-EIP-3337': 2021, 'E-EIP-3338': 2021,
    'E-EIP-3368': 2021, 'E-EIP-3372': 2021, 'E-EIP-3374': 2021,
    'E-EIP-3382': 2021, 'E-EIP-3386': 2021, 'E-EIP-3403': 2021,
    'E-EIP-3416': 2021, 'E-EIP-3436': 2021, 'E-EIP-3440': 2021,
    'E-EIP-3448': 2021, 'E-EIP-3450': 2021, 'E-EIP-3455': 2021,
    'E-EIP-3508': 2021, 'E-EIP-3520': 2021, 'E-EIP-3521': 2021,
    'E-EIP-3525': 2020, 'E-EIP-3529': 2021, 'E-EIP-3534': 2021,
    'E-EIP-3540': 2021, 'E-EIP-3541': 2021, 'E-EIP-3554': 2021,
    'E-EIP-3561': 2021, 'E-EIP-3569': 2021, 'E-EIP-3584': 2021,
    'E-EIP-3589': 2021, 'E-EIP-3607': 2021, 'E-EIP-3651': 2021,
    'E-EIP-3668': 2021, 'E-EIP-3670': 2021, 'E-EIP-3675': 2021,
    'E-EIP-3690': 2021, 'E-EIP-3709': 2021, 'E-EIP-3722': 2021,
    'E-EIP-3754': 2021, 'E-EIP-3756': 2021, 'E-EIP-3770': 2021,
    'E-EIP-3772': 2021, 'E-EIP-3779': 2021, 'E-EIP-3788': 2021,
    'E-EIP-3855': 2021, 'E-EIP-3860': 2021, 'E-EIP-3978': 2022,
    'E-EIP-4200': 2021, 'E-EIP-4345': 2021, 'E-EIP-4361': 2021,
    'E-EIP-4399': 2021, 'E-EIP-4400': 2021, 'E-EIP-4430': 2021,
    'E-EIP-4444': 2021, 'E-EIP-4488': 2021, 'E-EIP-4494': 2021,
    'E-EIP-4519': 2021, 'E-EIP-4520': 2021, 'E-EIP-4521': 2021,
    'E-EIP-4524': 2021, 'E-EIP-4527': 2021, 'E-EIP-4573': 2022,
    'E-EIP-4626': 2021, 'E-EIP-4671': 2022, 'E-EIP-4675': 2022,
    'E-EIP-4736': 2022, 'E-EIP-4750': 2022, 'E-EIP-4758': 2022,
    'E-EIP-4760': 2022, 'E-EIP-4762': 2022, 'E-EIP-4788': 2022,
    'E-EIP-4799': 2022, 'E-EIP-4803': 2022, 'E-EIP-4804': 2022,
    'E-EIP-4824': 2022, 'E-EIP-4834': 2022, 'E-EIP-4863': 2022,
    'E-EIP-4881': 2022, 'E-EIP-4883': 2022, 'E-EIP-4885': 2022,
    'E-EIP-4886': 2022, 'E-EIP-4906': 2022, 'E-EIP-4907': 2022,
    'E-EIP-4910': 2022, 'E-EIP-4918': 2022, 'E-EIP-4931': 2022,
    'E-EIP-4944': 2022, 'E-EIP-4950': 2022, 'E-EIP-4955': 2022,
    'E-EIP-4966': 2022, 'E-EIP-4972': 2022, 'E-EIP-4973': 2022,
    'E-EIP-4974': 2022, 'E-EIP-4985': 2022, 'E-EIP-4987': 2022,
    'E-EIP-5000': 2022, 'E-EIP-5003': 2022, 'E-EIP-5005': 2022,
    'E-EIP-5006': 2022, 'E-EIP-5007': 2022, 'E-EIP-5008': 2022,
    'E-EIP-5018': 2022, 'E-EIP-5022': 2022, 'E-EIP-5023': 2022,
    'E-EIP-5027': 2022, 'E-EIP-5050': 2022, 'E-EIP-5058': 2022,
    'E-EIP-5065': 2022, 'E-EIP-5081': 2022, 'E-EIP-5094': 2022,
    'E-EIP-5095': 2022, 'E-EIP-5114': 2022, 'E-EIP-5115': 2022,
    'E-EIP-5131': 2022, 'E-EIP-5133': 2022, 'E-EIP-5139': 2022,
    'E-EIP-5143': 2022, 'E-EIP-5164': 2022, 'E-EIP-5169': 2022,
    'E-EIP-5170': 2022, 'E-EIP-5173': 2022, 'E-EIP-5185': 2022,
    'E-EIP-5187': 2022, 'E-EIP-5189': 2022, 'E-EIP-5192': 2022,
    'E-EIP-5202': 2022, 'E-EIP-5216': 2022, 'E-EIP-5218': 2022,
    'E-EIP-5219': 2022, 'E-EIP-5247': 2022, 'E-EIP-5252': 2022,
    'E-EIP-5267': 2022, 'E-EIP-5269': 2022, 'E-EIP-5283': 2022,
    'E-EIP-5289': 2022, 'E-EIP-5298': 2022, 'E-EIP-5313': 2022,
    'E-EIP-5334': 2022, 'E-EIP-5345': 2022, 'E-EIP-5375': 2022,
    'E-EIP-5380': 2022, 'E-EIP-5409': 2022, 'E-EIP-5437': 2022,
    'E-EIP-5439': 2022, 'E-EIP-5450': 2022, 'E-EIP-5453': 2022,
    'E-EIP-5478': 2022, 'E-EIP-5484': 2022, 'E-EIP-5485': 2022,
    'E-EIP-5489': 2022, 'E-EIP-5496': 2022, 'E-EIP-5501': 2022,
    'E-EIP-5505': 2022, 'E-EIP-5507': 2022, 'E-EIP-5516': 2022,
    'E-EIP-5521': 2022, 'E-EIP-5528': 2022, 'E-EIP-5553': 2022,
    'E-EIP-5554': 2022, 'E-EIP-5559': 2022, 'E-EIP-5560': 2022,
    'E-EIP-5564': 2022, 'E-EIP-5568': 2022, 'E-EIP-5569': 2022,
    'E-EIP-5570': 2022, 'E-EIP-5573': 2022, 'E-EIP-5585': 2022,
    'E-EIP-5601': 2022, 'E-EIP-5604': 2022, 'E-EIP-5606': 2022,
    'E-EIP-5615': 2022, 'E-EIP-5625': 2022, 'E-EIP-5630': 2022,
    'E-EIP-5633': 2022, 'E-EIP-5635': 2022, 'E-EIP-5639': 2022,
    'E-EIP-5646': 2022, 'E-EIP-5656': 2022, 'E-EIP-5679': 2022,
    'E-EIP-5700': 2022, 'E-EIP-5719': 2022, 'E-EIP-5725': 2022,
    'E-EIP-5727': 2022, 'E-EIP-5732': 2022, 'E-EIP-5744': 2022,
    'E-EIP-5749': 2022, 'E-EIP-5750': 2022, 'E-EIP-5753': 2022,
    'E-EIP-5757': 2022, 'E-EIP-5773': 2022, 'E-EIP-5791': 2022,
    'E-EIP-5792': 2022, 'E-EIP-5806': 2022, 'E-EIP-5827': 2022,
    'E-EIP-5851': 2022, 'E-EIP-5883': 2022, 'E-EIP-5920': 2022,
    'E-EIP-5936': 2022, 'E-EIP-5982': 2022, 'E-EIP-6047': 2022,
    'E-EIP-6059': 2022, 'E-EIP-6065': 2022, 'E-EIP-6066': 2022,
    'E-EIP-6093': 2022, 'E-EIP-6105': 2022, 'E-EIP-6110': 2022,
    'E-EIP-6120': 2022, 'E-EIP-6122': 2022, 'E-EIP-6123': 2022,
    'E-EIP-6147': 2022, 'E-EIP-6150': 2022, 'E-EIP-6170': 2022,
    'E-EIP-6188': 2022, 'E-EIP-6189': 2022, 'E-EIP-6190': 2022,
    'E-EIP-6206': 2022, 'E-EIP-6220': 2022, 'E-EIP-6224': 2022,
    'E-EIP-6239': 2022, 'E-EIP-6268': 2022, 'E-EIP-6315': 2023,
    'E-EIP-6327': 2023, 'E-EIP-6353': 2023, 'E-EIP-6357': 2023,
    'E-EIP-6358': 2023, 'E-EIP-6366': 2023, 'E-EIP-6372': 2023,
    'E-EIP-6381': 2023, 'E-EIP-6384': 2023, 'E-EIP-6454': 2023,
    'E-EIP-6464': 2023, 'E-EIP-6465': 2023, 'E-EIP-6466': 2023,
    'E-EIP-6475': 2023, 'E-EIP-6492': 2023, 'E-EIP-6493': 2023,
    'E-EIP-6506': 2023, 'E-EIP-6538': 2023, 'E-EIP-6551': 2023,
    'E-EIP-6596': 2023, 'E-EIP-6604': 2023, 'E-EIP-6617': 2023,
    'E-EIP-6662': 2023, 'E-EIP-6672': 2023, 'E-EIP-6682': 2023,
    'E-EIP-6690': 2023, 'E-EIP-6712': 2023, 'E-EIP-6734': 2023,
    'E-EIP-6735': 2023, 'E-EIP-6780': 2023, 'E-EIP-6785': 2023,
    'E-EIP-6786': 2023, 'E-EIP-6787': 2023, 'E-EIP-6800': 2023,
    'E-EIP-6806': 2023, 'E-EIP-6808': 2023, 'E-EIP-6809': 2023,
    'E-EIP-6821': 2023, 'E-EIP-6823': 2023, 'E-EIP-6860': 2023,
    'E-EIP-6865': 2023, 'E-EIP-6900': 2023, 'E-EIP-6909': 2023,
    'E-EIP-6913': 2023, 'E-EIP-6914': 2023, 'E-EIP-6944': 2023,
    'E-EIP-6956': 2023, 'E-EIP-6960': 2023, 'E-EIP-6968': 2023,
    'E-EIP-6982': 2023, 'E-EIP-6988': 2023, 'E-EIP-6997': 2023,
    'E-EIP-7002': 2023, 'E-EIP-7007': 2023, 'E-EIP-7015': 2023,
    'E-EIP-7039': 2023, 'E-EIP-7044': 2023, 'E-EIP-7045': 2023,
    'E-EIP-7053': 2023, 'E-EIP-7066': 2023, 'E-EIP-7085': 2023,
    'E-EIP-7092': 2023, 'E-EIP-7093': 2023, 'E-EIP-7144': 2023,
    'E-EIP-7160': 2023, 'E-EIP-7201': 2023, 'E-EIP-7208': 2023,
    'E-EIP-7212': 2023, 'E-EIP-7229': 2023, 'E-EIP-7231': 2023,
    'E-EIP-7251': 2023, 'E-EIP-7254': 2023, 'E-EIP-7256': 2023,
    'E-EIP-7265': 2023, 'E-EIP-7266': 2023, 'E-EIP-7272': 2023,
    'E-EIP-7280': 2023, 'E-EIP-7281': 2023, 'E-EIP-7291': 2023,
    'E-EIP-7303': 2023, 'E-EIP-7310': 2023, 'E-EIP-7329': 2023,
    'E-EIP-7377': 2023, 'E-EIP-7400': 2023, 'E-EIP-7401': 2023,
    'E-EIP-7405': 2023, 'E-EIP-7409': 2023, 'E-EIP-7410': 2023,
    'E-EIP-7412': 2023, 'E-EIP-7417': 2023, 'E-EIP-7425': 2023,
    'E-EIP-7432': 2023, 'E-EIP-7444': 2023, 'E-EIP-7484': 2023,
    'E-EIP-7492': 2023, 'E-EIP-7495': 2023, 'E-EIP-7496': 2023,
    'E-EIP-7498': 2023, 'E-EIP-7500': 2023, 'E-EIP-7503': 2023,
    'E-EIP-7504': 2023, 'E-EIP-7506': 2023, 'E-EIP-7507': 2023,
    'E-EIP-7508': 2023, 'E-EIP-7509': 2023, 'E-EIP-7510': 2023,
    'E-EIP-7511': 2023, 'E-EIP-7512': 2023, 'E-EIP-7518': 2023,
    'E-EIP-7519': 2023, 'E-EIP-7520': 2023, 'E-EIP-7521': 2023,
    'E-EIP-7522': 2023, 'E-EIP-7523': 2023, 'E-EIP-7524': 2023,
    'E-EIP-7525': 2023, 'E-EIP-7527': 2023, 'E-EIP-7528': 2023,
    'E-EIP-7529': 2023, 'E-EIP-7530': 2023, 'E-EIP-7531': 2023,

    # ========== ERC Standards ==========
    'E-ERC-20': 2015, 'E-ERC-721': 2018, 'E-ERC-1155': 2018,
    'E-ERC-4626': 2022, 'E-ERC-6900': 2023,

    # ========== RFC Standards ==========
    'S-RFC-5869': 2010, 'S-RFC-6979': 2013, 'S-RFC-8032': 2017,
    'S-RFC-8446': 2018, 'S-RFC-9106': 2022,
    'S-RFC-2104': 1997, 'S-RFC-2898': 2000, 'S-RFC-3447': 2003,
    'S-RFC-4880': 2007, 'S-RFC-5116': 2008, 'S-RFC-5652': 2009,
    'S-RFC-6090': 2011, 'S-RFC-7539': 2015, 'S-RFC-7693': 2015,
    'S-RFC-7748': 2016, 'S-RFC-8017': 2016, 'S-RFC-8018': 2017,
    'S-RFC-8439': 2018,

    # ========== ISO Standards ==========
    'F-ISO-27001': 2013, 'F-ISO-27017': 2015, 'F-ISO-27035': 2016,
    'F-ISO-27701': 2019, 'F-ISO-22301': 2019,
    'A-ISO-24759': 2017, 'A-ISO-17712': 2013,
    'S-ISO-18033': 2015, 'E-ISO-25010': 2011, 'E-ISO-9241': 1998,

    # ========== Regulatory ==========
    'F-MICA': 2023, 'F-DORA': 2022, 'F-GDPR-001': 2016,
    'F-FCA': 2000, 'F-MAS': 2020, 'F-JFSA': 2017,
    'F-VARA': 2022, 'F-SOC2-T2': 2010,
    'F-MICA-001': 2023, 'F-MICA-002': 2023, 'F-MICA-003': 2023,
    'F-GDPR-002': 2016, 'F-GDPR-003': 2016,
    'F-SEC-CFTC': 2022, 'F-FATF-TR': 2019,
    'F-PCI-DSS4': 2022, 'S-PCI-001': 2004, 'S-PCI-002': 2004,

    # ========== Zero Knowledge ==========
    'S-ZK-GROTH16': 2016, 'S-ZK-PLONK': 2019,
    'S-ZK-STARK': 2018, 'S-ZK-HALO2': 2020, 'S-ZK-CAIRO': 2021,

    # ========== SLIP Standards ==========
    'S-SLIP-0039': 2017, 'S-SLIP-0044': 2014,
    'S-SLIP-001': 2014, 'S-SLIP-002': 2014,

    # ========== Post-Quantum ==========
    'S-PQC-KYBER': 2022, 'S-PQC-DILITH': 2022, 'S-PQC-SPHINCS': 2022,

    # ========== OWASP ==========
    'A-OWASP-001': 2017, 'A-OWASP-002': 2017,
    'A-OWASP-003': 2017, 'A-OWASP-004': 2017, 'A-OWASP-MASVS': 2017,

    # ========== Common Criteria ==========
    'A-CC-001': 1999, 'A-CC-002': 1999, 'A-CC-003': 1999, 'A-CC-15408': 1999,

    # ========== Hardware Security ==========
    'A-ARM-TZ': 2004, 'A-INTEL-SGX': 2015, 'A-AMD-SEV': 2016,
    'A-AWS-NITRO': 2017, 'A-APPLE-SE': 2016, 'A-GOOGLE-TM2': 2018,
    'A-GCP-CVM': 2020, 'A-AZURE-CVM': 2021, 'A-STM-ST33': 2010,
    'A-INF-SE': 2012, 'A-GP-TEE': 2010,

    # ========== Protocols ==========
    'E-WC-V2': 2022, 'E-ENS': 2017, 'A-FIDO2': 2018,
    'E-SAFE': 2018, 'E-CAIP': 2019, 'E-CCIP': 2022,
    'E-LAYERZERO': 2022, 'E-OP-STACK': 2022, 'E-ZKEVM': 2022,
    'E-UNISWAP-V4': 2023, 'E-FLASHBOTS': 2020, 'E-COW-1INCH': 2021,
    'E-LINKAYER0': 2022, 'E-ORDINALS': 2023, 'E-WORLDCOIN': 2023,
    'E-GITCOIN': 2017, 'E-LIT': 2021, 'E-AA-BUNDLERS': 2022,

    # ========== CCSS (Cryptocurrency Security Standard) ==========
    'S-CCSS-001': 2014, 'S-CCSS-002': 2014, 'S-CCSS-003': 2014, 'S-CCSS-004': 2014,
    'F-CCSS-III': 2014,

    # ========== Smart Contract Security ==========
    'S-SC-REENTR': 2016, 'S-SC-OVERFLOW': 2016, 'S-SC-FLASH': 2020,
    'S-SC-FRONTRUN': 2019, 'S-SC-ACCESS': 2017, 'S-SC-ORACLE': 2020,
    'S-SC-AUDIT': 2016, 'S-SC-MULTISIG': 2017, 'S-SC-PROXY': 2018,
    'S-SC-TIMELOCK': 2019,

    # ========== DeFi Security ==========
    'S-DEX-AUDIT': 2020, 'S-DEX-ORACLE': 2020,
    'S-LEND-AUDIT': 2020, 'S-LEND-ORACLE': 2020, 'S-LEND-COLLAT': 2020,
    'S-LEND-FLASH': 2020, 'S-LEND-LIQUI': 2020,
    'S-LST-AUDIT': 2021, 'S-LST-ORACLE': 2021, 'S-LST-VALID': 2021, 'S-LST-SLASH': 2021,
    'S-STAKE-KEY': 2020, 'S-STAKE-REDUND': 2020, 'S-STAKE-VALID': 2020, 'S-STAKE-SLASH': 2020,
    'S-PERP-AUDIT': 2021, 'S-PERP-ORACLE': 2021, 'S-PERP-ENGINE': 2021,
    'S-PERP-LIQUI': 2021, 'S-PERP-MONITOR': 2021, 'S-PERP-ACCESS': 2021,
    'S-YIELD-AUDIT': 2020, 'S-YIELD-ORACLE': 2020, 'S-YIELD-ACCESS': 2020,
    'S-YIELD-LIMIT': 2020, 'S-YIELD-TIMELOCK': 2020, 'S-YIELD-STRAT': 2020,
    'S-BRIDGE-AUDIT': 2021, 'S-BRIDGE-VALID': 2021, 'S-BRIDGE-LOCK': 2021,
    'S-BRIDGE-MPC': 2021, 'S-BRIDGE-PAUSE': 2021,
    'S-BR-VALID': 2021, 'S-BR-LOCK': 2021, 'S-BR-MINT': 2021,
    'S-BR-THRESH': 2021, 'S-BR-RELAY': 2021,

    # ========== CEX Security ==========
    'S-CEX-COLD': 2014, 'S-CEX-HSM': 2016, 'S-CEX-MULTISIG': 2017,
    'S-CEX-PENTEST': 2018, 'S-CEX-DDOS': 2016, 'S-CEX-WAF': 2015,

    # ========== Custody ==========
    'S-CUST-AIR': 2018, 'S-CUST-HSM': 2016, 'S-CUST-MPC': 2019,
    'S-CUST-POLICY': 2019, 'S-CUST-SOC2': 2018,

    # ========== Banking/Card ==========
    'S-BANK-CYBER': 2020, 'S-BANK-CUSTODY': 2019, 'S-BANK-LICENSE': 2019,
    'S-BANK-AML': 2020, 'S-BANK-SEGR': 2019, 'S-BANK-SOC2': 2018,
    'S-CARD-EMV': 1996, 'S-CARD-PCI': 2004,
    'S-PAY-ENCRYPT': 2010, 'S-PAY-FRAUD': 2015, 'S-PAY-PCI': 2004,

    # ========== NFT ==========
    'S-NFT-AUDIT': 2021, 'S-NFT-VERIFY': 2021, 'S-NFT-ROYALTY': 2022,

    # ========== Privacy ==========
    'S-PVY-SAPLING': 2018, 'S-PVY-AZTEC': 2019, 'S-PVY-RAILGUN': 2021,

    # ========== Advanced Crypto ==========
    'S-ADV-PEDERSEN': 1991, 'S-ADV-KZG': 2010, 'S-ADV-FHE': 2009, 'S-ADV-MPC-TLS': 2022,
    'S-LIB-SODIUM': 2013, 'S-LIB-SIGNAL': 2016, 'S-LIB-NOISE': 2018,

    # ========== Fidelity ==========
    'F-AUDIT-FIN': 2010, 'F-BUGBOUNTY': 2013, 'F-CEX-AUDIT': 2018,
    'F-CEX-INSURANCE': 2019, 'F-CEX-LICENSE': 2018, 'F-CEX-POR': 2022,
    'F-CEX-SEGREG': 2019, 'F-CUST-INSUR': 2019, 'F-CUST-REGLIC': 2019,
    'F-CUST-SLA': 2018, 'F-DEFI-INS': 2020, 'F-PERP-INSUR': 2021,
    'F-PERP-FUND': 2021, 'F-PERP-OI': 2021, 'F-LEND-GOV': 2020,
    'F-LEND-INSUR': 2020, 'F-LEND-TVL': 2020, 'F-LEND-UTIL': 2020,
    'F-LST-PEG': 2021, 'F-LST-TVL': 2021, 'F-BANK-AUDIT': 2015,
    'F-BANK-DEPOSIT': 2019, 'F-BANK-RESERVE': 2019, 'F-CARD-CASHBACK': 2018,
    'F-CARD-CONVERT': 2019, 'F-PAY-LICENSE': 2018, 'F-PAY-UPTIME': 2018,
    'F-WALLET-SUPPORT': 2016, 'F-WALLET-UPDATE': 2016, 'F-WALLET-WARRANTY': 2016,
    'F-INCIDENT': 2018, 'F-POSTMORTEM': 2018, 'F-MONITOR': 2018, 'F-POR': 2022,
    'F-CERTORA': 2020, 'F-CODE4RENA': 2021, 'F-SPEARBIT': 2021,
    'F-IMMUNEFI': 2020, 'F-FORTA': 2021, 'F-OZ-DEFENDER': 2020,
    'F-CHAINLINK-POR': 2022, 'F-COLD': 2014, 'F-SEGREG': 2019,
    'F-BRIDGE-TIME': 2021, 'F-BRIDGE-TVL': 2021, 'F-BRIDGE-RATE': 2021,
    'F-CIS-V8': 2021, 'F-SBOM': 2021, 'F-SIGSTORE': 2021,
    'F-SLSA': 2021, 'F-OSSF-SC': 2020, 'F-REPRO': 2018,
    'F-NEXUS': 2019, 'F-STAKE-PERF': 2020, 'F-STAKE-FEE': 2020,
    'F-STAKE-UPTIME': 2020, 'F-YIELD-APY': 2020, 'F-YIELD-HIST': 2020,
    'F-YIELD-TVL': 2020, 'F-NFT-META': 2021, 'F-NFT-FEE': 2021,
    'F-TVL-TRACK': 2020, 'F-LICENSE': 2018,
    'F-SOC2-001': 2010, 'F-SOC2-002': 2010, 'F-SOC2-003': 2010,
    'F-ISO-001': 2013, 'F-ISO-002': 2015, 'F-ISO-003': 2016, 'F-ISO-004': 2019,

    # ========== Adversity ==========
    'A-DRS-001': 2018, 'A-DRS-002': 2018, 'A-DRS-003': 2018,
    'A-HDN-001': 2016, 'A-HDN-002': 2016, 'A-HDN-003': 2016, 'A-HDN-004': 2016, 'A-HDN-005': 2016,
    'A-PNC-001': 2017, 'A-PNC-002': 2017, 'A-PNC-003': 2017,
    'A-PNC-004': 2017, 'A-PNC-005': 2017, 'A-PNC-006': 2017,
    'A-PHY-001': 2016, 'A-PHY-002': 2016, 'A-PHY-003': 2016, 'A-PHY-004': 2016,
    'A-OPS-001': 2018, 'A-OPS-002': 2018, 'A-OPS-003': 2018, 'A-OPS-004': 2018,
    'A-OPS-005': 2018, 'A-OPS-006': 2018, 'A-OPS-007': 2018, 'A-OPS-008': 2018,
    'A-SOC-001': 2019, 'A-SOC-002': 2019, 'A-SOC-003': 2019, 'A-SOC-004': 2019,
    'A-CRYPTO-DURESS': 2018, 'A-CRYPTO-SSS': 2017, 'A-CRYPTO-TIMELOCK': 2019,
    'A-CUST-DURESS': 2019, 'A-CUST-GEOCONT': 2019, 'A-CUST-QUORUM': 2019, 'A-CUST-TIMELK': 2019,
    'A-CEX-2FA': 2015, 'A-CEX-DELAY': 2018, 'A-CEX-FREEZE': 2019, 'A-CEX-LIMIT': 2018, 'A-CEX-WHITELIST': 2019,
    'A-BANK-ACCESS': 2019, 'A-BANK-FREEZE': 2019, 'A-BANK-TRANS': 2019,
    'A-PERP-MARGIN': 2021, 'A-PERP-LEVER': 2021, 'A-PERP-STOP': 2021,
    'A-LST-QUEUE': 2021, 'A-LST-REDEEM': 2021,
    'A-LEND-COOL': 2020, 'A-LEND-EMERG': 2020, 'A-LEND-LIMIT': 2020,
    'A-NFT-ESCROW': 2021, 'A-NFT-CANCEL': 2021, 'A-NFT-FRAUD': 2021,
    'A-STAKE-NOCUST': 2020, 'A-STAKE-UNSTK': 2020, 'A-STAKE-DELAY': 2020,
    'A-BRIDGE-VERIFY': 2021, 'A-BRIDGE-DELAY': 2021, 'A-BRIDGE-LIMIT': 2021,
    'A-YIELD-LOCK': 2020, 'A-YIELD-EXIT': 2020, 'A-YIELD-FEE': 2020,
    'A-PAY-REFUND': 2018, 'A-PAY-DISPUTE': 2018,
    'A-ETSI-103097': 2017, 'A-EMVCO': 1996, 'A-PCI-PIN': 2004, 'A-TEMPEST': 1972,

    # ========== Universal Adversity (A151-A170) ==========
    'A151': 2020, 'A152': 2020, 'A153': 2020, 'A154': 2020, 'A155': 2020,
    'A156': 2020, 'A157': 2020, 'A158': 2020, 'A159': 2020, 'A160': 2020,
    'A161': 2022, 'A162': 2020, 'A163': 2020, 'A164': 2020, 'A165': 2020,
    'A166': 2020, 'A167': 2020, 'A168': 2020, 'A169': 2020, 'A170': 2020,

    # ========== Efficiency ==========
    'E-PAIRS': 2017, 'E-SPOT': 2017, 'E-FUTURES': 2019, 'E-MARGIN': 2018,
    'E-PERP-API': 2021, 'E-PERP-PAIRS': 2021, 'E-CEX-PAIRS': 2017,
    'E-CEX-FIAT': 2018, 'E-CEX-MOBILE': 2016, 'E-CEX-API': 2017,
    'E-LEND-ASSETS': 2020, 'E-LEND-CHAINS': 2021, 'E-LEND-RATES': 2020,
    'E-STAKE-CHAINS': 2020, 'E-STAKE-REWARDS': 2020, 'E-LST-DEFI': 2021, 'E-LST-REWARD': 2021,
    'E-YIELD-VAULT': 2020, 'E-YIELD-ZAPS': 2020,
    'E-BRIDGE-CHAINS': 2021, 'E-BRIDGE-TOKEN': 2021, 'E-BRIDGE-FEE': 2021,
    'E-CUST-CHAINS': 2019, 'E-CUST-DEFI': 2020, 'E-CUST-STAKE': 2020,
    'E-NFT-CHAINS': 2021, 'E-NFT-RARITY': 2021,
    'E-ORACLES': 2020, 'E-BANK-CARD': 2019, 'E-BANK-IBAN': 2019,
    'E-BANK-LOANS': 2020, 'E-BANK-SAVINGS': 2020,
    'E-FIAT-ON': 2018, 'E-FIAT-OFF': 2018, 'E-PAY-CRYPTO': 2018,
    'E-PAY-FIAT': 2018, 'E-PAY-METHODS': 2018,
    'E-WCAG-22': 2023,

    # ========== Numeric codes (S01-S300, A01-A200, F01-F210, E01-E260) ==========
    # These are internal codes, year based on SafeScoring framework creation
}


def extract_year(norm: dict) -> int | None:
    """Extract year using multiple methods with fallbacks"""
    code = norm.get('code', '')
    title = norm.get('title', '')
    description = norm.get('description', '')
    standard_ref = norm.get('standard_reference', '')

    # 1. Check known years first
    if code in KNOWN_YEARS:
        return KNOWN_YEARS[code]

    # 2. Try to extract from standard_reference
    if standard_ref:
        match = re.search(r'\b(19|20)\d{2}\b', standard_ref)
        if match:
            return int(match.group())

    # 3. Try AI providers (with rotation) - OpenRouter first (most reliable)
    year = extract_year_with_openrouter(code, title, description, standard_ref)
    if year:
        return year

    year = extract_year_with_groq(code, title, description, standard_ref)
    if year:
        return year

    year = extract_year_with_sambanova(code, title, description, standard_ref)
    if year:
        return year

    year = extract_year_with_gemini(code, title, description, standard_ref)
    if year:
        return year

    return None


def main():
    print("=" * 60)
    print("ENRICHISSEMENT STANDARD_YEAR - SafeScoring")
    print("=" * 60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"OpenRouter keys: {len(OPENROUTER_API_KEYS)} (primary)")
    print(f"Groq keys: {len(GROQ_API_KEYS)}")
    print(f"Gemini keys: {len(GEMINI_API_KEYS)}")
    print(f"SambaNova keys: {len(SAMBANOVA_API_KEYS)}")
    print()

    # Get norms without standard_year
    headers = get_supabase_headers()
    headers['Prefer'] = 'count=exact'

    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,code,title,description,standard_reference&standard_year=is.null&limit=2000",
        headers=headers
    )

    if response.status_code not in [200, 206]:
        print(f"ERROR: Failed to fetch norms: {response.status_code}")
        return

    norms = response.json()
    total = len(norms)
    print(f"Normes sans standard_year: {total}")
    print()

    if total == 0:
        print("Toutes les normes ont deja une annee!")
        return

    # Process norms
    updated = 0
    errors = 0

    for i, norm in enumerate(norms):
        code = norm.get('code', 'N/A')
        print(f"[{i+1}/{total}] {code}...", end=" ")

        year = extract_year(norm)

        if year:
            # Update in database
            update_response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm['id']}",
                headers=get_supabase_headers(),
                json={"standard_year": year}
            )

            if update_response.status_code in [200, 204]:
                print(f"{year}")
                updated += 1
            else:
                print(f"ERREUR DB: {update_response.status_code}")
                errors += 1
        else:
            print("UNKNOWN")

        # Rate limit
        if (i + 1) % 10 == 0:
            time.sleep(0.5)

    print()
    print("=" * 60)
    print(f"RESULTAT:")
    print(f"  Mis a jour: {updated}/{total}")
    print(f"  Erreurs: {errors}")
    print(f"  Non trouves: {total - updated - errors}")
    print("=" * 60)


if __name__ == "__main__":
    main()
