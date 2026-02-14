import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabase";
import {
  requireAdmin,
  logAdminAction,
  unauthorizedResponse,
} from "@/libs/admin-auth";

/**
 * GET /api/admin/claims
 * Get all claim requests with optional filtering
 */
export async function GET(request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit")) || 50;

    let query = supabaseAdmin
      .from("claim_requests")
      .select(`
        *,
        products:product_id (id, name, slug)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: claims, error } = await query;

    if (error) {
      console.error("Error fetching claims:", error);
      return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
    }

    // Get counts by status
    const { data: pendingCount } = await supabaseAdmin
      .from("claim_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { data: dnsVerifiedCount } = await supabaseAdmin
      .from("claim_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "dns_verified");

    return NextResponse.json({
      claims: claims || [],
      stats: {
        pending: pendingCount?.count || 0,
        dns_verified: dnsVerifiedCount?.count || 0,
      },
    });
  } catch (error) {
    console.error("Claims GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/claims
 * Update a claim request (approve/reject)
 */
export async function PATCH(request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { id, status, admin_notes } = body;

    if (!id) {
      return NextResponse.json({ error: "Claim ID is required" }, { status: 400 });
    }

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    // Update the claim
    const { data: claim, error } = await supabaseAdmin
      .from("claim_requests")
      .update({
        status,
        admin_notes: admin_notes || null,
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating claim:", error);
      return NextResponse.json({ error: "Failed to update claim" }, { status: 500 });
    }

    // Send email notification to claimant about the decision
    if (process.env.RESEND_API_KEY && claim?.email) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const isApproved = status === "approved";
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "SafeScoring <noreply@safescoring.io>",
          to: claim.email,
          subject: `Your product claim has been ${status}`,
          html: `<h2>Claim ${isApproved ? "Approved" : "Rejected"}</h2>
            <p>Your claim request has been <strong>${status}</strong>.</p>
            ${admin_notes ? `<p><em>Note: ${admin_notes}</em></p>` : ""}
            ${isApproved ? "<p>You can now manage your product on SafeScoring.</p>" : ""}
            <p>— The SafeScoring Team</p>`,
        });
      } catch (emailError) {
        console.error("Failed to send claim notification:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      claim,
      message: `Claim ${status} successfully`,
    });
  } catch (error) {
    console.error("Claims PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/claims
 * Delete a claim request
 */
export async function DELETE(request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Claim ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("claim_requests")
      .delete()
      .eq("id", parseInt(id));

    if (error) {
      console.error("Error deleting claim:", error);
      return NextResponse.json({ error: "Failed to delete claim" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Claim deleted successfully",
    });
  } catch (error) {
    console.error("Claims DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
