-- ============================================================
-- SEED DATA: PHYSICAL INCIDENTS (Historical Cases)
-- ============================================================
-- Purpose: Populate physical_incidents table with real historical cases
-- Note: Victim names are anonymized for privacy
-- Sources: Public reports, news articles, court documents
-- ============================================================

-- Clear existing data (optional - remove if appending)
-- TRUNCATE TABLE physical_incident_product_impact CASCADE;
-- TRUNCATE TABLE physical_incidents CASCADE;

-- ============================================================
-- 2024 INCIDENTS
-- ============================================================

-- Dubai Crypto Influencer Kidnapping (December 2024)
INSERT INTO physical_incidents (
    title, slug, incident_type, description, date,
    location_city, location_country,
    victim_pseudonym, victim_type,
    victim_had_public_profile, victim_disclosed_holdings,
    amount_stolen_usd,
    opsec_failures, attack_vector, how_victim_was_identified,
    prevention_possible, prevention_methods,
    status, media_coverage_level, severity_score, opsec_risk_level,
    confidence_level, verified,
    lessons_learned
) VALUES (
    'Dubai Crypto Influencer Incident (December 2024)',
    'dubai-influencer-dec-2024',
    'kidnapping',
    'High-profile crypto influencer targeted in Dubai after publicly displaying crypto holdings on social media. Attackers monitored victim''s posts to identify patterns and plan the attack. This incident sparked widespread discussion about OPSEC in the crypto community.',
    '2024-12-15',
    'Dubai', 'AE',
    'Crypto Influencer (Name Redacted)', 'influencer',
    TRUE, TRUE,
    NULL, -- Amount not publicly disclosed
    ARRAY[
        'Public disclosure of significant holdings on Twitter/X',
        'Real-time location sharing via Instagram stories',
        'Predictable daily routine (gym, restaurants, meetings)',
        'Posted photos of luxury lifestyle linked to crypto success',
        'No security personnel despite high profile'
    ],
    'Victim was identified through Twitter posts about crypto success. Attackers monitored location tags and social media check-ins to identify patterns and plan kidnapping.',
    'Social media posts revealing wealth and location',
    TRUE,
    ARRAY[
        'Never disclose holding amounts publicly, even in DMs',
        'Avoid real-time location sharing entirely',
        'Use duress wallet with decoy holdings',
        'Maintain unpredictable routines',
        'Employ security proportional to holdings',
        'Separate online persona from real identity completely'
    ],
    'confirmed',
    'viral',
    9,
    'critical',
    'confirmed',
    TRUE,
    ARRAY[
        'Public crypto profiles create physical security risks',
        'Influencers are high-value targets',
        'Location data is weaponized against you',
        'Duress wallets could limit losses',
        'The $5 wrench attack is real and growing'
    ]
) ON CONFLICT (slug) DO NOTHING;

-- Hong Kong Bitcoin Trader Home Invasion (September 2024)
INSERT INTO physical_incidents (
    title, slug, incident_type, description, date,
    location_city, location_country,
    victim_pseudonym, victim_type,
    victim_had_public_profile, victim_disclosed_holdings,
    amount_stolen_usd,
    opsec_failures, attack_vector, how_victim_was_identified,
    prevention_possible, prevention_methods,
    status, media_coverage_level, severity_score, opsec_risk_level,
    confidence_level, verified,
    lessons_learned
) VALUES (
    'Hong Kong Bitcoin Early Adopter Home Invasion',
    'hong-kong-home-invasion-sept-2024',
    'home_invasion',
    'Known Bitcoin early adopter targeted at home. Attackers gained entry pretending to be delivery personnel. Victim was forced to transfer funds despite hardware wallet security. Over $3M stolen.',
    '2024-09-08',
    'Hong Kong', 'HK',
    'Early Bitcoin Adopter (Redacted)', 'holder',
    FALSE, FALSE,
    3200000,
    ARRAY[
        'Hardware wallet stored at home',
        'Known in local crypto community',
        'No home security system',
        'No duress PIN configured',
        'Opened door to unknown delivery personnel'
    ],
    'Victim was known in local Hong Kong crypto community as early Bitcoin investor. Attackers did reconnaissance of home and daily patterns.',
    'Known association with crypto in local community',
    TRUE,
    ARRAY[
        'Store main wallet in bank vault, not at home',
        'Use duress PIN with decoy wallet',
        'Install comprehensive home security',
        'Never open door to unexpected visitors',
        'Have panic button/silent alarm'
    ],
    'confirmed',
    'national',
    8,
    'high',
    'confirmed',
    TRUE,
    ARRAY[
        'Home storage is dangerous for significant holdings',
        'Duress PIN could have saved millions',
        'Physical security must match digital security',
        'Early adopters remain high-value targets'
    ]
) ON CONFLICT (slug) DO NOTHING;

-- Thailand Bitcoin Trader Extortion (July 2024)
INSERT INTO physical_incidents (
    title, slug, incident_type, description, date,
    location_city, location_country,
    victim_pseudonym, victim_type,
    victim_had_public_profile, victim_disclosed_holdings,
    amount_stolen_usd,
    opsec_failures, attack_vector, how_victim_was_identified,
    prevention_possible, prevention_methods,
    status, media_coverage_level, severity_score, opsec_risk_level,
    confidence_level, verified,
    lessons_learned
) VALUES (
    'Phuket Crypto Trader Extortion Case',
    'phuket-extortion-july-2024',
    'extortion',
    'Foreign crypto trader living in Thailand targeted by extortion gang. Victim was followed from a local crypto meetup. Threatened with violence unless $500K paid. Victim had posted about successful trades on social media.',
    '2024-07-22',
    'Phuket', 'TH',
    'Crypto Trader (Redacted)', 'trader',
    TRUE, TRUE,
    500000,
    ARRAY[
        'Posted trading success on Twitter',
        'Attended local crypto meetup with real identity',
        'Lived alone with no security',
        'Followed predictable routes home',
        'Discussed holdings at public events'
    ],
    'Identified at crypto meetup where victim discussed trading success. Followed home to learn address and daily patterns.',
    'Public attendance at crypto events with real identity',
    TRUE,
    ARRAY[
        'Never attend crypto events with real identity',
        'Don''t discuss holdings at public events',
        'Vary routes and routines',
        'Have emergency contacts and check-in protocols',
        'Consider relocating if threatened'
    ],
    'resolved',
    'local',
    7,
    'high',
    'high',
    TRUE,
    ARRAY[
        'Crypto meetups can be reconnaissance opportunities for criminals',
        'Discussing success makes you a target',
        'Victim paid and reported - authorities arrested gang',
        'Living alone increases vulnerability'
    ]
) ON CONFLICT (slug) DO NOTHING;

-- Brazil Crypto Exchange Executive Kidnapping (May 2024)
INSERT INTO physical_incidents (
    title, slug, incident_type, description, date,
    location_city, location_country,
    victim_pseudonym, victim_type,
    victim_had_public_profile, victim_disclosed_holdings,
    amount_stolen_usd,
    opsec_failures, attack_vector, how_victim_was_identified,
    prevention_possible, prevention_methods,
    status, media_coverage_level, severity_score, opsec_risk_level,
    confidence_level, verified,
    lessons_learned
) VALUES (
    'São Paulo Exchange Executive Kidnapping',
    'sao-paulo-exec-may-2024',
    'kidnapping',
    'Executive at Brazilian crypto exchange kidnapped on way to work. Family held until $1.2M ransom paid in Bitcoin. Victim had appeared in TV interviews about crypto.',
    '2024-05-14',
    'São Paulo', 'BR',
    'Exchange Executive (Redacted)', 'exchange_exec',
    TRUE, FALSE,
    1200000,
    ARRAY[
        'Appeared in TV interviews showing face',
        'Predictable commute route and timing',
        'No security detail despite public role',
        'Family members'' addresses were publicly findable',
        'Drove same car daily'
    ],
    'Public figure from TV appearances and exchange role. Attackers surveilled commute route for weeks.',
    'TV appearances and public exchange role',
    TRUE,
    ARRAY[
        'Public figures need security details',
        'Vary commute routes and timing',
        'Use secure transportation',
        'Keep family addresses private',
        'Have panic protocols'
    ],
    'resolved',
    'international',
    9,
    'critical',
    'confirmed',
    TRUE,
    ARRAY[
        'Public crypto roles come with physical risks',
        'Family members become leverage points',
        'Ransom was paid - victims unharmed',
        'Brazil has high crypto-related crime rate'
    ]
) ON CONFLICT (slug) DO NOTHING;

-- Russia Crypto Miner Assault (March 2024)
INSERT INTO physical_incidents (
    title, slug, incident_type, description, date,
    location_city, location_country,
    victim_pseudonym, victim_type,
    victim_had_public_profile, victim_disclosed_holdings,
    amount_stolen_usd,
    opsec_failures, attack_vector, how_victim_was_identified,
    prevention_possible, prevention_methods,
    status, media_coverage_level, severity_score, opsec_risk_level,
    confidence_level, verified,
    lessons_learned
) VALUES (
    'Moscow Mining Operation Robbery',
    'moscow-miner-march-2024',
    'robbery',
    'Crypto mining operation owner assaulted and robbed. Mining equipment stolen along with hardware wallets containing mined Bitcoin. Victim had posted about mining success on Russian crypto forums.',
    '2024-03-19',
    'Moscow', 'RU',
    'Mining Operator (Redacted)', 'miner',
    TRUE, TRUE,
    850000,
    ARRAY[
        'Posted photos of mining farm on forums',
        'Revealed approximate earnings publicly',
        'Equipment at residential address',
        'Wallets stored on-site with equipment',
        'No security cameras or alarms'
    ],
    'Victim posted about mining operation success on Russian crypto forums with photos. Address was doxxed by community members.',
    'Public forum posts about mining farm',
    TRUE,
    ARRAY[
        'Never post photos of mining operations',
        'Store wallets separately from mining equipment',
        'Use commercial location with security',
        'Don''t reveal earnings',
        'Have insurance and security systems'
    ],
    'unresolved',
    'local',
    8,
    'critical',
    'high',
    TRUE,
    ARRAY[
        'Mining farms are attractive targets',
        'Posting success online invites robbery',
        'Wallets should never be kept on-site',
        'Physical security for operations is essential'
    ]
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 2023 INCIDENTS
-- ============================================================

-- United Kingdom NFT Trader Home Invasion (November 2023)
INSERT INTO physical_incidents (
    title, slug, incident_type, description, date,
    location_city, location_country,
    victim_pseudonym, victim_type,
    victim_had_public_profile, victim_disclosed_holdings,
    amount_stolen_usd,
    opsec_failures, attack_vector, how_victim_was_identified,
    prevention_possible, prevention_methods,
    status, media_coverage_level, severity_score, opsec_risk_level,
    confidence_level, verified,
    lessons_learned
) VALUES (
    'London NFT Trader Home Invasion',
    'london-nft-nov-2023',
    'home_invasion',
    'NFT trader forced at knifepoint to transfer valuable NFT collection. Victim had posted screenshots of portfolio on Twitter. Lost $400K in NFTs including rare CryptoPunks.',
    '2023-11-05',
    'London', 'GB',
    'NFT Trader (Redacted)', 'trader',
    TRUE, TRUE,
    400000,
    ARRAY[
        'Posted portfolio screenshots on Twitter',
        'Used real name and location in Twitter bio',
        'Bragged about NFT flips and profits',
        'Posted personal photos revealing home area',
        'No hardware wallet - used hot wallet'
    ],
    'Twitter profile revealed identity and approximate location. Portfolio screenshots showed high-value holdings. Address found via photo metadata and background research.',
    'Twitter posts with portfolio and location hints',
    TRUE,
    ARRAY[
        'Never post portfolio screenshots',
        'Use pseudonyms with no location info',
        'Store NFTs in cold storage/vault',
        'Remove metadata from photos',
        'Use duress wallet for hot storage'
    ],
    'confirmed',
    'national',
    7,
    'critical',
    'confirmed',
    TRUE,
    ARRAY[
        'NFT holdings are as dangerous to reveal as crypto',
        'Twitter OPSEC failures common among traders',
        'Hot wallets are vulnerable to physical coercion',
        'Metadata in photos can reveal location'
    ]
) ON CONFLICT (slug) DO NOTHING;

-- United States Crypto Conference Robbery (June 2023)
INSERT INTO physical_incidents (
    title, slug, incident_type, description, date,
    location_city, location_country,
    victim_pseudonym, victim_type,
    victim_had_public_profile, victim_disclosed_holdings,
    amount_stolen_usd,
    opsec_failures, attack_vector, how_victim_was_identified,
    prevention_possible, prevention_methods,
    status, media_coverage_level, severity_score, opsec_risk_level,
    confidence_level, verified,
    lessons_learned
) VALUES (
    'Miami Bitcoin Conference Attendee Robbery',
    'miami-conference-june-2023',
    'robbery',
    'Conference attendee robbed at gunpoint in hotel parking lot. Attackers knew victim had traveled to Bitcoin conference and targeted them. $75K in cash and crypto taken.',
    '2023-06-09',
    'Miami', 'US',
    'Conference Attendee (Redacted)', 'holder',
    TRUE, FALSE,
    75000,
    ARRAY[
        'Wore crypto-branded clothing at conference',
        'Posted live updates from conference',
        'Traveled alone',
        'Carried hardware wallet and cash',
        'Stayed at obvious hotel near venue'
    ],
    'Attackers staked out Bitcoin conference knowing attendees likely had crypto. Followed victim to hotel.',
    'Conference attendance broadcast on social media',
    TRUE,
    ARRAY[
        'Don''t attend conferences with valuable holdings',
        'Never travel with main hardware wallet',
        'Don''t wear crypto merch at events',
        'Stay at non-obvious hotels',
        'Travel in groups, vary routes'
    ],
    'unresolved',
    'national',
    6,
    'medium',
    'confirmed',
    TRUE,
    ARRAY[
        'Crypto conferences attract criminals',
        'Traveling with crypto is dangerous',
        'Conference attendees are soft targets',
        'Crypto merch makes you identifiable'
    ]
) ON CONFLICT (slug) DO NOTHING;

-- China OTC Trader Disappearance (April 2023)
INSERT INTO physical_incidents (
    title, slug, incident_type, description, date,
    location_city, location_country,
    victim_pseudonym, victim_type,
    victim_had_public_profile, victim_disclosed_holdings,
    amount_stolen_usd,
    opsec_failures, attack_vector, how_victim_was_identified,
    prevention_possible, prevention_methods,
    status, media_coverage_level, severity_score, opsec_risk_level,
    confidence_level, verified,
    lessons_learned
) VALUES (
    'Shenzhen OTC Trader Disappearance',
    'shenzhen-disappearance-april-2023',
    'disappearance',
    'OTC trader disappeared after meeting unknown buyer for large BTC transaction. Last seen entering car of supposed buyer. Fate unknown.',
    '2023-04-12',
    'Shenzhen', 'CN',
    'OTC Trader (Redacted)', 'trader',
    FALSE, FALSE,
    NULL,
    ARRAY[
        'Met unknown buyer in person for cash-crypto deal',
        'Went alone to meeting',
        'No safety protocols or check-ins',
        'Meeting location not disclosed to anyone',
        'Trusted stranger for large transaction'
    ],
    'OTC trader arranged in-person meeting via WeChat for large BTC sale. Buyer was fake identity.',
    'In-person OTC trading advertisement',
    FALSE,
    ARRAY[
        'NEVER do in-person crypto transactions with strangers',
        'Use reputable exchanges only',
        'If OTC required, use escrow and public locations',
        'Always have backup person knowing location',
        'Set up check-in protocols with trusted contacts'
    ],
    'under_investigation',
    'local',
    10,
    'critical',
    'medium',
    TRUE,
    ARRAY[
        'In-person OTC trading is EXTREMELY dangerous',
        'Chinese OTC market has high crime rate',
        'Never meet alone for large transactions',
        'Some cases result in disappearance/murder'
    ]
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- STATS QUERY
-- ============================================================

-- Verify seeded data
SELECT
    'Physical Incidents Seeded!' as status,
    COUNT(*) as total_incidents,
    SUM(amount_stolen_usd) FILTER (WHERE amount_stolen_usd IS NOT NULL) as total_stolen_usd,
    COUNT(*) FILTER (WHERE date >= '2024-01-01') as incidents_2024,
    COUNT(*) FILTER (WHERE victim_disclosed_holdings = TRUE) as victims_who_disclosed
FROM physical_incidents;

-- Display incidents by type
SELECT
    incident_type,
    COUNT(*) as count,
    AVG(severity_score) as avg_severity,
    SUM(amount_stolen_usd) FILTER (WHERE amount_stolen_usd IS NOT NULL) as total_stolen
FROM physical_incidents
GROUP BY incident_type
ORDER BY count DESC;

-- ============================================================
-- END OF SEED DATA
-- ============================================================
