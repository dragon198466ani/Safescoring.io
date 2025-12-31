#!/usr/bin/env python3
"""
Reclassify norms with BALANCED distribution across all pillars (S, A, F, E).

Target distribution per pillar:
- ESSENTIAL: ~25% of each pillar
- CONSUMER: ~60% of each pillar  
- FULL: 100%
"""

import requests
from collections import defaultdict

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

# Target percentages per pillar
ESSENTIAL_PCT = 25
CONSUMER_PCT = 60

# Keywords for scoring relevance (higher score = more likely Essential/Consumer)
ESSENTIAL_KEYWORDS = {
    'S': ['private key', 'seed', 'mnemonic', 'backup', 'recovery', 'encryption', 'encrypt', 
          'authentication', '2fa', 'password', 'pin', 'biometric', 'audit', 'vulnerability',
          'attack', 'hack', 'custody', 'secure', 'tamper', 'signature', 'multisig'],
    'A': ['user interface', 'onboarding', 'setup', 'guide', 'tutorial', 'error message',
          'warning', 'help', 'support', 'accessibility', 'usability', 'intuitive', 'clear'],
    'F': ['transaction', 'send', 'receive', 'fee', 'transfer', 'balance', 'confirm',
          'verify', 'backup', 'restore', 'account', 'wallet', 'basic'],
    'E': ['compliance', 'regulation', 'license', 'terms', 'privacy', 'transparent',
          'ownership', 'custody', 'risk', 'disclosure', 'legal']
}

CONSUMER_KEYWORDS = {
    'S': ['security audit', 'incident', 'update', 'patch', 'monitoring', 'alert',
          'notification', 'advanced', 'protection', 'defense'],
    'A': ['mobile', 'desktop', 'app', 'documentation', 'faq', 'customer support',
          'multi-language', 'responsive', 'modern', 'experience'],
    'F': ['portfolio', 'history', 'notification', 'alert', 'integration', 'exchange',
          'swap', 'multiple', 'asset', 'token', 'network'],
    'E': ['gdpr', 'data protection', 'governance', 'community', 'communication',
          'environmental', 'sustainable', 'ethical', 'responsible']
}


def score_norm(norm, keywords_dict):
    """Score a norm based on keyword matches."""
    pillar = norm.get('pillar', '')
    title = (norm.get('title') or '').lower()
    description = (norm.get('description') or '').lower()
    text = f"{title} {description}"
    
    keywords = keywords_dict.get(pillar, [])
    score = 0
    for kw in keywords:
        if kw.lower() in text:
            score += 1
    return score


def reclassify_balanced():
    """Reclassify norms with balanced distribution per pillar."""
    print("=" * 70)
    print("🔄 BALANCED RECLASSIFICATION")
    print("=" * 70)
    
    # Load norms
    r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,description', headers=HEADERS)
    all_norms = r.json()
    print(f"\n📥 Loaded {len(all_norms)} norms")
    
    # Group by pillar
    by_pillar = defaultdict(list)
    for n in all_norms:
        pillar = n.get('pillar', '?')
        by_pillar[pillar].append(n)
    
    print(f"\nNorms per pillar:")
    for p in ['S', 'A', 'F', 'E']:
        print(f"  {p}: {len(by_pillar[p])} norms")
    
    # Score and classify each pillar
    classifications = {}
    
    for pillar in ['S', 'A', 'F', 'E']:
        norms = by_pillar[pillar]
        n_total = len(norms)
        n_essential = int(n_total * ESSENTIAL_PCT / 100)
        n_consumer = int(n_total * CONSUMER_PCT / 100)
        
        # Score norms for Essential
        scored = []
        for n in norms:
            ess_score = score_norm(n, ESSENTIAL_KEYWORDS)
            con_score = score_norm(n, CONSUMER_KEYWORDS)
            scored.append({
                'norm': n,
                'ess_score': ess_score,
                'con_score': con_score,
                'total_score': ess_score + con_score
            })
        
        # Sort by essential score (descending)
        scored.sort(key=lambda x: (x['ess_score'], x['total_score']), reverse=True)
        
        # Top n_essential are Essential
        essential_ids = set()
        for item in scored[:n_essential]:
            essential_ids.add(item['norm']['id'])
        
        # Sort by total score for Consumer
        scored.sort(key=lambda x: x['total_score'], reverse=True)
        
        # Top n_consumer are Consumer (includes Essential)
        consumer_ids = set(essential_ids)  # Essential implies Consumer
        for item in scored[:n_consumer]:
            consumer_ids.add(item['norm']['id'])
        
        # Store classifications
        for n in norms:
            nid = n['id']
            classifications[nid] = {
                'is_essential': nid in essential_ids,
                'is_consumer': nid in consumer_ids,
                'is_full': True
            }
        
        print(f"\n{pillar} pillar: {len(essential_ids)} Essential ({len(essential_ids)/n_total*100:.0f}%), {len(consumer_ids)} Consumer ({len(consumer_ids)/n_total*100:.0f}%)")
    
    # Apply to database
    print("\n" + "=" * 70)
    print("📤 APPLYING CLASSIFICATIONS")
    print("=" * 70)
    
    success = 0
    for i, (norm_id, cls) in enumerate(classifications.items()):
        r = requests.patch(
            f'{SUPABASE_URL}/rest/v1/safe_scoring_definitions?norm_id=eq.{norm_id}',
            headers=HEADERS,
            json=cls
        )
        if r.status_code in [200, 204]:
            success += 1
        
        if (i + 1) % 200 == 0:
            print(f"   [{i+1}/{len(classifications)}] Updated...")
    
    print(f"\n✅ {success} norms updated")
    
    # Verify final distribution
    print("\n" + "=" * 70)
    print("📊 FINAL DISTRIBUTION")
    print("=" * 70)
    
    r = requests.get(f'{SUPABASE_URL}/rest/v1/safe_scoring_definitions?select=norm_id,is_essential,is_consumer', headers=HEADERS)
    defs = {d['norm_id']: d for d in r.json()}
    
    stats = defaultdict(lambda: {'total': 0, 'essential': 0, 'consumer': 0})
    for n in all_norms:
        pillar = n.get('pillar', '?')
        d = defs.get(n['id'], {})
        stats[pillar]['total'] += 1
        if d.get('is_essential'):
            stats[pillar]['essential'] += 1
        if d.get('is_consumer'):
            stats[pillar]['consumer'] += 1
    
    print(f"\n{'Pillar':<8} {'Total':<8} {'Essential':<15} {'Consumer':<15}")
    print("-" * 50)
    for p in ['S', 'A', 'F', 'E']:
        s = stats[p]
        ess_pct = s['essential']/s['total']*100 if s['total'] > 0 else 0
        con_pct = s['consumer']/s['total']*100 if s['total'] > 0 else 0
        print(f"{p:<8} {s['total']:<8} {s['essential']} ({ess_pct:.0f}%)        {s['consumer']} ({con_pct:.0f}%)")
    
    total_ess = sum(s['essential'] for s in stats.values())
    total_con = sum(s['consumer'] for s in stats.values())
    total_all = sum(s['total'] for s in stats.values())
    print("-" * 50)
    print(f"{'TOTAL':<8} {total_all:<8} {total_ess} ({total_ess/total_all*100:.0f}%)        {total_con} ({total_con/total_all*100:.0f}%)")


if __name__ == '__main__':
    reclassify_balanced()
    print("\n🔄 Now run: python scripts/fix_hierarchy_and_recalculate.py")
