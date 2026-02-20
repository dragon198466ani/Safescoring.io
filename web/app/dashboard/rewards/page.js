/**
 * /dashboard/rewards - Page des récompenses $SAFE
 */

import ContributionsDashboard from "@/components/ContributionsDashboard";
import SafeShop from "@/components/SafeShop";
import StakingPanel from "@/components/StakingPanel";
import StakingLeaderboard from "@/components/StakingLeaderboard";

export const metadata = {
  title: "Mes récompenses $SAFE | SafeScoring",
  description: "Gagne et dépense des $SAFE en vérifiant les scores de sécurité",
};

export default function RewardsPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">🪙 Mes récompenses</h1>
        <p className="text-base-content/60 mt-2">
          Gagne des $SAFE en vérifiant les évaluations, dépense-les pour des avantages
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed w-fit">
        <a className="tab tab-active" href="#contributions">Contributions</a>
        <a className="tab" href="#staking">Staking</a>
        <a className="tab" href="#shop">Boutique</a>
        <a className="tab" href="#leaderboard">Leaderboard</a>
      </div>

      {/* Contributions */}
      <section id="contributions">
        <ContributionsDashboard />
      </section>

      {/* Staking */}
      <section id="staking" className="pt-8">
        <h2 className="text-2xl font-bold mb-6">🔒 Staking $SAFE</h2>
        <p className="text-base-content/60 mb-4">
          Stakez vos $SAFE pour augmenter votre poids de vote jusqu'à +1.0x
        </p>
        <StakingPanel />
      </section>

      {/* Boutique */}
      <section id="shop" className="pt-8">
        <h2 className="text-2xl font-bold mb-6">🛒 Boutique $SAFE</h2>
        <SafeShop />
      </section>

      {/* Leaderboard */}
      <section id="leaderboard" className="pt-8">
        <h2 className="text-2xl font-bold mb-6">🏆 Top Stakers</h2>
        <p className="text-base-content/60 mb-4">
          Les plus gros stakers ont le plus d'influence sur les validations
        </p>
        <StakingLeaderboard />
      </section>

      {/* Comment ça marche */}
      <section className="card bg-base-200 p-6">
        <h2 className="text-xl font-bold mb-4">❓ Comment ça marche</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <div>
            <div className="text-3xl mb-2">1️⃣</div>
            <h3 className="font-semibold mb-1">Vérifie</h3>
            <p className="text-sm text-base-content/60">
              Confirme ou conteste les évaluations IA sur les fiches produits
            </p>
          </div>
          <div>
            <div className="text-3xl mb-2">2️⃣</div>
            <h3 className="font-semibold mb-1">Gagne</h3>
            <p className="text-sm text-base-content/60">
              +10 $SAFE par vérification, +20 si consensus atteint
            </p>
          </div>
          <div>
            <div className="text-3xl mb-2">3️⃣</div>
            <h3 className="font-semibold mb-1">Dépense</h3>
            <p className="text-sm text-base-content/60">
              Premium gratuit, badges exclusifs, fonctionnalités bonus
            </p>
          </div>
        </div>

        <div className="divider"></div>

        <div className="text-sm text-base-content/50">
          <strong>💡 Futur:</strong> Les $SAFE seront convertibles en vrais tokens lors de l'airdrop.
          Plus tu accumules maintenant, plus tu recevras.
        </div>
      </section>
    </div>
  );
}
