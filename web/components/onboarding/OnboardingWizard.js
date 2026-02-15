"use client";

import { useState } from "react";
import StepWelcome from "./StepWelcome";
import StepProfile from "./StepProfile";
import StepInterests from "./StepInterests";
import StepFirstProduct from "./StepFirstProduct";
import StepComplete from "./StepComplete";
import config from "@/config";

const STEPS = [
  { id: 0, title: "Welcome", component: StepWelcome },
  { id: 1, title: "Profile", component: StepProfile },
  { id: 2, title: "Interests", component: StepInterests },
  { id: 3, title: "First Product", component: StepFirstProduct },
  { id: 4, title: "Complete", component: StepComplete },
];

export default function OnboardingWizard({ initialStep = 0, initialData = {}, onComplete }) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [formData, setFormData] = useState({
    name: initialData.name || "",
    userType: initialData.userType || "",
    interests: initialData.interests || [],
    firstProduct: null,
  });
  const [saving, setSaving] = useState(false);

  const [saveError, setSaveError] = useState(false);

  const saveProgress = async (step, data, complete = false) => {
    setSaving(true);
    setSaveError(false);
    try {
      const res = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, data, complete }),
      });
      if (!res.ok) throw new Error("Save failed");
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("Error saving progress:", error);
      setSaveError(true);
      setTimeout(() => setSaveError(false), 5000);
    }
    setSaving(false);
  };

  const handleNext = async (stepData = {}) => {
    const newFormData = { ...formData, ...stepData };
    setFormData(newFormData);

    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      await saveProgress(nextStep, newFormData);
      setCurrentStep(nextStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    await saveProgress(STEPS.length - 1, formData, true);
    onComplete?.();
  };

  const CurrentStepComponent = STEPS[currentStep].component;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar */}
      <div className="w-full bg-base-200 h-1">
        <div
          className="bg-primary h-1 transition-all duration-300"
          style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Error toast */}
      {saveError && (
        <div className="fixed top-4 right-4 z-50 alert alert-warning shadow-lg max-w-sm animate-fade-in">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm">Could not save progress. You can continue — we&apos;ll retry later.</span>
        </div>
      )}

      {/* Header */}
      <header className="px-6 py-4 border-b border-base-200">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-amber-500 to-purple-500 rounded-lg opacity-80" />
              <div className="absolute inset-0.5 bg-base-100 rounded-[6px] flex items-center justify-center">
                <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-green-500 via-amber-500 to-purple-500">
                  S
                </span>
              </div>
            </div>
            <span className="text-xl font-bold">{config.appName}</span>
          </div>
          <div className="flex items-center gap-4">
            {currentStep < STEPS.length - 1 && (
              <button
                onClick={handleComplete}
                className="text-sm text-base-content/50 hover:text-base-content transition-colors"
              >
                Skip setup
              </button>
            )}
            <div className="text-sm text-base-content/60">
              Step {currentStep + 1} of {STEPS.length}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <CurrentStepComponent
            data={formData}
            onNext={handleNext}
            onBack={handleBack}
            onComplete={handleComplete}
            isFirst={currentStep === 0}
            isLast={currentStep === STEPS.length - 1}
            saving={saving}
          />
        </div>
      </main>

      {/* Step indicators */}
      <div className="px-6 py-4 border-t border-base-200">
        <div className="max-w-xl mx-auto flex justify-center gap-2">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`w-2 h-2 rounded-full transition-colors ${
                index <= currentStep ? "bg-primary" : "bg-base-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
