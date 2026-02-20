import SecurityQuiz from "@/components/SecurityQuiz";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Quiz Sécurité Crypto | SafeScoring",
  description: "Évaluez gratuitement vos pratiques de sécurité crypto en 8 questions. Découvrez votre score et recevez des recommandations personnalisées.",
  openGraph: {
    title: "Quiz Sécurité Crypto | SafeScoring",
    description: "Évaluez gratuitement vos pratiques de sécurité crypto en 8 questions.",
    images: ["/og-quiz.png"],
  },
};

export default function QuizPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-base-200">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            {/* Hero section */}
            <div className="text-center mb-8">
              <span className="badge badge-primary badge-lg mb-4">Gratuit</span>
              <h1 className="text-4xl font-black mb-4">
                Êtes-vous vraiment
                <span className="text-primary"> sécurisé</span> ?
              </h1>
              <p className="text-lg opacity-70">
                8 questions pour évaluer vos pratiques crypto et recevoir des recommandations d'experts.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-base-100 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-primary">15K+</div>
                <div className="text-xs opacity-60">Quiz complétés</div>
              </div>
              <div className="bg-base-100 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-error">42%</div>
                <div className="text-xs opacity-60">Score moyen</div>
              </div>
              <div className="bg-base-100 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-success">89%</div>
                <div className="text-xs opacity-60">Ont amélioré</div>
              </div>
            </div>

            {/* Quiz Component */}
            <SecurityQuiz />

            {/* Trust indicators */}
            <div className="mt-8 text-center">
              <p className="text-xs opacity-40 mb-4">
                Basé sur la méthodologie SAFE - 250+ normes de sécurité
              </p>
              <div className="flex items-center justify-center gap-6 opacity-30">
                <span className="text-sm">Ledger</span>
                <span className="text-sm">Trezor</span>
                <span className="text-sm">Binance</span>
                <span className="text-sm">Kraken</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
