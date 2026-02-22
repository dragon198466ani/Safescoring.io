import NextAuth from "next-auth";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { createClient } from "@supabase/supabase-js";
import config from "@/config";

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isSupabaseConfigured = supabaseUrl && supabaseServiceKey;

const nextAuthResult = NextAuth({
  // Set any random key in .env.local
  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    // Email Provider (Magic Links)
    ...(isSupabaseConfigured && process.env.RESEND_API_KEY
      ? [
          EmailProvider({
            server: {
              host: "smtp.resend.com",
              port: 465,
              auth: {
                user: "resend",
                pass: process.env.RESEND_API_KEY,
              },
            },
            from: config.resend.fromNoReply,
          }),
        ]
      : []),
    // Google OAuth Provider
    ...(process.env.GOOGLE_ID && process.env.GOOGLE_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_ID,
            clientSecret: process.env.GOOGLE_SECRET,
            async profile(profile) {
              return {
                id: profile.sub,
                name: profile.given_name ? profile.given_name : profile.name,
                email: profile.email,
                image: profile.picture,
              };
            },
          }),
        ]
      : []),
  ],

  // Supabase Adapter for storing users
  // Requires tables: users, accounts, sessions, verification_tokens
  // See: https://authjs.dev/reference/adapter/supabase
  ...(isSupabaseConfigured && {
    adapter: SupabaseAdapter({
      url: supabaseUrl,
      secret: supabaseServiceKey,
    }),
  }),

  callbacks: {
    jwt: async ({ token, user, trigger }) => {
      // On sign in or update, fetch user data from database
      if (user || trigger === "update") {
        const userId = user?.id || token.sub;
        if (userId && isSupabaseConfigured) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          const { data: userData } = await supabase
            .from("users")
            .select("onboarding_completed, plan_type, has_access, price_id")
            .eq("id", userId)
            .single();

          if (userData) {
            token.onboardingCompleted = userData.onboarding_completed ?? false;
            token.planType = userData.plan_type ?? "free";
            token.hasAccess = userData.has_access ?? false;
            token.priceId = userData.price_id;
          }
        }
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session?.user && token.sub) {
        session.user.id = token.sub;
        session.user.onboardingCompleted = token.onboardingCompleted ?? false;
        session.user.planType = token.planType ?? "free";
        session.user.hasAccess = token.hasAccess ?? false;
        session.user.priceId = token.priceId;
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
  },

  theme: {
    brandColor: config.colors.main,
  },
  pages: {
    signIn: "/signin",
  },
});

export const { handlers, auth, signIn, signOut } = nextAuthResult;

// Backward compatibility: some files import { authOptions } from "@/libs/auth"
export const authOptions = {
  providers: [],
  session: { strategy: "jwt" },
};
