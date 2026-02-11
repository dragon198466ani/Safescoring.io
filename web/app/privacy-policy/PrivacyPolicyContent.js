"use client";

import Link from "next/link";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import config from "@/config";

const content = {
  en: {
    title: `Privacy Policy for ${config.appName}`,
    lastUpdated: "Last Updated: December 2024",
    sections: [
      {
        heading: "1. Data Controller",
        paragraphs: [
          `${config.appName} acts as the data controller for personal data collected through https://safescoring.io.`,
          "Contact: support@safescoring.io",
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
          "Google (OAuth): Privacy Shield certified",
          "Resend (Email): GDPR compliant",
        ],
      },
      {
        heading: "10. Cookies",
        list: [
          "10.1 Essential cookies: Required for authentication (session management)",
          "10.2 We do NOT use advertising or tracking cookies",
          "10.3 We do NOT use third-party analytics that track individual users",
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
          "We may update this policy. Significant changes will be communicated via email. Continued use after changes constitutes acceptance.",
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
        heading: "16. Contact",
        paragraphs: [
          "Data Protection Inquiries:",
          "Email: support@safescoring.io",
        ],
        footer: `By using ${config.appName}, you acknowledge that you have read and understood this Privacy Policy.`,
      },
    ],
  },
  fr: {
    title: `Politique de Confidentialité de ${config.appName}`,
    lastUpdated: "Dernière mise à jour : Décembre 2024",
    sections: [
      {
        heading: "1. Responsable du traitement",
        paragraphs: [
          `${config.appName} agit en tant que responsable du traitement des données personnelles collectées via https://safescoring.io.`,
          "Contact : support@safescoring.io",
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
          "Google (OAuth) : Certifié Privacy Shield",
          "Resend (E-mail) : Conforme au RGPD",
        ],
      },
      {
        heading: "10. Cookies",
        list: [
          "10.1 Cookies essentiels : Nécessaires à l'authentification (gestion de session)",
          "10.2 Nous n'utilisons PAS de cookies publicitaires ou de suivi",
          "10.3 Nous n'utilisons PAS d'outils d'analyse tiers qui suivent les utilisateurs individuellement",
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
          "Nous pouvons mettre à jour cette politique. Les changements significatifs seront communiqués par e-mail. L'utilisation continue après les modifications vaut acceptation.",
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
        heading: "16. Contact",
        paragraphs: [
          "Questions relatives à la protection des données :",
          "E-mail : support@safescoring.io",
        ],
        footer: `En utilisant ${config.appName}, vous reconnaissez avoir lu et compris cette Politique de Confidentialité.`,
      },
    ],
  },
};

function renderSection(section, idx) {
  return (
    <section key={idx} className="mb-6">
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
