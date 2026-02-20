/**
 * WhyAIProof - Explication simple pourquoi nos données sont impossibles à copier
 */

"use client";

export default function WhyAIProof({ className = "" }) {
  return (
    <div className={`rounded-2xl bg-base-200 border border-base-300 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-red-500/10 to-emerald-500/10 border-b border-base-300">
        <h2 className="text-2xl font-bold text-base-content">
          Pourquoi l'IA ne peut pas nous copier
        </h2>
        <p className="text-base-content/60 mt-1">
          Nos données nécessitent du temps réel et des actions humaines vérifiables
        </p>
      </div>

      <div className="p-6 space-y-8">
        {/* Section 1: Le problème */}
        <div>
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="text-red-400">❌</span>
            Ce que l'IA peut copier en 5 minutes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              "Descriptions de produits",
              "Listes de fonctionnalités",
              "Scores inventés",
              "Tableaux comparatifs",
              "Articles de blog",
              "FAQ génériques",
            ].map((item, i) => (
              <div key={i} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Nos avantages */}
        <div>
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="text-emerald-400">✅</span>
            Ce que SafeScoring a et que l'IA ne peut PAS reproduire
          </h3>

          <div className="space-y-4">
            {/* Temps */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-start gap-4">
                <div className="text-3xl">⏱️</div>
                <div>
                  <h4 className="font-semibold text-emerald-400">2+ ans d'historique</h4>
                  <p className="text-sm text-base-content/70 mt-1">
                    Chaque produit a des centaines de snapshots de scores datés.
                    Un concurrent qui démarre aujourd'hui ne peut pas inventer 2 ans de données passées.
                  </p>
                  <div className="mt-2 text-xs text-emerald-400/70">
                    → Nous avons évalué Ledger pour la première fois le 15 mars 2023. Prouvable.
                  </div>
                </div>
              </div>
            </div>

            {/* Blockchain */}
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-start gap-4">
                <div className="text-3xl">⛓️</div>
                <div>
                  <h4 className="font-semibold text-purple-400">Preuves blockchain</h4>
                  <p className="text-sm text-base-content/70 mt-1">
                    Chaque évaluation génère un hash SHA256 publié sur Polygon.
                    Ce hash prouve que notre score existait à cette date précise.
                  </p>
                  <div className="mt-2 text-xs text-purple-400/70">
                    → Impossible de falsifier des timestamps blockchain passés.
                  </div>
                </div>
              </div>
            </div>

            {/* Community */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-4">
                <div className="text-3xl">👥</div>
                <div>
                  <h4 className="font-semibold text-amber-400">Vrais utilisateurs vérifiés</h4>
                  <p className="text-sm text-base-content/70 mt-1">
                    Nos corrections sont votées par des humains avec des comptes email vérifiés
                    ou des wallets crypto avec historique on-chain.
                  </p>
                  <div className="mt-2 text-xs text-amber-400/70">
                    → L'IA ne peut pas créer 1000 vrais comptes avec activité DeFi.
                  </div>
                </div>
              </div>
            </div>

            {/* Staking */}
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-start gap-4">
                <div className="text-3xl">💎</div>
                <div>
                  <h4 className="font-semibold text-blue-400">Staking de vrais tokens</h4>
                  <p className="text-sm text-base-content/70 mt-1">
                    Les votes des utilisateurs qui stakent $SAFE comptent plus.
                    Staker nécessite de vrais tokens, pas du texte généré.
                  </p>
                  <div className="mt-2 text-xs text-blue-400/70">
                    → Un bot ne peut pas staker de l'argent réel pour voter.
                  </div>
                </div>
              </div>
            </div>

            {/* Incidents */}
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🚨</div>
                <div>
                  <h4 className="font-semibold text-red-400">Incidents réels vérifiables</h4>
                  <p className="text-sm text-base-content/70 mt-1">
                    Nos données d'incidents proviennent de sources publiques (Rekt.news, DefiLlama).
                    Les montants perdus sont vérifiables on-chain.
                  </p>
                  <div className="mt-2 text-xs text-red-400/70">
                    → L'IA ne peut pas inventer des hacks qui ont vraiment eu lieu.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Résumé simple */}
        <div className="p-6 rounded-xl bg-gradient-to-r from-base-300 to-base-200 border border-base-300">
          <h3 className="font-semibold text-lg mb-4 text-center">En résumé</h3>
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead>
                <tr>
                  <th>Donnée</th>
                  <th className="text-center">L'IA peut créer ?</th>
                  <th className="text-center">SafeScoring a ?</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Texte marketing</td>
                  <td className="text-center text-red-400">Oui ❌</td>
                  <td className="text-center text-base-content/50">—</td>
                </tr>
                <tr>
                  <td>Scores inventés</td>
                  <td className="text-center text-red-400">Oui ❌</td>
                  <td className="text-center text-base-content/50">—</td>
                </tr>
                <tr className="bg-emerald-500/5">
                  <td>2 ans d'historique daté</td>
                  <td className="text-center text-emerald-400">Non ✅</td>
                  <td className="text-center text-emerald-400">Oui ✅</td>
                </tr>
                <tr className="bg-emerald-500/5">
                  <td>Hash blockchain datés</td>
                  <td className="text-center text-emerald-400">Non ✅</td>
                  <td className="text-center text-emerald-400">Oui ✅</td>
                </tr>
                <tr className="bg-emerald-500/5">
                  <td>Votes de vrais wallets</td>
                  <td className="text-center text-emerald-400">Non ✅</td>
                  <td className="text-center text-emerald-400">Oui ✅</td>
                </tr>
                <tr className="bg-emerald-500/5">
                  <td>Staking de vrais $SAFE</td>
                  <td className="text-center text-emerald-400">Non ✅</td>
                  <td className="text-center text-emerald-400">Oui ✅</td>
                </tr>
                <tr className="bg-emerald-500/5">
                  <td>Incidents réels on-chain</td>
                  <td className="text-center text-emerald-400">Non ✅</td>
                  <td className="text-center text-emerald-400">Oui ✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Conclusion */}
        <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-lg font-medium text-primary">
            💡 Notre avantage = Le temps + Les humains + La blockchain
          </p>
          <p className="text-sm text-base-content/60 mt-2">
            Chaque jour qui passe, notre avance devient plus grande.
            <br />
            Un concurrent qui commence aujourd'hui ne rattrapera jamais 2 ans de données réelles.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Version compacte pour embed
 */
export function WhyAIProofCompact() {
  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-purple-500/10 border border-emerald-500/20">
      <h4 className="font-semibold text-base-content mb-3 flex items-center gap-2">
        <span>🛡️</span>
        Données impossibles à copier
      </h4>
      <ul className="text-sm space-y-2 text-base-content/70">
        <li className="flex items-center gap-2">
          <span className="text-emerald-400">✅</span>
          2+ ans d'historique avec preuves blockchain
        </li>
        <li className="flex items-center gap-2">
          <span className="text-emerald-400">✅</span>
          Votes pondérés par wallets vérifiés
        </li>
        <li className="flex items-center gap-2">
          <span className="text-emerald-400">✅</span>
          Staking $SAFE = engagement réel
        </li>
        <li className="flex items-center gap-2">
          <span className="text-emerald-400">✅</span>
          Incidents réels vérifiables on-chain
        </li>
      </ul>
      <p className="text-xs text-base-content/50 mt-3">
        L'IA peut générer du texte, pas du temps réel ni de l'argent réel.
      </p>
    </div>
  );
}
