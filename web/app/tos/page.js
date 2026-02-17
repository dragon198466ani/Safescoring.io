import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Terms and Conditions | ${config.appName}`,
  canonicalUrlRelative: "/tos",
});

const TOS = () => {
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
          Terms and Conditions for {config.appName}
        </h1>

        <pre
          className="leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "sans-serif" }}
        >
          {`Last Updated: February 2026

Welcome to SafeScoring!

These Terms of Service ("Terms") govern your use of the SafeScoring website at https://safescoring.io ("Website") and the services provided by SafeScoring. By using our Website and services, you agree to these Terms.

1. Description of SafeScoring

SafeScoring is a platform providing unified security ratings for cryptocurrency products including hardware wallets, software wallets, exchanges, and DeFi protocols. We evaluate products (not individuals) using 916 security norms across four pillars: Security, Adversity, Fidelity, and Efficiency (SAFE).

SafeScoring does NOT score, rate, evaluate, or profile individual persons. All ratings apply exclusively to products and services.

2. Service Tiers

2.1 Free Plan: Access to 5 detailed product evaluations per month.
2.2 Paid Plans: Unlimited access to product evaluations, API access, and additional features depending on the subscription tier.
2.3 Trial Period: Paid plans include a 14-day free trial with credit card required (EU Consumer Rights Directive compliant).

3. User Accounts

3.1 You must provide accurate information when creating an account.
3.2 You are responsible for maintaining the confidentiality of your account credentials.
3.3 You must be at least 18 years old to use our services.

4. Intellectual Property

4.1 All content, including security scores, methodologies, and evaluations, is owned by SafeScoring.
4.2 You may not reproduce, distribute, or commercially exploit our content without written permission.
4.3 API users must comply with usage limits and attribution requirements.

5. Disclaimer and Limitation of Liability

5.1 NO FINANCIAL ADVICE. SafeScoring is NOT a registered investment advisor, financial advisor, or broker-dealer. Nothing on this website constitutes financial, investment, legal, or tax advice. SafeScoring does not recommend buying, selling, or holding any cryptocurrency or digital asset.

5.2 INFORMATIONAL PURPOSES ONLY. All security ratings, scores, evaluations, and content are provided for general informational and educational purposes only. They represent algorithmic assessments based on publicly available information and may contain errors or inaccuracies.

5.3 NO GUARANTEE OF ACCURACY. SafeScoring does not guarantee the accuracy, completeness, timeliness, or reliability of any score or evaluation. Security assessments are based on available information at the time of evaluation and may not reflect current conditions. New vulnerabilities, incidents, or changes may occur at any time.

5.4 NO WARRANTY. THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR TITLE.

5.5 LIMITATION OF LIABILITY. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SAFESCORING SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO: LOSS OF PROFITS, GOODWILL, DATA, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (A) YOUR USE OF OR INABILITY TO USE THE SERVICE; (B) ANY DECISIONS MADE BASED ON SCORES OR EVALUATIONS; (C) UNAUTHORIZED ACCESS TO YOUR DATA; (D) ANY THIRD-PARTY CONDUCT ON THE SERVICE.

5.6 RISK ACKNOWLEDGMENT. You acknowledge that cryptocurrency and digital assets carry significant risk. Past security performance does not guarantee future security. You are solely responsible for your own investment and usage decisions.

5.7 INDEPENDENT EVALUATION. SafeScoring is independent and not affiliated with, endorsed by, or partnered with any of the products it evaluates. Ratings do not imply endorsement.

6. Prohibited Uses

6.1 You may not use SafeScoring ratings to make automated investment or trading decisions.
6.2 You may not use SafeScoring data for hiring, credit, insurance, or other decisions about individuals.
6.3 You may not scrape, resell, or redistribute SafeScoring content without written authorization.
6.4 You may not misrepresent SafeScoring ratings as endorsements or guarantees.
6.5 You may not use the service to attempt to manipulate scores via false reports.

7. Subscription and Payments

7.1 Paid subscriptions are billed monthly or annually.
7.2 You may cancel your subscription at any time through your account settings.
7.3 Refunds are available within 14 days of purchase (EU Consumer Rights Directive).
7.4 Payments are processed securely by Lemon Squeezy LLC, acting as Merchant of Record.

8. Data Protection and Privacy

8.1 We process your data in accordance with GDPR and applicable data protection laws.
8.2 For details on data processing, please refer to our Privacy Policy.
8.3 You have the right to access, rectify, delete, and port your personal data.

9. Termination

9.1 We may terminate or suspend your account for violations of these Terms.
9.2 You may delete your account at any time by contacting support.
9.3 Upon termination, your right to use the service ceases immediately.

10. Governing Law

These Terms are governed by the laws of the European Union and France.

11. Dispute Resolution

Any disputes will be resolved through arbitration in accordance with EU regulations, specifically under the rules of the Centre de Mediation et d'Arbitrage de Paris (CMAP).

12. Updates to the Terms

We may update these Terms from time to time. Users will be notified of significant changes via email. Continued use of the service after changes constitutes acceptance.

13. Contact

For any questions regarding these Terms of Service, please contact us at:
Email: safescoring@proton.me`}
        </pre>
      </div>
    </main>
  );
};

export default TOS;
