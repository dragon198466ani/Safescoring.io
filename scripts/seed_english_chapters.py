"""Seed English chapter names for norm patterns, then run N4."""
import requests, os, re
from dotenv import load_dotenv
load_dotenv()

url = os.environ['SUPABASE_URL']
key = os.environ.get('SUPABASE_SERVICE_KEY') or os.environ.get('SUPABASE_KEY')
headers = {'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}
read_h = {'apikey': key, 'Authorization': f'Bearer {key}'}

SEEDS = {
    ('E', 'E'): 'Ecosystem & UX',
    ('A', 'A'): 'Adversity Protection',
    ('BIP', 'S'): 'Bitcoin Improvement Proposals',
    ('F', 'F'): 'Physical Durability',
    ('S', 'S'): 'Cryptography & Security',
    ('ISO', 'S'): 'ISO Standards',
    ('OWASP', 'S'): 'OWASP Standards',
    ('NFT', 'E'): 'NFTs',
    ('SEC', 'S'): 'Application Security',
    ('PCI', 'S'): 'PCI DSS Standards',
    ('TEST', 'E'): 'Testing & Quality',
    ('PRIV', 'A'): 'Privacy Protocols',
    ('BC', 'E'): 'Blockchain Commons',
    ('DATA', 'E'): 'Data Availability',
    ('DEFI', 'E'): 'DeFi Integrations',
    ('NIST', 'S'): 'NIST Standards',
    ('EIP', 'S'): 'Ethereum Improvement Proposals',
    ('REG', 'A'): 'Regulatory Compliance',
    ('A', 'F'): 'Environmental Resistance',
    ('RFC', 'S'): 'RFC Standards',
    ('ERC', 'S'): 'ERC Standards',
    ('CRYP', 'S'): 'Cryptography & Security',
    ('CHAIN', 'E'): 'Cross-Chain Integrations',
    ('G', 'S'): 'Governance Standards',
    ('MIL', 'F'): 'Military Environmental Tests',
    ('FIPS', 'S'): 'FIPS Standards',
    ('L', 'E'): 'Layer 2 Solutions',
    ('CONN', 'E'): 'Connectivity',
    ('QA', 'F'): 'Quality Management',
    ('DURS', 'A'): 'Duress Protection',
    ('FIRE', 'F'): 'Fire Resistance',
    ('HSM', 'S'): 'HSM Standards',
    ('INF', 'E'): 'Decentralized Infrastructure',
    ('KYC', 'A'): 'KYC & Identity',
    ('MOB', 'S'): 'Mobile Security',
    ('OPSEC', 'A'): 'Operational Security',
    ('STK', 'S'): 'Staking Security',
    ('UX', 'E'): 'User Experience',
    ('DP', 'E'): 'Decentralized Storage',
    ('GM', 'F'): 'Messaging Protocols',
    ('MAT', 'F'): 'Physical Materials',
    ('IP', 'F'): 'Physical Durability',
    ('DROP', 'F'): 'Shock Resistance',
    ('COR', 'F'): 'Corrosion Resistance',
    ('BATT', 'F'): 'Battery Standards',
    ('ENV', 'F'): 'Environmental Management',
    ('COMM', 'E'): 'Communication Protocols',
    ('LN', 'E'): 'Lightning Network',
    ('PAY', 'S'): 'Payment Standards',
    ('REC', 'A'): 'Recovery & Backup',
    ('FW', 'S'): 'Firmware Updates',
    ('HW', 'S'): 'Secure Execution Environments',
    ('DID', 'S'): 'Digital Identity',
    ('AI', 'A'): 'AI Governance',
    ('TOK', 'E'): 'Tokenomics',
    ('RWA', 'E'): 'Real World Assets',
    ('TAMP', 'A'): 'Tamper Protection',
    ('FIDO', 'S'): 'FIDO Standards',
    ('W3C', 'S'): 'W3C Standards',
    ('NETPRIV', 'S'): 'Network Privacy',
    ('SCA', 'S'): 'Smart Contract Auditing',
    ('INS', 'E'): 'Insurance & Compliance',
    ('XCH', 'E'): 'Cross-Chain Integrations',
    ('API', 'S'): 'API Security',
    ('PKCS', 'S'): 'PKCS Standards',
}

seeded = 0
for (prefix, pillar), chapter in SEEDS.items():
    r = requests.get(
        f'{url}/rest/v1/norms?code=like.{prefix}*&pillar=eq.{pillar}&select=id,code&limit=1&order=code',
        headers=read_h
    )
    rows = r.json()
    if rows:
        norm_id = rows[0]['id']
        norm_code = rows[0]['code']
        r2 = requests.patch(
            f'{url}/rest/v1/norms?id=eq.{norm_id}',
            json={'chapter': chapter},
            headers=headers
        )
        if r2.status_code in [200, 204]:
            seeded += 1
            print(f'  {prefix}/{pillar} -> {chapter} (seeded {norm_code})')
        else:
            print(f'  FAIL {prefix}/{pillar}: {r2.status_code} {r2.text[:200]}')
    else:
        print(f'  NO MATCH {prefix}/{pillar}')

print(f'\nSeeded {seeded} patterns')

# Verify
r = requests.get(f'{url}/rest/v1/norms?chapter=not.is.null&select=id', headers=read_h)
print(f'Norms with chapter now: {len(r.json())}')
r2 = requests.get(f'{url}/rest/v1/norms?chapter=is.null&select=id', headers=read_h)
print(f'Norms without chapter: {len(r2.json())}')
