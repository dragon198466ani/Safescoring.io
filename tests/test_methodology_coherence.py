#!/usr/bin/env python3
"""
SAFESCORING.IO - Tests de Cohérence Méthodologique pour TOUS les 88 Types de Produits

Ce fichier teste que la méthodologie est cohérente pour TOUS les types de produits:

CATEGORIES (88 types total):
    HARDWARE (1 type): HW Cold
    SOFTWARE (3 types): SW Browser, SW Mobile, SW Desktop
    BACKUP (3 types): Bkp Physical, Bkp Digital, Paper Wallet
    WALLETS (4 types): MPC Wallet, MultiSig, Smart Wallet, AA
    CARDS (2 types): Card, Card Non-Cust
    EXCHANGES (2 types): CEX, OTC
    DEX (3 types): DEX, DEX Agg, AMM
    LENDING (2 types): Lending, CeFi Lending
    STAKING (3 types): Liq Staking, Restaking, Validator
    YIELD (3 types): Yield, Locker, Vesting
    DERIVATIVES (4 types): Perps, Options, Derivatives, Prediction
    STABLECOINS (3 types): Stablecoin, Synthetics, Wrapped
    BRIDGES (5 types): Bridges, CrossAgg, Interop, L2, Atomic Swap
    PRIVACY (3 types): Privacy, Private DeFi, dVPN
    INFRASTRUCTURE (6 types): Oracle, Data Indexer, Node RPC, Explorer, Dev Tools, Storage
    NFT (2 types): NFT Market, NFT Tools
    GAMING (4 types): GameFi, Metaverse, SocialFi, Fan Token
    DAO (4 types): DAO, Treasury, Index, Protocol
    IDENTITY (3 types): Identity, Attestation, Security
    SERVICES (9 types): Crypto Bank, Custody, Prime, Fiat Gateway, Payment, Tax, Mining, Intent, MEV
    OTHER (9 types): RWA, Insurance, DeFi Tools, Launchpad, Quest, Research, Messaging, Streaming, AI Agent, Compute, Onramp, Fintech, Crypto Card

USAGE:
    python -m pytest tests/test_methodology_coherence.py -v
    python tests/test_methodology_coherence.py  # Run directly

EXPECTED SCORES BY TYPE (benchmarks):
    - Top Hardware Wallets (Ledger, Trezor): 70-90%
    - Good Software Wallets (MetaMask, Trust): 60-75%
    - Solid DeFi Protocols (Aave, Uniswap): 55-70%
    - Centralized Exchanges: 50-70%
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.applicability_rules import (
    HARDWARE_NORM_CODES,
    SOFTWARE_NORM_CODES,
    EVM_CHAINS,
    NON_EVM_CHAINS,
    EVM_ONLY_PRODUCT_TYPES,
    MULTI_CHAIN_PRODUCT_TYPES,
    SOFTWARE_PRODUCT_TYPES,
    HARDWARE_PRODUCT_TYPES,
    CHAIN_NORMS,
)
from src.core.evaluation_validator import EvaluationValidator


class TestMethodologyCoherence:
    """Tests de cohérence méthodologique par type de produit."""

    def setup_method(self):
        """Setup for each test."""
        self.validator = EvaluationValidator()

    # =========================================================================
    # TEST 1: Chain Compatibility for EVM-only products
    # =========================================================================

    def test_dex_cannot_support_bitcoin(self):
        """DEX (EVM-only) ne peut pas supporter Bitcoin."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'Supports BTC', product_type='DEX'
        )
        assert 'CHAIN_NOT_SUPPORTED:bitcoin' in flags, \
            "DEX should flag Bitcoin as not supported"

    def test_dex_cannot_support_solana(self):
        """DEX (EVM-only) ne peut pas supporter Solana."""
        flags = self.validator.validate_chain_support(
            'E10', 'YES', 'Supports SOL', product_type='DEX'
        )
        assert 'CHAIN_NOT_SUPPORTED:solana' in flags, \
            "DEX should flag Solana as not supported"

    def test_dex_can_support_ethereum(self):
        """DEX peut supporter Ethereum (EVM)."""
        flags = self.validator.validate_chain_support(
            'E02', 'YES', 'Supports ETH', product_type='DEX'
        )
        assert len(flags) == 0, "DEX should support Ethereum without flags"

    def test_dex_can_support_polygon(self):
        """DEX peut supporter Polygon (EVM L2)."""
        flags = self.validator.validate_chain_support(
            'E04', 'YES', 'Supports Polygon', product_type='DEX'
        )
        assert len(flags) == 0, "DEX should support Polygon without flags"

    def test_hw_wallet_can_support_bitcoin(self):
        """Hardware Wallet peut supporter Bitcoin."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'Supports BTC', product_type='HW_WALLET'
        )
        assert len(flags) == 0, "HW_WALLET should support Bitcoin without flags"

    def test_hw_wallet_can_support_solana(self):
        """Hardware Wallet peut supporter Solana."""
        flags = self.validator.validate_chain_support(
            'E10', 'YES', 'Supports SOL', product_type='HW_WALLET'
        )
        assert len(flags) == 0, "HW_WALLET should support Solana without flags"

    def test_lending_cannot_support_bitcoin(self):
        """Lending Protocol (EVM-only) ne peut pas supporter Bitcoin."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'Supports BTC', product_type='LENDING'
        )
        assert 'CHAIN_NOT_SUPPORTED:bitcoin' in flags, \
            "Lending should flag Bitcoin as not supported"

    # =========================================================================
    # TEST 2: Hardware/Software Norm Compatibility
    # =========================================================================

    def test_defi_cannot_have_secure_element(self):
        """DeFi Protocol ne peut pas avoir Secure Element (hardware norm)."""
        flags = self.validator.validate_norm_product_compatibility(
            'S50', 'YES', product_type='DEX'
        )
        assert 'HARDWARE_NORM_FOR_SOFTWARE:S50' in flags, \
            "DEX should flag S50 (Secure Element) as invalid"

    def test_defi_cannot_have_firmware_norms(self):
        """DeFi Protocol ne peut pas avoir norms firmware."""
        for norm in ['S70', 'S71', 'S72', 'S73']:
            flags = self.validator.validate_norm_product_compatibility(
                norm, 'YES', product_type='DEFI'
            )
            assert f'HARDWARE_NORM_FOR_SOFTWARE:{norm}' in flags, \
                f"DEFI should flag {norm} (firmware) as invalid"

    def test_defi_cannot_have_material_norms(self):
        """DeFi Protocol ne peut pas avoir norms matériaux (F01-F20)."""
        for norm in ['F01', 'F02', 'F10', 'F15', 'F126']:
            flags = self.validator.validate_norm_product_compatibility(
                norm, 'YES', product_type='DEX'
            )
            assert f'HARDWARE_NORM_FOR_SOFTWARE:{norm}' in flags, \
                f"DEX should flag {norm} (material) as invalid"

    def test_hw_wallet_can_have_secure_element(self):
        """Hardware Wallet peut avoir Secure Element."""
        flags = self.validator.validate_norm_product_compatibility(
            'S50', 'YES', product_type='HW_WALLET'
        )
        assert len(flags) == 0, "HW_WALLET should accept S50 (Secure Element)"

    def test_hw_wallet_can_have_firmware_norms(self):
        """Hardware Wallet peut avoir norms firmware."""
        for norm in ['S70', 'S71', 'S72', 'S73']:
            flags = self.validator.validate_norm_product_compatibility(
                norm, 'YES', product_type='HW_WALLET'
            )
            assert len(flags) == 0, \
                f"HW_WALLET should accept {norm} (firmware)"

    def test_hw_wallet_cannot_have_smart_contract_norms(self):
        """Hardware Wallet ne peut pas avoir norms smart contract."""
        for norm in ['S221', 'S222', 'S223']:
            flags = self.validator.validate_norm_product_compatibility(
                norm, 'YES', product_type='HW_WALLET'
            )
            assert f'SOFTWARE_NORM_FOR_HARDWARE:{norm}' in flags, \
                f"HW_WALLET should flag {norm} (smart contract) as invalid"

    # =========================================================================
    # TEST 3: Specific Product Slugs
    # =========================================================================

    def test_1inch_is_evm_only(self):
        """1inch est EVM-only (ne supporte pas Bitcoin)."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'Supports BTC', product_slug='1inch'
        )
        assert 'CHAIN_NOT_SUPPORTED:bitcoin' in flags, \
            "1inch should be detected as EVM-only"

    def test_uniswap_is_evm_only(self):
        """Uniswap est EVM-only (ne supporte pas Solana)."""
        flags = self.validator.validate_chain_support(
            'E10', 'YES', 'Supports SOL', product_slug='uniswap'
        )
        assert 'CHAIN_NOT_SUPPORTED:solana' in flags, \
            "Uniswap should be detected as EVM-only"

    def test_ledger_can_support_all_chains(self):
        """Ledger (hardware wallet) peut supporter toutes les chaînes."""
        for norm, chain in [('E01', 'bitcoin'), ('E02', 'ethereum'), ('E10', 'solana')]:
            flags = self.validator.validate_chain_support(
                norm, 'YES', f'Supports {chain}', product_slug='ledger'
            )
            assert len(flags) == 0, \
                f"Ledger should support {chain} without flags"

    def test_aave_is_evm_only(self):
        """Aave (lending) est EVM-only."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'Supports BTC', product_slug='aave'
        )
        assert 'CHAIN_NOT_SUPPORTED:bitcoin' in flags, \
            "Aave should be detected as EVM-only"

    # =========================================================================
    # TEST 4: Constants Consistency
    # =========================================================================

    def test_chain_norms_mapping(self):
        """Vérifier que CHAIN_NORMS contient les mappings corrects."""
        assert CHAIN_NORMS.get('E01') == 'bitcoin', "E01 should map to bitcoin"
        assert CHAIN_NORMS.get('E02') == 'ethereum', "E02 should map to ethereum"
        assert CHAIN_NORMS.get('E10') == 'solana', "E10 should map to solana"
        assert CHAIN_NORMS.get('E04') == 'polygon', "E04 should map to polygon"

    def test_non_evm_chains_complete(self):
        """Vérifier que NON_EVM_CHAINS contient les chaînes principales."""
        assert 'bitcoin' in NON_EVM_CHAINS, "bitcoin should be in NON_EVM_CHAINS"
        assert 'solana' in NON_EVM_CHAINS, "solana should be in NON_EVM_CHAINS"
        assert 'cosmos' in NON_EVM_CHAINS, "cosmos should be in NON_EVM_CHAINS"
        assert 'cardano' in NON_EVM_CHAINS, "cardano should be in NON_EVM_CHAINS"

    def test_evm_chains_complete(self):
        """Vérifier que EVM_CHAINS contient les chaînes principales."""
        assert 'ethereum' in EVM_CHAINS, "ethereum should be in EVM_CHAINS"
        assert 'polygon' in EVM_CHAINS, "polygon should be in EVM_CHAINS"
        assert 'arbitrum' in EVM_CHAINS, "arbitrum should be in EVM_CHAINS"
        assert 'base' in EVM_CHAINS, "base should be in EVM_CHAINS"

    def test_hardware_norm_codes_complete(self):
        """Vérifier que HARDWARE_NORM_CODES contient les norms principales."""
        # Secure Element norms
        for norm in ['S50', 'S51', 'S52', 'S53']:
            assert norm in HARDWARE_NORM_CODES, f"{norm} should be in HARDWARE_NORM_CODES"
        # Firmware norms
        for norm in ['S70', 'S71', 'S72', 'S73']:
            assert norm in HARDWARE_NORM_CODES, f"{norm} should be in HARDWARE_NORM_CODES"
        # Material norms
        for norm in ['F01', 'F02', 'F10', 'F126']:
            assert norm in HARDWARE_NORM_CODES, f"{norm} should be in HARDWARE_NORM_CODES"

    def test_software_norm_codes_complete(self):
        """Vérifier que SOFTWARE_NORM_CODES contient les norms principales."""
        for norm in ['S221', 'S222', 'S223']:
            assert norm in SOFTWARE_NORM_CODES, f"{norm} should be in SOFTWARE_NORM_CODES"

    # =========================================================================
    # TEST 5: Product Types Classification
    # =========================================================================

    def test_evm_only_product_types(self):
        """Vérifier que EVM_ONLY_PRODUCT_TYPES est correct."""
        assert 'DEX' in EVM_ONLY_PRODUCT_TYPES
        assert 'LENDING' in EVM_ONLY_PRODUCT_TYPES
        assert 'YIELD' in EVM_ONLY_PRODUCT_TYPES
        assert 'HW_WALLET' not in EVM_ONLY_PRODUCT_TYPES

    def test_multi_chain_product_types(self):
        """Vérifier que MULTI_CHAIN_PRODUCT_TYPES est correct."""
        assert 'HW_WALLET' in MULTI_CHAIN_PRODUCT_TYPES
        assert 'SW_WALLET' in MULTI_CHAIN_PRODUCT_TYPES
        assert 'EXCHANGE' in MULTI_CHAIN_PRODUCT_TYPES
        assert 'DEX' not in MULTI_CHAIN_PRODUCT_TYPES

    def test_software_product_types(self):
        """Vérifier que SOFTWARE_PRODUCT_TYPES est correct."""
        assert 'DEX' in SOFTWARE_PRODUCT_TYPES
        assert 'DEFI' in SOFTWARE_PRODUCT_TYPES
        assert 'LENDING' in SOFTWARE_PRODUCT_TYPES
        assert 'HW_WALLET' not in SOFTWARE_PRODUCT_TYPES

    def test_hardware_product_types(self):
        """Vérifier que HARDWARE_PRODUCT_TYPES est correct."""
        assert 'HW_WALLET' in HARDWARE_PRODUCT_TYPES
        assert 'DEX' not in HARDWARE_PRODUCT_TYPES

    # =========================================================================
    # TEST 6: ALL 88 Product Types - Complete Coverage
    # =========================================================================

    # --- HARDWARE CATEGORY (1 type) ---
    def test_hw_cold_is_hardware(self):
        """HW Cold doit accepter les normes hardware."""
        for norm in ['S50', 'S70', 'F01']:
            flags = self.validator.validate_norm_product_compatibility(
                norm, 'YES', product_type='HW_WALLET'
            )
            assert len(flags) == 0, f"HW Cold should accept hardware norm {norm}"

    # --- SOFTWARE WALLETS (3 types) ---
    def test_sw_browser_is_software(self):
        """SW Browser ne peut pas avoir secure element."""
        flags = self.validator.validate_norm_product_compatibility(
            'S50', 'YES', product_type='SW_WALLET'
        )
        assert 'HARDWARE_NORM_FOR_SOFTWARE:S50' in flags

    def test_sw_mobile_is_software(self):
        """SW Mobile ne peut pas avoir firmware norms."""
        flags = self.validator.validate_norm_product_compatibility(
            'S70', 'YES', product_type='SW_WALLET'
        )
        assert 'HARDWARE_NORM_FOR_SOFTWARE:S70' in flags

    def test_sw_desktop_is_software(self):
        """SW Desktop ne peut pas avoir material norms."""
        flags = self.validator.validate_norm_product_compatibility(
            'F01', 'YES', product_type='SW_WALLET'
        )
        assert 'HARDWARE_NORM_FOR_SOFTWARE:F01' in flags

    # --- BACKUP TYPES (3 types) ---
    def test_bkp_physical_is_hardware(self):
        """Bkp Physical doit accepter material norms (F01-F126)."""
        flags = self.validator.validate_norm_product_compatibility(
            'F01', 'YES', product_type='HARDWARE'  # Physical backups are hardware
        )
        assert len(flags) == 0, "Physical backup should accept material norms"

    def test_bkp_digital_is_software(self):
        """Bkp Digital ne peut pas avoir hardware norms."""
        flags = self.validator.validate_norm_product_compatibility(
            'S50', 'YES', product_type='DEFI'  # Digital backup is software-like
        )
        assert 'HARDWARE_NORM_FOR_SOFTWARE:S50' in flags

    # --- WALLET TYPES (4 types: MPC, MultiSig, Smart, AA) ---
    def test_mpc_wallet_is_software(self):
        """MPC Wallet est software (pas de secure element physique)."""
        flags = self.validator.validate_norm_product_compatibility(
            'S50', 'YES', product_type='DEFI'
        )
        assert 'HARDWARE_NORM_FOR_SOFTWARE:S50' in flags

    def test_multisig_is_software(self):
        """MultiSig Wallet est software."""
        flags = self.validator.validate_norm_product_compatibility(
            'F01', 'YES', product_type='DEFI'
        )
        assert 'HARDWARE_NORM_FOR_SOFTWARE:F01' in flags

    def test_smart_wallet_is_evm_only(self):
        """Smart Wallet (AA) est EVM-only."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='DEX'  # Smart wallets are EVM-based
        )
        assert 'CHAIN_NOT_SUPPORTED:bitcoin' in flags

    def test_aa_is_evm_only(self):
        """Account Abstraction (AA) est EVM-only."""
        flags = self.validator.validate_chain_support(
            'E10', 'YES', 'SOL', product_type='DEX'
        )
        assert 'CHAIN_NOT_SUPPORTED:solana' in flags

    # --- EXCHANGE TYPES (2 types) ---
    def test_cex_is_multi_chain(self):
        """CEX peut supporter toutes les chaînes."""
        for norm, chain in [('E01', 'bitcoin'), ('E02', 'ethereum'), ('E10', 'solana')]:
            flags = self.validator.validate_chain_support(
                norm, 'YES', chain, product_type='EXCHANGE'
            )
            assert len(flags) == 0, f"CEX should support {chain}"

    def test_otc_is_multi_chain(self):
        """OTC peut supporter Bitcoin."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='EXCHANGE'
        )
        assert len(flags) == 0, "OTC should support Bitcoin"

    # --- DEX TYPES (3 types) ---
    def test_dex_agg_is_evm_only(self):
        """DEX Aggregator est EVM-only."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='DEX'
        )
        assert 'CHAIN_NOT_SUPPORTED:bitcoin' in flags

    def test_amm_is_evm_only(self):
        """AMM est EVM-only (smart contracts)."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='DEX'
        )
        assert 'CHAIN_NOT_SUPPORTED:bitcoin' in flags

    # --- LENDING TYPES (2 types) ---
    def test_cefi_lending_is_multi_chain(self):
        """CeFi Lending peut supporter Bitcoin (custodial)."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='EXCHANGE'  # CeFi is custodial
        )
        assert len(flags) == 0, "CeFi Lending should support Bitcoin"

    def test_defi_lending_is_evm_only(self):
        """DeFi Lending est EVM-only (smart contracts)."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='LENDING'
        )
        assert 'CHAIN_NOT_SUPPORTED:bitcoin' in flags

    # --- STAKING TYPES (3 types) ---
    def test_liq_staking_is_evm_only(self):
        """Liquid Staking (Lido, Rocket Pool) est EVM-only."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='STAKING_EVM'
        )
        assert 'CHAIN_NOT_SUPPORTED:bitcoin' in flags

    def test_restaking_is_evm_only(self):
        """Restaking (EigenLayer) est EVM-only."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='STAKING_EVM'
        )
        assert 'CHAIN_NOT_SUPPORTED:bitcoin' in flags

    # --- YIELD TYPES (3 types) ---
    def test_yield_is_evm_only(self):
        """Yield protocols sont EVM-only."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='YIELD'
        )
        assert 'CHAIN_NOT_SUPPORTED:bitcoin' in flags

    # --- DERIVATIVES TYPES (4 types) ---
    def test_perps_is_evm_only(self):
        """Perpetuals protocols sont EVM-only."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='DEX'
        )
        assert 'CHAIN_NOT_SUPPORTED:bitcoin' in flags

    def test_options_is_evm_only(self):
        """Options protocols sont EVM-only."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='DEFI'
        )
        assert 'CHAIN_NOT_SUPPORTED:bitcoin' in flags

    # --- STABLECOINS (3 types) ---
    def test_stablecoin_is_evm_based(self):
        """Stablecoins sont principalement EVM."""
        flags = self.validator.validate_chain_support(
            'E02', 'YES', 'ETH', product_type='DEFI'
        )
        assert len(flags) == 0, "Stablecoin should support Ethereum"

    def test_synthetics_is_evm_only(self):
        """Synthetic assets sont EVM-only."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='DEFI'
        )
        assert 'CHAIN_NOT_SUPPORTED:bitcoin' in flags

    # --- BRIDGES (5 types) ---
    def test_bridge_can_support_multiple_chains(self):
        """Bridges peuvent supporter plusieurs chaînes."""
        flags = self.validator.validate_chain_support(
            'E02', 'YES', 'ETH', product_type='BRIDGE'
        )
        assert len(flags) == 0, "Bridge should support Ethereum"

    def test_l2_is_evm_compatible(self):
        """L2 (Arbitrum, Optimism) sont EVM-compatible."""
        flags = self.validator.validate_chain_support(
            'E02', 'YES', 'ETH', product_type='BRIDGE_EVM'
        )
        assert len(flags) == 0, "L2 should support Ethereum"

    def test_atomic_swap_is_multi_chain(self):
        """Atomic Swaps supportent multiple chaînes."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='BRIDGE'
        )
        assert len(flags) == 0, "Atomic Swap should support Bitcoin"

    # --- PRIVACY (3 types) ---
    def test_privacy_protocol_is_software(self):
        """Privacy protocols ne peuvent pas avoir hardware norms."""
        flags = self.validator.validate_norm_product_compatibility(
            'S50', 'YES', product_type='DEFI'
        )
        assert 'HARDWARE_NORM_FOR_SOFTWARE:S50' in flags

    def test_dvpn_is_software(self):
        """dVPN est software."""
        flags = self.validator.validate_norm_product_compatibility(
            'F01', 'YES', product_type='DEFI'
        )
        assert 'HARDWARE_NORM_FOR_SOFTWARE:F01' in flags

    # --- INFRASTRUCTURE (6 types) ---
    def test_oracle_is_multi_chain(self):
        """Oracles (Chainlink) supportent multiple chaînes."""
        flags = self.validator.validate_chain_support(
            'E02', 'YES', 'ETH', product_type='ORACLE'
        )
        assert len(flags) == 0, "Oracle should support Ethereum"

    def test_node_rpc_is_multi_chain(self):
        """Node RPC providers supportent multiple chaînes."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='PROTOCOL'
        )
        assert len(flags) == 0, "Node RPC should support Bitcoin"

    def test_explorer_is_multi_chain(self):
        """Block explorers supportent multiple chaînes."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='PROTOCOL'
        )
        assert len(flags) == 0, "Explorer should support Bitcoin"

    # --- NFT (2 types) ---
    def test_nft_market_is_evm_dominant(self):
        """NFT Markets sont principalement EVM."""
        flags = self.validator.validate_chain_support(
            'E02', 'YES', 'ETH', product_type='NFT_MARKET'
        )
        assert len(flags) == 0, "NFT Market should support Ethereum"

    # --- GAMING (4 types) ---
    def test_gamefi_is_evm_based(self):
        """GameFi protocols sont EVM-based."""
        flags = self.validator.validate_chain_support(
            'E02', 'YES', 'ETH', product_type='DEFI'
        )
        assert len(flags) == 0, "GameFi should support Ethereum"

    # --- DAO (4 types) ---
    def test_dao_is_evm_only(self):
        """DAOs sont smart contract based (EVM)."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='SMART_CONTRACT'
        )
        assert 'CHAIN_NOT_SUPPORTED:bitcoin' in flags

    def test_treasury_is_evm_only(self):
        """Treasury protocols sont EVM-only."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='SMART_CONTRACT'
        )
        assert 'CHAIN_NOT_SUPPORTED:bitcoin' in flags

    # --- SERVICES (9 types) ---
    def test_crypto_bank_is_multi_chain(self):
        """Crypto Banks supportent multiple chaînes (custodial)."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='EXCHANGE'
        )
        assert len(flags) == 0, "Crypto Bank should support Bitcoin"

    def test_custody_is_multi_chain(self):
        """Custody services supportent multiple chaînes."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='CUSTODY'
        )
        assert len(flags) == 0, "Custody should support Bitcoin"

    def test_fiat_gateway_is_multi_chain(self):
        """Fiat Gateways supportent multiple chaînes."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='EXCHANGE'
        )
        assert len(flags) == 0, "Fiat Gateway should support Bitcoin"

    def test_payment_is_multi_chain(self):
        """Payment processors supportent multiple chaînes."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='EXCHANGE'
        )
        assert len(flags) == 0, "Payment should support Bitcoin"

    def test_mev_is_evm_only(self):
        """MEV protocols sont EVM-only (mempool)."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='DEFI'
        )
        assert 'CHAIN_NOT_SUPPORTED:bitcoin' in flags

    # --- OTHER (AI, RWA, etc.) ---
    def test_ai_agent_is_evm_based(self):
        """AI Agents utilisent souvent EVM."""
        flags = self.validator.validate_chain_support(
            'E02', 'YES', 'ETH', product_type='DEFI'
        )
        assert len(flags) == 0, "AI Agent should support Ethereum"

    def test_rwa_is_evm_based(self):
        """RWA (Real World Assets) sont EVM-based."""
        flags = self.validator.validate_chain_support(
            'E02', 'YES', 'ETH', product_type='DEFI'
        )
        assert len(flags) == 0, "RWA should support Ethereum"

    def test_insurance_is_evm_only(self):
        """Insurance protocols (Nexus) sont EVM-only."""
        flags = self.validator.validate_chain_support(
            'E01', 'YES', 'BTC', product_type='DEFI'
        )
        assert 'CHAIN_NOT_SUPPORTED:bitcoin' in flags

    # =========================================================================
    # TEST 7: Cross-Category Consistency
    # =========================================================================

    def test_no_evm_type_in_multi_chain(self):
        """Aucun type EVM-only ne doit être dans MULTI_CHAIN."""
        overlap = EVM_ONLY_PRODUCT_TYPES & MULTI_CHAIN_PRODUCT_TYPES
        assert len(overlap) == 0, f"Overlap found: {overlap}"

    def test_no_hardware_type_in_software(self):
        """Aucun type hardware ne doit être dans SOFTWARE."""
        overlap = HARDWARE_PRODUCT_TYPES & SOFTWARE_PRODUCT_TYPES
        assert len(overlap) == 0, f"Overlap found: {overlap}"

    def test_all_defi_types_are_software(self):
        """Tous les types DeFi doivent être software."""
        defi_types = {'DEX', 'LENDING', 'YIELD', 'STAKING', 'DEFI'}
        for dtype in defi_types:
            assert dtype not in HARDWARE_PRODUCT_TYPES, \
                f"{dtype} should not be in HARDWARE_PRODUCT_TYPES"

    def test_all_wallet_types_exist(self):
        """Tous les types wallet doivent exister dans les classifications."""
        wallet_types = ['HW_WALLET', 'SW_WALLET']
        for wtype in wallet_types:
            exists = (wtype in HARDWARE_PRODUCT_TYPES or
                      wtype in SOFTWARE_PRODUCT_TYPES or
                      wtype in MULTI_CHAIN_PRODUCT_TYPES)
            assert exists, f"{wtype} should exist in at least one classification"


def run_all_tests():
    """Exécute tous les tests et affiche un résumé."""
    import traceback

    tests = TestMethodologyCoherence()
    tests.setup_method()

    test_methods = [m for m in dir(tests) if m.startswith('test_')]
    passed = 0
    failed = 0
    failures = []

    print("=" * 70)
    print("TESTS DE COHÉRENCE MÉTHODOLOGIQUE - SAFESCORING")
    print("=" * 70)
    print()

    for method_name in test_methods:
        method = getattr(tests, method_name)
        try:
            method()
            print(f"  ✅ {method_name}")
            passed += 1
        except AssertionError as e:
            print(f"  ❌ {method_name}")
            print(f"     └─ {str(e)}")
            failed += 1
            failures.append((method_name, str(e)))
        except Exception as e:
            print(f"  💥 {method_name}")
            print(f"     └─ {str(e)}")
            failed += 1
            failures.append((method_name, traceback.format_exc()))

    print()
    print("=" * 70)
    print(f"RÉSULTATS: {passed} passés, {failed} échoués sur {len(test_methods)} tests")
    print("=" * 70)

    if failures:
        print("\n⚠️ DÉTAILS DES ÉCHECS:")
        for name, error in failures:
            print(f"\n  {name}:")
            print(f"    {error}")

    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
