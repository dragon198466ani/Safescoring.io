#!/usr/bin/env python3
"""
Fix ALL 1300 norms following the frontend methodology.
Maps norms to official standard names from web/app/methodology/page.js

SAFE Framework:
- S (Security): Cryptographic Foundations
- A (Adversity): Duress & Coercion Resistance
- F (Fidelity): Trust & Long-term Reliability
- E (Efficiency): Usability & Accessibility
"""
import os
import sys
import re
import json
import time
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# ============================================================================
# OFFICIAL STANDARDS MAPPING FROM METHODOLOGY
# Format: keyword -> (official_name, official_link, access_type)
# ============================================================================

# S-PILLAR: Security (Cryptographic Foundations)
S_STANDARDS = {
    # NIST Standards
    'nist sp 800-57': ('NIST SP 800-57', 'https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final', 'G'),
    'nist 800-57': ('NIST SP 800-57', 'https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final', 'G'),
    'key management': ('NIST SP 800-57', 'https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final', 'G'),
    'nist sp 800-90': ('NIST SP 800-90A/B/C', 'https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final', 'G'),
    'nist 800-90': ('NIST SP 800-90A/B/C', 'https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final', 'G'),
    'random number': ('NIST SP 800-90A', 'https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final', 'G'),
    'drbg': ('NIST SP 800-90A', 'https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final', 'G'),
    'entropy': ('NIST SP 800-90B', 'https://csrc.nist.gov/publications/detail/sp/800-90b/final', 'G'),
    'nist sp 800-186': ('NIST SP 800-186', 'https://csrc.nist.gov/publications/detail/sp/800-186/final', 'G'),
    'elliptic curve': ('NIST SP 800-186', 'https://csrc.nist.gov/publications/detail/sp/800-186/final', 'G'),

    # FIPS Standards
    'fips 140-3': ('FIPS 140-3', 'https://csrc.nist.gov/publications/detail/fips/140/3/final', 'G'),
    'fips 140': ('FIPS 140-3', 'https://csrc.nist.gov/publications/detail/fips/140/3/final', 'G'),
    'cryptographic module': ('FIPS 140-3', 'https://csrc.nist.gov/publications/detail/fips/140/3/final', 'G'),
    'fips 186-5': ('FIPS 186-5', 'https://csrc.nist.gov/publications/detail/fips/186/5/final', 'G'),
    'fips 186': ('FIPS 186-5', 'https://csrc.nist.gov/publications/detail/fips/186/5/final', 'G'),
    'digital signature standard': ('FIPS 186-5', 'https://csrc.nist.gov/publications/detail/fips/186/5/final', 'G'),
    'dss': ('FIPS 186-5', 'https://csrc.nist.gov/publications/detail/fips/186/5/final', 'G'),
    'fips 197': ('FIPS 197', 'https://csrc.nist.gov/publications/detail/fips/197/final', 'G'),
    'fips 180': ('FIPS 180-4', 'https://csrc.nist.gov/publications/detail/fips/180/4/final', 'G'),

    # Encryption
    'aes': ('FIPS 197', 'https://csrc.nist.gov/publications/detail/fips/197/final', 'G'),
    'aes-256': ('FIPS 197', 'https://csrc.nist.gov/publications/detail/fips/197/final', 'G'),
    'aes-gcm': ('FIPS 197', 'https://csrc.nist.gov/publications/detail/fips/197/final', 'G'),
    'chacha20': ('RFC 8439', 'https://www.rfc-editor.org/rfc/rfc8439', 'G'),
    'poly1305': ('RFC 8439', 'https://www.rfc-editor.org/rfc/rfc8439', 'G'),
    'xsalsa20': ('libsodium/NaCl', 'https://doc.libsodium.org/', 'G'),

    # Signatures
    'ecdsa': ('FIPS 186-5', 'https://csrc.nist.gov/publications/detail/fips/186/5/final', 'G'),
    'eddsa': ('RFC 8032', 'https://www.rfc-editor.org/rfc/rfc8032', 'G'),
    'ed25519': ('RFC 8032', 'https://www.rfc-editor.org/rfc/rfc8032', 'G'),
    'schnorr': ('BIP-340', 'https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki', 'G'),
    'bls': ('BLS12-381', 'https://datatracker.ietf.org/doc/draft-irtf-cfrg-bls-signature/', 'G'),
    'rsa': ('RFC 8017', 'https://www.rfc-editor.org/rfc/rfc8017', 'G'),

    # Hash Functions
    'sha-256': ('FIPS 180-4', 'https://csrc.nist.gov/publications/detail/fips/180/4/final', 'G'),
    'sha256': ('FIPS 180-4', 'https://csrc.nist.gov/publications/detail/fips/180/4/final', 'G'),
    'sha-3': ('FIPS 202', 'https://csrc.nist.gov/publications/detail/fips/202/final', 'G'),
    'sha3': ('FIPS 202', 'https://csrc.nist.gov/publications/detail/fips/202/final', 'G'),
    'keccak': ('FIPS 202', 'https://csrc.nist.gov/publications/detail/fips/202/final', 'G'),
    'blake2': ('RFC 7693', 'https://www.rfc-editor.org/rfc/rfc7693', 'G'),
    'blake3': ('BLAKE3', 'https://github.com/BLAKE3-team/BLAKE3-specs', 'G'),
    'poseidon': ('Poseidon Hash', 'https://www.poseidon-hash.info/', 'G'),

    # Key Derivation
    'hkdf': ('RFC 5869', 'https://www.rfc-editor.org/rfc/rfc5869', 'G'),
    'pbkdf2': ('RFC 8018', 'https://www.rfc-editor.org/rfc/rfc8018', 'G'),
    'argon2': ('RFC 9106', 'https://www.rfc-editor.org/rfc/rfc9106', 'G'),
    'scrypt': ('RFC 7914', 'https://www.rfc-editor.org/rfc/rfc7914', 'G'),
    'bcrypt': ('bcrypt', 'https://www.usenix.org/legacy/events/usenix99/provos/provos.pdf', 'G'),

    # BIP Standards
    'bip-32': ('BIP-32', 'https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki', 'G'),
    'bip32': ('BIP-32', 'https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki', 'G'),
    'hd wallet': ('BIP-32', 'https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki', 'G'),
    'hierarchical deterministic': ('BIP-32', 'https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki', 'G'),
    'bip-39': ('BIP-39', 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki', 'G'),
    'bip39': ('BIP-39', 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki', 'G'),
    'mnemonic': ('BIP-39', 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki', 'G'),
    'seed phrase': ('BIP-39', 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki', 'G'),
    'bip-44': ('BIP-44', 'https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki', 'G'),
    'bip44': ('BIP-44', 'https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki', 'G'),
    'bip-84': ('BIP-84', 'https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki', 'G'),
    'bip84': ('BIP-84', 'https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki', 'G'),
    'bip-340': ('BIP-340', 'https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki', 'G'),
    'bip340': ('BIP-340', 'https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki', 'G'),
    'bip-341': ('BIP-341', 'https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki', 'G'),
    'bip341': ('BIP-341', 'https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki', 'G'),
    'taproot': ('BIP-341/342', 'https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki', 'G'),

    # SLIP Standards
    'slip-10': ('SLIP-0010', 'https://github.com/satoshilabs/slips/blob/master/slip-0010.md', 'G'),
    'slip10': ('SLIP-0010', 'https://github.com/satoshilabs/slips/blob/master/slip-0010.md', 'G'),
    'slip-39': ('SLIP-39', 'https://github.com/satoshilabs/slips/blob/master/slip-0039.md', 'G'),
    'slip39': ('SLIP-39', 'https://github.com/satoshilabs/slips/blob/master/slip-0039.md', 'G'),
    'shamir backup': ('SLIP-39', 'https://github.com/satoshilabs/slips/blob/master/slip-0039.md', 'G'),
    'slip-44': ('SLIP-0044', 'https://github.com/satoshilabs/slips/blob/master/slip-0044.md', 'G'),
    'slip44': ('SLIP-0044', 'https://github.com/satoshilabs/slips/blob/master/slip-0044.md', 'G'),

    # TLS/Network
    'tls 1.3': ('RFC 8446', 'https://www.rfc-editor.org/rfc/rfc8446', 'G'),
    'tls': ('RFC 8446', 'https://www.rfc-editor.org/rfc/rfc8446', 'G'),
    'https': ('RFC 8446', 'https://www.rfc-editor.org/rfc/rfc8446', 'G'),
    'ssl': ('RFC 8446', 'https://www.rfc-editor.org/rfc/rfc8446', 'G'),

    # Zero-Knowledge
    'groth16': ('Groth16', 'https://eprint.iacr.org/2016/260', 'G'),
    'plonk': ('PLONK', 'https://eprint.iacr.org/2019/953', 'G'),
    'stark': ('STARKs', 'https://eprint.iacr.org/2018/046', 'G'),
    'bulletproof': ('Bulletproofs', 'https://eprint.iacr.org/2017/1066', 'G'),
    'halo2': ('Halo2', 'https://zcash.github.io/halo2/', 'G'),
    'plonky2': ('Plonky2', 'https://github.com/mir-protocol/plonky2', 'G'),
    'zk-snark': ('Groth16/PLONK', 'https://eprint.iacr.org/2016/260', 'G'),
    'zk-stark': ('STARKs', 'https://eprint.iacr.org/2018/046', 'G'),
    'zero knowledge': ('ZK Proofs', 'https://zkproof.org/', 'G'),

    # Privacy Protocols
    'sapling': ('Zcash Sapling', 'https://z.cash/upgrade/sapling/', 'G'),
    'orchard': ('Zcash Orchard', 'https://z.cash/upgrade/orchard/', 'G'),
    'aztec': ('Aztec Noir', 'https://aztec.network/', 'G'),
    'semaphore': ('Semaphore Protocol', 'https://semaphore.pse.dev/', 'G'),

    # Post-Quantum
    'kyber': ('NIST PQC Kyber', 'https://pq-crystals.org/kyber/', 'G'),
    'dilithium': ('NIST PQC Dilithium', 'https://pq-crystals.org/dilithium/', 'G'),
    'sphincs': ('SPHINCS+', 'https://sphincs.org/', 'G'),
    'falcon': ('Falcon', 'https://falcon-sign.info/', 'G'),
    'post-quantum': ('NIST PQC', 'https://csrc.nist.gov/projects/post-quantum-cryptography', 'G'),

    # Protocols
    'signal protocol': ('Signal Protocol', 'https://signal.org/docs/', 'G'),
    'noise protocol': ('Noise Protocol', 'https://noiseprotocol.org/', 'G'),
    'wireguard': ('WireGuard', 'https://www.wireguard.com/', 'G'),
    'libsodium': ('libsodium/NaCl', 'https://doc.libsodium.org/', 'G'),
    'nacl': ('libsodium/NaCl', 'https://doc.libsodium.org/', 'G'),

    # MPC
    'mpc': ('MPC Protocols', 'https://eprint.iacr.org/', 'G'),
    'shamir': ('Shamir Secret Sharing', 'https://dl.acm.org/doi/10.1145/359168.359176', 'G'),
    'threshold signature': ('Threshold Signatures', 'https://eprint.iacr.org/', 'G'),

    # Commitment Schemes
    'pedersen': ('Pedersen Commitment', 'https://link.springer.com/chapter/10.1007/3-540-46766-1_9', 'G'),
    'kzg': ('KZG Commitment', 'https://dankradfeist.de/ethereum/2020/06/16/kate-polynomial-commitments.html', 'G'),

    # Curves
    'secp256k1': ('secp256k1', 'https://www.secg.org/sec2-v2.pdf', 'G'),
    'curve25519': ('RFC 7748', 'https://www.rfc-editor.org/rfc/rfc7748', 'G'),
    'x25519': ('RFC 7748', 'https://www.rfc-editor.org/rfc/rfc7748', 'G'),
    'bn254': ('BN254', 'https://eprint.iacr.org/2010/354', 'G'),
    'bls12-381': ('BLS12-381', 'https://hackmd.io/@benjaminion/bls12-381', 'G'),
}

# A-PILLAR: Adversity (Duress & Coercion Resistance)
A_STANDARDS = {
    # Common Criteria
    'common criteria': ('ISO/IEC 15408', 'https://www.commoncriteriaportal.org/', 'G'),
    'iso 15408': ('ISO/IEC 15408', 'https://www.commoncriteriaportal.org/', 'G'),
    'iso/iec 15408': ('ISO/IEC 15408', 'https://www.commoncriteriaportal.org/', 'G'),
    'eal': ('ISO/IEC 15408', 'https://www.commoncriteriaportal.org/', 'G'),
    'eal5': ('ISO/IEC 15408 EAL5+', 'https://www.commoncriteriaportal.org/', 'G'),
    'eal6': ('ISO/IEC 15408 EAL6+', 'https://www.commoncriteriaportal.org/', 'G'),

    # Physical Testing
    'iso 24759': ('ISO/IEC 24759', 'https://www.iso.org/standard/72515.html', 'P'),
    'iso 17712': ('ISO 17712', 'https://www.iso.org/standard/73842.html', 'P'),
    'tamper evident': ('ISO 17712', 'https://www.iso.org/standard/73842.html', 'P'),
    'tamper': ('ISO 17712', 'https://www.iso.org/standard/73842.html', 'P'),

    # NIST Security Controls
    'nist sp 800-53': ('NIST SP 800-53', 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final', 'G'),
    'nist 800-53': ('NIST SP 800-53', 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final', 'G'),
    'security controls': ('NIST SP 800-53', 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final', 'G'),
    'nist sp 800-171': ('NIST SP 800-171', 'https://csrc.nist.gov/publications/detail/sp/800-171/rev-2/final', 'G'),
    'nist 800-171': ('NIST SP 800-171', 'https://csrc.nist.gov/publications/detail/sp/800-171/rev-2/final', 'G'),

    # NIST Wipe
    'nist sp 800-88': ('NIST SP 800-88', 'https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final', 'G'),
    'nist 800-88': ('NIST SP 800-88', 'https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final', 'G'),
    'media sanitization': ('NIST SP 800-88', 'https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final', 'G'),
    'secure wipe': ('NIST SP 800-88', 'https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final', 'G'),
    'wipe': ('NIST SP 800-88', 'https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final', 'G'),
    'data destruction': ('NIST SP 800-88', 'https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final', 'G'),

    # NIST Authentication
    'nist sp 800-63': ('NIST SP 800-63B', 'https://pages.nist.gov/800-63-3/sp800-63b.html', 'G'),
    'nist 800-63': ('NIST SP 800-63B', 'https://pages.nist.gov/800-63-3/sp800-63b.html', 'G'),
    'digital identity': ('NIST SP 800-63B', 'https://pages.nist.gov/800-63-3/sp800-63b.html', 'G'),
    'authentication': ('NIST SP 800-63B', 'https://pages.nist.gov/800-63-3/sp800-63b.html', 'G'),
    '2fa': ('NIST SP 800-63B', 'https://pages.nist.gov/800-63-3/sp800-63b.html', 'G'),
    'mfa': ('NIST SP 800-63B', 'https://pages.nist.gov/800-63-3/sp800-63b.html', 'G'),
    'multi-factor': ('NIST SP 800-63B', 'https://pages.nist.gov/800-63-3/sp800-63b.html', 'G'),

    # TEMPEST
    'tempest': ('TEMPEST/EMSEC', 'https://www.nsa.gov/', 'G'),
    'emsec': ('TEMPEST/EMSEC', 'https://www.nsa.gov/', 'G'),
    'electromagnetic': ('TEMPEST/EMSEC', 'https://www.nsa.gov/', 'G'),

    # Mobile Security
    'owasp masvs': ('OWASP MASVS', 'https://mas.owasp.org/', 'G'),
    'owasp mastg': ('OWASP MASTG', 'https://mas.owasp.org/', 'G'),
    'masvs': ('OWASP MASVS', 'https://mas.owasp.org/', 'G'),
    'mastg': ('OWASP MASTG', 'https://mas.owasp.org/', 'G'),
    'mobile security': ('OWASP MASVS', 'https://mas.owasp.org/', 'G'),
    'root detection': ('OWASP MASVS', 'https://mas.owasp.org/', 'G'),
    'anti-debugging': ('OWASP MASVS', 'https://mas.owasp.org/', 'G'),

    # Payment Security
    'emvco': ('EMVCo', 'https://www.emvco.com/', 'G'),
    'pci pin': ('PCI PIN', 'https://www.pcisecuritystandards.org/', 'G'),
    'pci pts': ('PCI PTS', 'https://www.pcisecuritystandards.org/', 'G'),
    'pin security': ('PCI PIN', 'https://www.pcisecuritystandards.org/', 'G'),

    # Hardware Security
    'globalplatform tee': ('GlobalPlatform TEE', 'https://globalplatform.org/specs-library/', 'G'),
    'tee': ('GlobalPlatform TEE', 'https://globalplatform.org/specs-library/', 'G'),
    'trusted execution': ('GlobalPlatform TEE', 'https://globalplatform.org/specs-library/', 'G'),

    # FIDO/WebAuthn
    'fido2': ('FIDO2', 'https://fidoalliance.org/fido2/', 'G'),
    'fido': ('FIDO2', 'https://fidoalliance.org/fido2/', 'G'),
    'webauthn': ('WebAuthn', 'https://www.w3.org/TR/webauthn/', 'G'),
    'ctap': ('CTAP2', 'https://fidoalliance.org/specs/fido-v2.1-ps-20210615/fido-client-to-authenticator-protocol-v2.1-ps-20210615.html', 'G'),
    'passkey': ('FIDO2/Passkeys', 'https://fidoalliance.org/passkeys/', 'G'),

    # TEE Vendors
    'arm trustzone': ('ARM TrustZone', 'https://developer.arm.com/documentation/102418/latest/', 'G'),
    'trustzone': ('ARM TrustZone', 'https://developer.arm.com/documentation/102418/latest/', 'G'),
    'intel sgx': ('Intel SGX', 'https://www.intel.com/content/www/us/en/developer/tools/software-guard-extensions/overview.html', 'G'),
    'sgx': ('Intel SGX', 'https://www.intel.com/content/www/us/en/developer/tools/software-guard-extensions/overview.html', 'G'),
    'intel tdx': ('Intel TDX', 'https://www.intel.com/content/www/us/en/developer/tools/trust-domain-extensions/overview.html', 'G'),
    'tdx': ('Intel TDX', 'https://www.intel.com/content/www/us/en/developer/tools/trust-domain-extensions/overview.html', 'G'),
    'amd sev': ('AMD SEV-SNP', 'https://www.amd.com/en/developer/sev.html', 'G'),
    'sev': ('AMD SEV-SNP', 'https://www.amd.com/en/developer/sev.html', 'G'),
    'sev-snp': ('AMD SEV-SNP', 'https://www.amd.com/en/developer/sev.html', 'G'),
    'apple secure enclave': ('Apple Secure Enclave', 'https://support.apple.com/guide/security/secure-enclave-sec59b0b31ff/web', 'G'),
    'secure enclave': ('Apple Secure Enclave', 'https://support.apple.com/guide/security/secure-enclave-sec59b0b31ff/web', 'G'),
    'google titan': ('Google Titan M2', 'https://safety.google/intl/en_us/security-privacy/products/', 'G'),
    'titan m': ('Google Titan M2', 'https://safety.google/intl/en_us/security-privacy/products/', 'G'),
    'infineon': ('Infineon SLE78/Optiga', 'https://www.infineon.com/cms/en/product/security-smart-card-solutions/', 'G'),
    'optiga': ('Infineon Optiga', 'https://www.infineon.com/cms/en/product/security-smart-card-solutions/', 'G'),
    'st33': ('STMicro ST33', 'https://www.st.com/en/secure-mcus.html', 'G'),
    'stmicro': ('STMicro ST33', 'https://www.st.com/en/secure-mcus.html', 'G'),
    'qualcomm spu': ('Qualcomm SPU', 'https://www.qualcomm.com/products/features/mobile-security', 'G'),
    'samsung knox': ('Samsung Knox Vault', 'https://www.samsungknox.com/', 'G'),
    'knox': ('Samsung Knox Vault', 'https://www.samsungknox.com/', 'G'),

    # Cloud Confidential Computing
    'aws nitro': ('AWS Nitro Enclaves', 'https://aws.amazon.com/ec2/nitro/', 'G'),
    'nitro enclave': ('AWS Nitro Enclaves', 'https://aws.amazon.com/ec2/nitro/', 'G'),
    'azure confidential': ('Azure Confidential Computing', 'https://azure.microsoft.com/en-us/solutions/confidential-compute/', 'G'),
    'gcp confidential': ('GCP Confidential VM', 'https://cloud.google.com/confidential-computing/', 'G'),

    # Duress/Coercion
    'duress': ('BIP-85', 'https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki', 'G'),
    'duress pin': ('BIP-85', 'https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki', 'G'),
    'panic wallet': ('BIP-85', 'https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki', 'G'),
    'panic': ('BIP-85', 'https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki', 'G'),
    'coercion': ('BIP-85', 'https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki', 'G'),
    'plausible deniability': ('VeraCrypt Hidden Volumes', 'https://veracrypt.fr/', 'G'),
    'hidden volume': ('VeraCrypt Hidden Volumes', 'https://veracrypt.fr/', 'G'),
    'veracrypt': ('VeraCrypt', 'https://veracrypt.fr/', 'G'),
    'decoy': ('BIP-85', 'https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki', 'G'),

    # Time-Lock
    'time-lock': ('Bitcoin CLTV/CSV', 'https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki', 'G'),
    'timelock': ('Bitcoin CLTV/CSV', 'https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki', 'G'),
    'cltv': ('BIP-65', 'https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki', 'G'),
    'csv': ('BIP-112', 'https://github.com/bitcoin/bips/blob/master/bip-0112.mediawiki', 'G'),

    # Side-Channel
    'side-channel': ('Side-Channel Attacks', 'https://csrc.nist.gov/', 'G'),
    'dpa': ('Differential Power Analysis', 'https://csrc.nist.gov/', 'G'),
    'spa': ('Simple Power Analysis', 'https://csrc.nist.gov/', 'G'),
    'ema': ('Electromagnetic Analysis', 'https://csrc.nist.gov/', 'G'),
    'fault injection': ('Fault Injection', 'https://csrc.nist.gov/', 'G'),
    'glitching': ('Voltage Glitching', 'https://csrc.nist.gov/', 'G'),

    # TPM
    'tpm': ('TCG TPM 2.0', 'https://trustedcomputinggroup.org/resource/tpm-library-specification/', 'G'),
    'tpm 2.0': ('TCG TPM 2.0', 'https://trustedcomputinggroup.org/resource/tpm-library-specification/', 'G'),
    'trusted platform module': ('TCG TPM 2.0', 'https://trustedcomputinggroup.org/resource/tpm-library-specification/', 'G'),

    # Secure Element
    'secure element': ('GlobalPlatform SE', 'https://globalplatform.org/specs-library/', 'G'),
    'se': ('GlobalPlatform SE', 'https://globalplatform.org/specs-library/', 'G'),
    'hsm': ('Hardware Security Module', 'https://csrc.nist.gov/projects/cryptographic-module-validation-program', 'G'),
}

# F-PILLAR: Fidelity (Trust & Long-term Reliability)
F_STANDARDS = {
    # SOC
    'soc 1': ('SOC 1 Type II', 'https://www.aicpa.org/resources/landing/soc-1', 'G'),
    'soc 2': ('SOC 2 Type II', 'https://www.aicpa.org/resources/landing/soc-2', 'G'),
    'soc2': ('SOC 2 Type II', 'https://www.aicpa.org/resources/landing/soc-2', 'G'),
    'service organization': ('SOC 2 Type II', 'https://www.aicpa.org/resources/landing/soc-2', 'G'),
    'aicpa': ('AICPA Trust Services', 'https://www.aicpa.org/', 'G'),
    'trust services': ('AICPA Trust Services', 'https://www.aicpa.org/', 'G'),

    # NIST CSF
    'nist csf': ('NIST CSF 2.0', 'https://www.nist.gov/cyberframework', 'G'),
    'nist csf 2.0': ('NIST CSF 2.0', 'https://www.nist.gov/cyberframework', 'G'),
    'cybersecurity framework': ('NIST CSF 2.0', 'https://www.nist.gov/cyberframework', 'G'),

    # ISO Standards
    'iso 27001': ('ISO/IEC 27001', 'https://www.iso.org/standard/27001', 'P'),
    'iso/iec 27001': ('ISO/IEC 27001', 'https://www.iso.org/standard/27001', 'P'),
    'isms': ('ISO/IEC 27001', 'https://www.iso.org/standard/27001', 'P'),
    'iso 27002': ('ISO/IEC 27002', 'https://www.iso.org/standard/75652.html', 'P'),
    'iso/iec 27002': ('ISO/IEC 27002', 'https://www.iso.org/standard/75652.html', 'P'),
    'iso 27017': ('ISO/IEC 27017', 'https://www.iso.org/standard/43757.html', 'P'),
    'iso/iec 27017': ('ISO/IEC 27017', 'https://www.iso.org/standard/43757.html', 'P'),
    'cloud security': ('ISO/IEC 27017', 'https://www.iso.org/standard/43757.html', 'P'),
    'iso 27018': ('ISO/IEC 27018', 'https://www.iso.org/standard/76559.html', 'P'),
    'iso/iec 27018': ('ISO/IEC 27018', 'https://www.iso.org/standard/76559.html', 'P'),
    'iso 27701': ('ISO/IEC 27701', 'https://www.iso.org/standard/71670.html', 'P'),
    'iso/iec 27701': ('ISO/IEC 27701', 'https://www.iso.org/standard/71670.html', 'P'),
    'pims': ('ISO/IEC 27701', 'https://www.iso.org/standard/71670.html', 'P'),
    'iso 22301': ('ISO 22301', 'https://www.iso.org/standard/75106.html', 'P'),
    'business continuity': ('ISO 22301', 'https://www.iso.org/standard/75106.html', 'P'),
    'iso 27035': ('ISO/IEC 27035', 'https://www.iso.org/standard/78973.html', 'P'),
    'iso/iec 27035': ('ISO/IEC 27035', 'https://www.iso.org/standard/78973.html', 'P'),
    'incident management': ('ISO/IEC 27035', 'https://www.iso.org/standard/78973.html', 'P'),
    'iso 29147': ('ISO/IEC 29147', 'https://www.iso.org/standard/72311.html', 'P'),
    'iso/iec 29147': ('ISO/IEC 29147', 'https://www.iso.org/standard/72311.html', 'P'),
    'vulnerability disclosure': ('ISO/IEC 29147', 'https://www.iso.org/standard/72311.html', 'P'),

    # PCI DSS
    'pci dss': ('PCI DSS v4.0', 'https://www.pcisecuritystandards.org/', 'G'),
    'pci': ('PCI DSS v4.0', 'https://www.pcisecuritystandards.org/', 'G'),
    'payment card': ('PCI DSS v4.0', 'https://www.pcisecuritystandards.org/', 'G'),

    # CIS Controls
    'cis controls': ('CIS Controls v8', 'https://www.cisecurity.org/controls', 'G'),
    'cis': ('CIS Controls v8', 'https://www.cisecurity.org/controls', 'G'),
    'center for internet security': ('CIS Controls v8', 'https://www.cisecurity.org/controls', 'G'),

    # CCSS
    'ccss': ('CCSS Level III', 'https://cryptoconsortium.org/certifications/ccss/', 'G'),
    'cryptocurrency security standard': ('CCSS', 'https://cryptoconsortium.org/certifications/ccss/', 'G'),

    # Bug Bounty
    'immunefi': ('Immunefi', 'https://immunefi.com/', 'G'),
    'bug bounty': ('Immunefi', 'https://immunefi.com/', 'G'),
    'code4rena': ('Code4rena', 'https://code4rena.com/', 'G'),
    'sherlock': ('Sherlock', 'https://www.sherlock.xyz/', 'G'),

    # Audit Firms
    'trail of bits': ('Trail of Bits', 'https://www.trailofbits.com/', 'G'),
    'spearbit': ('Spearbit', 'https://spearbit.com/', 'G'),
    'openzeppelin': ('OpenZeppelin', 'https://www.openzeppelin.com/', 'G'),
    'consensys diligence': ('ConsenSys Diligence', 'https://consensys.net/diligence/', 'G'),
    'audit': ('Security Audit', 'https://ethereum.org/en/developers/docs/smart-contracts/security/', 'G'),

    # Proof of Reserve
    'chainlink por': ('Chainlink PoR', 'https://chain.link/proof-of-reserve', 'G'),
    'proof of reserve': ('Chainlink PoR', 'https://chain.link/proof-of-reserve', 'G'),
    'por': ('Chainlink PoR', 'https://chain.link/proof-of-reserve', 'G'),

    # Insurance
    'nexus mutual': ('Nexus Mutual', 'https://nexusmutual.io/', 'G'),
    'insurace': ('InsurAce', 'https://www.insurace.io/', 'G'),
    'insurance': ('Nexus Mutual', 'https://nexusmutual.io/', 'G'),

    # Monitoring
    'forta': ('Forta Network', 'https://forta.org/', 'G'),
    'forta network': ('Forta Network', 'https://forta.org/', 'G'),
    'openzeppelin defender': ('OpenZeppelin Defender', 'https://www.openzeppelin.com/defender', 'G'),
    'defender': ('OpenZeppelin Defender', 'https://www.openzeppelin.com/defender', 'G'),

    # Supply Chain
    'slsa': ('SLSA', 'https://slsa.dev/', 'G'),
    'supply chain': ('SLSA', 'https://slsa.dev/', 'G'),
    'sigstore': ('Sigstore', 'https://www.sigstore.dev/', 'G'),
    'cosign': ('Sigstore/Cosign', 'https://www.sigstore.dev/', 'G'),
    'sbom': ('SBOM (SPDX/CycloneDX)', 'https://www.cisa.gov/sbom', 'G'),
    'spdx': ('SPDX', 'https://spdx.dev/', 'G'),
    'cyclonedx': ('CycloneDX', 'https://cyclonedx.org/', 'G'),
    'openssf': ('OpenSSF Scorecard', 'https://securityscorecards.dev/', 'G'),
    'scorecard': ('OpenSSF Scorecard', 'https://securityscorecards.dev/', 'G'),
    'reproducible build': ('Reproducible Builds', 'https://reproducible-builds.org/', 'G'),

    # Formal Verification
    'certora': ('Certora Prover', 'https://www.certora.com/', 'G'),
    'formal verification': ('Formal Verification', 'https://ethereum.org/en/developers/docs/smart-contracts/formal-verification/', 'G'),
    'k framework': ('Runtime Verification (K)', 'https://runtimeverification.com/', 'G'),
    'kevm': ('KEVM', 'https://github.com/runtimeverification/evm-semantics', 'G'),
    'echidna': ('Echidna', 'https://github.com/crytic/echidna', 'G'),
    'foundry': ('Foundry', 'https://book.getfoundry.sh/', 'G'),
    'fuzzing': ('Echidna/Foundry', 'https://github.com/crytic/echidna', 'G'),

    # EU Regulations
    'mica': ('MiCA (EU)', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1114', 'G'),
    'markets in crypto': ('MiCA (EU)', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1114', 'G'),
    'dora': ('DORA (EU)', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32022R2554', 'G'),
    'digital operational resilience': ('DORA (EU)', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32022R2554', 'G'),
    'gdpr': ('GDPR', 'https://gdpr.eu/', 'G'),
    'data protection': ('GDPR', 'https://gdpr.eu/', 'G'),

    # International Regulations
    'fatf': ('FATF Travel Rule', 'https://www.fatf-gafi.org/', 'G'),
    'travel rule': ('FATF Travel Rule', 'https://www.fatf-gafi.org/', 'G'),
    'aml': ('FATF AML/CFT', 'https://www.fatf-gafi.org/', 'G'),
    'kyc': ('FATF KYC', 'https://www.fatf-gafi.org/', 'G'),

    # Regional Regulations
    'vara': ('VARA (Dubai)', 'https://www.vara.ae/', 'G'),
    'mas': ('MAS (Singapore)', 'https://www.mas.gov.sg/', 'G'),
    'jfsa': ('JFSA (Japan)', 'https://www.fsa.go.jp/en/', 'G'),
    'fca': ('FCA (UK)', 'https://www.fca.org.uk/', 'G'),
    'sec': ('SEC (USA)', 'https://www.sec.gov/', 'G'),
    'cftc': ('CFTC (USA)', 'https://www.cftc.gov/', 'G'),

    # BSI
    'bsi': ('BSI IT-Grundschutz', 'https://www.bsi.bund.de/', 'G'),
    'it-grundschutz': ('BSI IT-Grundschutz', 'https://www.bsi.bund.de/', 'G'),

    # OWASP
    'owasp': ('OWASP Top 10', 'https://owasp.org/www-project-top-ten/', 'G'),
    'owasp top 10': ('OWASP Top 10', 'https://owasp.org/www-project-top-ten/', 'G'),
}

# E-PILLAR: Efficiency (Usability & Accessibility)
E_STANDARDS = {
    # Accessibility
    'wcag': ('WCAG 2.1/2.2 AA', 'https://www.w3.org/WAI/WCAG21/quickref/', 'G'),
    'wcag 2.1': ('WCAG 2.1 AA', 'https://www.w3.org/WAI/WCAG21/quickref/', 'G'),
    'wcag 2.2': ('WCAG 2.2 AA', 'https://www.w3.org/TR/WCAG22/', 'G'),
    'accessibility': ('WCAG 2.1/2.2 AA', 'https://www.w3.org/WAI/WCAG21/quickref/', 'G'),
    'en 301 549': ('EN 301 549', 'https://www.etsi.org/deliver/etsi_en/301500_301599/301549/', 'G'),
    'rgaa': ('RGAA 4.1', 'https://www.numerique.gouv.fr/publications/rgaa-accessibilite/', 'G'),

    # ISO Usability
    'iso 9241': ('ISO 9241-110/210', 'https://www.iso.org/standard/77520.html', 'P'),
    'iso 9241-110': ('ISO 9241-110', 'https://www.iso.org/standard/77520.html', 'P'),
    'iso 9241-210': ('ISO 9241-210', 'https://www.iso.org/standard/77520.html', 'P'),
    'human-centered': ('ISO 9241-210', 'https://www.iso.org/standard/77520.html', 'P'),
    'ergonomics': ('ISO 9241', 'https://www.iso.org/standard/77520.html', 'P'),
    'iso 25010': ('ISO 25010/25023', 'https://www.iso.org/standard/35733.html', 'P'),
    'software quality': ('ISO 25010', 'https://www.iso.org/standard/35733.html', 'P'),

    # Ethereum EIPs/ERCs
    'erc-20': ('ERC-20', 'https://eips.ethereum.org/EIPS/eip-20', 'G'),
    'erc20': ('ERC-20', 'https://eips.ethereum.org/EIPS/eip-20', 'G'),
    'eip-20': ('ERC-20', 'https://eips.ethereum.org/EIPS/eip-20', 'G'),
    'erc-721': ('ERC-721', 'https://eips.ethereum.org/EIPS/eip-721', 'G'),
    'erc721': ('ERC-721', 'https://eips.ethereum.org/EIPS/eip-721', 'G'),
    'eip-721': ('ERC-721', 'https://eips.ethereum.org/EIPS/eip-721', 'G'),
    'nft': ('ERC-721', 'https://eips.ethereum.org/EIPS/eip-721', 'G'),
    'erc-1155': ('ERC-1155', 'https://eips.ethereum.org/EIPS/eip-1155', 'G'),
    'erc1155': ('ERC-1155', 'https://eips.ethereum.org/EIPS/eip-1155', 'G'),
    'eip-1155': ('ERC-1155', 'https://eips.ethereum.org/EIPS/eip-1155', 'G'),
    'multi token': ('ERC-1155', 'https://eips.ethereum.org/EIPS/eip-1155', 'G'),
    'erc-4626': ('ERC-4626', 'https://eips.ethereum.org/EIPS/eip-4626', 'G'),
    'erc4626': ('ERC-4626', 'https://eips.ethereum.org/EIPS/eip-4626', 'G'),
    'tokenized vault': ('ERC-4626', 'https://eips.ethereum.org/EIPS/eip-4626', 'G'),
    'erc-6551': ('ERC-6551', 'https://eips.ethereum.org/EIPS/eip-6551', 'G'),
    'token bound': ('ERC-6551', 'https://eips.ethereum.org/EIPS/eip-6551', 'G'),
    'eip-712': ('EIP-712', 'https://eips.ethereum.org/EIPS/eip-712', 'G'),
    'eip712': ('EIP-712', 'https://eips.ethereum.org/EIPS/eip-712', 'G'),
    'typed signing': ('EIP-712', 'https://eips.ethereum.org/EIPS/eip-712', 'G'),
    'typed data': ('EIP-712', 'https://eips.ethereum.org/EIPS/eip-712', 'G'),
    'eip-1559': ('EIP-1559', 'https://eips.ethereum.org/EIPS/eip-1559', 'G'),
    'eip1559': ('EIP-1559', 'https://eips.ethereum.org/EIPS/eip-1559', 'G'),
    'fee market': ('EIP-1559', 'https://eips.ethereum.org/EIPS/eip-1559', 'G'),
    'base fee': ('EIP-1559', 'https://eips.ethereum.org/EIPS/eip-1559', 'G'),
    'eip-4337': ('EIP-4337', 'https://eips.ethereum.org/EIPS/eip-4337', 'G'),
    'eip4337': ('EIP-4337', 'https://eips.ethereum.org/EIPS/eip-4337', 'G'),
    'account abstraction': ('EIP-4337', 'https://eips.ethereum.org/EIPS/eip-4337', 'G'),
    'useroperation': ('EIP-4337', 'https://eips.ethereum.org/EIPS/eip-4337', 'G'),
    'eip-2612': ('EIP-2612', 'https://eips.ethereum.org/EIPS/eip-2612', 'G'),
    'eip2612': ('EIP-2612', 'https://eips.ethereum.org/EIPS/eip-2612', 'G'),
    'permit': ('EIP-2612', 'https://eips.ethereum.org/EIPS/eip-2612', 'G'),
    'eip-4361': ('EIP-4361', 'https://eips.ethereum.org/EIPS/eip-4361', 'G'),
    'eip4361': ('EIP-4361', 'https://eips.ethereum.org/EIPS/eip-4361', 'G'),
    'siwe': ('EIP-4361 SIWE', 'https://eips.ethereum.org/EIPS/eip-4361', 'G'),
    'sign-in with ethereum': ('EIP-4361 SIWE', 'https://eips.ethereum.org/EIPS/eip-4361', 'G'),
    'eip-6963': ('EIP-6963', 'https://eips.ethereum.org/EIPS/eip-6963', 'G'),
    'eip6963': ('EIP-6963', 'https://eips.ethereum.org/EIPS/eip-6963', 'G'),
    'multi injected provider': ('EIP-6963', 'https://eips.ethereum.org/EIPS/eip-6963', 'G'),
    'erc-6900': ('ERC-6900', 'https://eips.ethereum.org/EIPS/eip-6900', 'G'),
    'erc6900': ('ERC-6900', 'https://eips.ethereum.org/EIPS/eip-6900', 'G'),
    'erc-7579': ('ERC-7579', 'https://eips.ethereum.org/EIPS/eip-7579', 'G'),
    'erc7579': ('ERC-7579', 'https://eips.ethereum.org/EIPS/eip-7579', 'G'),
    'modular account': ('ERC-6900/7579', 'https://eips.ethereum.org/EIPS/eip-6900', 'G'),
    'eip-7702': ('EIP-7702', 'https://eips.ethereum.org/EIPS/eip-7702', 'G'),
    'eip7702': ('EIP-7702', 'https://eips.ethereum.org/EIPS/eip-7702', 'G'),
    'eip-4844': ('EIP-4844', 'https://eips.ethereum.org/EIPS/eip-4844', 'G'),
    'eip4844': ('EIP-4844', 'https://eips.ethereum.org/EIPS/eip-4844', 'G'),
    'blob': ('EIP-4844', 'https://eips.ethereum.org/EIPS/eip-4844', 'G'),
    'proto-danksharding': ('EIP-4844', 'https://eips.ethereum.org/EIPS/eip-4844', 'G'),

    # Bitcoin BIPs
    'bip-173': ('BIP-173', 'https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki', 'G'),
    'bip173': ('BIP-173', 'https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki', 'G'),
    'bech32': ('BIP-173/350', 'https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki', 'G'),
    'bip-350': ('BIP-350', 'https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki', 'G'),
    'bip350': ('BIP-350', 'https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki', 'G'),
    'bech32m': ('BIP-350', 'https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki', 'G'),
    'bip-370': ('BIP-370', 'https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki', 'G'),
    'bip370': ('BIP-370', 'https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki', 'G'),
    'psbt': ('BIP-174/370', 'https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki', 'G'),
    'bip-174': ('BIP-174', 'https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki', 'G'),
    'bip174': ('BIP-174', 'https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki', 'G'),
    'ordinals': ('Ordinals', 'https://docs.ordinals.com/', 'G'),
    'runes': ('Runes', 'https://docs.ordinals.com/runes.html', 'G'),
    'brc-20': ('BRC-20', 'https://domo-2.gitbook.io/brc-20-experiment/', 'G'),

    # Multi-Chain Standards
    'caip-2': ('CAIP-2', 'https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md', 'G'),
    'caip-10': ('CAIP-10', 'https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-10.md', 'G'),
    'caip-25': ('CAIP-25', 'https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-25.md', 'G'),
    'caip': ('CAIP Standards', 'https://github.com/ChainAgnostic/CAIPs', 'G'),
    'chain agnostic': ('CAIP Standards', 'https://github.com/ChainAgnostic/CAIPs', 'G'),
    'walletconnect': ('WalletConnect v2', 'https://docs.walletconnect.com/', 'G'),

    # Layer 2
    'op stack': ('OP Stack', 'https://docs.optimism.io/', 'G'),
    'optimism': ('OP Stack', 'https://docs.optimism.io/', 'G'),
    'arbitrum': ('Arbitrum Orbit', 'https://docs.arbitrum.io/', 'G'),
    'arbitrum orbit': ('Arbitrum Orbit', 'https://docs.arbitrum.io/', 'G'),
    'zkevm': ('zkEVM', 'https://docs.polygon.technology/zkEVM/', 'G'),
    'polygon zkevm': ('Polygon zkEVM', 'https://docs.polygon.technology/zkEVM/', 'G'),
    'zksync': ('zkSync Era', 'https://docs.zksync.io/', 'G'),
    'scroll': ('Scroll zkEVM', 'https://docs.scroll.io/', 'G'),
    'celestia': ('Celestia', 'https://docs.celestia.org/', 'G'),
    'eigenda': ('EigenDA', 'https://docs.eigenlayer.xyz/', 'G'),
    'avail': ('Avail', 'https://docs.availproject.org/', 'G'),

    # Cross-Chain
    'chainlink ccip': ('Chainlink CCIP', 'https://docs.chain.link/ccip', 'G'),
    'ccip': ('Chainlink CCIP', 'https://docs.chain.link/ccip', 'G'),
    'layerzero': ('LayerZero', 'https://docs.layerzero.network/', 'G'),
    'axelar': ('Axelar', 'https://docs.axelar.dev/', 'G'),
    'hyperlane': ('Hyperlane', 'https://docs.hyperlane.xyz/', 'G'),
    'wormhole': ('Wormhole', 'https://docs.wormhole.com/', 'G'),
    'bridge': ('Cross-Chain Bridge', 'https://docs.chain.link/ccip', 'G'),

    # DeFi Protocols
    'gnosis safe': ('Safe (Gnosis)', 'https://docs.safe.global/', 'G'),
    'safe': ('Safe (Gnosis)', 'https://docs.safe.global/', 'G'),
    'multi-sig': ('Safe (Gnosis)', 'https://docs.safe.global/', 'G'),
    'multisig': ('Safe (Gnosis)', 'https://docs.safe.global/', 'G'),
    'uniswap': ('Uniswap v4', 'https://docs.uniswap.org/', 'G'),
    'uniswap v4': ('Uniswap v4 Hooks', 'https://docs.uniswap.org/', 'G'),
    'cow protocol': ('CoW Protocol', 'https://docs.cow.fi/', 'G'),
    '1inch': ('1inch Fusion', 'https://docs.1inch.io/', 'G'),
    '1inch fusion': ('1inch Fusion', 'https://docs.1inch.io/', 'G'),
    'flashbots': ('Flashbots Protect', 'https://docs.flashbots.net/', 'G'),
    'mev protection': ('Flashbots Protect', 'https://docs.flashbots.net/', 'G'),
    'eigenlayer': ('EigenLayer', 'https://docs.eigenlayer.xyz/', 'G'),
    'restaking': ('EigenLayer', 'https://docs.eigenlayer.xyz/', 'G'),
    'aave': ('Aave', 'https://docs.aave.com/', 'G'),
    'compound': ('Compound', 'https://docs.compound.finance/', 'G'),
    'maker': ('MakerDAO', 'https://docs.makerdao.com/', 'G'),
    'lido': ('Lido', 'https://docs.lido.fi/', 'G'),
    'rocket pool': ('Rocket Pool', 'https://docs.rocketpool.net/', 'G'),
    'staking': ('Ethereum Staking', 'https://ethereum.org/en/staking/', 'G'),

    # Oracles
    'chainlink': ('Chainlink', 'https://docs.chain.link/', 'G'),
    'pyth': ('Pyth Network', 'https://docs.pyth.network/', 'G'),
    'chronicle': ('Chronicle', 'https://chroniclelabs.org/', 'G'),
    'oracle': ('Chainlink', 'https://docs.chain.link/', 'G'),

    # Identity
    'worldcoin': ('Worldcoin', 'https://docs.worldcoin.org/', 'G'),
    'polygon id': ('Polygon ID', 'https://devs.polygonid.com/', 'G'),
    'gitcoin passport': ('Gitcoin Passport', 'https://passport.gitcoin.co/', 'G'),
    'eas': ('EAS', 'https://attest.sh/', 'G'),
    'attestation': ('EAS', 'https://attest.sh/', 'G'),
    'farcaster': ('Farcaster', 'https://docs.farcaster.xyz/', 'G'),
    'lens': ('Lens Protocol', 'https://docs.lens.xyz/', 'G'),
    'ens': ('ENS', 'https://docs.ens.domains/', 'G'),
    'unstoppable domains': ('Unstoppable Domains', 'https://docs.unstoppabledomains.com/', 'G'),

    # Account Abstraction Infrastructure
    'biconomy': ('Biconomy', 'https://docs.biconomy.io/', 'G'),
    'pimlico': ('Pimlico', 'https://docs.pimlico.io/', 'G'),
    'stackup': ('Stackup', 'https://docs.stackup.sh/', 'G'),
    'bundler': ('EIP-4337 Bundler', 'https://eips.ethereum.org/EIPS/eip-4337', 'G'),
    'paymaster': ('EIP-4337 Paymaster', 'https://eips.ethereum.org/EIPS/eip-4337', 'G'),
    'gasless': ('EIP-4337', 'https://eips.ethereum.org/EIPS/eip-4337', 'G'),
    'lit protocol': ('Lit Protocol', 'https://developer.litprotocol.com/', 'G'),

    # Hardware Wallets
    'ledger': ('Ledger', 'https://developers.ledger.com/', 'G'),
    'trezor': ('Trezor', 'https://docs.trezor.io/', 'G'),
    'gridplus': ('GridPlus', 'https://docs.gridplus.io/', 'G'),
    'keystone': ('Keystone', 'https://docs.keyst.one/', 'G'),
    'foundation': ('Foundation Devices', 'https://docs.foundationdevices.com/', 'G'),
    'hardware wallet': ('Hardware Wallet', 'https://bitcoin.org/en/secure-your-wallet', 'G'),

    # RWA
    'erc-3643': ('ERC-3643', 'https://eips.ethereum.org/EIPS/eip-3643', 'G'),
    'erc3643': ('ERC-3643', 'https://eips.ethereum.org/EIPS/eip-3643', 'G'),
    'erc-1400': ('ERC-1400', 'https://github.com/ethereum/EIPs/issues/1411', 'G'),
    'erc1400': ('ERC-1400', 'https://github.com/ethereum/EIPs/issues/1411', 'G'),
    'rwa': ('RWA Tokenization', 'https://ethereum.org/en/developers/docs/standards/tokens/', 'G'),
    'security token': ('ERC-1400/3643', 'https://github.com/ethereum/EIPs/issues/1411', 'G'),
}

# Combine all standards by pillar prefix
ALL_STANDARDS = {
    'S': S_STANDARDS,
    'A': A_STANDARDS,
    'F': F_STANDARDS,
    'E': E_STANDARDS,
}


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }


def find_matching_standard(code, title, description=''):
    """Find the best matching official standard for a norm."""
    # Determine pillar from code prefix
    pillar = code[0] if code and code[0] in 'SAFE' else None

    # Get standards for this pillar
    standards = ALL_STANDARDS.get(pillar, {})

    # Combine all text for matching
    search_text = f"{code} {title} {description or ''}".lower()

    # Try to find a match
    best_match = None
    best_score = 0

    for keyword, (std_name, std_link, access_type) in standards.items():
        if keyword in search_text:
            # Score by keyword length (longer = more specific)
            score = len(keyword)
            if score > best_score:
                best_score = score
                best_match = (std_name, std_link, access_type)

    # If no pillar-specific match, try all pillars
    if not best_match:
        for pillar_standards in ALL_STANDARDS.values():
            for keyword, (std_name, std_link, access_type) in pillar_standards.items():
                if keyword in search_text:
                    score = len(keyword)
                    if score > best_score:
                        best_score = score
                        best_match = (std_name, std_link, access_type)

    return best_match


def format_title(std_name, original_title):
    """Format the title with the official standard name."""
    if not std_name:
        return original_title

    # Check if standard name is already in title
    if std_name.lower() in original_title.lower():
        return original_title

    # Check for common patterns and clean up
    cleaned_title = original_title

    # Remove existing standard prefixes that might be wrong
    prefixes_to_remove = [
        r'^[A-Z]+-\d+:\s*',  # Like "FIPS-197: "
        r'^[A-Z]+\s+SP\s+\d+-\d+:\s*',  # Like "NIST SP 800-53: "
        r'^ISO/IEC\s+\d+:\s*',  # Like "ISO/IEC 27001: "
        r'^RFC\s+\d+:\s*',  # Like "RFC 8446: "
        r'^BIP-\d+:\s*',  # Like "BIP-32: "
        r'^EIP-\d+:\s*',  # Like "EIP-712: "
        r'^ERC-\d+:\s*',  # Like "ERC-20: "
    ]

    for pattern in prefixes_to_remove:
        cleaned_title = re.sub(pattern, '', cleaned_title, flags=re.IGNORECASE)

    # Format: "Standard Name: Description"
    return f"{std_name}: {cleaned_title}"


def update_norm(norm_id, new_title, official_link, access_type):
    """Update norm in database."""
    url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"
    headers = get_headers()
    headers['Prefer'] = 'return=minimal'

    data = {'title': new_title}
    if official_link:
        data['official_link'] = official_link
    if access_type:
        data['access_type'] = access_type

    r = requests.patch(url, headers=headers, json=data, timeout=30)
    return r.status_code in [200, 204]


def get_all_norms():
    """Fetch all norms from database."""
    all_norms = []
    offset = 0
    limit = 1000

    while True:
        url = f"{SUPABASE_URL}/rest/v1/norms?select=id,code,title,description,official_link,access_type&order=code&offset={offset}&limit={limit}"
        r = requests.get(url, headers=get_headers(), timeout=30)
        if r.status_code != 200:
            log(f"Error fetching norms: {r.status_code}")
            break

        batch = r.json()
        if not batch:
            break

        all_norms.extend(batch)
        offset += limit

        if len(batch) < limit:
            break

    return all_norms


def main():
    log("=" * 70)
    log("FIX ALL NORMS - FOLLOWING METHODOLOGY")
    log("=" * 70)

    if not all([SUPABASE_URL, SUPABASE_KEY]):
        log("ERROR: Missing environment variables")
        sys.exit(1)

    # Fetch all norms
    log("Fetching all norms...")
    norms = get_all_norms()
    log(f"Total norms: {len(norms)}")

    updated = 0
    matched = 0
    skipped = 0
    errors = 0

    for i, norm in enumerate(norms):
        norm_id = norm['id']
        code = norm['code']
        title = norm['title']
        description = norm.get('description', '')
        current_link = norm.get('official_link')

        # Find matching standard
        match = find_matching_standard(code, title, description)

        if match:
            std_name, std_link, access_type = match
            new_title = format_title(std_name, title)

            # Only update if something changed
            if new_title != title or (not current_link and std_link):
                link_to_use = std_link if not current_link else current_link

                if update_norm(norm_id, new_title, link_to_use, access_type):
                    log(f"[{i+1}/{len(norms)}] OK {code}: {std_name}")
                    updated += 1
                else:
                    log(f"[{i+1}/{len(norms)}] ERR {code}")
                    errors += 1
            else:
                matched += 1
        else:
            skipped += 1

        # Progress every 100
        if (i + 1) % 100 == 0:
            log(f"--- Progress: {i+1}/{len(norms)} ({updated} updated, {matched} already OK, {skipped} no match) ---")

    log("")
    log("=" * 70)
    log(f"COMPLETE:")
    log(f"  - Updated: {updated}")
    log(f"  - Already correct: {matched}")
    log(f"  - No standard match: {skipped}")
    log(f"  - Errors: {errors}")
    log("=" * 70)


if __name__ == '__main__':
    main()
