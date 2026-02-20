"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import config from "@/config";

function SignInContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signIn("google", { callbackUrl });
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    await signIn("email", { email, callbackUrl });
    setEmailSent(true);
    setIsLoading(false);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 via-base-200 to-base-100 p-12 flex-col justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-amber-500 to-purple-500 rounded-lg opacity-80" />
            <div className="absolute inset-0.5 bg-base-100 rounded-[6px] flex items-center justify-center">
              <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-green-500 via-amber-500 to-purple-500">
                S
              </span>
            </div>
          </div>
          <span className="text-xl font-bold">{config.appName}</span>
        </Link>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            The unified security rating for all crypto products
          </h1>
          <p className="text-lg text-base-content/60">
            {config.safe.tagline}
          </p>
          <div className="flex items-center gap-8 text-sm text-base-content/60">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">{config.safe.stats.totalNorms}</span>
              <span>security norms</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">{config.safe.stats.totalProducts}+</span>
              <span>products</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {config.safe.pillars.map((pillar) => (
            <div
              key={pillar.code}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-base-300/50"
            >
              <span className="font-bold" style={{ color: pillar.color }}>
                {pillar.code}
              </span>
              <span className="text-sm text-base-content/60">{pillar.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right side - Sign in form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-amber-500 to-purple-500 rounded-lg opacity-80" />
                <div className="absolute inset-0.5 bg-base-100 rounded-[6px] flex items-center justify-center">
                  <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-green-500 via-amber-500 to-purple-500">
                    S
                  </span>
                </div>
              </div>
              <span className="text-xl font-bold">{config.appName}</span>
            </Link>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
            <p className="text-base-content/60">
              Sign in to access your security dashboard
            </p>
          </div>

          {error && (
            <div className="alert alert-error mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {error === "OAuthSignin" && "Error starting OAuth sign in"}
                {error === "OAuthCallback" && "Error during OAuth callback"}
                {error === "OAuthCreateAccount" && "Error creating OAuth account"}
                {error === "EmailCreateAccount" && "Error creating email account"}
                {error === "Callback" && "Error during callback"}
                {error === "OAuthAccountNotLinked" && "Email already linked to another account"}
                {error === "EmailSignin" && "Error sending email"}
                {error === "CredentialsSignin" && "Invalid credentials"}
                {error === "SessionRequired" && "Please sign in to continue"}
                {!["OAuthSignin", "OAuthCallback", "OAuthCreateAccount", "EmailCreateAccount", "Callback", "OAuthAccountNotLinked", "EmailSignin", "CredentialsSignin", "SessionRequired"].includes(error) && "An error occurred"}
              </span>
            </div>
          )}

          {emailSent ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 text-green-400 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h3 className="text-xl font-bold">Check your email</h3>
              <p className="text-base-content/60">
                We sent a magic link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-base-content/50">
                Click the link in the email to sign in. The link expires in 24 hours.
              </p>
              <button
                onClick={() => setEmailSent(false)}
                className="btn btn-ghost btn-sm mt-4"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Google Sign In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="btn btn-outline w-full gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="divider text-base-content/40 text-sm">or continue with email</div>

              {/* Email Sign In */}
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div>
                  <label className="label">
                    <span className="label-text">Email address</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input input-bordered w-full"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="btn btn-primary w-full"
                >
                  {isLoading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    "Send magic link"
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-base-content/50">
                By signing in, you agree to our{" "}
                <Link href="/tos" className="text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy-policy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </div>
          )}

          {/* Free plan badge */}
          <div className="mt-8 p-4 rounded-xl bg-base-200 border border-base-300 text-center">
            <div className="flex items-center justify-center gap-2 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Free plan includes 5 detailed products/month</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-base-100 flex items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
