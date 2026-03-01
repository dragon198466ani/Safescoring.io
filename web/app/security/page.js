import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Responsible Disclosure — Security Policy | ${config.appName}`,
  canonicalUrlRelative: "/security",
});

const Security = () => {
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
          Responsible Disclosure — Security Policy
        </h1>

        <pre
          className="leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "sans-serif" }}
        >
          {`Last Updated: March 2, 2026

SafeScoring takes the security of our platform seriously. As a crypto security scoring company, we hold ourselves to the same high standards we evaluate in others.


1. SCOPE

This policy applies to vulnerabilities in:
— safescoring.io website and web application
— SafeScoring API (api.safescoring.io)
— SafeScoring authentication and account systems
— SafeScoring payment integration

This policy does NOT apply to:
— Third-party services we use (Vercel, Supabase, Lemon Squeezy) — please report issues directly to those vendors
— The crypto products we evaluate — contact those projects directly
— Social engineering attacks against SafeScoring staff


2. HOW TO REPORT A VULNERABILITY

Please report security vulnerabilities to:

Email: security@safescoring.io
PGP Key: Available upon request

When reporting, please include:
— A clear description of the vulnerability
— Steps to reproduce the issue
— The potential impact
— Any proof-of-concept code (if applicable)
— Your preferred contact method

Please DO NOT:
— Access or modify other users' data
— Perform denial-of-service attacks
— Use automated vulnerability scanners at high volume
— Publicly disclose the vulnerability before we have addressed it


3. OUR COMMITMENT

3.1 Acknowledgment
We will acknowledge receipt of your report within 48 hours.

3.2 Assessment
We will assess the severity and impact within 5 business days.

3.3 Resolution
We aim to resolve confirmed vulnerabilities within:
— Critical: 24 hours
— High: 7 days
— Medium: 30 days
— Low: 90 days

3.4 Communication
We will keep you informed of our progress throughout the process.

3.5 Credit
With your permission, we will publicly credit you for the discovery in our security acknowledgments.


4. SAFE HARBOR

SafeScoring will not pursue legal action against security researchers who:
— Act in good faith and in accordance with this policy
— Avoid privacy violations, data destruction, and service disruption
— Report vulnerabilities promptly and confidentially
— Do not exploit vulnerabilities beyond what is necessary to demonstrate the issue

This safe harbor applies to criminal and civil claims that SafeScoring could pursue against the researcher.


5. SEVERITY CLASSIFICATION

We classify vulnerabilities using the Common Vulnerability Scoring System (CVSS v3.1):

Critical (9.0-10.0): Remote code execution, authentication bypass, access to all user data
High (7.0-8.9): Privilege escalation, stored XSS, SQL injection
Medium (4.0-6.9): CSRF, reflected XSS, information disclosure
Low (0.1-3.9): Minor information leakage, best practice violations


6. RECOGNITION

We maintain a Hall of Fame for researchers who have responsibly disclosed valid vulnerabilities. If you would like to be included, please let us know in your report.


7. SECURITY MEASURES

SafeScoring implements the following security measures:

7.1 Infrastructure
— TLS 1.3 encryption for all connections
— Strict Content Security Policy (CSP)
— HTTP Strict Transport Security (HSTS)
— X-Frame-Options: DENY
— X-Content-Type-Options: nosniff

7.2 Authentication
— Secure session management
— OAuth 2.0 via trusted providers (Google)
— Rate limiting on authentication endpoints
— CSRF protection on all forms

7.3 Data Protection
— Encryption at rest for sensitive data
— Minimal data collection (data minimization principle)
— Regular access reviews
— Automated security scanning

7.4 Monitoring
— Real-time error tracking (Sentry)
— Rate limiting on all API endpoints
— Automated anomaly detection


8. CONTACT

For security-related inquiries:
Email: security@safescoring.io

For general support:
Email: support@safescoring.io

For privacy-related issues:
Email: privacy@safescoring.io


© ${new Date().getFullYear()} SafeScoring LLC. All rights reserved.`}
        </pre>
      </div>
    </main>
  );
};

export default Security;
