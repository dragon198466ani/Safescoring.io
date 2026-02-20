"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const WelcomeBanner = ({ userName }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Start entrance animation
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Remove query params from URL without reload
    router.replace("/dashboard", { scroll: false });
  };

  if (!isVisible) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-success/20 via-primary/20 to-purple-500/20 border border-success/30 p-6 transition-all duration-500 ${
        isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
      }`}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-success/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 btn btn-ghost btn-sm btn-circle"
        aria-label="Dismiss"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Content */}
      <div className="relative flex flex-col md:flex-row md:items-center gap-6">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-success/20 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8 text-success"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
              />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="flex-grow">
          <h2 className="text-xl md:text-2xl font-bold mb-2">
            Payment Successful! Welcome{userName ? `, ${userName}` : ""}!
          </h2>
          <p className="text-base-content/70 mb-4">
            Your subscription is now active. You have full access to all premium features.
            Start exploring security scores and build your optimal crypto stack.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/products" className="btn btn-success btn-sm gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              Explore Products
            </Link>
            <Link href="/dashboard/setups" className="btn btn-outline btn-sm gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
              Create Your First Setup
            </Link>
          </div>
        </div>

        {/* Stats preview */}
        <div className="flex-shrink-0 hidden lg:flex gap-4">
          <div className="text-center p-4 rounded-xl bg-base-100/50">
            <p className="text-2xl font-bold text-success">Unlimited</p>
            <p className="text-xs text-base-content/60">Product Views</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-base-100/50">
            <p className="text-2xl font-bold text-primary">Full</p>
            <p className="text-xs text-base-content/60">API Access</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;
