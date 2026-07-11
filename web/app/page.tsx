import Navbar from "@/app/components/Navbar";
import Hero from "@/app/components/Hero";
import ProblemSection from "@/app/components/ProblemSection";
import WhyStartFromScratch from "@/app/components/WhyStartFromScratch";
import HowItWorks from "@/app/components/HowItWorks";
import PreviewSection from "@/app/components/PreviewSection";
import ExamplesSection from "@/app/components/ExamplesSection";
import FeaturesSection from "@/app/components/FeaturesSection";
import ComparisonSection from "@/app/components/ComparisonSection";
import PricingSection from "@/app/components/PricingSection";
import FounderSection from "@/app/components/FounderSection";
import FutureSection from "@/app/components/FutureSection";
import FAQSection from "@/app/components/FAQSection";
import CTASection from "@/app/components/CTASection";
import Footer from "@/app/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white antialiased">
      <Navbar />
      <main id="main-content">
        <Hero />
        <ProblemSection />
        <WhyStartFromScratch />
        <HowItWorks />
        <PreviewSection />
        <ExamplesSection />
        <FeaturesSection />
        <ComparisonSection />
        <PricingSection />
        <FounderSection />
        <FutureSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
