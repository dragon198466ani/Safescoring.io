"use client";

import { useState } from "react";
import config from "@/config";

export default function StepWelcome({ data, onNext, saving }) {
  const [name, setName] = useState(data.name || "");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    onNext({ name: name.trim() });
  };

  return (
    <div className="text-center">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 via-amber-500 to-purple-500 mb-6">
          <span className="text-4xl font-black text-white">S</span>
        </div>
        <h1 className="text-3xl font-bold mb-3">Welcome to {config.appName}</h1>
        <p className="text-base-content/60 text-lg">
          The first unified security rating for all crypto products.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-left">
          <label className="label">
            <span className="label-text font-medium">What should we call you?</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="Enter your name"
            className={`input input-bordered w-full ${error ? "input-error" : ""}`}
            autoFocus
          />
          {error && <p className="text-error text-sm mt-1">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary w-full"
        >
          {saving ? <span className="loading loading-spinner loading-sm"></span> : "Get Started"}
        </button>
      </form>

      <p className="text-sm text-base-content/50 mt-8">
        You&apos;re joining {config.safe.stats.totalProducts}+ products evaluated with{" "}
        {config.safe.stats.totalNorms} security norms.
      </p>
    </div>
  );
}
