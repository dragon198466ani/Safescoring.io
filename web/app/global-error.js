"use client";

/**
 * Root-level error boundary — catches errors in the root layout itself.
 * Must include its own <html> and <body> tags (Next.js requirement).
 */
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en" data-theme="dark">
      <body className="bg-base-100 text-base-content">
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <div className="mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-20 h-20 text-error mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-base-content/60 mb-6 max-w-md">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <div className="flex gap-4">
            <button onClick={reset} className="btn btn-primary">
              Try Again
            </button>
            <a href="/" className="btn btn-ghost">
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
