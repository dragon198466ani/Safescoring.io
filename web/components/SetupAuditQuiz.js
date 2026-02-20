"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useUserSetups, useApi } from "@/hooks/useApi";

/**
 * SetupAuditQuiz - Quiz pour utilisateurs CONNECTÉS
 *
 * Objectifs:
 * 1. Analyser leur setup EXISTANT
 * 2. Identifier les GAPS dans leur configuration
 * 3. Proposer des UPGRADES personnalisés
 * 4. Upsell vers rapports premium
 */

// Questions pour évaluer l'UTILISATION du setup existant
const AUDIT_QUESTIONS = [
  {
    id: "setup_usage",
    question: "À quelle fréquence utilisez-vous votre setup crypto ?",
    icon: "chart",
    options: [
      { id: "daily", label: "Quotidiennement", profile: "trader", needs: ["hot_wallet", "security_key"] },
      { id: "weekly", label: "Plusieurs fois par semaine", profile: "active", needs: ["hardware_wallet"] },
      { id: "monthly", label: "Quelques fois par mois", profile: "holder", needs: ["cold_storage"] },
      { id: "rarely", label: "Rarement (HODL long terme)", profile: "hodler", needs: ["cold_storage", "metal_backup"] },
    ],
  },
  {
    id: "portfolio_evolution",
    question: "Comment a évolué votre portefeuille ces 6 derniers mois ?",
    icon: "money",
    options: [
      { id: "grown_lot", label: "Fortement augmenté (+50%)", needsUpgrade: true, urgency: "high" },
      { id: "grown", label: "Augmenté (+10-50%)", needsUpgrade: true, urgency: "medium" },
      { id: "stable", label: "Resté stable", needsUpgrade: false, urgency: "low" },
      { id: "decreased", label: "Diminué", needsUpgrade: false, urgency: "low" },
    ],
  },
  {
    id: "new_activities",
    question: "Avez-vous commencé de nouvelles activités crypto récemment ?",
    icon: "wallet",
    multiSelect: true,
    options: [
      { id: "defi", label: "DeFi (Aave, Uniswap...)", needs: ["hardware_wallet", "defi_compatible"], gap: "DEFI" },
      { id: "nft", label: "NFTs", needs: ["hardware_wallet"], gap: "NFT" },
      { id: "staking", label: "Staking", needs: ["staking_compatible"], gap: "STAKING" },
      { id: "trading", label: "Trading actif", needs: ["security_key", "hot_wallet"], gap: "TRADING" },
      { id: "none", label: "Non, rien de nouveau", needs: [] },
    ],
  },
  {
    id: "security_incidents",
    question: "Avez-vous eu des problèmes de sécurité ?",
    icon: "alert",
    options: [
      { id: "phishing", label: "Tentative de phishing", problem: true, needs: ["security_key", "education"] },
      { id: "scam", label: "Victime d'une arnaque", problem: true, needs: ["hardware_wallet", "audit"], urgency: "critical" },
      { id: "lost_access", label: "Perte d'accès temporaire", problem: true, needs: ["metal_backup", "multi_backup"] },
      { id: "none", label: "Aucun problème", problem: false, needs: [] },
    ],
  },
  {
    id: "backup_check",
    question: "Quand avez-vous vérifié vos backups pour la dernière fois ?",
    icon: "key",
    options: [
      { id: "never", label: "Jamais vérifié", problem: "Vos backups pourraient être illisibles", urgency: "critical" },
      { id: "long_ago", label: "Plus d'un an", problem: "Il est temps de vérifier", urgency: "high" },
      { id: "recent", label: "Ces 6 derniers mois", problem: null, urgency: "medium" },
      { id: "regular", label: "Je vérifie régulièrement", problem: null, urgency: "ok" },
    ],
  },
  {
    id: "missing_category",
    question: "Quel élément manque le plus à votre setup selon vous ?",
    icon: "setup",
    options: [
      { id: "cold_storage", label: "Stockage froid sécurisé", gap: "HW-COLD" },
      { id: "backup", label: "Backup indestructible", gap: "BACKUP-METAL" },
      { id: "2fa", label: "Protection 2FA physique", gap: "SEC-KEY" },
      { id: "nothing", label: "Mon setup est complet", gap: null },
    ],
  },
  {
    id: "budget_upgrade",
    question: "Quel budget êtes-vous prêt à investir pour améliorer votre sécurité ?",
    icon: "money",
    options: [
      { id: "high", label: "300€+ pour une sécurité maximale", budget: "premium" },
      { id: "medium", label: "100-300€", budget: "standard" },
      { id: "low", label: "50-100€", budget: "essential" },
      { id: "minimal", label: "Le minimum nécessaire", budget: "minimal" },
    ],
  },
  {
    id: "priority_goal",
    question: "Quelle est votre priorité pour les prochains mois ?",
    icon: "shield",
    options: [
      { id: "protect", label: "Protéger mon capital existant", goal: "security" },
      { id: "grow", label: "Faire croître mon portefeuille", goal: "growth" },
      { id: "simplify", label: "Simplifier ma gestion", goal: "simplicity" },
      { id: "optimize", label: "Optimiser mes rendements", goal: "yield" },
    ],
  },
];

// Types de produits et leur catégorie
const PRODUCT_CATEGORIES = {
  "HW-COLD": { name: "Hardware Wallet", icon: "wallet", essential: true },
  "BACKUP-METAL": { name: "Backup Métal", icon: "key", essential: true },
  "SEC-KEY": { name: "Clé de Sécurité", icon: "shield", essential: false },
  "SW-HOT": { name: "Wallet Mobile", icon: "wallet", essential: false },
  "EXCHANGE-CEX": { name: "Exchange", icon: "chart", essential: false },
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
  shield: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
  setup: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

// Helper functions
const getScoreColor = (score) => {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-amber-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
};

const getScoreBg = (score) => {
  if (score >= 80) return "bg-green-500/10 border-green-500/30";
  if (score >= 60) return "bg-amber-500/10 border-amber-500/30";
  if (score >= 40) return "bg-orange-500/10 border-orange-500/30";
  return "bg-red-500/10 border-red-500/30";
};

// Results component for LOGGED IN users
function AuditResults({ answers, userSetup, onRestart }) {
  const router = useRouter();

  // Analyze the setup gaps and recommendations
  const analyzeSetup = useCallback(() => {
    const setupProducts = userSetup?.products || [];
    const setupTypes = setupProducts.map(p => p.product_type);
    const setupScore = userSetup?.average_score || 0;

    // Find missing essential categories
    const missingCategories = [];
    Object.entries(PRODUCT_CATEGORIES).forEach(([type, info]) => {
      if (info.essential && !setupTypes.some(t => t?.startsWith(type.split("-")[0]))) {
        missingCategories.push({ type, ...info });
      }
    });

    // Analyze answers for specific needs
    const upgradeNeeds = [];
    const problems = [];
    let profile = "standard";
    let budget = "standard";
    let goal = "security";

    AUDIT_QUESTIONS.forEach(q => {
      const answerId = answers[q.id];
      if (!answerId) return;

      if (q.multiSelect && Array.isArray(answerId)) {
        answerId.forEach(aid => {
          const opt = q.options.find(o => o.id === aid);
          if (opt?.gap) upgradeNeeds.push(opt.gap);
          if (opt?.needs) upgradeNeeds.push(...opt.needs);
        });
      } else {
        const option = q.options.find(o => o.id === answerId);
        if (option) {
          if (option.profile) profile = option.profile;
          if (option.budget) budget = option.budget;
          if (option.goal) goal = option.goal;
          if (option.problem && typeof option.problem === "string") {
            problems.push({ question: q.question, problem: option.problem, urgency: option.urgency });
          }
          if (option.gap) upgradeNeeds.push(option.gap);
          if (option.needs) upgradeNeeds.push(...option.needs);
          if (option.needsUpgrade) upgradeNeeds.push("upgrade_tier");
        }
      }
    });

    // Find low-scoring products that need replacement
    const weakProducts = setupProducts.filter(p => p.score_safe < 60);

    // Calculate setup health
    let healthScore = setupScore;
    if (missingCategories.length > 0) healthScore -= 15 * missingCategories.length;
    if (weakProducts.length > 0) healthScore -= 10 * weakProducts.length;
    if (problems.length > 0) healthScore -= 5 * problems.length;
    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      setupScore,
      healthScore,
      missingCategories,
      weakProducts,
      upgradeNeeds: [...new Set(upgradeNeeds)],
      problems,
      profile,
      budget,
      goal,
      productCount: setupProducts.length,
    };
  }, [answers, userSetup]);

  const analysis = analyzeSetup();

  // Determine urgency level
  const getUrgencyLevel = () => {
    if (analysis.healthScore < 40 || analysis.problems.some(p => p.urgency === "critical")) {
      return { level: "critical", label: "Action urgente requise", color: "error" };
    }
    if (analysis.healthScore < 60 || analysis.missingCategories.length > 1) {
      return { level: "high", label: "Améliorations importantes recommandées", color: "warning" };
    }
    if (analysis.healthScore < 80 || analysis.weakProducts.length > 0) {
      return { level: "medium", label: "Quelques optimisations possibles", color: "amber-500" };
    }
    return { level: "low", label: "Setup bien configuré", color: "success" };
  };

  const urgency = getUrgencyLevel();

  return (
    <div className="space-y-6">
      {/* Setup Health Score */}
      <div className={`rounded-2xl p-6 text-center border-2 ${getScoreBg(analysis.healthScore)}`}>
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="text-center">
            <div className={`text-5xl font-black ${getScoreColor(analysis.healthScore)}`}>
              {Math.round(analysis.healthScore)}
            </div>
            <div className="text-xs opacity-50">Santé du setup</div>
          </div>
          <div className="text-4xl opacity-20">/</div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${getScoreColor(analysis.setupScore)}`}>
              {analysis.setupScore}
            </div>
            <div className="text-xs opacity-50">Score SAFE moyen</div>
          </div>
        </div>

        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
          urgency.level === "critical" ? "bg-error/20 text-error" :
          urgency.level === "high" ? "bg-warning/20 text-warning" :
          urgency.level === "medium" ? "bg-amber-500/20 text-amber-500" :
          "bg-success/20 text-success"
        }`}>
          {urgency.level === "critical" && "🚨"}
          {urgency.level === "high" && "⚠️"}
          {urgency.level === "medium" && "📊"}
          {urgency.level === "low" && "✅"}
          <span className="font-medium">{urgency.label}</span>
        </div>

        <p className="text-sm opacity-60 mt-3">
          {analysis.productCount} produit{analysis.productCount > 1 ? "s" : ""} dans votre setup
        </p>
      </div>

      {/* Problems Detected */}
      {analysis.problems.length > 0 && (
        <div className="bg-error/5 border border-error/30 rounded-xl p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2 text-error">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Points d'attention
          </h3>
          <div className="space-y-2">
            {analysis.problems.map((p, i) => (
              <div key={i} className={`p-3 rounded-lg border-l-4 ${
                p.urgency === "critical" ? "bg-error/10 border-error" :
                p.urgency === "high" ? "bg-warning/10 border-warning" :
                "bg-amber-500/10 border-amber-500"
              }`}>
                <p className="font-medium text-sm">{p.problem}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Categories */}
      {analysis.missingCategories.length > 0 && (
        <div className="bg-warning/5 border border-warning/30 rounded-xl p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2 text-warning">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Éléments manquants dans votre setup
          </h3>
          <div className="space-y-2">
            {analysis.missingCategories.map((cat, i) => (
              <a
                key={i}
                href={`/products?type=${cat.type}`}
                className="flex items-center gap-3 p-3 bg-base-100/70 rounded-lg hover:bg-base-100 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
                  {ICONS[cat.icon]}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-xs text-primary">Voir les recommandations →</p>
                </div>
                {cat.essential && (
                  <span className="badge badge-warning badge-sm">Essentiel</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Weak Products */}
      {analysis.weakProducts.length > 0 && (
        <div className="bg-base-200/50 rounded-xl p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Produits à remplacer
          </h3>
          <div className="space-y-2">
            {analysis.weakProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-base-100/70 rounded-lg">
                <div className={`text-xl font-bold ${getScoreColor(p.score_safe)}`}>
                  {p.score_safe}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs opacity-60">{p.product_type}</p>
                </div>
                <a
                  href={`/products/${p.slug}`}
                  className="btn btn-ghost btn-xs"
                >
                  Alternatives →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Premium Audit CTA */}
      <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-2 border-primary/30 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-black">Rapport d'Audit Complet</h3>
              <span className="badge badge-primary badge-sm">PRO</span>
            </div>
            <p className="text-sm opacity-70 mb-3">
              Obtenez une analyse détaillée de votre setup avec des recommandations personnalisées basées sur votre profil "{analysis.profile}".
            </p>
            <ul className="text-xs space-y-1 mb-4">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Analyse norme par norme de chaque produit
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Plan d'upgrade personnalisé (budget: {analysis.budget})
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Comparaison avec les meilleurs setups du marché
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Export PDF professionnel
              </li>
            </ul>
            <button
              onClick={() => router.push("/dashboard?upgrade=full-audit")}
              className="btn btn-primary w-full"
            >
              Obtenir mon rapport complet - 29,99€
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <a href="/dashboard/setups" className="btn btn-outline btn-sm">
          Gérer mon setup
        </a>
        <a href="/compare" className="btn btn-outline btn-sm">
          Comparer produits
        </a>
      </div>

      {/* Restart */}
      <button onClick={onRestart} className="btn btn-ghost btn-sm w-full opacity-50">
        Refaire l'audit
      </button>
    </div>
  );
}

// Main Component
export default function SetupAuditQuiz({ className = "", onClose }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);

  // Use useApi for setups (shared cache)
  const { data: setupsData, isLoading: loadingSetups } = useUserSetups();

  // Get first setup ID
  const mainSetupId = useMemo(() => {
    if (!setupsData?.setups || setupsData.setups.length === 0) return null;
    return setupsData.setups[0].id;
  }, [setupsData]);

  // Fetch setup details with useApi
  const { data: userSetup, isLoading: loadingDetail } = useApi(
    mainSetupId && session?.user?.id ? `/api/setups/${mainSetupId}` : null,
    { ttl: 2 * 60 * 1000 }
  );

  const loading = !session?.user?.id ? false : (loadingSetups || loadingDetail);

  const question = AUDIT_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion) / AUDIT_QUESTIONS.length) * 100;
  const timeEstimate = Math.ceil((AUDIT_QUESTIONS.length - currentQuestion) * 0.5);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showIntro || isCompleted || loading) return;

      const options = question.options;
      if (!question.multiSelect && e.key >= "1" && e.key <= String(options.length)) {
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
  }, [currentQuestion, showIntro, isCompleted, loading, question]);

  const handleAnswer = (optionId) => {
    setSelectedOption(optionId);
    const newAnswers = { ...answers, [question.id]: optionId };
    setAnswers(newAnswers);

    setTimeout(() => {
      setSelectedOption(null);
      if (currentQuestion < AUDIT_QUESTIONS.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        setIsCompleted(true);
      }
    }, 400);
  };

  const handleMultiSelect = (optionId) => {
    const current = answers[question.id] || [];
    let newSelection;

    if (optionId === "none") {
      newSelection = ["none"];
    } else {
      newSelection = current.includes(optionId)
        ? current.filter(id => id !== optionId)
        : [...current.filter(id => id !== "none"), optionId];
    }

    setAnswers({ ...answers, [question.id]: newSelection });
  };

  const handleMultiSelectConfirm = () => {
    if (currentQuestion < AUDIT_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setIsCompleted(false);
    setShowIntro(true);
  };

  // Redirect non-logged users
  if (!session) {
    return (
      <div className={`bg-base-100 rounded-2xl border border-base-300 p-6 ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Audit de Setup</h2>
          <p className="text-sm opacity-70 mb-4">
            Connectez-vous pour analyser votre setup crypto personnalisé.
          </p>
          <button
            onClick={() => router.push("/signin?callbackUrl=/dashboard")}
            className="btn btn-primary"
          >
            Se connecter
          </button>
          <p className="text-xs opacity-50 mt-4">
            Pas encore de compte ? <a href="/quiz" className="link link-primary">Faire le quiz gratuit</a>
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={`bg-base-100 rounded-2xl border border-base-300 p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </div>
    );
  }

  // No setup warning
  if (!userSetup || !userSetup.products || userSetup.products.length === 0) {
    return (
      <div className={`bg-base-100 rounded-2xl border border-base-300 p-6 ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Aucun setup trouvé</h2>
          <p className="text-sm opacity-70 mb-4">
            Créez d'abord votre setup crypto pour pouvoir l'auditer.
          </p>
          <a href="/stack-builder" className="btn btn-primary">
            Créer mon setup
          </a>
        </div>
      </div>
    );
  }

  // Intro screen
  if (showIntro) {
    return (
      <div className={`bg-base-100 rounded-2xl border border-base-300 p-6 ${className}`}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Audit de votre Setup</h2>
          <p className="text-sm opacity-70">
            Analysons votre configuration pour identifier les améliorations possibles
          </p>
        </div>

        {/* Current Setup Summary */}
        <div className="bg-base-200/50 rounded-xl p-4 mb-6">
          <h3 className="font-medium mb-3">Votre setup actuel</h3>
          <div className="flex items-center gap-4 mb-3">
            <div className={`text-3xl font-black ${getScoreColor(userSetup.average_score || 0)}`}>
              {userSetup.average_score || 0}
            </div>
            <div>
              <p className="font-medium">{userSetup.name || "Mon Setup"}</p>
              <p className="text-xs opacity-60">{userSetup.products?.length || 0} produits</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {userSetup.products?.slice(0, 4).map((p, i) => (
              <span key={i} className="badge badge-ghost badge-sm">{p.name}</span>
            ))}
            {userSetup.products?.length > 4 && (
              <span className="badge badge-ghost badge-sm">+{userSetup.products.length - 4}</span>
            )}
          </div>
        </div>

        <div className="bg-base-200/50 rounded-xl p-4 mb-6">
          <h3 className="font-medium mb-3">Cet audit va analyser:</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <span>Votre utilisation actuelle</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-lg">🔍</span>
              <span>Les gaps dans votre setup</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <span>Les produits à upgrader</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <span>Des recommandations personnalisées</span>
            </li>
          </ul>
        </div>

        <button
          onClick={() => setShowIntro(false)}
          className="btn btn-primary w-full"
        >
          Commencer l'audit
        </button>
      </div>
    );
  }

  // Results screen
  if (isCompleted) {
    return (
      <div className={`bg-base-100 rounded-2xl border border-base-300 p-6 ${className}`}>
        <AuditResults
          answers={answers}
          userSetup={userSetup}
          onRestart={handleRestart}
        />
      </div>
    );
  }

  // Question screen
  const isMultiSelect = question.multiSelect;
  const currentSelection = answers[question.id] || (isMultiSelect ? [] : null);

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
              {currentQuestion + 1}/{AUDIT_QUESTIONS.length}
            </span>
            <span className="text-xs opacity-40">·</span>
            <span className="text-xs opacity-50">
              ~{timeEstimate} min restant{timeEstimate > 1 ? "es" : "e"}
            </span>
          </div>
          {isMultiSelect && (
            <span className="text-xs badge badge-primary badge-outline">Multi-choix</span>
          )}
        </div>

        {/* Question */}
        <div className="flex items-start gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-primary flex-shrink-0">
            {ICONS[question.icon]}
          </div>
          <h3 className="text-xl font-bold leading-tight">{question.question}</h3>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option, idx) => {
            const isSelected = isMultiSelect
              ? currentSelection.includes(option.id)
              : currentSelection === option.id;
            const isAnimating = selectedOption === option.id;

            return (
              <button
                key={option.id}
                onClick={() => isMultiSelect ? handleMultiSelect(option.id) : handleAnswer(option.id)}
                disabled={!isMultiSelect && selectedOption !== null}
                className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 transform
                  ${isAnimating ? "scale-[0.98] border-primary bg-primary/20" : ""}
                  ${isSelected && !isAnimating ? "border-primary bg-primary/10" : ""}
                  ${!isSelected && !isAnimating ? "border-base-300 hover:border-primary/50 hover:bg-base-200/50 active:scale-[0.98]" : ""}
                `}
              >
                <div className="flex items-center gap-4">
                  {/* Number indicator or checkbox */}
                  {isMultiSelect ? (
                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? "border-primary bg-primary" : "border-base-300"
                    }`}>
                      {isSelected && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  ) : (
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors
                      ${isSelected || isAnimating ? "bg-primary text-white" : "bg-base-200 text-base-content/50"}
                    `}>
                      {idx + 1}
                    </span>
                  )}
                  <span className="font-medium flex-1">{option.label}</span>
                  {isAnimating && !isMultiSelect && (
                    <svg className="w-6 h-6 text-primary animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Multi-select confirm button */}
        {isMultiSelect && currentSelection.length > 0 && (
          <button
            onClick={handleMultiSelectConfirm}
            className="btn btn-primary w-full mt-4 h-14 text-base gap-2"
          >
            Continuer
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        )}

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
            {AUDIT_QUESTIONS.map((_, i) => (
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
