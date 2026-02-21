"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Dialog, Transition } from "@headlessui/react";
import ButtonSignin from "./ButtonSignin";
import GlobalSearch from "./GlobalSearch";
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
  { href: "/dashboard/setups", label: "My Stack", highlight: true },
  { href: "/products", label: "Products" },
  { href: "/transparency", label: "Scores" },
  { href: "/methodology", label: "Methodology" },
  { href: "/#pricing", label: "Pricing" },
];

const Header = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

        {/* Desktop: Search + CTA */}
        <div className="hidden lg:flex lg:justify-end lg:flex-1 lg:gap-3 lg:items-center">
          <GlobalSearch />
          <ButtonSignin text="Sign In" extraStyle="btn-ghost btn-sm" />
          <Link href="/dashboard/setups" className="btn btn-primary btn-sm">
            Get Started
          </Link>
        </div>

        {/* Mobile: Search + Burger */}
        <div className="flex lg:hidden items-center gap-1">
          <GlobalSearch />
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
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu — headlessui Dialog for proper focus trap + accessibility */}
      <Transition show={isOpen} as={Fragment}>
        <Dialog onClose={() => setIsOpen(false)} className="relative z-50">
          {/* Backdrop */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
          </Transition.Child>

          {/* Slide-in panel */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="ease-in duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <Dialog.Panel className="fixed inset-y-0 right-0 z-10 w-full max-w-sm px-6 py-4 bg-base-100 shadow-xl">
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
                    aria-hidden="true"
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
            </Dialog.Panel>
          </Transition.Child>
        </Dialog>
      </Transition>
    </header>
  );
};

export default Header;
