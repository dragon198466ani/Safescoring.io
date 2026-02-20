"use client";

import { useLanguage } from "@/libs/i18n/LanguageProvider";

/**
 * Language Selector Component
 * Allows users to manually select their preferred language
 */
export default function LanguageSelector({ className = "" }) {
  const { language, changeLanguage, languages, supportedLanguages } = useLanguage();

  return (
    <div className={`dropdown dropdown-end ${className}`}>
      <label tabIndex={0} className="btn btn-ghost btn-sm gap-1">
        <span className="text-lg">{languages[language]?.flag}</span>
        <span className="hidden sm:inline">{languages[language]?.name}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </label>
      <ul
        tabIndex={0}
        className="dropdown-content menu p-2 shadow-lg bg-base-200 rounded-box w-40 z-50"
      >
        {supportedLanguages.map((lang) => (
          <li key={lang}>
            <button
              onClick={() => changeLanguage(lang)}
              className={`flex items-center gap-2 ${
                language === lang ? "active" : ""
              }`}
            >
              <span className="text-lg">{languages[lang].flag}</span>
              <span>{languages[lang].name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Compact language selector (just flag)
 */
export function LanguageSelectorCompact({ className = "" }) {
  const { language, changeLanguage, languages, supportedLanguages } = useLanguage();

  return (
    <div className={`dropdown dropdown-end ${className}`}>
      <label tabIndex={0} className="btn btn-ghost btn-circle btn-sm">
        <span className="text-lg">{languages[language]?.flag}</span>
      </label>
      <ul
        tabIndex={0}
        className="dropdown-content menu p-2 shadow-lg bg-base-200 rounded-box w-40 z-50"
      >
        {supportedLanguages.map((lang) => (
          <li key={lang}>
            <button
              onClick={() => changeLanguage(lang)}
              className={`flex items-center gap-2 ${
                language === lang ? "active" : ""
              }`}
            >
              <span className="text-lg">{languages[lang].flag}</span>
              <span>{languages[lang].name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
