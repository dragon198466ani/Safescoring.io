import { Suspense } from "react";
import AnonymousCatalog from "@/components/AnonymousCatalog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";
import {
  LazySwipeVoting,
  LazyCommunityLeaderboard,
  LazyRewardsDashboard,
} from "@/libs/lazy-components";

export const metadata = getSEOTags({
  title: `Community Setups | ${config.appName}`,
  description: "Browse anonymous crypto security setups from the SafeScoring community. Get inspired and see how your stack compares - without revealing anyone's products.",
  canonicalUrlRelative: "/community",
});

export default function CommunityPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-base-100">
        {/* Hero */}
        <section className="py-12 md:py-20 bg-gradient-to-b from-base-200 to-base-100">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
              </svg>
              100% Anonymous
            </div>

            <h1 className="text-4xl md:text-5xl font-black mb-4">
              Community <span className="text-primary">Setups</span>
            </h1>

            <p className="text-lg md:text-xl text-base-content/60 max-w-2xl mx-auto mb-8">
              Compare your security score with the community.
              <br />
              <span className="font-semibold text-base-content">No products revealed. Ever.</span>
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mb-8">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-black text-primary">1,247</div>
                <div className="text-sm text-base-content/60">Anonymous Setups</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-black text-secondary">82</div>
                <div className="text-sm text-base-content/60">Avg Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-black text-accent">4.2</div>
                <div className="text-sm text-base-content/60">Avg Products</div>
              </div>
            </div>

            {/* How it works */}
            <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="p-4 bg-base-200 rounded-xl border border-base-300">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-3">
                  1
                </div>
                <h3 className="font-bold mb-1">Browse Anonymously</h3>
                <p className="text-sm text-base-content/60">
                  See scores, archetypes, and pillar strengths - never specific products.
                </p>
              </div>
              <div className="p-4 bg-base-200 rounded-xl border border-base-300">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-3">
                  2
                </div>
                <h3 className="font-bold mb-1">Compare Scores</h3>
                <p className="text-sm text-base-content/60">
                  See how your setup ranks against the community percentile.
                </p>
              </div>
              <div className="p-4 bg-base-200 rounded-xl border border-base-300">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-3">
                  3
                </div>
                <h3 className="font-bold mb-1">Get Inspired</h3>
                <p className="text-sm text-base-content/60">
                  Learn from high-scoring setups without exposing anyone's security choices.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Catalog */}
        <section className="py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4">
            <Suspense fallback={
              <div className="flex justify-center py-20">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            }>
              <AnonymousCatalog />
            </Suspense>
          </div>
        </section>

        {/* Community Voting Section */}
        <section className="py-12 md:py-16 bg-gradient-to-b from-base-100 to-base-200/50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400 rounded-full text-sm font-medium mb-4">
                <span>🗳️</span> Vote & Earn $SAFE
              </div>
              <h2 className="text-3xl font-bold mb-2">
                Community <span className="text-amber-400">Verification</span>
              </h2>
              <p className="text-base-content/60 max-w-2xl mx-auto">
                Help verify AI evaluations and earn $SAFE tokens. Challenge incorrect assessments
                and get rewarded when you're right!
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Voting Panel */}
              <div className="lg:col-span-2">
                <Suspense fallback={
                  <div className="space-y-3 animate-pulse">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-32 bg-base-200 rounded-lg"></div>
                    ))}
                  </div>
                }>
                  <LazySwipeVoting maxItems={10} />
                </Suspense>
              </div>

              {/* Sidebar: Leaderboard & Rewards */}
              <div className="space-y-6">
                <Suspense fallback={
                  <div className="h-64 bg-base-200 rounded-lg animate-pulse"></div>
                }>
                  <LazyCommunityLeaderboard limit={5} compact />
                </Suspense>

                <Suspense fallback={
                  <div className="h-48 bg-base-200 rounded-lg animate-pulse"></div>
                }>
                  <LazyRewardsDashboard compact />
                </Suspense>
              </div>
            </div>
          </div>
        </section>

        {/* Why anonymous? */}
        <section className="py-12 md:py-16 bg-base-200/50">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8">
              Why Anonymous Sharing?
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-base-100 rounded-xl border border-base-300">
                <div className="text-3xl mb-4">🛡️</div>
                <h3 className="font-bold mb-2">Security Through Obscurity</h3>
                <p className="text-sm text-base-content/70">
                  Revealing your exact crypto setup is a security risk. Attackers can tailor
                  their approach based on your tools. Anonymous sharing lets you participate
                  without exposure.
                </p>
              </div>

              <div className="p-6 bg-base-100 rounded-xl border border-base-300">
                <div className="text-3xl mb-4">🎯</div>
                <h3 className="font-bold mb-2">Focus on What Matters</h3>
                <p className="text-sm text-base-content/70">
                  Scores and archetypes tell the story. You don't need to know someone uses
                  "Ledger + Metamask" - you need to know their security approach is solid.
                </p>
              </div>

              <div className="p-6 bg-base-100 rounded-xl border border-base-300">
                <div className="text-3xl mb-4">🏆</div>
                <h3 className="font-bold mb-2">Healthy Competition</h3>
                <p className="text-sm text-base-content/70">
                  Challenge friends to beat your score without revealing your strategy.
                  It's like poker - you show your hand strength, not your cards.
                </p>
              </div>

              <div className="p-6 bg-base-100 rounded-xl border border-base-300">
                <div className="text-3xl mb-4">📈</div>
                <h3 className="font-bold mb-2">Community Benchmarks</h3>
                <p className="text-sm text-base-content/70">
                  See where you stand against the community. Are you in the top 10%?
                  Do "Hardware Maximalists" score higher than "DeFi Natives"?
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Weekly Challenge */}
        <section className="py-12 md:py-16 bg-gradient-to-r from-primary/10 to-secondary/10">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary text-primary-content rounded-full text-sm font-bold mb-4">
                <span className="animate-pulse">●</span> WEEKLY CHALLENGE
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                Beat the Community Average
              </h2>
              <p className="text-base-content/60">
                Can you create a setup that scores above 85? Top scorers get featured!
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-6 bg-base-100 rounded-xl border border-base-300 text-center">
                <div className="text-4xl mb-2">🥇</div>
                <div className="text-2xl font-black text-primary">92</div>
                <div className="text-sm text-base-content/60">Weekly High Score</div>
              </div>
              <div className="p-6 bg-base-100 rounded-xl border border-base-300 text-center">
                <div className="text-4xl mb-2">📊</div>
                <div className="text-2xl font-black">82</div>
                <div className="text-sm text-base-content/60">Community Average</div>
              </div>
              <div className="p-6 bg-base-100 rounded-xl border border-base-300 text-center">
                <div className="text-4xl mb-2">🎯</div>
                <div className="text-2xl font-black text-secondary">85+</div>
                <div className="text-sm text-base-content/60">Challenge Target</div>
              </div>
            </div>

            <div className="text-center mt-6">
              <a href="/dashboard/setups" className="btn btn-primary">
                Build Your Setup
              </a>
            </div>
          </div>
        </section>

        {/* Viral Share Section */}
        <section className="py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8">
              Share & Compare
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Share Card */}
              <div className="p-6 bg-base-200 rounded-xl">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <span className="text-2xl">📲</span>
                  Challenge a Friend
                </h3>
                <p className="text-sm text-base-content/70 mb-4">
                  Share your anonymous score link and challenge friends to beat it.
                  No products revealed - just the score to beat.
                </p>
                <div className="bg-base-300 rounded-lg p-3 font-mono text-sm mb-4 overflow-hidden">
                  safescoring.io/c/abc123
                </div>
                <button className="btn btn-primary btn-sm">
                  Get Your Share Link
                </button>
              </div>

              {/* Social Proof */}
              <div className="p-6 bg-base-200 rounded-xl">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  Hall of Fame
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-2 bg-base-100 rounded-lg">
                    <span className="text-xl">🥇</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Security Maximalist</div>
                      <div className="text-xs text-base-content/60">Score: 96 · 5 products</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-base-100 rounded-lg">
                    <span className="text-xl">🥈</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">DeFi Native</div>
                      <div className="text-xs text-base-content/60">Score: 94 · 7 products</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-base-100 rounded-lg">
                    <span className="text-xl">🥉</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Hardware First</div>
                      <div className="text-xs text-base-content/60">Score: 93 · 3 products</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Archetype Distribution */}
        <section className="py-12 md:py-16 bg-base-200/50">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8">
              Community Archetypes
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 bg-base-100 rounded-xl text-center">
                <div className="text-3xl mb-2">🔒</div>
                <div className="font-bold">Hardware First</div>
                <div className="text-2xl font-black text-primary">34%</div>
                <div className="text-xs text-base-content/60">Avg: 86</div>
              </div>
              <div className="p-4 bg-base-100 rounded-xl text-center">
                <div className="text-3xl mb-2">🌐</div>
                <div className="font-bold">DeFi Native</div>
                <div className="text-2xl font-black text-secondary">28%</div>
                <div className="text-xs text-base-content/60">Avg: 72</div>
              </div>
              <div className="p-4 bg-base-100 rounded-xl text-center">
                <div className="text-3xl mb-2">🏦</div>
                <div className="font-bold">CEX Focused</div>
                <div className="text-2xl font-black text-accent">22%</div>
                <div className="text-xs text-base-content/60">Avg: 68</div>
              </div>
              <div className="p-4 bg-base-100 rounded-xl text-center">
                <div className="text-3xl mb-2">⚖️</div>
                <div className="font-bold">Balanced</div>
                <div className="text-2xl font-black">16%</div>
                <div className="text-xs text-base-content/60">Avg: 78</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 md:py-16">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Join?
            </h2>
            <p className="text-base-content/60 mb-6">
              Create your setup, see your score, and share it anonymously with the community.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/dashboard/setups"
                className="btn btn-primary btn-lg"
              >
                Analyze My Stack
              </a>
              <a
                href="/community"
                className="btn btn-outline btn-lg"
              >
                Explore Community
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
