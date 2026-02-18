#!/usr/bin/env python3
"""Batch save summaries for EIP norms - batch 2"""
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
    6560: ("EIP004", """## 1. Vue d'ensemble

EIP-100 modifie la formule d'ajustement de difficulte d'Ethereum pour inclure les blocs oncle dans le calcul. Cette modification garantit un temps de bloc plus stable en tenant compte de la propagation reseau et des blocs orphelins.

Ce changement fait partie de la mise a jour Byzantium et contribue a la stabilite du consensus.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Bloc activation | 4,370,000 | Byzantium |
| Date | Octobre 2017 | Mainnet |
| Formule precedente | parent_diff + floor(max(1 - (timestamp - parent_timestamp) // 10, -99) * parent_diff // 2048) | Pre-EIP |
| Formule nouvelle | parent_diff + floor(max(y - (timestamp - parent_timestamp) // 9, -99) * parent_diff // 2048) | EIP-100 |
| y value | 1 si no uncles, 2 si uncles | Uncle adjustment |
| EIP status | Final | Implemented |
| Auteur | Vitalik Buterin | Core dev |
| Impact | Block time stability | Mainnet |

## 3. Application aux Produits Crypto

### Mining/Consensus
- **Nodes Ethereum**: Implementation obligatoire post-Byzantium
- **Mining pools**: Ajustement rewards oncles

### DEX / DeFi
- Impact indirect via stabilite temps de bloc

### Software Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Client ETH post-Byzantium | 100% |
| **Conforme partiel** | N/A - fork obligatoire | N/A |
| **Non-conforme** | N/A | N/A |

Note: Modification consensus historique, obligatoire pour tous les clients.

## 5. Sources et References

- EIP-100 Specification: https://eips.ethereum.org/EIPS/eip-100
- Byzantium Hard Fork Documentation
- Yellow Paper Difficulty Section
- SafeScoring Criteria EIP004 v1.0"""),

    6561: ("EIP005", """## 1. Vue d'ensemble

EIP-140 introduit l'opcode REVERT permettant aux smart contracts d'annuler l'execution et retourner les donnees restantes tout en remboursant le gas non utilise. Avant cette EIP, les echecs utilisaient soit INVALID (consomme tout le gas) soit RETURN (succes).

REVERT est fondamental pour la gestion d'erreurs dans les smart contracts modernes.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Opcode | 0xfd | REVERT |
| Gas cost | 0 (retourne remaining) | Efficient |
| Bloc activation | 4,370,000 | Byzantium |
| Return data | Preserved | Error messages |
| State changes | Reverted | Atomicite |
| EIP status | Final | Implemented |
| Auteur | Vitalik Buterin, Alex Beregszaszi | Core devs |
| Solidity | require(), revert() | Mapping |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Tous smart contracts**: require() statements
- **Error handling**: Custom errors (post 0.8.4)
- **Atomicity**: Transaction rollback

### Software Wallets
- **MetaMask**: Error message display
- **Tenderly**: Transaction debugging

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Proper use of require/revert | 100% |
| **Conforme partiel** | Mixed error handling | 50-80% |
| **Non-conforme** | Silent failures | 0-30% |

Best practice: Toujours utiliser revert avec message d'erreur explicite.

## 5. Sources et References

- EIP-140 Specification: https://eips.ethereum.org/EIPS/eip-140
- Solidity Error Handling
- Byzantium Changes
- SafeScoring Criteria EIP005 v1.0"""),

    6562: ("EIP006", """## 1. Vue d'ensemble

EIP-145 introduit les opcodes de decalage de bits natifs (SHL, SHR, SAR) dans l'EVM, permettant des operations de manipulation de bits efficaces. Avant cette EIP, ces operations necessitaient des multiplications/divisions couteuses en gas.

Ces opcodes sont essentiels pour l'optimisation des smart contracts manipulant des donnees binaires.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| SHL | 0x1b | Shift Left |
| SHR | 0x1c | Shift Right Logical |
| SAR | 0x1d | Shift Right Arithmetic |
| Gas cost | 3 (chaque) | Constant |
| Bloc activation | 7,280,000 | Constantinople |
| Date | Fevrier 2019 | Mainnet |
| EIP status | Final | Implemented |
| Auteur | Alex Beregszaszi, Pawel Bylica | Core devs |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Uniswap V3**: Tick math optimizations
- **Cryptography**: Bit manipulation
- **Packing**: Multiple values in single slot

### Software Wallets
- Non applicable directement

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|-----------|--------|-----------|
| **Conforme complet** | EVM post-Constantinople | 100% |
| **Conforme partiel** | N/A - fork obligatoire | N/A |
| **Non-conforme** | N/A | N/A |

Optimisation: Utilisation native vs MUL/DIV economise ~60 gas.

## 5. Sources et References

- EIP-145 Specification: https://eips.ethereum.org/EIPS/eip-145
- Constantinople Hard Fork
- EVM Opcode Reference
- SafeScoring Criteria EIP006 v1.0"""),

    7892: ("EIP007", """## 1. Vue d'ensemble

EIP-150 (Gas Cost Changes for IO-heavy Operations) augmente le cout en gas des operations lourdes en I/O comme EXTCODESIZE, EXTCODECOPY, BALANCE et CALL. Ce changement combat les attaques de spam qui exploitaient ces operations sous-evaluees pour ralentir le reseau.

Implemente lors du Tangerine Whistle hard fork suite aux attaques DoS de septembre 2016.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur avant | Valeur apres | Reference |
|-----------|--------------|--------------|-----------|
| EXTCODESIZE | 20 | 700 | +35x |
| EXTCODECOPY | 20 | 700 | +35x |
| BALANCE | 20 | 400 | +20x |
| SLOAD | 50 | 200 | +4x |
| CALL | 40 | 700 | +17.5x |
| Bloc activation | 2,463,000 | - | Tangerine Whistle |
| Date | Octobre 2016 | - | Post-DoS |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Tous smart contracts**: Impact sur appels externes
- **Libraries**: Cout accru DELEGATECALL
- **Proxies**: Overhead additionnel

### Software Wallets
- **Gas estimation**: Changements post-EIP-150

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Client post-Tangerine Whistle | 100% |
| **Conforme partiel** | N/A - fork obligatoire | N/A |
| **Non-conforme** | N/A | N/A |

Contexte historique: Reponse aux attaques DoS Shanghai/Tangerine.

## 5. Sources et References

- EIP-150 Specification: https://eips.ethereum.org/EIPS/eip-150
- Tangerine Whistle Hard Fork
- DoS Attack Postmortem 2016
- SafeScoring Criteria EIP007 v1.0"""),

    6565: ("EIP009", """## 1. Vue d'ensemble

EIP-158 (State Trie Clearing) supprime les comptes vides du state trie Ethereum pour reduire la taille de l'etat global. Un compte vide est defini comme ayant nonce 0, balance 0, code vide et storage vide.

Cette optimisation fait partie du nettoyage post-attaques DoS de 2016.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Bloc activation | 2,675,000 | Spurious Dragon |
| Date | Novembre 2016 | Mainnet |
| Compte vide | nonce=0, balance=0, code empty, storage empty | Definition |
| Action | Suppression du state | Cleanup |
| Comptes supprimes | ~20 millions | Estimation DoS |
| EIP status | Final | Implemented |
| Auteur | Vitalik Buterin | Core dev |
| Prerequis | EIP-161 | Related |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Smart contracts**: Ne peuvent plus creer de comptes vides persistants
- **Gas refunds**: Suppression compte donne refund

### Software Wallets
- Impact minimal pour utilisateurs

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Client post-Spurious Dragon | 100% |
| **Conforme partiel** | N/A - fork obligatoire | N/A |
| **Non-conforme** | N/A | N/A |

Contexte: Nettoyage necessaire post-attaques DoS.

## 5. Sources et References

- EIP-158 Specification: https://eips.ethereum.org/EIPS/eip-158
- Spurious Dragon Hard Fork
- State Trie Documentation
- SafeScoring Criteria EIP009 v1.0"""),

    7893: ("EIP010", """## 1. Vue d'ensemble

EIP-160 augmente le cout de l'opcode EXP (exponentiation) de 10 gas + 10 gas par byte a 10 gas + 50 gas par byte de l'exposant. Cette modification corrige une sous-evaluation qui permettait des attaques DoS via calculs exponentiels massifs.

Fait partie des corrections Tangerine Whistle post-attaques 2016.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur avant | Valeur apres | Reference |
|-----------|--------------|--------------|-----------|
| EXP base cost | 10 | 10 | Inchange |
| EXP byte cost | 10 | 50 | +5x |
| Exemple 256^255 | ~2,560 gas | ~12,810 gas | Calcul |
| Bloc activation | 2,463,000 | - | Tangerine Whistle |
| Date | Octobre 2016 | - | Mainnet |
| EIP status | Final | Implemented |
| Auteur | Vitalik Buterin | Core dev |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Cryptographie**: Cout accru operations exponentielles
- **Signature verification**: Impact modere
- **RSA operations**: Significativement plus cher

### Software Wallets
- Gas estimation affectee

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Client post-Tangerine Whistle | 100% |
| **Conforme partiel** | N/A - fork obligatoire | N/A |
| **Non-conforme** | N/A | N/A |

Securite: Prevention attaques DoS via EXP.

## 5. Sources et References

- EIP-160 Specification: https://eips.ethereum.org/EIPS/eip-160
- Tangerine Whistle Documentation
- Gas Cost Rationalization
- SafeScoring Criteria EIP010 v1.0"""),

    7894: ("EIP011", """## 1. Vue d'ensemble

EIP-161 (State Trie Clearing - Part 2) complete EIP-158 en definissant precisement quand un compte devient vide et doit etre supprime. Introduit la regle que "toucher" un compte vide le supprime du state.

Cette EIP finalise le nettoyage des millions de comptes vides crees durant les attaques DoS de 2016.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Bloc activation | 2,675,000 | Spurious Dragon |
| Date | Novembre 2016 | Mainnet |
| Touch definition | Toute operation modifiant compte | EIP-161 |
| Empty account | nonce=0, balance=0, code=0, storage=0 | Definition |
| Deletion trigger | Touch on empty = delete | Automatique |
| EIP status | Final | Implemented |
| Auteur | Gavin Wood | Core dev |
| Relation | Depends on EIP-158 | Complementaire |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **CREATE2**: Interaction avec comptes vides
- **Self-destruct**: Comportement modifie

### Software Wallets
- Non applicable directement

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Client post-Spurious Dragon | 100% |
| **Conforme partiel** | N/A - fork obligatoire | N/A |
| **Non-conforme** | N/A | N/A |

Technique: Reduit taille state de maniere significative.

## 5. Sources et References

- EIP-161 Specification: https://eips.ethereum.org/EIPS/eip-161
- Spurious Dragon Documentation
- State Management Ethereum
- SafeScoring Criteria EIP011 v1.0"""),

    7895: ("EIP012", """## 1. Vue d'ensemble

EIP-170 limite la taille maximale du code des smart contracts a 24,576 bytes (24 KB). Cette limite previent les attaques DoS via deploiement de contrats extremement larges et garantit que tout le code peut etre lu dans une seule requete.

Implemente lors de Spurious Dragon suite aux attaques de 2016.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Limite code | 24,576 bytes | 24 KB |
| Hex representation | 0x6000 | Max size |
| Bloc activation | 2,675,000 | Spurious Dragon |
| Date | Novembre 2016 | Mainnet |
| Deploiement > limit | Revert | Echec creation |
| EIP status | Final | Implemented |
| Auteur | Vitalik Buterin | Core dev |
| Init code limit | Aucune (voir EIP-3860) | Separate |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Large protocols**: Doivent utiliser libraries/proxies
- **Diamond pattern**: Contourne la limite
- **Code splitting**: Best practice

### Software Wallets
- Non applicable directement

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Contrats < 24KB | 100% |
| **Conforme partiel** | Utilisation libraries externes | 50-80% |
| **Non-conforme** | N/A - limite EVM | N/A |

Design: Encourage modularite et reutilisation.

## 5. Sources et References

- EIP-170 Specification: https://eips.ethereum.org/EIPS/eip-170
- Spurious Dragon Documentation
- Contract Size Optimization Guide
- SafeScoring Criteria EIP012 v1.0"""),

    7903: ("EIP021", """## 1. Vue d'ensemble

EIP-601 (Ethereum Hierarchy for Deterministic Wallets) etend BIP-44 pour l'ecosysteme Ethereum en definissant la derivation de cles pour les comptes Ethereum. Cette specification permet l'interoperabilite entre tous les wallets HD compatibles.

Le path m/44'/60'/0'/0/x est devenu le standard de facto pour la derivation d'adresses Ethereum.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Coin type | 60' | ETH mainnet |
| Path standard | m/44'/60'/0'/0/x | BIP-44 style |
| Account | Hardened (60') | Par wallet |
| Change | 0 (non utilise) | Ethereum n'a pas de change |
| Index | Non-hardened | Adresses |
| Testnet coin type | 1' | Tous testnets |
| EIP status | Draft | De facto standard |
| Base | BIP-32, BIP-44 | Derivation |

## 3. Application aux Produits Crypto

### Software Wallets
- **MetaMask**: m/44'/60'/0'/0/x
- **Trust Wallet**: Standard EIP-601
- **Rainbow**: Meme derivation

### Hardware Wallets
- **Ledger**: Support EIP-601
- **Trezor**: Path configurable

### CEX
- Derivation interne potentiellement differente

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Path m/44'/60'/0'/0/x | 100% |
| **Conforme partiel** | Path custom documente | 50-80% |
| **Non-conforme** | Derivation non standard | 0-30% |

Interoperabilite: Path standard permet recovery cross-wallet.

## 5. Sources et References

- EIP-601 Specification: https://eips.ethereum.org/EIPS/eip-601
- BIP-44 Specification
- Derivation Path Standards
- SafeScoring Criteria EIP021 v1.0"""),

    7902: ("EIP020", """## 1. Vue d'ensemble

EIP-600 (Ethereum Purpose Allocation for Deterministic Wallets) reserve le purpose 60' dans la hierarchie BIP-44 pour Ethereum et les chaines EVM-compatibles. Cette allocation formelle garantit l'absence de collision avec d'autres cryptocurrencies dans la derivation HD.

Base de l'interoperabilite des wallets HD Ethereum.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Purpose | 44' | BIP-44 |
| Coin type ETH | 60' | Allocation |
| Coin type ETC | 61' | Ethereum Classic |
| Full path | m/44'/60'/account'/change/index | Standard |
| Hardened | Purpose, coin, account | Securite |
| Non-hardened | Change, index | Derivation publique |
| EIP status | Draft | De facto standard |
| SLIP-0044 | Reference officielle | Coin types |

## 3. Application aux Produits Crypto

### Software Wallets
- **Tous wallets HD**: Utilisent coin type 60'
- **Multi-chain wallets**: 60' pour toutes EVM chains

### Hardware Wallets
- **Ledger**: Coin type standard
- **Trezor**: Support SLIP-0044

### CEX
- Utilisent potentiellement derivation custom

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Coin type 60' pour Ethereum | 100% |
| **Conforme partiel** | Coin type custom documente | 50-80% |
| **Non-conforme** | Collision avec autres coins | 0-30% |

Standard: Reservation officielle dans SLIP-0044.

## 5. Sources et References

- EIP-600 Specification: https://eips.ethereum.org/EIPS/eip-600
- SLIP-0044 Registered Coin Types
- BIP-44 Specification
- SafeScoring Criteria EIP020 v1.0"""),

    6584: ("EIP029", """## 1. Vue d'ensemble

EIP-1884 reprices plusieurs opcodes EVM pour mieux refleter leur cout reel en ressources, notamment SLOAD (200 -> 800 gas), BALANCE (400 -> 700 gas) et EXTCODEHASH (400 -> 700 gas). Introduit aussi SELFBALANCE comme alternative moins couteuse a BALANCE(address(this)).

Implemente lors d'Istanbul (decembre 2019).

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur avant | Valeur apres | Reference |
|-----------|--------------|--------------|-----------|
| SLOAD | 200 | 800 | +4x |
| BALANCE | 400 | 700 | +1.75x |
| EXTCODEHASH | 400 | 700 | +1.75x |
| SELFBALANCE | N/A | 5 | Nouveau |
| Bloc activation | 9,069,000 | - | Istanbul |
| Date | Decembre 2019 | - | Mainnet |
| EIP status | Final | Implemented |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Contrats legacy**: Cout augmente SLOAD
- **Optimisation**: SELFBALANCE vs BALANCE
- **Gas estimation**: Ajustements necessaires

### Software Wallets
- Gas estimation mise a jour

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | Contrats post-Istanbul optimises | 100% |
| **Conforme partiel** | Contrats legacy non optimises | 50-80% |
| **Non-conforme** | N/A - fork obligatoire | N/A |

Breaking change: Certains contrats necessitent plus de gas post-fork.

## 5. Sources et References

- EIP-1884 Specification: https://eips.ethereum.org/EIPS/eip-1884
- Istanbul Hard Fork
- Gas Cost Analysis
- SafeScoring Criteria EIP029 v1.0"""),

    7904: ("EIP023", """## 1. Vue d'ensemble

EIP-1014 (Skinny CREATE2) introduit l'opcode CREATE2 permettant de predire l'adresse d'un contrat avant son deploiement. L'adresse est calculee a partir du sender, salt, et init code hash, permettant des patterns comme les counterfactual instantiations.

CREATE2 est fondamental pour les Layer 2, account abstraction et meta-transactions.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Opcode | 0xf5 | CREATE2 |
| Adresse | keccak256(0xff ++ sender ++ salt ++ keccak256(init_code))[12:] | Formule |
| Gas cost | 32000 + memory expansion | Similar CREATE |
| Salt | 32 bytes | User-defined |
| Bloc activation | 7,280,000 | Constantinople |
| Date | Fevrier 2019 | Mainnet |
| EIP status | Final | Implemented |
| Auteur | Vitalik Buterin | Core dev |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Uniswap**: Pair address prediction
- **Safe**: Counterfactual deployment
- **L2s**: Deterministic addresses

### Software Wallets
- **Smart contract wallets**: Pre-computed addresses

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | CREATE2 avec salt unique | 100% |
| **Conforme partiel** | CREATE2 salt previsible | 50-80% |
| **Non-conforme** | Salt reutilise | 0-30% |

Securite: Salt collision permettrait code replacement.

## 5. Sources et References

- EIP-1014 Specification: https://eips.ethereum.org/EIPS/eip-1014
- Constantinople Hard Fork
- CREATE2 Security Considerations
- SafeScoring Criteria EIP023 v1.0"""),

    7905: ("EIP024", """## 1. Vue d'ensemble

EIP-1052 introduit l'opcode EXTCODEHASH permettant d'obtenir le hash keccak256 du code d'un contrat externe de maniere efficace. Avant cette EIP, verifier le code d'un contrat necessitait EXTCODECOPY couteux.

Utile pour les checks d'immutabilite et la verification d'implementation de proxies.

## 2. Specifications Techniques (DONNEES FACTUELLES)

| Parametre | Valeur | Reference |
|-----------|--------|-----------|
| Opcode | 0x3f | EXTCODEHASH |
| Gas cost | 400 (puis 700 EIP-1884) | Current |
| Retour compte vide | 0 | Pas de code |
| Retour EOA | keccak256("") | Empty code hash |
| Retour inexistant | 0 | Compte non existant |
| Bloc activation | 7,280,000 | Constantinople |
| EIP status | Final | Implemented |
| Auteur | Nick Johnson, Pawel Bylica | Core devs |

## 3. Application aux Produits Crypto

### DEX / DeFi
- **Proxy verification**: Check implementation
- **Library calls**: Verify target
- **Security checks**: Contract vs EOA

### Software Wallets
- Detection type adresse

### Hardware Wallets
- Non applicable directement

## 4. Criteres d'Evaluation SafeScoring

| Niveau | Description | Points |
|--------|-------------|--------|
| **Conforme complet** | EXTCODEHASH pour verification | 100% |
| **Conforme partiel** | EXTCODESIZE alternatif | 50-80% |
| **Non-conforme** | Pas de verification code | 0-30% |

Utilisation: Differencier contrat vs EOA efficacement.

## 5. Sources et References

- EIP-1052 Specification: https://eips.ethereum.org/EIPS/eip-1052
- Constantinople Hard Fork
- Code Hash Applications
- SafeScoring Criteria EIP024 v1.0""")
}

if __name__ == "__main__":
    print("Saving EIP summaries (batch 2)...")
    success = 0
    for norm_id, (code, summary) in SUMMARIES.items():
        ok = save_summary(norm_id, code, summary)
        status = "OK" if ok else "FAIL"
        print(f"  {code}: {status}")
        if ok:
            success += 1

    print(f"\nResult: {success}/{len(SUMMARIES)} saved")
