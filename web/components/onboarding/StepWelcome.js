"use client";

import { useState } from "react";
import config from "@/config";
import { useNormStats } from "@/libs/NormStatsProvider";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

export default function StepWelcome({ data, onNext, saving }) {
  const [name, setName] = useState(data.name || "");
  const [error, setError] = useState("");
  const normStats = useNormStats();
  const { t } = useTranslation();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("onboarding.welcome.nameRequired"));
      return;
    }
    onNext({ name: name.trim() });
  };

  return (
    <div className="text-center">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 via-amber-500 to-purple-500 mb-6">
          <span className="text-4xl font-black text-white">S</span>
        </div>
        <h1 className="text-3xl font-bold mb-3">{t("onboarding.welcome.title").replace("{appName}", config.appName)}</h1>
        <p className="text-base-content/60 text-lg">
          {t("onboarding.welcome.subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-left">
          <label className="label">
            <span className="label-text font-medium">{t("onboarding.welcome.nameLabel")}</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder={t("onboarding.welcome.namePlaceholder")}
            className={`input input-bordered w-full ${error ? "input-error" : ""}`}
            autoFocus
          />
          {error && <p className="text-error text-sm mt-1">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary w-full"
        >
          {saving ? <span className="loading loading-spinner loading-sm"></span> : t("onboarding.welcome.getStarted")}
        </button>
      </form>

      <p className="text-sm text-base-content/50 mt-8">
        {t("onboarding.welcome.joinMessage")
          .replace("{products}", normStats?.totalProducts || "1000+")
          .replace("{norms}", normStats?.totalNorms || "2000+")}
      </p>
    </div>
  );
}
