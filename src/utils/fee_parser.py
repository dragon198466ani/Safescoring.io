#!/usr/bin/env python3
"""
SAFESCORING.IO — Fee Parser Module
====================================
Parse price_details text → structured fees_breakdown JSONB.

Usage:
    from src.utils.fee_parser import parse_fees

    result = parse_fees(
        price_eur=0.0,
        price_details="Frais: 0.1% spot, -25% avec BNB + gas 5-100 EUR",
        source="known_database"
    )
    # → { "version": 1, "fees": [...], "source": "known_database", "parsed_at": "..." }
"""

from __future__ import annotations

import re
import json
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any


# ============================================
# CONSTANTS
# ============================================

# BTC conversion defaults (overridable)
DEFAULT_BTC_PRICE_USD = 95000
DEFAULT_TX_SIZE_VBYTES = 140
DEFAULT_USD_TO_EUR = 0.91


def slugify(text: str) -> str:
    """Convert label to a stable slug id."""
    s = text.lower().strip()
    s = re.sub(r'[^a-z0-9]+', '_', s)
    s = s.strip('_')
    return s[:50] or "fee"


# ============================================
# REGEX PATTERNS
# ============================================

# "X-Y% something" or "X% something"
RE_PERCENTAGE_RANGE = re.compile(
    r'(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*%\s*(.*)',
    re.IGNORECASE
)
RE_PERCENTAGE_SINGLE = re.compile(
    r'(\d+(?:\.\d+)?)\s*%\s*(.*)',
    re.IGNORECASE
)

# "X-Y EUR" or "X-Y USD" or "X EUR"
RE_AMOUNT_RANGE = re.compile(
    r'(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(EUR|USD|€|\$)',
    re.IGNORECASE
)
RE_AMOUNT_SINGLE = re.compile(
    r'(\d+(?:\.\d+)?)\s*(EUR|USD|€|\$)',
    re.IGNORECASE
)

# "X-Y sat/vB" or "X sat/vB"
RE_SAT_VB_RANGE = re.compile(
    r'(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*sat/vB',
    re.IGNORECASE
)
RE_SAT_VB_SINGLE = re.compile(
    r'(\d+(?:\.\d+)?)\s*sat/vB',
    re.IGNORECASE
)

# "X-Y EUR/mois" or "X EUR/mois" or "X-Y USD/an"
RE_SUBSCRIPTION = re.compile(
    r'(\d+(?:\.\d+)?)\s*(?:-\s*(\d+(?:\.\d+)?))?\s*(EUR|USD|€|\$)\s*/\s*(mois|month|an|year)',
    re.IGNORECASE
)

# "X-Y% APR"
RE_APR = re.compile(
    r'(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?\s*%\s*APR',
    re.IGNORECASE
)

# "X-Y ADA/ATOM/SOL/OSMO par tx" etc.
RE_NATIVE_TOKEN = re.compile(
    r'(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?\s*(ADA|ATOM|SOL|OSMO|UST|BNB|ETH|MATIC)\b',
    re.IGNORECASE
)

# Discount: "-X% avec/with TOKEN"
RE_DISCOUNT = re.compile(
    r'-(\d+(?:\.\d+)?)\s*%\s*(?:avec|with|si|if)\s+(.+)',
    re.IGNORECASE
)

# Context: "apres/after X EUR/mois"
RE_CONTEXT_AFTER = re.compile(
    r'(?:apres|after|au-dela de|beyond)\s+(.+)',
    re.IGNORECASE
)

# Prefixes to strip
RE_PREFIX = re.compile(
    r'^(?:Frais\s*:\s*|Fees\s*:\s*|Fee\s*:\s*)',
    re.IGNORECASE
)

# Hardware / backup descriptors (no fees, just product_cost)
RE_HARDWARE_DESC = re.compile(
    r'^(?:Hardware wallet|Carte NFC|Backup metal|DIY open-source)',
    re.IGNORECASE
)


# ============================================
# SAT/VB CONVERSION
# ============================================

def sat_vb_to_fiat(
    min_sat: float,
    max_sat: float,
    btc_price_usd: float = DEFAULT_BTC_PRICE_USD,
    tx_size: int = DEFAULT_TX_SIZE_VBYTES,
    usd_to_eur: float = DEFAULT_USD_TO_EUR,
) -> Dict[str, Any]:
    """Convert sat/vB range to USD/EUR for a typical transaction."""
    min_usd = (min_sat * tx_size * btc_price_usd) / 100_000_000
    max_usd = (max_sat * tx_size * btc_price_usd) / 100_000_000
    return {
        "min_usd": round(min_usd, 2),
        "max_usd": round(max_usd, 2),
        "min_eur": round(min_usd * usd_to_eur, 2),
        "max_eur": round(max_usd * usd_to_eur, 2),
        "btc_price_usd": btc_price_usd,
        "tx_size_vbytes": tx_size,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


# ============================================
# SINGLE FEE COMPONENT PARSER
# ============================================

def parse_fee_component(text: str, btc_price_usd: float = DEFAULT_BTC_PRICE_USD) -> Optional[Dict[str, Any]]:
    """
    Parse a single fee component string into a structured fee object.
    Examples:
        "0.1% spot"         → { type: "percentage", value: 0.1, unit: "%" }
        "gas 5-100 EUR"     → { type: "range", value: 5, value_max: 100, unit: "EUR" }
        "1-20 sat/vB"       → { type: "range", ... + conversion }
        "interet 2-15% APR" → { type: "range", unit: "% APR" }
    """
    text = text.strip()
    if not text:
        return None

    fee: Dict[str, Any] = {
        "id": "",
        "label": "",
        "type": "variable",
        "value": None,
        "value_max": None,
        "unit": "",
        "context": None,
    }

    # Check for discount modifier
    discount_match = RE_DISCOUNT.search(text)
    if discount_match:
        fee["discount"] = {
            "label": f"-{discount_match.group(1)}%",
            "condition": discount_match.group(2).strip(),
        }
        # Remove discount part from text for further parsing
        text = text[:discount_match.start()].strip().rstrip(',').strip()

    # Check for context (apres/after)
    ctx_match = RE_CONTEXT_AFTER.search(text)
    if ctx_match:
        fee["context"] = ctx_match.group(1).strip()
        text = text[:ctx_match.start()].strip()

    # --- Try specific patterns in order of specificity ---

    # Subscription: "X-Y EUR/mois"
    m = RE_SUBSCRIPTION.search(text)
    if m:
        fee["value"] = float(m.group(1))
        fee["value_max"] = float(m.group(2)) if m.group(2) else None
        currency = "EUR" if m.group(3) in ("EUR", "€") else "USD"
        period = "mois" if m.group(4) in ("mois", "month") else "an"
        fee["unit"] = f"{currency}/{period}"
        fee["type"] = "range" if fee["value_max"] else "fixed"
        # Label from text before the match
        label_part = text[:m.start()].strip().rstrip('-').strip()
        fee["label"] = label_part if label_part else f"Subscription"
        fee["id"] = slugify(fee["label"])
        return fee

    # APR: "X-Y% APR"
    m = RE_APR.search(text)
    if m:
        fee["value"] = float(m.group(1))
        fee["value_max"] = float(m.group(2)) if m.group(2) else None
        fee["unit"] = "% APR"
        fee["type"] = "range" if fee["value_max"] else "percentage"
        label_part = text[:m.start()].strip().rstrip('-').strip()
        fee["label"] = label_part if label_part else "Interest Rate"
        fee["id"] = slugify(fee["label"])
        return fee

    # sat/vB range: "1-20 sat/vB"
    m = RE_SAT_VB_RANGE.search(text)
    if m:
        min_sat = float(m.group(1))
        max_sat = float(m.group(2))
        fee["value"] = min_sat
        fee["value_max"] = max_sat
        fee["unit"] = "sat/vB"
        fee["type"] = "range"
        fee["conversion"] = sat_vb_to_fiat(min_sat, max_sat, btc_price_usd)
        label_part = text[:m.start()].strip().rstrip('-').strip()
        remainder = text[m.end():].strip()
        if remainder:
            fee["context"] = fee.get("context") or remainder
        fee["label"] = label_part if label_part else "Mining Fee"
        fee["id"] = slugify(fee["label"])
        return fee

    # sat/vB single: "1 sat/vB"
    m = RE_SAT_VB_SINGLE.search(text)
    if m:
        sat_val = float(m.group(1))
        fee["value"] = sat_val
        fee["unit"] = "sat/vB"
        fee["type"] = "fixed"
        fee["conversion"] = sat_vb_to_fiat(sat_val, sat_val, btc_price_usd)
        label_part = text[:m.start()].strip()
        fee["label"] = label_part if label_part else "Mining Fee"
        fee["id"] = slugify(fee["label"])
        return fee

    # Native token: "0.17-0.5 ADA par tx"
    m = RE_NATIVE_TOKEN.search(text)
    if m:
        fee["value"] = float(m.group(1))
        fee["value_max"] = float(m.group(2)) if m.group(2) else None
        fee["unit"] = m.group(3).upper()
        fee["type"] = "range" if fee["value_max"] else "fixed"
        label_part = text[:m.start()].strip()
        remainder = text[m.end():].strip()
        if remainder:
            fee["context"] = fee.get("context") or remainder.lstrip("par ").strip()
        fee["label"] = label_part if label_part else f"Network Fee ({fee['unit']})"
        fee["id"] = slugify(fee["label"])
        return fee

    # EUR/USD amount range: "5-100 EUR"
    m = RE_AMOUNT_RANGE.search(text)
    if m:
        fee["value"] = float(m.group(1))
        fee["value_max"] = float(m.group(2))
        fee["unit"] = "EUR" if m.group(3) in ("EUR", "€") else "USD"
        fee["type"] = "range"
        label_part = text[:m.start()].strip()
        remainder = text[m.end():].strip()
        if remainder:
            fee["context"] = fee.get("context") or remainder
        fee["label"] = label_part if label_part else "Fee"
        fee["id"] = slugify(fee["label"])
        return fee

    # EUR/USD single amount: "49 EUR"
    m = RE_AMOUNT_SINGLE.search(text)
    if m:
        fee["value"] = float(m.group(1))
        fee["unit"] = "EUR" if m.group(2) in ("EUR", "€") else "USD"
        fee["type"] = "fixed"
        label_part = text[:m.start()].strip()
        fee["label"] = label_part if label_part else "Fee"
        fee["id"] = slugify(fee["label"])
        return fee

    # Percentage range: "0.1-0.5% swap"
    m = RE_PERCENTAGE_RANGE.search(text)
    if m:
        fee["value"] = float(m.group(1))
        fee["value_max"] = float(m.group(2))
        fee["unit"] = "%"
        fee["type"] = "range"
        # Label from prefix or suffix
        prefix = text[:m.start()].strip()
        suffix = m.group(3).strip()
        fee["label"] = prefix or suffix or "Fee"
        # If suffix has additional context
        if suffix and prefix:
            fee["context"] = suffix
        fee["id"] = slugify(fee["label"])
        return fee

    # Single percentage: "0.3% swap"
    m = RE_PERCENTAGE_SINGLE.search(text)
    if m:
        fee["value"] = float(m.group(1))
        fee["unit"] = "%"
        fee["type"] = "percentage"
        prefix = text[:m.start()].strip()
        suffix = m.group(2).strip()
        fee["label"] = prefix or suffix or "Fee"
        if suffix and prefix:
            fee["context"] = suffix
        fee["id"] = slugify(fee["label"])
        return fee

    # Fallback: variable/text-only fee
    fee["label"] = text
    fee["type"] = "variable"
    fee["id"] = slugify(text)
    return fee


# ============================================
# MAIN PARSER
# ============================================

def parse_fees(
    price_eur: Optional[float],
    price_details: Optional[str],
    source: str = "parser",
    btc_price_usd: float = DEFAULT_BTC_PRICE_USD,
) -> Optional[Dict[str, Any]]:
    """
    Parse price_eur + price_details into a structured fees_breakdown object.

    Returns None if there's nothing to parse.

    Args:
        price_eur: Product price in EUR (None or 0 for free)
        price_details: Freeform text describing fees
        source: Origin of the data (known_database, gemini, mistral, parser)
        btc_price_usd: Current BTC price for sat/vB conversion
    """
    if not price_details and price_eur is None:
        return None

    result: Dict[str, Any] = {
        "version": 1,
        "fees": [],
        "source": source,
        "parsed_at": datetime.now(timezone.utc).isoformat(),
    }

    details = (price_details or "").strip()

    # Strip common prefixes
    details_clean = RE_PREFIX.sub("", details).strip()
    # Also strip "Frais swap:" etc. at the beginning of individual components
    details_clean = re.sub(r'^Frais\s+\w+\s*:\s*', '', details_clean, flags=re.IGNORECASE).strip() or details_clean

    # Check if this is a hardware/backup product description (no fees)
    if RE_HARDWARE_DESC.match(details_clean):
        # Pure product cost, no ongoing fees
        if price_eur and price_eur > 0:
            result["product_cost"] = {
                "amount": price_eur,
                "currency": "EUR",
                "label": details_clean,
                "is_one_time": True,
            }
        return result

    # If there's a product price > 0, record it as product_cost
    if price_eur and price_eur > 0:
        result["product_cost"] = {
            "amount": price_eur,
            "currency": "EUR",
            "label": "Purchase price",
            "is_one_time": True,
        }

    # Check for "Gratuit" / "Free" prefix
    is_free_prefix = details_clean.lower().startswith(("gratuit", "free"))
    if is_free_prefix:
        details_clean = re.sub(r'^(?:Gratuit|Free)\s*[-–—]?\s*', '', details_clean, flags=re.IGNORECASE).strip()

    if not details_clean:
        # No details, just a price or free
        return result if result.get("product_cost") or result["fees"] else None

    # Split fee components on "+" or " et " or " and "
    # But be careful not to split inside parentheses
    components = re.split(r'\s*\+\s*|\s+et\s+|\s+and\s+', details_clean)

    for component in components:
        component = component.strip()
        if not component:
            continue

        # Handle comma-separated sub-components: "0.1% spot, -25% avec BNB"
        # Check if there's a discount embedded via comma
        subparts = [p.strip() for p in component.split(',') if p.strip()]

        if len(subparts) > 1:
            # Check if the second part is a discount modifier
            combined = component  # Keep original for parsing
            fee = parse_fee_component(combined, btc_price_usd)
            if fee:
                result["fees"].append(fee)
        else:
            fee = parse_fee_component(component, btc_price_usd)
            if fee:
                result["fees"].append(fee)

    # Deduplicate fees by id
    seen_ids: set = set()
    unique_fees: List[Dict] = []
    for fee in result["fees"]:
        fid = fee.get("id", "")
        if fid in seen_ids:
            # Append suffix to make unique
            fid = f"{fid}_{len(seen_ids)}"
            fee["id"] = fid
        seen_ids.add(fid)
        unique_fees.append(fee)
    result["fees"] = unique_fees

    # Clean up: remove None values from fee objects for cleaner JSON
    for fee in result["fees"]:
        keys_to_remove = [k for k, v in fee.items() if v is None and k not in ("value", "value_max")]
        for k in keys_to_remove:
            del fee[k]
        # Remove value/value_max only if both are None (variable type)
        if fee.get("value") is None and fee.get("type") == "variable":
            fee.pop("value", None)
            fee.pop("value_max", None)

    return result if (result.get("fees") or result.get("product_cost")) else None


# ============================================
# CLI TEST
# ============================================

def test_parser():
    """Run parser against known patterns."""
    test_cases = [
        # Hardware
        (149.0, "Hardware wallet Bluetooth"),
        # Software wallet
        (0.0, "Frais swap: 0.875% + gas (1-50 EUR selon reseau)"),
        # CEX
        (0.0, "Frais: 0.1% spot, -25% avec BNB"),
        # CEX maker/taker
        (0.0, "Frais: 0.16-0.26% maker/taker"),
        # DEX
        (0.0, "Frais: 0.3% swap + gas 5-100 EUR"),
        # Bitcoin wallet
        (0.0, "Fees: 1-20 sat/vB by priority"),
        # Lightning
        (0.0, "Fees: 0.4% Lightning + 1-20 sat/vB on-chain"),
        # DeFi lending
        (0.0, "Frais: 0.1% flash loan + interet 2-15% APR"),
        # Card
        (0.0, "Frais: 1-2% conversion + ATM 2% apres 400 EUR/mois"),
        # Subscription
        (0.0, "Frais: Premium 4.99-14.99 EUR/mois"),
        # Staking commission
        (0.0, "Frais: 10% commission sur rewards staking"),
        # Bridge
        (0.0, "Frais: 0.06% bridge + gas 1-10 EUR"),
        # Native token
        (0.0, "Frais: 0.17-0.5 ADA par tx"),
        # Variable
        (0.0, "Frais: spread variable + gas variable"),
        # Backup
        (49.0, "Backup metal disque inox"),
        # None
        (None, None),
    ]

    print("=" * 70)
    print("FEE PARSER TEST")
    print("=" * 70)

    for price, details in test_cases:
        print(f"\n--- Input: price_eur={price}, details=\"{details}\"")
        result = parse_fees(price, details, source="test")
        if result:
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print("  => None (nothing to parse)")

    print("\n" + "=" * 70)
    print("DONE")


if __name__ == "__main__":
    test_parser()
