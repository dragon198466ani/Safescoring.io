"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";

function StackBuilderRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Preserve query params (e.g., ?profile=beginner)
    const params = searchParams.toString();
    const target = params
      ? `/dashboard/setups?${params}`
      : "/dashboard/setups";
    router.replace(target);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-4 text-base-content/60">Redirecting to Setup Builder...</p>
      </div>
    </div>
  );
}

export default function StackBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      }
    >
      <StackBuilderRedirect />
    </Suspense>
  );
}
