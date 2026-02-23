import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { checkUnifiedAccess, getPlanLimits } from "@/libs/access";
import crypto from "crypto";

/**
 * Teams/Workspaces API
 *
 * Enterprise feature for team collaboration on security setups.
 * Key lock-in: teams invest in shared setups and configurations.
 */

// GET - List user's teams
export async function GET(request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    // Get teams where user is a member
    const { data: memberships, error } = await supabase
      .from("team_members")
      .select(`
        role,
        joined_at,
        teams (
          id,
          name,
          slug,
          plan,
          owner_id,
          created_at,
          settings
        )
      `)
      .eq("user_id", session.user.id);

    if (error) {
      // Table might not exist yet
      if (error.code === "42P01") {
        return NextResponse.json({ teams: [], needsMigration: true });
      }
      throw error;
    }

    const teams = (memberships || []).map(m => ({
      ...m.teams,
      role: m.role,
      joinedAt: m.joined_at,
      isOwner: m.teams.owner_id === session.user.id,
    }));

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}

// POST - Create team or perform team actions
export async function POST(request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user has team access (paid feature)
  const access = await checkUnifiedAccess({ userId: session.user.id });
  const limits = getPlanLimits(access.plan);

  if (!limits.teams) {
    return NextResponse.json(
      { error: "Teams require a Business plan or higher", upgrade: true },
      { status: 403 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create": {
        const { name } = body;

        if (!name || name.length < 2 || name.length > 50) {
          return NextResponse.json(
            { error: "Team name must be 2-50 characters" },
            { status: 400 }
          );
        }

        // Generate unique slug
        const baseSlug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const slug = `${baseSlug}-${crypto.randomBytes(3).toString("hex")}`;

        // Create team
        const { data: team, error: teamError } = await supabase
          .from("teams")
          .insert({
            name,
            slug,
            owner_id: session.user.id,
            plan: "team",
            settings: { maxMembers: 5 },
          })
          .select()
          .single();

        if (teamError) throw teamError;

        // Add owner as admin member
        await supabase.from("team_members").insert({
          team_id: team.id,
          user_id: session.user.id,
          role: "admin",
        });

        return NextResponse.json({ team }, { status: 201 });
      }

      case "invite": {
        const { teamId, email, role = "member" } = body;

        if (!teamId || !email) {
          return NextResponse.json(
            { error: "Team ID and email are required" },
            { status: 400 }
          );
        }

        // Verify user is team admin
        const { data: membership } = await supabase
          .from("team_members")
          .select("role")
          .eq("team_id", teamId)
          .eq("user_id", session.user.id)
          .single();

        if (!membership || membership.role !== "admin") {
          return NextResponse.json(
            { error: "Only team admins can invite members" },
            { status: 403 }
          );
        }

        // Check team member limit
        const { count } = await supabase
          .from("team_members")
          .select("id", { count: "exact", head: true })
          .eq("team_id", teamId);

        const { data: team } = await supabase
          .from("teams")
          .select("settings")
          .eq("id", teamId)
          .single();

        const maxMembers = team?.settings?.maxMembers || 5;
        if (count >= maxMembers) {
          return NextResponse.json(
            { error: `Team is at maximum capacity (${maxMembers} members)` },
            { status: 400 }
          );
        }

        // Create invite
        const inviteCode = crypto.randomBytes(16).toString("hex");

        const { data: invite, error: inviteError } = await supabase
          .from("team_invites")
          .insert({
            team_id: teamId,
            email: email.toLowerCase(),
            role,
            invite_code: inviteCode,
            invited_by: session.user.id,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          })
          .select()
          .single();

        if (inviteError) throw inviteError;

        const inviteLink = `${process.env.NEXTAUTH_URL}/team/join?code=${inviteCode}`;

        // Send invite email via Resend
        if (process.env.RESEND_API_KEY) {
          try {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);

            // Get team name for the email
            const { data: team } = await supabase
              .from("teams")
              .select("name")
              .eq("id", teamId)
              .single();

            await resend.emails.send({
              from: "SafeScoring <noreply@safescoring.io>",
              to: email.toLowerCase(),
              subject: `You're invited to join ${team?.name || "a team"} on SafeScoring`,
              html: `
                <h2>Team Invitation</h2>
                <p>You've been invited to join <strong>${team?.name || "a team"}</strong> on SafeScoring as <strong>${role}</strong>.</p>
                <p>Click the link below to accept the invitation:</p>
                <p><a href="${inviteLink}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;">Accept Invitation</a></p>
                <p style="color:#666;font-size:12px;">This invitation expires in 7 days.</p>
              `,
            });
          } catch (emailError) {
            console.error("Failed to send invite email:", emailError);
          }
        }

        return NextResponse.json({
          invite: {
            id: invite.id,
            email: invite.email,
            role: invite.role,
            inviteLink,
          },
        });
      }

      case "join": {
        const { inviteCode } = body;

        if (!inviteCode) {
          return NextResponse.json(
            { error: "Invite code is required" },
            { status: 400 }
          );
        }

        // Find valid invite
        const { data: invite, error: inviteError } = await supabase
          .from("team_invites")
          .select("*, teams(id, name)")
          .eq("invite_code", inviteCode)
          .eq("email", session.user.email.toLowerCase())
          .gt("expires_at", new Date().toISOString())
          .is("accepted_at", null)
          .single();

        if (inviteError || !invite) {
          return NextResponse.json(
            { error: "Invalid or expired invite" },
            { status: 400 }
          );
        }

        // Add user to team
        await supabase.from("team_members").insert({
          team_id: invite.team_id,
          user_id: session.user.id,
          role: invite.role,
        });

        // Mark invite as accepted
        await supabase
          .from("team_invites")
          .update({ accepted_at: new Date().toISOString() })
          .eq("id", invite.id);

        return NextResponse.json({
          message: `Joined team ${invite.teams.name}`,
          team: invite.teams,
        });
      }

      case "leave": {
        const { teamId } = body;

        if (!teamId) {
          return NextResponse.json(
            { error: "Team ID is required" },
            { status: 400 }
          );
        }

        // Check if user is owner
        const { data: team } = await supabase
          .from("teams")
          .select("owner_id")
          .eq("id", teamId)
          .single();

        if (team?.owner_id === session.user.id) {
          return NextResponse.json(
            { error: "Team owners cannot leave. Transfer ownership or delete the team." },
            { status: 400 }
          );
        }

        // Remove membership
        await supabase
          .from("team_members")
          .delete()
          .eq("team_id", teamId)
          .eq("user_id", session.user.id);

        return NextResponse.json({ message: "Left team successfully" });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in teams POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete team (owner only)
export async function DELETE(request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("id");

    if (!teamId) {
      return NextResponse.json({ error: "Team ID is required" }, { status: 400 });
    }

    // Verify ownership
    const { data: team } = await supabase
      .from("teams")
      .select("owner_id")
      .eq("id", teamId)
      .single();

    if (!team || team.owner_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only the team owner can delete the team" },
        { status: 403 }
      );
    }

    // Delete team (cascade will handle members, invites, setups)
    await supabase.from("teams").delete().eq("id", teamId);

    return NextResponse.json({ message: "Team deleted successfully" });
  } catch (error) {
    console.error("Error deleting team:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
