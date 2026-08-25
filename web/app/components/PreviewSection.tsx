"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

function PreviewMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
      className="relative rounded-2xl shadow-2xl border border-white/10 overflow-hidden w-full max-w-[499px] mx-auto"
    >
      <Image
        src="/marketing/preview-landscaping-full.png"
        alt="A preview of a website Webpresa built for a landscaping business"
        width={1450}
        height={1085}
        className="w-full h-auto"
      />
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
              We find local businesses with outdated websites and build them a better one—before they ever have to commit. If you received a postcard or email from us, your preview is already waiting.
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
