"use client";

import Link from "next/link";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import config from "@/config";

const content = {
  en: {
    title: `Privacy Policy for ${config.appName}`,
    lastUpdated: "Last Updated: February 2026",
    sections: [
      {
        heading: "1. Data Controller",
        paragraphs: [
          `${config.appName} acts as the data controller for personal data collected through https://safescoring.io.`,
          "Contact: safescoring@proton.me",
          "Data Protection Officer (DPO): For any questions regarding data protection, please contact our DPO at dpo@safescoring.io.",
          "EU/EEA Representative (GDPR Art. 27): If you are in the EU/EEA and wish to contact a local representative, please email: eu-representative@safescoring.io.",
          "UK Representative (UK GDPR): uk-representative@safescoring.io.",
        ],
      },
      {
        heading: "2. Legal Basis for Processing (GDPR Article 6)",
        paragraphs: ["We process your data based on:"],
        list: [
          "Contract performance: To provide our services",
          "Legitimate interests: To improve our services and prevent fraud",
          "Consent: For marketing communications (opt-in only)",
        ],
      },
      {
        heading: "3. Personal Data We Collect",
        subsections: [
          {
            subheading: "3.1 Account Data:",
            list: [
              "Email address (required for authentication)",
              "Name (optional, for personalization)",
              "OAuth profile data (if using Google sign-in)",
            ],
          },
          {
            subheading: "3.2 Payment Data:",
            list: [
              "Fiat payments processed securely by LemonSqueezy (Merchant of Record)",
              "Crypto payments processed by MoonPay",
              "We do NOT store credit card numbers",
              "We store: customer ID, subscription status",
            ],
          },
          {
            subheading: "3.3 Usage Data:",
            list: [
              "Products viewed (for usage limits)",
              "Preferences and interests (onboarding)",
              "Referral data: unique referral code, referral count, and referring user code (for the referral rewards program)",
              "Email communication log: record of service emails sent (type and date, for compliance and to prevent duplicates)",
            ],
          },
        ],
      },
      {
        heading: "4. Data We Do NOT Collect",
        list: [
          "We do NOT collect cryptocurrency wallet addresses",
          "We do NOT collect financial holdings information",
          "We do NOT track your cryptocurrency transactions",
          "We do NOT sell your data to third parties",
        ],
      },
      {
        heading: "5. Data Retention",
        list: [
          "Account data: Until account deletion",
          "Usage data: 12 months rolling",
          "Payment records: As required by law (typically 7 years)",
        ],
      },
      {
        heading: "6. Your Rights Under GDPR",
        paragraphs: ["You have the right to:"],
        list: [
          "6.1 Access: Request a copy of your personal data",
          "6.2 Rectification: Correct inaccurate data",
          '6.3 Erasure: Request deletion of your data ("right to be forgotten")',
          "6.4 Portability: Receive your data in a portable format",
          "6.5 Restriction: Limit how we use your data",
          "6.6 Objection: Object to processing based on legitimate interests",
          "6.7 Withdraw consent: At any time for consent-based processing",
          "6.8 Automated Decision-Making (Article 22): SafeScoring uses algorithmic methods to calculate security scores for crypto products. These scores are generated through automated processing of publicly available technical data (open-source code, security audits, protocol configurations) and do not involve profiling of individual users. You have the right not to be subject to a decision based solely on automated processing that produces legal effects concerning you or similarly significantly affects you. Product scores do not constitute decisions about individuals.",
        ],
        footer: "To exercise these rights, contact: support@safescoring.io",
      },
      {
        heading: "7. Data Security",
        paragraphs: [
          "We implement appropriate technical and organizational measures:",
        ],
        list: [
          "Encrypted data transmission (HTTPS/TLS)",
          "Encrypted data at rest",
          "Row-level security (RLS) in our database",
          "Regular security audits",
          "Access controls and authentication",
        ],
      },
      {
        heading: "8. International Transfers",
        paragraphs: [
          "Data is processed within the EU/EEA. If transferred outside, we ensure adequate safeguards (Standard Contractual Clauses).",
        ],
      },
      {
        heading: "9. Third-Party Processors",
        paragraphs: ["We use the following processors:"],
        list: [
          "Supabase (Database): EU servers, GDPR compliant",
          "LemonSqueezy (Fiat Payments): Merchant of Record, EU VAT compliant",
          "MoonPay (Crypto Payments): Licensed money service business, KYC/AML compliant",
          "Google (OAuth): Standard Contractual Clauses (SCCs), GDPR compliant",
          "Resend (Email): GDPR compliant",
          "Plausible Analytics (Website Analytics): Privacy-first, cookieless, no personal data collected, EU-hosted, GDPR compliant",
          "Sentry (Error Monitoring): Used for application error tracking. Captures technical error data (stack traces, URLs) but not personal identifiers. Configured with sendDefaultPii: false",
          "Cloudflare (Turnstile CAPTCHA): Used for bot protection on forms. Processes IP address and browser metadata to verify human users. Privacy policy: cloudflare.com/privacypolicy",
          "Vercel (Hosting): Application hosting. Data routed via edge network. Standard Contractual Clauses in place for international transfers",
        ],
      },
      {
        heading: "10. Cookies",
        list: [
          "10.1 Essential cookies: Required for authentication (session management)",
          "10.2 We do NOT use advertising or tracking cookies",
          "10.3 We use Plausible Analytics, a privacy-first, cookieless analytics service that does not track individual users, use cookies, or collect personally identifiable information",
        ],
      },
      {
        heading: "11. Children's Privacy",
        paragraphs: [
          `${config.appName} is not intended for users under 18. We do not knowingly collect data from minors.`,
        ],
      },
      {
        heading: "12. Data Breach Notification",
        paragraphs: [
          "In case of a data breach affecting your rights, we will notify you and relevant authorities within 72 hours as required by GDPR.",
        ],
      },
      {
        heading: "13. Updates to This Policy",
        paragraphs: [
          "We may update this policy periodically. For material changes, we will notify you via the email address associated with your account at least 30 days before the changes take effect. Minor, non-material changes may be posted on this page with an updated effective date. You may review changes and withdraw consent by deleting your account at any time. If you do not agree with updated terms, you should discontinue use of the service before the effective date.",
        ],
      },
      {
        heading: "14. Supervisory Authority",
        paragraphs: [
          "You have the right to lodge a complaint with a supervisory authority (CNIL in France).",
        ],
      },
      {
        heading: "15. California Consumer Privacy Act (CCPA)",
        paragraphs: [
          "If you are a California resident, you have additional rights under the CCPA:",
        ],
        list: [
          "15.1 Right to Know: You may request details about the personal information we collect and how we use it.",
          "15.2 Right to Delete: You may request deletion of your personal information.",
          `15.3 Right to Opt-Out: ${config.appName} does NOT sell your personal information to third parties. We never have and never will.`,
          "15.4 Non-Discrimination: We will not discriminate against you for exercising your CCPA rights.",
          "15.5 To exercise your rights, contact us at: support@safescoring.io",
        ],
      },
      {
        heading: "16. Lei Geral de Proteção de Dados (LGPD) — Brazil",
        paragraphs: [
          "If you are a resident of Brazil, you have additional rights under the LGPD:",
        ],
        list: [
          "16.1 Confirmation: You may request confirmation of whether your data is being processed.",
          "16.2 Access: You may request access to your personal data.",
          "16.3 Correction: You may request correction of incomplete, inaccurate, or outdated data.",
          "16.4 Anonymization or Deletion: You may request anonymization, blocking, or deletion of unnecessary or excessive data.",
          "16.5 Portability: You may request portability of your data to another service provider.",
          "16.6 Supervisory Authority: The Autoridade Nacional de Proteção de Dados (ANPD) oversees LGPD compliance.",
        ],
      },
      {
        heading: "17. Personal Information Protection and Electronic Documents Act (PIPEDA) — Canada",
        paragraphs: [
          "If you are a resident of Canada, you have rights under PIPEDA:",
        ],
        list: [
          "17.1 Consent: We collect and use your personal information only with your knowledge and consent.",
          "17.2 Access: You may request access to your personal information held by us.",
          "17.3 Correction: You may challenge the accuracy and completeness of your data and have it amended.",
          "17.4 Withdrawal: You may withdraw your consent at any time, subject to legal or contractual restrictions.",
          "17.5 Supervisory Authority: The Office of the Privacy Commissioner of Canada (OPC) oversees PIPEDA compliance.",
        ],
      },
      {
        heading: "18. Protection of Personal Information Act (POPIA) — South Africa",
        paragraphs: [
          "If you are a resident of South Africa, you have rights under POPIA:",
        ],
        list: [
          "18.1 Access: You may request access to your personal information.",
          "18.2 Correction: You may request correction or deletion of your personal information.",
          "18.3 Objection: You may object to the processing of your personal information.",
          "18.4 Complaint: You may lodge a complaint with the Information Regulator.",
          "18.5 Supervisory Authority: The Information Regulator of South Africa oversees POPIA compliance.",
        ],
      },
      {
        heading: "19. Australian Privacy Act (APPs) — Australia",
        paragraphs: [
          "If you are a resident of Australia, your personal information is handled in accordance with the Australian Privacy Principles (APPs):",
        ],
        list: [
          "19.1 Transparency: We maintain a clear and up-to-date privacy policy about how we manage your personal information.",
          "19.2 Access: You may request access to the personal information we hold about you.",
          "19.3 Correction: You may request correction of your personal information if it is inaccurate or outdated.",
          "19.4 Cross-border Disclosure: Before disclosing personal information overseas, we take reasonable steps to ensure compliance with the APPs.",
          "19.5 Supervisory Authority: The Office of the Australian Information Commissioner (OAIC) oversees privacy compliance.",
        ],
      },
      {
        heading: "20. Personal Data Protection Act (PDPA) — Southeast Asia",
        paragraphs: [
          "If you are a resident of Singapore, Thailand, or other Southeast Asian jurisdictions with PDPA legislation, you have the following rights:",
        ],
        list: [
          "20.1 Consent: We process your personal data only with your consent or as permitted by law.",
          "20.2 Access: You may request access to your personal data.",
          "20.3 Correction: You may request correction of any inaccurate personal data.",
          "20.4 Withdrawal: You may withdraw your consent at any time.",
          "20.5 Supervisory Authority: The Personal Data Protection Commission (PDPC) in Singapore, or the equivalent authority in your jurisdiction, oversees compliance.",
        ],
      },
      {
        heading: "21. UK General Data Protection Regulation (UK GDPR) — United Kingdom",
        paragraphs: [
          "If you are a resident of the United Kingdom, you have rights under the UK GDPR:",
        ],
        list: [
          "21.1 Access: You may request a copy of the personal data we hold about you.",
          "21.2 Rectification: You may request correction of inaccurate or incomplete personal data.",
          "21.3 Erasure: You may request deletion of your personal data where there is no compelling reason for continued processing.",
          "21.4 Portability: You may request that your personal data be transferred to another controller in a structured, machine-readable format.",
          "21.5 Objection: You may object to processing based on legitimate interests or for direct marketing purposes.",
          "21.6 Supervisory Authority: The Information Commissioner's Office (ICO) oversees UK GDPR compliance.",
        ],
      },
      {
        heading: "22. Federal Act on Data Protection (nFADP) — Switzerland",
        paragraphs: [
          "If you are a resident of Switzerland, you have rights under the revised Federal Act on Data Protection (nFADP/nDSG):",
        ],
        list: [
          "22.1 Right to Information: You may request information about whether and how your personal data is being processed.",
          "22.2 Right to Access: You may request access to your personal data free of charge.",
          "22.3 Right to Rectification: You may request correction of inaccurate personal data.",
          "22.4 Right to Deletion: You may request deletion of your personal data.",
          "22.5 Right to Data Portability: You may request your personal data in a commonly used electronic format.",
          "22.6 Supervisory Authority: The Federal Data Protection and Information Commissioner (FDPIC) oversees nFADP compliance.",
        ],
      },
      {
        heading: "23. Personal Information Protection Act (PIPA) — South Korea",
        paragraphs: [
          "If you are a resident of South Korea, you have rights under PIPA:",
        ],
        list: [
          "23.1 Access: You may request access to your personal information.",
          "23.2 Correction and Deletion: You may request correction or deletion of your personal information.",
          "23.3 Suspension: You may request suspension of the processing of your personal information.",
          "23.4 Notification: You have the right to be informed about the collection and use of your personal information.",
          "23.5 Supervisory Authority: The Personal Information Protection Commission (PIPC) oversees PIPA compliance.",
        ],
      },
      {
        heading: "24. Personal Data Protection Decree (PDPD) — Vietnam",
        paragraphs: [
          "If you are a resident of Vietnam, you have rights under the PDPD:",
        ],
        list: [
          "24.1 Consent: Processing of your personal data requires your consent.",
          "24.2 Access: You may request access to your personal data.",
          "24.3 Correction: You may request correction of inaccurate personal data.",
          "24.4 Deletion: You may request deletion of your personal data.",
          "24.5 Cross-border Transfer: Transfer of personal data outside Vietnam is subject to specific conditions.",
          "24.6 Supervisory Authority: The Ministry of Public Security oversees PDPD compliance.",
        ],
      },
      {
        heading: "25. Act on the Protection of Personal Information (APPI) — Japan",
        paragraphs: [
          "If you are a resident of Japan, you have rights under the APPI:",
        ],
        list: [
          "25.1 Disclosure: You may request disclosure of your personal information held by us.",
          "25.2 Correction: You may request correction, addition, or deletion of inaccurate personal information.",
          "25.3 Cessation of Use: You may request cessation of use or deletion of your personal information if it was obtained improperly.",
          "25.4 Cessation of Third-Party Provision: You may request that we stop providing your personal information to third parties.",
          "25.5 Supervisory Authority: The Personal Information Protection Commission (PPC) oversees APPI compliance.",
        ],
      },
      {
        heading: "26. Digital Personal Data Protection Act (DPDPA) — India",
        paragraphs: [
          "If you are a resident of India, you have rights under the DPDPA:",
        ],
        list: [
          "26.1 Right to Information: You have the right to obtain a summary of your personal data being processed.",
          "26.2 Right to Correction and Erasure: You may request correction of inaccurate or misleading data, and erasure of data no longer necessary.",
          "26.3 Right to Grievance Redressal: You have the right to have your grievances addressed by the data fiduciary.",
          "26.4 Right to Nominate: You may nominate another person to exercise your rights in case of death or incapacity.",
          "26.5 Supervisory Authority: The Data Protection Board of India oversees DPDPA compliance.",
        ],
      },
      {
        heading: "27. Personal Data Protection Law (PDPL) — United Arab Emirates",
        paragraphs: [
          "If you are a resident of the UAE, you have rights under the PDPL (Federal Decree-Law No. 45 of 2021):",
        ],
        list: [
          "27.1 Access: You may request access to your personal data.",
          "27.2 Correction: You may request rectification of inaccurate personal data.",
          "27.3 Erasure: You may request deletion of your personal data under certain conditions.",
          "27.4 Restriction: You may request restriction of processing of your personal data.",
          "27.5 Portability: You may request transfer of your personal data in a readable format.",
          "27.6 Supervisory Authority: The UAE Data Office oversees PDPL compliance.",
        ],
      },
      {
        heading: "28. Privacy Protection Law — Israel",
        paragraphs: [
          "If you are a resident of Israel, you have rights under the Privacy Protection Law (as amended):",
        ],
        list: [
          "28.1 Access: You may request to review your personal data held in our databases.",
          "28.2 Correction: You may request correction or deletion of inaccurate data.",
          "28.3 Objection: You may object to the use of your data for direct marketing purposes.",
          "28.4 Right to be Forgotten: You may request deletion of your data under certain conditions.",
          "28.5 Supervisory Authority: The Privacy Protection Authority (PPA) oversees compliance.",
        ],
      },
      {
        heading: "29. Personal Data Protection Law (KVKK) — Turkey",
        paragraphs: [
          "If you are a resident of Turkey, you have rights under the KVKK (Law No. 6698):",
        ],
        list: [
          "29.1 Information: You may request information about whether your personal data is being processed.",
          "29.2 Access: You may request access to your personal data and information about its purpose.",
          "29.3 Correction: You may request correction of incomplete or inaccurate data.",
          "29.4 Deletion: You may request deletion or destruction of your personal data.",
          "29.5 Objection: You may object to any result arising from the analysis of your data by automated systems.",
          "29.6 Supervisory Authority: The Personal Data Protection Authority (KVKK) oversees compliance.",
        ],
      },
      {
        heading: "30. Nigeria Data Protection Act (NDPA) — Nigeria",
        paragraphs: [
          "If you are a resident of Nigeria, you have rights under the NDPA:",
        ],
        list: [
          "30.1 Access: You may request access to your personal data.",
          "30.2 Rectification: You may request correction of inaccurate personal data.",
          "30.3 Erasure: You may request deletion of your personal data.",
          "30.4 Restriction: You may request restriction of processing of your personal data.",
          "30.5 Portability: You may request your personal data in a structured, machine-readable format.",
          "30.6 Supervisory Authority: The Nigeria Data Protection Commission (NDPC) oversees NDPA compliance.",
        ],
      },
      {
        heading: "31. Data Protection Act (DPA) — Kenya",
        paragraphs: [
          "If you are a resident of Kenya, you have rights under the DPA:",
        ],
        list: [
          "31.1 Access: You may request confirmation of whether your data is being processed and access to it.",
          "31.2 Correction: You may request correction of false or misleading data.",
          "31.3 Deletion: You may request deletion of your personal data.",
          "31.4 Objection: You may object to the processing of your personal data.",
          "31.5 Supervisory Authority: The Office of the Data Protection Commissioner (ODPC) oversees DPA compliance.",
        ],
      },
      {
        heading: "32. Personal Data Protection Law (PDPA) — Argentina",
        paragraphs: [
          "If you are a resident of Argentina, you have rights under Law 25,326:",
        ],
        list: [
          "32.1 Access: You may request access to your personal data free of charge.",
          "32.2 Rectification: You may request correction of inaccurate data.",
          "32.3 Deletion: You may request suppression of your personal data.",
          "32.4 Confidentiality: You may request that your data be treated as confidential.",
          "32.5 Supervisory Authority: The Agency of Access to Public Information (AAIP) oversees compliance.",
        ],
      },
      {
        heading: "33. Data Protection Law (Law 1581) — Colombia",
        paragraphs: [
          "If you are a resident of Colombia, you have rights under Law 1581 of 2012:",
        ],
        list: [
          "33.1 Access: You may request access to your personal data.",
          "33.2 Correction: You may request update or correction of your personal data.",
          "33.3 Deletion: You may request deletion of your personal data when not required by law.",
          "33.4 Revocation: You may revoke your consent for data processing.",
          "33.5 Supervisory Authority: The Superintendence of Industry and Commerce (SIC) oversees compliance.",
        ],
      },
      {
        heading: "34. Federal Law on Protection of Personal Data (LFPDPPP) — Mexico",
        paragraphs: [
          "If you are a resident of Mexico, you have ARCO rights under the LFPDPPP:",
        ],
        list: [
          "34.1 Access (Acceso): You may request access to your personal data.",
          "34.2 Rectification (Rectificación): You may request correction of inaccurate data.",
          "34.3 Cancellation (Cancelación): You may request deletion of your personal data.",
          "34.4 Opposition (Oposición): You may oppose the processing of your personal data.",
          "34.5 Supervisory Authority: The Ministry of Anti-Corruption and Good Governance oversees LFPDPPP compliance.",
        ],
      },
      {
        heading: "35. Data Privacy Act — Philippines",
        paragraphs: [
          "If you are a resident of the Philippines, you have rights under the Data Privacy Act of 2012:",
        ],
        list: [
          "35.1 Right to be Informed: You have the right to be informed about the processing of your personal data.",
          "35.2 Access: You may request access to your personal data.",
          "35.3 Correction: You may request correction of inaccurate personal data.",
          "35.4 Erasure: You may request suspension, withdrawal, or blocking of your personal data.",
          "35.5 Portability: You may request your data in an electronic or structured format.",
          "35.6 Supervisory Authority: The National Privacy Commission (NPC) oversees compliance.",
        ],
      },
      {
        heading: "36. Personal Data Protection Act (PDPA) — Malaysia",
        paragraphs: [
          "If you are a resident of Malaysia, you have rights under the PDPA 2010:",
        ],
        list: [
          "36.1 Access: You may request access to your personal data.",
          "36.2 Correction: You may request correction of personal data that is inaccurate, incomplete, or misleading.",
          "36.3 Withdrawal: You may withdraw your consent for data processing.",
          "36.4 Prevention of Processing: You may request that we cease processing your personal data if it is causing damage or distress.",
          "36.5 Supervisory Authority: The Personal Data Protection Commissioner oversees PDPA compliance.",
        ],
      },
      {
        heading: "37. Personal Data Protection Law (PDP Law) — Indonesia",
        paragraphs: [
          "If you are a resident of Indonesia, you have rights under Law No. 27 of 2022:",
        ],
        list: [
          "37.1 Access: You may request access to your personal data.",
          "37.2 Correction: You may request correction of inaccurate personal data.",
          "37.3 Deletion: You may request deletion of your personal data.",
          "37.4 Withdrawal: You may withdraw your consent at any time.",
          "37.5 Portability: You may request transfer of your personal data to another controller.",
          "37.6 Supervisory Authority: The Ministry of Communication and Digital Affairs oversees PDP Law compliance.",
        ],
      },
      {
        heading: "38. Privacy Act 2020 — New Zealand",
        paragraphs: [
          "If you are a resident of New Zealand, you have rights under the Privacy Act 2020:",
        ],
        list: [
          "38.1 Access: You may request access to your personal information.",
          "38.2 Correction: You may request correction of personal information that is inaccurate.",
          "38.3 Complaints: You may lodge a complaint if you believe your privacy has been breached.",
          "38.4 Cross-border Disclosure: We ensure appropriate safeguards before disclosing personal information overseas.",
          "38.5 Supervisory Authority: The Office of the Privacy Commissioner oversees Privacy Act compliance.",
        ],
      },
      {
        heading: "39. Personal Data Protection Act (PDPA) — Taiwan",
        paragraphs: [
          "If you are a resident of Taiwan, you have rights under the PDPA:",
        ],
        list: [
          "39.1 Access: You may request to review or obtain copies of your personal data.",
          "39.2 Correction: You may request correction or supplementation of your personal data.",
          "39.3 Cessation: You may request cessation of collection, processing, or use of your personal data.",
          "39.4 Deletion: You may request deletion of your personal data.",
          "39.5 Supervisory Authority: The National Development Council (transitioning to a dedicated Personal Data Protection Commission) oversees compliance.",
        ],
      },
      {
        heading: "40. Personal Data (Privacy) Ordinance (PDPO) — Hong Kong",
        paragraphs: [
          "If you are a resident of Hong Kong, you have rights under the PDPO:",
        ],
        list: [
          "40.1 Access: You may request access to your personal data.",
          "40.2 Correction: You may request correction of inaccurate personal data.",
          "40.3 Opt-out: You may opt out of receiving direct marketing communications.",
          "40.4 Complaints: You may lodge a complaint regarding data privacy breaches.",
          "40.5 Supervisory Authority: The Office of the Privacy Commissioner for Personal Data (PCPD) oversees PDPO compliance.",
        ],
      },
      {
        heading: "41. Contact",
        paragraphs: [
          "Data Protection Inquiries:",
          "General: safescoring@proton.me",
          "Data Protection Officer (DPO): dpo@safescoring.io",
          "EU/EEA Representative: eu-representative@safescoring.io",
          "UK Representative: uk-representative@safescoring.io",
        ],
        footer: `By using ${config.appName}, you acknowledge that you have read and understood this Privacy Policy.`,
      },
    ],
  },
  fr: {
    title: `Politique de Confidentialité de ${config.appName}`,
    lastUpdated: "Dernière mise à jour : Février 2026",
    sections: [
      {
        heading: "1. Responsable du traitement",
        paragraphs: [
          `${config.appName} agit en tant que responsable du traitement des données personnelles collectées via https://safescoring.io.`,
          "Contact : safescoring@proton.me",
          "Délégué à la protection des données (DPO) : Pour toute question relative à la protection des données, contactez notre DPO à dpo@safescoring.io.",
          "Représentant UE/EEE (RGPD Art. 27) : Si vous êtes dans l'UE/EEE et souhaitez contacter un représentant local, veuillez écrire à : eu-representative@safescoring.io.",
          "Représentant Royaume-Uni (UK GDPR) : uk-representative@safescoring.io.",
        ],
      },
      {
        heading: "2. Base légale du traitement (RGPD Article 6)",
        paragraphs: ["Nous traitons vos données sur la base de :"],
        list: [
          "Exécution du contrat : Pour fournir nos services",
          "Intérêts légitimes : Pour améliorer nos services et prévenir la fraude",
          "Consentement : Pour les communications marketing (opt-in uniquement)",
        ],
      },
      {
        heading: "3. Données personnelles collectées",
        subsections: [
          {
            subheading: "3.1 Données de compte :",
            list: [
              "Adresse e-mail (requise pour l'authentification)",
              "Nom (optionnel, pour la personnalisation)",
              "Données de profil OAuth (si connexion via Google)",
            ],
          },
          {
            subheading: "3.2 Données de paiement :",
            list: [
              "Paiements en monnaie fiduciaire traités de manière sécurisée par LemonSqueezy (Merchant of Record)",
              "Paiements crypto traités par MoonPay",
              "Nous ne stockons PAS les numéros de carte bancaire",
              "Nous stockons : identifiant client, statut d'abonnement",
            ],
          },
          {
            subheading: "3.3 Données d'utilisation :",
            list: [
              "Produits consultés (pour les limites d'utilisation)",
              "Préférences et centres d'intérêt (onboarding)",
              "Données de parrainage : code de parrainage unique, nombre de parrainages, et code du parrain (pour le programme de récompenses)",
              "Journal des communications email : type et date des emails de service envoyés (conformité et prévention des doublons)",
            ],
          },
        ],
      },
      {
        heading: "4. Données que nous ne collectons PAS",
        list: [
          "Nous ne collectons PAS les adresses de portefeuilles crypto",
          "Nous ne collectons PAS d'informations sur vos avoirs financiers",
          "Nous ne suivons PAS vos transactions crypto",
          "Nous ne vendons PAS vos données à des tiers",
        ],
      },
      {
        heading: "5. Conservation des données",
        list: [
          "Données de compte : Jusqu'à la suppression du compte",
          "Données d'utilisation : 12 mois glissants",
          "Registres de paiement : Conformément à la loi (généralement 7 ans)",
        ],
      },
      {
        heading: "6. Vos droits en vertu du RGPD",
        paragraphs: ["Vous avez le droit de :"],
        list: [
          "6.1 Accès : Demander une copie de vos données personnelles",
          "6.2 Rectification : Corriger des données inexactes",
          '6.3 Effacement : Demander la suppression de vos données ("droit à l\'oubli")',
          "6.4 Portabilité : Recevoir vos données dans un format portable",
          "6.5 Limitation : Limiter l'utilisation de vos données",
          "6.6 Opposition : S'opposer au traitement fondé sur des intérêts légitimes",
          "6.7 Retrait du consentement : À tout moment pour les traitements fondés sur le consentement",
          "6.8 Prise de décision automatisée (Article 22) : SafeScoring utilise des méthodes algorithmiques pour calculer les scores de sécurité des produits crypto. Ces scores sont générés par un traitement automatisé de données techniques publiquement disponibles (code open-source, audits de sécurité, configurations de protocoles) et n'impliquent pas de profilage des utilisateurs individuels. Vous avez le droit de ne pas faire l'objet d'une décision fondée exclusivement sur un traitement automatisé produisant des effets juridiques vous concernant ou vous affectant de manière significative. Les scores de produits ne constituent pas des décisions concernant des individus.",
        ],
        footer:
          "Pour exercer ces droits, contactez : support@safescoring.io",
      },
      {
        heading: "7. Sécurité des données",
        paragraphs: [
          "Nous mettons en œuvre des mesures techniques et organisationnelles appropriées :",
        ],
        list: [
          "Transmission chiffrée des données (HTTPS/TLS)",
          "Données chiffrées au repos",
          "Sécurité au niveau des lignes (RLS) dans notre base de données",
          "Audits de sécurité réguliers",
          "Contrôles d'accès et authentification",
        ],
      },
      {
        heading: "8. Transferts internationaux",
        paragraphs: [
          "Les données sont traitées au sein de l'UE/EEE. En cas de transfert hors UE, nous assurons des garanties adéquates (Clauses Contractuelles Types).",
        ],
      },
      {
        heading: "9. Sous-traitants",
        paragraphs: ["Nous utilisons les sous-traitants suivants :"],
        list: [
          "Supabase (Base de données) : Serveurs UE, conforme au RGPD",
          "LemonSqueezy (Paiements fiat) : Merchant of Record, conforme TVA UE",
          "MoonPay (Paiements crypto) : Service financier agréé, conforme KYC/AML",
          "Google (OAuth) : Clauses Contractuelles Types (CCT), conforme au RGPD",
          "Resend (E-mail) : Conforme au RGPD",
          "Plausible Analytics (Analyse web) : Service d'analyse respectueux de la vie privée, sans cookies, aucune donnée personnelle collectée, hébergé en UE, conforme au RGPD",
          "Sentry (Surveillance des erreurs) : Utilisé pour le suivi des erreurs applicatives. Capture des données techniques (traces d'erreurs, URLs) mais pas d'identifiants personnels. Configuré avec sendDefaultPii: false",
          "Cloudflare (Turnstile CAPTCHA) : Utilisé pour la protection contre les robots sur les formulaires. Traite l'adresse IP et les métadonnées du navigateur pour vérifier les utilisateurs humains. Politique de confidentialité : cloudflare.com/privacypolicy",
          "Vercel (Hébergement) : Hébergement de l'application. Données acheminées via le réseau edge. Clauses Contractuelles Types en place pour les transferts internationaux",
        ],
      },
      {
        heading: "10. Cookies",
        list: [
          "10.1 Cookies essentiels : Nécessaires à l'authentification (gestion de session)",
          "10.2 Nous n'utilisons PAS de cookies publicitaires ou de suivi",
          "10.3 Nous utilisons Plausible Analytics, un service d'analyse respectueux de la vie privée qui ne suit pas les utilisateurs individuellement, n'utilise pas de cookies et ne collecte aucune donnée personnelle identifiable",
        ],
      },
      {
        heading: "11. Protection des mineurs",
        paragraphs: [
          `${config.appName} n'est pas destiné aux utilisateurs de moins de 18 ans. Nous ne collectons pas sciemment de données de mineurs.`,
        ],
      },
      {
        heading: "12. Notification de violation de données",
        paragraphs: [
          "En cas de violation de données affectant vos droits, nous vous notifierons ainsi que les autorités compétentes dans les 72 heures, conformément au RGPD.",
        ],
      },
      {
        heading: "13. Mises à jour de cette politique",
        paragraphs: [
          "Nous pouvons mettre à jour cette politique périodiquement. Pour les modifications substantielles, nous vous notifierons par e-mail à l'adresse associée à votre compte au moins 30 jours avant l'entrée en vigueur des changements. Les modifications mineures et non substantielles pourront être publiées sur cette page avec une date de mise à jour. Vous pouvez consulter les changements et retirer votre consentement en supprimant votre compte à tout moment. Si vous n'acceptez pas les conditions mises à jour, vous devez cesser d'utiliser le service avant la date d'entrée en vigueur.",
        ],
      },
      {
        heading: "14. Autorité de contrôle",
        paragraphs: [
          "Vous avez le droit de déposer une réclamation auprès d'une autorité de contrôle (CNIL en France).",
        ],
      },
      {
        heading: "15. California Consumer Privacy Act (CCPA)",
        paragraphs: [
          "Si vous êtes résident de Californie, vous disposez de droits supplémentaires en vertu du CCPA :",
        ],
        list: [
          "15.1 Droit de savoir : Vous pouvez demander des informations sur les données personnelles que nous collectons et comment nous les utilisons.",
          "15.2 Droit de suppression : Vous pouvez demander la suppression de vos données personnelles.",
          `15.3 Droit de refus : ${config.appName} ne vend PAS vos données personnelles à des tiers. Nous ne l'avons jamais fait et ne le ferons jamais.`,
          "15.4 Non-discrimination : Nous ne vous discriminerons pas pour l'exercice de vos droits CCPA.",
          "15.5 Pour exercer vos droits, contactez-nous à : support@safescoring.io",
        ],
      },
      {
        heading: "16. Lei Geral de Proteção de Dados (LGPD) — Brésil",
        paragraphs: [
          "Si vous êtes résident du Brésil, vous disposez de droits supplémentaires en vertu de la LGPD :",
        ],
        list: [
          "16.1 Confirmation : Vous pouvez demander la confirmation du traitement de vos données.",
          "16.2 Accès : Vous pouvez demander l'accès à vos données personnelles.",
          "16.3 Correction : Vous pouvez demander la correction de données incomplètes, inexactes ou obsolètes.",
          "16.4 Anonymisation ou suppression : Vous pouvez demander l'anonymisation, le blocage ou la suppression de données inutiles ou excessives.",
          "16.5 Portabilité : Vous pouvez demander la portabilité de vos données vers un autre fournisseur de services.",
          "16.6 Autorité de contrôle : L'Autoridade Nacional de Proteção de Dados (ANPD) supervise la conformité à la LGPD.",
        ],
      },
      {
        heading: "17. Loi sur la protection des renseignements personnels et les documents électroniques (PIPEDA) — Canada",
        paragraphs: [
          "Si vous êtes résident du Canada, vous disposez de droits en vertu de la PIPEDA :",
        ],
        list: [
          "17.1 Consentement : Nous collectons et utilisons vos renseignements personnels uniquement avec votre connaissance et votre consentement.",
          "17.2 Accès : Vous pouvez demander l'accès aux renseignements personnels que nous détenons.",
          "17.3 Correction : Vous pouvez contester l'exactitude et l'intégralité de vos données et les faire modifier.",
          "17.4 Retrait : Vous pouvez retirer votre consentement à tout moment, sous réserve de restrictions légales ou contractuelles.",
          "17.5 Autorité de contrôle : Le Commissariat à la protection de la vie privée du Canada (CPVP) supervise la conformité à la PIPEDA.",
        ],
      },
      {
        heading: "18. Protection of Personal Information Act (POPIA) — Afrique du Sud",
        paragraphs: [
          "Si vous êtes résident d'Afrique du Sud, vous disposez de droits en vertu de la POPIA :",
        ],
        list: [
          "18.1 Accès : Vous pouvez demander l'accès à vos informations personnelles.",
          "18.2 Correction : Vous pouvez demander la correction ou la suppression de vos informations personnelles.",
          "18.3 Opposition : Vous pouvez vous opposer au traitement de vos informations personnelles.",
          "18.4 Réclamation : Vous pouvez déposer une plainte auprès du Régulateur de l'Information.",
          "18.5 Autorité de contrôle : Le Régulateur de l'Information d'Afrique du Sud supervise la conformité à la POPIA.",
        ],
      },
      {
        heading: "19. Australian Privacy Act (APPs) — Australie",
        paragraphs: [
          "Si vous êtes résident d'Australie, vos informations personnelles sont traitées conformément aux Australian Privacy Principles (APPs) :",
        ],
        list: [
          "19.1 Transparence : Nous maintenons une politique de confidentialité claire et à jour sur la gestion de vos informations personnelles.",
          "19.2 Accès : Vous pouvez demander l'accès aux informations personnelles que nous détenons à votre sujet.",
          "19.3 Correction : Vous pouvez demander la correction de vos informations personnelles si elles sont inexactes ou obsolètes.",
          "19.4 Divulgation transfrontalière : Avant de divulguer des informations personnelles à l'étranger, nous prenons des mesures raisonnables pour assurer la conformité aux APPs.",
          "19.5 Autorité de contrôle : L'Office of the Australian Information Commissioner (OAIC) supervise la conformité en matière de vie privée.",
        ],
      },
      {
        heading: "20. Personal Data Protection Act (PDPA) — Asie du Sud-Est",
        paragraphs: [
          "Si vous êtes résident de Singapour, de Thaïlande ou d'autres juridictions d'Asie du Sud-Est disposant d'une législation PDPA, vous avez les droits suivants :",
        ],
        list: [
          "20.1 Consentement : Nous traitons vos données personnelles uniquement avec votre consentement ou selon les autorisations légales.",
          "20.2 Accès : Vous pouvez demander l'accès à vos données personnelles.",
          "20.3 Correction : Vous pouvez demander la correction de toute donnée personnelle inexacte.",
          "20.4 Retrait : Vous pouvez retirer votre consentement à tout moment.",
          "20.5 Autorité de contrôle : La Personal Data Protection Commission (PDPC) à Singapour, ou l'autorité équivalente dans votre juridiction, supervise la conformité.",
        ],
      },
      {
        heading: "21. UK General Data Protection Regulation (UK GDPR) — Royaume-Uni",
        paragraphs: [
          "Si vous êtes résident du Royaume-Uni, vous disposez de droits en vertu du UK GDPR :",
        ],
        list: [
          "21.1 Accès : Vous pouvez demander une copie des données personnelles que nous détenons à votre sujet.",
          "21.2 Rectification : Vous pouvez demander la correction de données personnelles inexactes ou incomplètes.",
          "21.3 Effacement : Vous pouvez demander la suppression de vos données personnelles en l'absence de raison impérieuse de poursuivre le traitement.",
          "21.4 Portabilité : Vous pouvez demander le transfert de vos données personnelles vers un autre responsable de traitement dans un format structuré et lisible par machine.",
          "21.5 Opposition : Vous pouvez vous opposer au traitement fondé sur des intérêts légitimes ou à des fins de marketing direct.",
          "21.6 Autorité de contrôle : L'Information Commissioner's Office (ICO) supervise la conformité au UK GDPR.",
        ],
      },
      {
        heading: "22. Loi fédérale sur la protection des données (nLPD) — Suisse",
        paragraphs: [
          "Si vous êtes résident de Suisse, vous disposez de droits en vertu de la nouvelle Loi fédérale sur la protection des données (nLPD/nDSG) :",
        ],
        list: [
          "22.1 Droit à l'information : Vous pouvez demander des informations sur le traitement de vos données personnelles.",
          "22.2 Droit d'accès : Vous pouvez demander l'accès à vos données personnelles gratuitement.",
          "22.3 Droit de rectification : Vous pouvez demander la correction de données personnelles inexactes.",
          "22.4 Droit de suppression : Vous pouvez demander la suppression de vos données personnelles.",
          "22.5 Droit à la portabilité : Vous pouvez demander vos données personnelles dans un format électronique courant.",
          "22.6 Autorité de contrôle : Le Préposé fédéral à la protection des données et à la transparence (PFPDT) supervise la conformité à la nLPD.",
        ],
      },
      {
        heading: "23. Personal Information Protection Act (PIPA) — Corée du Sud",
        paragraphs: [
          "Si vous êtes résident de Corée du Sud, vous disposez de droits en vertu de la PIPA :",
        ],
        list: [
          "23.1 Accès : Vous pouvez demander l'accès à vos informations personnelles.",
          "23.2 Correction et suppression : Vous pouvez demander la correction ou la suppression de vos informations personnelles.",
          "23.3 Suspension du traitement : Vous pouvez demander la suspension du traitement de vos informations personnelles.",
          "23.4 Notification : Vous avez le droit d'être informé de la collecte et de l'utilisation de vos informations personnelles.",
          "23.5 Autorité de contrôle : La Personal Information Protection Commission (PIPC) supervise la conformité à la PIPA.",
        ],
      },
      {
        heading: "24. Décret sur la protection des données personnelles (PDPD) — Vietnam",
        paragraphs: [
          "Si vous êtes résident du Vietnam, vous disposez de droits en vertu du PDPD :",
        ],
        list: [
          "24.1 Consentement : Le traitement de vos données personnelles nécessite votre consentement.",
          "24.2 Accès : Vous pouvez demander l'accès à vos données personnelles.",
          "24.3 Correction : Vous pouvez demander la correction de données personnelles inexactes.",
          "24.4 Suppression : Vous pouvez demander la suppression de vos données personnelles.",
          "24.5 Transfert transfrontalier : Le transfert de données personnelles hors du Vietnam est soumis à des conditions spécifiques.",
          "24.6 Autorité de contrôle : Le Ministère de la Sécurité publique supervise la conformité au PDPD.",
        ],
      },
      {
        heading: "25. Loi sur la protection des informations personnelles (APPI) — Japon",
        paragraphs: [
          "Si vous êtes résident du Japon, vous disposez de droits en vertu de l'APPI :",
        ],
        list: [
          "25.1 Divulgation : Vous pouvez demander la divulgation de vos informations personnelles détenues par nous.",
          "25.2 Correction : Vous pouvez demander la correction, l'ajout ou la suppression d'informations personnelles inexactes.",
          "25.3 Cessation d'utilisation : Vous pouvez demander la cessation d'utilisation ou la suppression de vos informations personnelles si elles ont été obtenues de manière inappropriée.",
          "25.4 Cessation de fourniture à des tiers : Vous pouvez demander l'arrêt de la fourniture de vos informations personnelles à des tiers.",
          "25.5 Autorité de contrôle : La Personal Information Protection Commission (PPC) supervise la conformité à l'APPI.",
        ],
      },
      {
        heading: "26. Digital Personal Data Protection Act (DPDPA) — Inde",
        paragraphs: [
          "Si vous êtes résident de l'Inde, vous disposez de droits en vertu du DPDPA :",
        ],
        list: [
          "26.1 Droit à l'information : Vous avez le droit d'obtenir un résumé de vos données personnelles traitées.",
          "26.2 Droit de correction et d'effacement : Vous pouvez demander la correction de données inexactes et l'effacement de données devenues inutiles.",
          "26.3 Droit de recours : Vous avez le droit de voir vos réclamations traitées par le responsable de traitement.",
          "26.4 Droit de nomination : Vous pouvez désigner une personne pour exercer vos droits en cas de décès ou d'incapacité.",
          "26.5 Autorité de contrôle : Le Data Protection Board of India supervise la conformité au DPDPA.",
        ],
      },
      {
        heading: "27. Loi sur la protection des données personnelles (PDPL) — Émirats Arabes Unis",
        paragraphs: [
          "Si vous êtes résident des EAU, vous disposez de droits en vertu de la PDPL (Décret-Loi Fédéral n° 45 de 2021) :",
        ],
        list: [
          "27.1 Accès : Vous pouvez demander l'accès à vos données personnelles.",
          "27.2 Correction : Vous pouvez demander la rectification de données personnelles inexactes.",
          "27.3 Effacement : Vous pouvez demander la suppression de vos données personnelles sous certaines conditions.",
          "27.4 Limitation : Vous pouvez demander la limitation du traitement de vos données personnelles.",
          "27.5 Portabilité : Vous pouvez demander le transfert de vos données personnelles dans un format lisible.",
          "27.6 Autorité de contrôle : Le UAE Data Office supervise la conformité à la PDPL.",
        ],
      },
      {
        heading: "28. Loi sur la protection de la vie privée — Israël",
        paragraphs: [
          "Si vous êtes résident d'Israël, vous disposez de droits en vertu de la Loi sur la protection de la vie privée (telle qu'amendée) :",
        ],
        list: [
          "28.1 Accès : Vous pouvez demander à consulter vos données personnelles détenues dans nos bases de données.",
          "28.2 Correction : Vous pouvez demander la correction ou la suppression de données inexactes.",
          "28.3 Opposition : Vous pouvez vous opposer à l'utilisation de vos données à des fins de marketing direct.",
          "28.4 Droit à l'oubli : Vous pouvez demander la suppression de vos données sous certaines conditions.",
          "28.5 Autorité de contrôle : La Privacy Protection Authority (PPA) supervise la conformité.",
        ],
      },
      {
        heading: "29. Loi sur la protection des données personnelles (KVKK) — Turquie",
        paragraphs: [
          "Si vous êtes résident de Turquie, vous disposez de droits en vertu de la KVKK (Loi n° 6698) :",
        ],
        list: [
          "29.1 Information : Vous pouvez demander des informations sur le traitement de vos données personnelles.",
          "29.2 Accès : Vous pouvez demander l'accès à vos données personnelles et à la finalité de leur traitement.",
          "29.3 Correction : Vous pouvez demander la correction de données incomplètes ou inexactes.",
          "29.4 Suppression : Vous pouvez demander la suppression ou la destruction de vos données personnelles.",
          "29.5 Opposition : Vous pouvez vous opposer à tout résultat découlant de l'analyse de vos données par des systèmes automatisés.",
          "29.6 Autorité de contrôle : L'Autorité de protection des données personnelles (KVKK) supervise la conformité.",
        ],
      },
      {
        heading: "30. Nigeria Data Protection Act (NDPA) — Nigeria",
        paragraphs: [
          "Si vous êtes résident du Nigeria, vous disposez de droits en vertu de la NDPA :",
        ],
        list: [
          "30.1 Accès : Vous pouvez demander l'accès à vos données personnelles.",
          "30.2 Rectification : Vous pouvez demander la correction de données personnelles inexactes.",
          "30.3 Effacement : Vous pouvez demander la suppression de vos données personnelles.",
          "30.4 Limitation : Vous pouvez demander la limitation du traitement de vos données personnelles.",
          "30.5 Portabilité : Vous pouvez demander vos données personnelles dans un format structuré et lisible par machine.",
          "30.6 Autorité de contrôle : La Nigeria Data Protection Commission (NDPC) supervise la conformité à la NDPA.",
        ],
      },
      {
        heading: "31. Data Protection Act (DPA) — Kenya",
        paragraphs: [
          "Si vous êtes résident du Kenya, vous disposez de droits en vertu de la DPA :",
        ],
        list: [
          "31.1 Accès : Vous pouvez demander la confirmation du traitement de vos données et y accéder.",
          "31.2 Correction : Vous pouvez demander la correction de données fausses ou trompeuses.",
          "31.3 Suppression : Vous pouvez demander la suppression de vos données personnelles.",
          "31.4 Opposition : Vous pouvez vous opposer au traitement de vos données personnelles.",
          "31.5 Autorité de contrôle : L'Office of the Data Protection Commissioner (ODPC) supervise la conformité à la DPA.",
        ],
      },
      {
        heading: "32. Loi sur la protection des données personnelles (PDPA) — Argentine",
        paragraphs: [
          "Si vous êtes résident d'Argentine, vous disposez de droits en vertu de la Loi 25.326 :",
        ],
        list: [
          "32.1 Accès : Vous pouvez demander l'accès gratuit à vos données personnelles.",
          "32.2 Rectification : Vous pouvez demander la correction de données inexactes.",
          "32.3 Suppression : Vous pouvez demander la suppression de vos données personnelles.",
          "32.4 Confidentialité : Vous pouvez demander que vos données soient traitées de manière confidentielle.",
          "32.5 Autorité de contrôle : L'Agence d'Accès à l'Information Publique (AAIP) supervise la conformité.",
        ],
      },
      {
        heading: "33. Loi sur la protection des données (Loi 1581) — Colombie",
        paragraphs: [
          "Si vous êtes résident de Colombie, vous disposez de droits en vertu de la Loi 1581 de 2012 :",
        ],
        list: [
          "33.1 Accès : Vous pouvez demander l'accès à vos données personnelles.",
          "33.2 Correction : Vous pouvez demander la mise à jour ou la correction de vos données personnelles.",
          "33.3 Suppression : Vous pouvez demander la suppression de vos données personnelles lorsqu'elles ne sont plus requises par la loi.",
          "33.4 Révocation : Vous pouvez révoquer votre consentement au traitement des données.",
          "33.5 Autorité de contrôle : La Superintendance de l'Industrie et du Commerce (SIC) supervise la conformité.",
        ],
      },
      {
        heading: "34. Loi fédérale sur la protection des données personnelles (LFPDPPP) — Mexique",
        paragraphs: [
          "Si vous êtes résident du Mexique, vous disposez de droits ARCO en vertu de la LFPDPPP :",
        ],
        list: [
          "34.1 Accès (Acceso) : Vous pouvez demander l'accès à vos données personnelles.",
          "34.2 Rectification (Rectificación) : Vous pouvez demander la correction de données inexactes.",
          "34.3 Annulation (Cancelación) : Vous pouvez demander la suppression de vos données personnelles.",
          "34.4 Opposition (Oposición) : Vous pouvez vous opposer au traitement de vos données personnelles.",
          "34.5 Autorité de contrôle : Le Ministère de l'Anti-Corruption et de la Bonne Gouvernance supervise la conformité à la LFPDPPP.",
        ],
      },
      {
        heading: "35. Data Privacy Act — Philippines",
        paragraphs: [
          "Si vous êtes résident des Philippines, vous disposez de droits en vertu du Data Privacy Act de 2012 :",
        ],
        list: [
          "35.1 Droit d'être informé : Vous avez le droit d'être informé du traitement de vos données personnelles.",
          "35.2 Accès : Vous pouvez demander l'accès à vos données personnelles.",
          "35.3 Correction : Vous pouvez demander la correction de données personnelles inexactes.",
          "35.4 Effacement : Vous pouvez demander la suspension, le retrait ou le blocage de vos données personnelles.",
          "35.5 Portabilité : Vous pouvez demander vos données dans un format électronique ou structuré.",
          "35.6 Autorité de contrôle : La National Privacy Commission (NPC) supervise la conformité.",
        ],
      },
      {
        heading: "36. Personal Data Protection Act (PDPA) — Malaisie",
        paragraphs: [
          "Si vous êtes résident de Malaisie, vous disposez de droits en vertu de la PDPA 2010 :",
        ],
        list: [
          "36.1 Accès : Vous pouvez demander l'accès à vos données personnelles.",
          "36.2 Correction : Vous pouvez demander la correction de données personnelles inexactes, incomplètes ou trompeuses.",
          "36.3 Retrait : Vous pouvez retirer votre consentement au traitement des données.",
          "36.4 Prévention du traitement : Vous pouvez demander l'arrêt du traitement si celui-ci cause un préjudice.",
          "36.5 Autorité de contrôle : Le Commissaire à la Protection des Données Personnelles supervise la conformité à la PDPA.",
        ],
      },
      {
        heading: "37. Loi sur la protection des données personnelles (PDP Law) — Indonésie",
        paragraphs: [
          "Si vous êtes résident d'Indonésie, vous disposez de droits en vertu de la Loi n° 27 de 2022 :",
        ],
        list: [
          "37.1 Accès : Vous pouvez demander l'accès à vos données personnelles.",
          "37.2 Correction : Vous pouvez demander la correction de données personnelles inexactes.",
          "37.3 Suppression : Vous pouvez demander la suppression de vos données personnelles.",
          "37.4 Retrait : Vous pouvez retirer votre consentement à tout moment.",
          "37.5 Portabilité : Vous pouvez demander le transfert de vos données personnelles vers un autre responsable de traitement.",
          "37.6 Autorité de contrôle : Le Ministère de la Communication et des Affaires Numériques supervise la conformité à la loi PDP.",
        ],
      },
      {
        heading: "38. Privacy Act 2020 — Nouvelle-Zélande",
        paragraphs: [
          "Si vous êtes résident de Nouvelle-Zélande, vous disposez de droits en vertu du Privacy Act 2020 :",
        ],
        list: [
          "38.1 Accès : Vous pouvez demander l'accès à vos informations personnelles.",
          "38.2 Correction : Vous pouvez demander la correction d'informations personnelles inexactes.",
          "38.3 Réclamation : Vous pouvez déposer une plainte si vous estimez que votre vie privée a été violée.",
          "38.4 Divulgation transfrontalière : Nous assurons des garanties appropriées avant de divulguer des informations personnelles à l'étranger.",
          "38.5 Autorité de contrôle : L'Office of the Privacy Commissioner supervise la conformité au Privacy Act.",
        ],
      },
      {
        heading: "39. Personal Data Protection Act (PDPA) — Taïwan",
        paragraphs: [
          "Si vous êtes résident de Taïwan, vous disposez de droits en vertu de la PDPA :",
        ],
        list: [
          "39.1 Accès : Vous pouvez demander à consulter ou obtenir des copies de vos données personnelles.",
          "39.2 Correction : Vous pouvez demander la correction ou le complément de vos données personnelles.",
          "39.3 Cessation : Vous pouvez demander la cessation de la collecte, du traitement ou de l'utilisation de vos données personnelles.",
          "39.4 Suppression : Vous pouvez demander la suppression de vos données personnelles.",
          "39.5 Autorité de contrôle : Le National Development Council (en transition vers une Commission dédiée à la protection des données personnelles) supervise la conformité.",
        ],
      },
      {
        heading: "40. Personal Data (Privacy) Ordinance (PDPO) — Hong Kong",
        paragraphs: [
          "Si vous êtes résident de Hong Kong, vous disposez de droits en vertu de la PDPO :",
        ],
        list: [
          "40.1 Accès : Vous pouvez demander l'accès à vos données personnelles.",
          "40.2 Correction : Vous pouvez demander la correction de données personnelles inexactes.",
          "40.3 Désinscription : Vous pouvez refuser de recevoir des communications de marketing direct.",
          "40.4 Réclamation : Vous pouvez déposer une plainte concernant des violations de la vie privée.",
          "40.5 Autorité de contrôle : L'Office of the Privacy Commissioner for Personal Data (PCPD) supervise la conformité à la PDPO.",
        ],
      },
      {
        heading: "41. Contact",
        paragraphs: [
          "Questions relatives à la protection des données :",
          "Général : safescoring@proton.me",
          "Délégué à la protection des données (DPO) : dpo@safescoring.io",
          "Représentant UE/EEE : eu-representative@safescoring.io",
          "Représentant Royaume-Uni : uk-representative@safescoring.io",
        ],
        footer: `En utilisant ${config.appName}, vous reconnaissez avoir lu et compris cette Politique de Confidentialité.`,
      },
    ],
  },
};

/** Map heading keywords to anchor IDs for deep linking from footer */
function getAnchorId(heading) {
  if (!heading) return undefined;
  const h = heading.toLowerCase();
  if (h.includes("cookie")) return "cookies";
  if (h.includes("ccpa") || h.includes("california")) return "ccpa";
  if (h.includes("contact")) return "contact";
  if (h.includes("lgpd")) return "lgpd";
  if (h.includes("pipeda")) return "pipeda";
  if (h.includes("popia")) return "popia";
  if (h.includes("australian") || h.includes("apps")) return "apps";
  if (h.includes("pdpa")) return "pdpa";
  if (h.includes("uk gdpr") || h.includes("uk-gdpr")) return "uk-gdpr";
  if (h.includes("nfadp") || h.includes("swiss")) return "swiss";
  return undefined;
}

function renderSection(section, idx) {
  const anchorId = getAnchorId(section.heading);
  return (
    <section key={idx} className="mb-6" id={anchorId}>
      <h2 className="text-xl font-bold mt-4 mb-2">{section.heading}</h2>
      {section.paragraphs?.map((p, i) => (
        <p key={i} className="mb-2 opacity-90">
          {p}
        </p>
      ))}
      {section.subsections?.map((sub, i) => (
        <div key={i} className="mb-3">
          <h3 className="font-semibold mb-1">{sub.subheading}</h3>
          <ul className="list-disc list-inside space-y-1 opacity-90">
            {sub.list.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
      {section.list && !section.subsections && (
        <ul className="list-disc list-inside space-y-1 opacity-90">
          {section.list.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
      {section.footer && (
        <p className="mt-2 opacity-90">{section.footer}</p>
      )}
    </section>
  );
}

export default function PrivacyPolicyContent() {
  const { t, locale } = useTranslation();
  const c = content[locale] || content.en;

  return (
    <main className="max-w-xl mx-auto">
      <div className="p-5">
        <Link href="/" className="btn btn-ghost">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
              clipRule="evenodd"
            />
          </svg>{" "}
          {t("common.back")}
        </Link>
        <h1 className="text-3xl font-extrabold pb-6">{c.title}</h1>
        <p className="text-sm opacity-70 mb-4">{c.lastUpdated}</p>
        <p className="mb-4 opacity-90">
          {locale === "fr"
            ? `${config.appName} (« nous ») s'engage à protéger votre vie privée conformément au Règlement Général sur la Protection des Données (RGPD) et aux lois applicables en matière de protection des données.`
            : `${config.appName} ("we," "us," or "our") is committed to protecting your privacy in accordance with the General Data Protection Regulation (GDPR) and applicable data protection laws.`}
        </p>
        {c.sections.map((section, idx) => renderSection(section, idx))}
      </div>
    </main>
  );
}
