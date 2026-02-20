"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getScoreColor, getChangeIndicator } from "@/libs/design-tokens";

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(5);
  const [canAdd, setCanAdd] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/watchlist");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch watchlist");
      }

      setWatchlist(data.watchlist || []);
      setLimit(data.limit);
      setCanAdd(data.canAdd);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    if (!confirm("Remove this product from your watchlist?")) return;

    try {
      const res = await fetch(`/api/user/watchlist?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove");
      }

      setWatchlist(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      alertOnChange: item.alerts.enabled,
      alertThreshold: item.alerts.threshold,
      alertEmail: item.alerts.email,
      notes: item.notes || "",
    });
  };

  const handleSaveEdit = async () => {
    try {
      const res = await fetch("/api/user/watchlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          ...editForm,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      // Update local state
      setWatchlist(prev => prev.map(w => {
        if (w.id === editingId) {
          return {
            ...w,
            alerts: {
              ...w.alerts,
              enabled: editForm.alertOnChange,
              threshold: editForm.alertThreshold,
              email: editForm.alertEmail,
            },
            notes: editForm.notes,
          };
        }
        return w;
      }));

      setEditingId(null);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Watchlist</h1>
          <p className="text-base-content/60 text-sm mt-1">
            Track your favorite products and get notified when scores change
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-base-content/60">
            {watchlist.length} / {limit === -1 ? "unlimited" : limit}
          </span>
          <Link href="/products" className="btn btn-primary h-10 min-h-0 gap-2 touch-manipulation active:scale-[0.97] transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Products
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {watchlist.length === 0 ? (
        <div className="rounded-2xl bg-base-200 border border-base-300 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-2">No products in your watchlist</h3>
          <p className="text-base-content/60 mb-6 max-w-md mx-auto">
            Add products to your watchlist to track their security scores and receive alerts when they change.
          </p>
          <Link href="/products" className="btn btn-primary h-12 min-h-0 px-6 touch-manipulation active:scale-[0.97] transition-transform">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {watchlist.map((item) => {
            const change = item.scores.change;
            const changeIndicator = change !== null ? getChangeIndicator(change) : null;
            const isEditing = editingId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-xl bg-base-200 border border-base-300 p-4 hover:border-primary/30 transition-colors"
              >
                {isEditing ? (
                  /* Edit mode */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{item.product.name}</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="btn btn-ghost h-10 min-h-0 touch-manipulation active:scale-[0.97] transition-transform"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="btn btn-primary h-10 min-h-0 touch-manipulation active:scale-[0.97] transition-transform"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="form-control">
                        <label className="label cursor-pointer justify-start gap-3">
                          <input
                            type="checkbox"
                            checked={editForm.alertOnChange}
                            onChange={(e) => setEditForm(f => ({ ...f, alertOnChange: e.target.checked }))}
                            className="checkbox checkbox-primary checkbox-sm"
                          />
                          <span className="label-text">Alert on score change</span>
                        </label>
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text text-xs">Alert threshold (points)</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={editForm.alertThreshold}
                          onChange={(e) => setEditForm(f => ({ ...f, alertThreshold: parseInt(e.target.value) || 5 }))}
                          className="input input-bordered input-sm w-24"
                        />
                      </div>

                      <div className="form-control sm:col-span-2">
                        <label className="label">
                          <span className="label-text text-xs">Notes (optional)</span>
                        </label>
                        <textarea
                          value={editForm.notes}
                          onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                          className="textarea textarea-bordered textarea-sm h-20"
                          placeholder="Add personal notes about this product..."
                          maxLength={500}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-lg bg-base-300 flex items-center justify-center font-bold text-primary shrink-0">
                          {item.product.name?.charAt(0) || "?"}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/products/${item.product.slug}`}
                            className="font-semibold hover:text-primary transition-colors line-clamp-1"
                          >
                            {item.product.name}
                          </Link>
                          <div className="text-xs text-base-content/50">
                            {item.product.type}
                          </div>
                        </div>
                      </div>
                      {item.notes && (
                        <p className="text-xs text-base-content/60 mt-2 line-clamp-2 pl-13">
                          {item.notes}
                        </p>
                      )}
                    </div>

                    {/* Scores */}
                    <div className="flex items-center gap-6">
                      {/* Current score */}
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(item.scores.current || 0)}`}>
                          {item.scores.current ?? "-"}
                        </div>
                        <div className="text-xs text-base-content/50">Current</div>
                      </div>

                      {/* Change indicator */}
                      {changeIndicator && change !== 0 && (
                        <div className="text-center">
                          <div className={`text-lg font-semibold ${changeIndicator.color}`}>
                            {changeIndicator.icon} {Math.abs(change)}
                          </div>
                          <div className="text-xs text-base-content/50">Change</div>
                        </div>
                      )}

                      {/* SAFE mini bars */}
                      <div className="hidden md:flex items-end gap-1 h-8">
                        {["s", "a", "f", "e"].map((pillar) => {
                          const value = item.scores[pillar];
                          return (
                            <div
                              key={pillar}
                              className="w-2 bg-base-300 rounded-t"
                              style={{ height: `${Math.max(4, (value || 0) * 0.32)}px` }}
                              title={`${pillar.toUpperCase()}: ${value ?? "-"}`}
                            >
                              <div
                                className={`w-full rounded-t ${
                                  pillar === "s" ? "bg-green-500" :
                                  pillar === "a" ? "bg-amber-500" :
                                  pillar === "f" ? "bg-blue-500" : "bg-violet-500"
                                }`}
                                style={{ height: "100%" }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Alert status */}
                      <div className="flex items-center gap-1">
                        {item.alerts.enabled ? (
                          <div className="tooltip" data-tip={`Alert if change > ${item.alerts.threshold} pts`}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-500">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                            </svg>
                          </div>
                        ) : (
                          <div className="tooltip" data-tip="Alerts disabled">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-base-content/30">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 003.844.148m-3.844-.148a23.856 23.856 0 01-5.455-1.31 8.964 8.964 0 002.3-5.542m3.155 6.852a3 3 0 005.667 1.97m1.965-2.277L21 21m-4.225-4.225a23.81 23.81 0 003.536-1.003A8.967 8.967 0 0118 9.75V9A6 6 0 006.53 6.53m10.245 10.245L6.53 6.53M3 3l3.53 3.53" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="btn btn-ghost btn-sm btn-square"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="btn btn-ghost btn-sm btn-square text-error"
                          title="Remove"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upgrade prompt if at limit */}
      {!canAdd && (
        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="font-bold">Watchlist full</h3>
            <p className="text-sm">Upgrade your plan to track more products.</p>
          </div>
          <Link href="/#pricing" className="btn btn-sm">
            Upgrade
          </Link>
        </div>
      )}
    </div>
  );
}
