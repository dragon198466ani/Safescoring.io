"use client";

import { useGlobalStats } from "@/libs/StatsProvider";

const WhySafeScoring = () => {
  const { stats } = useGlobalStats();

  const reasons = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
      ),
      title: `${stats.totalNorms}+ security norms`,
      description: "Years of research distilled into the most comprehensive crypto security framework. Each norm is sourced, documented, and weighted.",
      color: "text-base-content/70",
      bgColor: "bg-base-200",
      borderColor: "border-base-300",
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      ),
      title: `${stats.totalProducts}+ products evaluated`,
      description: "Every product scored against the same rigorous methodology. Not opinions — reproducible, AI-powered evaluations updated monthly.",
      color: "text-base-content/70",
      bgColor: "bg-base-200",
      borderColor: "border-base-300",
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      ),
      title: "Patented SAFE methodology",
      description: "Security, Adversity, Fidelity, Efficiency — 4 pillars covering what audits miss: physical threats, track record, and real-world usability.",
      color: "text-base-content/70",
      bgColor: "bg-base-200",
      borderColor: "border-base-300",
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
      title: "Community-verified",
      description: "Thousands of community votes validate AI evaluations. Crowd wisdom + AI rigor = scores you can trust.",
      color: "text-base-content/70",
      bgColor: "bg-base-200",
      borderColor: "border-base-300",
    },
  ];

  return (
    <section className="py-24 px-6" id="why-safescoring">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium rounded-full bg-base-content/10 text-base-content/70">
            Why SafeScoring?
          </span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            You can&apos;t vibe-code{" "}
            <span className="text-gradient-safe">years of security research</span>
          </h2>
          <p className="text-lg text-base-content/60 max-w-2xl mx-auto">
            Anyone can build a dashboard in a weekend. Nobody can replicate {stats.totalNorms}+ security norms,
            {" "}{stats.totalProducts}+ evaluated products, and a patented methodology with a single prompt.
          </p>
        </div>

        {/* The "moat" visualization */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {reasons.map((reason, index) => (
            <div
              key={index}
              className={`relative p-6 rounded-2xl ${reason.bgColor} border ${reason.borderColor} hover:scale-[1.02] transition-transform duration-300`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${reason.bgColor} ${reason.color} flex-shrink-0`}>
                  {reason.icon}
                </div>
                <div>
                  <h3 className={`text-xl font-bold mb-2 ${reason.color}`}>
                    {reason.title}
                  </h3>
                  <p className="text-base-content/70 text-sm leading-relaxed">
                    {reason.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Anti-SaaS-bloat message */}
        <div className="relative rounded-2xl p-8 md:p-12 overflow-hidden bg-base-200 border border-base-300">
          {/* Glow blob removed for monochrome design */}
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-4">
                Not another bloated SaaS
              </h3>
              <p className="text-base-content/60 mb-6 leading-relaxed">
                We do <span className="text-white font-bold">one thing</span> and we do it better than anyone:
                rate the real-world security of every crypto product with a single, comparable score.
              </p>
              <p className="text-base-content/60 leading-relaxed">
                No unnecessary AI features. No template gallery. No email builder.
                Just <span className="text-white font-bold">the data you need</span> to
                protect your crypto — available via web, API, SDK, and embeddable widgets.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { label: "Single feature, done right", desc: "Security scoring. That's it." },
                { label: "API-first architecture", desc: "Consume our data in your own tools." },
                { label: "Pay for value, not seats", desc: "Free tier included. No per-user pricing." },
                { label: "Your data stays yours", desc: "Export everything. No vendor lock-in." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-base-content/50 flex-shrink-0 mt-0.5">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <span className="font-semibold text-base-content">{item.label}</span>
                    <span className="text-base-content/50 text-sm ml-2">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhySafeScoring;
