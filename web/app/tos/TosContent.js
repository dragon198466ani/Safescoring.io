"use client";

import Link from "next/link";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import config from "@/config";

const content = {
  en: {
    title: `Terms and Conditions for ${config.appName}`,
    lastUpdated: "Last Updated: December 2024",
    intro: `Welcome to ${config.appName}!\n\nThese Terms of Service ("Terms") govern your use of the ${config.appName} website at https://safescoring.io ("Website") and the services provided by ${config.appName}. By using our Website and services, you agree to these Terms.`,
    sections: [
      {
        heading: `1. Description of ${config.appName}`,
        paragraphs: [
          `${config.appName} is a platform providing unified security ratings for cryptocurrency products including hardware wallets, software wallets, exchanges, and DeFi protocols. We evaluate products using 916 security norms across four pillars: Security, Adversity, Fidelity, and Efficiency (SAFE).`,
        ],
      },
      {
        heading: "2. Service Tiers",
        list: [
          "2.1 Free Plan: Access to 5 detailed product evaluations per month.",
          "2.2 Paid Plans: Unlimited access to product evaluations, API access, and additional features depending on the subscription tier.",
          "2.3 Trial Period: Paid plans include a 14-day free trial with credit card required (EU Consumer Rights Directive compliant).",
        ],
      },
      {
        heading: "3. User Accounts",
        list: [
          "3.1 You must provide accurate information when creating an account.",
          "3.2 You are responsible for maintaining the confidentiality of your account credentials.",
          "3.3 You must be at least 18 years old to use our services.",
        ],
      },
      {
        heading: "4. Intellectual Property",
        list: [
          `4.1 All content, including security scores, methodologies, and evaluations, is owned by ${config.appName}.`,
          "4.2 You may not reproduce, distribute, or commercially exploit our content without written permission.",
          "4.3 API users must comply with usage limits and attribution requirements.",
        ],
      },
      {
        heading: "5. Disclaimer",
        list: [
          "5.1 Security ratings are provided for informational purposes only.",
          `5.2 ${config.appName} does not guarantee the security of any product.`,
          "5.3 Users should conduct their own due diligence before using any cryptocurrency product.",
          "5.4 We are not responsible for any losses resulting from decisions made based on our ratings.",
        ],
      },
      {
        heading: "6. Subscription and Payments",
        list: [
          "6.1 Paid subscriptions are billed monthly or annually.",
          "6.2 You may cancel your subscription at any time through your account settings.",
          "6.3 Refunds are available within 14 days of purchase (EU Consumer Rights Directive).",
          "6.4 Fiat payments are processed securely through LemonSqueezy (Merchant of Record, EU VAT handled). Crypto payments are processed through MoonPay.",
        ],
      },
      {
        heading: "7. Data Protection and Privacy",
        list: [
          "7.1 We process your data in accordance with GDPR and applicable data protection laws.",
          "7.2 For details on data processing, please refer to our Privacy Policy.",
          "7.3 You have the right to access, rectify, delete, and port your personal data.",
        ],
      },
      {
        heading: "8. Termination",
        list: [
          "8.1 We may terminate or suspend your account for violations of these Terms.",
          "8.2 You may delete your account at any time by contacting support.",
        ],
      },
      {
        heading: "9. Governing Law",
        paragraphs: [
          "These Terms are governed by the laws of the European Union and France.",
        ],
      },
      {
        heading: "10. Dispute Resolution",
        paragraphs: [
          "Any disputes will be resolved through arbitration in accordance with EU regulations.",
        ],
      },
      {
        heading: "11. Updates to the Terms",
        paragraphs: [
          "We may update these Terms from time to time. Users will be notified of significant changes via email.",
        ],
      },
      {
        heading: "12. Contact",
        paragraphs: [
          "For any questions regarding these Terms of Service, please contact us at:",
          "Email: support@safescoring.io",
        ],
        footer: `Thank you for using ${config.appName}!`,
      },
    ],
  },
  fr: {
    title: `Conditions Générales d'Utilisation de ${config.appName}`,
    lastUpdated: "Dernière mise à jour : Décembre 2024",
    intro: `Bienvenue sur ${config.appName} !\n\nLes présentes Conditions Générales d'Utilisation (« CGU ») régissent votre utilisation du site web ${config.appName} accessible à l'adresse https://safescoring.io (le « Site ») et des services fournis par ${config.appName}. En utilisant notre Site et nos services, vous acceptez ces CGU.`,
    sections: [
      {
        heading: `1. Description de ${config.appName}`,
        paragraphs: [
          `${config.appName} est une plateforme fournissant des notations de sécurité unifiées pour les produits crypto, notamment les portefeuilles matériels, les portefeuilles logiciels, les exchanges et les protocoles DeFi. Nous évaluons les produits selon 916 normes de sécurité réparties en quatre piliers : Sécurité, Adversité, Fidélité et Efficacité (SAFE).`,
        ],
      },
      {
        heading: "2. Niveaux de service",
        list: [
          "2.1 Plan gratuit : Accès à 5 évaluations détaillées de produits par mois.",
          "2.2 Plans payants : Accès illimité aux évaluations de produits, accès API et fonctionnalités supplémentaires selon le niveau d'abonnement.",
          "2.3 Période d'essai : Les plans payants incluent un essai gratuit de 14 jours avec carte bancaire requise (conforme à la Directive européenne sur les droits des consommateurs).",
        ],
      },
      {
        heading: "3. Comptes utilisateurs",
        list: [
          "3.1 Vous devez fournir des informations exactes lors de la création d'un compte.",
          "3.2 Vous êtes responsable de la confidentialité de vos identifiants de compte.",
          "3.3 Vous devez avoir au moins 18 ans pour utiliser nos services.",
        ],
      },
      {
        heading: "4. Propriété intellectuelle",
        list: [
          `4.1 Tout le contenu, y compris les scores de sécurité, les méthodologies et les évaluations, est la propriété de ${config.appName}.`,
          "4.2 Vous ne pouvez pas reproduire, distribuer ou exploiter commercialement notre contenu sans autorisation écrite.",
          "4.3 Les utilisateurs de l'API doivent respecter les limites d'utilisation et les exigences d'attribution.",
        ],
      },
      {
        heading: "5. Clause de non-responsabilité",
        list: [
          "5.1 Les notations de sécurité sont fournies à titre informatif uniquement.",
          `5.2 ${config.appName} ne garantit pas la sécurité d'un produit.`,
          "5.3 Les utilisateurs doivent effectuer leurs propres vérifications avant d'utiliser un produit crypto.",
          "5.4 Nous ne sommes pas responsables des pertes résultant de décisions prises sur la base de nos notations.",
        ],
      },
      {
        heading: "6. Abonnement et paiements",
        list: [
          "6.1 Les abonnements payants sont facturés mensuellement ou annuellement.",
          "6.2 Vous pouvez annuler votre abonnement à tout moment via les paramètres de votre compte.",
          "6.3 Les remboursements sont disponibles dans les 14 jours suivant l'achat (Directive européenne sur les droits des consommateurs).",
          "6.4 Les paiements en monnaie fiduciaire sont traités de manière sécurisée par LemonSqueezy (Merchant of Record, TVA UE gérée). Les paiements crypto sont traités par MoonPay.",
        ],
      },
      {
        heading: "7. Protection des données et vie privée",
        list: [
          "7.1 Nous traitons vos données conformément au RGPD et aux lois applicables en matière de protection des données.",
          "7.2 Pour plus de détails sur le traitement des données, veuillez consulter notre Politique de Confidentialité.",
          "7.3 Vous avez le droit d'accéder, de rectifier, de supprimer et de transférer vos données personnelles.",
        ],
      },
      {
        heading: "8. Résiliation",
        list: [
          "8.1 Nous pouvons résilier ou suspendre votre compte en cas de violation de ces CGU.",
          "8.2 Vous pouvez supprimer votre compte à tout moment en contactant le support.",
        ],
      },
      {
        heading: "9. Droit applicable",
        paragraphs: [
          "Les présentes CGU sont régies par les lois de l'Union Européenne et de la France.",
        ],
      },
      {
        heading: "10. Résolution des litiges",
        paragraphs: [
          "Tout litige sera résolu par arbitrage conformément aux réglementations de l'UE.",
        ],
      },
      {
        heading: "11. Modifications des CGU",
        paragraphs: [
          "Nous pouvons mettre à jour ces CGU de temps à autre. Les utilisateurs seront informés des changements significatifs par e-mail.",
        ],
      },
      {
        heading: "12. Contact",
        paragraphs: [
          "Pour toute question concernant ces Conditions Générales d'Utilisation, veuillez nous contacter à :",
          "E-mail : support@safescoring.io",
        ],
        footer: `Merci d'utiliser ${config.appName} !`,
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
      {section.list && (
        <ul className="list-disc list-inside space-y-1 opacity-90">
          {section.list.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
      {section.footer && (
        <p className="mt-3 font-medium opacity-90">{section.footer}</p>
      )}
    </section>
  );
}

export default function TosContent() {
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
          </svg>
          {" "}{t("common.back")}
        </Link>
        <h1 className="text-3xl font-extrabold pb-6">{c.title}</h1>
        <p className="text-sm opacity-70 mb-4">{c.lastUpdated}</p>
        {c.intro.split("\n\n").map((paragraph, i) => (
          <p key={i} className="mb-3 opacity-90">
            {paragraph}
          </p>
        ))}
        {c.sections.map((section, idx) => renderSection(section, idx))}
      </div>
    </main>
  );
}
