"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import config from "@/config";

/**
 * CCPA/CPRA Rights Page for California Residents
 * Implements "Do Not Sell My Personal Information" and other CCPA rights
 */

export default function CCPAPage() {
  const [email, setEmail] = useState("");
  const [requestType, setRequestType] = useState("do_not_sell");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/privacy/ccpa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, request_type: requestType }),
      });

      const data = await res.json();

      if (data.success) {
        setSubmitted(true);
        toast.success("Request submitted successfully");
      } else {
        toast.error(data.error || "Failed to submit request");
      }
    } catch (error) {
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto p-5">
      <Link href="/privacy" className="btn btn-ghost mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z" clipRule="evenodd" />
        </svg>
        Back to Privacy Policy
      </Link>

      <h1 className="text-3xl font-extrabold mb-2">California Privacy Rights</h1>
      <p className="text-base-content/60 mb-8">CCPA/CPRA Compliance for California Residents</p>

      {/* Info Section */}
      <div className="bg-base-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Rights Under CCPA/CPRA</h2>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="badge badge-primary">1</div>
            <div>
              <h3 className="font-medium">Right to Know</h3>
              <p className="text-sm text-base-content/60">Request information about personal data collected about you</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="badge badge-primary">2</div>
            <div>
              <h3 className="font-medium">Right to Delete</h3>
              <p className="text-sm text-base-content/60">Request deletion of your personal information</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="badge badge-primary">3</div>
            <div>
              <h3 className="font-medium">Right to Opt-Out of Sale</h3>
              <p className="text-sm text-base-content/60">Opt-out of the sale of your personal information (we do NOT sell data)</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="badge badge-primary">4</div>
            <div>
              <h3 className="font-medium">Right to Non-Discrimination</h3>
              <p className="text-sm text-base-content/60">Equal service regardless of privacy choices</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="badge badge-primary">5</div>
            <div>
              <h3 className="font-medium">Right to Correct</h3>
              <p className="text-sm text-base-content/60">Request correction of inaccurate information</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="badge badge-primary">6</div>
            <div>
              <h3 className="font-medium">Right to Limit Sensitive Data Use</h3>
              <p className="text-sm text-base-content/60">Limit use of sensitive personal information</p>
            </div>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="alert alert-info mb-8">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div>
          <h3 className="font-bold">We Do NOT Sell Your Data</h3>
          <p className="text-sm">{config.appName} does not sell, rent, or trade your personal information to third parties for monetary or other valuable consideration.</p>
        </div>
      </div>

      {/* Request Form */}
      {!submitted ? (
        <div className="bg-base-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Submit a Privacy Request</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Request Type</span>
              </label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="select select-bordered w-full"
              >
                <option value="do_not_sell">Do Not Sell My Personal Information</option>
                <option value="know">Right to Know (Data Access)</option>
                <option value="delete">Right to Delete</option>
                <option value="correct">Right to Correct</option>
                <option value="limit">Limit Sensitive Data Use</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Email Address</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input input-bordered w-full"
                required
              />
              <label className="label">
                <span className="label-text-alt">We will verify your identity before processing</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input type="checkbox" required className="checkbox checkbox-primary" />
                <span className="label-text">I am a California resident and I understand this request</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full"
            >
              {submitting ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Submit Request"
              )}
            </button>
          </form>

          <p className="text-sm text-base-content/60 mt-4">
            We will respond to your request within 45 days as required by CCPA.
            You may also contact us at: privacy@safescoring.io
          </p>
        </div>
      ) : (
        <div className="bg-success/20 border border-success rounded-lg p-6 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-success mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold mb-2">Request Submitted</h2>
          <p className="text-base-content/70">
            We have received your {requestType.replace(/_/g, " ")} request.
            You will receive a confirmation email shortly.
            We will respond within 45 days.
          </p>
        </div>
      )}

      {/* Categories Collected */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Categories of Personal Information Collected</h2>
        <p className="text-sm text-base-content/60 mb-4">In the past 12 months, we have collected:</p>

        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Category</th>
                <th>Examples</th>
                <th>Collected</th>
                <th>Sold</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Identifiers</td>
                <td>Email, username, wallet address</td>
                <td className="text-success">Yes</td>
                <td className="text-error">No</td>
              </tr>
              <tr>
                <td>Commercial Information</td>
                <td>Purchase history, subscription</td>
                <td className="text-success">Yes</td>
                <td className="text-error">No</td>
              </tr>
              <tr>
                <td>Internet Activity</td>
                <td>Browsing history, API usage</td>
                <td className="text-success">Yes</td>
                <td className="text-error">No</td>
              </tr>
              <tr>
                <td>Geolocation</td>
                <td>Country (not precise location)</td>
                <td className="text-success">Yes</td>
                <td className="text-error">No</td>
              </tr>
              <tr>
                <td>Biometric</td>
                <td>Fingerprints, face data</td>
                <td className="text-error">No</td>
                <td className="text-error">No</td>
              </tr>
              <tr>
                <td>Sensitive Personal Info</td>
                <td>SSN, financial accounts</td>
                <td className="text-error">No</td>
                <td className="text-error">No</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
