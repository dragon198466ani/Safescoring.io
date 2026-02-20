#!/usr/bin/env python3
"""Batch save summaries for EIP norms - batch 3"""
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
    7896: ("EIP014", """## 1. Vue d'ensemble

EIP-196 introduit les precompiles pour l'addition et la multiplication scalaire sur la courbe elliptique alt_bn128. Ces operations cryptographiques natives sont essentielles pour la verification de preuves zk-SNARK efficace sur Ethereum.

Implemente lors de Byzantium pour supporter les applications de confidentialite et scaling (zkRollups).

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Courbe | alt_bn128 (BN254) | Barreto-Naehrig |
| Adresse ADD | 0x06 | Precompile |
| Adresse MUL | 0x07 | Precompile |
| Gas ADD | 150 (puis 500 Istanbul) | Operation |
| Gas MUL | 6000 (puis 40000 Istanbul) | Operation |
| Bloc activation | 4,370,000 | Byzantium |
| EIP status | Final | Implemented |
| Field modulus p | 21888...87 | 254 bits |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **zkSync**: Verification proofs
- **Loopring**: zk-Rollup verification
- **Aztec**: Privacy protocol

### Software Wallets
- Non applicable directement

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | zk-SNARK verification via precompiles | 100% |
| **Conforme partiel** | Implementation alternative | 50-80% |
| **Non-conforme** | N/A - precompile native | N/A |

Infrastructure: Fondamental pour zkRollups.

## 5. Sources et References

- EIP-196 Specification: https://eips.ethereum.org/EIPS/eip-196
- alt_bn128 Curve Parameters
- zk-SNARK Verification
- SafeScoring Criteria EIP014 v1.0"""),

    7897: ("EIP015", """## 1. Vue d'ensemble

EIP-197 introduit le precompile pour le pairing sur la courbe alt_bn128, necessaire pour la verification complete de preuves zk-SNARK. Le pairing permet de verifier des relations complexes entre points de courbe elliptique.

Complete EIP-196 pour supporter Groth16 et autres schemas de preuve.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Adresse | 0x08 | Precompile |
| Gas base | 45000 | Fixed cost |
| Gas per pair | 34000 | Linear |
| Input format | (G1, G2) pairs | 192 bytes each |
| Output | 32 bytes (0 ou 1) | Boolean |
| Bloc activation | 4,370,000 | Byzantium |
| EIP status | Final | Implemented |
| Pairing type | Optimal ate | Performance |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Zcash**: SNARKs verification
- **zkSync Era**: Proof verification
- **Polygon zkEVM**: Validity proofs

### Software Wallets
- Non applicable directement

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Pairing via precompile 0x08 | 100% |
| **Conforme partiel** | Implementation custom | 50-80% |
| **Non-conforme** | N/A - precompile native | N/A |

zk-SNARKs: Enables trustless verification on-chain.

## 5. Sources et References

- EIP-197 Specification: https://eips.ethereum.org/EIPS/eip-197
- Groth16 Verification
- Pairing-Based Cryptography
- SafeScoring Criteria EIP015 v1.0"""),

    7898: ("EIP016", """## 1. Vue d'ensemble

EIP-198 introduit le precompile MODEXP pour l'exponentiation modulaire efficace (a^b mod n). Cette operation est fondamentale pour la cryptographie RSA et diverses applications cryptographiques.

Le precompile est significativement plus efficace que l'implementation en Solidity.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Adresse | 0x05 | Precompile |
| Operation | base^exp mod modulus | MODEXP |
| Gas formula | Complexe (EIP-2565 mise a jour) | Dynamique |
| Max size | Unlimited | Big integers |
| Bloc activation | 4,370,000 | Byzantium |
| EIP status | Final | Implemented |
| Use case | RSA, Diffie-Hellman | Crypto |
| Reproce | EIP-2565 | Gas reduction |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **RSA verification**: Signature schemes
- **VDF**: Verifiable Delay Functions
- **Cryptographic primitives**: Various

### Software Wallets
- Non applicable directement

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | MODEXP via precompile | 100% |
| **Conforme partiel** | Implementation Solidity | 50-80% |
| **Non-conforme** | N/A - precompile native | N/A |

Performance: 100-1000x plus rapide que Solidity.

## 5. Sources et References

- EIP-198 Specification: https://eips.ethereum.org/EIPS/eip-198
- Big Number Arithmetic EVM
- RSA on Ethereum
- SafeScoring Criteria EIP016 v1.0"""),

    7899: ("EIP017", """## 1. Vue d'ensemble

EIP-211 introduit les opcodes RETURNDATASIZE et RETURNDATACOPY permettant d'acceder aux donnees retournees par le dernier appel externe (CALL, DELEGATECALL, etc.). Avant cette EIP, obtenir la taille des donnees de retour necessitait des workarounds.

Essential pour les interactions complexes entre contrats.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| RETURNDATASIZE | 0x3d | Opcode |
| RETURNDATACOPY | 0x3e | Opcode |
| Gas RETURNDATASIZE | 2 | Constant |
| Gas RETURNDATACOPY | 3 + 3*words | Linear |
| Buffer persistence | Until next call | Scope |
| Bloc activation | 4,370,000 | Byzantium |
| EIP status | Final | Implemented |
| Solidity | Automatic usage | Transparent |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Tous smart contracts**: Return data handling
- **Proxy patterns**: Forward return data
- **Low-level calls**: Data extraction

### Software Wallets
- Non applicable directement

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Contrats post-Byzantium | 100% |
| **Conforme partiel** | N/A - opcodes standards | N/A |
| **Non-conforme** | N/A | N/A |

Usage: Transparent via Solidity >= 0.5.0.

## 5. Sources et References

- EIP-211 Specification: https://eips.ethereum.org/EIPS/eip-211
- Byzantium Hard Fork
- Solidity Return Data
- SafeScoring Criteria EIP017 v1.0"""),

    7900: ("EIP018", """## 1. Vue d'ensemble

EIP-214 introduit l'opcode STATICCALL qui execute un appel externe en mode lecture seule (view). Contrairement a CALL, STATICCALL garantit que l'appele ne peut pas modifier l'etat, prevenant les attaques par reentrancy dans certains contextes.

Fondamental pour les fonctions view/pure en Solidity.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Opcode | 0xfa | STATICCALL |
| Gas cost | Identique CALL | 700 base |
| State modification | Interdit | Revert si tentative |
| Interdictions | SSTORE, CREATE, SELFDESTRUCT, LOG | Write ops |
| Bloc activation | 4,370,000 | Byzantium |
| EIP status | Final | Implemented |
| Solidity | view/pure functions | Mapping |
| Depth limit | 1024 | Standard |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **View functions**: Lecture securisee
- **Oracles**: Lecture prix sans risque
- **Aggregators**: Queries read-only

### Software Wallets
- Non applicable directement

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | STATICCALL pour view/pure | 100% |
| **Conforme partiel** | CALL pour reads | 50-80% |
| **Non-conforme** | N/A - opcode standard | N/A |

Securite: Garantie cryptographique de non-modification.

## 5. Sources et References

- EIP-214 Specification: https://eips.ethereum.org/EIPS/eip-214
- Byzantium Hard Fork
- Solidity View Functions
- SafeScoring Criteria EIP018 v1.0"""),

    7901: ("EIP019", """## 1. Vue d'ensemble

EIP-225 (Clique Proof-of-Authority) definit un algorithme de consensus PoA pour les testnets Ethereum. Clique utilise un ensemble de validateurs autorises qui signent les blocs a tour de role, permettant des temps de bloc rapides sans mining.

Utilise par Goerli (desormais deprecie) et Sepolia.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Algorithme | Clique | PoA |
| Block time | 15 secondes typique | Configurable |
| Signers | Set configure | Genesis |
| Voting | 1 vote par bloc | Ajout/retrait signer |
| Majority | 50%+1 | Consensus |
| In-turn | 0 difficulty | Signer attendu |
| Out-of-turn | 1 difficulty | Signer non attendu |
| EIP status | Final | Testnets |

## 3. Application aux Produits Crypto

### Testnets
- **Goerli**: Clique PoA (deprecie)
- **Sepolia**: Clique PoA
- **Private chains**: Custom Clique

### Software Wallets
- Non applicable directement

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | N/A - testnet only | N/A |
| **Conforme partiel** | N/A | N/A |
| **Non-conforme** | N/A | N/A |

Note: Clique n'est pas utilise sur mainnet (PoS).

## 5. Sources et References

- EIP-225 Specification: https://eips.ethereum.org/EIPS/eip-225
- Clique Consensus
- Ethereum Testnets
- SafeScoring Criteria EIP019 v1.0"""),

    7906: ("EIP026", """## 1. Vue d'ensemble

EIP-1283 introduit des gas metering nets pour SSTORE, ou le cout depend des changements effectifs plutot que des operations individuelles. Cette optimisation reduit significativement le cout des mises a jour de storage repetees.

Initialement prevu pour Constantinople, reintroduit dans Istanbul (via EIP-2200).

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| SSTORE dirty | 200 gas | Modified slot |
| SSTORE reset | 5000 gas | To original |
| SSTORE new | 20000 gas | Fresh write |
| SSTORE delete | 15000 refund | Clear slot |
| Bloc activation | 9,069,000 | Istanbul (EIP-2200) |
| EIP status | Final | Via EIP-2200 |
| Metering | Net changes | Optimization |
| Constantinople | Retarde | Security concern |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Multiple writes**: Gas optimization
- **Approval patterns**: Reduced costs
- **State machine**: Efficient updates

### Software Wallets
- Gas estimation amelioree

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Contrats optimises net metering | 100% |
| **Conforme partiel** | Contrats legacy | 50-80% |
| **Non-conforme** | N/A - EVM native | N/A |

Optimisation: Patterns multi-write economisent 10-50% gas.

## 5. Sources et References

- EIP-1283 Specification: https://eips.ethereum.org/EIPS/eip-1283
- EIP-2200 (implementation finale)
- SSTORE Gas Metering
- SafeScoring Criteria EIP026 v1.0"""),

    7907: ("EIP027", """## 1. Vue d'ensemble

EIP-1344 introduit l'opcode CHAINID retournant l'identifiant de la chaine actuelle directement dans l'EVM. Avant cette EIP, obtenir le chain ID necessitait un appel externe ou un hardcode, problematique pour les contrats multi-chain.

Essential pour la protection replay (EIP-155) directement accessible.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Opcode | 0x46 | CHAINID |
| Gas cost | 2 | Constant |
| Return | uint256 | Chain ID |
| Mainnet | 1 | ID |
| Bloc activation | 9,069,000 | Istanbul |
| EIP status | Final | Implemented |
| Auteur | Richard Moore | ethers.js |
| Solidity | block.chainid | Access |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Multi-chain contracts**: Runtime detection
- **Replay protection**: Native chain check
- **Signature verification**: Domain separator

### Software Wallets
- Chain detection native

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | CHAINID pour verification | 100% |
| **Conforme partiel** | Chain ID hardcode | 50-80% |
| **Non-conforme** | Pas de verification chain | 0-30% |

Securite: Previent deploiement accidentel wrong chain.

## 5. Sources et References

- EIP-1344 Specification: https://eips.ethereum.org/EIPS/eip-1344
- Istanbul Hard Fork
- Chain ID Registry
- SafeScoring Criteria EIP027 v1.0"""),

    6587: ("EIP032", """## 1. Vue d'ensemble

EIP-2200 combine et finalise les gas metering changes pour SSTORE initialement proposes dans EIP-1283 et EIP-1706. Cette EIP resout les problemes de securite identifies et est implementee dans Istanbul.

Le net gas metering reduit significativement les couts pour les patterns d'ecriture communs.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| SLOAD | 800 gas | EIP-1884 |
| SSTORE dirty | 800 gas | Same slot |
| SSTORE fresh | 20000 gas | New value |
| SSTORE reset | 5000 gas | To original |
| Refund clear | 15000 gas | Delete slot |
| Bloc activation | 9,069,000 | Istanbul |
| EIP status | Final | Implemented |
| Gas stipend | 2300 | Minimum |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Approval patterns**: Efficient set/reset
- **State machines**: Reduced overhead
- **Batch operations**: Optimized

### Software Wallets
- Gas estimation mise a jour

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Contrats post-Istanbul | 100% |
| **Conforme partiel** | N/A - EVM native | N/A |
| **Non-conforme** | N/A | N/A |

Final: Version de production du net metering.

## 5. Sources et References

- EIP-2200 Specification: https://eips.ethereum.org/EIPS/eip-2200
- Istanbul Hard Fork
- SSTORE Semantics
- SafeScoring Criteria EIP032 v1.0"""),

    6588: ("EIP033", """## 1. Vue d'ensemble

EIP-2255 (Wallet Permissions System) propose un systeme de permissions pour les wallets permettant aux dApps de demander des autorisations specifiques. Ce standard ameliore la securite en permettant des permissions granulaires plutot que des approbations globales.

Inspire par les permissions mobiles (iOS/Android).

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Method | wallet_requestPermissions | RPC |
| Method | wallet_getPermissions | RPC |
| Method | wallet_revokePermissions | RPC |
| Format | Capability-based | Permissions |
| Scope | Per-dApp | Isolation |
| EIP status | Review | Draft |
| Auteur | Dan Finlay | MetaMask |
| Implementation | MetaMask | Partielle |

## 3. Application aux Produits Crypto

### Software Wallets
- **MetaMask**: Implementation partielle
- **WalletConnect**: Propose extension
- **Rainbow**: Consideration

### DEX / DeFi
- Demande permissions specifiques

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Full EIP-2255 support | 100% |
| **Conforme partiel** | Permissions basiques | 50-80% |
| **Non-conforme** | All-or-nothing access | 0-30% |

UX: Permissions granulaires ameliorent controle utilisateur.

## 5. Sources et References

- EIP-2255 Specification: https://eips.ethereum.org/EIPS/eip-2255
- MetaMask Permissions
- Wallet Security
- SafeScoring Criteria EIP033 v1.0"""),

    6589: ("EIP034", """## 1. Vue d'ensemble

EIP-2333 definit la derivation de cles BLS12-381 pour Ethereum 2.0 a partir d'une seed. Cette specification est fondamentale pour les validateurs Ethereum qui utilisent BLS pour les signatures de consensus.

Standard obligatoire pour tous les clients de validation Ethereum.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Courbe | BLS12-381 | Ethereum 2.0 |
| Seed size | 32 bytes minimum | Input |
| Derivation | HKDF-SHA256 | Extraction |
| Path notation | m/index | Simplified |
| Cle privee | 32 bytes | Scalar |
| Cle publique | 48 bytes | G1 point |
| EIP status | Final | Implemented |
| Auteur | Carl Beekhuizen | EF |

## 3. Application aux Produits Crypto

### Staking
- **Ethereum validators**: Obligatoire
- **Staking services**: Derivation cles
- **Custody solutions**: Key management

### Hardware Wallets
- **Ledger**: Support BLS derivation
- **Trezor**: En developpement

### Software Wallets
- Clients de validation

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | EIP-2333 derivation | 100% |
| **Conforme partiel** | N/A - standard unique | N/A |
| **Non-conforme** | Derivation non standard | 0-30% |

Critique: Interoperabilite cles validateur.

## 5. Sources et References

- EIP-2333 Specification: https://eips.ethereum.org/EIPS/eip-2333
- BLS12-381 Curve
- Ethereum 2.0 Specs
- SafeScoring Criteria EIP034 v1.0"""),

    6590: ("EIP035", """## 1. Vue d'ensemble

EIP-2334 definit les chemins de derivation BLS12-381 pour les cles de validation Ethereum. Cette specification standardise comment deriver les cles de signing et withdrawal a partir d'une meme seed.

Complete EIP-2333 avec la structure de paths.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Purpose | 12381 | BLS curve |
| Coin type | 3600 | Eth2 deposit |
| Signing path | m/12381/3600/i/0/0 | Per validator |
| Withdrawal path | m/12381/3600/i/0 | Per validator |
| Index i | Validator index | 0-based |
| EIP status | Final | Implemented |
| Auteur | Carl Beekhuizen | EF |
| Relation | Depends on EIP-2333 | Derivation |

## 3. Application aux Produits Crypto

### Staking
- **Ethereum validators**: Standard paths
- **eth2-deposit-cli**: Implementation officielle
- **Launchpad**: Key generation

### Hardware Wallets
- **Ledger**: Support paths
- **Keystone**: Eth2 staking

### Software Wallets
- Clients de validation

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Paths EIP-2334 exacts | 100% |
| **Conforme partiel** | N/A - standard unique | N/A |
| **Non-conforme** | Paths custom | 0-30% |

Securite: Separation signing/withdrawal keys.

## 5. Sources et References

- EIP-2334 Specification: https://eips.ethereum.org/EIPS/eip-2334
- Ethereum Staking Launchpad
- Validator Key Management
- SafeScoring Criteria EIP035 v1.0"""),

    6591: ("EIP036", """## 1. Vue d'ensemble

EIP-2335 (BLS12-381 Keystore) definit le format de fichier JSON pour stocker de maniere securisee les cles privees BLS12-381. Ce format utilise le chiffrement scrypt/PBKDF2 + AES-128-CTR similaire au keystore Ethereum classique.

Standard pour les fichiers keystore des validateurs.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| KDF | scrypt ou pbkdf2 | Derivation mot de passe |
| Cipher | aes-128-ctr | Chiffrement |
| Checksum | SHA256 | Verification |
| Version | 4 | Actuelle |
| UUID | v4 | Identification |
| Pubkey | hex BLS pubkey | 48 bytes |
| EIP status | Final | Implemented |
| Format | JSON | Portable |

## 3. Application aux Produits Crypto

### Staking
- **Validators**: Fichiers keystore
- **Prysm/Lighthouse/etc**: Import/export
- **Key management**: Standard format

### Hardware Wallets
- Export compatible possible

### Software Wallets
- Import/export keystore BLS

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Format EIP-2335 v4 | 100% |
| **Conforme partiel** | Format v3 ou anterior | 50-80% |
| **Non-conforme** | Format proprietaire | 0-30% |

Securite: Scrypt avec parametres forts recommande.

## 5. Sources et References

- EIP-2335 Specification: https://eips.ethereum.org/EIPS/eip-2335
- Keystore File Format
- Validator Key Security
- SafeScoring Criteria EIP036 v1.0"""),

    6592: ("EIP037", """## 1. Vue d'ensemble

EIP-2612 (Permit - ERC-20 Signatures) etend ERC-20 avec une fonction permit() permettant d'approuver des depenses via signature off-chain. Cette fonctionnalite elimine la transaction d'approbation separee, ameliorant l'UX et reduisant les couts de gas.

Adopte massivement par les tokens DeFi modernes.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Function | permit(owner,spender,value,deadline,v,r,s) | Interface |
| Domain | EIP-712 compliant | Typed data |
| Nonces | Incrementing per address | Replay protection |
| DOMAIN_SEPARATOR | Contract-specific | Uniqueness |
| EIP status | Final | Accepted |
| Auteur | Martin Lundfall | Maker |
| Adoption | DAI, USDC, UNI | Majors |
| Deadline | Block timestamp | Expiration |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Uniswap**: Permit2 (extension)
- **DAI**: Native permit
- **USDC**: Native permit

### Software Wallets
- **MetaMask**: Permit signing
- **Ledger Live**: Support EIP-712

### Hardware Wallets
- Clear signing pour permit

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | EIP-2612 permit + EIP-712 | 100% |
| **Conforme partiel** | Approve classique seulement | 50-80% |
| **Non-conforme** | Pas de standard approvals | 0-30% |

UX: Elimine transaction d'approbation separee.

## 5. Sources et References

- EIP-2612 Specification: https://eips.ethereum.org/EIPS/eip-2612
- DAI Permit Implementation
- Uniswap Permit2
- SafeScoring Criteria EIP037 v1.0"""),

    6593: ("EIP038", """## 1. Vue d'ensemble

EIP-2718 (Typed Transaction Envelope) introduit un framework pour definir differents types de transactions Ethereum avec un prefixe identifiant le type. Cette enveloppe permet l'evolution du format de transaction sans casser la compatibilite.

Base pour EIP-1559 (type 2) et EIP-4844 (type 3).

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Format | TransactionType || TransactionPayload | Envelope |
| Type 0 | Legacy | Pre-EIP-2718 |
| Type 1 | EIP-2930 | Access lists |
| Type 2 | EIP-1559 | Fee market |
| Type 3 | EIP-4844 | Blob transactions |
| Type range | 0x00-0x7f | Reserved |
| Bloc activation | 12,244,000 | Berlin |
| EIP status | Final | Implemented |

## 3. Application aux Produits Crypto

### Software Wallets
- **MetaMask**: Support tous types
- **ethers.js**: Transaction typing
- **viem**: Type-safe transactions

### DEX / DeFi
- Transparent pour utilisateurs

### Hardware Wallets
- Support types 0, 1, 2

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Support types 0, 1, 2, 3 | 100% |
| **Conforme partiel** | Support types 0, 1, 2 | 50-80% |
| **Non-conforme** | Type 0 uniquement | 0-30% |

Framework: Permet evolution continue du protocol.

## 5. Sources et References

- EIP-2718 Specification: https://eips.ethereum.org/EIPS/eip-2718
- Berlin Hard Fork
- Transaction Types
- SafeScoring Criteria EIP038 v1.0""")
}

if __name__ == "__main__":
    print("Saving EIP summaries (batch 3)...")
    success = 0
    for norm_id, (code, summary) in SUMMARIES.items():
        ok = save_summary(norm_id, code, summary)
        status = "OK" if ok else "FAIL"
        print(f"  {code}: {status}")
        if ok:
            success += 1
    print(f"\nResult: {success}/{len(SUMMARIES)} saved")
