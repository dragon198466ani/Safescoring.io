-- ============================================================
-- Migration 090: Clarify ADVERSITY vs FIDELITY Pillar Definitions
-- ============================================================
--
-- KEY DISTINCTION:
-- ADVERSITY (A) = Protection against INTENTIONAL human threats (attackers)
-- FIDELITY (F) = Protection against NON-INTENTIONAL failures (wear, accidents)
--
-- Test: "Is this protecting against an INTENTIONAL attack by an adversary?"
-- YES → Adversity | NO (wear, accident, failure) → Fidelity
-- ============================================================

-- Update the safe_pillar_definitions table with clarified definitions
UPDATE safe_pillar_definitions
SET
    pillar_name = 'ADVERSITY - Protection Against Human Adversaries',
    definition = 'Measures the ability to protect users and assets against INTENTIONAL threats from human adversaries: physical coercion, theft, surveillance, legal pressure, and targeted attacks. This pillar focuses exclusively on protection against malicious actors, NOT against accidental damage, wear, or system failures (which belong to Fidelity).',
    includes = ARRAY[
        'Anti-coercion mechanisms (duress PIN, panic button) - protection when FORCED by attacker',
        'Hidden wallets and decoy accounts - misleading attackers who demand access',
        'Plausible deniability features (hidden volumes, steganography) - denying existence of assets to attackers',
        'Theft protection (device wipe, kill switch) - defeating thieves who steal device',
        'Time-locked withdrawals - preventing attackers from quick extraction',
        'Self-destruct on unauthorized access attempts - defeating brute-force attackers',
        'Physical tamper detection - detecting if attacker opened device',
        'Tamper-evident packaging - detecting if attacker accessed device in transit',
        'Side-channel attack resistance - defeating sophisticated attackers with lab equipment',
        'Privacy features (transaction obfuscation, address rotation) - hiding from surveillors',
        'Operational security (OpSec) guidance - protecting against social engineering',
        'Tor/VPN support - hiding from network adversaries',
        'Legal protections and jurisdiction considerations - protection from legal compulsion',
        'Geographic distribution of backups - defeating localized seizure attempts',
        'Backup systems resistant to adversarial destruction (fireproof, distributed)',
        'Social recovery with trusted guardians - recovering after attack',
        'Inheritance mechanisms - protecting assets from being lost to adversaries after death'
    ],
    excludes = ARRAY[
        'Accidental water damage resistance (belongs to F - this is wear/accident, not attack)',
        'Accidental drop resistance (belongs to F - this is accident, not intentional)',
        'Normal temperature tolerance (belongs to F - this is environmental wear)',
        'Battery longevity (belongs to F - this is degradation over time)',
        'Service uptime/availability (belongs to F - this is reliability, not attack resistance)',
        'Manufacturing quality (belongs to F - this is build quality)',
        'Warranty and support (belongs to F - this is vendor reliability)',
        'Cryptographic algorithm strength (belongs to S - Security)',
        'User interface design (belongs to E - Efficiency)'
    ],
    keywords = ARRAY['coercion', 'duress', 'panic', 'hidden', 'decoy', 'plausible deniability', 'theft', 'stolen', 'attacker', 'adversary', 'tamper', 'intrusion', 'self-destruct', 'wipe', 'erase', 'surveillance', 'privacy', 'Tor', 'mixing', 'obfuscation', 'seizure', 'legal', 'jurisdiction', 'opsec', 'side-channel', 'DPA', 'SPA', 'fault injection', 'glitch attack'],
    version = '3.0',
    updated_at = NOW()
WHERE pillar_code = 'A';

UPDATE safe_pillar_definitions
SET
    pillar_name = 'FIDELITY - Durability, Reliability & Trust Over Time',
    definition = 'Evaluates protection against NON-INTENTIONAL threats: physical wear, accidental damage, environmental exposure, component failures, and organizational reliability over time. This pillar focuses on how well a product survives NORMAL USE and the passage of time, NOT attacks from adversaries (which belong to Adversity).',
    includes = ARRAY[
        'Accidental drop resistance - surviving UNINTENTIONAL falls',
        'Water/dust protection (IP rating) - surviving ACCIDENTAL exposure',
        'Temperature tolerance - operating in normal environmental conditions',
        'Corrosion resistance - surviving humidity and normal atmospheric exposure',
        'Material quality (aircraft-grade aluminum, stainless steel) - longevity of materials',
        'Manufacturing certifications (CE, FCC, RoHS) - quality standards compliance',
        'Component quality (industrial-grade) - reliable internal parts',
        'Battery longevity and health - degradation over time',
        'Service uptime and availability (99.9%+) - surviving system failures',
        'Redundancy and failover - automatic recovery from component failures',
        'Disaster recovery from NATURAL events (fire, flood) - not from adversaries',
        'Code quality and test coverage - reducing accidental bugs',
        'Regular updates and patches - maintaining quality over time',
        'Long-term support (LTS) commitment - vendor reliability',
        'Company track record and reputation - historical reliability',
        'Financial stability - likelihood of continued support',
        'Warranty and support quality - vendor accountability',
        'Documentation quality - enabling correct usage',
        'Open source code (auditable) - transparency for trust'
    ],
    excludes = ARRAY[
        'Tamper detection/resistance (belongs to A - this is against INTENTIONAL intrusion)',
        'Duress PIN and hidden wallets (belongs to A - this is against coercion by attackers)',
        'Self-destruct on intrusion (belongs to A - this defeats intentional attackers)',
        'Privacy and transaction obfuscation (belongs to A - this hides from surveillors)',
        'Side-channel attack resistance (belongs to A - this defeats sophisticated attackers)',
        'Cryptographic algorithm strength (belongs to S - Security)',
        'Authentication mechanisms (belongs to S - Security)',
        'User interface design (belongs to E - Efficiency)',
        'Transaction speed (belongs to E - Efficiency)'
    ],
    keywords = ARRAY['reliability', 'durability', 'quality', 'uptime', 'availability', 'warranty', 'guarantee', 'certification', 'CE', 'FCC', 'RoHS', 'IP rating', 'water resistant', 'dust resistant', 'accidental', 'drop test', 'shock resistant', 'temperature range', 'humidity', 'corrosion', 'wear', 'lifespan', 'battery life', 'degradation', 'update', 'patch', 'maintenance', 'support', 'LTS', 'track record', 'reputation', 'test coverage', 'code quality', 'open source', 'documentation', 'SLA', 'failover', 'redundancy', 'MTTR', 'bug fix', 'financial stability'],
    version = '3.0',
    updated_at = NOW()
WHERE pillar_code = 'F';

-- ============================================================
-- CLASSIFICATION GUIDE (for reference)
-- ============================================================
--
-- Examples of correct classification:
--
-- | Feature                    | Pillar | Reason                                    |
-- |----------------------------|--------|-------------------------------------------|
-- | IP67 waterproof            | F      | Protects against ACCIDENTAL water         |
-- | Tamper-evident seal        | A      | Detects if ATTACKER opened device         |
-- | Drop test 1.5m             | F      | Survives ACCIDENTAL falls                 |
-- | Self-destruct after 10 PIN | A      | Defeats BRUTE-FORCE attacker              |
-- | 99.9% uptime SLA           | F      | Survives SYSTEM failures                  |
-- | Duress PIN                 | A      | Protects when COERCED by attacker         |
-- | Battery 10 year lifespan   | F      | Degradation over TIME                     |
-- | Hidden wallet              | A      | Misleads ATTACKER who demands access      |
-- | Temperature -20C to +60C   | F      | Survives NORMAL environmental conditions  |
-- | Side-channel resistance    | A      | Defeats SOPHISTICATED lab attackers       |
-- ============================================================

-- Add comment explaining the distinction
COMMENT ON TABLE safe_pillar_definitions IS 'SAFE pillar definitions v3.0 - ADVERSITY=intentional human threats, FIDELITY=non-intentional wear/accidents/failures';

-- Verify the update
SELECT
    pillar_code,
    pillar_name,
    LEFT(definition, 100) as definition_preview,
    version
FROM safe_pillar_definitions
WHERE pillar_code IN ('A', 'F')
ORDER BY pillar_code;
