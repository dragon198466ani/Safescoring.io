"""
AI-Powered Institutional Risk Analyzer
======================================
Uses AI to automatically:
- Classify incidents by severity and type
- Extract country and institution data
- Verify credibility of sources
- Generate risk assessments
"""

import os
import json
import logging
from datetime import datetime
from typing import Optional
import google.generativeai as genai
from supabase import create_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Supabase
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

# =============================================================================
# AI PROMPTS
# =============================================================================

INCIDENT_ANALYSIS_PROMPT = """
Analyze this news article about a potential government/institutional data breach or corruption incident.

Article Title: {title}
Article Content: {content}
Source: {source}
Date: {date}

Respond in JSON format with these fields:
{{
    "is_relevant": true/false,  // Is this about government/institutional data breach or corruption?
    "incident_type": "data_breach|insider_corruption|systemic_breach|intelligence_leak|policy_failure|null",
    "institution_type": "tax_authority|financial_regulator|central_bank|police|intelligence|judiciary|other_government|null",
    "institution_name": "specific name if mentioned",
    "country_code": "ISO 2-letter code (FR, US, BR, etc.) or null",
    "country_name": "full country name",
    "crypto_related": true/false,  // Does this specifically mention crypto/bitcoin holders?
    "data_types_exposed": ["list", "of", "data", "types"],
    "estimated_victims": number or null,
    "severity_score": 1-10,  // 10 = most severe (kidnappings/deaths linked), 1 = minor
    "risk_level": "low|medium|high|critical",
    "physical_attacks_mentioned": number,  // How many physical attacks mentioned as result
    "summary": "2-3 sentence summary in English",
    "lessons_learned": ["key", "takeaways"],
    "credibility_score": 1-10,  // How credible is this source?
    "needs_verification": true/false
}}

Be conservative - only mark as relevant if it's clearly about institutional/government failures.
For crypto_related, only mark true if crypto holders are SPECIFICALLY targeted or mentioned.
"""

COUNTRY_RISK_ASSESSMENT_PROMPT = """
Based on these incidents and data for {country_name} ({country_code}), generate a risk assessment for crypto holders declaring their assets in this country.

Known Incidents:
{incidents}

Transparency International CPI Score: {cpi_score}/100
Mandatory Crypto Declaration: {mandatory_declaration}
Declaration Includes Amounts: {includes_amounts}

Generate a JSON response:
{{
    "overall_risk_level": "very_low|low|medium|high|very_high|critical",
    "institutional_trust_score": 0-100,  // Higher = more trustworthy
    "declaration_risk_assessment": "2-3 paragraph assessment in English",
    "recommended_precautions": ["list", "of", "specific", "precautions"],
    "alternative_strategies": ["legal", "alternatives", "to", "consider"],
    "key_risks": ["main", "risk", "factors"],
    "positive_factors": ["any", "positive", "aspects"]
}}

Consider:
- History of data breaches at tax/financial authorities
- Corruption levels in government
- Whether crypto data has been specifically leaked
- Physical attacks on crypto holders traced to government leaks
- Data protection laws and enforcement
"""

# =============================================================================
# AI ANALYZER CLASS
# =============================================================================

class InstitutionalRiskAIAnalyzer:
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def analyze_incident(self, article: dict) -> Optional[dict]:
        """Use AI to analyze a news article for institutional incidents."""

        try:
            prompt = INCIDENT_ANALYSIS_PROMPT.format(
                title=article.get("title", ""),
                content=article.get("description", "") or article.get("content", ""),
                source=article.get("source", "Unknown"),
                date=article.get("date", article.get("published_at", "Unknown"))
            )

            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.2  # Low temperature for consistent classification
                )
            )

            result = json.loads(response.text)
            logger.info(f"AI analyzed: {article.get('title', '')[:50]}... -> relevant={result.get('is_relevant')}")
            return result

        except Exception as e:
            logger.error(f"AI analysis error: {e}")
            return None

    async def generate_country_assessment(self, country_code: str) -> Optional[dict]:
        """Generate AI-powered risk assessment for a country."""

        try:
            # Fetch existing incidents for country
            incidents_result = supabase.table("institutional_incidents").select("*").eq(
                "country_code", country_code
            ).execute()

            # Fetch country profile
            profile_result = supabase.table("country_institutional_risks").select("*").eq(
                "country_code", country_code
            ).single().execute()

            profile = profile_result.data or {}
            incidents = incidents_result.data or []

            incidents_summary = "\n".join([
                f"- {inc.get('title')} ({inc.get('incident_date')}): {inc.get('description', '')[:200]}"
                for inc in incidents
            ]) or "No known incidents"

            prompt = COUNTRY_RISK_ASSESSMENT_PROMPT.format(
                country_name=profile.get("country_name", country_code),
                country_code=country_code,
                incidents=incidents_summary,
                cpi_score=profile.get("corruption_perception_score", "Unknown"),
                mandatory_declaration=profile.get("mandatory_crypto_declaration", "Unknown"),
                includes_amounts=profile.get("declaration_includes_amounts", "Unknown")
            )

            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.3
                )
            )

            result = json.loads(response.text)
            logger.info(f"Generated assessment for {country_code}: risk={result.get('overall_risk_level')}")
            return result

        except Exception as e:
            logger.error(f"Country assessment error for {country_code}: {e}")
            return None

    async def batch_analyze_articles(self, articles: list) -> list:
        """Analyze multiple articles and filter relevant ones."""

        relevant_incidents = []

        for article in articles:
            analysis = await self.analyze_incident(article)

            if analysis and analysis.get("is_relevant") and analysis.get("credibility_score", 0) >= 6:
                # Merge article data with AI analysis
                incident = {
                    **article,
                    **analysis,
                    "ai_analyzed_at": datetime.utcnow().isoformat()
                }
                relevant_incidents.append(incident)

        logger.info(f"Found {len(relevant_incidents)} relevant incidents from {len(articles)} articles")
        return relevant_incidents

# =============================================================================
# DATABASE OPERATIONS
# =============================================================================

async def save_ai_analyzed_incident(incident: dict) -> bool:
    """Save AI-analyzed incident to pending review table."""

    try:
        slug = f"{incident.get('country_code', 'XX').lower()}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

        data = {
            "title": incident.get("title"),
            "slug": slug,
            "incident_type": incident.get("incident_type"),
            "description": incident.get("summary") or incident.get("description"),
            "country_code": incident.get("country_code"),
            "institution_type": incident.get("institution_type"),
            "institution_name": incident.get("institution_name"),
            "data_types_exposed": incident.get("data_types_exposed", []),
            "estimated_victims": incident.get("estimated_victims"),
            "crypto_holders_targeted": incident.get("crypto_related", False),
            "known_physical_attacks": incident.get("physical_attacks_mentioned", 0),
            "severity_score": incident.get("severity_score"),
            "systemic_risk_level": incident.get("risk_level"),
            "lessons_learned": incident.get("lessons_learned", []),
            "source_urls": [incident.get("url")] if incident.get("url") else [],
            "verified": False,  # Requires manual verification
            "ai_confidence_score": incident.get("credibility_score"),
            "needs_verification": incident.get("needs_verification", True),
            "created_at": datetime.utcnow().isoformat()
        }

        result = supabase.table("institutional_incidents").upsert(
            data, on_conflict="slug"
        ).execute()

        return bool(result.data)

    except Exception as e:
        logger.error(f"Error saving incident: {e}")
        return False

async def update_country_with_ai_assessment(country_code: str, assessment: dict) -> bool:
    """Update country risk profile with AI-generated assessment."""

    try:
        data = {
            "overall_risk_level": assessment.get("overall_risk_level"),
            "institutional_trust_score": assessment.get("institutional_trust_score"),
            "declaration_risk_assessment": assessment.get("declaration_risk_assessment"),
            "recommended_precautions": assessment.get("recommended_precautions", []),
            "alternative_strategies": assessment.get("alternative_strategies", []),
            "last_updated": datetime.utcnow().isoformat(),
            "ai_generated": True
        }

        result = supabase.table("country_institutional_risks").update(data).eq(
            "country_code", country_code
        ).execute()

        return bool(result.data)

    except Exception as e:
        logger.error(f"Error updating country {country_code}: {e}")
        return False

# =============================================================================
# MAIN PIPELINE
# =============================================================================

async def run_ai_analysis_pipeline(articles: list):
    """Run the full AI analysis pipeline."""

    analyzer = InstitutionalRiskAIAnalyzer()

    # 1. Analyze all articles
    logger.info(f"Analyzing {len(articles)} articles with AI...")
    relevant_incidents = await analyzer.batch_analyze_articles(articles)

    # 2. Save relevant incidents
    saved = 0
    for incident in relevant_incidents:
        if await save_ai_analyzed_incident(incident):
            saved += 1

    logger.info(f"Saved {saved} new incidents")

    # 3. Update country assessments for affected countries
    affected_countries = set(inc.get("country_code") for inc in relevant_incidents if inc.get("country_code"))

    for country_code in affected_countries:
        assessment = await analyzer.generate_country_assessment(country_code)
        if assessment:
            await update_country_with_ai_assessment(country_code, assessment)

    logger.info(f"Updated {len(affected_countries)} country assessments")

    return {
        "articles_analyzed": len(articles),
        "incidents_found": len(relevant_incidents),
        "incidents_saved": saved,
        "countries_updated": list(affected_countries)
    }

# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    import asyncio

    # Example test
    test_articles = [
        {
            "title": "French Tax Office Employee Arrested for Selling Crypto Holder Data to Criminals",
            "description": "A DGFIP employee in Bobigny was arrested for selling confidential tax data including crypto declarations to organized crime networks. The data was used to target wealthy Bitcoin holders.",
            "source": "Le Figaro",
            "date": "2024-09-15",
            "url": "https://example.com/article1"
        },
        {
            "title": "New iPhone Released",
            "description": "Apple announced a new iPhone model today.",
            "source": "Tech News",
            "date": "2024-09-15",
            "url": "https://example.com/article2"
        }
    ]

    result = asyncio.run(run_ai_analysis_pipeline(test_articles))
    print(json.dumps(result, indent=2))
