"use client";

import Link from "next/link";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import config from "@/config";

const content = {
  en: {
    title: "Legal Notice",
    sections: [
      {
        heading: "Publisher",
        paragraphs: [
          `${config.appName} — Independent research project`,
          "Individual entrepreneur (auto-entrepreneur)",
          `SIRET: ${process.env.NEXT_PUBLIC_SIRET || "[Set NEXT_PUBLIC_SIRET env var]"}`,
          "Contact: safescoring@proton.me\nLegal inquiries: legal@safescoring.io",
        ],
      },
      {
        heading: "Publication Director",
        paragraphs: [
          `Publication Director: ${process.env.NEXT_PUBLIC_DIRECTOR_NAME || "[Set NEXT_PUBLIC_DIRECTOR_NAME env var]"}`,
          "Contact: safescoring@proton.me",
        ],
      },
      {
        heading: "Hosting",
        paragraphs: [
          "Vercel Inc.",
          "440 N Barranca Ave #4133\nCovina, CA 91723, USA",
          "https://vercel.com",
        ],
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
        heading: "Data Protection",
        paragraphs: [
          "Data processing is carried out in accordance with GDPR (EU Regulation 2016/679).",
          "For any data protection request (access, rectification, deletion, portability), contact: safescoring@proton.me",
          "You have the right to lodge a complaint with a supervisory authority (CNIL in France: www.cnil.fr).",
        ],
      },
      {
        heading: "Contact",
        paragraphs: ["General: safescoring@proton.me\nLegal: legal@safescoring.io"],
      },
      {
        heading: "Disclaimer",
        paragraphs: [
          "All information is provided for educational and informational purposes only. SafeScoring is not a licensed security auditor, financial advisor, or certifying body.",
          "This is not financial, investment, security, or legal advice. Cryptocurrency investments carry significant risk. Always do your own research and consult qualified professionals.",
          "Scores reflect SafeScoring's evaluation methodology and do not guarantee security or predict future incidents.",
        ],
      },
      {
        heading: "Regulatory Notice",
        paragraphs: [
          "SafeScoring does not provide investment advice as defined by MiFID II (EU Directive 2014/65/EU), the US Investment Advisers Act of 1940, the UK Financial Services and Markets Act 2000, or equivalent regulations in other jurisdictions.",
          "SafeScoring is not a credit rating agency under EU Regulation (EC) No 1060/2009, the EU Markets in Crypto-Assets Regulation 2023/1114 (MiCA), or equivalent regulations. Scores are informational opinions only.",
          "SafeScoring is not regulated by the AMF (France), SEC (USA), FCA (UK), BaFin (Germany), MAS (Singapore), ASIC (Australia), FSA (Japan), VARA (Dubai), or any other financial regulatory authority.",
          "Users in all jurisdictions should consult local qualified professionals before making any investment decisions.",
        ],
      },
      {
        heading: "Right of Reply",
        paragraphs: [
          "In accordance with French law (LCEN Article 6-IV, Loi n° 2004-575), any person named or evaluated on this website has the right to request publication of a response.",
          "Procedure: Send your response to legal@safescoring.io with the subject line 'Right of Reply — [Product Name]'. The response must be directly related to the published content, proportionate in length, and signed by the person or authorized representative.",
          "SafeScoring will publish the response within 3 days of receipt, alongside the original content. The response will remain published for the same duration as the original content.",
          "This right of reply is separate from and in addition to the evaluation dispute procedure described in our Terms of Service (Section 5.8).",
        ],
      },
      {
        heading: "Anti-SLAPP Notice",
        paragraphs: [
          "SafeScoring's evaluations constitute journalism and opinion protected under Article 10 of the European Convention on Human Rights, Article 11 of the French Declaration of the Rights of Man and Citizen (1789), and EU Directive 2024/1069 on protection against strategic lawsuits (anti-SLAPP).",
          "Any strategic legal action intended to silence legitimate security evaluations may be subject to sanctions for abuse of process under applicable law. SafeScoring reserves all rights to seek damages and legal costs in the event of abusive proceedings.",
        ],
      },
      {
        heading: "Trademarks & Third-Party Content",
        paragraphs: [
          "SAFE (Security, Adversity, Fidelity, Efficiency) is SafeScoring's proprietary evaluation methodology.",
          "Product names, logos, and trademarks displayed on this website (including but not limited to Ledger, Trezor, MetaMask, Uniswap, and others) are the property of their respective owners and are used solely for identification and informational purposes. Their use does not imply endorsement by or affiliation with SafeScoring.",
        ],
      },
    ],
    copyright: `© ${new Date().getFullYear()} ${config.appName}. All rights reserved.`,
  },
  fr: {
    title: "Mentions Légales",
    sections: [
      {
        heading: "Éditeur du site (Article 6 – LCEN)",
        paragraphs: [
          `${config.appName} — Projet de recherche indépendant`,
          "Entrepreneur individuel (auto-entrepreneur)",
          `SIRET : ${process.env.NEXT_PUBLIC_SIRET || "[Définir NEXT_PUBLIC_SIRET]"}`,
          "Contact : safescoring@proton.me\nQuestions juridiques : legal@safescoring.io",
        ],
      },
      {
        heading: "Directeur de la publication",
        paragraphs: [
          `Directeur de la publication : ${process.env.NEXT_PUBLIC_DIRECTOR_NAME || "[Définir NEXT_PUBLIC_DIRECTOR_NAME]"}`,
          "Contact : safescoring@proton.me",
        ],
      },
      {
        heading: "Hébergement",
        paragraphs: [
          "Vercel Inc.",
          "440 N Barranca Ave #4133\nCovina, CA 91723, USA",
          "https://vercel.com",
        ],
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
        heading: "Protection des données personnelles (RGPD)",
        paragraphs: [
          "Le traitement des données est effectué conformément au RGPD (Règlement UE 2016/679).",
          "Pour toute demande relative à vos données personnelles (accès, rectification, suppression, portabilité), contactez : safescoring@proton.me",
          "Vous disposez du droit d'introduire une réclamation auprès de la CNIL : www.cnil.fr\n3 Place de Fontenoy, TSA 80715, 75334 PARIS CEDEX 07",
        ],
      },
      {
        heading: "Contact",
        paragraphs: ["Général : safescoring@proton.me\nJuridique : legal@safescoring.io"],
      },
      {
        heading: "Avertissement",
        paragraphs: [
          "Toutes les informations sont fournies à titre éducatif et informatif uniquement. SafeScoring n'est pas un auditeur de sécurité agréé, un conseiller financier ou un organisme de certification.",
          "Ceci ne constitue pas un conseil financier, en investissement, en sécurité ou juridique. Les investissements en crypto-monnaies comportent des risques significatifs. Faites toujours vos propres recherches et consultez des professionnels qualifiés.",
          "Les scores reflètent la méthodologie d'évaluation SafeScoring et ne garantissent ni la sécurité ni ne prédisent les incidents futurs.",
        ],
      },
      {
        heading: "Avis réglementaire",
        paragraphs: [
          "SafeScoring ne fournit pas de conseil en investissement au sens de la Directive MiFID II (Directive UE 2014/65/UE), du Code Monétaire et Financier (France), ni de réglementations équivalentes dans d'autres juridictions.",
          "SafeScoring n'est pas une agence de notation de crédit au sens du Règlement (CE) n° 1060/2009, du Règlement MiCA 2023/1114, ni de réglementations équivalentes. Les scores sont des opinions informatives uniquement.",
          "SafeScoring n'est pas régulé par l'AMF (Autorité des Marchés Financiers), la SEC (États-Unis), la FCA (Royaume-Uni), la BaFin (Allemagne), la MAS (Singapour), l'ASIC (Australie), la FSA (Japon), la VARA (Dubaï) ou toute autre autorité de régulation financière.",
          "Les utilisateurs de toutes les juridictions doivent consulter des professionnels locaux qualifiés avant de prendre toute décision d'investissement.",
        ],
      },
      {
        heading: "Droit de réponse",
        paragraphs: [
          "Conformément à la loi française (LCEN Article 6-IV, Loi n° 2004-575), toute personne nommée ou évaluée sur ce site a le droit de demander la publication d'une réponse.",
          "Procédure : Envoyez votre réponse à legal@safescoring.io avec l'objet « Droit de réponse — [Nom du produit] ». La réponse doit être directement liée au contenu publié, proportionnée en longueur et signée par la personne ou son représentant autorisé.",
          "SafeScoring publiera la réponse dans les 3 jours suivant sa réception, à côté du contenu original. La réponse restera publiée pour la même durée que le contenu original.",
          "Ce droit de réponse est distinct et complémentaire de la procédure de contestation des évaluations décrite dans nos Conditions Générales d'Utilisation (Section 5.8).",
        ],
      },
      {
        heading: "Avis anti-SLAPP",
        paragraphs: [
          "Les évaluations de SafeScoring constituent du journalisme et des opinions protégés au titre de l'Article 10 de la Convention européenne des droits de l'homme, de l'Article 11 de la Déclaration des droits de l'homme et du citoyen (1789) et de la Directive UE 2024/1069 relative à la protection contre les poursuites stratégiques (anti-SLAPP).",
          "Toute action juridique stratégique visant à faire taire des évaluations de sécurité légitimes pourra faire l'objet de sanctions pour abus de procédure en vertu du droit applicable. SafeScoring se réserve tous les droits de demander des dommages et intérêts et le remboursement des frais juridiques en cas de procédure abusive.",
        ],
      },
      {
        heading: "Marques et contenu tiers",
        paragraphs: [
          "SAFE (Security, Adversity, Fidelity, Efficiency) est la méthodologie d'évaluation propriétaire de SafeScoring.",
          "Les noms de produits, logos et marques affichés sur ce site (notamment Ledger, Trezor, MetaMask, Uniswap, et autres) sont la propriété de leurs détenteurs respectifs et sont utilisés uniquement à des fins d'identification et d'information. Leur utilisation n'implique aucune approbation ni affiliation avec SafeScoring.",
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
