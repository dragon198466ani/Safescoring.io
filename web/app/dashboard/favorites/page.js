"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProductLogo from "@/components/ProductLogo";

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

export default function FavoritesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchFavorites();
    }
  }, [session]);

  const fetchFavorites = async () => {
    try {
      const res = await fetch("/api/favorites");
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites || []);
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
    setLoading(false);
  };

  const removeFavorite = async (productId) => {
    try {
      const res = await fetch(`/api/favorites?productId=${productId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFavorites((prev) => prev.filter((f) => f.productId !== productId));
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Favorites</h1>
        <span className="text-sm text-base-content/60">
          {favorites.length} product{favorites.length !== 1 ? "s" : ""}
        </span>
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-xl bg-base-200 border border-base-300 p-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            className="w-16 h-16 mx-auto mb-4 text-base-content/30"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
          <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
          <p className="text-base-content/60 mb-6">
            Browse products and click the heart icon to save your favorites
            here.
          </p>
          <Link href="/products" className="btn btn-primary btn-sm min-h-[44px]">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="rounded-xl bg-base-200 border border-base-300 p-4 hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-3">
                <ProductLogo
                  logoUrl={fav.logoUrl}
                  name={fav.name}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${fav.slug}`}
                    className="font-medium hover:text-primary transition-colors truncate block"
                  >
                    {fav.name}
                  </Link>
                  <div className="text-xs text-base-content/50">{fav.type}</div>
                </div>
                <span className={`text-xl font-bold ${getScoreColor(fav.score)}`}>
                  {fav.score}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Link
                  href={`/products/${fav.slug}`}
                  className="text-xs text-base-content/50 hover:text-primary transition-colors"
                >
                  View details →
                </Link>
                <button
                  onClick={() => removeFavorite(fav.productId)}
                  className="btn btn-ghost btn-xs min-h-[44px] min-w-[44px] text-base-content/40 hover:text-red-400"
                  title="Remove from favorites"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
