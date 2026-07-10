"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ExternalLink } from "lucide-react";

const examples = [
  {
    industry: "Plumbing",
    city: "Austin, TX",
    gradient: "from-[#11455E] to-[#1a5f80]",
    accent: "#CE9059",
  },
  {
    industry: "Bakery",
    city: "Denver, CO",
    gradient: "from-[#7c4a2e] to-[#b07040]",
    accent: "#e8c98a",
  },
  {
    industry: "HVAC",
    city: "Nashville, TN",
    gradient: "from-[#1a3a5c] to-[#2c5f8a]",
    accent: "#5ba3d4",
  },
  {
    industry: "Landscaping",
    city: "Phoenix, AZ",
    gradient: "from-[#2d6a2d] to-[#4a9b4a]",
    accent: "#a3d47c",
  },
  {
    industry: "Auto Repair",
    city: "Chicago, IL",
    gradient: "from-[#2c2c2c] to-[#4a4a4a]",
    accent: "#e05c2e",
  },
  {
    industry: "Dental Office",
    city: "Seattle, WA",
    gradient: "from-[#1e4e6e] to-[#2a7aad]",
    accent: "#74c2f0",
  },
];

function ExampleCard({
  industry,
  city,
  gradient,
  accent,
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
      whileHover={{ y: -6, scale: 1.01 }}
      className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300 group"
    >
      {/* Preview image placeholder */}
      <div className={`relative h-44 bg-gradient-to-br ${gradient} overflow-hidden`}>
        {/* Fake website layout */}
        <div className="absolute inset-0 p-4 flex flex-col justify-between">
          {/* Fake nav */}
          <div className="flex items-center justify-between">
            <div className="h-2.5 w-16 bg-white/40 rounded-sm" />
            <div className="flex gap-1.5">
              <div className="h-2 w-6 bg-white/30 rounded-sm" />
              <div className="h-2 w-6 bg-white/30 rounded-sm" />
              <div className="h-5 w-12 rounded-md" style={{ backgroundColor: accent + "cc" }} />
            </div>
          </div>
          {/* Fake hero text */}
          <div>
            <div className="h-3.5 w-32 bg-white/60 rounded-sm mb-1.5" />
            <div className="h-2 w-24 bg-white/35 rounded-sm mb-3" />
            <div className="h-6 w-20 rounded-lg" style={{ backgroundColor: accent }} />
          </div>
        </div>
        {/* Subtle overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
      </div>

      {/* Card footer */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{industry}</p>
          <p className="text-xs text-gray-400 mt-0.5">{city}</p>
        </div>
        <a
          href="#contact"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-dark transition-colors duration-200"
          aria-label={`View ${industry} website example from ${city}`}
        >
          View Website
          <ExternalLink size={12} />
        </a>
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
      className="bg-[#FAFAFA] py-24 lg:py-32"
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
            Real Results
          </span>
          <h2
            id="examples-heading"
            className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-4"
          >
            Built for local businesses like yours.
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            From plumbers to bakeries, we create websites that look great and
            actually bring in customers.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {examples.map((ex, i) => (
            <ExampleCard key={ex.industry} {...ex} index={i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}
