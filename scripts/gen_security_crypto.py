#!/usr/bin/env python3
"""Generate summaries for Security norms - Cryptography."""

import requests
import sys
import time
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    3896: """## 1. Vue d'ensemble

**P-256 (secp256r1)** est une courbe elliptique standardisée par NIST, utilisée pour ECDSA et ECDH. Bien que populaire dans le monde traditionnel (TLS, passkeys), elle est distincte de secp256k1 utilisée par Bitcoin/Ethereum.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Valeur |
|-----------|--------|
| Taille clé | 256 bits |
| Sécurité équivalente | 128 bits |
| Standard | NIST FIPS 186-4 |
| Equation | y² = x³ - 3x + b (mod p) |
| p | 2²⁵⁶ - 2²²⁴ + 2¹⁹² + 2⁹⁶ - 1 |

**Comparaison:**
| Courbe | Usage | Audit |
|--------|-------|-------|
| secp256r1 | TLS, WebAuthn | NIST standard |
| secp256k1 | Bitcoin, Ethereum | Koblitz, auditable |

## 3. Application aux Produits Crypto

- **WebAuthn/Passkeys** : P-256 requis par FIDO2
- **Apple Secure Enclave** : P-256 native
- **HSMs** : Support universel
- **Bitcoin/Ethereum** : Non utilisé (secp256k1)

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Standard** | Support P-256 pour interop | 100% |
| **Crypto-native** | secp256k1 + P-256 support | 100% |

## 5. Sources et Références

- [NIST FIPS 186-4](https://csrc.nist.gov/publications/detail/fips/186/4/final)
""",

    3897: """## 1. Vue d'ensemble

**P-384 (secp384r1)** offre une sécurité de 192 bits, supérieure à P-256. Utilisée pour applications gouvernementales et haute sécurité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Valeur |
|-----------|--------|
| Taille clé | 384 bits |
| Sécurité | 192 bits |
| Standard | NIST FIPS 186-4 |
| Performance | ~2x plus lent que P-256 |

## 3. Application aux Produits Crypto

- **Rarement utilisé** en crypto grand public
- **Enterprise HSMs** : Support standard
- **Government** : NSA Suite B

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Support pour interop haute sécurité | 100% |

## 5. Sources et Références

- [NIST Recommended Curves](https://csrc.nist.gov/publications/detail/sp/800-186/final)
""",

    3898: """## 1. Vue d'ensemble

**Curve25519** est une courbe elliptique moderne conçue par Daniel J. Bernstein, offrant haute sécurité et performance. Base de X25519 (key exchange) et Ed25519 (signatures).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Valeur |
|-----------|--------|
| Taille clé | 256 bits |
| Sécurité | ~128 bits |
| Designer | Daniel J. Bernstein |
| Equation | y² = x³ + 486662x² + x |

**Algorithmes dérivés:**
| Algorithme | Usage |
|------------|-------|
| X25519 | Key exchange (DH) |
| Ed25519 | Signatures |
| XChaCha20 | Encryption |

**Performance:**
| Operation | Cycles (approx) |
|-----------|-----------------|
| Keygen | 20,000 |
| Sign | 25,000 |
| Verify | 70,000 |

## 3. Application aux Produits Crypto

- **Solana** : Ed25519 pour signatures
- **Monero** : Ed25519 avec modifications
- **WireGuard** : X25519 + ChaCha20
- **Signal Protocol** : X25519

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Ed25519/X25519 native | 100% |
| **Bon** | Support via library | 80% |

## 5. Sources et Références

- [Curve25519 Paper](https://cr.yp.to/ecdh.html)
- [RFC 8032 - EdDSA](https://tools.ietf.org/html/rfc8032)
""",

    3899: """## 1. Vue d'ensemble

**Kyber** est un algorithme de chiffrement post-quantique basé sur les réseaux euclidiens (lattice-based), sélectionné par NIST pour la standardisation. Il résiste aux attaques par ordinateurs quantiques.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Variant | Security Level | Public Key | Ciphertext |
|---------|---------------|------------|------------|
| Kyber-512 | NIST Level 1 | 800 bytes | 768 bytes |
| Kyber-768 | NIST Level 3 | 1,184 bytes | 1,088 bytes |
| Kyber-1024 | NIST Level 5 | 1,568 bytes | 1,568 bytes |

**Standardisation:**
| Status | Date |
|--------|------|
| NIST selection | 2022 |
| FIPS 203 (draft) | 2024 |
| ML-KEM | Renamed standard |

## 3. Application aux Produits Crypto

- **Signal** : PQXDH (Kyber + X25519)
- **Chrome** : Kyber experiments
- **Cloudflare** : Hybrid TLS
- **Crypto wallets** : Future-proofing en cours

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Hybrid PQ (Kyber + classical) | 100% |
| **Préparé** | PQ-ready infrastructure | 70% |
| **Standard** | Classical crypto only | 50% |

## 5. Sources et Références

- [NIST PQC](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [Kyber Specification](https://pq-crystals.org/kyber/)
""",

    3900: """## 1. Vue d'ensemble

**Dilithium** est un algorithme de signature post-quantique basé sur les réseaux euclidiens, sélectionné par NIST. Destiné à remplacer RSA/ECDSA dans un monde post-quantique.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Variant | Security | Public Key | Signature |
|---------|----------|------------|-----------|
| Dilithium2 | Level 2 | 1,312 bytes | 2,420 bytes |
| Dilithium3 | Level 3 | 1,952 bytes | 3,293 bytes |
| Dilithium5 | Level 5 | 2,592 bytes | 4,595 bytes |

**Comparaison taille:**
| Algorithm | Public Key | Signature |
|-----------|------------|-----------|
| Ed25519 | 32 bytes | 64 bytes |
| Dilithium3 | 1,952 bytes | 3,293 bytes |

## 3. Application aux Produits Crypto

- **Future blockchain** : Signatures PQ
- **Impact** : Taille transactions augmentée
- **Recherche** : Agrégation de signatures

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Préparé** | PQ signature research | 100% |
| **Standard** | Classical ECDSA | 70% |

## 5. Sources et Références

- [CRYSTALS-Dilithium](https://pq-crystals.org/dilithium/)
- [NIST FIPS 204 (draft)](https://csrc.nist.gov/pubs/fips/204/ipd)
""",

    3901: """## 1. Vue d'ensemble

**SPHINCS+** est un algorithme de signature post-quantique basé sur les fonctions de hachage (hash-based), offrant une sécurité conservative sans hypothèses de réseau.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Variant | Security | Public Key | Signature |
|---------|----------|------------|-----------|
| SPHINCS+-128s | Level 1 | 32 bytes | 7,856 bytes |
| SPHINCS+-192s | Level 3 | 48 bytes | 16,224 bytes |
| SPHINCS+-256s | Level 5 | 64 bytes | 29,792 bytes |

**Avantages:**
- Basé uniquement sur hash functions
- Sécurité la plus conservative
- Pas d'hypothèses de réseau

**Inconvénients:**
- Signatures très grandes
- Plus lent que Dilithium

## 3. Application aux Produits Crypto

- **Backup option** : Si lattice-based cassé
- **Très long terme** : Archival signatures
- **Recherche** : Combinaisons hybrides

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Préparé** | Alternative PQ disponible | 100% |

## 5. Sources et Références

- [SPHINCS+ Specification](https://sphincs.org/)
""",

    3902: """## 1. Vue d'ensemble

**BLAKE2b** est une fonction de hachage cryptographique moderne, plus rapide que SHA-2 tout en offrant une sécurité équivalente.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | BLAKE2b |
|-----------|---------|
| Output | 1-64 bytes (configurable) |
| Block size | 128 bytes |
| Speed | 3x faster than SHA-256 |
| Security | 256 bits |

**Comparaison:**
| Hash | Speed (cycles/byte) |
|------|---------------------|
| MD5 | 5 |
| SHA-256 | 12 |
| BLAKE2b | 4 |

## 3. Application aux Produits Crypto

- **Zcash** : Utilise BLAKE2b
- **Argon2** : Basé sur BLAKE2b
- **libsodium** : Fonction par défaut

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | BLAKE2b support | 100% |

## 5. Sources et Références

- [BLAKE2](https://www.blake2.net/)
- [RFC 7693](https://tools.ietf.org/html/rfc7693)
""",

    3903: """## 1. Vue d'ensemble

**BLAKE3** est la dernière évolution de BLAKE, offrant des performances exceptionnelles avec parallélisation native et arbre de Merkle intégré.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | BLAKE3 |
|-----------|--------|
| Output | Variable (default 256 bits) |
| Block size | 64 bytes |
| Speed | 10x+ faster than SHA-256 |
| Parallelism | Native SIMD + multi-core |

**Features:**
- Streaming mode
- Keyed hashing
- KDF mode
- XOF (extendable output)

## 3. Application aux Produits Crypto

- **Emerging** : Adoption en cours
- **Rust ecosystem** : Populaire
- **File integrity** : Performant

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | BLAKE3 support | 100% |

## 5. Sources et Références

- [BLAKE3 GitHub](https://github.com/BLAKE3-team/BLAKE3)
""",

    3904: """## 1. Vue d'ensemble

**scrypt** est une fonction de dérivation de clé (KDF) conçue pour être memory-hard, rendant les attaques par GPU/ASIC coûteuses.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Recommandation |
|-----------|----------------|
| N (CPU/memory cost) | 2^20 (1MB) |
| r (block size) | 8 |
| p (parallelism) | 1 |
| dkLen | 32 bytes |

**Memory requirements:**
| N | Memory |
|---|--------|
| 2^14 | 16 MB |
| 2^17 | 128 MB |
| 2^20 | 1 GB |

## 3. Application aux Produits Crypto

- **Litecoin** : PoW algorithm
- **Wallet encryption** : Alternative à Argon2
- **Password hashing** : Héritage

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | High memory scrypt | 100% |
| **Standard** | Moderate parameters | 70% |

## 5. Sources et Références

- [RFC 7914](https://tools.ietf.org/html/rfc7914)
""",

    3905: """## 1. Vue d'ensemble

**bcrypt** est une fonction de hachage de mots de passe basée sur Blowfish, avec un facteur de coût ajustable. Standard éprouvé depuis 1999.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Paramètre | Valeur |
|-----------|--------|
| Output | 60 caractères |
| Salt | 128 bits (intégré) |
| Cost factor | 10-14 recommandé |
| Max password | 72 bytes |

**Cost factor timing:**
| Cost | Time (approx) |
|------|---------------|
| 10 | 100ms |
| 12 | 400ms |
| 14 | 1.5s |

## 3. Application aux Produits Crypto

- **Web backends** : Standard historique
- **Legacy systems** : Toujours valide
- **Limitation** : 72 bytes max

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Bon** | bcrypt cost 12+ | 80% |
| **Maximum** | Argon2id preferred | 100% |

## 5. Sources et Références

- [Provos & Mazieres Paper](https://www.usenix.org/legacy/event/usenix99/provos/provos.pdf)
""",

    3914: """## 1. Vue d'ensemble

**EIP-2612 Permit** permet les approvals de tokens ERC-20 par signature off-chain, éliminant le besoin d'une transaction on-chain pour approve().

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Function | Description |
|----------|-------------|
| permit() | EIP-712 signed approval |
| nonces() | Replay protection |
| DOMAIN_SEPARATOR | Chain binding |

**Signature structure:**
```solidity
Permit(address owner, address spender, uint256 value, uint256 nonce, uint256 deadline)
```

## 3. Application aux Produits Crypto

- **USDC, DAI** : Permit natif
- **Uniswap** : Permit2 (extension)
- **Gas savings** : 1 tx vs 2

**Risque:**
- Phishing par signature permit

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Permit support + warnings | 100% |
| **Standard** | Legacy approve() | 70% |

## 5. Sources et Références

- [EIP-2612](https://eips.ethereum.org/EIPS/eip-2612)
""",

    3915: """## 1. Vue d'ensemble

**EIP-4626 Tokenized Vaults** standardise les vaults de rendement (yield vaults), permettant l'interopérabilité entre protocoles DeFi.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Function | Description |
|----------|-------------|
| deposit() | Déposer underlying |
| withdraw() | Retirer underlying |
| totalAssets() | Total AUM |
| convertToShares() | Calcul shares |
| convertToAssets() | Calcul assets |

**Adoption:**
| Protocol | EIP-4626 |
|----------|----------|
| Yearn v3 | ✓ |
| Aave | ✓ |
| Compound | ✓ |

## 3. Application aux Produits Crypto

- **DeFi composability** : Standard universel
- **Yield aggregators** : Integration simplifiée
- **Portfolio tracking** : Lecture standardisée

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Full EIP-4626 compliance | 100% |

## 5. Sources et Références

- [EIP-4626](https://eips.ethereum.org/EIPS/eip-4626)
""",

    3917: """## 1. Vue d'ensemble

**EIP-6551 Token Bound Accounts** permet aux NFTs de posséder leur propre compte Ethereum, capable de détenir des assets et d'interagir avec des dApps.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Component | Description |
|-----------|-------------|
| Registry | Déploiement TBA |
| Account | Smart wallet per NFT |
| Token ID | Determines address |

**Features:**
- NFT peut posséder tokens/NFTs
- Historique on-chain
- Composabilité gaming

## 3. Application aux Produits Crypto

- **Gaming NFTs** : Inventaire on-chain
- **Profile NFTs** : Identité avec assets
- **Composability** : NFT bundles

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | TBA support + display | 100% |
| **Standard** | Basic NFT support | 60% |

## 5. Sources et Références

- [EIP-6551](https://eips.ethereum.org/EIPS/eip-6551)
- [Tokenbound](https://tokenbound.org/)
""",

    3920: """## 1. Vue d'ensemble

**EIP-1271 Contract Signatures** standardise la vérification de signatures par smart contracts, essentiel pour les smart contract wallets.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Function | Description |
|----------|-------------|
| isValidSignature(hash, signature) | Returns magic value |
| Magic value | 0x1626ba7e |

**Implementation:**
```solidity
function isValidSignature(bytes32 hash, bytes signature)
    returns (bytes4 magicValue)
```

## 3. Application aux Produits Crypto

- **Gnosis Safe** : Signature validation
- **Argent** : Wallet signatures
- **ERC-4337** : Smart accounts

**Usage:**
| Protocol | EIP-1271 |
|----------|----------|
| OpenSea | ✓ |
| Uniswap | ✓ |
| 1inch | ✓ |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Full EIP-1271 support | 100% |
| **Standard** | EOA signatures only | 60% |

## 5. Sources et Références

- [EIP-1271](https://eips.ethereum.org/EIPS/eip-1271)
""",

    3925: """## 1. Vue d'ensemble

**WebAuthn/FIDO2** est le standard moderne pour l'authentification sans mot de passe, utilisant la cryptographie à clé publique avec des hardware security keys ou des passkeys.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Component | Description |
|-----------|-------------|
| Authenticator | Hardware key ou platform |
| Relying Party | Service/website |
| Credential | Public key + metadata |
| Challenge | Nonce for replay protection |

**Types d'authenticateurs:**
| Type | Example |
|------|---------|
| Roaming | YubiKey, Titan |
| Platform | Touch ID, Windows Hello |
| Passkeys | iCloud Keychain, Google |

**Algorithmes:**
| Algorithm | Support |
|-----------|---------|
| ES256 (P-256) | Required |
| RS256 (RSA) | Optional |
| EdDSA | Growing |

## 3. Application aux Produits Crypto

- **CEX login** : Coinbase, Kraken, Binance
- **Passkey wallets** : ZeroDev, Turnkey
- **Hardware** : Ledger FIDO app, YubiKey

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | FIDO2 + hardware key support | 100% |
| **Bon** | Passkey support | 80% |
| **Standard** | TOTP 2FA only | 50% |

## 5. Sources et Références

- [WebAuthn Spec](https://www.w3.org/TR/webauthn-2/)
- [FIDO Alliance](https://fidoalliance.org/)
"""
}

def main():
    print("Saving Security crypto norms...")
    for norm_id, summary in summaries.items():
        url = f'{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}'
        data = {
            'summary': summary,
            'summary_status': 'generated',
            'last_summarized_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }
        resp = requests.patch(url, headers=SUPABASE_HEADERS, json=data)
        print(f'ID {norm_id}: {resp.status_code}')
        time.sleep(0.2)
    print('Done!')

if __name__ == "__main__":
    main()
