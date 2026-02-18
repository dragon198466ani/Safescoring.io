/**
 * AUTO-PROOF SYSTEM - Preuves automatiques IA-proof
 *
 * Chaque évaluation génère automatiquement:
 * 1. Hash SHA256 du score + date
 * 2. Stockage en base avec timestamp
 * 3. Option publication blockchain (Polygon ~0.001€)
 *
 * POURQUOI C'EST IA-PROOF:
 * - L'IA ne peut pas créer de preuves datées dans le passé
 * - Le hash prouve que l'évaluation existait à cette date
 * - Un concurrent qui copie APRÈS ne peut pas avoir la même date
 */

import crypto from 'crypto';

// ============================================
// 1. GÉNÉRATION DE HASH (GRATUIT)
// ============================================

/**
 * Génère un hash de preuve pour une évaluation
 * @param {Object} evaluation - Les données d'évaluation
 * @returns {Object} - Hash + données pour vérification
 */
export function generateProofHash(evaluation) {
  const {
    productId,
    productSlug,
    safeScore,
    scoreS,
    scoreA,
    scoreF,
    scoreE,
    totalNorms,
    yesCount,
    noCount
  } = evaluation;

  const timestamp = Date.now();
  const dateISO = new Date(timestamp).toISOString();

  // Données canoniques (toujours dans le même ordre)
  const proofData = {
    v: 1, // version
    p: productId,
    s: productSlug,
    score: Math.round(safeScore * 100) / 100,
    pillars: {
      S: Math.round(scoreS * 100) / 100,
      A: Math.round(scoreA * 100) / 100,
      F: Math.round(scoreF * 100) / 100,
      E: Math.round(scoreE * 100) / 100,
    },
    norms: { total: totalNorms, yes: yesCount, no: noCount },
    t: timestamp,
  };

  // Hash SHA256
  const dataString = JSON.stringify(proofData);
  const hash = crypto.createHash('sha256').update(dataString).digest('hex');

  return {
    hash: `0x${hash}`,
    timestamp,
    dateISO,
    dataString, // Pour vérification ultérieure
    shortProof: `${hash.slice(0, 8)}...${hash.slice(-8)}`, // Version courte pour affichage
  };
}

/**
 * Vérifie qu'un hash correspond aux données
 */
export function verifyProofHash(hash, dataString) {
  const computed = crypto.createHash('sha256').update(dataString).digest('hex');
  return `0x${computed}` === hash;
}

// ============================================
// 2. STOCKAGE EN BASE (GRATUIT)
// ============================================

/**
 * Sauvegarde la preuve dans Supabase
 */
export async function saveProofToDatabase(supabase, proof, productId) {
  const record = {
    product_id: productId,
    proof_hash: proof.hash,
    proof_data: proof.dataString,
    proof_timestamp: proof.timestamp,
    created_at: proof.dateISO,
    blockchain_tx: null, // Rempli si publié on-chain
    verification_url: null,
  };

  const { data, error } = await supabase
    .from('evaluation_proofs')
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('Error saving proof:', error);
    return null;
  }

  return data;
}

/**
 * Récupère l'historique des preuves d'un produit
 */
export async function getProductProofs(supabase, productId, limit = 10) {
  const { data, error } = await supabase
    .from('evaluation_proofs')
    .select('*')
    .eq('product_id', productId)
    .order('proof_timestamp', { ascending: false })
    .limit(limit);

  return data || [];
}

// ============================================
// 3. PUBLICATION BLOCKCHAIN (OPTIONNEL ~0.001€)
// ============================================

/**
 * Publie le hash sur Polygon (très peu coûteux)
 * Nécessite: POLYGON_RPC_URL et PUBLISHER_PRIVATE_KEY
 */
export async function publishToPolygon(hash) {
  // Import dynamique pour éviter erreur si web3 pas installé
  try {
    const { ethers } = await import('ethers');

    const rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
    const privateKey = process.env.PUBLISHER_PRIVATE_KEY;

    if (!privateKey) {
      console.log('No private key, skipping blockchain publication');
      return null;
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Transaction simple avec le hash en data
    const tx = await wallet.sendTransaction({
      to: wallet.address, // Self-transaction
      value: 0,
      data: ethers.toUtf8Bytes(hash), // Le hash comme données
    });

    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      verificationUrl: `https://polygonscan.com/tx/${receipt.hash}`,
    };
  } catch (error) {
    console.error('Blockchain publication failed:', error.message);
    return null;
  }
}

// ============================================
// 4. ALTERNATIVE GRATUITE: ARCHIVE.ORG
// ============================================

/**
 * Soumet une page à archive.org (gratuit, preuve de date)
 */
export async function archiveProof(productSlug, hash) {
  const proofUrl = `https://safescoring.com/proof/${productSlug}?hash=${hash}`;

  try {
    // Demande d'archivage
    const response = await fetch(
      `https://web.archive.org/save/${proofUrl}`,
      { method: 'GET' }
    );

    if (response.ok) {
      // L'URL archivée avec timestamp
      const archiveUrl = response.headers.get('content-location') ||
        `https://web.archive.org/web/${new Date().toISOString().replace(/[-:]/g, '').slice(0, 14)}/${proofUrl}`;

      return { success: true, archiveUrl };
    }
  } catch (error) {
    console.error('Archive.org submission failed:', error.message);
  }

  return { success: false };
}

// ============================================
// 5. FONCTION PRINCIPALE AUTO
// ============================================

/**
 * Génère et stocke automatiquement une preuve
 * Appelé à chaque mise à jour de score
 */
export async function createAutoProof(supabase, evaluation, options = {}) {
  const { publishBlockchain = false, archiveOrg = false } = options;

  // 1. Générer le hash
  const proof = generateProofHash(evaluation);

  // 2. Sauvegarder en base
  const saved = await saveProofToDatabase(supabase, proof, evaluation.productId);

  // 3. Publication blockchain (optionnel)
  let blockchain = null;
  if (publishBlockchain) {
    blockchain = await publishToPolygon(proof.hash);
    if (blockchain && saved) {
      // Mettre à jour avec le tx hash
      await supabase
        .from('evaluation_proofs')
        .update({
          blockchain_tx: blockchain.txHash,
          verification_url: blockchain.verificationUrl,
        })
        .eq('id', saved.id);
    }
  }

  // 4. Archive.org (optionnel)
  let archive = null;
  if (archiveOrg) {
    archive = await archiveProof(evaluation.productSlug, proof.hash);
  }

  return {
    proof,
    saved,
    blockchain,
    archive,
  };
}

// ============================================
// 6. COMPOSANT D'AFFICHAGE (pour fiche produit)
// ============================================

/**
 * Données pour affichage sur la fiche produit
 */
export function getProofDisplayData(proof) {
  return {
    badge: "✓ Score certifié",
    date: new Date(proof.proof_timestamp).toLocaleDateString('fr-FR'),
    shortHash: `${proof.proof_hash.slice(0, 10)}...`,
    verifyUrl: proof.verification_url || null,
    tooltip: proof.verification_url
      ? "Vérifiable sur blockchain Polygon"
      : "Hash SHA256 horodaté",
  };
}
