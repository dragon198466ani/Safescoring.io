"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import CountrySelector from "./CountrySelector";
import { COUNTRY_COORDINATES } from "@/libs/country-coordinates";
import { useApi } from "@/hooks/useApi";

export default function CountryOnboarding() {
  const { data: session } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [country, setCountry] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Use useApi for onboarding data (1-minute cache)
  const { data: onboardingData, isLoading } = useApi(
    session?.user?.id ? "/api/user/onboarding" : null,
    { ttl: 60 * 1000 }
  );

  // Show modal if user hasn't set country
  useEffect(() => {
    if (!isLoading && onboardingData && !onboardingData.country) {
      setShowModal(true);
    }
  }, [onboardingData, isLoading]);

  const handleSave = async () => {
    if (!country) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: { country },
        }),
      });

      if (res.ok) {
        setShowModal(false);
      }
    } catch (error) {
      console.error("Error saving country:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-base-100 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/20 to-secondary/20 px-6 py-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-8 h-8 text-primary"
            >
              <path
                fillRule="evenodd"
                d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM8.547 4.505a8.25 8.25 0 1011.672 11.672 10.502 10.502 0 01-11.672-11.672z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Bienvenue sur SafeScoring</h2>
          <p className="text-base-content/60">
            Aidez-nous à personnaliser votre expérience
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <CountrySelector
            value={country}
            onChange={setCountry}
            showPrivacyMessage={true}
          />

          {/* Benefits */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-base-content/70">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-primary">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <span>Apparaissez sur la carte mondiale des utilisateurs</span>
            </div>
            <div className="flex items-center gap-2 text-base-content/70">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-primary">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <span>Recevez des alertes adaptées à votre région</span>
            </div>
            <div className="flex items-center gap-2 text-base-content/70">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-primary">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <span>Découvrez des produits populaires dans votre région</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleSkip}
            className="btn btn-ghost flex-1"
          >
            Passer
          </button>
          <button
            onClick={handleSave}
            disabled={!country || isSaving}
            className="btn btn-primary flex-1"
          >
            {isSaving ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              "Confirmer"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
