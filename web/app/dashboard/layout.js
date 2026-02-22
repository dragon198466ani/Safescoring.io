import { auth } from "@/libs/auth";
import Link from "next/link";
import ButtonAccount from "@/components/ButtonAccount";
import GlobalSearch from "@/components/GlobalSearch";
import UsageBanner from "@/components/UsageBanner";

const dashboardLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/setups", label: "Setups" },
  { href: "/products", label: "Products" },
  { href: "/dashboard/favorites", label: "Favorites" },
];

// Dashboard layout with sidebar - Freemium accessible
export default async function LayoutPrivate({ children }) {
  const session = await auth();

  // No redirect - allow anonymous access for freemium dashboard
  // Users will be prompted to sign in when they try to create/edit

  return (
    <div className="min-h-screen bg-base-100">
      {/* Dashboard Header */}
      <header className="sticky top-0 z-40 bg-base-100/80 backdrop-blur-lg border-b border-base-300">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-amber-500 to-purple-500 rounded-lg opacity-80" />
                <div className="absolute inset-0.5 bg-base-100 rounded-[5px] flex items-center justify-center">
                  <span className="text-sm font-black text-gradient-safe">S</span>
                </div>
              </div>
              <span className="font-bold text-lg">SafeScoring</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6" aria-label="Dashboard navigation">
              {dashboardLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-base-content/70 hover:text-base-content transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <GlobalSearch />
            {session ? (
              <ButtonAccount />
            ) : (
              <Link href="/signin" className="btn btn-primary btn-sm">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="max-w-7xl mx-auto px-6 py-8">
        <UsageBanner />
        {children}
      </main>
    </div>
  );
}
