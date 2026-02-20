-- ============================================================
-- Migration 091: Reclassify Environmental Norms from Adversity to Fidelity
-- ============================================================
--
-- These norms were incorrectly placed in Adversity (A) but should be
-- in Fidelity (F) because they protect against ENVIRONMENTAL factors
-- and NATURAL wear, NOT against intentional human attackers.
--
-- RULE: "Is this protecting against an INTENTIONAL attack by an adversary?"
-- NO → Fidelity (environmental, wear, accidents)
-- YES → Adversity (thieves, coercers, surveillors)
-- ============================================================

-- ============================================================
-- 1. Environmental durability norms: A → F
-- ============================================================

-- A-ADD-001: UV resistance → F (protection against SUN, not attackers)
UPDATE norms SET
    pillar = 'F',
    updated_at = NOW()
WHERE code = 'A-ADD-001';

-- A-ADD-002: Humidity 95% RH → F (protection against NATURAL humidity)
UPDATE norms SET
    pillar = 'F',
    updated_at = NOW()
WHERE code = 'A-ADD-002';

-- A-ADD-003: Altitude 15000m → F (operation at high ALTITUDE)
UPDATE norms SET
    pillar = 'F',
    updated_at = NOW()
WHERE code = 'A-ADD-003';

-- A-ADD-004: Pressure variation → F (resistance to PRESSURE changes)
UPDATE norms SET
    pillar = 'F',
    updated_at = NOW()
WHERE code = 'A-ADD-004';

-- A-ADD-005: Sand/dust IP6X → F (protection against ACCIDENTAL dust)
UPDATE norms SET
    pillar = 'F',
    updated_at = NOW()
WHERE code = 'A-ADD-005';

-- A-ADD-006: Fungus resistance → F (resistance to NATURAL fungus)
UPDATE norms SET
    pillar = 'F',
    updated_at = NOW()
WHERE code = 'A-ADD-006';

-- A-ADD-007: Salt fog resistance → F (resistance to ENVIRONMENTAL salt spray)
UPDATE norms SET
    pillar = 'F',
    updated_at = NOW()
WHERE code = 'A-ADD-007';

-- A-ADD-008: Thermal cycling → F (resistance to TEMPERATURE cycles)
UPDATE norms SET
    pillar = 'F',
    updated_at = NOW()
WHERE code = 'A-ADD-008';

-- A-ADD-009: MIL-STD-810H → F (ENVIRONMENTAL durability standard)
UPDATE norms SET
    pillar = 'F',
    updated_at = NOW()
WHERE code = 'A-ADD-009';

-- A-ADD-010: MIL-STD-202 → F (ENVIRONMENTAL test methods)
UPDATE norms SET
    pillar = 'F',
    updated_at = NOW()
WHERE code = 'A-ADD-010';

-- A-ADD-011: MIL-STD-1344 → F (ENVIRONMENTAL tests for connectors)
UPDATE norms SET
    pillar = 'F',
    updated_at = NOW()
WHERE code = 'A-ADD-011';

-- ============================================================
-- 2. These norms STAY in Adversity (anti-tamper = against attackers)
-- ============================================================
-- A-ADD-012: Tamper-evident seal → A (detects if ATTACKER opened device)
-- A-ADD-013: Holographic seal → A (detects TAMPERING by attacker)
-- A-ADD-014: Void tape → A (detects OPENING by attacker)
-- A-ADD-015: Epoxy potting → A (prevents ACCESS by attacker)
-- These are CORRECTLY classified, no changes needed.

-- ============================================================
-- 3. Also reclassify other environmental norms found in A pillar
-- ============================================================

-- Find and reclassify any other environmental norms
UPDATE norms SET
    pillar = 'F',
    updated_at = NOW()
WHERE pillar = 'A'
AND (
    -- Environmental resistance keywords
    LOWER(title) LIKE '%temperature%'
    OR LOWER(title) LIKE '%humidity%'
    OR LOWER(title) LIKE '%altitude%'
    OR LOWER(title) LIKE '%pressure%'
    OR LOWER(title) LIKE '%corrosion%'
    OR LOWER(title) LIKE '%salt fog%'
    OR LOWER(title) LIKE '%salt spray%'
    OR LOWER(title) LIKE '%fungus%'
    OR LOWER(title) LIKE '%mold%'
    OR LOWER(title) LIKE '%thermal cycling%'
    OR LOWER(title) LIKE '%thermal shock%'
    OR LOWER(title) LIKE '%uv resistance%'
    OR LOWER(title) LIKE '%ultraviolet%'
    OR LOWER(title) LIKE '%vibration%'
    OR LOWER(title) LIKE '%shock test%'
    OR LOWER(title) LIKE '%drop test%'
    OR LOWER(title) LIKE '%ip6%'
    OR LOWER(title) LIKE '%ip5%'
    OR LOWER(title) LIKE '%water resistant%'
    OR LOWER(title) LIKE '%dust resistant%'
    OR LOWER(title) LIKE '%weatherproof%'
    OR LOWER(title) LIKE '%mil-std-810%'
    OR LOWER(title) LIKE '%mil-std-202%'
    OR LOWER(title) LIKE '%mil-std-1344%'
    -- Battery/wear keywords
    OR LOWER(title) LIKE '%battery life%'
    OR LOWER(title) LIKE '%battery degradation%'
    OR LOWER(title) LIKE '%lifespan%'
    OR LOWER(title) LIKE '%wear%'
)
-- Exclude anti-tamper norms (these ARE against attackers)
AND NOT (
    LOWER(title) LIKE '%tamper%'
    OR LOWER(title) LIKE '%intrusion%'
    OR LOWER(title) LIKE '%wipe%'
    OR LOWER(title) LIKE '%self-destruct%'
    OR LOWER(title) LIKE '%duress%'
    OR LOWER(title) LIKE '%panic%'
    OR LOWER(title) LIKE '%hidden%'
    OR LOWER(title) LIKE '%decoy%'
    OR LOWER(title) LIKE '%coercion%'
);

-- ============================================================
-- 4. Update the norm codes to reflect new pillar (optional)
-- ============================================================
-- Note: We're keeping the original codes (A-ADD-xxx) for backwards
-- compatibility, but updating the pillar field to 'F'.
-- In a future migration, we could rename codes to F-ADD-xxx.

-- ============================================================
-- 5. Verification queries
-- ============================================================

-- Show reclassified norms
SELECT
    code,
    pillar,
    title,
    updated_at
FROM norms
WHERE code LIKE 'A-ADD-%'
ORDER BY code;

-- Summary of changes
SELECT
    pillar,
    COUNT(*) as norm_count
FROM norms
WHERE code LIKE 'A-ADD-%'
GROUP BY pillar
ORDER BY pillar;

-- ============================================================
-- CLASSIFICATION REFERENCE
-- ============================================================
--
-- ADVERSITY (A) - Protection against INTENTIONAL human threats:
--   ✓ Tamper-evident seal (detects if ATTACKER opened)
--   ✓ Holographic seal (detects MANIPULATION)
--   ✓ Void tape (detects OPENING by attacker)
--   ✓ Epoxy potting (prevents ACCESS by attacker)
--   ✓ Duress PIN (protection when COERCED)
--   ✓ Hidden wallet (misleads ATTACKERS)
--   ✓ Self-destruct (defeats BRUTE-FORCE attacker)
--
-- FIDELITY (F) - Protection against NON-INTENTIONAL factors:
--   ✓ UV resistance (protection against SUN)
--   ✓ Humidity resistance (NATURAL humidity)
--   ✓ Temperature tolerance (ENVIRONMENTAL)
--   ✓ Drop test (ACCIDENTAL falls)
--   ✓ IP rating (ACCIDENTAL water/dust)
--   ✓ MIL-STD-810H (ENVIRONMENTAL durability)
--   ✓ Battery lifespan (DEGRADATION over time)
-- ============================================================

SELECT 'Migration 091 completed: Environmental norms reclassified from A to F' as status;
