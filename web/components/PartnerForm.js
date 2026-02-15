"use client";

import { useState } from "react";

export default function PartnerForm() {
  const [formData, setFormData] = useState({
    companyName: "",
    website: "",
    contactName: "",
    email: "",
    partnershipType: "API Integration",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ type: "success", message: data.message });
        setFormData({
          companyName: "",
          website: "",
          contactName: "",
          email: "",
          partnershipType: "API Integration",
          description: "",
        });
      } else {
        setResult({ type: "error", message: data.error || "Something went wrong." });
      }
    } catch {
      setResult({ type: "error", message: "Network error. Please try again." });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {result && (
        <div
          className={`alert ${result.type === "success" ? "alert-success" : "alert-error"}`}
        >
          <span>{result.message}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Company Name</span>
          </label>
          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            className="input input-bordered"
            required
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Website</span>
          </label>
          <input
            type="url"
            name="website"
            value={formData.website}
            onChange={handleChange}
            className="input input-bordered"
            placeholder="https://"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Your Name</span>
          </label>
          <input
            type="text"
            name="contactName"
            value={formData.contactName}
            onChange={handleChange}
            className="input input-bordered"
            required
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Email</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="input input-bordered"
            required
          />
        </div>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Partnership Type</span>
        </label>
        <select
          name="partnershipType"
          value={formData.partnershipType}
          onChange={handleChange}
          className="select select-bordered"
        >
          <option>API Integration</option>
          <option>Affiliate / Referral</option>
          <option>White Label Solution</option>
          <option>Media Partnership</option>
          <option>Auditor Partnership</option>
          <option>Other</option>
        </select>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Tell us about your project</span>
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="textarea textarea-bordered h-24"
          placeholder="How would you like to integrate SafeScoring?"
        ></textarea>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary w-full"
      >
        {loading ? (
          <span className="loading loading-spinner loading-sm"></span>
        ) : (
          "Submit Application"
        )}
      </button>

      <p className="text-xs text-center text-base-content/50">
        We typically respond within 24-48 hours.
      </p>
      <p className="text-xs text-center text-base-content/40">
        By submitting, you agree to our{" "}
        <a href="/privacy-policy" className="text-primary/60 hover:underline">Privacy Policy</a>.
        Your data is used solely to process this application.
      </p>
    </form>
  );
}
