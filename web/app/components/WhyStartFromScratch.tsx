"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

function OldWebsiteMockup() {
  return (
    <div className="rounded-2xl shadow-md border border-gray-200 bg-white p-1.5">
      <Image
        src="/marketing/before.png"
        alt="An outdated website for a local plumbing business"
        width={1052}
        height={802}
        className="w-full h-auto"
      />
    </div>
  );
}

function NewWebsiteMockup() {
  return (
    <div className="rounded-2xl shadow-xl border border-gray-100 bg-white p-1.5">
      <Image
        src="/marketing/after.png"
        alt="A modern website Webpresa built for the same plumbing business"
        width={1048}
        height={772}
        className="w-full h-auto"
      />
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

          {/* Mobile arrow between mockups */}
          <div className="flex lg:hidden justify-center my-4">
            <div className="w-10 h-10 rounded-full bg-brand-muted flex items-center justify-center shadow-sm rotate-90">
              <ArrowRight size={18} className="text-brand" />
            </div>
          </div>

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
      </div>
    </section>
  );
}
