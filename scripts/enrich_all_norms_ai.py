#!/usr/bin/env python3
"""Enrich all norms with AI-generated content for missing columns"""
import requests
import json
import time
import os
import sys

from config_helper import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers

headers = get_supabase_headers()

# Known authorities and references for common norm types
AUTHORITY_MAP = {
    # Security
    'ISO': ('ISO', 'International Organization for Standardization'),
    'NIST': ('NIST', 'National Institute of Standards and Technology'),
    'OWASP': ('OWASP Foundation', 'Open Web Application Security Project'),
    'CIS': ('CIS', 'Center for Internet Security'),
    'ENISA': ('ENISA', 'EU Agency for Cybersecurity'),
    'ANSSI': ('ANSSI', 'Agence Nationale de la Securite des Systemes d\'Information'),
    'BSI': ('BSI', 'Bundesamt fur Sicherheit in der Informationstechnik'),
    'CCSS': ('CCSS', 'Cryptocurrency Security Standard'),
    'SOC': ('AICPA', 'SOC 2 Type II'),

    # Crypto-specific
    'EIP': ('Ethereum Foundation', 'Ethereum Improvement Proposal'),
    'BIP': ('Bitcoin Community', 'Bitcoin Improvement Proposal'),
    'OpenZeppelin': ('OpenZeppelin', 'Smart Contract Security Library'),

    # Regulatory
    'MiCA': ('European Union', 'Markets in Crypto-Assets Regulation'),
    'GDPR': ('European Union', 'General Data Protection Regulation'),
    'PCI': ('PCI SSC', 'Payment Card Industry Data Security Standard'),
    'AML': ('FATF', 'Anti-Money Laundering Guidelines'),
    'KYC': ('FATF', 'Know Your Customer Guidelines'),
}

RELEVANCE_KEYWORDS = {
    'critical': ['wallet', 'key', 'private', 'seed', 'password', 'authentication', '2fa', 'mfa',
                 'encryption', 'backup', 'recovery', 'cold storage', 'multisig', 'audit'],
    'high': ['security', 'protection', 'verification', 'authorization', 'access control',
             'monitoring', 'incident', 'vulnerability', 'patch', 'update'],
    'medium': ['documentation', 'policy', 'procedure', 'compliance', 'reporting', 'training'],
    'low': ['marketing', 'support', 'interface', 'ui', 'ux', 'aesthetic']
}

def get_crypto_relevance(title, description):
    """Determine crypto relevance based on title and description"""
    text = f"{title} {description}".lower()

    for relevance, keywords in RELEVANCE_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text:
                return f"{relevance.capitalize()} - {title}"

    return f"Medium - {title}"

def get_authority_and_reference(title, description, code):
    """Determine issuing authority and standard reference"""
    text = f"{title} {description} {code}".upper()

    for key, (authority, reference) in AUTHORITY_MAP.items():
        if key.upper() in text:
            return authority, reference

    # Default based on pillar
    if code.startswith('S'):
        return 'Industry Best Practice', 'Security Standard'
    elif code.startswith('A'):
        return 'Industry Best Practice', 'Anti-Coercion Standard'
    elif code.startswith('F'):
        return 'Industry Best Practice', 'Reliability Standard'
    elif code.startswith('E'):
        return 'Industry Best Practice', 'Ecosystem Standard'

    return 'Industry Best Practice', 'Crypto Security Standard'

def get_doc_summary(title, description):
    """Generate a brief summary for the norm"""
    if description and len(description) > 20:
        # Clean and truncate description
        summary = description.replace('\n', ' ').strip()
        if len(summary) > 200:
            summary = summary[:197] + '...'
        return summary
    return title

def main():
    print('ENRICHISSEMENT DE TOUTES LES NORMES')
    print('=' * 70)

    # Get all norms with missing data
    all_norms = []
    offset = 0
    limit = 1000

    while True:
        resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=*&offset={offset}&limit={limit}',
            headers=headers
        )
        if resp.status_code != 200:
            print(f'Error fetching norms: {resp.status_code}')
            return

        batch = resp.json()
        if not batch:
            break

        all_norms.extend(batch)
        offset += limit
        if len(batch) < limit:
            break

    print(f'Total normes: {len(all_norms)}')

    # Filter norms that need updates
    norms_to_update = []
    for norm in all_norms:
        needs_update = (
            norm.get('official_doc_summary') is None or
            norm.get('crypto_relevance') is None or
            norm.get('issuing_authority') is None or
            norm.get('standard_reference') is None
        )
        if needs_update:
            norms_to_update.append(norm)

    print(f'Normes a enrichir: {len(norms_to_update)}')
    print('-' * 70)

    success = 0
    errors = 0

    for i, norm in enumerate(norms_to_update):
        code = norm['code']
        title = norm.get('title', '')
        description = norm.get('description', '')

        # Prepare update data only for NULL fields
        update_data = {}

        if norm.get('official_doc_summary') is None:
            update_data['official_doc_summary'] = get_doc_summary(title, description)

        if norm.get('crypto_relevance') is None:
            update_data['crypto_relevance'] = get_crypto_relevance(title, description)

        if norm.get('issuing_authority') is None or norm.get('standard_reference') is None:
            authority, reference = get_authority_and_reference(title, description, code)
            if norm.get('issuing_authority') is None:
                update_data['issuing_authority'] = authority
            if norm.get('standard_reference') is None:
                update_data['standard_reference'] = reference

        if not update_data:
            continue

        # Update norm
        resp = requests.patch(
            f'{SUPABASE_URL}/rest/v1/norms?code=eq.{code}',
            headers=headers,
            json=update_data
        )

        if resp.status_code in [200, 204]:
            success += 1
            if success % 100 == 0:
                print(f'[{success}/{len(norms_to_update)}] Progression...')
        else:
            errors += 1
            print(f'[ERR] {code}: {resp.status_code}')

        # Rate limiting
        if i % 50 == 0:
            time.sleep(0.1)

    print()
    print('=' * 70)
    print(f'RESULTAT: {success} normes enrichies, {errors} erreurs')

if __name__ == '__main__':
    main()
