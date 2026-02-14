"use client";

import { useState } from "react";
import Image from "next/image";

export default function ProductLogo({ logoUrl, fallbackUrl, name, size = "lg" }) {
  const [errorLevel, setErrorLevel] = useState(0);

  const sizeConfig = {
    sm: { classes: "w-12 h-12 rounded-xl text-xl", px: 48 },
    lg: { classes: "w-20 h-20 rounded-2xl text-3xl", px: 80 },
  };

  const { classes, px } = sizeConfig[size] || sizeConfig.lg;

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
    <Image
      src={currentUrl}
      alt={`${name} logo`}
      width={px}
      height={px}
      className={`${classes} object-contain bg-white border border-base-300`}
      onError={handleError}
      unoptimized
    />
  );
}
