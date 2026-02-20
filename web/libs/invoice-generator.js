/**
 * Invoice Generator for VAT Compliance
 *
 * Generates invoices for crypto and fiat payments
 * Stores invoice records in database
 * Supports PDF generation via API route
 */

import { createClient } from "@supabase/supabase-js";

/**
 * Get Supabase admin client
 */
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Generate next invoice number
 * Format: INV-YYYYMM-XXXXXX
 */
export async function generateInvoiceNumber() {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  // Get next sequence value
  const { data, error } = await supabase.rpc("nextval", {
    seq_name: "invoice_number_seq",
  });

  // Fallback if RPC doesn't work
  const seq = data || Math.floor(Math.random() * 900000) + 100000;
  const seqStr = String(seq).padStart(6, "0");

  return `INV-${year}${month}-${seqStr}`;
}

/**
 * Create invoice record in database
 *
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string} params.billingProfileId - Billing profile ID
 * @param {string} params.paymentId - Payment ID (crypto_payments or fiat_payments)
 * @param {string} params.paymentType - 'crypto' or 'fiat'
 * @param {Array} params.lineItems - Line items [{description, quantity, unit_price}]
 * @param {Object} params.vatInfo - VAT calculation info
 * @param {string} params.currency - Currency code (USD, EUR)
 */
export async function createInvoice({
  userId,
  billingProfileId,
  paymentId,
  paymentType,
  lineItems,
  vatInfo,
  currency = "USD",
}) {
  const supabase = getSupabaseAdmin();

  // Get billing profile
  let billing = null;
  if (billingProfileId) {
    const { data } = await supabase
      .from("billing_profiles")
      .select("*")
      .eq("id", billingProfileId)
      .single();
    billing = data;
  }

  // Calculate totals
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const vatAmount =
    vatInfo?.treatment === "standard" ? subtotal * (vatInfo?.rate || 0) : 0;
  const total = subtotal + vatAmount;

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber();

  // Build reverse charge note if applicable
  let reverseChargeNote = null;
  if (vatInfo?.treatment === "reverse_charge") {
    reverseChargeNote =
      "VAT reverse charge applies pursuant to Article 196 of Council Directive 2006/112/EC. The recipient is liable for VAT.";
  }

  // Build buyer address
  const buyerAddress = billing
    ? [
        billing.address_line1,
        billing.address_line2,
        billing.city,
        billing.postal_code,
        billing.country_code,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  // Create invoice record
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      user_id: userId || null,
      billing_profile_id: billingProfileId || null,
      payment_id: paymentId,
      payment_type: paymentType,
      invoice_type: "invoice",

      // Seller (SafeScoring)
      seller_name: "SafeScoring LLC",
      seller_address: "Wyoming, United States",
      seller_country: "US",

      // Buyer
      buyer_name: billing?.billing_name || billing?.company_name || "Customer",
      buyer_company: billing?.company_name || null,
      buyer_address: buyerAddress,
      buyer_country: billing?.country_code || vatInfo?.country || "XX",
      buyer_vat_number: billing?.vat_number || null,
      buyer_email: billing?.billing_email || null,

      // Line items
      line_items: lineItems,

      // Amounts
      subtotal_amount: Math.round(subtotal * 100) / 100,
      vat_amount: Math.round(vatAmount * 100) / 100,
      total_amount: Math.round(total * 100) / 100,
      currency,

      // VAT details
      vat_rate: vatInfo?.rate || 0,
      vat_treatment: vatInfo?.treatment || "export_exempt",
      reverse_charge_note: reverseChargeNote,

      // Dates
      invoice_date: new Date().toISOString().split("T")[0],
      payment_date: new Date().toISOString().split("T")[0],

      // Status
      status: "issued",
    })
    .select()
    .single();

  if (error) {
    console.error("Invoice creation error:", error);
    throw error;
  }

  return invoice;
}

/**
 * Get invoice by ID
 */
export async function getInvoice(invoiceId) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get invoice by number
 */
export async function getInvoiceByNumber(invoiceNumber) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("invoice_number", invoiceNumber)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get invoices for a user
 */
export async function getUserInvoices(userId, limit = 50) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", userId)
    .order("invoice_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Generate invoice HTML (for PDF conversion or display)
 */
export function generateInvoiceHTML(invoice) {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const lineItemsHTML = invoice.line_items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unit_price, invoice.currency)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.quantity * item.unit_price, invoice.currency)}</td>
      </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px; color: #1f2937; }
    .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #e5e7eb; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
    .invoice-title { font-size: 32px; color: #6b7280; }
    .info-section { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .info-box { width: 45%; }
    .info-label { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; }
    .info-content { font-size: 14px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f9fafb; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    .totals { width: 300px; margin-left: auto; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .totals-row.total { font-weight: bold; font-size: 18px; border-top: 2px solid #e5e7eb; padding-top: 12px; }
    .reverse-charge { background: #ecfdf5; border: 1px solid #10b981; padding: 16px; border-radius: 8px; margin-bottom: 30px; color: #065f46; font-size: 13px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="invoice-box">
    <div class="header">
      <div class="logo">SafeScoring</div>
      <div class="invoice-title">INVOICE</div>
    </div>

    <div class="info-section">
      <div class="info-box">
        <div class="info-label">From</div>
        <div class="info-content">
          <strong>${invoice.seller_name}</strong><br>
          ${invoice.seller_address}<br>
          ${invoice.seller_country}
        </div>
      </div>
      <div class="info-box" style="text-align: right;">
        <div class="info-label">Invoice Details</div>
        <div class="info-content">
          <strong>Invoice #:</strong> ${invoice.invoice_number}<br>
          <strong>Date:</strong> ${formatDate(invoice.invoice_date)}<br>
          <strong>Status:</strong> ${invoice.status.toUpperCase()}
        </div>
      </div>
    </div>

    <div class="info-section">
      <div class="info-box">
        <div class="info-label">Bill To</div>
        <div class="info-content">
          <strong>${invoice.buyer_name}</strong><br>
          ${invoice.buyer_company ? `${invoice.buyer_company}<br>` : ""}
          ${invoice.buyer_address || ""}<br>
          ${invoice.buyer_vat_number ? `VAT: ${invoice.buyer_vat_number}` : ""}
        </div>
      </div>
      <div class="info-box" style="text-align: right;">
        <div class="info-label">Payment</div>
        <div class="info-content">
          <strong>Type:</strong> ${invoice.payment_type === "crypto" ? "Cryptocurrency" : "Card"}<br>
          <strong>Paid:</strong> ${formatDate(invoice.payment_date)}
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHTML}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${formatCurrency(invoice.subtotal_amount, invoice.currency)}</span>
      </div>
      <div class="totals-row">
        <span>VAT (${(invoice.vat_rate * 100).toFixed(1)}%)</span>
        <span>${formatCurrency(invoice.vat_amount, invoice.currency)}</span>
      </div>
      <div class="totals-row total">
        <span>Total</span>
        <span>${formatCurrency(invoice.total_amount, invoice.currency)}</span>
      </div>
    </div>

    ${
      invoice.reverse_charge_note
        ? `
      <div class="reverse-charge">
        <strong>Reverse Charge:</strong><br>
        ${invoice.reverse_charge_note}
      </div>
    `
        : ""
    }

    <div class="footer">
      <p>Thank you for your business!</p>
      <p>SafeScoring LLC - safescoring.com</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Update payment with invoice number
 */
export async function linkInvoiceToPayment(paymentId, paymentType, invoiceNumber) {
  const supabase = getSupabaseAdmin();
  const table = paymentType === "crypto" ? "crypto_payments" : "fiat_payments";

  const { error } = await supabase
    .from(table)
    .update({
      invoice_number: invoiceNumber,
      invoice_generated_at: new Date().toISOString(),
    })
    .eq(paymentType === "crypto" ? "tx_hash" : "id", paymentId);

  if (error) {
    console.error("Link invoice error:", error);
  }

  return !error;
}

/**
 * Create invoice for a crypto payment
 */
export async function createInvoiceForCryptoPayment(payment, planName) {
  const lineItems = [
    {
      description: `SafeScoring ${planName} Plan - ${payment.tier || "Pro"} (${payment.vat_treatment === "reverse_charge" ? "B2B" : "Subscription"})`,
      quantity: 1,
      unit_price: payment.amount_net || payment.amount_usdc,
    },
  ];

  const vatInfo = {
    treatment: payment.vat_treatment || "export_exempt",
    rate: payment.vat_rate || 0,
    country: payment.customer_country,
  };

  const invoice = await createInvoice({
    userId: payment.user_id,
    billingProfileId: payment.billing_profile_id,
    paymentId: payment.tx_hash,
    paymentType: "crypto",
    lineItems,
    vatInfo,
    currency: "USD",
  });

  // Link invoice to payment
  await linkInvoiceToPayment(payment.tx_hash, "crypto", invoice.invoice_number);

  return invoice;
}
