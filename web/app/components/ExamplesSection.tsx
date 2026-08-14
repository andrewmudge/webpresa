"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const examples = [
  {
    industry: "Plumbing",
    businessName: "City Plumbing Pros",
    city: "Austin, TX",
    gradient: "from-[#0D3AD9] to-[#5D7AE2]",
    accent: "#CE9059",
    services: ["Drain Repair", "Water Heaters", "Emergency"],
  },
  {
    industry: "Bakery",
    businessName: "Rose & Flour Bakery",
    city: "Denver, CO",
    gradient: "from-[#7c4a2e] to-[#b07040]",
    accent: "#e8c98a",
    services: ["Custom Cakes", "Pastries", "Catering"],
  },
  {
    industry: "HVAC",
    businessName: "Summit Air & Heat",
    city: "Nashville, TN",
    gradient: "from-[#1a3a5c] to-[#2c5f8a]",
    accent: "#5ba3d4",
    services: ["AC Repair", "Heating", "Installation"],
  },
  {
    industry: "Landscaping",
    businessName: "Verde Lawn & Garden",
    city: "Phoenix, AZ",
    gradient: "from-[#2d6a2d] to-[#4a9b4a]",
    accent: "#a3d47c",
    services: ["Lawn Care", "Design", "Irrigation"],
  },
  {
    industry: "Auto Repair",
    businessName: "Midtown Auto Service",
    city: "Chicago, IL",
    gradient: "from-[#2c2c2c] to-[#4a4a4a]",
    accent: "#e05c2e",
    services: ["Oil Changes", "Brakes", "Diagnostics"],
  },
  {
    industry: "Dental Office",
    businessName: "Evergreen Family Dental",
    city: "Seattle, WA",
    gradient: "from-[#1e4e6e] to-[#2a7aad]",
    accent: "#74c2f0",
    services: ["Cleanings", "Cosmetic", "Implants"],
  },
];

function BrowserMockup({
  gradient,
  accent,
  businessName,
  services,
}: {
  gradient: string;
  accent: string;
  businessName: string;
  services: string[];
}) {
  const slug = businessName.toLowerCase().replace(/\s+/g, "").replace(/[^a-z]/g, "") + ".com";
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm group-hover:shadow-md transition-shadow duration-300">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 border-b border-gray-100">
        <span className="w-2 h-2 rounded-full bg-red-400" />
        <span className="w-2 h-2 rounded-full bg-yellow-400" />
        <span className="w-2 h-2 rounded-full bg-green-400" />
        <div className="ml-2.5 flex-1 bg-gray-200 rounded h-4 flex items-center px-2">
          <span className="text-[8px] text-gray-400 font-mono truncate">www.{slug}</span>
        </div>
      </div>

      {/* Website preview */}
      <div>
        {/* Nav */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-50">
          <div className="h-2.5 w-16 bg-gray-800 rounded-sm opacity-70" />
          <div className="flex gap-1.5">
            <div className="h-2 w-5 bg-gray-200 rounded-sm" />
            <div className="h-2 w-7 bg-gray-200 rounded-sm" />
            <div className="h-2 w-5 bg-gray-200 rounded-sm" />
          </div>
          <div className="h-4 w-12 rounded-md" style={{ backgroundColor: accent + "dd" }} />
        </div>

        {/* Hero area */}
        <div className={`bg-gradient-to-br ${gradient} px-4 py-5`}>
          <div className="h-2 w-20 bg-white/25 rounded-sm mb-1.5" />
          <div className="h-3.5 w-36 bg-white/65 rounded-sm mb-1" />
          <div className="h-2 w-28 bg-white/30 rounded-sm mb-3" />
          <div className="h-5 w-16 rounded-md" style={{ backgroundColor: accent }} />
        </div>

        {/* Services */}
        <div className="px-3 py-3">
          <div className="grid grid-cols-3 gap-1.5">
            {services.map((s) => (
              <div key={s} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                <div className="w-4 h-4 bg-gray-200 rounded-md mx-auto mb-1" />
                <div className="h-1.5 bg-gray-300 rounded-sm w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Review row */}
        <div className="px-3 pb-3">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-yellow-400 text-[8px]">★</span>
            ))}
            <span className="text-[8px] text-gray-400 ml-1">5.0 · 40+ reviews</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExampleCard({
  industry,
  businessName,
  city,
  gradient,
  accent,
  services,
  index,
  inView,
}: (typeof examples)[0] & { index: number; inView: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: "easeOut",
      }}
      whileHover={{ y: -6 }}
      className="group"
    >
      <BrowserMockup
        gradient={gradient}
        accent={accent}
        businessName={businessName}
        services={services}
      />
      <div className="mt-4 px-1 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{businessName}</p>
          <p className="text-xs text-gray-400 mt-0.5">{industry} · {city}</p>
        </div>
        <span
          className="text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ backgroundColor: accent + "25", color: accent === "#e8c98a" ? "#9a7a30" : accent }}
        >
          {industry}
        </span>
      </div>
    </motion.div>
  );
}

export default function ExamplesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="examples"
      ref={ref}
      className="bg-[#F8FAFC] py-24 lg:py-32"
      aria-labelledby="examples-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-brand mb-4">
            Website Examples
          </span>
          <h2
            id="examples-heading"
            className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-4"
          >
            What we build for local businesses.
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Professional websites for service businesses, shops, and practices across the country.
            Modern design, fully managed.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {examples.map((ex, i) => (
            <ExampleCard key={ex.industry} {...ex} index={i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}

