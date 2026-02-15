#!/usr/bin/env python3
"""
SAFESCORING.IO - Automatic price update via AI
=========================================================

Uses Gemini (web search) + Mistral to find crypto product prices.

Usage:
    python price_updater.py [--dry-run] [--force] [--product SLUG]
    python -m src.automation.price_updater --mode full

Options:
    --dry-run       : Simulation without modifying the database
    --force         : Force the update even if a price already exists
    --product SLUG  : Updates only the specified product
    --mode          : test (1), partial (10), full (tous)

Author: SafeScoring.io
"""

from __future__ import annotations

import os
import sys
import json
import time
import argparse
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass, field

# Add src to path for module imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# APIs
import requests

import warnings
warnings.filterwarnings("ignore", category=FutureWarning)

try:
    # Try new package first
    from google import genai as google_genai
    GENAI_AVAILABLE = True
    GENAI_NEW = True
except ImportError:
    try:
        # Fallback to old package
        import google.generativeai as google_genai
        GENAI_AVAILABLE = True
        GENAI_NEW = False
    except ImportError:
        google_genai = None
        GENAI_AVAILABLE = False
        GENAI_NEW = False

# ============================================
# DATACLASSES
# ============================================

@dataclass
class PriceResult:
    """Price search result."""
    price_eur: Optional[float] = None
    price_details: Optional[str] = None
    source: str = "unknown"
    confidence: str = "low"
    is_free: bool = False
    raw_response: Optional[Dict[str, Any]] = None


@dataclass
class Product:
    """Product representation."""
    id: int
    name: str
    slug: str
    url: Optional[str] = None
    type_id: Optional[int] = None
    type_name: Optional[str] = None
    price_eur: Optional[float] = None
    price_details: Optional[str] = None


@dataclass
class PipelineStats:
    """Pipeline statistics."""
    total: int = 0
    updated: int = 0
    skipped: int = 0
    errors: int = 0
    not_found: int = 0
    start_time: float = field(default_factory=time.time)

    @property
    def duration(self) -> float:
        return time.time() - self.start_time


# ============================================
# BITCOIN FEE CONVERSION UTILITIES
# ============================================

# Default BTC price in USD (updated periodically)
DEFAULT_BTC_PRICE_USD = 95000.0
# Average Bitcoin transaction size in virtual bytes
AVG_TX_SIZE_VBYTES = 140

def get_btc_price_usd() -> float:
    """Retrieves the current BTC price in USD via CoinGecko API (with cache)."""
    try:
        response = requests.get(
            'https://api.coingecko.com/api/v3/simple/price',
            params={'ids': 'bitcoin', 'vs_currencies': 'usd'},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            return data.get('bitcoin', {}).get('usd', DEFAULT_BTC_PRICE_USD)
    except Exception:
        pass
    return DEFAULT_BTC_PRICE_USD


def sat_to_usd(sats: float, btc_price_usd: float = None) -> float:
    """Converts satoshis to USD."""
    if btc_price_usd is None:
        btc_price_usd = DEFAULT_BTC_PRICE_USD
    # 1 BTC = 100,000,000 sats
    return sats * btc_price_usd / 100_000_000


def sat_per_vb_to_usd_range(
    min_sat_vb: float,
    max_sat_vb: float,
    tx_size_vb: int = AVG_TX_SIZE_VBYTES,
    btc_price_usd: float = None
) -> Tuple[float, float]:
    """
    Converts a sat/vB range to USD for a typical transaction.

    Args:
        min_sat_vb: Minimum fee in sat/vB
        max_sat_vb: Maximum fee in sat/vB
        tx_size_vb: Transaction size in vBytes (default: 140)
        btc_price_usd: BTC price in USD (default: cached value)

    Returns:
        Tuple (min_usd, max_usd)
    """
    if btc_price_usd is None:
        btc_price_usd = DEFAULT_BTC_PRICE_USD

    min_sats = min_sat_vb * tx_size_vb
    max_sats = max_sat_vb * tx_size_vb

    min_usd = sat_to_usd(min_sats, btc_price_usd)
    max_usd = sat_to_usd(max_sats, btc_price_usd)

    return (round(min_usd, 2), round(max_usd, 2))


def usd_to_eur(usd: float, rate: float = 0.91) -> float:
    """Converts USD to EUR."""
    return round(usd * rate, 2)


def format_btc_fee_with_conversion(
    min_sat_vb: float,
    max_sat_vb: float,
    lightning_fee_percent: str = None,
    btc_price_usd: float = None
) -> str:
    """
    Formats Bitcoin fees with USD/EUR conversion.

    Exemple: "1-20 sat/vB (~$0.13-$2.66 / ~€0.12-€2.42) + Lightning 0.1-1%"
    """
    min_usd, max_usd = sat_per_vb_to_usd_range(min_sat_vb, max_sat_vb, btc_price_usd=btc_price_usd)
    min_eur, max_eur = usd_to_eur(min_usd), usd_to_eur(max_usd)

    fee_str = f"{int(min_sat_vb)}-{int(max_sat_vb)} sat/vB (~${min_usd:.2f}-${max_usd:.2f} | ~€{min_eur:.2f}-€{max_eur:.2f})"

    if lightning_fee_percent:
        fee_str += f" + Lightning {lightning_fee_percent}"

    return fee_str


# ============================================
# CONFIGURATION
# ============================================

def load_config() -> Dict[str, str]:
    """Loads configuration from env_template_free.txt or .env."""
    config: Dict[str, str] = {}

    # Try multiple paths
    possible_paths = [
        Path(__file__).parent / 'env_template_free.txt',
        Path(__file__).parent / '.env',
        Path(__file__).parent.parent.parent / '.env',
    ]

    config_path: Optional[Path] = None
    for path in possible_paths:
        if path.exists():
            config_path = path
            break

    if not config_path:
        print(f"   Configuration file not found")
        return config

    with open(config_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                config[key.strip()] = value.strip()

    return config


CONFIG = load_config()
SUPABASE_URL: str = CONFIG.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY: str = CONFIG.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
MISTRAL_API_KEY: str = CONFIG.get('MISTRAL_API_KEY', '')
GOOGLE_API_KEY: str = CONFIG.get('GOOGLE_API_KEY', '')

# Support for multiple Gemini keys (rotation)
# Format: GOOGLE_API_KEY_1, GOOGLE_API_KEY_2, etc.
GOOGLE_API_KEYS: List[str] = []
if GOOGLE_API_KEY:
    GOOGLE_API_KEYS.append(GOOGLE_API_KEY)
for i in range(1, 10):
    key = CONFIG.get(f'GOOGLE_API_KEY_{i}', '')
    if key and key not in GOOGLE_API_KEYS:
        GOOGLE_API_KEYS.append(key)

# Gemini configuration (first key)
if GOOGLE_API_KEYS and GENAI_AVAILABLE and google_genai and not GENAI_NEW:
    google_genai.configure(api_key=GOOGLE_API_KEYS[0])


# ============================================
# CLIENT SUPABASE
# ============================================

class SupabaseClient:
    """Simplified client for Supabase REST API."""

    def __init__(self, url: str, key: str) -> None:
        self.url: str = url.rstrip('/')
        self.key: str = key
        self.headers: Dict[str, str] = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }

    def test_connection(self) -> bool:
        """Tests the connection to Supabase."""
        try:
            response = requests.get(
                f"{self.url}/rest/v1/",
                headers=self.headers,
                timeout=10
            )
            return response.status_code == 200
        except Exception:
            return False

    def get(
        self,
        table: str,
        select: str = "*",
        filters: Optional[Dict[str, str]] = None
    ) -> List[Dict[str, Any]]:
        """Retrieves data from a table."""
        params: Dict[str, str] = {'select': select}
        if filters:
            params.update(filters)

        try:
            response = requests.get(
                f"{self.url}/rest/v1/{table}",
                headers=self.headers,
                params=params,
                timeout=30
            )
            if response.status_code == 200:
                return response.json()
            print(f"      Error GET {table}: {response.status_code}")
            return []
        except Exception as e:
            print(f"      Exception GET {table}: {e}")
            return []

    def patch(
        self,
        table: str,
        data: Dict[str, Any],
        filters: Dict[str, str]
    ) -> bool:
        """Updates data in a table."""
        try:
            response = requests.patch(
                f"{self.url}/rest/v1/{table}",
                headers=self.headers,
                json=data,
                params=filters,
                timeout=30
            )
            return response.status_code in [200, 204]
        except Exception as e:
            print(f"      Error PATCH {table}: {e}")
            return False


# ============================================
# KNOWN PRICE DATABASE
# ============================================

KNOWN_PRICES: Dict[str, Tuple[float, str]] = {
    # Hardware Wallets - Ledger
    "ledger nano s plus": (79.0, "Hardware wallet entry-level"),
    "ledger nano x": (149.0, "Hardware wallet Bluetooth"),
    "ledger flex": (249.0, "Hardware wallet E Ink touchscreen"),
    "ledger stax": (399.0, "Hardware wallet premium E Ink"),

    # Hardware Wallets - Trezor
    "trezor model one": (69.0, "Hardware wallet basique"),
    "trezor model t": (219.0, "Hardware wallet touchscreen"),
    "trezor safe 3": (79.0, "Hardware wallet secure element"),
    "trezor safe 5": (169.0, "Hardware wallet couleur"),

    # Hardware Wallets - Autres
    "bitbox02": (149.0, "Hardware wallet Swiss-made"),
    "coldcard mk4": (157.0, "Hardware wallet Bitcoin-only"),
    "coldcard q": (219.0, "Hardware wallet QWERTY"),
    "keystone pro": (169.0, "Hardware wallet air-gapped QR"),
    "keystone 3 pro": (149.0, "Hardware wallet air-gapped"),
    "gridplus lattice1": (397.0, "Hardware wallet enterprise"),
    "ngrave zero": (398.0, "Hardware wallet air-gapped premium"),
    "secux v20": (139.0, "Hardware wallet touchscreen"),
    "secux w20": (99.0, "Hardware wallet Bluetooth"),
    "ellipal titan": (169.0, "Hardware wallet air-gapped metal"),
    "ellipal titan 2.0": (169.0, "Hardware wallet air-gapped"),
    "safepal s1": (49.99, "Hardware wallet budget"),
    "tangem": (54.90, "Carte NFC wallet (pack 2)"),
    "tangem wallet": (54.90, "Carte NFC wallet (pack 2)"),
    "keepkey": (49.0, "Hardware wallet basique"),
    "jade": (64.99, "Hardware wallet Blockstream"),
    "blockstream jade": (64.99, "Hardware wallet open-source"),
    "passport": (199.0, "Hardware wallet Foundation"),
    "foundation passport": (199.0, "Hardware wallet air-gapped"),
    "onekey classic": (85.0, "Hardware wallet touchscreen"),
    "onekey pro": (169.0, "Hardware wallet premium"),

    # Software Wallets - Frais reels
    "metamask": (0.0, "Frais swap: 0.875% + gas (1-50 EUR selon reseau)"),
    "trust wallet": (0.0, "Frais swap: 1-3% + gas variable"),
    "exodus": (0.0, "Frais swap: 2-5% (spread eleve)"),
    "phantom": (0.0, "Frais: 0.85% swap + priorite 0.0001-0.01 SOL"),
    "rabby": (0.0, "Frais: gas uniquement (1-50 EUR selon reseau)"),
    "rainbow": (0.0, "Frais swap: 0.5-1% + gas"),
    "zerion": (0.0, "Frais swap: 0.5% + gas"),
    "coinbase wallet": (0.0, "Frais: gas uniquement (1-50 EUR)"),
    "argent": (0.0, "Frais: gas + guardian 5-20 EUR/recovery"),
    "frame": (0.0, "Frais: gas uniquement (open-source)"),
    # Bitcoin wallets - frais on-chain (conversion dynamique via --update-btc-fees)
    "electrum": (0.0, "Fees: 1-20 sat/vB by priority"),
    "sparrow": (0.0, "Fees: 1-50 sat/vB by priority"),
    "bluewallet": (0.0, "Fees: 1-20 sat/vB + Lightning 0.1-1%"),
    "muun": (0.0, "Fees: 0.4% Lightning + 1-20 sat/vB on-chain"),
    "phoenix": (0.0, "Fees: 0.4% + 1-3% channel opening"),
    "breez": (0.0, "Fees: 0.4% Lightning + channel setup"),
    "wasabi": (0.0, "Fees: 0.3% coordinator + 1-20 sat/vB mining"),
    "samourai": (0.0, "Fees: 3.5-5% Whirlpool + 1-20 sat/vB mining"),
    "keplr": (0.0, "Frais: gas Cosmos 0.01-0.1 ATOM"),
    "terra station": (0.0, "Frais: gas Terra 0.1-1 UST"),
    "yoroi": (0.0, "Frais: 0.17-0.5 ADA par tx"),
    "nami": (0.0, "Frais: 0.17-0.5 ADA par tx"),
    "xdefi": (0.0, "Frais: gas multi-chain variable"),
    "uniswap wallet": (0.0, "Frais swap: 0.25% + gas ETH"),

    # Exchanges - Frais
    "binance": (0.0, "Frais: 0.1% spot, -25% avec BNB"),
    "coinbase": (0.0, "Frais: 0.4-0.6% maker/taker"),
    "kraken": (0.0, "Frais: 0.16-0.26% maker/taker"),
    "kucoin": (0.0, "Frais: 0.1% spot"),
    "bybit": (0.0, "Frais: 0.1% spot"),
    "okx": (0.0, "Frais: 0.08-0.1% maker/taker"),
    "bitget": (0.0, "Frais: 0.1% spot"),
    "gate.io": (0.0, "Frais: 0.2% spot"),
    "htx": (0.0, "Frais: 0.2% spot"),
    "mexc": (0.0, "Frais: 0% maker, 0.05% taker spot"),
    "crypto.com": (0.0, "Frais: 0.075% avec CRO stake"),
    "gemini": (0.0, "Frais: 0.2-0.4% maker/taker"),
    "bitstamp": (0.0, "Frais: 0.3-0.5%"),

    # Cartes Crypto - Frais reels
    "crypto.com card": (0.0, "Frais: 1-2% conversion + ATM 2% apres 400 EUR/mois"),
    "binance card": (0.0, "Frais: 0.9% conversion + ATM 0.5-2%"),
    "coinbase card": (0.0, "Frais: 2.49% conversion + spread variable"),
    "wirex": (0.0, "Frais: 0-2% selon plan + ATM 2.5%"),
    "nexo card": (0.0, "Frais: spread 0.5-2% + ATM 1.5%"),
    "plutus": (0.0, "Frais: 0% spot + Premium 4.99-14.99 EUR/mois"),
    "gnosis card": (0.0, "Frais: gas + conversion variable"),
    "monolith": (0.0, "Frais: 1-2% top-up + ATM 2%"),
    "bitpay card": (0.0, "Frais: 3% conversion + 2.50 USD/ATM"),

    # DEX - Decentralized Exchanges (frais swap + gas)
    "uniswap": (0.0, "Frais: 0.3% swap + gas 5-100 EUR"),
    "sushiswap": (0.0, "Frais: 0.3% swap + gas 5-80 EUR"),
    "pancakeswap": (0.0, "Frais: 0.25% swap + gas 0.1-1 EUR"),
    "curve": (0.0, "Frais: 0.04% swap + gas 5-50 EUR"),
    "balancer": (0.0, "Frais: 0.1-0.5% swap + gas 5-80 EUR"),
    "1inch": (0.0, "Frais: spread variable + gas 5-100 EUR"),
    "paraswap": (0.0, "Frais: spread 0.1-0.5% + gas variable"),
    "kyberswap": (0.0, "Frais: 0.1% swap + gas 5-50 EUR"),
    "dydx": (0.0, "Frais: 0.02-0.05% maker/taker"),
    "gmx": (0.0, "Frais: 0.1% swap + 0.2-0.8% position"),
    "trader joe": (0.0, "Frais: 0.3% swap + gas 0.5-2 EUR"),
    "camelot": (0.0, "Frais: 0.3% swap + gas 0.1-1 EUR"),
    "camelot dex": (0.0, "Frais: 0.3% swap + gas 0.1-1 EUR"),
    "velodrome": (0.0, "Frais: 0.01-0.3% swap + gas 0.1-1 EUR"),
    "aerodrome": (0.0, "Frais: 0.01-0.3% swap + gas 0.1-0.5 EUR"),
    "quickswap": (0.0, "Frais: 0.3% swap + gas 0.01-0.1 EUR"),
    "spookyswap": (0.0, "Frais: 0.2% swap + gas 0.1-0.5 EUR"),
    "raydium": (0.0, "Frais: 0.25% swap + 0.0001-0.01 SOL"),
    "orca": (0.0, "Frais: 0.3% swap + 0.0001-0.01 SOL"),
    "jupiter": (0.0, "Frais: spread variable + 0.0001-0.01 SOL"),
    "osmosis": (0.0, "Frais: 0.2-0.3% swap + 0.01-0.1 OSMO"),
    "thorchain": (0.0, "Frais: 0.3% swap + gas multi-chain 1-10 EUR"),
    "hashflow": (0.0, "Frais: spread inclus + gas variable"),
    "biswap": (0.0, "Frais: 0.1% swap + gas 0.1-1 EUR"),
    "baseswap": (0.0, "Frais: 0.25% swap + gas 0.05-0.5 EUR"),
    "maverick": (0.0, "Frais: dynamique 0.01-0.3% + gas"),

    # DeFi Protocols - Lending/Borrowing (frais reels)
    "aave": (0.0, "Frais: 0.1% flash loan + interet 2-15% APR"),
    "compound": (0.0, "Frais: interet emprunt 3-12% APR"),
    "maker": (0.0, "Frais: stability fee 0.5-8% APR sur DAI"),
    "makerdao": (0.0, "Frais: stability fee 0.5-8% APR sur DAI"),
    "lido": (0.0, "Frais: 10% commission sur rewards staking"),
    "rocket pool": (0.0, "Frais: 15% commission sur rewards"),
    "eigenlayer": (0.0, "Frais: 10% sur rewards restaking"),
    "pendle": (0.0, "Frais: 0.1% swap + gas yield trading"),
    "morpho": (0.0, "Frais: spread taux optimise + gas"),
    "spark": (0.0, "Frais: interet 2-8% APR + gas"),
    "radiant": (0.0, "Frais: interet 3-15% APR cross-chain"),
    "venus": (0.0, "Frais: interet 2-10% APR BSC"),
    "benqi": (0.0, "Frais: interet 2-12% APR Avalanche"),

    # Bridges - Frais reels
    "stargate": (0.0, "Frais: 0.06% bridge + gas 1-10 EUR"),
    "across": (0.0, "Frais: 0.04-0.12% bridge + gas"),
    "hop": (0.0, "Frais: 0.04% bridge + gas 2-20 EUR"),
    "synapse": (0.0, "Frais: 0.05-0.2% bridge + gas"),
    "multichain": (0.0, "Frais: 0.1% bridge + gas variable"),
    "celer": (0.0, "Frais: 0.04-0.5% bridge selon liquidite"),
    "layerzero": (0.0, "Frais: gas destination + relayer 0.5-5 EUR"),
    "wormhole": (0.0, "Frais: gas multi-chain 1-5 EUR"),

    # Portfolio Trackers - Frais reels
    "debank": (0.0, "Frais: Pro 200 USD/an pour fonctions avancees"),
    "zapper": (0.0, "Frais: 0.3% zap + gas pour actions"),
    "zerion": (0.0, "Frais: Premium 10 EUR/mois + gas actions"),
    "rotki": (0.0, "Frais: Pro 99-299 EUR/an selon plan"),
    "koinly": (0.0, "Frais: 49-279 EUR/an pour rapport fiscal"),
    "coinstats": (0.0, "Frais: Pro 3.49-13.99 EUR/mois"),

    # ============================================
    # MANUALLY ADDED PRODUCTS (24 remaining)
    # ============================================

    # Metal Backups
    "hodlr swiss": (129.0, "Backup metal Swiss-made premium"),
    "steeldisk": (49.0, "Backup metal disque inox"),
    "coldbit steel": (39.0, "Backup metal plaques acier"),
    "bitplates domino": (69.0, "Backup metal domino system"),
    "coldti": (49.0, "Backup metal titanium"),
    "safu ninja": (59.0, "Backup metal ninja design"),
    "seedor": (59.0, "Backup metal modular"),
    "simbit": (45.0, "Backup metal simple"),

    # Hardware Wallets
    "krux": (0.0, "DIY open-source - Cout composants 30-60 EUR"),
    "prokey optimum": (59.0, "Hardware wallet 59 EUR"),
    "status keycard": (29.0, "Carte NFC 29 EUR + gas ETH 1-50 EUR/tx"),

    # Institutional Custody (frais estimes)
    "qredo": (0.0, "Frais: 0.1-0.5% AUM/an + 5-50 EUR/tx selon volume"),
    "cobo custody": (0.0, "Frais: 0.1-0.3% AUM/an + frais tx variables"),
    "fireblocks": (0.0, "Frais: 0.1-0.2% AUM/an + 1000-5000 EUR/mois min"),
    "hex trust": (0.0, "Frais: 0.1-0.4% AUM/an + setup 5000+ EUR"),
    "liminal": (0.0, "Frais: 0.1-0.3% AUM/an + integration variable"),

    # Crypto Banks
    "n26": (0.0, "Frais: Premium 9.90 EUR/mois + crypto 1.5-2% spread"),
    "revolut": (0.0, "Frais: Standard 0 EUR, Metal 13.99 EUR/mois + crypto 1.49-2.5%"),
    "robinhood crypto": (0.0, "Frais: spread 0.5-2% (inclus dans prix)"),

    # DeFi & Staking
    "ether.fi": (0.0, "Frais: 10% commission rewards + gas 10-100 EUR unstake"),
    "swell network": (0.0, "Frais: 10% commission rewards + gas 10-100 EUR"),

    # Research & Analytics
    "arkham": (0.0, "Frais: Pro 150+ USD/mois pour API + alertes"),
    "token terminal": (0.0, "Frais: Pro 325 USD/mois, Enterprise sur devis"),

    # Real World Assets
    "blockbar": (0.0, "Frais: 10-15% commission vente + gas 5-50 EUR"),
    "realt": (0.0, "Frais: 2-3% achat + 10% gestion annuelle"),
}


# ============================================
# PRICE SEARCH VIA AI
# ============================================

class PriceFinder:
    """Finds crypto product prices via AI."""

    def __init__(self) -> None:
        self.gemini_model: Optional[Any] = None
        self.genai_clients: List[Any] = []
        self.current_key_index: int = 0

        if GOOGLE_API_KEYS and GENAI_AVAILABLE and google_genai:
            try:
                if GENAI_NEW:
                    # New google.genai package - create one client per key
                    for api_key in GOOGLE_API_KEYS:
                        try:
                            client = google_genai.Client(api_key=api_key)
                            self.genai_clients.append(client)
                        except Exception:
                            pass
                    if self.genai_clients:
                        print(f"   Gemini: {len(self.genai_clients)} API key(s) configured")
                else:
                    # Old google.generativeai package (single key)
                    try:
                        self.gemini_model = google_genai.GenerativeModel('gemini-2.0-flash-exp')
                    except Exception:
                        self.gemini_model = google_genai.GenerativeModel('gemini-1.5-flash')
            except Exception as e:
                print(f"   Gemini init error: {e}")

    def _get_next_client(self) -> Optional[Any]:
        """Returns the next Gemini client (rotation)."""
        if not self.genai_clients:
            return None
        client = self.genai_clients[self.current_key_index]
        self.current_key_index = (self.current_key_index + 1) % len(self.genai_clients)
        return client

    def check_known_prices(self, product_name: str) -> Optional[PriceResult]:
        """Checks if the price is in the knowledge base."""
        name_lower = product_name.lower().strip()

        # Look for exact or partial match
        for known_name, (price, details) in KNOWN_PRICES.items():
            if known_name in name_lower or name_lower in known_name:
                return PriceResult(
                    price_eur=price,
                    price_details=details,
                    source="known_database",
                    confidence="high",
                    is_free=(price == 0)
                )

        return None

    def search_price_gemini(
        self,
        product_name: str,
        product_url: str = "",
        product_type: str = ""
    ) -> PriceResult:
        """Searches for price via Gemini with Google Search grounding."""
        if not self.gemini_model and not self.genai_clients:
            return PriceResult(source="gemini_unavailable")

        prompt = f"""Tu es un assistant specialise dans les produits crypto/blockchain.

Recherche le prix actuel de ce produit:
- Nom: {product_name}
- Site officiel: {product_url}
- Type: {product_type}

IMPORTANT:
- Cherche le prix sur le site officiel du produit ou des revendeurs autorises
- Pour les hardware wallets: prix d'achat du dispositif en EUR
- Pour les exchanges/services: indique les frais principaux
- Pour les logiciels gratuits: indique "Free" avec details sur les frais eventuels

Reponds UNIQUEMENT en JSON valide, sans markdown ni commentaires:
{{"price_eur": 149.00, "price_details": "Description courte", "confidence": "high", "is_free": false}}

Si gratuit: price_eur = 0 et is_free = true
Si prix inconnu: price_eur = null"""

        try:
            content = ""

            if GENAI_NEW and self.genai_clients:
                # New google.genai package avec rotation des cles
                client = self._get_next_client()
                if client:
                    try:
                        response = client.models.generate_content(
                            model="gemini-2.0-flash-exp",
                            contents=prompt,
                            config={"temperature": 0.1, "max_output_tokens": 500}
                        )
                        content = response.text.strip()
                    except Exception as e:
                        # Try with another model or another key
                        try:
                            client = self._get_next_client()
                            if client:
                                response = client.models.generate_content(
                                    model="gemini-1.5-flash",
                                    contents=prompt,
                                    config={"temperature": 0.1, "max_output_tokens": 500}
                                )
                                content = response.text.strip()
                        except Exception:
                            pass

            elif self.gemini_model:
                # Old google.generativeai package
                try:
                    from google.generativeai.types import Tool
                    google_search_tool = Tool.from_google_search_retrieval(
                        google_search_retrieval={"dynamic_retrieval_config": {"dynamic_threshold": 0.3}}
                    )
                    response = self.gemini_model.generate_content(
                        prompt,
                        tools=[google_search_tool],
                        generation_config={"temperature": 0.1, "max_output_tokens": 500}
                    )
                    content = response.text.strip()
                except Exception:
                    response = self.gemini_model.generate_content(
                        prompt,
                        generation_config={"temperature": 0.1, "max_output_tokens": 500}
                    )
                    content = response.text.strip()

            if content:
                data = self._parse_json_response(content)
                if data:
                    return PriceResult(
                        price_eur=data.get('price_eur'),
                        price_details=data.get('price_details', ''),
                        source="gemini",
                        confidence=data.get('confidence', 'medium'),
                        is_free=data.get('is_free', False),
                        raw_response=data
                    )

        except Exception as e:
            print(f"      Gemini error: {e}")

        return PriceResult(source="gemini_error")

    def search_price_mistral(
        self,
        product_name: str,
        product_url: str = "",
        product_type: str = ""
    ) -> PriceResult:
        """Searches for price via Mistral API."""
        if not MISTRAL_API_KEY:
            return PriceResult(source="mistral_unavailable")

        # Detect the type to adapt the prompt
        type_lower = product_type.lower() if product_type else ""
        is_defi = any(x in type_lower for x in ['dex', 'defi', 'swap', 'exchange decentralized', 'lending', 'bridge', 'aggregator', 'protocol'])
        is_software = any(x in type_lower for x in ['wallet', 'software', 'mobile', 'browser', 'desktop', 'extension'])
        is_hardware = any(x in type_lower for x in ['hardware', 'cold', 'signing device', 'air-gapped'])

        if is_defi:
            context = """IMPORTANT: Les protocoles DeFi (DEX, lending, bridges) sont TOUJOURS GRATUITS.
Ils n'ont pas de prix d'achat. Indique uniquement les frais de swap/trading/protocol.
Exemple: price_eur = 0, is_free = true, price_details = "Gratuit - Frais swap 0.3%" """
        elif is_software:
            context = """IMPORTANT: Les wallets logiciels sont generalement GRATUITS.
Indique price_eur = 0 et is_free = true, avec les frais eventuels dans price_details."""
        elif is_hardware:
            context = """Pour les hardware wallets, indique le prix d'achat en EUR du dispositif physique."""
        else:
            context = """Determine si c'est un produit payant (hardware) ou gratuit (software/DeFi)."""

        prompt = f"""Expert crypto/blockchain. Trouve le prix de: {product_name}
Type: {product_type}
Site: {product_url}

{context}

Reponds UNIQUEMENT en JSON valide:
{{"price_eur": 0, "price_details": "description des frais", "confidence": "high", "is_free": true}}

Regles:
- Hardware wallet: prix en EUR (ex: 149.00), is_free = false
- Software wallet: price_eur = 0, is_free = true + frais swap si applicable
- DEX/DeFi: price_eur = 0, is_free = true + frais swap/protocol
- Exchange CEX: price_eur = 0, is_free = true + frais trading
- Si inconnu: price_eur = null"""

        try:
            headers = {
                'Authorization': f'Bearer {MISTRAL_API_KEY}',
                'Content-Type': 'application/json'
            }

            data = {
                'model': 'mistral-small-latest',
                'messages': [{'role': 'user', 'content': prompt}],
                'temperature': 0.1,
                'max_tokens': 300
            }

            response = requests.post(
                'https://api.mistral.ai/v1/chat/completions',
                headers=headers,
                json=data,
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']
                parsed = self._parse_json_response(content)

                if parsed:
                    return PriceResult(
                        price_eur=parsed.get('price_eur'),
                        price_details=parsed.get('price_details', ''),
                        source="mistral",
                        confidence=parsed.get('confidence', 'medium'),
                        is_free=parsed.get('is_free', False),
                        raw_response=parsed
                    )

        except Exception as e:
            print(f"      Mistral error: {e}")

        return PriceResult(source="mistral_error")

    def _parse_json_response(self, content: str) -> Optional[Dict[str, Any]]:
        """Parses a JSON response from AI content."""
        try:
            # Clean the markdown
            if '```' in content:
                parts = content.split('```')
                for part in parts:
                    part = part.strip()
                    if part.startswith('json'):
                        part = part[4:].strip()
                    if part.startswith('{'):
                        content = part
                        break

            # Extract the JSON
            start = content.find('{')
            end = content.rfind('}') + 1
            if start != -1 and end > start:
                content = content[start:end]

            return json.loads(content)

        except (json.JSONDecodeError, ValueError):
            return None

    def find_price(self, product: Product) -> PriceResult:
        """Finds the price of a product (full pipeline)."""

        # 1. Check the knowledge base
        known = self.check_known_prices(product.name)
        if known and known.price_eur is not None:
            print(f"      [DB] Known price found")
            return known

        # 2. Try Gemini
        print(f"      [IA] Searching via Gemini...")
        result = self.search_price_gemini(
            product.name,
            product.url or "",
            product.type_name or ""
        )

        if result.price_eur is not None:
            return result

        time.sleep(1)

        # 3. Fallback Mistral
        if MISTRAL_API_KEY:
            print(f"      [AI] Fallback Mistral...")
            result = self.search_price_mistral(
                product.name,
                product.url or "",
                product.type_name or ""
            )

            if result.price_eur is not None:
                return result

        return PriceResult(source="not_found")


# ============================================
# UPDATE PIPELINE
# ============================================

class PriceUpdater:
    """Price update pipeline."""

    def __init__(self, dry_run: bool = False) -> None:
        self.db = SupabaseClient(SUPABASE_URL, SUPABASE_KEY)
        self.finder = PriceFinder()
        self.dry_run = dry_run
        self.stats = PipelineStats()

    def get_products(
        self,
        slug: Optional[str] = None,
        force: bool = False,
        limit: Optional[int] = None
    ) -> List[Product]:
        """Retrieves products to update."""

        # Build filters
        filters: Dict[str, str] = {}
        if slug:
            filters['slug'] = f'eq.{slug}'

        # Retrieve products
        raw_products = self.db.get(
            'products',
            'id, name, slug, url, price_eur, price_details, type_id',
            filters
        )

        if not raw_products:
            return []

        # Filter those without price (unless force)
        if not force:
            raw_products = [p for p in raw_products if p.get('price_eur') is None]

        # Limit if requested
        if limit:
            raw_products = raw_products[:limit]

        # Retrieve type names
        type_ids = list(set([p.get('type_id') for p in raw_products if p.get('type_id')]))
        types_map: Dict[int, str] = {}

        if type_ids:
            types_data = self.db.get(
                'product_types',
                'id, name',
                {'id': f'in.({",".join(map(str, type_ids))})'}
            )
            types_map = {t['id']: t['name'] for t in types_data}

        # Convert to Product objects
        products: List[Product] = []
        for p in raw_products:
            products.append(Product(
                id=p['id'],
                name=p['name'],
                slug=p['slug'],
                url=p.get('url'),
                type_id=p.get('type_id'),
                type_name=types_map.get(p.get('type_id', 0), ''),
                price_eur=p.get('price_eur'),
                price_details=p.get('price_details')
            ))

        return products

    def update_price(self, product: Product, result: PriceResult) -> bool:
        """Updates a product price in Supabase."""
        if self.dry_run:
            price_display = "Free" if result.is_free else f"{result.price_eur} EUR"
            print(f"      [DRY-RUN] Would set: {price_display} - {result.price_details}")
            return True

        data: Dict[str, Any] = {
            'price_eur': result.price_eur,
            'price_details': result.price_details or '',
            'updated_at': datetime.now().isoformat()
        }

        return self.db.patch('products', data, {'id': f'eq.{product.id}'})

    def run(
        self,
        mode: str = 'test',
        slug: Optional[str] = None,
        force: bool = False
    ) -> bool:
        """Executes the price update pipeline."""

        self._print_banner()

        if self.dry_run:
            print("   MODE: Simulation (dry-run)\n")

        # Test connection
        if not self.db.test_connection():
            print("   ERROR: Supabase connection impossible")
            return False

        print("   Supabase connection: OK")

        # Determine the limit according to the mode
        limit: Optional[int] = None
        if not slug:
            if mode == 'test':
                limit = 1
            elif mode == 'partial':
                limit = 10

        # Retrieve products
        products = self.get_products(slug=slug, force=force, limit=limit)
        self.stats.total = len(products)

        if not products:
            print("\n   No products to update")
            if not force:
                print("   (Use --force to force the update)")
            return True

        print(f"   Products to process: {len(products)}")
        print(f"   Mode: {mode.upper()}")
        print("\n" + "=" * 60 + "\n")

        # Process each product
        for i, product in enumerate(products, 1):
            print(f"   [{i}/{len(products)}] {product.name}")
            print(f"      Type: {product.type_name or 'N/A'}")
            print(f"      URL: {product.url or 'N/A'}")

            try:
                # Search for the price
                result = self.finder.find_price(product)

                if result.price_eur is not None:
                    # Update
                    if self.update_price(product, result):
                        if result.is_free or result.price_eur == 0:
                            print(f"      => FREE - {result.price_details} [{result.source}]")
                        else:
                            print(f"      => {result.price_eur} EUR - {result.price_details} [{result.source}]")
                        self.stats.updated += 1
                    else:
                        print(f"      => ERROR: DB update failed")
                        self.stats.errors += 1
                else:
                    print(f"      => Price not found [{result.source}]")
                    self.stats.not_found += 1

            except Exception as e:
                print(f"      => EXCEPTION: {e}")
                self.stats.errors += 1

            # Rate limiting
            time.sleep(1.5)
            print()

        # Summary
        self._print_summary()
        return True

    def _print_banner(self) -> None:
        """Displays the banner."""
        print("""
========================================================================
     SAFESCORING.IO - PRICE UPDATER
========================================================================
     Automatic price update via AI
     Sources: Knowledge base + Gemini + Mistral
========================================================================
""")

    def _print_summary(self) -> None:
        """Displays the final summary."""
        print(f"""
{'=' * 60}
   SUMMARY
{'=' * 60}

   Duration:             {self.stats.duration:.1f} secondes
   Total products:    {self.stats.total}
   Updated:        {self.stats.updated}
   Price not founds:  {self.stats.not_found}
   Errors:           {self.stats.errors}

{'=' * 60}
""")


# ============================================
# MAIN
# ============================================

def update_btc_fee_conversions(db: SupabaseClient, dry_run: bool = False, force: bool = False) -> None:
    """
    Updates Bitcoin products with sat/vB -> USD/EUR conversion.

    This function searches for products whose price_details contains "sat/vB"
    and adds/updates the USD/EUR conversion based on the current BTC price.

    Args:
        db: Client Supabase
        dry_run: If True, does not modify the database
        force: If True, updates even already converted products
    """
    import re

    print("\n" + "=" * 60)
    print("   BITCOIN CONVERSION UPDATE (sat/vB -> USD/EUR)")
    print("=" * 60 + "\n")

    # Retrieve the current BTC price
    btc_price = get_btc_price_usd()
    print(f"   Current BTC price: ${btc_price:,.0f}")
    print(f"   Average tx size: {AVG_TX_SIZE_VBYTES} vBytes")
    print(f"   Force mode: {'YES' if force else 'NO'}\n")

    # Retrieve all products with price_details containing sat/vB
    products = db.get(
        'products',
        'id, name, slug, price_details',
        {'price_details': 'ilike.%sat/vB%'}
    )

    if not products:
        print("   No products with sat/vB fees found")
        return

    print(f"   Products found: {len(products)}\n")

    # Pattern to detect sat/vB with or without existing conversion
    # Capture: "X-Y sat/vB" or "X sat/vB" with optional "(~$... | ~€...)"
    sat_vb_with_conversion = re.compile(
        r'(\d+)(?:-(\d+))?\s*sat/vB(?:\s*\([^)]+\))?'
    )

    updated = 0
    skipped = 0

    for product in products:
        details = product.get('price_details', '')

        # Check if already converted (contient $ ou €)
        already_converted = '$' in details or '€' in details

        if already_converted and not force:
            print(f"   [SKIP] {product['name']}: already converted (use --force)")
            skipped += 1
            continue

        # Look for sat/vB pattern
        match = sat_vb_with_conversion.search(details)
        if not match:
            continue

        min_sat = int(match.group(1))
        max_sat = int(match.group(2)) if match.group(2) else min_sat

        # Calculate the conversion
        min_usd, max_usd = sat_per_vb_to_usd_range(min_sat, max_sat, btc_price_usd=btc_price)
        min_eur, max_eur = usd_to_eur(min_usd), usd_to_eur(max_usd)

        # Conversion format
        conversion = f"(~${min_usd:.2f}-${max_usd:.2f} | ~€{min_eur:.2f}-€{max_eur:.2f})"

        # Replace in original text (preserving the rest)
        def replace_sat_vb(m):
            base = f"{min_sat}-{max_sat} sat/vB" if max_sat != min_sat else f"{min_sat} sat/vB"
            return f"{base} {conversion}"

        new_details = sat_vb_with_conversion.sub(replace_sat_vb, details, count=1)

        print(f"   [{product['slug']}] {product['name']}")
        print(f"      Previous: {details}")
        print(f"      New: {new_details}")

        if not dry_run:
            success = db.patch(
                'products',
                {'price_details': new_details, 'updated_at': datetime.now().isoformat()},
                {'id': f"eq.{product['id']}"}
            )
            if success:
                print(f"      => UPDATED")
                updated += 1
            else:
                print(f"      => ERROR")
        else:
            print(f"      => [DRY-RUN] Not modified")
            updated += 1

        print()

    print(f"\n   Summary:")
    print(f"   - Updated: {updated}")
    print(f"   - Skipped: {skipped}")
    print(f"   - Total: {len(products)}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description='SafeScoring - Automatic price update'
    )
    parser.add_argument(
        '--mode',
        choices=['test', 'partial', 'full'],
        default='test',
        help='Mode: test (1), partial (10), full (tous)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Simulation without modification'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Force update even if price exists'
    )
    parser.add_argument(
        '--product',
        type=str,
        help='Slug of the specific product'
    )
    parser.add_argument(
        '--update-btc-fees',
        action='store_true',
        help='Updates sat/vB -> USD/EUR conversions for Bitcoin products'
    )

    args = parser.parse_args()

    # Display configuration
    print("\n   Configuration:")
    print(f"   - Supabase: {'OK' if SUPABASE_URL else 'MISSING'}")
    print(f"   - Gemini:   {'OK' if GOOGLE_API_KEY else 'MISSING'}")
    print(f"   - Mistral:  {'OK' if MISTRAL_API_KEY else 'MISSING'}")

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("\n   ERROR: Supabase configuration required!")
        sys.exit(1)

    # Bitcoin conversions update mode
    if args.update_btc_fees:
        db = SupabaseClient(SUPABASE_URL, SUPABASE_KEY)
        if not db.test_connection():
            print("\n   ERROR: Supabase connection impossible")
            sys.exit(1)
        update_btc_fee_conversions(db, dry_run=args.dry_run, force=args.force)
        sys.exit(0)

    if not GOOGLE_API_KEY and not MISTRAL_API_KEY:
        print("\n   ERROR: At least one AI API key required (Gemini or Mistral)")
        sys.exit(1)

    # Launch the pipeline
    updater = PriceUpdater(dry_run=args.dry_run)
    success = updater.run(
        mode=args.mode,
        slug=args.product,
        force=args.force
    )

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
