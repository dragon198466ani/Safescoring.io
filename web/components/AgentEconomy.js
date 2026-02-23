import Link from "next/link";

const useCases = [
  {
    title: "Portfolio Manager Agent",
    description: "Checks SAFE scores before allocating funds to DeFi protocols",
    icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    cost: "$0.01/query",
  },
  {
    title: "DeFi Safety Agent",
    description: "Real-time security verification before smart contract interactions",
    icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
    cost: "$0.10/analysis",
  },
  {
    title: "Compliance Bot",
    description: "Batch-verifies security scores for institutional portfolio compliance",
    icon: "M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12",
    cost: "$0.005/product",
  },
];

const AgentEconomy = () => {
  return (
    <section className="py-20 px-6 bg-base-200/30">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium rounded-full bg-primary/10 text-primary">
            Agent Economy
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Trusted by humans <span className="text-primary">and agents</span>
          </h2>
          <p className="text-lg text-base-content/60 max-w-2xl mx-auto">
            AI agents use SafeScoring to verify crypto security before making
            autonomous decisions. Pay per query in USDC. No subscription required.
          </p>
        </div>

        {/* Use Cases */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {useCases.map((uc, i) => (
            <div
              key={i}
              className="p-6 rounded-xl bg-base-100 border border-base-300 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5 text-primary"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={uc.icon}
                    />
                  </svg>
                </div>
                <span className="badge badge-ghost badge-sm">{uc.cost}</span>
              </div>
              <h3 className="font-bold mb-1">{uc.title}</h3>
              <p className="text-sm text-base-content/60">{uc.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/agents" className="btn btn-primary btn-sm">
            Integrate SafeScoring into your agent
          </Link>
        </div>
      </div>
    </section>
  );
};

export default AgentEconomy;
