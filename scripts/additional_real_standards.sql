-- Additional Real Standards to Add
-- Generated: 2026-01-17T13:37:33.678570
-- Total: 181 standards


-- ===== PILLAR S =====

-- Category: BIP
INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-011', 'S', 'BIP-11: M-of-N Standard Transactions', 'https://github.com/bitcoin/bips/blob/master/bip-0011.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-013', 'S', 'BIP-13: Address Format for pay-to-script-hash', 'https://github.com/bitcoin/bips/blob/master/bip-0013.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-016', 'S', 'BIP-16: Pay to Script Hash', 'https://github.com/bitcoin/bips/blob/master/bip-0016.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-021', 'S', 'BIP-21: URI Scheme', 'https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-038', 'S', 'BIP-38: Passphrase-protected private key', 'https://github.com/bitcoin/bips/blob/master/bip-0038.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-043', 'S', 'BIP-43: Purpose Field for Deterministic Wallets', 'https://github.com/bitcoin/bips/blob/master/bip-0043.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-045', 'S', 'BIP-45: Structure for Deterministic P2SH Multisig', 'https://github.com/bitcoin/bips/blob/master/bip-0045.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-047', 'S', 'BIP-47: Reusable Payment Codes', 'https://github.com/bitcoin/bips/blob/master/bip-0047.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-049', 'S', 'BIP-49: Derivation for P2WPKH-nested-in-P2SH', 'https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-067', 'S', 'BIP-67: Deterministic P2SH Multisig Addresses', 'https://github.com/bitcoin/bips/blob/master/bip-0067.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-068', 'S', 'BIP-68: Relative lock-time using consensus', 'https://github.com/bitcoin/bips/blob/master/bip-0068.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-069', 'S', 'BIP-69: Lexicographical Indexing of Transaction Inputs/Outputs', 'https://github.com/bitcoin/bips/blob/master/bip-0069.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-078', 'S', 'BIP-78: A Simple Payjoin Proposal', 'https://github.com/bitcoin/bips/blob/master/bip-0078.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-085', 'S', 'BIP-85: Deterministic Entropy From BIP32 Keychains', 'https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-086', 'S', 'BIP-86: Key Derivation for Single Key P2TR Outputs', 'https://github.com/bitcoin/bips/blob/master/bip-0086.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-118', 'S', 'BIP-118: SIGHASH_ANYPREVOUT', 'https://github.com/bitcoin/bips/blob/master/bip-0118.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-119', 'S', 'BIP-119: CHECKTEMPLATEVERIFY', 'https://github.com/bitcoin/bips/blob/master/bip-0119.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-125', 'S', 'BIP-125: Replace-by-fee signaling', 'https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-141', 'S', 'BIP-141: Segregated Witness', 'https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-143', 'S', 'BIP-143: Transaction Signature Verification for SegWit', 'https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-144', 'S', 'BIP-144: Segregated Witness Peer Services', 'https://github.com/bitcoin/bips/blob/master/bip-0144.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-155', 'S', 'BIP-155: addrv2 message', 'https://github.com/bitcoin/bips/blob/master/bip-0155.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-157', 'S', 'BIP-157: Client Side Block Filtering', 'https://github.com/bitcoin/bips/blob/master/bip-0157.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-158', 'S', 'BIP-158: Compact Block Filters for Light Clients', 'https://github.com/bitcoin/bips/blob/master/bip-0158.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-173', 'S', 'BIP-173: Bech32 Address Format', 'https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-322', 'S', 'BIP-322: Generic Signed Message Format', 'https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-324', 'S', 'BIP-324: Version 2 P2P Encrypted Transport', 'https://github.com/bitcoin/bips/blob/master/bip-0324.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-325', 'S', 'BIP-325: Signet', 'https://github.com/bitcoin/bips/blob/master/bip-0325.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-327', 'S', 'BIP-327: MuSig2 for BIP340 Public Keys', 'https://github.com/bitcoin/bips/blob/master/bip-0327.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-329', 'S', 'BIP-329: Wallet Labels Export Format', 'https://github.com/bitcoin/bips/blob/master/bip-0329.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-350', 'S', 'BIP-350: Bech32m Format for v1+ Witness Addresses', 'https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-352', 'S', 'BIP-352: Silent Payments', 'https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-370', 'S', 'BIP-370: PSBT Version 2', 'https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-371', 'S', 'BIP-371: Taproot Fields for PSBT', 'https://github.com/bitcoin/bips/blob/master/bip-0371.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-380', 'S', 'BIP-380: Output Script Descriptors General Operation', 'https://github.com/bitcoin/bips/blob/master/bip-0380.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-381', 'S', 'BIP-381: Non-Segwit Output Script Descriptors', 'https://github.com/bitcoin/bips/blob/master/bip-0381.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-382', 'S', 'BIP-382: Segwit Output Script Descriptors', 'https://github.com/bitcoin/bips/blob/master/bip-0382.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-383', 'S', 'BIP-383: Multisig Output Script Descriptors', 'https://github.com/bitcoin/bips/blob/master/bip-0383.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-384', 'S', 'BIP-384: combo() Output Script Descriptors', 'https://github.com/bitcoin/bips/blob/master/bip-0384.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-385', 'S', 'BIP-385: raw() and addr() Output Script Descriptors', 'https://github.com/bitcoin/bips/blob/master/bip-0385.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-BIP-386', 'S', 'BIP-386: tr() Output Script Descriptors', 'https://github.com/bitcoin/bips/blob/master/bip-0386.mediawiki',
        'BIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

-- Category: EIP
INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-155', 'S', 'EIP-155: Replay Attack Protection', 'https://eips.ethereum.org/EIPS/eip-155',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-191', 'S', 'EIP-191: Signed Data Standard', 'https://eips.ethereum.org/EIPS/eip-191',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-681', 'S', 'EIP-681: URL Format for Transaction Requests', 'https://eips.ethereum.org/EIPS/eip-681',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-1014', 'S', 'EIP-1014: CREATE2 opcode', 'https://eips.ethereum.org/EIPS/eip-1014',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-1271', 'S', 'EIP-1271: Standard Signature Validation for Contracts', 'https://eips.ethereum.org/EIPS/eip-1271',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-2098', 'S', 'EIP-2098: Compact Signature Representation', 'https://eips.ethereum.org/EIPS/eip-2098',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-2535', 'S', 'EIP-2535: Diamonds, Multi-Facet Proxy', 'https://eips.ethereum.org/EIPS/eip-2535',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-2612', 'S', 'EIP-2612: Permit Extension for ERC-20', 'https://eips.ethereum.org/EIPS/eip-2612',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-2718', 'S', 'EIP-2718: Typed Transaction Envelope', 'https://eips.ethereum.org/EIPS/eip-2718',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-2930', 'S', 'EIP-2930: Access List Transaction', 'https://eips.ethereum.org/EIPS/eip-2930',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-3074', 'S', 'EIP-3074: AUTH and AUTHCALL opcodes', 'https://eips.ethereum.org/EIPS/eip-3074',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-3156', 'S', 'EIP-3156: Flash Loans', 'https://eips.ethereum.org/EIPS/eip-3156',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-3525', 'S', 'EIP-3525: Semi-Fungible Token', 'https://eips.ethereum.org/EIPS/eip-3525',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-3668', 'S', 'EIP-3668: CCIP Read: Secure offchain data retrieval', 'https://eips.ethereum.org/EIPS/eip-3668',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-4361', 'S', 'EIP-4361: Sign-In with Ethereum', 'https://eips.ethereum.org/EIPS/eip-4361',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-4626', 'S', 'EIP-4626: Tokenized Vault Standard', 'https://eips.ethereum.org/EIPS/eip-4626',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-4844', 'S', 'EIP-4844: Proto-Danksharding', 'https://eips.ethereum.org/EIPS/eip-4844',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-5267', 'S', 'EIP-5267: Retrieval of EIP-712 domain', 'https://eips.ethereum.org/EIPS/eip-5267',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-5792', 'S', 'EIP-5792: Wallet Call API', 'https://eips.ethereum.org/EIPS/eip-5792',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-6492', 'S', 'EIP-6492: Signature Validation for Pre-deployed Contracts', 'https://eips.ethereum.org/EIPS/eip-6492',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-6900', 'S', 'EIP-6900: Modular Smart Contract Accounts', 'https://eips.ethereum.org/EIPS/eip-6900',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-7002', 'S', 'EIP-7002: Execution layer triggerable withdrawals', 'https://eips.ethereum.org/EIPS/eip-7002',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-7201', 'S', 'EIP-7201: Namespaced Storage Layout', 'https://eips.ethereum.org/EIPS/eip-7201',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-7251', 'S', 'EIP-7251: Increase MAX_EFFECTIVE_BALANCE', 'https://eips.ethereum.org/EIPS/eip-7251',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-7412', 'S', 'EIP-7412: On-Demand Offchain Data Retrieval', 'https://eips.ethereum.org/EIPS/eip-7412',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-7579', 'S', 'EIP-7579: Minimal Modular Smart Accounts', 'https://eips.ethereum.org/EIPS/eip-7579',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-EIP-7702', 'S', 'EIP-7702: Set EOA account code', 'https://eips.ethereum.org/EIPS/eip-7702',
        'EIP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

-- Category: NIST
INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-NIST-800-38A', 'S', 'NIST SP 800-38A: Block Cipher Modes', 'https://csrc.nist.gov/publications/detail/sp/800-38a/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-NIST-800-38B', 'S', 'NIST SP 800-38B: CMAC Mode', 'https://csrc.nist.gov/publications/detail/sp/800-38b/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-NIST-800-38C', 'S', 'NIST SP 800-38C: CCM Mode', 'https://csrc.nist.gov/publications/detail/sp/800-38c/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-NIST-800-38D', 'S', 'NIST SP 800-38D: GCM Mode', 'https://csrc.nist.gov/publications/detail/sp/800-38d/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-NIST-800-38E', 'S', 'NIST SP 800-38E: XTS-AES Mode', 'https://csrc.nist.gov/publications/detail/sp/800-38e/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-NIST-800-38F', 'S', 'NIST SP 800-38F: Key Wrap', 'https://csrc.nist.gov/publications/detail/sp/800-38f/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-NIST-800-53', 'S', 'NIST SP 800-53: Security and Privacy Controls', 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-NIST-800-56A', 'S', 'NIST SP 800-56A: Key Agreement', 'https://csrc.nist.gov/publications/detail/sp/800-56a/rev-3/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-NIST-800-56B', 'S', 'NIST SP 800-56B: Key Encapsulation', 'https://csrc.nist.gov/publications/detail/sp/800-56b/rev-2/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-NIST-800-56C', 'S', 'NIST SP 800-56C: Key Derivation Methods', 'https://csrc.nist.gov/publications/detail/sp/800-56c/rev-2/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-NIST-800-63A', 'S', 'NIST SP 800-63A: Enrollment and Identity Proofing', 'https://csrc.nist.gov/publications/detail/sp/800-63a/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-NIST-800-63B', 'S', 'NIST SP 800-63B: Authentication and Lifecycle', 'https://csrc.nist.gov/publications/detail/sp/800-63b/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-NIST-800-63C', 'S', 'NIST SP 800-63C: Federation and Assertions', 'https://csrc.nist.gov/publications/detail/sp/800-63c/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-NIST-800-90B', 'S', 'NIST SP 800-90B: Entropy Sources', 'https://csrc.nist.gov/publications/detail/sp/800-90b/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-NIST-800-107', 'S', 'NIST SP 800-107: Hash Applications', 'https://csrc.nist.gov/publications/detail/sp/800-107/rev-1/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-NIST-800-108', 'S', 'NIST SP 800-108: Key Derivation Using Pseudorandom Functions', 'https://csrc.nist.gov/publications/detail/sp/800-108/rev-1/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-NIST-800-131A', 'S', 'NIST SP 800-131A: Transitioning Cryptographic Algorithms', 'https://csrc.nist.gov/publications/detail/sp/800-131a/rev-2/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-NIST-800-133', 'S', 'NIST SP 800-133: Recommendation for Cryptographic Key Generation', 'https://csrc.nist.gov/publications/detail/sp/800-133/rev-2/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-NIST-800-186', 'S', 'NIST SP 800-186: Elliptic Curves', 'https://csrc.nist.gov/publications/detail/sp/800-186/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-FIPS-180', 'S', 'FIPS 180-4: Secure Hash Standard', 'https://csrc.nist.gov/publications/detail/fips/180/4/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-FIPS-186', 'S', 'FIPS 186-5: Digital Signature Standard', 'https://csrc.nist.gov/publications/detail/fips/186/5/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-FIPS-197', 'S', 'FIPS 197: Advanced Encryption Standard', 'https://csrc.nist.gov/publications/detail/fips/197/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-FIPS-198', 'S', 'FIPS 198-1: HMAC Standard', 'https://csrc.nist.gov/publications/detail/fips/198/1/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-FIPS-202', 'S', 'FIPS 202: SHA-3 Standard', 'https://csrc.nist.gov/publications/detail/fips/202/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-FIPS-203', 'S', 'FIPS 203: ML-KEM (Kyber)', 'https://csrc.nist.gov/pubs/fips/203/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-FIPS-204', 'S', 'FIPS 204: ML-DSA (Dilithium)', 'https://csrc.nist.gov/pubs/fips/204/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-FIPS-205', 'S', 'FIPS 205: SLH-DSA (SPHINCS+)', 'https://csrc.nist.gov/pubs/fips/205/final',
        'NIST', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

-- Category: RFC
INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-2104', 'S', 'RFC 2104: HMAC', 'https://datatracker.ietf.org/doc/html/rfc2104',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-3447', 'S', 'RFC 3447: PKCS #1 RSA', 'https://datatracker.ietf.org/doc/html/rfc3447',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-4648', 'S', 'RFC 4648: Base Encodings', 'https://datatracker.ietf.org/doc/html/rfc4648',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-5116', 'S', 'RFC 5116: AEAD Interface', 'https://datatracker.ietf.org/doc/html/rfc5116',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-5208', 'S', 'RFC 5208: PKCS #8', 'https://datatracker.ietf.org/doc/html/rfc5208',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-5639', 'S', 'RFC 5639: Brainpool Curves', 'https://datatracker.ietf.org/doc/html/rfc5639',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-5652', 'S', 'RFC 5652: CMS', 'https://datatracker.ietf.org/doc/html/rfc5652',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-5915', 'S', 'RFC 5915: EC Private Key Structure', 'https://datatracker.ietf.org/doc/html/rfc5915',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-5958', 'S', 'RFC 5958: Asymmetric Key Packages', 'https://datatracker.ietf.org/doc/html/rfc5958',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-6090', 'S', 'RFC 6090: Fundamental Elliptic Curve Cryptography', 'https://datatracker.ietf.org/doc/html/rfc6090',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-6238', 'S', 'RFC 6238: TOTP', 'https://datatracker.ietf.org/doc/html/rfc6238',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-7539', 'S', 'RFC 7539: ChaCha20-Poly1305', 'https://datatracker.ietf.org/doc/html/rfc7539',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-7693', 'S', 'RFC 7693: BLAKE2', 'https://datatracker.ietf.org/doc/html/rfc7693',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-7748', 'S', 'RFC 7748: X25519/X448', 'https://datatracker.ietf.org/doc/html/rfc7748',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-8017', 'S', 'RFC 8017: PKCS #1 v2.2', 'https://datatracker.ietf.org/doc/html/rfc8017',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-8152', 'S', 'RFC 8152: COSE', 'https://datatracker.ietf.org/doc/html/rfc8152',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-8439', 'S', 'RFC 8439: ChaCha20-Poly1305 for IETF', 'https://datatracker.ietf.org/doc/html/rfc8439',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-8812', 'S', 'RFC 8812: CBOR Object Signing (secp256k1)', 'https://datatracker.ietf.org/doc/html/rfc8812',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-9053', 'S', 'RFC 9053: COSE Algorithms', 'https://datatracker.ietf.org/doc/html/rfc9053',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-9180', 'S', 'RFC 9180: HPKE', 'https://datatracker.ietf.org/doc/html/rfc9180',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-9381', 'S', 'RFC 9381: VRF', 'https://datatracker.ietf.org/doc/html/rfc9381',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('S-RFC-9496', 'S', 'RFC 9496: secp256k1 Curves', 'https://datatracker.ietf.org/doc/html/rfc9496',
        'RFC', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

-- ===== PILLAR A =====

-- Category: PRIVACY
INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('A-GDPR-12', 'A', 'GDPR Art 12: Transparent Information', 'https://gdpr-info.eu/art-12-gdpr/',
        'PRIVACY', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('A-GDPR-13', 'A', 'GDPR Art 13: Information to be Provided', 'https://gdpr-info.eu/art-13-gdpr/',
        'PRIVACY', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('A-GDPR-15', 'A', 'GDPR Art 15: Right of Access', 'https://gdpr-info.eu/art-15-gdpr/',
        'PRIVACY', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('A-GDPR-25', 'A', 'GDPR Art 25: Data Protection by Design', 'https://gdpr-info.eu/art-25-gdpr/',
        'PRIVACY', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('A-GDPR-32', 'A', 'GDPR Art 32: Security of Processing', 'https://gdpr-info.eu/art-32-gdpr/',
        'PRIVACY', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('A-GDPR-33', 'A', 'GDPR Art 33: Breach Notification', 'https://gdpr-info.eu/art-33-gdpr/',
        'PRIVACY', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('A-GDPR-35', 'A', 'GDPR Art 35: Data Protection Impact Assessment', 'https://gdpr-info.eu/art-35-gdpr/',
        'PRIVACY', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('A-CCPA-1798', 'A', 'CCPA: California Consumer Privacy Act', 'https://oag.ca.gov/privacy/ccpa',
        'PRIVACY', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('A-LGPD', 'A', 'LGPD: Brazil Data Protection Law', 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm',
        'PRIVACY', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('A-PIPL', 'A', 'PIPL: China Personal Information Protection Law', 'http://www.npc.gov.cn/npc/c30834/202108/a8c4e3672c74491a80b53a172bb753fe.shtml',
        'PRIVACY', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

-- Category: CRYPTO_REG
INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('A-MICA', 'A', 'MiCA: Markets in Crypto-Assets Regulation', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1114',
        'CRYPTO_REG', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('A-FATF-VASP', 'A', 'FATF VASP Guidelines', 'https://www.fatf-gafi.org/en/topics/virtual-assets.html',
        'CRYPTO_REG', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('A-DORA', 'A', 'DORA: Digital Operational Resilience Act', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2554',
        'CRYPTO_REG', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('A-CRA', 'A', 'Cyber Resilience Act (EU)', 'https://digital-strategy.ec.europa.eu/en/policies/cyber-resilience-act',
        'CRYPTO_REG', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

-- Category: PHYSICAL
INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('A-IP67', 'A', 'IP67: Dust and Water Protection', 'https://www.iec.ch/ip-ratings',
        'PHYSICAL', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('A-IP68', 'A', 'IP68: Continuous Water Submersion', 'https://www.iec.ch/ip-ratings',
        'PHYSICAL', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('A-MIL-810G', 'A', 'MIL-STD-810G: Environmental Engineering', 'https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=35978',
        'PHYSICAL', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('A-MIL-810H', 'A', 'MIL-STD-810H: Environmental Engineering (2019)', 'https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=287225',
        'PHYSICAL', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

-- ===== PILLAR F =====

-- Category: AUDIT
INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-OWASP-TOP10', 'F', 'OWASP Top 10 Web Application Security Risks', 'https://owasp.org/www-project-top-ten/',
        'AUDIT', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-OWASP-API', 'F', 'OWASP API Security Top 10', 'https://owasp.org/www-project-api-security/',
        'AUDIT', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-OWASP-SAMM', 'F', 'OWASP SAMM: Software Assurance Maturity Model', 'https://owaspsamm.org/',
        'AUDIT', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-CIS-CONTROLS', 'F', 'CIS Critical Security Controls', 'https://www.cisecurity.org/controls',
        'AUDIT', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-SLSA', 'F', 'SLSA: Supply-chain Levels for Software Artifacts', 'https://slsa.dev/',
        'AUDIT', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-SBOM', 'F', 'Software Bill of Materials', 'https://www.cisa.gov/sbom',
        'AUDIT', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

-- Category: COMPLIANCE
INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-ISO-27001', 'F', 'ISO/IEC 27001: Information Security Management', 'https://www.iso.org/standard/27001',
        'COMPLIANCE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-ISO-27002', 'F', 'ISO/IEC 27002: Security Controls', 'https://www.iso.org/standard/75652.html',
        'COMPLIANCE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-ISO-27017', 'F', 'ISO/IEC 27017: Cloud Security', 'https://www.iso.org/standard/43757.html',
        'COMPLIANCE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-ISO-27018', 'F', 'ISO/IEC 27018: Cloud Privacy', 'https://www.iso.org/standard/76559.html',
        'COMPLIANCE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-ISO-27701', 'F', 'ISO/IEC 27701: Privacy Information Management', 'https://www.iso.org/standard/71670.html',
        'COMPLIANCE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-ISO-22301', 'F', 'ISO 22301: Business Continuity', 'https://www.iso.org/standard/75106.html',
        'COMPLIANCE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-SOC1', 'F', 'SOC 1 Type II', 'https://us.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome',
        'COMPLIANCE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-SOC2', 'F', 'SOC 2 Type II', 'https://us.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome',
        'COMPLIANCE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-SOC3', 'F', 'SOC 3', 'https://us.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome',
        'COMPLIANCE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-PCI-DSS', 'F', 'PCI DSS v4.0', 'https://www.pcisecuritystandards.org/',
        'COMPLIANCE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

-- Category: HARDWARE
INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-CC-EAL1', 'F', 'Common Criteria EAL1', 'https://www.commoncriteriaportal.org/cc/',
        'HARDWARE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-CC-EAL2', 'F', 'Common Criteria EAL2', 'https://www.commoncriteriaportal.org/cc/',
        'HARDWARE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-CC-EAL3', 'F', 'Common Criteria EAL3', 'https://www.commoncriteriaportal.org/cc/',
        'HARDWARE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-CC-EAL4', 'F', 'Common Criteria EAL4', 'https://www.commoncriteriaportal.org/cc/',
        'HARDWARE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-CC-EAL5', 'F', 'Common Criteria EAL5+', 'https://www.commoncriteriaportal.org/cc/',
        'HARDWARE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-CC-EAL6', 'F', 'Common Criteria EAL6+', 'https://www.commoncriteriaportal.org/cc/',
        'HARDWARE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-FIPS-140-2', 'F', 'FIPS 140-2 Level 1-4', 'https://csrc.nist.gov/projects/cryptographic-module-validation-program',
        'HARDWARE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-FIPS-140-3', 'F', 'FIPS 140-3', 'https://csrc.nist.gov/projects/cryptographic-module-validation-program',
        'HARDWARE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-FIDO2', 'F', 'FIDO2/WebAuthn Certification', 'https://fidoalliance.org/certification/',
        'HARDWARE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-EMV', 'F', 'EMVCo Certification', 'https://www.emvco.com/',
        'HARDWARE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('F-GP', 'F', 'GlobalPlatform Certification', 'https://globalplatform.org/',
        'HARDWARE', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

-- ===== PILLAR E =====

-- Category: TOKEN
INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('E-ERC-20', 'E', 'ERC-20: Fungible Token Standard', 'https://eips.ethereum.org/EIPS/eip-20',
        'TOKEN', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('E-ERC-721', 'E', 'ERC-721: Non-Fungible Token Standard', 'https://eips.ethereum.org/EIPS/eip-721',
        'TOKEN', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('E-ERC-777', 'E', 'ERC-777: Token Standard with Hooks', 'https://eips.ethereum.org/EIPS/eip-777',
        'TOKEN', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('E-ERC-1155', 'E', 'ERC-1155: Multi Token Standard', 'https://eips.ethereum.org/EIPS/eip-1155',
        'TOKEN', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('E-ERC-2981', 'E', 'ERC-2981: NFT Royalty Standard', 'https://eips.ethereum.org/EIPS/eip-2981',
        'TOKEN', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('E-ERC-4907', 'E', 'ERC-4907: Rentable NFT Standard', 'https://eips.ethereum.org/EIPS/eip-4907',
        'TOKEN', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('E-ERC-5192', 'E', 'ERC-5192: Minimal Soulbound NFTs', 'https://eips.ethereum.org/EIPS/eip-5192',
        'TOKEN', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('E-ERC-6551', 'E', 'ERC-6551: Token Bound Accounts', 'https://eips.ethereum.org/EIPS/eip-6551',
        'TOKEN', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('E-BEP-20', 'E', 'BEP-20: Binance Smart Chain Token', 'https://github.com/bnb-chain/BEPs/blob/master/BEPs/BEP20.md',
        'TOKEN', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('E-SPL', 'E', 'SPL Token: Solana Token Standard', 'https://spl.solana.com/token',
        'TOKEN', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

-- Category: ACCESSIBILITY
INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('E-WCAG-21', 'E', 'WCAG 2.1: Web Content Accessibility', 'https://www.w3.org/TR/WCAG21/',
        'ACCESSIBILITY', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('E-WCAG-22', 'E', 'WCAG 2.2: Web Content Accessibility', 'https://www.w3.org/TR/WCAG22/',
        'ACCESSIBILITY', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('E-WAI-ARIA', 'E', 'WAI-ARIA: Accessible Rich Internet Apps', 'https://www.w3.org/WAI/standards-guidelines/aria/',
        'ACCESSIBILITY', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

-- Category: INTEROP
INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('E-WC-ETH', 'E', 'WalletConnect: Ethereum', 'https://docs.walletconnect.com/',
        'INTEROP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('E-EIP-1193', 'E', 'EIP-1193: Ethereum Provider API', 'https://eips.ethereum.org/EIPS/eip-1193',
        'INTEROP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('E-EIP-6963', 'E', 'EIP-6963: Multi-Injected Provider Discovery', 'https://eips.ethereum.org/EIPS/eip-6963',
        'INTEROP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('E-CAIP-2', 'E', 'CAIP-2: Blockchain ID Specification', 'https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md',
        'INTEROP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('E-CAIP-10', 'E', 'CAIP-10: Account ID Specification', 'https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-10.md',
        'INTEROP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';

INSERT INTO norms (code, pillar, title, official_link, issuing_authority, verification_status, is_legacy)
VALUES ('E-CAIP-25', 'E', 'CAIP-25: Wallet Connection', 'https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-25.md',
        'INTEROP', 'verified', FALSE)
ON CONFLICT (code) DO UPDATE SET
    official_link = EXCLUDED.official_link,
    verification_status = 'verified';
