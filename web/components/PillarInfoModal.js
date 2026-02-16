"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

const PillarInfoModal = ({ isOpen, onClose, pillarCode, pillarColor }) => {
  const { t } = useTranslation();

  if (!pillarCode) return null;

  // Build content dynamically from i18n keys
  const content = {
    title: t(`pillarModal.${pillarCode}.title`),
    subtitle: t(`pillarModal.${pillarCode}.subtitle`),
    introduction: t(`pillarModal.${pillarCode}.introduction`),
    whyItMatters: t(`pillarModal.${pillarCode}.whyItMatters`),
    essentialStandards: t(`pillarModal.${pillarCode}.standards`),
    evaluationAreas: t(`pillarModal.${pillarCode}.evaluationAreas`),
  };

  if (!content.title || content.title === `pillarModal.${pillarCode}.title`) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-base-100 border border-base-300 shadow-2xl transition-all">
                {/* Header with gradient */}
                <div
                  className="relative px-6 py-8 overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${pillarColor}20 0%, transparent 100%)`,
                  }}
                >
                  {/* Decorative glow */}
                  <div
                    className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-30"
                    style={{ backgroundColor: pillarColor }}
                  />

                  <div className="relative flex items-center gap-4">
                    <div
                      className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black text-white shadow-lg"
                      style={{ backgroundColor: pillarColor }}
                    >
                      {pillarCode}
                    </div>
                    <div>
                      <Dialog.Title className="text-2xl font-bold">
                        {content.title}
                      </Dialog.Title>
                      <p className="text-base-content/60 font-medium">
                        {content.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Close button */}
                  <button
                    className="absolute top-4 right-4 btn btn-ghost btn-sm btn-circle"
                    onClick={onClose}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
                  {/* Introduction */}
                  <div>
                    <p className="text-base-content/80 leading-relaxed">
                      {content.introduction}
                    </p>
                  </div>

                  {/* Why it matters */}
                  <div
                    className="p-4 rounded-xl border-l-4"
                    style={{
                      borderColor: pillarColor,
                      backgroundColor: `${pillarColor}10`,
                    }}
                  >
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5"
                        style={{ color: pillarColor }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {t("pillarModal.whyItMatters")}
                    </h4>
                    <p className="text-sm text-base-content/70">
                      {content.whyItMatters}
                    </p>
                  </div>

                  {/* Essential Standards */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5"
                        style={{ color: pillarColor }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {t("pillarModal.essentialStandards")}
                    </h4>
                    <div className="space-y-3">
                      {Array.isArray(content.essentialStandards) && content.essentialStandards.map((standard, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg bg-base-200/50 border border-base-300"
                        >
                          <h5
                            className="font-medium text-sm"
                            style={{ color: pillarColor }}
                          >
                            {standard.name}
                          </h5>
                          <p className="text-xs text-base-content/60 mt-1">
                            {standard.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Evaluation Areas */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5"
                        style={{ color: pillarColor }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {t("pillarModal.whatWeEvaluate")}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(content.evaluationAreas) && content.evaluationAreas.map((area, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border"
                          style={{
                            borderColor: `${pillarColor}40`,
                            backgroundColor: `${pillarColor}10`,
                            color: pillarColor,
                          }}
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-base-200/50 border-t border-base-300">
                  <p className="text-xs text-base-content/50 text-center">
                    {t("pillarModal.footerNote")}
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default PillarInfoModal;
