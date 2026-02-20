"use client";

import { Suspense } from "react";
import SetupAuditQuiz from "@/components/SetupAuditQuiz";

export default function AuditPage() {
  return (
    <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto">
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      }>
        <SetupAuditQuiz />
      </Suspense>
    </main>
  );
}
