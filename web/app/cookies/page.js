import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = getSEOTags({
  title: `Cookie Policy | ${config.appName}`,
  canonicalUrlRelative: "/cookies",
});

const CookiePolicy = () => {
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
          Cookie Policy for {config.appName}
        </h1>

        <pre
          className="leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "sans-serif" }}
        >
          {`Last Updated: January 3, 2026

This Cookie Policy explains how SafeScoring uses cookies and similar technologies on safescoring.io.

1. WHAT ARE COOKIES?

Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences and improve your experience.

2. LEGAL BASIS

We use cookies in compliance with:
- General Data Protection Regulation (GDPR) - EU 2016/679
- ePrivacy Directive 2002/58/EC
- French Data Protection Act (Loi Informatique et Libertes)

We require your consent before placing non-essential cookies.

3. TYPES OF COOKIES WE USE

3.1 ESSENTIAL COOKIES (Always Active)

| Cookie Name        | Purpose                      | Duration |
|--------------------|------------------------------|----------|
| next-auth.session  | User authentication          | Session  |
| next-auth.csrf     | CSRF protection              | Session  |
| cookie_consent     | Your cookie preferences      | 1 year   |

Legal basis: Legitimate interest (Art. 6(1)(f) GDPR)

3.2 ANALYTICS COOKIES (Require Consent)

Currently, SafeScoring does NOT use third-party analytics.

3.3 MARKETING COOKIES (Require Consent)

| Cookie Name        | Purpose                      | Provider |
|--------------------|------------------------------|----------|
| crisp-client/*     | Customer support chat        | Crisp    |

Legal basis: Consent (Art. 6(1)(a) GDPR)

4. THIRD-PARTY COOKIES

4.1 Crisp (Customer Support)
- Privacy: https://crisp.chat/en/privacy/
- Only loaded with your consent

4.2 Google OAuth (Sign-in)
- Privacy: https://policies.google.com/privacy

5. MANAGE YOUR COOKIES

5.1 Cookie Banner
Change preferences anytime via our cookie banner.

5.2 Browser Settings
- Chrome: chrome://settings/cookies
- Firefox: about:preferences#privacy
- Safari: Preferences > Privacy

6. COOKIE RETENTION

| Type               | Duration                     |
|--------------------|------------------------------|
| Session cookies    | Browser close                |
| Authentication     | 30 days                      |
| Consent            | 1 year                       |

7. YOUR RIGHTS (GDPR)

- Access: Know what cookies we use
- Object: Refuse non-essential cookies
- Withdraw: Change preferences anytime
- Erasure: Request deletion

8. CONTACT

Email: privacy@safescoring.io
Response: Within 30 days

9. SUPERVISORY AUTHORITY

CNIL - https://www.cnil.fr
3 Place de Fontenoy, 75334 PARIS`}
          </pre>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CookiePolicy;
