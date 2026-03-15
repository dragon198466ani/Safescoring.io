import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Legal Notice — Mentions Légales | ${config.appName}`,
  canonicalUrlRelative: "/legal",
});

const Legal = () => {
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
          Back
        </Link>
        <h1 className="text-3xl font-extrabold pb-6">
          Legal Notice — Mentions Légales
        </h1>

        <pre
          className="leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "sans-serif" }}
        >
          {`Last Updated: March 2, 2026

===========================================
LEGAL NOTICE / MENTIONS LÉGALES
===========================================

In accordance with the French Law for Confidence in the Digital Economy (LCEN — Loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique), the German Telemediengesetz (TMG § 5), and EU Directive 2000/31/EC on electronic commerce, this page provides the legally required identification of the operator of this website.


1. SITE OPERATOR / ÉDITEUR DU SITE

SafeScoring LLC
30 N Gould St, Ste R
Sheridan, WY 82801
United States

Legal Form: Limited Liability Company (LLC)
State of Incorporation: Wyoming, USA
EIN (Employer Identification Number): Applied for

Director of Publication (Directeur de la publication):
Alexander Music, Managing Member

Contact:
Email: contact@safescoring.io
Privacy: privacy@safescoring.io
Support: support@safescoring.io


2. EU REPRESENTATIVE (GDPR Art. 27)

For users located in the European Union or the European Economic Area, SafeScoring has designated the following EU representative:

SafeScoring EU Representative
Email: eu-representative@safescoring.io

This representative can be contacted for all matters related to the processing of personal data of EU/EEA residents.


3. HOSTING / HÉBERGEMENT

Vercel Inc.
440 N Barranca Ave #4133
Covina, CA 91723, United States
Website: https://vercel.com
Phone: N/A (cloud hosting provider)

Database:
Supabase Inc.
970 Toa Payoh North, #07-04
Singapore 318992
Website: https://supabase.com


4. PAYMENTS & BILLING / PAIEMENT ET FACTURATION

All transactions are processed by Lemon Squeezy LLC, acting as Merchant of Record (Intermédiaire de paiement).

Lemon Squeezy LLC
222 S Main St #500
Salt Lake City, UT 84101, USA

Billing support: https://help.lemonsqueezy.com
Terms: https://lemonsqueezy.com/terms
Privacy: https://lemonsqueezy.com/privacy

SafeScoring does not store credit card numbers or sensitive payment data.


===========================================
NATURE OF OUR SCORES — EDITORIAL OPINION NOTICE
Qualification de nos scores — Avis d'opinion éditoriale
===========================================

5. SCORES AS PROTECTED EDITORIAL OPINIONS

5.1 All security scores, ratings, grades, labels, rankings, and evaluations published by SafeScoring (collectively, "Scores") constitute the subjective editorial opinions of SafeScoring LLC, derived exclusively from its published SAFE methodology.

5.2 Scores are NOT statements of fact. A Score is an evaluative conclusion — the output of an analytical framework applying disclosed criteria and weightings to publicly observable data. As such, Scores cannot be "proved true or false" in the sense that a discrete factual assertion can. They represent SafeScoring's honest, good-faith professional judgment and nothing more.

5.3 In accordance with the principles established by:
— The United States Supreme Court in Bose Corp. v. Consumers Union of United States, Inc., 466 U.S. 485 (1984), which held that product evaluations based on testing methodologies constitute protected speech;
— The United States Supreme Court in Milkovich v. Lorain Journal Co., 497 U.S. 1 (1990), which held that statements that "cannot reasonably be interpreted as stating actual facts" are constitutionally protected;
— Article 10 of the European Convention on Human Rights (freedom of expression);
— Article 11 of the Charter of Fundamental Rights of the European Union (freedom of expression and information);
— Section 3 of the United Kingdom Defamation Act 2013 (honest opinion defence);
— The Supreme Court of Canada in Grant v. Torstar Corp., [2009] SCC 61 (responsible communication on matters of public interest);
— Article 19 of the International Covenant on Civil and Political Rights (ICCPR);
SafeScoring asserts that its Scores are protected expressions of opinion on matters of public interest — namely, the security of digital products and services that the public relies upon.

5.4 Each Score published by SafeScoring:
— Represents an opinion, not a statement of fact
— Is derived from SafeScoring's published SAFE methodology
— Is based on publicly observable and verifiable data sources
— Reflects SafeScoring's honest, good-faith professional judgment
— Is published in the public interest to inform consumers about product security
— Is provided on an "AS IS" basis without warranty of any kind, express or implied, including but not limited to warranties of accuracy, completeness, merchantability, or fitness for any particular purpose
— Does not constitute a guarantee, certification, or endorsement of any product's security
— May change over time as new information becomes available or methodology evolves

5.5 SafeScoring clearly distinguishes between:
(a) Factual observations: verifiable data points collected through our evaluation process (e.g., "this product uses TLS 1.3 encryption"). SafeScoring endeavors to ensure the accuracy of all factual observations and maintains a correction mechanism for any factual errors (see Section 8);
(b) Evaluative conclusions: opinions derived from applying our methodology to observed data (e.g., "we rate this product's encryption implementation as 8/10"). These are inherently subjective judgments that reasonable evaluators could disagree upon.


6. PURPOSE AND PUBLIC INTEREST / FINALITÉ ET INTÉRÊT PUBLIC

6.1 SafeScoring publishes its Scores solely for the purpose of informing the public about the security posture of digital products and services. This constitutes a matter of public interest (intérêt public / öffentliches Interesse) within the meaning of applicable defamation and press laws across all jurisdictions.

6.2 SafeScoring operates as an independent editorial publication. Our Scores serve the same public-interest function as consumer product reviews, journalistic investigations, and academic security research. SafeScoring is not motivated by any intent to harm, defame, or disparage any entity, but solely by the desire to inform and protect consumers.

6.3 Pursuant to Article 230 of the Japanese Penal Code, Article 310 of the Korean Criminal Act, and equivalent provisions worldwide: SafeScoring's evaluations relate exclusively to matters of public concern, are published solely for the public benefit, and are not motivated by any intent to defame (名誉毀損の意図なし / 명예훼손의 의도 없음). The purpose of every evaluation is consumer protection and public information.

6.4 In jurisdictions where the distinction between "public interest purpose" and "intent to defame" is legally relevant (including but not limited to Japan, South Korea, and Singapore), SafeScoring affirms that:
— Every Score is published for the sole purpose of public benefit and consumer protection
— No Score is published with the intent to harm the reputation of any entity
— Our methodology is applied uniformly to all evaluated products without targeting, bias, or animus toward any particular entity
— Rated entities are offered a right of response before and after publication (see Section 8)


===========================================
DISPUTE RESOLUTION AND RIGHT OF REPLY
Résolution des litiges et droit de réponse
===========================================

7. DISPUTE RESOLUTION MECHANISM / MÉCANISME DE CONTESTATION

7.1 SafeScoring is committed to factual accuracy and fairness in all evaluations. Any entity whose product has been evaluated by SafeScoring may use the following dispute resolution mechanism:

7.2 Factual Accuracy Disputes:
If a rated entity believes that any factual observation (as defined in Section 5.5(a)) underlying a Score contains an error, they may submit a detailed correction request to: disputes@safescoring.io

The request must include:
(a) The specific factual claim alleged to be inaccurate
(b) Evidence demonstrating the inaccuracy
(c) The correct information with supporting documentation

SafeScoring will review all factual accuracy disputes within thirty (30) business days and will:
— Correct any verified factual error promptly
— Update the Score if the correction materially affects the evaluation
— Publish a notice of correction where appropriate

7.3 Methodology Disagreements:
If a rated entity disagrees with SafeScoring's evaluative methodology or the weight assigned to particular criteria, they may submit a methodology feedback to: methodology@safescoring.io

SafeScoring will consider all methodology feedback in good faith. However, because the methodology and its application represent SafeScoring's editorial opinion (Section 5), SafeScoring is under no obligation to modify its methodology in response to feedback from rated entities.

7.4 Remediation Updates:
If a rated entity has taken steps to improve the security of its product after evaluation, they may submit evidence of such improvements to: updates@safescoring.io

SafeScoring will consider re-evaluating products when material security improvements are documented.


8. RIGHT OF REPLY / DROIT DE RÉPONSE

8.1 In accordance with the French Law of 29 July 1881 (Article 13 — droit de réponse), the German Press Laws (Gegendarstellungsrecht), and as a matter of editorial best practice in all jurisdictions:

Any natural or legal person named or identified in a SafeScoring evaluation has the right to submit a response. SafeScoring will:
(a) Accept responses of reasonable length (maximum 2,000 words)
(b) Review responses within thirty (30) business days
(c) Publish or make available the substance of legitimate responses alongside the relevant evaluation, where appropriate
(d) Incorporate factual corrections into its evaluations where warranted

8.2 Pre-Publication Notification:
Where feasible, SafeScoring will endeavor to notify rated entities before initial publication of a Score and offer a reasonable opportunity to respond to factual claims. Responses received before publication will be considered and incorporated where appropriate. This pre-publication notification is a voluntary editorial practice and not a legal obligation, except where required by applicable law.

8.3 Contact for Right of Reply:
All right of reply requests should be directed to: reply@safescoring.io

8.4 Record-Keeping:
SafeScoring maintains detailed records of all disputes, corrections, responses, and their resolution. These records serve as evidence of SafeScoring's good faith, editorial diligence, and commitment to accuracy in all jurisdictions.


===========================================
EDITORIAL INDEPENDENCE AND ANTI-DEFAMATION
Indépendance éditoriale et protection anti-diffamation
===========================================

9. EDITORIAL INDEPENDENCE / INDÉPENDANCE ÉDITORIALE

9.1 SafeScoring's scoring methodology is applied uniformly and independently to all evaluated products. No entity may pay for, influence, or alter a Score through any means, including but not limited to: advertising, sponsorship, partnership, affiliate relationships, or threats of legal action.

9.2 Any attempt by a rated entity to influence, suppress, or alter a Score through threats, intimidation, or litigation will be treated as a Strategic Lawsuit Against Public Participation (SLAPP) and SafeScoring will vigorously defend its editorial rights under:
— State anti-SLAPP statutes (including but not limited to Wyoming, California CCP § 425.16, Texas CPRC Chapter 27, and all applicable state laws)
— The First Amendment to the United States Constitution
— Article 10 of the European Convention on Human Rights
— The proposed EU Anti-SLAPP Directive (COM/2022/177)
— Ontario Courts of Justice Act Section 137.1 (Canada)
— All equivalent protections in other jurisdictions

SafeScoring will seek the maximum recovery of legal fees, costs, and damages available under applicable anti-SLAPP statutes.

9.3 SafeScoring's editorial decisions, including the selection of products to evaluate, the methodology applied, and the Scores assigned, are protected editorial judgments equivalent to those of a journalistic publication reviewing consumer products, as affirmed by the U.S. Supreme Court in Bose Corp. v. Consumers Union, 466 U.S. 485 (1984).


10. ANTI-DEFAMATION NOTICE / AVIS ANTI-DIFFAMATION

10.1 SafeScoring's Scores are opinions protected by law. Before initiating any legal action against SafeScoring, prospective claimants should consider:

(a) United States: The actual malice standard (New York Times Co. v. Sullivan, 376 U.S. 254 (1964)) requires proof that SafeScoring knew a statement was false or acted with reckless disregard for the truth. Product evaluations receive heightened First Amendment protection under Bose Corp. v. Consumers Union.

(b) France: The prescription period for defamation claims under the Law of 29 July 1881 is three (3) months from the date of first publication. The bonne foi (good faith) defense is available where the publication serves the public interest, is based on a sufficient factual basis, is measured in tone, and reflects genuine investigative effort.

(c) Germany: SafeScoring's evaluations constitute Werturteile (value judgments) rather than Tatsachenbehauptungen (factual assertions) within the meaning of BVerfG jurisprudence, and are protected under Article 5 of the German Basic Law (Grundgesetz).

(d) United Kingdom: The Defamation Act 2013 requires corporate claimants to prove "serious financial loss" (Section 1(2)). The honest opinion defence (Section 3) and public interest defence (Section 4) apply to SafeScoring's evaluations.

(e) Canada: The responsible communication defence (Grant v. Torstar Corp., [2009] SCC 61) and fair comment doctrine protect SafeScoring's evaluations on matters of public interest.

(f) Australia: The Defamation Act 2005 limits standing of corporations with 10 or more employees. The honest opinion defence (Section 31) and public interest defence (Section 29A) apply.

(g) Japan: SafeScoring's evaluations relate to matters of public interest and are published solely for the public benefit within the meaning of Article 230-2 of the Penal Code (公共の利害に関する場合の特例).

(h) South Korea: SafeScoring's evaluations are published solely for the public interest (공익 목적) within the meaning of Article 310 of the Criminal Act, providing a defense against defamation claims including under the Information and Communications Network Act.

(i) Singapore: SafeScoring's evaluations are protected by the fair comment defence and qualified privilege under common law, as they concern matters of public interest and are published without malice.

10.2 SafeScoring maintains comprehensive documentation of its data sources, methodology application, editorial processes, and dispute resolution records. This documentation is available for legal proceedings in any jurisdiction to demonstrate good faith, accuracy, and public interest purpose.


===========================================
CROSS-BORDER ENFORCEMENT SHIELD
Protection contre l'exécution transfrontalière
===========================================

11. FOREIGN JUDGMENT PROTECTION (SPEECH ACT)

11.1 SafeScoring LLC is incorporated and domiciled in Wyoming, United States. Pursuant to the Securing the Protection of our Enduring and Established Constitutional Heritage (SPEECH) Act, 28 U.S.C. §§ 4101–4105 (2010):

Any foreign defamation judgment against SafeScoring is UNENFORCEABLE in the United States unless the foreign court applied protections for freedom of speech and press that are at least as protective as those provided by the First Amendment to the U.S. Constitution and by the constitution and laws of Wyoming.

11.2 SafeScoring will challenge the enforcement of any foreign defamation judgment in U.S. courts under the SPEECH Act and will seek a declaratory judgment that any such foreign judgment is repugnant to the public policy of the United States.

11.3 The Hague Convention on the Recognition and Enforcement of Foreign Judgments in Civil or Commercial Matters (2019) explicitly excludes defamation from its scope. No standardized international mechanism exists for cross-border enforcement of defamation judgments.

11.4 SafeScoring's primary assets, operations, and intellectual property are located within the United States and are subject to the protections of U.S. law.


===========================================
FINANCIAL AND REGULATORY DISCLAIMERS
Avertissements financiers et réglementaires
===========================================

12. NOT A CREDIT RATING AGENCY

IMPORTANT: SafeScoring is NOT a registered or authorized Credit Rating Agency (CRA) under EU Regulation No. 1060/2009 (CRA Regulation), nor under any equivalent regulation in any other jurisdiction.

Our security scores are NOT credit ratings as defined by the European Securities and Markets Authority (ESMA), the U.S. Securities and Exchange Commission (SEC), or any other financial regulatory authority.

SafeScoring provides independent security assessments of cryptocurrency products based on a published methodology. These assessments constitute editorial opinions (see Section 5) and:
— Do not constitute credit ratings or financial ratings
— Are not supervised by ESMA, SEC, FCA, AMF, or any financial regulator
— Do not reflect the creditworthiness or financial viability of any entity
— Should not be used as the sole basis for any investment decision
— Are not guarantees of security or endorsements of any product


13. FINANCIAL DISCLAIMER / AVERTISSEMENT FINANCIER

SafeScoring does not provide investment advice, financial advice, trading advice, or any other form of professional advice.

All information, scores, and evaluations on this website are provided for educational and informational purposes only. They are editorial opinions (see Section 5) and do not constitute a recommendation to buy, sell, or hold any cryptocurrency, digital asset, or financial product.

Cryptocurrency and digital assets are highly volatile and involve substantial risk of loss. You may lose some or all of your investment. Always conduct your own research (DYOR) and consult a qualified financial advisor before making any investment decision.


14. FCA RISK WARNING (United Kingdom)

For users in the United Kingdom: Don't invest unless you're prepared to lose all the money you invest. This is a high-risk investment and you should not expect to be protected if something goes wrong. Take 2 minutes to learn more: https://www.fca.org.uk/investsmart

SafeScoring is not authorized or regulated by the Financial Conduct Authority (FCA). Our security scores are editorial opinions (see Section 5) and are not financial promotions under the Financial Services and Markets Act 2000.


15. AMF NOTICE (France)

SafeScoring n'est pas un Prestataire de Services sur Actifs Numériques (PSAN) enregistré auprès de l'Autorité des Marchés Financiers (AMF). Nos scores de sécurité constituent des opinions éditoriales (voir Section 5) et ne constituent pas des conseils en investissement au sens de la réglementation française.

Les investissements en crypto-actifs comportent des risques importants, incluant le risque de perte totale du capital investi. Avant toute décision d'investissement, consultez un conseiller financier agréé.


===========================================
APPLICABLE LAW AND JURISDICTION
Droit applicable et juridiction compétente
===========================================

16. APPLICABLE LAW / DROIT APPLICABLE

16.1 This website and these legal notices are governed by:
— United States law (State of Wyoming) as primary governing law
— European Union law (Regulation (EU) 2016/679 — GDPR, Directive 2000/31/EC — E-Commerce) for EU/EEA users
— French law (Loi n° 2004-575 — LCEN, Code de la consommation, Code de la propriété intellectuelle) for French users

16.2 Mandatory Dispute Resolution:
Before initiating any legal proceedings, any party with a claim against SafeScoring must:
(a) First submit the dispute through SafeScoring's dispute resolution mechanism (Section 7) and allow thirty (30) business days for resolution;
(b) If unresolved, engage in good-faith mediation for a minimum of sixty (60) days;
(c) Only after exhausting steps (a) and (b) may legal proceedings be initiated.

16.3 Jurisdiction and Venue:
Any legal proceedings not resolved through the above dispute resolution process shall be brought exclusively before the courts of Sheridan County, Wyoming, United States, applying the substantive laws of the State of Wyoming, except where mandatory consumer protection law of the user's country of residence requires otherwise.

16.4 This jurisdiction clause is without prejudice to the mandatory application of:
— EU Regulation (EU) No 1215/2012 (Brussels Ibis) for EU/EEA consumers
— French consumer protection law (Article R. 631-3 of the Code de la consommation)
— Any other mandatory consumer protection jurisdiction rules


===========================================
INTELLECTUAL PROPERTY
Propriété intellectuelle
===========================================

17. INTELLECTUAL PROPERTY / PROPRIÉTÉ INTELLECTUELLE

All content on this website, including but not limited to: the SAFE scoring methodology, security scores, product evaluations, text, graphics, logos, and software, is the exclusive property of SafeScoring LLC or its licensors.

The SAFE methodology, including its criteria, weightings, and scoring framework, constitutes SafeScoring's proprietary editorial framework and trade secret. Reproduction, reverse-engineering, or commercial exploitation of the methodology without prior written authorization is prohibited.

Any reproduction, distribution, or commercial exploitation of this content without prior written authorization is prohibited under applicable intellectual property law (Code de la propriété intellectuelle in France, Directive 2001/29/EC in the EU, U.S. Copyright Act).


17A. PATENTS AND DEFENSIVE PATENT PLEDGE / BREVETS ET ENGAGEMENT DÉFENSIF

17A.1 SafeScoring LLC holds patent rights and documented prior art relating to its core technologies, including but not limited to: the SAFE scoring methodology, anti-copy protection systems, and portfolio security assessment algorithms.

17A.2 Defensive Patent Pledge: SafeScoring LLC pledges that all patents and patent applications it holds will be used only defensively — that is, only as a counterclaim or defense in response to a patent infringement action first brought against SafeScoring, its users, or its contributors. This pledge is irrevocable and binding on any successor entity, assignee, or acquirer of SafeScoring's patent portfolio.

17A.3 Patent Grant to Users: All users of SafeScoring software (whether under the AGPL-3.0 open source license or a commercial license) receive a perpetual, worldwide, non-exclusive, royalty-free patent license covering SafeScoring's patented technologies as implemented in the software. This grant terminates only if the recipient initiates patent litigation against SafeScoring. Full terms are available in the PATENTS.md file in our source code repository.

17A.4 Prior Art Publications: SafeScoring proactively publishes its innovations as defensive prior art to prevent third parties from patenting similar methods. Our published methodology (https://safescoring.com/methodology), open source code (licensed under AGPL-3.0), and technical documentation collectively establish verifiable prior art dating from December 31, 2025.

17A.5 Patent Trolling Notice: SafeScoring vigorously defends against frivolous patent assertions. Any party asserting patents against SafeScoring should be aware that:
(a) SafeScoring maintains extensive prior art documentation with verifiable publication dates
(b) SafeScoring will challenge the validity of any patent that conflicts with its published prior art
(c) SafeScoring will seek recovery of legal fees and costs under applicable fee-shifting statutes
(d) SafeScoring's defensive patent pledge ensures mutual non-aggression with its user and contributor community

17A.6 For patent-related inquiries, contact: patents@safescoring.io


===========================================
AFFILIATE DISCLOSURE AND CONFLICTS OF INTEREST
Divulgation des affiliations et conflits d'intérêts
===========================================

18. AFFILIATE DISCLOSURE / DIVULGATION DES AFFILIATIONS

18.1 SafeScoring may receive compensation from some products or services listed on this website through affiliate relationships.

18.2 CRITICAL: This compensation NEVER influences our scoring methodology. Scores are determined exclusively by our published SAFE methodology, applied uniformly to all products regardless of any affiliate relationship. The existence or absence of an affiliate relationship has zero impact on any Score.

18.3 Any affiliate relationships are clearly disclosed where applicable, in accordance with:
— U.S. Federal Trade Commission (FTC) Endorsement Guidelines (16 CFR Part 255)
— EU Unfair Commercial Practices Directive 2005/29/EC
— French Consumer Code (Code de la consommation, Article L. 121-1)

18.4 SafeScoring maintains strict editorial independence (Section 9). The scoring process and the commercial/affiliate process are completely separated. No person involved in affiliate relationships has any authority over or input into the scoring process.


===========================================
ADDITIONAL REGULATORY NOTICES
Avis réglementaires supplémentaires
===========================================

19. ADDITIONAL REGULATORY NOTICES

In all cases below, SafeScoring's scores constitute editorial opinions published in the public interest (see Section 5) and do not constitute financial advice, investment advice, or regulated activity.

19.1 Switzerland (FINMA)
SafeScoring is not regulated by the Swiss Financial Market Supervisory Authority (FINMA). Our scores are not endorsed by any Swiss regulatory body.

19.2 Singapore (MAS)
SafeScoring is not licensed as a Digital Payment Token (DPT) service provider under the Payment Services Act (PSA) of Singapore. Our scores do not constitute advice on DPT dealings. Our evaluations are published in the public interest and without malice, consistent with the fair comment defence under Singapore common law.

19.3 Japan (FSA / 金融庁)
SafeScoring is not registered as a crypto-asset exchange service provider or investment adviser under Japanese law (FIEA). Our scores are editorial opinions published solely for the public benefit (公共の利益のために) within the meaning of Article 230-2 of the Japanese Penal Code.

19.4 Australia (ASIC)
SafeScoring does not hold an Australian Financial Services Licence (AFSL). Our scores constitute general information and editorial opinions only, and do not constitute financial product advice under the Corporations Act 2001. Our evaluations are honest opinions on matters of public interest within the meaning of Section 31 of the Defamation Act 2005.

19.5 UAE / Dubai (VARA)
SafeScoring is not licensed by the Virtual Assets Regulatory Authority (VARA) or any UAE financial authority. Our scores are independent editorial assessments.

19.6 South Korea (금융위원회)
SafeScoring is not registered with or regulated by any South Korean financial authority. Our evaluations are published exclusively for the public interest (공익) as contemplated by Article 310 of the Korean Criminal Act. No evaluation is published with any intent to defame any entity. SafeScoring's methodology is applied uniformly and without bias.

19.7 Germany (BaFin)
SafeScoring is not regulated by the Bundesanstalt für Finanzdienstleistungsaufsicht (BaFin). Our scores constitute Werturteile (value judgments) protected under Article 5 of the German Basic Law (Grundgesetz) and do not constitute Anlageberatung (investment advice) under § 2 Abs. 8 Nr. 10 WpHG.

19.8 Canada (CSA / ACVM)
SafeScoring is not registered with any Canadian securities regulatory authority. Our scores are editorial opinions published on a matter of public interest, consistent with the responsible communication defence established in Grant v. Torstar Corp., [2009] SCC 61.


===========================================
LIMITATION OF LIABILITY
Limitation de responsabilité
===========================================

20. LIMITATION OF LIABILITY / LIMITATION DE RESPONSABILITÉ

20.1 TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SAFESCORING LLC, ITS MEMBERS, OFFICERS, EMPLOYEES, AGENTS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM OR RELATED TO:
(a) Any Score, evaluation, rating, or assessment published on this website
(b) Any decision made in reliance upon a Score or evaluation
(c) Any alleged inaccuracy in a Score or evaluation
(d) Any loss of revenue, profits, business, data, or goodwill

20.2 All Scores and evaluations are provided "AS IS" and "AS AVAILABLE" without warranty of any kind. SafeScoring disclaims all warranties, express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, accuracy, completeness, and non-infringement.

20.3 This limitation of liability does not apply where prohibited by mandatory consumer protection law, including but not limited to: EU consumer rights directives, French Code de la consommation, and equivalent mandatory protections in other jurisdictions.


===========================================
DATA PROTECTION
Protection des données
===========================================

21. DATA PROTECTION AND GDPR COMPLIANCE

21.1 Lawful Basis for Processing Rated Entity Data:
Where SafeScoring processes data relating to rated entities and their products, the lawful basis is legitimate interest under Article 6(1)(f) of Regulation (EU) 2016/679 (GDPR). SafeScoring has conducted a legitimate interest assessment confirming that the public interest in transparent security evaluations outweighs any impact on the rights of rated entities.

21.2 Data Subject Rights:
Rated entities and individuals whose data may be processed in connection with evaluations may exercise their rights under GDPR Articles 15-22 by contacting: privacy@safescoring.io

21.3 SafeScoring processes only publicly available data in connection with its evaluations. No non-public, confidential, or proprietary information of rated entities is accessed, collected, or processed without consent.


© ${new Date().getFullYear()} SafeScoring LLC. All rights reserved.

This legal notice was last reviewed and updated on March 2, 2026. SafeScoring reserves the right to modify this notice at any time. Material changes will be noted with an updated "Last Updated" date.

IMPORTANT: This legal notice is designed to protect SafeScoring's editorial rights across all jurisdictions. It does not constitute legal advice. SafeScoring recommends that any party considering legal action consult qualified legal counsel in their jurisdiction before proceeding.`}
        </pre>
      </div>
    </main>
  );
};

export default Legal;
