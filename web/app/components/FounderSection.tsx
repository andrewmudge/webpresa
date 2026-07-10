"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Shield } from "lucide-react";
import Link from "next/link";

export default function FounderSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="about"
      ref={ref}
      className="bg-white py-24 lg:py-32"
      aria-labelledby="founder-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Portrait */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex justify-center lg:justify-start"
          >
            <div className="relative">
              <div className="w-72 h-80 lg:w-80 lg:h-96 bg-gradient-to-br from-[#11455E] to-[#1a5f80] rounded-3xl overflow-hidden shadow-xl">
                {/* Portrait placeholder */}
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-8">
                  <div className="w-24 h-24 rounded-full bg-white/20 mb-3" />
                  <div className="h-3 w-28 bg-white/30 rounded-sm mb-1.5" />
                  <div className="h-2 w-20 bg-white/20 rounded-sm" />
                </div>
                {/* Abstract geometric overlay */}
                <div className="absolute top-6 right-6 w-16 h-16 border-2 border-white/10 rounded-2xl" />
                <div className="absolute top-12 right-12 w-8 h-8 bg-accent/30 rounded-lg" />
              </div>
              {/* Floating accent */}
              <div
                className="absolute -bottom-4 -right-4 w-24 h-24 bg-accent/10 rounded-2xl -z-10"
                aria-hidden="true"
              />
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          >
            {/* Veteran badge */}
            <div className="inline-flex items-center gap-2 bg-brand-muted text-brand text-xs font-bold px-4 py-2 rounded-full mb-6">
              <Shield size={14} />
              Veteran-Owned Business
            </div>

            <h2
              id="founder-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-6"
            >
              Built for the businesses that keep communities running.
            </h2>

            <p className="text-lg text-gray-500 leading-relaxed mb-5">
              After years of watching talented tradespeople, shop owners, and
              service providers lose customers to competitors with better
              websites, I built Webpresa to fix that.
            </p>

            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              Local businesses are the backbone of every community. You
              shouldn&apos;t have to choose between running your business and
              maintaining a professional online presence. Webpresa handles the
              web so you can focus on what you do best.
            </p>

            <Link
              href="#contact"
              className="inline-flex items-center gap-2 text-brand font-semibold hover:text-brand-dark transition-colors duration-200 group"
            >
              Start your website today
              <span
                className="transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
