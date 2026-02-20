#!/usr/bin/env python3
"""
Ajout de toutes les normes manquantes pour les produits financiers
Focus: CEX, CUSTODY, LENDING, STAKING, YIELD, BRIDGE, PERP, NFT, PAYMENT, BANK
"""
import requests
import time

from config_helper import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers

headers = get_supabase_headers()

# ============================================================================
# NOUVELLES NORMES POUR PRODUITS FINANCIERS
# ============================================================================

NEW_NORMS = [
    # =========================================================================
    # CEX - EXCHANGE CENTRALISE (20 normes)
    # =========================================================================
    # Security CEX (6)
    {'code': 'S-CEX-COLD', 'pillar': 'S', 'title': 'CEX Cold Storage Ratio', 'description': 'Minimum 95% des fonds clients en cold storage', 'is_essential': True, 'official_link': 'https://www.ccss.info/', 'crypto_relevance': 'Critical - Cold storage prevents hot wallet hacks'},
    {'code': 'S-CEX-HSM', 'pillar': 'S', 'title': 'CEX HSM Key Management', 'description': 'Hardware Security Modules pour la gestion des cles', 'is_essential': True, 'official_link': 'https://csrc.nist.gov/projects/cryptographic-module-validation-program', 'crypto_relevance': 'Critical - HSM protects exchange keys'},
    {'code': 'S-CEX-MULTISIG', 'pillar': 'S', 'title': 'CEX Multisig Withdrawals', 'description': 'Retraits majeurs necessitent signatures multiples', 'is_essential': True, 'official_link': 'https://safe.global/', 'crypto_relevance': 'Critical - Multisig prevents insider theft'},
    {'code': 'S-CEX-PENTEST', 'pillar': 'S', 'title': 'CEX Penetration Testing', 'description': 'Tests de penetration annuels par firme externe', 'is_essential': True, 'official_link': 'https://owasp.org/', 'crypto_relevance': 'High - Identifies security vulnerabilities'},
    {'code': 'S-CEX-WAF', 'pillar': 'S', 'title': 'CEX Web Application Firewall', 'description': 'Protection WAF contre attaques web', 'is_essential': True, 'official_link': 'https://owasp.org/www-project-web-security-testing-guide/', 'crypto_relevance': 'High - WAF blocks common attacks'},
    {'code': 'S-CEX-DDOS', 'pillar': 'S', 'title': 'CEX DDoS Protection', 'description': 'Protection contre attaques DDoS', 'is_essential': True, 'official_link': 'https://www.cloudflare.com/', 'crypto_relevance': 'High - Ensures platform availability'},

    # Anti-coercion CEX (5)
    {'code': 'A-CEX-2FA', 'pillar': 'A', 'title': 'CEX 2FA Mandatory', 'description': 'Authentification 2FA obligatoire pour withdrawals', 'is_essential': True, 'official_link': 'https://pages.nist.gov/800-63-3/sp800-63b.html', 'crypto_relevance': 'Critical - 2FA prevents unauthorized access'},
    {'code': 'A-CEX-WHITELIST', 'pillar': 'A', 'title': 'CEX Address Whitelist', 'description': 'Liste blanche adresses de retrait avec delai', 'is_essential': True, 'official_link': 'https://www.ccss.info/', 'crypto_relevance': 'Critical - Prevents forced withdrawals'},
    {'code': 'A-CEX-DELAY', 'pillar': 'A', 'title': 'CEX Withdrawal Delay', 'description': 'Delai 24-72h pour nouvelles adresses', 'is_essential': True, 'official_link': 'https://www.ccss.info/', 'crypto_relevance': 'High - Time to detect unauthorized access'},
    {'code': 'A-CEX-LIMIT', 'pillar': 'A', 'title': 'CEX Daily Withdrawal Limit', 'description': 'Limites de retrait quotidiennes configurables', 'is_essential': True, 'official_link': 'https://www.ccss.info/', 'crypto_relevance': 'High - Limits damage from compromise'},
    {'code': 'A-CEX-FREEZE', 'pillar': 'A', 'title': 'CEX Account Freeze', 'description': 'Gel de compte sur demande immediate', 'is_essential': True, 'official_link': 'https://www.ccss.info/', 'crypto_relevance': 'Critical - Emergency response capability'},

    # Fiabilite CEX (5)
    {'code': 'F-CEX-POR', 'pillar': 'F', 'title': 'CEX Proof of Reserves', 'description': 'Attestation de reserves verifiable on-chain', 'is_essential': True, 'official_link': 'https://chain.link/proof-of-reserve', 'crypto_relevance': 'Critical - Proves solvency post-FTX'},
    {'code': 'F-CEX-AUDIT', 'pillar': 'F', 'title': 'CEX Financial Audit', 'description': 'Audit financier annuel par Big 4', 'is_essential': True, 'official_link': 'https://www.aicpa.org/', 'crypto_relevance': 'Critical - Financial transparency'},
    {'code': 'F-CEX-LICENSE', 'pillar': 'F', 'title': 'CEX Regulatory License', 'description': 'Licence MiCA, MSB ou equivalent', 'is_essential': True, 'official_link': 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1114', 'crypto_relevance': 'Critical - Legal compliance'},
    {'code': 'F-CEX-INSURANCE', 'pillar': 'F', 'title': 'CEX Insurance Fund', 'description': 'Fonds assurance SAFU pour pertes utilisateurs', 'is_essential': True, 'official_link': 'https://www.binance.com/en/support/faq/safu', 'crypto_relevance': 'High - User protection'},
    {'code': 'F-CEX-SEGREG', 'pillar': 'F', 'title': 'CEX Fund Segregation', 'description': 'Segregation fonds clients vs operationnels', 'is_essential': True, 'official_link': 'https://www.esma.europa.eu/', 'crypto_relevance': 'Critical - Bankruptcy protection'},

    # Ecosysteme CEX (4)
    {'code': 'E-CEX-FIAT', 'pillar': 'E', 'title': 'CEX Fiat Gateway', 'description': 'Support depot/retrait fiat (SEPA, wire, card)', 'is_essential': False, 'official_link': 'https://www.moonpay.com/', 'crypto_relevance': 'Medium - User onboarding'},
    {'code': 'E-CEX-PAIRS', 'pillar': 'E', 'title': 'CEX Trading Pairs', 'description': 'Nombre de paires de trading disponibles', 'is_essential': False, 'official_link': 'https://www.coingecko.com/', 'crypto_relevance': 'Low - Trading options'},
    {'code': 'E-CEX-API', 'pillar': 'E', 'title': 'CEX Trading API', 'description': 'API REST et WebSocket pour trading', 'is_essential': False, 'official_link': 'https://swagger.io/', 'crypto_relevance': 'Medium - Developer access'},
    {'code': 'E-CEX-MOBILE', 'pillar': 'E', 'title': 'CEX Mobile App', 'description': 'Application mobile iOS et Android', 'is_essential': False, 'official_link': 'https://developer.apple.com/', 'crypto_relevance': 'Low - User convenience'},

    # =========================================================================
    # CUSTODY - GARDE INSTITUTIONNELLE (15 normes)
    # =========================================================================
    # Security Custody (5)
    {'code': 'S-CUST-MPC', 'pillar': 'S', 'title': 'Custody MPC Technology', 'description': 'Multi-Party Computation pour gestion cles', 'is_essential': True, 'official_link': 'https://fireblocks.com/', 'crypto_relevance': 'Critical - Eliminates single point of failure'},
    {'code': 'S-CUST-HSM', 'pillar': 'S', 'title': 'Custody HSM Grade', 'description': 'HSM certifie FIPS 140-2 Level 3+', 'is_essential': True, 'official_link': 'https://csrc.nist.gov/projects/cryptographic-module-validation-program', 'crypto_relevance': 'Critical - Tamper-resistant key storage'},
    {'code': 'S-CUST-AIR', 'pillar': 'S', 'title': 'Custody Air-gapped Systems', 'description': 'Systemes de signature isoles du reseau', 'is_essential': True, 'official_link': 'https://www.ccss.info/', 'crypto_relevance': 'Critical - Prevents remote attacks'},
    {'code': 'S-CUST-SOC2', 'pillar': 'S', 'title': 'Custody SOC 2 Type II', 'description': 'Certification SOC 2 Type II annuelle', 'is_essential': True, 'official_link': 'https://www.aicpa.org/resources/landing/soc-2', 'crypto_relevance': 'Critical - Security controls audit'},
    {'code': 'S-CUST-POLICY', 'pillar': 'S', 'title': 'Custody Policy Engine', 'description': 'Moteur de politiques programmables', 'is_essential': True, 'official_link': 'https://fireblocks.com/', 'crypto_relevance': 'High - Automated security rules'},

    # Anti-coercion Custody (4)
    {'code': 'A-CUST-QUORUM', 'pillar': 'A', 'title': 'Custody Quorum Approval', 'description': 'Approbation multi-parties pour transactions', 'is_essential': True, 'official_link': 'https://www.ccss.info/', 'crypto_relevance': 'Critical - Prevents insider theft'},
    {'code': 'A-CUST-TIMELK', 'pillar': 'A', 'title': 'Custody Timelock', 'description': 'Delai obligatoire pour grosses transactions', 'is_essential': True, 'official_link': 'https://www.ccss.info/', 'crypto_relevance': 'High - Time to detect fraud'},
    {'code': 'A-CUST-GEOCONT', 'pillar': 'A', 'title': 'Custody Geographic Controls', 'description': 'Restrictions geographiques des approbateurs', 'is_essential': False, 'official_link': 'https://www.ccss.info/', 'crypto_relevance': 'Medium - Prevents coordinated attack'},
    {'code': 'A-CUST-DURESS', 'pillar': 'A', 'title': 'Custody Duress Protocols', 'description': 'Protocoles en cas de contrainte', 'is_essential': True, 'official_link': 'https://www.ccss.info/', 'crypto_relevance': 'Critical - Coercion protection'},

    # Fiabilite Custody (3)
    {'code': 'F-CUST-INSUR', 'pillar': 'F', 'title': 'Custody Insurance Coverage', 'description': 'Assurance crime et specie crypto', 'is_essential': True, 'official_link': 'https://www.lloyds.com/', 'crypto_relevance': 'Critical - Financial protection'},
    {'code': 'F-CUST-SLA', 'pillar': 'F', 'title': 'Custody SLA Guarantee', 'description': 'SLA avec garanties de disponibilite', 'is_essential': True, 'official_link': 'https://www.ccss.info/', 'crypto_relevance': 'High - Service reliability'},
    {'code': 'F-CUST-REGLIC', 'pillar': 'F', 'title': 'Custody Regulatory Status', 'description': 'Licence de depositaire qualifie', 'is_essential': True, 'official_link': 'https://www.sec.gov/', 'crypto_relevance': 'Critical - Legal compliance'},

    # Ecosysteme Custody (3)
    {'code': 'E-CUST-CHAINS', 'pillar': 'E', 'title': 'Custody Multi-chain Support', 'description': 'Support blockchains multiples', 'is_essential': False, 'official_link': 'https://fireblocks.com/', 'crypto_relevance': 'Medium - Asset coverage'},
    {'code': 'E-CUST-DEFI', 'pillar': 'E', 'title': 'Custody DeFi Access', 'description': 'Acces securise aux protocoles DeFi', 'is_essential': False, 'official_link': 'https://fireblocks.com/', 'crypto_relevance': 'Medium - Yield opportunities'},
    {'code': 'E-CUST-STAKE', 'pillar': 'E', 'title': 'Custody Staking Services', 'description': 'Services de staking institutionnel', 'is_essential': False, 'official_link': 'https://www.coinbase.com/prime', 'crypto_relevance': 'Medium - Yield generation'},

    # =========================================================================
    # LENDING - PROTOCOLE DE PRET (15 normes)
    # =========================================================================
    # Security Lending (5)
    {'code': 'S-LEND-AUDIT', 'pillar': 'S', 'title': 'Lending Protocol Audit', 'description': 'Audit smart contracts par firme reconnue', 'is_essential': True, 'official_link': 'https://consensys.io/diligence/', 'crypto_relevance': 'Critical - Smart contract security'},
    {'code': 'S-LEND-ORACLE', 'pillar': 'S', 'title': 'Lending Oracle Security', 'description': 'Oracles decentralises pour prix (Chainlink)', 'is_essential': True, 'official_link': 'https://chain.link/', 'crypto_relevance': 'Critical - Prevents price manipulation'},
    {'code': 'S-LEND-LIQUI', 'pillar': 'S', 'title': 'Lending Liquidation Mechanism', 'description': 'Mecanisme de liquidation robuste', 'is_essential': True, 'official_link': 'https://docs.aave.com/', 'crypto_relevance': 'Critical - Protocol solvency'},
    {'code': 'S-LEND-COLLAT', 'pillar': 'S', 'title': 'Lending Collateral Ratios', 'description': 'Ratios de collateralisation conservateurs', 'is_essential': True, 'official_link': 'https://docs.compound.finance/', 'crypto_relevance': 'High - Risk management'},
    {'code': 'S-LEND-FLASH', 'pillar': 'S', 'title': 'Lending Flash Loan Protection', 'description': 'Protection contre attaques flash loan', 'is_essential': True, 'official_link': 'https://www.paradigm.xyz/', 'crypto_relevance': 'Critical - Prevents exploit attacks'},

    # Anti-coercion Lending (3)
    {'code': 'A-LEND-LIMIT', 'pillar': 'A', 'title': 'Lending Position Limits', 'description': 'Limites de position maximales', 'is_essential': True, 'official_link': 'https://docs.aave.com/', 'crypto_relevance': 'High - Risk limits'},
    {'code': 'A-LEND-COOL', 'pillar': 'A', 'title': 'Lending Cooldown Period', 'description': 'Periode de refroidissement pour retraits', 'is_essential': False, 'official_link': 'https://docs.aave.com/', 'crypto_relevance': 'Medium - Prevents bank runs'},
    {'code': 'A-LEND-EMERG', 'pillar': 'A', 'title': 'Lending Emergency Shutdown', 'description': 'Mecanisme arret urgence gouverne', 'is_essential': True, 'official_link': 'https://makerdao.com/', 'crypto_relevance': 'Critical - Emergency response'},

    # Fiabilite Lending (4)
    {'code': 'F-LEND-TVL', 'pillar': 'F', 'title': 'Lending TVL Tracking', 'description': 'Suivi TVL temps reel transparent', 'is_essential': True, 'official_link': 'https://defillama.com/', 'crypto_relevance': 'High - Protocol health'},
    {'code': 'F-LEND-UTIL', 'pillar': 'F', 'title': 'Lending Utilization Rate', 'description': 'Monitoring taux utilisation pools', 'is_essential': True, 'official_link': 'https://docs.aave.com/', 'crypto_relevance': 'High - Liquidity management'},
    {'code': 'F-LEND-INSUR', 'pillar': 'F', 'title': 'Lending Insurance Coverage', 'description': 'Couverture assurance DeFi (Nexus)', 'is_essential': False, 'official_link': 'https://nexusmutual.io/', 'crypto_relevance': 'Medium - User protection'},
    {'code': 'F-LEND-GOV', 'pillar': 'F', 'title': 'Lending Governance', 'description': 'Gouvernance decentralisee active', 'is_essential': True, 'official_link': 'https://compound.finance/', 'crypto_relevance': 'High - Protocol evolution'},

    # Ecosysteme Lending (3)
    {'code': 'E-LEND-ASSETS', 'pillar': 'E', 'title': 'Lending Supported Assets', 'description': 'Nombre actifs supportes en collateral', 'is_essential': False, 'official_link': 'https://docs.aave.com/', 'crypto_relevance': 'Medium - Asset variety'},
    {'code': 'E-LEND-CHAINS', 'pillar': 'E', 'title': 'Lending Multi-chain', 'description': 'Deploiement multi-chaines', 'is_essential': False, 'official_link': 'https://docs.aave.com/', 'crypto_relevance': 'Medium - Accessibility'},
    {'code': 'E-LEND-RATES', 'pillar': 'E', 'title': 'Lending Rate Display', 'description': 'Affichage taux APY temps reel', 'is_essential': True, 'official_link': 'https://defillama.com/', 'crypto_relevance': 'High - Transparency'},

    # =========================================================================
    # STAKING - SERVICE DE STAKING (12 normes)
    # =========================================================================
    # Security Staking (4)
    {'code': 'S-STAKE-VALID', 'pillar': 'S', 'title': 'Staking Validator Security', 'description': 'Infrastructure validateur securisee', 'is_essential': True, 'official_link': 'https://ethereum.org/en/staking/', 'crypto_relevance': 'Critical - Validator integrity'},
    {'code': 'S-STAKE-KEY', 'pillar': 'S', 'title': 'Staking Key Management', 'description': 'Gestion cles validateur HSM/MPC', 'is_essential': True, 'official_link': 'https://www.ccss.info/', 'crypto_relevance': 'Critical - Key protection'},
    {'code': 'S-STAKE-SLASH', 'pillar': 'S', 'title': 'Staking Slashing Protection', 'description': 'Protection contre slashing', 'is_essential': True, 'official_link': 'https://ethereum.org/en/staking/', 'crypto_relevance': 'Critical - Capital protection'},
    {'code': 'S-STAKE-REDUND', 'pillar': 'S', 'title': 'Staking Redundancy', 'description': 'Infrastructure redondante multi-region', 'is_essential': True, 'official_link': 'https://www.ccss.info/', 'crypto_relevance': 'High - Uptime guarantee'},

    # Anti-coercion Staking (3)
    {'code': 'A-STAKE-UNSTK', 'pillar': 'A', 'title': 'Staking Unstake Process', 'description': 'Processus de unstaking clair', 'is_essential': True, 'official_link': 'https://ethereum.org/en/staking/', 'crypto_relevance': 'Critical - Exit capability'},
    {'code': 'A-STAKE-DELAY', 'pillar': 'A', 'title': 'Staking Withdrawal Delay', 'description': 'Delai retrait transparent', 'is_essential': True, 'official_link': 'https://ethereum.org/en/staking/', 'crypto_relevance': 'High - Expectation setting'},
    {'code': 'A-STAKE-NOCUST', 'pillar': 'A', 'title': 'Staking Non-custodial Option', 'description': 'Option staking non-custodial', 'is_essential': False, 'official_link': 'https://lido.fi/', 'crypto_relevance': 'High - User control'},

    # Fiabilite Staking (3)
    {'code': 'F-STAKE-UPTIME', 'pillar': 'F', 'title': 'Staking Validator Uptime', 'description': 'Uptime validateur 99.9%+', 'is_essential': True, 'official_link': 'https://rated.network/', 'crypto_relevance': 'Critical - Reward maximization'},
    {'code': 'F-STAKE-PERF', 'pillar': 'F', 'title': 'Staking Performance Tracking', 'description': 'Suivi performance validateur public', 'is_essential': True, 'official_link': 'https://beaconcha.in/', 'crypto_relevance': 'High - Transparency'},
    {'code': 'F-STAKE-FEE', 'pillar': 'F', 'title': 'Staking Fee Transparency', 'description': 'Frais de service transparents', 'is_essential': True, 'official_link': 'https://lido.fi/', 'crypto_relevance': 'High - Cost clarity'},

    # Ecosysteme Staking (2)
    {'code': 'E-STAKE-CHAINS', 'pillar': 'E', 'title': 'Staking Multi-chain', 'description': 'Support staking multi-blockchains', 'is_essential': False, 'official_link': 'https://figment.io/', 'crypto_relevance': 'Medium - Coverage'},
    {'code': 'E-STAKE-REWARDS', 'pillar': 'E', 'title': 'Staking Rewards Dashboard', 'description': 'Dashboard recompenses temps reel', 'is_essential': True, 'official_link': 'https://figment.io/', 'crypto_relevance': 'High - User experience'},

    # =========================================================================
    # LIQUID STAKING (10 normes)
    # =========================================================================
    # Security Liquid Staking (4)
    {'code': 'S-LST-AUDIT', 'pillar': 'S', 'title': 'Liquid Staking Audit', 'description': 'Audit smart contracts complet', 'is_essential': True, 'official_link': 'https://consensys.io/diligence/', 'crypto_relevance': 'Critical - Contract security'},
    {'code': 'S-LST-ORACLE', 'pillar': 'S', 'title': 'Liquid Staking Rate Oracle', 'description': 'Oracle taux de change securise', 'is_essential': True, 'official_link': 'https://chain.link/', 'crypto_relevance': 'Critical - Price integrity'},
    {'code': 'S-LST-VALID', 'pillar': 'S', 'title': 'Liquid Staking Validator Set', 'description': 'Set validateurs diversifie', 'is_essential': True, 'official_link': 'https://lido.fi/', 'crypto_relevance': 'High - Decentralization'},
    {'code': 'S-LST-SLASH', 'pillar': 'S', 'title': 'Liquid Staking Slashing Insurance', 'description': 'Protection contre pertes slashing', 'is_essential': True, 'official_link': 'https://lido.fi/', 'crypto_relevance': 'Critical - User protection'},

    # Anti-coercion Liquid Staking (2)
    {'code': 'A-LST-REDEEM', 'pillar': 'A', 'title': 'Liquid Staking Redemption', 'description': 'Processus redemption clair', 'is_essential': True, 'official_link': 'https://lido.fi/', 'crypto_relevance': 'Critical - Exit capability'},
    {'code': 'A-LST-QUEUE', 'pillar': 'A', 'title': 'Liquid Staking Queue Time', 'description': 'Delai file attente transparent', 'is_essential': True, 'official_link': 'https://lido.fi/', 'crypto_relevance': 'High - Expectation setting'},

    # Fiabilite Liquid Staking (2)
    {'code': 'F-LST-PEG', 'pillar': 'F', 'title': 'Liquid Staking Peg Stability', 'description': 'Stabilite peg token/underlying', 'is_essential': True, 'official_link': 'https://defillama.com/', 'crypto_relevance': 'Critical - Value preservation'},
    {'code': 'F-LST-TVL', 'pillar': 'F', 'title': 'Liquid Staking TVL', 'description': 'Suivi TVL et concentration', 'is_essential': True, 'official_link': 'https://defillama.com/', 'crypto_relevance': 'High - Market share'},

    # Ecosysteme Liquid Staking (2)
    {'code': 'E-LST-DEFI', 'pillar': 'E', 'title': 'Liquid Staking DeFi Integration', 'description': 'Integration protocoles DeFi majeurs', 'is_essential': False, 'official_link': 'https://lido.fi/', 'crypto_relevance': 'High - Utility'},
    {'code': 'E-LST-REWARD', 'pillar': 'E', 'title': 'Liquid Staking APY Display', 'description': 'Affichage APY temps reel', 'is_essential': True, 'official_link': 'https://lido.fi/', 'crypto_relevance': 'High - Transparency'},

    # =========================================================================
    # YIELD AGGREGATOR (12 normes)
    # =========================================================================
    # Security Yield (4)
    {'code': 'S-YIELD-AUDIT', 'pillar': 'S', 'title': 'Yield Aggregator Audit', 'description': 'Audit strategies et vaults', 'is_essential': True, 'official_link': 'https://consensys.io/diligence/', 'crypto_relevance': 'Critical - Strategy security'},
    {'code': 'S-YIELD-STRAT', 'pillar': 'S', 'title': 'Yield Strategy Review', 'description': 'Review securite nouvelles strategies', 'is_essential': True, 'official_link': 'https://yearn.finance/', 'crypto_relevance': 'Critical - Strategy vetting'},
    {'code': 'S-YIELD-LIMIT', 'pillar': 'S', 'title': 'Yield Deposit Limits', 'description': 'Limites depot par vault', 'is_essential': True, 'official_link': 'https://yearn.finance/', 'crypto_relevance': 'High - Risk management'},
    {'code': 'S-YIELD-ORACLE', 'pillar': 'S', 'title': 'Yield Price Oracles', 'description': 'Oracles prix decentralises', 'is_essential': True, 'official_link': 'https://chain.link/', 'crypto_relevance': 'Critical - Price accuracy'},

    # Anti-coercion Yield (3)
    {'code': 'A-YIELD-EXIT', 'pillar': 'A', 'title': 'Yield Emergency Exit', 'description': 'Sortie urgence utilisateur', 'is_essential': True, 'official_link': 'https://yearn.finance/', 'crypto_relevance': 'Critical - User control'},
    {'code': 'A-YIELD-LOCK', 'pillar': 'A', 'title': 'Yield Lock Period', 'description': 'Periode verrouillage transparente', 'is_essential': True, 'official_link': 'https://yearn.finance/', 'crypto_relevance': 'High - Expectation setting'},
    {'code': 'A-YIELD-FEE', 'pillar': 'A', 'title': 'Yield Fee Disclosure', 'description': 'Divulgation complete des frais', 'is_essential': True, 'official_link': 'https://yearn.finance/', 'crypto_relevance': 'High - Cost transparency'},

    # Fiabilite Yield (3)
    {'code': 'F-YIELD-APY', 'pillar': 'F', 'title': 'Yield APY Accuracy', 'description': 'APY affiche vs realise', 'is_essential': True, 'official_link': 'https://defillama.com/', 'crypto_relevance': 'High - Transparency'},
    {'code': 'F-YIELD-HIST', 'pillar': 'F', 'title': 'Yield Historical Performance', 'description': 'Historique performance vaults', 'is_essential': True, 'official_link': 'https://yearn.watch/', 'crypto_relevance': 'High - Track record'},
    {'code': 'F-YIELD-TVL', 'pillar': 'F', 'title': 'Yield TVL Tracking', 'description': 'Suivi TVL par strategie', 'is_essential': True, 'official_link': 'https://defillama.com/', 'crypto_relevance': 'High - Protocol health'},

    # Ecosysteme Yield (2)
    {'code': 'E-YIELD-VAULT', 'pillar': 'E', 'title': 'Yield Vault Variety', 'description': 'Variete vaults disponibles', 'is_essential': False, 'official_link': 'https://yearn.finance/', 'crypto_relevance': 'Medium - Options'},
    {'code': 'E-YIELD-ZAPS', 'pillar': 'E', 'title': 'Yield Zap Integration', 'description': 'Depot simplifie via zaps', 'is_essential': False, 'official_link': 'https://yearn.finance/', 'crypto_relevance': 'Medium - UX'},

    # =========================================================================
    # PERP DEX - FUTURES DECENTRALISES (12 normes)
    # =========================================================================
    # Security Perp (4)
    {'code': 'S-PERP-AUDIT', 'pillar': 'S', 'title': 'Perp DEX Audit', 'description': 'Audit smart contracts perpetuels', 'is_essential': True, 'official_link': 'https://consensys.io/diligence/', 'crypto_relevance': 'Critical - Contract security'},
    {'code': 'S-PERP-ORACLE', 'pillar': 'S', 'title': 'Perp DEX Price Oracle', 'description': 'Oracle prix pour mark price', 'is_essential': True, 'official_link': 'https://pyth.network/', 'crypto_relevance': 'Critical - Fair liquidation'},
    {'code': 'S-PERP-ENGINE', 'pillar': 'S', 'title': 'Perp DEX Matching Engine', 'description': 'Moteur matching robuste', 'is_essential': True, 'official_link': 'https://www.dydx.exchange/', 'crypto_relevance': 'Critical - Trade execution'},
    {'code': 'S-PERP-LIQUI', 'pillar': 'S', 'title': 'Perp DEX Liquidation', 'description': 'Systeme liquidation equitable', 'is_essential': True, 'official_link': 'https://www.dydx.exchange/', 'crypto_relevance': 'Critical - Protocol solvency'},

    # Anti-coercion Perp (3)
    {'code': 'A-PERP-MARGIN', 'pillar': 'A', 'title': 'Perp DEX Margin Requirements', 'description': 'Exigences marge transparentes', 'is_essential': True, 'official_link': 'https://www.dydx.exchange/', 'crypto_relevance': 'High - Risk disclosure'},
    {'code': 'A-PERP-LEVER', 'pillar': 'A', 'title': 'Perp DEX Max Leverage', 'description': 'Leverage maximum par marche', 'is_essential': True, 'official_link': 'https://www.dydx.exchange/', 'crypto_relevance': 'High - Risk limits'},
    {'code': 'A-PERP-STOP', 'pillar': 'A', 'title': 'Perp DEX Stop Orders', 'description': 'Ordres stop-loss disponibles', 'is_essential': True, 'official_link': 'https://www.dydx.exchange/', 'crypto_relevance': 'High - Risk management'},

    # Fiabilite Perp (3)
    {'code': 'F-PERP-FUND', 'pillar': 'F', 'title': 'Perp DEX Funding Rate', 'description': 'Funding rate transparent temps reel', 'is_essential': True, 'official_link': 'https://www.dydx.exchange/', 'crypto_relevance': 'High - Cost transparency'},
    {'code': 'F-PERP-OI', 'pillar': 'F', 'title': 'Perp DEX Open Interest', 'description': 'Open interest par marche', 'is_essential': True, 'official_link': 'https://www.dydx.exchange/', 'crypto_relevance': 'High - Market health'},
    {'code': 'F-PERP-INSUR', 'pillar': 'F', 'title': 'Perp DEX Insurance Fund', 'description': 'Fonds assurance liquidations', 'is_essential': True, 'official_link': 'https://www.dydx.exchange/', 'crypto_relevance': 'Critical - ADL protection'},

    # Ecosysteme Perp (2)
    {'code': 'E-PERP-PAIRS', 'pillar': 'E', 'title': 'Perp DEX Trading Pairs', 'description': 'Paires perpetuels disponibles', 'is_essential': False, 'official_link': 'https://www.dydx.exchange/', 'crypto_relevance': 'Medium - Market coverage'},
    {'code': 'E-PERP-API', 'pillar': 'E', 'title': 'Perp DEX Trading API', 'description': 'API trading programmatique', 'is_essential': False, 'official_link': 'https://www.dydx.exchange/', 'crypto_relevance': 'Medium - Developer access'},

    # =========================================================================
    # NFT MARKETPLACE (10 normes)
    # =========================================================================
    # Security NFT (3)
    {'code': 'S-NFT-AUDIT', 'pillar': 'S', 'title': 'NFT Marketplace Audit', 'description': 'Audit smart contracts marketplace', 'is_essential': True, 'official_link': 'https://consensys.io/diligence/', 'crypto_relevance': 'Critical - Contract security'},
    {'code': 'S-NFT-ROYALTY', 'pillar': 'S', 'title': 'NFT Royalty Enforcement', 'description': 'Enforcement royalties on-chain', 'is_essential': True, 'official_link': 'https://eips.ethereum.org/EIPS/eip-2981', 'crypto_relevance': 'High - Creator protection'},
    {'code': 'S-NFT-VERIFY', 'pillar': 'S', 'title': 'NFT Collection Verification', 'description': 'Verification collections officielles', 'is_essential': True, 'official_link': 'https://opensea.io/', 'crypto_relevance': 'Critical - Fraud prevention'},

    # Anti-coercion NFT (3)
    {'code': 'A-NFT-ESCROW', 'pillar': 'A', 'title': 'NFT Trade Escrow', 'description': 'Escrow atomique pour trades', 'is_essential': True, 'official_link': 'https://opensea.io/', 'crypto_relevance': 'Critical - Trade safety'},
    {'code': 'A-NFT-FRAUD', 'pillar': 'A', 'title': 'NFT Fraud Detection', 'description': 'Detection et signalement arnaques', 'is_essential': True, 'official_link': 'https://opensea.io/', 'crypto_relevance': 'High - User protection'},
    {'code': 'A-NFT-CANCEL', 'pillar': 'A', 'title': 'NFT Listing Cancellation', 'description': 'Annulation listing gratuite', 'is_essential': True, 'official_link': 'https://opensea.io/', 'crypto_relevance': 'High - User control'},

    # Fiabilite NFT (2)
    {'code': 'F-NFT-META', 'pillar': 'F', 'title': 'NFT Metadata Preservation', 'description': 'Preservation metadata IPFS/Arweave', 'is_essential': True, 'official_link': 'https://ipfs.io/', 'crypto_relevance': 'Critical - Asset permanence'},
    {'code': 'F-NFT-FEE', 'pillar': 'F', 'title': 'NFT Fee Transparency', 'description': 'Frais marketplace transparents', 'is_essential': True, 'official_link': 'https://opensea.io/', 'crypto_relevance': 'High - Cost clarity'},

    # Ecosysteme NFT (2)
    {'code': 'E-NFT-CHAINS', 'pillar': 'E', 'title': 'NFT Multi-chain Support', 'description': 'Support blockchains multiples', 'is_essential': False, 'official_link': 'https://opensea.io/', 'crypto_relevance': 'Medium - Accessibility'},
    {'code': 'E-NFT-RARITY', 'pillar': 'E', 'title': 'NFT Rarity Tools', 'description': 'Outils analyse rarete integres', 'is_essential': False, 'official_link': 'https://raritytools.io/', 'crypto_relevance': 'Low - User convenience'},

    # =========================================================================
    # PAYMENT GATEWAY (10 normes)
    # =========================================================================
    # Security Payment (3)
    {'code': 'S-PAY-PCI', 'pillar': 'S', 'title': 'Payment PCI DSS', 'description': 'Conformite PCI DSS pour cartes', 'is_essential': True, 'official_link': 'https://www.pcisecuritystandards.org/', 'crypto_relevance': 'Critical - Card security'},
    {'code': 'S-PAY-ENCRYPT', 'pillar': 'S', 'title': 'Payment Data Encryption', 'description': 'Chiffrement donnees paiement E2E', 'is_essential': True, 'official_link': 'https://www.pcisecuritystandards.org/', 'crypto_relevance': 'Critical - Data protection'},
    {'code': 'S-PAY-FRAUD', 'pillar': 'S', 'title': 'Payment Fraud Detection', 'description': 'Detection fraude temps reel', 'is_essential': True, 'official_link': 'https://stripe.com/', 'crypto_relevance': 'Critical - Loss prevention'},

    # Anti-coercion Payment (2)
    {'code': 'A-PAY-DISPUTE', 'pillar': 'A', 'title': 'Payment Dispute Process', 'description': 'Processus contestation paiement', 'is_essential': True, 'official_link': 'https://stripe.com/', 'crypto_relevance': 'High - Consumer protection'},
    {'code': 'A-PAY-REFUND', 'pillar': 'A', 'title': 'Payment Refund Policy', 'description': 'Politique remboursement claire', 'is_essential': True, 'official_link': 'https://stripe.com/', 'crypto_relevance': 'High - User rights'},

    # Fiabilite Payment (2)
    {'code': 'F-PAY-UPTIME', 'pillar': 'F', 'title': 'Payment Gateway Uptime', 'description': 'SLA disponibilite 99.99%', 'is_essential': True, 'official_link': 'https://stripe.com/', 'crypto_relevance': 'Critical - Service reliability'},
    {'code': 'F-PAY-LICENSE', 'pillar': 'F', 'title': 'Payment EMI License', 'description': 'Licence EMI ou PSP', 'is_essential': True, 'official_link': 'https://www.eba.europa.eu/', 'crypto_relevance': 'Critical - Regulatory compliance'},

    # Ecosysteme Payment (3)
    {'code': 'E-PAY-METHODS', 'pillar': 'E', 'title': 'Payment Methods Supported', 'description': 'Methodes paiement supportees', 'is_essential': False, 'official_link': 'https://stripe.com/', 'crypto_relevance': 'Medium - User convenience'},
    {'code': 'E-PAY-CRYPTO', 'pillar': 'E', 'title': 'Payment Crypto Support', 'description': 'Paiement crypto natif', 'is_essential': True, 'official_link': 'https://commerce.coinbase.com/', 'crypto_relevance': 'High - Crypto native'},
    {'code': 'E-PAY-FIAT', 'pillar': 'E', 'title': 'Payment Fiat Conversion', 'description': 'Conversion fiat automatique', 'is_essential': False, 'official_link': 'https://www.bitpay.com/', 'crypto_relevance': 'Medium - Merchant convenience'},

    # =========================================================================
    # CRYPTO BANK / NEO-BANK (12 normes)
    # =========================================================================
    # Security Bank (4)
    {'code': 'S-BANK-LICENSE', 'pillar': 'S', 'title': 'Crypto Bank License', 'description': 'Licence bancaire ou EMI', 'is_essential': True, 'official_link': 'https://www.eba.europa.eu/', 'crypto_relevance': 'Critical - Legal operation'},
    {'code': 'S-BANK-SEGR', 'pillar': 'S', 'title': 'Crypto Bank Segregation', 'description': 'Segregation fonds clients', 'is_essential': True, 'official_link': 'https://www.eba.europa.eu/', 'crypto_relevance': 'Critical - Fund protection'},
    {'code': 'S-BANK-AML', 'pillar': 'S', 'title': 'Crypto Bank AML/KYC', 'description': 'Conformite AML/KYC complete', 'is_essential': True, 'official_link': 'https://www.fatf-gafi.org/', 'crypto_relevance': 'Critical - Regulatory compliance'},
    {'code': 'S-BANK-CUSTODY', 'pillar': 'S', 'title': 'Crypto Bank Custody', 'description': 'Garde crypto securisee', 'is_essential': True, 'official_link': 'https://www.ccss.info/', 'crypto_relevance': 'Critical - Asset security'},

    # Anti-coercion Bank (3)
    {'code': 'A-BANK-ACCESS', 'pillar': 'A', 'title': 'Crypto Bank Account Access', 'description': 'Acces compte 24/7', 'is_essential': True, 'official_link': 'https://www.eba.europa.eu/', 'crypto_relevance': 'High - User access'},
    {'code': 'A-BANK-FREEZE', 'pillar': 'A', 'title': 'Crypto Bank Freeze Policy', 'description': 'Politique gel compte transparente', 'is_essential': True, 'official_link': 'https://www.eba.europa.eu/', 'crypto_relevance': 'High - User rights'},
    {'code': 'A-BANK-TRANS', 'pillar': 'A', 'title': 'Crypto Bank Transfer Limits', 'description': 'Limites transfert configurables', 'is_essential': True, 'official_link': 'https://www.eba.europa.eu/', 'crypto_relevance': 'Medium - Risk management'},

    # Fiabilite Bank (3)
    {'code': 'F-BANK-AUDIT', 'pillar': 'F', 'title': 'Crypto Bank Audit', 'description': 'Audit financier annuel', 'is_essential': True, 'official_link': 'https://www.aicpa.org/', 'crypto_relevance': 'Critical - Financial transparency'},
    {'code': 'F-BANK-DEPOSIT', 'pillar': 'F', 'title': 'Crypto Bank Deposit Protection', 'description': 'Protection depots (FSCS equivalent)', 'is_essential': True, 'official_link': 'https://www.fscs.org.uk/', 'crypto_relevance': 'Critical - User protection'},
    {'code': 'F-BANK-RESERVE', 'pillar': 'F', 'title': 'Crypto Bank Reserve Ratio', 'description': 'Ratio reserves reglementaire', 'is_essential': True, 'official_link': 'https://www.eba.europa.eu/', 'crypto_relevance': 'Critical - Solvency'},

    # Ecosysteme Bank (2)
    {'code': 'E-BANK-IBAN', 'pillar': 'E', 'title': 'Crypto Bank IBAN', 'description': 'IBAN personnel client', 'is_essential': True, 'official_link': 'https://www.ecb.europa.eu/', 'crypto_relevance': 'High - Banking integration'},
    {'code': 'E-BANK-CARD', 'pillar': 'E', 'title': 'Crypto Bank Debit Card', 'description': 'Carte debit crypto', 'is_essential': False, 'official_link': 'https://www.visa.com/', 'crypto_relevance': 'Medium - Spending capability'},
]

def check_duplicate(code):
    """Check if norm already exists"""
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/norms?code=eq.{code}',
        headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
    )
    return len(resp.json()) > 0 if resp.status_code == 200 else False

def main():
    print('=' * 80)
    print('AJOUT DES NORMES POUR PRODUITS FINANCIERS')
    print(f'Total normes a ajouter: {len(NEW_NORMS)}')
    print('=' * 80)

    added = 0
    skipped = 0
    errors = 0

    for norm in NEW_NORMS:
        code = norm['code']

        # Check if exists
        if check_duplicate(code):
            print(f'[SKIP] {code} existe deja')
            skipped += 1
            continue

        # Prepare full norm data
        full_norm = {
            'code': code,
            'pillar': norm['pillar'],
            'title': norm['title'],
            'description': norm['description'],
            'is_essential': norm.get('is_essential', True),
            'consumer': True,
            'full': True,
            'classification_method': 'manual',
            'classification_date': '2026-01-12',
            'geographic_scope': 'global',
            'scope_type': 'technical',
            'access_type': 'G',
            'official_link': norm.get('official_link', 'https://www.ccss.info/'),
            'crypto_relevance': norm.get('crypto_relevance', f'High - {norm["title"]}'),
            'official_doc_summary': norm['description'],
            'issuing_authority': 'Industry Best Practice',
            'standard_reference': norm['title']
        }

        # Insert
        resp = requests.post(
            f'{SUPABASE_URL}/rest/v1/norms',
            headers=headers,
            json=full_norm
        )

        if resp.status_code in [200, 201]:
            print(f'[OK] {code}: {norm["title"][:40]}')
            added += 1
        else:
            print(f'[ERR] {code}: {resp.status_code} - {resp.text[:50]}')
            errors += 1

        # Rate limiting
        if added % 20 == 0:
            time.sleep(0.2)

    print()
    print('=' * 80)
    print(f'RESULTAT: {added} ajoutees, {skipped} existantes, {errors} erreurs')
    print(f'Total normes prevues: {len(NEW_NORMS)}')

if __name__ == '__main__':
    main()
