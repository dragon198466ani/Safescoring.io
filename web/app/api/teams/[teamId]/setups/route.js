import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * Team Setups API
 *
 * Shared security setups for team collaboration.
 */

// GET - List team's shared setups
export async function GET(request, { params }) {
  const session = await auth();
  const { teamId } = params;

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    // Verify user is team member
    const { data: membership } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", session.user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Not a team member" }, { status: 403 });
    }

    // Get team setups
    const { data: setups, error } = await supabase
      .from("team_setups")
      .select(`
        id,
        name,
        description,
        products,
        score,
        pillar_scores,
        is_template,
        created_by,
        created_at,
        updated_at,
        users!created_by (
          name,
          email,
          image
        )
      `)
      .eq("team_id", teamId)
      .order("updated_at", { ascending: false });

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ setups: [], needsMigration: true });
      }
      throw error;
    }

    return NextResponse.json({
      setups: (setups || []).map(s => ({
        ...s,
        createdByUser: s.users,
        users: undefined,
        canEdit: s.created_by === session.user.id || membership.role === "admin",
      })),
    });
  } catch (error) {
    console.error("Error fetching team setups:", error);
    return NextResponse.json({ error: "Failed to fetch setups" }, { status: 500 });
  }
}

// POST - Create or share setup with team
export async function POST(request, { params }) {
  const session = await auth();
  const { teamId } = params;

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    // Verify user is team member
    const { data: membership } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", session.user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Not a team member" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create": {
        const { name, description, products } = body;

        if (!name || !products || products.length === 0) {
          return NextResponse.json(
            { error: "Name and products are required" },
            { status: 400 }
          );
        }

        // Calculate combined score (simplified)
        const score = products.reduce((sum, p) => sum + (p.score || 0), 0) / products.length;

        const { data: setup, error } = await supabase
          .from("team_setups")
          .insert({
            team_id: teamId,
            name,
            description,
            products,
            score: Math.round(score * 10) / 10,
            created_by: session.user.id,
          })
          .select()
          .single();

        if (error) throw error;

        return NextResponse.json({ setup }, { status: 201 });
      }

      case "share": {
        // Share an existing personal setup with the team
        const { setupId } = body;

        if (!setupId) {
          return NextResponse.json(
            { error: "Setup ID is required" },
            { status: 400 }
          );
        }

        // Get the personal setup
        const { data: personalSetup } = await supabase
          .from("user_setups")
          .select("*")
          .eq("id", setupId)
          .eq("user_id", session.user.id)
          .single();

        if (!personalSetup) {
          return NextResponse.json(
            { error: "Setup not found or not owned by you" },
            { status: 404 }
          );
        }

        // Create team copy
        const { data: teamSetup, error } = await supabase
          .from("team_setups")
          .insert({
            team_id: teamId,
            name: personalSetup.name,
            description: personalSetup.description,
            products: personalSetup.products,
            score: personalSetup.score,
            pillar_scores: personalSetup.pillar_scores,
            created_by: session.user.id,
            source_setup_id: setupId,
          })
          .select()
          .single();

        if (error) throw error;

        return NextResponse.json({
          setup: teamSetup,
          message: "Setup shared with team",
        });
      }

      case "clone": {
        // Clone a team setup to personal setups
        const { setupId } = body;

        if (!setupId) {
          return NextResponse.json(
            { error: "Setup ID is required" },
            { status: 400 }
          );
        }

        // Get team setup
        const { data: teamSetup } = await supabase
          .from("team_setups")
          .select("*")
          .eq("id", setupId)
          .eq("team_id", teamId)
          .single();

        if (!teamSetup) {
          return NextResponse.json({ error: "Setup not found" }, { status: 404 });
        }

        // Create personal copy
        const { data: personalSetup, error } = await supabase
          .from("user_setups")
          .insert({
            user_id: session.user.id,
            name: `${teamSetup.name} (Copy)`,
            description: teamSetup.description,
            products: teamSetup.products,
            score: teamSetup.score,
            pillar_scores: teamSetup.pillar_scores,
          })
          .select()
          .single();

        if (error) throw error;

        return NextResponse.json({
          setup: personalSetup,
          message: "Setup cloned to your personal setups",
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in team setups POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
