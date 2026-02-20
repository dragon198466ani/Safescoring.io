-- Cleanup norms: remove fake links and hallucinated summaries
-- Generated: 2026-01-18T11:50:28.694640
-- Total changes: 205

BEGIN;

-- Internal criteria with fake ISO/NIST links
-- A-AMD-SEV: AMD SEV-SNP
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2982;
-- A-ARM-TZ: ARM TrustZone
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2980;
-- A-AZURE-CVM: Azure Confidential Computing
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2988;
-- A-CC-001: Common Criteria EAL5+ Certification
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2868;
-- A-CC-002: Common Criteria EAL6+ Military Grade
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2869;
-- A-CC-003: Common Criteria Physical Tamper Detection
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2870;
-- A-CC-15408: Common Criteria ISO 15408
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2969;
-- A-CEX-WHITELIST: CEX Address Whitelist
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3157;
-- A-CUST-GEOCONT: Custody Geographic Controls
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3177;
-- A-HDN-003: Automatic Decoy Wallet Setup
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2836;
-- A-ISO-17712: ISO 17712 Tamper-Evident Seals
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2971;
-- A-OPS-008: OPSEC Documentation Provided
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2856;
-- A-PHY-002: No Visible Branding
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2846;
-- A-PHY-003: Disguised as Common Object
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2847;
-- A-PHY-004: Minimal Physical Footprint
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2848;
-- A-PNC-002: Instant Wipe Capability
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2840;
-- A-PNC-005: Panic PIN Sends Alert
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2843;
-- A-YIELD-EXIT: Yield Emergency Exit
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3226;
-- A-YIELD-FEE: Yield Fee Disclosure
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3228;
-- A02: Wipe PIN
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 1910;
-- A07: Fake transaction history
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 1915;
-- A08: Believable decoy balance
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 1916;
-- A107: Asset protection trust
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2202;
-- A112: GDPR Art. 20
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2334;
-- A120: APPI
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2342;
-- A123: PDPA
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2345;
-- A127: ORAM
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2348;
-- A133: Panic Wipe
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2354;
-- A152: Incident Disclosure Policy
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2483;
-- A153: Post-Mortem Reports
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2484;
-- A155: Security Contact
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2486;
-- A157: Insurance Provider Disclosed
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2488;
-- A158: Coverage Amount Disclosed
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2489;
-- A159: Claims Process Documented
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2586;
-- A160: Treasury Reserve
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2587;
-- A162: Team Transparency
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2589;
-- A163: Company Registration
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2590;
-- A165: Audit Reports Public
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2592;
-- A166: Disaster Recovery Plan
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2593;
-- A168: Geographic Redundancy
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2595;
-- A169: Failover Testing
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2596;
-- A171: Progressive Reveal
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2598;
-- A186: EU Sanctions Check
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2613;
-- A27: 7d large tx delay
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 1935;
-- A31: Geographic distribution
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 1939;
-- A36: Jurisdictional diversity
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 1944;
-- A44: Proof-of-life mechanism
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 1952;
-- A49: Remote wipe
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 1957;
-- A60: Pocketable size
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 1968;
-- A62: Innocuous packaging
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 1970;
-- A70: No IP logging
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 1978;
-- A89: Traffic padding
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2184;
-- E-BANK-CARD: Crypto Bank Debit Card
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 3277;
-- E-BANK-SAVINGS: Crypto Bank Savings
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3307;
-- E-CUST-STAKE: Custody Staking Services
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3184;
-- E-ISO-25010: ISO 25010 Software Quality
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 3027;
-- E-ISO-9241: ISO 9241 Human-System Interaction
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 3026;
-- E09: Avalanche
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2070;
-- E102: DEX aggregator
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2265;
-- E115: Haptic feedback
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2278;
-- E143: LayerZero
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2391;
-- E151: EN 301 549
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2399;
-- E152: RGAA 4.1
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2400;
-- E157: ISO 9241-210
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2405;
-- E158: ISO 9241-11
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2406;
-- E176: Transaction Simulation
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2510;
-- E190: Price Alerts
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2524;
-- E208: Portfolio Tracking
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2666;
-- E209: P&L Calculationationationation
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2667;
-- E211: Historical Performance
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2669;
-- E223: Dollar-Cost Averaging
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2681;
-- E224: Vault Strategies
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2682;
-- E240: Camera for QR
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2698;
-- E244: NFT Floor Price Alert
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2702;
-- E251: SDK Go
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2709;
-- E254: Sandbox Environment
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2712;
-- E40: Multi-language
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2101;
-- E43: Weight <50g
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2104;
-- E44: Credit card size
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2105;
-- E48: Intuitive setup
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2109;
-- E49: Boot <5s
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2110;
-- E54: Built-in battery
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2115;
-- E56: Standby >6 months
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2117;
-- E67: Price <100€
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2128;
-- E68: Price <200€
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2129;
-- E69: Price <500€
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2130;
-- E70: No recurring fees
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2131;
-- E74: Responsive support <24h
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2135;
-- E77: Near Protocol
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2240;
-- E98: Atomicals
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2261;
-- F-BRIDGE-RATE: Bridge Success Rate
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3287;
-- F-CARD-CONVERT: Crypto Card Conversion Rate
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3303;
-- F-CEX-INSURANCE: CEX Insurance Fund
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3164;
-- F-CHAINLINK-POR: Chainlink Proof of Reserve
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 3009;
-- F-CIS-V8: CIS Controls v8
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3004;
-- F-COLD: Cold Storage Ratio
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 3135;
-- F-CUST-SLA: Custody SLA Guarantee
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 3180;
-- F-FORTA: Forta Network
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3011;
-- F-ISO-001: ISO 27001 Information Security Policy
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2871;
-- F-ISO-002: ISO 27001 Asset Management
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2872;
-- F-ISO-003: ISO 27001 Change Management
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2873;
-- F-ISO-004: ISO 27001 Incident Response Plan
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2874;
-- F-ISO-22301: ISO 22301 Business Continuity
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2999;
-- F-ISO-27001: ISO 27001 ISMS
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2996;
-- F-ISO-27017: ISO 27017 Cloud Security
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2997;
-- F-ISO-27701: ISO 27701 Privacy
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2998;
-- F-NFT-FEE: NFT Fee Transparency
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3253;
-- F-NIST-CSF2: NIST CSF 2.0
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2994;
-- F-OSSF-SC: OpenSSF Scorecard
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3017;
-- F-PAY-LICENSE: Payment EMI License
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3262;
-- F-POSTMORTEM: Post-Mortem Public
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3130;
-- F-REPRO: Reproducible Builds
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3018;
-- F-SEGREG: Fund Segregation
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 3134;
-- F-SOC2-003: SOC 2 Change Management
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2889;
-- F-WALLET-SUPPORT: Wallet Customer Support
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 3292;
-- F02: IP68
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 1985;
-- F06: Extreme cold -55°C
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 1989;
-- F100: Maritime transport
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2227;
-- F102: Temperature logger
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2229;
-- F11: Pressure variation
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 1994;
-- F110: Molybdenum alloy
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2237;
-- F112: MIL-STD-461G
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2358;
-- F113: MIL-STD-883
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2359;
-- F114: MIL-STD-1275
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2360;
-- F115: MIL-HDBK-217F
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2361;
-- F12: UV resistance
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 1995;
-- F128: Tungsten Carbide
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2373;
-- F13: Ozone resistance
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 1996;
-- F133: B10 Life >1M cycles
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2378;
-- F14: Sand/dust resistance
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 1997;
-- F141: SLA 99.9%
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2433;
-- F143: Failover
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2435;
-- F151: Security Monitoring 24/7
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2495;
-- F152: Automated Alerts
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2496;
-- F154: Disaster Recovery Plan
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2498;
-- F157: Geographic Redundancy
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2501;
-- F162: Health Dashboard
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2621;
-- F163: Uptime Monitoring
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2622;
-- F164: Performance Metrics
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2623;
-- F165: Error Tracking
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2624;
-- F167: Automated Testing Pipeline
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2626;
-- F176: Changelog Maintained
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2635;
-- F184: SLA 99.99%
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2643;
-- F185: Multi-Region Deployment
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2644;
-- F192: Firmware Rollback
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2651;
-- F200: Uptime ≥99.9%
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2735;
-- F202: Professional security audit
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2737;
-- F27: Waterjet resistance
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2010;
-- F30: House fire 30min
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2013;
-- F39: Anti-corrosion
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2022;
-- F43: EMI immunity
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2026;
-- F50: Data retention >10yr
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2033;
-- F51: Data retention >25yr
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2034;
-- F52: Data retention >100yr
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2035;
-- F59: Technical ceramic
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2042;
-- F60: Sapphire crystal
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2043;
-- F62: Reinforced polycarbonate
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2045;
-- F65: Laser engraving
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2048;
-- F66: Steel stamping
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2049;
-- F67: MIL-STD-810G full
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2050;
-- F68: MIL-STD-810H
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2051;
-- F69: ISO 9001
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2052;
-- F70: ISO 14001
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2053;
-- F76: CRC verification
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2059;
-- F78: Hermetic seals
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2061;
-- F79: Salt fog test 500h
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2206;
-- F83: Cryogenic -196°C
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2210;
-- F84: Solar radiation
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2211;
-- F85: Vacuum exposure
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2212;
-- F86: Biological resistance
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2213;
-- S-BANK-CYBER: Crypto Bank Cybersecurity
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3305;
-- S-BANK-LICENSE: Crypto Bank License
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3266;
-- S-BRIDGE-MPC: Bridge MPC Signatures
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3280;
-- S-CEX-COLD: CEX Cold Storage Ratio
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 3150;
-- S-LIB-SODIUM: libsodium/NaCl
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2962;
-- S-PAY-FRAUD: Payment Fraud Detection
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 3258;
-- S-SC-ORACLE: Oracle Manipulation Protection
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 3120;
-- S-SLIP-001: SLIP-0039 Shamir Secret Sharing
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2894;
-- S111: PCI DSS
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2161;
-- S117: Intel SGX
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2167;
-- S121: ISO/IEC 27001
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2294;
-- S122: ISO/IEC 27002
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2295;
-- S123: ISO/IEC 27017
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2296;
-- S124: ISO/IEC 27018
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2297;
-- S125: ISO/IEC 27701
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2298;
-- S126: ISO 22301
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2299;
-- S127: ISO 31000
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2300;
-- S140: BSI IT-Grundschutz
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2313;
-- S162: Slither
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2329;
-- S163: Mythril
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2330;
-- S164: Echidna
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2331;
-- S178: Iris Scan
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2451;
-- S194: Tamper Detection
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2467;
-- S200: Anti-Counterfeit
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 2473;
-- S232: Noise Protocol
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2558;
-- S241: CIS Controls v8
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2567;
-- S38: Common Criteria EAL5+
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 1861;
-- S39: Common Criteria EAL6+
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 1862;
-- S47: FCC Part 15
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 1870;
-- S49: ISO 27001
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 1872;
-- S55: Optiga Trust
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 1878;
-- S56: Memory isolation
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 1879;
-- S73: Signed firmware
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 1896;
-- S80: PIN 4-8 digits
UPDATE norms SET official_link = NULL, summary_status = 'pending' WHERE id = 1903;
-- S95: bcrypt
UPDATE norms SET official_link = NULL, official_doc_summary = NULL, summary_status = 'pending' WHERE id = 2145;

COMMIT;
