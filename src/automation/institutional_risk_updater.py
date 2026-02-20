"""
Automated Institutional Risk Data Updater
==========================================
Fetches and updates institutional security risk data from reliable sources:
- Transparency International (Corruption Perceptions Index)
- News APIs for government data breaches
- Official breach disclosure databases
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Optional
import httpx
from supabase import create_client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Supabase client
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

# =============================================================================
# DATA SOURCES CONFIGURATION
# =============================================================================

SOURCES = {
    "transparency_international": {
        "name": "Transparency International CPI",
        "url": "https://www.transparency.org/cpi2023/downloads",
        "api_url": None,  # Manual download required, but we can scrape
        "frequency": "yearly",
        "reliability": "official"
    },
    "news_api": {
        "name": "News API",
        "url": "https://newsapi.org/v2/everything",
        "api_key_env": "NEWS_API_KEY",
        "frequency": "daily",
        "reliability": "news"
    },
    "gdelt": {
        "name": "GDELT Project",
        "url": "https://api.gdeltproject.org/api/v2/doc/doc",
        "frequency": "realtime",
        "reliability": "aggregated"
    },
    "haveibeenpwned": {
        "name": "Have I Been Pwned",
        "url": "https://haveibeenpwned.com/api/v3/breaches",
        "frequency": "daily",
        "reliability": "official"
    }
}

# Transparency International CPI 2023 Data (hardcoded as backup)
# Source: https://www.transparency.org/cpi2023
TI_CPI_2023 = {
    "DK": 90, "FI": 87, "NZ": 85, "NO": 84, "SG": 83, "SE": 82, "CH": 82,
    "NL": 79, "DE": 78, "LU": 78, "IE": 77, "AU": 75, "HK": 75, "CA": 74,
    "EE": 74, "BE": 73, "JP": 73, "GB": 71, "FR": 71, "AE": 68, "US": 69,
    "PT": 61, "IL": 62, "KR": 63, "ES": 60, "IT": 56, "MY": 50, "SA": 52,
    "CN": 42, "IN": 39, "BR": 36, "MX": 31, "RU": 26, "NG": 25, "BD": 24,
}

# Keywords for searching institutional incidents
INCIDENT_KEYWORDS = {
    "tax_authority": [
        "tax office data breach", "IRS hack", "HMRC breach", "fiscal data leak",
        "tax authority corruption", "revenue service breach", "impots fuite donnees"
    ],
    "financial_regulator": [
        "financial regulator breach", "SEC data leak", "FCA hack", "AMF breach",
        "banking regulator data"
    ],
    "intelligence": [
        "intelligence agency leak", "spy agency corruption", "DGSI", "NSA breach",
        "MI5 data leak"
    ],
    "crypto_specific": [
        "crypto holder data breach", "bitcoin investor data leak",
        "cryptocurrency tax data stolen", "crypto declaration leak",
        "exchange KYC data breach government"
    ]
}

# =============================================================================
# TRANSPARENCY INTERNATIONAL CPI UPDATER
# =============================================================================

async def update_corruption_scores():
    """Update corruption perception scores from Transparency International."""
    logger.info("Updating Transparency International CPI scores...")

    updated_count = 0
    for country_code, cpi_score in TI_CPI_2023.items():
        try:
            result = supabase.table("country_institutional_risks").update({
                "corruption_perception_score": cpi_score,
                "last_updated": datetime.utcnow().isoformat()
            }).eq("country_code", country_code).execute()

            if result.data:
                updated_count += 1
        except Exception as e:
            logger.error(f"Error updating CPI for {country_code}: {e}")

    logger.info(f"Updated CPI scores for {updated_count} countries")
    return updated_count

# =============================================================================
# NEWS API INCIDENT FETCHER
# =============================================================================

async def fetch_news_incidents(days_back: int = 30) -> list:
    """Fetch recent institutional incidents from news sources."""

    api_key = os.getenv("NEWS_API_KEY")
    if not api_key:
        logger.warning("NEWS_API_KEY not set, skipping news fetch")
        return []

    incidents = []
    from_date = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%d")

    async with httpx.AsyncClient() as client:
        for category, keywords in INCIDENT_KEYWORDS.items():
            for keyword in keywords:
                try:
                    response = await client.get(
                        SOURCES["news_api"]["url"],
                        params={
                            "q": keyword,
                            "from": from_date,
                            "sortBy": "relevancy",
                            "language": "en",
                            "apiKey": api_key
                        },
                        timeout=30
                    )

                    if response.status_code == 200:
                        data = response.json()
                        for article in data.get("articles", [])[:5]:
                            incidents.append({
                                "title": article.get("title"),
                                "description": article.get("description"),
                                "url": article.get("url"),
                                "source": article.get("source", {}).get("name"),
                                "published_at": article.get("publishedAt"),
                                "category": category,
                                "keyword": keyword
                            })
                except Exception as e:
                    logger.error(f"Error fetching news for '{keyword}': {e}")

    logger.info(f"Fetched {len(incidents)} potential incidents from news")
    return incidents

# =============================================================================
# GDELT PROJECT FETCHER (Free, no API key required)
# =============================================================================

async def fetch_gdelt_incidents(days_back: int = 7) -> list:
    """Fetch incidents from GDELT Project (free, comprehensive news database)."""

    incidents = []

    queries = [
        "tax authority data breach",
        "government employee corruption crypto",
        "fiscal data leak cryptocurrency",
        "tax office insider threat",
        "revenue service data theft"
    ]

    async with httpx.AsyncClient() as client:
        for query in queries:
            try:
                response = await client.get(
                    SOURCES["gdelt"]["url"],
                    params={
                        "query": query,
                        "mode": "artlist",
                        "maxrecords": 25,
                        "format": "json",
                        "timespan": f"{days_back}d"
                    },
                    timeout=30
                )

                if response.status_code == 200:
                    data = response.json()
                    for article in data.get("articles", []):
                        # Extract country from article
                        country = extract_country_from_text(
                            article.get("title", "") + " " + article.get("seendate", "")
                        )

                        incidents.append({
                            "title": article.get("title"),
                            "url": article.get("url"),
                            "source": article.get("domain"),
                            "date": article.get("seendate"),
                            "country_code": country,
                            "query": query
                        })
            except Exception as e:
                logger.error(f"Error fetching GDELT for '{query}': {e}")

    logger.info(f"Fetched {len(incidents)} incidents from GDELT")
    return incidents

# =============================================================================
# COUNTRY EXTRACTION
# =============================================================================

COUNTRY_KEYWORDS = {
    "FR": ["france", "french", "paris", "dgfip", "fisc français", "bobigny"],
    "US": ["united states", "usa", "american", "irs", "washington"],
    "GB": ["united kingdom", "uk", "british", "hmrc", "london"],
    "DE": ["germany", "german", "bafin", "berlin"],
    "BR": ["brazil", "brazilian", "receita federal", "são paulo"],
    "AU": ["australia", "australian", "ato", "sydney"],
    "KR": ["south korea", "korean", "fss", "seoul"],
    "JP": ["japan", "japanese", "tokyo"],
    "SG": ["singapore", "singaporean", "mas"],
    "CH": ["switzerland", "swiss", "finma", "zurich"],
    "CN": ["china", "chinese", "beijing"],
    "IN": ["india", "indian", "mumbai", "delhi"],
    "CA": ["canada", "canadian", "cra", "ottawa"],
    "AE": ["uae", "emirates", "dubai", "abu dhabi"],
    "PT": ["portugal", "portuguese", "lisbon"],
}

def extract_country_from_text(text: str) -> Optional[str]:
    """Extract country code from text content."""
    text_lower = text.lower()
    for country_code, keywords in COUNTRY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                return country_code
    return None

# =============================================================================
# INCIDENT CLASSIFIER (AI-assisted)
# =============================================================================

def classify_incident_severity(incident: dict) -> dict:
    """Classify incident severity based on content analysis."""

    title = (incident.get("title") or "").lower()
    description = (incident.get("description") or "").lower()
    content = title + " " + description

    # Severity indicators
    severity_score = 5  # Base score
    risk_level = "medium"
    incident_type = "data_breach"
    crypto_related = False

    # Check for crypto-related keywords
    crypto_keywords = ["crypto", "bitcoin", "btc", "ethereum", "wallet", "exchange"]
    if any(kw in content for kw in crypto_keywords):
        crypto_related = True
        severity_score += 2

    # Check for severity escalation
    if any(kw in content for kw in ["kidnap", "attack", "murder", "assault"]):
        severity_score += 3
        risk_level = "critical"
    elif any(kw in content for kw in ["extortion", "blackmail", "ransom"]):
        severity_score += 2
        risk_level = "high"
    elif any(kw in content for kw in ["corruption", "bribe", "insider"]):
        severity_score += 1
        incident_type = "insider_corruption"

    # Check for scale
    if any(kw in content for kw in ["million", "thousands", "massive", "major"]):
        severity_score += 1

    return {
        "severity_score": min(severity_score, 10),
        "risk_level": risk_level,
        "incident_type": incident_type,
        "crypto_related": crypto_related
    }

# =============================================================================
# DATABASE UPDATERS
# =============================================================================

async def save_incident_to_review(incident: dict, classification: dict):
    """Save a potential incident for manual review before publishing."""

    try:
        # Check if already exists
        existing = supabase.table("institutional_incidents_pending").select("id").eq(
            "source_url", incident.get("url")
        ).execute()

        if existing.data:
            logger.debug(f"Incident already in review queue: {incident.get('title')}")
            return False

        slug = generate_slug(incident.get("title", "unknown"))

        result = supabase.table("institutional_incidents_pending").insert({
            "title": incident.get("title"),
            "slug": slug,
            "description": incident.get("description"),
            "source_url": incident.get("url"),
            "source_name": incident.get("source"),
            "country_code": incident.get("country_code"),
            "incident_type": classification.get("incident_type"),
            "severity_score": classification.get("severity_score"),
            "systemic_risk_level": classification.get("risk_level"),
            "crypto_holders_targeted": classification.get("crypto_related"),
            "auto_detected_at": datetime.utcnow().isoformat(),
            "review_status": "pending",
            "raw_data": json.dumps(incident)
        }).execute()

        logger.info(f"Saved incident for review: {incident.get('title')}")
        return True

    except Exception as e:
        logger.error(f"Error saving incident: {e}")
        return False

def generate_slug(title: str) -> str:
    """Generate URL-friendly slug from title."""
    import re
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = slug[:80]
    slug = f"{slug}-{datetime.utcnow().strftime('%Y%m%d')}"
    return slug

async def update_country_risk_scores():
    """Recalculate country risk scores based on incidents."""

    logger.info("Recalculating country risk scores...")

    # Get incident counts per country
    result = supabase.rpc("calculate_country_incident_stats").execute()

    if not result.data:
        # Manual calculation if RPC doesn't exist
        incidents = supabase.table("institutional_incidents").select(
            "country_code, crypto_holders_targeted"
        ).execute()

        country_stats = {}
        for inc in incidents.data or []:
            cc = inc.get("country_code")
            if cc not in country_stats:
                country_stats[cc] = {"total": 0, "crypto": 0}
            country_stats[cc]["total"] += 1
            if inc.get("crypto_holders_targeted"):
                country_stats[cc]["crypto"] += 1

        for country_code, stats in country_stats.items():
            supabase.table("country_institutional_risks").update({
                "incidents_last_5_years": stats["total"],
                "incidents_crypto_related": stats["crypto"],
                "last_updated": datetime.utcnow().isoformat()
            }).eq("country_code", country_code).execute()

    logger.info("Country risk scores updated")

# =============================================================================
# MAIN PIPELINE
# =============================================================================

async def run_full_update():
    """Run the complete update pipeline."""

    logger.info("=" * 60)
    logger.info("Starting Institutional Risk Data Update Pipeline")
    logger.info("=" * 60)

    # 1. Update corruption scores (yearly data)
    await update_corruption_scores()

    # 2. Fetch incidents from GDELT (free, no API key)
    gdelt_incidents = await fetch_gdelt_incidents(days_back=30)

    # 3. Fetch incidents from News API (if key available)
    news_incidents = await fetch_news_incidents(days_back=30)

    # 4. Process and classify all incidents
    all_incidents = gdelt_incidents + news_incidents
    logger.info(f"Processing {len(all_incidents)} total incidents...")

    saved_count = 0
    for incident in all_incidents:
        if incident.get("country_code"):
            classification = classify_incident_severity(incident)
            if await save_incident_to_review(incident, classification):
                saved_count += 1

    logger.info(f"Saved {saved_count} new incidents for review")

    # 5. Recalculate country scores
    await update_country_risk_scores()

    logger.info("=" * 60)
    logger.info("Pipeline completed successfully")
    logger.info("=" * 60)

# =============================================================================
# CLI ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_full_update())
