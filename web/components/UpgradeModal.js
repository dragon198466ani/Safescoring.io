"use client";

import { useEffect } from "react";
import Link from "next/link";
import config from "@/config";

export default function UpgradeModal({ isOpen, onClose, remaining = 0, limit = 5 }) {
  const proPlan = config.lemonsqueezy.plans.find((p) => p.isFeatured);
  const explorerPlan = config.lemonsqueezy.plans.find((p) => p.name === "Explorer");

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-base-100 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 btn btn-ghost btn-sm btn-circle"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2">
            {remaining === 0
              ? "You've reached your monthly limit"
              : `Only ${remaining} product${remaining > 1 ? "s" : ""} left this month`}
          </h3>
          <p className="text-base-content/60">
            {remaining === 0
              ? `You've viewed ${limit} products this month. Upgrade for unlimited access.`
              : "Upgrade now to get unlimited access to all product evaluations."}
          </p>
        </div>

        {/* Plans comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Explorer */}
          <div className="rounded-xl border border-base-300 p-4">
            <div className="font-semibold mb-1">{explorerPlan?.name}</div>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl font-bold">${explorerPlan?.price}</span>
              <span className="text-sm text-base-content/60">/mo</span>
            </div>
            <ul className="space-y-2 text-sm mb-4">
              <li className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                Unlimited products
              </li>
              <li className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                Email support
              </li>
            </ul>
            <Link href="/#pricing" className="btn btn-outline btn-sm w-full">
              Choose
            </Link>
          </div>

          {/* Professional */}
          <div className="rounded-xl border-2 border-primary bg-primary/10 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold">{proPlan?.name}</span>
              <span className="badge badge-primary badge-xs">Popular</span>
            </div>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl font-bold">${proPlan?.price}</span>
              <span className="text-sm text-base-content/60">/mo</span>
            </div>
            <ul className="space-y-2 text-sm mb-4">
              <li className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                Everything in Explorer
              </li>
              <li className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                API access
              </li>
            </ul>
            <Link href="/#pricing" className="btn btn-primary btn-sm w-full">
              Start Trial
            </Link>
          </div>
        </div>

        {/* Trial badge */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-sm text-base-content/60">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
            14-day free trial with card
          </div>
        </div>
      </div>
    </div>
  );
}
