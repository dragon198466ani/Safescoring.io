/**
 * KYC Exposure Risk Calculator
 *
 * Evaluates the KYC data exposure risk for a user's setup
 * based on which platforms they use and their KYC providers.
 */

/**
 * Risk levels with neutral, professional labels
 */
export const KYC_RISK_LEVELS = {
  critical: { level: "critical", label: "Critical", color: "error", icon: "🔴" },
  high: { level: "high", label: "High", color: "warning", icon: "🟠" },
  moderate: { level: "moderate", label: "Moderate", color: "info", icon: "🟡" },
  low: { level: "low", label: "Low", color: "success", icon: "🟢" },
  none: { level: "none", label: "No KYC", color: "neutral", icon: "⚪" },
};

/**
 * Calculate the KYC exposure risk for a setup
 *
 * @param {Array} setupProducts - Products in the user's setup
 * @param {Array} kycMappings - KYC provider mappings for products
 * @returns {Object} Risk assessment with level, details, and recommendations
 */
export function calculateKycRisk(setupProducts, kycMappings) {
  if (!setupProducts?.length || !kycMappings?.length) {
    return {
      ...KYC_RISK_LEVELS.none,
      products: [],
      summary: {
        total: 0,
        withKyc: 0,
        incidentAffected: 0,
        dataTypesExposed: [],
      },
    };
  }

  // Map products to their KYC info
  const productKycInfo = setupProducts.map((product) => {
    const mapping = kycMappings.find(
      (m) => m.product_id === (product.id || product.product_id)
    );

    return {
      productId: product.id || product.product_id,
      productName: product.name || product.product?.name || "Unknown",
      kycRequired: mapping?.kyc_required ?? false,
      kycLevel: mapping?.kyc_level || "none",
      provider: mapping?.provider || null,
      providerName: mapping?.provider?.name || "Unknown",
      incidentAffected: mapping?.provider?.incident_status || false,
      dataTypes: mapping?.provider?.data_types_collected || [],
    };
  });

  // Calculate summary
  const productsWithKyc = productKycInfo.filter((p) => p.kycRequired);
  const incidentAffected = productsWithKyc.filter((p) => p.incidentAffected);

  // Collect all exposed data types (deduplicated)
  const dataTypesExposed = [
    ...new Set(incidentAffected.flatMap((p) => p.dataTypes)),
  ];

  const summary = {
    total: setupProducts.length,
    withKyc: productsWithKyc.length,
    incidentAffected: incidentAffected.length,
    dataTypesExposed,
  };

  // Determine risk level
  let riskLevel;
  if (productsWithKyc.length === 0) {
    riskLevel = KYC_RISK_LEVELS.none;
  } else {
    const ratio = incidentAffected.length / productsWithKyc.length;
    if (ratio >= 0.5) {
      riskLevel = KYC_RISK_LEVELS.critical;
    } else if (ratio > 0) {
      riskLevel = KYC_RISK_LEVELS.high;
    } else if (productsWithKyc.length > 0) {
      riskLevel = KYC_RISK_LEVELS.moderate;
    } else {
      riskLevel = KYC_RISK_LEVELS.low;
    }
  }

  return {
    ...riskLevel,
    products: productKycInfo,
    summary,
  };
}

/**
 * Format data type labels for display
 */
export const DATA_TYPE_LABELS = {
  passport: "Passport / ID",
  selfie: "Selfie / Photo",
  address: "Address",
  phone: "Phone number",
  bank_account: "Bank account",
  ssn: "SSN / Tax ID",
  email: "Email",
};

/**
 * Get human-readable label for a data type
 * @param {string} dataType - The data type key
 * @param {Function} [t] - Optional translate function from i18n
 */
export function getDataTypeLabel(dataType, t) {
  if (t) {
    const i18nKey = `kyc.dataTypes.${dataType === "bank_account" ? "bankAccount" : dataType}`;
    const translated = t(i18nKey);
    if (translated !== i18nKey) return translated;
  }
  return DATA_TYPE_LABELS[dataType] || dataType;
}

/**
 * Get localized risk label
 * @param {string} level - Risk level key (critical, high, moderate, low, none)
 * @param {Function} [t] - Optional translate function from i18n
 */
export function getLocalizedRiskLabel(level, t) {
  if (t) {
    const i18nKey = `kyc.risk.${level}`;
    const translated = t(i18nKey);
    if (translated !== i18nKey) return translated;
  }
  return KYC_RISK_LEVELS[level]?.label || level;
}
