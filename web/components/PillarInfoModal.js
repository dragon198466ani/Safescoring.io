"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

// Educational content for each pillar with essential standards only
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
