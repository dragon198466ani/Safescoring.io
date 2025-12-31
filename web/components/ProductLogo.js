"use client";

import { useState } from "react";

export default function ProductLogo({ logoUrl, fallbackUrl, name, size = "lg" }) {
  const [errorLevel, setErrorLevel] = useState(0);

  const sizeClasses = {
    sm: "w-12 h-12 rounded-xl text-xl",
    lg: "w-20 h-20 rounded-2xl text-3xl",
  };

  const classes = sizeClasses[size] || sizeClasses.lg;

  // Fallback chain: Clearbit → Google Favicon → Initial letter
  const handleError = () => {
    setErrorLevel((prev) => prev + 1);
  };

  // Level 0: Try primary logo (Clearbit)
  // Level 1: Try fallback (Google Favicon)
  // Level 2: Show initial letter

  if (errorLevel >= 2 || (!logoUrl && !fallbackUrl)) {
    return (
      <div className={`${classes} bg-base-200 border border-base-300 flex items-center justify-center font-bold text-primary`}>
        {name?.charAt(0) || "?"}
      </div>
    );
  }

  const currentUrl = errorLevel === 0 ? logoUrl : fallbackUrl;

  if (!currentUrl) {
    return (
      <div className={`${classes} bg-base-200 border border-base-300 flex items-center justify-center font-bold text-primary`}>
        {name?.charAt(0) || "?"}
      </div>
    );
  }

  return (
    <img
      src={currentUrl}
      alt={`${name} logo`}
      className={`${classes} object-contain bg-white border border-base-300`}
      onError={handleError}
    />
  );
}
