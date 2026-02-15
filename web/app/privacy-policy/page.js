import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";
import { getT } from "@/libs/i18n/server";

export const metadata = getSEOTags({
  title: `Privacy Policy | ${config.appName}`,
  canonicalUrlRelative: "/privacy-policy",
});

const PrivacyPolicy = async () => {
  const t = await getT();

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
          {t("privacyPage.back")}
        </Link>
        <h1 className="text-3xl font-extrabold pb-6">
          {t("privacyPage.title", { appName: config.appName })}
        </h1>

        <pre
          className="leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "sans-serif" }}
        >
          {`Last Updated: December 2024

SafeScoring ("we," "us," or "our") is committed to protecting your privacy in accordance with the General Data Protection Regulation (GDPR) and applicable data protection laws.

1. Data Controller

SafeScoring acts as the data controller for personal data collected through https://safescoring.io.
Contact: support@safescoring.io

2. Legal Basis for Processing (GDPR Article 6)

We process your data based on:
- Contract performance: To provide our services
- Legitimate interests: To improve our services and prevent fraud
- Consent: For marketing communications (opt-in only)

3. Personal Data We Collect

3.1 Account Data:
- Email address (required for authentication)
- Name (optional, for personalization)
- OAuth profile data (if using Google sign-in)

3.2 Payment Data:
- Processed securely by Stripe
- We do NOT store credit card numbers
- We store: Stripe customer ID, subscription status

3.3 Usage Data:
- Products viewed (for usage limits)
- Preferences and interests (onboarding)

4. Data We Do NOT Collect

- We do NOT collect cryptocurrency wallet addresses
- We do NOT collect financial holdings information
- We do NOT track your cryptocurrency transactions
- We do NOT sell your data to third parties

5. Data Retention

- Account data: Until account deletion
- Usage data: 12 months rolling
- Payment records: As required by law (typically 7 years)

6. Your Rights Under GDPR

You have the right to:

6.1 Access: Request a copy of your personal data
6.2 Rectification: Correct inaccurate data
6.3 Erasure: Request deletion of your data ("right to be forgotten")
6.4 Portability: Receive your data in a portable format
6.5 Restriction: Limit how we use your data
6.6 Objection: Object to processing based on legitimate interests
6.7 Withdraw consent: At any time for consent-based processing

To exercise these rights, contact: support@safescoring.io

7. Data Security

We implement appropriate technical and organizational measures:
- Encrypted data transmission (HTTPS/TLS)
- Encrypted data at rest
- Row-level security (RLS) in our database
- Regular security audits
- Access controls and authentication

8. International Transfers

Data is processed within the EU/EEA. If transferred outside, we ensure adequate safeguards (Standard Contractual Clauses).

9. Third-Party Processors

We use the following processors:
- Supabase (Database): EU servers, GDPR compliant
- Stripe (Payments): PCI DSS compliant
- Google (OAuth): Privacy Shield certified
- Resend (Email): GDPR compliant

10. Cookies

10.1 Essential cookies: Required for authentication (session management)
10.2 We do NOT use advertising or tracking cookies
10.3 We do NOT use third-party analytics that track individual users

11. Children's Privacy

SafeScoring is not intended for users under 18. We do not knowingly collect data from minors.

12. Data Breach Notification

In case of a data breach affecting your rights, we will notify you and relevant authorities within 72 hours as required by GDPR.

13. Updates to This Policy

We may update this policy. Significant changes will be communicated via email. Continued use after changes constitutes acceptance.

14. Supervisory Authority

You have the right to lodge a complaint with a supervisory authority (CNIL in France).

15. Contact

Data Protection Inquiries:
Email: support@safescoring.io

By using SafeScoring, you acknowledge that you have read and understood this Privacy Policy.`}
        </pre>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
