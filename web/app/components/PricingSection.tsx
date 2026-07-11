"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

const includes = [
  "Professional, managed website",
  "Managed hosting — fast & reliable",
  "Security monitoring & updates",
  "SEO foundation & Google indexing",
  "Analytics dashboard",
  "Unlimited content edits",
  "Mobile-optimized on all devices",
  "Priority support",
];

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
            No setup fees. No surprise bills. Everything your business needs to
            look professional online — for one flat monthly rate.
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
                Most Popular
              </span>

              {/* Price */}
              <div className="flex items-end gap-1 mb-2">
                <span className="text-6xl font-black text-gray-900 leading-none tracking-tight">
                  $149
                </span>
                <span className="text-xl text-gray-400 font-medium pb-1">/month</span>
              </div>
              <p className="text-sm text-gray-400 mb-8">
                12-month agreement · Cancel anytime after the first year
              </p>

              {/* Features */}
              <ul className="space-y-3.5 mb-9" role="list">
                {includes.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2
                      size={16}
                      className="text-brand flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-sm text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>

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
