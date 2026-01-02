import Link from "next/link";
import config from "@/config";

const Hero = () => {
  return (
    <section className="max-w-7xl mx-auto bg-base-100 flex flex-col items-center justify-center gap-10 px-8 py-12 lg:py-20">
      <div className="flex flex-col gap-8 items-center justify-center text-center max-w-4xl">
        {/* Tagline badge */}
        <div className="badge badge-lg badge-outline gap-2 py-4 px-6">
          <span className="text-primary font-bold">{config.safe.stats.totalNorms}</span> norms
          <span className="opacity-50">•</span>
          <span>0 opinion</span>
          <span className="opacity-50">•</span>
          <span className="font-semibold">1 score</span>
        </div>

        <h1 className="font-extrabold text-4xl lg:text-6xl tracking-tight">
          The first unified security rating
          <br />
          <span className="text-primary">for all crypto products</span>
        </h1>

        <p className="text-lg lg:text-xl opacity-80 leading-relaxed max-w-2xl">
          Hardware wallets, software wallets, exchanges, and DeFi protocols — all evaluated
          with the same rigorous <span className="font-semibold">SAFE methodology</span>.
          No opinions. No sponsors. Just data.
        </p>

        {/* SAFE pillars mini preview */}
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {config.safe.pillars.map((pillar) => (
            <div
              key={pillar.code}
              className="flex items-center gap-2 bg-base-200 rounded-full px-4 py-2"
            >
              <span
                className="font-bold text-lg"
                style={{ color: pillar.color }}
              >
                {pillar.code}
              </span>
              <span className="text-sm opacity-70">{pillar.name}</span>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Link href="/products" className="btn btn-primary btn-lg">
            Browse Scores
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link href="/compare" className="btn btn-outline btn-lg">
            Compare Products
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap justify-center gap-8 mt-8 pt-8 border-t border-base-300">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{config.safe.stats.totalProducts}+</div>
            <div className="text-sm opacity-60">Products Rated</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{config.safe.stats.totalNorms}</div>
            <div className="text-sm opacity-60">Security Norms</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{config.safe.stats.totalProductTypes}</div>
            <div className="text-sm opacity-60">Product Types</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
