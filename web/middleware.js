import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { NextResponse } from "next/server"

// Edge-compatible configuration for middleware (without EmailProvider and Supabase adapter)
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

// Routes requiring authentication
const protectedPaths = ["/dashboard", "/admin", "/onboarding"]

export default auth(async function middleware(req) {
  const { pathname } = req.nextUrl
  const isAuth = !!req.auth

  // Protect dashboard, admin, and onboarding routes
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))
  if (isProtected && !isAuth) {
    const signInUrl = new URL("/signin", req.url)
    // Validate callbackUrl to prevent open redirects (only relative paths)
    const safeCallback = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/dashboard"
    signInUrl.searchParams.set("callbackUrl", safeCallback)
    return NextResponse.redirect(signInUrl)
  }

  const response = NextResponse.next()

  // Add security headers to every response
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")

  return response
})

// Match all routes except static assets and API routes
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|.*\\.png$|.*\\.ico$).*)"],
}
