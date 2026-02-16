"use client";

import Link from "next/link";
import config from "@/config";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

const Footer = () => {
  const { t } = useTranslation();

  const footerLinks = {
    product: [
      { label: t("footer.products"), href: "/products" },
      { label: t("footer.scoreTransparency"), href: "/transparency" },
      { label: t("footer.methodology"), href: "/methodology" },
      { label: t("footer.api"), href: "/api-docs" },
    ],
    company: [
      { label: t("footer.about"), href: "/about" },
      { label: t("footer.blog"), href: "/blog" },
      { label: t("footer.pressKit"), href: "/press" },
      { label: t("footer.partners"), href: "/partners" },
    ],
    legal: [
      { label: t("footer.legalNotice"), href: "/legal" },
      { label: t("footer.privacyPolicy"), href: "/privacy-policy" },
      { label: t("footer.termsOfService"), href: "/tos" },
      { label: t("footer.cookiePolicy"), href: "/cookies" },
    ],
  };

  return (
    <footer className="bg-base-200 border-t border-base-300">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-amber-500 to-purple-500 rounded-lg opacity-80" />
                <div className="absolute inset-0.5 bg-base-200 rounded-[6px] flex items-center justify-center">
                  <span className="text-lg font-black text-gradient-safe">S</span>
                </div>
              </div>
              <span className="font-bold text-xl">SafeScoring</span>
            </Link>
            <p className="text-base-content/60 mb-6 max-w-sm">
              {t("footer.description")}
            </p>
            {/* Social links */}
            <div className="flex items-center gap-4">
              <a
                href="https://twitter.com/safescoring"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-base-300/50 hover:bg-base-300 transition-colors"
                aria-label="Twitter"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://github.com/safescoring"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-base-300/50 hover:bg-base-300 transition-colors"
                aria-label="GitHub"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              </a>
              <a
                href="https://discord.gg/safescoring"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-base-300/50 hover:bg-base-300 transition-colors"
                aria-label="Discord"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h3 className="font-semibold mb-4">{t("footer.product")}</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-base-content/60 hover:text-base-content transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h3 className="font-semibold mb-4">{t("footer.company")}</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-base-content/60 hover:text-base-content transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="font-semibold mb-4">{t("footer.legal")}</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-base-content/60 hover:text-base-content transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-12 p-4 bg-base-300/30 rounded-lg border border-base-300">
          <p className="text-xs text-base-content/50 text-center">
            <strong>{t("footer.disclaimer")}:</strong> {t("footer.disclaimerText")}
          </p>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-8 border-t border-base-300 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-base-content/50">
            {new Date().getFullYear()} {config.appName}. {t("footer.allRightsReserved")}.
          </p>
          <div className="flex items-center gap-2 text-sm text-base-content/50">
            <span>{t("footer.madeWith")}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 text-red-500"
            >
              <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
            </svg>
            <span>{t("footer.forCryptoSecurity")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
