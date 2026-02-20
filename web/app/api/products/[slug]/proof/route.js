/**
 * API: /api/products/[slug]/proof
 *
 * Retourne les preuves d'antériorité d'un produit
 * Permet de prouver que SafeScoring a évalué AVANT les concurrents
 */

import { supabase } from "@/libs/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { slug } = params;

  try {
    // 1. Récupérer le produit
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, slug, name")
      .eq("slug", slug)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // 2. Récupérer les preuves
    const { data: proofs, error: proofsError } = await supabase
      .from("evaluation_proofs")
      .select("*")
      .eq("product_id", product.id)
      .order("proof_timestamp", { ascending: false })
      .limit(20);

    // 3. Statistiques
    const { data: summary } = await supabase
      .from("product_proof_summary")
      .select("*")
      .eq("product_id", product.id)
      .single();

    // 4. Formater la réponse
    const response = {
      product: {
        id: product.id,
        slug: product.slug,
        name: product.name,
      },
      summary: summary
        ? {
            totalProofs: summary.total_proofs,
            firstProofDate: summary.first_proof_date
              ? new Date(parseInt(summary.first_proof_date)).toISOString()
              : null,
            latestProofDate: summary.latest_proof_date
              ? new Date(parseInt(summary.latest_proof_date)).toISOString()
              : null,
            latestHash: summary.latest_hash,
            blockchainProofsCount: summary.blockchain_proofs_count,
            latestBlockchainUrl: summary.latest_blockchain_url,
          }
        : null,
      proofs: (proofs || []).map((p) => ({
        hash: p.proof_hash,
        shortHash: `${p.proof_hash.slice(0, 10)}...${p.proof_hash.slice(-8)}`,
        timestamp: p.proof_timestamp,
        date: new Date(parseInt(p.proof_timestamp)).toISOString(),
        dateFormatted: new Date(parseInt(p.proof_timestamp)).toLocaleDateString(
          "fr-FR",
          {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }
        ),
        blockchainTx: p.blockchain_tx,
        verificationUrl: p.verification_url,
        archiveUrl: p.archive_url,
        // Pour vérification par le client
        proofData: p.proof_data,
      })),
      verification: {
        instructions: [
          "1. Copiez le 'proofData' JSON",
          "2. Calculez son hash SHA256",
          "3. Comparez avec le 'hash' - ils doivent correspondre",
          "4. Le timestamp prouve la date d'évaluation",
          "5. Si blockchainTx existe, vérifiez sur Polygonscan",
        ],
        why_ai_proof:
          "L'IA ne peut pas créer de preuves datées dans le passé. Ces hashes prouvent que SafeScoring a évalué ce produit aux dates indiquées.",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching proofs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
