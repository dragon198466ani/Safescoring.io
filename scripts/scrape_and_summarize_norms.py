#!/usr/bin/env python3
"""
Script pour scraper les sources officielles des normes et générer des résumés vérifiés.
- Scrape l'official_link de chaque norme
- Si bloqué, cherche des sources alternatives (Wikipedia, GitHub, docs officielles)
- Stocke le contenu scrapé dans reference_content
- Enregistre les sources utilisées dans reference_sources
"""

import sys
import os
import io
import time
import json
import random
import re
from datetime import datetime
from urllib.parse import urlparse, quote_plus

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from bs4 import BeautifulSoup
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

# Configuration
MIN_DELAY = 2  # Délai minimum entre requêtes (secondes)
MAX_DELAY = 5  # Délai maximum entre requêtes (secondes)
TIMEOUT = 30   # Timeout pour les requêtes HTTP
MAX_CONTENT_LENGTH = 50000  # Limite de caractères pour le contenu scrapé
BATCH_SIZE = 10  # Nombre de normes à traiter par batch

# User agents pour éviter les blocages
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
]

# Sources alternatives par type de norme
ALTERNATIVE_SOURCES = {
    'ISO': [
        'https://en.wikipedia.org/wiki/ISO_{number}',
        'https://en.wikipedia.org/wiki/ISO/IEC_{number}',
        'https://www.iso.org/standard/{number}.html',
    ],
    'NIST': [
        'https://csrc.nist.gov/pubs/sp/800/{sp_number}/final',
        'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-{sp_number}.pdf',
        'https://en.wikipedia.org/wiki/NIST_Special_Publication_800-{sp_number}',
    ],
    'RFC': [
        'https://www.rfc-editor.org/rfc/rfc{number}.html',
        'https://datatracker.ietf.org/doc/html/rfc{number}',
        'https://en.wikipedia.org/wiki/RFC_{number}',
    ],
    'EIP': [
        'https://eips.ethereum.org/EIPS/eip-{number}',
        'https://github.com/ethereum/EIPs/blob/master/EIPS/eip-{number}.md',
    ],
    'BIP': [
        'https://github.com/bitcoin/bips/blob/master/bip-{number:04d}.mediawiki',
        'https://en.bitcoin.it/wiki/BIP_{number:04d}',
        'https://bips.xyz/{number}',
    ],
    'ERC': [
        'https://eips.ethereum.org/EIPS/eip-{number}',
        'https://ethereum.org/en/developers/docs/standards/tokens/erc-{number}/',
    ],
    'OWASP': [
        'https://owasp.org/www-community/{slug}',
        'https://cheatsheetseries.owasp.org/cheatsheets/{slug}_Cheat_Sheet.html',
        'https://owasp.org/Top10/',
    ],
    'CWE': [
        'https://cwe.mitre.org/data/definitions/{number}.html',
    ],
    'FIPS': [
        'https://csrc.nist.gov/pubs/fips/{number}/final',
        'https://en.wikipedia.org/wiki/FIPS_{number}',
    ],
    'DEFI': [
        'https://defillama.com/protocol/{slug}',
        'https://docs.{slug}.com/',
        'https://github.com/{slug}/{slug}',
    ],
}


def get_random_headers():
    """Retourne des headers HTTP aléatoires pour éviter les blocages."""
    return {
        'User-Agent': random.choice(USER_AGENTS),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }


def random_delay():
    """Attend un délai aléatoire entre les requêtes."""
    delay = random.uniform(MIN_DELAY, MAX_DELAY)
    time.sleep(delay)


def scrape_url(url, retry_count=0):
    """
    Scrape le contenu d'une URL.
    Retourne (success, content, error_message)
    """
    if not url or not url.startswith('http'):
        return False, None, "URL invalide"
    
    try:
        random_delay()
        
        headers = get_random_headers()
        response = requests.get(url, headers=headers, timeout=TIMEOUT, allow_redirects=True)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Supprimer les éléments non pertinents
            for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript']):
                tag.decompose()
            
            # Chercher le contenu principal
            main_content = (
                soup.find('main') or 
                soup.find('article') or 
                soup.find('div', {'id': 'content'}) or
                soup.find('div', {'id': 'mw-content-text'}) or
                soup.find('div', {'class': 'mw-parser-output'}) or
                soup.find('div', {'class': 'content'}) or
                soup.find('div', {'class': 'post-content'}) or
                soup.find('div', {'role': 'main'}) or
                soup.body
            )
            
            if main_content:
                text = main_content.get_text(separator='\n', strip=True)
                # Nettoyer le texte
                lines = [line.strip() for line in text.split('\n') if line.strip()]
                text = '\n'.join(lines)
                
                # Limiter la taille
                if len(text) > MAX_CONTENT_LENGTH:
                    text = text[:MAX_CONTENT_LENGTH] + "\n\n[Contenu tronqué...]"
                
                if len(text) > 200:  # Contenu suffisant
                    return True, text, None
                else:
                    return False, None, "Contenu insuffisant"
            else:
                return False, None, "Pas de contenu principal trouvé"
        
        elif response.status_code == 403:
            return False, None, f"Accès refusé (403)"
        elif response.status_code == 404:
            return False, None, f"Page non trouvée (404)"
        elif response.status_code == 429:
            if retry_count < 3:
                print(f"  Rate limited, attente 30 secondes...")
                time.sleep(30)
                return scrape_url(url, retry_count + 1)
            return False, None, "Rate limited (429)"
        else:
            return False, None, f"Erreur HTTP {response.status_code}"
            
    except requests.exceptions.Timeout:
        return False, None, "Timeout"
    except requests.exceptions.ConnectionError:
        return False, None, "Erreur de connexion"
    except Exception as e:
        return False, None, f"Erreur: {str(e)[:100]}"


def get_alternative_urls(norm):
    """Génère des URLs alternatives basées sur le type de norme."""
    code = norm.get('code', '')
    title = norm.get('title', '')
    description = norm.get('description', '')
    
    alternatives = []
    
    # Extraire les numéros du code et du titre
    code_numbers = re.findall(r'\d+', code)
    title_numbers = re.findall(r'\d+', title)
    all_numbers = code_numbers + title_numbers
    number = all_numbers[0] if all_numbers else ''
    
    # Extraire le numéro SP pour NIST (ex: "SP 800-53" -> "53")
    sp_match = re.search(r'800-(\d+)', title) or re.search(r'800-(\d+)', code)
    sp_number = sp_match.group(1) if sp_match else number
    
    # Créer un slug à partir du titre
    slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    
    # Déterminer le type de norme
    norm_type = None
    if 'ISO' in code or 'ISO' in title:
        norm_type = 'ISO'
    elif 'NIST' in code or 'NIST' in title or 'SP 800' in title:
        norm_type = 'NIST'
    elif 'RFC' in code or 'RFC' in title:
        norm_type = 'RFC'
    elif 'EIP' in code or 'EIP-' in title:
        norm_type = 'EIP'
    elif 'BIP' in code or 'BIP' in title:
        norm_type = 'BIP'
    elif 'ERC' in code or 'ERC-' in title:
        norm_type = 'ERC'
    elif 'OWASP' in code or 'OWASP' in title:
        norm_type = 'OWASP'
    elif 'CWE' in code:
        norm_type = 'CWE'
    elif 'FIPS' in code or 'FIPS' in title:
        norm_type = 'FIPS'
    
    # Générer les URLs alternatives
    if norm_type and norm_type in ALTERNATIVE_SOURCES:
        for template in ALTERNATIVE_SOURCES[norm_type]:
            try:
                url = template.format(
                    code=code.lower().replace(' ', '-'),
                    title=quote_plus(title),
                    number=number,
                    sp_number=sp_number,
                    slug=slug
                )
                if url not in alternatives:
                    alternatives.append(url)
            except Exception as e:
                pass
    
    # Toujours ajouter Wikipedia avec le titre exact
    wiki_title = title.replace(' ', '_')
    wiki_url = f"https://en.wikipedia.org/wiki/{quote_plus(wiki_title)}"
    if wiki_url not in alternatives:
        alternatives.append(wiki_url)
    
    # Pour les normes crypto/blockchain, ajouter des sources spécifiques
    title_lower = title.lower()
    if any(term in title_lower for term in ['ethereum', 'erc', 'eip', 'solidity']):
        alternatives.append(f"https://ethereum.org/en/developers/docs/")
        alternatives.append(f"https://docs.soliditylang.org/")
    
    if any(term in title_lower for term in ['bitcoin', 'bip', 'lightning']):
        alternatives.append(f"https://bitcoin.org/en/developer-documentation")
        alternatives.append(f"https://en.bitcoin.it/wiki/Main_Page")
    
    # GitHub pour les projets open source
    if any(term in title_lower for term in ['uniswap', 'aave', 'compound', 'maker', 'chainlink']):
        project = title_lower.split()[0]
        alternatives.append(f"https://github.com/{project}/{project}")
        alternatives.append(f"https://docs.{project}.org/")
    
    # Pour les normes physiques/hardware, ajouter des sources techniques
    physical_terms = {
        'uv resistance': 'Ultraviolet_degradation',
        'humidity': 'Humidity',
        'altitude': 'Altitude',
        'pressure': 'Atmospheric_pressure',
        'sand': 'IP_code',
        'dust': 'IP_code',
        'ip6': 'IP_code',
        'ip5': 'IP_code',
        'waterproof': 'IP_code',
        'water resistance': 'Water_resistance',
        'shock': 'Shock_(mechanics)',
        'vibration': 'Vibration',
        'temperature': 'Operating_temperature',
        'thermal': 'Thermal_management_(electronics)',
        'emi': 'Electromagnetic_interference',
        'esd': 'Electrostatic_discharge',
        'corrosion': 'Corrosion',
        'salt spray': 'Salt_spray_test',
        'drop': 'Drop_test',
        'tamper': 'Tamper-evident_technology',
        'seal': 'Security_seal',
        'holographic': 'Holography',
        'epoxy': 'Epoxy',
        'conformal': 'Conformal_coating',
        'welding': 'Welding',
        'ultrasonic': 'Ultrasonic_welding',
        'screw': 'Screw',
        'battery': 'Lithium-ion_battery',
        'secure element': 'Secure_cryptoprocessor',
        'tpm': 'Trusted_Platform_Module',
        'hsm': 'Hardware_security_module',
        'rng': 'Hardware_random_number_generator',
        'aes': 'Advanced_Encryption_Standard',
        'sha': 'SHA-2',
        'ecdsa': 'Elliptic_Curve_Digital_Signature_Algorithm',
        'ed25519': 'EdDSA',
        'x25519': 'Curve25519',
        'chacha': 'ChaCha20',
        'argon': 'Argon2',
        'pbkdf': 'PBKDF2',
        'scrypt': 'Scrypt',
        'blake': 'BLAKE_(hash_function)',
        'keccak': 'SHA-3',
    }
    
    for term, wiki_page in physical_terms.items():
        if term in title_lower or term in description.lower():
            alt_url = f"https://en.wikipedia.org/wiki/{wiki_page}"
            if alt_url not in alternatives:
                alternatives.insert(0, alt_url)  # Priorité haute
                break
    
    return alternatives[:10]  # Limiter à 10 alternatives max


def get_norms_to_process(limit=None, offset=0):
    """Récupère les normes à traiter depuis Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/norms"
    params = {
        "select": "id,code,title,description,pillar,target_type,official_link,reference_content,scrape_status",
        "order": "code",
        "offset": offset
    }
    
    if limit:
        params["limit"] = limit
    
    # Filtrer les normes qui n'ont pas encore été scrapées avec succès
    # ou qui n'ont pas de résumé
    
    response = requests.get(url, headers=SUPABASE_HEADERS, params=params)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Erreur récupération normes: {response.status_code}")
        return []


def update_norm_scrape_result(norm_id, content, sources, status):
    """Met à jour le résultat du scraping dans Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/norms"
    params = {"id": f"eq.{norm_id}"}
    
    data = {
        "reference_content": content,
        "reference_sources": sources if sources else [],  # JSONB accepte directement une liste
        "scrape_status": status,
        "last_scraped_at": datetime.now().isoformat()
    }
    
    response = requests.patch(url, headers=SUPABASE_HEADERS, params=params, json=data)
    if response.status_code != 204:
        print(f"    DEBUG: Status {response.status_code}, Response: {response.text[:200]}")
    return response.status_code == 204


def process_norm(norm):
    """Traite une norme: scrape l'official_link et les alternatives si nécessaire."""
    code = norm.get('code', 'Unknown')
    title = norm.get('title', '')
    official_link = norm.get('official_link', '')
    
    print(f"\n{'='*60}")
    print(f"Processing: {code} - {title[:50]}...")
    print(f"Official link: {official_link}")
    
    sources_used = []
    content = None
    status = 'failed'
    
    # 1. Essayer l'official_link d'abord
    if official_link:
        print(f"  Tentative official_link...")
        success, scraped_content, error = scrape_url(official_link)
        
        if success:
            content = scraped_content
            sources_used.append({"url": official_link, "type": "official", "status": "success"})
            status = 'success'
            print(f"  ✓ Succès! {len(content)} caractères")
        else:
            sources_used.append({"url": official_link, "type": "official", "status": "failed", "error": error})
            print(f"  ✗ Échec: {error}")
    
    # 2. Si l'official_link a échoué, essayer les alternatives
    if not content:
        alternatives = get_alternative_urls(norm)
        print(f"  Tentative de {len(alternatives)} sources alternatives...")
        
        for alt_url in alternatives[:5]:  # Limiter à 5 alternatives
            print(f"    Essai: {alt_url[:60]}...")
            success, scraped_content, error = scrape_url(alt_url)
            
            if success:
                content = scraped_content
                sources_used.append({"url": alt_url, "type": "alternative", "status": "success"})
                status = 'alternative_used'
                print(f"    ✓ Succès! {len(content)} caractères")
                break
            else:
                sources_used.append({"url": alt_url, "type": "alternative", "status": "failed", "error": error})
                print(f"    ✗ Échec: {error}")
    
    # 3. Mettre à jour la base de données
    update_success = update_norm_scrape_result(
        norm['id'],
        content,
        sources_used,
        status
    )
    
    if update_success:
        print(f"  → Base de données mise à jour: {status}")
    else:
        print(f"  → ERREUR mise à jour base de données")
    
    return status, content


def main():
    """Point d'entrée principal."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Scrape les sources officielles des normes')
    parser.add_argument('--limit', type=int, default=None, help='Nombre de normes à traiter')
    parser.add_argument('--offset', type=int, default=0, help='Offset pour pagination')
    parser.add_argument('--code', type=str, help='Code spécifique d\'une norme à traiter')
    parser.add_argument('--pending-only', action='store_true', help='Traiter uniquement les normes pending')
    args = parser.parse_args()
    
    print("="*60)
    print("SCRAPING DES SOURCES OFFICIELLES DES NORMES")
    print("="*60)
    print(f"Délai entre requêtes: {MIN_DELAY}-{MAX_DELAY} secondes")
    print(f"Timeout: {TIMEOUT} secondes")
    print()
    
    # Récupérer les normes
    if args.code:
        # Traiter une norme spécifique
        url = f"{SUPABASE_URL}/rest/v1/norms"
        params = {"select": "*", "code": f"eq.{args.code}"}
        response = requests.get(url, headers=SUPABASE_HEADERS, params=params)
        norms = response.json() if response.status_code == 200 else []
    else:
        norms = get_norms_to_process(args.limit, args.offset)
    
    if args.pending_only:
        norms = [n for n in norms if n.get('scrape_status') == 'pending' or not n.get('reference_content')]
    
    print(f"Normes à traiter: {len(norms)}")
    
    # Statistiques
    stats = {'success': 0, 'alternative_used': 0, 'failed': 0}
    
    for i, norm in enumerate(norms):
        print(f"\n[{i+1}/{len(norms)}]", end="")
        status, content = process_norm(norm)
        stats[status] = stats.get(status, 0) + 1
        
        # Pause supplémentaire tous les 10 requêtes
        if (i + 1) % 10 == 0:
            print(f"\n--- Pause de 10 secondes (anti-rate-limit) ---")
            time.sleep(10)
    
    # Résumé
    print("\n" + "="*60)
    print("RÉSUMÉ")
    print("="*60)
    print(f"Succès (official): {stats.get('success', 0)}")
    print(f"Succès (alternative): {stats.get('alternative_used', 0)}")
    print(f"Échecs: {stats.get('failed', 0)}")
    print(f"Total traité: {len(norms)}")


if __name__ == "__main__":
    main()
