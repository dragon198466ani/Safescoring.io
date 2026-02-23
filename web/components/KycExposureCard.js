"use client";

import { useState, useEffect, useMemo } from "react";
import { calculateKycRisk, getDataTypeLabel, getLocalizedRiskLabel, KYC_RISK_LEVELS } from "@/libs/kyc-risk";
import { detectLanguage, getTranslations, translate } from "@/libs/i18n";

/**
 * KYC Exposure Card
 *
 * Displays KYC data exposure risk for a user's setup.
 * Shows which platforms collect KYC data, their providers,
 * and whether any providers have had data incidents.
 *
 * Integrates into the setup detail page as an additional insight card.
 */

export default function KycExposureCard({ products = [], userAccess = {} }) {
  const [kycMappings, setKycMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // i18n
  const language = detectLanguage();
  const translations = useMemo(() => getTranslations(language), [language]);
  const t = (key, params) => translate(translations, key, params);

  // Fetch KYC mappings for the setup's products
  useEffect(() => {
    const fetchKycData = async () => {
      if (!products?.length) {
        setLoading(false);
        return;
      }

      try {
        const productIds = products
          .map((p) => p.id || p.product_id || p.product?.id)
          .filter(Boolean)
          .join(",");

        if (!productIds) {
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/kyc-providers?product_ids=${productIds}`);
        if (res.ok) {
          const data = await res.json();
          setKycMappings(data.mappings || []);
        }
      } catch (err) {
        console.error("Failed to fetch KYC data:", err);
        setError("Unable to load KYC data");
      }
      setLoading(false);
    };

    fetchKycData();
  }, [products]);

  // Calculate risk
  const risk = calculateKycRisk(products, kycMappings);
  const isPaid = userAccess?.isPaid || false;

  if (loading) {
    return (
      <div className="card bg-base-200 animate-pulse">
        <div className="card-body p-4">
          <div className="h-4 bg-base-300 rounded w-1/3"></div>
          <div className="h-8 bg-base-300 rounded w-1/2 mt-2"></div>
        </div>
      </div>
    );
  }

  if (error) return null;
  if (risk.level === "none" && risk.summary.total === 0) return null;

  const riskColors = {
    critical: "border-error bg-error/5",
    high: "border-warning bg-warning/5",
    moderate: "border-info bg-info/5",
    low: "border-success bg-success/5",
    none: "border-base-300 bg-base-200",
  };

  return (
    <div className={`card border-2 ${riskColors[risk.level]} transition-all duration-300`}>
      <div className="card-body p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 opacity-70">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
            </svg>
            <h3 className="font-semibold text-sm">{t("kyc.card.title")}</h3>
          </div>
          <div className={`badge badge-${risk.color} badge-sm gap-1`}>
            {getLocalizedRiskLabel(risk.level, t)}
          </div>
        </div>

        {/* Summary — always visible (free tier) */}
        <div className="mt-2 text-sm opacity-70">
          {risk.summary.withKyc === 0 ? (
            <p>{t("kyc.card.noKyc")}</p>
          ) : (
            <p>
              {risk.summary.withKyc} / {risk.summary.total} {t("kyc.card.requireKyc")}.
              {risk.summary.incidentAffected > 0 && (
                <span className="font-medium">
                  {" "}{risk.summary.incidentAffected} {t("kyc.card.incidentProvider")}.
                </span>
              )}
            </p>
          )}
        </div>

        {/* Detailed view — paid tier */}
        {isPaid && risk.summary.withKyc > 0 && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="btn btn-ghost btn-xs mt-2 gap-1"
            >
              {expanded ? t("kyc.card.hide") : t("kyc.card.view")} {t("kyc.card.details")}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {expanded && (
              <div className="mt-3 space-y-2">
                {risk.products
                  .filter((p) => p.kycRequired)
                  .map((product) => (
                    <div
                      key={product.productId}
                      className="flex items-center justify-between text-sm p-2 rounded bg-base-100"
                    >
                      <div>
                        <span className="font-medium">{product.productName}</span>
                        <span className="opacity-50 ml-2">
                          {t("kyc.card.via")} {product.providerName}
                        </span>
                      </div>
                      <div>
                        {product.incidentAffected ? (
                          <span className="badge badge-warning badge-xs">{t("kyc.card.incidentReported")}</span>
                        ) : (
                          <span className="badge badge-success badge-xs">{t("kyc.card.noIncidents")}</span>
                        )}
                      </div>
                    </div>
                  ))}

                {/* Exposed data types */}
                {risk.summary.dataTypesExposed.length > 0 && (
                  <div className="mt-2 p-2 rounded bg-base-100">
                    <p className="text-xs opacity-50 mb-1">{t("kyc.card.dataTypesAffected")}</p>
                    <div className="flex flex-wrap gap-1">
                      {risk.summary.dataTypesExposed.map((type) => (
                        <span key={type} className="badge badge-outline badge-xs">
                          {getDataTypeLabel(type, t)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Upgrade CTA for free users */}
        {!isPaid && risk.summary.withKyc > 0 && (
          <p className="text-xs opacity-50 mt-2">
            {t("kyc.card.upgradeCta")}
          </p>
        )}
      </div>
    </div>
  );
}
