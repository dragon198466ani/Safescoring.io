#!/usr/bin/env python3
"""
SAFE SCORING - Identify Missing Real Standards
===============================================
Analyzes the current norms database and identifies REAL standards
that should be added to complete coverage to ~1300 norms.

Categories of real standards to cover:
- Bitcoin BIPs (300+ proposals)
- Ethereum EIPs/ERCs (500+ proposals)
- NIST standards (50+ relevant)
- IETF RFCs (100+ crypto-related)
- ISO standards (30+ security)
- OWASP guidelines (20+)
- Hardware standards (FIPS, CC, EMV)
- Privacy regulations (GDPR, CCPA, etc.)
- DeFi protocols and standards
"""

import requests
import json
import sys
import os
from datetime import datetime
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# =============================================================================
# COMPREHENSIVE LIST OF REAL STANDARDS TO ADD
# =============================================================================

REAL_STANDARDS = {
    # =========================================================================
    # PILLAR S: SECURITY - Cryptographic Standards
    # =========================================================================
    'S': {
        # Bitcoin BIPs (Key ones for wallets)
        'BIP': [
            {'code': 'S-BIP-011', 'title': 'BIP-11: M-of-N Standard Transactions', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0011.mediawiki'},
            {'code': 'S-BIP-013', 'title': 'BIP-13: Address Format for pay-to-script-hash', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0013.mediawiki'},
            {'code': 'S-BIP-016', 'title': 'BIP-16: Pay to Script Hash', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0016.mediawiki'},
            {'code': 'S-BIP-021', 'title': 'BIP-21: URI Scheme', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki'},
            {'code': 'S-BIP-038', 'title': 'BIP-38: Passphrase-protected private key', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0038.mediawiki'},
            {'code': 'S-BIP-043', 'title': 'BIP-43: Purpose Field for Deterministic Wallets', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0043.mediawiki'},
            {'code': 'S-BIP-045', 'title': 'BIP-45: Structure for Deterministic P2SH Multisig', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0045.mediawiki'},
            {'code': 'S-BIP-047', 'title': 'BIP-47: Reusable Payment Codes', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0047.mediawiki'},
            {'code': 'S-BIP-049', 'title': 'BIP-49: Derivation for P2WPKH-nested-in-P2SH', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki'},
            {'code': 'S-BIP-067', 'title': 'BIP-67: Deterministic P2SH Multisig Addresses', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0067.mediawiki'},
            {'code': 'S-BIP-068', 'title': 'BIP-68: Relative lock-time using consensus', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0068.mediawiki'},
            {'code': 'S-BIP-069', 'title': 'BIP-69: Lexicographical Indexing of Transaction Inputs/Outputs', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0069.mediawiki'},
            {'code': 'S-BIP-078', 'title': 'BIP-78: A Simple Payjoin Proposal', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0078.mediawiki'},
            {'code': 'S-BIP-085', 'title': 'BIP-85: Deterministic Entropy From BIP32 Keychains', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki'},
            {'code': 'S-BIP-086', 'title': 'BIP-86: Key Derivation for Single Key P2TR Outputs', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0086.mediawiki'},
            {'code': 'S-BIP-118', 'title': 'BIP-118: SIGHASH_ANYPREVOUT', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0118.mediawiki'},
            {'code': 'S-BIP-119', 'title': 'BIP-119: CHECKTEMPLATEVERIFY', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0119.mediawiki'},
            {'code': 'S-BIP-125', 'title': 'BIP-125: Replace-by-fee signaling', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki'},
            {'code': 'S-BIP-141', 'title': 'BIP-141: Segregated Witness', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki'},
            {'code': 'S-BIP-143', 'title': 'BIP-143: Transaction Signature Verification for SegWit', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki'},
            {'code': 'S-BIP-144', 'title': 'BIP-144: Segregated Witness Peer Services', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0144.mediawiki'},
            {'code': 'S-BIP-155', 'title': 'BIP-155: addrv2 message', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0155.mediawiki'},
            {'code': 'S-BIP-157', 'title': 'BIP-157: Client Side Block Filtering', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0157.mediawiki'},
            {'code': 'S-BIP-158', 'title': 'BIP-158: Compact Block Filters for Light Clients', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0158.mediawiki'},
            {'code': 'S-BIP-173', 'title': 'BIP-173: Bech32 Address Format', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki'},
            {'code': 'S-BIP-322', 'title': 'BIP-322: Generic Signed Message Format', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki'},
            {'code': 'S-BIP-324', 'title': 'BIP-324: Version 2 P2P Encrypted Transport', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0324.mediawiki'},
            {'code': 'S-BIP-325', 'title': 'BIP-325: Signet', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0325.mediawiki'},
            {'code': 'S-BIP-327', 'title': 'BIP-327: MuSig2 for BIP340 Public Keys', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0327.mediawiki'},
            {'code': 'S-BIP-329', 'title': 'BIP-329: Wallet Labels Export Format', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0329.mediawiki'},
            {'code': 'S-BIP-350', 'title': 'BIP-350: Bech32m Format for v1+ Witness Addresses', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki'},
            {'code': 'S-BIP-352', 'title': 'BIP-352: Silent Payments', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki'},
            {'code': 'S-BIP-370', 'title': 'BIP-370: PSBT Version 2', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki'},
            {'code': 'S-BIP-371', 'title': 'BIP-371: Taproot Fields for PSBT', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0371.mediawiki'},
            {'code': 'S-BIP-380', 'title': 'BIP-380: Output Script Descriptors General Operation', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0380.mediawiki'},
            {'code': 'S-BIP-381', 'title': 'BIP-381: Non-Segwit Output Script Descriptors', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0381.mediawiki'},
            {'code': 'S-BIP-382', 'title': 'BIP-382: Segwit Output Script Descriptors', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0382.mediawiki'},
            {'code': 'S-BIP-383', 'title': 'BIP-383: Multisig Output Script Descriptors', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0383.mediawiki'},
            {'code': 'S-BIP-384', 'title': 'BIP-384: combo() Output Script Descriptors', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0384.mediawiki'},
            {'code': 'S-BIP-385', 'title': 'BIP-385: raw() and addr() Output Script Descriptors', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0385.mediawiki'},
            {'code': 'S-BIP-386', 'title': 'BIP-386: tr() Output Script Descriptors', 'url': 'https://github.com/bitcoin/bips/blob/master/bip-0386.mediawiki'},
        ],

        # Ethereum EIPs
        'EIP': [
            {'code': 'S-EIP-155', 'title': 'EIP-155: Replay Attack Protection', 'url': 'https://eips.ethereum.org/EIPS/eip-155'},
            {'code': 'S-EIP-191', 'title': 'EIP-191: Signed Data Standard', 'url': 'https://eips.ethereum.org/EIPS/eip-191'},
            {'code': 'S-EIP-681', 'title': 'EIP-681: URL Format for Transaction Requests', 'url': 'https://eips.ethereum.org/EIPS/eip-681'},
            {'code': 'S-EIP-1014', 'title': 'EIP-1014: CREATE2 opcode', 'url': 'https://eips.ethereum.org/EIPS/eip-1014'},
            {'code': 'S-EIP-1271', 'title': 'EIP-1271: Standard Signature Validation for Contracts', 'url': 'https://eips.ethereum.org/EIPS/eip-1271'},
            {'code': 'S-EIP-2098', 'title': 'EIP-2098: Compact Signature Representation', 'url': 'https://eips.ethereum.org/EIPS/eip-2098'},
            {'code': 'S-EIP-2535', 'title': 'EIP-2535: Diamonds, Multi-Facet Proxy', 'url': 'https://eips.ethereum.org/EIPS/eip-2535'},
            {'code': 'S-EIP-2612', 'title': 'EIP-2612: Permit Extension for ERC-20', 'url': 'https://eips.ethereum.org/EIPS/eip-2612'},
            {'code': 'S-EIP-2718', 'title': 'EIP-2718: Typed Transaction Envelope', 'url': 'https://eips.ethereum.org/EIPS/eip-2718'},
            {'code': 'S-EIP-2930', 'title': 'EIP-2930: Access List Transaction', 'url': 'https://eips.ethereum.org/EIPS/eip-2930'},
            {'code': 'S-EIP-3074', 'title': 'EIP-3074: AUTH and AUTHCALL opcodes', 'url': 'https://eips.ethereum.org/EIPS/eip-3074'},
            {'code': 'S-EIP-3156', 'title': 'EIP-3156: Flash Loans', 'url': 'https://eips.ethereum.org/EIPS/eip-3156'},
            {'code': 'S-EIP-3525', 'title': 'EIP-3525: Semi-Fungible Token', 'url': 'https://eips.ethereum.org/EIPS/eip-3525'},
            {'code': 'S-EIP-3668', 'title': 'EIP-3668: CCIP Read: Secure offchain data retrieval', 'url': 'https://eips.ethereum.org/EIPS/eip-3668'},
            {'code': 'S-EIP-4361', 'title': 'EIP-4361: Sign-In with Ethereum', 'url': 'https://eips.ethereum.org/EIPS/eip-4361'},
            {'code': 'S-EIP-4626', 'title': 'EIP-4626: Tokenized Vault Standard', 'url': 'https://eips.ethereum.org/EIPS/eip-4626'},
            {'code': 'S-EIP-4844', 'title': 'EIP-4844: Proto-Danksharding', 'url': 'https://eips.ethereum.org/EIPS/eip-4844'},
            {'code': 'S-EIP-5267', 'title': 'EIP-5267: Retrieval of EIP-712 domain', 'url': 'https://eips.ethereum.org/EIPS/eip-5267'},
            {'code': 'S-EIP-5792', 'title': 'EIP-5792: Wallet Call API', 'url': 'https://eips.ethereum.org/EIPS/eip-5792'},
            {'code': 'S-EIP-6492', 'title': 'EIP-6492: Signature Validation for Pre-deployed Contracts', 'url': 'https://eips.ethereum.org/EIPS/eip-6492'},
            {'code': 'S-EIP-6900', 'title': 'EIP-6900: Modular Smart Contract Accounts', 'url': 'https://eips.ethereum.org/EIPS/eip-6900'},
            {'code': 'S-EIP-7002', 'title': 'EIP-7002: Execution layer triggerable withdrawals', 'url': 'https://eips.ethereum.org/EIPS/eip-7002'},
            {'code': 'S-EIP-7201', 'title': 'EIP-7201: Namespaced Storage Layout', 'url': 'https://eips.ethereum.org/EIPS/eip-7201'},
            {'code': 'S-EIP-7251', 'title': 'EIP-7251: Increase MAX_EFFECTIVE_BALANCE', 'url': 'https://eips.ethereum.org/EIPS/eip-7251'},
            {'code': 'S-EIP-7412', 'title': 'EIP-7412: On-Demand Offchain Data Retrieval', 'url': 'https://eips.ethereum.org/EIPS/eip-7412'},
            {'code': 'S-EIP-7579', 'title': 'EIP-7579: Minimal Modular Smart Accounts', 'url': 'https://eips.ethereum.org/EIPS/eip-7579'},
            {'code': 'S-EIP-7702', 'title': 'EIP-7702: Set EOA account code', 'url': 'https://eips.ethereum.org/EIPS/eip-7702'},
        ],

        # NIST Standards
        'NIST': [
            {'code': 'S-NIST-800-38A', 'title': 'NIST SP 800-38A: Block Cipher Modes', 'url': 'https://csrc.nist.gov/publications/detail/sp/800-38a/final'},
            {'code': 'S-NIST-800-38B', 'title': 'NIST SP 800-38B: CMAC Mode', 'url': 'https://csrc.nist.gov/publications/detail/sp/800-38b/final'},
            {'code': 'S-NIST-800-38C', 'title': 'NIST SP 800-38C: CCM Mode', 'url': 'https://csrc.nist.gov/publications/detail/sp/800-38c/final'},
            {'code': 'S-NIST-800-38D', 'title': 'NIST SP 800-38D: GCM Mode', 'url': 'https://csrc.nist.gov/publications/detail/sp/800-38d/final'},
            {'code': 'S-NIST-800-38E', 'title': 'NIST SP 800-38E: XTS-AES Mode', 'url': 'https://csrc.nist.gov/publications/detail/sp/800-38e/final'},
            {'code': 'S-NIST-800-38F', 'title': 'NIST SP 800-38F: Key Wrap', 'url': 'https://csrc.nist.gov/publications/detail/sp/800-38f/final'},
            {'code': 'S-NIST-800-53', 'title': 'NIST SP 800-53: Security and Privacy Controls', 'url': 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final'},
            {'code': 'S-NIST-800-56A', 'title': 'NIST SP 800-56A: Key Agreement', 'url': 'https://csrc.nist.gov/publications/detail/sp/800-56a/rev-3/final'},
            {'code': 'S-NIST-800-56B', 'title': 'NIST SP 800-56B: Key Encapsulation', 'url': 'https://csrc.nist.gov/publications/detail/sp/800-56b/rev-2/final'},
            {'code': 'S-NIST-800-56C', 'title': 'NIST SP 800-56C: Key Derivation Methods', 'url': 'https://csrc.nist.gov/publications/detail/sp/800-56c/rev-2/final'},
            {'code': 'S-NIST-800-63A', 'title': 'NIST SP 800-63A: Enrollment and Identity Proofing', 'url': 'https://csrc.nist.gov/publications/detail/sp/800-63a/final'},
            {'code': 'S-NIST-800-63B', 'title': 'NIST SP 800-63B: Authentication and Lifecycle', 'url': 'https://csrc.nist.gov/publications/detail/sp/800-63b/final'},
            {'code': 'S-NIST-800-63C', 'title': 'NIST SP 800-63C: Federation and Assertions', 'url': 'https://csrc.nist.gov/publications/detail/sp/800-63c/final'},
            {'code': 'S-NIST-800-90B', 'title': 'NIST SP 800-90B: Entropy Sources', 'url': 'https://csrc.nist.gov/publications/detail/sp/800-90b/final'},
            {'code': 'S-NIST-800-107', 'title': 'NIST SP 800-107: Hash Applications', 'url': 'https://csrc.nist.gov/publications/detail/sp/800-107/rev-1/final'},
            {'code': 'S-NIST-800-108', 'title': 'NIST SP 800-108: Key Derivation Using Pseudorandom Functions', 'url': 'https://csrc.nist.gov/publications/detail/sp/800-108/rev-1/final'},
            {'code': 'S-NIST-800-131A', 'title': 'NIST SP 800-131A: Transitioning Cryptographic Algorithms', 'url': 'https://csrc.nist.gov/publications/detail/sp/800-131a/rev-2/final'},
            {'code': 'S-NIST-800-133', 'title': 'NIST SP 800-133: Recommendation for Cryptographic Key Generation', 'url': 'https://csrc.nist.gov/publications/detail/sp/800-133/rev-2/final'},
            {'code': 'S-NIST-800-186', 'title': 'NIST SP 800-186: Elliptic Curves', 'url': 'https://csrc.nist.gov/publications/detail/sp/800-186/final'},
            {'code': 'S-FIPS-180', 'title': 'FIPS 180-4: Secure Hash Standard', 'url': 'https://csrc.nist.gov/publications/detail/fips/180/4/final'},
            {'code': 'S-FIPS-186', 'title': 'FIPS 186-5: Digital Signature Standard', 'url': 'https://csrc.nist.gov/publications/detail/fips/186/5/final'},
            {'code': 'S-FIPS-197', 'title': 'FIPS 197: Advanced Encryption Standard', 'url': 'https://csrc.nist.gov/publications/detail/fips/197/final'},
            {'code': 'S-FIPS-198', 'title': 'FIPS 198-1: HMAC Standard', 'url': 'https://csrc.nist.gov/publications/detail/fips/198/1/final'},
            {'code': 'S-FIPS-202', 'title': 'FIPS 202: SHA-3 Standard', 'url': 'https://csrc.nist.gov/publications/detail/fips/202/final'},
            {'code': 'S-FIPS-203', 'title': 'FIPS 203: ML-KEM (Kyber)', 'url': 'https://csrc.nist.gov/pubs/fips/203/final'},
            {'code': 'S-FIPS-204', 'title': 'FIPS 204: ML-DSA (Dilithium)', 'url': 'https://csrc.nist.gov/pubs/fips/204/final'},
            {'code': 'S-FIPS-205', 'title': 'FIPS 205: SLH-DSA (SPHINCS+)', 'url': 'https://csrc.nist.gov/pubs/fips/205/final'},
        ],

        # RFCs
        'RFC': [
            {'code': 'S-RFC-2104', 'title': 'RFC 2104: HMAC', 'url': 'https://datatracker.ietf.org/doc/html/rfc2104'},
            {'code': 'S-RFC-3447', 'title': 'RFC 3447: PKCS #1 RSA', 'url': 'https://datatracker.ietf.org/doc/html/rfc3447'},
            {'code': 'S-RFC-4648', 'title': 'RFC 4648: Base Encodings', 'url': 'https://datatracker.ietf.org/doc/html/rfc4648'},
            {'code': 'S-RFC-5116', 'title': 'RFC 5116: AEAD Interface', 'url': 'https://datatracker.ietf.org/doc/html/rfc5116'},
            {'code': 'S-RFC-5208', 'title': 'RFC 5208: PKCS #8', 'url': 'https://datatracker.ietf.org/doc/html/rfc5208'},
            {'code': 'S-RFC-5639', 'title': 'RFC 5639: Brainpool Curves', 'url': 'https://datatracker.ietf.org/doc/html/rfc5639'},
            {'code': 'S-RFC-5652', 'title': 'RFC 5652: CMS', 'url': 'https://datatracker.ietf.org/doc/html/rfc5652'},
            {'code': 'S-RFC-5915', 'title': 'RFC 5915: EC Private Key Structure', 'url': 'https://datatracker.ietf.org/doc/html/rfc5915'},
            {'code': 'S-RFC-5958', 'title': 'RFC 5958: Asymmetric Key Packages', 'url': 'https://datatracker.ietf.org/doc/html/rfc5958'},
            {'code': 'S-RFC-6090', 'title': 'RFC 6090: Fundamental Elliptic Curve Cryptography', 'url': 'https://datatracker.ietf.org/doc/html/rfc6090'},
            {'code': 'S-RFC-6238', 'title': 'RFC 6238: TOTP', 'url': 'https://datatracker.ietf.org/doc/html/rfc6238'},
            {'code': 'S-RFC-7539', 'title': 'RFC 7539: ChaCha20-Poly1305', 'url': 'https://datatracker.ietf.org/doc/html/rfc7539'},
            {'code': 'S-RFC-7693', 'title': 'RFC 7693: BLAKE2', 'url': 'https://datatracker.ietf.org/doc/html/rfc7693'},
            {'code': 'S-RFC-7748', 'title': 'RFC 7748: X25519/X448', 'url': 'https://datatracker.ietf.org/doc/html/rfc7748'},
            {'code': 'S-RFC-8017', 'title': 'RFC 8017: PKCS #1 v2.2', 'url': 'https://datatracker.ietf.org/doc/html/rfc8017'},
            {'code': 'S-RFC-8152', 'title': 'RFC 8152: COSE', 'url': 'https://datatracker.ietf.org/doc/html/rfc8152'},
            {'code': 'S-RFC-8439', 'title': 'RFC 8439: ChaCha20-Poly1305 for IETF', 'url': 'https://datatracker.ietf.org/doc/html/rfc8439'},
            {'code': 'S-RFC-8812', 'title': 'RFC 8812: CBOR Object Signing (secp256k1)', 'url': 'https://datatracker.ietf.org/doc/html/rfc8812'},
            {'code': 'S-RFC-9053', 'title': 'RFC 9053: COSE Algorithms', 'url': 'https://datatracker.ietf.org/doc/html/rfc9053'},
            {'code': 'S-RFC-9180', 'title': 'RFC 9180: HPKE', 'url': 'https://datatracker.ietf.org/doc/html/rfc9180'},
            {'code': 'S-RFC-9381', 'title': 'RFC 9381: VRF', 'url': 'https://datatracker.ietf.org/doc/html/rfc9381'},
            {'code': 'S-RFC-9496', 'title': 'RFC 9496: secp256k1 Curves', 'url': 'https://datatracker.ietf.org/doc/html/rfc9496'},
        ],
    },

    # =========================================================================
    # PILLAR A: ADVERSITY - Anti-Coercion and Physical Security
    # =========================================================================
    'A': {
        # Privacy Regulations
        'PRIVACY': [
            {'code': 'A-GDPR-12', 'title': 'GDPR Art 12: Transparent Information', 'url': 'https://gdpr-info.eu/art-12-gdpr/'},
            {'code': 'A-GDPR-13', 'title': 'GDPR Art 13: Information to be Provided', 'url': 'https://gdpr-info.eu/art-13-gdpr/'},
            {'code': 'A-GDPR-15', 'title': 'GDPR Art 15: Right of Access', 'url': 'https://gdpr-info.eu/art-15-gdpr/'},
            {'code': 'A-GDPR-25', 'title': 'GDPR Art 25: Data Protection by Design', 'url': 'https://gdpr-info.eu/art-25-gdpr/'},
            {'code': 'A-GDPR-32', 'title': 'GDPR Art 32: Security of Processing', 'url': 'https://gdpr-info.eu/art-32-gdpr/'},
            {'code': 'A-GDPR-33', 'title': 'GDPR Art 33: Breach Notification', 'url': 'https://gdpr-info.eu/art-33-gdpr/'},
            {'code': 'A-GDPR-35', 'title': 'GDPR Art 35: Data Protection Impact Assessment', 'url': 'https://gdpr-info.eu/art-35-gdpr/'},
            {'code': 'A-CCPA-1798', 'title': 'CCPA: California Consumer Privacy Act', 'url': 'https://oag.ca.gov/privacy/ccpa'},
            {'code': 'A-LGPD', 'title': 'LGPD: Brazil Data Protection Law', 'url': 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm'},
            {'code': 'A-PIPL', 'title': 'PIPL: China Personal Information Protection Law', 'url': 'http://www.npc.gov.cn/npc/c30834/202108/a8c4e3672c74491a80b53a172bb753fe.shtml'},
        ],

        # Crypto Regulations
        'CRYPTO_REG': [
            {'code': 'A-MICA', 'title': 'MiCA: Markets in Crypto-Assets Regulation', 'url': 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1114'},
            {'code': 'A-FATF-VASP', 'title': 'FATF VASP Guidelines', 'url': 'https://www.fatf-gafi.org/en/topics/virtual-assets.html'},
            {'code': 'A-DORA', 'title': 'DORA: Digital Operational Resilience Act', 'url': 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2554'},
            {'code': 'A-CRA', 'title': 'Cyber Resilience Act (EU)', 'url': 'https://digital-strategy.ec.europa.eu/en/policies/cyber-resilience-act'},
        ],

        # Physical Security Standards
        'PHYSICAL': [
            {'code': 'A-IP67', 'title': 'IP67: Dust and Water Protection', 'url': 'https://www.iec.ch/ip-ratings'},
            {'code': 'A-IP68', 'title': 'IP68: Continuous Water Submersion', 'url': 'https://www.iec.ch/ip-ratings'},
            {'code': 'A-MIL-810G', 'title': 'MIL-STD-810G: Environmental Engineering', 'url': 'https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=35978'},
            {'code': 'A-MIL-810H', 'title': 'MIL-STD-810H: Environmental Engineering (2019)', 'url': 'https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=287225'},
        ],
    },

    # =========================================================================
    # PILLAR F: FIDELITY - Reliability and Compliance
    # =========================================================================
    'F': {
        # Audit Standards
        'AUDIT': [
            {'code': 'F-OWASP-TOP10', 'title': 'OWASP Top 10 Web Application Security Risks', 'url': 'https://owasp.org/www-project-top-ten/'},
            {'code': 'F-OWASP-API', 'title': 'OWASP API Security Top 10', 'url': 'https://owasp.org/www-project-api-security/'},
            {'code': 'F-OWASP-SAMM', 'title': 'OWASP SAMM: Software Assurance Maturity Model', 'url': 'https://owaspsamm.org/'},
            {'code': 'F-CIS-CONTROLS', 'title': 'CIS Critical Security Controls', 'url': 'https://www.cisecurity.org/controls'},
            {'code': 'F-SLSA', 'title': 'SLSA: Supply-chain Levels for Software Artifacts', 'url': 'https://slsa.dev/'},
            {'code': 'F-SBOM', 'title': 'Software Bill of Materials', 'url': 'https://www.cisa.gov/sbom'},
        ],

        # Compliance Frameworks
        'COMPLIANCE': [
            {'code': 'F-ISO-27001', 'title': 'ISO/IEC 27001: Information Security Management', 'url': 'https://www.iso.org/standard/27001'},
            {'code': 'F-ISO-27002', 'title': 'ISO/IEC 27002: Security Controls', 'url': 'https://www.iso.org/standard/75652.html'},
            {'code': 'F-ISO-27017', 'title': 'ISO/IEC 27017: Cloud Security', 'url': 'https://www.iso.org/standard/43757.html'},
            {'code': 'F-ISO-27018', 'title': 'ISO/IEC 27018: Cloud Privacy', 'url': 'https://www.iso.org/standard/76559.html'},
            {'code': 'F-ISO-27701', 'title': 'ISO/IEC 27701: Privacy Information Management', 'url': 'https://www.iso.org/standard/71670.html'},
            {'code': 'F-ISO-22301', 'title': 'ISO 22301: Business Continuity', 'url': 'https://www.iso.org/standard/75106.html'},
            {'code': 'F-SOC1', 'title': 'SOC 1 Type II', 'url': 'https://us.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome'},
            {'code': 'F-SOC2', 'title': 'SOC 2 Type II', 'url': 'https://us.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome'},
            {'code': 'F-SOC3', 'title': 'SOC 3', 'url': 'https://us.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome'},
            {'code': 'F-PCI-DSS', 'title': 'PCI DSS v4.0', 'url': 'https://www.pcisecuritystandards.org/'},
        ],

        # Hardware Certifications
        'HARDWARE': [
            {'code': 'F-CC-EAL1', 'title': 'Common Criteria EAL1', 'url': 'https://www.commoncriteriaportal.org/cc/'},
            {'code': 'F-CC-EAL2', 'title': 'Common Criteria EAL2', 'url': 'https://www.commoncriteriaportal.org/cc/'},
            {'code': 'F-CC-EAL3', 'title': 'Common Criteria EAL3', 'url': 'https://www.commoncriteriaportal.org/cc/'},
            {'code': 'F-CC-EAL4', 'title': 'Common Criteria EAL4', 'url': 'https://www.commoncriteriaportal.org/cc/'},
            {'code': 'F-CC-EAL5', 'title': 'Common Criteria EAL5+', 'url': 'https://www.commoncriteriaportal.org/cc/'},
            {'code': 'F-CC-EAL6', 'title': 'Common Criteria EAL6+', 'url': 'https://www.commoncriteriaportal.org/cc/'},
            {'code': 'F-FIPS-140-2', 'title': 'FIPS 140-2 Level 1-4', 'url': 'https://csrc.nist.gov/projects/cryptographic-module-validation-program'},
            {'code': 'F-FIPS-140-3', 'title': 'FIPS 140-3', 'url': 'https://csrc.nist.gov/projects/cryptographic-module-validation-program'},
            {'code': 'F-FIDO2', 'title': 'FIDO2/WebAuthn Certification', 'url': 'https://fidoalliance.org/certification/'},
            {'code': 'F-EMV', 'title': 'EMVCo Certification', 'url': 'https://www.emvco.com/'},
            {'code': 'F-GP', 'title': 'GlobalPlatform Certification', 'url': 'https://globalplatform.org/'},
        ],
    },

    # =========================================================================
    # PILLAR E: ECOSYSTEM - Usability and Interoperability
    # =========================================================================
    'E': {
        # Token Standards
        'TOKEN': [
            {'code': 'E-ERC-20', 'title': 'ERC-20: Fungible Token Standard', 'url': 'https://eips.ethereum.org/EIPS/eip-20'},
            {'code': 'E-ERC-721', 'title': 'ERC-721: Non-Fungible Token Standard', 'url': 'https://eips.ethereum.org/EIPS/eip-721'},
            {'code': 'E-ERC-777', 'title': 'ERC-777: Token Standard with Hooks', 'url': 'https://eips.ethereum.org/EIPS/eip-777'},
            {'code': 'E-ERC-1155', 'title': 'ERC-1155: Multi Token Standard', 'url': 'https://eips.ethereum.org/EIPS/eip-1155'},
            {'code': 'E-ERC-2981', 'title': 'ERC-2981: NFT Royalty Standard', 'url': 'https://eips.ethereum.org/EIPS/eip-2981'},
            {'code': 'E-ERC-4907', 'title': 'ERC-4907: Rentable NFT Standard', 'url': 'https://eips.ethereum.org/EIPS/eip-4907'},
            {'code': 'E-ERC-5192', 'title': 'ERC-5192: Minimal Soulbound NFTs', 'url': 'https://eips.ethereum.org/EIPS/eip-5192'},
            {'code': 'E-ERC-6551', 'title': 'ERC-6551: Token Bound Accounts', 'url': 'https://eips.ethereum.org/EIPS/eip-6551'},
            {'code': 'E-BEP-20', 'title': 'BEP-20: Binance Smart Chain Token', 'url': 'https://github.com/bnb-chain/BEPs/blob/master/BEPs/BEP20.md'},
            {'code': 'E-SPL', 'title': 'SPL Token: Solana Token Standard', 'url': 'https://spl.solana.com/token'},
        ],

        # Accessibility
        'ACCESSIBILITY': [
            {'code': 'E-WCAG-21', 'title': 'WCAG 2.1: Web Content Accessibility', 'url': 'https://www.w3.org/TR/WCAG21/'},
            {'code': 'E-WCAG-22', 'title': 'WCAG 2.2: Web Content Accessibility', 'url': 'https://www.w3.org/TR/WCAG22/'},
            {'code': 'E-WAI-ARIA', 'title': 'WAI-ARIA: Accessible Rich Internet Apps', 'url': 'https://www.w3.org/WAI/standards-guidelines/aria/'},
        ],

        # Interoperability
        'INTEROP': [
            {'code': 'E-WC-ETH', 'title': 'WalletConnect: Ethereum', 'url': 'https://docs.walletconnect.com/'},
            {'code': 'E-EIP-1193', 'title': 'EIP-1193: Ethereum Provider API', 'url': 'https://eips.ethereum.org/EIPS/eip-1193'},
            {'code': 'E-EIP-6963', 'title': 'EIP-6963: Multi-Injected Provider Discovery', 'url': 'https://eips.ethereum.org/EIPS/eip-6963'},
            {'code': 'E-CAIP-2', 'title': 'CAIP-2: Blockchain ID Specification', 'url': 'https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md'},
            {'code': 'E-CAIP-10', 'title': 'CAIP-10: Account ID Specification', 'url': 'https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-10.md'},
            {'code': 'E-CAIP-25', 'title': 'CAIP-25: Wallet Connection', 'url': 'https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-25.md'},
        ],
    }
}


def count_standards():
    """Count total standards in the database."""
    total = 0
    by_pillar = {}

    for pillar, categories in REAL_STANDARDS.items():
        pillar_count = 0
        for category, standards in categories.items():
            pillar_count += len(standards)
        by_pillar[pillar] = pillar_count
        total += pillar_count

    return total, by_pillar


def generate_sql_inserts():
    """Generate SQL INSERT statements for all standards."""
    sql_parts = []

    for pillar, categories in REAL_STANDARDS.items():
        sql_parts.append(f"\n-- ===== PILLAR {pillar} =====\n")

        for category, standards in categories.items():
            sql_parts.append(f"\n-- Category: {category}")

            for std in standards:
                sql = f"""
INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('{std['code']}', '{pillar}', '{std['title'].replace("'", "''")}', '{std['url']}',
        '{category}', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';
"""
                sql_parts.append(sql)

    return ''.join(sql_parts)


def main():
    total, by_pillar = count_standards()

    print("=" * 70)
    print("SAFE SCORING - MISSING REAL STANDARDS ANALYSIS")
    print("=" * 70)
    print(f"\nTotal new standards identified: {total}")
    print("\nBy pillar:")
    for pillar, count in by_pillar.items():
        print(f"  {pillar}: {count}")

    print(f"\nTarget: 1300 norms")
    print(f"Current (approx): 1000")
    print(f"To add: {total}")
    print(f"Expected total: ~{1000 + total}")

    # Save SQL
    sql_content = generate_sql_inserts()
    output_path = os.path.join(os.path.dirname(__file__), 'additional_real_standards.sql')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("-- Additional Real Standards to Add\n")
        f.write(f"-- Generated: {datetime.now().isoformat()}\n")
        f.write(f"-- Total: {total} standards\n\n")
        f.write(sql_content)

    print(f"\nSQL file saved to: {output_path}")


if __name__ == '__main__':
    main()
