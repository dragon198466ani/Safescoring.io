#!/usr/bin/env python3
"""Generate summaries for Ecosystem interface norms."""

import requests
import sys
import time
sys.path.insert(0, '.')
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

summaries = {
    3832: """## 1. Vue d'ensemble

**Desktop App Windows** évalue la disponibilité et la qualité d'une application native pour Windows, le système d'exploitation desktop dominant.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Requirement | Specification |
|-------------|---------------|
| Windows version | 10/11 (64-bit) |
| Framework | Electron, Qt, native |
| Signing | Code signing certificate |
| Distribution | Installer MSI/EXE |

## 3. Application aux Produits Crypto

| Wallet | Windows App |
|--------|-------------|
| **Ledger Live** | ✓ Native |
| **Trezor Suite** | ✓ Electron |
| **Exodus** | ✓ Electron |
| **Sparrow** | ✓ Java |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Native + signed + auto-update | 100% |
| **Good** | Electron app | 80% |
| **Web** | Web-only | 50% |

## 5. Sources et Références

- Windows App Certification
""",

    3833: """## 1. Vue d'ensemble

**Desktop App macOS** évalue la disponibilité d'une application native pour macOS avec support Apple Silicon (M1/M2/M3).

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Requirement | Specification |
|-------------|---------------|
| macOS version | 12+ Monterey |
| Architecture | Universal (Intel + ARM) |
| Notarization | Apple notarized |
| Distribution | DMG or App Store |

## 3. Application aux Produits Crypto

| Wallet | macOS App |
|--------|-----------|
| **Ledger Live** | ✓ Universal |
| **Trezor Suite** | ✓ Universal |
| **Rainbow** | ✓ Native |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Universal + notarized | 100% |
| **Good** | Apple Silicon native | 90% |
| **Legacy** | Intel only | 60% |

## 5. Sources et Références

- Apple Developer Guidelines
""",

    3834: """## 1. Vue d'ensemble

**Desktop App Linux** évalue le support des distributions Linux, important pour les utilisateurs soucieux de la vie privée et les développeurs.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Format | Distribution |
|--------|--------------|
| AppImage | Universal |
| .deb | Debian/Ubuntu |
| .rpm | Fedora/RHEL |
| Flatpak | Sandboxed |
| Snap | Ubuntu |

## 3. Application aux Produits Crypto

| Wallet | Linux Support |
|--------|---------------|
| **Sparrow** | ✓ AppImage, deb |
| **Electrum** | ✓ Native Python |
| **Ledger Live** | ✓ AppImage |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Multi-format + verified | 100% |
| **Good** | AppImage available | 80% |
| **None** | No Linux support | 0% |

## 5. Sources et Références

- Linux packaging standards
""",

    3835: """## 1. Vue d'ensemble

**Web Interface** évalue la disponibilité d'une interface web permettant l'accès depuis n'importe quel navigateur sans installation.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Requirement | Standard |
|-------------|----------|
| HTTPS | Obligatoire |
| CSP | Content Security Policy |
| SRI | Subresource Integrity |
| Browsers | Chrome, Firefox, Safari, Edge |

## 3. Application aux Produits Crypto

| Service | Web Interface |
|---------|---------------|
| **CEX** | Primary interface |
| **DeFi** | Web-based |
| **MetaMask** | Portfolio web |

**Security:**
- Hot wallet risk if keys in browser
- Hardware wallet connect preferred

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Secure web + HW wallet | 100% |
| **Good** | Web with WalletConnect | 80% |
| **Risk** | Web-only keys | 40% |

## 5. Sources et Références

- OWASP Web Security
""",

    3836: """## 1. Vue d'ensemble

**CLI Available** évalue la disponibilité d'une interface en ligne de commande pour les utilisateurs avancés et l'automatisation.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Feature | Importance |
|---------|------------|
| Cross-platform | High |
| Scriptable | High |
| JSON output | Recommended |
| Offline mode | Security |

## 3. Application aux Produits Crypto

| Tool | CLI |
|------|-----|
| **Bitcoin Core** | bitcoin-cli |
| **Ethereum** | geth, cast |
| **Solana** | solana-cli |
| **Ledger** | ledger-cli (community) |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Full CLI + documentation | 100% |
| **Good** | Basic CLI | 70% |
| **None** | GUI only | 40% |

## 5. Sources et Références

- CLI best practices
""",

    3837: """## 1. Vue d'ensemble

**API Available** évalue la disponibilité d'une API permettant l'intégration programmatique avec d'autres services.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type | Usage |
|------|-------|
| REST | Standard web API |
| WebSocket | Real-time data |
| GraphQL | Flexible queries |
| gRPC | High performance |

| Security | Method |
|----------|--------|
| API keys | Basic auth |
| OAuth 2.0 | User authorization |
| HMAC | Request signing |

## 3. Application aux Produits Crypto

| Service | API |
|---------|-----|
| **CEX** | Trading, account |
| **Block explorers** | Data queries |
| **Node providers** | RPC endpoints |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Full API + SDKs | 100% |
| **Good** | REST API | 80% |
| **Limited** | Read-only API | 50% |

## 5. Sources et Références

- API security best practices
""",

    3838: """## 1. Vue d'ensemble

**SDK Available** évalue la disponibilité de kits de développement logiciel pour faciliter l'intégration.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Language | Priority |
|----------|----------|
| JavaScript/TypeScript | High |
| Python | High |
| Go | Medium |
| Rust | Medium |
| Java/Kotlin | Mobile |
| Swift | iOS |

## 3. Application aux Produits Crypto

| SDK | Languages |
|-----|-----------|
| **ethers.js** | JS/TS |
| **web3.py** | Python |
| **@solana/web3.js** | JS |
| **viem** | TS |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Multi-language SDKs | 100% |
| **Good** | JS/Python SDKs | 80% |
| **API only** | No SDK | 50% |

## 5. Sources et Références

- SDK documentation standards
""",

    3839: """## 1. Vue d'ensemble

**Documentation Complete** évalue la qualité et l'exhaustivité de la documentation technique et utilisateur.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type | Content |
|------|---------|
| User guide | End-user instructions |
| API docs | Developer reference |
| Tutorials | Step-by-step |
| FAQ | Common questions |
| Security | Best practices |

## 3. Application aux Produits Crypto

| Rating | Criteria |
|--------|----------|
| Excellent | Comprehensive + updated |
| Good | Complete basics |
| Poor | Incomplete or outdated |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Complete + maintained | 100% |
| **Good** | User + API docs | 75% |
| **Basic** | Minimal docs | 40% |

## 5. Sources et Références

- Technical writing standards
""",

    3840: """## 1. Vue d'ensemble

**Multi-language UI** évalue le support de plusieurs langues dans l'interface utilisateur.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Priority | Languages |
|----------|-----------|
| Essential | English |
| High | Chinese, Spanish, French, German |
| Medium | Japanese, Korean, Portuguese |
| Regional | Russian, Arabic, Hindi |

## 3. Application aux Produits Crypto

| Wallet | Languages |
|--------|-----------|
| **Trust Wallet** | 60+ |
| **MetaMask** | 30+ |
| **Ledger Live** | 25+ |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | 20+ languages | 100% |
| **Good** | 10+ languages | 80% |
| **Basic** | English only | 40% |

## 5. Sources et Références

- i18n best practices
""",

    3841: """## 1. Vue d'ensemble

**Dark Mode** évalue la disponibilité d'un thème sombre pour réduire la fatigue oculaire et économiser la batterie sur OLED.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Feature | Requirement |
|---------|-------------|
| System sync | Follow OS setting |
| Manual toggle | User choice |
| WCAG contrast | 4.5:1 minimum |

## 3. Application aux Produits Crypto

| Wallet | Dark Mode |
|--------|-----------|
| **MetaMask** | ✓ |
| **Rabby** | ✓ |
| **Ledger Live** | ✓ |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | System sync + manual | 100% |
| **Good** | Manual dark mode | 80% |
| **None** | Light only | 40% |

## 5. Sources et Références

- UI/UX accessibility standards
""",

    3864: """## 1. Vue d'ensemble

**Batch Transactions** évalue la capacité d'envoyer plusieurs transactions ou opérations en une seule action.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type | Implementation |
|------|----------------|
| Multi-send | Multiple recipients |
| Contract batching | multicall |
| Account abstraction | UserOperation batching |

## 3. Application aux Produits Crypto

| Wallet | Batch |
|--------|-------|
| **Gnosis Safe** | ✓ Transaction builder |
| **Rabby** | ✓ Batch signing |
| **Argent** | ✓ AA batching |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Native batching + simulation | 100% |
| **Good** | Multi-send | 75% |
| **None** | Single tx only | 40% |

## 5. Sources et Références

- ERC-4337 batching
""",

    3877: """## 1. Vue d'ensemble

**Transaction Verification on Device** évalue la capacité de vérifier les détails d'une transaction directement sur l'écran sécurisé du hardware wallet.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Element | Display |
|---------|---------|
| Recipient | Full or truncated address |
| Amount | Token + value |
| Fee | Gas/sat per byte |
| Network | Chain identifier |

## 3. Application aux Produits Crypto

| Wallet | Verification |
|--------|--------------|
| **Ledger** | Scroll display |
| **Trezor T** | Touch screen |
| **Keystone** | Full screen |
| **Coldcard** | OLED display |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Full display + confirmation | 100% |
| **Good** | Basic verification | 80% |
| **None** | Trust host only | 0% |

## 5. Sources et Références

- Hardware wallet security model
""",

    3878: """## 1. Vue d'ensemble

**Address Verification on Device** évalue l'affichage et la vérification de l'adresse de destination sur l'écran sécurisé du wallet.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Display | Method |
|---------|--------|
| Full address | Best (if screen allows) |
| Chunked | 8-char groups |
| Scrolling | Character by character |

| Format | Length |
|--------|--------|
| Bitcoin | 34-62 chars |
| Ethereum | 42 chars |
| Solana | 44 chars |

## 3. Application aux Produits Crypto

| Wallet | Display |
|--------|---------|
| **Ledger Stax** | Full (large screen) |
| **Trezor T** | Scrollable |
| **Coldcard** | Scrolling OLED |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Full address visible | 100% |
| **Good** | Scrollable full | 85% |
| **Basic** | First/last only | 50% |

## 5. Sources et Références

- Address display best practices
""",

    3881: """## 1. Vue d'ensemble

**Confirmation Button Physical** évalue la présence d'un bouton physique dédié pour confirmer les transactions, empêchant les confirmations par malware.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Type | Security |
|------|----------|
| Physical button | Highest |
| Touch screen | Good (if dedicated) |
| Software | Lowest |

## 3. Application aux Produits Crypto

| Wallet | Confirmation |
|--------|--------------|
| **Ledger Nano** | 2 buttons |
| **Trezor One** | 2 buttons |
| **Coldcard** | Number pad |
| **Keystone** | Touch + physical |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Dedicated physical button | 100% |
| **Good** | Touch on secure display | 80% |
| **Poor** | Software confirmation | 20% |

## 5. Sources et Références

- Hardware security design
""",

    3892: """## 1. Vue d'ensemble

**Watch-only Wallets** évalue la capacité de créer des wallets de surveillance sans clés privées, pour monitoring sans risque.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Import Method | Data |
|---------------|------|
| Address | Single address |
| xpub/zpub | HD wallet |
| Descriptor | Advanced (Miniscript) |

| Feature | Capability |
|---------|------------|
| View balance | ✓ |
| View history | ✓ |
| Create PSBT | ✓ |
| Sign | ✗ |

## 3. Application aux Produits Crypto

| Wallet | Watch-only |
|--------|------------|
| **Sparrow** | ✓ Full support |
| **BlueWallet** | ✓ xpub |
| **Electrum** | ✓ Master public key |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | Descriptor + PSBT | 100% |
| **Good** | xpub watch-only | 80% |
| **Basic** | Address only | 50% |

## 5. Sources et Références

- BIP-32 public key derivation
""",

    3893: """## 1. Vue d'ensemble

**Hardware Wallet Pairing** évalue la capacité d'un logiciel wallet à se connecter et interagir avec des hardware wallets.

## 2. Spécifications Techniques (DONNÉES FACTUELLES)

| Connection | Method |
|------------|--------|
| USB HID | Direct cable |
| Bluetooth | Wireless (Nano X) |
| QR code | Air-gapped |
| NFC | Contactless |

| Protocol | Standard |
|----------|----------|
| U2F/FIDO | Basic auth |
| WebUSB | Browser access |
| Custom | Vendor-specific |

## 3. Application aux Produits Crypto

| Software | HW Support |
|----------|------------|
| **MetaMask** | Ledger, Trezor |
| **Rabby** | Ledger, Trezor, Keystone |
| **Sparrow** | All major |
| **Frame** | Extensive |

## 4. Critères d'Évaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Maximum** | All major HW wallets | 100% |
| **Good** | Ledger + Trezor | 80% |
| **Limited** | Single vendor | 50% |

## 5. Sources et Références

- Hardware wallet APIs
"""
}

def main():
    print("Saving Ecosystem interface norms...")
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
