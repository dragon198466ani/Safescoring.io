import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin as requireAdminAuth } from "@/libs/admin-auth";

/**
 * API Routes pour la gestion de la queue
 * =====================================
 * GET  /api/admin/queue - Stats de la queue
 * POST /api/admin/queue - Ajouter une tâche
 */

// Lazy initialization to avoid build-time errors
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Admin authentication check using centralized RBAC
async function requireAdmin() {
  const admin = await requireAdminAuth();
  return !!admin;
}

// GET - Stats de la queue
export async function GET(request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "stats") {
      // Récupérer stats agrégées
      const { data, error } = await getSupabase().rpc("get_queue_stats");

      if (error) {
        // Fallback si la fonction n'existe pas
        const { data: tasks } = await getSupabase()
          .from("task_queue")
          .select("status");

        const stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
        tasks?.forEach((t) => {
          if (stats[t.status] !== undefined) stats[t.status]++;
        });

        return NextResponse.json(stats);
      }

      return NextResponse.json(data);
    }

    // Par défaut: liste des tâches récentes
    const { data: tasks, error } = await getSupabase()
      .from("task_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ tasks });
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Ajouter une tâche ou action en masse
export async function POST(request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { action, task_type, target_id, target_type, payload, priority } = body;

    // Actions en masse
    if (action) {
      switch (action) {
        case "evaluate_all": {
          const { data: products } = await getSupabase()
            .from("products")
            .select("id")
            .eq("is_active", true);

          const tasks = products?.map((p) => ({
            task_type: "evaluate_product",
            target_id: p.id,
            target_type: "product",
            priority: 4,
          })) || [];

          if (tasks.length > 0) {
            await getSupabase().from("task_queue").insert(tasks);
          }

          return NextResponse.json({
            success: true,
            message: `${tasks.length} tâches ajoutées`,
          });
        }

        case "recalculate_all": {
          const { data: products } = await getSupabase()
            .from("products")
            .select("id")
            .eq("is_active", true);

          const tasks = products?.map((p) => ({
            task_type: "calculate_score",
            target_id: p.id,
            target_type: "product",
            priority: 5,
          })) || [];

          if (tasks.length > 0) {
            await getSupabase().from("task_queue").insert(tasks);
          }

          return NextResponse.json({
            success: true,
            message: `${tasks.length} tâches ajoutées`,
          });
        }

        case "retry_failed": {
          await getSupabase()
            .from("task_queue")
            .update({ status: "pending", retries: 0, error: null })
            .eq("status", "failed");

          return NextResponse.json({
            success: true,
            message: "Tâches échouées remises en queue",
          });
        }

        case "clear_completed": {
          await getSupabase().from("task_queue").delete().eq("status", "completed");

          return NextResponse.json({
            success: true,
            message: "Tâches terminées supprimées",
          });
        }

        default:
          return NextResponse.json(
            { error: `Action inconnue: ${action}` },
            { status: 400 }
          );
      }
    }

    // Ajout d'une tâche individuelle
    if (task_type && target_id) {
      const { error } = await getSupabase().from("task_queue").insert({
        task_type,
        target_id,
        target_type: target_type || "product",
        priority: priority || 5,
        payload: payload || {},
      });

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `Tâche ${task_type} ajoutée`,
      });
    }

    return NextResponse.json(
      { error: "Paramètres manquants" },
      { status: 400 }
    );
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
