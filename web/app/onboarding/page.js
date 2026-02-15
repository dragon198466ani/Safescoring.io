"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [onboardingState, setOnboardingState] = useState(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin?callbackUrl=/onboarding");
      return;
    }

    if (status === "authenticated") {
      fetchOnboardingState();
    }
  }, [status, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOnboardingState = async () => {
    try {
      const res = await fetch("/api/user/onboarding");
      const data = await res.json();

      if (data.onboardingCompleted) {
        router.push("/dashboard");
        return;
      }

      setOnboardingState(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching onboarding state:", error);
      setLoading(false);
    }
  };

  const handleComplete = () => {
    router.push("/dashboard");
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      <OnboardingWizard
        initialStep={onboardingState?.currentStep || 0}
        initialData={{
          name: onboardingState?.name || session?.user?.name || "",
          userType: onboardingState?.userType || "",
          interests: onboardingState?.interests || [],
        }}
        onComplete={handleComplete}
      />
    </div>
  );
}
