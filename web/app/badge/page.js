"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function BadgePage() {
  const [productSlug, setProductSlug] = useState("ledger-nano-x");
  const [style, setStyle] = useState("rounded");
  const [theme, setTheme] = useState("dark");
  const [copied, setCopied] = useState(null);

  const badgeUrl = `https://safescoring.io/api/badge/${productSlug}?style=${style}&theme=${theme}`;
  const productUrl = `https://safescoring.io/products/${productSlug}`;

  const htmlCode = `<a href="${productUrl}" target="_blank" rel="noopener">
  <img src="${badgeUrl}" alt="SafeScore" />
</a>`;

  const markdownCode = `[![SafeScore](${badgeUrl})](${productUrl})`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              SafeScore Badge
            </h1>
            <p className="text-base-content/60 max-w-2xl mx-auto">
              Display your product&apos;s SafeScoring evaluation results on your website.
            </p>
          </div>

          {/* Badge Preview */}
          <div className="rounded-xl bg-base-200 border border-base-300 p-8 mb-8">
            <h2 className="text-xl font-bold mb-6">Preview</h2>

            <div className="flex justify-center mb-8 p-8 rounded-lg bg-base-300">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/badge/${productSlug}?style=${style}&theme=${theme}`}
                alt="SafeScore Badge Preview"
                className="max-w-full"
              />
            </div>

            {/* Options */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Product slug */}
              <div>
                <label className="block text-sm font-medium mb-2">Product Slug</label>
                <input
                  type="text"
                  value={productSlug}
                  onChange={(e) => setProductSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="input input-bordered w-full"
                  placeholder="ledger-nano-x"
                />
              </div>

              {/* Style */}
              <div>
                <label className="block text-sm font-medium mb-2">Style</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="rounded">Rounded</option>
                  <option value="flat">Flat</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              {/* Theme */}
              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>
            </div>
          </div>

          {/* Embed codes */}
          <div className="rounded-xl bg-base-200 border border-base-300 p-8 mb-8">
            <h2 className="text-xl font-bold mb-6">Embed Code</h2>

            {/* HTML */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">HTML</label>
                <button
                  onClick={() => copyToClipboard(htmlCode, 'html')}
                  className="btn btn-xs btn-ghost"
                >
                  {copied === 'html' ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="bg-base-300 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{htmlCode}</code>
              </pre>
            </div>

            {/* Markdown */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Markdown (GitHub, GitLab, etc.)</label>
                <button
                  onClick={() => copyToClipboard(markdownCode, 'markdown')}
                  className="btn btn-xs btn-ghost"
                >
                  {copied === 'markdown' ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="bg-base-300 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{markdownCode}</code>
              </pre>
            </div>
          </div>

          {/* Benefits */}
          <div className="rounded-xl bg-gradient-to-br from-primary/20 to-base-200 border border-base-300 p-8 mb-8">
            <h2 className="text-xl font-bold mb-6">Why Display Your SafeScore?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="text-2xl">🛡️</div>
                <div>
                  <h3 className="font-semibold">Show Your Assessment</h3>
                  <p className="text-sm text-base-content/70">Display SafeScoring&apos;s independent editorial evaluation of your product.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-2xl">📈</div>
                <div>
                  <h3 className="font-semibold">Increase Conversions</h3>
                  <p className="text-sm text-base-content/70">Show your SafeScoring evaluation to your users.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-2xl">🔄</div>
                <div>
                  <h3 className="font-semibold">Always Up-to-Date</h3>
                  <p className="text-sm text-base-content/70">The badge automatically updates when your score changes.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-2xl">🆓</div>
                <div>
                  <h3 className="font-semibold">Free Forever</h3>
                  <p className="text-sm text-base-content/70">No cost to display your SafeScore badge on your website.</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <p className="text-base-content/60 mb-4">
              Don&apos;t see your product? Get it evaluated.
            </p>
            <Link href="/submit" className="btn btn-primary">
              Submit Your Product
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
