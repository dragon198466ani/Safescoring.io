import { NextResponse } from "next/server";

/**
 * PDF Generation Endpoint
 *
 * Uses Puppeteer (via external service or serverless function)
 * to convert HTML reports to PDF.
 *
 * For production, consider:
 * - Puppeteer on a dedicated server
 * - Browserless.io
 * - html-pdf-node
 * - DocRaptor API
 */

export async function POST(request) {
  try {
    const { slug, slugs, ...options } = await request.json();

    // Generate HTML report first
    const htmlResponse = await fetch(
      new URL("/api/reports/generate", request.url).toString(),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, slugs, ...options }),
      }
    );

    if (!htmlResponse.ok) {
      const error = await htmlResponse.json();
      return NextResponse.json(error, { status: htmlResponse.status });
    }

    const html = await htmlResponse.text();

    // Option 1: Use external PDF service (recommended for serverless)
    const pdfServiceUrl = process.env.PDF_SERVICE_URL;

    if (pdfServiceUrl) {
      const pdfResponse = await fetch(pdfServiceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.PDF_SERVICE_KEY || ""}`,
        },
        body: JSON.stringify({
          html,
          options: {
            format: "A4",
            margin: { top: "20mm", bottom: "20mm", left: "20mm", right: "20mm" },
            printBackground: true,
          },
        }),
      });

      if (pdfResponse.ok) {
        const pdfBuffer = await pdfResponse.arrayBuffer();

        return new NextResponse(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="safescore-${slug || "comparison"}.pdf"`,
          },
        });
      }
    }

    // Option 2: Return HTML with print-friendly styling
    // Users can use browser's print-to-PDF feature
    const printableHtml = html.replace(
      "</head>",
      `<style>
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      </style>
      <script>
        // Auto-trigger print dialog for PDF generation
        window.onload = function() {
          if (window.location.search.includes('print=true')) {
            window.print();
          }
        }
      </script>
      </head>`
    );

    return new NextResponse(printableHtml, {
      headers: {
        "Content-Type": "text/html",
        "X-PDF-Note": "Use browser print (Ctrl+P) to save as PDF, or configure PDF_SERVICE_URL for direct PDF generation",
      },
    });

  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
