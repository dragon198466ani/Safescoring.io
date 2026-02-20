import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = getSEOTags({
  title: `Privacy Policy | ${config.appName}`,
  canonicalUrlRelative: "/privacy",
});

const Privacy = () => {
  return (
    <>
      <Header />
      <main className="max-w-xl mx-auto pt-20">
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
          Privacy Policy for {config.appName}
        </h1>

        <pre
          className="leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "sans-serif" }}
        >
          {`Last Updated: January 4, 2026

SafeScoring is committed to protecting your privacy and ensuring compliance with global data protection laws including GDPR (EU), CCPA/CPRA (California), LGPD (Brazil), UK GDPR, PIPEDA (Canada), and APPI (Japan).

1. DATA CONTROLLER

SafeScoring
Email: privacy@safescoring.io
Website: https://safescoring.io

2. DATA WE COLLECT

2.1 Account Information
- Email address (required for account creation and communication)
- Username (optional)
- Password (encrypted)

2.2 Payment Information
- For card payments: Processed by Stripe (we do not store card details)
- For crypto payments: Wallet address and transaction details
- Billing email address

2.3 Usage Data
- IP address (for security and fraud prevention)
- Browser type and version
- Pages visited and time spent
- API usage statistics (for paid plans)

2.4 Cookies
We use essential cookies for authentication and functionality. See section 8 for details.

3. LEGAL BASIS FOR PROCESSING (GDPR Art. 6)

3.1 Contract Performance (Art. 6(1)(b))
Processing necessary to provide our services when you subscribe.

3.2 Consent (Art. 6(1)(a))
For marketing communications and non-essential cookies.

3.3 Legitimate Interest (Art. 6(1)(f))
For fraud prevention, security, and service improvement.

4. PURPOSE OF DATA PROCESSING

We collect and process your data to:
- Provide access to security ratings and evaluations
- Process payments and manage subscriptions
- Send service updates and important notifications
- Improve our services and user experience
- Comply with legal obligations
- Prevent fraud and abuse

5. DATA RETENTION

- Active accounts: Data retained while account is active
- Deleted accounts: Personal data deleted within 30 days
- Payment records: Retained for 10 years (legal requirement for accounting)
- Analytics data: Anonymized after 26 months

6. YOUR GDPR RIGHTS

Under GDPR, you have the following rights:

6.1 Right of Access (Art. 15)
Request a copy of your personal data we hold.

6.2 Right to Rectification (Art. 16)
Correct inaccurate or incomplete data.

6.3 Right to Erasure (Art. 17)
Request deletion of your data ("right to be forgotten").

6.4 Right to Data Portability (Art. 20)
Receive your data in machine-readable format.

6.5 Right to Object (Art. 21)
Object to processing based on legitimate interest.

6.6 Right to Restrict Processing (Art. 18)
Request temporary restriction of processing.

6.7 Right to Withdraw Consent (Art. 7(3))
Withdraw consent at any time for consent-based processing.

To exercise these rights, contact: privacy@safescoring.io

7. DATA SHARING AND TRANSFERS

7.1 Third-Party Processors
We share data only with essential service providers:
- Stripe: Payment processing (EU-based, GDPR-compliant)
- Supabase: Database hosting (EU region, GDPR-compliant)
- Vercel: Website hosting (Standard Contractual Clauses for EU-US transfers)

7.2 No Data Sales
We never sell your personal data to third parties.

7.3 Legal Disclosures
We may disclose data if required by law or court order.

8. COOKIES AND TRACKING

8.1 Essential Cookies
- Authentication cookies (strictly necessary)
- Session management (strictly necessary)

8.2 Analytics Cookies
- Anonymous usage statistics (with your consent)

You can control cookies through your browser settings.

9. SECURITY MEASURES

We implement industry-standard security measures:
- Data encryption in transit (TLS/SSL)
- Data encryption at rest
- Regular security audits
- Access controls and authentication
- Regular backups with encryption

10. CHILDREN'S PRIVACY

SafeScoring is not intended for users under 18. We do not knowingly collect data from minors.

11. CROSS-BORDER DATA TRANSFERS

When data is transferred outside the EU/EEA:
- We use Standard Contractual Clauses (SCCs) approved by the European Commission
- We ensure adequate safeguards are in place

12. DATA BREACH NOTIFICATION

In case of a data breach affecting your rights:
- We will notify you within 72 hours
- We will notify the relevant supervisory authority (CNIL for France)

13. AUTOMATED DECISION-MAKING

We do not use automated decision-making or profiling that significantly affects you.

14. MARKETING COMMUNICATIONS

14.1 Consent-Based
We send marketing emails only with your explicit consent.

14.2 Opt-Out
You can unsubscribe at any time using the link in our emails.

14.3 Service Emails
Important service updates are sent regardless of marketing preferences.

15. UPDATES TO THIS POLICY

We may update this Privacy Policy. Significant changes will be:
- Posted on this page with updated date
- Notified via email to registered users

16. SUPERVISORY AUTHORITY

If you believe your data rights have been violated, you can lodge a complaint with:

Commission Nationale de l'Informatique et des Libertés (CNIL)
3 Place de Fontenoy - TSA 80715
75334 PARIS CEDEX 07
Website: https://www.cnil.fr

17. CONTACT US

For privacy-related questions or to exercise your rights:

Email: privacy@safescoring.io
Response time: Within 30 days (GDPR requirement)

For general support: support@safescoring.io

18. CRYPTO PAYMENTS PRIVACY

18.1 No KYC Required
Cryptocurrency payments do not require identity verification.

18.2 Blockchain Transparency
Crypto transactions are publicly visible on blockchain.

18.3 Data Minimization
We collect only email for service delivery, not identity documents.

===========================================
JURISDICTION-SPECIFIC RIGHTS
===========================================

19. CALIFORNIA RESIDENTS (CCPA/CPRA)

If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):

19.1 Right to Know
You can request information about the categories and specific pieces of personal information we collect.

19.2 Right to Delete
You can request deletion of your personal information.

19.3 Right to Opt-Out of Sale
We do NOT sell your personal information. However, you can submit a "Do Not Sell My Personal Information" request.

19.4 Right to Non-Discrimination
We will not discriminate against you for exercising your privacy rights.

19.5 Right to Correct
You can request correction of inaccurate personal information.

19.6 Right to Limit Use of Sensitive Personal Information
You can limit the use of sensitive personal information.

To exercise CCPA rights: privacy@safescoring.io or visit /privacy/ccpa

Categories of Personal Information Collected (past 12 months):
- Identifiers (email, username)
- Commercial information (purchase history)
- Internet activity (browsing, API usage)
- Geolocation data (country only)

20. BRAZIL RESIDENTS (LGPD)

If you are a Brazil resident, you have rights under Lei Geral de Protecao de Dados (LGPD):

20.1 Right to Confirmation and Access
20.2 Right to Correction
20.3 Right to Anonymization, Blocking or Deletion
20.4 Right to Data Portability
20.5 Right to Information about Sharing
20.6 Right to Revoke Consent

Data Protection Officer: privacy@safescoring.io
ANPD (Brazilian Authority): https://www.gov.br/anpd

21. UK RESIDENTS (UK GDPR)

If you are a UK resident, your rights under UK GDPR mirror EU GDPR rights.

UK Supervisory Authority:
Information Commissioner's Office (ICO)
Website: https://ico.org.uk

22. CANADA RESIDENTS (PIPEDA)

If you are a Canadian resident, you have rights under PIPEDA:

22.1 Right to Access
22.2 Right to Challenge Accuracy
22.3 Right to Know How Information is Used
22.4 Right to Withdraw Consent

Office of the Privacy Commissioner of Canada:
https://www.priv.gc.ca

23. JAPAN RESIDENTS (APPI)

If you are a Japan resident, you have rights under the Act on Protection of Personal Information (APPI):

23.1 Right to Request Disclosure
23.2 Right to Request Correction
23.3 Right to Request Cessation of Use
23.4 Right to Request Cessation of Third-Party Provision

Personal Information Protection Commission (PPC):
https://www.ppc.go.jp

24. INTERNATIONAL DATA TRANSFERS

We transfer data internationally using:
- Standard Contractual Clauses (EU/UK)
- APEC Cross-Border Privacy Rules (Asia-Pacific)
- Adequacy decisions where applicable

25. HOW TO EXERCISE YOUR RIGHTS

Regardless of your location:

Email: privacy@safescoring.io
Online: /dashboard/settings (Privacy tab)
API: DELETE /api/user/delete, GET /api/user/export

Response times:
- GDPR/UK GDPR: 30 days
- CCPA: 45 days
- LGPD: 15 days
- PIPEDA: 30 days
- APPI: 30 days

Thank you for trusting SafeScoring with your data.`}
          </pre>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Privacy;
