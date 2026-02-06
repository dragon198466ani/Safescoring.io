#!/usr/bin/env python3
"""
Add pillar-specific definitions (S, A, F, E) for each consumer type using AI.
Creates new rows in consumer_type_definitions for:
- essential_s, essential_a, essential_f, essential_e
- consumer_s, consumer_a, consumer_f, consumer_e
- full_s, full_a, full_f, full_e
"""

import os
import requests
import json
from dotenv import load_dotenv

# Load environment
load_dotenv('config/.env')

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'REVOKED_ROTATE_ON_DASHBOARD'

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# Pillar descriptions
PILLARS = {
    'S': {
        'name': 'Security',
        'description': 'Security pillar - focuses on protecting user assets, private keys, and preventing unauthorized access'
    },
    'A': {
        'name': 'Accessibility', 
        'description': 'Accessibility pillar - focuses on user experience, ease of use, documentation, and support'
    },
    'F': {
        'name': 'Functionality',
        'description': 'Functionality pillar - focuses on features, transaction capabilities, and operational aspects'
    },
    'E': {
        'name': 'Ethics',
        'description': 'Ethics pillar - focuses on compliance, transparency, privacy, and responsible business practices'
    }
}

# Consumer types
TYPES = {
    'essential': {
        'name': 'Essential',
        'target_pct': 25,
        'audience': 'All users - minimum requirements for safe basic use'
    },
    'consumer': {
        'name': 'Consumer',
        'target_pct': 60,
        'audience': 'General public - good balance of security and usability'
    },
    'full': {
        'name': 'Full',
        'target_pct': 100,
        'audience': 'Experts and institutions - comprehensive evaluation'
    }
}


def generate_definition_with_ai(type_code, type_name, pillar_code, pillar_name, pillar_desc):
    """Use Mistral AI to generate a definition for a specific type+pillar combination."""
    
    mistral_key = os.getenv('MISTRAL_API_KEY')
    if not mistral_key:
        # Fallback to manual definitions
        return generate_manual_definition(type_code, pillar_code)
    
    prompt = f"""Generate a concise definition (2-3 sentences) for classifying crypto security norms.

Context:
- Type: {type_name} ({type_code})
- Pillar: {pillar_name} ({pillar_code})
- {pillar_desc}

For {type_name} level in the {pillar_name} pillar, what criteria should a norm meet?

{type_name} means:
- Essential (25%): Critical, fundamental norms that ANY product must meet
- Consumer (60%): Important norms for general public users  
- Full (100%): All norms including advanced/technical ones

Respond with ONLY the definition text, no formatting or labels."""

    try:
        r = requests.post(
            'https://api.mistral.ai/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {mistral_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'mistral-small-latest',
                'messages': [{'role': 'user', 'content': prompt}],
                'max_tokens': 200,
                'temperature': 0.3
            },
            timeout=30
        )
        
        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content'].strip()
    except Exception as e:
        print(f"   AI error: {e}")
    
    return generate_manual_definition(type_code, pillar_code)


def generate_manual_definition(type_code, pillar_code):
    """Manual fallback definitions."""
    definitions = {
        ('essential', 'S'): 'Critical security norms protecting private keys, seed phrases, and authentication. Includes basic encryption, secure storage, and protection against common attacks.',
        ('essential', 'A'): 'Fundamental accessibility norms ensuring clear user interface, basic onboarding guidance, essential error messages, and minimum help availability.',
        ('essential', 'F'): 'Core functionality norms for basic transactions (send/receive), fee transparency, transaction confirmation, and essential backup/restore capabilities.',
        ('essential', 'E'): 'Basic ethics norms covering regulatory compliance, transparent terms of service, privacy protection, and clear custody model disclosure.',
        
        ('consumer', 'S'): 'Security norms for general users including 2FA/MFA options, security audit transparency, incident response, advanced encryption, and regular security updates.',
        ('consumer', 'A'): 'Accessibility norms for public users including intuitive UX, multi-language support, mobile/desktop apps, comprehensive documentation, and responsive support.',
        ('consumer', 'F'): 'Functionality norms for everyday use including portfolio tracking, multi-asset support, notifications, service integrations, and advanced transaction features.',
        ('consumer', 'E'): 'Ethics norms for consumer trust including clear fee structures, GDPR compliance, transparent governance, environmental considerations, and community engagement.',
        
        ('full', 'S'): 'All security norms including advanced cryptography, formal verification, bug bounty programs, penetration testing, and comprehensive threat modeling.',
        ('full', 'A'): 'All accessibility norms including API/SDK availability, developer documentation, enterprise integrations, WCAG compliance, and advanced customization.',
        ('full', 'F'): 'All functionality norms including DeFi integrations, cross-chain capabilities, governance features, institutional-grade tools, and advanced trading.',
        ('full', 'E'): 'All ethics norms including complete regulatory compliance, ESG reporting, open source contributions, industry certifications, and sustainability plans.',
    }
    return definitions.get((type_code, pillar_code), f'{type_code.title()} norms for {pillar_code} pillar.')


def generate_keywords(type_code, pillar_code):
    """Generate keywords for each type+pillar combination."""
    keywords = {
        ('essential', 'S'): 'private key, seed, mnemonic, backup, recovery, encryption, password, PIN, authentication, secure storage',
        ('essential', 'A'): 'user interface, onboarding, setup guide, error message, warning, help, basic support, clear instructions',
        ('essential', 'F'): 'transaction, send, receive, fee, transfer, balance, confirm, verify, backup, restore, wallet',
        ('essential', 'E'): 'compliance, regulation, terms of service, privacy, transparent, custody, risk disclosure, legal',
        
        ('consumer', 'S'): '2FA, MFA, security audit, incident response, update, patch, monitoring, alert, advanced protection',
        ('consumer', 'A'): 'mobile app, desktop, documentation, FAQ, customer support, multi-language, responsive, modern UX',
        ('consumer', 'F'): 'portfolio, history, notification, integration, exchange, swap, multiple assets, token, network',
        ('consumer', 'E'): 'GDPR, data protection, governance, community, communication, environmental, sustainable, ethical',
        
        ('full', 'S'): 'cryptographic, formal verification, bug bounty, penetration testing, threat model, zero-day, advanced security',
        ('full', 'A'): 'API, SDK, developer docs, enterprise, WCAG, accessibility compliance, advanced customization',
        ('full', 'F'): 'DeFi, cross-chain, governance, institutional, advanced trading, liquidity, protocol integration',
        ('full', 'E'): 'ESG, certification, open source, audit report, sustainability, regulatory framework, industry standard',
    }
    return keywords.get((type_code, pillar_code), '')


def add_pillar_definitions():
    """Add all pillar-specific definitions to the database."""
    print("=" * 70)
    print("📝 ADDING PILLAR-SPECIFIC DEFINITIONS (S, A, F, E)")
    print("=" * 70)
    
    records_to_add = []
    
    for type_code, type_info in TYPES.items():
        for pillar_code, pillar_info in PILLARS.items():
            combined_code = f"{type_code}_{pillar_code.lower()}"
            combined_name = f"{type_info['name']} - {pillar_info['name']}"
            
            print(f"\n🔄 Generating: {combined_code}...")
            
            # Generate definition with AI
            definition = generate_definition_with_ai(
                type_code, type_info['name'],
                pillar_code, pillar_info['name'], pillar_info['description']
            )
            
            keywords = generate_keywords(type_code, pillar_code)
            
            # Convert keywords to list for JSON
            keywords_list = [k.strip() for k in keywords.split(',')]
            
            # Generate inclusion/exclusion criteria as lists
            inclusion_criteria = [f"Norms in {pillar_info['name']} pillar that meet {type_info['name']} level requirements"]
            exclusion_criteria = [f"Norms too advanced for {type_info['name']} level"] if type_code != 'full' else ["None"]
            
            record = {
                'type_code': combined_code,
                'type_name': combined_name,
                'definition': definition,
                'target_audience': type_info['audience'],
                'inclusion_criteria': inclusion_criteria,
                'exclusion_criteria': exclusion_criteria,
                'keywords': keywords_list,
                'target_percentage': type_info['target_pct'],
                'priority_order': {'essential': 1, 'consumer': 2, 'full': 3}[type_code] * 10 + {'S': 1, 'A': 2, 'F': 3, 'E': 4}[pillar_code],
                'is_active': True
            }
            
            records_to_add.append(record)
            print(f"   ✅ {combined_name}: {definition[:60]}...")
    
    # Insert all records
    print("\n" + "=" * 70)
    print("📤 INSERTING INTO DATABASE")
    print("=" * 70)
    
    success = 0
    for record in records_to_add:
        # Try insert, if exists try update
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/consumer_type_definitions',
            headers={**HEADERS, 'Prefer': 'return=minimal'},
            json=record
        )
        
        if r.status_code in [200, 201]:
            success += 1
            print(f"   ✅ Inserted: {record['type_code']}")
        elif r.status_code == 409:  # Conflict - already exists
            # Update instead
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/consumer_type_definitions?type_code=eq.{record['type_code']}",
                headers={**HEADERS, 'Prefer': 'return=minimal'},
                json=record
            )
            if r.status_code in [200, 204]:
                success += 1
                print(f"   🔄 Updated: {record['type_code']}")
            else:
                print(f"   ❌ Failed to update {record['type_code']}: {r.text}")
        else:
            print(f"   ❌ Failed: {record['type_code']} - {r.status_code}: {r.text}")
    
    print(f"\n✅ {success}/{len(records_to_add)} records added/updated")
    
    # Show final state
    print("\n" + "=" * 70)
    print("📊 FINAL TABLE STATE")
    print("=" * 70)
    
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/consumer_type_definitions?select=type_code,type_name,target_percentage&order=priority_order',
        headers=HEADERS
    )
    
    print(f"\n{'Type Code':<20} {'Name':<30} {'Target %':<10}")
    print("-" * 60)
    for d in r.json():
        print(f"{d['type_code']:<20} {d['type_name']:<30} {d.get('target_percentage', '-')}")


if __name__ == '__main__':
    add_pillar_definitions()
