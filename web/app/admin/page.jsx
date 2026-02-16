import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/libs/auth";
import { isAdminEmail } from "@/libs/admin-auth";
import AdminDashboard from "@/components/AdminDashboard";

export const metadata = {
  title: "Admin Dashboard - SafeScoring",
  description: "Gérer les tâches d'automatisation SafeScoring",
};

export default async function AdminPage() {
  const session = await auth();

  // Vérifier authentification
  if (!session) {
    redirect("/signin");
  }

  // Vérifier si admin via le système RBAC centralisé
  if (!isAdminEmail(session.user?.email)) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-base-100/80 backdrop-blur-lg border-b border-base-300">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="font-bold">SafeScoring</span>
            </Link>
            <span className="badge badge-warning">ADMIN</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="btn btn-ghost btn-sm">
              Dashboard
            </Link>
            <Link href="/products" className="btn btn-ghost btn-sm">
              Products
            </Link>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <AdminDashboard />
      </main>

      {/* Footer info */}
      <footer className="max-w-7xl mx-auto px-6 py-4 text-center text-sm text-base-content/50">
        <p>
          Queue Worker: <code>python src/automation/queue_worker.py</code>
        </p>
        <p className="mt-1">
          Les tâches sont créées automatiquement via les triggers Supabase.
        </p>
      </footer>
    </div>
  );
}
