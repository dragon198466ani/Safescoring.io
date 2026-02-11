"use client";

import Link from "next/link";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import config from "@/config";

const content = {
  en: {
    title: "Legal Notice",
    sections: [
      {
        heading: "Legal",
        paragraphs: [
          `${config.appName} is an independent research project focused on cryptocurrency security ratings.`,
        ],
      },
      {
        heading: "Hosting",
        paragraphs: ["Vercel Inc. (USA)", "https://vercel.com"],
      },
      {
        heading: "Payments & Billing",
        paragraphs: [
          "All transactions are processed by Lemon Squeezy LLC, acting as Merchant of Record.",
          "Lemon Squeezy LLC\n222 S Main St #500\nSalt Lake City, UT 84101, USA",
          "Billing support: help.lemonsqueezy.com\nTerms: lemonsqueezy.com/terms\nPrivacy: lemonsqueezy.com/privacy",
        ],
      },
      {
        heading: "Contact",
        paragraphs: ["safescoring@proton.me"],
      },
      {
        heading: "Disclaimer",
        paragraphs: [
          "All information is provided for educational purposes only.",
          "This is not financial advice. Cryptocurrency investments carry significant risk. Always do your own research.",
        ],
      },
    ],
    copyright: `© ${new Date().getFullYear()} ${config.appName}. All rights reserved.`,
  },
  fr: {
    title: "Mentions Légales",
    sections: [
      {
        heading: "Informations légales",
        paragraphs: [
          `${config.appName} est un projet de recherche indépendant dédié aux notations de sécurité des produits crypto.`,
        ],
      },
      {
        heading: "Hébergement",
        paragraphs: ["Vercel Inc. (USA)", "https://vercel.com"],
      },
      {
        heading: "Paiements et facturation",
        paragraphs: [
          "Toutes les transactions sont traitées par Lemon Squeezy LLC, agissant en tant que Merchant of Record.",
          "Lemon Squeezy LLC\n222 S Main St #500\nSalt Lake City, UT 84101, USA",
          "Support facturation : help.lemonsqueezy.com\nConditions : lemonsqueezy.com/terms\nConfidentialité : lemonsqueezy.com/privacy",
        ],
      },
      {
        heading: "Contact",
        paragraphs: ["safescoring@proton.me"],
      },
      {
        heading: "Avertissement",
        paragraphs: [
          "Toutes les informations sont fournies à titre éducatif uniquement.",
          "Ceci ne constitue pas un conseil financier. Les investissements en crypto-monnaies comportent des risques significatifs. Faites toujours vos propres recherches.",
        ],
      },
    ],
    copyright: `© ${new Date().getFullYear()} ${config.appName}. Tous droits réservés.`,
  },
};

export default function LegalContent() {
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

        {c.sections.map((section, idx) => (
          <section key={idx} className="mb-6">
            <h2 className="text-xl font-bold mt-4 mb-2">{section.heading}</h2>
            {section.paragraphs.map((p, i) => (
              <p key={i} className="mb-2 opacity-90 whitespace-pre-line">
                {p}
              </p>
            ))}
          </section>
        ))}

        <p className="mt-8 text-sm opacity-70">{c.copyright}</p>
      </div>
    </main>
  );
}
