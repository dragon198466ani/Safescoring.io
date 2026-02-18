"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

// Dynamically import the WhiteLabelConfig component
const WhiteLabelConfig = dynamic(
  () => import("@/components/WhiteLabelConfig"),
  {
    loading: () => (
      <div className="flex justify-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    ),
  }
);

/**
 * White-Label Branding Page
 *
 * Enterprise feature for configuring custom branding on PDF reports.
 */
export default function BrandingPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Page Header */}
      <div className="mb-8">
        <nav className="text-sm breadcrumbs mb-4">
          <ul>
            <li>
              <a href="/dashboard">Dashboard</a>
            </li>
            <li>
              <a href="/dashboard/settings">Settings</a>
            </li>
            <li>White-Label Branding</li>
          </ul>
        </nav>

        <h1 className="text-3xl font-bold">White-Label Reports</h1>
        <p className="text-base-content/70 mt-2">
          Customize your PDF reports with your company branding. Enterprise feature.
        </p>
      </div>

      {/* Info Banner */}
      <div className="alert alert-info mb-8">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="stroke-current shrink-0 w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <h3 className="font-bold">How it works</h3>
          <p className="text-sm">
            Configure your branding below. When you export PDFs from setups,
            comparisons, or product pages, your custom branding will be applied
            automatically.
          </p>
        </div>
      </div>

      {/* White-Label Config */}
      <Suspense
        fallback={
          <div className="flex justify-center p-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        }
      >
        <WhiteLabelConfig />
      </Suspense>

      {/* Usage Examples */}
      <div className="mt-12">
        <h2 className="text-xl font-bold mb-4">Where to generate reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title text-base">Setup Reports</h3>
              <p className="text-sm text-base-content/70">
                Go to your setups and click "Export PDF" to generate a branded
                report of your security stack.
              </p>
              <div className="card-actions justify-end">
                <a href="/dashboard/setups" className="btn btn-sm btn-ghost">
                  My Setups
                </a>
              </div>
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title text-base">Comparison Reports</h3>
              <p className="text-sm text-base-content/70">
                Compare products and export the comparison as a branded PDF for
                presentations.
              </p>
              <div className="card-actions justify-end">
                <a href="/compare" className="btn btn-sm btn-ghost">
                  Compare Products
                </a>
              </div>
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title text-base">Product Reports</h3>
              <p className="text-sm text-base-content/70">
                Export detailed product analysis reports with your company
                branding.
              </p>
              <div className="card-actions justify-end">
                <a href="/products" className="btn btn-sm btn-ghost">
                  Browse Products
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Documentation */}
      <div className="mt-12">
        <h2 className="text-xl font-bold mb-4">API Integration</h2>
        <div className="card bg-base-200">
          <div className="card-body">
            <p className="text-sm text-base-content/70 mb-4">
              Generate branded reports programmatically using our API. Your
              saved branding will be automatically applied.
            </p>
            <div className="mockup-code text-xs">
              <pre data-prefix="$">
                <code>
                  curl -X PUT https://safescoring.io/api/reports/white-label \
                </code>
              </pre>
              <pre data-prefix="">
                <code>
                  {`  -H "Authorization: Bearer YOUR_API_KEY" \\`}
                </code>
              </pre>
              <pre data-prefix="">
                <code>
                  {`  -H "Content-Type: application/json" \\`}
                </code>
              </pre>
              <pre data-prefix="">
                <code>
                  {`  -d '{"type": "setup", "setupId": "uuid-here"}'`}
                </code>
              </pre>
            </div>
            <div className="card-actions justify-end mt-4">
              <a href="/api-docs" className="btn btn-sm btn-ghost">
                API Documentation
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
