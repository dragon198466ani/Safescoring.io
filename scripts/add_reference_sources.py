#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAFESCORING.IO - Add Reference Sources to Proprietary Norms
Adds relevant Wikipedia/standard references to norms without official links.

These are SafeScoring proprietary criteria that need reference documentation.
"""

import requests
import sys
import os
import re
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.core.config import SUPABASE_URL, get_supabase_headers

# Keyword to Wikipedia mapping for proprietary norms
KEYWORD_SOURCES = {
    # Account Abstraction
    'eoa': 'https://ethereum.org/en/developers/docs/accounts/',
    'smart account': 'https://eips.ethereum.org/EIPS/eip-4337',
    'account abstraction': 'https://eips.ethereum.org/EIPS/eip-4337',
    'paymaster': 'https://eips.ethereum.org/EIPS/eip-4337',
    'bundler': 'https://eips.ethereum.org/EIPS/eip-4337',
    'session key': 'https://en.wikipedia.org/wiki/Session_key',
    
    # Security
    'secure enclave': 'https://en.wikipedia.org/wiki/Secure_cryptoprocessor',
    'key isolation': 'https://en.wikipedia.org/wiki/Key_management',
    'input validation': 'https://en.wikipedia.org/wiki/Data_validation',
    'output encoding': 'https://en.wikipedia.org/wiki/Character_encoding',
    'error handling': 'https://en.wikipedia.org/wiki/Exception_handling',
    'logging': 'https://en.wikipedia.org/wiki/Logging_(computing)',
    'session': 'https://en.wikipedia.org/wiki/Session_(computer_science)',
    'token': 'https://en.wikipedia.org/wiki/Access_token',
    'api': 'https://en.wikipedia.org/wiki/API',
    
    # UX/UI
    'responsive': 'https://en.wikipedia.org/wiki/Responsive_web_design',
    'mobile': 'https://en.wikipedia.org/wiki/Mobile_app',
    'navigation': 'https://en.wikipedia.org/wiki/Web_navigation',
    'onboarding': 'https://en.wikipedia.org/wiki/User_onboarding',
    'keyboard': 'https://en.wikipedia.org/wiki/Keyboard_shortcut',
    'gesture': 'https://en.wikipedia.org/wiki/Gesture_recognition',
    
    # Hardware
    'build quality': 'https://en.wikipedia.org/wiki/Quality_control',
    'component': 'https://en.wikipedia.org/wiki/Electronic_component',
    'disguise': 'https://en.wikipedia.org/wiki/Steganography',
    'casing': 'https://en.wikipedia.org/wiki/Computer_case',
    
    # Privacy
    'anonymity': 'https://en.wikipedia.org/wiki/Anonymity',
    'unlinkability': 'https://en.wikipedia.org/wiki/Unlinkability',
    'untraceability': 'https://en.wikipedia.org/wiki/Untraceability',
    'fungibility': 'https://en.wikipedia.org/wiki/Fungibility',
    'traffic analysis': 'https://en.wikipedia.org/wiki/Traffic_analysis',
    'timing attack': 'https://en.wikipedia.org/wiki/Timing_attack',
    
    # Compliance
    'compliance': 'https://en.wikipedia.org/wiki/Regulatory_compliance',
    'legal': 'https://en.wikipedia.org/wiki/Legal_compliance',
    'policy': 'https://en.wikipedia.org/wiki/Policy',
    'rights': 'https://en.wikipedia.org/wiki/Digital_rights',
    'transparency': 'https://en.wikipedia.org/wiki/Transparency_(behavior)',
    'warrant canary': 'https://en.wikipedia.org/wiki/Warrant_canary',
    
    # Philosophy
    'self-sovereign': 'https://en.wikipedia.org/wiki/Self-sovereign_identity',
    'decentralized': 'https://en.wikipedia.org/wiki/Decentralization',
    'ethics': 'https://en.wikipedia.org/wiki/Computer_ethics',
    'human rights': 'https://en.wikipedia.org/wiki/Human_rights',
    'freedom': 'https://en.wikipedia.org/wiki/Freedom_of_speech',
    'interoperability': 'https://en.wikipedia.org/wiki/Interoperability',
    'open standards': 'https://en.wikipedia.org/wiki/Open_standard',
    
    # Crypto
    'staking': 'https://en.wikipedia.org/wiki/Proof_of_stake',
    'yield': 'https://en.wikipedia.org/wiki/Yield_(finance)',
    'lending': 'https://en.wikipedia.org/wiki/Peer-to-peer_lending',
    'borrowing': 'https://en.wikipedia.org/wiki/Loan',
    'liquidity': 'https://en.wikipedia.org/wiki/Market_liquidity',
    'swap': 'https://en.wikipedia.org/wiki/Cryptocurrency_exchange',
    'bridge': 'https://en.wikipedia.org/wiki/Blockchain_interoperability',
    'oracle': 'https://en.wikipedia.org/wiki/Blockchain_oracle',
    'nft': 'https://en.wikipedia.org/wiki/Non-fungible_token',
    'defi': 'https://en.wikipedia.org/wiki/Decentralized_finance',
    'dao': 'https://en.wikipedia.org/wiki/Decentralized_autonomous_organization',
    'governance': 'https://en.wikipedia.org/wiki/Corporate_governance',
    'voting': 'https://en.wikipedia.org/wiki/Electronic_voting',
    
    # Networks
    'layer 2': 'https://en.wikipedia.org/wiki/Layer_2_(blockchain)',
    'rollup': 'https://en.wikipedia.org/wiki/Rollup_(blockchain)',
    'sidechain': 'https://en.wikipedia.org/wiki/Sidechain',
    'mainnet': 'https://en.wikipedia.org/wiki/Mainnet',
    'testnet': 'https://en.wikipedia.org/wiki/Testnet',
}


def find_source_for_norm(code, title, description):
    """Find the best reference source for a norm."""
    combined = f"{code} {title} {description}".lower()
    
    # Check each keyword
    for keyword, url in KEYWORD_SOURCES.items():
        if keyword in combined:
            return url, keyword
    
    # Fallback: search Wikipedia
    search_term = title if title else code
    try:
        search_url = f"https://en.wikipedia.org/w/api.php?action=opensearch&search={quote(search_term)}&limit=1&format=json"
        r = requests.get(search_url, timeout=10)
        if r.status_code == 200:
            data = r.json()
            if len(data) >= 4 and data[3]:
                return data[3][0], 'wikipedia_search'
    except:
        pass
    
    return None, None


def main():
    headers = get_supabase_headers()
    
    print("\n" + "="*70)
    print("SAFESCORING - Add Reference Sources to Proprietary Norms")
    print("="*70)
    
    # Load norms without links
    url = f"{SUPABASE_URL}/rest/v1/norms?select=id,code,title,description&official_link=is.null&limit=2000"
    r = requests.get(url, headers=headers)
    
    if r.status_code != 200:
        print(f"Error loading norms: {r.status_code}")
        return
    
    norms = r.json()
    print(f"\nFound {len(norms)} norms without official_link")
    
    stats = {'updated': 0, 'not_found': 0, 'errors': 0}
    
    for i, norm in enumerate(norms):
        code = norm['code']
        title = norm.get('title', '')
        desc = norm.get('description', '')
        
        source_url, keyword = find_source_for_norm(code, title, desc)
        
        if source_url:
            # Update norm
            update_url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm['id']}"
            update_data = {'official_link': source_url}
            
            r = requests.patch(update_url, json=update_data, headers=headers)
            if r.status_code in [200, 204]:
                stats['updated'] += 1
                if stats['updated'] % 100 == 0:
                    print(f"  ✅ Updated {stats['updated']} norms...")
            else:
                stats['errors'] += 1
        else:
            stats['not_found'] += 1
    
    print("\n" + "="*70)
    print("COMPLETE")
    print("="*70)
    print(f"✅ Updated:    {stats['updated']}")
    print(f"⚠️  Not found: {stats['not_found']}")
    print(f"❌ Errors:     {stats['errors']}")


if __name__ == '__main__':
    main()
