"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { PLAN_CATALOG } from "@/domain/constants/plan-catalog";

const includes = PLAN_CATALOG.basic.features;

export default function PricingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="pricing"
      ref={ref}
      className="bg-[#F8FAFC] py-24 lg:py-32"
      aria-labelledby="pricing-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-brand mb-4">
            Pricing
          </span>
          <h2
            id="pricing-heading"
            className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-4"
          >
            Simple, transparent pricing.
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            No setup fees. No surprise bills. Start with everything you need
            to look professional online — upgrade anytime as your business
            grows.
          </p>
        </motion.div>

        {/* Pricing card */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="max-w-lg mx-auto"
        >
          <div className="relative bg-white rounded-3xl border-2 border-brand shadow-xl overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-brand to-brand-light" />

            <div className="px-8 pt-10 pb-10">
              {/* Badge */}
              <span className="inline-block bg-brand-muted text-brand text-xs font-bold px-3 py-1 rounded-full mb-6">
                Start Here
              </span>

              {/* Price */}
              <span className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
                Starting at
              </span>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-6xl font-black text-gray-900 leading-none tracking-tight">
                  {PLAN_CATALOG.basic.priceDisplay.replace("/month", "")}
                </span>
                <span className="text-xl text-gray-400 font-medium pb-1">/month</span>
              </div>
              <p className="text-sm text-gray-400 mb-8">
                Cancel anytime — no long-term contract.
              </p>

              {/* Features */}
              <ul className="space-y-3.5 mb-6" role="list">
                {includes.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2
                      size={16}
                      className="text-brand flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-sm text-gray-700">
                      {item}
                      {item === "Unlimited edits to your website" && (
                        <span className="text-gray-400">
                          {" "}
                          — edit instantly yourself, no request needed
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Growth upsell */}
              <p className="text-xs text-gray-400 mb-6 pb-6 border-b border-gray-100">
                Need more visibility? {PLAN_CATALOG.growth.label} (
                {PLAN_CATALOG.growth.priceDisplay}) adds multi-city SEO pages
                and lead forms — upgrade anytime from your dashboard.
              </p>

              {/* CTA */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="#contact"
                  className="flex w-full items-center justify-center bg-brand text-white font-bold text-base py-4 rounded-xl shadow-md hover:bg-brand-dark transition-colors duration-200"
                >
                  Claim Your Website
                </Link>
              </motion.div>

              <p className="text-center text-xs text-gray-400 mt-4">
                Questions?{" "}
                <a href="#contact" className="underline text-brand hover:text-brand-dark">
                  Talk to us first
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
