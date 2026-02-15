"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import ButtonSignin from "./ButtonSignin";
import config from "@/config";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

// Throttle function for scroll performance
const useThrottle = (callback, delay) => {
  const lastCall = useRef(0);
  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      callback(...args);
    }
  }, [callback, delay]);
};

// Navigation data — keys resolve via t()
const topLinkDefs = [
  { href: "/dashboard/setups", labelKey: "nav.mySetups", highlight: true },
  { href: "/#pricing", labelKey: "nav.pricing" },
];

const dropdownDefs = [
  {
    labelKey: "nav.explore",
    items: [
      { href: "/products", labelKey: "nav.products", descKey: "nav.productsDesc" },
      { href: "/compare", labelKey: "nav.compare", descKey: "nav.compareDesc" },
      { href: "/leaderboard", labelKey: "nav.leaderboard", descKey: "nav.leaderboardDesc" },
      { href: "/hacks", labelKey: "nav.hacks", descKey: "nav.hacksDesc" },
    ],
  },
  {
    labelKey: "nav.resources",
    items: [
      { href: "/methodology", labelKey: "nav.methodology", descKey: "nav.methodologyDesc" },
      { href: "/transparency", labelKey: "nav.transparency", descKey: "nav.transparencyDesc" },
      { href: "/blog", labelKey: "nav.blog", descKey: "nav.blogDesc" },
      { href: "/badge", labelKey: "nav.badge", descKey: "nav.badgeDesc" },
    ],
  },
];

const mobileLinkDefs = [
  { href: "/dashboard/setups", labelKey: "nav.mySetups", highlight: true },
  { href: "/products", labelKey: "nav.products" },
  { href: "/compare", labelKey: "nav.compare" },
  { href: "/leaderboard", labelKey: "nav.leaderboard" },
  { href: "/hacks", labelKey: "nav.hacks" },
  { href: "/methodology", labelKey: "nav.methodology" },
  { href: "/transparency", labelKey: "nav.transparency" },
  { href: "/blog", labelKey: "nav.blog" },
  { href: "/badge", labelKey: "nav.badge" },
  { href: "/#pricing", labelKey: "nav.pricing" },
];

const DropdownMenu = ({ dropdown, pathname, t }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm font-medium text-base-content/70 hover:text-base-content transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {t(dropdown.labelKey)}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-base-100 border border-base-300 rounded-xl shadow-xl p-2 z-50">
          {dropdown.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2.5 rounded-lg hover:bg-base-200 transition-colors"
              onClick={() => setOpen(false)}
            >
              <div className="text-sm font-medium">{t(item.labelKey)}</div>
              <div className="text-xs text-base-content/50">{t(item.descKey)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const Header = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState("dark");
  const { t, locale, setLocale } = useTranslation();

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Throttled scroll handler for better performance (16ms = ~60fps)
  const handleScroll = useThrottle(() => {
    setScrolled(window.scrollY > 20);
  }, 16);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const nextLocale = locale === "en" ? "fr" : "en";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 safe-top ${
        scrolled ? "bg-base-100/80 backdrop-blur-lg shadow-lg" : "bg-transparent"
      }`}
    >
      <nav
        className="container flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 mx-auto max-w-7xl"
        aria-label="Global"
      >
        {/* Logo */}
        <div className="flex lg:flex-1">
          <Link
            className="flex items-center gap-3 shrink-0 group"
            href="/"
            title={`${config.appName} homepage`}
          >
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-amber-500 to-purple-500 rounded-lg opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0.5 bg-base-100 rounded-[6px] flex items-center justify-center">
                <span className="text-lg font-black text-gradient-safe">S</span>
              </div>
            </div>
            <span className="font-bold text-xl tracking-tight">
              <span className="text-gradient">Safe</span>
              <span className="text-base-content">Scoring</span>
            </span>
          </Link>
        </div>

        {/* Mobile burger */}
        <div className="flex lg:hidden">
          <button
            type="button"
            className="p-2.5 rounded-lg hover:bg-base-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setIsOpen(true)}
          >
            <span className="sr-only">{t("nav.openMenu")}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
        </div>

        {/* Desktop links */}
        <div className="hidden lg:flex lg:justify-center lg:gap-6 lg:items-center">
          {topLinkDefs.map((link) =>
            link.highlight ? (
              <Link
                href={link.href}
                key={link.href}
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {t(link.labelKey)}
              </Link>
            ) : null
          )}

          {dropdownDefs.map((dropdown) => (
            <DropdownMenu key={dropdown.labelKey} dropdown={dropdown} pathname={pathname} t={t} />
          ))}

          {topLinkDefs.map((link) =>
            !link.highlight ? (
              <Link
                href={link.href}
                key={link.href}
                className="text-sm font-medium text-base-content/70 hover:text-base-content transition-colors"
              >
                {t(link.labelKey)}
              </Link>
            ) : null
          )}
        </div>

        {/* Desktop CTA */}
        <div className="hidden lg:flex lg:justify-end lg:flex-1 lg:gap-4 lg:items-center">
          <button
            onClick={() => setLocale(nextLocale)}
            className="btn btn-ghost btn-sm btn-square text-xs font-bold uppercase"
            aria-label={nextLocale === "fr" ? "Passer en Français" : "Switch to English"}
            title={nextLocale === "fr" ? "Passer en Français" : "Switch to English"}
          >
            {nextLocale.toUpperCase()}
          </button>
          <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-sm btn-square"
            aria-label={t("nav.toggleTheme")}
          >
            {theme === "dark" ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>
          <ButtonSignin text={t("nav.signIn")} extraStyle="btn-ghost btn-sm" />
          <Link href="/dashboard/setups" className="btn btn-primary btn-sm">
            {t("nav.getStarted")}
          </Link>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`relative z-50 ${isOpen ? "" : "hidden"}`}>
        <div
          className="fixed inset-0 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
        <div className="fixed inset-y-0 right-0 z-10 w-full max-w-sm px-6 py-4 bg-base-100 shadow-xl overflow-y-auto">
          <div className="flex items-center justify-between">
            <Link
              className="flex items-center gap-3"
              href="/"
              onClick={() => setIsOpen(false)}
            >
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-amber-500 to-purple-500 rounded-lg opacity-80" />
                <div className="absolute inset-0.5 bg-base-100 rounded-[5px] flex items-center justify-center">
                  <span className="text-sm font-black text-gradient-safe">S</span>
                </div>
              </div>
              <span className="font-bold text-lg">SafeScoring</span>
            </Link>
            <button
              type="button"
              className="p-2.5 rounded-lg hover:bg-base-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
              onClick={() => setIsOpen(false)}
            >
              <span className="sr-only">{t("nav.closeMenu")}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="mt-8 flex flex-col gap-1">
            {mobileLinkDefs.map((link) => (
              <Link
                href={link.href}
                key={link.href}
                className={`text-base font-medium py-2.5 px-3 rounded-lg transition-colors min-h-[44px] flex items-center ${
                  link.highlight
                    ? "text-primary bg-primary/10"
                    : pathname === link.href
                      ? "text-base-content bg-base-200"
                      : "text-base-content/80 hover:bg-base-200 hover:text-base-content"
                }`}
                onClick={() => setIsOpen(false)}
              >
                {t(link.labelKey)}
              </Link>
            ))}
            <div className="divider my-2" />
            <button
              onClick={() => setLocale(nextLocale)}
              className="btn btn-ghost w-full justify-start gap-3 min-h-[44px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
              </svg>
              {locale === "en" ? "Français" : "English"}
            </button>
            <button
              onClick={toggleTheme}
              className="btn btn-ghost w-full justify-start gap-3 min-h-[44px]"
            >
              {theme === "dark" ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
              {t("nav.lightMode")}/{t("nav.darkMode")}
            </button>
            <div className="divider my-2" />
            <ButtonSignin text={t("nav.signIn")} extraStyle="btn-ghost w-full min-h-[44px]" />
            <Link
              href="/dashboard/setups"
              className="btn btn-primary w-full min-h-[44px]"
              onClick={() => setIsOpen(false)}
            >
              {t("nav.getStartedFree")}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
