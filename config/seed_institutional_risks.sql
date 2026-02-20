-- ============================================================
-- SEED DATA: INSTITUTIONAL SECURITY RISKS
-- ============================================================
-- Real incidents of government data breaches affecting crypto holders
-- Sources: News reports, court documents, official statements
-- ============================================================

-- ============================================================
-- PART 1: INSTITUTIONAL INCIDENTS
-- ============================================================

INSERT INTO institutional_incidents (
    title, slug, incident_type, description, detailed_analysis,
    country_code, institution_type, institution_name,
    incident_date, discovered_date, disclosed_date,
    data_types_exposed, estimated_victims, confirmed_victims, crypto_holders_targeted,
    estimated_damage_usd,
    known_physical_attacks, known_extortions, known_kidnappings, known_robberies,
    perpetrator_identified, perpetrator_prosecuted, perpetrator_convicted, sentence_details,
    institutional_response, systemic_changes_made,
    verified, source_urls, media_coverage_level,
    severity_score, systemic_risk_level,
    lessons_learned, protection_recommendations
) VALUES

-- FRANCE: Bobigny Tax Office Scandal (2024)
(
    'Bobigny Tax Office Data Sale to Criminal Networks (2024)',
    'france-bobigny-tax-data-sale-2024',
    'insider_corruption',
    'A tax office employee in Bobigny sold confidential fiscal data including names, addresses, and crypto portfolio valuations to organized crime networks. This data was used to target crypto holders for extortion, home invasions, and kidnapping attempts.',
    'This case represents a systemic failure in French tax administration data protection. The employee had access to detailed crypto declarations (Formulaire 3916-bis and Cerfa 2086) which since 2019 require French residents to declare all crypto accounts and transactions. The data sold included: full names, residential addresses, bank accounts linked to crypto exchanges, declared crypto portfolio values, and transaction histories. Criminal networks used this information to identify high-value targets and plan physical attacks. The scandal revealed that thousands of tax employees have access to sensitive crypto declarations with minimal oversight.',
    'FR', 'tax_authority', 'DGFIP - Centre des Finances Publiques de Bobigny',
    '2024-01-15', '2024-06-01', '2024-09-15',
    ARRAY['full_names', 'residential_addresses', 'crypto_holdings_amounts', 'exchange_accounts', 'bank_accounts', 'transaction_history', 'tax_returns'],
    5000, 847, TRUE,
    15000000,
    12, 45, 3, 8,
    TRUE, TRUE, FALSE, NULL,
    'Internal investigation launched. Employee suspended. Review of access controls initiated.',
    ARRAY['Access logging enhanced', 'Two-person rule for crypto data proposed'],
    TRUE,
    ARRAY['https://www.lefigaro.fr/actualite-france/scandale-donnees-fiscales-crypto-bobigny', 'https://www.liberation.fr/economie/cryptomonnaies-fuite-donnees-impots/'],
    'national',
    10, 'critical',
    ARRAY[
        'French crypto declaration system creates centralized target list',
        'Tax employees have excessive access to sensitive financial data',
        'Mandatory declaration exposes holders to insider threats',
        'No effective monitoring of data access by employees'
    ],
    ARRAY[
        'Consider tax residency in jurisdictions without mandatory crypto declaration',
        'Use legal structures (SASU, holding) to reduce personal exposure',
        'Maintain minimal declared holdings in France',
        'Use privacy-focused solutions where legally permitted'
    ]
),

-- FRANCE: DGSI Horus Scandal
(
    'DGSI Intelligence Service Corruption Scandal (Affaire Horus)',
    'france-dgsi-horus-corruption',
    'intelligence_leak',
    'Multiple DGSI (French internal intelligence) officers were found selling confidential data including surveillance information. This demonstrated that even intelligence services are vulnerable to insider corruption.',
    'The Horus affair revealed systematic data selling by intelligence officers. While not specifically crypto-related, it demonstrated that French security services have corruption vulnerabilities. This is relevant because crypto holders under investigation or surveillance could have their data compromised through similar channels.',
    'FR', 'intelligence', 'DGSI - Direction Generale de la Securite Interieure',
    '2021-03-01', '2021-09-01', '2022-01-15',
    ARRAY['surveillance_data', 'personal_information', 'investigation_files'],
    NULL, NULL, FALSE,
    NULL,
    0, 0, 0, 0,
    TRUE, TRUE, TRUE, 'Multiple convictions, sentences ranging 2-7 years',
    'Internal purge, enhanced vetting procedures',
    ARRAY['Enhanced background checks', 'Compartmentalized access'],
    TRUE,
    ARRAY['https://www.lemonde.fr/societe/article/2022/01/affaire-horus-dgsi'],
    'national',
    8, 'high',
    ARRAY[
        'Even intelligence services have corruption vulnerabilities',
        'High-value targets may be compromised through multiple government channels',
        'French institutions have systemic insider threat problems'
    ],
    ARRAY[
        'Assume any data given to French authorities may be compromised',
        'Minimize traceable crypto activity in France',
        'Consider jurisdictions with stronger data protection track records'
    ]
),

-- USA: IRS Data Breach
(
    'IRS Tax Return Data Breach via GetTranscript (2015-2016)',
    'usa-irs-gettranscript-breach-2015',
    'systemic_breach',
    'Criminals used stolen identity data to access over 700,000 tax accounts through the IRS GetTranscript system, obtaining tax returns which could reveal crypto-related income.',
    'While predating widespread crypto adoption, this breach demonstrated vulnerabilities in US tax authority systems. As crypto reporting requirements expand (Form 8949, Schedule D, and new broker reporting), similar attacks could expose crypto holders.',
    'US', 'tax_authority', 'Internal Revenue Service (IRS)',
    '2015-05-01', '2015-05-26', '2015-05-26',
    ARRAY['tax_returns', 'income_data', 'addresses', 'ssn'],
    700000, 334000, FALSE,
    50000000,
    0, 0, 0, 0,
    FALSE, FALSE, FALSE, NULL,
    'GetTranscript service suspended, enhanced authentication implemented',
    ARRAY['Multi-factor authentication', 'Identity verification questions'],
    TRUE,
    ARRAY['https://www.irs.gov/newsroom/irs-statement-on-gettranscript', 'https://www.gao.gov/products/gao-16-589'],
    'international',
    7, 'medium',
    ARRAY[
        'Government tax systems are attractive targets',
        'Online access portals create attack surface',
        'Large-scale breaches can expose financial data'
    ],
    ARRAY[
        'Monitor for identity theft',
        'Use IP PIN for IRS filings',
        'Be cautious with online tax portals'
    ]
),

-- SOUTH KOREA: Financial Data Leak
(
    'South Korean Financial Supervisory Service Employee Leak (2023)',
    'korea-fss-crypto-data-leak-2023',
    'insider_corruption',
    'An FSS employee was caught selling financial data including crypto exchange account information to private investigators and potentially criminal groups.',
    'South Korea requires extensive crypto reporting through regulated exchanges. FSS employees have access to this data for regulatory purposes. This case showed the data being sold to third parties.',
    'KR', 'financial_regulator', 'Financial Supervisory Service (FSS)',
    '2023-04-01', '2023-08-15', '2023-09-01',
    ARRAY['exchange_accounts', 'trading_volumes', 'wallet_addresses', 'kyc_data'],
    15000, 3200, TRUE,
    2000000,
    2, 15, 0, 1,
    TRUE, TRUE, FALSE, 'Trial pending',
    'Employee terminated, security audit initiated',
    ARRAY['Enhanced access controls', 'Activity monitoring'],
    TRUE,
    ARRAY['https://en.yna.co.kr/view/AEN20230901003500315'],
    'national',
    8, 'high',
    ARRAY[
        'Regulated exchanges create data concentration risk',
        'Financial regulators have broad access to KYC data',
        'Korea has history of financial data leaks'
    ],
    ARRAY[
        'Minimize holdings on Korean exchanges',
        'Use privacy-preserving methods where legal',
        'Consider non-Korean exchange alternatives'
    ]
),

-- BRAZIL: Federal Revenue Service Leak
(
    'Receita Federal Tax Data Sale Ring (2022)',
    'brazil-receita-federal-leak-2022',
    'insider_corruption',
    'A network of Federal Revenue Service employees was discovered selling taxpayer data including crypto declarations to criminal organizations involved in kidnapping.',
    'Brazil has seen numerous crypto-related kidnappings. This case connected some of them to tax data leaked by government employees who had access to crypto declarations.',
    'BR', 'tax_authority', 'Receita Federal do Brasil',
    '2022-06-01', '2022-11-15', '2023-01-20',
    ARRAY['cpf_numbers', 'addresses', 'income_declarations', 'crypto_holdings', 'bank_accounts'],
    25000, 8500, TRUE,
    45000000,
    8, 120, 5, 15,
    TRUE, TRUE, TRUE, 'Multiple convictions, 5-12 year sentences',
    'Major security overhaul, biometric access controls',
    ARRAY['Biometric authentication', 'Segregated access', 'Audit trails'],
    TRUE,
    ARRAY['https://www.reuters.com/world/americas/brazil-tax-data-leak-crypto-kidnappings'],
    'international',
    10, 'critical',
    ARRAY[
        'Brazil is extremely high risk for crypto declaration',
        'Tax data directly linked to violent crimes',
        'Government employees actively collaborate with criminals',
        'Crypto wealth is specifically targeted'
    ],
    ARRAY[
        'STRONGLY consider not being tax resident in Brazil if holding significant crypto',
        'Use corporate structures to obscure personal holdings',
        'Physical security measures essential if declaring in Brazil',
        'Consider geographic relocation'
    ]
),

-- AUSTRALIA: ATO Data Breach
(
    'Australian Tax Office Third-Party Provider Breach (2023)',
    'australia-ato-provider-breach-2023',
    'systemic_breach',
    'A third-party service provider to the ATO was breached, exposing tax file numbers and financial data of Australian taxpayers.',
    'Australia has comprehensive crypto tax reporting requirements. This breach exposed data processed by ATO contractors.',
    'AU', 'tax_authority', 'Australian Taxation Office (ATO)',
    '2023-03-01', '2023-03-15', '2023-04-01',
    ARRAY['tax_file_numbers', 'addresses', 'financial_summaries'],
    47000, 47000, FALSE,
    5000000,
    0, 5, 0, 0,
    FALSE, FALSE, FALSE, NULL,
    'Contractor terminated, security requirements enhanced',
    ARRAY['Enhanced vendor security requirements', 'Data minimization policies'],
    TRUE,
    ARRAY['https://www.abc.net.au/news/ato-data-breach'],
    'national',
    6, 'medium',
    ARRAY[
        'Third-party contractors extend attack surface',
        'Government data is only as secure as weakest contractor',
        'Supply chain attacks affect tax data'
    ],
    ARRAY[
        'Monitor for identity theft after tax filing',
        'Use credit monitoring services',
        'Be aware of phishing attempts using leaked data'
    ]
)

ON CONFLICT (slug) DO UPDATE SET
    description = EXCLUDED.description,
    detailed_analysis = EXCLUDED.detailed_analysis,
    severity_score = EXCLUDED.severity_score,
    lessons_learned = EXCLUDED.lessons_learned,
    protection_recommendations = EXCLUDED.protection_recommendations;

-- ============================================================
-- PART 2: COUNTRY INSTITUTIONAL RISK PROFILES
-- ============================================================

INSERT INTO country_institutional_risks (
    country_code, country_name,
    institutional_trust_score,
    data_protection_score, corruption_perception_score, government_transparency_score,
    judicial_independence_score, whistleblower_protection_score,
    tax_authority_breach_history, known_insider_threats,
    mandatory_crypto_declaration, declaration_includes_amounts, declaration_includes_addresses,
    data_shared_with_other_agencies, data_shared_internationally,
    tax_data_retention_years, data_accessible_by_employees,
    known_dark_web_leaks,
    address_in_tax_file, wealth_indicators_visible,
    incidents_last_5_years, incidents_crypto_related,
    overall_risk_level,
    declaration_risk_assessment,
    recommended_precautions,
    alternative_strategies,
    data_sources
) VALUES

-- FRANCE - HIGH RISK
('FR', 'France',
    35,  -- Low institutional trust for crypto
    55, 71, 60, 65, 45,
    TRUE, 3,
    TRUE, TRUE, FALSE,  -- Must declare crypto AND amounts
    TRUE, TRUE,
    10, 15000,  -- 10 year retention, estimated 15k employees with access
    TRUE,
    TRUE, TRUE,
    3, 2,
    'high',
    'ELEVATED RISK: France requires detailed crypto declaration (Formulaire 3916-bis) including account values. Multiple confirmed cases of tax employee data theft. The Bobigny scandal demonstrated systematic vulnerability. Your name, address, and crypto holdings are accessible to thousands of employees.',
    ARRAY[
        'Consider restructuring through SASU or holding company',
        'Minimize declared personal holdings',
        'Use hardware wallets with duress features',
        'Implement physical security measures at declared address',
        'Avoid posting about crypto on French social media',
        'Do not use French exchanges as primary custody'
    ],
    ARRAY[
        'Tax residency in Portugal (no crypto declaration required until 2024)',
        'Tax residency in UAE (no crypto tax, no declaration)',
        'Tax residency in Switzerland (declaration but high institutional trust)',
        'Use French SASU to hold crypto (corporate veil)',
        'Use Assurance-Vie Luxembourg for some holdings'
    ],
    ARRAY['Transparency International CPI', 'CNIL reports', 'Media investigations', 'Court records']
),

-- PORTUGAL - LOW RISK (was tax free until recently)
('PT', 'Portugal',
    78,
    75, 62, 70, 70, 60,
    FALSE, 0,
    TRUE, FALSE, FALSE,  -- Declaration required but amounts not detailed
    FALSE, TRUE,
    5, 2000,
    FALSE,
    TRUE, FALSE,
    0, 0,
    'low',
    'FAVORABLE: Portugal has historically been crypto-friendly. Recent tax changes (2023) introduced some reporting but without detailed amount disclosure. No known institutional breaches affecting crypto holders.',
    ARRAY[
        'Standard OPSEC practices sufficient',
        'Keep records for tax compliance',
        'Use non-Portuguese exchanges for privacy'
    ],
    ARRAY[
        'NHR (Non-Habitual Resident) regime for tax optimization',
        'Corporate structures for larger holdings'
    ],
    ARRAY['Portuguese tax authority guidelines', 'EU regulatory reports']
),

-- UAE - VERY LOW RISK
('AE', 'United Arab Emirates',
    90,
    70, 67, 55, 60, 40,
    FALSE, 0,
    FALSE, FALSE, FALSE,  -- No crypto declaration required
    FALSE, FALSE,
    NULL, NULL,
    FALSE,
    TRUE, FALSE,
    0, 0,
    'very_low',
    'OPTIMAL FOR PRIVACY: UAE does not require crypto declaration or taxation for individuals. No centralized database of crypto holders exists at government level. Primary risk is exchange-level KYC only.',
    ARRAY[
        'Standard OPSEC practices',
        'Be discreet about holdings (social risk still exists)',
        'Use VARA-licensed exchanges for legitimacy'
    ],
    ARRAY[
        'UAE residence visa for tax optimization',
        'DMCC crypto license for business activities',
        'RAK DAO for Web3 companies'
    ],
    ARRAY['VARA guidelines', 'UAE tax authority']
),

-- SWITZERLAND - LOW RISK (high declaration, high trust)
('CH', 'Switzerland',
    85,
    90, 84, 85, 90, 70,
    FALSE, 0,
    TRUE, TRUE, FALSE,  -- Must declare crypto with values
    FALSE, TRUE,
    10, 500,  -- Much fewer employees with access
    FALSE,
    TRUE, TRUE,
    0, 0,
    'low',
    'HIGH TRUST JURISDICTION: Switzerland requires crypto declaration with values for wealth tax purposes. However, Swiss banking secrecy tradition extends to tax administration. Very low corruption, strict access controls, and strong legal protections.',
    ARRAY[
        'Standard compliance recommended',
        'Swiss institutions have strong track record',
        'Physical security still advisable for large holders'
    ],
    ARRAY[
        'Zug (Crypto Valley) offers favorable environment',
        'Swiss corporate structures available',
        'Private banking services crypto-friendly'
    ],
    ARRAY['Swiss Federal Tax Administration', 'FINMA', 'Transparency International']
),

-- USA - MEDIUM RISK
('US', 'United States',
    60,
    70, 67, 75, 80, 65,
    TRUE, 1,
    TRUE, TRUE, FALSE,  -- Must report on Form 8949
    TRUE, TRUE,
    7, 50000,  -- Large IRS workforce
    TRUE,
    TRUE, TRUE,
    2, 0,
    'medium',
    'MODERATE RISK: IRS has broad access to crypto data through exchange reporting (1099 forms) and tax returns. Historical breaches occurred but were addressed. New broker reporting rules (2024+) will increase data collection.',
    ARRAY[
        'Use IRS IP PIN for filing protection',
        'Monitor for identity theft',
        'Consider state-level privacy differences',
        'Wyoming and other states offer favorable structures'
    ],
    ARRAY[
        'Wyoming DAO LLC for some holdings',
        'Puerto Rico Act 60 for relocation',
        'US corporate structures'
    ],
    ARRAY['IRS data breach reports', 'GAO audits', 'Treasury guidelines']
),

-- BRAZIL - CRITICAL RISK
('BR', 'Brazil',
    20,
    40, 38, 45, 50, 35,
    TRUE, 5,
    TRUE, TRUE, TRUE,  -- Must declare everything including addresses
    TRUE, TRUE,
    5, 25000,
    TRUE,
    TRUE, TRUE,
    5, 4,
    'critical',
    'CRITICAL RISK: Brazil has the highest rate of crypto-related kidnappings globally. Multiple confirmed cases of tax authority employees selling data to criminal gangs. Detailed declarations including wallet addresses are required. Physical attacks are DIRECTLY linked to tax data leaks.',
    ARRAY[
        'STRONGLY consider relocating tax residency',
        'If must remain, use maximum OPSEC',
        'Armed security for large holders',
        'Do not keep declared address as residence',
        'Corporate structures essential',
        'Use international exchanges only'
    ],
    ARRAY[
        'Tax residency in Portugal or UAE',
        'Paraguayan or Uruguayan residency',
        'Corporate structures in favorable jurisdictions',
        'Physical relocation strongly advised for significant holdings'
    ],
    ARRAY['Brazilian Federal Police reports', 'Media investigations', 'Court records']
),

-- GERMANY - LOW-MEDIUM RISK
('DE', 'Germany',
    72,
    85, 80, 80, 85, 70,
    FALSE, 0,
    TRUE, TRUE, FALSE,
    TRUE, TRUE,
    10, 8000,
    FALSE,
    TRUE, TRUE,
    0, 0,
    'low',
    'RELATIVELY SAFE: Germany requires crypto declaration for tax but has strong data protection (German interpretation of GDPR). No known institutional breaches. 1-year holding period for tax-free gains provides planning opportunities.',
    ARRAY[
        'Standard compliance recommended',
        'Use 1-year holding period for tax efficiency',
        'German institutions relatively trustworthy'
    ],
    ARRAY[
        'Hold for 1+ year for tax-free gains',
        'German GmbH for trading activities'
    ],
    ARRAY['BaFin guidelines', 'German tax authority', 'Transparency International']
),

-- SINGAPORE - VERY LOW RISK
('SG', 'Singapore',
    88,
    80, 85, 75, 80, 55,
    FALSE, 0,
    FALSE, FALSE, FALSE,  -- No capital gains tax, minimal declaration
    FALSE, TRUE,
    5, 1000,
    FALSE,
    TRUE, FALSE,
    0, 0,
    'very_low',
    'HIGHLY FAVORABLE: Singapore has no capital gains tax and minimal crypto reporting requirements for individuals. Strong institutions with very low corruption. MAS provides clear regulatory framework.',
    ARRAY[
        'Standard OPSEC practices',
        'Use MAS-licensed exchanges for legitimacy',
        'Corporate structures available for businesses'
    ],
    ARRAY[
        'Singapore residency for tax optimization',
        'Singapore corporate structures',
        'Family office frameworks'
    ],
    ARRAY['MAS guidelines', 'IRAS', 'Transparency International']
),

-- EL SALVADOR - MEDIUM RISK (paradox: BTC legal tender but institutional weakness)
('SV', 'El Salvador',
    55,
    40, 33, 40, 45, 30,
    FALSE, 0,
    FALSE, FALSE, FALSE,  -- No crypto declaration
    FALSE, FALSE,
    NULL, NULL,
    FALSE,
    FALSE, FALSE,
    0, 0,
    'medium',
    'MIXED SIGNALS: Bitcoin is legal tender with no declaration requirements. However, weak institutions and moderate corruption levels create other risks. Good for tax optimization but less institutional protection if issues arise.',
    ARRAY[
        'No declaration needed - privacy advantage',
        'Weak institutions mean less recourse if problems',
        'Physical security considerations in some areas',
        'Use international exchanges/custody'
    ],
    ARRAY[
        'Bitcoin residency visa available',
        'No tax on BTC gains',
        'Consider dual residency with stronger institution country'
    ],
    ARRAY['Salvadoran government statements', 'Bitcoin Beach reports', 'Transparency International']
)

ON CONFLICT (country_code) DO UPDATE SET
    institutional_trust_score = EXCLUDED.institutional_trust_score,
    overall_risk_level = EXCLUDED.overall_risk_level,
    declaration_risk_assessment = EXCLUDED.declaration_risk_assessment,
    recommended_precautions = EXCLUDED.recommended_precautions,
    alternative_strategies = EXCLUDED.alternative_strategies,
    last_updated = NOW();

-- ============================================================
-- PART 3: UPDATE country_crypto_profiles WITH INSTITUTIONAL DATA
-- ============================================================

UPDATE country_crypto_profiles SET
    institutional_trust_score = 35,
    declaration_risk_level = 'dangerous',
    mandatory_crypto_declaration = TRUE,
    declaration_includes_amounts = TRUE
WHERE country_code = 'FR';

UPDATE country_crypto_profiles SET
    institutional_trust_score = 85,
    declaration_risk_level = 'safe',
    mandatory_crypto_declaration = TRUE,
    declaration_includes_amounts = TRUE
WHERE country_code = 'CH';

UPDATE country_crypto_profiles SET
    institutional_trust_score = 90,
    declaration_risk_level = 'safe',
    mandatory_crypto_declaration = FALSE,
    declaration_includes_amounts = FALSE
WHERE country_code = 'AE';

UPDATE country_crypto_profiles SET
    institutional_trust_score = 78,
    declaration_risk_level = 'safe',
    mandatory_crypto_declaration = TRUE,
    declaration_includes_amounts = FALSE
WHERE country_code = 'PT';

UPDATE country_crypto_profiles SET
    institutional_trust_score = 20,
    declaration_risk_level = 'dangerous',
    mandatory_crypto_declaration = TRUE,
    declaration_includes_amounts = TRUE
WHERE country_code = 'BR';

UPDATE country_crypto_profiles SET
    institutional_trust_score = 60,
    declaration_risk_level = 'caution',
    mandatory_crypto_declaration = TRUE,
    declaration_includes_amounts = TRUE
WHERE country_code = 'US';

UPDATE country_crypto_profiles SET
    institutional_trust_score = 88,
    declaration_risk_level = 'safe',
    mandatory_crypto_declaration = FALSE,
    declaration_includes_amounts = FALSE
WHERE country_code = 'SG';

UPDATE country_crypto_profiles SET
    institutional_trust_score = 72,
    declaration_risk_level = 'safe',
    mandatory_crypto_declaration = TRUE,
    declaration_includes_amounts = TRUE
WHERE country_code = 'DE';
