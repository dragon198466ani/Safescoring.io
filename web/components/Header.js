"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import ButtonSignin from "./ButtonSignin";
import CryptoGlossary from "./CryptoGlossary";
import config from "@/config";

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

const links = [
  { href: "/products", label: "Products" },
  { href: "/community", label: "Community" },
  { href: "/methodology", label: "Methodology" },
  { href: "/api-docs", label: "API" },
  { href: "/#pricing", label: "Pricing" },
];

const Header = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);

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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-base-100/95 backdrop-blur-lg shadow-lg" : "bg-transparent"
      }`}
    >
      <nav
        className="container flex items-center justify-between px-6 py-4 mx-auto max-w-7xl"
        aria-label="Global"
      >
        {/* Logo */}
        <div className="flex lg:flex-1">
          <Link
            className="flex items-center gap-3 shrink-0 group"
            href="/"
            title={`${config.appName} homepage`}
          >
            {/* SAFE Logo — minimal B&W */}
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-lg font-black text-black">S</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              SafeScoring
            </span>
          </Link>
        </div>

        {/* Mobile burger */}
        <div className="flex lg:hidden">
          <button
            type="button"
            className="p-2.5 rounded-lg hover:bg-base-200 transition-colors"
            onClick={() => setIsOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
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
        <div className="hidden lg:flex lg:justify-center lg:gap-8 lg:items-center">
          {links.map((link) => (
            <Link
              href={link.href}
              key={link.href}
              className={`text-sm font-medium transition-colors ${
                link.highlight
                  ? "text-white hover:text-white/80"
                  : "text-base-content/70 hover:text-base-content"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden lg:flex lg:justify-end lg:flex-1 lg:gap-4 lg:items-center">
          <button
            onClick={() => setGlossaryOpen(true)}
            className="btn btn-ghost btn-sm btn-circle text-base-content/60 hover:text-base-content"
            aria-label="Open crypto glossary"
            title="Crypto Glossary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </button>
          <ButtonSignin text="Sign In" extraStyle="btn-ghost btn-sm" />
          <Link href="/dashboard/setups" className="btn btn-primary btn-sm">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`relative z-50 ${isOpen ? "" : "hidden"}`}>
        <div
          className="fixed inset-0 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
        <div className="fixed inset-y-0 right-0 z-10 w-full max-w-sm px-6 py-4 bg-base-100 shadow-xl">
          <div className="flex items-center justify-between">
            <Link
              className="flex items-center gap-3"
              href="/"
              onClick={() => setIsOpen(false)}
            >
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-sm font-black text-black">S</span>
              </div>
              <span className="font-bold text-lg">SafeScoring</span>
            </Link>
            <button
              type="button"
              className="p-2.5 rounded-lg hover:bg-base-200"
              onClick={() => setIsOpen(false)}
            >
              <span className="sr-only">Close menu</span>
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

          <div className="mt-8 flex flex-col gap-4">
            {links.map((link) => (
              <Link
                href={link.href}
                key={link.href}
                className={`text-lg font-medium py-2 transition-colors ${
                  link.highlight ? "text-white" : "hover:text-white"
                }`}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => { setGlossaryOpen(true); setIsOpen(false); }}
              className="flex items-center gap-3 text-lg font-medium py-2 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
              Crypto Glossary
            </button>
            <div className="divider" />
            <ButtonSignin text="Sign In" extraStyle="btn-ghost w-full" />
            <Link
              href="/dashboard/setups"
              className="btn btn-primary w-full"
              onClick={() => setIsOpen(false)}
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </div>

      {/* Crypto Glossary Sidebar */}
      <CryptoGlossary
        isOpen={glossaryOpen}
        onClose={() => setGlossaryOpen(false)}
      />
    </header>
  );
};

export default Header;
