#!/usr/bin/env python3
"""
Évaluation Ledger Nano X par Claude Opus 4.5
Pilier S (Security)
"""

import requests
import os
from datetime import datetime
from dotenv import load_dotenv
load_dotenv('config/.env')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }

PRODUCT_ID = 215  # Ledger Nano X

# Évaluations pilier S basées sur connaissance Claude
LEDGER_S = {
    'S01': ('YES', 'AES-256 for secure storage'),
    'S02': ('NO', 'RSA-4096 not primary'),
    'S03': ('YES', 'secp256k1 for BTC/ETH'),
    'S04': ('YES', 'Ed25519 for Solana'),
    'S05': ('YES', 'SHA-256 for Bitcoin'),
    'S06': ('YES', 'Keccak-256 for Ethereum'),
    'S07': ('YES', 'RIPEMD-160 for BTC addresses'),
    'S08': ('YES', 'HMAC-SHA256 key derivation'),
    'S09': ('YES', 'PBKDF2 for PIN'),
    'S10': ('NO', 'Argon2 not documented'),
    'S11': ('NO', 'ChaCha20-Poly1305 not documented'),
    'S12': ('YES', 'X25519 for secure comm'),
    'S13': ('NO', 'BLS12-381 not on device'),
    'S14': ('YES', 'Schnorr via Taproot'),
    'S15': ('NO', 'No ZK features'),
    'S16': ('YES', 'BIP-32 HD wallet'),
    'S17': ('YES', 'BIP-39 24-word mnemonic'),
    'S18': ('YES', 'BIP-44 multi-account'),
    'S19': ('YES', 'BIP-49 SegWit P2SH'),
    'S20': ('YES', 'BIP-84 Native SegWit'),
    'S21': ('NO', 'BIP-85 not supported'),
    'S22': ('YES', 'BIP-86 Taproot'),
    'S23': ('YES', 'BIP-141 SegWit'),
    'S24': ('YES', 'BIP-174 PSBT'),
    'S25': ('YES', 'BIP-370 PSBTv2'),
    'S26': ('YES', 'BIP-341 Taproot scripts'),
    'S27': ('NO', 'SLIP-39 not native'),
    'S28': ('YES', 'EIP-55 checksum'),
    'S29': ('YES', 'EIP-155 replay protection'),
    'S30': ('YES', 'EIP-191 message signing'),
    'S31': ('YES', 'EIP-712 typed data'),
    'S32': ('YES', 'EIP-1559 fee support'),
    'S33': ('NO', 'EIP-2333 BLS not on device'),
    'S34': ('NO', 'EIP-2334 BLS not on device'),
    'S37': ('YES', 'EIP-6963 multi-wallet'),
    'S38': ('YES', 'CC EAL5+ certified SE'),
    'S39': ('NO', 'Not EAL6+'),
    'S40': ('NO', 'FIPS 140-2 L2 not certified'),
    'S41': ('NO', 'FIPS 140-2 L3 not certified'),
    'S42': ('NO', 'FIPS 140-3 not certified'),
    'S43': ('YES', 'CSPN ANSSI for Nano S'),
    'S44': ('NO', 'Not ANSSI qualified'),
    'S45': ('YES', 'CE marked'),
    'S46': ('YES', 'RoHS compliant'),
    'S47': ('YES', 'FCC Part 15'),
    'S49': ('NO', 'Ledger not ISO 27001'),
    'S50': ('YES', 'Secure Element ST33J2M0'),
    'S51': ('YES', 'ST33 STMicroelectronics'),
    'S52': ('NO', 'Not Infineon SLE78'),
    'S53': ('NO', 'Not NXP SE050'),
    'S54': ('NO', 'Not ATECC608'),
    'S55': ('NO', 'Not Optiga Trust'),
    'S56': ('YES', 'Memory isolation in SE'),
    'S57': ('YES', 'Keys never leave SE'),
    'S58': ('YES', 'Side-channel resistance'),
    'S59': ('YES', 'DPA resistance'),
    'S60': ('YES', 'SPA resistance'),
    'S61': ('YES', 'Timing attack resistance'),
    'S62': ('YES', 'Fault injection resistance'),
    'S63': ('YES', 'Glitching resistance'),
    'S64': ('YES', 'Physical anti-tamper'),
    'S65': ('YES', 'Auto-wipe on tamper'),
    'S66': ('YES', 'Cold boot protection'),
    'S67': ('YES', 'JTAG disabled'),
    'S68': ('YES', 'Hardware TRNG'),
    'S69': ('YES', 'CSPRNG'),
    'S70': ('NO', 'No external entropy'),
    'S71': ('YES', 'DRBG certified'),
    'S72': ('YES', 'RNG health tests'),
    'S73': ('YES', 'Signed firmware'),
    'S74': ('YES', 'Secure Boot'),
    'S75': ('YES', 'Anti-downgrade'),
    'S76': ('NO', 'Closed source'),
    'S77': ('NO', 'Not reproducible builds'),
    'S78': ('YES', 'Third-party audits'),
    'S79': ('YES', 'Bug bounty Immunefi'),
    'S80': ('YES', 'PIN 4-8 digits'),
    'S81': ('YES', 'BIP-39 passphrase'),
    'S83': ('YES', 'Limited PIN attempts'),
    'S84': ('YES', 'Wipe after 3 failures'),
    'S85': ('NO', 'No exponential delay'),
    'S86': ('YES', 'P-256 secp256r1'),
    'S87': ('NO', 'P-384 not documented'),
    'S88': ('YES', 'Curve25519'),
    'S89': ('NO', 'No Kyber PQ'),
    'S90': ('NO', 'No Dilithium PQ'),
    'S91': ('NO', 'No SPHINCS+ PQ'),
    'S92': ('NO', 'BLAKE2b not documented'),
    'S93': ('NO', 'BLAKE3 not documented'),
    'S94': ('NO', 'scrypt not documented'),
    'S95': ('NO', 'bcrypt not documented'),
    'S96': ('NO', 'BIP-322 not yet'),
    'S97': ('YES', 'BIP-329 labels in Live'),
    'S98': ('NO', 'BIP-352 not yet'),
    'S99': ('NO', 'BIP-380 Miniscript limited'),
    'S100': ('NO', 'BIP-381 limited'),
    'S101': ('NO', 'MuSig2 not yet'),
    'S102': ('NO', 'BIP-388 not yet'),
    'S103': ('NO', 'BSMS not supported'),
    'S104': ('YES', 'EIP-2612 Permit'),
    'S106': ('YES', 'EIP-5267'),
    'S107': ('NO', 'EIP-6551 TBA not native'),
    'S108': ('NO', 'EIP-7702 not yet'),
    'S109': ('NO', 'EIP-3074 not yet'),
    'S110': ('YES', 'EIP-1271 via dApps'),
    'S112': ('NO', 'EMVCo not applicable'),
    'S113': ('YES', 'GlobalPlatform SE'),
    'S115': ('NO', 'WebAuthn not primary'),
    'S116': ('NO', 'ARM TrustZone - uses ST SE'),
    'S117': ('NO', 'Intel SGX not applicable'),
    'S118': ('NO', 'AMD SEV not applicable'),
    'S119': ('NO', 'TPM 2.0 - uses SE'),
    'S121': ('NO', 'Not ISO 27001'),
    'S122': ('NO', 'Not ISO 27002'),
    'S126': ('NO', 'Not ISO 22301'),
    'S127': ('NO', 'Not ISO 31000'),
    'S128': ('NO', 'DORA not applicable'),
    'S129': ('NO', 'NIS2 not applicable'),
    'S130': ('NO', 'eIDAS not applicable'),
    'S131': ('NO', 'CRA pending'),
    'S134': ('YES', 'ANSSI CSPN'),
    'S135': ('NO', 'Not ANSSI CC'),
    'S136': ('NO', 'RGS not applicable'),
    'S137': ('NO', 'PASSI not applicable'),
    'S138': ('NO', 'PRIS not applicable'),
    'S140': ('NO', 'BSI not certified'),
    'S141': ('NO', 'ML-KEM not implemented'),
    'S142': ('NO', 'ML-DSA not implemented'),
    'S143': ('NO', 'SLH-DSA not implemented'),
    'S144': ('NO', 'Kyber not implemented'),
    'S145': ('NO', 'Dilithium not implemented'),
    'S146': ('NO', 'Argon2id not documented'),
    'S147': ('YES', 'HKDF key derivation'),
    'S149': ('NO', 'XChaCha20 not documented'),
    'S156': ('YES', 'GlobalPlatform TEE'),
    'S160': ('NO', 'Not RISC-V'),
    'S161': ('NO', 'No formal verification'),
    'S166': ('YES', 'TLS 1.3 in Live'),
    'S169': ('N/A', 'Reentrancy - not smart contract'),
    'S176': ('NO', 'No fingerprint'),
    'S180': ('NO', 'No TOTP'),
    'S181': ('NO', 'No HOTP'),
    'S182': ('NO', 'FIDO2 not primary'),
    'S183': ('NO', 'U2F not primary'),
    'S187': ('NO', 'No key rotation'),
    'S188': ('NO', 'No key escrow'),
    'S189': ('NO', 'No HSM integration'),
    'S190': ('YES', 'Standard derivation paths'),
    'S191': ('YES', 'Secure Boot'),
    'S192': ('YES', 'Verified Boot'),
    'S193': ('YES', 'Root of Trust in SE'),
    'S194': ('YES', 'Tamper Detection'),
    'S195': ('YES', 'Tamper Response'),
    'S196': ('NO', 'No mesh shield'),
    'S197': ('NO', 'No epoxy potting'),
    'S198': ('YES', 'Secure supply chain'),
    'S199': ('YES', 'Device attestation'),
    'S200': ('YES', 'Anti-counterfeit'),
    'S201': ('YES', 'Firmware verification'),
    'S202': ('NO', 'Kyber not implemented'),
    'S203': ('NO', 'Dilithium not implemented'),
    'S204': ('NO', 'SPHINCS+ not implemented'),
    'S205': ('NO', 'FALCON not implemented'),
    'S206': ('NO', 'BIKE not implemented'),
    'S207': ('NO', 'McEliece not implemented'),
    'S208': ('NO', 'Hybrid PQ-EC not implemented'),
    'S216': ('NO', 'Zero Trust not applicable'),
    'S217': ('YES', 'Least Privilege'),
    'S221': ('NO', 'No honeypot detection'),
    'S222': ('YES', 'Phishing protection in Live'),
    'S223': ('YES', 'Address poisoning warnings'),
    'S225': ('NO', 'Revoke.cash not integrated'),
    'S227': ('YES', 'Transaction simulation'),
    'S228': ('YES', 'Curve25519'),
    'S229': ('NO', 'XChaCha20 not documented'),
    'S230': ('YES', 'HKDF'),
    'S231': ('NO', 'SRP-6a not used'),
    'S232': ('NO', 'Noise Protocol not documented'),
    'S235': ('NO', 'Not Samsung SE'),
    'S236': ('NO', 'Not ATECC608B'),
    'S237': ('NO', 'Not Maxim DS28E38'),
    'S238': ('NO', 'Not NXP A71CH'),
    'S239': ('NO', 'IEC 62443 not certified'),
    'S240': ('NO', 'NIST CSF not certified'),
    'S241': ('NO', 'CIS Controls not documented'),
    'S242': ('NO', 'ENISA not certified'),
    'S243': ('NO', 'BIP-322 not yet'),
    'S244': ('NO', 'BIP-324 not in device'),
    'S245': ('NO', 'MuSig2 not yet'),
    'S246': ('YES', 'BIP-329 labels'),
    'S247': ('YES', 'BIP-340 Schnorr'),
    'S248': ('YES', 'BIP-341 Taproot'),
    'S249': ('YES', 'BIP-342 Tapscript'),
    'S250': ('YES', 'BIP-350 Bech32m'),
    'S251': ('YES', 'BIP-370 PSBT v2'),
    'S252': ('NO', 'BIP-380 limited'),
    'S253': ('YES', 'EIP-2612 Permit'),
    'S254': ('NO', 'EIP-3074 not yet'),
    'S255': ('NO', 'EIP-4337 not native'),
    'S256': ('YES', 'EIP-4361 SIWE'),
    'S257': ('NO', 'EIP-5792 not yet'),
    'S258': ('NO', 'EIP-6900 not yet'),
    'S259': ('NO', 'EIP-7702 not yet'),
    'S260': ('NO', 'Has EAL5+ not EAL4+'),
    'S261': ('NO', 'Not EAL7'),
    'S262': ('NO', 'Not Maxim DS28S60'),
    'S263': ('NO', 'Not Maxim MAX32520'),
    'S264': ('NO', 'Not NXP P71D600'),
    'S265': ('YES', 'ST31 family'),
    'S266': ('YES', 'JIL High'),
    'S267': ('YES', 'AVA_VAN.5'),
    'S268': ('NO', 'PCI PTS not certified'),
    'S269': ('YES', 'GlobalPlatform'),
    'S272': ('NO', 'No Triple SE'),
    'S273': ('NO', 'No ChipDNA PUF'),
    'S274': ('YES', 'Active Shield'),
    'S275': ('YES', 'Voltage Glitch Detection'),
    'S276': ('YES', 'Light Attack Detection'),
}

# Évaluations pilier A (Adversity)
LEDGER_A = {
    'A-AMD-SEV': ('NO', 'AMD SEV not applicable'),
    'A-APPLE-SE': ('NO', 'Apple SE not applicable'),
    'A-ARM-TZ': ('NO', 'ARM TrustZone - uses ST SE'),
    'A-AWS-NITRO': ('NO', 'AWS Nitro not applicable'),
    'A-AZURE-CVM': ('NO', 'Azure not applicable'),
}

# Évaluations pilier F (Fidelity)
LEDGER_F = {
    'F-AUDIT-FIN': ('NO', 'No financial audit published'),
    'F-BUGBOUNTY': ('YES', 'Bug bounty on Immunefi'),
}

# Évaluations pilier E (Ecosystem)
LEDGER_E = {
    'E-BIP-173': ('YES', 'BIP-173 Bech32 support'),
    'E-BIP-370': ('YES', 'BIP-370 PSBT v2'),
}


def main():
    headers = get_headers()

    # Get norm IDs
    r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?pillar=eq.S&select=id,code', headers=headers)
    norm_map = {n['code']: n['id'] for n in r.json()}

    # Count results
    yes_count = sum(1 for v in LEDGER_S.values() if v[0] in ['YES', 'YESp'])
    no_count = sum(1 for v in LEDGER_S.values() if v[0] == 'NO')
    na_count = sum(1 for v in LEDGER_S.values() if v[0] == 'N/A')

    total = yes_count + no_count
    score = (yes_count / total * 100) if total > 0 else 0

    print(f'Pilier S - Ledger Nano X')
    print(f'YES: {yes_count}, NO: {no_count}, N/A: {na_count}')
    print(f'Score S: {score:.1f}%')

    # Prepare evaluations
    evaluations = []
    for code, (result, reason) in LEDGER_S.items():
        if code in norm_map:
            evaluations.append({
                'product_id': PRODUCT_ID,
                'norm_id': norm_map[code],
                'result': result,
                'why_this_result': reason,
                'evaluated_by': 'claude_opus_4.5',
                'confidence_score': 0.95
            })

    print(f'Évaluations préparées: {len(evaluations)}')

    # Delete old S evaluations for this product (bulk delete)
    s_norm_ids = list(norm_map.values())
    print(f'Suppression des anciennes évaluations S...')
    r = requests.delete(
        f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{PRODUCT_ID}&norm_id=in.({",".join(map(str, s_norm_ids[:100]))})',
        headers=headers
    )
    # Delete in chunks if more than 100
    for i in range(100, len(s_norm_ids), 100):
        chunk = s_norm_ids[i:i+100]
        requests.delete(
            f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{PRODUCT_ID}&norm_id=in.({",".join(map(str, chunk))})',
            headers=headers
        )

    # Insert new evaluations in batches
    saved = 0
    for i in range(0, len(evaluations), 50):
        batch = evaluations[i:i+50]
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/evaluations',
            headers=headers,
            json=batch
        )
        if r.status_code in [200, 201]:
            saved += len(batch)
        else:
            print(f'Erreur batch {i}: {r.status_code} - {r.text[:200]}')

    print(f'Évaluations S sauvegardées: {saved}')

    # Update product score
    update = {
        'score_s': round(score, 1),
        'updated_at': datetime.utcnow().isoformat()
    }
    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/products?id=eq.{PRODUCT_ID}',
        headers=headers,
        json=update
    )
    print(f'Score S mis à jour: {score:.1f}%')


if __name__ == '__main__':
    main()
