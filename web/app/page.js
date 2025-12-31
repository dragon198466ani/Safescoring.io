import Header from "@/components/Header";
import HeroSafe from "@/components/HeroSafe";
import Stats from "@/components/Stats";
import WhyNotAudits from "@/components/WhyNotAudits";
import Pillars from "@/components/Pillars";
import ProductsPreview from "@/components/ProductsPreview";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <>
      <Header />
      <main className="hero-bg">
        <HeroSafe />
        <Stats />
        <WhyNotAudits />
        <Pillars />
        <ProductsPreview />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
