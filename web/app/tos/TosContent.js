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
          `${config.appName} is a platform providing unified security ratings for cryptocurrency products including hardware wallets, software wallets, exchanges, and DeFi protocols. We evaluate products using comprehensive security norms across four pillars: Security, Adversity, Fidelity, and Efficiency (SAFE).`,
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
          "4.4 API users may not represent ratings as investment advice, securities analysis, or professional security audits.",
          "4.5 White-label users must include the following attribution: 'Evaluation based on SafeScoring methodology. Not financial or security advice.'",
          "4.6 SafeScoring reserves the right to revoke API access for misuse or misrepresentation of evaluation data.",
        ],
      },
      {
        heading: "5. Disclaimer and Limitation of Liability",
        list: [
          "5.1 Security ratings and evaluations are provided for informational and educational purposes only. They do not constitute financial, investment, security, tax, or legal advice.",
          `5.2 ${config.appName} does not guarantee the security of any product. Evaluations are based on publicly available information and our standardized methodology. They may be incomplete, outdated, or contain inaccuracies.`,
          "5.3 Users should conduct their own due diligence and consult qualified professionals before using any cryptocurrency product or making any investment decision.",
          "5.4 TO THE MAXIMUM EXTENT PERMITTED BY LAW, SafeScoring's total aggregate liability for all claims arising from or related to this service shall not exceed the greater of: (a) fees paid by you in the 12 months preceding the claim, or (b) €100.",
          "5.5 IN NO EVENT SHALL SafeScoring be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, funds, or goodwill, regardless of the theory of liability.",
          "5.6 Evaluations are not fit for any particular purpose and should not be relied upon as the sole basis for any decision. A higher score does not guarantee security, and a lower score does not mean a product will be compromised.",
          `5.7 ${config.appName} is not a licensed security auditor, financial advisor, or certifying body. Our evaluations complement but do not replace professional security audits or financial advice.`,
          "5.8 Evaluation Dispute Procedure: Rated products may dispute their evaluation using the following process: (a) Submit a written dispute to legal@safescoring.io with the product name, specific evaluation(s) disputed, and supporting evidence; (b) SafeScoring will acknowledge receipt within 5 business days; (c) Our editorial team will review the dispute within 15 business days; (d) Outcomes: correction approved and published with date, or the product's written response published alongside the evaluation, or dispute rejected with written explanation; (e) Appeals may be filed within 30 days of rejection.",
          "5.9 Score Publication Policy & Independence: SafeScoring publishes scores based solely on its evaluation methodology. SafeScoring does not coordinate score publication timing with project teams, token issuers, or any third party. Scores are not published to influence market prices. SafeScoring has no financial interest in the products it evaluates. Monitoring services (SAFE Monitored badges) are optional, paid evaluation services and have no influence on scores. Monitored and non-monitored products are evaluated with identical methodology and criteria. Purchasing monitoring does not improve, guarantee, or affect a product's score in any way.",
          "5.10 Fair Comment & Opinion Notice: All evaluations represent SafeScoring's opinion based on publicly available information and our SAFE methodology. Scores involve subjective judgment about which security features matter and how to weight evaluation factors. Reasonable experts using different criteria may reach different conclusions. Evaluations are protected as honest opinion under applicable law, including Section 3 of the UK Defamation Act 2013 and French fair comment principles.",
          "5.11 Regulatory Status (MiCA / CRA): SafeScoring is not a credit rating agency under EU Regulation (EC) No 1060/2009, the EU Markets in Crypto-Assets Regulation 2023/1114 (MiCA), the US Credit Rating Agency Reform Act, or equivalent regulations. Scores are informational opinions only and should not be considered credit ratings, investment recommendations, or advice under MiCA Article 32. Scores may be based on incomplete information and can change without notice.",
          "5.12 Anti-Trading & Conflict of Interest Policy: SafeScoring and its personnel do not trade, hold, or have financial interests in any cryptocurrency tokens, protocols, or products evaluated on this platform. SafeScoring does not engage in front-running, market manipulation, or coordinated disclosure with any trading entity. Score publication timing is determined solely by our editorial process. Any person involved in the evaluation process is prohibited from trading the evaluated assets for a period of 30 days before and after score publication. Violations of this policy result in immediate termination. If you believe a conflict of interest exists, report it to legal@safescoring.io.",
        ],
      },
      {
        heading: "6. Subscription and Payments",
        list: [
          "6.1 Paid subscriptions are billed monthly or annually.",
          "6.2 Subscriptions automatically renew at the end of each billing period unless cancelled before the renewal date. You will be charged at the current rate for your plan at each renewal. If we change the price of your plan, you will be notified by email at least 30 days before the new price takes effect. You may cancel your subscription before the new price applies.",
          "6.3 You may cancel your subscription at any time through your account settings or by contacting support. Cancellation takes effect at the end of the current billing period.",
          "6.4 Refunds are available within 14 days of purchase (EU Consumer Rights Directive, Article L.221-18 du Code de la consommation).",
          "6.5 Fiat payments are processed securely through LemonSqueezy (Merchant of Record, EU VAT handled). Crypto payments are processed through MoonPay.",
          "6.6 Crypto Payment Refunds: For payments made in cryptocurrency, refunds will be issued in the same cryptocurrency at the exchange rate prevailing at the time of refund, or in EUR/USD equivalent via bank transfer at your choice. Due to the volatile nature of cryptocurrency, SafeScoring is not responsible for exchange rate fluctuations between the time of payment and refund. Refund requests must be made within 14 days of purchase by contacting support@safescoring.io.",
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
          "These Terms are governed by the laws of France and the European Union. Nothing in these Terms affects mandatory consumer protection rights under your local law.",
        ],
      },
      {
        heading: "10. Dispute Resolution & Consumer Mediation",
        list: [
          "10.1 For EU consumers: You may bring claims in the courts of your country of residence. For non-consumer disputes, the courts of Paris, France shall have exclusive jurisdiction. Before initiating legal proceedings, parties agree to attempt resolution via written notice to legal@safescoring.io within 30 business days.",
          "10.2 Consumer Mediation (Article L.612-1 Code de la consommation): In the event of a dispute that could not be resolved directly with SafeScoring, you may refer the matter free of charge to a consumer mediator. Mediator: CMAP — Centre de Médiation et d'Arbitrage de Paris (https://www.cmap.fr). You may also use the EU Online Dispute Resolution platform: https://ec.europa.eu/consumers/odr",
        ],
      },
      {
        heading: "10bis. Restricted Jurisdictions & Sanctions Compliance",
        paragraphs: [
          "SafeScoring services may not be available in jurisdictions subject to comprehensive sanctions programs by the EU, USA (OFAC), UN, or other international bodies, including but not limited to: North Korea, Iran, Syria, Cuba, and the Crimea, Donetsk, and Luhansk regions. Users are responsible for ensuring their use of SafeScoring complies with all applicable local laws and regulations. SafeScoring is not registered with the SEC, CFTC, MAS, FSA (Japan), VARA (Dubai), or other financial regulatory authorities.",
        ],
      },
      {
        heading: "11. Indemnification",
        paragraphs: [
          "This section applies only to business users (B2B) and not to individual consumers. Business users agree to indemnify and hold harmless SafeScoring from any claims, damages, or expenses arising from their misuse of evaluation data, including but not limited to presenting scores as investment advice, security guarantees, or professional audits. Individual consumers retain all rights under applicable consumer protection laws (including EU Consumer Rights Directive and French Code de la consommation) and are not subject to this indemnification obligation.",
        ],
      },
      {
        heading: "12. Severability, Force Majeure & Survival",
        list: [
          "12.1 If any provision of these Terms is found invalid or unenforceable, the remaining provisions shall continue in full force and effect.",
          "12.2 SafeScoring shall not be liable for failure to perform obligations due to events beyond reasonable control, including but not limited to natural disasters, cyberattacks, government actions, or infrastructure failures.",
          "12.3 Sections 5 (Disclaimer and Limitation of Liability), 11 (Indemnification), and this Section 12 shall survive termination of these Terms.",
        ],
      },
      {
        heading: "13. Class Action Waiver",
        paragraphs: [
          "To the maximum extent permitted by applicable law, you agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated, or representative action. If this waiver is found unenforceable, the entire dispute resolution section shall be void.",
        ],
      },
      {
        heading: "14. Updates to the Terms",
        paragraphs: [
          "We may update these Terms from time to time. Users will be notified of significant changes via email at least 30 days before changes take effect. For material changes affecting pricing, data processing, or user rights, we will request your explicit consent via email or in-app notification. If you do not accept the updated Terms, you may terminate your account and receive a pro-rata refund of any prepaid subscription fees. Minor corrections (typos, clarifications without substantive impact) may take effect immediately with notification.",
        ],
      },
      {
        heading: "15. Contact",
        paragraphs: [
          "For any questions regarding these Terms of Service, please contact us at:",
          "Email: support@safescoring.io\nLegal inquiries: legal@safescoring.io",
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
          `${config.appName} est une plateforme fournissant des notations de sécurité unifiées pour les produits crypto, notamment les portefeuilles matériels, les portefeuilles logiciels, les exchanges et les protocoles DeFi. Nous évaluons les produits selon des normes de sécurité complètes réparties en quatre piliers : Sécurité, Adversité, Fidélité et Efficacité (SAFE).`,
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
          "4.4 Les utilisateurs de l'API ne peuvent pas présenter les évaluations comme des conseils en investissement, des analyses de titres ou des audits de sécurité professionnels.",
          "4.5 Les utilisateurs en marque blanche doivent inclure l'attribution suivante : « Évaluation basée sur la méthodologie SafeScoring. Ne constitue pas un conseil financier ou en sécurité. »",
          "4.6 SafeScoring se réserve le droit de révoquer l'accès API en cas d'utilisation abusive ou de présentation trompeuse des données d'évaluation.",
        ],
      },
      {
        heading: "5. Clause de non-responsabilité et limitation de responsabilité",
        list: [
          "5.1 Les notations et évaluations de sécurité sont fournies à titre informatif et éducatif uniquement. Elles ne constituent pas un conseil financier, en investissement, en sécurité, fiscal ou juridique.",
          `5.2 ${config.appName} ne garantit pas la sécurité d'un produit. Les évaluations sont basées sur des informations publiquement disponibles et notre méthodologie standardisée. Elles peuvent être incomplètes, obsolètes ou contenir des inexactitudes.`,
          "5.3 Les utilisateurs doivent effectuer leurs propres vérifications et consulter des professionnels qualifiés avant d'utiliser tout produit crypto ou de prendre toute décision d'investissement.",
          "5.4 DANS LA MESURE MAXIMALE PERMISE PAR LA LOI, la responsabilité totale cumulée de SafeScoring pour toutes les réclamations liées à ce service ne pourra excéder le plus élevé des montants suivants : (a) les frais payés par vous au cours des 12 mois précédant la réclamation, ou (b) 100 €.",
          "5.5 EN AUCUN CAS SafeScoring ne pourra être tenu responsable de tout dommage indirect, accessoire, spécial, consécutif ou punitif, y compris mais sans s'y limiter les pertes de profits, de données, de fonds ou de clientèle, quelle que soit la théorie de responsabilité.",
          "5.6 Les évaluations ne sont pas adaptées à un usage particulier et ne doivent pas être utilisées comme seule base de décision. Un score élevé ne garantit pas la sécurité, et un score bas ne signifie pas qu'un produit sera compromis.",
          `5.7 ${config.appName} n'est pas un auditeur de sécurité agréé, un conseiller financier ou un organisme de certification. Nos évaluations complètent mais ne remplacent pas les audits de sécurité professionnels ou les conseils financiers.`,
          "5.8 Procédure de contestation : Les produits évalués peuvent contester leur évaluation selon la procédure suivante : (a) Soumettre une contestation écrite à legal@safescoring.io avec le nom du produit, les évaluations contestées et les preuves à l'appui ; (b) SafeScoring accusera réception sous 5 jours ouvrables ; (c) Notre équipe éditoriale examinera la contestation sous 15 jours ouvrables ; (d) Issues possibles : correction approuvée et publiée avec date, ou réponse écrite du produit publiée à côté de l'évaluation, ou contestation rejetée avec explication écrite ; (e) Un recours peut être déposé dans les 30 jours suivant le rejet.",
          "5.9 Politique de publication des scores et indépendance : SafeScoring publie ses scores uniquement sur la base de sa méthodologie d'évaluation. SafeScoring ne coordonne pas le calendrier de publication des scores avec les équipes de projets, les émetteurs de tokens ou des tiers. Les scores ne sont pas publiés dans le but d'influencer les prix du marché. SafeScoring n'a aucun intérêt financier dans les produits qu'il évalue. Les services de monitoring (badges SAFE Monitored) sont des services optionnels et payants d'évaluation continue et n'ont aucune influence sur les scores. Les produits monitorés et non monitorés sont évalués avec une méthodologie et des critères identiques. L'achat d'un service de monitoring n'améliore pas, ne garantit pas et n'affecte en aucun cas le score d'un produit.",
          "5.10 Avis de commentaire loyal et d'opinion : Toutes les évaluations représentent l'opinion de SafeScoring fondée sur des informations publiquement disponibles et notre méthodologie SAFE. Les scores impliquent un jugement subjectif sur l'importance des caractéristiques de sécurité et la pondération des facteurs d'évaluation. Des experts raisonnables utilisant des critères différents peuvent parvenir à des conclusions différentes. Les évaluations sont protégées en tant qu'opinion honnête en vertu du droit applicable.",
          "5.11 Statut réglementaire (MiCA / CRA) : SafeScoring n'est pas une agence de notation de crédit au sens du Règlement (CE) n° 1060/2009, du Règlement MiCA 2023/1114, du Credit Rating Agency Reform Act (États-Unis), ni de réglementations équivalentes. Les scores sont des opinions informatives uniquement et ne doivent pas être considérés comme des notations de crédit, des recommandations d'investissement ou des conseils au sens de l'Article 32 de MiCA. Les scores peuvent être basés sur des informations incomplètes et peuvent changer sans préavis.",
          "5.12 Politique anti-trading et conflits d'intérêts : SafeScoring et son personnel ne négocient pas, ne détiennent pas et n'ont aucun intérêt financier dans les tokens, protocoles ou produits crypto évalués sur cette plateforme. SafeScoring ne pratique pas le front-running, la manipulation de marché ni la divulgation coordonnée avec des entités de trading. Le calendrier de publication des scores est déterminé uniquement par notre processus éditorial. Toute personne impliquée dans le processus d'évaluation est interdite de négocier les actifs évalués pendant une période de 30 jours avant et après la publication du score. Toute violation de cette politique entraîne un licenciement immédiat. Si vous pensez qu'un conflit d'intérêts existe, signalez-le à legal@safescoring.io.",
        ],
      },
      {
        heading: "6. Abonnement et paiements",
        list: [
          "6.1 Les abonnements payants sont facturés mensuellement ou annuellement.",
          "6.2 Les abonnements sont automatiquement renouvelés à la fin de chaque période de facturation, sauf annulation avant la date de renouvellement. Vous serez facturé au tarif en vigueur pour votre plan à chaque renouvellement. En cas de modification tarifaire, vous serez informé par e-mail au moins 30 jours avant l'entrée en vigueur du nouveau tarif. Vous pouvez annuler votre abonnement avant l'application du nouveau tarif.",
          "6.3 Vous pouvez annuler votre abonnement à tout moment via les paramètres de votre compte ou en contactant le support. L'annulation prend effet à la fin de la période de facturation en cours.",
          "6.4 Les remboursements sont disponibles dans les 14 jours suivant l'achat (Article L.221-18 du Code de la consommation).",
          "6.5 Les paiements en monnaie fiduciaire sont traités de manière sécurisée par LemonSqueezy (Merchant of Record, TVA UE gérée). Les paiements crypto sont traités par MoonPay.",
          "6.6 Remboursement des paiements crypto : Pour les paiements effectués en cryptomonnaie, les remboursements seront effectués dans la même cryptomonnaie au taux de change en vigueur au moment du remboursement, ou en équivalent EUR/USD par virement bancaire à votre choix. En raison de la nature volatile des cryptomonnaies, SafeScoring n'est pas responsable des fluctuations de taux de change entre le moment du paiement et du remboursement. Les demandes de remboursement doivent être effectuées dans les 14 jours suivant l'achat en contactant support@safescoring.io.",
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
          "Les présentes CGU sont régies par les lois de la France et de l'Union Européenne. Rien dans ces CGU ne porte atteinte aux droits impératifs de protection des consommateurs prévus par votre législation locale.",
        ],
      },
      {
        heading: "10. Résolution des litiges et médiation",
        list: [
          "10.1 Pour les consommateurs de l'UE : vous pouvez saisir les tribunaux de votre pays de résidence. Pour les litiges non-consommateurs, les tribunaux de Paris, France, sont seuls compétents. Avant d'engager une procédure judiciaire, les parties s'engagent à tenter une résolution par notification écrite à legal@safescoring.io dans un délai de 30 jours ouvrables.",
          "10.2 Médiation de la consommation (Article L.612-1 du Code de la consommation) : En cas de litige non résolu directement avec SafeScoring, vous pouvez recourir gratuitement à un médiateur de la consommation. Médiateur : CMAP — Centre de Médiation et d'Arbitrage de Paris (https://www.cmap.fr). Vous pouvez également utiliser la plateforme de Règlement en Ligne des Litiges de l'UE : https://ec.europa.eu/consumers/odr",
        ],
      },
      {
        heading: "10bis. Juridictions restreintes et conformité sanctions",
        paragraphs: [
          "Les services SafeScoring peuvent ne pas être disponibles dans les juridictions soumises à des programmes de sanctions globales de l'UE, des États-Unis (OFAC), de l'ONU ou d'autres organismes internationaux, notamment : la Corée du Nord, l'Iran, la Syrie, Cuba, et les régions de Crimée, Donetsk et Louhansk. Les utilisateurs sont responsables de s'assurer que leur utilisation de SafeScoring est conforme à toutes les lois et réglementations locales applicables. SafeScoring n'est pas enregistré auprès de la SEC, CFTC, MAS, FSA (Japon), VARA (Dubaï) ou d'autres autorités de régulation financière.",
        ],
      },
      {
        heading: "11. Indemnisation",
        paragraphs: [
          "Cette section s'applique uniquement aux utilisateurs professionnels (B2B) et non aux consommateurs individuels. Les utilisateurs professionnels acceptent d'indemniser et de dégager SafeScoring de toute responsabilité en cas de réclamations, dommages ou dépenses résultant de leur utilisation abusive des données d'évaluation, y compris mais sans s'y limiter la présentation des scores comme conseils en investissement, garanties de sécurité ou audits professionnels. Les consommateurs individuels conservent l'intégralité de leurs droits en vertu des lois applicables de protection des consommateurs (notamment la Directive européenne sur les droits des consommateurs et le Code de la consommation français) et ne sont pas soumis à cette obligation d'indemnisation.",
        ],
      },
      {
        heading: "12. Divisibilité, force majeure et survie des clauses",
        list: [
          "12.1 Si une disposition des présentes CGU est jugée invalide ou inapplicable, les dispositions restantes continuent de s'appliquer pleinement.",
          "12.2 SafeScoring ne saurait être tenu responsable de l'inexécution de ses obligations en raison d'événements indépendants de sa volonté, incluant mais sans s'y limiter les catastrophes naturelles, les cyberattaques, les actions gouvernementales ou les défaillances d'infrastructure.",
          "12.3 Les sections 5 (Clause de non-responsabilité et limitation de responsabilité), 11 (Indemnisation) et la présente section 12 survivent à la résiliation des présentes CGU.",
        ],
      },
      {
        heading: "13. Renonciation aux actions collectives",
        paragraphs: [
          "Dans la mesure maximale permise par la loi applicable, vous acceptez que toute procédure de résolution de litiges sera menée uniquement à titre individuel et non dans le cadre d'une action collective, consolidée ou représentative. Si cette renonciation est jugée inapplicable, l'intégralité de la section relative à la résolution des litiges sera nulle.",
        ],
      },
      {
        heading: "14. Modifications des CGU",
        paragraphs: [
          "Nous pouvons mettre à jour ces CGU de temps à autre. Les utilisateurs seront informés des changements significatifs par e-mail au moins 30 jours avant leur prise d'effet. Pour les modifications substantielles affectant les tarifs, le traitement des données ou les droits des utilisateurs, nous demanderons votre consentement explicite par e-mail ou notification dans l'application. Si vous n'acceptez pas les CGU mises à jour, vous pouvez résilier votre compte et recevoir un remboursement au prorata des frais d'abonnement prépayés. Les corrections mineures (fautes de frappe, clarifications sans impact substantiel) peuvent prendre effet immédiatement avec notification.",
        ],
      },
      {
        heading: "15. Contact",
        paragraphs: [
          "Pour toute question concernant ces Conditions Générales d'Utilisation, veuillez nous contacter à :",
          "E-mail : support@safescoring.io\nQuestions juridiques : legal@safescoring.io",
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
