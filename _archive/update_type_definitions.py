#!/usr/bin/env python3
"""
Update consumer_type_definitions with balanced definitions for S, A, F, E pillars.
"""

import requests

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

# New balanced definitions
NEW_DEFINITIONS = {
    'essential': {
        'type_name': 'Essential',
        'definition': '''Essential norms represent the MINIMUM requirements that ANY crypto product must meet to be considered safe for basic use. These are fundamental norms across ALL pillars (S, A, F, E) that protect users from critical risks.

SECURITY (S) - Essential criteria:
- Basic private key protection and secure storage
- Seed phrase backup and recovery mechanisms
- Basic authentication (password, PIN, or biometric)
- Protection against common attack vectors
- Basic encryption for sensitive data

ACCESSIBILITY (A) - Essential criteria:
- Clear and understandable user interface
- Basic onboarding and setup guidance
- Essential error messages and warnings
- Minimum accessibility for average users
- Basic help and support availability

FUNCTIONALITY (F) - Essential criteria:
- Core transaction capabilities (send/receive)
- Basic fee transparency
- Transaction confirmation and verification
- Essential account management features
- Basic backup and restore functionality

ETHICS (E) - Essential criteria:
- Basic regulatory compliance (where applicable)
- Transparent terms of service
- Basic privacy protection
- Clear ownership and custody model
- Minimum transparency about risks

Target: ~25% of norms in each pillar should be Essential.''',
        'target_audience': 'All users - These criteria must be met for any user to safely use the product, regardless of experience level.',
        'criteria_keywords': 'private key, seed, backup, recovery, authentication, password, PIN, basic security, user interface, onboarding, transaction, fee transparency, compliance, privacy, terms of service'
    },
    
    'consumer': {
        'type_name': 'Consumer',
        'definition': '''Consumer norms include all Essential norms PLUS additional requirements important for general public users who need a good balance of security and usability. These norms ensure products are suitable for everyday use by non-technical users.

SECURITY (S) - Consumer criteria (includes Essential +):
- Advanced authentication options (2FA, MFA)
- Security audit history and transparency
- Incident response and communication
- Advanced encryption standards
- Regular security updates

ACCESSIBILITY (A) - Consumer criteria (includes Essential +):
- Intuitive and modern user experience
- Multi-language support
- Mobile and desktop availability
- Comprehensive documentation and tutorials
- Responsive customer support

FUNCTIONALITY (F) - Consumer criteria (includes Essential +):
- Advanced transaction features
- Portfolio tracking and history
- Multiple asset support
- Integration with common services
- Notification and alert systems

ETHICS (E) - Consumer criteria (includes Essential +):
- Clear fee structure and pricing
- Data protection and GDPR compliance
- Transparent governance model
- Environmental considerations
- Community engagement and communication

Target: ~60% of norms in each pillar should be Consumer.
Hierarchy: Essential ⊂ Consumer (all Essential norms are also Consumer)''',
        'target_audience': 'General public users - Regular users who want a secure, user-friendly product without needing deep technical knowledge.',
        'criteria_keywords': '2FA, MFA, security audit, user experience, mobile app, customer support, documentation, portfolio, notifications, GDPR, governance, fees, multi-language'
    },
    
    'full': {
        'type_name': 'Full',
        'definition': '''Full norms include ALL norms in the SAFE framework - Essential, Consumer, and advanced/technical norms. This comprehensive evaluation is designed for experts, analysts, and institutions who need complete due diligence.

SECURITY (S) - Full criteria (includes Consumer +):
- Advanced cryptographic implementations
- Formal security verification
- Bug bounty programs
- Third-party penetration testing
- Advanced threat modeling

ACCESSIBILITY (A) - Full criteria (includes Consumer +):
- API and SDK availability
- Developer documentation
- Advanced customization options
- Enterprise integration capabilities
- Accessibility compliance (WCAG)

FUNCTIONALITY (F) - Full criteria (includes Consumer +):
- Advanced DeFi integrations
- Cross-chain capabilities
- Governance participation features
- Advanced trading features
- Institutional-grade features

ETHICS (E) - Full criteria (includes Consumer +):
- Complete regulatory compliance
- ESG reporting
- Open source contributions
- Industry standard certifications
- Long-term sustainability plans

Target: 100% of all norms.
Hierarchy: Essential ⊂ Consumer ⊂ Full''',
        'target_audience': 'Experts, analysts, institutions - Technical users, security researchers, and organizations requiring comprehensive evaluation.',
        'criteria_keywords': 'cryptographic, formal verification, bug bounty, penetration testing, API, SDK, enterprise, DeFi, cross-chain, governance, ESG, certification, institutional'
    }
}


def update_definitions():
    """Update the consumer_type_definitions table."""
    print("=" * 70)
    print("📝 UPDATING CONSUMER TYPE DEFINITIONS")
    print("=" * 70)
    
    for type_code, data in NEW_DEFINITIONS.items():
        print(f"\n🔄 Updating '{type_code}'...")
        
        r = requests.patch(
            f'{SUPABASE_URL}/rest/v1/consumer_type_definitions?type_code=eq.{type_code}',
            headers=HEADERS,
            json={
                'type_name': data['type_name'],
                'definition': data['definition'],
                'target_audience': data['target_audience']
            }
        )
        
        if r.status_code in [200, 204]:
            print(f"   ✅ Updated successfully")
        else:
            print(f"   ❌ Error: {r.status_code} - {r.text}")
    
    # Verify
    print("\n" + "=" * 70)
    print("✅ VERIFICATION")
    print("=" * 70)
    
    r = requests.get(f'{SUPABASE_URL}/rest/v1/consumer_type_definitions?select=type_code,type_name,target_audience', headers=HEADERS)
    
    for d in r.json():
        print(f"\n{d['type_code'].upper()}:")
        print(f"  Name: {d['type_name']}")
        print(f"  Audience: {d['target_audience'][:60]}...")


if __name__ == '__main__':
    update_definitions()
