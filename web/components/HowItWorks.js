"use client";

import Link from "next/link";
import config from "@/config";

const steps = [
  {
    number: "01",
    title: "We Analyze",
    description: `${config.safe.stats.totalNorms}+ security criteria evaluated for each product`,
    details: "Encryption, audits, team track record, user experience, and more.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path d="M11.625 16.5a1.875 1.875 0 100-3.75 1.875 1.875 0 000 3.75z" />
        <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zm6 14.25a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
        <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
      </svg>
    ),
    color: "#22c55e",
  },
  {
    number: "02",
    title: "We Calculate",
    description: "One unified SAFE Score from 0 to 100",
    details: "Security, Adversity, Fidelity, Efficiency - four pillars, one score.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M12.75 3a.75.75 0 01.75-.75 8.25 8.25 0 018.25 8.25.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75V3z" clipRule="evenodd" />
      </svg>
    ),
    color: "#3b82f6",
  },
  {
    number: "03",
    title: "You Decide",
    description: "Compare products and choose with confidence",
    details: "No more guessing. Make informed decisions based on real data.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
      </svg>
    ),
    color: "#8b5cf6",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-12 sm:py-20 px-4 sm:px-6 bg-base-200/30">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-8 sm:mb-16">
          <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 mb-3 sm:mb-4 text-xs sm:text-sm font-medium rounded-full bg-primary/10 text-primary">
            Simple Process
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 sm:mb-4">
            How It Works
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-base-content/60 max-w-2xl mx-auto px-2">
            Understanding crypto security shouldn&apos;t require a PhD. We do the hard work so you don&apos;t have to.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-4 sm:gap-8 md:gap-12">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="relative group"
            >
              {/* Connector line (hidden on mobile, shown on md+) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-base-300 to-transparent" />
              )}

              {/* Card */}
              <div className="relative p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-base-100 border border-base-300 hover:border-primary/30 transition-all duration-300 h-full">
                {/* Step number badge */}
                <div
                  className="absolute -top-2 -left-2 sm:-top-3 sm:-left-3 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow-lg"
                  style={{ backgroundColor: step.color }}
                >
                  {step.number}
                </div>

                {/* Icon */}
                <div
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${step.color}15`, color: step.color }}
                >
                  {step.icon}
                </div>

                {/* Content */}
                <h3 className="text-lg sm:text-xl font-bold mb-1.5 sm:mb-2">{step.title}</h3>
                <p className="text-sm sm:text-base text-base-content/80 font-medium mb-1.5 sm:mb-2">
                  {step.description}
                </p>
                <p className="text-xs sm:text-sm text-base-content/60">
                  {step.details}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-8 sm:mt-12">
          <p className="text-sm sm:text-base text-base-content/60 mb-3 sm:mb-4">
            Want to understand our methodology in detail?
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
            <Link
              href="/methodology"
              className="btn btn-outline btn-primary btn-sm sm:btn-md h-10 sm:h-auto min-h-0 touch-manipulation active:scale-[0.98]"
            >
              View Full Methodology
            </Link>
            <Link
              href="/products"
              className="btn btn-primary btn-sm sm:btn-md h-10 sm:h-auto min-h-0 touch-manipulation active:scale-[0.98]"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
