/**
 * Legal disclaimer metadata for all API responses.
 *
 * Every API endpoint returning scores MUST include this in its JSON response
 * to ensure legal protection across all jurisdictions.
 *
 * Usage:
 *   import { API_DISCLAIMER, addDisclaimerHeaders } from "@/libs/api-disclaimer";
 *   // In response JSON:
 *   return NextResponse.json({ ...data, _legal: API_DISCLAIMER });
 *   // Or add headers:
 *   const res = NextResponse.json(data);
 *   addDisclaimerHeaders(res);
 */

export const API_DISCLAIMER = {
  notice:
    "All scores and ratings represent SafeScoring's editorial opinions derived from its published SAFE methodology. They are not statements of fact, guarantees of security, or professional advice of any kind.",
  methodology: "https://safescoring.io/methodology",
  legal: "https://safescoring.io/legal",
  dispute: "disputes@safescoring.io",
  license: "Scores provided as-is without warranty. See https://safescoring.io/legal for full terms.",
};

/**
 * Add legal disclaimer HTTP headers to a NextResponse.
 * These headers are visible to all API consumers including crawlers.
 */
export function addDisclaimerHeaders(response) {
  response.headers.set(
    "X-Legal-Notice",
    "Scores are editorial opinions, not statements of fact. See https://safescoring.io/legal"
  );
  response.headers.set(
    "X-Disclaimer",
    "Not investment, financial, or professional advice. Not a credit rating agency."
  );
  return response;
}
