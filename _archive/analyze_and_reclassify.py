#!/usr/bin/env python3
"""
Analyze current classification and reclassify norms with improved criteria.

Goal: Ensure Essential norms are truly critical security norms that products
should score well on. Consumer norms should be a superset of Essential.

New classification criteria:
- ESSENTIAL (~15-20%): Critical security, fund protection, audit, keys
- CONSUMER (~50-60%): Essential + UX, fees, support, documentation
- FULL (100%): All norms
"""

import requests
import re

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

# Keywords for classification
ESSENTIAL_KEYWORDS = [
    # Security critical
    'security', 'secure', 'audit', 'audited', 'vulnerability', 'exploit',
    'hack', 'breach', 'attack', 'malicious', 'threat',
    # Keys and custody
    'private key', 'seed', 'mnemonic', 'custody', 'custodial', 'self-custody',
    'backup', 'recovery', 'restore',
    # Authentication
    'authentication', '2fa', 'mfa', 'password', 'pin', 'biometric',
    # Encryption
    'encrypt', 'encryption', 'cryptograph',
    # Fund safety
    'fund', 'asset', 'loss', 'theft', 'steal', 'protect',
    # Critical operations
    'sign', 'signature', 'transaction', 'transfer', 'withdraw',
    # Compliance basics
    'license', 'regulated', 'compliance', 'kyc', 'aml',
    # Hardware security
    'hardware', 'secure element', 'chip', 'tamper',
]

CONSUMER_KEYWORDS = [
    # UX and usability
    'user', 'interface', 'ui', 'ux', 'usability', 'easy', 'simple',
    'intuitive', 'beginner', 'friendly',
    # Support
    'support', 'help', 'customer', 'service', 'contact', 'response',
    # Documentation
    'documentation', 'guide', 'tutorial', 'faq', 'instruction',
    # Fees and costs
    'fee', 'cost', 'price', 'pricing', 'transparent',
    # Communication
    'notification', 'alert', 'email', 'update', 'inform',
    # Mobile and accessibility
    'mobile', 'app', 'android', 'ios', 'desktop',
    # Basic features
    'feature', 'function', 'option', 'setting',
    # Trust indicators
    'reputation', 'review', 'rating', 'trust', 'history',
]

# Norms that should ALWAYS be Essential (by code pattern)
ALWAYS_ESSENTIAL_PATTERNS = [
    r'^S\d+',  # All S (Security) pillar norms are essential candidates
]

# Norms that should NEVER be Essential (technical/advanced)
NEVER_ESSENTIAL_PATTERNS = [
    r'governance',
    r'tokenomics', 
    r'interoperability',
    r'api',
    r'sdk',
    r'developer',
    r'technical.*detail',
    r'architecture',
    r'performance.*optim',
]


def analyze_current_state():
    """Analyze current classification distribution."""
    print("=" * 70)
    print("📊 ANALYZING CURRENT CLASSIFICATION")
    print("=" * 70)
    
    # Get norms
    r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,description', headers=HEADERS)
    norms = {n['id']: n for n in r.json()}
    
    # Get definitions
    r = requests.get(f'{SUPABASE_URL}/rest/v1/safe_scoring_definitions?select=norm_id,is_essential,is_consumer,is_full', headers=HEADERS)
    defs = r.json()
    
    # Stats by pillar
    from collections import defaultdict
    stats = defaultdict(lambda: {'total': 0, 'essential': 0, 'consumer': 0})
    
    for d in defs:
        nid = d['norm_id']
        if nid in norms:
            pillar = norms[nid].get('pillar', '?')
            stats[pillar]['total'] += 1
            if d['is_essential']:
                stats[pillar]['essential'] += 1
            if d['is_consumer']:
                stats[pillar]['consumer'] += 1
    
    print("\nCurrent distribution by pillar:")
    print(f"{'Pillar':<10} {'Total':<8} {'Essential':<15} {'Consumer':<15}")
    print("-" * 50)
    
    total_all = sum(s['total'] for s in stats.values())
    total_ess = sum(s['essential'] for s in stats.values())
    total_con = sum(s['consumer'] for s in stats.values())
    
    for p in ['S', 'A', 'F', 'E']:
        s = stats[p]
        ess_pct = s['essential']/s['total']*100 if s['total'] > 0 else 0
        con_pct = s['consumer']/s['total']*100 if s['total'] > 0 else 0
        print(f"{p:<10} {s['total']:<8} {s['essential']} ({ess_pct:.0f}%)       {s['consumer']} ({con_pct:.0f}%)")
    
    print("-" * 50)
    print(f"{'TOTAL':<10} {total_all:<8} {total_ess} ({total_ess/total_all*100:.0f}%)       {total_con} ({total_con/total_all*100:.0f}%)")
    
    return norms, defs


def classify_norm_improved(norm):
    """
    Improved classification based on keywords and pillar.
    Returns (is_essential, is_consumer)
    """
    code = norm.get('code', '').upper()
    pillar = norm.get('pillar', '')
    title = (norm.get('title') or '').lower()
    description = (norm.get('description') or '').lower()
    text = f"{title} {description}"
    
    is_essential = False
    is_consumer = False
    
    # Rule 1: Check for essential keywords
    essential_score = 0
    for kw in ESSENTIAL_KEYWORDS:
        if kw.lower() in text:
            essential_score += 1
    
    # Rule 2: S pillar (Security) norms are more likely essential
    if pillar == 'S':
        essential_score += 2
    
    # Rule 3: Check for consumer keywords
    consumer_score = 0
    for kw in CONSUMER_KEYWORDS:
        if kw.lower() in text:
            consumer_score += 1
    
    # Rule 4: Check never-essential patterns
    for pattern in NEVER_ESSENTIAL_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            essential_score = 0
            break
    
    # Decision logic
    # Essential: high essential score AND not excluded
    if essential_score >= 2:
        is_essential = True
        is_consumer = True  # Essential implies Consumer
    
    # Consumer: essential OR consumer keywords
    if consumer_score >= 1 or essential_score >= 1:
        is_consumer = True
    
    # A pillar (Accessibility) norms are often consumer-relevant
    if pillar == 'A':
        is_consumer = True
    
    # E pillar (Ethics/Environment) - some are consumer relevant
    if pillar == 'E' and consumer_score >= 1:
        is_consumer = True
    
    return is_essential, is_consumer


def reclassify_all_norms(norms, defs):
    """Reclassify all norms with improved criteria."""
    print("\n" + "=" * 70)
    print("🔄 RECLASSIFYING ALL NORMS")
    print("=" * 70)
    
    # Build lookup
    defs_by_norm = {d['norm_id']: d for d in defs}
    
    updates = []
    
    for norm_id, norm in norms.items():
        is_essential, is_consumer = classify_norm_improved(norm)
        
        # Always Full
        is_full = True
        
        # Enforce hierarchy: Essential → Consumer
        if is_essential:
            is_consumer = True
        
        updates.append({
            'norm_id': norm_id,
            'is_essential': is_essential,
            'is_consumer': is_consumer,
            'is_full': is_full
        })
    
    # Count changes
    new_essential = sum(1 for u in updates if u['is_essential'])
    new_consumer = sum(1 for u in updates if u['is_consumer'])
    
    print(f"\nNew classification:")
    print(f"  Essential: {new_essential} ({new_essential/len(updates)*100:.1f}%)")
    print(f"  Consumer:  {new_consumer} ({new_consumer/len(updates)*100:.1f}%)")
    print(f"  Full:      {len(updates)} (100%)")
    
    # Apply updates
    print(f"\n📤 Applying {len(updates)} updates...")
    
    success = 0
    for i, u in enumerate(updates):
        r = requests.patch(
            f'{SUPABASE_URL}/rest/v1/safe_scoring_definitions?norm_id=eq.{u["norm_id"]}',
            headers=HEADERS,
            json={
                'is_essential': u['is_essential'],
                'is_consumer': u['is_consumer'],
                'is_full': u['is_full']
            }
        )
        if r.status_code in [200, 204]:
            success += 1
        
        if (i + 1) % 100 == 0:
            print(f"   [{i+1}/{len(updates)}] Updated...")
    
    print(f"\n✅ {success} norms reclassified")
    
    return updates


def verify_new_classification():
    """Verify the new classification."""
    print("\n" + "=" * 70)
    print("✅ VERIFYING NEW CLASSIFICATION")
    print("=" * 70)
    
    r = requests.get(f'{SUPABASE_URL}/rest/v1/safe_scoring_definitions?select=norm_id,is_essential,is_consumer,is_full', headers=HEADERS)
    defs = r.json()
    
    essential = sum(1 for d in defs if d['is_essential'])
    consumer = sum(1 for d in defs if d['is_consumer'])
    full = sum(1 for d in defs if d['is_full'])
    
    print(f"\nFinal distribution:")
    print(f"  Essential: {essential} ({essential/len(defs)*100:.1f}%)")
    print(f"  Consumer:  {consumer} ({consumer/len(defs)*100:.1f}%)")
    print(f"  Full:      {full} ({full/len(defs)*100:.1f}%)")
    
    # Check hierarchy
    violations = 0
    for d in defs:
        if d['is_essential'] and not d['is_consumer']:
            violations += 1
    
    if violations == 0:
        print(f"\n✅ Hierarchy OK: Essential ⊂ Consumer ⊂ Full")
    else:
        print(f"\n❌ {violations} hierarchy violations!")


if __name__ == '__main__':
    # 1. Analyze current state
    norms, defs = analyze_current_state()
    
    # 2. Reclassify
    reclassify_all_norms(norms, defs)
    
    # 3. Verify
    verify_new_classification()
    
    print("\n" + "=" * 70)
    print("🔄 Now run fix_hierarchy_and_recalculate.py to update scores")
    print("=" * 70)
