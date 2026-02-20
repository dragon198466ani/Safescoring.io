#!/usr/bin/env python3
"""Generate summaries for Security standards and BIPs."""

import requests
import sys
import time
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    3906: """## 1. Vue d'ensemble

**BIP-322 Generic Signing** propose un format standard pour signer des messages arbitraires avec n'importe quel type d'adresse Bitcoin (Legacy, SegWit, Taproot).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Address Type | BIP-322 Support |
|--------------|-----------------|
| P2PKH (Legacy) | ✓ |
| P2WPKH (SegWit) | ✓ |
| P2TR (Taproot) | ✓ |
| Multisig | ✓ |

**Format:**
```
to_sign = SHA256(SHA256(message_prefix || message))
signature = SCRIPT_WITNESS format
```

## 3. Application aux Produits Crypto

| Wallet | BIP-322 |
|--------|---------|
| Sparrow | ✓ |
| Bitcoin Core | Partial |
| Hardware | En développement |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Full BIP-322 support | 100% |
| **Legacy** | P2PKH signing only | 60% |

## 5. Sources et Références

- [BIP-322](https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki)
""",

    3907: """## 1. Vue d'ensemble

**BIP-329 Wallet Labels** standardise l'export et l'import des labels de transactions et adresses entre wallets, préservant la confidentialité et l'organisation.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Field | Type |
|-------|------|
| type | "tx" ou "addr" ou "pubkey" |
| ref | txid, address, ou xpub |
| label | string |
| origin | BIP-389 path |

**Format JSON:**
```json
{"type":"tx","ref":"abc123...","label":"Exchange withdrawal"}
{"type":"addr","ref":"bc1q...","label":"Cold storage"}
```

## 3. Application aux Produits Crypto

| Wallet | BIP-329 |
|--------|---------|
| **Sparrow** | ✓ Full |
| **Specter** | ✓ |
| Electrum | Partial |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | BIP-329 import/export | 100% |
| **Basic** | Proprietary labels | 50% |

## 5. Sources et Références

- [BIP-329](https://github.com/bitcoin/bips/blob/master/bip-0329.mediawiki)
""",

    3908: """## 1. Vue d'ensemble

**BIP-352 Silent Payments** permet de recevoir des paiements Bitcoin à une adresse statique publique tout en générant des adresses uniques on-chain, améliorant considérablement la confidentialité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Feature | Description |
|---------|-------------|
| Static address | sp1q... (Bech32m) |
| On-chain | Unique addresses |
| Scanning | Required for receiver |
| Privacy | No address reuse |

**Protocol:**
```
shared_secret = ECDH(sender_privkey, receiver_scankey)
output_pubkey = receiver_spendkey + hash(shared_secret)*G
```

## 3. Application aux Produits Crypto

| Status | Implementation |
|--------|----------------|
| **Cake Wallet** | ✓ First support |
| Bitcoin Core | En développement |
| Hardware wallets | Future |

**Trade-offs:**
| Pro | Con |
|-----|-----|
| Privacy | Scanning required |
| Static address | Higher compute |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Silent Payments support | 100% |
| **Standard** | Traditional addresses | 60% |

## 5. Sources et Références

- [BIP-352](https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki)
""",

    3909: """## 1. Vue d'ensemble

**BIP-380 Miniscript** est un langage de composition pour Bitcoin Script permettant de créer des conditions de dépense complexes de manière analysable et sécurisée.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Feature | Description |
|---------|-------------|
| Composability | Combine conditions |
| Analysis | Spending cost, malleability |
| Safety | Verifiable correctness |
| Compilation | Policy → Script |

**Exemples:**
```
and(pk(A), or(pk(B), after(1000)))
thresh(2, pk(A), pk(B), pk(C))
```

| Fragment | Meaning |
|----------|---------|
| pk(K) | Signature required |
| thresh(k,...) | k-of-n |
| and(X,Y) | Both required |
| or(X,Y) | Either sufficient |
| after(n) | Timelock blocks |

## 3. Application aux Produits Crypto

| Wallet | Miniscript |
|--------|------------|
| **Liana** | ✓ Native |
| **Specter** | ✓ |
| Bitcoin Core | ✓ (descriptor) |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Full Miniscript support | 100% |
| **Basic** | Standard scripts only | 50% |

## 5. Sources et Références

- [BIP-380](https://github.com/bitcoin/bips/blob/master/bip-0380.mediawiki)
- [Miniscript Website](https://bitcoin.sipa.be/miniscript/)
""",

    3911: """## 1. Vue d'ensemble

**BIP-327 MuSig2** est un protocole de signature Schnorr multi-parties permettant de créer une signature agrégée indistinguable d'une signature simple, pour Taproot.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Feature | MuSig2 |
|---------|--------|
| Rounds | 2 (vs 3 for MuSig1) |
| Output | Single 64-byte signature |
| Key aggregation | Single public key |
| Privacy | Indistinguable |

**Protocol:**
1. Nonce exchange (round 1)
2. Partial signature exchange (round 2)
3. Signature aggregation

| Advantage | Description |
|-----------|-------------|
| Privacy | Looks like single-sig |
| Fees | Same as single-sig |
| Space | 64 bytes total |

## 3. Application aux Produits Crypto

| Implementation | Status |
|----------------|--------|
| **Bitcoin Core** | Merged |
| libsecp256k1 | ✓ |
| Hardware wallets | In progress |
| BitBox02 | ✓ |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | MuSig2 native | 100% |
| **Standard** | Traditional multisig | 70% |

## 5. Sources et Références

- [BIP-327](https://github.com/bitcoin/bips/blob/master/bip-0327.mediawiki)
""",

    3926: """## 1. Vue d'ensemble

**ARM TrustZone** est une technologie de sécurité matérielle créant deux mondes isolés (Normal et Secure) sur les processeurs ARM, utilisée dans les smartphones et certains wallets.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| World | Usage |
|-------|-------|
| Secure World | TEE, key storage |
| Normal World | Android, apps |
| Monitor | Switch between worlds |

| Feature | Description |
|---------|-------------|
| Memory isolation | Hardware enforced |
| Peripheral access | Configurable |
| Boot | Secure boot chain |

**TEE Implementations:**
| TEE | Vendor |
|-----|--------|
| OP-TEE | Open source |
| QSEE | Qualcomm |
| Kinibi | Trustonic |

## 3. Application aux Produits Crypto

| Application | Usage |
|-------------|-------|
| Mobile wallets | Key storage |
| Android Keystore | TrustZone backend |
| Biometrics | Secure processing |

| Wallet | TrustZone |
|--------|-----------|
| Trust Wallet | Via Android |
| Samsung Blockchain | Native |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | TrustZone + certified TEE | 100% |
| **Good** | TrustZone basic | 75% |
| **Standard** | No TEE | 40% |

## 5. Sources et Références

- [ARM TrustZone](https://www.arm.com/technologies/trustzone-for-cortex-a)
""",

    3927: """## 1. Vue d'ensemble

**Intel SGX** (Software Guard Extensions) crée des enclaves sécurisées dans le processeur pour exécuter du code sensible de manière isolée, même de l'OS.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Feature | SGX |
|---------|-----|
| Enclave size | Up to 256 MB |
| Memory encryption | Hardware AES |
| Attestation | Remote verification |
| Sealing | Persistent storage |

| Generation | Max Enclave |
|------------|-------------|
| SGX1 | 128 MB |
| SGX2 | 1 GB+ (dynamic) |

**Attestation types:**
| Type | Description |
|------|-------------|
| EPID | Group signatures |
| DCAP | Data Center Attestation |

## 3. Application aux Produits Crypto

| Service | SGX Usage |
|---------|-----------|
| **Fireblocks** | MPC in SGX |
| **Fortanix** | Key management |
| **Anjuna** | Confidential computing |

**Limitations:**
- Side-channel attacks (Spectre-like)
- Intel trust required
- Attestation service

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Good** | SGX with attestation | 80% |
| **Limited** | SGX basic | 60% |
| **Alternative** | SE preferred | 90% |

## 5. Sources et Références

- [Intel SGX](https://www.intel.com/content/www/us/en/developer/tools/software-guard-extensions/overview.html)
""",

    3929: """## 1. Vue d'ensemble

**TPM 2.0** (Trusted Platform Module) est un coprocesseur cryptographique standardisé pour le stockage sécurisé de clés et les mesures d'intégrité système.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Feature | TPM 2.0 |
|---------|---------|
| Key storage | Hardware-protected |
| PCRs | Platform Configuration Registers |
| Algorithms | RSA, ECC, AES, SHA |
| Standard | ISO/IEC 11889 |

| Form Factor | Description |
|-------------|-------------|
| Discrete | Separate chip |
| Firmware | fTPM (ARM TrustZone) |
| Integrated | Intel PTT |

**Operations:**
| Operation | Purpose |
|-----------|---------|
| Seal/Unseal | Bind to platform state |
| Quote | Remote attestation |
| NVRAM | Persistent storage |

## 3. Application aux Produits Crypto

| Use Case | Application |
|----------|-------------|
| Disk encryption | BitLocker |
| Key storage | Windows Hello |
| Attestation | Platform integrity |

**Crypto relevance:**
- Not designed for crypto wallets
- Can protect wallet encryption key
- FIDO2 keys (limited)

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Good** | TPM 2.0 + proper use | 70% |
| **Better** | Dedicated SE preferred | 90% |

## 5. Sources et Références

- [TCG TPM 2.0 Spec](https://trustedcomputinggroup.org/resource/tpm-library-specification/)
""",

    3930: """## 1. Vue d'ensemble

**Apple Secure Enclave** est un coprocesseur de sécurité dans les appareils Apple, isolé du processeur principal, gérant les opérations cryptographiques sensibles.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Feature | Secure Enclave |
|---------|----------------|
| Processor | Dedicated ARM core |
| Memory | Encrypted, isolated |
| Key storage | Hardware-bound |
| Boot | Separate secure boot |

| Generation | Features |
|------------|----------|
| A7-A11 | Basic SE |
| A12+ | 2nd gen SE |
| M1+ | Advanced SE |

**Cryptographic operations:**
| Operation | Support |
|-----------|---------|
| ECDSA P-256 | ✓ |
| AES-256 | ✓ |
| Key generation | ✓ |
| Key export | ✗ (by design) |

## 3. Application aux Produits Crypto

| App | Secure Enclave |
|-----|----------------|
| **iOS Wallets** | Face ID/Touch ID |
| Passkeys | WebAuthn keys |
| Apple Pay | Payment keys |

**Limitations:**
- Keys cannot be exported
- P-256 only (not secp256k1)
- Apple ecosystem only

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | SE for biometrics + encryption | 100% |
| **Good** | SE basic usage | 80% |

## 5. Sources et Références

- [Apple Platform Security](https://support.apple.com/guide/security/)
""",

    4061: """## 1. Vue d'ensemble

**DORA** (Digital Operational Resilience Act) est le règlement européen sur la résilience opérationnelle numérique pour le secteur financier, applicable dès janvier 2025.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Pilier | Exigence |
|--------|----------|
| ICT Risk Management | Framework obligatoire |
| Incident Reporting | 24h/72h notification |
| Testing | TLPT obligatoire |
| Third-party Risk | Oversight regime |

| Timeline | Milestone |
|----------|-----------|
| Jan 2023 | Entrée en vigueur |
| Jan 2025 | Application |

**Entités concernées:**
| Type | Included |
|------|----------|
| Banks | ✓ |
| Investment firms | ✓ |
| Crypto-asset service providers | ✓ (MiCA) |
| ICT third-party providers | ✓ (critical) |

## 3. Application aux Produits Crypto

| Entity | DORA Impact |
|--------|-------------|
| EU exchanges | Full compliance |
| Custody providers | Full compliance |
| DeFi | TBD (decentralization test) |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | DORA compliant | 100% |
| **In Progress** | Compliance roadmap | 70% |
| **Non-EU** | Not applicable | N/A |

## 5. Sources et Références

- [DORA Regulation](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2554)
""",

    4062: """## 1. Vue d'ensemble

**NIS2** (Network and Information Security Directive 2) renforce les exigences de cybersécurité pour les infrastructures critiques et importantes dans l'UE.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Category | Requirements |
|----------|--------------|
| Essential | Stricter rules |
| Important | Standard rules |
| Digital Infrastructure | Included |

| Requirement | Description |
|-------------|-------------|
| Risk management | Policies obligatoires |
| Incident reporting | 24h early warning |
| Supply chain | Security requirements |
| Encryption | Required measures |

**Sanctions:**
| Severity | Fine |
|----------|------|
| Essential entities | €10M or 2% turnover |
| Important entities | €7M or 1.4% turnover |

## 3. Application aux Produits Crypto

| Service | NIS2 Scope |
|---------|------------|
| Large exchanges | Potentially essential |
| Custody services | Potentially important |
| DeFi protocols | Unclear |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | NIS2 compliant | 100% |
| **Progress** | Compliance roadmap | 70% |

## 5. Sources et Références

- [NIS2 Directive](https://eur-lex.europa.eu/eli/dir/2022/2555)
""",

    4066: """## 1. Vue d'ensemble

**ANSSI SecNumCloud** est la qualification française pour les services cloud de confiance, garantissant un haut niveau de sécurité et de souveraineté des données.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Niveau | Exigence |
|--------|----------|
| SecNumCloud 3.2 | Current version |
| ISO 27001 | Prerequisite |
| Data location | France/EU |
| Sovereignty | French law only |

| Requirement | Description |
|-------------|-------------|
| Physical security | Tier 3+ datacenter |
| Access control | Strong authentication |
| Encryption | Data at rest/transit |
| Audit | Annual assessment |

## 3. Application aux Produits Crypto

| Service | Relevance |
|---------|-----------|
| French custody | May require |
| Government clients | Required |
| EU sovereignty | Aligned |

| Provider | SecNumCloud |
|----------|-------------|
| OVHcloud | ✓ |
| Outscale | ✓ |
| Scaleway | In progress |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | SecNumCloud qualified | 100% |
| **Alternative** | ISO 27001 | 70% |

## 5. Sources et Références

- [ANSSI SecNumCloud](https://www.ssi.gouv.fr/entreprise/qualifications/secnumcloud/)
""",

    4067: """## 1. Vue d'ensemble

**ANSSI CSPN** (Certification de Sécurité de Premier Niveau) est une certification française de sécurité pour les produits IT, plus accessible que les Critères Communs.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Aspect | CSPN |
|--------|------|
| Duration | 2-3 months |
| Cost | ~€30-50k |
| Scope | Product-specific |
| Validity | 3 years |

**Comparison:**
| Aspect | CSPN | CC |
|--------|------|-----|
| Time | Shorter | Long |
| Cost | Lower | Higher |
| Recognition | France | International |

## 3. Application aux Produits Crypto

| Product Type | CSPN |
|--------------|------|
| Hardware wallets | Applicable |
| Crypto software | Applicable |
| HSMs | CC preferred |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Good** | CSPN certified | 85% |
| **Better** | CC certified | 100% |

## 5. Sources et Références

- [ANSSI CSPN](https://www.ssi.gouv.fr/entreprise/produits-certifies/produits-certifies-cspn/)
""",

    4072: """## 1. Vue d'ensemble

**BSI C5** (Cloud Computing Compliance Criteria Catalogue) est le standard allemand pour la sécurité des services cloud, reconnu en Europe.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Domain | Controls |
|--------|----------|
| Organization | OIS-01 to OIS-08 |
| Personnel | HRS-01 to HRS-07 |
| Asset Management | ASM-01 to ASM-04 |
| Physical Security | PHY-01 to PHY-05 |
| Operations | OPS-01 to OPS-23 |
| Identity/Access | IDM-01 to IDM-11 |

| Attestation Type | Description |
|------------------|-------------|
| Type 1 | Design assessment |
| Type 2 | Operating effectiveness |

## 3. Application aux Produits Crypto

| Use Case | Relevance |
|----------|-----------|
| German market | Required |
| EU expansion | Valuable |
| Cloud custody | Applicable |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | C5 Type 2 attestation | 100% |
| **Good** | C5 Type 1 | 75% |

## 5. Sources et Références

- [BSI C5](https://www.bsi.bund.de/EN/Themen/Unternehmen-und-Organisationen/Informationen-und-Empfehlungen/Empfehlungen-nach-Angriffszielen/Cloud-Computing/Kriterienkatalog-C5/kriterienkatalog-c5_node.html)
"""
}

def main():
    print("Saving Security standards and BIPs...")
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
