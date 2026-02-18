"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabase } from "@/libs/supabase";

/**
 * Calculateur fiscal complet SASU - Conforme législation française 2025
 * Inclut: IS, TVA, charges sociales, CFE, acomptes, provisions
 */
export default function TaxCalculatorFrancePage() {
  const supabaseRef = useRef(null);

  useEffect(() => {
    supabaseRef.current = getSupabase();
  }, []);

  // États des données
  const [cryptoPayments, setCryptoPayments] = useState([]);
  const [stakingRewards, setStakingRewards] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Paramètres SASU configurables
  const [sasaSettings, setSasaSettings] = useState({
    // Gérant
    managerSalary: 0, // Salaire brut annuel du gérant
    socialChargesRate: 0.45, // 45% de charges sociales (URSSAF)

    // TVA
    tvaRegime: "normal", // 'normal', 'simplifié', 'franchise'
    tvaRate: 0.20, // 20% (taux normal France)
    tvaCollected: 0, // Calculé auto
    tvaDeductible: 0, // Sur dépenses

    // Autres impôts
    cfe: 0, // Cotisation Foncière des Entreprises (varie selon commune)
    cvae: 0, // CVAE si CA > 500k€
    taxeSalaires: 0, // Si pas de TVA récupérable

    // Crédits d'impôt
    cir: 0, // Crédit Impôt Recherche (30% dépenses R&D)
    otherCredits: 0,

    // Provisions
    cryptoDepreciation: 0, // Dépréciation cryptos si baisse valeur
    otherProvisions: 0,

    // Amortissements
    equipmentDepreciation: 0, // Matériel informatique, etc.
  });

  // Formulaires
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    category: "other",
    tvaDeductible: true,
  });

  const [newStaking, setNewStaking] = useState({
    crypto: "SOL",
    amount: "",
    valueEur: "",
    date: new Date().toISOString().split("T")[0],
  });

  // Onglet actif
  const [activeTab, setActiveTab] = useState("synthesis"); // synthesis, details, settings

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  async function loadData() {
    try {
      // 1. Paiements CRYPTO (NOWPayments - BTC, ETH, USDC, SOL)
      const { data: cryptoData } = await supabase
        .from("crypto_payments")
        .select("*")
        .gte("created_at", `${selectedYear}-01-01`)
        .lte("created_at", `${selectedYear}-12-31`)
        .eq("status", "confirmed");

      // 2. Paiements FIAT (Lemon Squeezy - Carte bancaire)
      const { data: fiatData } = await supabase
        .from("fiat_payments")
        .select("*")
        .gte("payment_date", `${selectedYear}-01-01`)
        .lte("payment_date", `${selectedYear}-12-31`)
        .eq("status", "confirmed");

      // Combiner TOUS les paiements (crypto + fiat) pour calculs fiscaux
      const allPayments = [
        ...(cryptoData || []).map(p => ({
          ...p,
          source: 'crypto',
          amount_total: p.amount_usdc,
          payment_date: p.created_at
        })),
        ...(fiatData || []).map(p => ({
          ...p,
          source: 'fiat',
          amount_total: p.amount_eur,
          amount_usdc: p.amount_eur, // Pour compatibilité calculs
          created_at: p.payment_date
        }))
      ];

      setCryptoPayments(allPayments);

      // Récompenses staking
      const { data: staking } = await supabase
        .from("staking_rewards")
        .select("*")
        .gte("date", `${selectedYear}-01-01`)
        .lte("date", `${selectedYear}-12-31`);

      setStakingRewards(staking || []);

      // Dépenses
      const { data: exp } = await supabase
        .from("expenses")
        .select("*")
        .gte("date", `${selectedYear}-01-01`)
        .lte("date", `${selectedYear}-12-31`);

      setExpenses(exp || []);
    } catch (error) {
      console.error("Erreur chargement:", error);
    } finally {
      setLoading(false);
    }
  }

  // === CALCULS FISCAUX ===

  // 1. Revenus
  const totalRevenueBrut = cryptoPayments.reduce(
    (sum, p) => sum + parseFloat(p.amount_usdc || 0),
    0
  );

  const totalStaking = stakingRewards.reduce(
    (sum, r) => sum + parseFloat(r.value_eur || 0),
    0
  );

  // Revenus HT (enlever TVA)
  const revenueHT = totalRevenueBrut / (1 + sasaSettings.tvaRate);
  const tvaSurRevenues = totalRevenueBrut - revenueHT;

  // 2. Charges déductibles
  const expensesTotal = expenses.reduce(
    (sum, e) => sum + parseFloat(e.amount || 0),
    0
  );

  // TVA déductible sur dépenses (si régime normal)
  const tvaDeductibleCalculated =
    sasaSettings.tvaRegime === "normal"
      ? expenses
          .filter((e) => e.tva_deductible !== false)
          .reduce((sum, e) => {
            const amountHT = parseFloat(e.amount || 0) / 1.20;
            const tva = parseFloat(e.amount || 0) - amountHT;
            return sum + tva;
          }, 0)
      : 0;

  // Charges sociales sur salaire gérant
  const socialCharges = sasaSettings.managerSalary * sasaSettings.socialChargesRate;
  const totalSalaryCharges = sasaSettings.managerSalary + socialCharges;

  // Total charges déductibles
  const totalCharges =
    expensesTotal +
    totalSalaryCharges +
    sasaSettings.cfe +
    sasaSettings.equipmentDepreciation +
    sasaSettings.cryptoDepreciation +
    sasaSettings.otherProvisions;

  // 3. Résultat fiscal
  const beneficeAvantIS = revenueHT + totalStaking - totalCharges;

  // 4. Impôt sur les Sociétés (IS)
  let corporateTax = 0;
  if (beneficeAvantIS > 0) {
    if (beneficeAvantIS <= 42500) {
      corporateTax = beneficeAvantIS * 0.15;
    } else {
      corporateTax = 42500 * 0.15 + (beneficeAvantIS - 42500) * 0.25;
    }
  }

  // Déduire crédits d'impôt
  const totalCredits = sasaSettings.cir + sasaSettings.otherCredits;
  const corporateTaxFinal = Math.max(0, corporateTax - totalCredits);

  // 5. Résultat net
  const beneficeNet = beneficeAvantIS - corporateTaxFinal;

  // 6. TVA à payer (ou crédit)
  const tvaAPayer = tvaSurRevenues - tvaDeductibleCalculated;

  // 7. Acomptes IS (si IS > 3000€)
  const acomptesIS =
    corporateTaxFinal > 3000
      ? [
          { trimestre: "T1", montant: corporateTaxFinal * 0.25, date: "15/03" },
          { trimestre: "T2", montant: corporateTaxFinal * 0.25, date: "15/06" },
          { trimestre: "T3", montant: corporateTaxFinal * 0.25, date: "15/09" },
          { trimestre: "T4", montant: corporateTaxFinal * 0.25, date: "15/12" },
        ]
      : [];

  // 8. Dividendes potentiels
  const dividendesPossibles = beneficeNet;
  // Flat tax 30% (12.8% IR + 17.2% prélèvements sociaux)
  const taxeSurDividendes = dividendesPossibles * 0.30;
  const dividendesNets = dividendesPossibles - taxeSurDividendes;

  // 9. Comparaison salaire vs dividendes
  const netSalaire = sasaSettings.managerSalary * (1 - 0.22); // ~22% charges salariales
  const netDividendes = dividendesNets;

  // === FONCTIONS ===

  async function addExpense(e) {
    e.preventDefault();
    try {
      await supabase.from("expenses").insert({
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        date: newExpense.date,
        category: newExpense.category,
        tva_deductible: newExpense.tvaDeductible,
      });

      setNewExpense({
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        category: "other",
        tvaDeductible: true,
      });
      loadData();
    } catch (error) {
      console.error("Erreur:", error);
    }
  }

  async function addStakingReward(e) {
    e.preventDefault();
    try {
      await supabase.from("staking_rewards").insert({
        crypto: newStaking.crypto,
        amount: parseFloat(newStaking.amount),
        value_eur: parseFloat(newStaking.valueEur),
        date: newStaking.date,
      });

      setNewStaking({
        crypto: "SOL",
        amount: "",
        valueEur: "",
        date: new Date().toISOString().split("T")[0],
      });
      loadData();
    } catch (error) {
      console.error("Erreur:", error);
    }
  }

  function exportFiscal() {
    const data = {
      annee: selectedYear,
      revenus: {
        paimentsCrypto: totalRevenueBrut,
        revenusHT: revenueHT,
        stakingRewards: totalStaking,
        total: revenueHT + totalStaking,
      },
      charges: {
        depenses: expensesTotal,
        salairesCharges: totalSalaryCharges,
        cfe: sasaSettings.cfe,
        amortissements: sasaSettings.equipmentDepreciation,
        provisions: sasaSettings.cryptoDepreciation + sasaSettings.otherProvisions,
        total: totalCharges,
      },
      tva: {
        collectee: tvaSurRevenues,
        deductible: tvaDeductibleCalculated,
        aPayer: tvaAPayer,
      },
      impots: {
        beneficeAvantIS: beneficeAvantIS,
        is: corporateTaxFinal,
        credits: totalCredits,
        beneficeNet: beneficeNet,
      },
      acomptes: acomptesIS,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SafeScoring_Fiscal_${selectedYear}.json`;
    a.click();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Calculateur fiscal SASU France
              </h1>
              <p className="text-gray-600">
                Calcul complet: IS, TVA, charges sociales, CFE, acomptes
              </p>
            </div>
            <div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab("synthesis")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "synthesis"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Synthèse fiscale
              </button>
              <button
                onClick={() => setActiveTab("details")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "details"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Détails
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "settings"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Paramètres SASU
              </button>
            </nav>
          </div>
        </div>

        {/* ONGLET 1: SYNTHÈSE */}
        {activeTab === "synthesis" && (
          <div className="space-y-6">
            {/* KPIs principaux */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6">
                <p className="text-sm text-blue-700 font-medium mb-1">
                  Revenus crypto TTC
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  {totalRevenueBrut.toLocaleString("fr-FR")}€
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  HT: {revenueHT.toLocaleString("fr-FR")}€
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-6">
                <p className="text-sm text-green-700 font-medium mb-1">
                  Bénéfice avant IS
                </p>
                <p className="text-3xl font-bold text-green-900">
                  {beneficeAvantIS.toLocaleString("fr-FR")}€
                </p>
                <p className="text-xs text-green-600 mt-1">Imposable</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-lg p-6">
                <p className="text-sm text-red-700 font-medium mb-1">
                  IS à payer
                </p>
                <p className="text-3xl font-bold text-red-900">
                  {corporateTaxFinal.toLocaleString("fr-FR")}€
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {beneficeAvantIS <= 42500 ? "Taux 15%" : "Taux mixte 15%+25%"}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-6">
                <p className="text-sm text-purple-700 font-medium mb-1">
                  Bénéfice NET
                </p>
                <p className="text-3xl font-bold text-purple-900">
                  {beneficeNet.toLocaleString("fr-FR")}€
                </p>
                <p className="text-xs text-purple-600 mt-1">Après IS</p>
              </div>
            </div>

            {/* Tableau de compte de résultat */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Compte de résultat simplifié
              </h2>

              <table className="w-full">
                <tbody className="divide-y divide-gray-200">
                  <tr className="bg-blue-50">
                    <td className="py-3 px-4 font-semibold text-blue-900">
                      PRODUITS (HT)
                    </td>
                    <td></td>
                    <td className="text-right font-bold text-blue-900">
                      {(revenueHT + totalStaking).toLocaleString("fr-FR")}€
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-8 text-gray-700">Ventes prestations (HT)</td>
                    <td className="text-right text-gray-600">
                      {revenueHT.toLocaleString("fr-FR")}€
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-8 text-gray-700">Produits financiers (staking)</td>
                    <td className="text-right text-gray-600">
                      {totalStaking.toLocaleString("fr-FR")}€
                    </td>
                    <td></td>
                  </tr>

                  <tr className="bg-orange-50">
                    <td className="py-3 px-4 font-semibold text-orange-900">
                      CHARGES
                    </td>
                    <td></td>
                    <td className="text-right font-bold text-orange-900">
                      {totalCharges.toLocaleString("fr-FR")}€
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-8 text-gray-700">Achats et services</td>
                    <td className="text-right text-gray-600">
                      {expensesTotal.toLocaleString("fr-FR")}€
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-8 text-gray-700">
                      Salaires + charges sociales
                    </td>
                    <td className="text-right text-gray-600">
                      {totalSalaryCharges.toLocaleString("fr-FR")}€
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-8 text-gray-700">Impôts et taxes (CFE)</td>
                    <td className="text-right text-gray-600">
                      {sasaSettings.cfe.toLocaleString("fr-FR")}€
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-8 text-gray-700">Amortissements</td>
                    <td className="text-right text-gray-600">
                      {sasaSettings.equipmentDepreciation.toLocaleString("fr-FR")}€
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-8 text-gray-700">Provisions</td>
                    <td className="text-right text-gray-600">
                      {(
                        sasaSettings.cryptoDepreciation + sasaSettings.otherProvisions
                      ).toLocaleString("fr-FR")}
                      €
                    </td>
                    <td></td>
                  </tr>

                  <tr className="bg-green-50">
                    <td className="py-3 px-4 font-bold text-green-900">
                      RÉSULTAT AVANT IS
                    </td>
                    <td></td>
                    <td className="text-right font-bold text-green-900 text-lg">
                      {beneficeAvantIS.toLocaleString("fr-FR")}€
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-8 text-red-700 font-semibold">
                      Impôt sur les sociétés (IS)
                    </td>
                    <td className="text-right text-red-600 font-semibold">
                      -{corporateTaxFinal.toLocaleString("fr-FR")}€
                    </td>
                    <td></td>
                  </tr>

                  {totalCredits > 0 && (
                    <tr>
                      <td className="py-2 px-8 text-green-700">
                        Crédits d&apos;impôt (CIR, etc.)
                      </td>
                      <td className="text-right text-green-600">
                        +{totalCredits.toLocaleString("fr-FR")}€
                      </td>
                      <td></td>
                    </tr>
                  )}

                  <tr className="bg-purple-50 border-t-2 border-purple-300">
                    <td className="py-4 px-4 font-bold text-purple-900 text-lg">
                      RÉSULTAT NET (Après IS)
                    </td>
                    <td></td>
                    <td className="text-right font-bold text-purple-900 text-2xl">
                      {beneficeNet.toLocaleString("fr-FR")}€
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* TVA */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                TVA (Taxe sur la Valeur Ajoutée)
              </h2>

              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">TVA collectée</p>
                  <p className="text-2xl font-bold text-red-600">
                    {tvaSurRevenues.toLocaleString("fr-FR")}€
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Sur {totalRevenueBrut.toLocaleString("fr-FR")}€ TTC
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">TVA déductible</p>
                  <p className="text-2xl font-bold text-green-600">
                    {tvaDeductibleCalculated.toLocaleString("fr-FR")}€
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Sur achats</p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    TVA à payer {tvaAPayer < 0 && "(crédit)"}
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      tvaAPayer >= 0 ? "text-orange-600" : "text-blue-600"
                    }`}
                  >
                    {Math.abs(tvaAPayer).toLocaleString("fr-FR")}€
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Déclaration CA3 mensuelle/trimestrielle
                  </p>
                </div>
              </div>
            </div>

            {/* Acomptes IS */}
            {acomptesIS.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Acomptes d&apos;IS {selectedYear}
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Votre IS dépasse 3 000€, vous devez payer 4 acomptes trimestriels
                </p>

                <div className="grid grid-cols-4 gap-4">
                  {acomptesIS.map((acompte) => (
                    <div
                      key={acompte.trimestre}
                      className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center"
                    >
                      <p className="text-sm font-semibold text-orange-900">
                        {acompte.trimestre}
                      </p>
                      <p className="text-2xl font-bold text-orange-700 my-2">
                        {acompte.montant.toLocaleString("fr-FR")}€
                      </p>
                      <p className="text-xs text-orange-600">
                        Échéance: {acompte.date}/{selectedYear}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Salaire vs Dividendes */}
            {sasaSettings.managerSalary === 0 && beneficeNet > 0 && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
                <h3 className="font-bold text-yellow-900 mb-3">
                  💡 Optimisation: Salaire gérant vs Dividendes
                </h3>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="font-semibold text-gray-700 mb-2">
                      Option 1: Se verser {beneficeNet.toLocaleString("fr-FR")}€ en dividendes
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Flat tax 30%: {taxeSurDividendes.toLocaleString("fr-FR")}€</li>
                      <li className="font-bold text-green-700">
                        • NET perçu: {dividendesNets.toLocaleString("fr-FR")}€
                      </li>
                      <li className="text-red-600">
                        • Pas de cotisation retraite ❌
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-700 mb-2">
                      Option 2: Se verser un salaire (ex: 30k€)
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Salaire brut: 30 000€</li>
                      <li>• Charges sociales ~45%: 13 500€</li>
                      <li className="font-bold text-green-700">
                        • NET perçu: ~23 400€
                      </li>
                      <li className="text-green-600">
                        • Cotisations retraite: 13 500€ ✅
                      </li>
                    </ul>
                  </div>
                </div>

                <p className="text-sm text-yellow-800 mt-4">
                  💬 Discutez avec votre comptable Delock pour optimiser selon votre situation
                </p>
              </div>
            )}

            {/* Export */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Export pour Delock
              </h2>
              <button
                onClick={exportFiscal}
                className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Télécharger rapport fiscal JSON
              </button>
            </div>
          </div>
        )}

        {/* ONGLET 2: DÉTAILS */}
        {activeTab === "details" && (
          <div className="space-y-6">
            {/* Formulaires ajout */}
            <div className="grid grid-cols-2 gap-6">
              {/* Ajouter dépense */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4">Ajouter une dépense</h2>
                <form onSubmit={addExpense} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Description"
                    value={newExpense.description}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, description: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Montant TTC (EUR)"
                    value={newExpense.amount}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, amount: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                  <select
                    value={newExpense.category}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, category: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="servers">Serveurs/Hébergement</option>
                    <option value="tools">Outils SaaS</option>
                    <option value="accounting">Comptabilité</option>
                    <option value="marketing">Marketing</option>
                    <option value="equipment">Matériel</option>
                    <option value="other">Autre</option>
                  </select>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newExpense.tvaDeductible}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, tvaDeductible: e.target.checked })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">TVA déductible (20%)</span>
                  </label>
                  <input
                    type="date"
                    value={newExpense.date}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, date: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-orange-600 text-white py-2 rounded hover:bg-orange-700"
                  >
                    Ajouter
                  </button>
                </form>
              </div>

              {/* Ajouter staking */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4">Ajouter récompense staking</h2>
                <form onSubmit={addStakingReward} className="space-y-4">
                  <select
                    value={newStaking.crypto}
                    onChange={(e) =>
                      setNewStaking({ ...newStaking, crypto: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="SOL">Solana (SOL)</option>
                    <option value="ETH">Ethereum (ETH)</option>
                    <option value="MATIC">Polygon (MATIC)</option>
                    <option value="DOT">Polkadot (DOT)</option>
                  </select>
                  <input
                    type="number"
                    step="0.00000001"
                    placeholder="Quantité"
                    value={newStaking.amount}
                    onChange={(e) =>
                      setNewStaking({ ...newStaking, amount: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Valeur EUR (cours du jour)"
                    value={newStaking.valueEur}
                    onChange={(e) =>
                      setNewStaking({ ...newStaking, valueEur: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                  <input
                    type="date"
                    value={newStaking.date}
                    onChange={(e) =>
                      setNewStaking({ ...newStaking, date: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                  >
                    Ajouter
                  </button>
                </form>
              </div>
            </div>

            {/* Liste des transactions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">
                Paiements crypto ({cryptoPayments.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Plan</th>
                      <th className="px-4 py-2 text-right">Montant TTC</th>
                      <th className="px-4 py-2 text-right">Montant HT</th>
                      <th className="px-4 py-2 text-right">TVA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cryptoPayments.map((p) => {
                      const ttc = parseFloat(p.amount_usdc || 0);
                      const ht = ttc / 1.20;
                      const tva = ttc - ht;
                      return (
                        <tr key={p.id}>
                          <td className="px-4 py-2">{p.created_at?.split("T")[0]}</td>
                          <td className="px-4 py-2">{p.tier}</td>
                          <td className="px-4 py-2 text-right font-semibold">
                            {ttc.toFixed(2)}€
                          </td>
                          <td className="px-4 py-2 text-right">{ht.toFixed(2)}€</td>
                          <td className="px-4 py-2 text-right text-red-600">
                            {tva.toFixed(2)}€
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dépenses */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">
                Dépenses ({expenses.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Description</th>
                      <th className="px-4 py-2 text-left">Catégorie</th>
                      <th className="px-4 py-2 text-right">Montant</th>
                      <th className="px-4 py-2 text-center">TVA déd.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {expenses.map((e) => (
                      <tr key={e.id}>
                        <td className="px-4 py-2">{e.date}</td>
                        <td className="px-4 py-2">{e.description}</td>
                        <td className="px-4 py-2">{e.category || "-"}</td>
                        <td className="px-4 py-2 text-right font-semibold">
                          {parseFloat(e.amount).toFixed(2)}€
                        </td>
                        <td className="px-4 py-2 text-center">
                          {e.tva_deductible !== false ? "✅" : "❌"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Staking */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">
                Récompenses staking ({stakingRewards.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Crypto</th>
                      <th className="px-4 py-2 text-right">Quantité</th>
                      <th className="px-4 py-2 text-right">Valeur EUR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stakingRewards.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-2">{r.date}</td>
                        <td className="px-4 py-2">{r.crypto}</td>
                        <td className="px-4 py-2 text-right">
                          {parseFloat(r.amount).toFixed(6)}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-green-600">
                          {parseFloat(r.value_eur).toFixed(2)}€
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 3: PARAMÈTRES */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-6">Paramètres de votre SASU</h2>

              <div className="space-y-6">
                {/* Gérant */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Rémunération gérant</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Salaire brut annuel (EUR)
                      </label>
                      <input
                        type="number"
                        value={sasaSettings.managerSalary}
                        onChange={(e) =>
                          setSasaSettings({
                            ...sasaSettings,
                            managerSalary: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full border rounded px-3 py-2"
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Charges sociales estimées:{" "}
                        {(sasaSettings.managerSalary * sasaSettings.socialChargesRate).toLocaleString(
                          "fr-FR"
                        )}
                        €
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Taux charges sociales (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={sasaSettings.socialChargesRate * 100}
                        onChange={(e) =>
                          setSasaSettings({
                            ...sasaSettings,
                            socialChargesRate: parseFloat(e.target.value) / 100 || 0.45,
                          })
                        }
                        className="w-full border rounded px-3 py-2"
                        placeholder="45"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Défaut: 45% (URSSAF gérant assimilé salarié)
                      </p>
                    </div>
                  </div>
                </div>

                {/* TVA */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">TVA</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Régime TVA
                      </label>
                      <select
                        value={sasaSettings.tvaRegime}
                        onChange={(e) =>
                          setSasaSettings({ ...sasaSettings, tvaRegime: e.target.value })
                        }
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="normal">Régime normal (recommandé)</option>
                        <option value="simplifié">Régime simplifié</option>
                        <option value="franchise">Franchise en base (pas de TVA)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Taux TVA (%)
                      </label>
                      <select
                        value={sasaSettings.tvaRate}
                        onChange={(e) =>
                          setSasaSettings({
                            ...sasaSettings,
                            tvaRate: parseFloat(e.target.value),
                          })
                        }
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="0.20">20% (taux normal France)</option>
                        <option value="0.10">10% (taux réduit)</option>
                        <option value="0.055">5.5% (taux super réduit)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Autres impôts */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Autres impôts et taxes</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        CFE - Cotisation Foncière des Entreprises (EUR/an)
                      </label>
                      <input
                        type="number"
                        value={sasaSettings.cfe}
                        onChange={(e) =>
                          setSasaSettings({
                            ...sasaSettings,
                            cfe: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full border rounded px-3 py-2"
                        placeholder="Entre 200€ et 2000€ selon commune"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        CVAE (si CA &gt; 500k€)
                      </label>
                      <input
                        type="number"
                        value={sasaSettings.cvae}
                        onChange={(e) =>
                          setSasaSettings({
                            ...sasaSettings,
                            cvae: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full border rounded px-3 py-2"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Crédits d'impôt */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Crédits d&apos;impôt</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        CIR - Crédit Impôt Recherche (EUR)
                      </label>
                      <input
                        type="number"
                        value={sasaSettings.cir}
                        onChange={(e) =>
                          setSasaSettings({
                            ...sasaSettings,
                            cir: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full border rounded px-3 py-2"
                        placeholder="30% des dépenses R&D"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Max 100k€/an pour PME
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Autres crédits d&apos;impôt
                      </label>
                      <input
                        type="number"
                        value={sasaSettings.otherCredits}
                        onChange={(e) =>
                          setSasaSettings({
                            ...sasaSettings,
                            otherCredits: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full border rounded px-3 py-2"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Provisions et amortissements */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Provisions et amortissements
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Dépréciation cryptos (EUR)
                      </label>
                      <input
                        type="number"
                        value={sasaSettings.cryptoDepreciation}
                        onChange={(e) =>
                          setSasaSettings({
                            ...sasaSettings,
                            cryptoDepreciation: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full border rounded px-3 py-2"
                        placeholder="Si cours baisse au 31/12"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Déductible si moins-value latente
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Amortissement matériel (EUR/an)
                      </label>
                      <input
                        type="number"
                        value={sasaSettings.equipmentDepreciation}
                        onChange={(e) =>
                          setSasaSettings({
                            ...sasaSettings,
                            equipmentDepreciation: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full border rounded px-3 py-2"
                        placeholder="Ordinateurs, serveurs, etc."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Linéaire sur 3-5 ans
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm text-gray-700 mb-1">
                      Autres provisions
                    </label>
                    <input
                      type="number"
                      value={sasaSettings.otherProvisions}
                      onChange={(e) =>
                        setSasaSettings({
                          ...sasaSettings,
                          otherProvisions: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Conseil:</strong> Ces paramètres impactent directement votre IS.
                  Consultez votre expert-comptable Delock pour optimiser votre fiscalité.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
