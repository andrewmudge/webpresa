"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";

function OldWebsiteMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden w-full">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-100 border-b border-gray-200">
        <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-300" />
        <div className="ml-3 flex-1 bg-gray-300 rounded-sm h-5 flex items-center px-2">
          <span className="text-[9px] text-gray-500 font-mono">acmeplumbing.net</span>
        </div>
      </div>

      {/* Outdated website content */}
      <div className="bg-gray-50">
        {/* Old-style header */}
        <div className="bg-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="h-4 w-28 bg-gray-500 rounded-sm" />
          <div className="flex gap-3">
            <div className="h-2.5 w-8 bg-gray-500 rounded-sm" />
            <div className="h-2.5 w-10 bg-gray-500 rounded-sm" />
            <div className="h-2.5 w-8 bg-gray-500 rounded-sm" />
          </div>
        </div>

        {/* Old hero with table-style layout */}
        <div className="bg-gray-200 px-4 py-5 border-b-4 border-gray-400">
          <div className="h-4 w-48 bg-gray-400 rounded-sm mb-2" />
          <div className="h-3 w-36 bg-gray-300 rounded-sm mb-4" />
          <div className="h-7 w-24 bg-gray-500 rounded-sm border border-gray-600" />
        </div>

        {/* Old-style content boxes */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            {["Services", "Contact Us"].map((s) => (
              <div key={s} className="bg-white border border-gray-300 p-3 rounded-sm">
                <div className="h-2.5 w-14 bg-gray-400 rounded-sm mb-2" />
                <div className="h-2 w-full bg-gray-200 rounded-sm mb-1" />
                <div className="h-2 w-3/4 bg-gray-200 rounded-sm" />
              </div>
            ))}
          </div>
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-sm text-center">
            <div className="h-2.5 w-32 bg-yellow-300 rounded-sm mx-auto mb-1" />
            <div className="h-2 w-24 bg-yellow-200 rounded-sm mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NewWebsiteMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-full">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <div className="ml-3 flex-1 bg-gray-200 rounded-md h-5 flex items-center px-2">
          <span className="text-[9px] text-gray-400 font-mono">acmeplumbing.com</span>
        </div>
      </div>

      {/* Modern website content */}
      <div className="bg-white">
        {/* Modern nav */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <div className="h-3 w-20 bg-[#0D3AD9] rounded-sm opacity-80" />
          <div className="flex gap-2">
            <div className="h-2.5 w-8 bg-gray-200 rounded-sm" />
            <div className="h-2.5 w-10 bg-gray-200 rounded-sm" />
            <div className="h-2.5 w-8 bg-gray-200 rounded-sm" />
          </div>
          <div className="h-5 w-16 bg-[#CE9059] rounded-md opacity-90" />
        </div>

        {/* Modern hero */}
        <div className="bg-gradient-to-br from-[#0D3AD9] to-[#5D7AE2] px-5 py-5">
          <div className="h-2.5 w-32 bg-white/30 rounded-sm mb-1.5" />
          <div className="h-4 w-44 bg-white/70 rounded-sm mb-1" />
          <div className="h-2.5 w-36 bg-white/30 rounded-sm mb-3.5" />
          <div className="h-6 w-24 bg-[#CE9059] rounded-lg opacity-95" />
        </div>

        {/* Service cards */}
        <div className="px-4 py-4">
          <div className="grid grid-cols-3 gap-2">
            {["Drain Repair", "Water Heaters", "Emergency"].map((s) => (
              <div key={s} className="bg-gray-50 rounded-lg p-2.5 text-center border border-gray-100">
                <div className="w-5 h-5 bg-[#0D3AD9]/15 rounded-md mx-auto mb-1.5" />
                <div className="h-2 bg-gray-300 rounded-sm w-full" />
                <div className="h-1.5 bg-gray-200 rounded-sm w-3/4 mx-auto mt-1" />
              </div>
            ))}
          </div>
        </div>

        {/* Stars row */}
        <div className="px-4 pb-4">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-1 mb-1.5">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-yellow-400 text-[10px]">★</span>
              ))}
              <span className="text-[9px] text-gray-400 ml-1">5.0</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-sm w-full mb-1" />
            <div className="h-2 bg-gray-200 rounded-sm w-3/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WhyStartFromScratch() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="why"
      ref={ref}
      className="bg-white py-24 lg:py-32"
      aria-labelledby="why-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="text-center mb-16 max-w-3xl mx-auto"
        >
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-brand mb-4">
            Our Approach
          </span>
          <h2
            id="why-heading"
            className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-6"
          >
            Why start from scratch?
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Many local businesses have websites that are outdated, difficult to use, or
            don&apos;t accurately represent the quality of their work today. We make
            upgrading simple — without the typical web design process.
          </p>
        </motion.div>

        {/* Before / After mockups */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-8 items-center max-w-5xl mx-auto">
          {/* Before */}
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          >
            <div className="mb-4 text-center">
              <span className="inline-block text-sm font-semibold text-gray-400 uppercase tracking-widest">
                Before
              </span>
            </div>
            <OldWebsiteMockup />
            <ul className="mt-5 space-y-2">
              {["Hard to navigate on mobile", "Outdated design from years ago", "Missing basic SEO"].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-gray-400">
                  <span className="w-4 h-4 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Arrow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.35, ease: "easeOut" }}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="w-12 h-12 rounded-full bg-brand-muted flex items-center justify-center shadow-sm">
              <ArrowRight size={22} className="text-brand" />
            </div>
          </motion.div>

          {/* After */}
          <motion.div
            initial={{ opacity: 0, x: 28 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            <div className="mb-4 text-center">
              <span className="inline-block text-sm font-semibold text-brand uppercase tracking-widest">
                After
              </span>
            </div>
            <NewWebsiteMockup />
            <ul className="mt-5 space-y-2">
              {["Mobile-ready on every device", "Professional, modern design", "SEO foundation included"].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                  <span className="w-4 h-4 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Mobile arrow between mockups */}
        <div className="flex lg:hidden justify-center my-4">
          <div className="w-10 h-10 rounded-full bg-brand-muted flex items-center justify-center shadow-sm rotate-90">
            <ArrowRight size={18} className="text-brand" />
          </div>
        </div>
      </div>
    </section>
  );
}
