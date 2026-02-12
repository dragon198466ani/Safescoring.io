import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { NextResponse } from "next/server"

// ============================================================
// PPP TIER LOOKUP (inlined for Edge compatibility — no imports)
// Maps country codes to PPP tiers: +2/+1/0/-1/-2/-3/-4
// ============================================================
const PPP_COUNTRY_MAP = {
  // Tier +2: +40% surcharge (richest)
  CH: 2, NO: 2, LU: 2, IS: 2, LI: 2, MC: 2, BM: 2,
  // Tier +1: +20% surcharge
  DK: 1, SE: 1, FI: 1, IE: 1, SG: 1, AU: 1, NZ: 1, QA: 1, AE: 1, KW: 1, BH: 1,
  // Tier 0: US base price (default)
  US: 0, CA: 0, GB: 0, DE: 0, FR: 0, NL: 0, AT: 0, BE: 0, JP: 0, IL: 0, KR: 0,
  // Tier -1: -20% discount
  ES: -1, IT: -1, PT: -1, CZ: -1, PL: -1, GR: -1, EE: -1, LT: -1, LV: -1,
  SK: -1, SI: -1, HR: -1, HU: -1, CY: -1, MT: -1, TW: -1, HK: -1, SA: -1,
  // Tier -2: -40% discount
  MX: -2, CL: -2, UY: -2, CR: -2, PA: -2, RO: -2, BG: -2, RS: -2, TR: -2,
  MY: -2, TH: -2, CN: -2, RU: -2, ZA: -2, AR: -2, BR: -2,
  // Tier -3: -60% discount
  CO: -3, PE: -3, PH: -3, VN: -3, ID: -3, EG: -3, MA: -3, TN: -3, JO: -3,
  UA: -3, GE: -3, KZ: -3, DO: -3,
  // Tier -4: -80% discount
  IN: -4, BD: -4, PK: -4, NG: -4, KE: -4, GH: -4, ET: -4, TZ: -4, UG: -4,
  NP: -4, LK: -4, MM: -4, KH: -4, LA: -4,
}

// Edge-compatible configuration for middleware (without EmailProvider and MongoDB adapter)
const { auth } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
})

export default auth(async function middleware(req) {
  // ============================================================
  // PPP GEO DETECTION — inject country + tier cookies
  // Read Vercel's free geo headers, set cookies for frontend
  // ============================================================
  const country = req.headers.get("x-vercel-ip-country") || ""
  const timezone = req.headers.get("x-vercel-ip-timezone") || ""
  const tier = PPP_COUNTRY_MAP[country] ?? 0

  // Create response to set cookies
  const response = NextResponse.next()

  // Set PPP cookies (readable by frontend, 1h TTL for travelers)
  if (country) {
    response.cookies.set("ppp_country", country, {
      maxAge: 3600,
      path: "/",
      sameSite: "lax",
    })
    response.cookies.set("ppp_tier", String(tier), {
      maxAge: 3600,
      path: "/",
      sameSite: "lax",
    })
    // Pass server timezone for VPN cross-validation (not spoofable)
    if (timezone) {
      response.cookies.set("ppp_tz", timezone, {
        maxAge: 3600,
        path: "/",
        sameSite: "lax",
      })
    }
  }

  return response
})

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
