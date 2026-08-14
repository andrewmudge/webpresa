"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Mail } from "lucide-react";
import Link from "next/link";

function PreviewMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
      className="bg-white rounded-2xl shadow-2xl border border-white/10 overflow-hidden w-full max-w-sm mx-auto"
      aria-hidden="true"
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <div className="ml-3 flex-1 bg-gray-200 rounded-md h-5 flex items-center px-2">
          <span className="text-[9px] text-gray-400 font-mono">preview.webpresa.com/your-business</span>
        </div>
      </div>

      {/* Preview content */}
      <div className="bg-white">
        {/* Nav */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
          <div className="h-3 w-24 bg-[#0D3AD9] rounded-sm opacity-80" />
          <div className="h-5 w-16 bg-[#3AB9FD] rounded-md opacity-90" />
        </div>

        {/* Hero */}
        <div className="bg-gradient-to-br from-[#0D3AD9] to-[#5D7AE2] px-5 py-6">
          <div className="h-2 w-20 bg-white/30 rounded-sm mb-2" />
          <div className="h-5 w-48 bg-white/65 rounded-sm mb-1.5" />
          <div className="h-2.5 w-40 bg-white/30 rounded-sm mb-4" />
          <div className="h-7 w-24 bg-[#3AB9FD] rounded-lg" />
        </div>

        {/* Services */}
        <div className="px-4 py-4">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                <div className="w-5 h-5 bg-[#0D3AD9]/15 rounded-md mx-auto mb-1.5" />
                <div className="h-2 bg-gray-300 rounded-sm w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Preview badge */}
        <div className="px-4 pb-4">
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            <span className="text-[10px] text-amber-700 font-medium">Preview — not yet published</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function PreviewSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="preview"
      ref={ref}
      className="relative py-24 lg:py-32 overflow-hidden"
      aria-labelledby="preview-heading"
    >
      {/* Navy gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#092A9E] via-[#0D3AD9] to-[#5D7AE2]" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(206,144,89,0.12)_0%,_transparent_60%)]" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: mockup */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="order-2 lg:order-1"
          >
            <PreviewMockup />
          </motion.div>

          {/* Right: copy */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="order-1 lg:order-2 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
              <Mail size={12} />
              For Postcard &amp; Email Recipients
            </div>

            <h2
              id="preview-heading"
              className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight mb-6"
            >
              We build your website{" "}
              <span className="text-[#3AB9FD]">before you ask.</span>
            </h2>

            <p className="text-lg text-white/70 leading-relaxed mb-5">
              When we come across a local business with an outdated website, we
              create a modern version as a preview — so you can see exactly what&apos;s possible
              before committing to anything.
            </p>

            <p className="text-lg text-white/70 leading-relaxed mb-8">
              If you found us through a postcard or email, your preview is already waiting.
              No obligation to move forward — we just want you to see what your business
              could look like online.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/r"
                  className="inline-flex items-center justify-center bg-[#3AB9FD] text-white font-semibold text-base px-7 py-3.5 rounded-xl shadow-md hover:bg-[#3AB9FD] transition-colors duration-200"
                >
                  View My Preview
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center justify-center bg-white/10 text-white font-semibold text-base px-7 py-3.5 rounded-xl border border-white/20 hover:bg-white/20 transition-colors duration-200"
                >
                  How It Works
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
