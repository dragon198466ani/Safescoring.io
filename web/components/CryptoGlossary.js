"use client";

import { useState, useMemo } from "react";

/**
 * CryptoGlossary - Beginner-friendly glossary of crypto security terms
 *
 * Accessible from the Header via a "?" button.
 * Helps newcomers understand crypto jargon used across the app.
 */

const GLOSSARY = [
  {
    term: "Hardware Wallet",
    definition:
      "A physical device (like a USB key) that stores your crypto keys offline. Much harder to hack than software because it's not connected to the internet.",
    example: "Ledger, Trezor, Coldcard",
    category: "products",
  },
  {
    term: "Software Wallet",
    definition:
      "An app on your phone or computer that stores your crypto keys. More convenient than hardware wallets, but connected to the internet.",
    example: "MetaMask, Trust Wallet, Phantom",
    category: "products",
  },
  {
    term: "Exchange (CEX)",
    definition:
      "A centralized platform where you buy, sell, and trade crypto. They hold your funds for you (custodial). CEX = Centralized Exchange.",
    example: "Coinbase, Binance, Kraken",
    category: "products",
  },
  {
    term: "DeFi",
    definition:
      "Decentralized Finance. Financial services (lending, trading, earning interest) that run on blockchain smart contracts instead of through banks or companies.",
    example: "Aave, Uniswap, Compound",
    category: "products",
  },
  {
    term: "SAFE Score",
    definition:
      "SafeScoring's 0-100 editorial rating for crypto products. Combines 4 pillars: Security, Adversity, Fidelity, and Efficiency. Higher = higher-rated by our methodology.",
    category: "scoring",
  },
  {
    term: "Security (S)",
    definition:
      "The S in SAFE. Evaluates encryption strength, key management, and cryptographic standards based on our methodology.",
    category: "scoring",
  },
  {
    term: "Adversity (A)",
    definition:
      "The A in SAFE. Evaluates resistance to physical threats and coercion based on our methodology.",
    category: "scoring",
  },
  {
    term: "Fidelity (F)",
    definition:
      "The F in SAFE. Evaluates reliability and track record over time based on our methodology.",
    category: "scoring",
  },
  {
    term: "Efficiency (E)",
    definition:
      "The E in SAFE. Evaluates usability and error prevention based on our methodology.",
    category: "scoring",
  },
  {
    term: "Stack",
    definition:
      "Your personal combination of crypto products (wallets, exchanges, DeFi apps). SafeScoring evaluates your stack's security posture based on our methodology.",
    category: "safescoring",
  },
  {
    term: "Private Key",
    definition:
      "A secret code that proves you own your crypto. Whoever has your private key controls your funds. Never share it with anyone.",
    category: "fundamentals",
  },
  {
    term: "Seed Phrase",
    definition:
      "A set of 12 or 24 words that backs up your wallet. If you lose your device, the seed phrase recovers your crypto. Store it offline and never digitally.",
    category: "fundamentals",
  },
  {
    term: "Cold Storage",
    definition:
      "Keeping your crypto keys completely offline (on a hardware wallet or paper). Generally considered one of the more secure approaches for storing large amounts long-term.",
    category: "fundamentals",
  },
  {
    term: "Smart Contract",
    definition:
      "A program that runs on a blockchain and executes automatically. DeFi apps are built with smart contracts. Bugs in them can lead to hacks.",
    category: "fundamentals",
  },
  {
    term: "Custody",
    definition:
      "Who holds your crypto keys. Self-custody = you hold them (wallet). Custodial = a company holds them for you (exchange).",
    category: "fundamentals",
  },
  {
    term: "Audit",
    definition:
      "A third-party security review of a product's code. Important, but represents a point-in-time assessment. SafeScoring complements audits with ongoing evaluation based on our methodology.",
    category: "fundamentals",
  },
];

const CATEGORIES = {
  all: "All",
  scoring: "SAFE Scoring",
  products: "Product Types",
  fundamentals: "Crypto Basics",
  safescoring: "SafeScoring",
};

export default function CryptoGlossary({ isOpen, onClose }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = useMemo(() => {
    return GLOSSARY.filter((item) => {
      const matchesSearch =
        !search ||
        item.term.toLowerCase().includes(search.toLowerCase()) ||
        item.definition.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        activeCategory === "all" || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sidebar */}
      <div
        className="relative w-full max-w-md bg-base-100 border-l border-base-300 overflow-y-auto animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-base-100/95 backdrop-blur-lg border-b border-base-300 p-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold">Crypto Glossary</h2>
              <p className="text-xs text-base-content/50">
                {GLOSSARY.length} terms to help you get started
              </p>
            </div>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Close glossary"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search terms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-bordered input-sm w-full mb-3"
          />

          {/* Category tabs */}
          <div className="flex gap-1 flex-wrap">
            {Object.entries(CATEGORIES).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeCategory === key
                    ? "bg-primary text-primary-content"
                    : "bg-base-200 text-base-content/60 hover:text-base-content"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Terms list */}
        <div className="p-4 space-y-3">
          {filtered.map((item) => (
            <div
              key={item.term}
              className="p-3 rounded-xl bg-base-200 border border-base-300"
            >
              <h3 className="font-semibold text-sm mb-1">{item.term}</h3>
              <p className="text-sm text-base-content/70 leading-relaxed">
                {item.definition}
              </p>
              {item.example && (
                <p className="text-xs text-base-content/50 mt-1.5">
                  Examples: {item.example}
                </p>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-8 text-base-content/50">
              <p className="text-sm">No terms match your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
