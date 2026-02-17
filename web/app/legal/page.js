import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Legal Notice | ${config.appName}`,
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
        <h1 className="text-3xl font-extrabold pb-6">Legal Notice</h1>

        <pre
          className="leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "sans-serif" }}
        >
          {`LEGAL NOTICE

SafeScoring is an independent research project focused on cryptocurrency product security ratings. SafeScoring evaluates products and services only — it does not score, rate, or profile individual persons.


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


IMPORTANT DISCLAIMER

NOT FINANCIAL ADVICE. SafeScoring is not a registered investment advisor, financial advisor, or broker-dealer. Nothing on this website constitutes financial, investment, legal, or tax advice.

All information, scores, and evaluations are provided for educational and informational purposes only. They are algorithmic assessments based on publicly available information and may contain errors or inaccuracies.

SafeScoring does not guarantee the security, reliability, or safety of any product evaluated. Past security performance does not guarantee future security. New vulnerabilities may exist that are not yet reflected in our assessments.

SafeScoring is not affiliated with, endorsed by, or partnered with any of the products it evaluates. All product names and trademarks belong to their respective owners.

Cryptocurrency and digital assets carry significant risk. Always do your own research before making any decisions.

THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. USE AT YOUR OWN RISK.


© 2026 SafeScoring. All rights reserved.`}
        </pre>
      </div>
    </main>
  );
};

export default Legal;
