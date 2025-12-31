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

  const saveProgress = async (step, data, complete = false) => {
    setSaving(true);
    try {
      await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, data, complete }),
      });
    } catch (error) {
      console.error("Error saving progress:", error);
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
          <div className="text-sm text-base-content/60">
            Step {currentStep + 1} of {STEPS.length}
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
