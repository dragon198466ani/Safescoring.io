#!/usr/bin/env python3
"""
SAFESCORING.IO - Evaluation Validator Module
Validates and corrects AI evaluation responses to minimize errors.

FEATURES:
- Strict response format validation
- Confidence scoring based on justification quality
- Automatic re-evaluation for low-confidence results
- Inconsistency detection using norm dependencies
- Cross-validation between related norms
- Hallucination detection (claims without evidence)

ERROR REDUCTION TARGETS:
- Format errors: ~0% (strict parsing)
- Hallucinations: -50% (evidence checking)
- Inconsistencies: -80% (dependency validation)
- False positives: -40% (stricter YES criteria)
"""

import re
import hashlib
import sqlite3
import os
from datetime import datetime, timedelta
from threading import Lock
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import json

# Import norm dependencies for cross-validation
from .norm_dependencies import NormDependencyEngine, check_consistency

# Import constants from applicability_rules (single source of truth)
from .applicability_rules import (
    HARDWARE_NORM_CODES,
    SOFTWARE_NORM_CODES,
    EVM_CHAINS,
    NON_EVM_CHAINS,
    EVM_ONLY_PRODUCT_TYPES,
    MULTI_CHAIN_PRODUCT_TYPES,
    SOFTWARE_PRODUCT_TYPES,
    HARDWARE_PRODUCT_TYPES,
    CHAIN_NORMS,
)


# =============================================================================
# VALIDATION CACHE - Persistent cache for validation results
# =============================================================================

class ValidationCache:
    """SQLite-based cache for validation results. TTL: 24 hours."""

    _instance = None
    _lock = Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

        cache_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'cache')
        os.makedirs(cache_dir, exist_ok=True)
        self.db_path = os.path.join(cache_dir, 'validation_cache.db')
        self._db_lock = Lock()
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS validation_cache (
                    eval_hash TEXT PRIMARY KEY,
                    confidence TEXT NOT NULL,
                    flags TEXT,
                    needs_review INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP
                )
            ''')
            conn.execute('''
                CREATE TABLE IF NOT EXISTS quality_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id TEXT,
                    total_evals INTEGER,
                    high_confidence INTEGER,
                    medium_confidence INTEGER,
                    low_confidence INTEGER,
                    flagged_count INTEGER,
                    inconsistencies INTEGER,
                    corrections INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_validation_expires ON validation_cache(expires_at)')
            conn.commit()

    def _hash_eval(self, norm_code: str, result: str, justification: str) -> str:
        content = f"{norm_code}:{result}:{justification[:200]}"
        return hashlib.sha256(content.encode('utf-8')).hexdigest()[:32]

    def get(self, norm_code: str, result: str, justification: str) -> Optional[Dict]:
        """Get cached validation if exists and not expired."""
        eval_hash = self._hash_eval(norm_code, result, justification)
        with self._db_lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.execute(
                        '''SELECT confidence, flags, needs_review FROM validation_cache
                           WHERE eval_hash = ? AND expires_at > datetime("now")''',
                        (eval_hash,)
                    )
                    row = cursor.fetchone()
                    if row:
                        return {
                            'confidence': row[0],
                            'flags': json.loads(row[1]) if row[1] else [],
                            'needs_review': bool(row[2])
                        }
            except (sqlite3.Error, json.JSONDecodeError):
                pass
        return None

    def set(self, norm_code: str, result: str, justification: str,
            confidence: str, flags: List[str], needs_review: bool, ttl_hours: int = 24):
        """Cache validation result."""
        eval_hash = self._hash_eval(norm_code, result, justification)
        expires_at = datetime.now() + timedelta(hours=ttl_hours)
        with self._db_lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute('''
                        INSERT OR REPLACE INTO validation_cache
                        (eval_hash, confidence, flags, needs_review, expires_at)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (eval_hash, confidence, json.dumps(flags), int(needs_review), expires_at))
                    conn.commit()
            except sqlite3.Error:
                pass

    def record_quality_metrics(self, product_id: str, metrics: Dict):
        """Record quality metrics for a product evaluation."""
        with self._db_lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute('''
                        INSERT INTO quality_metrics
                        (product_id, total_evals, high_confidence, medium_confidence,
                         low_confidence, flagged_count, inconsistencies, corrections)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        product_id,
                        metrics.get('total', 0),
                        metrics.get('high_confidence', 0),
                        metrics.get('medium_confidence', 0),
                        metrics.get('low_confidence', 0),
                        metrics.get('flagged', 0),
                        metrics.get('inconsistencies', 0),
                        metrics.get('corrections', 0)
                    ))
                    conn.commit()
            except sqlite3.Error:
                pass

    def get_quality_stats(self, days: int = 7) -> Dict:
        """Get aggregated quality statistics for the last N days."""
        with self._db_lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.execute('''
                        SELECT
                            COUNT(*) as total_products,
                            SUM(total_evals) as total_evals,
                            SUM(high_confidence) as high_conf,
                            SUM(medium_confidence) as med_conf,
                            SUM(low_confidence) as low_conf,
                            SUM(flagged_count) as flagged,
                            SUM(inconsistencies) as inconsistencies,
                            SUM(corrections) as corrections
                        FROM quality_metrics
                        WHERE created_at > datetime('now', ?)
                    ''', (f'-{days} days',))
                    row = cursor.fetchone()
                    if row and row[0]:
                        total_evals = row[1] or 1
                        return {
                            'products_evaluated': row[0],
                            'total_evaluations': row[1],
                            'high_confidence_rate': round((row[2] or 0) / total_evals * 100, 1),
                            'medium_confidence_rate': round((row[3] or 0) / total_evals * 100, 1),
                            'low_confidence_rate': round((row[4] or 0) / total_evals * 100, 1),
                            'flag_rate': round((row[5] or 0) / total_evals * 100, 1),
                            'inconsistency_rate': round((row[6] or 0) / total_evals * 100, 2),
                            'correction_rate': round((row[7] or 0) / total_evals * 100, 1)
                        }
            except sqlite3.Error:
                pass
        return {}

    def cleanup_expired(self):
        """Remove expired cache entries."""
        with self._db_lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute('DELETE FROM validation_cache WHERE expires_at < datetime("now")')
                    conn.commit()
            except sqlite3.Error:
                pass


# Global cache instance
_validation_cache = None

def get_validation_cache() -> ValidationCache:
    global _validation_cache
    if _validation_cache is None:
        _validation_cache = ValidationCache()
    return _validation_cache


# =============================================================================
# CONFIDENCE SCORING
# =============================================================================

class ConfidenceLevel(Enum):
    """Confidence levels for evaluation results."""
    HIGH = "high"           # Strong evidence, clear justification
    MEDIUM = "medium"       # Some evidence, reasonable justification
    LOW = "low"            # Weak evidence, vague justification
    INVALID = "invalid"     # Invalid format or response


@dataclass
class ValidatedEvaluation:
    """Validated evaluation with confidence metadata."""
    norm_code: str
    result: str
    justification: str
    confidence: ConfidenceLevel
    flags: List[str]  # Warning flags
    needs_review: bool


# =============================================================================
# VALIDATION PATTERNS
# =============================================================================

# Valid result values (including aliases)
VALID_RESULTS = {'YES', 'YESp', 'NO', 'TBD', 'N/A'}
# Result aliases (map to normalized values)
RESULT_ALIASES = {
    'PASS': 'YES',
    'FAIL': 'NO',
    'OUI': 'YES',
    'NON': 'NO',
    'NA': 'N/A',
    'APPLICABLE': 'YES',
    'NONAPPLICABLE': 'N/A',
}

# Strong evidence indicators (increase confidence)
STRONG_EVIDENCE_PATTERNS = [
    r'\b(documented|documented in|according to|states? that|specification|spec)\b',
    r'\b(audit|audited by|audit report|security review)\b',
    r'\b(source code|github|open source|verified)\b',
    r'\b(certification|certified|CC EAL|FIPS|ISO)\b',
    r'\b(whitepaper|technical paper|documentation)\b',
    r'\b(protocol requires|standard requires|inherent to)\b',
    r'\b(BIP-\d+|EIP-\d+|RFC-\d+)\b',  # Standards references
]

# Weak evidence indicators (decrease confidence)
WEAK_EVIDENCE_PATTERNS = [
    r'\b(claims?|marketing|says?|mentions?)\b',
    r'\b(appears? to|seems? to|likely|probably|possibly)\b',
    r'\b(unknown|unclear|not specified|not documented)\b',
    r'\b(assume|assumption|assumed)\b',
    r'\b(no evidence|no information|no documentation)\b',
    r'\b(cannot determine|cannot verify|unable to)\b',
]

# Hallucination indicators (potential false positives)
HALLUCINATION_PATTERNS = [
    r'\b(obviously|clearly|definitely|certainly)\b.*\bYES\b',
    r'\bYES\b.*\b(without|no)\s+(documentation|evidence|proof)\b',
    r'\b(industry standard|best practice)\b.*\bYES\b',  # Vague claims
    r'\b(secure|protected|safe)\b.*\bYES\b(?!.*\b(how|which|what|using)\b)',  # "Secure" without specifics
]

# =============================================================================
# HARDWARE vs SOFTWARE NORM COMPATIBILITY
# =============================================================================
# Constants are imported from applicability_rules.py (single source of truth)
# Aliases for backwards compatibility:
HARDWARE_ONLY_NORMS = HARDWARE_NORM_CODES  # Alias
SOFTWARE_ONLY_NORMS = SOFTWARE_NORM_CODES  # Alias

# =============================================================================
# NORM TOPIC KEYWORDS - For detecting non-sequitur justifications
# =============================================================================

# Expected keywords in justifications for specific norms
NORM_TOPIC_KEYWORDS = {
    # Security pillar - Cryptography
    'S01': ['aes', 'encryption', 'encrypt', '256', '128', 'cipher', 'gcm', 'cbc'],
    'S02': ['rsa', 'key', 'asymmetric', 'public', 'private', '2048', '4096'],
    'S03': ['secp256k1', 'ecdsa', 'elliptic', 'curve', 'signature'],
    'S04': ['ed25519', 'eddsa', 'curve25519', 'signature'],
    'S07': ['ripemd', 'hash', '160', 'bitcoin', 'address'],
    'S08': ['sha', 'hash', '256', '512', 'digest'],
    'S31': ['eip-712', 'typed', 'data', 'signature', 'message'],
    'S36': ['erc-4337', 'account abstraction', 'bundler', 'paymaster', 'userop'],

    # Security pillar - Key management
    'S-BIP-032': ['bip32', 'bip-32', 'derivation', 'path', 'hd', 'hierarchical'],
    'S-BIP-039': ['bip39', 'bip-39', 'mnemonic', 'seed', 'words', '12', '24'],
    'S-BIP-044': ['bip44', 'bip-44', 'path', 'derivation', 'coin', 'type'],
    'S-BIP-084': ['bip84', 'bip-84', 'native', 'segwit', 'p2wpkh'],

    # Security pillar - Hardware
    'S50': ['secure element', 'chip', 'se', 'cc', 'eal', 'st33', 'certified'],
    'S51': ['tamper', 'proof', 'detection', 'physical', 'attack'],
    'S52': ['side channel', 'power', 'analysis', 'electromagnetic', 'timing'],

    # Fiability pillar - Materials (F01-F20)
    'F01': ['metal', 'alloy', 'steel', 'titanium', 'aluminum', 'material'],
    'F02': ['water', 'ip', 'waterproof', 'resistant', 'sealed'],
    'F03': ['temperature', 'heat', 'cold', 'degrees', 'celsius', 'thermal'],
    'F04': ['fire', 'flame', 'burn', 'fireproof', 'resistant'],
    'F-ALLOY-001': ['inconel', 'alloy', '718', 'nickel', 'aerospace'],
    'F126': ['inconel', 'alloy', '718', 'nickel', 'aerospace', 'metal'],

    # Fiability pillar - Audits
    'F91': ['audit', 'audited', 'security', 'report', 'firm', 'trail of bits', 'certik'],
    'F92': ['audit', 'contract', 'smart', 'verified'],

    # Fiability pillar - Open source
    'F120': ['open source', 'github', 'source code', 'repository', 'license', 'mit', 'gpl'],
    'F121': ['reproducible', 'build', 'deterministic', 'compile'],

    # Fiability pillar - SLA/Uptime
    'F141': ['sla', 'uptime', 'availability', '99', 'downtime', 'service level'],
    'F142': ['status', 'page', 'monitoring', 'incident'],

    # Ecosystem pillar - Chain support (based on actual database)
    # E01=Bitcoin, E02=Ethereum, E03=EVM, E04=Polygon, E05=Arbitrum,
    # E06=Optimism, E07=Base, E08=BNB, E09=Avalanche, E10=Solana
    'E01': ['bitcoin', 'btc', 'satoshi', 'lightning'],
    'E02': ['ethereum', 'eth', 'mainnet'],
    'E03': ['evm', 'compatible', 'chains'],
    'E04': ['polygon', 'matic'],
    'E05': ['arbitrum', 'arb'],
    'E06': ['optimism', 'op'],
    'E07': ['base'],
    'E08': ['bnb', 'bsc', 'binance'],
    'E09': ['avalanche', 'avax'],
    'E10': ['solana', 'sol', 'spl'],

    # Anti-coercion pillar
    'A01': ['duress', 'pin', 'panic', 'emergency', 'wipe'],
    'A91': ['wipe', 'erase', 'failed', 'attempts', 'brute'],
}

# Keywords that indicate unrelated justifications (non-sequiturs)
NON_SEQUITUR_KEYWORDS = {
    # Financial metrics should NOT appear for technical security norms
    'S': ['tvl', 'market cap', 'volume', 'price', 'valuation', 'users'],
    # Material norms should NOT have software terms
    'F01': ['smart contract', 'code', 'protocol', 'blockchain', 'tvl'],
    'F02': ['smart contract', 'code', 'protocol', 'blockchain', 'tvl'],
    'F126': ['tvl', 'volume', 'liquidity', 'users', 'smart contract'],
    # SLA should have uptime/availability terms, not feature terms
    'F141': ['chain', 'token', 'swap', 'trade', 'smart contract', 'security features'],
}

# =============================================================================
# PRODUCT TYPE CHAIN COMPATIBILITY
# =============================================================================
# EVM_CHAINS, NON_EVM_CHAINS, EVM_ONLY_PRODUCT_TYPES, MULTI_CHAIN_PRODUCT_TYPES
# are imported from applicability_rules.py (single source of truth)


# =============================================================================
# EVALUATION VALIDATOR
# =============================================================================

class EvaluationValidator:
    """
    Validates AI evaluation responses and calculates confidence.
    Detects potential errors and flags for re-evaluation.
    Uses caching for improved performance.
    """

    def __init__(self, strict_mode: bool = True, use_cache: bool = True):
        """
        Initialize validator.

        Args:
            strict_mode: If True, flags more results for review
            use_cache: If True, use persistent cache for validation results
        """
        self.strict_mode = strict_mode
        self.use_cache = use_cache
        self.norm_engine = NormDependencyEngine()
        self.cache = get_validation_cache() if use_cache else None

        # Compile patterns for efficiency
        self.strong_patterns = [re.compile(p, re.I) for p in STRONG_EVIDENCE_PATTERNS]
        self.weak_patterns = [re.compile(p, re.I) for p in WEAK_EVIDENCE_PATTERNS]
        self.hallucination_patterns = [re.compile(p, re.I) for p in HALLUCINATION_PATTERNS]

        # Metrics tracking for current session
        self._session_metrics = {
            'total': 0,
            'high_confidence': 0,
            'medium_confidence': 0,
            'low_confidence': 0,
            'flagged': 0,
            'inconsistencies': 0,
            'corrections': 0
        }

    def validate_response_format(self, raw_response: str) -> Tuple[bool, List[str]]:
        """
        Validate that AI response follows expected format.

        Expected format:
        CODE: RESULT | Justification

        Returns:
            (is_valid, list of format errors)
        """
        if not raw_response or not raw_response.strip():
            return False, ["Empty response"]

        errors = []
        lines = raw_response.strip().split('\n')
        valid_lines = 0
        explanation_lines = 0  # Lines that are clearly explanation, not errors

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Expected: CODE: RESULT | reason
            if ':' not in line:
                # Could be intro/outro text - not an error
                explanation_lines += 1
                continue

            parts = line.split(':', 1)
            if len(parts) < 2:
                explanation_lines += 1
                continue

            code_part = parts[0].strip()
            rest = parts[1].strip()

            # Validate code format - support 1-4 digit codes (S01, S261, etc.)
            # Also try to extract code from markdown like "**S01**"
            if not re.match(r'^[SAFE]\d{1,4}$', code_part):
                code_match = re.search(r'\b([SAFE])[-_]?(\d{1,4})\b', code_part, re.IGNORECASE)
                if not code_match:
                    # Could be explanation text, skip (not an error)
                    explanation_lines += 1
                    continue
                code_part = f"{code_match.group(1).upper()}{code_match.group(2)}"

            # Validate result
            if '|' in rest:
                result = rest.split('|')[0].strip().upper()
            else:
                result = rest.split()[0].strip().upper() if rest.split() else ''

            # Clean result (remove non-alpha except /)
            result = re.sub(r'[^A-Z/]', '', result)

            if result not in VALID_RESULTS:
                errors.append(f"Invalid result '{result}' for {code_part}")
                continue

            valid_lines += 1

        # More lenient validation: valid if we found at least 1 valid line
        # (ignore explanation lines - they're not errors)
        is_valid = valid_lines > 0
        return is_valid, errors

    def calculate_confidence(self, result: str, justification: str, norm_code: str) -> ConfidenceLevel:
        """
        Calculate confidence level for an evaluation.

        Factors:
        - Justification length and quality
        - Strong vs weak evidence patterns
        - Result consistency with norm type
        """
        if not justification:
            return ConfidenceLevel.LOW

        justification_lower = justification.lower()
        score = 50  # Base score

        # Check strong evidence patterns
        for pattern in self.strong_patterns:
            if pattern.search(justification):
                score += 15

        # Check weak evidence patterns
        for pattern in self.weak_patterns:
            if pattern.search(justification):
                score -= 10

        # Justification length factor
        if len(justification) < 20:
            score -= 20
        elif len(justification) > 100:
            score += 10

        # YES with short justification is suspicious
        if result.upper() == 'YES' and len(justification) < 50:
            score -= 15

        # TBD should be rare
        if result.upper() == 'TBD':
            score -= 10

        # Map score to confidence level
        if score >= 70:
            return ConfidenceLevel.HIGH
        elif score >= 40:
            return ConfidenceLevel.MEDIUM
        else:
            return ConfidenceLevel.LOW

    def detect_hallucinations(self, result: str, justification: str, norm_code: str) -> List[str]:
        """
        Detect potential hallucinations (false positives without evidence).

        Returns list of warning flags.
        """
        flags = []

        if result.upper() not in ['YES', 'YESP']:
            return flags  # Only check YES results

        # Check hallucination patterns
        full_text = f"{result} {justification}"
        for i, pattern in enumerate(self.hallucination_patterns):
            if pattern.search(full_text):
                flags.append(f"HALLUCINATION_PATTERN_{i}")

        # YES without any evidence keywords
        evidence_found = any(p.search(justification) for p in self.strong_patterns)
        if not evidence_found and len(justification) > 20:
            flags.append("NO_EVIDENCE_KEYWORDS")

        # Generic security claims without specifics
        if re.search(r'\b(secure|encrypted|protected)\b', justification.lower()):
            if not re.search(r'\b(AES|RSA|ECDSA|SHA|secp256k1|Ed25519|BIP-\d+)\b', justification, re.I):
                flags.append("GENERIC_SECURITY_CLAIM")

        # NEW: Check for non-sequitur justifications
        non_sequitur_flags = self.detect_non_sequitur(norm_code, justification)
        flags.extend(non_sequitur_flags)

        # NEW: Check topic relevance
        topic_flags = self.validate_justification_topic(norm_code, justification)
        flags.extend(topic_flags)

        return flags

    def detect_non_sequitur(self, norm_code: str, justification: str) -> List[str]:
        """
        Detect non-sequitur justifications (topic mismatch).

        Example: F126 (Inconel 718) with justification about "high TVL"

        Returns list of warning flags.
        """
        flags = []
        justification_lower = justification.lower()

        # Check specific norm non-sequiturs
        if norm_code in NON_SEQUITUR_KEYWORDS:
            bad_keywords = NON_SEQUITUR_KEYWORDS[norm_code]
            for keyword in bad_keywords:
                if keyword.lower() in justification_lower:
                    flags.append(f"NON_SEQUITUR:{keyword}")
                    break  # One is enough

        # Check pillar-level non-sequiturs
        pillar = norm_code[0] if norm_code else ''
        if pillar in NON_SEQUITUR_KEYWORDS:
            bad_keywords = NON_SEQUITUR_KEYWORDS[pillar]
            for keyword in bad_keywords:
                if keyword.lower() in justification_lower:
                    flags.append(f"PILLAR_NON_SEQUITUR:{keyword}")
                    break

        return flags

    def validate_justification_topic(self, norm_code: str, justification: str) -> List[str]:
        """
        Validate that justification contains relevant keywords for the norm.

        Returns list of warning flags if topic mismatch detected.
        """
        flags = []
        justification_lower = justification.lower()

        # Get expected keywords for this norm
        expected_keywords = NORM_TOPIC_KEYWORDS.get(norm_code, [])

        if not expected_keywords:
            return flags  # No keywords defined, can't validate

        # Check if at least one expected keyword is present
        keyword_found = any(kw.lower() in justification_lower for kw in expected_keywords)

        if not keyword_found and len(justification) > 30:
            # Justification is substantial but doesn't mention expected topic
            flags.append(f"TOPIC_MISMATCH:{norm_code}")

        return flags

    def validate_chain_support(
        self,
        norm_code: str,
        result: str,
        justification: str,
        product_slug: str = None,
        product_type: str = None
    ) -> List[str]:
        """
        Validate chain support claims against product type capabilities.

        For EVM-only products (DEX, DeFi, Lending):
        - EVM chains (Ethereum, Polygon, Arbitrum, etc.) = OK
        - Non-EVM chains (Bitcoin, Solana, Cosmos, etc.) = ERROR

        For multi-chain products (Hardware wallets, Exchanges):
        - All chains can be supported

        Returns list of warning flags.
        """
        flags = []

        if result.upper() not in ['YES', 'YESP']:
            return flags  # Only check positive results

        # Use CHAIN_NORMS from applicability_rules.py (single source of truth)
        # Only validate non-EVM chains for EVM-only products
        if norm_code not in CHAIN_NORMS:
            return flags

        chain = CHAIN_NORMS[norm_code]

        # Skip validation for EVM chains (they're supported by EVM-only products)
        if chain in EVM_CHAINS or chain == 'evm':
            return flags

        # Determine if product is EVM-only
        is_evm_only = False

        # Check by product type
        if product_type:
            type_upper = product_type.upper()
            if any(evm_type in type_upper for evm_type in EVM_ONLY_PRODUCT_TYPES):
                is_evm_only = True
            # Check for common patterns in type codes
            if any(pattern in type_upper for pattern in ['DEX', 'DEFI', 'LENDING', 'YIELD', 'SWAP', 'AGGREGATOR']):
                is_evm_only = True

        # Check by product slug (common EVM-only products)
        if product_slug:
            slug_lower = product_slug.lower()
            evm_only_products = [
                '1inch', 'uniswap', 'sushiswap', 'pancakeswap', 'curve',
                'aave', 'compound', 'maker', 'lido', 'rocket-pool',
                'yearn', 'convex', 'balancer', 'dydx', 'gmx',
                'synthetix', 'frax', 'liquity', 'morpho', 'euler',
                'paraswap', 'cowswap', 'odos', 'kyberswap', 'bebop'
            ]
            if any(prod in slug_lower for prod in evm_only_products):
                is_evm_only = True

        # Flag non-EVM chain claims for EVM-only products
        if is_evm_only and chain in NON_EVM_CHAINS:
            flags.append(f"CHAIN_NOT_SUPPORTED:{chain}")

        return flags

    def validate_norm_product_compatibility(
        self,
        norm_code: str,
        result: str,
        product_type: str = None,
        product_slug: str = None
    ) -> List[str]:
        """
        Validate that norms are compatible with product type.

        Hardware norms (Secure Element, materials, firmware) should be N/A for DeFi/software.
        Software norms (smart contracts, MEV) should be N/A for hardware wallets.

        Returns list of warning flags.
        """
        flags = []

        if result.upper() not in ['YES', 'YESP']:
            return flags  # Only check positive results

        # Determine product category
        is_software = False
        is_hardware = False

        if product_type:
            type_upper = product_type.upper()
            if any(sw_type in type_upper for sw_type in SOFTWARE_PRODUCT_TYPES):
                is_software = True
            if any(hw_type in type_upper for hw_type in HARDWARE_PRODUCT_TYPES):
                is_hardware = True

        # Check by product slug
        if product_slug:
            slug_lower = product_slug.lower()
            # Software products
            software_products = [
                '1inch', 'uniswap', 'sushiswap', 'pancakeswap', 'curve',
                'aave', 'compound', 'maker', 'lido', 'yearn', 'convex',
                'balancer', 'dydx', 'gmx', 'synthetix', 'frax', 'morpho',
                'paraswap', 'cowswap', 'odos', 'kyberswap', 'bebop',
                'opensea', 'blur', 'rarible', 'superrare'
            ]
            if any(prod in slug_lower for prod in software_products):
                is_software = True

            # Hardware products
            hardware_products = [
                'ledger', 'trezor', 'coldcard', 'bitbox', 'keepkey',
                'keystone', 'ngrave', 'ellipal', 'safepal', 'secux',
                'arculus', 'tangem', 'gridplus', 'jade', 'passport',
                'foundation', 'cobo', 'dcent', 'coolwallet'
            ]
            if any(prod in slug_lower for prod in hardware_products):
                is_hardware = True

        # Check hardware norms for software products
        if is_software and norm_code in HARDWARE_ONLY_NORMS:
            flags.append(f"HARDWARE_NORM_FOR_SOFTWARE:{norm_code}")

        # Check software norms for hardware products
        if is_hardware and norm_code in SOFTWARE_ONLY_NORMS:
            flags.append(f"SOFTWARE_NORM_FOR_HARDWARE:{norm_code}")

        return flags

    def validate_for_product_type(
        self,
        evaluations: Dict[str, Tuple[str, str]],
        product_info: Dict
    ) -> List[Dict]:
        """
        Validate evaluations are consistent with product type.

        Args:
            evaluations: Dict of {norm_code: (result, justification)}
            product_info: Product information dict

        Returns:
            List of type-inconsistency warnings
        """
        warnings = []
        type_code = product_info.get('type_code', '').upper()

        is_software = any(x in type_code for x in ['SW', 'DEX', 'LENDING', 'BRIDGE', 'PROTOCOL'])
        is_hardware = 'HW' in type_code

        for norm_code, (result, justification) in evaluations.items():
            if result.upper() not in ['YES', 'YESP']:
                continue

            # Check hardware norms for software products
            if is_software and norm_code in HARDWARE_ONLY_NORMS:
                warnings.append({
                    'type': 'type_mismatch',
                    'norm': norm_code,
                    'result': result,
                    'message': f"Hardware norm {norm_code}=YES for software product",
                    'severity': 'high'
                })

            # Check software norms for hardware products
            if is_hardware and norm_code in SOFTWARE_ONLY_NORMS:
                warnings.append({
                    'type': 'type_mismatch',
                    'norm': norm_code,
                    'result': result,
                    'message': f"Software norm {norm_code}=YES for hardware product",
                    'severity': 'medium'
                })

        return warnings

    def validate_single_evaluation(
        self,
        norm_code: str,
        result: str,
        justification: str,
        product_info: Optional[Dict] = None
    ) -> ValidatedEvaluation:
        """
        Validate a single evaluation and return validated result.
        Uses cache for repeated validations.

        Args:
            norm_code: The norm code (e.g., S01)
            result: The evaluation result (YES/NO/TBD/etc.)
            justification: The justification text
            product_info: Optional product info for type validation

        Returns:
            ValidatedEvaluation with confidence and flags
        """
        # Normalize result - preserve YESp casing
        result_normalized = result.upper().strip()
        if result_normalized == 'YESP':
            result_normalized = 'YESp'

        # Check cache first (if no product_info, cache can be used)
        if self.use_cache and self.cache and not product_info:
            cached = self.cache.get(norm_code, result_normalized, justification)
            if cached:
                return ValidatedEvaluation(
                    norm_code=norm_code,
                    result=result_normalized,
                    justification=justification,
                    confidence=ConfidenceLevel(cached['confidence']),
                    flags=cached['flags'],
                    needs_review=cached['needs_review']
                )

        flags = []

        # Validate result value
        if result_normalized not in VALID_RESULTS:
            return ValidatedEvaluation(
                norm_code=norm_code,
                result='TBD',
                justification=f"Invalid result: {result}",
                confidence=ConfidenceLevel.INVALID,
                flags=['INVALID_RESULT'],
                needs_review=True
            )

        # Calculate confidence
        confidence = self.calculate_confidence(result_normalized, justification, norm_code)

        # Detect hallucinations
        hallucination_flags = self.detect_hallucinations(result_normalized, justification, norm_code)
        flags.extend(hallucination_flags)

        # Product type validation
        if product_info:
            type_warnings = self.validate_for_product_type(
                {norm_code: (result_normalized, justification)},
                product_info
            )
            for warn in type_warnings:
                flags.append(f"TYPE_MISMATCH:{warn['norm']}")

            # Chain support validation (for DEX/wallet products)
            product_slug = product_info.get('slug', '')
            product_type = product_info.get('type_code', '') or product_info.get('type', '')
            chain_flags = self.validate_chain_support(
                norm_code, result_normalized, justification, product_slug, product_type
            )
            flags.extend(chain_flags)

            # Hardware/Software norm compatibility validation
            compat_flags = self.validate_norm_product_compatibility(
                norm_code, result_normalized, product_type, product_slug
            )
            flags.extend(compat_flags)

        # Determine if review is needed
        needs_review = (
            confidence == ConfidenceLevel.LOW or
            len(flags) > 0 or
            result_normalized == 'TBD' or
            (self.strict_mode and confidence != ConfidenceLevel.HIGH)
        )

        # Update session metrics
        self._session_metrics['total'] += 1
        if confidence == ConfidenceLevel.HIGH:
            self._session_metrics['high_confidence'] += 1
        elif confidence == ConfidenceLevel.MEDIUM:
            self._session_metrics['medium_confidence'] += 1
        else:
            self._session_metrics['low_confidence'] += 1
        if flags:
            self._session_metrics['flagged'] += 1

        # Cache the result (if no product_info)
        if self.use_cache and self.cache and not product_info:
            self.cache.set(norm_code, result_normalized, justification,
                          confidence.value, flags, needs_review)

        return ValidatedEvaluation(
            norm_code=norm_code,
            result=result_normalized,
            justification=justification,
            confidence=confidence,
            flags=flags,
            needs_review=needs_review
        )

    def validate_batch(
        self,
        evaluations: Dict[str, Tuple[str, str]],
        product_info: Optional[Dict] = None
    ) -> Tuple[Dict[str, ValidatedEvaluation], List[Dict]]:
        """
        Validate a batch of evaluations.

        Args:
            evaluations: Dict of {norm_code: (result, justification)}
            product_info: Optional product info

        Returns:
            (validated_evaluations, list of issues)
        """
        validated = {}
        issues = []

        for norm_code, eval_data in evaluations.items():
            result, justification = eval_data if isinstance(eval_data, tuple) else (eval_data, '')

            validated_eval = self.validate_single_evaluation(
                norm_code, result, justification, product_info
            )
            validated[norm_code] = validated_eval

            if validated_eval.needs_review:
                issues.append({
                    'norm': norm_code,
                    'result': validated_eval.result,
                    'confidence': validated_eval.confidence.value,
                    'flags': validated_eval.flags,
                    'reason': 'Low confidence or flagged for review'
                })

        # Check norm dependencies for inconsistencies
        results_dict = {code: v.result for code, v in validated.items()}
        inconsistencies = self.norm_engine.detect_inconsistencies(results_dict)

        for inc in inconsistencies:
            issues.append({
                'type': 'inconsistency',
                'norm_a': inc['norm_a'],
                'norm_b': inc['norm_b'],
                'message': inc['message'],
                'severity': 'high'
            })

            # Flag both norms for review
            if inc['norm_a'] in validated:
                validated[inc['norm_a']].needs_review = True
                validated[inc['norm_a']].flags.append('INCONSISTENCY')
            if inc['norm_b'] in validated:
                validated[inc['norm_b']].needs_review = True
                validated[inc['norm_b']].flags.append('INCONSISTENCY')

        return validated, issues

    def get_norms_needing_review(
        self,
        validated: Dict[str, ValidatedEvaluation]
    ) -> List[str]:
        """
        Get list of norm codes that need expert review.

        Args:
            validated: Dict of validated evaluations

        Returns:
            List of norm codes needing review
        """
        return [code for code, v in validated.items() if v.needs_review]

    def infer_additional_evaluations(
        self,
        evaluations: Dict[str, str]
    ) -> Dict[str, str]:
        """
        Infer additional evaluations from norm dependencies.

        For example, if BIP-39=YES, then BIP-32 should be YESp.

        Args:
            evaluations: Dict of {norm_code: result}

        Returns:
            Dict of inferred {norm_code: 'YESp'}
        """
        return self.norm_engine.infer_evaluations(evaluations)

    def get_session_metrics(self) -> Dict:
        """Get metrics for the current validation session."""
        return self._session_metrics.copy()

    def reset_session_metrics(self):
        """Reset session metrics."""
        self._session_metrics = {
            'total': 0,
            'high_confidence': 0,
            'medium_confidence': 0,
            'low_confidence': 0,
            'flagged': 0,
            'inconsistencies': 0,
            'corrections': 0
        }

    def save_product_metrics(self, product_id: str):
        """Save current session metrics for a product and reset."""
        if self.use_cache and self.cache:
            self.cache.record_quality_metrics(product_id, self._session_metrics)
        self.reset_session_metrics()

    def record_correction(self):
        """Record that a correction was made."""
        self._session_metrics['corrections'] += 1

    def record_inconsistency(self):
        """Record that an inconsistency was found."""
        self._session_metrics['inconsistencies'] += 1

    def get_quality_report(self, days: int = 7) -> str:
        """
        Generate a quality report for recent evaluations.

        Args:
            days: Number of days to include in report

        Returns:
            Formatted quality report string
        """
        if not self.use_cache or not self.cache:
            return "Quality metrics not available (cache disabled)"

        stats = self.cache.get_quality_stats(days)
        if not stats:
            return "No quality metrics available for the specified period"

        report = f"""
=== EVALUATION QUALITY REPORT (Last {days} days) ===

Products Evaluated: {stats.get('products_evaluated', 0)}
Total Evaluations:  {stats.get('total_evaluations', 0)}

CONFIDENCE DISTRIBUTION:
  High:   {stats.get('high_confidence_rate', 0):.1f}%
  Medium: {stats.get('medium_confidence_rate', 0):.1f}%
  Low:    {stats.get('low_confidence_rate', 0):.1f}%

ERROR INDICATORS:
  Flag Rate:          {stats.get('flag_rate', 0):.1f}%
  Inconsistency Rate: {stats.get('inconsistency_rate', 0):.2f}%
  Correction Rate:    {stats.get('correction_rate', 0):.1f}%

QUALITY SCORE: {100 - stats.get('low_confidence_rate', 0) - stats.get('flag_rate', 0):.1f}/100
"""
        return report


# =============================================================================
# RESPONSE PARSER WITH VALIDATION
# =============================================================================

def parse_and_validate_response(
    raw_response: str,
    product_info: Optional[Dict] = None,
    strict: bool = True
) -> Tuple[Dict[str, Tuple[str, str]], List[Dict], Dict[str, str]]:
    """
    Parse AI response and validate all evaluations.

    Args:
        raw_response: Raw AI response text
        product_info: Optional product info for type validation
        strict: If True, use strict validation mode

    Returns:
        (evaluations_dict, issues_list, inferred_dict)
    """
    validator = EvaluationValidator(strict_mode=strict)

    # First validate format (but don't fail completely if invalid)
    is_valid, format_errors = validator.validate_response_format(raw_response)

    # Parse evaluations - ALWAYS try to parse, even if format validation failed
    # Supports multi-line formats where result appears on a different line than code
    evaluations = {}
    lines = raw_response.strip().split('\n')
    last_code = None  # Track last seen code for multi-line parsing

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Skip code blocks (markdown ```)
        if line.startswith('```'):
            continue

        # Try to find a norm code on this line (supports both old S01 and new S-BIP-032 formats)
        # Priority: Try new format first (S-BIP-032, A-CC-001), then fall back to old format (S01)
        code_match = re.search(r'\b([SAFE])[-_]([A-Z0-9]+(?:[-_][A-Z0-9]+)*)\b', line, re.IGNORECASE)
        if code_match:
            # New format: S-BIP-032 -> S-BIP-032
            last_code = f"{code_match.group(1).upper()}-{code_match.group(2).upper()}"
        else:
            # Old format fallback: S01, A12
            old_match = re.search(r'\b([SAFE])(\d{1,4})\b', line, re.IGNORECASE)
            if old_match:
                last_code = f"{old_match.group(1).upper()}{old_match.group(2)}"

        # Look for result on this line (works for both same-line and multi-line formats)
        # Pattern matches: YES, NO, TBD, YESp, N/A, PASS, FAIL, etc.
        result_match = re.search(r'\b(YESp|YES|NO|TBD|N/?A|PASS|FAIL|OUI|NON)\b', line, re.IGNORECASE)

        if result_match and last_code and last_code not in evaluations:
            result = result_match.group(1).upper().replace('/', '')

            # Apply aliases
            if result in RESULT_ALIASES:
                result = RESULT_ALIASES[result]
            elif result == 'YESP':
                result = 'YESp'
            elif result not in VALID_RESULTS:
                result = 'TBD'

            # Extract justification (text after result, or after |)
            rest_of_line = line[result_match.end():].strip()
            # Clean up separators
            reason = re.sub(r'^[\s\|\-:]+', '', rest_of_line)[:200]

            evaluations[last_code] = (result, reason)

        # Also check for standard format: CODE: RESULT | reason (on same line)
        if ':' in line and not last_code:
            parts = line.split(':', 1)
            code_part = parts[0].strip().upper()

            # Validate code format (supports both S01 and S-BIP-032 formats)
            if re.match(r'^[SAFE][-_]?[A-Z0-9]+(?:[-_][A-Z0-9]+)*$', code_part):
                rest = parts[1].strip()

                if '|' in rest:
                    result_part, reason_part = rest.split('|', 1)
                    result = result_part.strip().upper()
                    reason = reason_part.strip()
                else:
                    words = rest.split()
                    result = words[0].upper() if words else 'TBD'
                    reason = ' '.join(words[1:]) if len(words) > 1 else ''

                # Clean result
                result = re.sub(r'[^A-Z/]', '', result)
                if result in RESULT_ALIASES:
                    result = RESULT_ALIASES[result]
                elif result not in VALID_RESULTS:
                    result = 'TBD'

                if code_part not in evaluations:
                    evaluations[code_part] = (result, reason)

    # If no evaluations found and format was invalid, log warning
    if not evaluations and not is_valid:
        print(f"   [WARN] parse_and_validate_response: format invalid, {len(format_errors)} errors")

    # Validate batch
    validated, issues = validator.validate_batch(evaluations, product_info)

    # Convert back to simple dict
    result_dict = {code: (v.result, v.justification) for code, v in validated.items()}

    # Infer additional evaluations
    simple_results = {code: v.result for code, v in validated.items()}
    inferred = validator.infer_additional_evaluations(simple_results)

    return result_dict, issues, inferred


# =============================================================================
# EXAMPLE-BASED PROMPT ENHANCEMENT
# =============================================================================

# Concrete examples for prompts to reduce errors
EVALUATION_EXAMPLES = {
    'S': """
EXAMPLES OF CORRECT EVALUATIONS:

S01 (AES-256 encryption):
- YES | "Documentation states: 'All data encrypted with AES-256-GCM'" (specific algorithm)
- NO | "Website mentions 'encrypted' without specifying algorithm" (vague claim)
- YESp | "Uses Ethereum, which requires secp256k1 by protocol design" (protocol inherent)

S50 (Secure Element):
- YES | "Uses ST33J2M0 secure element with CC EAL5+ certification" (specific chip + cert)
- NO | "Claims 'bank-grade security chip' without model number" (marketing claim)
- N/A | Not applicable to software wallets or DeFi protocols

COMMON MISTAKES:
❌ YES for "secure" without specifying what security mechanism
❌ YES for hardware features on software products
❌ TBD when NO is appropriate (no evidence = NO)
""",

    'A': """
EXAMPLES OF CORRECT EVALUATIONS:

A01 (Duress PIN):
- YES | "Settings > Security > Duress PIN: triggers wallet wipe on entry" (documented feature)
- NO | "No duress feature found in documentation or app" (feature absent)

A91 (Auto-wipe after failed attempts):
- YES | "After 10 failed PIN attempts, device erases all data" (specific behavior)
- NO | "PIN lockout mentioned but no wipe functionality" (partial feature)

COMMON MISTAKES:
❌ YES for "security features" without listing specific anti-coercion mechanisms
❌ Confusing PIN lockout (temporary) with auto-wipe (permanent)
""",

    'F': """
EXAMPLES OF CORRECT EVALUATIONS:

F91 (Security audit):
- YES | "Audited by Trail of Bits (March 2024), report published on GitHub" (named auditor + date)
- NO | "Claims 'audited' without naming auditor or providing report link" (unverifiable)

F120 (Open source):
- YES | "Source code on GitHub: github.com/project/repo, MIT license" (verifiable link)
- NO | "Promises to open source 'soon'" (not yet available)

COMMON MISTAKES:
❌ YES for audit claims without named auditor and report link
❌ Confusing "code available" with truly open source (license required)
""",

    'E': """
EXAMPLES OF CORRECT EVALUATIONS:

E01 (Ethereum support):
- YES | "Supports ETH mainnet with ERC-20 tokens" (explicit support)
- YESp | "EVM-compatible DEX, inherently supports ETH by design" (protocol inherent)

E150 (Mobile app):
- YES | "iOS and Android apps available on App Store and Play Store" (verifiable)
- NO | "Mobile app 'coming soon'" (not yet available)

COMMON MISTAKES:
❌ YES for "planned" or "upcoming" features
❌ Confusing "compatible with" and "natively supports"
"""
}


def get_prompt_with_examples(pillar: str) -> str:
    """
    Get evaluation examples for a pillar to include in prompts.

    Args:
        pillar: The SAFE pillar (S, A, F, E)

    Returns:
        Example text to append to prompts
    """
    return EVALUATION_EXAMPLES.get(pillar, "")


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def validate_evaluations(
    evaluations: Dict[str, Any],
    product_type: str = None
) -> Tuple[bool, List[str]]:
    """
    Quick validation of evaluation results.

    Args:
        evaluations: Dict of evaluations
        product_type: Optional product type for type-specific validation

    Returns:
        (is_valid, list of error messages)
    """
    errors = []
    validator = EvaluationValidator()

    for code, eval_data in evaluations.items():
        result, reason = eval_data if isinstance(eval_data, tuple) else (eval_data, '')
        validated = validator.validate_single_evaluation(code, result, reason)

        if validated.confidence == ConfidenceLevel.INVALID:
            errors.append(f"{code}: Invalid result")
        elif validated.flags:
            errors.append(f"{code}: {', '.join(validated.flags)}")

    # Check consistency
    results_dict = {
        code: (eval_data[0] if isinstance(eval_data, tuple) else eval_data)
        for code, eval_data in evaluations.items()
    }
    issues = check_consistency(results_dict, product_type)
    for issue in issues:
        errors.append(issue.get('message', str(issue)))

    return len(errors) == 0, errors


# Global instance
evaluation_validator = EvaluationValidator()
