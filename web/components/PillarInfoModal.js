"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import config from "@/config";

const { hackLosses2024, accessControlLossPct, auditedHackedApprox, auditedHackedYear } = config.safe.stats;

// Educational content for each pillar with essential standards only
const pillarEducationalContent = {
  S: {
    title: "Security",
    subtitle: "Cryptographic Armor",
    introduction:
      `This pillar evaluates the cryptographic foundations protecting your assets. In ${auditedHackedYear} alone, ${hackLosses2024} was stolen in crypto hacks — with compromised keys and access controls responsible for over ${accessControlLossPct} of losses. A high Security score means the product uses battle-tested, audited cryptographic implementations — not homegrown algorithms that crumble under real-world attacks.`,
    whyItMatters:
      "Cryptography is the only thing standing between your assets and a hacker. A single weak algorithm, a poorly seeded random number generator, or unprotected key storage can turn a 'secure' wallet into an open vault. Most users never see the code — this pillar does it for them.",
    essentialStandards: [
      {
        name: "NIST SP 800-57",
        description: "Key Management Recommendations — the gold standard for how cryptographic keys should be generated, stored, rotated, and destroyed.",
      },
      {
        name: "FIPS 140-2/3",
        description: "Federal standard for cryptographic modules. If a hardware wallet doesn't meet this, its 'secure element' claim is meaningless.",
      },
      {
        name: "BIP-32/39/44",
        description: "Bitcoin standards for HD wallets, seed phrases, and derivation paths — the backbone of every wallet's key architecture.",
      },
      {
        name: "SLIP-0010/0039",
        description: "Standards for universal key derivation and Shamir's Secret Sharing — splitting keys so no single device holds everything.",
      },
    ],
    evaluationAreas: [
      "Encryption algorithms (AES-256, ChaCha20)",
      "Digital signature schemes (ECDSA, EdDSA)",
      "Hash functions (SHA-256, Keccak-256)",
      "Key derivation and secure storage",
      "Random number generation (CSPRNG)",
      "Secure element / TEE usage",
    ],
  },
  A: {
    title: "Adversity",
    subtitle: "Duress & Coercion Resistance",
    introduction:
      "This pillar measures how well a product protects users under physical threat or coercion. In 2025, crypto-related kidnappings surged worldwide, with France becoming the most targeted country in Europe. Victims are targeted because criminals believe they can force an instant transfer. A high Adversity score means the product makes this impossible — protecting your life by making your funds inaccessible under duress.",
    whyItMatters:
      "The $5 wrench attack is no longer theoretical. Kidnappings, home invasions, and torture targeting crypto holders are escalating. Products that implement time-locks, multi-signature, and duress mechanisms break the criminal business model: if funds cannot be moved instantly, the kidnapping becomes worthless. Choosing a product with a high Adversity score is a life-safety decision.",
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
      {
        name: "BIP-11 / BIP-65 (Multisig & Timelocks)",
        description: "Bitcoin standards for multi-signature transactions and time-locked outputs — the technical foundation that prevents forced instant transfers.",
      },
    ],
    evaluationAreas: [
      "Duress PIN functionality",
      "Hidden/decoy wallets",
      "Plausible deniability features",
      "Time-locked transfers (CLTV, timelock vaults)",
      "Multi-signature requirements",
      "Emergency wipe capabilities",
      "Multi-location key storage",
      "Dead man's switch mechanisms",
    ],
  },
  F: {
    title: "Fidelity",
    subtitle: "Reliability & Track Record",
    introduction:
      `According to industry reports, ${auditedHackedApprox} of hacked projects in ${auditedHackedYear} had passed at least one security audit. Audits represent a point-in-time assessment. This pillar evaluates ongoing factors: does the team fix vulnerabilities fast? Do they maintain transparency when things go wrong? Is the project still actively defended?`,
    whyItMatters:
      "Crypto security is a moving target. New exploits emerge weekly. A product that was secure in January can be compromised by March if the team stopped patching. Fidelity measures the ongoing commitment to security — because the projects that survive hacks aren't the ones with the best audits, they're the ones with the best response teams.",
    essentialStandards: [
      {
        name: "SOC 2 Type II",
        description: "Not a one-time check — this report verifies that security controls actually work over an extended period. The 'Type II' distinction is critical.",
      },
      {
        name: "ISO 27001",
        description: "International standard for information security management systems (ISMS) — proving security is a continuous process, not a one-off event.",
      },
      {
        name: "CryptoCurrency Security Standard (CCSS)",
        description: "The only security standard specifically designed for cryptocurrency custody — covering key generation, storage, usage, and compromise protocols.",
      },
      {
        name: "Responsible Disclosure & Bug Bounties",
        description: "Active bug bounty programs incentivize white-hat hackers to find vulnerabilities before black-hats do. No bounty program = no safety net.",
      },
    ],
    evaluationAreas: [
      "Independent security audits (frequency & recency)",
      "Bug bounty program scope and payouts",
      "Patch speed after critical vulnerabilities",
      "Open source code & transparent governance",
      "Team track record & incident history",
      "Post-hack response and user compensation",
    ],
  },
  E: {
    title: "Efficiency",
    subtitle: "Security You Can Actually Use",
    introduction:
      "Even a highly-rated wallet can lead to losses if it lets you send $50,000 to the wrong address because the confirmation screen was confusing. This pillar evaluates whether a product's security features work well in the hands of real users — not just in a lab. Clear transaction displays, address verification, error prevention, and accessible recovery are what separate usable security from theoretical security.",
    whyItMatters:
      "User errors — wrong chain, wrong address, misunderstood gas fees, lost seed phrases — cause billions in irreversible crypto losses every year. These aren't security failures, they're UX failures. A product that forces users to blind-sign transactions or offers no recovery path is insecure by design, no matter how strong its cryptography.",
    essentialStandards: [
      {
        name: "WCAG 2.1",
        description: "Accessibility guidelines — because security should work for everyone, including users with disabilities.",
      },
      {
        name: "ISO 9241-110",
        description: "Ergonomic principles for human-system interaction — the science behind interfaces that prevent costly mistakes.",
      },
      {
        name: "EIP-712 / EIP-4361 (Sign-In with Ethereum)",
        description: "Standards for typed structured data signing and authentication — replacing blind signing with verifiable, user-readable transaction details.",
      },
    ],
    evaluationAreas: [
      "Transaction confirmation clarity (no blind signing)",
      "Address verification & whitelisting",
      "Multi-chain / multi-asset support",
      "Backup & recovery UX",
      "Cross-platform availability",
      "Error prevention & undo mechanisms",
      "Onboarding friction vs. security trade-off",
    ],
  },
};

const PillarInfoModal = ({ isOpen, onClose, pillarCode, pillarColor }) => {
  const content = pillarEducationalContent[pillarCode];

  if (!content) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-base-100 border border-base-300 shadow-2xl transition-all">
                {/* Header with gradient */}
                <div
                  className="relative px-6 py-8 overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${pillarColor}20 0%, transparent 100%)`,
                  }}
                >
                  {/* Decorative glow */}
                  <div
                    className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-30"
                    style={{ backgroundColor: pillarColor }}
                  />

                  <div className="relative flex items-center gap-4">
                    <div
                      className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black text-white shadow-lg"
                      style={{ backgroundColor: pillarColor }}
                    >
                      {pillarCode}
                    </div>
                    <div>
                      <Dialog.Title className="text-2xl font-bold">
                        {content.title}
                      </Dialog.Title>
                      <p className="text-base-content/60 font-medium">
                        {content.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Close button */}
                  <button
                    className="absolute top-4 right-4 btn btn-ghost btn-sm btn-circle"
                    onClick={onClose}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
                  {/* Introduction */}
                  <div>
                    <p className="text-base-content/80 leading-relaxed">
                      {content.introduction}
                    </p>
                  </div>

                  {/* Why it matters */}
                  <div
                    className="p-4 rounded-xl border-l-4"
                    style={{
                      borderColor: pillarColor,
                      backgroundColor: `${pillarColor}10`,
                    }}
                  >
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5"
                        style={{ color: pillarColor }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Why it matters
                    </h4>
                    <p className="text-sm text-base-content/70">
                      {content.whyItMatters}
                    </p>
                  </div>

                  {/* Essential Standards */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5"
                        style={{ color: pillarColor }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Essential Standards Referenced
                    </h4>
                    <div className="space-y-3">
                      {content.essentialStandards.map((standard, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg bg-base-200/50 border border-base-300"
                        >
                          <h5
                            className="font-medium text-sm"
                            style={{ color: pillarColor }}
                          >
                            {standard.name}
                          </h5>
                          <p className="text-xs text-base-content/60 mt-1">
                            {standard.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Evaluation Areas */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5"
                        style={{ color: pillarColor }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                      What we evaluate
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {content.evaluationAreas.map((area, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border"
                          style={{
                            borderColor: `${pillarColor}40`,
                            backgroundColor: `${pillarColor}10`,
                            color: pillarColor,
                          }}
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-base-200/50 border-t border-base-300">
                  <p className="text-xs text-base-content/50 text-center">
                    This is a simplified overview. The full methodology includes hundreds of specific evaluation criteria.
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default PillarInfoModal;
