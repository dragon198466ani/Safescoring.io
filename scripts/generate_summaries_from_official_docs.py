"""
Script pour générer les résumés des normes à partir des documents officiels.
Utilise les liens officiels stockés dans la base de données pour récupérer
le contenu et générer des résumés détaillés (jusqu'à 10000 mots).
"""

import os
import requests
from supabase import create_client, Client
from dotenv import load_dotenv
import time
import re

load_dotenv()

# Configuration Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ajdncttomdqojlozxjxu.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

# URLs officielles des standards
OFFICIAL_URLS = {
    # BIPs - Bitcoin Improvement Proposals
    "BIP": "https://github.com/bitcoin/bips/blob/master/bip-{num}.mediawiki",
    
    # EIPs - Ethereum Improvement Proposals  
    "EIP": "https://eips.ethereum.org/EIPS/eip-{num}",
    
    # SLIPs - SatoshiLabs Improvement Proposals
    "SLIP": "https://github.com/satoshilabs/slips/blob/master/slip-{num}.md",
    
    # CAIPs - Chain Agnostic Improvement Proposals
    "CAIP": "https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-{num}.md",
    
    # RFCs - IETF Standards
    "RFC": "https://www.rfc-editor.org/rfc/rfc{num}.txt",
    
    # ISO Standards (payants, liens info seulement)
    "ISO": "https://www.iso.org/standard/{num}.html",
    
    # NIST Standards
    "NIST": "https://csrc.nist.gov/publications/detail/sp/800-{num}/final",
    
    # OWASP
    "OWASP": "https://owasp.org/Top10/A{num}_2021/",
    
    # Lightning BOLTs
    "LN": "https://github.com/lightning/bolts/blob/master/{num}-*.md",
}

def get_bip_content(bip_number: str) -> str:
    """Récupère le contenu d'un BIP depuis GitHub."""
    url = f"https://raw.githubusercontent.com/bitcoin/bips/master/bip-{bip_number.zfill(4)}.mediawiki"
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            return response.text
    except Exception as e:
        print(f"Erreur récupération BIP-{bip_number}: {e}")
    return None

def get_eip_content(eip_number: str) -> str:
    """Récupère le contenu d'un EIP depuis eips.ethereum.org."""
    url = f"https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-{eip_number}.md"
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            return response.text
    except Exception as e:
        print(f"Erreur récupération EIP-{eip_number}: {e}")
    return None

def get_slip_content(slip_number: str) -> str:
    """Récupère le contenu d'un SLIP depuis GitHub."""
    url = f"https://raw.githubusercontent.com/satoshilabs/slips/master/slip-{slip_number.zfill(4)}.md"
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            return response.text
    except Exception as e:
        print(f"Erreur récupération SLIP-{slip_number}: {e}")
    return None

def get_rfc_content(rfc_number: str) -> str:
    """Récupère le contenu d'un RFC depuis IETF."""
    url = f"https://www.rfc-editor.org/rfc/rfc{rfc_number}.txt"
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            return response.text
    except Exception as e:
        print(f"Erreur récupération RFC-{rfc_number}: {e}")
    return None

def extract_number_from_code(code: str) -> str:
    """Extrait le numéro d'un code de norme."""
    match = re.search(r'\d+', code)
    return match.group() if match else None

def get_official_content(code: str, title: str) -> tuple:
    """Récupère le contenu officiel selon le type de norme."""
    content = None
    url = None
    
    if code.startswith('BIP'):
        num = extract_number_from_code(code)
        if num:
            content = get_bip_content(num)
            url = f"https://github.com/bitcoin/bips/blob/master/bip-{num.zfill(4)}.mediawiki"
    
    elif code.startswith('EIP'):
        num = extract_number_from_code(code)
        if num:
            content = get_eip_content(num)
            url = f"https://eips.ethereum.org/EIPS/eip-{num}"
    
    elif code.startswith('SLIP'):
        num = extract_number_from_code(code)
        if num:
            content = get_slip_content(num)
            url = f"https://github.com/satoshilabs/slips/blob/master/slip-{num.zfill(4)}.md"
    
    elif code.startswith('RFC'):
        num = extract_number_from_code(code)
        if num:
            content = get_rfc_content(num)
            url = f"https://www.rfc-editor.org/rfc/rfc{num}.txt"
    
    return content, url

def truncate_content(content: str, max_chars: int = 65000) -> str:
    """Tronque le contenu à la taille maximale."""
    if content and len(content) > max_chars:
        return content[:max_chars] + "\n\n[... contenu tronqué pour respecter la limite ...]"
    return content

def update_norm_with_official_content(supabase: Client, norm_id: int, code: str, 
                                       content: str, url: str):
    """Met à jour une norme avec le contenu officiel."""
    update_data = {}
    
    if content:
        update_data['summary'] = truncate_content(content)
        update_data['summary_status'] = 'from_official_doc'
    
    if url:
        update_data['official_link'] = url
    
    if update_data:
        try:
            supabase.table('norms').update(update_data).eq('id', norm_id).execute()
            print(f"✓ {code} mis à jour avec contenu officiel")
            return True
        except Exception as e:
            print(f"✗ Erreur mise à jour {code}: {e}")
    
    return False

def main():
    """Fonction principale."""
    if not SUPABASE_KEY:
        print("Erreur: SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_ANON_KEY requis")
        return
    
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Récupérer les normes sans résumé ou avec résumé à mettre à jour
    # Priorité aux BIPs, EIPs, SLIPs, RFCs qui ont des sources publiques
    prefixes = ['BIP', 'EIP', 'SLIP', 'RFC']
    
    for prefix in prefixes:
        print(f"\n=== Traitement des {prefix}s ===")
        
        response = supabase.table('norms')\
            .select('id, code, title, official_link, summary')\
            .like('code', f'{prefix}%')\
            .is_('summary', 'null')\
            .limit(50)\
            .execute()
        
        norms = response.data
        print(f"Trouvé {len(norms)} {prefix}s sans résumé")
        
        for norm in norms:
            content, url = get_official_content(norm['code'], norm['title'])
            
            if content:
                update_norm_with_official_content(
                    supabase, 
                    norm['id'], 
                    norm['code'],
                    content,
                    url
                )
            else:
                print(f"  - {norm['code']}: pas de contenu trouvé")
            
            # Rate limiting
            time.sleep(0.5)
    
    print("\n=== Terminé ===")

if __name__ == "__main__":
    main()
