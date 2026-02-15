import Link from "next/link";
import config from "@/config";

const Hero = () => {
  return (
    <section className="max-w-7xl mx-auto bg-base-100 flex flex-col items-center justify-center gap-10 px-8 py-12 lg:py-20">
      <div className="flex flex-col gap-8 items-center justify-center text-center max-w-4xl">
        {/* Physical threat awareness banner */}
        <div className="w-full max-w-2xl bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-3 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0 text-amber-500">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-left">
            <span className="font-semibold text-amber-500">Crypto kidnappings are surging.</span>{" "}
            <span className="opacity-80">Your wallet&apos;s anti-coercion features could save your life. We rate them.</span>
          </p>
        </div>

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
