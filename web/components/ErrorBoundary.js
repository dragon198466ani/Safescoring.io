"use client";

import { Component } from "react";
import { captureError } from "@/libs/monitoring";

/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays fallback UI
 *
 * Usage:
 * <ErrorBoundary fallback={<p>Something went wrong</p>}>
 *   <YourComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Send to monitoring (Sentry + console)
    captureError(error, {
      tags: { source: "error-boundary" },
      extra: {
        componentStack: errorInfo?.componentStack,
        url: typeof window !== "undefined" ? window.location?.href : undefined,
      },
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-[200px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/20 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-error"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-base-content mb-2">
              Something went wrong
            </h3>
            <p className="text-base-content/60 text-sm mb-4">
              {this.props.message || "An unexpected error occurred. Please try again."}
            </p>
            <button
              onClick={this.handleRetry}
              className="btn btn-primary btn-sm"
            >
              Try Again
            </button>

            {/* Show error details in development */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs text-base-content/50">
                  Error Details
                </summary>
                <pre className="mt-2 p-2 bg-base-200 rounded text-xs overflow-auto max-h-32">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
