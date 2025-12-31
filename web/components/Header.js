"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import ButtonSignin from "./ButtonSignin";
import config from "@/config";

const links = [
  { href: "/dashboard/setups", label: "My Stack", highlight: true },
  { href: "/products", label: "Products" },
  { href: "/#why-audits", label: "Why SafeScoring" },
  { href: "/#pillars", label: "Methodology" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

const Header = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-base-100/80 backdrop-blur-lg shadow-lg" : "bg-transparent"
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
            {/* SAFE Logo */}
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
                  ? "text-primary hover:text-primary/80"
                  : "text-base-content/70 hover:text-base-content"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden lg:flex lg:justify-end lg:flex-1 lg:gap-4">
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
                  link.highlight ? "text-primary" : "hover:text-primary"
                }`}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
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
    </header>
  );
};

export default Header;
