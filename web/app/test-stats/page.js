"use client";

import { useState, useEffect } from "react";

export default function TestStatsPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [browserInfo, setBrowserInfo] = useState(null);

  // Get browser info only on client side
  useEffect(() => {
    setBrowserInfo({
      userAgent: navigator.userAgent,
      origin: window.location.origin,
      protocol: window.location.protocol,
    });
  }, []);

  const testFetch = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/api/v1/stats`;
      console.log("Fetching from:", url);

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      console.log("Response status:", res.status);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log("Data:", data);

      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Test Stats API</h1>

        <button
          onClick={testFetch}
          disabled={loading}
          className="btn btn-primary mb-6"
        >
          {loading ? "Loading..." : "Test API Fetch"}
        </button>

        {error && (
          <div className="alert alert-error mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Error: {error}</span>
          </div>
        )}

        {result && (
          <div>
            <h2 className="text-xl font-semibold mb-3">API Response:</h2>
            <pre className="bg-base-200 p-4 rounded-lg overflow-auto text-sm">
              {result}
            </pre>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-3">Browser Info:</h2>
          <div className="bg-base-200 p-4 rounded-lg">
            {browserInfo ? (
              <>
                <p><strong>User Agent:</strong> {browserInfo.userAgent}</p>
                <p><strong>Origin:</strong> {browserInfo.origin}</p>
                <p><strong>Protocol:</strong> {browserInfo.protocol}</p>
              </>
            ) : (
              <p className="text-base-content/50">Loading...</p>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-3">Instructions:</h2>
          <ol className="list-decimal list-inside space-y-2 bg-base-200 p-4 rounded-lg">
            <li>Click "Test API Fetch" button above</li>
            <li>Open browser console (F12) to see detailed logs</li>
            <li>Check if API response appears below</li>
            <li>If error appears, note the error message</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
