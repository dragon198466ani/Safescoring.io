"use client";

import { useState } from "react";
import Link from "next/link";

const AUDIT_QUESTIONS = [
  {
    category: "Digital Anonymity",
    icon: "🔒",
    weight: 10,
    questions: [
      {
        id: "q1",
        text: "Have you NEVER publicly disclosed your crypto holdings?",
        weight: 10,
        criticalFailure: true,
      },
      {
        id: "q2",
        text: "Do you use pseudonyms for ALL crypto-related activity (Twitter, Discord, Reddit, etc.)?",
        weight: 8,
      },
      {
        id: "q3",
        text: "Is your crypto identity completely separated from your real identity?",
        weight: 9,
      },
      {
        id: "q4",
        text: "Do you avoid posting screenshots that contain identifying information?",
        weight: 6,
      },
      {
        id: "q5",
        text: "Do you use VPN/Tor for sensitive crypto transactions?",
        weight: 5,
      },
    ],
  },
  {
    category: "Technical Setup",
    icon: "🛠️",
    weight: 9,
    questions: [
      {
        id: "q6",
        text: "Do you use a hardware wallet with duress PIN functionality?",
        weight: 10,
        criticalFailure: true,
      },
      {
        id: "q7",
        text: "Do you have hidden wallets separate from your main wallet?",
        weight: 9,
      },
      {
        id: "q8",
        text: "Is your decoy wallet funded with believable amounts ($1K-$5K)?",
        weight: 7,
      },
      {
        id: "q9",
        text: "Do you use multi-signature for large holdings?",
        weight: 6,
      },
      {
        id: "q10",
        text: "Are your seed phrases stored in multiple geographic locations?",
        weight: 8,
      },
    ],
  },
  {
    category: "Physical Security",
    icon: "🏠",
    weight: 10,
    questions: [
      {
        id: "q11",
        text: "Is your main hardware wallet NOT stored at your home address?",
        weight: 9,
        criticalFailure: true,
      },
      {
        id: "q12",
        text: "Do you NEVER post your real-time location on social media?",
        weight: 8,
      },
      {
        id: "q13",
        text: "Have you instructed family/friends NOT to discuss your crypto involvement?",
        weight: 7,
      },
      {
        id: "q14",
        text: "Do you vary your daily routines and avoid predictable patterns?",
        weight: 6,
      },
      {
        id: "q15",
        text: "Do you have home security (alarm, cameras, monitoring)?",
        weight: 5,
      },
    ],
  },
  {
    category: "Travel & Meetings",
    icon: "✈️",
    weight: 7,
    questions: [
      {
        id: "q16",
        text: "Do you NEVER travel with your main hardware wallet?",
        weight: 9,
      },
      {
        id: "q17",
        text: "Do you avoid posting travel plans in advance?",
        weight: 8,
      },
      {
        id: "q18",
        text: "Do you refuse in-person crypto transactions with strangers?",
        weight: 10,
        criticalFailure: true,
      },
      {
        id: "q19",
        text: "If attending crypto events, do you use a pseudonym and pay cash?",
        weight: 7,
      },
    ],
  },
  {
    category: "Emergency Preparedness",
    icon: "🚨",
    weight: 8,
    questions: [
      {
        id: "q20",
        text: "Do you have a plan for what to do if attacked/extorted?",
        weight: 9,
      },
      {
        id: "q21",
        text: "Have you tested your duress PIN and confirmed it works?",
        weight: 8,
      },
      {
        id: "q22",
        text: "Can trusted contacts access your funds if something happens to you (inheritance plan)?",
        weight: 6,
      },
      {
        id: "q23",
        text: "Do you have a 'dead man's switch' or time-locked recovery mechanism?",
        weight: 5,
      },
    ],
  },
];

export default function OPSECAuditPage() {
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(0);

  const handleAnswer = (questionId, value) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const calculateScore = () => {
    let totalWeight = 0;
    let earnedWeight = 0;
    const criticalFailures = [];

    AUDIT_QUESTIONS.forEach((category) => {
      category.questions.forEach((q) => {
        const questionWeight = q.weight * category.weight;
        totalWeight += questionWeight;

        if (answers[q.id] === true) {
          earnedWeight += questionWeight;
        } else if (q.criticalFailure && answers[q.id] === false) {
          criticalFailures.push(q.text);
        }
      });
    });

    const score = Math.round((earnedWeight / totalWeight) * 100);
    return { score, criticalFailures };
  };

  const getScoreGrade = (score) => {
    if (score >= 90) return { grade: "A+", color: "success", label: "Excellent" };
    if (score >= 80) return { grade: "A", color: "success", label: "Very Good" };
    if (score >= 70) return { grade: "B", color: "info", label: "Good" };
    if (score >= 60) return { grade: "C", color: "warning", label: "Moderate" };
    if (score >= 50) return { grade: "D", color: "warning", label: "Weak" };
    return { grade: "F", color: "error", label: "Critical Risk" };
  };

  const getRiskLevel = (score, criticalFailures) => {
    if (criticalFailures.length > 0) {
      return { level: "CRITICAL", color: "error", description: "Immediate action required" };
    }
    if (score >= 80) {
      return { level: "LOW", color: "success", description: "Strong OPSEC posture" };
    }
    if (score >= 60) {
      return { level: "MEDIUM", color: "warning", description: "Room for improvement" };
    }
    return { level: "HIGH", color: "error", description: "Significant vulnerabilities" };
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  const handleReset = () => {
    setAnswers({});
    setShowResults(false);
    setCurrentCategory(0);
  };

  const { score, criticalFailures } = calculateScore();
  const scoreGrade = getScoreGrade(score);
  const riskLevel = getRiskLevel(score, criticalFailures);

  const totalQuestions = AUDIT_QUESTIONS.reduce((sum, cat) => sum + cat.questions.length, 0);
  const answeredQuestions = Object.keys(answers).length;
  const progress = Math.round((answeredQuestions / totalQuestions) * 100);

  if (showResults) {
    return (
      <main className="min-h-screen bg-base-100 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Results Header */}
            <div className="text-center mb-8">
              <h1 className="text-5xl font-bold mb-4">Your OPSEC Audit Results</h1>
              <p className="text-xl text-base-content/70">
                Personal security evaluation complete
              </p>
            </div>

            {/* Score Card */}
            <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 shadow-2xl mb-8">
              <div className="card-body items-center text-center">
                <div
                  className={`radial-progress text-${scoreGrade.color} mb-4`}
                  style={{ "--value": score, "--size": "16rem", "--thickness": "1.2rem" }}
                  role="progressbar"
                >
                  <div className="text-center">
                    <div className="text-5xl font-bold">{score}</div>
                    <div className="text-xl">/100</div>
                    <div className={`badge badge-${scoreGrade.color} badge-lg mt-2`}>
                      {scoreGrade.grade}
                    </div>
                  </div>
                </div>

                <h2 className="text-3xl font-bold mb-2">
                  OPSEC Level: {scoreGrade.label}
                </h2>
                <div className={`badge badge-${riskLevel.color} badge-lg`}>
                  Risk Level: {riskLevel.level}
                </div>
                <p className="text-base-content/70 mt-2">{riskLevel.description}</p>
              </div>
            </div>

            {/* Critical Failures */}
            {criticalFailures.length > 0 && (
              <div className="alert alert-error shadow-lg mb-8">
                <div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current flex-shrink-0 h-8 w-8"
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
                  <div>
                    <h3 className="font-bold text-lg">⚠️ CRITICAL Security Failures Detected</h3>
                    <div className="text-sm mt-2">
                      The following issues put you at IMMEDIATE RISK:
                    </div>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {criticalFailures.map((failure, idx) => (
                        <li key={idx}>{failure}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Score Breakdown by Category */}
            <div className="card bg-base-200 shadow-xl mb-8">
              <div className="card-body">
                <h3 className="card-title text-2xl mb-4">Score Breakdown by Category</h3>
                <div className="space-y-4">
                  {AUDIT_QUESTIONS.map((category, idx) => {
                    const categoryAnswered = category.questions.filter(
                      (q) => answers[q.id] === true
                    ).length;
                    const categoryTotal = category.questions.length;
                    const categoryScore = Math.round((categoryAnswered / categoryTotal) * 100);

                    return (
                      <div key={idx}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold">
                            {category.icon} {category.category}
                          </span>
                          <span className="text-sm">
                            {categoryAnswered}/{categoryTotal} ({categoryScore}%)
                          </span>
                        </div>
                        <progress
                          className="progress progress-primary w-full"
                          value={categoryScore}
                          max="100"
                        ></progress>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="card bg-base-200 shadow-xl mb-8">
              <div className="card-body">
                <h3 className="card-title text-2xl mb-4">🎯 Personalized Recommendations</h3>

                {score < 50 && (
                  <div className="alert alert-error mb-4">
                    <div>
                      <h4 className="font-bold">URGENT: Critical OPSEC improvements needed</h4>
                      <p className="text-sm">
                        Your current OPSEC posture puts you at HIGH RISK of physical attack if
                        you have significant crypto holdings.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {!answers.q1 && (
                    <div className="border-l-4 border-error pl-4">
                      <h4 className="font-bold">🚨 Stop Public Disclosure</h4>
                      <p className="text-sm">
                        Delete all public posts about your crypto holdings IMMEDIATELY. This is
                        the #1 way attackers identify targets.
                      </p>
                    </div>
                  )}

                  {!answers.q6 && (
                    <div className="border-l-4 border-error pl-4">
                      <h4 className="font-bold">🔐 Get a Duress PIN Wallet</h4>
                      <p className="text-sm">
                        Invest in a hardware wallet with duress PIN functionality. Recommended:{" "}
                        <Link href="/products?opsec=duress_pin" className="link link-primary">
                          View products with duress PIN →
                        </Link>
                      </p>
                    </div>
                  )}

                  {!answers.q11 && (
                    <div className="border-l-4 border-warning pl-4">
                      <h4 className="font-bold">🏠 Move Your Hardware Wallet</h4>
                      <p className="text-sm">
                        Store your main wallet in a bank safe deposit box or trusted location
                        away from your home. Home invasions are common.
                      </p>
                    </div>
                  )}

                  {!answers.q7 && (
                    <div className="border-l-4 border-warning pl-4">
                      <h4 className="font-bold">👻 Set Up Hidden Wallets</h4>
                      <p className="text-sm">
                        Create hidden wallets with most of your holdings. Keep a decoy wallet
                        with small amounts to give up under duress.
                      </p>
                    </div>
                  )}

                  {score >= 70 && (
                    <div className="border-l-4 border-success pl-4">
                      <h4 className="font-bold">✅ Good OPSEC Posture</h4>
                      <p className="text-sm">
                        You're doing well. Continue to review and update your security practices
                        regularly. Stay vigilant.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={handleReset} className="btn btn-outline btn-lg">
                ↻ Retake Audit
              </button>
              <Link href="/security-guide" className="btn btn-primary btn-lg">
                📚 Read Full Security Guide
              </Link>
              <Link href="/products?sort=opsec" className="btn btn-secondary btn-lg">
                🛡️ Find OPSEC-Hardened Products
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-base-100 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4">Personal OPSEC Security Audit</h1>
            <p className="text-xl text-base-content/70 mb-4">
              Evaluate your operational security and get personalized recommendations
            </p>
            <div className="stats shadow">
              <div className="stat">
                <div className="stat-title">Progress</div>
                <div className="stat-value text-primary">{progress}%</div>
                <div className="stat-desc">
                  {answeredQuestions} of {totalQuestions} questions
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <progress
            className="progress progress-primary w-full mb-8"
            value={progress}
            max="100"
          ></progress>

          {/* Category Tabs */}
          <div className="tabs tabs-boxed mb-6 flex-wrap justify-center">
            {AUDIT_QUESTIONS.map((cat, idx) => (
              <a
                key={idx}
                className={`tab ${currentCategory === idx ? "tab-active" : ""}`}
                onClick={() => setCurrentCategory(idx)}
              >
                {cat.icon} {cat.category}
              </a>
            ))}
          </div>

          {/* Questions */}
          <div className="card bg-base-200 shadow-xl mb-8">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-6">
                {AUDIT_QUESTIONS[currentCategory].icon}{" "}
                {AUDIT_QUESTIONS[currentCategory].category}
              </h2>

              <div className="space-y-6">
                {AUDIT_QUESTIONS[currentCategory].questions.map((q) => (
                  <div key={q.id} className="form-control">
                    <label className="label cursor-pointer justify-start gap-4 p-4 bg-base-100 rounded-lg hover:bg-base-300 transition-colors">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary checkbox-lg"
                        checked={answers[q.id] || false}
                        onChange={(e) => handleAnswer(q.id, e.target.checked)}
                      />
                      <div className="flex-1">
                        <span className="label-text text-base font-medium">{q.text}</span>
                        {q.criticalFailure && (
                          <div className="badge badge-error badge-sm ml-2">CRITICAL</div>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Navigation */}
              <div className="card-actions justify-between mt-6">
                {currentCategory > 0 && (
                  <button
                    className="btn btn-outline"
                    onClick={() => setCurrentCategory(currentCategory - 1)}
                  >
                    ← Previous
                  </button>
                )}
                {currentCategory < AUDIT_QUESTIONS.length - 1 ? (
                  <button
                    className="btn btn-primary ml-auto"
                    onClick={() => setCurrentCategory(currentCategory + 1)}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    className="btn btn-primary btn-lg ml-auto"
                    onClick={handleSubmit}
                    disabled={answeredQuestions === 0}
                  >
                    View Results →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="alert alert-info shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <div>
              <h3 className="font-bold">Privacy Notice</h3>
              <div className="text-xs">
                Your answers are NOT saved or transmitted anywhere. This audit runs entirely in
                your browser. Be honest for accurate results.
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
