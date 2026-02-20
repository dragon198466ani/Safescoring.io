#!/usr/bin/env python3
"""Generate summaries for Adversity privacy norms."""

import requests
import sys
import time
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    3931: """## 1. Vue d'ensemble

**CoinJoin** est une technique de mélange de transactions Bitcoin où plusieurs utilisateurs combinent leurs inputs en une seule transaction, rendant difficile le traçage des fonds.

CoinJoin améliore la fongibilité de Bitcoin sans modification du protocole.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Implementation | Coordination | Anonymity Set |
|----------------|--------------|---------------|
| Wasabi 2.0 | WabiSabi | 100-150 |
| JoinMarket | P2P | Variable |
| Samourai Whirlpool | Centralisé | 5 (fixed) |

**WabiSabi (Wasabi 2.0):**
| Feature | Description |
|---------|-------------|
| Keyed-verification | Blind signatures |
| Variable amounts | Flexible denominations |
| Privacy | Coordinator can't link |

## 3. Application aux Produits Crypto

| Wallet | CoinJoin |
|--------|----------|
| **Wasabi** | WabiSabi natif |
| **Samourai** | Whirlpool (defunct) |
| **JoinMarket** | P2P mixing |
| **Sparrow** | Via Whirlpool |

**Risques:**
- Coordinator centralisé
- Regulatory scrutiny
- Tainted coins

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | CoinJoin natif + large anonymity set | 100% |
| **Bon** | Integration externe | 70% |
| **Standard** | Pas de mixing | 40% |

## 5. Sources et Références

- [WabiSabi Protocol](https://github.com/zkSNACKs/WabiSabi)
""",

    3932: """## 1. Vue d'ensemble

**PayJoin (P2EP)** est une technique de confidentialité Bitcoin où payeur et destinataire contribuent tous deux des inputs, cassant les heuristiques d'analyse de blockchain.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| BIP | Name | Status |
|-----|------|--------|
| BIP-78 | Payjoin | Final |
| BIP-79 | Bustapay | Withdrawn |

**Mechanism:**
1. Receiver generates PSBT avec ses inputs
2. Sender ajoute ses inputs
3. Transaction indistinguable

## 3. Application aux Produits Crypto

| Wallet | PayJoin |
|--------|---------|
| **BTCPay Server** | ✓ |
| **Sparrow** | ✓ |
| **Wasabi** | ✓ |
| **JoinMarket** | ✓ |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | PayJoin support natif | 100% |
| **Standard** | No PayJoin | 50% |

## 5. Sources et Références

- [BIP-78](https://github.com/bitcoin/bips/blob/master/bip-0078.mediawiki)
""",

    3933: """## 1. Vue d'ensemble

**Confidential Transactions** cachent les montants des transactions tout en permettant la vérification de l'absence de création de monnaie, utilisant les Pedersen commitments.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Implementation | Blockchain |
|----------------|------------|
| CT original | Elements/Liquid |
| MimbleWimble | Grin, Beam |
| RingCT | Monero |

**Pedersen commitment:**
```
C = rG + vH
où r = blinding factor, v = amount
```

**Overhead:**
| Data | Size increase |
|------|---------------|
| Range proof | ~2.5 KB (Bulletproofs) |
| Commitment | 33 bytes |

## 3. Application aux Produits Crypto

| Asset | CT Support |
|-------|------------|
| L-BTC (Liquid) | ✓ |
| Monero | RingCT |
| Grin | MimbleWimble |
| Bitcoin | ✗ (layer 2) |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | CT native | 100% |
| **Via L2** | Liquid support | 70% |
| **Standard** | Public amounts | 40% |

## 5. Sources et Références

- [CT Paper](https://elementsproject.org/features/confidential-transactions)
""",

    3934: """## 1. Vue d'ensemble

**Ring Signatures** permettent à un membre d'un groupe de signer un message de manière anonyme, sans révéler lequel des membres du groupe a signé.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type | Usage |
|------|-------|
| Basic ring | Anonymity |
| Linkable ring | Double-spend prevention |
| CLSAG | Monero current |
| Triptych | Monero future |

**Ring size:**
| Implementation | Ring Size |
|----------------|-----------|
| Monero | 16 (fixed) |
| CryptoNote | 3+ (variable) |

## 3. Application aux Produits Crypto

| Crypto | Ring Signatures |
|--------|-----------------|
| **Monero** | CLSAG (16 decoys) |
| **Haven** | Fork Monero |
| Bitcoin | ✗ |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Ring signatures natif (16+) | 100% |
| **N/A** | Bitcoin-based | N/A |

## 5. Sources et Références

- [CLSAG Paper](https://eprint.iacr.org/2019/654)
""",

    3935: """## 1. Vue d'ensemble

**Bulletproofs** sont des preuves à divulgation nulle de connaissance permettant de prouver qu'une valeur est dans un intervalle sans révéler la valeur, avec une taille logarithmique.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Feature | Bulletproofs |
|---------|--------------|
| Proof size | ~1.5 KB (64-bit range) |
| Verification | O(n) |
| Aggregation | ✓ |
| Trusted setup | ✗ (pas nécessaire) |

**Bulletproofs+:**
| Improvement | Gain |
|-------------|------|
| Proof size | 15% smaller |
| Verification | Faster |

## 3. Application aux Produits Crypto

| Protocol | Bulletproofs |
|----------|--------------|
| **Monero** | Range proofs |
| **Grin** | Range proofs |
| **Mimblewimble** | Core |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Bulletproofs+ | 100% |
| **Bon** | Bulletproofs original | 80% |

## 5. Sources et Références

- [Bulletproofs Paper](https://eprint.iacr.org/2017/1066)
""",

    3936: """## 1. Vue d'ensemble

**Dandelion++** est un protocole de propagation de transactions qui cache l'IP d'origine de l'émetteur en routant d'abord la transaction via une "tige" avant de la diffuser.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Phase | Description |
|-------|-------------|
| Stem | Transaction passe node à node |
| Fluff | Diffusion normale (flooding) |

**Parameters:**
| Parameter | Value |
|-----------|-------|
| Stem probability | 90% |
| Stem length | ~10 hops |
| Timeout | 30 seconds |

## 3. Application aux Produits Crypto

| Implementation | Status |
|----------------|--------|
| Bitcoin Core | Proposé (pas merged) |
| Zcash | Implémenté |
| Grin | Implémenté |
| Monero | Implémenté |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Dandelion++ actif | 100% |
| **Standard** | Broadcast normal | 50% |

## 5. Sources et Références

- [BIP-156 (draft)](https://github.com/bitcoin/bips/blob/master/bip-0156.mediawiki)
""",

    3937: """## 1. Vue d'ensemble

**Coin Selection Privacy** évalue les algorithmes de sélection d'UTXOs qui minimisent les fuites d'information sur le portefeuille.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Algorithm | Privacy | Efficiency |
|-----------|---------|------------|
| Largest first | Poor | Good |
| Random | Medium | Variable |
| Branch & Bound | Medium | Optimal |
| Privacy-optimized | Good | Variable |

**Privacy considerations:**
| Factor | Impact |
|--------|--------|
| UTXO consolidation | Reveals ownership |
| Change amount | Leaks info |
| Input count | Heuristics |

## 3. Application aux Produits Crypto

| Wallet | Coin Selection |
|--------|----------------|
| **Wasabi** | Privacy-optimized |
| **Sparrow** | Multiple options |
| **Bitcoin Core** | Branch & Bound |
| **Electrum** | Configurable |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Privacy-aware selection | 100% |
| **Bon** | Manual selection possible | 70% |
| **Basique** | Automatic only | 40% |

## 5. Sources et Références

- [Coin Selection Survey](https://murch.one/posts/coin-selection/)
""",

    3938: """## 1. Vue d'ensemble

**Address Reuse Prevention** évalue les mécanismes empêchant la réutilisation d'adresses, qui détruit la confidentialité et peut compromettre la sécurité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Impact reuse | Risk |
|--------------|------|
| Clustering | Link transactions |
| Key exposure | Quantum risk (ECDSA) |
| Tracking | Balance monitoring |

**Solutions:**
| Method | Description |
|--------|-------------|
| HD wallets | BIP-32/44 derivation |
| Silent payments | BIP-352 |
| Stealth addresses | Privacy coins |

## 3. Application aux Produits Crypto

| Wallet | Address Reuse |
|--------|---------------|
| **Sparrow** | Warning + prevention |
| **Wasabi** | Never reuses |
| **MetaMask** | ⚠️ Ethereum = 1 address |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Prevention + warnings | 100% |
| **Bon** | HD wallet auto-derive | 70% |
| **Poor** | Single address model | 20% |

## 5. Sources et Références

- [Address Reuse Wiki](https://en.bitcoin.it/wiki/Address_reuse)
""",

    3939: """## 1. Vue d'ensemble

**UTXO Labeling** permet de marquer et identifier les UTXOs par source/usage pour améliorer la gestion de la confidentialité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Standard | BIP-329 |
|----------|---------|
| Format | JSON |
| Fields | label, origin, spendable |
| Export | Wallet Labels Export |

**Use cases:**
| Label | Purpose |
|-------|---------|
| KYC exchange | Avoid mixing |
| CoinJoin output | Privacy tier |
| Mining reward | Tax tracking |

## 3. Application aux Produits Crypto

| Wallet | Labeling |
|--------|----------|
| **Sparrow** | ✓ Full BIP-329 |
| **Wasabi** | ✓ Cluster labels |
| **Electrum** | Basic labels |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | BIP-329 + export/import | 100% |
| **Bon** | Basic labeling | 70% |
| **Minimal** | No labels | 20% |

## 5. Sources et Références

- [BIP-329](https://github.com/bitcoin/bips/blob/master/bip-0329.mediawiki)
""",

    3940: """## 1. Vue d'ensemble

**Atomic Swaps** permettent l'échange trustless entre différentes blockchains sans intermédiaire, utilisant des HTLCs (Hash Time-Locked Contracts).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Component | Role |
|-----------|------|
| Hashlock | Lie les deux parties |
| Timelock | Expiration safety |
| Preimage | Secret reveal |

**Protocol:**
1. Alice crée HTLC sur Chain A
2. Bob crée HTLC sur Chain B (same hash)
3. Alice claim Chain B (reveals preimage)
4. Bob claim Chain A (using preimage)

## 3. Application aux Produits Crypto

| Protocol | Atomic Swaps |
|----------|--------------|
| **Komodo** | Multi-chain |
| **THORChain** | Cross-chain |
| **Atomex** | BTC/ETH |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Native atomic swaps | 100% |
| **Via protocol** | THORChain, etc. | 70% |
| **Standard** | CEX required | 30% |

## 5. Sources et Références

- [Atomic Swap Tutorial](https://en.bitcoin.it/wiki/Atomic_swap)
""",

    3941: """## 1. Vue d'ensemble

**I2P (Invisible Internet Project)** est un réseau overlay anonyme alternatif à Tor, utilisant le garlic routing pour une meilleure résistance à l'analyse de traffic.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Feature | I2P |
|---------|-----|
| Routing | Garlic (bundled messages) |
| Tunnels | Unidirectional |
| Directory | Distributed (NetDB) |
| Hidden services | Eepsites |

**vs Tor:**
| Aspect | Tor | I2P |
|--------|-----|-----|
| Latency | Lower | Higher |
| Bandwidth | Higher | Lower |
| Internal services | Onion | Eepsite |
| External web | Good | Limited |

## 3. Application aux Produits Crypto

| Implementation | I2P |
|----------------|-----|
| **Monero** | Native support |
| Bitcoin Core | Via proxy |
| Kovri | Monero I2P router |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | I2P native | 100% |
| **Bon** | Tor + I2P options | 80% |
| **Standard** | Clearnet only | 40% |

## 5. Sources et Références

- [I2P Project](https://geti2p.net/)
""",

    3950: """## 1. Vue d'ensemble

**Certificate Pinning** est une technique de sécurité qui associe un certificat TLS spécifique à un domaine, empêchant les attaques MITM même avec des CA compromis.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type | Description |
|------|-------------|
| Public key pin | Pin SubjectPublicKeyInfo |
| Certificate pin | Pin entire cert |
| Backup pins | Fallback keys |

**Implementation:**
| Platform | Method |
|----------|--------|
| Android | Network Security Config |
| iOS | NSAppTransportSecurity |
| Web | HPKP (deprecated) |

## 3. Application aux Produits Crypto

| App | Pinning |
|-----|---------|
| Mobile banking apps | ✓ Standard |
| Crypto wallets | Should implement |
| Web wallets | Limited options |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Public key pinning + backup | 100% |
| **Bon** | Certificate pinning | 75% |
| **Standard** | No pinning | 40% |

## 5. Sources et Références

- [OWASP Certificate Pinning](https://owasp.org/www-community/controls/Certificate_and_Public_Key_Pinning)
""",

    3954: """## 1. Vue d'ensemble

**Emergency Recovery Key** évalue les mécanismes de récupération d'urgence du wallet en cas de compromission ou de perte d'accès.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Method | Use Case |
|--------|----------|
| Recovery phrase | Primary backup |
| Guardian/Social | Argent-style |
| Time-locked | Dead man's switch |
| Emergency contact | Notification |

**Components:**
| Element | Function |
|---------|----------|
| Backup seed | Full recovery |
| Emergency freeze | Stop theft |
| Contact notification | Alert trusted |

## 3. Application aux Produits Crypto

| Wallet | Emergency Recovery |
|--------|-------------------|
| **Casa** | Emergency key protocol |
| **Argent** | Guardian recovery |
| **Gnosis Safe** | Module-based |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Multi-layer recovery + freeze | 100% |
| **Bon** | Seed + social recovery | 75% |
| **Standard** | Seed only | 50% |

## 5. Sources et Références

- [Casa Emergency Access](https://casa.io/)
"""
}

def main():
    print("Saving Adversity privacy norms...")
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
