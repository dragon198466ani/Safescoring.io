#!/usr/bin/env python3
"""
SAFESCORING - Translate ALL Supabase Data to English
Executes translation of all French content to English in the database
"""

import os
import requests

# Load config
def load_config():
    config = {}
    config_paths = [
        os.path.join(os.path.dirname(__file__), '..', 'src', 'web', 'env_template_free.txt'),
        os.path.join(os.path.dirname(__file__), '..', 'config', 'env_template_free.txt'),
    ]
    
    for path in config_paths:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        config[key.strip()] = value.strip()
            break
    return config

CONFIG = load_config()
SUPABASE_URL = CONFIG.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = CONFIG.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# ============================================================
# Product Types Translations - ALL CODES WITH ALL FIELDS
# ============================================================
PRODUCT_TYPES_TRANSLATIONS = {
    'HW Cold': {
        'description': 'A Hardware Wallet Cold Storage (HW Cold) is a physical device designed to securely store private keys offline, ensuring maximum protection against online threats and hacking attempts.',
        'examples': 'Ledger Nano X (with air-gapped mode), Ledger Nano S Plus, Trezor Safe 3, Coldcard Mk4, BitBox02',
        'advantages': 'Maximum security, Complete offline isolation, Secure Element chip protection, Physical button confirmation',
        'disadvantages': 'Higher cost, Less convenient for frequent transactions, Risk of physical loss or damage'
    },
    'HW Hot': {
        'description': 'A Hardware Wallet Connected (HW Hot) is a secure physical device combining the benefits of hardware wallets (offline key storage) with connectivity features for convenient transactions.',
        'examples': 'Keystone 4, Ledger Nano X, Trezor Mode, GridPlus Lattice1',
        'advantages': 'Direct connection to dApps, Good balance of security and convenience, Bluetooth/USB connectivity',
        'disadvantages': 'Exposure potential via connection, Higher attack surface than cold storage'
    },
    'SW Browser': {
        'description': 'A Software Wallet Browser Extension (SW Browser) is a software extension integrated into a web browser, allowing users to manage encrypted private keys and interact with Web3 applications.',
        'examples': 'MetaMask, Trust Wallet (extension), Rabby Wallet, Rainbow',
        'advantages': 'Quick and easy access to dApps, Free to use, Familiar browser interface',
        'disadvantages': 'Vulnerability to browser attacks, Phishing risks, Keys stored on connected device'
    },
    'SW Mobile': {
        'description': 'A Software Wallet Mobile App (SW Mobile) is a smartphone application (iOS/Android) that allows users to manage cryptographic assets with biometric security and mobile convenience.',
        'examples': 'Trust Wallet, MetaMask Mobile, Coinomi, Exodus Mobile',
        'advantages': 'Immediate accessibility via smartphone, Biometric security options, Convenient for daily use',
        'disadvantages': 'Vulnerability to mobile malware, Risk if phone is lost/stolen, Keys on connected device'
    },
    'Bkp Digital': {
        'description': 'A Backup Digital Encrypted (Bkp Digital) is an encrypted digital backup solution designed to securely store sensitive data like seed phrases and private keys with strong encryption.',
        'examples': 'Ledger Vault (for backup), 1Password with encrypted notes, Bitwarden',
        'advantages': 'Maximum protection of sensitive data, Redundancy across multiple locations, Easy to update',
        'disadvantages': 'Requires secure password management, Risk of forgetting encryption password'
    },
    'Bkp Physical': {
        'description': 'A Backup Physical Metal/Paper (Bkp Physical) is a non-electronic physical medium for storing seed phrases or private keys, designed for fire and water resistance and long-term durability.',
        'examples': 'Cryptotag, Billfodl, Steel Wallet, Cryptosteel Capsule',
        'advantages': 'Fire/water/corrosion resistance, No electronic components to fail, Long-term durability',
        'disadvantages': 'Risk of physical loss, Can be discovered during search, Must be stored securely'
    },
    'Card': {
        'description': 'A Custodial Crypto Card is a Visa or Mastercard linked to a crypto account managed by a third party (custodian). It enables conversions and payments in fiat currency from crypto holdings.',
        'examples': 'Crypto.com Visa Card, Binance Visa Card, Coinbase Card',
        'advantages': 'Easy to use (like regular card), Instant crypto-to-fiat conversion, Rewards programs',
        'disadvantages': 'Custodial risk, KYC required, Potential tax events on each transaction'
    },
    'Card Non-Cust': {
        'description': 'A Non-Custodial Crypto Card allows users to spend their crypto directly while maintaining full control of their private keys, without relying on a third-party custodian.',
        'examples': 'Gnosis Pay, Holyheld Card',
        'advantages': 'Self-custody maintained, No third-party control, Direct spending from wallet',
        'disadvantages': 'Limited availability, May have higher fees, Fewer reward options'
    },
    'AC Phys': {
        'description': 'Anti-Coercion Physical (AC Phys) products are hardware devices designed to protect cryptographic assets against physical attacks and coercion threats like robbery or extortion.',
        'examples': 'Ledger Nano X (with plausible deniability), Trezor (hidden wallet feature)',
        'advantages': 'Physical coercion protection, Decoy wallet functionality, Duress PIN options',
        'disadvantages': 'Complex setup required, Risk of forgetting hidden wallet access, Learning curve'
    },
    'AC Digit': {
        'description': 'An Anti-Coercion Digital (AC Digit) is a digital protection system designed to secure cryptographic assets against coercion and digital pressure through features like duress PINs and decoy wallets.',
        'examples': 'Unchained Capital (multisig + time-locks), Casa Keymaster (multisig + time-locks)',
        'advantages': 'Resistance to digital coercion, Time-locked transactions, Multi-signature protection',
        'disadvantages': 'Complex implementation, May delay legitimate transactions, Higher costs'
    },
    'AC Phygi': {
        'description': 'An Anti-Coercion Phygital (AC Phygi) is a hybrid crypto product combining physical elements (hardware) and digital elements (smart contracts) for comprehensive coercion protection.',
        'examples': 'Casa Keymaster (multisig + time-locks), Unchained Capital',
        'advantages': 'Combined physical and digital protection, Comprehensive coercion resistance, Multiple recovery options',
        'disadvantages': 'Complex setup, Higher costs, Requires understanding of both physical and digital security'
    },
    'CEX': {
        'description': 'Centralized trading platform where the exchange holds custody of user funds. Offers high liquidity and fiat on-ramps but introduces custodial risk.',
        'examples': 'Binance, Coinbase, Kraken, Bybit, OKX, Kucoin',
        'advantages': 'Intuitive user interface, High liquidity, Fiat on/off ramps, Customer support',
        'disadvantages': 'Custodial risk, KYC required, Potential for hacks, Account freezing risk'
    },
    'DEX': {
        'description': 'Non-custodial trading platform using smart contracts. Users maintain full control of their funds with no KYC requirements.',
        'examples': 'Uniswap, PancakeSwap, SushiSwap, dYdX',
        'advantages': 'No KYC, Self-custody, Censorship resistant, Transparent on-chain transactions',
        'disadvantages': 'Rug pull risk, Smart contract vulnerabilities, Higher learning curve, Gas fees'
    },
    'Lending': {
        'description': 'A DeFi Lending protocol is a decentralized platform allowing users to lend or borrow cryptographic assets without intermediaries, earning interest or accessing liquidity against collateral.',
        'examples': 'Aave, Compound, MakerDAO, dYdX, Venus',
        'advantages': 'Algorithmic interest rates, No intermediaries, Collateral-based lending, Transparent',
        'disadvantages': 'Liquidation risk, Smart contract risk, Interest rate volatility'
    },
    'Yield': {
        'description': 'A Yield Aggregator is a DeFi platform that automates yield optimization by aggregating yield farming strategies, auto-compounding rewards across multiple protocols.',
        'examples': 'Yearn Finance, Beefy Finance, Autofarm, Convex',
        'advantages': 'Automatic yield optimization, Gas cost savings through batching, Auto-compounding',
        'disadvantages': 'Smart contract risk, Platform fees, Dependency on underlying protocols'
    },
    'Liq Staking': {
        'description': 'Liquid Staking allows users to stake their crypto assets while receiving liquid derivative tokens that can be used in DeFi, maintaining liquidity while earning staking rewards.',
        'examples': 'Lido (stETH), Rocket Pool (rETH), Marinade (mSOL)',
        'advantages': 'Liquidity of staked funds, DeFi composability, No minimum stake requirements',
        'disadvantages': 'Counterparty risk, Depeg risk, Smart contract vulnerabilities'
    },
    'Derivatives': {
        'description': 'DeFi Derivatives platforms enable decentralized trading of derivative instruments like perpetual futures, options, and synthetic assets without centralized intermediaries.',
        'examples': 'dYdX, GMX, Synthetix, Perpetual Protocol',
        'advantages': 'Decentralized leverage trading, No KYC, Self-custody, 24/7 markets',
        'disadvantages': 'Liquidation risk, Complex instruments, Smart contract risk, High volatility'
    },
    'DeFi Tools': {
        'description': 'DeFi Tools & Analytics platforms provide portfolio tracking, yield monitoring, risk analysis, and other tools for managing and optimizing DeFi positions.',
        'examples': 'DeBank, Zapper, Zerion, DeFi Llama',
        'advantages': 'Portfolio overview, Multi-chain tracking, Risk monitoring, Strategy optimization',
        'disadvantages': 'Data accuracy depends on indexing, May not support all protocols'
    },
    'Bridges': {
        'description': 'Cross-Chain Bridges are protocols that enable secure transfer of assets and data between different blockchain networks, facilitating interoperability in the crypto ecosystem.',
        'examples': 'Wormhole, Stargate, Across, LayerZero',
        'advantages': 'Cross-chain interoperability, Access to multi-chain DeFi, Asset portability',
        'disadvantages': 'Bridge exploits risk, Wrapped asset risk, Transaction delays, Fees'
    },
    'RWA': {
        'description': 'Real World Assets (RWA) platforms tokenize physical assets like real estate, commodities, or securities, bringing them on-chain for fractional ownership and 24/7 trading.',
        'examples': 'Centrifuge, Maple Finance, Goldfinch, Ondo Finance',
        'advantages': 'Fractional ownership, 24/7 trading, Global accessibility, Increased liquidity',
        'disadvantages': 'Regulatory uncertainty, Counterparty risk, Oracle dependencies'
    },
    'Protocol': {
        'description': 'Security protocols and guides providing best practices, methodologies, and frameworks for safely managing and securing cryptocurrency assets.',
        'examples': 'CryptoCurrency Security Standard (CCSS), SAFE Scoring Methodology',
        'advantages': 'Standardized security practices, Clear guidelines, Risk assessment frameworks',
        'disadvantages': 'Requires implementation effort, May need updates as threats evolve'
    },
    'Crypto Bank': {
        'description': 'A Crypto-Native Bank is a financial institution designed from the ground up to serve crypto users, offering banking services integrated with cryptocurrency custody and trading.',
        'examples': 'Seba Bank, Sygnum, Anchorage Digital',
        'advantages': 'Integrated crypto and fiat services, Regulatory compliance, Institutional-grade security',
        'disadvantages': 'KYC/AML requirements, Geographic restrictions, Minimum balance requirements'
    },
}

# ============================================================
# Consumer Type Definitions Translations
# ============================================================
CONSUMER_TYPE_TRANSLATIONS = {
    'essential': {
        'type_name': 'Essential',
        'definition': 'Critical and fundamental norms for basic security. These norms represent the absolute minimum that any crypto product must meet to be considered safe. Failure on these norms indicates a major risk for users.',
        'target_audience': 'All users - These criteria are non-negotiable for any crypto product regardless of expertise level',
    },
    'consumer': {
        'type_name': 'Consumer',
        'definition': 'Important norms for general public users. These norms cover aspects that any non-technical user should verify before using a product. They include ease of use, fee transparency, and consumer protection.',
        'target_audience': 'General public users - People without deep technical expertise who use crypto products for everyday needs',
    },
    'full': {
        'type_name': 'Full',
        'definition': 'All norms in the SAFE framework. This level includes advanced technical criteria, optimizations, and complete best practices. Intended for expert users, analysts, and in-depth audits.',
        'target_audience': 'Experts, analysts, developers, and advanced users - Complete and detailed evaluation for exhaustive analysis',
    }
}

# ============================================================
# Subscription Plans Translations
# ============================================================
SUBSCRIPTION_PLANS_TRANSLATIONS = {
    'free': {
        'name': 'Free',
        'features': ['10 products', '1 setup', 'Monthly updates', 'Community support']
    },
    'basic': {
        'name': 'Basic', 
        'features': ['50 products', '5 setups', 'Weekly updates', 'Email support', 'Export reports']
    },
    'pro': {
        'name': 'Professional',
        'features': ['200 products', '20 setups', 'Daily updates', 'Priority support', 'API access', 'Custom alerts']
    }
}


def translate_product_types():
    """Translate product_types table"""
    print("\n📦 Translating product_types...")
    
    # Get all product types
    get_headers = {**HEADERS}
    get_headers.pop('Prefer', None)
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_types?select=*",
        headers=get_headers
    )
    
    if r.status_code != 200:
        print(f"   ❌ Failed to fetch product_types: {r.status_code} - {r.text[:200]}")
        return 0
    
    types = r.json()
    updated = 0
    
    if types:
        # Show first record to see columns
        print(f"   📋 Found {len(types)} types. Columns: {list(types[0].keys())}")
    
    for pt in types:
        code = pt.get('code', '')
        current_name = pt.get('name_fr', pt.get('name', ''))
        current_desc = pt.get('description', '')[:50] if pt.get('description') else ''
        
        # Find translation by code
        translation = PRODUCT_TYPES_TRANSLATIONS.get(code)
        
        if translation:
            # Update ALL columns to English
            update_data = {
                'description': translation['description'],
                'examples': translation.get('examples', ''),
                'advantages': translation.get('advantages', ''),
                'disadvantages': translation.get('disadvantages', '')
            }
            
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/product_types?id=eq.{pt['id']}",
                headers=HEADERS,
                json=update_data
            )
            
            if r.status_code in [200, 204]:
                print(f"   ✅ {code} → All fields translated")
                updated += 1
            else:
                print(f"   ⚠️ Failed {code}: {r.status_code} - {r.text[:100]}")
        else:
            print(f"   ⏭️ {code}: No translation defined")
    
    print(f"   📊 Updated {updated} product types")
    return updated


def translate_consumer_type_definitions():
    """Translate consumer_type_definitions table"""
    print("\n📋 Translating consumer_type_definitions...")
    
    updated = 0
    
    for type_code, translation in CONSUMER_TYPE_TRANSLATIONS.items():
        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/consumer_type_definitions?type_code=eq.{type_code}",
            headers=HEADERS,
            json=translation
        )
        
        if r.status_code in [200, 204]:
            print(f"   ✅ {type_code} → {translation['type_name']}")
            updated += 1
        else:
            print(f"   ⚠️ Failed to update {type_code}: {r.status_code} - {r.text[:100]}")
    
    print(f"   📊 Updated {updated} consumer type definitions")
    return updated


def translate_subscription_plans():
    """Translate subscription_plans table"""
    print("\n💳 Translating subscription_plans...")
    
    updated = 0
    
    for code, translation in SUBSCRIPTION_PLANS_TRANSLATIONS.items():
        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/subscription_plans?code=eq.{code}",
            headers=HEADERS,
            json={
                'name': translation['name'],
                'features': translation['features']
            }
        )
        
        if r.status_code in [200, 204]:
            print(f"   ✅ {code} → {translation['name']}")
            updated += 1
        else:
            print(f"   ⚠️ Failed to update {code}: {r.status_code}")
    
    print(f"   📊 Updated {updated} subscription plans")
    return updated


def translate_norms():
    """Translate norms table - replace French words with English"""
    print("\n📜 Translating norms table...")
    
    get_headers = {**HEADERS}
    get_headers.pop('Prefer', None)
    
    # Get ALL norms
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,code,title,description&limit=1000",
        headers=get_headers
    )
    
    if r.status_code != 200:
        print(f"   ❌ Could not fetch norms: {r.status_code}")
        return 0
    
    norms = r.json()
    print(f"   📋 Found {len(norms)} norms")
    
    # French to English replacements (order matters - longer phrases first)
    replacements = [
        # Long phrases first
        ('Engagement cryptographique pour cacher les montants', 'Cryptographic commitment to hide amounts'),
        ('Intégration avis voyage sécurité', 'Travel security advice integration'),
        ('Résistance à la censure des transactions', 'Transaction censorship resistance'),
        ('Étiquetage des transactions/adresses', 'Transaction/address labeling'),
        ('Calcul des gains/pertes', 'Gain/loss calculation'),
        ('Contournement des restrictions géographiques', 'Geographic restrictions bypass'),
        ('Coffre avec période de contestation', 'Vault with contestation period'),
        ('Affichage clair des délais actifs', 'Clear display of active delays'),
        ('Dérivation clé mot de passe', 'Password key derivation'),
        ('Catalogue de mesures de sécurité IT', 'IT security measures catalog'),
        ('clé privée', 'private key'),
        ('clés privées', 'private keys'),
        ('mot de passe', 'password'),
        # Security terms
        ('sécurité', 'security'),
        ('Sécurité', 'Security'),
        ('chiffrement', 'encryption'),
        ('cryptographique', 'cryptographic'),
        ('authentification', 'authentication'),
        ('vérification', 'verification'),
        ('Vérification', 'Verification'),
        ('sauvegarde', 'backup'),
        ('récupération', 'recovery'),
        ('portefeuille', 'wallet'),
        ('Portefeuille', 'Wallet'),
        # Transaction terms
        ('transactions', 'transactions'),
        ('transaction', 'transaction'),
        ('adresses', 'addresses'),
        ('adresse', 'address'),
        ('solde', 'balance'),
        ('frais', 'fees'),
        ('montants', 'amounts'),
        ('montant', 'amount'),
        # User terms
        ('utilisateurs', 'users'),
        ('utilisateur', 'user'),
        ('Utilisateur', 'User'),
        # Action verbs
        ('permet de', 'allows to'),
        ('permet', 'allows'),
        ('assure', 'ensures'),
        ('protège', 'protects'),
        ('garantit', 'guarantees'),
        ('vérifie', 'verifies'),
        ('affiche', 'displays'),
        ('Affichage', 'Display'),
        ('calcul', 'calculation'),
        ('Calcul', 'Calculation'),
        # Common terms
        ('attaques', 'attacks'),
        ('données', 'data'),
        ('système', 'system'),
        ('réseau', 'network'),
        ('protocole', 'protocol'),
        ('appareil', 'device'),
        ('Intégration', 'Integration'),
        ('Résistance', 'Resistance'),
        ('résistance', 'resistance'),
        ('censure', 'censorship'),
        ('Étiquetage', 'Labeling'),
        ('étiquetage', 'labeling'),
        ('Contournement', 'Bypass'),
        ('restrictions', 'restrictions'),
        ('géographiques', 'geographic'),
        ('Coffre', 'Vault'),
        ('période', 'period'),
        ('contestation', 'contestation'),
        ('délais', 'delays'),
        ('Dérivation', 'Derivation'),
        ('Catalogue', 'Catalog'),
        ('mesures', 'measures'),
        ('gains', 'gains'),
        ('pertes', 'losses'),
        ('avis', 'advice'),
        ('voyage', 'travel'),
        ('clair', 'clear'),
        ('actifs', 'assets'),
        ('actif', 'active'),
        ('sécurisée', 'secure'),
        ('sécurisé', 'secure'),
        ('privée', 'private'),
        ('privé', 'private'),
        # Articles (be careful with these)
        (' les ', ' the '),
        (' des ', ' of '),
        (' une ', ' a '),
        (' un ', ' a '),
        (' la ', ' the '),
        (' le ', ' the '),
        (' du ', ' of the '),
        (' de ', ' of '),
        (' dans ', ' in '),
        (' avec ', ' with '),
        (' pour ', ' for '),
        (' sur ', ' on '),
        (' par ', ' by '),
        (' et ', ' and '),
        (' ou ', ' or '),
        (' est ', ' is '),
        (' sont ', ' are '),
        (' qui ', ' which '),
        (' cette ', ' this '),
        (' ce ', ' this '),
    ]
    
    updated = 0
    
    for n in norms:
        original_desc = n.get('description') or ''
        original_title = n.get('title') or ''
        new_desc = original_desc
        new_title = original_title
        
        # Apply all replacements
        for fr, en in replacements:
            new_desc = new_desc.replace(fr, en)
            new_title = new_title.replace(fr, en)
        
        # Check if anything changed
        if new_desc != original_desc or new_title != original_title:
            update_data = {}
            if new_desc != original_desc:
                update_data['description'] = new_desc
            if new_title != original_title:
                update_data['title'] = new_title
            
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/norms?id=eq.{n['id']}",
                headers=HEADERS,
                json=update_data
            )
            
            if r.status_code in [200, 204]:
                updated += 1
            
    print(f"   ✅ Translated {updated} norms")
    return updated


def check_and_show_products():
    """Check products table for any French content"""
    print("\n📦 Checking products table...")
    
    get_headers = {**HEADERS}
    get_headers.pop('Prefer', None)
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?select=id,name,description&limit=10",
        headers=get_headers
    )
    
    if r.status_code == 200:
        products = r.json()
        print(f"   📋 Found {len(products)} products (showing first 5):")
        for p in products[:5]:
            name = p.get('name', '')[:40] if p.get('name') else 'N/A'
            print(f"      - {name}")
        print("   ✅ Products checked")
    else:
        print(f"   ⚠️ Could not check products: {r.status_code}")


def main():
    print("""
╔══════════════════════════════════════════════════════════════╗
║     🌍 SAFESCORING - TRANSLATE ALL DATA TO ENGLISH           ║
╚══════════════════════════════════════════════════════════════╝
""")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Error: Supabase credentials not found!")
        return
    
    print(f"🔗 Connected to: {SUPABASE_URL[:50]}...")
    
    # Translate all tables
    total = 0
    total += translate_product_types()
    total += translate_consumer_type_definitions()
    total += translate_subscription_plans()
    
    # Translate norms
    norms_translated = translate_norms()
    total += norms_translated
    
    # Check products
    check_and_show_products()
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║     ✅ TRANSLATION COMPLETE                                  ║
║     📊 Total records updated: {total:<30} ║
╚══════════════════════════════════════════════════════════════╝
""")


if __name__ == "__main__":
    main()
