"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getScoreColor } from "@/libs/design-tokens";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

/**
 * FeeComparator - Compare exchange fees across CEX
 * Shows spot trading fees, withdrawal fees, and deposit methods
 */
export default function FeeComparator({ variant = "default", className = "" }) {
  const { t } = useTranslation();
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("spot");
  const [sortBy, setSortBy] = useState("maker");
  const [sortDir, setSortDir] = useState("asc");
  const [selectedCoin, setSelectedCoin] = useState("USDT");

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    try {
      const res = await fetch("/api/crypto/fees");
      const data = await res.json();

      if (res.ok && data.exchanges) {
        setExchanges(data.exchanges);
        setError(null);
      } else {
        throw new Error(data.error || t("feeComparator.errors.fetchFailed"));
      }
    } catch (err) {
      setError(err?.message || t("feeComparator.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const sortedExchanges = [...exchanges].sort((a, b) => {
    let aVal, bVal;

    if (activeTab === "spot") {
      aVal = a.spot?.[sortBy] ?? 999;
      bVal = b.spot?.[sortBy] ?? 999;
    } else {
      aVal = a.withdrawal?.[selectedCoin]?.fee ?? 999;
      bVal = b.withdrawal?.[selectedCoin]?.fee ?? 999;
    }

    return sortDir === "asc" ? aVal - bVal : bVal - aVal;
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`w-4 h-4 inline ml-1 ${sortBy === field ? "text-primary" : "text-base-content/30"}`}
    >
      {sortDir === "asc" && sortBy === field ? (
        <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
      ) : (
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
      )}
    </svg>
  );

  if (loading) {
    return (
      <div className={`rounded-xl bg-base-200 border border-base-300 p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-base-300 rounded animate-pulse"></div>
          <span className="font-semibold">{t("feeComparator.loadingTitle")}</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-base-300 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-xl bg-base-200 border border-base-300 p-6 ${className}`}>
        <div className="flex items-center gap-2 text-error">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">{t("feeComparator.errors.loadFailed")}</span>
        </div>
      </div>
    );
  }

  // Compact variant for dashboard widget
  if (variant === "compact") {
    const topExchanges = [...exchanges]
      .sort((a, b) => (a.spot?.maker ?? 999) - (b.spot?.maker ?? 999))
      .slice(0, 5);

    return (
      <div className={`rounded-xl bg-base-200 border border-base-300 p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-400">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.798 7.45c.512-.67 1.135-.95 1.702-.95s1.19.28 1.702.95a.75.75 0 001.192-.91C12.637 5.55 11.596 5 10.5 5c-1.097 0-2.137.55-2.894 1.54A5.205 5.205 0 006.83 8.832a.75.75 0 00.66.668 16.32 16.32 0 003.847.192.75.75 0 00.638-.857 5.205 5.205 0 00-.775-2.384zm1.404 9.05c-.512.67-1.135.95-1.702.95s-1.19-.28-1.702-.95a.75.75 0 00-1.192.91c.757.99 1.798 1.54 2.894 1.54 1.097 0 2.137-.55 2.894-1.54a5.205 5.205 0 00.775-2.384.75.75 0 00-.638-.857 16.32 16.32 0 00-3.847.192.75.75 0 00-.66.668c.084.897.389 1.687.775 2.384z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold text-sm">{t("feeComparator.compact.title")}</span>
          </div>
          <Link href="/compare/fees" className="text-xs text-primary hover:underline">
            {t("feeComparator.compact.viewAll")}
          </Link>
        </div>

        <div className="space-y-2">
          {topExchanges.map((exchange, idx) => (
            <div
              key={exchange.id}
              className="flex items-center justify-between p-2 rounded-lg bg-base-300/50"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-base-content/50 w-4">#{idx + 1}</span>
                <span className="font-medium text-sm">{exchange.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">
                  <span className="text-base-content/60">{t("feeComparator.compact.makerShort")}:</span>{" "}
                  <span className="font-semibold">{exchange.spot?.maker}%</span>
                </span>
                <span className="text-sm">
                  <span className="text-base-content/60">{t("feeComparator.compact.takerShort")}:</span>{" "}
                  <span className="font-semibold">{exchange.spot?.taker}%</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className={`rounded-xl bg-base-200 border border-base-300 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-400">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.798 7.45c.512-.67 1.135-.95 1.702-.95s1.19.28 1.702.95a.75.75 0 001.192-.91C12.637 5.55 11.596 5 10.5 5c-1.097 0-2.137.55-2.894 1.54A5.205 5.205 0 006.83 8.832a.75.75 0 00.66.668 16.32 16.32 0 003.847.192.75.75 0 00.638-.857 5.205 5.205 0 00-.775-2.384zm1.404 9.05c-.512.67-1.135.95-1.702.95s-1.19-.28-1.702-.95a.75.75 0 00-1.192.91c.757.99 1.798 1.54 2.894 1.54 1.097 0 2.137-.55 2.894-1.54a5.205 5.205 0 00.775-2.384.75.75 0 00-.638-.857 16.32 16.32 0 00-3.847.192.75.75 0 00-.66.668c.084.897.389 1.687.775 2.384z" clipRule="evenodd" />
            </svg>
            <h2 className="font-semibold">{t("feeComparator.title")}</h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("spot")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "spot"
                ? "bg-primary text-primary-content"
                : "bg-base-300 text-base-content/70 hover:bg-base-300/80"
            }`}
          >
            {t("feeComparator.tabs.spot")}
          </button>
          <button
            onClick={() => setActiveTab("withdrawal")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "withdrawal"
                ? "bg-primary text-primary-content"
                : "bg-base-300 text-base-content/70 hover:bg-base-300/80"
            }`}
          >
            {t("feeComparator.tabs.withdrawal")}
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "spot" ? (
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead className="bg-base-300/50">
              <tr>
                <th className="font-medium text-base-content/70">{t("feeComparator.table.exchange")}</th>
                <th className="font-medium text-base-content/70">{t("feeComparator.table.safeScore")}</th>
                <th
                  className="font-medium text-base-content/70 cursor-pointer hover:text-primary"
                  onClick={() => handleSort("maker")}
                >
                  {t("feeComparator.table.maker")} <SortIcon field="maker" />
                </th>
                <th
                  className="font-medium text-base-content/70 cursor-pointer hover:text-primary"
                  onClick={() => handleSort("taker")}
                >
                  {t("feeComparator.table.taker")} <SortIcon field="taker" />
                </th>
                <th className="font-medium text-base-content/70">{t("feeComparator.table.vipRates")}</th>
                <th className="font-medium text-base-content/70">{t("feeComparator.table.discount")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedExchanges.map((exchange) => (
                <tr key={exchange.id} className="hover:bg-base-300/30">
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-base-300 flex items-center justify-center text-xs font-bold">
                        {exchange.name.charAt(0)}
                      </div>
                      <span className="font-medium">{exchange.name}</span>
                    </div>
                  </td>
                  <td>
                    {exchange.safeScore ? (
                      <span className={`font-bold ${getScoreColor(exchange.safeScore)}`}>
                        {exchange.safeScore}
                      </span>
                    ) : (
                      <span className="text-base-content/40">-</span>
                    )}
                  </td>
                  <td>
                    <span className="font-semibold">{exchange.spot?.maker}%</span>
                  </td>
                  <td>
                    <span className="font-semibold">{exchange.spot?.taker}%</span>
                  </td>
                  <td className="text-sm text-base-content/60">
                    {exchange.spot?.makerVip}% / {exchange.spot?.takerVip}%
                  </td>
                  <td>
                    {exchange.spot?.discountToken ? (
                      <span className="badge badge-success badge-sm">
                        {t("feeComparator.table.discountLabel", {
                          percent: exchange.spot.discountPercent,
                          token: exchange.spot.discountToken,
                        })}
                      </span>
                    ) : (
                      <span className="text-base-content/40">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {/* Coin selector */}
          <div className="p-4 border-b border-base-300">
            <div className="flex items-center gap-2">
              <span className="text-sm text-base-content/60">{t("feeComparator.table.selectCoin")}</span>
              {["BTC", "ETH", "USDT", "USDC"].map((coin) => (
                <button
                  key={coin}
                  onClick={() => setSelectedCoin(coin)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedCoin === coin
                      ? "bg-primary/20 text-primary"
                      : "bg-base-300 text-base-content/60 hover:bg-base-300/80"
                  }`}
                >
                  {coin}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-base-300/50">
                <tr>
                  <th className="font-medium text-base-content/70">{t("feeComparator.table.exchange")}</th>
                  <th className="font-medium text-base-content/70">{t("feeComparator.table.safeScore")}</th>
                  <th
                    className="font-medium text-base-content/70 cursor-pointer hover:text-primary"
                    onClick={() => handleSort("fee")}
                  >
                    {t("feeComparator.table.coinFee", { coin: selectedCoin })} <SortIcon field="fee" />
                  </th>
                  <th className="font-medium text-base-content/70">{t("feeComparator.table.network")}</th>
                  <th className="font-medium text-base-content/70">{t("feeComparator.table.notes")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedExchanges.map((exchange) => {
                  const withdrawalData = exchange.withdrawal?.[selectedCoin];
                  return (
                    <tr key={exchange.id} className="hover:bg-base-300/30">
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-base-300 flex items-center justify-center text-xs font-bold">
                            {exchange.name.charAt(0)}
                          </div>
                          <span className="font-medium">{exchange.name}</span>
                        </div>
                      </td>
                      <td>
                        {exchange.safeScore ? (
                          <span className={`font-bold ${getScoreColor(exchange.safeScore)}`}>
                            {exchange.safeScore}
                          </span>
                        ) : (
                          <span className="text-base-content/40">-</span>
                        )}
                      </td>
                      <td>
                        {withdrawalData ? (
                          <span className={`font-semibold ${withdrawalData.fee === 0 ? "text-green-400" : ""}`}>
                            {withdrawalData.fee} {selectedCoin}
                          </span>
                        ) : (
                          <span className="text-base-content/40">-</span>
                        )}
                      </td>
                      <td className="text-sm text-base-content/60">
                        {withdrawalData?.network || "-"}
                      </td>
                      <td className="text-sm text-base-content/60">
                        {withdrawalData?.note || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-base-300 bg-base-300/30">
        <p className="text-xs text-base-content/50">
          {t("feeComparator.footer")}
        </p>
      </div>
    </div>
  );
}
