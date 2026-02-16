import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";
import { getT } from "@/libs/i18n/server";

export const metadata = getSEOTags({
  title: `Legal Notice | ${config.appName}`,
  canonicalUrlRelative: "/legal",
});

const Legal = async () => {
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
          </svg>
          {t("legalPage.back")}
        </Link>
        <h1 className="text-3xl font-extrabold pb-6">{t("legalPage.title")}</h1>

        <pre
          className="leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "sans-serif" }}
        >
          {`LEGAL

SafeScoring is an independent research project focused on cryptocurrency security ratings.


HOSTING

Vercel Inc. (USA)
https://vercel.com


PAYMENTS & BILLING

All transactions are processed by Lemon Squeezy LLC, acting as Merchant of Record.

Lemon Squeezy LLC
222 S Main St #500
Salt Lake City, UT 84101, USA

Billing support: help.lemonsqueezy.com
Terms: lemonsqueezy.com/terms
Privacy: lemonsqueezy.com/privacy


CONTACT

safescoring@proton.me


DISCLAIMER

All information is provided for educational purposes only.
This is not financial advice. Cryptocurrency investments carry significant risk. Always do your own research.


© 2025 SafeScoring. All rights reserved.`}
        </pre>
      </div>
    </main>
  );
};

export default Legal;
