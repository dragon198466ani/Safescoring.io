#!/usr/bin/env python3
"""Batch save summaries for EIP norms"""
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
    7890: ("EIP001", """## 1. Vue d'ensemble

EIP-2 (Homestead Hard Fork Changes) definit les modifications apportees lors de la mise a jour Homestead d'Ethereum en mars 2016. Cette EIP a introduit des changements critiques pour la stabilite et la securite du reseau, notamment l'augmentation du cout de gas pour la creation de contrats et la modification des regles de validation des signatures.

Homestead marque la transition d'Ethereum de sa phase "Frontier" experimentale vers un reseau de production plus mature.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Bloc activation | 1,150,000 | Mainnet |
| Date | 14 mars 2016 | Homestead fork |
| Gas creation contrat | 53,000 (avant: 21,000) | Augmentation |
| DELEGATECALL | Introduit | Opcode 0xf4 |
| Difficulty bomb | Active | Ajustement |
| Signature malleability | Corrigee | s dans [1, secp256k1n/2] |
| EIP status | Final | Implemented |
| Auteur | Vitalik Buterin | Core dev |

## 3. Application aux Produits Crypto

### Software Wallets
- **Tous wallets Ethereum**: Conformite obligatoire post-Homestead
- **Signature validation**: Doit respecter limites s-value

### DEX / DeFi
- **Smart contracts**: Cout creation augmente
- **DELEGATECALL**: Utilise massivement (proxies)

### Hardware Wallets
- **Signature**: Conformite regles EIP-2

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Reseau post-Homestead supportant EIP-2 | 100% |
| **Conforme partiel** | N/A - fork historique obligatoire | N/A |
| **Non-conforme** | N/A | N/A |

Note: EIP-2 est un pre-requis historique, tous les reseaux Ethereum-compatibles l'implementent.

## 5. Sources et References

- EIP-2 Specification: https://eips.ethereum.org/EIPS/eip-2
- Ethereum Homestead Documentation
- Yellow Paper updates
- SafeScoring Criteria EIP001 v1.0"""),

    7891: ("EIP002", """## 1. Vue d'ensemble

EIP-7 (DELEGATECALL) introduit l'opcode DELEGATECALL permettant a un contrat d'executer le code d'un autre contrat tout en conservant le contexte du contrat appelant (msg.sender, msg.value, storage). Cette fonctionnalite est fondamentale pour les patterns de proxy et les libraries partagees.

DELEGATECALL est la base technique des contrats upgradeables utilises par pratiquement tous les protocoles DeFi majeurs.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Opcode | 0xf4 | DELEGATECALL |
| Gas cost | Identique CALL | EIP-7 |
| Context preserves | msg.sender, msg.value, storage | Caller context |
| Code execution | Target contract | Delegate |
| Bloc activation | 1,150,000 | Homestead |
| EIP status | Final | Implemented |
| Auteur | Vitalik Buterin | Ethereum Foundation |
| Prerequis | Homestead fork | Dependance |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Proxy patterns**: EIP-1967 proxies utilisent DELEGATECALL
- **OpenZeppelin**: TransparentProxy, UUPSUpgradeable
- **Diamond pattern**: EIP-2535 multi-facet proxies

### Software Wallets
- **Safe (Gnosis)**: Module system via DELEGATECALL
- **Smart contract wallets**: Extensibilite

### CEX
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Utilisation securisee DELEGATECALL audite | 100% |
| **Conforme partiel** | DELEGATECALL avec restrictions | 50-80% |
| **Non-conforme** | DELEGATECALL vers adresse non verifiee | 0-30% |

Risque: DELEGATECALL vers contrat malveillant peut compromettre le storage.

## 5. Sources et References

- EIP-7 Specification: https://eips.ethereum.org/EIPS/eip-7
- Solidity Documentation: delegatecall
- Proxy Patterns Best Practices
- SafeScoring Criteria EIP002 v1.0"""),

    6559: ("EIP003", """## 1. Vue d'ensemble

EIP-55 definit le standard de checksum pour les adresses Ethereum en utilisant la casse des caracteres hexadecimaux. Cette methode permet de detecter les erreurs de saisie sans modifier la longueur de l'adresse ni ajouter de caracteres supplementaires.

Le checksum EIP-55 est universellement adopte par tous les wallets et interfaces Ethereum pour prevenir les pertes de fonds dues a des erreurs de copie.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Algorithme | Keccak-256 sur lowercase | Hash checksum |
| Format sortie | Mixed-case hex | 40 caracteres |
| Detection erreur | ~99.98% | Probabilite |
| Bits checksum | 120 bits effectifs | Dans la casse |
| Compatibilite | Backward compatible | Lowercase valide |
| EIP status | Final | Accepted |
| Auteur | Vitalik Buterin | 2016 |
| Adoption | Universelle | Wallets, explorers |

## 3. Application aux Produits Crypto

### Software Wallets
- **MetaMask**: Validation EIP-55 automatique
- **Trust Wallet**: Checksum obligatoire
- **Rainbow**: Verification adresse

### Hardware Wallets
- **Ledger**: Affichage checksum
- **Trezor**: Validation EIP-55

### CEX
- **Tous CEX majeurs**: Validation deposits

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Validation EIP-55 sur toutes adresses | 100% |
| **Conforme partiel** | Accepte lowercase sans warning | 50-80% |
| **Non-conforme** | Pas de validation adresse | 0-30% |

Critique: La validation checksum previent les pertes irreversibles.

## 5. Sources et References

- EIP-55 Specification: https://eips.ethereum.org/EIPS/eip-55
- Web3.js toChecksumAddress
- Ethereum Address Format
- SafeScoring Criteria EIP003 v1.0"""),

    6564: ("EIP008", """## 1. Vue d'ensemble

EIP-155 (Simple Replay Attack Protection) introduit le chain ID dans la signature des transactions pour prevenir les attaques par replay entre differentes chaines Ethereum. Avant EIP-155, une transaction signee pour Ethereum mainnet pouvait etre rejouee sur Ethereum Classic ou d'autres forks.

Cette protection est essentielle dans l'ecosysteme multi-chain actuel avec des centaines de reseaux EVM-compatibles.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Chain ID mainnet | 1 | Ethereum |
| Chain ID Goerli | 5 | Testnet |
| Chain ID Polygon | 137 | L2 |
| Chain ID Arbitrum | 42161 | L2 |
| Chain ID BSC | 56 | Alt L1 |
| Bloc activation | 2,675,000 | Spurious Dragon |
| v value | 27/28 ou chainId*2+35/36 | Signature |
| EIP status | Final | Implemented |

## 3. Application aux Produits Crypto

### Software Wallets
- **MetaMask**: Chain ID automatique par reseau
- **Trust Wallet**: Multi-chain native
- **Rainbow**: Verification chain ID

### Hardware Wallets
- **Ledger**: Affiche chain ID transaction
- **Trezor**: Confirmation reseau

### DEX / DeFi
- **Bridges**: Verification source/destination chain

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Chain ID affiche et verifie | 100% |
| **Conforme partiel** | Chain ID en backend uniquement | 50-80% |
| **Non-conforme** | Pas de verification chain ID | 0-30% |

Securite: Protection replay essentielle pour multi-chain.

## 5. Sources et References

- EIP-155 Specification: https://eips.ethereum.org/EIPS/eip-155
- Ethereum Chain IDs: https://chainlist.org/
- Spurious Dragon Hard Fork
- SafeScoring Criteria EIP008 v1.0"""),

    6578: ("EIP022", """## 1. Vue d'ensemble

EIP-712 (Typed Structured Data Hashing and Signing) definit un standard pour la signature de donnees structurees typees, permettant aux utilisateurs de comprendre ce qu'ils signent dans les applications DeFi. Contrairement a eth_sign qui affiche un hash incomprehensible, EIP-712 presente les donnees de maniere lisible.

Ce standard est critique pour la securite UX des transactions DeFi complexes.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Prefixe | 0x1901 | Magic bytes |
| Domain separator | Keccak256(EIP712Domain) | Unique par app |
| Type hash | Keccak256(typeString) | Structure |
| Encoding | ABI encoded | Standardise |
| EIP status | Final | Accepted |
| Auteur | Remco Bloemen | 2017 |
| Adoption | Universelle DeFi | Permits, orders |
| Version | 1 | Actuelle |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Uniswap Permit2**: Signature EIP-712
- **OpenSea**: Signatures orders NFT
- **CoW Protocol**: Order signing
- **Aave**: Credit delegation

### Software Wallets
- **MetaMask**: Affichage structure EIP-712
- **Ledger Live**: Clear signing

### Hardware Wallets
- **Ledger**: Clear signing EIP-712
- **Trezor**: Support structure

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | EIP-712 avec clear signing | 100% |
| **Conforme partiel** | EIP-712 sans affichage clair | 50-80% |
| **Non-conforme** | eth_sign (blind signing) | 0-30% |

Securite: Clear signing previent les arnaques de signature.

## 5. Sources et References

- EIP-712 Specification: https://eips.ethereum.org/EIPS/eip-712
- MetaMask Signing Methods
- OpenZeppelin EIP712
- SafeScoring Criteria EIP022 v1.0"""),

    6583: ("EIP028", """## 1. Vue d'ensemble

EIP-1559 (Fee Market Change for ETH 1.0 Chain) revolutionne le marche des frais Ethereum en introduisant un base fee brule et un priority fee (tip) pour les mineurs/validateurs. Ce mecanisme rend les frais plus previsibles et introduit un element deflationniste pour ETH.

Depuis London hard fork (aout 2021), des millions d'ETH ont ete brules via ce mecanisme.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Bloc activation | 12,965,000 | London fork |
| Date | 5 aout 2021 | Mainnet |
| Base fee ajustement | +/- 12.5% max | Par bloc |
| Target gas | 15M | 50% capacite |
| Max gas | 30M | 100% capacite |
| ETH brules | 4M+ ETH | Cumule 2024 |
| Transaction type | Type 2 (0x02) | Nouveau format |
| Elasticity multiplier | 2 | Capacite bloc |

## 3. Application aux Produits Crypto

### Software Wallets
- **MetaMask**: Estimation gas EIP-1559
- **Trust Wallet**: Support natif
- **Rainbow**: Priority fee suggestion

### Hardware Wallets
- **Ledger**: Affichage maxFeePerGas
- **Trezor**: Confirmation type 2

### DEX / DeFi
- **Tous protocoles**: Gas optimization

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Support type 2 tx, estimation dynamique | 100% |
| **Conforme partiel** | Legacy tx (type 0) supportees | 50-80% |
| **Non-conforme** | Pas d'estimation gas fiable | 0-30% |

Impact: Meilleure UX gas, deflationary mechanism ETH.

## 5. Sources et References

- EIP-1559 Specification: https://eips.ethereum.org/EIPS/eip-1559
- London Hard Fork Documentation
- Ultrasound.money (burn tracker)
- SafeScoring Criteria EIP028 v1.0"""),

    6585: ("EIP030", """## 1. Vue d'ensemble

EIP-1967 (Standard Proxy Storage Slots) definit des emplacements de storage standardises pour les proxies upgradeables, permettant aux explorateurs et outils de detecter automatiquement l'implementation reelle d'un contrat proxy. Ce standard resout le probleme de lisibilite des proxies sur Etherscan et autres outils.

EIP-1967 est utilise par OpenZeppelin, Safe, et pratiquement tous les protocoles upgradeables.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Implementation slot | bytes32(uint256(keccak256('eip1967.proxy.implementation'))-1) | 0x360894... |
| Admin slot | bytes32(uint256(keccak256('eip1967.proxy.admin'))-1) | 0xb53127... |
| Beacon slot | bytes32(uint256(keccak256('eip1967.proxy.beacon'))-1) | 0xa3f0ad... |
| EIP status | Final | Accepted |
| Auteur | Santiago Palladino | OpenZeppelin |
| Date | 2019 | Publication |
| Adoption | Standard de facto | Proxies |
| Collision-free | Design intentionnel | Random slots |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Aave**: Tous contrats upgradeables
- **Compound**: Comptroller proxy
- **Uniswap V3**: Limited use

### Software Wallets
- **Etherscan**: Detection auto implementation
- **Tenderly**: Debugging proxies

### CEX
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Proxy EIP-1967 compliant | 100% |
| **Conforme partiel** | Proxy custom avec slots documentes | 50-80% |
| **Non-conforme** | Proxy non standard, opaque | 0-30% |

Transparence: Permet verification implementation reelle.

## 5. Sources et References

- EIP-1967 Specification: https://eips.ethereum.org/EIPS/eip-1967
- OpenZeppelin Proxy Documentation
- Etherscan Proxy Verification
- SafeScoring Criteria EIP030 v1.0"""),

    6586: ("EIP031", """## 1. Vue d'ensemble

EIP-2098 (Compact Signature Representation) definit une representation compacte des signatures ECDSA de 64 bytes au lieu de 65 bytes en encodant la parite de la recovery value (v) dans le bit de poids fort de s. Cette optimisation reduit les couts de gas et la taille des calldata.

Particulierement utile pour les applications multi-signature et les rollups ou chaque byte compte.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Taille standard | 65 bytes | r(32) + s(32) + v(1) |
| Taille compacte | 64 bytes | r(32) + yParityAndS(32) |
| v encoding | bit 255 de s | yParity (0 ou 1) |
| Gas savings | ~16 gas/signature | Calldata reduction |
| EIP status | Final | Accepted |
| Auteur | Richard Moore | ethers.js |
| Compatibilite | Backward compatible | Conversion possible |
| Support | ethers.js, viem | Libraries |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Gnosis Safe**: Signatures compactes
- **Cowswap**: Order signatures
- **Rollups**: Compression calldata

### Software Wallets
- **ethers.js**: Support natif
- **viem**: Compact signature utils

### Hardware Wallets
- Implementation possible, adoption limitee

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Support signature compacte | 100% |
| **Conforme partiel** | Conversion en standard 65 bytes | 50-80% |
| **Non-conforme** | Rejection signatures compactes | 0-30% |

Optimisation: Principalement pour batch operations.

## 5. Sources et References

- EIP-2098 Specification: https://eips.ethereum.org/EIPS/eip-2098
- ethers.js Signature Utils
- Gas Optimization Patterns
- SafeScoring Criteria EIP031 v1.0"""),

    6569: ("EIP013", """## 1. Vue d'ensemble

EIP-191 (Signed Data Standard) definit un format standard pour les donnees signees off-chain en prefixant le message avec un byte de version. Cette specification previent les attaques ou une signature valide pour un message pourrait etre reutilisee comme signature de transaction.

EIP-191 est la base de eth_sign, personal_sign et des standards de signature ulterieurs.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Version 0x00 | Validator data | Contract specific |
| Version 0x01 | Structured data | EIP-712 |
| Version 0x19 | Intended validator | Legacy |
| Version 0x45 | personal_sign | Ethereum Signed Message |
| Format | 0x19 <version> <data> | Prefixed |
| Hash | keccak256(formatted) | Signature |
| EIP status | Final | Accepted |
| Auteur | Martin Holst Swende | 2016 |

## 3. Application aux Produits Crypto

### Software Wallets
- **MetaMask**: personal_sign implementation
- **WalletConnect**: Message signing
- **Tous wallets**: Standard de facto

### DEX / DeFi
- **Authentication**: Sign-in with Ethereum
- **Gasless transactions**: Meta-transactions

### Hardware Wallets
- **Ledger**: Message signing
- **Trezor**: personal_sign support

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | EIP-191 prefixing correct | 100% |
| **Conforme partiel** | Support sans affichage clair | 50-80% |
| **Non-conforme** | Raw message signing | 0-30% |

Securite: Prefixing empeche replay comme transaction.

## 5. Sources et References

- EIP-191 Specification: https://eips.ethereum.org/EIPS/eip-191
- Ethereum Signed Message Standard
- personal_sign Documentation
- SafeScoring Criteria EIP013 v1.0""")
}

if __name__ == "__main__":
    print("Saving EIP summaries (batch 1)...")
    success = 0
    for norm_id, (code, summary) in SUMMARIES.items():
        ok = save_summary(norm_id, code, summary)
        status = "OK" if ok else "FAIL"
        print(f"  {code}: {status}")
        if ok:
            success += 1

    print(f"\nResult: {success}/{len(SUMMARIES)} saved")
