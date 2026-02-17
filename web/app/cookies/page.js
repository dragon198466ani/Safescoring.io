import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Cookie Policy | ${config.appName}`,
  canonicalUrlRelative: "/cookies",
});

const CookiePolicy = () => {
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
          Cookie Policy for {config.appName}
        </h1>

        <pre
          className="leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "sans-serif" }}
        >
          {`Last Updated: February 2026

This Cookie Policy explains how SafeScoring uses cookies and similar technologies on https://safescoring.io.

1. What Are Cookies

Cookies are small text files stored on your device when you visit a website. They help websites function properly and provide information to website operators.

2. Cookies We Use

2.1 Strictly Necessary Cookies (Essential)
These cookies are required for the website to function. They cannot be disabled.

- Session cookie: Maintains your authentication state after login
- CSRF token: Protects against cross-site request forgery attacks
- Cookie consent: Remembers your cookie preferences

Legal basis: Legitimate interest (GDPR Art. 6(1)(f)) — these are essential for the service to operate.

2.2 Functional Cookies
These cookies remember your preferences to improve your experience.

- Theme preference: Remembers your light/dark mode choice
- Language preference: Remembers your language setting

Legal basis: Consent (GDPR Art. 6(1)(a))

3. Cookies We Do NOT Use

- We do NOT use advertising or targeting cookies
- We do NOT use third-party analytics cookies (Google Analytics, etc.)
- We do NOT use social media tracking cookies
- We do NOT use any cookies that track individual users across websites
- We do NOT share cookie data with third parties

4. Third-Party Cookies

Our payment processor (Lemon Squeezy) may set cookies during the checkout process. These are subject to their own cookie policy: https://www.lemonsqueezy.com/privacy

Our authentication provider (NextAuth.js) sets session cookies for login functionality.

5. Cookie Duration

- Session cookies: Deleted when you close your browser
- Authentication cookies: Up to 30 days (or until you sign out)
- Preference cookies: Up to 12 months

6. Managing Cookies

You can control cookies through your browser settings:
- Most browsers allow you to block or delete cookies
- Blocking essential cookies may prevent the website from functioning properly
- You can clear cookies at any time through your browser settings

7. Your Rights (GDPR)

Under GDPR, you have the right to:
- Know what cookies we use and why
- Refuse non-essential cookies
- Withdraw consent at any time
- Request deletion of cookie data

8. Contact

For questions about our cookie policy:
Email: safescoring@proton.me

9. Updates

We may update this Cookie Policy. Changes will be posted on this page with an updated date.`}
        </pre>
      </div>
    </main>
  );
};

export default CookiePolicy;
