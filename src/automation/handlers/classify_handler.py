"""
Classify Handler
================
Détermine automatiquement le type d'un produit.
"""

import json


def get_ai_client():
    """Récupère ou crée le client IA."""
    from handlers.scrape_handler import get_ai_client as _get_ai
    return _get_ai()


def handle_classify_type(supabase, task: dict, add_task) -> dict:
    """
    Détermine automatiquement le type d'un produit.

    Flow:
    1. Récupère infos produit
    2. Récupère tous les types disponibles
    3. Utilise IA pour classifier
    4. Met à jour le produit
    5. Déclenche évaluation
    """
    product_id = task['target_id']

    # Récupérer produit
    product = supabase.table('products').select('name, slug, brand, specs, description') \
        .eq('id', product_id).single().execute()

    if not product.data:
        return {'error': 'Product not found'}

    # Récupérer tous les types
    types = supabase.table('product_types').select('id, name, description, category') \
        .execute()

    if not types.data:
        return {'error': 'No product types found'}

    # Construire le prompt
    product_info = {
        'name': product.data['name'],
        'brand': product.data.get('brand'),
        'description': product.data.get('description'),
        'specs': product.data.get('specs', {})
    }

    types_list = []
    for t in types.data:
        types_list.append({
            'id': t['id'],
            'name': t['name'],
            'description': t.get('description', ''),
            'category': t.get('category', '')
        })

    prompt = f"""Tu es un expert en classification de produits crypto/blockchain.

PRODUIT À CLASSIFIER:
{json.dumps(product_info, indent=2, ensure_ascii=False)}

TYPES DISPONIBLES:
{json.dumps(types_list, indent=2, ensure_ascii=False)}

Analyse le produit et détermine son type.
Réponds UNIQUEMENT avec l'ID du type (un nombre entier).

Règles:
- Hardware Wallet = appareil physique pour stocker des crypto
- Software Wallet = application/extension navigateur
- Backup Physical = plaque métal, capsule pour seed phrase
- DEX = exchange décentralisé
- Protocol = protocole DeFi (lending, staking, etc.)

ID du type:"""

    # Appeler IA
    ai = get_ai_client()

    try:
        if ai.gemini:
            result = ai.gemini._call(prompt)
        elif ai.mistral:
            result = ai.mistral._call(prompt)
        else:
            # Fallback: essayer de deviner par le nom
            result = guess_type_by_name(product.data['name'], types.data)
    except Exception as e:
        print(f"  AI error: {e}")
        result = guess_type_by_name(product.data['name'], types.data)

    # Parser le résultat
    try:
        type_id = int(result.strip().split('\n')[0].strip())
    except (ValueError, IndexError):
        # Chercher un nombre dans la réponse
        import re
        numbers = re.findall(r'\d+', result)
        if numbers:
            type_id = int(numbers[0])
        else:
            return {'error': f'Could not parse type ID from: {result}'}

    # Vérifier que le type existe
    valid_ids = [t['id'] for t in types.data]
    if type_id not in valid_ids:
        return {'error': f'Invalid type ID: {type_id}'}

    # Mettre à jour le produit
    supabase.table('products').update({
        'type_id': type_id
    }).eq('id', product_id).execute()

    # Trouver le nom du type pour le log
    type_name = next((t['name'] for t in types.data if t['id'] == type_id), 'Unknown')

    # Déclencher évaluation
    add_task('evaluate_product', product_id, 'product', priority=3)

    return {'type_id': type_id, 'type_name': type_name}


def guess_type_by_name(name: str, types: list) -> str:
    """Fallback: devine le type par le nom du produit."""
    name_lower = name.lower()

    keywords = {
        'wallet': ['nano', 'trezor', 'coldcard', 'bitbox', 'keystone', 'jade', 'passport'],
        'backup': ['cryptosteel', 'billfodl', 'cryptotag', 'seedplate'],
        'dex': ['uniswap', '1inch', 'sushiswap', 'pancakeswap'],
        'lending': ['aave', 'compound', 'maker'],
    }

    for type_keyword, product_keywords in keywords.items():
        for kw in product_keywords:
            if kw in name_lower:
                # Trouver le type correspondant
                for t in types:
                    if type_keyword in t['name'].lower() or type_keyword in t.get('category', '').lower():
                        return str(t['id'])

    # Default: premier type (généralement Hardware Wallet)
    return str(types[0]['id']) if types else '1'
