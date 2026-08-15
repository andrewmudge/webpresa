import type { CSSProperties } from "react";
import Navbar from "@/app/components/Navbar";
import Hero from "@/app/components/Hero";
import ProblemSection from "@/app/components/ProblemSection";
import WhyStartFromScratch from "@/app/components/WhyStartFromScratch";
import HowItWorks from "@/app/components/HowItWorks";
import PreviewSection from "@/app/components/PreviewSection";
import ExamplesSection from "@/app/components/ExamplesSection";
import FeaturesSection from "@/app/components/FeaturesSection";
import PricingSection from "@/app/components/PricingSection";
import FounderSection from "@/app/components/FounderSection";
// import FutureSection from "@/app/components/FutureSection"; // Roadmap section — temporarily hidden
import FAQSection from "@/app/components/FAQSection";
import CTASection from "@/app/components/CTASection";
import Footer from "@/app/components/Footer";

// Homepage-only brand palette override — scoped here (not in globals.css)
// so the rest of the app (admin, access/claim pages) keeps the original
// teal; only this subtree's `bg-brand`/`text-brand`/etc. utilities resolve
// to the new blue. The customer dashboard has its own identical override —
// see `app/app/(dashboard)/layout.tsx`'s `CUSTOMER_DASHBOARD_BRAND_OVERRIDE`.
const HOMEPAGE_BRAND_OVERRIDE = {
  "--color-brand": "#0D3AD9",
  "--color-brand-dark": "#092A9E",
  "--color-brand-light": "#5D7AE2",
  "--color-brand-muted": "#E8EBF7",
} as CSSProperties;

export default function Home() {
  return (
    <div className="min-h-screen bg-white antialiased" style={HOMEPAGE_BRAND_OVERRIDE}>
      <Navbar />
      <main id="main-content">
        <Hero />
        <PreviewSection />
        <ProblemSection />
        <WhyStartFromScratch />
        <HowItWorks />
        <ExamplesSection />
        <FeaturesSection />
        <PricingSection />
        <FounderSection />
        {/* <FutureSection /> — Roadmap section, temporarily hidden */}
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
