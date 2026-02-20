"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabase } from "@/libs/supabase";

/**
 * Calculateur d'impôts SASU pour paiements crypto
 * Conforme à la législation française 2025
 */
export default function TaxCalculatorPage() {
  const supabaseRef = useRef(null);

  useEffect(() => {
    supabaseRef.current = getSupabase();
  }, []);

  const [cryptoPayments, setCryptoPayments] = useState([]);
  const [stakingRewards, setStakingRewards] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formulaire dépenses
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  // Formulaire staking
  const [newStaking, setNewStaking] = useState({
    crypto: "SOL",
    amount: "",
    valueEur: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Charger les paiements crypto de l'année en cours
      const year = new Date().getFullYear();
      const { data: payments } = await supabase
        .from("crypto_payments")
        .select("*")
        .gte("created_at", `${year}-01-01`)
        .lte("created_at", `${year}-12-31`)
        .eq("status", "confirmed");

      setCryptoPayments(payments || []);

      // Charger les dépenses (si table existe)
      const { data: expensesData } = await supabase
        .from("expenses")
        .select("*")
        .gte("date", `${year}-01-01`)
        .lte("date", `${year}-12-31`);

      setExpenses(expensesData || []);

      // Charger les récompenses staking (si table existe)
      const { data: stakingData } = await supabase
        .from("staking_rewards")
        .select("*")
        .gte("date", `${year}-01-01`)
        .lte("date", `${year}-12-31`);

      setStakingRewards(stakingData || []);
    } catch (error) {
      console.error("Erreur chargement données:", error);
    } finally {
      setLoading(false);
    }
  }

  // Calculs
  const totalRevenue = cryptoPayments.reduce(
    (sum, p) => sum + (parseFloat(p.amount_usdc) || 0),
    0
  );

  const totalStaking = stakingRewards.reduce(
    (sum, r) => sum + (parseFloat(r.value_eur) || 0),
    0
  );

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + (parseFloat(e.amount) || 0),
    0
  );

  const totalIncome = totalRevenue + totalStaking;
  const taxableProfit = totalIncome - totalExpenses;

  // Calcul IS (Impôt sur les Sociétés)
  let corporateTax = 0;
  if (taxableProfit > 0) {
    if (taxableProfit <= 42500) {
      corporateTax = taxableProfit * 0.15; // 15% sur première tranche
    } else {
      corporateTax = 42500 * 0.15 + (taxableProfit - 42500) * 0.25;
    }
  }

  const netProfit = taxableProfit - corporateTax;

  // Ajouter une dépense
  async function addExpense(e) {
    e.preventDefault();
    try {
      const { error } = await supabase.from("expenses").insert({
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        date: newExpense.date,
      });

      if (error) throw error;

      setNewExpense({
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
      });
      loadData();
    } catch (error) {
      console.error("Erreur ajout dépense:", error);
    }
  }

  // Ajouter une récompense staking
  async function addStakingReward(e) {
    e.preventDefault();
    try {
      const { error } = await supabase.from("staking_rewards").insert({
        crypto: newStaking.crypto,
        amount: parseFloat(newStaking.amount),
        value_eur: parseFloat(newStaking.valueEur),
        date: newStaking.date,
      });

      if (error) throw error;

      setNewStaking({
        crypto: "SOL",
        amount: "",
        valueEur: "",
        date: new Date().toISOString().split("T")[0],
      });
      loadData();
    } catch (error) {
      console.error("Erreur ajout staking:", error);
    }
  }

  // Export CSV pour Delock
  function exportForDelock() {
    const year = new Date().getFullYear();
    let csv = "Type,Date,Description,Crypto,Quantité,Valeur EUR,TxHash\n";

    // Paiements
    cryptoPayments.forEach((p) => {
      csv += `Paiement,${p.created_at?.split("T")[0]},Paiement client,${p.tier || ""},${p.amount_usdc},${p.amount_usdc},${p.tx_hash}\n`;
    });

    // Staking
    stakingRewards.forEach((r) => {
      csv += `Staking,${r.date},Récompense staking,${r.crypto},${r.amount},${r.value_eur},-\n`;
    });

    // Dépenses
    expenses.forEach((e) => {
      csv += `Dépense,${e.date},${e.description},-,-,${e.amount},-\n`;
    });

    // Télécharger
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SafeScoring_Comptabilité_${year}.csv`;
    a.click();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Calculateur d&apos;impôts SASU
          </h1>
          <p className="text-gray-600">
            Calcul automatique de l&apos;impôt sur les sociétés pour vos paiements crypto
          </p>
        </div>

        {/* Résumé fiscal */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <p className="text-sm text-blue-600 font-medium mb-1">
              Revenus crypto
            </p>
            <p className="text-3xl font-bold text-blue-900">
              {totalRevenue.toLocaleString("fr-FR")}€
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {cryptoPayments.length} paiements
            </p>
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
            <p className="text-sm text-green-600 font-medium mb-1">
              Staking rewards
            </p>
            <p className="text-3xl font-bold text-green-900">
              {totalStaking.toLocaleString("fr-FR")}€
            </p>
            <p className="text-xs text-green-600 mt-1">
              {stakingRewards.length} récompenses
            </p>
          </div>

          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
            <p className="text-sm text-orange-600 font-medium mb-1">
              Charges déductibles
            </p>
            <p className="text-3xl font-bold text-orange-900">
              {totalExpenses.toLocaleString("fr-FR")}€
            </p>
            <p className="text-xs text-orange-600 mt-1">
              {expenses.length} dépenses
            </p>
          </div>

          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
            <p className="text-sm text-purple-600 font-medium mb-1">
              Bénéfice imposable
            </p>
            <p className="text-3xl font-bold text-purple-900">
              {taxableProfit.toLocaleString("fr-FR")}€
            </p>
          </div>
        </div>

        {/* Calcul IS */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Calcul de l&apos;Impôt sur les Sociétés (IS)
          </h2>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600">Revenus paiements crypto</span>
              <span className="font-semibold">
                {totalRevenue.toLocaleString("fr-FR")}€
              </span>
            </div>

            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600">+ Récompenses staking</span>
              <span className="font-semibold text-green-600">
                +{totalStaking.toLocaleString("fr-FR")}€
              </span>
            </div>

            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600">- Charges déductibles</span>
              <span className="font-semibold text-orange-600">
                -{totalExpenses.toLocaleString("fr-FR")}€
              </span>
            </div>

            <div className="flex justify-between items-center bg-purple-50 p-3 rounded">
              <span className="font-bold text-purple-900">
                = Bénéfice imposable
              </span>
              <span className="font-bold text-purple-900 text-xl">
                {taxableProfit.toLocaleString("fr-FR")}€
              </span>
            </div>
          </div>

          {taxableProfit > 0 && (
            <>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-2">Détail du calcul IS</h3>
                {taxableProfit <= 42500 ? (
                  <div className="text-sm text-gray-700">
                    <p>
                      Tranche 1 (0 - 42 500€) :{" "}
                      {taxableProfit.toLocaleString("fr-FR")}€ × 15% ={" "}
                      <span className="font-semibold">
                        {corporateTax.toLocaleString("fr-FR")}€
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>
                      Tranche 1 (0 - 42 500€) : 42 500€ × 15% ={" "}
                      <span className="font-semibold">6 375€</span>
                    </p>
                    <p>
                      Tranche 2 (42 500 - {taxableProfit.toLocaleString("fr-FR")}€) :{" "}
                      {(taxableProfit - 42500).toLocaleString("fr-FR")}€ × 25% ={" "}
                      <span className="font-semibold">
                        {((taxableProfit - 42500) * 0.25).toLocaleString("fr-FR")}€
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center bg-red-50 border-2 border-red-200 p-4 rounded-lg mb-4">
                <span className="font-bold text-red-900 text-lg">
                  Impôt sur les Sociétés (IS) à payer
                </span>
                <span className="font-bold text-red-900 text-2xl">
                  {corporateTax.toLocaleString("fr-FR")}€
                </span>
              </div>

              <div className="flex justify-between items-center bg-green-50 border-2 border-green-200 p-4 rounded-lg">
                <span className="font-bold text-green-900 text-lg">
                  Bénéfice NET après IS
                </span>
                <span className="font-bold text-green-900 text-2xl">
                  {netProfit.toLocaleString("fr-FR")}€
                </span>
              </div>
            </>
          )}

          {taxableProfit <= 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-lg">
              <p className="text-yellow-800">
                Aucun impôt à payer (bénéfice négatif ou nul)
              </p>
            </div>
          )}
        </div>

        {/* Ajouter une dépense */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Ajouter une dépense
            </h2>
            <form onSubmit={addExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, description: e.target.value })
                  }
                  placeholder="Ex: Serveurs Vercel"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant (EUR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, amount: e.target.value })
                  }
                  placeholder="100.00"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, date: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-orange-600 text-white font-semibold py-2 rounded-lg hover:bg-orange-700"
              >
                Ajouter dépense
              </button>
            </form>
          </div>

          {/* Ajouter récompense staking */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Ajouter récompense staking
            </h2>
            <form onSubmit={addStakingReward} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Crypto
                </label>
                <select
                  value={newStaking.crypto}
                  onChange={(e) =>
                    setNewStaking({ ...newStaking, crypto: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="SOL">SOL (Solana)</option>
                  <option value="ETH">ETH (Ethereum)</option>
                  <option value="MATIC">MATIC (Polygon)</option>
                  <option value="DOT">DOT (Polkadot)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantité reçue
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  value={newStaking.amount}
                  onChange={(e) =>
                    setNewStaking({ ...newStaking, amount: e.target.value })
                  }
                  placeholder="0.42"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valeur en EUR (au cours du jour)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newStaking.valueEur}
                  onChange={(e) =>
                    setNewStaking({ ...newStaking, valueEur: e.target.value })
                  }
                  placeholder="42.00"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newStaking.date}
                  onChange={(e) =>
                    setNewStaking({ ...newStaking, date: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 text-white font-semibold py-2 rounded-lg hover:bg-green-700"
              >
                Ajouter récompense
              </button>
            </form>
          </div>
        </div>

        {/* Export pour Delock */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Export pour votre comptable Delock
          </h2>
          <p className="text-gray-600 mb-4">
            Téléchargez un fichier CSV contenant toutes vos transactions de l&apos;année
            pour votre expert-comptable.
          </p>
          <button
            onClick={exportForDelock}
            className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Télécharger CSV pour Delock
          </button>
        </div>

        {/* Conseils */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="font-bold text-yellow-900 mb-2">💡 Conseils fiscaux</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>
              • Vous ne payez l&apos;IS que sur vos revenus + staking, pas sur les
              cryptos que vous gardez
            </li>
            <li>
              • Les plus-values latentes (cryptos qui montent) ne sont pas imposées
            </li>
            <li>
              • Toutes vos dépenses professionnelles sont déductibles
            </li>
            <li>
              • Consultez régulièrement votre expert-comptable Delock
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
