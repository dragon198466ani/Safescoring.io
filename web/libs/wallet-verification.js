/**
 * WALLET VERIFICATION - Vérification on-chain
 *
 * Vérifie l'historique d'un wallet pour calculer son poids de vote
 * Données publiques blockchain = pas de RGPD
 */

// API publiques gratuites pour vérifier les wallets
const ETHERSCAN_API = 'https://api.etherscan.io/api';
const POLYGONSCAN_API = 'https://api.polygonscan.com/api';

/**
 * Récupère les infos d'un wallet depuis la blockchain
 * @param {string} address - Adresse wallet 0x...
 * @returns {Object} - Stats du wallet
 */
export async function getWalletStats(address) {
  if (!address || !address.startsWith('0x')) {
    return null;
  }

  try {
    // Essayer Polygon d'abord (plus de chances d'avoir de l'activité DeFi)
    const polygonStats = await getWalletStatsFromChain(address, 'polygon');
    const ethStats = await getWalletStatsFromChain(address, 'ethereum');

    // Combiner les stats
    return {
      address: address.toLowerCase(),
      polygon: polygonStats,
      ethereum: ethStats,
      // Totaux combinés
      totalTxCount: (polygonStats?.txCount || 0) + (ethStats?.txCount || 0),
      oldestTxDate: getOldestDate(polygonStats?.firstTxDate, ethStats?.firstTxDate),
      hasDefiActivity: polygonStats?.hasDefiActivity || ethStats?.hasDefiActivity,
      // Âge en jours
      walletAgeDays: calculateAgeDays(
        getOldestDate(polygonStats?.firstTxDate, ethStats?.firstTxDate)
      ),
    };
  } catch (error) {
    console.error('Error fetching wallet stats:', error);
    return null;
  }
}

/**
 * Récupère les stats d'une chaîne spécifique
 */
async function getWalletStatsFromChain(address, chain) {
  const apiUrl = chain === 'polygon' ? POLYGONSCAN_API : ETHERSCAN_API;
  const apiKey = chain === 'polygon'
    ? process.env.POLYGONSCAN_API_KEY
    : process.env.ETHERSCAN_API_KEY;

  try {
    // Récupérer les transactions
    const response = await fetch(
      `${apiUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey || ''}`,
      { next: { revalidate: 3600 } } // Cache 1h
    );

    const data = await response.json();

    if (data.status !== '1' || !data.result?.length) {
      return { txCount: 0, firstTxDate: null, hasDefiActivity: false };
    }

    const txs = data.result;
    const firstTx = txs[0];
    const firstTxDate = new Date(parseInt(firstTx.timeStamp) * 1000);

    // Vérifier activité DeFi (interactions avec des contrats)
    const contractInteractions = txs.filter(tx =>
      tx.to && tx.input && tx.input !== '0x' && tx.input.length > 10
    );

    return {
      txCount: txs.length,
      firstTxDate: firstTxDate.toISOString(),
      hasDefiActivity: contractInteractions.length > 5,
      lastTxDate: new Date(parseInt(txs[txs.length - 1].timeStamp) * 1000).toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching ${chain} stats:`, error);
    return { txCount: 0, firstTxDate: null, hasDefiActivity: false };
  }
}

/**
 * Calcule le poids de vote basé sur les stats wallet
 */
export function calculateWalletVoteWeight(walletStats) {
  if (!walletStats) return 0.3; // Poids par défaut

  let weight = 0.5; // Base pour wallet connecté

  // Bonus âge du wallet
  if (walletStats.walletAgeDays > 30) weight += 0.1;
  if (walletStats.walletAgeDays > 180) weight += 0.1;
  if (walletStats.walletAgeDays > 365) weight += 0.1;

  // Bonus nombre de transactions
  if (walletStats.totalTxCount > 10) weight += 0.1;
  if (walletStats.totalTxCount > 50) weight += 0.1;
  if (walletStats.totalTxCount > 200) weight += 0.1;

  // Bonus activité DeFi
  if (walletStats.hasDefiActivity) weight += 0.2;

  // Cap à 1.5
  return Math.min(1.5, weight);
}

/**
 * Vérifie une signature de message pour prouver la propriété du wallet
 */
export async function verifyWalletSignature(address, message, signature) {
  try {
    const { ethers } = await import('ethers');
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

// Helpers
function getOldestDate(date1, date2) {
  if (!date1) return date2;
  if (!date2) return date1;
  return new Date(date1) < new Date(date2) ? date1 : date2;
}

function calculateAgeDays(dateStr) {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - date) / (1000 * 60 * 60 * 24));
}
