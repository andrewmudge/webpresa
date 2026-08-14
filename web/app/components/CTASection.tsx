"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";

export default function CTASection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="contact"
      ref={ref}
      className="bg-white py-24 lg:py-32"
      aria-labelledby="cta-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative bg-gradient-to-br from-brand to-brand-light rounded-3xl px-8 py-16 sm:px-16 sm:py-20 text-center overflow-hidden"
        >
          {/* Background decoration */}
          <div
            className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative">
            <h2
              id="cta-heading"
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight mb-6 max-w-3xl mx-auto"
            >
              Ready to see your website?
            </h2>
            <p className="text-lg text-white/75 max-w-xl mx-auto mb-10 leading-relaxed">
              Follow your email link, or enter the access code from your postcard, to view your site and make it yours.
              Simple pricing, everything included, and we handle all the technical work.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/r"
                  className="inline-flex items-center justify-center bg-[#3AB9FD] text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg hover:bg-[#3AB9FD] transition-colors duration-200"
                >
                  Enter Your Code
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="#examples"
                  className="inline-flex items-center justify-center bg-white/10 text-white font-semibold text-base px-8 py-4 rounded-xl border border-white/20 hover:bg-white/20 transition-colors duration-200"
                >
                  See Examples
                </Link>
              </motion.div>
            </div>

            <p className="text-sm text-white/50 mt-6">
              No long-term contracts upfront &middot; Questions?{" "}
              <a
                href="mailto:hello@webpresa.com"
                className="underline hover:text-white/80 transition-colors"
              >
                hello@webpresa.com
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
