-- Add security level and SAFE warnings columns to compatibility tables

-- Type compatibility columns
ALTER TABLE type_compatibility
ADD COLUMN IF NOT EXISTS security_level VARCHAR(10) CHECK (security_level IN ('HIGH', 'MEDIUM', 'LOW'));

ALTER TABLE type_compatibility
ADD COLUMN IF NOT EXISTS safe_warning_s TEXT; -- Security pillar warning

ALTER TABLE type_compatibility
ADD COLUMN IF NOT EXISTS safe_warning_a TEXT; -- Adversity pillar warning

ALTER TABLE type_compatibility
ADD COLUMN IF NOT EXISTS safe_warning_f TEXT; -- Fidelity pillar warning

ALTER TABLE type_compatibility
ADD COLUMN IF NOT EXISTS safe_warning_e TEXT; -- Efficiency pillar warning

-- Product compatibility columns
ALTER TABLE product_compatibility
ADD COLUMN IF NOT EXISTS security_level VARCHAR(10) CHECK (security_level IN ('HIGH', 'MEDIUM', 'LOW'));

ALTER TABLE product_compatibility
ADD COLUMN IF NOT EXISTS safe_warning_s TEXT;

ALTER TABLE product_compatibility
ADD COLUMN IF NOT EXISTS safe_warning_a TEXT;

ALTER TABLE product_compatibility
ADD COLUMN IF NOT EXISTS safe_warning_f TEXT;

ALTER TABLE product_compatibility
ADD COLUMN IF NOT EXISTS safe_warning_e TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_type_compat_security ON type_compatibility(security_level);
CREATE INDEX IF NOT EXISTS idx_prod_compat_security ON product_compatibility(security_level);
