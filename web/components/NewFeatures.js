import Link from "next/link";

const NewFeatures = () => {
  const features = [
    {
      title: "Interactive World Map",
      description: "Explore 30+ verified physical crypto incidents with GPS coordinates, product headquarters, and security hacks mapped globally.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      ),
      href: "/map",
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-500/10 to-cyan-500/10",
      stats: [
        { label: "Physical Incidents", value: "30+" },
        { label: "Countries", value: "20+" },
        { label: "Verified Sources", value: "100%" }
      ]
    },
    {
      title: "Stack Builder & Compliance",
      description: "Check if your crypto stack is legal in your country. Get instant compliance reports with 50+ countries and 100+ verified regulations.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
      href: "/stack-builder",
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-500/10 to-pink-500/10",
      stats: [
        { label: "Countries", value: "50+" },
        { label: "Crypto Laws", value: "100+" },
        { label: "Official Links", value: "40+" }
      ]
    }
  ];

  return (
    <section className="py-12 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-base-100 to-base-200">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-8 sm:mb-16">
          <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 mb-3 sm:mb-4 text-xs sm:text-sm font-medium rounded-full bg-primary/10 text-primary">
            New Features
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-3 sm:mb-4">
            Explore Crypto Security <span className="text-gradient-safe">Intelligence</span>
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-base-content/60 max-w-2xl mx-auto px-2">
            Comprehensive data from official sources, verified news outlets, and government regulatory bodies.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
          {features.map((feature, index) => (
            <Link
              key={index}
              href={feature.href}
              className="group relative p-4 sm:p-8 rounded-xl sm:rounded-2xl bg-base-100 border border-base-300 hover:border-opacity-50 transition-all duration-300 overflow-hidden hover:shadow-2xl touch-manipulation active:scale-[0.99]"
            >
              {/* Background gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />

              {/* Glow effect */}
              <div
                className={`absolute -top-20 -right-20 w-40 sm:w-60 h-40 sm:h-60 bg-gradient-to-br ${feature.gradient} rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-300`}
              />

              {/* Content */}
              <div className="relative">
                {/* Icon */}
                <div className={`inline-flex p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br ${feature.gradient} mb-4 sm:mb-6`}>
                  <div className="text-white w-8 h-8 sm:w-12 sm:h-12">
                    {feature.icon}
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm md:text-base text-base-content/70 mb-4 sm:mb-6 line-clamp-3 sm:line-clamp-none">
                  {feature.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                  {feature.stats.map((stat, i) => (
                    <div key={i} className="text-center">
                      <div className={`text-lg sm:text-2xl font-bold bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                        {stat.value}
                      </div>
                      <div className="text-[10px] sm:text-xs text-base-content/60">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="flex items-center gap-2 text-primary font-medium text-sm sm:text-base group-hover:gap-4 transition-all">
                  <span>Explore Now</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>

              {/* "New" badge */}
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] sm:text-xs font-medium border border-green-500/20">
                  <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-green-500"></span>
                  </span>
                  NEW
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Data sources badge */}
        <div className="mt-8 sm:mt-16 text-center">
          <p className="text-xs sm:text-sm text-base-content/50 mb-3 sm:mb-4">Data sources verified from:</p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-base-content/40">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span className="text-xs sm:text-sm">Official Government Sources</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 text-green-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
              </svg>
              <span className="text-xs sm:text-sm">Verified News Outlets</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
              </svg>
              <span className="text-xs sm:text-sm">Regulatory Bodies</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewFeatures;
