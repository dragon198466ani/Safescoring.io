#!/usr/bin/env python3
"""
SAFESCORING.IO - Norm Dependencies Module
Manages interdependencies between evaluation norms.

=============================================================================
DOCUMENTATION - RÈGLES D'IMPLICATIONS CODÉES
=============================================================================

1. NORM_IMPLICATIONS (lignes ~23-104)
   --------------------------------------
   Règles "Si A=YES, alors B devrait=YES"

   CHAÎNES PRINCIPALES:

   a) BIP Standards (HD Wallets):
      S16 (BIP-39 mnemonic) → S17 (BIP-32 HD wallets)
      S17 (BIP-32) → S18 (BIP-44), S19 (BIP-49)

   b) EVM Chain:
      E01/E02/E03 (Ethereum) → S31 (secp256k1), S21 (Keccak-256)

   c) Hardware Security:
      S50 (Secure Element) → S51 (SE certifications), S52 (SE key storage)
      S101 (HSM) → S102 (HSM certifications)
      S104 (TEE) → S105 (TEE attestation)

   d) Firmware:
      S73 (Signed firmware) → S191 (Secure boot)
      S74 (Anti-rollback) → S73 (Signed updates)

   e) Cryptography:
      S01 (AES-256) → S02 (AES support)
      S03 (AES-GCM) → S01 (AES-256)
      S31 (secp256k1) → S11 (ECDSA)
      S35 (Ed25519) → S36 (EdDSA)

   f) Anti-coercion:
      A01 (Duress PIN) → A02 (Duress features)
      A06 (Hidden wallet) → A01 (Duress PIN)
      A91 (Auto-wipe) → A92 (Wipe capability)

   g) Audits:
      S261 (Recent audit) → F91 (Audit history)
      S262 (Multiple audits) → S261 (Recent audit)

2. NORM_CONFLICTS (lignes ~111-123)
   ----------------------------------
   Règles "Ces normes ne devraient PAS être YES ensemble"

   a) Hardware vs Software:
      Norms hardware (S50, S51, S52, S73, F01-F03)
      ≠ Types software (SW Desktop, SW Mobile, DEX, Lending)

   b) DeFi vs Wallet:
      Norms DeFi (S221-S224 smart contracts)
      ≠ Types non-DeFi (HW Cold, SW Desktop, SW Mobile)

3. PROTOCOL_IMPLICATIONS (lignes ~130-169)
   -----------------------------------------
   Règles "Si produit utilise protocole X, alors YESp pour Y"

   a) EVM (Ethereum/Polygon/BSC):
      Triggers: E01-E05
      Implied: S31 (secp256k1), S21 (Keccak-256), S11 (ECDSA), S181 (TLS 1.2+)

   b) Bitcoin:
      Triggers: E10, E11
      Implied: S31 (secp256k1), S21 (SHA-256), S22 (RIPEMD-160)

   c) Solana:
      Triggers: E20, E21
      Implied: S35 (Ed25519), S36 (EdDSA)

   d) HD Wallet:
      Triggers: S16 (BIP-39)
      Implied: S17 (BIP-32), S18 (BIP-44)

4. PRODUCT_TYPE_PRESEEDS (lignes ~179-317)
   -----------------------------------------
   Évaluations connues par type de produit (ground truth).

   Types couverts:
   - Hardware Wallet Cold: ~25 norms pré-définies
   - Hardware Wallet Hot: ~8 norms (DEPRECATED - non-standard)
   - SW Desktop: ~10 norms
   - SW Mobile: ~10 norms
   - SW Browser: ~10 norms
   - CEX: ~2 norms
   - DEX: ~2 norms
   - Lending: ~2 norms

=============================================================================
USAGE
=============================================================================

from .norm_dependencies import NormDependencyEngine, check_consistency

# Vérifier la cohérence d'un ensemble d'évaluations
engine = NormDependencyEngine()
issues = engine.check_consistency({'S50': 'YES', 'S51': 'NO'}, 'HW Cold')
# → Retourne issues car S50=YES implique S51=YES

# Obtenir les évaluations pré-définies pour un type
preseeds = engine.get_preseeded_evaluations(['HW Cold'])
# → {'S16': ('YES', 'BIP-32...'), 'S17': ('YES', 'BIP-39...'), ...}

# Vérifier les conflits de type
conflicts = engine.check_type_conflicts({'S50': 'YES'}, 'SW Desktop')
# → Conflit car S50 (Secure Element) ne s'applique pas au software

=============================================================================
"""

from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass


# =============================================================================
# NORM EQUIVALENCES - One certification can validate another
# =============================================================================
# These define when a norm is considered VALID by equivalence
# e.g., CC EAL5+ validates FIPS 140-3 Level 3 at 95% equivalence

@dataclass
class NormEquivalence:
    """Represents an equivalence rule between norms."""
    source_norm: str           # The norm that provides equivalence (e.g., 'S51' CC EAL5+)
    source_value: str          # Required value (e.g., 'CC EAL5+', 'CC EAL6+')
    target_norm: str           # The norm that gets validated (e.g., 'S52' FIPS 140-3)
    target_value: str          # What it's equivalent to (e.g., 'FIPS 140-3 Level 3')
    equivalence_factor: float  # 0.0-1.0 (0.95 = 95% equivalent)
    equivalence_type: str      # 'certification', 'protocol', 'implication'
    remark_template: str       # English explanation template
    applicable_types: List[str] = None  # Product types where this applies (None = all)


NORM_EQUIVALENCES: List[NormEquivalence] = [
    # =========================================================================
    # SECURITY CERTIFICATIONS
    # =========================================================================

    # CC EAL5+ → FIPS 140-3 Level 3 (95% equivalent)
    NormEquivalence(
        source_norm='S51',
        source_value='CC EAL5+',
        target_norm='S52',
        target_value='FIPS 140-3 Level 3',
        equivalence_factor=0.95,
        equivalence_type='certification',
        remark_template='Valid by equivalence: CC EAL5+ certification provides equivalent or superior physical and logical attack resistance compared to FIPS 140-3 Level 3 requirements. The product uses a secure element certified CC EAL5+, offering protection that meets or exceeds FIPS 140-3 Level 3.',
    ),

    # CC EAL6+ → FIPS 140-3 Level 3 (97% equivalent)
    NormEquivalence(
        source_norm='S51',
        source_value='CC EAL6+',
        target_norm='S52',
        target_value='FIPS 140-3 Level 3',
        equivalence_factor=0.97,
        equivalence_type='certification',
        remark_template='Valid by equivalence: CC EAL6+ certification exceeds FIPS 140-3 Level 3 requirements with semi-formally verified design and structured presentation.',
    ),

    # CC EAL5+ → Secure Element (100% - proves SE exists)
    NormEquivalence(
        source_norm='S51',
        source_value='CC EAL5+',
        target_norm='S50',
        target_value='Secure Element',
        equivalence_factor=1.0,
        equivalence_type='implication',
        remark_template='Valid by implication: CC EAL5+ certification confirms the presence and proper implementation of a certified Secure Element.',
    ),

    # CC EAL6+ → Secure Element (100%)
    NormEquivalence(
        source_norm='S51',
        source_value='CC EAL6+',
        target_norm='S50',
        target_value='Secure Element',
        equivalence_factor=1.0,
        equivalence_type='implication',
        remark_template='Valid by implication: CC EAL6+ certification confirms a bank-grade Secure Element implementation.',
    ),

    # FIPS 140-3 Level 3 → Secure Element (100%)
    NormEquivalence(
        source_norm='S52',
        source_value='FIPS 140-3 Level 3',
        target_norm='S50',
        target_value='Secure Element',
        equivalence_factor=1.0,
        equivalence_type='implication',
        remark_template='Valid by implication: FIPS 140-3 Level 3 certification confirms secure cryptographic module with physical tamper resistance.',
    ),

    # FIPS 140-3 Level 4 → FIPS 140-3 Level 3 (100%)
    NormEquivalence(
        source_norm='S52',
        source_value='FIPS 140-3 Level 4',
        target_norm='S52',
        target_value='FIPS 140-3 Level 3',
        equivalence_factor=1.0,
        equivalence_type='certification',
        remark_template='Valid by equivalence: FIPS 140-3 Level 4 exceeds all Level 3 requirements with additional environmental protection and complete envelope protection.',
    ),

    # ANSSI Qualification → CC EAL4+ (90%)
    NormEquivalence(
        source_norm='S53',
        source_value='ANSSI Qualification',
        target_norm='S51',
        target_value='CC EAL4+',
        equivalence_factor=0.90,
        equivalence_type='certification',
        remark_template='Valid by equivalence: ANSSI Qualification provides French government-grade security assessment following Common Criteria methodology.',
    ),

    # =========================================================================
    # CRYPTOGRAPHIC STANDARDS
    # =========================================================================

    # AES-256-GCM → AES-256 (100%)
    NormEquivalence(
        source_norm='S03',
        source_value='AES-256-GCM',
        target_norm='S01',
        target_value='AES-256',
        equivalence_factor=1.0,
        equivalence_type='implication',
        remark_template='Valid by implication: AES-256-GCM authenticated encryption mode includes AES-256 encryption.',
    ),

    # ChaCha20-Poly1305 → AES-256 (95%)
    NormEquivalence(
        source_norm='S04',
        source_value='ChaCha20-Poly1305',
        target_norm='S01',
        target_value='AES-256',
        equivalence_factor=0.95,
        equivalence_type='certification',
        remark_template='Valid by equivalence: ChaCha20-Poly1305 provides equivalent 256-bit security level to AES-256 and is preferred in mobile and TLS 1.3 contexts.',
    ),

    # =========================================================================
    # BIP STANDARDS (HD WALLETS)
    # =========================================================================

    # BIP-39 → BIP-32 (100%)
    NormEquivalence(
        source_norm='S16',
        source_value='BIP-39',
        target_norm='S17',
        target_value='BIP-32',
        equivalence_factor=1.0,
        equivalence_type='implication',
        remark_template='Valid by implication: BIP-39 mnemonic implementation requires and implies BIP-32 hierarchical deterministic key derivation.',
    ),

    # BIP-39 → BIP-44 (100%)
    NormEquivalence(
        source_norm='S16',
        source_value='BIP-39',
        target_norm='S18',
        target_value='BIP-44',
        equivalence_factor=1.0,
        equivalence_type='implication',
        remark_template='Valid by implication: Modern BIP-39 implementations follow BIP-44 multi-account derivation paths.',
    ),

    # BIP-84 → BIP-32 (100%)
    NormEquivalence(
        source_norm='S20',
        source_value='BIP-84',
        target_norm='S17',
        target_value='BIP-32',
        equivalence_factor=1.0,
        equivalence_type='implication',
        remark_template='Valid by implication: BIP-84 native SegWit requires and implies BIP-32 HD wallet structure.',
    ),

    # =========================================================================
    # PROTOCOL-BASED EQUIVALENCES
    # =========================================================================

    # Ethereum → secp256k1 (100%)
    NormEquivalence(
        source_norm='E01',
        source_value='Ethereum',
        target_norm='S31',
        target_value='secp256k1',
        equivalence_factor=1.0,
        equivalence_type='protocol',
        remark_template='Valid by protocol: Ethereum mandates secp256k1 elliptic curve for all cryptographic operations including address generation and transaction signing.',
    ),

    # Ethereum → Keccak-256 (100%)
    NormEquivalence(
        source_norm='E01',
        source_value='Ethereum',
        target_norm='S21',
        target_value='Keccak-256',
        equivalence_factor=1.0,
        equivalence_type='protocol',
        remark_template='Valid by protocol: Ethereum uses Keccak-256 for address derivation and transaction hashing.',
    ),

    # Bitcoin → secp256k1 (100%)
    NormEquivalence(
        source_norm='E10',
        source_value='Bitcoin',
        target_norm='S31',
        target_value='secp256k1',
        equivalence_factor=1.0,
        equivalence_type='protocol',
        remark_template='Valid by protocol: Bitcoin mandates secp256k1 elliptic curve for key generation and transaction signing.',
    ),

    # Bitcoin → SHA-256 (100%)
    NormEquivalence(
        source_norm='E10',
        source_value='Bitcoin',
        target_norm='S22',
        target_value='SHA-256',
        equivalence_factor=1.0,
        equivalence_type='protocol',
        remark_template='Valid by protocol: Bitcoin uses SHA-256d (double SHA-256) for block hashing, transaction IDs, and Proof of Work.',
    ),

    # Solana → Ed25519 (100%)
    NormEquivalence(
        source_norm='E20',
        source_value='Solana',
        target_norm='S35',
        target_value='Ed25519',
        equivalence_factor=1.0,
        equivalence_type='protocol',
        remark_template='Valid by protocol: Solana uses Ed25519 for all account signatures and transaction authorization.',
    ),

    # =========================================================================
    # AUDIT EQUIVALENCES
    # =========================================================================

    # Multiple audits → Recent audit (100%)
    NormEquivalence(
        source_norm='S262',
        source_value='Multiple audits',
        target_norm='S261',
        target_value='Recent audit',
        equivalence_factor=1.0,
        equivalence_type='implication',
        remark_template='Valid by implication: Multiple security audits confirm ongoing audit practice and recent audit history.',
    ),

    # Trail of Bits → Security audit (100%)
    NormEquivalence(
        source_norm='S263',
        source_value='Trail of Bits',
        target_norm='S261',
        target_value='Security audit',
        equivalence_factor=1.0,
        equivalence_type='certification',
        remark_template='Valid by equivalence: Trail of Bits is a recognized top-tier security auditor whose audits meet or exceed industry standards.',
    ),

    # OpenZeppelin → Smart contract audit (100%)
    NormEquivalence(
        source_norm='S264',
        source_value='OpenZeppelin',
        target_norm='S221',
        target_value='Smart contract audit',
        equivalence_factor=1.0,
        equivalence_type='certification',
        remark_template='Valid by equivalence: OpenZeppelin is an industry-leading smart contract security auditor.',
    ),

    # =========================================================================
    # HARDWARE SECURITY
    # =========================================================================

    # HSM → Hardware crypto module (100%)
    NormEquivalence(
        source_norm='S101',
        source_value='HSM',
        target_norm='S100',
        target_value='Hardware crypto module',
        equivalence_factor=1.0,
        equivalence_type='implication',
        remark_template='Valid by implication: Hardware Security Module (HSM) usage confirms hardware cryptographic module implementation.',
    ),

    # TEE attestation → TEE (100%)
    NormEquivalence(
        source_norm='S105',
        source_value='TEE attestation',
        target_norm='S104',
        target_value='TEE',
        equivalence_factor=1.0,
        equivalence_type='implication',
        remark_template='Valid by implication: TEE attestation capability confirms the presence and proper implementation of a Trusted Execution Environment.',
    ),
]

# Build lookup dictionaries for fast access
EQUIVALENCE_BY_SOURCE = {}
EQUIVALENCE_BY_TARGET = {}

for equiv in NORM_EQUIVALENCES:
    # Index by source norm
    if equiv.source_norm not in EQUIVALENCE_BY_SOURCE:
        EQUIVALENCE_BY_SOURCE[equiv.source_norm] = []
    EQUIVALENCE_BY_SOURCE[equiv.source_norm].append(equiv)

    # Index by target norm
    if equiv.target_norm not in EQUIVALENCE_BY_TARGET:
        EQUIVALENCE_BY_TARGET[equiv.target_norm] = []
    EQUIVALENCE_BY_TARGET[equiv.target_norm].append(equiv)


# =============================================================================
# NORM IMPLICATIONS - If norm_a = YES, then norm_b should also be YES
# =============================================================================

NORM_IMPLICATIONS = {
    # =========================================================================
    # BIP STANDARDS CHAIN - HD Wallet standards
    # =========================================================================
    # BIP-39 (mnemonic) implies support for derived standards
    'S16': ['S17'],           # BIP-39 -> BIP-32 (HD wallets)
    'S17': ['S18', 'S19'],    # BIP-32 -> BIP-44, BIP-49
    'S18': ['S17'],           # BIP-44 requires BIP-32
    'S19': ['S17'],           # BIP-49 requires BIP-32

    # =========================================================================
    # EVM CHAIN - Ethereum Virtual Machine implies certain standards
    # =========================================================================
    # Ethereum support implies EVM cryptographic standards
    'E01': ['S31', 'S21'],    # Ethereum -> secp256k1, Keccak-256
    'E02': ['S31', 'S21'],    # ERC-20 support -> secp256k1, Keccak-256
    'E03': ['S31', 'S21'],    # ERC-721 support -> secp256k1, Keccak-256

    # =========================================================================
    # HARDWARE SECURITY CHAIN
    # =========================================================================
    # Secure Element implies related security features
    'S50': ['S51', 'S52'],    # Secure Element -> SE certifications, SE key storage
    'S51': ['S50'],           # SE certification implies SE presence
    'S52': ['S50'],           # SE key storage implies SE presence

    # HSM implies enterprise-grade security
    'S101': ['S102', 'S103'], # HSM -> HSM certifications
    'S102': ['S101'],         # HSM cert implies HSM

    # TEE implies trusted execution
    'S104': ['S105'],         # TEE -> TEE attestation
    'S105': ['S104'],

    # =========================================================================
    # FIRMWARE SECURITY CHAIN
    # =========================================================================
    'S73': ['S191'],          # Signed firmware updates -> secure boot related
    'S74': ['S73'],           # Anti-rollback implies signed updates

    # =========================================================================
    # CRYPTOGRAPHIC CHAINS
    # =========================================================================
    # AES family
    'S01': ['S02'],           # AES-256 implies AES support
    'S03': ['S01'],           # AES-GCM implies AES-256

    # ECDSA family
    'S11': ['S12'],           # ECDSA implies signature support
    'S31': ['S11'],           # secp256k1 implies ECDSA

    # Ed25519 (Solana, etc.)
    'S35': ['S36'],           # Ed25519 implies EdDSA

    # =========================================================================
    # AUTHENTICATION CHAIN
    # =========================================================================
    'S91': ['S92'],           # 2FA implies authentication system
    'S93': ['S91'],           # Hardware key 2FA implies 2FA support

    # =========================================================================
    # AUDIT CHAIN
    # =========================================================================
    'S261': ['F91'],          # Recent audit implies audit history
    'S262': ['S261'],         # Multiple audits implies recent audit

    # =========================================================================
    # ANTI-COERCION CHAIN
    # =========================================================================
    'A01': ['A02'],           # Duress PIN implies duress feature support
    'A06': ['A01'],           # Hidden wallet implies duress features

    # Self-destruct chain
    'A91': ['A92'],           # Auto-wipe implies wipe capability
    'A93': ['A91'],           # Remote wipe implies auto-wipe

    # =========================================================================
    # BACKUP/RECOVERY CHAIN
    # =========================================================================
    'A51': ['A52'],           # Social recovery implies recovery system
    'A53': ['A51'],           # Shamir recovery implies social recovery
}


# =============================================================================
# NORM CONFLICTS - These norms should NOT both be YES for certain product types
# =============================================================================

NORM_CONFLICTS = {
    # Hardware-only norms conflict with software-only products
    'hardware_vs_software': {
        'hardware_norms': ['S50', 'S51', 'S52', 'S73', 'S74', 'F01', 'F02', 'F03'],
        'software_types': ['SW Desktop', 'SW Mobile', 'SW Browser', 'SW Web', 'DEX', 'Lending', 'Bridge']
    },

    # DeFi-only norms conflict with non-DeFi products
    'defi_vs_wallet': {
        'defi_norms': ['S221', 'S222', 'S223', 'S224'],  # Smart contract specific
        'non_defi_types': ['HW Cold', 'SW Desktop', 'SW Mobile']  # HW Hot removed
    },
}


# =============================================================================
# PROTOCOL-IMPLIED STANDARDS - YESp based on protocol/technology
# =============================================================================

PROTOCOL_IMPLICATIONS = {
    # EVM-based products (Ethereum, Polygon, BSC, etc.)
    'evm': {
        'triggers': ['E01', 'E02', 'E03', 'E04', 'E05'],  # ETH, ERC-20, ERC-721, etc.
        'implied': {
            'S31': 'secp256k1 (EVM standard)',
            'S21': 'Keccak-256 (EVM standard)',
            'S11': 'ECDSA (EVM standard)',
            'S181': 'TLS 1.2+ (RPC connections)',
        }
    },

    # Bitcoin-based products
    'bitcoin': {
        'triggers': ['E10', 'E11'],  # BTC support
        'implied': {
            'S31': 'secp256k1 (Bitcoin standard)',
            'S21': 'SHA-256 (Bitcoin standard)',
            'S22': 'RIPEMD-160 (Bitcoin addresses)',
        }
    },

    # Solana-based products
    'solana': {
        'triggers': ['E20', 'E21'],  # SOL support
        'implied': {
            'S35': 'Ed25519 (Solana standard)',
            'S36': 'EdDSA (Solana standard)',
        }
    },

    # HD Wallet (seed-based)
    'hd_wallet': {
        'triggers': ['S16'],  # BIP-39 mnemonic
        'implied': {
            'S17': 'BIP-32 (HD derivation)',
            'S18': 'BIP-44 (multi-account)',
        }
    },
}


# =============================================================================
# PRODUCT-TYPE PRE-SEEDED EVALUATIONS - Known facts by product category
# =============================================================================
# These are norms that are KNOWN to be YES for certain product types based on
# the fundamental requirements of that product category. This helps bootstrap
# evaluations with ground truth before AI evaluation.

PRODUCT_TYPE_PRESEEDS = {
    # =========================================================================
    # HARDWARE WALLETS (Cold Storage)
    # =========================================================================
    'Hardware Wallet Cold': {
        # BIP Standards - all HD wallets use these
        'S16': ('YES', 'BIP-32 HD derivation standard for hardware wallets'),
        'S17': ('YES', 'BIP-39 mnemonic standard for recovery phrase'),
        'S18': ('YES', 'BIP-44 multi-account structure standard'),
        'S19': ('YESp', 'BIP-49 SegWit typical for modern wallets'),
        'S20': ('YESp', 'BIP-84 Native SegWit typical for modern wallets'),
        'S23': ('YESp', 'BIP-141 SegWit support standard'),
        'S24': ('YESp', 'BIP-174 PSBT support typical'),

        # Core Cryptography - fundamental requirements
        'S01': ('YES', 'AES-256 encryption for data protection'),
        'S03': ('YES', 'ECDSA secp256k1 required for Bitcoin/Ethereum'),
        'S05': ('YES', 'SHA-256 hashing fundamental'),
        'S08': ('YESp', 'HMAC-SHA256 typical for key derivation'),
        'S14': ('YESp', 'Schnorr signatures for Taproot support'),

        # Firmware Security
        'S201': ('YESp', 'Firmware verification typical for reputable HW wallets'),

        # Tamper Protection
        'S194': ('YESp', 'Tamper detection common in hardware wallets'),
        'S195': ('YESp', 'Tamper response typical in secure devices'),

        # Network Security
        'S166': ('YESp', 'TLS 1.3 for companion app connections'),

        # Key Management
        'S187': ('YESp', 'Key rotation capability expected'),
        'S190': ('YES', 'Key derivation path support standard'),

        # Anti-coercion
        'A01': ('YESp', 'Duress PIN typical feature'),
        'A03': ('YESp', 'Multiple duress PIN options common'),
        'A103': ('YES', 'Seed phrase checksum standard (BIP-39)'),

        # Recovery
        'A143': ('YESp', 'Shamir backup support increasingly common'),

        # Hardware Durability
        'F144': ('YES', 'Backup & recovery core functionality'),

        # Offline Security
        'E182': ('YES', 'Offline transaction signing is defining feature'),
        'E184': ('YES', 'Offline address generation core feature'),
        'E186': ('YES', 'Seed import capability standard'),
    },

    # =========================================================================
    # HARDWARE WALLETS (Hot)
    # =========================================================================
    'Hardware Wallet Hot': {
        # BIP Standards
        'S16': ('YES', 'BIP-32 HD derivation'),
        'S17': ('YES', 'BIP-39 mnemonic standard'),
        'S18': ('YES', 'BIP-44 multi-account'),
        'S03': ('YES', 'ECDSA secp256k1 for Bitcoin/Ethereum'),
        'S05': ('YES', 'SHA-256 hashing'),
        'A103': ('YES', 'Seed phrase checksum standard'),
        'F144': ('YES', 'Backup & recovery core'),
        'E186': ('YES', 'Seed import capability'),
    },

    # =========================================================================
    # SOFTWARE WALLETS
    # =========================================================================
    'SW Desktop': {
        # HD Wallet Standards
        'S16': ('YES', 'BIP-32 HD derivation'),
        'S17': ('YES', 'BIP-39 mnemonic for backup'),
        'S18': ('YESp', 'BIP-44 multi-account'),

        # Cryptography
        'S03': ('YES', 'ECDSA secp256k1 for signing'),
        'S05': ('YES', 'SHA-256 hashing'),
        'S01': ('YESp', 'AES encryption for local storage'),

        # Network Security
        'S166': ('YESp', 'TLS 1.3 for network'),

        # Recovery
        'A103': ('YES', 'Seed phrase checksum'),
        'F144': ('YES', 'Backup & recovery'),
        'E186': ('YES', 'Seed import capability'),
    },

    'SW Mobile': {
        # Same as desktop plus mobile-specific
        'S16': ('YES', 'BIP-32 HD derivation'),
        'S17': ('YES', 'BIP-39 mnemonic'),
        'S18': ('YESp', 'BIP-44 multi-account'),
        'S03': ('YES', 'ECDSA secp256k1'),
        'S05': ('YES', 'SHA-256 hashing'),
        'S166': ('YESp', 'TLS 1.3 for network'),
        'A103': ('YES', 'Seed phrase checksum'),
        'F144': ('YES', 'Backup & recovery'),
        'E186': ('YES', 'Seed import'),
    },

    'SW Browser': {
        # Browser extension wallets
        'S16': ('YES', 'BIP-32 HD derivation'),
        'S17': ('YES', 'BIP-39 mnemonic'),
        'S18': ('YESp', 'BIP-44 multi-account'),
        'S03': ('YES', 'ECDSA secp256k1'),
        'S05': ('YES', 'SHA-256 hashing'),
        'S166': ('YESp', 'TLS 1.3 for network'),
        'A103': ('YES', 'Seed phrase checksum'),
        'F144': ('YES', 'Backup & recovery'),
        'E186': ('YES', 'Seed import'),
    },

    # =========================================================================
    # EXCHANGES
    # =========================================================================
    'CEX': {
        # Centralized exchange security
        'S166': ('YES', 'TLS 1.3 for all connections'),
        'S03': ('YES', 'ECDSA secp256k1 for withdrawals'),
    },

    # =========================================================================
    # DEFI PROTOCOLS
    # =========================================================================
    'DEX': {
        # Smart contract based
        'S03': ('YES', 'ECDSA secp256k1 for Ethereum'),
        'S06': ('YESp', 'SHA-3 Keccak for EVM'),
    },

    'Lending': {
        'S03': ('YES', 'ECDSA secp256k1 for Ethereum'),
        'S06': ('YESp', 'SHA-3 Keccak for EVM'),
    },
}

# Aliases for common type variations
PRODUCT_TYPE_ALIASES = {
    'HW Cold': 'Hardware Wallet Cold',
    # NOTE: 'HW Hot' removed - not standard (hardware wallets are cold by definition)
    'Hardware Wallet': 'Hardware Wallet Cold',  # Default to cold
    'Software Wallet Desktop': 'SW Desktop',
    'Software Wallet Mobile': 'SW Mobile',
    'Software Wallet Browser': 'SW Browser',
}


# =============================================================================
# NORM DEPENDENCY ENGINE
# =============================================================================

class NormDependencyEngine:
    """
    Engine for managing norm interdependencies.
    Detects inconsistencies and infers implicit evaluations.
    """

    def __init__(self):
        self.implications = NORM_IMPLICATIONS
        self.conflicts = NORM_CONFLICTS
        self.protocol_implications = PROTOCOL_IMPLICATIONS
        self.preseeds = PRODUCT_TYPE_PRESEEDS
        self.type_aliases = PRODUCT_TYPE_ALIASES

    def get_preseeded_evaluations(self, product_types: List[str]) -> Dict[str, tuple]:
        """
        Get pre-seeded evaluations based on product type(s).

        These are norms that are KNOWN to be YES/YESp for certain product types
        based on the fundamental requirements of that product category.

        Args:
            product_types: List of product type names (e.g., ['Hardware Wallet Cold'])

        Returns:
            Dict of {norm_code: (result, justification)}
        """
        preseeded = {}

        for product_type in product_types:
            # Resolve aliases
            resolved_type = self.type_aliases.get(product_type, product_type)

            # Get preseeds for this type
            type_preseeds = self.preseeds.get(resolved_type, {})

            for norm_code, (result, justification) in type_preseeds.items():
                # Don't override existing preseeds (first type wins)
                if norm_code not in preseeded:
                    preseeded[norm_code] = (result, f"[Pre-seeded] {justification}")

        return preseeded

    def infer_evaluations(self, evaluations: Dict[str, str]) -> Dict[str, str]:
        """
        Infer additional YES/YESp results from existing evaluations.

        Args:
            evaluations: Dict of {norm_code: result} where result is YES/YESp/NO/TBD/N/A

        Returns:
            Dict of inferred evaluations {norm_code: 'YESp'}
        """
        inferred = {}

        # Check implications
        for norm_code, result in evaluations.items():
            if result.upper() not in ['YES', 'YESP']:
                continue

            # Check if this norm implies others
            implied_norms = self.implications.get(norm_code, [])
            for implied_norm in implied_norms:
                # Only infer if not already evaluated
                if implied_norm not in evaluations and implied_norm not in inferred:
                    inferred[implied_norm] = 'YESp'

        # Check protocol implications
        for protocol, config in self.protocol_implications.items():
            # Check if any trigger norm is YES
            has_trigger = any(
                evaluations.get(trigger, '').upper() in ['YES', 'YESP']
                for trigger in config['triggers']
            )

            if has_trigger:
                for implied_norm, reason in config['implied'].items():
                    if implied_norm not in evaluations and implied_norm not in inferred:
                        inferred[implied_norm] = 'YESp'

        return inferred

    def detect_inconsistencies(self, evaluations: Dict[str, str]) -> List[Dict]:
        """
        Detect contradictory evaluation results.

        Args:
            evaluations: Dict of {norm_code: result}

        Returns:
            List of inconsistency dicts with details
        """
        inconsistencies = []

        # Check implication violations
        for norm_code, result in evaluations.items():
            if result.upper() not in ['YES', 'YESP']:
                continue

            implied_norms = self.implications.get(norm_code, [])
            for implied_norm in implied_norms:
                implied_result = evaluations.get(implied_norm, '').upper()

                # If parent is YES but child is NO, that's inconsistent
                if implied_result == 'NO':
                    inconsistencies.append({
                        'type': 'implication_violation',
                        'norm_a': norm_code,
                        'norm_b': implied_norm,
                        'result_a': result,
                        'result_b': implied_result,
                        'message': f"{norm_code}={result} implies {implied_norm} should be YES, but it's NO"
                    })

        # Check reverse implications (if child is NO but parent is YES)
        for child_norm, parent_norms in self._get_reverse_implications().items():
            child_result = evaluations.get(child_norm, '').upper()
            if child_result != 'NO':
                continue

            for parent_norm in parent_norms:
                parent_result = evaluations.get(parent_norm, '').upper()
                if parent_result in ['YES', 'YESP']:
                    # Already captured above, skip
                    pass

        return inconsistencies

    def _get_reverse_implications(self) -> Dict[str, List[str]]:
        """Get reverse mapping: which norms imply a given norm."""
        reverse = {}
        for parent, children in self.implications.items():
            for child in children:
                if child not in reverse:
                    reverse[child] = []
                reverse[child].append(parent)
        return reverse

    def validate_for_product_type(self, evaluations: Dict[str, str], product_type: str) -> List[Dict]:
        """
        Validate evaluations are consistent with product type.

        Args:
            evaluations: Dict of {norm_code: result}
            product_type: Product type code (e.g., 'HW Cold', 'DEX')

        Returns:
            List of validation warnings
        """
        warnings = []

        # Check hardware vs software conflicts
        hw_vs_sw = self.conflicts['hardware_vs_software']
        if product_type in hw_vs_sw['software_types']:
            for hw_norm in hw_vs_sw['hardware_norms']:
                if evaluations.get(hw_norm, '').upper() in ['YES', 'YESP']:
                    warnings.append({
                        'type': 'type_conflict',
                        'norm': hw_norm,
                        'product_type': product_type,
                        'message': f"Hardware norm {hw_norm}=YES for software product {product_type}"
                    })

        # Check DeFi vs wallet conflicts
        defi_vs_wallet = self.conflicts['defi_vs_wallet']
        if product_type in defi_vs_wallet['non_defi_types']:
            for defi_norm in defi_vs_wallet['defi_norms']:
                if evaluations.get(defi_norm, '').upper() in ['YES', 'YESP']:
                    warnings.append({
                        'type': 'type_conflict',
                        'norm': defi_norm,
                        'product_type': product_type,
                        'message': f"DeFi norm {defi_norm}=YES for non-DeFi product {product_type}"
                    })

        return warnings

    def get_all_implied_norms(self, norm_code: str, visited: set = None) -> List[str]:
        """
        Get all norms transitively implied by a given norm.

        Args:
            norm_code: Starting norm
            visited: Set of already visited norms (for recursion)

        Returns:
            List of all transitively implied norm codes
        """
        if visited is None:
            visited = set()

        if norm_code in visited:
            return []

        visited.add(norm_code)
        result = []

        direct_implications = self.implications.get(norm_code, [])
        for implied in direct_implications:
            if implied not in visited:
                result.append(implied)
                result.extend(self.get_all_implied_norms(implied, visited))

        return result

    def explain_inference(self, original: Dict[str, str], inferred: Dict[str, str]) -> str:
        """
        Generate human-readable explanation of inferences.

        Args:
            original: Original evaluations
            inferred: Inferred evaluations from infer_evaluations()

        Returns:
            Formatted explanation string
        """
        if not inferred:
            return "No additional evaluations inferred from dependencies."

        lines = ["INFERRED EVALUATIONS (from norm dependencies):"]

        for norm, result in inferred.items():
            # Find what triggered this inference
            triggers = []
            for parent, children in self.implications.items():
                if norm in children and original.get(parent, '').upper() in ['YES', 'YESP']:
                    triggers.append(f"{parent}={original[parent]}")

            for protocol, config in self.protocol_implications.items():
                if norm in config['implied']:
                    for trigger in config['triggers']:
                        if original.get(trigger, '').upper() in ['YES', 'YESP']:
                            triggers.append(f"{trigger}={original[trigger]} ({protocol})")

            reason = ' + '.join(triggers) if triggers else 'dependency chain'
            lines.append(f"  {norm} -> YESp (implied by {reason})")

        return '\n'.join(lines)

    # =========================================================================
    # EQUIVALENCE METHODS
    # =========================================================================

    def apply_equivalences(
        self,
        evaluations: Dict[str, str],
        product_type: str = None
    ) -> Dict[str, Dict]:
        """
        Apply norm equivalences to evaluations.

        Returns evaluations that can be marked YES by equivalence (YESe).

        Args:
            evaluations: Dict of {norm_code: result}
            product_type: Optional product type for filtering

        Returns:
            Dict of {norm_code: {
                'original_result': str,
                'equivalent_result': 'YESe',
                'equivalence_remark': str,
                'source_norm': str,
                'equivalence_factor': float,
                'equivalence_type': str
            }}
        """
        equivalences_applied = {}

        # Get all positive evaluations
        positive_norms = {
            code: result for code, result in evaluations.items()
            if result.upper() in ['YES', 'YESP']
        }

        # Check each positive norm for equivalence rules
        for source_code, source_result in positive_norms.items():
            source_equivalences = EQUIVALENCE_BY_SOURCE.get(source_code, [])

            for equiv in source_equivalences:
                # Check if product type filter applies
                if equiv.applicable_types and product_type:
                    if product_type not in equiv.applicable_types:
                        continue

                target_code = equiv.target_norm
                current_target = evaluations.get(target_code, '').upper()

                # Only apply equivalence if target is NO, TBD, N/A, or missing
                if current_target not in ['YES', 'YESP', 'YESE']:
                    # Check if we already have a better equivalence
                    if target_code in equivalences_applied:
                        existing_factor = equivalences_applied[target_code]['equivalence_factor']
                        if equiv.equivalence_factor <= existing_factor:
                            continue  # Keep existing better equivalence

                    equivalences_applied[target_code] = {
                        'original_result': current_target or 'NO',
                        'equivalent_result': 'YESe',
                        'equivalence_remark': equiv.remark_template,
                        'source_norm': source_code,
                        'source_value': equiv.source_value,
                        'target_value': equiv.target_value,
                        'equivalence_factor': equiv.equivalence_factor,
                        'equivalence_type': equiv.equivalence_type,
                    }

        return equivalences_applied

    def get_equivalence_remark(
        self,
        source_norm: str,
        target_norm: str
    ) -> Optional[str]:
        """
        Get the equivalence remark for a specific source→target relationship.

        Args:
            source_norm: The norm providing equivalence (e.g., 'S51')
            target_norm: The norm being validated (e.g., 'S52')

        Returns:
            English remark template, or None if no equivalence exists
        """
        source_equivalences = EQUIVALENCE_BY_SOURCE.get(source_norm, [])

        for equiv in source_equivalences:
            if equiv.target_norm == target_norm:
                return equiv.remark_template

        return None

    def get_equivalences_for_norm(self, norm_code: str) -> List[Dict]:
        """
        Get all equivalences that could validate a given norm.

        Args:
            norm_code: The target norm code

        Returns:
            List of equivalence dicts with source norm details
        """
        target_equivalences = EQUIVALENCE_BY_TARGET.get(norm_code, [])

        return [
            {
                'source_norm': equiv.source_norm,
                'source_value': equiv.source_value,
                'equivalence_factor': equiv.equivalence_factor,
                'equivalence_type': equiv.equivalence_type,
                'remark': equiv.remark_template,
            }
            for equiv in target_equivalences
        ]

    def calculate_scores_with_equivalences(
        self,
        evaluations: Dict[str, str],
        product_type: str = None
    ) -> Dict[str, any]:
        """
        Calculate both raw scores and scores with equivalences.

        Args:
            evaluations: Dict of {norm_code: result}
            product_type: Optional product type

        Returns:
            Dict with 'raw_score', 'equiv_score', 'equivalences_applied', 'boost'
        """
        # Calculate raw score
        raw_yes = sum(1 for r in evaluations.values() if r.upper() in ['YES', 'YESP'])
        raw_no = sum(1 for r in evaluations.values() if r.upper() == 'NO')
        raw_total = raw_yes + raw_no

        raw_score = (raw_yes / raw_total * 100) if raw_total > 0 else 0

        # Apply equivalences
        equivalences = self.apply_equivalences(evaluations, product_type)

        # Calculate score with equivalences
        equiv_yes = raw_yes
        equiv_weighted = raw_yes  # Full weight for original YES

        for target_code, equiv_data in equivalences.items():
            # Add equivalent YES with its factor
            equiv_yes += 1
            equiv_weighted += equiv_data['equivalence_factor']

        equiv_total = raw_total + len(equivalences)
        equiv_score = (equiv_weighted / equiv_total * 100) if equiv_total > 0 else 0

        return {
            'raw_score': round(raw_score, 2),
            'equiv_score': round(equiv_score, 2),
            'equivalences_applied': len(equivalences),
            'boost': round(equiv_score - raw_score, 2),
            'equivalence_details': equivalences,
        }

    def explain_equivalences(self, equivalences: Dict[str, Dict]) -> str:
        """
        Generate human-readable explanation of applied equivalences.

        Args:
            equivalences: Output from apply_equivalences()

        Returns:
            Formatted explanation string
        """
        if not equivalences:
            return "No equivalences applied."

        lines = ["EQUIVALENCES APPLIED:"]
        lines.append("=" * 60)

        for target_norm, data in equivalences.items():
            lines.append(f"\n{target_norm}: {data['original_result']} → YESe ({data['equivalence_factor']*100:.0f}%)")
            lines.append(f"  Source: {data['source_norm']} ({data['source_value']})")
            lines.append(f"  Type: {data['equivalence_type']}")
            lines.append(f"  Remark: {data['equivalence_remark']}")

        return '\n'.join(lines)


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def infer_from_evaluations(evaluations: Dict[str, str]) -> Dict[str, str]:
    """
    Quick inference of additional evaluations.

    Args:
        evaluations: Dict of {norm_code: result}

    Returns:
        Dict of inferred {norm_code: 'YESp'}
    """
    engine = NormDependencyEngine()
    return engine.infer_evaluations(evaluations)


def check_consistency(evaluations: Dict[str, str], product_type: str = None) -> List[Dict]:
    """
    Check evaluation consistency.

    Args:
        evaluations: Dict of {norm_code: result}
        product_type: Optional product type for type-specific validation

    Returns:
        List of inconsistencies/warnings
    """
    engine = NormDependencyEngine()
    issues = engine.detect_inconsistencies(evaluations)

    if product_type:
        issues.extend(engine.validate_for_product_type(evaluations, product_type))

    return issues


# Global instance
norm_dependency_engine = NormDependencyEngine()
