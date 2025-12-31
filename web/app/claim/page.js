"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";

function ClaimForm() {
  const searchParams = useSearchParams();
  const productSlug = searchParams.get("product") || "";

  const [formData, setFormData] = useState({
    productSlug: productSlug,
    companyName: "",
    contactName: "",
    email: "",
    website: "",
    role: "",
    message: "",
    discord: "",
    twitter: "",
    telegram: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [productInfo, setProductInfo] = useState(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [dnsVerification, setDnsVerification] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState([]);

  // Fetch product info if slug provided - auto-fill form fields
  useEffect(() => {
    if (productSlug) {
      fetch(`/api/products/${productSlug}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data) {
            setProductInfo(data);

            // Track which fields are auto-filled for visual indication
            const filledFields = [];
            const updates = {
              companyName: data.name || "",
              website: data.url || "",
            };

            if (data.name) filledFields.push("companyName");
            if (data.url) filledFields.push("website");

            // Auto-fill social links from product data (only when coming from product page)
            if (data.socialLinks) {
              if (data.socialLinks.discord) {
                updates.discord = data.socialLinks.discord;
                filledFields.push("discord");
              }
              if (data.socialLinks.twitter) {
                updates.twitter = data.socialLinks.twitter;
                filledFields.push("twitter");
              }
              if (data.socialLinks.telegram) {
                updates.telegram = data.socialLinks.telegram;
                filledFields.push("telegram");
              }
            }

            setAutoFilledFields(filledFields);
            setFormData((prev) => ({
              ...prev,
              ...updates,
            }));
          }
        })
        .catch(() => {});
    }
  }, [productSlug]);

  const [error, setError] = useState("");

  // Generate DNS verification token
  const generateDnsToken = async () => {
    if (!formData.website) {
      setError("Please enter your website URL first");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const response = await fetch("/api/claim/dns-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: formData.website }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate verification token");
      }

      setDnsVerification({
        token: data.token,
        domain: data.domain,
        verified: false,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  // Verify DNS TXT record
  const verifyDns = async () => {
    if (!dnsVerification?.token) return;

    setVerifying(true);
    setError("");

    try {
      const response = await fetch("/api/claim/verify-dns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: dnsVerification.domain,
          token: dnsVerification.token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "DNS verification failed");
      }

      if (data.verified) {
        setDnsVerification(prev => ({ ...prev, verified: true }));
      } else {
        setError("DNS record not found. Please make sure you added the TXT record correctly and wait a few minutes for DNS propagation.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!captchaToken) {
      setError("Please complete the CAPTCHA verification");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          captchaToken,
          dnsVerified: dnsVerification?.verified || false,
          dnsToken: dnsVerification?.token || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Submission error:", err);
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-2">Request Submitted!</h1>
          <p className="text-base-content/70 mb-6">
            We&apos;ll review your claim and get back to you within 2-3 business days.
          </p>
          <Link href={productSlug ? `/products/${productSlug}` : "/"} className="btn btn-primary">
            {productSlug ? "Back to Product" : "Back to Home"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="bg-base-200 border-b border-base-300">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold">Claim Your Product</h1>
              <p className="text-base-content/70">Verify ownership and manage your listing</p>
            </div>
          </div>

          {productInfo && (
            <div className="mt-6 p-4 bg-base-300/50 rounded-lg flex items-center gap-4">
              <div className="w-12 h-12 bg-base-300 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🔐</span>
              </div>
              <div>
                <div className="font-semibold">{productInfo.name}</div>
                <div className="text-sm text-base-content/60">{productInfo.url}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Benefits */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold mb-4">Benefits of Claiming Your Product</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-base-200 rounded-lg">
            <div className="text-2xl mb-2">✓</div>
            <div className="font-medium">Verified Badge</div>
            <div className="text-sm text-base-content/60">Show users your listing is official</div>
          </div>
          <div className="p-4 bg-base-200 rounded-lg">
            <div className="text-2xl mb-2">🔗</div>
            <div className="font-medium">Update Links</div>
            <div className="text-sm text-base-content/60">Add Discord, Twitter, Telegram & more</div>
          </div>
          <div className="p-4 bg-base-200 rounded-lg">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-medium">Analytics Access</div>
            <div className="text-sm text-base-content/60">See how users interact with your listing</div>
          </div>
        </div>

        {/* Processing time notice */}
        <div className="alert bg-base-200 border border-base-300 mb-8">
          <svg className="w-5 h-5 text-info shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="font-medium">Verification takes time</div>
            <div className="text-sm text-base-content/60">
              Our team manually reviews each request to ensure authenticity. We aim to validate all requests within 5-10 business days. Thank you for your patience!
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-base-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Company Information</h3>
              {productSlug && autoFilledFields.some(f => ["companyName", "website"].includes(f)) && (
                <span className="badge badge-success badge-sm gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Auto-filled from listing
                </span>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Product/Company Name *</span>
                </label>
                <input
                  type="text"
                  className={`input input-bordered ${autoFilledFields.includes("companyName") ? "input-success" : ""}`}
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Official Website *</span>
                </label>
                <input
                  type="url"
                  className={`input input-bordered ${autoFilledFields.includes("website") ? "input-success" : ""}`}
                  placeholder="https://"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-base-200 rounded-xl p-6">
            <h3 className="font-semibold mb-4">Contact Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Your Name *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  required
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Professional Email *</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/50">Use your company email for faster verification</span>
                </label>
              </div>
              <div className="form-control md:col-span-2">
                <label className="label">
                  <span className="label-text">Your Role *</span>
                </label>
                <select
                  className="select select-bordered"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                >
                  <option value="">Select your role</option>
                  <option value="founder">Founder / Co-Founder</option>
                  <option value="ceo">CEO / Executive</option>
                  <option value="marketing">Marketing / PR</option>
                  <option value="developer">Developer / CTO</option>
                  <option value="community">Community Manager</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-base-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Social Links (Optional)</h3>
              {autoFilledFields.some(f => ["discord", "twitter", "telegram"].includes(f)) && (
                <span className="badge badge-success badge-sm gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Auto-filled from listing
                </span>
              )}
            </div>
            <p className="text-sm text-base-content/60 mb-4">
              {productSlug && autoFilledFields.some(f => ["discord", "twitter", "telegram"].includes(f))
                ? "Links pre-filled from your product listing. Update if needed."
                : "Provide your official social links to be added to your listing"
              }
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.373-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.121.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                    </svg>
                    Discord
                  </span>
                </label>
                <input
                  type="url"
                  className={`input input-bordered input-sm ${autoFilledFields.includes("discord") ? "input-success" : ""}`}
                  placeholder="https://discord.gg/..."
                  value={formData.discord}
                  onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text flex items-center gap-2">
                    <svg className="w-4 h-4 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Twitter
                  </span>
                </label>
                <input
                  type="url"
                  className={`input input-bordered input-sm ${autoFilledFields.includes("twitter") ? "input-success" : ""}`}
                  placeholder="https://twitter.com/..."
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                    Telegram
                  </span>
                </label>
                <input
                  type="url"
                  className={`input input-bordered input-sm ${autoFilledFields.includes("telegram") ? "input-success" : ""}`}
                  placeholder="https://t.me/..."
                  value={formData.telegram}
                  onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="bg-base-200 rounded-xl p-6">
            <h3 className="font-semibold mb-4">Additional Information</h3>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Message (Optional)</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                placeholder="Any additional information to help verify your ownership..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>
          </div>

          {/* DNS Verification Section */}
          <div className="bg-base-200 rounded-xl p-6">
            <h3 className="font-semibold mb-2">Domain Ownership Verification</h3>
            <p className="text-sm text-base-content/60 mb-4">
              Prove you control the domain by adding a DNS TXT record. This is anonymous and doesn&apos;t require any personal data.
            </p>

            {!dnsVerification ? (
              <button
                type="button"
                onClick={generateDnsToken}
                disabled={verifying || !formData.website}
                className="btn btn-outline btn-sm"
              >
                {verifying ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Generating...
                  </>
                ) : (
                  "Generate Verification Token"
                )}
              </button>
            ) : (
              <div className="space-y-4">
                {dnsVerification.verified ? (
                  <div className="alert alert-success">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Domain verified! You control {dnsVerification.domain}</span>
                  </div>
                ) : (
                  <>
                    <div className="bg-base-300 rounded-lg p-4">
                      <div className="text-sm font-medium mb-2">Add this TXT record to your DNS:</div>
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-base-content/70">Host/Name:</span>
                          <code className="bg-base-100 px-2 py-1 rounded">@</code>
                          <span className="text-base-content/50">or</span>
                          <code className="bg-base-100 px-2 py-1 rounded">{dnsVerification.domain}</code>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-base-content/70 shrink-0">Value:</span>
                          <code className="bg-base-100 px-2 py-1 rounded break-all select-all">
                            safescoring-verify={dnsVerification.token}
                          </code>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={verifyDns}
                        disabled={verifying}
                        className="btn btn-primary btn-sm"
                      >
                        {verifying ? (
                          <>
                            <span className="loading loading-spinner loading-xs"></span>
                            Checking...
                          </>
                        ) : (
                          "Verify DNS Record"
                        )}
                      </button>
                      <span className="text-xs text-base-content/50">
                        DNS changes can take a few minutes to propagate
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {!dnsVerification?.verified && (
              <p className="text-xs text-base-content/50 mt-4">
                This step is optional but speeds up verification. You can still submit without DNS verification.
              </p>
            )}
          </div>

          {/* Captcha Section */}
          <div className="bg-base-200 rounded-xl p-6">
            <h3 className="font-semibold mb-4">Security Verification</h3>
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
              onSuccess={(token) => setCaptchaToken(token)}
              onError={() => setCaptchaToken(null)}
              onExpire={() => setCaptchaToken(null)}
            />
          </div>

          {error && (
            <div className="alert alert-error">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Link href={productSlug ? `/products/${productSlug}` : "/"} className="btn btn-ghost">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary gap-2" disabled={loading}>
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Submit Claim Request
                </>
              )}
            </button>
          </div>
        </form>

        {/* FAQ */}
        <div className="mt-12 pt-8 border-t border-base-300">
          <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="collapse collapse-arrow bg-base-200">
              <input type="radio" name="faq" />
              <div className="collapse-title font-medium">How long does verification take?</div>
              <div className="collapse-content text-sm text-base-content/70">
                <p>We typically verify claims within 2-3 business days. Using a company email (@yourcompany.com) speeds up the process.</p>
              </div>
            </div>
            <div className="collapse collapse-arrow bg-base-200">
              <input type="radio" name="faq" />
              <div className="collapse-title font-medium">What proof of ownership is required?</div>
              <div className="collapse-content text-sm text-base-content/70">
                <p>We verify ownership through: company email domain, website ownership (DNS record or meta tag), or social media verification.</p>
              </div>
            </div>
            <div className="collapse collapse-arrow bg-base-200">
              <input type="radio" name="faq" />
              <div className="collapse-title font-medium">Is this service free?</div>
              <div className="collapse-content text-sm text-base-content/70">
                <p>Basic verification and link updates are free. Premium features like analytics, priority support, and custom badges are available with our Pro plan.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClaimPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    }>
      <ClaimForm />
    </Suspense>
  );
}
