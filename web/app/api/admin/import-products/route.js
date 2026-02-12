/**
 * Admin Bulk Product Import
 *
 * POST /api/admin/import-products
 *
 * Accepts a JSON array of products and inserts them into Supabase,
 * then queues evaluation tasks for each new product.
 *
 * Body (JSON):
 * {
 *   "products": [
 *     { "name": "Ledger Nano X", "slug": "ledger-nano-x", "url": "https://...", "type_id": 1, "brand": "Ledger" },
 *     ...
 *   ]
 * }
 *
 * Also accepts CSV text:
 * {
 *   "csv": "name,slug,url,type_id,brand\nLedger Nano X,ledger-nano-x,https://...,1,Ledger"
 * }
 */

import { requireAdmin, unauthorizedResponse } from "@/libs/admin-auth";
import { supabaseAdmin } from "@/libs/supabase";

function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const products = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    if (values.length < 2) continue;

    const product = {};
    headers.forEach((header, idx) => {
      product[header] = values[idx] || "";
    });

    // Ensure required fields
    if (product.name && product.slug) {
      products.push({
        name: product.name,
        slug: product.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        url: product.url || null,
        type_id: product.type_id ? parseInt(product.type_id, 10) : null,
        brand: product.brand || null,
      });
    }
  }

  return products;
}

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return unauthorizedResponse("Admin access required");

  if (!supabaseAdmin) {
    return Response.json({ error: "Supabase not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    let products = [];

    // Parse CSV or JSON array
    if (body.csv) {
      products = parseCSV(body.csv);
    } else if (body.products && Array.isArray(body.products)) {
      products = body.products.map((p) => ({
        name: p.name,
        slug: (p.slug || p.name)
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-"),
        url: p.url || null,
        type_id: p.type_id ? parseInt(p.type_id, 10) : null,
        brand: p.brand || null,
      }));
    }

    if (products.length === 0) {
      return Response.json(
        { error: "No valid products found. Send { products: [...] } or { csv: '...' }" },
        { status: 400 }
      );
    }

    // Deduplicate by slug
    const seen = new Set();
    products = products.filter((p) => {
      if (seen.has(p.slug)) return false;
      seen.add(p.slug);
      return true;
    });

    // Check existing slugs to avoid duplicates
    const slugs = products.map((p) => p.slug);
    const { data: existing } = await supabaseAdmin
      .from("products")
      .select("slug")
      .in("slug", slugs);

    const existingSlugs = new Set((existing || []).map((e) => e.slug));
    const newProducts = products.filter((p) => !existingSlugs.has(p.slug));
    const skipped = products.length - newProducts.length;

    if (newProducts.length === 0) {
      return Response.json({
        inserted: 0,
        skipped,
        queued: 0,
        message: "All products already exist",
      });
    }

    // Insert in batches of 50
    let inserted = 0;
    const insertedIds = [];

    for (let i = 0; i < newProducts.length; i += 50) {
      const batch = newProducts.slice(i, i + 50);
      const { data, error } = await supabaseAdmin
        .from("products")
        .insert(batch)
        .select("id, slug");

      if (error) {
        console.error("[IMPORT] Batch insert error:", error.message);
        continue;
      }

      inserted += data.length;
      insertedIds.push(...data);
    }

    // Queue evaluation tasks for new products
    let queued = 0;
    for (const product of insertedIds) {
      const { error: queueError } = await supabaseAdmin
        .from("task_queue")
        .insert({
          task_type: "evaluate_product",
          target_id: product.id,
          target_type: "product",
          priority: 5,
          payload: { slug: product.slug, source: "bulk_import" },
        });

      if (!queueError) queued++;
    }

    return Response.json({
      inserted,
      skipped,
      queued,
      message: `${inserted} products imported, ${queued} queued for evaluation, ${skipped} skipped (already exist)`,
    });
  } catch (error) {
    console.error("[IMPORT] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
