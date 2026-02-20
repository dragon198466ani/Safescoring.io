#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAFESCORING - Generate Product x Product Compatibility with SAFE Scores
========================================================================
Generates product compatibility with nuanced SAFE pillar analysis:
- S (Security): Security considerations when using products together
- A (Adversity): Risk exposure and recovery scenarios
- F (Fidelity): Reliability and trust factors
- E (Efficiency): Transaction costs and performance

Run: python scripts/generate_product_compat_safe.py [--limit N]
"""

import os
import sys
import requests
import time
from datetime import datetime
from typing import Dict, List, Optional

# Fix Windows console encoding for special characters
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.core.config import SUPABASE_URL, get_supabase_headers


class ProductCompatibilitySAFE:
    """Generate product compatibility with SAFE pillar analysis"""

    # Type code categories
    WALLET_HW = {'HW Cold'}
    WALLET_SW = {'SW Browser', 'SW Mobile', 'SW Desktop', 'Smart Wallet', 'MPC Wallet', 'MultiSig'}
    WALLET_ALL = WALLET_HW | WALLET_SW
    DEFI = {'DEX', 'DEX Agg', 'AMM', 'Lending', 'Yield', 'Derivatives', 'Liq Staking', 'DeFi Tools', 'Bridges'}
    BACKUP = {'Bkp Physical', 'Bkp Digital'}
    EXCHANGE = {'CEX'}

    def __init__(self):
        self.headers = get_supabase_headers()
        self.products = []
        self.product_types = {}
        self.product_type_mapping = {}
        self.type_compatibility = {}
        self.existing = set()
        self.stats = {'created': 0, 'errors': 0}

    def load_data(self):
        """Load data from Supabase"""
        print("[LOAD] Loading data...")

        # Load ALL products with pagination (Supabase default limit is 1000)
        self.products = []
        offset = 0
        batch_size = 1000
        while True:
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug,url,type_id,description&offset={offset}&limit={batch_size}",
                headers=self.headers
            )
            if r.status_code != 200:
                break
            batch = r.json()
            if not batch:
                break
            self.products.extend(batch)
            offset += batch_size
            if len(batch) < batch_size:
                break
        print(f"   {len(self.products)} products (all pages loaded)")

        r = requests.get(f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,category", headers=self.headers)
        self.product_types = {t['id']: t for t in r.json()} if r.status_code == 200 else {}

        r = requests.get(f"{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id", headers=self.headers)
        if r.status_code == 200:
            for m in r.json():
                if m['product_id'] not in self.product_type_mapping:
                    self.product_type_mapping[m['product_id']] = []
                self.product_type_mapping[m['product_id']].append(m['type_id'])

        for p in self.products:
            if p['id'] not in self.product_type_mapping and p.get('type_id'):
                self.product_type_mapping[p['id']] = [p['type_id']]

        r = requests.get(f"{SUPABASE_URL}/rest/v1/type_compatibility?select=*", headers=self.headers)
        if r.status_code == 200:
            for tc in r.json():
                self.type_compatibility[(tc['type_a_id'], tc['type_b_id'])] = tc
                self.type_compatibility[(tc['type_b_id'], tc['type_a_id'])] = tc

        # Load ALL existing compatibilities with pagination
        offset = 0
        while True:
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/product_compatibility?select=product_a_id,product_b_id&offset={offset}&limit={batch_size}",
                headers=self.headers
            )
            if r.status_code != 200:
                break
            batch = r.json()
            if not batch:
                break
            for pc in batch:
                self.existing.add((pc['product_a_id'], pc['product_b_id']))
                self.existing.add((pc['product_b_id'], pc['product_a_id']))
            offset += batch_size
            if len(batch) < batch_size:
                break
        print(f"   {len(self.existing)//2} existing compatibilities")

    def get_type_codes(self, product: Dict) -> set:
        """Get type codes for a product"""
        type_ids = self.product_type_mapping.get(product['id'], [])
        return {self.product_types.get(tid, {}).get('code', '') for tid in type_ids}

    def get_type_compat(self, codes_a: set, codes_b: set) -> Optional[Dict]:
        """Get best type compatibility"""
        for ta_id, ta in self.product_types.items():
            if ta.get('code') in codes_a:
                for tb_id, tb in self.product_types.items():
                    if tb.get('code') in codes_b:
                        tc = self.type_compatibility.get((ta_id, tb_id))
                        if tc:
                            return tc
        return None

    def get_product_context(self, p: Dict) -> Dict:
        """Extract useful context from product data for specific advice"""
        price = p.get('price_details') or {}
        social = p.get('social_links') or {}

        # Get SAFE scores from v_products_with_scores
        safe_scores = self.get_safe_scores(p['id'])

        return {
            'name': p.get('name', '?'),
            'url': p.get('url', ''),
            'github': p.get('github_repo') or social.get('github', ''),
            'twitter': social.get('twitter', ''),
            'custody': price.get('custody', 'Unknown'),
            'kyc': price.get('kyc', 'Unknown'),
            'brand': price.get('brand', p.get('name', '')),
            'description': p.get('description', '')[:200] if p.get('description') else '',
            'score_s': safe_scores.get('pilier_s', 0),
            'score_a': safe_scores.get('pilier_a', 0),
            'score_f': safe_scores.get('pilier_f', 0),
            'score_e': safe_scores.get('pilier_e', 0),
            'note_finale': safe_scores.get('note_finale', 0)
        }

    def get_safe_scores(self, product_id: int) -> Dict:
        """Get SAFE pillar scores for a product from v_products_with_scores"""
        try:
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/v_products_with_scores?product_id=eq.{product_id}&select=pilier_s,pilier_a,pilier_f,pilier_e,note_finale",
                headers=self.headers
            )
            if r.status_code == 200 and r.json():
                return r.json()[0]
        except:
            pass
        return {'pilier_s': 0, 'pilier_a': 0, 'pilier_f': 0, 'pilier_e': 0, 'note_finale': 0}

    def analyze_safe_compatibility(self, pa: Dict, pb: Dict) -> Dict:
        """Generate SAFE-nuanced compatibility analysis with specific product context"""
        codes_a = self.get_type_codes(pa)
        codes_b = self.get_type_codes(pb)
        name_a = pa['name']
        name_b = pb['name']

        # Get product context for specific advice
        ctx_a = self.get_product_context(pa)
        ctx_b = self.get_product_context(pb)

        # Get type compatibility baseline
        tc = self.get_type_compat(codes_a, codes_b)
        type_level = tc.get('compatibility_level', 'partial') if tc else 'partial'

        # ============================================
        # HARDWARE WALLET + SOFTWARE WALLET
        # ============================================
        if (codes_a & self.WALLET_HW and codes_b & self.WALLET_SW) or \
           (codes_b & self.WALLET_HW and codes_a & self.WALLET_SW):
            hw = pa if codes_a & self.WALLET_HW else pb
            sw = pb if codes_a & self.WALLET_HW else pa
            ctx_hw = ctx_a if codes_a & self.WALLET_HW else ctx_b
            ctx_sw = ctx_b if codes_a & self.WALLET_HW else ctx_a

            # Calculate combined scores from product data (average on 0-100 scale)
            score_s = int((ctx_hw.get('score_s', 0) + ctx_sw.get('score_s', 0)) / 2) if ctx_hw.get('score_s') or ctx_sw.get('score_s') else 90
            score_a = int((ctx_hw.get('score_a', 0) + ctx_sw.get('score_a', 0)) / 2) if ctx_hw.get('score_a') or ctx_sw.get('score_a') else 80
            score_f = int((ctx_hw.get('score_f', 0) + ctx_sw.get('score_f', 0)) / 2) if ctx_hw.get('score_f') or ctx_sw.get('score_f') else 80
            score_e = int((ctx_hw.get('score_e', 0) + ctx_sw.get('score_e', 0)) / 2) if ctx_hw.get('score_e') or ctx_sw.get('score_e') else 70

            # Conditional warnings based on scores
            warning_s_extra = f' ATTENTION: {sw["name"]} a un score securite de {int(ctx_sw.get("score_s", 0))}/100.' if ctx_sw.get('score_s', 0) > 0 and ctx_sw.get('score_s', 0) < 60 else ''
            warning_a_extra = f' {hw["name"]} score adversite: {int(ctx_hw.get("score_a", 0))}/100.' if ctx_hw.get('score_a', 0) > 0 else ''

            steps = [
                f'1. Ensure {hw["name"]} has latest firmware installed',
                f'2. Install {sw["name"]} browser extension or mobile app',
                f'3. In {sw["name"]}, navigate to Settings > Connect Hardware Wallet',
                f'4. Select {hw["name"]} from the list of supported devices',
                f'5. Choose connection method (USB/Bluetooth/QR)',
                f'6. Approve the connection request on {hw["name"]} screen',
                f'7. Select which accounts to import',
                f'8. Verify imported addresses match those on {hw["name"]}'
            ]

            return {
                'type_compatible': True,
                'ai_compatible': True,
                'ai_confidence': 0.90,
                'ai_confidence_factors': '+hardware_security +software_interface +native_integration +industry_standard',
                'ai_method': f'Connect {hw["name"]} to {sw["name"]} via USB, Bluetooth, or QR codes for secure transaction signing',
                'ai_steps': ' '.join(steps),
                'ai_limitations': 'Connection method varies by device; Check supported chains; Some features may require specific firmware versions',
                'ai_justification': f'You can securely connect {hw["name"]} to {sw["name"]} for enhanced security. Your private keys stay on the hardware device while you benefit from the software wallet interface for DeFi and dApps.',
                'security_level': 'HIGH',
                'safe_warning_s': f'SECURITE ({score_s}/100) - SITUATION: Vous signez une transaction sur {sw["name"]} avec votre {hw["name"]} mais ladresse affichee sur {hw["name"]} ne correspond pas a celle sur {sw["name"]}. CAS EXTREME: Votre {hw["name"]} est piege et envoie vos cryptos a un hacker. SOLUTION: 1) STOP - ne signez PAS 2) Reinitialiser {hw["name"]} et generer un NOUVEAU seed 3) Pour eviter: achetez uniquement sur {ctx_hw.get("url", "site officiel")}, verifiez le sceau.{warning_s_extra}',
                'safe_warning_a': f'ADVERSITE ({score_a}/100) - SITUATION: Vous avez {hw["name"]} connecte a {sw["name"]} quand quelquun vous agresse pour transferer vos cryptos. CAS EXTREME: On vous menace physiquement. SOLUTION: 1) Donnez le code du wallet LEURRE (100-200 EUR visible sur {sw["name"]}) 2) Vos vrais fonds sont caches avec passphrase (25eme mot) - invisibles meme sous contrainte 3) 3 mauvais PIN = {hw["name"]} sefface 4) Pour eviter: ne parlez JAMAIS de crypto.{warning_a_extra}',
                'safe_warning_f': f'FIABILITE ({score_f}/100) - SITUATION: Votre {hw["name"]} tombe en panne et {sw["name"]} ne peut plus signer vos transactions. CAS EXTREME: Vous navez plus acces a vos cryptos. SOLUTION: 1) Recuperez vos 24 mots 2) Achetez nimporte quel wallet BIP39 (Trezor, Ledger...) 3) Restaurez = tout revient 4) Pour eviter: gravez seed sur metal, testez restauration MAINTENANT.',
                'safe_warning_e': f'EFFICACITE ({score_e}/100) - SITUATION: Vous envoyez des cryptos depuis {sw["name"]} en signant avec {hw["name"]}. OPTIMISATION: 1) USB = plus rapide que Bluetooth 2) Groupez plusieurs envois en une session 3) Transactez a 3h du matin = frais -50% 4) {len(steps)} etapes au setup, puis 2 clics par tx.',
                'steps_count': len(steps),
                'compatibility_steps': steps
            }

        # ============================================
        # HARDWARE WALLET + DEFI PROTOCOL
        # ============================================
        if (codes_a & self.WALLET_HW and codes_b & self.DEFI) or \
           (codes_b & self.WALLET_HW and codes_a & self.DEFI):
            hw = pa if codes_a & self.WALLET_HW else pb
            defi = pb if codes_a & self.WALLET_HW else pa
            ctx_hw = ctx_a if codes_a & self.WALLET_HW else ctx_b
            ctx_defi = ctx_b if codes_a & self.WALLET_HW else ctx_a

            # Calculate combined scores from product data (average on 0-100 scale)
            score_s = int((ctx_hw.get('score_s', 0) + ctx_defi.get('score_s', 0)) / 2) if ctx_hw.get('score_s') or ctx_defi.get('score_s') else 80
            score_a = int((ctx_hw.get('score_a', 0) + ctx_defi.get('score_a', 0)) / 2) if ctx_hw.get('score_a') or ctx_defi.get('score_a') else 60
            score_f = int((ctx_hw.get('score_f', 0) + ctx_defi.get('score_f', 0)) / 2) if ctx_hw.get('score_f') or ctx_defi.get('score_f') else 50
            score_e = int((ctx_hw.get('score_e', 0) + ctx_defi.get('score_e', 0)) / 2) if ctx_hw.get('score_e') or ctx_defi.get('score_e') else 60

            # Conditional warnings based on scores
            warning_f_extra = f' ATTENTION: {defi["name"]} a un score fiabilite de {int(ctx_defi.get("score_f", 0))}/100.' if ctx_defi.get('score_f', 0) > 0 and ctx_defi.get('score_f', 0) < 50 else ''

            steps = [
                f'1. Connect {hw["name"]} to MetaMask or Rabby wallet',
                f'2. Verify you are on official {defi["name"]} URL (check SSL)',
                f'3. Click "Connect Wallet" on {defi["name"]}',
                f'4. Approve wallet connection request',
                f'5. Review transaction details carefully before signing',
                f'6. Verify contract address on {hw["name"]} screen',
                f'7. Sign transaction on {hw["name"]}',
                f'8. Wait for blockchain confirmation'
            ]

            return {
                'type_compatible': True,
                'ai_compatible': True,
                'ai_confidence': 0.85,
                'ai_confidence_factors': '+hardware_security +defi_access +via_software_wallet +smart_contract_interaction',
                'ai_method': f'Connect {hw["name"]} to MetaMask/Rabby, then access {defi["name"]} with hardware-secured signing',
                'ai_steps': ' '.join(steps),
                'ai_limitations': 'Requires software wallet as interface; Each transaction needs hardware approval; Check supported networks',
                'ai_justification': f'You can use {defi["name"]} with maximum security by signing all transactions on your {hw["name"]}. Smart contract interactions are verified on your device screen.',
                'security_level': 'HIGH',
                'safe_warning_s': f'SECURITE ({score_s}/100) - SITUATION: Vous deposez des fonds sur {defi["name"]} en signant avec {hw["name"]} et vous voyez une demande dautorisation "unlimited" (illimitee). CAS EXTREME: Vous approuvez et un hacker vide votre wallet plus tard. SOLUTION: 1) Allez sur revoke.cash et revoquez TOUTES les autorisations 2) Transferez vers nouvelle adresse 3) Pour eviter: mettez {ctx_defi.get("url", defi["name"])} en favori, jamais dapproval unlimited.',
                'safe_warning_a': f'ADVERSITE ({score_a}/100) - SITUATION: Vous avez des fonds deposes sur {defi["name"]} via {hw["name"]} et on vous agresse pour les retirer. CAS EXTREME: On vous force a signer le retrait sur {hw["name"]}. SOLUTION: 1) Montrez le wallet LEURRE sur {hw["name"]} (100-200 EUR) 2) Si {defi["name"]} a un timelock = delai obligatoire avant retrait 3) Vos vrais fonds sont avec passphrase (25eme mot) 4) Pour eviter: ne montrez JAMAIS vos positions.',
                'safe_warning_f': f'FIABILITE ({score_f}/100) - SITUATION: Vos cryptos sont deposees sur {defi["name"]} (signees via {hw["name"]}) et le protocole se fait hacker. CAS EXTREME: Tous les fonds deposes sont voles. SOLUTION: 1) Si hack en cours = retirez IMMEDIATEMENT si possible 2) Fonds voles = perdus 3) Pour eviter: verifiez audits sur {ctx_defi.get("github", "GitHub")}, preferez protocoles > 1 an avec equipe connue.{warning_f_extra}',
                'safe_warning_e': f'EFFICACITE ({score_e}/100) - SITUATION: Vous faites un depot/retrait sur {defi["name"]} en signant chaque transaction sur {hw["name"]}. OPTIMISATION: 1) Arbitrum/Optimism = -90% frais 2) Groupez vos operations 3) {len(steps)} etapes par interaction 4) Transactez la nuit = frais bas.',
                'steps_count': len(steps),
                'compatibility_steps': steps
            }

        # ============================================
        # SOFTWARE WALLET + DEFI PROTOCOL
        # ============================================
        if (codes_a & self.WALLET_SW and codes_b & self.DEFI) or \
           (codes_b & self.WALLET_SW and codes_a & self.DEFI):
            sw = pa if codes_a & self.WALLET_SW else pb
            defi = pb if codes_a & self.WALLET_SW else pa
            ctx_sw = ctx_a if codes_a & self.WALLET_SW else ctx_b
            ctx_defi = ctx_b if codes_a & self.WALLET_SW else ctx_a

            # Calculate combined scores from product data (average on 0-100 scale)
            score_s = int((ctx_sw.get('score_s', 0) + ctx_defi.get('score_s', 0)) / 2) if ctx_sw.get('score_s') or ctx_defi.get('score_s') else 60
            score_a = int((ctx_sw.get('score_a', 0) + ctx_defi.get('score_a', 0)) / 2) if ctx_sw.get('score_a') or ctx_defi.get('score_a') else 50
            score_f = int((ctx_sw.get('score_f', 0) + ctx_defi.get('score_f', 0)) / 2) if ctx_sw.get('score_f') or ctx_defi.get('score_f') else 70
            score_e = int((ctx_sw.get('score_e', 0) + ctx_defi.get('score_e', 0)) / 2) if ctx_sw.get('score_e') or ctx_defi.get('score_e') else 80

            # Conditional warnings based on scores
            warning_s_extra = f' ATTENTION: {sw["name"]} a un score securite de {int(ctx_sw.get("score_s", 0))}/100.' if ctx_sw.get('score_s', 0) > 0 and ctx_sw.get('score_s', 0) < 60 else ''
            warning_f_extra = f' ATTENTION: {defi["name"]} a un score fiabilite de {int(ctx_defi.get("score_f", 0))}/100.' if ctx_defi.get('score_f', 0) > 0 and ctx_defi.get('score_f', 0) < 50 else ''

            steps = [
                f'1. Install and set up {sw["name"]}',
                f'2. Navigate to {defi["name"]} official website',
                f'3. Click "Connect Wallet" button',
                f'4. Select {sw["name"]} or scan WalletConnect QR',
                f'5. Approve the connection request',
                f'6. Review transaction details carefully',
                f'7. Confirm transactions'
            ]

            return {
                'type_compatible': True,
                'ai_compatible': True,
                'ai_confidence': 0.88,
                'ai_confidence_factors': '+direct_connection +walletconnect +native_dapp_browser +evm_compatible',
                'ai_method': f'Connect {sw["name"]} directly to {defi["name"]} via browser extension or WalletConnect',
                'ai_steps': ' '.join(steps),
                'ai_limitations': 'Software wallet holds keys in browser/app; Verify you are on official website; Review all transaction approvals carefully',
                'ai_justification': f'You can connect {sw["name"]} directly to {defi["name"]} for seamless DeFi access. Transactions are signed in your wallet and executed on-chain.',
                'security_level': 'MEDIUM',
                'safe_warning_s': f'SECURITE ({score_s}/100) - SITUATION: Vous connectez {sw["name"]} a {defi["name"]} pour faire un swap et un virus sur votre PC capture votre mot de passe {sw["name"]}. CAS EXTREME: Le hacker vide votre wallet la nuit. SOLUTION: 1) Transferez IMMEDIATEMENT vos fonds vers nouvelle adresse depuis autre appareil 2) Pour eviter: navigateur DEDIE aux cryptos, {sw["name"]} depuis {ctx_sw.get("url", "store officiel")} uniquement.{warning_s_extra}',
                'safe_warning_a': f'ADVERSITE ({score_a}/100) - SITUATION: On vous vole votre telephone avec {sw["name"]} connecte a {defi["name"]} et lapplication ouverte. CAS EXTREME: Le voleur retire vos fonds de {defi["name"]} vers son wallet. SOLUTION: 1) Depuis un autre appareil restaurez {sw["name"]} avec vos 24 mots 2) Transferez TOUT vers nouvelle adresse = voleur na plus rien 3) Pour eviter: PIN + empreinte obligatoires, fermez lapp apres usage.',
                'safe_warning_f': f'FIABILITE ({score_f}/100) - SITUATION: Vous avez depose des cryptos sur {defi["name"]} via {sw["name"]} et {defi["name"]} se fait hacker. CAS EXTREME: Tous vos fonds sur {defi["name"]} sont voles. SOLUTION: 1) Si hack en cours = retirez IMMEDIATEMENT via {ctx_defi.get("url", "site officiel")} 2) Verifiez {ctx_defi.get("twitter", "@"+defi["name"])} 3) Pour eviter: verifiez audits sur defillama.com, preferez protocoles > 1 an.{warning_f_extra}',
                'safe_warning_e': f'EFFICACITE ({score_e}/100) - SITUATION: Vous faites des swaps sur {defi["name"]} en signant avec {sw["name"]}. OPTIMISATION: 1) {len(steps)} etapes = rapide 2) etherscan.io/gastracker pour timing 3) Arbitrum/Base = -90% frais 4) Dimanche soir = frais bas.',
                'steps_count': len(steps),
                'compatibility_steps': steps
            }

        # ============================================
        # PHYSICAL BACKUP + WALLET
        # ============================================
        if (codes_a & self.BACKUP and codes_b & self.WALLET_ALL) or \
           (codes_b & self.BACKUP and codes_a & self.WALLET_ALL):
            backup = pa if codes_a & self.BACKUP else pb
            wallet = pb if codes_a & self.BACKUP else pa
            ctx_backup = ctx_a if codes_a & self.BACKUP else ctx_b
            ctx_wallet = ctx_b if codes_a & self.BACKUP else ctx_a

            # Calculate combined scores from product data (average on 0-100 scale)
            score_s = int((ctx_backup.get('score_s', 0) + ctx_wallet.get('score_s', 0)) / 2) if ctx_backup.get('score_s') or ctx_wallet.get('score_s') else 90
            score_a = int((ctx_backup.get('score_a', 0) + ctx_wallet.get('score_a', 0)) / 2) if ctx_backup.get('score_a') or ctx_wallet.get('score_a') else 90
            score_f = int((ctx_backup.get('score_f', 0) + ctx_wallet.get('score_f', 0)) / 2) if ctx_backup.get('score_f') or ctx_wallet.get('score_f') else 100
            score_e = int((ctx_backup.get('score_e', 0) + ctx_wallet.get('score_e', 0)) / 2) if ctx_backup.get('score_e') or ctx_wallet.get('score_e') else 100

            # Conditional warnings based on scores
            warning_f_extra = f' NOTE: {backup["name"]} a un score fiabilite de {int(ctx_backup.get("score_f", 0))}/100.' if ctx_backup.get('score_f', 0) > 0 and ctx_backup.get('score_f', 0) < 80 else ''

            steps = [
                f'1. Set up {wallet["name"]} and note the 12/24-word seed phrase',
                f'2. Get your {backup["name"]} and the stamping/engraving tool',
                f'3. Carefully record each word in order on {backup["name"]}',
                f'4. Double-check every word for accuracy',
                f'5. Store in a secure, fireproof location',
                f'6. Consider a second backup in different geographic location'
            ]

            return {
                'type_compatible': True,
                'ai_compatible': True,
                'ai_confidence': 0.95,
                'ai_confidence_factors': '+bip39_universal +seed_phrase_backup +fire_water_resistant +offline_storage',
                'ai_method': f'Back up {wallet["name"]} BIP39 seed phrase on {backup["name"]} for durable offline protection',
                'ai_steps': ' '.join(steps),
                'ai_limitations': 'Protect from unauthorized access; Consider multiple backup locations; Test recovery before relying on backup',
                'ai_justification': f'You can protect your {wallet["name"]} by backing up its seed phrase on {backup["name"]}. This durable backup survives fire, water, and corrosion, ensuring you can always recover your wallet.',
                'security_level': 'HIGH',
                'safe_warning_s': f'SECURITE ({score_s}/100) - SITUATION: Vous avez grave le seed de {wallet["name"]} sur {backup["name"]} mais quelquun la vu ou photographie. CAS EXTREME: Vos cryptos sont volees des semaines plus tard. SOLUTION: 1) Creez IMMEDIATEMENT nouveau wallet sur {wallet["name"]} 2) Transferez TOUT vers nouvelle adresse 3) Detruisez lancien {backup["name"]} 4) Pour eviter: gravez SEUL porte fermee, JAMAIS de photo.',
                'safe_warning_a': f'ADVERSITE ({score_a}/100) - SITUATION: Des cambrioleurs trouvent votre {backup["name"]} qui contient le seed de {wallet["name"]}. CAS EXTREME: Ils restaurent sur leur telephone et vident votre wallet. SOLUTION: 1) Si passphrase (25eme mot) active = ils nont quun wallet vide 2) Transferez via autre appareil IMMEDIATEMENT 3) Pour eviter: 2eme backup chez parents, Shamir 2-of-3, niez posseder des cryptos.',
                'safe_warning_f': f'FIABILITE ({score_f}/100) - SITUATION: Votre {backup["name"]} est detruit (incendie) et vous devez restaurer {wallet["name"]}. CAS EXTREME: Seed illisible = cryptos perdues. SOLUTION: 1) Si 2eme backup = restaurez sur nouveau {wallet["name"]} 2) Sinon = perdu a jamais 3) Pour eviter: 2eme backup dans autre lieu, acier inox 316 resiste au feu, testez restauration.{warning_f_extra}',
                'safe_warning_e': f'EFFICACITE ({score_e}/100) - SITUATION: Vous gravez le seed de {wallet["name"]} sur {backup["name"]}. OPTIMISATION: 1) {len(steps)} etapes UNE SEULE FOIS 2) Zero maintenance 3) 30-100 EUR = securite eternelle 4) 30 min = decennies de tranquillite.',
                'steps_count': len(steps),
                'compatibility_steps': steps
            }

        # ============================================
        # WALLET + EXCHANGE (CEX)
        # ============================================
        if (codes_a & self.WALLET_ALL and codes_b & self.EXCHANGE) or \
           (codes_b & self.WALLET_ALL and codes_a & self.EXCHANGE):
            wallet = pa if codes_a & self.WALLET_ALL else pb
            cex = pb if codes_a & self.WALLET_ALL else pa
            ctx_wallet = ctx_a if codes_a & self.WALLET_ALL else ctx_b
            ctx_cex = ctx_b if codes_a & self.WALLET_ALL else ctx_a

            # Calculate combined scores from product data (average on 0-100 scale)
            score_s = int((ctx_wallet.get('score_s', 0) + ctx_cex.get('score_s', 0)) / 2) if ctx_wallet.get('score_s') or ctx_cex.get('score_s') else 60
            score_a = int((ctx_wallet.get('score_a', 0) + ctx_cex.get('score_a', 0)) / 2) if ctx_wallet.get('score_a') or ctx_cex.get('score_a') else 50
            score_f = int((ctx_wallet.get('score_f', 0) + ctx_cex.get('score_f', 0)) / 2) if ctx_wallet.get('score_f') or ctx_cex.get('score_f') else 50
            score_e = int((ctx_wallet.get('score_e', 0) + ctx_cex.get('score_e', 0)) / 2) if ctx_wallet.get('score_e') or ctx_cex.get('score_e') else 70

            # Conditional warnings based on scores
            warning_f_extra = f' ATTENTION: {cex["name"]} a un score fiabilite de {int(ctx_cex.get("score_f", 0))}/100.' if ctx_cex.get('score_f', 0) > 0 and ctx_cex.get('score_f', 0) < 60 else ''
            warning_s_extra = f' ATTENTION: {cex["name"]} a un score securite de {int(ctx_cex.get("score_s", 0))}/100.' if ctx_cex.get('score_s', 0) > 0 and ctx_cex.get('score_s', 0) < 60 else ''

            steps = [
                f'1. In {wallet["name"]}, copy your receiving address for the specific asset',
                f'2. On {cex["name"]}, navigate to Withdraw section',
                f'3. Select the cryptocurrency to withdraw',
                f'4. Choose the correct network (CRITICAL - wrong network = lost funds!)',
                f'5. Paste the destination address from {wallet["name"]}',
                f'6. Verify first 6 and last 6 characters match',
                f'7. Send small test amount first for new addresses',
                f'8. Enter full amount and confirm withdrawal',
                f'9. Complete 2FA verification on {cex["name"]}',
                f'10. Wait for blockchain confirmation (varies by network)'
            ]

            return {
                'type_compatible': True,
                'ai_compatible': True,
                'ai_confidence': 0.88,
                'ai_confidence_factors': '+deposit_withdraw +multi_chain +fiat_gateway +standard_transfer',
                'ai_method': f'Transfer crypto between {cex["name"]} and {wallet["name"]} via deposit/withdrawal',
                'ai_steps': ' '.join(steps),
                'ai_limitations': 'Verify network matches on both ends; Withdrawal fees apply; Some assets may have minimum amounts; Wrong network = permanent loss',
                'ai_justification': f'You can easily move your crypto between {cex["name"]} and {wallet["name"]}. Always double-check the receiving address and use the same network on both ends.',
                'security_level': 'MEDIUM',
                'safe_warning_s': f'SECURITE ({score_s}/100) - SITUATION: Vous retirez des cryptos de {cex["name"]} vers {wallet["name"]} mais un hacker a pris le controle de votre compte {cex["name"]} (SIM swap). CAS EXTREME: Il change ladresse de retrait et vole vos cryptos. SOLUTION: 1) Contactez {cex["name"]} IMMEDIATEMENT pour bloquer 2) Portez plainte 3) Pour eviter: Yubikey/Google Auth, email dedie, whitelistez {wallet["name"]}.{warning_s_extra}',
                'safe_warning_a': f'ADVERSITE ({score_a}/100) - SITUATION: On vous agresse pour vous forcer a retirer vos cryptos de {cex["name"]} vers {wallet["name"]} puis vers leur adresse. CAS EXTREME: Sous la menace vous devez transferer. SOLUTION: 1) Whitelist active = retrait impossible vers adresse inconnue pendant 24-72h 2) 2FA materiel (Yubikey) ralentit lagresseur 3) Pour eviter: activez tous les delais de securite, ne faites pas de retraits en public.',
                'safe_warning_f': f'FIABILITE ({score_f}/100) - SITUATION: Vous avez des cryptos sur {cex["name"]} en attendant de les retirer vers {wallet["name"]} mais {cex["name"]} bloque les retraits. CAS EXTREME: Lexchange ferme comme FTX. SOLUTION: 1) Suivez la procedure officielle de {cex["name"]} 2) Gardez preuves de vos avoirs 3) Pour eviter: retirez vers {wallet["name"]} des que possible, verifiez statut exchange avant gros depot.{warning_f_extra}',
                'safe_warning_e': f'EFFICACITE ({score_e}/100) - SITUATION: Vous transferez entre {cex["name"]} et {wallet["name"]}. OPTIMISATION: 1) {len(steps)} etapes 2) Frais: 1-20 EUR selon reseau 3) Polygon/Arbitrum = -90% frais 4) ATTENTION: mauvais reseau = perte definitive.',
                'steps_count': len(steps),
                'compatibility_steps': steps
            }

        # ============================================
        # DEFI + DEFI (Protocol combinations)
        # ============================================
        if codes_a & self.DEFI and codes_b & self.DEFI:
            # Calculate combined scores from product data (average on 0-100 scale)
            score_s = int((ctx_a.get('score_s', 0) + ctx_b.get('score_s', 0)) / 2) if ctx_a.get('score_s') or ctx_b.get('score_s') else 50
            score_a = int((ctx_a.get('score_a', 0) + ctx_b.get('score_a', 0)) / 2) if ctx_a.get('score_a') or ctx_b.get('score_a') else 40
            score_f = int((ctx_a.get('score_f', 0) + ctx_b.get('score_f', 0)) / 2) if ctx_a.get('score_f') or ctx_b.get('score_f') else 50
            score_e = int((ctx_a.get('score_e', 0) + ctx_b.get('score_e', 0)) / 2) if ctx_a.get('score_e') or ctx_b.get('score_e') else 60

            # Conditional warnings based on scores
            warning_f_extra_a = f' {name_a}: {int(ctx_a.get("score_f", 0))}/100.' if ctx_a.get('score_f', 0) > 0 and ctx_a.get('score_f', 0) < 50 else ''
            warning_f_extra_b = f' {name_b}: {int(ctx_b.get("score_f", 0))}/100.' if ctx_b.get('score_f', 0) > 0 and ctx_b.get('score_f', 0) < 50 else ''
            warning_f_extra = f' ATTENTION scores fiabilite:{warning_f_extra_a}{warning_f_extra_b}' if warning_f_extra_a or warning_f_extra_b else ''

            steps = [
                f'1. Connect wallet to both {name_a} and {name_b}',
                f'2. Research the strategy thoroughly before executing',
                f'3. Check both protocols for audits and TVL stability',
                f'4. Start with small amounts to test the flow',
                f'5. Execute actions in correct order (approvals first)',
                f'6. Monitor combined positions actively',
                f'7. Set up alerts for liquidation thresholds',
                f'8. Have exit strategy ready before market stress'
            ]

            return {
                'type_compatible': True,
                'ai_compatible': True,
                'ai_confidence': 0.82,
                'ai_confidence_factors': '+defi_composability +same_chain +liquidity_routing +aggregation',
                'ai_method': f'{name_a} and {name_b} can be used together through composable DeFi strategies',
                'ai_steps': ' '.join(steps),
                'ai_limitations': 'Smart contract risk compounds; Check for shared dependencies; Monitor collateralization ratios; Oracle manipulation possible',
                'ai_justification': f'You can create sophisticated DeFi strategies by combining {name_a} and {name_b}. DeFi composability allows using assets and positions across protocols.',
                'security_level': 'MEDIUM',
                'safe_warning_s': f'SECURITE ({score_s}/100) - SITUATION: Vous deposez sur {name_a} puis utilisez ces fonds comme collateral sur {name_b} - un des deux protocoles se fait hacker. CAS EXTREME: Effet domino - vos fonds sur les deux sont draines. SOLUTION: 1) Retirez de {name_a} ET {name_b} IMMEDIATEMENT 2) revoke.cash pour annuler autorisations 3) Pour eviter: verifiez audits sur defillama.com, protocoles > 1 an.',
                'safe_warning_a': f'ADVERSITE ({score_a}/100) - SITUATION: Vous avez des fonds sur {name_a} + {name_b} et on vous agresse pour tout retirer. CAS EXTREME: On vous force a liquider vos positions. SOLUTION: 1) Certains protocoles ont des timelocks = delai obligatoire 2) Gagnez du temps pour appeler a laide 3) Pour eviter: JAMAIS montrer positions DeFi publiquement, wallet leurre visible.',
                'safe_warning_f': f'FIABILITE ({score_f}/100) - SITUATION: Vous avez des fonds repartis entre {name_a} et {name_b} et un des deux fait un rug pull. CAS EXTREME: Lequipe disparait avec vos fonds deposes. SOLUTION: 1) Rug pull = fonds perdus 2) Signalez + portez plainte 3) Pour eviter: verifiez equipe doxxee, historique > 1 an, audits multiples sur GitHub.{warning_f_extra}',
                'safe_warning_e': f'EFFICACITE ({score_e}/100) - SITUATION: Vous gerez des positions sur {name_a} et {name_b} en parallele. OPTIMISATION: 1) {len(steps)} etapes par strategie 2) Arbitrum/Base = -90% frais 3) Groupez le dimanche soir 4) Preparez sorties a lavance.',
                'steps_count': len(steps),
                'compatibility_steps': steps
            }

        # ============================================
        # SAME TYPE PRODUCTS
        # ============================================
        if codes_a & codes_b:
            common = list(codes_a & codes_b)[0]

            # Calculate combined scores from product data (average on 0-100 scale)
            score_s = int((ctx_a.get('score_s', 0) + ctx_b.get('score_s', 0)) / 2) if ctx_a.get('score_s') or ctx_b.get('score_s') else 70
            score_a = int((ctx_a.get('score_a', 0) + ctx_b.get('score_a', 0)) / 2) if ctx_a.get('score_a') or ctx_b.get('score_a') else 80
            score_f = int((ctx_a.get('score_f', 0) + ctx_b.get('score_f', 0)) / 2) if ctx_a.get('score_f') or ctx_b.get('score_f') else 70
            score_e = int((ctx_a.get('score_e', 0) + ctx_b.get('score_e', 0)) / 2) if ctx_a.get('score_e') or ctx_b.get('score_e') else 70

            # Conditional warnings based on scores
            warning_s_extra = ''
            if ctx_a.get('score_s', 0) > 0 and ctx_b.get('score_s', 0) > 0:
                if ctx_a.get('score_s', 0) < ctx_b.get('score_s', 0):
                    warning_s_extra = f' NOTE: {name_a} ({int(ctx_a.get("score_s", 0))}/100) moins securise que {name_b} ({int(ctx_b.get("score_s", 0))}/100).'
                elif ctx_b.get('score_s', 0) < ctx_a.get('score_s', 0):
                    warning_s_extra = f' NOTE: {name_b} ({int(ctx_b.get("score_s", 0))}/100) moins securise que {name_a} ({int(ctx_a.get("score_s", 0))}/100).'

            steps = [
                f'1. Identify unique features of {name_a} (chains, security model)',
                f'2. Identify unique features of {name_b} (chains, security model)',
                f'3. Decide primary vs backup use case for each',
                f'4. Set up each product INDEPENDENTLY',
                f'5. Generate SEPARATE seed phrases - NEVER share between products',
                f'6. Document which assets are on which product',
                f'7. Test recovery process for both'
            ]

            return {
                'type_compatible': True,
                'ai_compatible': True,
                'ai_confidence': 0.75,
                'ai_confidence_factors': f'+same_category +{common.lower().replace(" ", "_")} +complementary_use +redundancy',
                'ai_method': f'{name_a} and {name_b} are both {common} products that complement each other for different chains or redundancy',
                'ai_steps': ' '.join(steps),
                'ai_limitations': 'May have different chain support; Never reuse seed phrases; Different security models',
                'ai_justification': f'{name_a} and {name_b} are both {common} products. You can use them for different blockchains, as redundancy, or to access unique features each provides.',
                'security_level': 'MEDIUM',
                'safe_warning_s': f'SECURITE ({score_s}/100) - SITUATION: Vous avez importe le meme seed sur {name_a} et {name_b} pour avoir acces depuis les deux. CAS EXTREME: {name_a} est compromis = {name_b} lest aussi automatiquement. SOLUTION: 1) Creez NOUVEAU seed sur chaque appareil 2) Transferez vers nouvelles adresses 3) Pour eviter: JAMAIS meme seed sur 2 produits.{warning_s_extra}',
                'safe_warning_a': f'ADVERSITE ({score_a}/100) - SITUATION: Cambriolage - on trouve {name_a} et {name_b} ranges ensemble avec les seeds a cote. CAS EXTREME: Voleurs restaurent et vident tout. SOLUTION: 1) Si passphrase active = wallet vide pour eux 2) Transferez depuis autre appareil 3) Pour eviter: lieux differents (maison + coffre banque), wallet leurre.',
                'safe_warning_f': f'FIABILITE ({score_f}/100) - SITUATION: {name_a} tombe en panne et vous devez acceder a vos cryptos. CAS EXTREME: Plus de support, appareil inutilisable. SOLUTION: 1) Restaurez vos 24 mots sur {name_b} 2) Ou sur nimporte quel wallet BIP39 3) Pour eviter: preferez open-source, testez restauration, seed sur metal.',
                'safe_warning_e': f'EFFICACITE ({score_e}/100) - SITUATION: Vous utilisez {name_a} et {name_b} en parallele. OPTIMISATION: 1) {len(steps)} etapes au setup 2) {name_a} pour BTC, {name_b} pour altcoins 3) 100-300 EUR par wallet = worth it 4) Documentez clairement.',
                'steps_count': len(steps),
                'compatibility_steps': steps
            }

        # ============================================
        # DEFAULT (Based on type compatibility)
        # ============================================
        conf_map = {'native': 0.85, 'partial': 0.65, 'via_bridge': 0.55, 'incompatible': 0.25}
        conf = conf_map.get(type_level, 0.50)
        sec_map = {'native': 'HIGH', 'partial': 'MEDIUM', 'via_bridge': 'MEDIUM', 'incompatible': 'LOW'}
        sec = sec_map.get(type_level, 'MEDIUM')

        # Calculate combined scores from product data (average on 0-100 scale), with fallback based on type_level
        fallback_map = {'native': 80, 'partial': 60, 'via_bridge': 50, 'incompatible': 30}
        fallback = fallback_map.get(type_level, 50)

        score_s = int((ctx_a.get('score_s', 0) + ctx_b.get('score_s', 0)) / 2) if ctx_a.get('score_s') or ctx_b.get('score_s') else fallback
        score_a = int((ctx_a.get('score_a', 0) + ctx_b.get('score_a', 0)) / 2) if ctx_a.get('score_a') or ctx_b.get('score_a') else fallback
        score_f = int((ctx_a.get('score_f', 0) + ctx_b.get('score_f', 0)) / 2) if ctx_a.get('score_f') or ctx_b.get('score_f') else fallback
        score_e = int((ctx_a.get('score_e', 0) + ctx_b.get('score_e', 0)) / 2) if ctx_a.get('score_e') or ctx_b.get('score_e') else fallback

        # Conditional warnings based on scores
        warning_extra = ''
        if ctx_a.get('note_finale', 0) > 0 and ctx_b.get('note_finale', 0) > 0:
            if ctx_a.get('note_finale', 0) < 50 or ctx_b.get('note_finale', 0) < 50:
                low_product = name_a if ctx_a.get('note_finale', 0) < ctx_b.get('note_finale', 0) else name_b
                low_score = min(ctx_a.get('note_finale', 0), ctx_b.get('note_finale', 0))
                warning_extra = f' ATTENTION: {low_product} a un score global de {int(low_score)}/100.'

        type_a_str = list(codes_a)[0] if codes_a else 'unknown'
        type_b_str = list(codes_b)[0] if codes_b else 'unknown'

        steps = [
            f'1. Check official documentation for {name_a}',
            f'2. Check official documentation for {name_b}',
            f'3. Verify both products support same blockchain/network',
            f'4. Test with minimal amount first',
            f'5. Monitor transaction until confirmation'
        ]

        return {
            'type_compatible': type_level != 'incompatible',
            'ai_compatible': type_level != 'incompatible',
            'ai_confidence': conf,
            'ai_confidence_factors': f'+type_baseline +{type_level}_compatibility',
            'ai_method': tc.get('base_method', f'{name_a} + {name_b}: {type_level} compatibility based on {type_a_str} x {type_b_str}') if tc else f'{name_a} + {name_b}: Check official documentation',
            'ai_steps': ' '.join(steps),
            'ai_limitations': 'Based on product type compatibility; Verify with official sources for specific details; May require intermediate steps',
            'ai_justification': f'Based on {type_level} compatibility between {type_a_str} and {type_b_str} product types.',
            'security_level': sec,
            'safe_warning_s': f'SECURITE ({score_s}/100) - SITUATION: Vous envoyez des cryptos depuis {name_a} vers {name_b} et une fausse pop-up vous demande de confirmer une transaction que vous navez pas initiee. CAS EXTREME: Vous signez et un hacker vide votre wallet. SOLUTION: 1) Fermez TOUT sans signer 2) Allez sur revoke.cash et revoquez les autorisations 3) Transferez vers nouvelle adresse 4) Pour eviter: bookmarkez {ctx_a.get("url", name_a)} et {ctx_b.get("url", name_b)}, jamais de lien email/discord.{warning_extra}',
            'safe_warning_a': f'ADVERSITE ({score_a}/100) - SITUATION: Quelquun vous agresse pendant que vous transferez des cryptos entre {name_a} et {name_b}. CAS EXTREME: On vous force physiquement a tout envoyer vers ladresse du voleur. SOLUTION: 1) Montrez un wallet LEURRE (100 EUR max visible) 2) Vos vrais fonds = passphrase (25eme mot) invisible 3) Dites quil y a un delai 24h sur gros transferts 4) Pour eviter: ne transactez JAMAIS en public, ne parlez pas de crypto.',
            'safe_warning_f': f'FIABILITE ({score_f}/100) - SITUATION: Vous utilisez {name_a} pour acceder a {name_b} mais lun des deux services est en maintenance ou ferme definitivement. CAS EXTREME: Vos fonds sont bloques ou inaccessibles. SOLUTION: 1) Vos cryptos sont sur la blockchain pas sur le service 2) Recuperez vos 24 mots et restaurez sur alternative compatible 3) Pour eviter: testez restauration MAINTENANT, gardez seed sur metal.',
            'safe_warning_e': f'EFFICACITE ({score_e}/100) - SITUATION: Vous faites des operations entre {name_a} et {name_b}. OPTIMISATION: 1) {len(steps)} etapes pour lintegration 2) Testez petit montant dabord 3) Arbitrum/Base = -90% frais 4) Transactez dimanche soir = frais bas 5) Compatibilite {type_level}.',
            'steps_count': len(steps),
            'compatibility_steps': steps
        }

    def save_compat(self, pa_id: int, pb_id: int, data: Dict) -> bool:
        """Save compatibility with SAFE fields"""
        if pa_id > pb_id:
            pa_id, pb_id = pb_id, pa_id

        # Convert steps list to JSON string if needed
        steps = data.get('compatibility_steps', [])
        if isinstance(steps, list):
            import json
            steps = json.dumps(steps)

        record = {
            'product_a_id': pa_id,
            'product_b_id': pb_id,
            'type_compatible': data.get('type_compatible', True),
            'ai_compatible': data.get('ai_compatible', True),
            'ai_confidence': data.get('ai_confidence', 0.5),
            'ai_confidence_factors': (data.get('ai_confidence_factors', '') or '')[:300],
            'ai_method': (data.get('ai_method', '') or '')[:500],
            'ai_steps': (data.get('ai_steps', '') or '')[:1000],
            'ai_limitations': data.get('ai_limitations', '')[:500] if data.get('ai_limitations') else None,
            'ai_justification': (data.get('ai_justification', '') or '')[:500],
            'security_level': data.get('security_level', 'MEDIUM'),
            'safe_warning_s': (data.get('safe_warning_s', '') or '')[:500],
            'safe_warning_a': (data.get('safe_warning_a', '') or '')[:500],
            'safe_warning_f': (data.get('safe_warning_f', '') or '')[:500],
            'safe_warning_e': (data.get('safe_warning_e', '') or '')[:500],
            'analyzed_at': datetime.now().isoformat(),
            'analyzed_by': 'claude_opus_safe_analysis'
        }

        r = requests.post(f"{SUPABASE_URL}/rest/v1/product_compatibility", headers=self.headers, json=record)
        if r.status_code in [200, 201]:
            return True
        r = requests.patch(f"{SUPABASE_URL}/rest/v1/product_compatibility?product_a_id=eq.{pa_id}&product_b_id=eq.{pb_id}", headers=self.headers, json=record)
        return r.status_code in [200, 201, 204]

    def run(self, limit: int = None):
        """Generate SAFE-nuanced compatibility matrix"""
        print("""
====================================================================
  SAFESCORING - Product Compatibility with SAFE Pillar Analysis
  Nuanced S/A/F/E warnings for each product combination
====================================================================
""")
        self.load_data()

        # Priority products
        priority = self.WALLET_HW | self.WALLET_SW | self.DEFI | self.BACKUP | self.EXCHANGE
        priority_products = [p for p in self.products if self.get_type_codes(p) & priority]
        print(f"[INFO] {len(priority_products)} priority products")

        pairs = []
        for i, pa in enumerate(priority_products):
            for pb in priority_products[i+1:]:
                if (pa['id'], pb['id']) not in self.existing:
                    pairs.append((pa, pb))

        if limit:
            pairs = pairs[:limit]
        print(f"[INFO] {len(pairs)} pairs to process")

        for idx, (pa, pb) in enumerate(pairs):
            if idx % 100 == 0:
                print(f"[PROGRESS] {idx}/{len(pairs)} ({idx*100//len(pairs) if pairs else 0}%)")

            try:
                data = self.analyze_safe_compatibility(pa, pb)
                if self.save_compat(pa['id'], pb['id'], data):
                    self.stats['created'] += 1
            except Exception as e:
                print(f"[ERROR] {pa['name']} x {pb['name']}: {e}")
                self.stats['errors'] += 1

            if idx % 50 == 0 and idx > 0:
                time.sleep(0.3)

        print(f"""
====================================================================
                         COMPLETED
====================================================================
  Created/Updated: {self.stats['created']:5}
  Errors:          {self.stats['errors']:5}
====================================================================
""")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=None)
    args = parser.parse_args()

    gen = ProductCompatibilitySAFE()
    gen.run(limit=args.limit)
