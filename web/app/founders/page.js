"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Liste des fondateurs - À mettre à jour manuellement ou via API
const FOUNDERS = {
  og: [
    // { name: "Satoshi N.", date: "2025-02" },
  ],
  believer: [
    // { name: "Vitalik B.", date: "2025-02" },
  ],
  starter: [
    // { name: "CZ", date: "2025-02" },
  ],
};

export default function FoundersPage() {
  const totalFounders =
    FOUNDERS.og.length + FOUNDERS.believer.length + FOUNDERS.starter.length;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-base-200">
        <div className="max-w-4xl mx-auto px-4 py-16">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              Mur des Fondateurs
            </h1>
            <p className="text-lg text-base-content/70">
              Merci à tous ceux qui ont cru au projet dès le début.
            </p>
            <div className="badge badge-primary badge-lg mt-4">
              {totalFounders} fondateurs
            </div>
          </div>

          {/* OG Founders */}
          {FOUNDERS.og.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <span>👑</span> OG Fondateurs
                <span className="badge badge-warning">Lifetime</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {FOUNDERS.og.map((founder, i) => (
                  <div key={i} className="card bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                    <div className="card-body p-4 text-center">
                      <span className="text-2xl">👑</span>
                      <p className="font-semibold">{founder.name}</p>
                      <p className="text-xs text-base-content/50">{founder.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Believer Founders */}
          {FOUNDERS.believer.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <span>💎</span> Believers
                <span className="badge badge-secondary">1 an</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {FOUNDERS.believer.map((founder, i) => (
                  <div key={i} className="card bg-base-100 border border-primary/20">
                    <div className="card-body p-3 text-center">
                      <span>💎</span>
                      <p className="font-medium text-sm">{founder.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Starter Founders */}
          {FOUNDERS.starter.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <span>🚀</span> Starters
                <span className="badge">4 mois</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                {FOUNDERS.starter.map((founder, i) => (
                  <span key={i} className="badge badge-outline badge-lg">
                    🚀 {founder.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {totalFounders === 0 && (
            <div className="text-center py-16">
              <p className="text-6xl mb-4">🌱</p>
              <h3 className="text-xl font-semibold mb-2">
                Soyez le premier fondateur
              </h3>
              <p className="text-base-content/70 mb-6">
                La campagne de crowdfunding est en cours.
              </p>
              <a href="/crowdfunding" className="btn btn-primary">
                Contribuer maintenant
              </a>
            </div>
          )}

          {/* CTA */}
          {totalFounders > 0 && (
            <div className="text-center mt-12 p-8 bg-base-100 rounded-2xl border border-base-300">
              <h3 className="text-xl font-semibold mb-2">
                Rejoignez les fondateurs
              </h3>
              <p className="text-base-content/70 mb-4">
                La campagne est toujours en cours.
              </p>
              <a href="/crowdfunding" className="btn btn-primary">
                Devenir fondateur
              </a>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
