#!/usr/bin/env python3
"""Batch save summaries for ERC norms"""
import os
import requests
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path('c:/Users/alexa/Desktop/SafeScoring/.env'))

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', os.environ.get('SUPABASE_KEY', ''))

def save_summary(norm_id, code, summary):
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    full_summary = f"""# {code} - Resume SafeScoring
**Mis a jour:** {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}

---

{summary}"""
    url = f'{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}'
    r = requests.patch(url, headers=headers, json={
        'summary': full_summary,
        'summary_status': 'ai_generated',
        'last_summarized_at': datetime.now().isoformat() + 'Z'
    }, timeout=30)
    return r.status_code in [200, 204]

SUMMARIES = {
    6596: ("ERC002", """## 1. Vue d'ensemble

ERC-165 (Standard Interface Detection) definit un mecanisme standard pour detecter quelles interfaces un smart contract implemente. Cette introspection permet aux appelants de verifier dynamiquement les capacites d'un contrat avant interaction.

Fondamental pour la composabilite des contrats, notamment pour NFTs (ERC-721) et multi-tokens (ERC-1155).

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Interface ID | bytes4 | XOR des selectors |
| Function | supportsInterface(bytes4) | Query |
| ERC-165 ID | 0x01ffc9a7 | Self-reference |
| ERC-721 ID | 0x80ac58cd | NFT standard |
| ERC-1155 ID | 0xd9b67a26 | Multi-token |
| Invalid ID | 0xffffffff | Must return false |
| Gas cost | ~700 gas | STATICCALL |
| EIP status | Final | Accepted |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **NFT marketplaces**: Detection type NFT
- **OpenSea**: Verification ERC-721/1155
- **Blur**: Interface checking

### Software Wallets
- **MetaMask**: NFT detection
- **Rainbow**: Token type identification

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | ERC-165 implemente correctement | 100% |
| **Conforme partiel** | Implementation partielle | 50-80% |
| **Non-conforme** | Pas de supportsInterface | 0-30% |

Securite: Verification avant interaction previent erreurs.

## 5. Sources et References

- ERC-165 Specification: https://eips.ethereum.org/EIPS/eip-165
- OpenZeppelin ERC165
- Interface ID Calculation
- SafeScoring Criteria ERC002 v1.0"""),

    6597: ("ERC003", """## 1. Vue d'ensemble

ERC-173 (Contract Ownership Standard) definit un standard minimal pour la propriete de contrats avec une fonction owner() et transferOwnership(). Cette interface standardisee permet l'interoperabilite des outils de gestion de propriete.

Souvent utilise comme base pour des systemes de controle d'acces plus complexes.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| owner() | address | View function |
| transferOwnership(address) | external | Transfer |
| Event | OwnershipTransferred | Logging |
| ERC-165 ID | 0x7f5828d0 | Interface |
| Zero address | Ownership renounced | Convention |
| EIP status | Final | Accepted |
| Auteur | Nick Mudge | Diamond author |
| Gas transfer | ~30,000 | Typical |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Tous protocols**: Admin ownership
- **Governance**: Timelock owner
- **Multisig**: Safe as owner

### Software Wallets
- Detection owner pour dApps

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | ERC-173 + renounce possible | 100% |
| **Conforme partiel** | Owner sans renounce | 50-80% |
| **Non-conforme** | Ownership non standard | 0-30% |

Securite: transferOwnership doit avoir 2-step idealement.

## 5. Sources et References

- ERC-173 Specification: https://eips.ethereum.org/EIPS/eip-173
- OpenZeppelin Ownable
- Ownership Best Practices
- SafeScoring Criteria ERC003 v1.0"""),

    6598: ("ERC005", """## 1. Vue d'ensemble

ERC-777 (Token Standard) est un standard de token avance remplacant ERC-20 avec des operateurs, hooks send/receive et backward compatibility ERC-20. Les hooks permettent aux contrats de reagir aux transferts entrants.

Attention: Les hooks peuvent creer des vulnerabilites de reentrancy.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| send(recipient,amount,data) | Transfer | Principal |
| operatorSend() | Delegated transfer | Operators |
| tokensReceived() | Receiver hook | ERC-1820 |
| tokensToSend() | Sender hook | Notification |
| ERC-20 compatible | transfer/approve | Fallback |
| ERC-1820 registry | 0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24 | Required |
| EIP status | Final | Accepted |
| Decimals | Always 18 | Standardized |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Imbtc**: ERC-777 (exploited)
- **SKALE token**: ERC-777
- Adoption limitee post-exploits

### Software Wallets
- Support variable
- MetaMask: Compatible via ERC-20 fallback

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | ERC-777 avec protections reentrancy | 100% |
| **Conforme partiel** | ERC-777 basique | 50-80% |
| **Non-conforme** | Hooks vulnerables | 0-30% |

RISQUE: Hooks peuvent causer reentrancy - pattern discourage.

## 5. Sources et References

- ERC-777 Specification: https://eips.ethereum.org/EIPS/eip-777
- Security Analysis ERC-777
- Imbtc Exploit Postmortem
- SafeScoring Criteria ERC005 v1.0"""),

    6599: ("ERC007", """## 1. Vue d'ensemble

ERC-1167 (Minimal Proxy Contract) definit un pattern de clone minimal pour deployer des copies peu couteuses d'un contrat d'implementation. Le proxy de 45 bytes delegue tous les appels a une adresse d'implementation fixe.

Utilise massivement pour factory patterns economiques (Uniswap pairs, etc.).

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Taille bytecode | 45 bytes | Minimal |
| Gas deployment | ~10,000 | vs 100k+ full |
| Operation | DELEGATECALL fixe | Immutable |
| Implementation | Immutable | No upgrade |
| Clone factory | CREATE/CREATE2 | Deployment |
| EIP status | Final | Accepted |
| Auteur | Peter Murray | EIP Labs |
| OpenZeppelin | Clones library | Implementation |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Uniswap V2**: Pair clones
- **Yearn**: Vault clones
- **Factory patterns**: Standard

### Software Wallets
- Non applicable directement

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | ERC-1167 standard bytecode | 100% |
| **Conforme partiel** | Variante minimal proxy | 50-80% |
| **Non-conforme** | Proxy non standard | 0-30% |

Economie: 90%+ reduction cout deploiement.

## 5. Sources et References

- ERC-1167 Specification: https://eips.ethereum.org/EIPS/eip-1167
- OpenZeppelin Clones
- Factory Pattern
- SafeScoring Criteria ERC007 v1.0"""),

    6600: ("ERC008", """## 1. Vue d'ensemble

ERC-1271 (Standard Signature Validation for Contracts) definit comment un smart contract peut valider une signature en son nom. Cela permet aux contrats (comme les multisigs) d'etre des signataires valides dans les protocoles utilisant des signatures.

Essential pour l'adoption des smart contract wallets.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| isValidSignature(hash,signature) | bytes4 | Function |
| Magic value | 0x1626ba7e | Valid |
| Invalid return | Any other bytes4 | Invalid |
| ERC-165 ID | 0x1626ba7e | Same as magic |
| EIP status | Final | Accepted |
| Auteur | Francisco Giordano | OpenZeppelin |
| Safe support | Native | Gnosis Safe |
| Use cases | Permits, orders, auth | Signatures |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Uniswap Permit2**: Smart wallet support
- **CoW Protocol**: Order signing
- **OpenSea**: Contract signatures

### Software Wallets
- **Safe (Gnosis)**: Native ERC-1271
- **Argent**: Smart wallet signatures

### Hardware Wallets
- Indirect via smart wallet

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | ERC-1271 support natif | 100% |
| **Conforme partiel** | EOA signatures seulement | 50-80% |
| **Non-conforme** | Rejection smart wallets | 0-30% |

Adoption: Critical pour account abstraction.

## 5. Sources et References

- ERC-1271 Specification: https://eips.ethereum.org/EIPS/eip-1271
- Safe Signature Validation
- Smart Wallet Standards
- SafeScoring Criteria ERC008 v1.0"""),

    6601: ("ERC009", """## 1. Vue d'ensemble

ERC-1363 (Payable Token) etend ERC-20 avec des callbacks automatiques apres transfer et approval. Le recepteur est notifie via des hooks, permettant des operations atomiques comme "transfer and call" en une transaction.

Alternative plus simple a ERC-777 sans les risques de reentrancy complexes.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| transferAndCall() | transfer + callback | Atomic |
| transferFromAndCall() | transferFrom + callback | Atomic |
| approveAndCall() | approve + callback | Atomic |
| onTransferReceived() | Receiver hook | Interface |
| onApprovalReceived() | Spender hook | Interface |
| ERC-165 ID | 0xb0202a11 | Interface |
| EIP status | Final | Accepted |
| Base | ERC-20 | Extension |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Payments**: One-transaction flows
- **Subscriptions**: Approve + action
- **NFT purchases**: Transfer + mint

### Software Wallets
- Support limite
- Compatible ERC-20 fallback

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | ERC-1363 full implementation | 100% |
| **Conforme partiel** | ERC-20 basique | 50-80% |
| **Non-conforme** | N/A | N/A |

Alternative: Plus simple et sur que ERC-777.

## 5. Sources et References

- ERC-1363 Specification: https://eips.ethereum.org/EIPS/eip-1363
- Payable Token Pattern
- OpenZeppelin Extensions
- SafeScoring Criteria ERC009 v1.0"""),

    6602: ("ERC010", """## 1. Vue d'ensemble

ERC-1400 (Security Token Standard) definit un framework pour les security tokens avec partitions, documents attaches et transferts restreints. Ce standard permet la tokenisation d'actifs financiers regules.

Concu pour la conformite reglementaire (KYC/AML, restrictions de transfert).

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Partitions | bytes32 | Token tranches |
| Documents | URI + hash | Legal docs |
| Controllers | Authorized list | Admin transfers |
| canTransfer() | Validation | Pre-check |
| isIssuable() | Minting status | Supply control |
| EIP status | Draft | Industry standard |
| Base | ERC-20/1155 | Compatibility |
| Compliance | KYC/AML | Built-in |

## 3. Application aux Produits Crypto

### Security Tokens
- **Securitize**: Platform token
- **Polymath**: Security tokens
- **Harbor**: Real estate tokens

### DEX / DeFi
- Limited - regulated exchanges only

### CEX
- Compliance-enabled platforms

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | ERC-1400 with full compliance | 100% |
| **Conforme partiel** | Subset implementation | 50-80% |
| **Non-conforme** | Unregulated token | 0-30% |

Reglementation: Pour actifs financiers regules.

## 5. Sources et References

- ERC-1400 Specification: https://github.com/ethereum/EIPs/issues/1411
- Security Token Standard
- Polymath Documentation
- SafeScoring Criteria ERC010 v1.0"""),

    6603: ("ERC011", """## 1. Vue d'ensemble

ERC-1820 (Pseudo-introspection Registry Contract) definit un registre global pour enregistrer quelles interfaces un contrat ou EOA implemente. C'est l'evolution de ERC-820 utilise par ERC-777.

Le registre est deploye a la meme adresse sur toutes les chaines EVM.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Registry address | 0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24 | Universal |
| setInterfaceImplementer() | Registration | Function |
| getInterfaceImplementer() | Query | Function |
| ERC-165 compatible | Fallback | Integration |
| Manager concept | Delegation | Feature |
| EIP status | Final | Accepted |
| Deployment | Nick's method | CREATE2-like |
| Required by | ERC-777 | Dependency |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **ERC-777 tokens**: Mandatory registry
- **Hooks registration**: Receivers

### Software Wallets
- Transparent pour utilisateurs

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | ERC-1820 registration | 100% |
| **Conforme partiel** | ERC-165 seulement | 50-80% |
| **Non-conforme** | Aucun standard | 0-30% |

Registry: Adresse identique sur toutes chaines.

## 5. Sources et References

- ERC-1820 Specification: https://eips.ethereum.org/EIPS/eip-1820
- Universal Registry
- ERC-777 Integration
- SafeScoring Criteria ERC011 v1.0"""),

    6604: ("ERC012", """## 1. Vue d'ensemble

ERC-1822 (Universal Upgradeable Proxy Standard - UUPS) definit un pattern de proxy ou la logique de mise a jour est dans l'implementation plutot que dans le proxy. Cela reduit le cout de deploiement et de storage.

Standard recommande par OpenZeppelin pour nouveaux projets upgradeables.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Storage slot | keccak256("PROXIABLE") | Implementation |
| proxiableUUID() | bytes32 | Verification |
| upgradeToAndCall() | In implementation | Upgrade function |
| Gas deployment | ~50% moins | vs Transparent |
| Selector clash | Impossible | No admin functions in proxy |
| EIP status | Final | Accepted |
| OpenZeppelin | UUPSUpgradeable | Implementation |
| EIP-1967 | Compatible | Storage slots |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **New protocols**: UUPS preferred
- **OpenZeppelin v5**: Default
- **Efficient upgrades**: Lower gas

### Software Wallets
- Non applicable directement

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | UUPS + access control | 100% |
| **Conforme partiel** | UUPS basique | 50-80% |
| **Non-conforme** | Upgrade sans protection | 0-30% |

Securite: _authorizeUpgrade() doit etre protege.

## 5. Sources et References

- ERC-1822 Specification: https://eips.ethereum.org/EIPS/eip-1822
- OpenZeppelin UUPS
- Upgrade Patterns
- SafeScoring Criteria ERC012 v1.0"""),

    6605: ("ERC013", """## 1. Vue d'ensemble

ERC-2309 (ERC-721 Consecutive Transfer Extension) permet l'emission d'un seul event pour le mint/transfer de multiples NFTs consecutifs. Cela reduit drastiquement les couts de gas pour les drops massifs.

Essential pour les collections NFT de grande taille.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Event | ConsecutiveTransfer | New event |
| Parameters | fromTokenId, toTokenId | Range |
| From address | 0x0 for mint | Convention |
| Gas savings | 99%+ | vs individual Transfer |
| ERC-721 compatible | Backfill Transfer events | Indexers |
| EIP status | Final | Accepted |
| Auteur | Sean Papanikolas | Enjin |
| Max range | Unlimited | Implementation dependent |

## 3. Application aux Produits Crypto

### NFT Marketplaces
- **OpenSea**: Support ConsecutiveTransfer
- **Blur**: Indexed batches
- **Rarible**: Batch detection

### DEX / DeFi
- Non applicable directement

### Software Wallets
- NFT detection via events

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | ConsecutiveTransfer + ERC-721 | 100% |
| **Conforme partiel** | Individual Transfer events | 50-80% |
| **Non-conforme** | No transfer events | 0-30% |

Scalabilite: Permet millions de NFTs en une tx.

## 5. Sources et References

- ERC-2309 Specification: https://eips.ethereum.org/EIPS/eip-2309
- Batch Minting Patterns
- OpenSea Integration
- SafeScoring Criteria ERC013 v1.0"""),

    6606: ("ERC014", """## 1. Vue d'ensemble

ERC-2771 (Secure Protocol for Native Meta Transactions) definit un standard pour les meta-transactions ou un relayer execute des transactions au nom d'un utilisateur. Le contrat cible extrait l'adresse du signataire original depuis msg.data.

Permet les transactions gasless pour les utilisateurs.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| _msgSender() | Trusted forwarder check | Override |
| Trusted forwarder | isTrustedForwarder() | Validation |
| Append | 20 bytes address | msg.data suffix |
| Gas sponsorship | Relayer pays | Use case |
| EIP status | Final | Accepted |
| Auteur | Ronan Sandford | Ethereum |
| OpenZeppelin | ERC2771Context | Implementation |
| Security | Forwarder whitelist | Critical |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Biconomy**: Gasless DeFi
- **GSN**: Gas Station Network
- **OpenZeppelin Defender**: Relayers

### Software Wallets
- Gasless onboarding

### Hardware Wallets
- Signature pour meta-tx

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | ERC-2771 + trusted forwarders | 100% |
| **Conforme partiel** | Custom meta-tx | 50-80% |
| **Non-conforme** | Open forwarder trust | 0-30% |

Securite: Whitelist forwarders mandatory.

## 5. Sources et References

- ERC-2771 Specification: https://eips.ethereum.org/EIPS/eip-2771
- OpenZeppelin ERC2771Context
- GSN Documentation
- SafeScoring Criteria ERC014 v1.0"""),

    6607: ("ERC015", """## 1. Vue d'ensemble

ERC-2981 (NFT Royalty Standard) definit un standard pour recuperer les informations de royalties sur les NFTs. Cette interface permet aux marketplaces d'interroger le montant et le destinataire des royalties pour chaque vente.

Adoption variable - les royalties restent optionnelles pour les marketplaces.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| royaltyInfo(tokenId,salePrice) | (receiver,amount) | Query |
| Percentage | Calcule sur salePrice | Flexible |
| Max recommended | 10% | Convention |
| ERC-165 ID | 0x2a55205a | Interface |
| EIP status | Final | Accepted |
| Per-token | Possible | Implementation |
| Enforcement | Marketplace dependent | Not on-chain |
| OpenSea | Support optionnel | Enforcement policy |

## 3. Application aux Produits Crypto

### NFT Marketplaces
- **OpenSea**: Optional enforcement
- **Blur**: Optional royalties
- **Foundation**: Enforced royalties

### DEX / DeFi
- Non applicable directement

### Software Wallets
- Affichage royalty info

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | ERC-2981 implemented | 100% |
| **Conforme partiel** | Off-chain royalties | 50-80% |
| **Non-conforme** | No royalty info | 0-30% |

Limitation: Pas d'enforcement on-chain.

## 5. Sources et References

- ERC-2981 Specification: https://eips.ethereum.org/EIPS/eip-2981
- NFT Royalty Standard
- Marketplace Implementation
- SafeScoring Criteria ERC015 v1.0"""),

    6610: ("ERC020", """## 1. Vue d'ensemble

ERC-4361 (Sign-In with Ethereum - SIWE) definit un standard pour l'authentification web via signature Ethereum. Les utilisateurs signent un message structure contenant domaine, adresse, nonce et statement pour prouver la propriete de leur adresse.

Standard pour l'authentification Web3.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Domain | RFC 4501 | Site identifier |
| Address | Ethereum address | User identity |
| Statement | Human-readable | Intent |
| URI | Resource identifier | Context |
| Nonce | Random string | Replay protection |
| Issued-at | ISO 8601 | Timestamp |
| Expiration | ISO 8601 | Validity |
| EIP status | Review | Adoption croissante |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **ENS**: Login with ENS
- **Lens Protocol**: Web3 social auth
- **Farcaster**: SIWE authentication

### Software Wallets
- **MetaMask**: Sign message
- **WalletConnect**: SIWE support

### Hardware Wallets
- Message signing via wallet

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Full SIWE implementation | 100% |
| **Conforme partiel** | Custom message signing | 50-80% |
| **Non-conforme** | No crypto auth | 0-30% |

Securite: Nonce et expiration obligatoires.

## 5. Sources et References

- ERC-4361 Specification: https://eips.ethereum.org/EIPS/eip-4361
- Sign-In with Ethereum: https://login.xyz/
- SIWE Libraries
- SafeScoring Criteria ERC020 v1.0"""),

    6611: ("ERC022", """## 1. Vue d'ensemble

ERC-4907 (Rental NFT) etend ERC-721 avec une fonction de "user" temporaire distinct du owner. Cela permet la location de NFTs ou le user a des droits d'usage sans posseder l'actif.

Ideal pour les NFTs utilitaires (jeux, metaverse, subscriptions).

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| setUser(tokenId,user,expires) | Assignment | Function |
| userOf(tokenId) | address | Query |
| userExpires(tokenId) | uint256 | Timestamp |
| Event | UpdateUser | Notification |
| ERC-165 ID | 0xad092b5c | Interface |
| EIP status | Final | Accepted |
| Auteur | Anders, Lance | Double Protocol |
| Base | ERC-721 | Extension |

## 3. Application aux Produits Crypto

### Gaming/Metaverse
- **Axie Infinity**: Scholarship NFTs
- **Decentraland**: Land rental
- **The Sandbox**: Asset rentals

### DEX / DeFi
- **reNFT**: Rental protocol
- **Double Protocol**: NFT lending

### Software Wallets
- User vs owner distinction

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | ERC-4907 full implementation | 100% |
| **Conforme partiel** | Custom rental logic | 50-80% |
| **Non-conforme** | No rental support | 0-30% |

Use case: Gaming, subscriptions, access tokens.

## 5. Sources et References

- ERC-4907 Specification: https://eips.ethereum.org/EIPS/eip-4907
- Double Protocol
- NFT Rental Standards
- SafeScoring Criteria ERC022 v1.0"""),

    6619: ("ERC031", """## 1. Vue d'ensemble

ERC-6963 (Multi Injected Provider Discovery) resout le probleme de conflit entre wallets injectant window.ethereum. Ce standard permet aux dApps de decouvrir plusieurs wallets et de laisser l'utilisateur choisir.

Remplace le pattern legacy ou le dernier wallet charge "gagne".

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Event | eip6963:announceProvider | Discovery |
| Request | eip6963:requestProvider | dApp query |
| Info | {uuid, name, icon, rdns} | Provider metadata |
| RDNS | Reverse domain | Unique identifier |
| EIP status | Final | Accepted |
| Auteur | Pedro Gomes | WalletConnect |
| Adoption | MetaMask, Rabby, Rainbow | Major wallets |
| window.ethereum | Deprecated pattern | Legacy |

## 3. Application aux Produits Crypto

### Software Wallets
- **MetaMask**: EIP-6963 support
- **Rabby**: Multi-wallet aware
- **Rainbow**: Provider discovery
- **Coinbase Wallet**: Announced support

### DEX / DeFi
- **wagmi**: Native support
- **RainbowKit**: Wallet selection

### Hardware Wallets
- Via software wallet bridge

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | EIP-6963 announced | 100% |
| **Conforme partiel** | window.ethereum only | 50-80% |
| **Non-conforme** | No standard discovery | 0-30% |

UX: Permet multi-wallet sans conflit.

## 5. Sources et References

- ERC-6963 Specification: https://eips.ethereum.org/EIPS/eip-6963
- WalletConnect Integration
- wagmi Documentation
- SafeScoring Criteria ERC031 v1.0"""),

    6620: ("ERC032", """## 1. Vue d'ensemble

ERC-7201 (Namespaced Storage Layout) definit une convention pour les emplacements de storage dans les contrats upgradeables. Cette specification utilise keccak256(abi.encode(uint256(keccak256(namespace)) - 1)) pour generer des slots uniques et eviter les collisions.

Standard pour le storage structure dans OpenZeppelin v5.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Formula | keccak256(abi.encode(uint256(keccak256("namespace.name")) - 1)) | Slot calculation |
| NatSpec | @custom:storage-location | Documentation |
| erc7201:namespace | Identifier | Convention |
| Collision-free | Designed | High probability |
| OpenZeppelin | v5.0+ | Implementation |
| EIP status | Final | Accepted |
| Auteur | Francisco Giordano | OpenZeppelin |
| Use case | Upgradeable contracts | Storage safety |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **New protocols**: Structured storage
- **OpenZeppelin v5**: Default pattern
- **Diamond storage**: Alternative

### Software Wallets
- Non applicable directement

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | ERC-7201 namespaced storage | 100% |
| **Conforme partiel** | Gap-based inheritance | 50-80% |
| **Non-conforme** | Unstructured storage | 0-30% |

Securite: Prevent storage collision dans upgrades.

## 5. Sources et References

- ERC-7201 Specification: https://eips.ethereum.org/EIPS/eip-7201
- OpenZeppelin Storage Patterns
- Upgradeable Contracts Guide
- SafeScoring Criteria ERC032 v1.0""")
}

if __name__ == "__main__":
    print("Saving ERC summaries (batch 1)...")
    success = 0
    for norm_id, (code, summary) in SUMMARIES.items():
        ok = save_summary(norm_id, code, summary)
        status = "OK" if ok else "FAIL"
        print(f"  {code}: {status}")
        if ok:
            success += 1
    print(f"\nResult: {success}/{len(SUMMARIES)} saved")
