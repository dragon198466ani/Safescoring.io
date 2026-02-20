#!/usr/bin/env python3
"""Generate summaries for actual norms - Batch 2."""

import requests
import sys
import time
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    3845: """## 1. Vue d'ensemble

Le critère **High Contrast Mode** évalue la disponibilité d'un mode à contraste élevé pour les utilisateurs malvoyants ou dans des conditions de luminosité difficiles.

L'accessibilité est un critère WCAG 2.1 niveau AA obligatoire pour les services publics.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Standard WCAG 2.1 | Ratio minimum | Application |
|-------------------|---------------|-------------|
| AA (texte normal) | 4.5:1 | Corps de texte |
| AA (texte large) | 3:1 | Titres 18pt+ |
| AAA (texte normal) | 7:1 | Accessibilité maximale |
| AAA (texte large) | 4.5:1 | Titres grande taille |

**Modes de contraste:**
| Mode | Caractéristiques |
|------|------------------|
| Standard | Ratio 4.5:1 minimum |
| High contrast | Ratio 7:1+ |
| Inverted | Dark text on light |
| Dark mode | Light text on dark |

## 3. Application aux Produits Crypto

### Software Wallets
| Wallet | High Contrast |
|--------|---------------|
| MetaMask | Dark mode only |
| Rabby | Theme options |
| Exodus | Multiple themes |

### Hardware Wallets
| Wallet | Display |
|--------|---------|
| Ledger | OLED high contrast |
| Trezor T | LCD color adjustable |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | WCAG AAA (7:1+) + customizable | 100% |
| **Bon** | WCAG AA + dark mode | 70% |
| **Basique** | Dark mode only | 40% |

## 5. Sources et Références

- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
""",

    3846: """## 1. Vue d'ensemble

Le critère **Font Size Adjustment** évalue la possibilité d'ajuster la taille de police pour les utilisateurs malvoyants, sans perte de fonctionnalité.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Taille | Usage | WCAG |
|--------|-------|------|
| 12px | Minimum lisible | Non recommandé |
| 14-16px | Standard | AA |
| 18-20px | Large | Recommandé |
| 200% zoom | Obligation | WCAG AA |

## 3. Application aux Produits Crypto

### Wallets
- **MetaMask** : Suit settings système
- **Trust Wallet** : Font scaling
- **Hardware** : Taille fixe (limitation écran)

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Ajustable + responsive + 200% zoom | 100% |
| **Bon** | Follows system settings | 70% |
| **Basique** | Fixed size | 30% |

## 5. Sources et Références

- [WCAG Text Resize](https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html)
""",

    3847: """## 1. Vue d'ensemble

Le critère **Transaction History** évalue la qualité de l'historique des transactions : exhaustivité, filtrage, recherche, et détails disponibles.

L'historique est essentiel pour le suivi des fonds et les obligations fiscales.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Donnée | Importance | Source |
|--------|------------|--------|
| Hash de tx | Critique | Blockchain |
| Timestamp | Élevée | Block time |
| Amount | Critique | Tx data |
| Gas/Fee | Élevée | Tx data |
| Status | Critique | Confirmations |
| Counterparty | Moyenne | Address |

**Filtres recommandés:**
- Par date
- Par type (send/receive/swap)
- Par token
- Par montant
- Par status

## 3. Application aux Produits Crypto

### Wallets
| Wallet | History Quality |
|--------|-----------------|
| **Zerion** | Excellent, DeFi decoded |
| **MetaMask** | Basic activity |
| **Rabby** | Detailed, multi-chain |

### CEX
| CEX | Export formats |
|-----|----------------|
| Coinbase | CSV, full history |
| Binance | CSV, Excel |
| Kraken | CSV, detailed |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Full history + filters + export + DeFi decode | 100% |
| **Excellent** | Complete history + search | 80% |
| **Bon** | Recent history + basic filters | 60% |
| **Basique** | Limited history | 30% |

## 5. Sources et Références

- Blockchain explorers standards
""",

    3848: """## 1. Vue d'ensemble

Le critère **Export CSV** évalue la capacité d'exporter l'historique des transactions au format CSV pour comptabilité, taxes, et analyse.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Champ CSV | Obligatoire | Format |
|-----------|-------------|--------|
| Date | ✓ | ISO 8601 |
| Type | ✓ | Send/Receive/Swap |
| Amount | ✓ | Decimal |
| Currency | ✓ | Symbol |
| Fee | ✓ | Decimal |
| TxHash | Recommandé | Hex string |
| USD Value | Recommandé | Decimal |

## 3. Application aux Produits Crypto

| Platform | CSV Export |
|----------|------------|
| Coinbase | ✓ Complet |
| Binance | ✓ Complet |
| MetaMask | Via etherscan |
| Zerion | ✓ Full export |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Full CSV + USD values + customizable | 100% |
| **Bon** | Standard CSV export | 70% |
| **Via tiers** | External tools needed | 40% |

## 5. Sources et Références

- CSV standard RFC 4180
""",

    3849: """## 1. Vue d'ensemble

Le critère **Export PDF** évalue la capacité de générer des rapports PDF de transactions pour documentation officielle.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Contenu PDF | Importance |
|-------------|------------|
| Période | Obligatoire |
| Solde initial/final | Important |
| Liste transactions | Obligatoire |
| Totaux par catégorie | Recommandé |
| Signature/hash | Optionnel |

## 3. Application aux Produits Crypto

| Platform | PDF Export |
|----------|------------|
| Coinbase | Statements PDF |
| Kraken | Audit reports |
| CEX Pro | Full statements |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Professional PDF + signatures | 100% |
| **Bon** | Standard PDF statements | 70% |
| **Basique** | Manual PDF generation | 40% |

## 5. Sources et Références

- PDF/A archival standard
""",

    3850: """## 1. Vue d'ensemble

Le critère **Tax Reporting** évalue les outils intégrés pour le calcul et la déclaration des plus-values crypto selon les réglementations locales.

La fiscalité crypto varie significativement par juridiction.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Juridiction | Méthode | Taux |
|-------------|---------|------|
| France | Flat tax | 30% |
| USA | Capital gains | 0-37% |
| Allemagne | Holding 1 an | 0% après |
| UK | CGT | 10-20% |

**Méthodes de calcul:**
| Méthode | Usage |
|---------|-------|
| FIFO | First In First Out |
| LIFO | Last In First Out |
| HIFO | Highest In First Out |
| Average cost | Prix moyen |

## 3. Application aux Produits Crypto

| Platform | Tax Tools |
|----------|-----------|
| Coinbase | Tax reports |
| Kraken | Tax CSV |
| Koinly | Integration (tiers) |
| CoinTracker | Integration (tiers) |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Multi-jurisdiction + auto-calculation | 100% |
| **Bon** | Tax-ready exports | 70% |
| **Basique** | Manual calculation needed | 30% |

## 5. Sources et Références

- Local tax regulations
""",

    3851: """## 1. Vue d'ensemble

Le critère **Portfolio Tracking** évalue les fonctionnalités de suivi de portefeuille : valeur totale, allocation, performance, et multi-wallet.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Métrique | Importance |
|----------|------------|
| Valeur totale | Critique |
| Allocation % | Élevée |
| P&L | Élevée |
| Performance historique | Moyenne |
| Comparaison benchmark | Optionnelle |

## 3. Application aux Produits Crypto

| Platform | Portfolio |
|----------|-----------|
| **Zerion** | Excellent, multi-wallet |
| **DeBank** | DeFi focused |
| **CoinGecko** | Manual + API |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Real-time + multi-wallet + analytics | 100% |
| **Bon** | Basic tracking + performance | 70% |
| **Basique** | Balance only | 30% |

## 5. Sources et Références

- Portfolio management best practices
""",

    3852: """## 1. Vue d'ensemble

Le critère **Price Alerts** évalue la capacité de configurer des alertes de prix pour les crypto-actifs.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type d'alerte | Usage |
|---------------|-------|
| Prix absolu | $BTC > $100k |
| % variation | +/-5% en 24h |
| Volume | Volume spike |
| RSI/Indicateurs | Trading |

## 3. Application aux Produits Crypto

| Platform | Alerts |
|----------|--------|
| Coinbase | Push + email |
| Binance | Multi-type |
| TradingView | Advanced |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Multi-type + multi-channel | 100% |
| **Bon** | Basic price alerts | 60% |
| **Minimal** | No alerts | 0% |

## 5. Sources et Références

- Price feed APIs
""",

    3855: """## 1. Vue d'ensemble

Le critère **DEX Integration** évalue l'intégration native avec les échanges décentralisés pour swaps sans quitter le wallet.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| DEX Type | Mechanism | Gas |
|----------|-----------|-----|
| AMM | Liquidity pools | Medium |
| Order book | Limit orders | Lower |
| Aggregator | Best route | Variable |

**Aggregators majeurs:**
| Aggregator | Chains |
|------------|--------|
| 1inch | 10+ |
| Paraswap | 7+ |
| 0x | Multi-chain |

## 3. Application aux Produits Crypto

| Wallet | DEX |
|--------|-----|
| **MetaMask** | Swaps (aggregator) |
| **Rabby** | 1inch integration |
| **Trust Wallet** | DEX built-in |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Multi-DEX + aggregator + limit orders | 100% |
| **Bon** | Aggregator integration | 75% |
| **Basique** | Single DEX | 50% |

## 5. Sources et Références

- [1inch Documentation](https://docs.1inch.io/)
""",

    3856: """## 1. Vue d'ensemble

Le critère **CEX Integration** évalue l'intégration avec les exchanges centralisés pour trading, dépôts, et retraits.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Feature | Implementation |
|---------|----------------|
| View balance | API read-only |
| Deposit | Address generation |
| Withdraw | Signed request |
| Trading | API trading |

## 3. Application aux Produits Crypto

| Wallet | CEX Integration |
|--------|-----------------|
| Exodus | Built-in exchange |
| Ledger Live | Partners |
| Trust Wallet | Binance DEX |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Multi-CEX + full trading | 100% |
| **Bon** | View + deposit/withdraw | 70% |
| **Basique** | Links only | 30% |

## 5. Sources et Références

- CEX API documentation
""",

    3857: """## 1. Vue d'ensemble

Le critère **Fiat On-ramp** évalue la capacité d'acheter des crypto avec des devises fiat (EUR, USD) directement dans l'application.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Provider | Payment Methods | Fees |
|----------|-----------------|------|
| MoonPay | Card, Bank | 3-5% |
| Ramp | Card, Bank | 2-4% |
| Transak | Multiple | 1-5% |
| Simplex | Card | 3-5% |

| Method | Speed | Fees |
|--------|-------|------|
| Credit card | Instant | High (3-5%) |
| Debit card | Instant | Medium (2-3%) |
| Bank transfer | 1-3 days | Low (1%) |
| Apple/Google Pay | Instant | Medium |

## 3. Application aux Produits Crypto

| Wallet | On-ramp |
|--------|---------|
| **MetaMask** | Transak, MoonPay |
| **Trust Wallet** | MoonPay, Simplex |
| **Coinbase Wallet** | Native |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Multiple providers + low fees | 100% |
| **Bon** | 1-2 providers integrated | 70% |
| **Via externe** | External links only | 30% |

## 5. Sources et Références

- Payment provider documentation
""",

    3858: """## 1. Vue d'ensemble

Le critère **Fiat Off-ramp** évalue la capacité de convertir crypto en fiat et retirer vers un compte bancaire.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Provider | Withdrawal Methods |
|----------|-------------------|
| MoonPay | Bank, Card |
| Ramp | Bank transfer |
| Coinbase | Bank, PayPal |

| Method | Speed | Limits |
|--------|-------|--------|
| SEPA | 1-2 days | €50k+ |
| Wire | 1-5 days | High |
| Card | Instant | Lower |

## 3. Application aux Produits Crypto

| Platform | Off-ramp |
|----------|----------|
| Coinbase | Native |
| Kraken | Bank transfer |
| Exodus | MoonPay |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Multiple methods + fast + low fees | 100% |
| **Bon** | Bank withdrawal available | 70% |
| **Via CEX** | Must transfer to CEX | 40% |

## 5. Sources et Références

- Off-ramp provider APIs
""",

    3859: """## 1. Vue d'ensemble

Le critère **Swap In-app** évalue la fonctionnalité de swap token-to-token directement dans l'application sans utiliser de site externe.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Feature | Importance |
|---------|------------|
| Slippage control | Critique |
| Price comparison | Élevée |
| Gas estimation | Élevée |
| MEV protection | Recommandé |

## 3. Application aux Produits Crypto

| Wallet | Swap |
|--------|------|
| **MetaMask** | MetaMask Swaps |
| **Trust Wallet** | TW DEX |
| **Rabby** | 1inch |
| **Uniswap Wallet** | Native |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Aggregator + MEV protect + multi-chain | 100% |
| **Bon** | Good routing + slippage | 75% |
| **Basique** | Simple swap | 50% |

## 5. Sources et Références

- DEX aggregator documentation
""",

    3860: """## 1. Vue d'ensemble

Le critère **Bridge Support** évalue l'intégration de bridges cross-chain pour transférer des actifs entre blockchains.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Bridge Type | Security | Speed |
|-------------|----------|-------|
| Native bridge | Highest | Slow |
| Third-party | Variable | Fast |
| Aggregator | Best route | Variable |

**Bridges majeurs:**
| Bridge | Security Model |
|--------|----------------|
| Stargate | LayerZero |
| Across | Optimistic |
| Hop | Rollup native |
| Portal | Wormhole |

## 3. Application aux Produits Crypto

| Wallet | Bridge |
|--------|--------|
| **Rabby** | Multiple |
| **MetaMask** | Bridges tab |
| **Trust Wallet** | Limited |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Multi-bridge aggregator + security ratings | 100% |
| **Bon** | Major bridges integrated | 70% |
| **Basique** | Single bridge or links | 40% |

## 5. Sources et Références

- [LiFi](https://li.fi/)
""",

    3861: """## 1. Vue d'ensemble

Le critère **Gas Estimation** évalue la précision et la qualité des estimations de frais de gas pour les transactions.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Source | Method |
|--------|--------|
| eth_estimateGas | RPC call |
| Gas oracle | Historical data |
| EIP-1559 | Base + priority fee |

**Components:**
| Component | Description |
|-----------|-------------|
| Gas limit | Max units |
| Gas price | Price per unit |
| Max fee | EIP-1559 cap |
| Priority fee | Tip to validator |

## 3. Application aux Produits Crypto

| Wallet | Gas Estimation |
|--------|----------------|
| **MetaMask** | Good, 3 tiers |
| **Rabby** | Excellent, comparison |
| **Trust Wallet** | Basic |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Accurate + comparison + MEV aware | 100% |
| **Bon** | EIP-1559 support + presets | 75% |
| **Basique** | Basic estimation | 50% |

## 5. Sources et Références

- [EIP-1559](https://eips.ethereum.org/EIPS/eip-1559)
""",

    3862: """## 1. Vue d'ensemble

Le critère **Custom Gas Settings** évalue la possibilité de personnaliser manuellement les paramètres de gas.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Setting | Control |
|---------|---------|
| Gas limit | Manual input |
| Max fee | Custom value |
| Priority fee | Custom tip |
| Nonce | Advanced |

## 3. Application aux Produits Crypto

| Wallet | Custom Gas |
|--------|------------|
| **MetaMask** | Full control |
| **Rabby** | Advanced options |
| **Trust Wallet** | Limited |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | All parameters + nonce | 100% |
| **Bon** | Fee customization | 70% |
| **Basique** | Presets only | 40% |

## 5. Sources et Références

- Ethereum gas documentation
""",

    3887: """## 1. Vue d'ensemble

Le critère **Multi-sig 2-of-3** évalue le support des configurations multi-signatures nécessitant 2 signatures sur 3 clés possibles.

C'est la configuration multi-sig la plus populaire pour usage personnel.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Aspect | 2-of-3 |
|--------|--------|
| Sécurité | Single key compromise OK |
| Redundancy | 1 key loss OK |
| Complexity | Moderate |
| Gas cost | ~2x single sig |

**Implementation:**
| Chain | Method |
|-------|--------|
| Bitcoin | P2SH/P2WSH |
| Ethereum | Smart contract (Safe) |
| Solana | Native multisig |

## 3. Application aux Produits Crypto

| Solution | 2-of-3 |
|----------|--------|
| **Gnosis Safe** | ✓ |
| **Casa** | ✓ (default) |
| **Coldcard** | ✓ (PSBT) |
| **Sparrow** | ✓ |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Native + air-gap support | 100% |
| **Bon** | Full 2-of-3 support | 80% |
| **Basique** | Via external tool | 50% |

## 5. Sources et Références

- [BIP-11 M-of-N](https://github.com/bitcoin/bips/blob/master/bip-0011.mediawiki)
""",

    3888: """## 1. Vue d'ensemble

Le critère **Multi-sig 3-of-5** évalue le support des configurations nécessitant 3 signatures sur 5 clés.

Configuration recommandée pour entreprises et high-value personal holdings.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Aspect | 3-of-5 |
|--------|--------|
| Sécurité | 2 keys compromise OK |
| Redundancy | 2 keys loss OK |
| Complexity | High |
| Gas cost | ~3x single sig |

## 3. Application aux Produits Crypto

| Solution | 3-of-5 |
|----------|--------|
| **Gnosis Safe** | ✓ |
| **BitGo** | ✓ |
| **Unchained** | ✓ |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Native + distributed custody | 100% |
| **Bon** | Full support | 80% |
| **Via tiers** | External coordinator | 50% |

## 5. Sources et Références

- Enterprise custody best practices
""",

    3889: """## 1. Vue d'ensemble

Le critère **Multi-sig Custom** évalue le support de configurations multi-sig arbitraires (M-of-N personnalisé).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Config | Use Case |
|--------|----------|
| 4-of-7 | DAO treasury |
| 5-of-9 | Protocol governance |
| 2-of-2 | Simple joint |

**Limites:**
| Chain | Max signers |
|-------|-------------|
| Bitcoin P2WSH | 15 |
| Ethereum Safe | Unlimited |
| Solana | 11 |

## 3. Application aux Produits Crypto

| Solution | Custom M-of-N |
|----------|---------------|
| **Gnosis Safe** | ✓ Any config |
| **Specter** | ✓ Up to 15 |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Any M-of-N + easy management | 100% |
| **Bon** | Common configs | 70% |
| **Limité** | Only 2-of-3 | 40% |

## 5. Sources et Références

- Protocol-specific documentation
""",

    3890: """## 1. Vue d'ensemble

Le critère **Timelock Support** évalue le support des verrous temporels sur les transactions.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type | Implementation |
|------|----------------|
| Bitcoin CLTV | BIP-65 |
| Bitcoin CSV | BIP-112 |
| Ethereum | TimelockController |

## 3. Application aux Produits Crypto

| Solution | Timelock |
|----------|----------|
| **Gnosis Safe** | Module |
| **Bitcoin scripts** | Native |
| **Compound** | GovernorBravo |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Configurable timelock + UI | 100% |
| **Bon** | Basic timelock support | 70% |
| **Via script** | Manual scripting | 40% |

## 5. Sources et Références

- [BIP-65 CLTV](https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki)
"""
}

def main():
    print("Saving real norm summaries batch 2...")
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
