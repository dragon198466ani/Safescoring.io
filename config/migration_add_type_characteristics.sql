-- Migration: Add type characteristics columns to product_types
-- These columns help determine norm applicability

-- Add new columns
ALTER TABLE product_types ADD COLUMN IF NOT EXISTS is_wallet BOOLEAN DEFAULT FALSE;
ALTER TABLE product_types ADD COLUMN IF NOT EXISTS is_defi BOOLEAN DEFAULT FALSE;
ALTER TABLE product_types ADD COLUMN IF NOT EXISTS is_protocol BOOLEAN DEFAULT FALSE;
ALTER TABLE product_types ADD COLUMN IF NOT EXISTS is_physical BOOLEAN DEFAULT FALSE;

-- Update is_wallet based on type code
UPDATE product_types SET is_wallet = TRUE WHERE code IN (
    'HW Cold', 'HW Hot', 'SW Browser', 'SW Mobile', 'SW Desktop',
    'MPC Wallet', 'MultiSig', 'Smart Wallet'
);

-- Update is_defi based on category and code
UPDATE product_types SET is_defi = TRUE WHERE code IN (
    'DEX', 'DEX Agg', 'Lending', 'Yield', 'Liq Staking', 'Derivatives',
    'Bridges', 'AMM', 'Perps', 'Options', 'Synthetics', 'Restaking',
    'DeFi Tools', 'Private DeFi', 'Index'
);

-- Update is_protocol based on type (smart contract based)
UPDATE product_types SET is_protocol = TRUE WHERE code IN (
    'DEX', 'DEX Agg', 'Lending', 'Yield', 'Liq Staking', 'Derivatives',
    'Bridges', 'AMM', 'Perps', 'Options', 'Synthetics', 'Restaking',
    'DeFi Tools', 'Private DeFi', 'Index', 'Stablecoin', 'Oracle',
    'L2', 'Protocol', 'DAO', 'NFT Tools'
);

-- Update is_physical based on type
UPDATE product_types SET is_physical = TRUE WHERE code IN (
    'HW Cold', 'HW Hot', 'Bkp Physical', 'Card', 'Card Non-Cust'
);

-- Verify the updates
SELECT code, name, is_hardware, is_wallet, is_defi, is_protocol, is_physical
FROM product_types
ORDER BY code;
