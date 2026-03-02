"use client";

import { useState } from "react";
import config from "@/config";
import { useGlobalStats } from "@/libs/StatsProvider";

const { hackLosses2024Short, accessControlLossPct, auditedHackedApprox } = config.safe.stats;

const getFaqs = (totalNorms) => [
  {
    question: "What is SAFE Scoring?",
    answer:
      `SAFE Scoring provides independent security opinions for crypto products. We evaluate hardware wallets, software wallets, and DeFi protocols with the same published methodology: ${totalNorms} criteria across 4 pillars - Security (cryptographic standards), Adversity (threat resistance), Fidelity (reliability track record), and Efficiency (usability). All scores are editorial assessments, not guarantees of security.`,
  },
  {
    question: "How is SafeScoring different from CertiK or other auditors?",
    answer:
      `Audits typically verify code at a single point in time. SafeScoring's methodology assesses security posture on an ongoing basis. Key differences: (1) Our methodology covers hardware wallets, software wallets, and DeFi protocols with one framework. Smart contract auditors like CertiK specialize in code review. (2) We re-evaluate monthly. (3) According to industry reports, ${auditedHackedApprox} of hacked projects in 2024 had been audited. Our methodology evaluates operational security, track record, and resilience beyond code.`,
  },
  {
    question: "How are products evaluated?",
    answer:
      `Our AI-assisted system evaluates products against ${totalNorms} criteria using official documentation, security audits, technical specifications, and on-chain data. Each criterion is marked YES (met), NO (not met), or N/A (not applicable). The process is automated and reproducible, based on our published methodology.`,
  },
  {
    question: "How often are scores updated?",
    answer:
      "All products are re-evaluated monthly. Major security events (hacks, critical vulnerabilities, major updates) trigger immediate re-evaluation. Unlike one-time audits, SafeScoring tracks security over time.",
  },
  {
    question: "Is SafeScoring truly independent?",
    answer:
      `Affiliate relationships are disclosed and do not influence scores. Scores are calculated from our published ${totalNorms}-criteria methodology. The scoring process and commercial relationships are completely separated. Rated entities may dispute factual errors via disputes@safescoring.io.`,
  },
  {
    question: "What are the 4 SAFE pillars?",
    answer:
      `S (Security, 25%): Cryptographic foundations — our methodology evaluates encryption, key management, and cryptographic standards. According to industry reports, ${hackLosses2024Short} was stolen in crypto hacks in 2024, over ${accessControlLossPct} via compromised keys. A (Adversity, 25%): Physical threat resistance — our methodology evaluates duress PINs, time-locks, multi-signature, and hidden wallets, assessing how products address coercion and physical threats. F (Fidelity, 25%): Reliability track record — according to industry reports, ${auditedHackedApprox} of hacked projects had been audited. Our methodology evaluates patch speed, incident response, and remediation practices. E (Efficiency, 25%): Usability of security features — our methodology evaluates UX, error prevention, and blind-signing risks. Each pillar contributes equally to the final score.`,
  },
  {
    question: "Can SafeScoring help protect against physical attacks and kidnappings?",
    answer:
      "The Adversity pillar (25% of every score) evaluates anti-coercion features: time-locked transfers, multi-signature requirements, duress PINs, and hidden wallets. Products with these features may make forced transfers more difficult. A high Adversity score indicates, according to our methodology, that a product includes more of these protective mechanisms. This is our editorial assessment and not a guarantee of physical safety.",
  },
  {
    question: "Can I request a product evaluation?",
    answer:
      "Yes! Professional and Enterprise subscribers can request priority evaluations. Free users can suggest products through our community system. We prioritize based on market relevance and user demand.",
  },
  {
    question: "How is the final score calculated?",
    answer:
      "The SAFE score is calculated as: (S + A + F + E) / 4, where each pillar score = (compliant norms / applicable norms) × 100. Products with many N/A norms are not penalized - only applicable norms count.",
  },
  {
    question: "What's the difference between plans?",
    answer:
      "Explorer ($29/mo): All scores + methodology. Professional ($99/mo): Full evaluation details + API access + custom reports. Enterprise ($499/mo): White-label reports + custom integrations + on-demand evaluations + dedicated support.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "Yes, 14-day money-back guarantee on all plans. No questions asked. If SafeScoring doesn't meet your expectations, we'll refund you in full.",
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const { stats } = useGlobalStats();
  const faqs = getFaqs(stats.totalNorms);

  return (
    <section className="py-24 px-6 bg-base-200/30" id="faq">
      <div className="max-w-3xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium rounded-full bg-base-content/10 text-base-content/70">
            FAQ
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-base-content/60">
            Everything you need to know about SafeScoring
          </p>
        </div>

        {/* FAQ items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-xl border border-base-300 bg-base-200/50 overflow-hidden"
            >
              <button
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-base-300/30 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-semibold pr-4">{faq.question}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className={`w-5 h-5 flex-shrink-0 transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? "max-h-96" : "max-h-0"
                }`}
              >
                <div className="px-6 pb-5 text-base-content/70">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="text-center mt-12">
          <p className="text-base-content/60 mb-4">
            Still have questions?
          </p>
          <a
            href="mailto:support@safescoring.io"
            className="btn btn-outline btn-sm"
          >
            Contact Support
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
