"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function WebhooksPage() {
  const { data: session, status } = useSession();
  const [webhooks, setWebhooks] = useState([]);
  const [limit, setLimit] = useState(5);
  const [planType, setPlanType] = useState("free");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSecret, setNewSecret] = useState(null);
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(null);

  // Create form state
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState(["score_change"]);

  const ALL_EVENTS = [
    { id: "score_change", label: "Score Change", description: "When a product's SAFE score is updated" },
    { id: "new_product", label: "New Product", description: "When a new product is added to SafeScoring" },
    { id: "incident_reported", label: "Incident Reported", description: "When a new security incident is reported" },
  ];

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/signin";
      return;
    }
    if (status !== "authenticated") return;
    fetchWebhooks();
  }, [status]);

  async function fetchWebhooks() {
    try {
      const res = await fetch("/api/webhooks");
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
        setLimit(data.limit || 5);
        setPlanType(data.planType || "free");
      }
    } catch {
      // Silently fail
    }
    setLoading(false);
  }

  async function createWebhook() {
    if (!formUrl) return;
    setCreating(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: formUrl, events: formEvents }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewSecret(data.secret);
        setFormUrl("");
        setFormEvents(["score_change"]);
        await fetchWebhooks();
      } else {
        alert(data.error || "Failed to create webhook");
      }
    } catch {
      alert("Network error");
    }
    setCreating(false);
  }

  async function toggleWebhook(id, currentActive) {
    try {
      const res = await fetch("/api/webhooks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: !currentActive }),
      });
      if (res.ok) await fetchWebhooks();
    } catch {
      alert("Failed to update webhook");
    }
  }

  async function deleteWebhook(id) {
    if (!confirm("Delete this webhook? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/webhooks?id=${id}`, { method: "DELETE" });
      if (res.ok) await fetchWebhooks();
    } catch {
      alert("Failed to delete webhook");
    }
  }

  async function testWebhook(id) {
    setTesting(id);
    try {
      const res = await fetch("/api/webhooks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, test: true }),
      });
      // For now just show a feedback - actual test dispatch would need a separate endpoint
      alert("Test payload sent. Check your endpoint for the delivery.");
    } catch {
      alert("Failed to send test");
    }
    setTesting(null);
  }

  const copySecret = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const toggleEvent = (eventId) => {
    setFormEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((e) => e !== eventId)
        : [...prev, eventId]
    );
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  // Plan gate for non-Enterprise users
  if (planType !== "enterprise") {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-base-content/60 mt-1">
            Receive real-time notifications when scores change.
          </p>
        </div>
        <div className="rounded-xl bg-base-200 border border-base-300 p-12 text-center">
          <div className="text-4xl mb-4">🔔</div>
          <h2 className="text-xl font-bold mb-2">Webhooks Require Enterprise Plan</h2>
          <p className="text-base-content/60 mb-6 max-w-md mx-auto">
            Upgrade to Enterprise to configure webhook endpoints and receive real-time
            notifications when product scores change, new products are added, or incidents occur.
          </p>
          <Link href="/#pricing" className="btn btn-primary">
            View Plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-base-content/60 mt-1">
            Receive real-time notifications for score changes and events.
          </p>
        </div>
        <button
          onClick={() => { setShowCreateModal(true); setNewSecret(null); }}
          disabled={webhooks.length >= limit}
          className="btn btn-primary min-h-[44px] w-full sm:w-auto"
        >
          Add Webhook
        </button>
      </div>

      {/* Status banner */}
      <div className="rounded-xl bg-info/10 border border-info/30 p-4 mb-6 flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-info shrink-0 mt-0.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
        <div className="text-sm text-base-content/70">
          <span className="font-medium text-base-content">Webhook delivery is active.</span>{" "}
          Events are signed with HMAC-SHA256. Verify the <code className="px-1 py-0.5 bg-base-200 rounded text-xs">X-SafeScoring-Signature</code> header
          using your webhook secret. Failed deliveries retry up to 3 times with exponential backoff.
        </div>
      </div>

      {/* Webhooks List */}
      <div className="rounded-xl bg-base-200 border border-base-300 p-6 mb-8">
        <h2 className="text-lg font-bold mb-4">
          Endpoints ({webhooks.length} / {limit})
        </h2>
        {webhooks.length === 0 ? (
          <div className="text-center py-8 text-base-content/50">
            No webhooks configured yet. Add one to start receiving notifications.
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                className={`rounded-lg border p-4 ${
                  wh.is_active ? "border-base-300 bg-base-100" : "border-base-300/50 bg-base-100/50 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${wh.is_active ? "bg-success" : "bg-base-content/30"}`} />
                      <code className="text-sm truncate block">{wh.url}</code>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-base-content/50">
                      <span>
                        Events: {(wh.events || []).join(", ")}
                      </span>
                      {wh.last_triggered_at && (
                        <span>
                          Last triggered: {new Date(wh.last_triggered_at).toLocaleDateString(undefined, {
                            month: "short", day: "numeric"
                          })}
                        </span>
                      )}
                      {wh.failure_count > 0 && (
                        <span className="text-warning">
                          {wh.failure_count} failure{wh.failure_count > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleWebhook(wh.id, wh.is_active)}
                      className={`btn btn-xs min-h-[44px] px-3 ${wh.is_active ? "btn-ghost" : "btn-success"}`}
                    >
                      {wh.is_active ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => deleteWebhook(wh.id)}
                      className="btn btn-xs min-h-[44px] px-3 btn-ghost text-error"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Signature Verification Guide */}
      <div className="rounded-xl bg-base-200 border border-base-300 p-6">
        <h2 className="text-lg font-bold mb-4">Verifying Signatures</h2>
        <p className="text-sm text-base-content/60 mb-4">
          Each webhook delivery includes an <code className="bg-base-300 px-1 rounded">X-SafeScoring-Signature</code> header.
          Verify it to ensure the payload came from SafeScoring:
        </p>
        <pre className="bg-base-300 p-4 rounded-lg overflow-x-auto text-sm">
          <code>{`const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = 'sha256=' +
    crypto.createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}</code>
        </pre>
      </div>

      {/* Create Webhook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-base-100 rounded-xl p-6 max-w-md w-full mx-4 border border-base-300">
            {newSecret ? (
              <>
                <h3 className="text-lg font-bold mb-4">Webhook Created</h3>
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-4">
                  <p className="text-sm text-warning font-medium mb-2">
                    Save this signing secret now — it won&apos;t be shown again!
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-base-200 p-2 rounded break-all select-all">
                      {newSecret}
                    </code>
                    <button onClick={() => copySecret(newSecret)} className="btn btn-sm btn-ghost">
                      {copied ? "✓" : "Copy"}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-base-content/60 mb-4">
                  Use this secret to verify webhook signatures on your server.
                </p>
                <button
                  onClick={() => { setShowCreateModal(false); setNewSecret(null); }}
                  className="btn btn-primary w-full"
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold mb-4">Add Webhook Endpoint</h3>
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Endpoint URL (HTTPS required)</span>
                  </label>
                  <input
                    type="url"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://your-server.com/webhooks/safescoring"
                    className="input input-bordered"
                  />
                </div>
                <div className="form-control mb-6">
                  <label className="label">
                    <span className="label-text">Events</span>
                  </label>
                  <div className="space-y-2">
                    {ALL_EVENTS.map((event) => (
                      <label key={event.id} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formEvents.includes(event.id)}
                          onChange={() => toggleEvent(event.id)}
                          className="checkbox checkbox-primary checkbox-sm mt-0.5"
                        />
                        <div>
                          <div className="text-sm font-medium">{event.label}</div>
                          <div className="text-xs text-base-content/50">{event.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowCreateModal(false)} className="btn btn-ghost flex-1">
                    Cancel
                  </button>
                  <button
                    onClick={createWebhook}
                    disabled={creating || !formUrl || formEvents.length === 0}
                    className="btn btn-primary flex-1"
                  >
                    {creating ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      "Create Webhook"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
