"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const primaryLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/setups", label: "Setups" },
  { href: "/dashboard/favorites", label: "Favorites" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/account", label: "Account" },
];

const moreLinks = [
  { href: "/dashboard/corrections", label: "Corrections" },
  { href: "/dashboard/referrals", label: "Referrals" },
  { href: "/dashboard/api-keys", label: "API Keys" },
  { href: "/dashboard/webhooks", label: "Webhooks" },
  { href: "/products", label: "Products" },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  // Check if any "more" link is active
  const isMoreActive = moreLinks.some((link) => isActive(link.href));

  return (
    <nav className="hidden md:flex items-center gap-1 lg:gap-2" aria-label="Dashboard navigation">
      {primaryLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors min-h-[44px] flex items-center ${
            isActive(link.href)
              ? "text-primary bg-primary/10"
              : "text-base-content/70 hover:text-base-content hover:bg-base-200"
          }`}
        >
          {link.label}
        </Link>
      ))}

      {/* More dropdown */}
      <div className="relative" ref={moreRef}>
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors min-h-[44px] flex items-center gap-1 ${
            isMoreActive
              ? "text-primary bg-primary/10"
              : "text-base-content/70 hover:text-base-content hover:bg-base-200"
          }`}
          aria-expanded={moreOpen}
          aria-haspopup="true"
        >
          More
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {moreOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-base-100 border border-base-300 rounded-xl shadow-xl p-1.5 z-50">
            {moreLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center ${
                  isActive(link.href)
                    ? "text-primary bg-primary/10"
                    : "text-base-content/70 hover:text-base-content hover:bg-base-200"
                }`}
                onClick={() => setMoreOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
