import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Crypto Personal Security Guide | ${config.appName}`,
  description:
    "Comprehensive OPSEC guide for crypto holders. Learn how to protect yourself from physical attacks, extortion, and the $5 wrench attack. Your wallet is secure—are you?",
  canonicalUrlRelative: "/security-guide",
});

export default function SecurityGuidePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-base-100 pt-20">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-error/10 via-base-100 to-warning/10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="badge badge-error badge-lg mb-4">⚠️ Critical Reading</div>
            <h1 className="text-5xl font-bold mb-6">
              Your Wallet Is Secure.
              <br />
              <span className="text-error">But Are You?</span>
            </h1>
            <p className="text-xl text-base-content/70 mb-8">
              Technical security means nothing when someone holds a wrench to your head.
              This guide covers what security audits don't: <strong>keeping yourself safe</strong>.
            </p>
            <div className="stats stats-vertical sm:stats-horizontal shadow-xl bg-base-200">
              <div className="stat">
                <div className="stat-title">Physical Attacks 2024</div>
                <div className="stat-value text-error">47M$+</div>
                <div className="stat-desc">Stolen via coercion</div>
              </div>
              <div className="stat">
                <div className="stat-title">Confirmed Incidents</div>
                <div className="stat-value text-warning">23+</div>
                <div className="stat-desc">Kidnappings, robberies</div>
              </div>
              <div className="stat">
                <div className="stat-title">Victims With Public Profiles</div>
                <div className="stat-value text-error">73%</div>
                <div className="stat-desc">OPSEC failures</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The $5 Wrench Attack */}
      <section className="py-16 bg-base-200">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-center">
              The $5 Wrench Attack Is Real
            </h2>
            <div className="alert alert-error mb-8">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h3 className="font-bold">Why traditional security fails</h3>
                <div className="text-sm">
                  No amount of cryptographic sophistication can protect you from physical coercion.
                  When an attacker knows you have crypto and knows where to find you, your BIP-39
                  seed phrase becomes a liability, not an asset.
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl mb-8">
              <div className="card-body">
                <h3 className="card-title text-2xl mb-4">Recent Incidents</h3>
                <div className="space-y-4">
                  <div className="border-l-4 border-error pl-4">
                    <h4 className="font-bold text-lg">Dubai, December 2024</h4>
                    <p className="text-base-content/70">
                      Crypto influencer kidnapped after publicly displaying holdings on Twitter.
                      Attackers monitored social media posts for location patterns and daily routine.
                    </p>
                    <div className="mt-2">
                      <span className="badge badge-error mr-2">OPSEC Failures</span>
                      <span className="text-sm">
                        Public holdings disclosure • Real-time location sharing • Predictable routine
                      </span>
                    </div>
                  </div>

                  <div className="border-l-4 border-warning pl-4">
                    <h4 className="font-bold text-lg">Hong Kong, 2024</h4>
                    <p className="text-base-content/70">
                      Home invasion targeting known Bitcoin early adopter. $3M+ stolen despite
                      hardware wallet security.
                    </p>
                    <div className="mt-2">
                      <span className="badge badge-warning mr-2">Prevention Possible</span>
                      <span className="text-sm">Duress PIN could have limited losses</span>
                    </div>
                  </div>

                  <div className="border-l-4 border-info pl-4">
                    <h4 className="font-bold text-lg">Multiple Locations, 2024</h4>
                    <p className="text-base-content/70">
                      At least 21 confirmed physical attacks globally. Common pattern: victims had
                      publicly visible crypto involvement.
                    </p>
                  </div>
                </div>

                <div className="card-actions justify-end mt-4">
                  <Link href="/incidents/physical" className="btn btn-error btn-sm">
                    View All Physical Incidents →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OPSEC Framework */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-4 text-center">The OPSEC Framework</h2>
            <p className="text-xl text-base-content/70 mb-12 text-center">
              Four layers of defense against physical threats
            </p>

            {/* Layer 1: Digital Anonymity */}
            <div className="card bg-base-200 shadow-xl mb-6">
              <div className="card-body">
                <div className="flex items-start gap-4">
                  <div className="badge badge-lg badge-primary">1</div>
                  <div className="flex-1">
                    <h3 className="card-title text-2xl mb-2">Digital Anonymity & Hygiene</h3>
                    <p className="text-base-content/70 mb-4">
                      <strong>Goal:</strong> Never let anyone know you have crypto + clean your digital footprint
                    </p>

                    <div className="space-y-3">
                      <div>
                        <h4 className="font-bold text-lg mb-2">✅ DO:</h4>
                        <ul className="list-disc list-inside space-y-1 text-base-content/70">
                          <li>Use pseudonyms for all crypto-related activity</li>
                          <li>Separate personal and crypto identities completely</li>
                          <li>Use VPN/Tor for crypto transactions and discussions</li>
                          <li>Never link crypto addresses to real identity</li>
                          <li>Avoid posting screenshots with identifying information</li>
                          <li><strong>Check data breaches regularly</strong> on Have I Been Pwned</li>
                          <li>Use email aliases (SimpleLogin, AnonAddy) for crypto services</li>
                          <li>Remove EXIF metadata from photos before posting</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-bold text-lg mb-2 text-error">❌ DON'T:</h4>
                        <ul className="list-disc list-inside space-y-1 text-base-content/70">
                          <li>Post about holdings on social media (even private accounts)</li>
                          <li>Use your real name on crypto Twitter/Discord/Telegram</li>
                          <li>Display wealth (Lambos, luxury watches with crypto connection)</li>
                          <li>Participate in crypto events with real identity</li>
                          <li>Link crypto wallet to KYC email/phone used elsewhere</li>
                          <li>Post geolocated photos from your home</li>
                        </ul>
                      </div>

                      {/* External Tools */}
                      <div className="mt-4 p-4 bg-base-100 rounded-lg">
                        <h4 className="font-bold mb-3">🔧 Essential Tools</h4>
                        <div className="grid sm:grid-cols-2 gap-2">
                          <a href="https://haveibeenpwned.com" target="_blank" rel="noopener noreferrer"
                             className="btn btn-sm btn-outline">
                            Have I Been Pwned ↗
                          </a>
                          <a href="https://simplelogin.io" target="_blank" rel="noopener noreferrer"
                             className="btn btn-sm btn-outline">
                            SimpleLogin (Email Alias) ↗
                          </a>
                          <a href="https://joindeleteme.com" target="_blank" rel="noopener noreferrer"
                             className="btn btn-sm btn-outline">
                            DeleteMe (Data Removal) ↗
                          </a>
                          <a href="https://incogni.com" target="_blank" rel="noopener noreferrer"
                             className="btn btn-sm btn-outline">
                            Incogni (EU Data Removal) ↗
                          </a>
                        </div>
                      </div>

                      {/* SafeScoring CTA */}
                      <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-primary font-bold">📊 SafeScoring helps here</span>
                        </div>
                        <p className="text-sm text-base-content/70 mb-3">
                          We evaluate products on privacy norms: metadata removal (A92), DNS over HTTPS (A94),
                          fingerprinting resistance (A97), Tor support.
                        </p>
                        <Link href="/products?sort=score_a_desc" className="btn btn-sm btn-primary">
                          View Privacy-Focused Products →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Layer 2: Technical Compartmentalization */}
            <div className="card bg-base-200 shadow-xl mb-6">
              <div className="card-body">
                <div className="flex items-start gap-4">
                  <div className="badge badge-lg badge-secondary">2</div>
                  <div className="flex-1">
                    <h3 className="card-title text-2xl mb-2">Technical Compartmentalization</h3>
                    <p className="text-base-content/70 mb-4">
                      <strong>Goal:</strong> Limit damage if compromised
                    </p>

                    <div className="space-y-3">
                      <div>
                        <h4 className="font-bold mb-2">Wallet Separation</h4>
                        <div className="overflow-x-auto">
                          <table className="table table-sm">
                            <thead>
                              <tr>
                                <th>Type</th>
                                <th>Purpose</th>
                                <th>Holdings</th>
                                <th>Location</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>
                                  <span className="badge badge-success">Hot Wallet</span>
                                </td>
                                <td>Daily use</td>
                                <td>$100-$1000</td>
                                <td>Phone/Desktop</td>
                              </tr>
                              <tr>
                                <td>
                                  <span className="badge badge-warning">Decoy Wallet</span>
                                </td>
                                <td>Duress scenario</td>
                                <td>$1000-$5000</td>
                                <td>Hardware wallet</td>
                              </tr>
                              <tr>
                                <td>
                                  <span className="badge badge-info">Warm Wallet</span>
                                </td>
                                <td>Medium-term</td>
                                <td>$5K-$50K</td>
                                <td>Hidden hardware wallet</td>
                              </tr>
                              <tr>
                                <td>
                                  <span className="badge badge-primary">Cold Storage</span>
                                </td>
                                <td>Long-term hodl</td>
                                <td>Majority of holdings</td>
                                <td>Secure location(s)</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="alert alert-warning">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="stroke-current shrink-0 h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <span>
                          <strong>Duress Wallet Strategy:</strong> Keep enough in your duress wallet
                          to be believable ($1K-$5K) but not your life savings. Under coercion, give
                          up the duress wallet willingly.
                        </span>
                      </div>

                      {/* SafeScoring CTA */}
                      <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-primary font-bold">📊 SafeScoring helps here</span>
                        </div>
                        <p className="text-sm text-base-content/70 mb-3">
                          We evaluate <strong>Duress PIN (A01)</strong>, <strong>Hidden Wallets (A-HDN-001)</strong>,
                          and <strong>Wipe PIN (A02)</strong> across all hardware wallets. Find products that protect you under coercion.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Link href="/products?opsec=duress_pin" className="btn btn-sm btn-primary">
                            Duress PIN Products →
                          </Link>
                          <Link href="/products?opsec=hidden_wallet" className="btn btn-sm btn-outline btn-primary">
                            Hidden Wallet Products →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Layer 2b: Family Awareness */}
            <div className="card bg-base-200 shadow-xl mb-6">
              <div className="card-body">
                <div className="flex items-start gap-4">
                  <div className="badge badge-lg badge-success">2b</div>
                  <div className="flex-1">
                    <h3 className="card-title text-2xl mb-2">Family Awareness</h3>
                    <p className="text-base-content/70 mb-4">
                      <strong>Goal:</strong> Your family can protect you—or expose you
                    </p>

                    <div className="space-y-3">
                      <div className="alert alert-warning">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>
                          Many attacks succeed because family members unknowingly confirm crypto ownership
                          or reveal patterns (schedules, locations, wealth signals).
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold mb-2">Brief Your Family On:</h4>
                        <ul className="list-disc list-inside space-y-1 text-base-content/70">
                          <li><strong>Never confirm</strong> you own crypto to anyone (neighbors, colleagues, strangers)</li>
                          <li>Recognize social engineering attempts (fake delivery, fake utility worker)</li>
                          <li>Notice surveillance signs: car parked repeatedly, same person walking by</li>
                          <li>Know who to call if something feels wrong (not just police—trusted contacts)</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-bold mb-2">Family Code Word</h4>
                        <p className="text-base-content/70">
                          Establish a secret code word for emergencies. If someone calls claiming to be you
                          and asks for money/access, the family asks for the code word. No code = scam.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold mb-2">Children Awareness</h4>
                        <p className="text-base-content/70">
                          Children should be taught to answer "I don't know" to any question about family finances.
                          They're often targeted for information extraction by attackers posing as friendly adults.
                        </p>
                      </div>

                      <div className="form-control mt-4 p-4 bg-base-100 rounded-lg">
                        <h4 className="font-bold mb-3">✅ Family Checklist</h4>
                        <label className="label cursor-pointer justify-start gap-4">
                          <input type="checkbox" className="checkbox checkbox-success" />
                          <span className="label-text">Family knows never to confirm crypto ownership</span>
                        </label>
                        <label className="label cursor-pointer justify-start gap-4">
                          <input type="checkbox" className="checkbox checkbox-success" />
                          <span className="label-text">We have a family emergency code word</span>
                        </label>
                        <label className="label cursor-pointer justify-start gap-4">
                          <input type="checkbox" className="checkbox checkbox-success" />
                          <span className="label-text">Children know to say "I don't know" about finances</span>
                        </label>
                        <label className="label cursor-pointer justify-start gap-4">
                          <input type="checkbox" className="checkbox checkbox-success" />
                          <span className="label-text">Family can recognize surveillance/social engineering</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Layer 2c: Vigilance & Behavior */}
            <div className="card bg-base-200 shadow-xl mb-6">
              <div className="card-body">
                <div className="flex items-start gap-4">
                  <div className="badge badge-lg badge-warning">2c</div>
                  <div className="flex-1">
                    <h3 className="card-title text-2xl mb-2">Vigilance & Behavior</h3>
                    <p className="text-base-content/70 mb-4">
                      <strong>Goal:</strong> Adopt daily security reflexes
                    </p>

                    <div className="space-y-3">
                      <div>
                        <h4 className="font-bold mb-2">Counter-Surveillance Basics</h4>
                        <ul className="list-disc list-inside space-y-1 text-base-content/70">
                          <li><strong>Check behind you</strong> every 2-3 minutes when walking</li>
                          <li><strong>Vary your routes</strong>—don't take the same path daily</li>
                          <li><strong>Stay alert</strong>—avoid being absorbed by your phone in public</li>
                          <li><strong>Test for tails</strong>—make an unexpected turn to see if followed</li>
                          <li><strong>Note patterns</strong>—same car, same person = red flag</li>
                        </ul>
                      </div>

                      <div className="alert alert-error">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h4 className="font-bold">P2P Trading: EXTREME CAUTION</h4>
                          <ul className="list-disc list-inside text-sm mt-1">
                            <li><strong>NEVER</strong> meet at your home or their home</li>
                            <li><strong>NEVER</strong> carry more than the exact amount</li>
                            <li>Meet in public with cameras (bank lobby, police station parking)</li>
                            <li>Bring a friend who stays at a distance observing</li>
                            <li>Preferred: avoid P2P entirely, use exchanges</li>
                          </ul>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold mb-2">Crypto Events Safety</h4>
                        <ul className="list-disc list-inside space-y-1 text-base-content/70">
                          <li>Use pseudonym on badge if possible</li>
                          <li>Pay cash for nearby accommodations</li>
                          <li>Don't reveal hotel name or room number</li>
                          <li>Vary departure times and routes</li>
                          <li>Consider skipping if you're a high-value target</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Layer 3: Physical Security */}
            <div className="card bg-base-200 shadow-xl mb-6">
              <div className="card-body">
                <div className="flex items-start gap-4">
                  <div className="badge badge-lg badge-accent">3</div>
                  <div className="flex-1">
                    <h3 className="card-title text-2xl mb-2">Physical Security</h3>
                    <p className="text-base-content/70 mb-4">
                      <strong>Goal:</strong> Protect yourself and your devices
                    </p>

                    <div className="space-y-3">
                      <div>
                        <h4 className="font-bold mb-2">Home Security</h4>
                        <ul className="list-disc list-inside space-y-1 text-base-content/70">
                          <li>
                            <strong>Never</strong> store hardware wallets at home (if holdings are
                            significant)
                          </li>
                          <li>Use bank safe deposit boxes or geographically distributed locations</li>
                          <li>Home security system with 24/7 monitoring</li>
                          <li>Panic button that alerts trusted contacts or security company</li>
                          <li>Reinforced doors with certified locks (A2P in France, Sold Secure in UK, UL in US)</li>
                          <li>Security cameras with cloud backup (not local-only storage)</li>
                          <li>Motion-sensor lighting around entry points</li>
                          <li>Neighborhood watch / community security awareness</li>
                        </ul>
                      </div>

                      <div className="alert alert-error">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        <div>
                          <h4 className="font-bold">⚠️ Firearms: Consider Carefully</h4>
                          <p className="text-sm mt-1">
                            <strong>EU/UK:</strong> Illegal for self-defense in most cases. Severe legal consequences.
                            <br />
                            <strong>US/Other:</strong> Legal in some jurisdictions, but requires proper training.
                            Under extreme stress, firearms can escalate situations and lead to tragedy.
                            <br />
                            <strong>Bottom line:</strong> Most security professionals advise against relying on firearms.
                            Technical solutions (time-locks, multi-sig, duress wallets) are more effective at removing
                            the incentive for attack.
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold mb-2">Travel Safety</h4>
                        <ul className="list-disc list-inside space-y-1 text-base-content/70">
                          <li>Never travel with main hardware wallet (use hot wallet only)</li>
                          <li>Avoid crypto conferences if you're a high-value target</li>
                          <li>If attending: use pseudonym, pay cash, vary accommodation</li>
                          <li>Never post travel plans in advance (or at all)</li>
                          <li>Use burner phones for crypto access while traveling</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-bold mb-2">In-Person Meetings</h4>
                        <div className="alert alert-error">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="stroke-current shrink-0 h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>
                            <strong>NEVER</strong> meet strangers for crypto transactions. Use
                            reputable exchanges. Every in-person crypto meeting is a potential
                            robbery.
                          </span>
                        </div>
                      </div>

                      {/* SafeScoring CTA */}
                      <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-primary font-bold">📊 SafeScoring helps here</span>
                        </div>
                        <p className="text-sm text-base-content/70 mb-3">
                          We evaluate <strong>Time-Lock (A30)</strong> and <strong>Multi-sig + Time-Lock combos (A35)</strong>.
                          These technical barriers make you a less attractive target—attackers can't get instant access to funds.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Link href="/products?norms=A30" className="btn btn-sm btn-primary">
                            Time-Lock Products →
                          </Link>
                          <Link href="/products?type=BKP_PHYSICAL" className="btn btn-sm btn-outline btn-primary">
                            Physical Backup Solutions →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Layer 3b: Close Protection (High-Net-Worth) */}
            <div className="card bg-base-200 shadow-xl mb-6">
              <div className="card-body">
                <div className="flex items-start gap-4">
                  <div className="badge badge-lg badge-neutral">3b</div>
                  <div className="flex-1">
                    <h3 className="card-title text-2xl mb-2">Close Protection (High-Net-Worth)</h3>
                    <p className="text-base-content/70 mb-4">
                      <strong>Threshold:</strong> &gt;1M€ holdings or public crypto figure
                    </p>

                    <div className="space-y-3">
                      <div className="alert alert-info">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span>
                          If you're a known crypto figure (influencer, founder, early adopter), you need
                          professional-grade security beyond DIY measures.
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold mb-2">When to Consider Professional Security</h4>
                        <ul className="list-disc list-inside space-y-1 text-base-content/70">
                          <li>Holdings exceed 1M€ equivalent</li>
                          <li>You're publicly known in crypto (YouTube, Twitter, podcasts)</li>
                          <li>You've already been targeted or received threats</li>
                          <li>You travel frequently for crypto events</li>
                          <li>You're a founder/CEO of a crypto company</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-bold mb-2">Professional Services</h4>
                        <ul className="list-disc list-inside space-y-1 text-base-content/70">
                          <li><strong>Security audits</strong> — Professional assessment of your vulnerabilities</li>
                          <li><strong>Close protection</strong> — Bodyguards for events and high-risk situations</li>
                          <li><strong>Anti-kidnapping training</strong> — How to behave if taken hostage</li>
                          <li><strong>Secure transportation</strong> — Vetted drivers, varied routes</li>
                          <li><strong>Counter-surveillance</strong> — Detecting if you're being watched</li>
                        </ul>
                      </div>

                      <div className="p-4 bg-base-100 rounded-lg">
                        <h4 className="font-bold mb-3">🏢 Security Providers by Region</h4>
                        <div className="space-y-3">
                          <div>
                            <span className="text-xs font-bold text-base-content/60">🇫🇷 France (mentioned by Hasheur)</span>
                            <div className="grid grid-cols-3 gap-2 mt-1">
                              <div className="text-center p-2 border border-base-300 rounded text-sm">
                                <div className="font-bold">Topaz</div>
                                <div className="text-xs text-base-content/70">Close protection</div>
                              </div>
                              <div className="text-center p-2 border border-base-300 rounded text-sm">
                                <div className="font-bold">Chiron</div>
                                <div className="text-xs text-base-content/70">Audit & training</div>
                              </div>
                              <div className="text-center p-2 border border-base-300 rounded text-sm">
                                <div className="font-bold">LIMA</div>
                                <div className="text-xs text-base-content/70">International</div>
                              </div>
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-base-content/60">🌍 International / US / UK</span>
                            <div className="grid grid-cols-3 gap-2 mt-1">
                              <div className="text-center p-2 border border-base-300 rounded text-sm">
                                <div className="font-bold">G4S</div>
                                <div className="text-xs text-base-content/70">Global security</div>
                              </div>
                              <div className="text-center p-2 border border-base-300 rounded text-sm">
                                <div className="font-bold">Pinkerton</div>
                                <div className="text-xs text-base-content/70">Risk management</div>
                              </div>
                              <div className="text-center p-2 border border-base-300 rounded text-sm">
                                <div className="font-bold">Control Risks</div>
                                <div className="text-xs text-base-content/70">Travel security</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-base-content/60 mt-3 text-center">
                          We are not affiliated with these providers. Do your own research.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Layer 4: Emergency Response */}
            <div className="card bg-base-200 shadow-xl mb-6">
              <div className="card-body">
                <div className="flex items-start gap-4">
                  <div className="badge badge-lg badge-error">4</div>
                  <div className="flex-1">
                    <h3 className="card-title text-2xl mb-2">Emergency Response Plan</h3>
                    <p className="text-base-content/70 mb-4">
                      <strong>Goal:</strong> What to do if attacked
                    </p>

                    <div className="space-y-3">
                      <div>
                        <h4 className="font-bold mb-2">If Under Coercion</h4>
                        <ol className="list-decimal list-inside space-y-2 text-base-content/70">
                          <li>
                            <strong>Comply immediately.</strong> Your life is worth more than crypto.
                          </li>
                          <li>
                            <strong>Use duress PIN.</strong> Give access to decoy wallet only.
                          </li>
                          <li>
                            <strong>Pretend it's everything.</strong> Sell the story convincingly.
                          </li>
                          <li>
                            <strong>Never reveal hidden wallets.</strong> Plausible deniability is key.
                          </li>
                          <li>
                            <strong>After safe:</strong> Report to authorities, move remaining funds,
                            alert community.
                          </li>
                        </ol>
                      </div>

                      <div className="alert alert-success">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h4 className="font-bold">After an Attack: What To Do</h4>
                          <ol className="list-decimal list-inside text-sm mt-2 space-y-1">
                            <li><strong>Contact police immediately</strong> — Request specialized cybercrime or financial crime units
                              <span className="block text-xs text-base-content/60 ml-4">
                                🇫🇷 France: BRI, BRB | 🇺🇸 US: FBI IC3, Secret Service | 🇬🇧 UK: Action Fraud, NCA | 🇩🇪 Germany: BKA
                              </span>
                            </li>
                            <li><strong>File a complaint with blockchain addresses</strong> — Funds can be traced via Chainalysis, Elliptic, or similar blockchain forensics tools</li>
                            <li><strong>Alert major exchanges</strong> — Binance, Coinbase, Kraken etc. can freeze funds if attackers try to cash out (provide TX hashes and addresses)</li>
                            <li><strong>Seek psychological support</strong> — Trauma from violent crime is serious. Don't isolate yourself—talk to professionals</li>
                          </ol>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold mb-2">Dead Man's Switch</h4>
                        <p className="text-base-content/70 mb-2">
                          Consider setting up automated actions if you don't check in for X days:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-base-content/70">
                          <li>Alert trusted contacts</li>
                          <li>Transfer funds to pre-designated addresses (inheritance)</li>
                          <li>Activate social recovery mechanism</li>
                        </ul>
                        <p className="text-sm text-base-content/60 mt-2">
                          ⚠️ Use with caution: balance security with risk of accidental activation
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Layer 5: Enterprise Security */}
            <div className="card bg-base-200 shadow-xl mb-6">
              <div className="card-body">
                <div className="flex items-start gap-4">
                  <div className="badge badge-lg badge-info">5</div>
                  <div className="flex-1">
                    <h3 className="card-title text-2xl mb-2">Enterprise Security</h3>
                    <p className="text-base-content/70 mb-4">
                      <strong>Goal:</strong> No single point of failure in your organization
                    </p>

                    <div className="space-y-3">
                      <div className="alert alert-error">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>
                          <strong>Critical principle:</strong> No individual should be able to sign alone
                          for significant transactions. If kidnapped, they cannot comply even under torture.
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold mb-2">Multi-Signature Requirements</h4>
                        <div className="overflow-x-auto">
                          <table className="table table-sm">
                            <thead>
                              <tr>
                                <th>Amount</th>
                                <th>Required Signers</th>
                                <th>Time Delay</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>&lt;$10K</td>
                                <td>2-of-3</td>
                                <td>None</td>
                              </tr>
                              <tr>
                                <td>$10K - $100K</td>
                                <td>3-of-5</td>
                                <td>24 hours</td>
                              </tr>
                              <tr>
                                <td>&gt;$100K</td>
                                <td>4-of-7</td>
                                <td>48-72 hours</td>
                              </tr>
                              <tr>
                                <td>Treasury</td>
                                <td>5-of-9</td>
                                <td>7 days + board approval</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold mb-2">Key Distribution</h4>
                        <ul className="list-disc list-inside space-y-1 text-base-content/70">
                          <li>Keys must be geographically distributed (different cities/countries)</li>
                          <li>No two signers should be in the same location regularly</li>
                          <li>Signers should not be publicly known</li>
                          <li>Rotate signers quarterly</li>
                          <li>Regular audit of signing procedures by external firm</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-bold mb-2">Crisis Simulation</h4>
                        <p className="text-base-content/70">
                          Conduct annual "what if" exercises: What happens if the CEO is kidnapped?
                          What if two signers are compromised? Document and test your procedures.
                        </p>
                      </div>

                      {/* SafeScoring CTA */}
                      <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-primary font-bold">📊 SafeScoring helps here</span>
                        </div>
                        <p className="text-sm text-base-content/70 mb-3">
                          We evaluate enterprise custody solutions on <strong>Multi-sig requirements</strong>,
                          <strong> MPC (Multi-Party Computation)</strong>, <strong>time-delayed withdrawals</strong>,
                          and <strong>geographic key distribution</strong>. Compare Fireblocks, Anchorage, Copper, BitGo and more.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Link href="/products?type=CUSTODY_ENTERPRISE" className="btn btn-sm btn-primary">
                            Enterprise Custody →
                          </Link>
                          <Link href="/products?type=MULTISIG" className="btn btn-sm btn-outline btn-primary">
                            Multi-Sig Solutions →
                          </Link>
                          <Link href="/compare" className="btn btn-sm btn-outline btn-primary">
                            Compare Products →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Features Section */}
      <section className="py-16 bg-base-200">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-center">
              Essential OPSEC Features in Crypto Products
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Duress PIN */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title">
                    <span className="text-2xl">🔐</span> Duress PIN
                  </h3>
                  <p className="text-base-content/70">
                    Alternative PIN that appears legitimate but accesses a decoy wallet with limited
                    funds. Your last line of defense under coercion.
                  </p>
                  <div className="card-actions justify-between items-center mt-4">
                    <span className="badge badge-success">ESSENTIAL</span>
                    <Link href="/products?opsec=duress_pin" className="btn btn-sm btn-primary">
                      Find Products →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Hidden Wallets */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title">
                    <span className="text-2xl">👻</span> Hidden Wallets
                  </h3>
                  <p className="text-base-content/70">
                    Secret wallets invisible without special passphrase. Provides plausible
                    deniability—attacker cannot prove additional wallets exist.
                  </p>
                  <div className="card-actions justify-between items-center mt-4">
                    <span className="badge badge-success">ESSENTIAL</span>
                    <Link href="/products?opsec=hidden_wallet" className="btn btn-sm btn-primary">
                      Find Products →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Panic Mode */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title">
                    <span className="text-2xl">🚨</span> Panic Mode
                  </h3>
                  <p className="text-base-content/70">
                    Quick-trigger emergency mode. Can wipe device, send silent alerts, or activate
                    decoy mode in seconds.
                  </p>
                  <div className="card-actions justify-between items-center mt-4">
                    <span className="badge badge-warning">RECOMMENDED</span>
                    <Link href="/products?opsec=panic_mode" className="btn btn-sm btn-primary">
                      Find Products →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Physical Stealth */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title">
                    <span className="text-2xl">🕵️</span> Physical Stealth
                  </h3>
                  <p className="text-base-content/70">
                    Hardware wallets that don't look like crypto wallets. No branding, disguised as
                    USB drives or credit cards.
                  </p>
                  <div className="card-actions justify-between items-center mt-4">
                    <span className="badge badge-info">USEFUL</span>
                    <Link href="/products?opsec=stealth" className="btn btn-sm btn-primary">
                      Find Products →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mt-8">
              <Link href="/leaderboard?sort=opsec" className="btn btn-lg btn-primary">
                View Products by OPSEC Score
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Checklist */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-4 text-center">
              Personal OPSEC Security Checklist
            </h2>
            <p className="text-xl text-base-content/70 mb-8 text-center">
              How secure are <strong>you</strong>? (Not just your wallet)
            </p>

            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <p className="text-sm text-base-content/60 mb-4">
                  ℹ️ This is a simplified checklist. For a complete personal OPSEC audit with
                  personalized recommendations, use our{" "}
                  <Link href="/opsec-audit" className="link link-primary">
                    OPSEC Audit Tool
                  </Link>
                  .
                </p>

                <div className="space-y-3">
                  <h3 className="font-bold text-lg">Digital Anonymity (Layer 1)</h3>
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-4">
                      <input type="checkbox" className="checkbox checkbox-primary" />
                      <span className="label-text">
                        I have never publicly disclosed my crypto holdings
                      </span>
                    </label>
                  </div>
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-4">
                      <input type="checkbox" className="checkbox checkbox-primary" />
                      <span className="label-text">
                        I use pseudonyms for all crypto-related activity (Twitter, Discord, etc.)
                      </span>
                    </label>
                  </div>
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-4">
                      <input type="checkbox" className="checkbox checkbox-primary" />
                      <span className="label-text">
                        My crypto identity is completely separated from my real identity
                      </span>
                    </label>
                  </div>

                  <div className="divider"></div>

                  <h3 className="font-bold text-lg">Technical Setup (Layer 2)</h3>
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-4">
                      <input type="checkbox" className="checkbox checkbox-primary" />
                      <span className="label-text">I use a hardware wallet with duress PIN</span>
                    </label>
                  </div>
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-4">
                      <input type="checkbox" className="checkbox checkbox-primary" />
                      <span className="label-text">
                        I have hidden wallets with most of my holdings
                      </span>
                    </label>
                  </div>
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-4">
                      <input type="checkbox" className="checkbox checkbox-primary" />
                      <span className="label-text">
                        My decoy wallet has believable amounts ($1K-$5K)
                      </span>
                    </label>
                  </div>

                  <div className="divider"></div>

                  <h3 className="font-bold text-lg">Physical Security (Layer 3)</h3>
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-4">
                      <input type="checkbox" className="checkbox checkbox-primary" />
                      <span className="label-text">
                        My main hardware wallet is NOT stored at my home address
                      </span>
                    </label>
                  </div>
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-4">
                      <input type="checkbox" className="checkbox checkbox-primary" />
                      <span className="label-text">
                        I never post my real-time location on social media
                      </span>
                    </label>
                  </div>
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-4">
                      <input type="checkbox" className="checkbox checkbox-primary" />
                      <span className="label-text">
                        My family/close friends know NOT to discuss my crypto involvement
                      </span>
                    </label>
                  </div>

                  <div className="divider"></div>

                  <h3 className="font-bold text-lg">Emergency Preparedness (Layer 4)</h3>
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-4">
                      <input type="checkbox" className="checkbox checkbox-primary" />
                      <span className="label-text">
                        I have a plan for what to do if attacked/extorted
                      </span>
                    </label>
                  </div>
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-4">
                      <input type="checkbox" className="checkbox checkbox-primary" />
                      <span className="label-text">
                        I have tested my duress PIN and know it works
                      </span>
                    </label>
                  </div>
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-4">
                      <input type="checkbox" className="checkbox checkbox-primary" />
                      <span className="label-text">
                        Trusted contacts can access my funds if something happens to me
                      </span>
                    </label>
                  </div>
                </div>

                <div className="card-actions justify-center mt-8">
                  <Link href="/opsec-audit" className="btn btn-primary btn-wide">
                    Get Full OPSEC Audit & Score →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Learn From Real Incidents</h2>
            <p className="text-xl text-base-content/70 mb-8">
              We track and analyze physical security incidents in the crypto space to help you stay
              safe. See what went wrong and how it could have been prevented.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/incidents/physical" className="btn btn-error btn-lg">
                📍 View Incident Map
              </Link>
              <Link href="/blog/category/opsec" className="btn btn-outline btn-lg">
                📚 Read OPSEC Articles
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
