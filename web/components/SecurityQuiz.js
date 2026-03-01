"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * SecurityQuiz - Quiz interactif pour évaluer la sécurité crypto de l'utilisateur
 *
 * Objectifs:
 * 1. Engager l'utilisateur avec des questions pertinentes
 * 2. Évaluer son niveau de sécurité actuel
 * 3. Recommander des produits SafeScoring adaptés
 * 4. Funnel vers inscription/achat
 */

// Questions orientées vers les BESOINS et les SOLUTIONS du site
const QUIZ_QUESTIONS = [
  {
    id: "portfolio_value",
    question: "Quelle est la valeur de vos crypto-actifs ?",
    icon: "money",
    options: [
      { id: "large", label: "Plus de 50 000€", needs: ["hardware_wallet", "metal_backup", "security_key", "audit"], urgency: "critical" },
      { id: "medium", label: "10 000€ - 50 000€", needs: ["hardware_wallet", "metal_backup", "security_key"], urgency: "high" },
      { id: "small", label: "1 000€ - 10 000€", needs: ["hardware_wallet", "metal_backup"], urgency: "medium" },
      { id: "starter", label: "Moins de 1 000€", needs: ["software_wallet"], urgency: "low" },
    ],
  },
  {
    id: "current_storage",
    question: "Où stockez-vous vos cryptos actuellement ?",
    icon: "wallet",
    options: [
      { id: "exchange", label: "Sur un exchange (Binance, Coinbase...)", needs: ["hardware_wallet"], problem: "Vos cryptos ne vous appartiennent pas vraiment", urgency: "critical" },
      { id: "software", label: "Wallet mobile/desktop (Metamask, Trust...)", needs: ["hardware_wallet"], problem: "Vulnérable aux malwares et hacks", urgency: "high" },
      { id: "hardware", label: "Hardware wallet", needs: [], problem: null, urgency: "ok" },
      { id: "paper", label: "Paper wallet", needs: ["hardware_wallet"], problem: "Difficile à utiliser, risque de perte", urgency: "medium" },
    ],
  },
  {
    id: "seed_backup",
    question: "Comment avez-vous sauvegardé votre seed phrase ?",
    icon: "key",
    options: [
      { id: "none", label: "Je ne l'ai pas sauvegardée", needs: ["metal_backup"], problem: "Risque de perte totale irréversible", urgency: "critical" },
      { id: "digital", label: "Photo / fichier numérique", needs: ["metal_backup"], problem: "Vulnérable aux hackers", urgency: "critical" },
      { id: "paper", label: "Sur papier", needs: ["metal_backup"], problem: "Vulnérable au feu, eau, dégradation", urgency: "high" },
      { id: "metal", label: "Gravée sur métal", needs: [], problem: null, urgency: "ok" },
    ],
  },
  {
    id: "backup_location",
    question: "Où est stockée votre sauvegarde ?",
    icon: "copy",
    options: [
      { id: "same_place", label: "Au même endroit que mes appareils", needs: ["multi_backup"], problem: "Tout peut être perdu en cas de vol/incendie", urgency: "high" },
      { id: "cloud", label: "Dans le cloud", needs: ["metal_backup", "multi_backup"], problem: "Accessible aux hackers", urgency: "critical" },
      { id: "one_location", label: "Un seul lieu sécurisé", needs: ["multi_backup"], problem: "Risque de point unique de défaillance", urgency: "medium" },
      { id: "multiple", label: "Plusieurs lieux différents", needs: [], problem: null, urgency: "ok" },
    ],
  },
  {
    id: "account_security",
    question: "Comment protégez-vous vos comptes exchange ?",
    icon: "shield",
    options: [
      { id: "password_only", label: "Mot de passe uniquement", needs: ["security_key", "exchange_security"], problem: "Très vulnérable au phishing", urgency: "critical" },
      { id: "sms_2fa", label: "2FA par SMS", needs: ["security_key"], problem: "SMS peuvent être interceptés (SIM swap)", urgency: "high" },
      { id: "app_2fa", label: "App authenticator", needs: ["security_key"], problem: "Mieux, mais perfectible", urgency: "medium" },
      { id: "hardware_key", label: "Clé physique (YubiKey)", needs: [], problem: null, urgency: "ok" },
    ],
  },
  {
    id: "defi_usage",
    question: "Utilisez-vous des protocoles DeFi ?",
    icon: "chart",
    options: [
      { id: "yes_no_check", label: "Oui, je signe sans trop vérifier", needs: ["hardware_wallet", "defi_education"], problem: "Risque d'approuver des contrats malveillants", urgency: "critical" },
      { id: "yes_careful", label: "Oui, je vérifie les contrats", needs: ["hardware_wallet"], problem: "Un hardware wallet ajouterait une couche de sécurité", urgency: "medium" },
      { id: "yes_hardware", label: "Oui, avec hardware wallet", needs: [], problem: null, urgency: "ok" },
      { id: "no", label: "Non, je n'utilise pas la DeFi", needs: [], problem: null, urgency: "ok" },
    ],
  },
  {
    id: "knowledge_level",
    question: "Comment évaluez-vous vos connaissances en sécurité crypto ?",
    icon: "brain",
    options: [
      { id: "beginner", label: "Débutant - J'apprends encore", needs: ["education", "setup_guide"], urgency: "high" },
      { id: "intermediate", label: "Intermédiaire - Je connais les bases", needs: ["audit"], urgency: "medium" },
      { id: "advanced", label: "Avancé - Je maîtrise bien le sujet", needs: [], urgency: "low" },
    ],
  },
  {
    id: "main_concern",
    question: "Quelle est votre principale préoccupation ?",
    icon: "alert",
    options: [
      { id: "hack", label: "Me faire hacker / voler mes cryptos", needs: ["hardware_wallet", "security_key"], urgency: "high" },
      { id: "loss", label: "Perdre l'accès à mes cryptos", needs: ["metal_backup", "multi_backup"], urgency: "high" },
      { id: "scam", label: "Me faire arnaquer (phishing, scam)", needs: ["education", "security_key"], urgency: "high" },
      { id: "choice", label: "Choisir les bons outils de sécurité", needs: ["comparison", "audit"], urgency: "medium" },
    ],
  },
];

// Mapping des besoins vers les SOLUTIONS du site
const SOLUTIONS = {
  hardware_wallet: {
    name: "Hardware Wallet",
    description: "Stockage sécurisé hors-ligne de vos cryptos",
    link: "/products?type=HW-COLD",
    linkText: "Voir le classement des meilleurs hardware wallets",
    icon: "wallet",
    price: "À partir de 59€",
  },
  metal_backup: {
    name: "Backup Métal",
    description: "Protection anti-feu/eau pour votre seed phrase",
    link: "/products?type=BACKUP-METAL",
    linkText: "Comparer les solutions de backup métal",
    icon: "key",
    price: "À partir de 25€",
  },
  security_key: {
    name: "Clé de Sécurité (2FA)",
    description: "Protection maximale contre le phishing",
    link: "/products?type=SEC-KEY",
    linkText: "Voir les clés de sécurité recommandées",
    icon: "shield",
    price: "À partir de 25€",
  },
  multi_backup: {
    name: "Stratégie Multi-Backup",
    description: "Répartir vos sauvegardes pour éliminer les risques",
    link: "/security-guide#backup",
    linkText: "Lire notre guide backup",
    icon: "copy",
    price: "Gratuit",
  },
  software_wallet: {
    name: "Wallet Logiciel Sécurisé",
    description: "Les meilleures apps pour débuter",
    link: "/products?type=SW-HOT",
    linkText: "Voir les wallets logiciels recommandés",
    icon: "wallet",
    price: "Gratuit",
  },
  comparison: {
    name: "Comparateur de Produits",
    description: "Comparez les scores SAFE de plusieurs produits",
    link: "/compare",
    linkText: "Utiliser le comparateur",
    icon: "chart",
    price: "Gratuit",
  },
  audit: {
    name: "Audit Complet de Sécurité",
    description: "Analyse personnalisée de votre setup par nos experts",
    link: "/dashboard?upgrade=audit",
    linkText: "Commander mon audit",
    icon: "alert",
    price: "9,99€",
    isPremium: true,
  },
  education: {
    name: "Guide Sécurité Crypto",
    description: "Apprenez les bonnes pratiques",
    link: "/security-guide",
    linkText: "Lire le guide complet",
    icon: "brain",
    price: "Gratuit",
  },
  setup_guide: {
    name: "Assistant Setup",
    description: "Créez votre configuration sécurisée personnalisée",
    link: "/stack-builder",
    linkText: "Créer mon setup",
    icon: "setup",
    price: "Gratuit",
  },
  exchange_security: {
    name: "Sécurité Exchange",
    description: "Guide pour sécuriser vos comptes exchange",
    link: "/security-guide#exchange",
    linkText: "Sécuriser mes exchanges",
    icon: "lock",
    price: "Gratuit",
  },
  defi_education: {
    name: "Guide DeFi Sécurisé",
    description: "Comment utiliser la DeFi sans risque",
    link: "/security-guide#defi",
    linkText: "Lire le guide DeFi",
    icon: "chart",
    price: "Gratuit",
  },
};

// Icons SVG
const ICONS = {
  wallet: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  key: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  ),
  copy: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  shield: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  lock: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  chart: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  money: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  alert: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  brain: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  setup: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

// Score color helpers
const getScoreColor = (score) => {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-amber-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
};

const getScoreBg = (score) => {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
};

const getTagStyle = (tag) => {
  switch (tag) {
    case "excellent": return "bg-green-500/20 text-green-500 border-green-500/30";
    case "bon": return "bg-blue-500/20 text-blue-500 border-blue-500/30";
    case "moyen": return "bg-amber-500/20 text-amber-500 border-amber-500/30";
    case "risque": return "bg-orange-500/20 text-orange-500 border-orange-500/30";
    case "critique": return "bg-red-500/20 text-red-500 border-red-500/30";
    default: return "bg-base-300 text-base-content border-base-300";
  }
};

// Results component - Oriented towards SITE SOLUTIONS
function QuizResults({ answers, onRestart }) {
  const { data: session } = useSession();
  const router = useRouter();

  // Analyze answers to find needs and problems
  const analyzeResults = useCallback(() => {
    const needs = new Set();
    const problems = [];
    let criticalCount = 0;
    let highCount = 0;

    QUIZ_QUESTIONS.forEach((q) => {
      const answerId = answers[q.id];
      if (answerId) {
        const option = q.options.find(o => o.id === answerId);
        if (option) {
          // Collect needs
          option.needs?.forEach(need => needs.add(need));

          // Collect problems
          if (option.problem) {
            problems.push({
              question: q.question,
              answer: option.label,
              problem: option.problem,
              urgency: option.urgency,
            });
          }

          // Count urgency levels
          if (option.urgency === "critical") criticalCount++;
          if (option.urgency === "high") highCount++;
        }
      }
    });

    // Determine global risk level
    let riskLevel, riskMessage;
    if (criticalCount >= 2) {
      riskLevel = "critical";
      riskMessage = "Vos cryptos sont en danger immédiat";
    } else if (criticalCount >= 1 || highCount >= 2) {
      riskLevel = "high";
      riskMessage = "Des failles importantes ont été détectées";
    } else if (highCount >= 1) {
      riskLevel = "medium";
      riskMessage = "Quelques points à améliorer";
    } else {
      riskLevel = "low";
      riskMessage = "Bonne configuration, perfectible";
    }

    return {
      needs: Array.from(needs),
      problems,
      riskLevel,
      riskMessage,
      criticalCount,
      highCount,
    };
  }, [answers]);

  const results = analyzeResults();

  // Get solutions for the identified needs
  const getSolutions = () => {
    const priorityOrder = ["hardware_wallet", "metal_backup", "security_key", "audit"];
    const sorted = results.needs.sort((a, b) => {
      const aIdx = priorityOrder.indexOf(a);
      const bIdx = priorityOrder.indexOf(b);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });
    return sorted.map(needId => ({ id: needId, ...SOLUTIONS[needId] })).filter(s => s.name);
  };

  const solutions = getSolutions();
  const premiumSolutions = solutions.filter(s => s.isPremium);
  const freeSolutions = solutions.filter(s => !s.isPremium);

  return (
    <div className="space-y-6">
      {/* Risk Level Banner */}
      <div className={`rounded-2xl p-6 text-center ${
        results.riskLevel === "critical" ? "bg-red-500/10 border-2 border-red-500/50" :
        results.riskLevel === "high" ? "bg-orange-500/10 border-2 border-orange-500/50" :
        results.riskLevel === "medium" ? "bg-amber-500/10 border-2 border-amber-500/50" :
        "bg-green-500/10 border-2 border-green-500/50"
      }`}>
        <div className={`text-5xl mb-3 ${
          results.riskLevel === "critical" ? "text-red-500" :
          results.riskLevel === "high" ? "text-orange-500" :
          results.riskLevel === "medium" ? "text-amber-500" :
          "text-green-500"
        }`}>
          {results.riskLevel === "critical" ? "⚠️" :
           results.riskLevel === "high" ? "🔶" :
           results.riskLevel === "medium" ? "📊" : "✅"}
        </div>
        <h2 className={`text-xl font-black ${
          results.riskLevel === "critical" ? "text-red-500" :
          results.riskLevel === "high" ? "text-orange-500" :
          results.riskLevel === "medium" ? "text-amber-500" :
          "text-green-500"
        }`}>
          {results.riskMessage}
        </h2>
        <p className="text-sm opacity-60 mt-2">
          {results.problems.length} point{results.problems.length > 1 ? "s" : ""} d'attention identifié{results.problems.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Problems Identified */}
      {results.problems.length > 0 && (
        <div className="bg-base-200/50 rounded-xl p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Problèmes détectés
          </h3>
          <div className="space-y-2">
            {results.problems.slice(0, 4).map((p, i) => (
              <div key={i} className={`p-3 rounded-lg border-l-4 ${
                p.urgency === "critical" ? "bg-red-500/10 border-red-500" :
                p.urgency === "high" ? "bg-orange-500/10 border-orange-500" :
                "bg-amber-500/10 border-amber-500"
              }`}>
                <p className="font-medium text-sm">{p.problem}</p>
                <p className="text-xs opacity-50 mt-1">{p.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOLUTIONS - Free */}
      {freeSolutions.length > 0 && (
        <div className="bg-base-200/50 rounded-xl p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Solutions recommandées
          </h3>
          <div className="space-y-3">
            {freeSolutions.slice(0, 4).map((solution, i) => (
              <a
                key={solution.id}
                href={solution.link}
                className="flex items-center gap-3 p-3 bg-base-100/70 rounded-xl hover:bg-base-100 transition-all border border-transparent hover:border-primary/30"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  {ICONS[solution.icon] || ICONS.shield}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{solution.name}</p>
                  <p className="text-[11px] opacity-60">{solution.description}</p>
                  <p className="text-xs text-primary mt-1">{solution.linkText} →</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    solution.price === "Gratuit" ? "bg-success/20 text-success" : "bg-base-300"
                  }`}>
                    {solution.price}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* PREMIUM CTA - Audit */}
      <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-2 border-primary/30 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-black">Audit Complet de Sécurité</h3>
              <span className="badge badge-primary badge-sm">PRO</span>
            </div>
            <p className="text-sm opacity-70 mb-3">
              Obtenez une analyse détaillée par nos experts avec un plan d'action personnalisé pour sécuriser vos {answers.portfolio_value === "large" ? "50 000€+" : answers.portfolio_value === "medium" ? "10-50K€" : "cryptos"}.
            </p>
            <ul className="text-xs space-y-1 mb-4">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Analyse complète de vos {results.problems.length} failles
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Comparaison des meilleures solutions pour vous
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Setup optimal personnalisé avec scores SAFE
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Support prioritaire 30 jours
              </li>
            </ul>
            <button
              onClick={() => router.push("/dashboard?upgrade=audit")}
              className="btn btn-primary w-full"
            >
              Obtenir mon audit - 9,99€
            </button>
          </div>
        </div>
      </div>

      {/* Free alternative - Create setup */}
      <div className="text-center">
        <p className="text-xs opacity-50 mb-2">Ou commencez gratuitement</p>
        <a href="/stack-builder" className="btn btn-ghost btn-sm">
          Créer mon setup personnalisé →
        </a>
      </div>

      {/* Signup prompt for anonymous */}
      {!session && (
        <div className="bg-base-200/50 rounded-xl p-4 text-center">
          <p className="text-sm mb-3">Créez un compte pour sauvegarder vos résultats</p>
          <button
            onClick={() => router.push("/signin?callbackUrl=/quiz")}
            className="btn btn-outline btn-sm"
          >
            Créer mon compte gratuit
          </button>
        </div>
      )}

      {/* Share & Restart */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            const text = `J'ai identifié ${results.problems.length} points à améliorer dans ma sécurité crypto avec SafeScoring! Faites le quiz: `;
            const url = window.location.origin + "/quiz";
            if (navigator.share) {
              navigator.share({ title: "Quiz Sécurité Crypto", text, url });
            } else {
              navigator.clipboard.writeText(text + url);
              alert("Lien copié!");
            }
          }}
          className="btn btn-outline btn-sm flex-1 gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Partager
        </button>
        <button onClick={onRestart} className="btn btn-ghost btn-sm opacity-50">
          Refaire
        </button>
      </div>
    </div>
  );
}

// Main Quiz Component
export default function SecurityQuiz({
  onComplete,
  onClose,
  variant = "full", // "full" | "mini" | "embedded"
  className = "",
}) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);

  const question = QUIZ_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion) / QUIZ_QUESTIONS.length) * 100;
  const timeEstimate = Math.ceil((QUIZ_QUESTIONS.length - currentQuestion) * 0.5); // ~30s par question

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showIntro || isCompleted) return;

      const options = question.options;
      if (e.key >= "1" && e.key <= String(options.length)) {
        const idx = parseInt(e.key) - 1;
        handleAnswer(options[idx].id);
      }
      if (e.key === "ArrowLeft" && currentQuestion > 0) {
        setCurrentQuestion(currentQuestion - 1);
      }
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentQuestion, showIntro, isCompleted, question]);

  const handleAnswer = (optionId) => {
    setSelectedOption(optionId);
    const newAnswers = { ...answers, [question.id]: optionId };
    setAnswers(newAnswers);

    // Auto-advance after animation
    setTimeout(() => {
      setSelectedOption(null);
      if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        setIsCompleted(true);
        onComplete?.(newAnswers);
      }
    }, 400);
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setIsCompleted(false);
    setShowIntro(true);
    setSelectedOption(null);
  };

  const handleGetReport = () => {
    window.location.href = "/dashboard?report=security";
  };

  // Intro screen
  if (showIntro) {
    return (
      <div className={`bg-base-100 rounded-2xl border border-base-300 p-6 relative ${className}`}>
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 btn btn-ghost btn-sm btn-circle"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Quiz Sécurité Crypto</h2>
          <p className="text-sm opacity-70">
            {QUIZ_QUESTIONS.length} questions · ~2 min
          </p>
        </div>

        <div className="bg-base-200/50 rounded-xl p-4 mb-6">
          <h3 className="font-medium mb-3">Ce quiz va analyser:</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">🔐</span>
              <span>Votre stockage de cryptos</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">🛡️</span>
              <span>Vos pratiques de backup</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">⚡</span>
              <span>Votre authentification</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">🌐</span>
              <span>Votre utilisation DeFi</span>
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs opacity-50 mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Anonyme · Aucune donnée stockée</span>
        </div>

        <button
          onClick={() => setShowIntro(false)}
          className="btn btn-primary w-full gap-2 h-14 text-base"
        >
          Commencer le quiz
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    );
  }

  // Results screen
  if (isCompleted) {
    return (
      <div className={`bg-base-100 rounded-2xl border border-base-300 p-6 ${className}`}>
        <QuizResults
          answers={answers}
          onRestart={handleRestart}
          onGetReport={handleGetReport}
        />
      </div>
    );
  }

  // Question screen
  return (
    <div className={`bg-base-100 rounded-2xl border border-base-300 overflow-hidden relative ${className}`}>
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 btn btn-ghost btn-sm btn-circle z-10"
          aria-label="Fermer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Progress bar */}
      <div className="h-1.5 bg-base-300">
        <div
          className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-6">
        {/* Question header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {currentQuestion + 1}/{QUIZ_QUESTIONS.length}
            </span>
            <span className="text-xs opacity-40">·</span>
            <span className="text-xs opacity-50">
              ~{timeEstimate} min restant{timeEstimate > 1 ? "es" : "e"}
            </span>
          </div>
          <div className="text-xs opacity-40 hidden sm:block">
            Touche 1-{question.options.length} pour répondre
          </div>
        </div>

        {/* Question */}
        <div className="flex items-start gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-primary flex-shrink-0">
            {ICONS[question.icon]}
          </div>
          <div>
            <h3 className="text-xl font-bold leading-tight">{question.question}</h3>
          </div>
        </div>

        {/* Options - larger touch targets */}
        <div className="space-y-3">
          {question.options.map((option, idx) => {
            const isSelected = answers[question.id] === option.id;
            const isAnimating = selectedOption === option.id;

            return (
              <button
                key={option.id}
                onClick={() => handleAnswer(option.id)}
                disabled={selectedOption !== null}
                className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 transform
                  ${isAnimating ? "scale-[0.98] border-primary bg-primary/20" : ""}
                  ${isSelected && !isAnimating ? "border-primary bg-primary/10" : ""}
                  ${!isSelected && !isAnimating ? "border-base-300 hover:border-primary/50 hover:bg-base-200/50 active:scale-[0.98]" : ""}
                `}
              >
                <div className="flex items-center gap-4">
                  {/* Number indicator */}
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors
                    ${isSelected || isAnimating ? "bg-primary text-white" : "bg-base-200 text-base-content/50"}
                  `}>
                    {idx + 1}
                  </span>
                  <span className="font-medium flex-1">{option.label}</span>
                  {isAnimating && (
                    <svg className="w-6 h-6 text-primary animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-base-300">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="btn btn-ghost btn-sm gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Précédent
          </button>

          {/* Progress dots */}
          <div className="flex gap-1.5">
            {QUIZ_QUESTIONS.map((_, i) => (
              <button
                key={i}
                onClick={() => i < currentQuestion && setCurrentQuestion(i)}
                disabled={i >= currentQuestion}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentQuestion ? "bg-primary w-6" :
                  i < currentQuestion ? "bg-primary/50 w-2 hover:bg-primary/70 cursor-pointer" : "bg-base-300 w-2"
                }`}
              />
            ))}
          </div>

          <div className="w-24"></div>
        </div>
      </div>
    </div>
  );
}
