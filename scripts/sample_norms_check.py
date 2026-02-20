#!/usr/bin/env python3
"""Sample check of enriched norms"""
import requests
import random

from config_helper import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers

headers = get_supabase_headers()

# Get sample norms from each pillar
pillars = ['S', 'A', 'F', 'E']

print('ECHANTILLON DE NORMES ENRICHIES')
print('=' * 80)

for pillar in pillars:
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/norms?pillar=eq.{pillar}&limit=3',
        headers=headers
    )

    if resp.status_code == 200:
        norms = resp.json()
        print(f'\n--- PILIER {pillar} ({len(norms)} exemples) ---')

        for norm in norms:
            print(f'\n{norm["code"]} - {norm["title"]}')
            print(f'  is_essential: {norm["is_essential"]}')
            print(f'  crypto_relevance: {norm.get("crypto_relevance", "")[:60]}...')
            print(f'  issuing_authority: {norm.get("issuing_authority", "")}')
            print(f'  official_link: {norm.get("official_link", "")[:60]}...')
            print(f'  official_doc_summary: {norm.get("official_doc_summary", "")[:60]}...')

# Get some of the new 33 norms
print('\n' + '=' * 80)
print('\nNOUVELLES NORMES (S-DEFI, F-CEX, etc.):')
print('-' * 80)

new_codes = ['S-SC-AUDIT', 'S-SC-MULTISIG', 'F-POR', 'F-LICENSE', 'E-FIAT-ON', 'S-BR-VALID']

for code in new_codes:
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/norms?code=eq.{code}',
        headers=headers
    )

    if resp.status_code == 200:
        norms = resp.json()
        if norms:
            norm = norms[0]
            print(f'\n{norm["code"]} - {norm["title"]}')
            print(f'  is_essential: {norm["is_essential"]}')
            print(f'  crypto_relevance: {norm.get("crypto_relevance", "")}')
            print(f'  issuing_authority: {norm.get("issuing_authority", "")}')
            print(f'  standard_reference: {norm.get("standard_reference", "")}')
            print(f'  official_link: {norm.get("official_link", "")}')
