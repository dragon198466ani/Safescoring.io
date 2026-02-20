"use client";

import { useState, useEffect } from "react";
import { COUNTRY_COORDINATES } from "@/libs/country-coordinates";

// Get sorted country list from coordinates
const COUNTRIES = Object.entries(COUNTRY_COORDINATES)
  .map(([code, data]) => ({
    code,
    name: data.name,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function CountrySelector({
  value,
  onChange,
  showPrivacyMessage = true,
  className = "",
  disabled = false,
}) {
  const [selectedCountry, setSelectedCountry] = useState(value || "");
  const [isDetecting, setIsDetecting] = useState(false);

  // Auto-detect country on mount if no value
  useEffect(() => {
    if (!value && !selectedCountry) {
      detectCountry();
    }
  }, []);

  const detectCountry = async () => {
    setIsDetecting(true);
    try {
      const response = await fetch("https://ipapi.co/json/");
      const data = await response.json();
      if (data.country_code && COUNTRY_COORDINATES[data.country_code]) {
        setSelectedCountry(data.country_code);
        onChange?.(data.country_code);
      }
    } catch (error) {
      console.log("Could not auto-detect country");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleChange = (e) => {
    const code = e.target.value;
    setSelectedCountry(code);
    onChange?.(code);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="label">
        <span className="label-text font-medium">Votre pays / région</span>
        {isDetecting && (
          <span className="label-text-alt flex items-center gap-1">
            <span className="loading loading-spinner loading-xs"></span>
            Détection...
          </span>
        )}
      </label>

      <select
        value={selectedCountry}
        onChange={handleChange}
        disabled={disabled || isDetecting}
        className="select select-bordered w-full"
      >
        <option value="">Sélectionner un pays</option>
        {COUNTRIES.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>

      {showPrivacyMessage && (
        <div className="flex items-start gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5 text-success shrink-0 mt-0.5"
          >
            <path
              fillRule="evenodd"
              d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-xs text-base-content/70">
            <span className="font-medium text-success">100% anonyme</span>
            <p className="mt-0.5">
              Seul votre pays est enregistré, jamais votre adresse exacte ni votre position GPS.
              Cette information est utilisée uniquement pour vous montrer sur la carte mondiale
              et personnaliser votre expérience.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
