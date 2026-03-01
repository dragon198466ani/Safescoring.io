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
          {`Last Updated: March 2, 2026

Welcome to SafeScoring!

These Terms of Service ("Terms") govern your use of the SafeScoring website at https://safescoring.io ("Website") and the services provided by SafeScoring LLC. By using our Website and services, you agree to these Terms.

For subscription purchases, additional Terms of Sale (CGV) apply: /cgv

1. Description of SafeScoring

SafeScoring is a platform providing unified security ratings for cryptocurrency products including hardware wallets, software wallets, exchanges, and DeFi protocols. We evaluate products using 2376 security norms across four pillars: Security, Adversity, Fidelity, and Efficiency (SAFE).

IMPORTANT: SafeScoring is NOT a Credit Rating Agency under EU Regulation 1060/2009 or any equivalent regulation. Our security scores are independent editorial assessments and are not supervised by ESMA, SEC, FCA, AMF, or any other financial authority.

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

5. Disclaimer

5.1 Security ratings are provided for informational purposes only.
5.2 SafeScoring does not guarantee the security of any product.
5.3 Users should conduct their own due diligence before using any cryptocurrency product.
5.4 We are not responsible for any losses resulting from decisions made based on our ratings.

6. Subscription and Payments

6.1 Paid subscriptions are billed monthly or annually.
6.2 You may cancel your subscription at any time through your account settings.
6.3 Refunds are available within 14 days of purchase (EU Consumer Rights Directive).
6.4 Payments are processed securely through Lemon Squeezy LLC (Merchant of Record).
6.5 For detailed purchase terms, see our Terms of Sale (CGV): /cgv

7. Data Protection and Privacy

7.1 We process your data in accordance with GDPR and applicable data protection laws.
7.2 For details on data processing, please refer to our Privacy Policy.
7.3 You have the right to access, rectify, delete, and port your personal data.

8. Termination

8.1 We may terminate or suspend your account for violations of these Terms.
8.2 You may delete your account at any time by contacting support.

9. Governing Law

These Terms are governed by the laws of the European Union and France.

10. Dispute Resolution

Any disputes will be resolved through arbitration in accordance with EU regulations.

11. Updates to the Terms

We may update these Terms from time to time. Users will be notified of significant changes via email.

12. Sanctions and Export Controls

12.1 You may not use SafeScoring if you are located in, or a resident of, a country subject to comprehensive U.S., EU, or UN sanctions.
12.2 You represent that you are not on any restricted party list maintained by the U.S. (OFAC SDN), EU, or UN.

13. Force Majeure

SafeScoring shall not be liable for any failure or delay resulting from circumstances beyond our reasonable control, including but not limited to: blockchain network outages, regulatory changes, natural disasters, pandemics, or government actions.

14. Contact

For any questions regarding these Terms of Service, please contact us at:
Email: support@safescoring.io

Related Legal Documents:
— Privacy Policy: /privacy
— Terms of Sale (CGV): /cgv
— Cookie Policy: /cookies
— Legal Notice: /legal
— Accessibility: /accessibility
— Security Policy: /security

Thank you for using SafeScoring!`}
        </pre>
      </div>
    </main>
  );
};

export default TOS;
