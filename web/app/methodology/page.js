import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getNormStats } from "@/libs/norm-stats";

export const metadata = getSEOTags({
  title: `SAFE Methodology | ${config.appName}`,
  description: `The SAFE Framework: comprehensive security norms across 4 pillars - Security, Adversity, Fidelity, and Efficiency. Learn how we evaluate crypto product security.`,
  canonicalUrlRelative: "/methodology",
});

const pillarEducationalContent = {
  S: {
    title: "Security",
    subtitle: "Cryptographic Foundations",
    introduction:
      "This pillar evaluates how a product protects your cryptographic assets at the most fundamental level. A high Security score means the product uses proven, battle-tested cryptographic standards.",
    whyItMatters:
      "Cryptographic security is the foundation of all digital asset protection. Weak encryption or poor key management can compromise everything else, regardless of other security measures.",
    essentialStandards: [
      {
        name: "NIST SP 800-57",
        description: "Key Management Recommendations - Guidelines for cryptographic key generation, storage, and lifecycle management.",
      },
      {
        name: "FIPS 140-2/3",
        description: "Security Requirements for Cryptographic Modules - Federal standard ensuring cryptographic implementations meet strict security criteria.",
      },
      {
        name: "BIP-32/39/44",
        description: "Bitcoin Improvement Proposals for hierarchical deterministic wallets, mnemonic seed phrases, and derivation paths.",
      },
      {
        name: "SLIP-0010/0039",
        description: "Standards for universal private key derivation and Shamir's Secret Sharing implementation.",
      },
    ],
    evaluationAreas: [
      "Encryption algorithms (AES-256, ChaCha20)",
      "Digital signature schemes (ECDSA, EdDSA)",
      "Hash functions (SHA-256, Keccak-256)",
      "Key derivation and storage",
      "Random number generation (CSPRNG)",
    ],
  },
  A: {
    title: "Adversity",
    subtitle: "Duress & Coercion Resistance",
    introduction:
      "This pillar measures how well a product protects users under physical threat or coercion. A high Adversity score means the product has features to protect you even when forced to unlock your device.",
    whyItMatters:
      "Physical attacks and coercion are real threats, especially for high-value targets. Products should provide mechanisms to protect users even when they cannot refuse access.",
    essentialStandards: [
      {
        name: "OWASP Mobile Security",
        description: "Guidelines for anti-tampering, code obfuscation, and runtime protection against physical device attacks.",
      },
      {
        name: "Common Criteria (ISO 15408)",
        description: "International standard for evaluating security features including protection against physical and logical attacks.",
      },
      {
        name: "ETSI TS 103 097",
        description: "Security protocols for protected communication channels and authentication under adverse conditions.",
      },
    ],
    evaluationAreas: [
      "Duress PIN functionality",
      "Hidden/decoy wallets",
      "Plausible deniability features",
      "Time-locked access controls",
      "Emergency wipe capabilities",
      "Multi-location key storage",
    ],
  },
  F: {
    title: "Fidelity",
    subtitle: "Trust & Long-term Reliability",
    introduction:
      "This pillar assesses the trustworthiness and long-term viability of a product. A high Fidelity score indicates the product has been independently verified and is actively maintained.",
    whyItMatters:
      "Security is not a one-time achievement. Products must be continuously audited, updated, and maintained to address new vulnerabilities and threats as they emerge.",
    essentialStandards: [
      {
        name: "SOC 2 Type II",
        description: "Service Organization Control report verifying security, availability, and confidentiality controls over time.",
      },
      {
        name: "ISO 27001",
        description: "International standard for information security management systems (ISMS) and continuous improvement.",
      },
      {
        name: "CryptoCurrency Security Standard (CCSS)",
        description: "Specific security standard for cryptocurrency storage systems, covering key generation, storage, and usage.",
      },
      {
        name: "Bug Bounty Programs",
        description: "Structured vulnerability disclosure programs following responsible disclosure best practices.",
      },
    ],
    evaluationAreas: [
      "Independent security audits",
      "Bug bounty program existence",
      "Update frequency and process",
      "Open source code availability",
      "Team transparency and track record",
      "Incident response history",
    ],
  },
  E: {
    title: "Efficiency",
    subtitle: "Usability & Accessibility",
    introduction:
      "This pillar evaluates how accessible and user-friendly the product is while maintaining security. A high Efficiency score means the product balances security with practical usability.",
    whyItMatters:
      "The most secure product is useless if it's too complex to use correctly. Poor usability leads to user errors which can compromise security.",
    essentialStandards: [
      {
        name: "WCAG 2.1",
        description: "Web Content Accessibility Guidelines ensuring products are usable by people with disabilities.",
      },
      {
        name: "ISO 9241-110",
        description: "Ergonomics of human-system interaction - principles for user interface design and usability.",
      },
      {
        name: "EIP Standards",
        description: "Ethereum Improvement Proposals for multi-chain support, token standards, and interoperability.",
      },
    ],
    evaluationAreas: [
      "Transaction confirmation clarity",
      "Address verification mechanisms",
      "Multi-chain/multi-asset support",
      "Backup and recovery process",
      "Cross-platform availability",
      "Onboarding experience",
    ],
  },
};

const Methodology = async () => {
  const normStats = await getNormStats();

  return (
    <>
    <Header />
    <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs items={[
          { label: "Home", href: "/" },
          { label: "Methodology" },
        ]} />
      </div>

      {/* Hero Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium rounded-full bg-primary/10 text-primary">
            Methodology
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            The <span className="text-gradient-safe">SAFE</span> Framework
          </h1>
          <p className="text-lg text-base-content/60 max-w-2xl mx-auto mb-4">
            An evaluation system with {normStats?.totalNorms || "\u2014"} security norms across four pillars.
            Crypto products are assessed against these standards using our standardized methodology.
          </p>
          <p className="text-xs text-base-content/40 max-w-2xl mx-auto mb-8">
            Opinion-Based Evaluation — Scores represent SafeScoring&apos;s opinion based on publicly available information. They do not guarantee security, predict future incidents, or constitute financial advice. Experts using different criteria may reach different conclusions.
          </p>
          <div className="flex justify-center gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">{normStats?.totalNorms || "\u2014"}</div>
              <div className="text-sm text-base-content/60">Security Norms</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">4</div>
              <div className="text-sm text-base-content/60">Core Pillars</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">{normStats?.totalProducts || "\u2014"}+</div>
              <div className="text-sm text-base-content/60">Products Evaluated</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars Section */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto space-y-16">
          {config.safe.pillars.map((pillar, index) => {
            const content = pillarEducationalContent[pillar.code];
            return (
              <div
                key={pillar.code}
                className="relative"
                id={pillar.code.toLowerCase()}
              >
                {/* Pillar Header */}
                <div className="flex items-center gap-6 mb-8">
                  <div
                    className="flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black text-white shadow-lg"
                    style={{ backgroundColor: pillar.color }}
                  >
                    {pillar.code}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">{content.title}</h2>
                    <p className="text-lg text-base-content/60">{content.subtitle}</p>
                  </div>
                </div>

                {/* Introduction */}
                <p className="text-lg text-base-content/80 leading-relaxed mb-8 max-w-4xl">
                  {content.introduction}
                </p>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Why It Matters */}
                  <div
                    className="p-6 rounded-2xl border-l-4"
                    style={{
                      borderColor: pillar.color,
                      backgroundColor: `${pillar.color}10`,
                    }}
                  >
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5"
                        style={{ color: pillar.color }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Why It Matters
                    </h3>
                    <p className="text-base-content/70">{content.whyItMatters}</p>
                  </div>

                  {/* Evaluation Areas */}
                  <div className="p-6 rounded-2xl bg-base-200/50 border border-base-300">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5"
                        style={{ color: pillar.color }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                      What We Evaluate
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {content.evaluationAreas.map((area, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border"
                          style={{
                            borderColor: `${pillar.color}40`,
                            backgroundColor: `${pillar.color}10`,
                            color: pillar.color,
                          }}
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Essential Standards */}
                <div className="mt-8">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-5 h-5"
                      style={{ color: pillar.color }}
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Essential Standards Referenced
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {content.essentialStandards.map((standard, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-base-200/50 border border-base-300 hover:border-opacity-50 transition-all"
                      >
                        <h4
                          className="font-medium"
                          style={{ color: pillar.color }}
                        >
                          {standard.name}
                        </h4>
                        <p className="text-sm text-base-content/60 mt-1">
                          {standard.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider between pillars */}
                {index < config.safe.pillars.length - 1 && (
                  <div className="border-b border-base-300 mt-16" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-base-200/50 border-t border-base-300">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to explore product scores?</h2>
          <p className="text-base-content/60 mb-8">
            See how your favorite crypto products stack up against our {normStats?.totalNorms || "\u2014"} security norms.
          </p>
          <Link href="/products" className="btn btn-primary btn-lg">
            View All Products
          </Link>
        </div>
      </section>
    </main>
    <Footer />
    </>
  );
};

export default Methodology;
