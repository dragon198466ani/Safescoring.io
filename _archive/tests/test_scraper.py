#!/usr/bin/env python3
"""Test du scraper amélioré"""

import sys
sys.path.insert(0, 'src/core')
from smart_evaluator import SmartEvaluator

evaluator = SmartEvaluator()
evaluator.load_data()

# Tester sur Ledger Nano X
product = next((p for p in evaluator.products if p['name'] == 'Ledger Nano X'), None)
if product:
    print(f"\n🔍 Test scraping: {product['name']}")
    print(f"   URL: {product['url']}")
    doc_urls = product.get('specs', {}).get('doc_urls', {})
    print(f"   Doc URLs: {doc_urls}")
    
    content = evaluator.scrape_product_website(product)
    if content:
        print(f"\n✅ Contenu récupéré: {len(content)} caractères")
        print(f"\n📄 Extrait (500 premiers chars):")
        print("-" * 50)
        print(content[:500])
        print("-" * 50)
        
        # Compter les sources
        sources = {
            'SITE': content.count('[SITE:'),
            'DOCS': content.count('[DOCS]'),
            'GITHUB': content.count('[GITHUB:'),
            'SUPPORT': content.count('[SUPPORT]')
        }
        print(f"\n📊 Sources trouvées:")
        for src, count in sources.items():
            if count > 0:
                print(f"   {src}: {count}")
    else:
        print("❌ Pas de contenu récupéré")
