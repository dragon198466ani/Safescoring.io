"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabase } from "@/libs/supabase";

/**
 * Calculateur d'obligations FIAT
 *
 * Objectif: MINIMISER la conversion crypto → fiat
 *
 * Calcule exactement combien de FIAT vous devez avoir pour:
 * - Payer vos impôts (IS, TVA)
 * - Payer vos charges sociales
 * - Payer vos taxes (CFE, etc.)
 * - Payer vos fournisseurs qui n'acceptent que le fiat
 *
 * Résultat: Vous gardez le MAXIMUM de crypto possible
 */
export default function FiatObligationsPage() {
  const supabaseRef = useRef(null);

  useEffect(() => {
    supabaseRef.current = getSupabase();
  }, []);

  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Données
  const [cryptoPayments, setCryptoPayments] = useState([]);
  const [stakingRewards, setStakingRewards] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // Configuration SASU
  const [config, setConfig] = useState({
    // Salaire gérant
    managerSalary: 0,
    socialChargesRate: 0.45,

    // TVA
    tvaRate: 0.20,
    tvaRegime: "normal",

    // Taxes
    cfe: 0,
    cvae: 0,

    // Provisions
    cryptoDepreciation: 0,
    equipmentDepreciation: 0,

    // Crédits
    cir: 0,
  });

  // Dépenses obligatoires en FIAT (qui n'acceptent pas crypto)
  const [fiatOnlyExpenses, setFiatOnlyExpenses] = useState([
    { name: "Expert-comptable Delock", amount: 1200, frequency: "annual", acceptsCrypto: false },
    { name: "CFE", amount: 500, frequency: "annual", acceptsCrypto: false },
    { name: "Assurance RC Pro", amount: 300, frequency: "annual", acceptsCrypto: false },
  ]);

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  async function loadData() {
    try {
      const { data: payments } = await supabase
        .from("crypto_payments")
        .select("*")
        .gte("created_at", `${selectedYear}-01-01`)
        .lte("created_at", `${selectedYear}-12-31`)
        .eq("status", "confirmed");

      setCryptoPayments(payments || []);

      const { data: staking } = await supabase
        .from("staking_rewards")
        .select("*")
        .gte("date", `${selectedYear}-01-01`)
        .lte("date", `${selectedYear}-12-31`);

      setStakingRewards(staking || []);

      const { data: exp } = await supabase
        .from("expenses")
        .select("*")
        .gte("date", `${selectedYear}-01-01`)
        .lte("date", `${selectedYear}-12-31`);

      setExpenses(exp || []);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  }

  // === CALCULS FISCAUX ===

  // Revenus
  const totalRevenueBrut = cryptoPayments.reduce(
    (sum, p) => sum + parseFloat(p.amount_usdc || 0),
    0
  );
  const revenueHT = totalRevenueBrut / (1 + config.tvaRate);
  const tvaSurRevenues = totalRevenueBrut - revenueHT;

  const totalStaking = stakingRewards.reduce(
    (sum, r) => sum + parseFloat(r.value_eur || 0),
    0
  );

  // Charges
  const expensesTotal = expenses.reduce(
    (sum, e) => sum + parseFloat(e.amount || 0),
    0
  );

  const socialCharges = config.managerSalary * config.socialChargesRate;
  const totalSalaryCharges = config.managerSalary + socialCharges;

  const totalCharges =
    expensesTotal +
    totalSalaryCharges +
    config.cfe +
    config.equipmentDepreciation +
    config.cryptoDepreciation;

  // Résultat fiscal
  const beneficeAvantIS = revenueHT + totalStaking - totalCharges;

  // IS
  let corporateTax = 0;
  if (beneficeAvantIS > 0) {
    if (beneficeAvantIS <= 42500) {
      corporateTax = beneficeAvantIS * 0.15;
    } else {
      corporateTax = 42500 * 0.15 + (beneficeAvantIS - 42500) * 0.25;
    }
  }

  const corporateTaxFinal = Math.max(0, corporateTax - config.cir);

  // TVA
  const tvaDeductible =
    config.tvaRegime === "normal"
      ? expenses
          .filter((e) => e.tva_deductible !== false)
          .reduce((sum, e) => {
            const ht = parseFloat(e.amount || 0) / 1.20;
            return sum + (parseFloat(e.amount || 0) - ht);
          }, 0)
      : 0;

  const tvaAPayer = tvaSurRevenues - tvaDeductible;

  // === CALCUL OBLIGATIONS FIAT ===

  // 1. Impôts et taxes à payer en FIAT (obligatoire)
  const obligationsFiscales = [
    {
      type: "IS - Impôt sur les Sociétés",
      montant: corporateTaxFinal,
      echeance: `15/05/${selectedYear + 1}`,
      trimestre: null,
      obligatoireFiat: true,
      details: "Solde annuel après acomptes",
    },
  ];

  // Acomptes IS
  if (corporateTaxFinal > 3000) {
    const acompte = corporateTaxFinal / 4;
    obligationsFiscales.push(
      {
        type: "Acompte IS T1",
        montant: acompte,
        echeance: `15/03/${selectedYear}`,
        trimestre: "T1",
        obligatoireFiat: true,
        details: "25% de l'IS estimé",
      },
      {
        type: "Acompte IS T2",
        montant: acompte,
        echeance: `15/06/${selectedYear}`,
        trimestre: "T2",
        obligatoireFiat: true,
        details: "25% de l'IS estimé",
      },
      {
        type: "Acompte IS T3",
        montant: acompte,
        echeance: `15/09/${selectedYear}`,
        trimestre: "T3",
        obligatoireFiat: true,
        details: "25% de l'IS estimé",
      },
      {
        type: "Acompte IS T4",
        montant: acompte,
        echeance: `15/12/${selectedYear}`,
        trimestre: "T4",
        obligatoireFiat: true,
        details: "25% de l'IS estimé",
      }
    );
  }

  // TVA (mensuelle ou trimestrielle)
  const tvaMensuelle = tvaAPayer / 12;
  if (config.tvaRegime === "normal") {
    // Exemple: TVA mensuelle
    for (let mois = 1; mois <= 12; mois++) {
      obligationsFiscales.push({
        type: `TVA ${mois.toString().padStart(2, "0")}/${selectedYear}`,
        montant: tvaMensuelle,
        echeance: `24/${mois + 1}/${selectedYear}`,
        trimestre: null,
        obligatoireFiat: true,
        details: "Déclaration CA3",
      });
    }
  }

  // CFE
  if (config.cfe > 0) {
    obligationsFiscales.push({
      type: "CFE",
      montant: config.cfe,
      echeance: `15/12/${selectedYear}`,
      trimestre: null,
      obligatoireFiat: true,
      details: "Cotisation Foncière des Entreprises",
    });
  }

  // Charges sociales (si salaire)
  if (config.managerSalary > 0) {
    const chargesMensuelles = socialCharges / 12;
    for (let mois = 1; mois <= 12; mois++) {
      obligationsFiscales.push({
        type: `Charges URSSAF ${mois.toString().padStart(2, "0")}/${selectedYear}`,
        montant: chargesMensuelles,
        echeance: `15/${mois}/${selectedYear}`,
        trimestre: null,
        obligatoireFiat: true,
        details: "Charges sociales gérant",
      });
    }
  }

  // 2. Dépenses fournisseurs en FIAT uniquement
  const depensesFiatObligatoires = fiatOnlyExpenses.map((exp) => ({
    type: exp.name,
    montant: exp.amount,
    echeance: "Variable",
    trimestre: null,
    obligatoireFiat: true,
    details: "Fournisseur n'accepte pas crypto",
  }));

  // TOTAL obligations FIAT
  const totalObligationsFiat =
    obligationsFiscales.reduce((sum, o) => sum + o.montant, 0) +
    depensesFiatObligatoires.reduce((sum, o) => sum + o.montant, 0);

  // 3. Dépenses qui ACCEPTENT crypto (optionnel de convertir)
  const depensesCryptoAcceptees = expenses.filter((e) => e.accepts_crypto === true);
  const totalDepensesCrypto = depensesCryptoAcceptees.reduce(
    (sum, e) => sum + parseFloat(e.amount || 0),
    0
  );

  // === STRATÉGIE DE CONVERSION ===

  // Revenus en crypto
  const totalCryptoRecus = totalRevenueBrut + totalStaking;

  // Minimum FIAT nécessaire
  const minimumFiatNecessaire = totalObligationsFiat;

  // Crypto à garder (si possible)
  const cryptoAGarder = Math.max(0, totalCryptoRecus - minimumFiatNecessaire);

  // Pourcentage à convertir
  const pourcentageAConvertir =
    totalCryptoRecus > 0 ? (minimumFiatNecessaire / totalCryptoRecus) * 100 : 0;

  // Calendrier de conversion optimal (étaler dans l'année)
  const conversionsRecommandees = [];

  // Acomptes IS (si applicable)
  if (corporateTaxFinal > 3000) {
    const acompte = corporateTaxFinal / 4;
    conversionsRecommandees.push(
      { date: `01/03/${selectedYear}`, montant: acompte, raison: "Acompte IS T1" },
      { date: `01/06/${selectedYear}`, montant: acompte, raison: "Acompte IS T2" },
      { date: `01/09/${selectedYear}`, montant: acompte, raison: "Acompte IS T3" },
      { date: `01/12/${selectedYear}`, montant: acompte, raison: "Acompte IS T4" }
    );
  }

  // TVA (exemple: conversion trimestrielle)
  const tvaTrimestrielle = tvaAPayer / 4;
  conversionsRecommandees.push(
    { date: `15/01/${selectedYear}`, montant: tvaTrimestrielle, raison: "TVA T1" },
    { date: `15/04/${selectedYear}`, montant: tvaTrimestrielle, raison: "TVA T2" },
    { date: `15/07/${selectedYear}`, montant: tvaTrimestrielle, raison: "TVA T3" },
    { date: `15/10/${selectedYear}`, montant: tvaTrimestrielle, raison: "TVA T4" }
  );

  // Trier par date
  conversionsRecommandees.sort((a, b) => new Date(a.date) - new Date(b.date));

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
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-4xl font-bold mb-3">
            💰 Calculateur d&apos;Obligations FIAT
          </h1>
          <p className="text-lg opacity-90">
            Gardez vos cryptos ! Convertissez uniquement le strict minimum nécessaire.
          </p>
        </div>

        {/* Résumé principal */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
            <p className="text-sm text-gray-600 mb-2">Crypto reçus (total)</p>
            <p className="text-3xl font-bold text-green-600">
              {totalCryptoRecus.toLocaleString("fr-FR")}€
            </p>
            <p className="text-xs text-gray-500 mt-2">En valeur EUR</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
            <p className="text-sm text-gray-600 mb-2">FIAT obligatoire</p>
            <p className="text-3xl font-bold text-red-600">
              {minimumFiatNecessaire.toLocaleString("fr-FR")}€
            </p>
            <p className="text-xs text-gray-500 mt-2">À convertir minimum</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600 mb-2">Crypto à GARDER</p>
            <p className="text-3xl font-bold text-blue-600">
              {cryptoAGarder.toLocaleString("fr-FR")}€
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Reste dans votre wallet SASU
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
            <p className="text-sm text-gray-600 mb-2">% à convertir</p>
            <p className="text-3xl font-bold text-purple-600">
              {pourcentageAConvertir.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {(100 - pourcentageAConvertir).toFixed(1)}% gardé en crypto
            </p>
          </div>
        </div>

        {/* Message principal */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <div className="text-4xl mr-4">🎯</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Stratégie optimale
              </h2>
              <p className="text-lg text-gray-700 mb-3">
                Pour {selectedYear}, vous devez convertir{" "}
                <span className="font-bold text-red-600">
                  {minimumFiatNecessaire.toLocaleString("fr-FR")}€
                </span>{" "}
                en fiat pour vos obligations fiscales françaises.
              </p>
              <p className="text-lg text-gray-700">
                Vous pouvez <span className="font-bold text-green-600">GARDER</span>{" "}
                <span className="font-bold text-green-600">
                  {cryptoAGarder.toLocaleString("fr-FR")}€
                </span>{" "}
                en crypto (BTC, ETH, SOL, USDC) dans votre SASU ! 🚀
              </p>
            </div>
          </div>
        </div>

        {/* Détail obligations FIAT */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            📋 Obligations à payer en FIAT (obligatoires)
          </h2>

          {/* Impôts et taxes */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-3 text-lg">
              Impôts et taxes (France)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Détails</th>
                    <th className="px-4 py-3 text-left">Échéance</th>
                    <th className="px-4 py-3 text-right">Montant FIAT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {obligationsFiscales.map((obligation, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {obligation.type}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {obligation.details}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {obligation.echeance}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">
                        {obligation.montant.toLocaleString("fr-FR")}€
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-red-50">
                  <tr>
                    <td colSpan="3" className="px-4 py-3 font-bold text-red-900">
                      TOTAL Impôts et taxes
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-900 text-lg">
                      {obligationsFiscales
                        .reduce((sum, o) => sum + o.montant, 0)
                        .toLocaleString("fr-FR")}
                      €
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Fournisseurs FIAT only */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 text-lg">
              Fournisseurs (acceptent uniquement FIAT)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Fournisseur</th>
                    <th className="px-4 py-3 text-left">Fréquence</th>
                    <th className="px-4 py-3 text-right">Montant annuel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {fiatOnlyExpenses.map((exp, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {exp.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {exp.frequency === "annual" ? "Annuel" : "Mensuel"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-orange-600">
                        {exp.amount.toLocaleString("fr-FR")}€
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-orange-50">
                  <tr>
                    <td colSpan="2" className="px-4 py-3 font-bold text-orange-900">
                      TOTAL Fournisseurs FIAT
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-orange-900 text-lg">
                      {fiatOnlyExpenses
                        .reduce((sum, e) => sum + e.amount, 0)
                        .toLocaleString("fr-FR")}
                      €
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Total général */}
          <div className="mt-6 bg-gradient-to-r from-red-100 to-orange-100 border-2 border-red-300 rounded-lg p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-red-700 mb-1">
                  TOTAL MINIMUM FIAT NÉCESSAIRE
                </p>
                <p className="text-xs text-red-600">
                  Montant à convertir en EUR pour vos obligations
                </p>
              </div>
              <p className="text-4xl font-bold text-red-900">
                {minimumFiatNecessaire.toLocaleString("fr-FR")}€
              </p>
            </div>
          </div>
        </div>

        {/* Calendrier de conversion recommandé */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📅 Calendrier de conversion recommandé
          </h2>
          <p className="text-gray-600 mb-6">
            Étalez vos conversions crypto → fiat pour minimiser l&apos;impact du
            marché
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conversionsRecommandees.map((conv, idx) => (
              <div
                key={idx}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-semibold text-blue-900">
                    {conv.date}
                  </p>
                  <p className="text-lg font-bold text-blue-700">
                    {conv.montant.toLocaleString("fr-FR")}€
                  </p>
                </div>
                <p className="text-xs text-blue-600">{conv.raison}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              💡 <strong>Astuce:</strong> Convertissez vos cryptos en USDC d&apos;abord
              (stablecoin), puis en EUR uniquement au moment du paiement. Vous
              minimisez ainsi le risque de volatilité.
            </p>
          </div>
        </div>

        {/* Comparaison avec conversion totale */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📊 Comparaison des stratégies
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Option 1: Tout convertir (mauvais) */}
            <div className="border-2 border-red-300 rounded-lg p-6 bg-red-50">
              <div className="flex items-center mb-3">
                <span className="text-3xl mr-3">❌</span>
                <h3 className="text-lg font-bold text-red-900">
                  Stratégie classique (à éviter)
                </h3>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                Tout convertir en fiat dès réception
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Crypto reçus:</span>
                  <span className="font-semibold">
                    {totalCryptoRecus.toLocaleString("fr-FR")}€
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Converti en EUR:</span>
                  <span className="font-semibold text-red-600">
                    {totalCryptoRecus.toLocaleString("fr-FR")}€
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Gardé en crypto:</span>
                  <span className="font-bold text-red-700">0€</span>
                </div>
              </div>

              <div className="bg-red-100 rounded p-3">
                <p className="text-xs text-red-800 font-semibold mb-2">
                  Inconvénients:
                </p>
                <ul className="text-xs text-red-700 space-y-1">
                  <li>• Perte de potentiel de hausse crypto</li>
                  <li>• Frais de conversion élevés</li>
                  <li>• Exposition 100% à l&apos;inflation EUR</li>
                  <li>• Pas d&apos;avantage fiscal</li>
                </ul>
              </div>
            </div>

            {/* Option 2: Conversion minimale (bon) */}
            <div className="border-2 border-green-300 rounded-lg p-6 bg-green-50">
              <div className="flex items-center mb-3">
                <span className="text-3xl mr-3">✅</span>
                <h3 className="text-lg font-bold text-green-900">
                  Stratégie optimisée (recommandée)
                </h3>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                Conversion minimale, maximum en crypto
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Crypto reçus:</span>
                  <span className="font-semibold">
                    {totalCryptoRecus.toLocaleString("fr-FR")}€
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Converti en EUR:</span>
                  <span className="font-semibold text-orange-600">
                    {minimumFiatNecessaire.toLocaleString("fr-FR")}€
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Gardé en crypto:</span>
                  <span className="font-bold text-green-700 text-lg">
                    {cryptoAGarder.toLocaleString("fr-FR")}€
                  </span>
                </div>
              </div>

              <div className="bg-green-100 rounded p-3">
                <p className="text-xs text-green-800 font-semibold mb-2">
                  Avantages:
                </p>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>
                    • Garde {pourcentageAConvertir.toFixed(0)}% en crypto (BTC, ETH, SOL)
                  </li>
                  <li>• Profite de la hausse potentielle</li>
                  <li>• Frais de conversion minimisés</li>
                  <li>• Plus-values latentes non imposées</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Économie */}
          <div className="mt-6 bg-gradient-to-r from-green-100 to-blue-100 border-2 border-green-400 rounded-lg p-6">
            <div className="text-center">
              <p className="text-sm text-green-700 mb-2">
                CRYPTO CONSERVÉS GRÂCE À LA STRATÉGIE OPTIMISÉE
              </p>
              <p className="text-5xl font-bold text-green-900 mb-2">
                {cryptoAGarder.toLocaleString("fr-FR")}€
              </p>
              <p className="text-lg text-green-800">
                Soit {(100 - pourcentageAConvertir).toFixed(1)}% de vos revenus crypto
                gardés en BTC/ETH/SOL ! 🚀
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
