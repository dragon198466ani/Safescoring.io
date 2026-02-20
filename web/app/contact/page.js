"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const CONTACT_TYPES = [
  { value: "enterprise", label: "Enterprise Plan" },
  { value: "partnership", label: "Partnership" },
  { value: "support", label: "Support" },
  { value: "other", label: "Other" },
];

function ContactContent() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") || searchParams.get("plan");
  const validTypes = CONTACT_TYPES.map((t) => t.value);
  const initialType = validTypes.includes(typeParam) ? typeParam : "enterprise";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    contactType: initialType,
    message: "",
    website_url: "", // honeypot
  });
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "error"
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      setStatus("success");
      setFormData({
        name: "",
        email: "",
        company: "",
        contactType: "enterprise",
        message: "",
        website_url: "",
      });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Contact Us</h1>
            <p className="text-base-content/70 max-w-xl mx-auto">
              Questions about Enterprise, partnerships, or need support? We&apos;re here to help.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              {status === "success" ? (
                <div className="bg-success/10 border border-success rounded-xl p-8 text-center">
                  <svg
                    className="w-12 h-12 text-success mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="text-xl font-bold mb-2">Message Sent!</h3>
                  <p className="text-base-content/70 mb-4">
                    We&apos;ll get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => setStatus(null)}
                    className="btn btn-outline btn-sm"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Honeypot - hidden from users */}
                  <div className="hidden" aria-hidden="true">
                    <input
                      type="text"
                      name="website_url"
                      value={formData.website_url}
                      onChange={handleChange}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text font-medium">Name *</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      minLength={2}
                      maxLength={100}
                      className="input input-bordered w-full"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text font-medium">Email *</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="input input-bordered w-full"
                      placeholder="you@company.com"
                    />
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text font-medium">Company</span>
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      maxLength={100}
                      className="input input-bordered w-full"
                      placeholder="Your company (optional)"
                    />
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text font-medium">Subject *</span>
                    </label>
                    <select
                      name="contactType"
                      value={formData.contactType}
                      onChange={handleChange}
                      className="select select-bordered w-full"
                    >
                      {CONTACT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text font-medium">Message *</span>
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      minLength={10}
                      maxLength={2000}
                      rows={5}
                      className="textarea textarea-bordered w-full"
                      placeholder="Tell us about your needs..."
                    />
                  </div>

                  {status === "error" && (
                    <div className="alert alert-error text-sm">
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="btn btn-primary w-full"
                  >
                    {status === "loading" ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      "Send Message"
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Sidebar Info */}
            <div className="space-y-8">
              {/* Enterprise CTA */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
                <h3 className="font-bold text-lg mb-2">Enterprise Plan</h3>
                <p className="text-sm text-base-content/70 mb-4">
                  Need unlimited access, custom evaluations, or team features?
                  Book a call to discuss your needs.
                </p>
                <a
                  href="https://calendly.com/safescoring/enterprise"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm w-full"
                >
                  Book an Onboarding Call
                </a>
              </div>

              {/* Direct Contact */}
              <div className="bg-base-200 rounded-xl p-6">
                <h3 className="font-bold mb-4">Direct Contact</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-primary flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <span>enterprise@safescoring.io</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-primary flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Response within 24h (business days)</span>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-base-200 rounded-xl p-6">
                <h3 className="font-bold mb-4">Quick Links</h3>
                <div className="space-y-2 text-sm">
                  <Link href="/pricing" className="flex items-center gap-2 text-primary hover:underline">
                    View all plans
                  </Link>
                  <Link href="/methodology" className="flex items-center gap-2 text-primary hover:underline">
                    SAFE Methodology
                  </Link>
                  <Link href="/enterprise" className="flex items-center gap-2 text-primary hover:underline">
                    Enterprise features
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function ContactPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <span className="loading loading-spinner loading-lg" />
        </div>
      }
    >
      <ContactContent />
    </Suspense>
  );
}
