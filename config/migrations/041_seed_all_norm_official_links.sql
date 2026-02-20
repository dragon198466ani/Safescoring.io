-- ============================================================
-- Migration 041: Seed ALL Norm Official Links
-- Complete mapping of norms to official documentation sources
-- Date: 2026-01-14
-- ============================================================

-- ============================================================
-- BIP - Bitcoin Improvement Proposals
-- ============================================================
UPDATE norms SET official_link = 'https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%BIP32%' OR code ILIKE '%BIP-32%' OR title ILIKE '%BIP-32%' OR title ILIKE '%hierarchical deterministic%' OR title ILIKE '%HD wallet%');

UPDATE norms SET official_link = 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%BIP39%' OR code ILIKE '%BIP-39%' OR title ILIKE '%BIP-39%' OR title ILIKE '%mnemonic%seed%' OR title ILIKE '%24 word%' OR title ILIKE '%12 word%');

UPDATE norms SET official_link = 'https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%BIP44%' OR code ILIKE '%BIP-44%' OR title ILIKE '%BIP-44%' OR title ILIKE '%multi-account%derivation%');

UPDATE norms SET official_link = 'https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%BIP49%' OR code ILIKE '%BIP-49%' OR title ILIKE '%nested SegWit%');

UPDATE norms SET official_link = 'https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%BIP84%' OR code ILIKE '%BIP-84%' OR title ILIKE '%native SegWit%');

UPDATE norms SET official_link = 'https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%BIP85%' OR code ILIKE '%BIP-85%' OR title ILIKE '%deterministic entropy%');

UPDATE norms SET official_link = 'https://github.com/bitcoin/bips/blob/master/bip-0086.mediawiki', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%BIP86%' OR code ILIKE '%BIP-86%' OR title ILIKE '%taproot%key%path%');

UPDATE norms SET official_link = 'https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%BIP141%' OR code ILIKE '%BIP-141%' OR title ILIKE '%segregated witness%');

UPDATE norms SET official_link = 'https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%BIP143%' OR code ILIKE '%BIP-143%' OR title ILIKE '%transaction digest%witness%');

UPDATE norms SET official_link = 'https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%BIP174%' OR code ILIKE '%BIP-174%' OR title ILIKE '%PSBT%' OR title ILIKE '%partially signed%');

UPDATE norms SET official_link = 'https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%BIP340%' OR code ILIKE '%BIP-340%' OR title ILIKE '%schnorr%signature%');

UPDATE norms SET official_link = 'https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%BIP341%' OR code ILIKE '%BIP-341%' OR title ILIKE '%taproot%');

UPDATE norms SET official_link = 'https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%BIP370%' OR code ILIKE '%BIP-370%' OR title ILIKE '%PSBT version 2%');

-- ============================================================
-- SLIP - SatoshiLabs Improvement Proposals
-- ============================================================
UPDATE norms SET official_link = 'https://github.com/satoshilabs/slips/blob/master/slip-0010.md', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%SLIP10%' OR code ILIKE '%SLIP-10%' OR title ILIKE '%SLIP-10%' OR (title ILIKE '%ed25519%' AND title ILIKE '%derivation%'));

UPDATE norms SET official_link = 'https://github.com/satoshilabs/slips/blob/master/slip-0039.md', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%SLIP39%' OR code ILIKE '%SLIP-39%' OR title ILIKE '%SLIP-39%' OR title ILIKE '%shamir%backup%' OR title ILIKE '%shamir%share%');

UPDATE norms SET official_link = 'https://github.com/satoshilabs/slips/blob/master/slip-0044.md', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%SLIP44%' OR code ILIKE '%SLIP-44%' OR title ILIKE '%registered coin type%');

-- ============================================================
-- EIP/ERC - Ethereum Standards
-- ============================================================
UPDATE norms SET official_link = 'https://eips.ethereum.org/EIPS/eip-155', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%EIP155%' OR code ILIKE '%EIP-155%' OR title ILIKE '%replay protection%' OR title ILIKE '%chain id%');

UPDATE norms SET official_link = 'https://eips.ethereum.org/EIPS/eip-191', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%EIP191%' OR code ILIKE '%EIP-191%' OR title ILIKE '%signed data standard%');

UPDATE norms SET official_link = 'https://eips.ethereum.org/EIPS/eip-712', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%EIP712%' OR code ILIKE '%EIP-712%' OR title ILIKE '%typed structured data%' OR title ILIKE '%typed data hashing%');

UPDATE norms SET official_link = 'https://eips.ethereum.org/EIPS/eip-1559', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%EIP1559%' OR code ILIKE '%EIP-1559%' OR title ILIKE '%fee market%' OR title ILIKE '%base fee%');

UPDATE norms SET official_link = 'https://eips.ethereum.org/EIPS/eip-2612', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%EIP2612%' OR code ILIKE '%EIP-2612%' OR title ILIKE '%permit%ERC-20%');

UPDATE norms SET official_link = 'https://eips.ethereum.org/EIPS/eip-2930', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%EIP2930%' OR code ILIKE '%EIP-2930%' OR title ILIKE '%access list%transaction%');

UPDATE norms SET official_link = 'https://eips.ethereum.org/EIPS/eip-4337', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%EIP4337%' OR code ILIKE '%EIP-4337%' OR title ILIKE '%account abstraction%' OR title ILIKE '%smart account%');

UPDATE norms SET official_link = 'https://eips.ethereum.org/EIPS/eip-4844', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%EIP4844%' OR code ILIKE '%EIP-4844%' OR title ILIKE '%proto-danksharding%' OR title ILIKE '%blob transaction%');

UPDATE norms SET official_link = 'https://eips.ethereum.org/EIPS/eip-6963', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%EIP6963%' OR code ILIKE '%EIP-6963%' OR title ILIKE '%multi-injected provider%');

UPDATE norms SET official_link = 'https://eips.ethereum.org/EIPS/eip-20', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%ERC20%' OR code ILIKE '%ERC-20%' OR title ILIKE '%ERC-20%' OR title ILIKE '%fungible token standard%');

UPDATE norms SET official_link = 'https://eips.ethereum.org/EIPS/eip-721', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%ERC721%' OR code ILIKE '%ERC-721%' OR title ILIKE '%ERC-721%' OR title ILIKE '%non-fungible token%' OR title ILIKE '%NFT standard%');

UPDATE norms SET official_link = 'https://eips.ethereum.org/EIPS/eip-1155', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%ERC1155%' OR code ILIKE '%ERC-1155%' OR title ILIKE '%ERC-1155%' OR title ILIKE '%multi-token%');

-- ============================================================
-- NIST Standards
-- ============================================================
UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-38d/final', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%GCM%' OR title ILIKE '%Galois/Counter%' OR title ILIKE '%800-38D%');

UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%NIST%key management%' OR title ILIKE '%800-57%');

UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%DRBG%' OR title ILIKE '%800-90A%' OR title ILIKE '%deterministic random bit%');

UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-90b/final', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%entropy source%800-90%' OR title ILIKE '%800-90B%');

UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-132/final', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%PBKDF%' OR title ILIKE '%password-based key derivation%' OR title ILIKE '%800-132%');

UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-185/final', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%cSHAKE%' OR title ILIKE '%KMAC%' OR title ILIKE '%TupleHash%' OR title ILIKE '%800-185%');

UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-63b/final', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%digital identity%' OR title ILIKE '%authentication%800-63%' OR title ILIKE '%800-63B%');

UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-175b/rev-1/final', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%cryptographic standards%800-175%' OR title ILIKE '%800-175B%');

-- FIPS Standards
UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/fips/140/3/final', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%FIPS 140%' OR title ILIKE '%FIPS-140%' OR title ILIKE '%cryptographic module%validation%');

UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/fips/180/4/final', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%FIPS 180%' OR title ILIKE '%FIPS-180%' OR (title ILIKE '%SHA%' AND title ILIKE '%standard%'));

UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/fips/186/5/final', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%FIPS 186%' OR title ILIKE '%FIPS-186%' OR title ILIKE '%digital signature standard%');

UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/fips/197/final', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%FIPS 197%' OR title ILIKE '%FIPS-197%' OR (title ILIKE '%AES%' AND title ILIKE '%standard%'));

UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/fips/198/1/final', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%FIPS 198%' OR title ILIKE '%FIPS-198%' OR (title ILIKE '%HMAC%' AND title ILIKE '%standard%'));

UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/fips/202/final', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%FIPS 202%' OR title ILIKE '%FIPS-202%' OR (title ILIKE '%SHA-3%' AND title ILIKE '%standard%') OR title ILIKE '%Keccak%');

-- ============================================================
-- RFC - IETF Standards
-- ============================================================
UPDATE norms SET official_link = 'https://datatracker.ietf.org/doc/html/rfc2104', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%RFC 2104%' OR title ILIKE '%RFC2104%' OR (title ILIKE '%HMAC%' AND title ILIKE '%rfc%'));

UPDATE norms SET official_link = 'https://datatracker.ietf.org/doc/html/rfc3447', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%RFC 3447%' OR title ILIKE '%RFC3447%' OR title ILIKE '%PKCS #1%' OR title ILIKE '%PKCS#1%');

UPDATE norms SET official_link = 'https://datatracker.ietf.org/doc/html/rfc4648', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%RFC 4648%' OR title ILIKE '%RFC4648%' OR (title ILIKE '%base64%' AND title ILIKE '%encoding%'));

UPDATE norms SET official_link = 'https://datatracker.ietf.org/doc/html/rfc5869', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%RFC 5869%' OR title ILIKE '%RFC5869%' OR title ILIKE '%HKDF%');

UPDATE norms SET official_link = 'https://datatracker.ietf.org/doc/html/rfc6090', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%RFC 6090%' OR title ILIKE '%RFC6090%' OR title ILIKE '%elliptic curve algorithm%');

UPDATE norms SET official_link = 'https://datatracker.ietf.org/doc/html/rfc6238', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%RFC 6238%' OR title ILIKE '%RFC6238%' OR title ILIKE '%TOTP%' OR title ILIKE '%time-based one-time password%');

UPDATE norms SET official_link = 'https://datatracker.ietf.org/doc/html/rfc6979', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%RFC 6979%' OR title ILIKE '%RFC6979%' OR title ILIKE '%deterministic DSA%' OR title ILIKE '%deterministic ECDSA%');

UPDATE norms SET official_link = 'https://datatracker.ietf.org/doc/html/rfc7515', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%RFC 7515%' OR title ILIKE '%RFC7515%' OR title ILIKE '%JSON Web Signature%' OR title ILIKE '%JWS%');

UPDATE norms SET official_link = 'https://datatracker.ietf.org/doc/html/rfc7516', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%RFC 7516%' OR title ILIKE '%RFC7516%' OR title ILIKE '%JSON Web Encryption%' OR title ILIKE '%JWE%');

UPDATE norms SET official_link = 'https://datatracker.ietf.org/doc/html/rfc7517', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%RFC 7517%' OR title ILIKE '%RFC7517%' OR title ILIKE '%JSON Web Key%' OR title ILIKE '%JWK%');

UPDATE norms SET official_link = 'https://datatracker.ietf.org/doc/html/rfc7518', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%RFC 7518%' OR title ILIKE '%RFC7518%' OR title ILIKE '%JSON Web Algorithm%');

UPDATE norms SET official_link = 'https://datatracker.ietf.org/doc/html/rfc7519', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%RFC 7519%' OR title ILIKE '%RFC7519%' OR title ILIKE '%JSON Web Token%' OR title ILIKE '%JWT%');

UPDATE norms SET official_link = 'https://datatracker.ietf.org/doc/html/rfc7748', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%RFC 7748%' OR title ILIKE '%RFC7748%' OR title ILIKE '%Curve25519%' OR title ILIKE '%X25519%');

UPDATE norms SET official_link = 'https://datatracker.ietf.org/doc/html/rfc8017', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%RFC 8017%' OR title ILIKE '%RFC8017%' OR title ILIKE '%RSA%PKCS%');

UPDATE norms SET official_link = 'https://datatracker.ietf.org/doc/html/rfc8032', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%RFC 8032%' OR title ILIKE '%RFC8032%' OR title ILIKE '%Ed25519%' OR title ILIKE '%EdDSA%');

UPDATE norms SET official_link = 'https://datatracker.ietf.org/doc/html/rfc8446', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%RFC 8446%' OR title ILIKE '%RFC8446%' OR title ILIKE '%TLS 1.3%');

UPDATE norms SET official_link = 'https://datatracker.ietf.org/doc/html/rfc8937', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%RFC 8937%' OR title ILIKE '%RFC8937%' OR title ILIKE '%randomness improvement%');

UPDATE norms SET official_link = 'https://datatracker.ietf.org/doc/html/rfc9000', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%RFC 9000%' OR title ILIKE '%RFC9000%' OR title ILIKE '%QUIC%protocol%');

UPDATE norms SET official_link = 'https://datatracker.ietf.org/doc/html/rfc9106', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%RFC 9106%' OR title ILIKE '%RFC9106%' OR title ILIKE '%Argon2%');

-- ============================================================
-- Post-Quantum Cryptography
-- ============================================================
UPDATE norms SET official_link = 'https://pq-crystals.org/kyber/', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%PQC%KYBER%' OR title ILIKE '%Kyber%' OR title ILIKE '%ML-KEM%');

UPDATE norms SET official_link = 'https://pq-crystals.org/dilithium/', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%PQC%DILITH%' OR title ILIKE '%Dilithium%' OR title ILIKE '%ML-DSA%');

UPDATE norms SET official_link = 'https://sphincs.org/', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%PQC%SPHINCS%' OR title ILIKE '%SPHINCS%' OR title ILIKE '%SLH-DSA%');

UPDATE norms SET official_link = 'https://falcon-sign.info/', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%PQC%FALCON%' OR title ILIKE '%Falcon%signature%' OR title ILIKE '%FN-DSA%');

-- ============================================================
-- Zero-Knowledge Proofs
-- ============================================================
UPDATE norms SET official_link = 'https://eprint.iacr.org/2016/260', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%ZK%GROTH16%' OR title ILIKE '%Groth16%');

UPDATE norms SET official_link = 'https://eprint.iacr.org/2019/953', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%ZK%PLONK%' OR title ILIKE '%PLONK%');

UPDATE norms SET official_link = 'https://eprint.iacr.org/2018/046', access_type = 'G'
WHERE official_link IS NULL AND (code ILIKE '%ZK%STARK%' OR title ILIKE '%STARK%transparent%');

UPDATE norms SET official_link = 'https://eprint.iacr.org/2016/492', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%Bulletproof%' OR code ILIKE '%BULLET%');

UPDATE norms SET official_link = 'https://eprint.iacr.org/2019/1021', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%Halo%recursive%');

-- ============================================================
-- Common Criteria & Certifications
-- ============================================================
UPDATE norms SET official_link = 'https://www.commoncriteriaportal.org/cc/', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%Common Criteria%' OR title ILIKE '%EAL5%' OR title ILIKE '%EAL6%' OR title ILIKE '%EAL7%');

-- ============================================================
-- OWASP Standards
-- ============================================================
UPDATE norms SET official_link = 'https://mas.owasp.org/MASVS/', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%MASVS%' OR title ILIKE '%Mobile Application Security Verification%');

UPDATE norms SET official_link = 'https://owasp.org/www-project-application-security-verification-standard/', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%ASVS%' OR title ILIKE '%Application Security Verification%');

UPDATE norms SET official_link = 'https://owasp.org/www-project-smart-contract-security-verification-standard/', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%SCSVS%' OR title ILIKE '%Smart Contract Security Verification%');

UPDATE norms SET official_link = 'https://owasp.org/www-project-web-security-testing-guide/', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%WSTG%' OR title ILIKE '%Web Security Testing%');

UPDATE norms SET official_link = 'https://owasp.org/www-project-top-ten/', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%OWASP Top 10%' OR title ILIKE '%OWASP Top Ten%');

-- ============================================================
-- Secure Element & Hardware Standards
-- ============================================================
UPDATE norms SET official_link = 'https://globalplatform.org/specs-library/', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%GlobalPlatform%' OR title ILIKE '%Secure Element%' AND title ILIKE '%standard%');

UPDATE norms SET official_link = 'https://www.arm.com/technologies/trustzone', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%TrustZone%' OR (title ILIKE '%TEE%' AND title ILIKE '%ARM%'));

UPDATE norms SET official_link = 'https://fidoalliance.org/specifications/', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%FIDO2%' OR title ILIKE '%WebAuthn%' OR title ILIKE '%FIDO U2F%');

UPDATE norms SET official_link = 'https://www.yubico.com/resources/', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%YubiKey%');

-- ============================================================
-- ISO Standards (Reference only - Paid)
-- ============================================================
UPDATE norms SET official_link = 'https://www.iso.org/standard/27001', access_type = 'P'
WHERE official_link IS NULL AND (title ILIKE '%ISO 27001%' OR title ILIKE '%ISO/IEC 27001%' OR title ILIKE '%ISMS%');

UPDATE norms SET official_link = 'https://www.iso.org/standard/75652.html', access_type = 'P'
WHERE official_link IS NULL AND (title ILIKE '%ISO 27002%' OR title ILIKE '%ISO/IEC 27002%');

UPDATE norms SET official_link = 'https://www.iso.org/standard/43757.html', access_type = 'P'
WHERE official_link IS NULL AND (title ILIKE '%ISO 27017%' OR title ILIKE '%cloud security controls%');

UPDATE norms SET official_link = 'https://www.iso.org/standard/71670.html', access_type = 'P'
WHERE official_link IS NULL AND (title ILIKE '%ISO 27701%' OR title ILIKE '%privacy information management%');

UPDATE norms SET official_link = 'https://www.iso.org/standard/54534.html', access_type = 'P'
WHERE official_link IS NULL AND (title ILIKE '%ISO 15408%' OR title ILIKE '%evaluation criteria%IT%');

-- ============================================================
-- Cryptographic Algorithm Standards
-- ============================================================
UPDATE norms SET official_link = 'https://cr.yp.to/chacha.html', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%ChaCha20%' OR title ILIKE '%ChaCha%stream%');

UPDATE norms SET official_link = 'https://cr.yp.to/nacl.html', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%NaCl%' OR title ILIKE '%TweetNaCl%' OR title ILIKE '%libsodium%');

UPDATE norms SET official_link = 'https://www.blake2.net/', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%BLAKE2%' OR title ILIKE '%BLAKE3%');

UPDATE norms SET official_link = 'https://www.wireguard.com/protocol/', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%WireGuard%');

UPDATE norms SET official_link = 'https://signal.org/docs/specifications/', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%Signal Protocol%' OR title ILIKE '%Double Ratchet%');

-- ============================================================
-- Blockchain & DeFi Standards
-- ============================================================
UPDATE norms SET official_link = 'https://docs.openzeppelin.com/contracts/', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%OpenZeppelin%' OR title ILIKE '%OZ%audit%');

UPDATE norms SET official_link = 'https://consensys.io/diligence/', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%ConsenSys Diligence%');

UPDATE norms SET official_link = 'https://docs.soliditylang.org/', access_type = 'G'
WHERE official_link IS NULL AND (title ILIKE '%Solidity%security%' OR title ILIKE '%Solidity best practice%');

-- ============================================================
-- Summary Statistics
-- ============================================================
DO $$
DECLARE
    total_norms INT;
    with_links INT;
    free_norms INT;
    paid_norms INT;
BEGIN
    SELECT COUNT(*) INTO total_norms FROM norms;
    SELECT COUNT(*) INTO with_links FROM norms WHERE official_link IS NOT NULL;
    SELECT COUNT(*) INTO free_norms FROM norms WHERE access_type = 'G' AND official_link IS NOT NULL;
    SELECT COUNT(*) INTO paid_norms FROM norms WHERE access_type = 'P' AND official_link IS NOT NULL;

    RAISE NOTICE 'Migration 041 complete:';
    RAISE NOTICE '  Total norms: %', total_norms;
    RAISE NOTICE '  With official links: %', with_links;
    RAISE NOTICE '  Free documentation: %', free_norms;
    RAISE NOTICE '  Paid documentation: %', paid_norms;
END $$;
