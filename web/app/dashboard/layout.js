import { auth } from "@/libs/auth";
import Link from "next/link";
import ButtonAccount from "@/components/ButtonAccount";
import UsageBanner from "@/components/UsageBanner";
import DashboardNav from "@/components/DashboardNav";

// Dashboard layout with sidebar - Freemium accessible
export default async function LayoutPrivate({ children }) {
  const session = await auth();

  // No redirect - allow anonymous access for freemium dashboard
  // Users will be prompted to sign in when they try to create/edit

  return (
    <div className="min-h-screen bg-base-100">
      {/* Dashboard Header */}
      <header className="sticky top-0 z-40 bg-base-100/80 backdrop-blur-lg border-b border-base-300 safe-top">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4 md:gap-8">
            <Link href="/" className="flex items-center gap-2 sm:gap-3">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-amber-500 to-purple-500 rounded-lg opacity-80" />
                <div className="absolute inset-0.5 bg-base-100 rounded-[5px] flex items-center justify-center">
                  <span className="text-sm font-black text-gradient-safe">S</span>
                </div>
              </div>
              <span className="font-bold text-lg hidden sm:inline">SafeScoring</span>
            </Link>
            {/* Desktop + tablet nav — 5 primary links + More dropdown */}
            <DashboardNav />
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            {session ? (
              <ButtonAccount />
            ) : (
              <Link href="/signin" className="btn btn-primary btn-sm min-h-[44px]">
                Sign In
              </Link>
            )}
          </div>
        </div>
        {/* Mobile horizontal scrollable nav */}
        <nav className="flex md:hidden overflow-x-auto scrollbar-hide border-t border-base-300/50 -mx-0 px-4" aria-label="Dashboard navigation">
          <div className="flex items-center gap-1 min-w-max py-1">
            <Link href="/dashboard" className="flex items-center gap-1.5 min-h-[44px] px-3 text-sm font-medium text-base-content/70 hover:text-base-content whitespace-nowrap transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
              Home
            </Link>
            <Link href="/dashboard/setups" className="flex items-center gap-1.5 min-h-[44px] px-3 text-sm font-medium text-base-content/70 hover:text-base-content whitespace-nowrap transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-3.13a1.5 1.5 0 010-2.58l5.1-3.13a1.5 1.5 0 011.58 0l5.1 3.13a1.5 1.5 0 010 2.58l-5.1 3.13a1.5 1.5 0 01-1.58 0z" /></svg>
              Setups
            </Link>
            <Link href="/dashboard/favorites" className="flex items-center gap-1.5 min-h-[44px] px-3 text-sm font-medium text-base-content/70 hover:text-base-content whitespace-nowrap transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
              Favs
            </Link>
            <Link href="/dashboard/analytics" className="flex items-center gap-1.5 min-h-[44px] px-3 text-sm font-medium text-base-content/70 hover:text-base-content whitespace-nowrap transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
              Analytics
            </Link>
            <Link href="/dashboard/account" className="flex items-center gap-1.5 min-h-[44px] px-3 text-sm font-medium text-base-content/70 hover:text-base-content whitespace-nowrap transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
              Account
            </Link>
            <Link href="/dashboard/corrections" className="flex items-center gap-1.5 min-h-[44px] px-3 text-sm font-medium text-base-content/70 hover:text-base-content whitespace-nowrap transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
              Corrections
            </Link>
            <Link href="/dashboard/api-keys" className="flex items-center gap-1.5 min-h-[44px] px-3 text-sm font-medium text-base-content/70 hover:text-base-content whitespace-nowrap transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>
              API
            </Link>
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <UsageBanner />
        {children}
      </main>
    </div>
  );
}
