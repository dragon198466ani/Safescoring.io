#!/usr/bin/env python3
"""
Scrape official sources + Wikipedia fallback and store content in reference_content.
Does NOT replace official_link - stores scraped data separately.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.config import SUPABASE_URL, SUPABASE_HEADERS
from src.core.api_provider import AIProvider
import requests
from bs4 import BeautifulSoup
import argparse
import time
import re

# Multiple reference sources by category
REFERENCE_SOURCES = {
    # === BLOCKCHAINS ===
    'Arbitrum': [
        'https://en.wikipedia.org/wiki/Arbitrum',
        'https://docs.arbitrum.io/',
        'https://github.com/OffchainLabs/arbitrum'
    ],
    'Polkadot': [
        'https://en.wikipedia.org/wiki/Polkadot_(cryptocurrency)',
        'https://wiki.polkadot.network/',
        'https://github.com/paritytech/polkadot'
    ],
    'Tron': [
        'https://en.wikipedia.org/wiki/Tron_(cryptocurrency)',
        'https://developers.tron.network/',
    ],
    'Scroll': [
        'https://docs.scroll.io/',
        'https://github.com/scroll-tech/scroll'
    ],
    'Eclipse': [
        'https://docs.eclipse.xyz/',
    ],
    'Movement': [
        'https://en.wikipedia.org/wiki/Move_(programming_language)',
        'https://github.com/move-language/move'
    ],
    'Mantle': [
        'https://docs.mantle.xyz/',
        'https://github.com/mantlenetworkio'
    ],
    'Blast': [
        'https://docs.blast.io/',
    ],
    'zkSync': [
        'https://docs.zksync.io/',
        'https://github.com/matter-labs/zksync-era'
    ],
    'Linea': [
        'https://docs.linea.build/',
    ],
    'Avalanche': [
        'https://en.wikipedia.org/wiki/Avalanche_(blockchain_platform)',
        'https://docs.avax.network/',
    ],
    'BNB': [
        'https://en.wikipedia.org/wiki/BNB_Chain',
        'https://docs.bnbchain.org/',
    ],
    
    # === CRYPTO ALGORITHMS ===
    'Common Criteria': [
        'https://en.wikipedia.org/wiki/Common_Criteria',
        'https://www.commoncriteriaportal.org/files/ccfiles/CCPART1V3.1R5.pdf'
    ],
    'Salsa20': [
        'https://en.wikipedia.org/wiki/Salsa20',
        'https://cr.yp.to/snuffle.html'
    ],
    'ChaCha': [
        'https://en.wikipedia.org/wiki/Salsa20#ChaCha_variant',
        'https://datatracker.ietf.org/doc/html/rfc8439'
    ],
    'Camellia': [
        'https://en.wikipedia.org/wiki/Camellia_(cipher)',
    ],
    'SHA-3': [
        'https://en.wikipedia.org/wiki/SHA-3',
        'https://csrc.nist.gov/projects/hash-functions/sha-3-project'
    ],
    'BLAKE': [
        'https://en.wikipedia.org/wiki/BLAKE_(hash_function)',
        'https://www.blake2.net/'
    ],
    'SM3': [
        'https://en.wikipedia.org/wiki/SM3_(hash_function)',
    ],
    'AES': [
        'https://en.wikipedia.org/wiki/Advanced_Encryption_Standard',
    ],
    'RSA': [
        'https://en.wikipedia.org/wiki/RSA_(cryptosystem)',
    ],
    'ECDSA': [
        'https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm',
    ],
    'Ed25519': [
        'https://en.wikipedia.org/wiki/EdDSA',
        'https://ed25519.cr.yp.to/'
    ],
    'Schnorr': [
        'https://en.wikipedia.org/wiki/Schnorr_signature',
    ],
    
    # === HARDWARE ===
    'E-ink': [
        'https://en.wikipedia.org/wiki/Electronic_paper',
    ],
    'OLED': [
        'https://en.wikipedia.org/wiki/OLED',
    ],
    'LCD': [
        'https://en.wikipedia.org/wiki/Liquid-crystal_display',
    ],
    'Touchscreen': [
        'https://en.wikipedia.org/wiki/Touchscreen',
    ],
    'Fingerprint': [
        'https://en.wikipedia.org/wiki/Fingerprint_recognition',
    ],
    'Secure element': [
        'https://en.wikipedia.org/wiki/Secure_element',
        'https://globalplatform.org/specs-library/'
    ],
    'USB-C': [
        'https://en.wikipedia.org/wiki/USB-C',
    ],
    'USB': [
        'https://en.wikipedia.org/wiki/USB',
    ],
    'Bluetooth': [
        'https://en.wikipedia.org/wiki/Bluetooth',
        'https://www.bluetooth.com/specifications/'
    ],
    'NFC': [
        'https://en.wikipedia.org/wiki/Near-field_communication',
    ],
    'QR code': [
        'https://en.wikipedia.org/wiki/QR_code',
    ],
    'Smart card': [
        'https://en.wikipedia.org/wiki/Smart_card',
    ],
    'Wearable': [
        'https://en.wikipedia.org/wiki/Wearable_technology',
    ],
    'Battery': [
        'https://en.wikipedia.org/wiki/Rechargeable_battery',
        'https://en.wikipedia.org/wiki/Lithium-ion_battery'
    ],
    'Wireless charging': [
        'https://en.wikipedia.org/wiki/Wireless_charging',
    ],
    'Solar': [
        'https://en.wikipedia.org/wiki/Solar_cell',
    ],
    'MicroSD': [
        'https://en.wikipedia.org/wiki/MicroSD',
    ],
    'Flash memory': [
        'https://en.wikipedia.org/wiki/Flash_memory',
    ],
    'HSM': [
        'https://en.wikipedia.org/wiki/Hardware_security_module',
    ],
    'TPM': [
        'https://en.wikipedia.org/wiki/Trusted_Platform_Module',
    ],
    'TEE': [
        'https://en.wikipedia.org/wiki/Trusted_execution_environment',
    ],
    
    # === STANDARDS & CERTIFICATIONS ===
    'IEC 62133': [
        'https://en.wikipedia.org/wiki/IEC_62133',
    ],
    'UN 38.3': [
        'https://en.wikipedia.org/wiki/UN_38.3',
    ],
    'Biometric': [
        'https://en.wikipedia.org/wiki/Biometrics',
    ],
    'BIPA': [
        'https://en.wikipedia.org/wiki/Biometric_Information_Privacy_Act',
    ],
    'Differential privacy': [
        'https://en.wikipedia.org/wiki/Differential_privacy',
    ],
    'Model card': [
        'https://en.wikipedia.org/wiki/Model_card',
        'https://modelcards.withgoogle.com/about'
    ],
    'Duress': [
        'https://en.wikipedia.org/wiki/Duress_code',
    ],
    'MTBF': [
        'https://en.wikipedia.org/wiki/Mean_time_between_failures',
    ],
    'JEDEC': [
        'https://en.wikipedia.org/wiki/JEDEC',
    ],
    'UL 94': [
        'https://en.wikipedia.org/wiki/UL_94',
    ],
    'WiFi': [
        'https://en.wikipedia.org/wiki/Wi-Fi',
    ],
    'Corrosion': [
        'https://en.wikipedia.org/wiki/Corrosion',
    ],
    'Secret sharing': [
        'https://en.wikipedia.org/wiki/Secret_sharing',
        'https://en.wikipedia.org/wiki/Shamir%27s_Secret_Sharing'
    ],
    'Cryptocurrency wallet': [
        'https://en.wikipedia.org/wiki/Cryptocurrency_wallet',
    ],
    'ISO 27001': [
        'https://en.wikipedia.org/wiki/ISO/IEC_27001',
    ],
    'SOC 2': [
        'https://en.wikipedia.org/wiki/System_and_Organization_Controls',
    ],
    'FIPS': [
        'https://en.wikipedia.org/wiki/Federal_Information_Processing_Standards',
        'https://csrc.nist.gov/publications/fips'
    ],
    'NIST': [
        'https://en.wikipedia.org/wiki/National_Institute_of_Standards_and_Technology',
        'https://csrc.nist.gov/'
    ],
    'OWASP': [
        'https://en.wikipedia.org/wiki/OWASP',
        'https://owasp.org/'
    ],
    'PCI DSS': [
        'https://en.wikipedia.org/wiki/Payment_Card_Industry_Data_Security_Standard',
    ],
    'GDPR': [
        'https://en.wikipedia.org/wiki/General_Data_Protection_Regulation',
    ],
    
    # === PROTOCOLS ===
    'BIP': [
        'https://en.wikipedia.org/wiki/Bitcoin_Improvement_Proposals',
        'https://github.com/bitcoin/bips'
    ],
    'EIP': [
        'https://en.wikipedia.org/wiki/Ethereum_Improvement_Proposals',
        'https://eips.ethereum.org/'
    ],
    'ERC-20': [
        'https://en.wikipedia.org/wiki/ERC-20',
        'https://eips.ethereum.org/EIPS/eip-20'
    ],
    'ERC-721': [
        'https://en.wikipedia.org/wiki/ERC-721',
        'https://eips.ethereum.org/EIPS/eip-721'
    ],
    'Lightning': [
        'https://en.wikipedia.org/wiki/Lightning_Network',
        'https://github.com/lightning/bolts'
    ],
    'BOLT': [
        'https://github.com/lightning/bolts',
    ],
    'WalletConnect': [
        'https://docs.walletconnect.com/',
        'https://github.com/WalletConnect'
    ],
    'PSBT': [
        'https://en.wikipedia.org/wiki/Bitcoin#Partially_Signed_Bitcoin_Transactions',
        'https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki'
    ],
    
    # === DEFI ===
    'Uniswap': [
        'https://en.wikipedia.org/wiki/Uniswap',
        'https://docs.uniswap.org/'
    ],
    'Aave': [
        'https://en.wikipedia.org/wiki/Aave',
        'https://docs.aave.com/'
    ],
    'Compound': [
        'https://en.wikipedia.org/wiki/Compound_(finance)',
        'https://docs.compound.finance/'
    ],
    'MakerDAO': [
        'https://en.wikipedia.org/wiki/MakerDAO',
    ],
    'Curve': [
        'https://resources.curve.fi/',
    ],
    
    # === PRIVACY ===
    'Monero': [
        'https://en.wikipedia.org/wiki/Monero',
        'https://www.getmonero.org/resources/moneropedia/'
    ],
    'Zcash': [
        'https://en.wikipedia.org/wiki/Zcash',
        'https://z.cash/technology/'
    ],
    'Tornado': [
        'https://en.wikipedia.org/wiki/Tornado_Cash',
    ],
    'CoinJoin': [
        'https://en.wikipedia.org/wiki/CoinJoin',
    ],
    'zk-SNARK': [
        'https://en.wikipedia.org/wiki/Non-interactive_zero-knowledge_proof',
    ],
    'zk-STARK': [
        'https://en.wikipedia.org/wiki/Non-interactive_zero-knowledge_proof',
    ],
}

def get_norms_without_reference():
    """Get norms that don't have reference_content yet."""
    url = f"{SUPABASE_URL}/rest/v1/norms"
    params = {
        "select": "id,code,title,description,official_link,summary",
        "or": "(reference_content.is.null,reference_content.eq.)",
        "order": "code"
    }
    
    all_norms = []
    offset = 0
    while True:
        resp = requests.get(url, headers=SUPABASE_HEADERS, params={**params, "offset": offset, "limit": 1000})
        if resp.status_code != 200:
            print(f"Error: {resp.status_code}")
            break
        batch = resp.json()
        if not batch:
            break
        all_norms.extend(batch)
        offset += 1000
        if len(batch) < 1000:
            break
    
    return all_norms

def scrape_url(url: str) -> tuple[str, bool]:
    """Scrape content from URL. Returns (content, success)."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        resp = requests.get(url, headers=headers, timeout=15)
        if resp.status_code != 200:
            return None, False
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # Remove scripts, styles, nav, footer
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
            tag.decompose()
        
        # Get main content
        main = soup.find('main') or soup.find('article') or soup.find('div', {'id': 'content'}) or soup.find('div', {'id': 'mw-content-text'})
        if main:
            text = main.get_text(separator=' ', strip=True)
        else:
            text = soup.get_text(separator=' ', strip=True)
        
        # Clean up
        text = re.sub(r'\s+', ' ', text)
        text = text[:8000]  # Limit size
        
        if len(text) > 200:
            return text, True
        return None, False
        
    except Exception as e:
        return None, False

def find_reference_sources(title: str, description: str = "") -> list:
    """Find multiple reference URLs based on title/description keywords."""
    search_text = f"{title} {description}".lower()
    found_urls = []
    
    # Search in our reference sources
    for keyword, urls in REFERENCE_SOURCES.items():
        if keyword.lower() in search_text:
            found_urls.extend(urls)
    
    # Try Wikipedia search API if nothing found
    if not found_urls:
        try:
            search_url = f"https://en.wikipedia.org/w/api.php?action=opensearch&search={title}&limit=3&format=json"
            resp = requests.get(search_url, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if len(data) >= 4 and data[3]:
                    found_urls.extend(data[3][:3])
        except:
            pass
    
    return list(set(found_urls))  # Remove duplicates

def update_norm_reference(norm_id: int, content: str, sources: list) -> bool:
    """Update reference_content and reference_sources for a norm."""
    url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"
    data = {
        "reference_content": content,
        "reference_sources": sources
    }
    resp = requests.patch(url, headers=SUPABASE_HEADERS, json=data)
    return resp.status_code in [200, 204]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    
    print("=" * 70)
    print("SCRAPE & STORE REFERENCES (Official + Wikipedia)")
    print("=" * 70)
    
    norms = get_norms_without_reference()
    # Prioritize norms without summary
    norms_no_summary = [n for n in norms if not n.get('summary')]
    norms_with_summary = [n for n in norms if n.get('summary')]
    norms = norms_no_summary + norms_with_summary
    
    print(f"\n📋 Found {len(norms)} norms without reference_content")
    print(f"   ({len(norms_no_summary)} also missing summary)")
    
    if args.limit:
        norms = norms[:args.limit]
    
    success = 0
    failed = 0
    
    for i, norm in enumerate(norms, 1):
        code = norm['code']
        title = norm['title']
        official_link = norm.get('official_link', '')
        description = norm.get('description', '') or ''
        
        print(f"\n[{i}/{len(norms)}] {code} - {title}")
        
        content_parts = []
        sources_used = []
        
        # 1. Try official link first
        if official_link:
            print(f"   📎 Trying official: {official_link[:50]}...")
            content, ok = scrape_url(official_link)
            if ok and content:
                content_parts.append(f"[OFFICIAL SOURCE]\n{content}")
                sources_used.append(official_link)
                print(f"   ✅ Official scraped ({len(content)} chars)")
        
        # 2. Try multiple reference sources (Wikipedia, GitHub, docs, etc.)
        ref_urls = find_reference_sources(title, description)
        for ref_url in ref_urls:
            if ref_url not in sources_used:
                source_type = "GITHUB" if "github" in ref_url else "WIKIPEDIA" if "wikipedia" in ref_url else "DOCS"
                print(f"   📚 Trying {source_type}: {ref_url[:50]}...")
                content, ok = scrape_url(ref_url)
                if ok and content:
                    content_parts.append(f"[{source_type}]\n{content}")
                    sources_used.append(ref_url)
                    print(f"   ✅ {source_type} scraped ({len(content)} chars)")
                    if len(sources_used) >= 3:  # Max 3 sources
                        break
        
        # 3. Store combined content
        if content_parts:
            combined = "\n\n".join(content_parts)
            if not args.dry_run:
                if update_norm_reference(norm['id'], combined, sources_used):
                    success += 1
                    print(f"   💾 Stored ({len(combined)} chars from {len(sources_used)} sources)")
                else:
                    failed += 1
                    print(f"   ❌ Failed to store")
            else:
                success += 1
                print(f"   [DRY-RUN] Would store {len(combined)} chars")
        else:
            failed += 1
            print(f"   ❌ No content found")
        
        time.sleep(0.3)
    
    print("\n" + "=" * 70)
    print(f"✅ Success: {success}")
    print(f"❌ Failed: {failed}")

if __name__ == "__main__":
    main()
