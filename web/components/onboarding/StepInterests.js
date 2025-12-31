"use client";

import { useState } from "react";

const INTEREST_CATEGORIES = [
  {
    id: "hardware_wallets",
    title: "Hardware Wallets",
    description: "Ledger, Trezor, etc.",
    icon: "shield",
  },
  {
    id: "software_wallets",
    title: "Software Wallets",
    description: "MetaMask, Trust Wallet, etc.",
    icon: "device",
  },
  {
    id: "exchanges",
    title: "Exchanges",
    description: "Centralized trading platforms",
    icon: "exchange",
  },
  {
    id: "defi",
    title: "DeFi Protocols",
    description: "Uniswap, Aave, etc.",
    icon: "cube",
  },
  {
    id: "cards",
    title: "Crypto Cards",
    description: "Payment cards with crypto",
    icon: "card",
  },
  {
    id: "custody",
    title: "Custody Solutions",
    description: "Institutional custody",
    icon: "lock",
  },
];

const ICONS = {
  shield: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  device: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  ),
  exchange: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
  cube: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  ),
  card: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  ),
  lock: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
};

export default function StepInterests({ data, onNext, onBack, saving }) {
  const [selected, setSelected] = useState(data.interests || []);

  const toggleInterest = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    onNext({ interests: selected });
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">What products interest you?</h2>
        <p className="text-base-content/60">
          Select all that apply. You can change this later.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        {INTEREST_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => toggleInterest(category.id)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              selected.includes(category.id)
                ? "border-primary bg-primary/10"
                : "border-base-300 hover:border-base-content/20"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`p-1.5 rounded-lg ${
                  selected.includes(category.id)
                    ? "bg-primary text-primary-content"
                    : "bg-base-300 text-base-content"
                }`}
              >
                {ICONS[category.icon]}
              </div>
              {selected.includes(category.id) && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-primary ml-auto">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="font-medium text-sm">{category.title}</div>
            <div className="text-xs text-base-content/50">{category.description}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn btn-ghost">
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="btn btn-primary flex-1"
        >
          {saving ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : selected.length === 0 ? (
            "Skip for now"
          ) : (
            "Continue"
          )}
        </button>
      </div>
    </div>
  );
}
