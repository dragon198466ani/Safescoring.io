import Header from "@/components/Header";
import HeroSafe from "@/components/HeroSafe";
import Footer from "@/components/Footer";
// Above the fold - loaded immediately
import Stats from "@/components/Stats";
import WhyNotAudits from "@/components/WhyNotAudits";
import Pillars from "@/components/Pillars";
// Below the fold - lazy loaded for faster initial paint
import {
  LazyProductsPreview,
  LazyWhySafeScoring,
  LazyForDevelopers,
  LazyPricing,
  LazyFAQ,
  LazyCTA,
} from "@/libs/lazy-components";

export default function Page() {
  return (
    <>
      <Header />
      <main className="hero-bg">
        {/* Above the fold - critical for FCP */}
        <HeroSafe />
        <Stats />
        <WhyNotAudits />
        <Pillars />
        {/* Below the fold - lazy loaded */}
        <LazyProductsPreview />
        <LazyWhySafeScoring />
        <LazyForDevelopers />
        <LazyPricing />
        <LazyFAQ />
        <LazyCTA />
      </main>
      <Footer />
    </>
  );
}
