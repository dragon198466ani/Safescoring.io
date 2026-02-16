"use client";

import Link from "next/link";
import config from "@/config";

export default function StepComplete({ data, onComplete, onBack, saving }) {
  const freePlan = config.lemonsqueezy.plans.find((p) => p.variantId === "free");
  const proPlan = config.lemonsqueezy.plans.find((p) => p.isFeatured);

  return (
    <div className="text-center">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 text-green-400 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
            <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">You&apos;re all set, {data.name}!</h2>
        <p className="text-base-content/60">
          Your account is ready. You have access to {freePlan?.limits?.monthlyProductViews || 5} detailed product evaluations per month.
        </p>
      </div>

      {/* Free plan summary */}
      <div className="rounded-xl border border-base-300 p-6 mb-6 text-left">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-semibold">Free Plan</div>
            <div className="text-sm text-base-content/60">Your current plan</div>
          </div>
          <div className="badge badge-success">Active</div>
        </div>
        <ul className="space-y-2">
          {freePlan?.features?.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
              {feature.name}
            </li>
          ))}
        </ul>
      </div>

      {/* Upgrade CTA */}
      <div className="rounded-xl border-2 border-primary bg-primary/10 p-6 mb-8 text-left">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-primary text-primary-content">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-semibold mb-1">Want unlimited access?</div>
            <p className="text-sm text-base-content/60 mb-3">
              Upgrade to {proPlan?.name} for unlimited product evaluations, API access, and more.
            </p>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl font-bold">${proPlan?.price || "—"}</span>
              <span className="text-base-content/60">/month</span>
              <span className="badge badge-primary badge-sm">14-day free trial</span>
            </div>
            <Link href="/#pricing" className="btn btn-primary btn-sm">
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn btn-ghost">
          Back
        </button>
        <button
          onClick={onComplete}
          disabled={saving}
          className="btn btn-primary flex-1"
        >
          {saving ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            "Go to Dashboard"
          )}
        </button>
      </div>
    </div>
  );
}
