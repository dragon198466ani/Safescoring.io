"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/common/Modal";

/**
 * Donation configuration - Update these with your actual addresses
 * TODO: Move to environment variables or config for production
 */
const DONATION_CONFIG = {
  // Crypto addresses
  crypto: {
    btc: {
      address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", // TODO: Replace with your BTC address
      label: "Bitcoin (BTC)",
      icon: "btc",
    },
    eth: {
      address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD05", // TODO: Replace with your ETH/ERC-20 address
      label: "Ethereum (ETH)",
      icon: "eth",
    },
  },
  // Fiat donation link
  fiat: {
    url: "https://buymeacoffee.com/safescoring", // TODO: Replace with your Buy Me a Coffee/Ko-fi link
    label: "Buy Coffee to the Team",
    icon: "coffee",
  },
  // Suggested amounts (based on industry benchmarks)
  suggestedAmounts: [
    { amount: "$5", label: "Cafe" },
    { amount: "$15", label: "Supporter" },
    { amount: "$50", label: "Pro" },
    { amount: "$100", label: "Sponsor" },
  ],
  // Default milestones (fallback if API fails)
  defaultMilestones: [
    { goal: 5000, label: "Serveurs dedies", icon: "server", unlocked: false },
    { goal: 15000, label: "API publique", icon: "code", unlocked: false },
    { goal: 30000, label: "App mobile", icon: "mobile", unlocked: false },
    { goal: 50000, label: "Audit externe", icon: "shield", unlocked: false },
  ],
  // Default values (fallback if API fails)
  defaultAmount: 0,
  defaultSupporters: 0,
};

/**
 * Hook to fetch live donation stats from API
 */
function useDonationStats() {
  const [stats, setStats] = useState({
    currentAmount: DONATION_CONFIG.defaultAmount,
    supportersCount: DONATION_CONFIG.defaultSupporters,
    milestones: DONATION_CONFIG.defaultMilestones,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/donations", {
          next: { revalidate: 300 }, // Cache 5 min
        });

        if (!response.ok) throw new Error("Failed to fetch donation stats");

        const { data } = await response.json();

        setStats({
          currentAmount: data.currentAmount || DONATION_CONFIG.defaultAmount,
          supportersCount: data.supportersCount || DONATION_CONFIG.defaultSupporters,
          milestones: data.milestones || DONATION_CONFIG.defaultMilestones,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching donation stats:", error);
        setStats((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message,
        }));
      }
    }

    fetchStats();
  }, []);

  return stats;
}

// Simple QR Code component using Google Charts API
const QRCode = ({ value, size = 150 }) => {
  const [qrUrl, setQrUrl] = useState(null);

  useEffect(() => {
    if (!value) return;
    const encodedValue = encodeURIComponent(value);
    setQrUrl(
      `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodedValue}&choe=UTF-8&chld=H|2`
    );
  }, [value, size]);

  if (!qrUrl) {
    return (
      <div
        className="bg-base-300 rounded-lg flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="loading loading-spinner loading-sm"></span>
      </div>
    );
  }

  return (
    <div className="bg-white p-2 rounded-lg inline-block">
      <img
        src={qrUrl}
        alt="QR Code"
        width={size}
        height={size}
        className="block"
      />
    </div>
  );
};

// Copy button component
const CopyButton = ({ text, label }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="btn btn-sm btn-ghost gap-1"
      title={`Copier ${label}`}
    >
      {copied ? (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 text-success"
          >
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-success">Copie !</span>
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
            />
          </svg>
          <span>Copier</span>
        </>
      )}
    </button>
  );
};

// Crypto icons
const CryptoIcon = ({ type, className = "w-6 h-6" }) => {
  if (type === "btc") {
    return (
      <svg className={className} viewBox="0 0 32 32" fill="currentColor">
        <path
          fill="#F7931A"
          d="M15.999 0c8.837 0 16 7.163 16 16s-7.163 16-16 16-16-7.163-16-16 7.163-16 16-16z"
        />
        <path
          fill="#FFF"
          d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.745-.17-1.104-.26l.002-.01-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.046-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.314-1.256-.314l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.709-2.841c.472.127.93.245 1.378.357l-.706 2.828 1.728.431.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.148.986-5.32.695l.95-3.805c1.172.292 4.929.872 4.37 3.11zm.535-5.569c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.696 3.61 2.733z"
        />
      </svg>
    );
  }

  if (type === "eth") {
    return (
      <svg className={className} viewBox="0 0 32 32" fill="currentColor">
        <circle fill="#627EEA" cx="16" cy="16" r="16" />
        <path fill="#FFF" fillOpacity=".6" d="M16.498 4v8.87l7.497 3.35z" />
        <path fill="#FFF" d="M16.498 4L9 16.22l7.498-3.35z" />
        <path fill="#FFF" fillOpacity=".6" d="M16.498 21.968v6.027L24 17.616z" />
        <path fill="#FFF" d="M16.498 27.995v-6.028L9 17.616z" />
        <path fill="#FFF" fillOpacity=".2" d="M16.498 20.573l7.497-4.353-7.497-3.348z" />
        <path fill="#FFF" fillOpacity=".6" d="M9 16.22l7.498 4.353v-7.701z" />
      </svg>
    );
  }

  return null;
};

// Milestone icon component
const MilestoneIcon = ({ type, className = "w-4 h-4" }) => {
  const icons = {
    server: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
      </svg>
    ),
    code: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    mobile: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    shield: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  };
  return icons[type] || null;
};

// Milestone progress component
const MilestoneProgress = ({ currentAmount, supportersCount, milestones, isLoading }) => {
  // Find the next milestone
  const nextMilestone = milestones.find((m) => currentAmount < m.goal) || milestones[milestones.length - 1];
  const prevMilestone = milestones.filter((m) => currentAmount >= m.goal).pop();

  // Show skeleton loader while loading
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl p-4 mb-4 border border-primary/10 animate-pulse">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="w-20 h-6 bg-base-300 rounded"></div>
          </div>
          <div className="w-16 h-6 bg-base-300 rounded"></div>
        </div>
        <div className="w-full bg-base-300 rounded-full h-2.5 mb-3"></div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-base-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate progress percentage toward next milestone
  const prevGoal = prevMilestone?.goal || 0;
  const progressInCurrentTier = currentAmount - prevGoal;
  const tierSize = nextMilestone.goal - prevGoal;
  const progressPercent = Math.min((progressInCurrentTier / tierSize) * 100, 100);

  // Calculate how much more is needed
  const amountNeeded = nextMilestone.goal - currentAmount;

  return (
    <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl p-4 mb-4 border border-primary/10">
      {/* Stats */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {[...Array(Math.min(3, supportersCount))].map((_, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-primary/20 border-2 border-base-100 flex items-center justify-center"
              >
                <span className="text-[10px] text-primary font-bold">
                  {String.fromCharCode(65 + i)}
                </span>
              </div>
            ))}
            {supportersCount > 3 && (
              <div className="w-6 h-6 rounded-full bg-base-300 border-2 border-base-100 flex items-center justify-center">
                <span className="text-[10px] font-bold">+{supportersCount - 3}</span>
              </div>
            )}
          </div>
          <span className="text-sm font-medium">{supportersCount} supporters</span>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-primary">${currentAmount.toLocaleString()}</span>
          <span className="text-xs text-base-content/50 block">collectes</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-base-content/60">Prochain palier : {nextMilestone.label}</span>
          <span className="font-medium">${amountNeeded.toLocaleString()} restants</span>
        </div>
        <div className="w-full bg-base-300 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-primary to-secondary h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Milestones list */}
      <div className="grid grid-cols-2 gap-2">
        {milestones.map((milestone, index) => {
          const isUnlocked = currentAmount >= milestone.goal;
          const isCurrent = milestone === nextMilestone;
          return (
            <div
              key={index}
              className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-all ${
                isUnlocked
                  ? "bg-success/10 text-success"
                  : isCurrent
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-base-200/50 text-base-content/50"
              }`}
            >
              {isUnlocked ? (
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <MilestoneIcon type={milestone.icon} className="w-4 h-4 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{milestone.label}</div>
                <div className="text-[10px] opacity-70">${milestone.goal.toLocaleString()}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * DonationModal - Modal to request support before download
 *
 * @param {boolean} isOpen - Modal visibility
 * @param {function} onClose - Close handler
 * @param {function} onDownload - Download handler (called when user proceeds)
 * @param {string} productName - Product name for context
 */
export default function DonationModal({
  isOpen,
  onClose,
  onDownload,
  productName = "ce produit",
}) {
  const [selectedCrypto, setSelectedCrypto] = useState("btc");
  const [showCrypto, setShowCrypto] = useState(true);

  // Fetch live donation stats from API
  const { currentAmount, supportersCount, milestones, isLoading } = useDonationStats();

  const currentCrypto = DONATION_CONFIG.crypto[selectedCrypto];

  const handleDownloadAnyway = () => {
    onDownload();
    onClose();
  };

  const handleOpenFiat = () => {
    window.open(DONATION_CONFIG.fiat.url, "_blank", "noopener,noreferrer");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" showCloseButton={true}>
      <Modal.Body>
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6 text-primary shrink-0 mt-0.5"
          >
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
          <div>
            <h3 className="font-bold text-lg">Soutenez SafeScoring</h3>
            <p className="text-sm text-base-content/60 mt-1">
              Ce rapport est gratuit. Votre soutien nous aide a maintenir le
              service.
            </p>
          </div>
        </div>

        {/* Milestone Progress */}
        <MilestoneProgress
          currentAmount={currentAmount}
          supportersCount={supportersCount}
          milestones={milestones}
          isLoading={isLoading}
        />

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-4">
          <button
            className={`tab flex-1 gap-2 ${showCrypto ? "tab-active" : ""}`}
            onClick={() => setShowCrypto(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
              />
            </svg>
            Crypto
          </button>
          <button
            className={`tab flex-1 gap-2 ${!showCrypto ? "tab-active" : ""}`}
            onClick={() => setShowCrypto(false)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
              />
            </svg>
            Carte / PayPal
          </button>
        </div>

        {/* Content */}
        {showCrypto ? (
          <div className="space-y-4">
            {/* Crypto selector */}
            <div className="flex gap-2">
              {Object.entries(DONATION_CONFIG.crypto).map(([key, crypto]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCrypto(key)}
                  className={`btn btn-sm gap-2 flex-1 ${
                    selectedCrypto === key ? "btn-primary" : "btn-outline"
                  }`}
                >
                  <CryptoIcon type={key} className="w-5 h-5" />
                  {crypto.label.split(" ")[0]}
                </button>
              ))}
            </div>

            {/* QR Code and address */}
            <div className="bg-base-200 rounded-xl p-4">
              <div className="flex flex-col items-center gap-4">
                <QRCode value={currentCrypto.address} size={150} />

                <div className="w-full">
                  <label className="text-xs text-base-content/60 mb-1 block">
                    Adresse {currentCrypto.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-base-300 p-2 rounded overflow-x-auto whitespace-nowrap">
                      {currentCrypto.address}
                    </code>
                    <CopyButton
                      text={currentCrypto.address}
                      label={currentCrypto.label}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Suggested amounts */}
            <div className="space-y-2">
              <p className="text-xs text-base-content/60 text-center">Montants suggeres</p>
              <div className="flex flex-wrap justify-center gap-2">
                {DONATION_CONFIG.suggestedAmounts.map((tier, index) => (
                  <div
                    key={index}
                    className="badge badge-outline badge-lg gap-1 hover:badge-primary cursor-pointer transition-colors"
                  >
                    <span className="font-bold">{tier.amount}</span>
                    <span className="text-xs opacity-70">{tier.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Fiat options */}
            <div className="bg-base-200 rounded-xl p-6 text-center">
              <div className="mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-12 h-12 mx-auto text-primary mb-2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                  />
                </svg>
                <p className="text-base-content/70">
                  Offrez un cafe a l'equipe SafeScoring
                </p>
              </div>

              <button
                onClick={handleOpenFiat}
                className="btn btn-primary h-14 min-h-0 gap-2 touch-manipulation active:scale-[0.97] transition-transform"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                    clipRule="evenodd"
                  />
                </svg>
                Faire un don
              </button>

              <p className="text-xs text-base-content/50 mt-3">
                Paiement securise
              </p>
            </div>
          </div>
        )}

        {/* Footer note */}
        <p className="text-xs text-base-content/50 text-center mt-4">
          Merci de soutenir notre travail pour une crypto plus sure !
        </p>
      </Modal.Body>

      <Modal.Footer className="justify-center">
        <button
          onClick={handleDownloadAnyway}
          className="btn btn-ghost h-12 min-h-0 gap-2 touch-manipulation active:scale-[0.97] transition-transform"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          Telecharger quand meme
        </button>
      </Modal.Footer>
    </Modal>
  );
}
