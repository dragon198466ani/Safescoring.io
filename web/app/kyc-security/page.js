import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";
import { getStats } from "@/libs/stats";

export const metadata = getSEOTags({
  title: `KYC Security: Protect Your Identity in Crypto | ${config.appName}`,
  description:
    "Understand how crypto platforms handle your personal data. SafeScoring evaluates KYC data protection with 22 dedicated security norms across identity verification providers.",
  canonicalUrlRelative: "/kyc-security",
  keywords: [
    "kyc security crypto",
    "identity verification safety",
    "kyc data protection",
    "crypto kyc provider",
    "kyc data incident",
    "identity data security",
  ],
});

const KYC_PROVIDERS = [
  { name: "Sumsub", status: "incident", regions: "Global" },
  { name: "ID Merit", status: "incident", regions: "Global" },
  { name: "Jumio", status: "clean", regions: "Global" },
  { name: "Onfido", status: "clean", regions: "EU, US" },
  { name: "Veriff", status: "clean", regions: "EU" },
  { name: "Shufti Pro", status: "clean", regions: "Global" },
  { name: "Trulioo", status: "clean", regions: "Global" },
  { name: "Au10tix", status: "clean", regions: "Global" },
];

const DATA_TYPES = [
  { key: "passport", icon: "M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z", label: "Passport / ID" },
  { key: "selfie", icon: "M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z", label: "Selfie / Photo" },
  { key: "address", icon: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25", label: "Address" },
  { key: "phone", icon: "M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z", label: "Phone number" },
  { key: "bank", icon: "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z", label: "Bank account" },
  { key: "ssn", icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z", label: "SSN / Tax ID" },
  { key: "email", icon: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75", label: "Email" },
];

const NORM_CATEGORIES = [
  {
    code: "KYCPROT",
    count: 10,
    color: "primary",
    title: "KYC Data Protection",
    description: "How platforms store, encrypt, and manage your identity documents. Covers data retention policies, encryption standards, and access controls.",
    examples: ["Encrypted storage of identity documents", "Data retention time limits", "Access control and audit logging"],
  },
  {
    code: "BREACH",
    count: 7,
    color: "warning",
    title: "Incident Response",
    description: "How quickly and transparently platforms respond when data incidents occur. Measures notification speed, remediation, and user support.",
    examples: ["Incident notification within 72 hours", "User remediation support", "Transparent public disclosure"],
  },
  {
    code: "IDPROT",
    count: 5,
    color: "info",
    title: "Identity Protection UX",
    description: "User-facing features designed to help protect your identity. Evaluates verification alternatives, data minimization, and user controls.",
    examples: ["Zero-knowledge proof alternatives", "Minimal data collection", "User data deletion requests"],
  },
];

export default async function KycSecurityPage() {
  const platformStats = await getStats();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-base-100 pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/5 via-base-100 to-info/5 py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="badge badge-primary badge-lg mb-4">KYC Security</div>
              <h1 className="text-5xl font-bold mb-6">
                Protect Your Identity
                <br />
                <span className="text-primary">in Crypto</span>
              </h1>
              <p className="text-xl text-base-content/70 mb-8 max-w-2xl mx-auto">
                Over 1 billion identity records have been exposed through KYC provider incidents.
                SafeScoring evaluates {platformStats.totalNorms} security norms to help you choose safer platforms.
              </p>
              <div className="stats stats-vertical sm:stats-horizontal shadow-xl bg-base-200">
                <div className="stat">
                  <div className="stat-title">KYC Norms</div>
                  <div className="stat-value text-primary">22</div>
                  <div className="stat-desc">Dedicated security norms</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Providers</div>
                  <div className="stat-value text-info">10</div>
                  <div className="stat-desc">KYC providers tracked</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Data Types</div>
                  <div className="stat-value text-warning">7</div>
                  <div className="stat-desc">Categories monitored</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Understanding KYC Risk */}
        <section className="py-16 bg-base-200">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold mb-4 text-center">
                Understanding KYC Risk
              </h2>
              <p className="text-center text-base-content/70 mb-12 max-w-2xl mx-auto">
                When you use a crypto platform that requires identity verification (KYC),
                your personal data is shared with third-party providers.
                If those providers experience a data incident, your information may be exposed.
              </p>

              {/* Data Types Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {DATA_TYPES.map((dt) => (
                  <div key={dt.key} className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="card-body items-center text-center p-4">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-primary mb-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d={dt.icon} />
                      </svg>
                      <p className="font-medium text-sm">{dt.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 text-center">
                <p className="text-sm text-base-content/50">
                  These data types are commonly collected during identity verification processes
                  and may be stored by third-party KYC providers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How SafeScoring Evaluates */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold mb-4 text-center">
                How SafeScoring Evaluates KYC Security
              </h2>
              <p className="text-center text-base-content/70 mb-12 max-w-2xl mx-auto">
                Our methodology includes 22 dedicated norms across 3 categories,
                specifically designed to evaluate how platforms protect your identity data.
              </p>

              <div className="grid md:grid-cols-3 gap-6">
                {NORM_CATEGORIES.map((cat) => (
                  <div key={cat.code} className={`card bg-base-200 border-2 border-${cat.color}/20`}>
                    <div className="card-body">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`badge badge-${cat.color} badge-lg font-mono`}>
                          {cat.count}
                        </div>
                        <h3 className="font-bold">{cat.title}</h3>
                      </div>
                      <p className="text-sm text-base-content/70 mb-4">
                        {cat.description}
                      </p>
                      <ul className="space-y-1">
                        {cat.examples.map((ex, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-base-content/60">
                            <span className="text-success mt-0.5">&#10003;</span>
                            {ex}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* KYC Providers */}
        <section className="py-16 bg-base-200">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold mb-4 text-center">
                KYC Providers Evaluated
              </h2>
              <p className="text-center text-base-content/70 mb-12 max-w-2xl mx-auto">
                We track major KYC verification providers used across the crypto industry
                and monitor their incident history.
              </p>

              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                {KYC_PROVIDERS.map((provider) => (
                  <div key={provider.name} className="card bg-base-100 shadow-sm">
                    <div className="card-body p-4">
                      <h3 className="font-semibold text-sm">{provider.name}</h3>
                      <p className="text-xs text-base-content/50">{provider.regions}</p>
                      <div className="mt-2">
                        {provider.status === "incident" ? (
                          <span className="badge badge-warning badge-xs">Incident reported</span>
                        ) : (
                          <span className="badge badge-success badge-xs">No incidents</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Protect Yourself */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-4">
                Protect Yourself
              </h2>
              <p className="text-base-content/70 mb-12 max-w-2xl mx-auto">
                Take control of your identity security with these practical steps.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-left mb-12">
                {[
                  { text: "Check which platforms require KYC in your portfolio", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
                  { text: "Monitor provider incident history", icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" },
                  { text: "Use platforms with strong data protection scores", icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" },
                  { text: "Minimize unnecessary identity sharing", icon: "M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" },
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-base-200">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-primary flex-shrink-0 mt-0.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d={tip.icon} />
                    </svg>
                    <p className="text-sm">{tip.text}</p>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/dashboard/setups" className="btn btn-primary btn-lg">
                  Analyze Your Setup
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link href="/signin" className="btn btn-outline btn-lg">
                  Get Started Free
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
