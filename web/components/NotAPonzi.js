"use client";

import Link from "next/link";

/**
 * NotAPonzi Component
 * Explicit section showing what SafeScoring is NOT
 */

const PONZI_COMPARISON = [
  {
    redFlag: "Guaranteed returns",
    ponziExample: '"Earn 3% daily guaranteed!"',
    safeScoring: "No returns promised",
    proof: "SaaS subscription model only",
  },
  {
    redFlag: "Token/ICO sales",
    ponziExample: '"Buy our token before it moons!"',
    safeScoring: "No SAFE token exists",
    proof: "Zero crypto fundraising",
  },
  {
    redFlag: "Recruitment = revenue",
    ponziExample: '"Invite friends to earn more!"',
    safeScoring: "Optional affiliates only",
    proof: "Revenue = subscriptions",
  },
  {
    redFlag: "No accountability",
    ponziExample: '"No company, no legal entity"',
    safeScoring: "Registered Wyoming LLC",
    proof: "SafeScoring LLC - verifiable",
  },
  {
    redFlag: "Secret methodology",
    ponziExample: '"Our algorithm is proprietary"',
    safeScoring: "2354 norms published",
    proof: "Full methodology at /methodology",
  },
  {
    redFlag: "Withdrawal issues",
    ponziExample: '"7-day withdrawal delay"',
    safeScoring: "Cancel anytime, 1 click",
    proof: "14-day refund policy",
  },
];

export default function NotAPonzi({ compact = false }) {
  if (compact) {
    return <CompactVersion />;
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-red-500/5 via-base-100 to-green-500/5 border border-base-300 overflow-hidden">
      <div className="p-6 border-b border-base-300 bg-gradient-to-r from-red-500/10 to-transparent">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold">What SafeScoring is NOT</h2>
            <p className="text-base-content/60">Explicit comparison with common crypto scam patterns</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr className="border-b border-base-300">
              <th className="bg-base-200/50 text-base-content/70 font-medium">Red Flag</th>
              <th className="bg-red-500/5 text-red-400 font-medium">Ponzi Pattern</th>
              <th className="bg-green-500/5 text-green-400 font-medium">SafeScoring</th>
              <th className="bg-base-200/50 text-base-content/70 font-medium">Proof</th>
            </tr>
          </thead>
          <tbody>
            {PONZI_COMPARISON.map((row, i) => (
              <tr key={i} className="border-b border-base-300/50 hover:bg-base-200/30">
                <td className="font-medium">{row.redFlag}</td>
                <td className="text-red-400/80 text-sm italic">{row.ponziExample}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-green-500">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-400">{row.safeScoring}</span>
                  </div>
                </td>
                <td className="text-sm text-base-content/60">{row.proof}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-6 bg-base-200/30 border-t border-base-300">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-base-content/60">SafeScoring is a SaaS business, not an investment scheme.</p>
          <div className="flex gap-3">
            <Link href="/methodology" className="btn btn-sm btn-ghost">View Methodology</Link>
            <Link href="/#pricing" className="btn btn-sm btn-primary">See Pricing</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactVersion() {
  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-red-500/5 to-green-500/5 border border-base-300">
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        What SafeScoring is NOT
      </h3>
      <div className="space-y-3">
        {[
          { bad: "Guaranteed returns", good: "SaaS subscriptions" },
          { bad: "Token/ICO", good: "No crypto sales" },
          { bad: "Anonymous team", good: "Registered LLC" },
          { bad: "Secret scoring", good: "2354 public norms" },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-red-400/80">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {item.bad}
            </span>
            <span className="flex items-center gap-2 text-green-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
              {item.good}
            </span>
          </div>
        ))}
      </div>
      <Link href="/trust" className="btn btn-sm btn-ghost mt-4 w-full">View Full Transparency Page</Link>
    </div>
  );
}

export function NotAPonziBadge() {
  return (
    <Link href="/trust" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500/10 to-green-500/10 border border-base-300 hover:border-primary/30 transition-colors text-sm">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500">
        <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
      <span className="font-medium">Not a Ponzi</span>
      <span className="text-base-content/50">- Verified</span>
    </Link>
  );
}
