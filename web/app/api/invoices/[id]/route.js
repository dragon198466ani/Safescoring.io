import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { getInvoice, getInvoiceByNumber, generateInvoiceHTML } from "@/libs/invoice-generator";
import { quickProtect } from "@/libs/api-protection";

/**
 * GET /api/invoices/[id]
 *
 * Get invoice details or HTML for PDF generation
 * Query params:
 * - format: 'json' (default) | 'html'
 */
export async function GET(req, { params }) {
  // Rate limiting
  const protection = await quickProtect(req, "public");
  if (protection.blocked) {
    return NextResponse.json(
      { error: protection.message },
      { status: protection.status }
    );
  }

  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";

    // Get session for authorization
    const session = await auth();

    if (!id) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // Try to get invoice by ID or invoice number
    let invoice;
    try {
      // Check if it's a UUID or invoice number
      if (id.startsWith("INV-")) {
        invoice = await getInvoiceByNumber(id);
      } else {
        invoice = await getInvoice(id);
      }
    } catch {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Authorization: user can only see their own invoices
    // (unless admin - but we don't check that here for simplicity)
    if (invoice.user_id && session?.user?.id !== invoice.user_id) {
      // Allow access if the email matches
      if (session?.user?.email !== invoice.buyer_email) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }
    }

    // Return based on format
    if (format === "html") {
      const html = generateInvoiceHTML(invoice);
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    // Default: return JSON
    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        status: invoice.status,
        seller: {
          name: invoice.seller_name,
          address: invoice.seller_address,
          country: invoice.seller_country,
        },
        buyer: {
          name: invoice.buyer_name,
          company: invoice.buyer_company,
          address: invoice.buyer_address,
          country: invoice.buyer_country,
          vat_number: invoice.buyer_vat_number,
          email: invoice.buyer_email,
        },
        line_items: invoice.line_items,
        subtotal: invoice.subtotal_amount,
        vat_rate: invoice.vat_rate,
        vat_amount: invoice.vat_amount,
        total: invoice.total_amount,
        currency: invoice.currency,
        vat_treatment: invoice.vat_treatment,
        reverse_charge_note: invoice.reverse_charge_note,
        payment_type: invoice.payment_type,
        payment_date: invoice.payment_date,
      },
    });
  } catch (error) {
    console.error("Get invoice error:", error);
    return NextResponse.json(
      { error: "Failed to get invoice" },
      { status: 500 }
    );
  }
}
