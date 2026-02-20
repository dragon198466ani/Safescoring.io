import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { getUserInvoices } from "@/libs/invoice-generator";
import { quickProtect } from "@/libs/api-protection";

/**
 * GET /api/invoices
 *
 * Get all invoices for the authenticated user
 */
export async function GET(req) {
  // Rate limiting
  const protection = await quickProtect(req, "public");
  if (protection.blocked) {
    return NextResponse.json(
      { error: protection.message },
      { status: protection.status }
    );
  }

  try {
    // Get session
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get invoices
    const invoices = await getUserInvoices(session.user.id);

    return NextResponse.json({
      success: true,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        total: inv.total_amount,
        currency: inv.currency,
        status: inv.status,
        vat_treatment: inv.vat_treatment,
        payment_type: inv.payment_type,
      })),
      count: invoices.length,
    });
  } catch (error) {
    console.error("Get invoices error:", error);
    return NextResponse.json(
      { error: "Failed to get invoices" },
      { status: 500 }
    );
  }
}
