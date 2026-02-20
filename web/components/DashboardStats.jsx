"use client";

import { useState, useEffect } from "react";
import { useUserSetups } from "@/hooks/useApi";

// Helper: Get demo setups from localStorage
const getDemoSetups = () => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("safescoring_demo_setups");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Helper: Fetch incident count for a product
const fetchProductIncidents = async (slug) => {
  try {
    const res = await fetch(`/api/products/${slug}/incidents?limit=1`);
    if (res.ok) {
      const data = await res.json();
      return data.stats?.totalIncidents || 0;
    }
  } catch {
    // Ignore errors
  }
  return 0;
};

export default function DashboardStats() {
  const [stats, setStats] = useState({
    products: 0,
    setups: 0,
    alerts: 0,
    incidents: 0,
  });

  // Use useApi hook for fetching setups with caching
  const { data: setupsData, isLoading: loading, error } = useUserSetups();

  useEffect(() => {
    if (loading || (!setupsData && !error)) return;

    const fetchStats = async () => {
      try {
        if (setupsData?.limits?.isAnonymous) {
          // Demo mode: get setups from localStorage
          const demoSetups = getDemoSetups();

            // Collect unique products with their slugs
            const uniqueProducts = new Map(); // id -> slug
            demoSetups.forEach(setup => {
              (setup.productDetails || []).forEach(product => {
                if (product.id && product.slug) {
                  uniqueProducts.set(product.id, product.slug);
                }
              });
            });

            // Fetch incidents for user's products (max 10 parallel requests)
            const slugs = Array.from(uniqueProducts.values()).slice(0, 10);
            const incidentCounts = await Promise.all(
              slugs.map(slug => fetchProductIncidents(slug))
            );
            const totalIncidents = incidentCounts.reduce((sum, count) => sum + count, 0);

            setStats({
              products: uniqueProducts.size,
              setups: demoSetups.length,
              alerts: 0, // No alerts in demo mode
              incidents: totalIncidents,
            });
        } else if (setupsData) {
          // Logged-in user: count products from their setups
          const setups = setupsData.setups || [];
            const uniqueProducts = new Map(); // id -> slug
            setups.forEach(setup => {
              (setup.productDetails || []).forEach(product => {
                if (product.id && product.slug) {
                  uniqueProducts.set(product.id, product.slug);
                }
              });
            });

            // Fetch user's alerts
            let alertsCount = 0;
            try {
              const alertsRes = await fetch("/api/user/alerts?count=true");
              if (alertsRes.ok) {
                const alertsData = await alertsRes.json();
                alertsCount = alertsData.count || 0;
              }
            } catch {
              // Ignore alerts fetch error
            }

            // Fetch incidents for user's products (max 10 parallel requests)
            const slugs = Array.from(uniqueProducts.values()).slice(0, 10);
            const incidentCounts = await Promise.all(
              slugs.map(slug => fetchProductIncidents(slug))
            );
            const totalIncidents = incidentCounts.reduce((sum, count) => sum + count, 0);

            setStats({
              products: uniqueProducts.size,
              setups: setups.length,
              alerts: alertsCount,
              incidents: totalIncidents,
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        // Fallback to demo mode
        const demoSetups = getDemoSetups();
        const uniqueProducts = new Map();
        demoSetups.forEach(setup => {
          (setup.productDetails || []).forEach(product => {
            if (product.id && product.slug) {
              uniqueProducts.set(product.id, product.slug);
            }
          });
        });

        // Try to fetch incidents even in fallback mode
        const slugs = Array.from(uniqueProducts.values()).slice(0, 10);
        let totalIncidents = 0;
        try {
          const incidentCounts = await Promise.all(
            slugs.map(slug => fetchProductIncidents(slug))
          );
          totalIncidents = incidentCounts.reduce((sum, count) => sum + count, 0);
        } catch {
          // Ignore
        }

        setStats({
          products: uniqueProducts.size,
          setups: demoSetups.length,
          alerts: 0,
          incidents: totalIncidents,
        });
      }
    };

    fetchStats();
  }, [setupsData, error, loading]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="card-metric animate-pulse">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-base-300"></div>
              <div className="h-3 w-20 bg-base-300 rounded"></div>
            </div>
            <div className="h-8 w-12 bg-base-300 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="card-metric">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
          <span className="text-xs text-base-content/60">Products Tracked</span>
        </div>
        <div className="text-2xl font-bold">{stats.products}</div>
      </div>

      <div className="card-metric">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
            </svg>
          </div>
          <span className="text-xs text-base-content/60">Your Setups</span>
        </div>
        <div className="text-2xl font-bold">{stats.setups}</div>
      </div>

      <div className="card-metric">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <span className="text-xs text-base-content/60">Active Alerts</span>
        </div>
        <div className="text-2xl font-bold">{stats.alerts}</div>
      </div>

      <div className="card-metric">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <span className="text-xs text-base-content/60">Security Incidents</span>
        </div>
        <div className="text-2xl font-bold">{stats.incidents}</div>
      </div>
    </div>
  );
}
