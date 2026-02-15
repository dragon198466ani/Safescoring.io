"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

export default function BadgePage() {
  const { t } = useTranslation();
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
              {t("badgePage.title")}
            </h1>
            <p className="text-base-content/60 max-w-2xl mx-auto">
              {t("badgePage.description")}
            </p>
          </div>

          {/* Badge Preview */}
          <div className="rounded-xl bg-base-200 border border-base-300 p-8 mb-8">
            <h2 className="text-xl font-bold mb-6">{t("badgePage.preview")}</h2>

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
                <label className="block text-sm font-medium mb-2">{t("badgePage.productSlugLabel")}</label>
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
                <label className="block text-sm font-medium mb-2">{t("badgePage.styleLabel")}</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="rounded">{t("badgePage.styleRounded")}</option>
                  <option value="flat">{t("badgePage.styleFlat")}</option>
                  <option value="minimal">{t("badgePage.styleMinimal")}</option>
                </select>
              </div>

              {/* Theme */}
              <div>
                <label className="block text-sm font-medium mb-2">{t("badgePage.themeLabel")}</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="dark">{t("badgePage.themeDark")}</option>
                  <option value="light">{t("badgePage.themeLight")}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Embed codes */}
          <div className="rounded-xl bg-base-200 border border-base-300 p-8 mb-8">
            <h2 className="text-xl font-bold mb-6">{t("badgePage.embedCode")}</h2>

            {/* HTML */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">{t("badgePage.htmlLabel")}</label>
                <button
                  onClick={() => copyToClipboard(htmlCode, 'html')}
                  className="btn btn-xs btn-ghost"
                >
                  {copied === 'html' ? `✓ ${t("badgePage.copied")}` : t("badgePage.copy")}
                </button>
              </div>
              <pre className="bg-base-300 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{htmlCode}</code>
              </pre>
            </div>

            {/* Markdown */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">{t("badgePage.markdownLabel")}</label>
                <button
                  onClick={() => copyToClipboard(markdownCode, 'markdown')}
                  className="btn btn-xs btn-ghost"
                >
                  {copied === 'markdown' ? `✓ ${t("badgePage.copied")}` : t("badgePage.copy")}
                </button>
              </div>
              <pre className="bg-base-300 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{markdownCode}</code>
              </pre>
            </div>
          </div>

          {/* Benefits */}
          <div className="rounded-xl bg-gradient-to-br from-primary/20 to-base-200 border border-base-300 p-8 mb-8">
            <h2 className="text-xl font-bold mb-6">{t("badgePage.whyAddBadge")}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="text-2xl">🛡️</div>
                <div>
                  <h3 className="font-semibold">{t("badgePage.buildTrust")}</h3>
                  <p className="text-sm text-base-content/70">{t("badgePage.buildTrustDesc")}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-2xl">📈</div>
                <div>
                  <h3 className="font-semibold">{t("badgePage.increaseConversions")}</h3>
                  <p className="text-sm text-base-content/70">{t("badgePage.increaseConversionsDesc")}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-2xl">🔄</div>
                <div>
                  <h3 className="font-semibold">{t("badgePage.alwaysUpToDate")}</h3>
                  <p className="text-sm text-base-content/70">{t("badgePage.alwaysUpToDateDesc")}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-2xl">🆓</div>
                <div>
                  <h3 className="font-semibold">{t("badgePage.freeForever")}</h3>
                  <p className="text-sm text-base-content/70">{t("badgePage.freeForeverDesc")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <p className="text-base-content/60 mb-4">
              {t("badgePage.ctaText")}
            </p>
            <Link href="/submit" className="btn btn-primary">
              {t("badgePage.ctaButton")}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
