"use client";

import { useState } from "react";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

const USER_TYPE_ICONS = {
  investor: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  ),
  developer: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  ),
  researcher: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  ),
  institution: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  ),
};

const USER_TYPE_IDS = ["investor", "developer", "researcher", "institution"];

export default function StepProfile({ data, onNext, onBack, saving }) {
  const [selected, setSelected] = useState(data.userType || "");
  const { t } = useTranslation();

  const handleSubmit = () => {
    if (selected) {
      onNext({ userType: selected });
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">{t("onboarding.profile.title")}</h2>
        <p className="text-base-content/60">
          {t("onboarding.profile.subtitle")}
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {USER_TYPE_IDS.map((id) => (
          <button
            key={id}
            onClick={() => setSelected(id)}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              selected === id
                ? "border-primary bg-primary/10"
                : "border-base-300 hover:border-base-content/20"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`p-2 rounded-lg ${
                  selected === id
                    ? "bg-primary text-primary-content"
                    : "bg-base-300 text-base-content"
                }`}
              >
                {USER_TYPE_ICONS[id]}
              </div>
              <div className="flex-1">
                <div className="font-semibold mb-1">{t(`onboarding.profile.${id}`)}</div>
                <div className="text-sm text-base-content/60">{t(`onboarding.profile.${id}Desc`)}</div>
              </div>
              {selected === id && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-primary">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn btn-ghost">
          {t("onboarding.back")}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!selected || saving}
          className="btn btn-primary flex-1"
        >
          {saving ? <span className="loading loading-spinner loading-sm"></span> : t("onboarding.continue")}
        </button>
      </div>
    </div>
  );
}
