"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

/**
 * The self-service `/build` funnel's homepage entry point — for organic
 * visitors who found Webpresa on their own, distinct from `PreviewSection`
 * (which is explicitly framed for postcard/email recipients, right above
 * this one). Deliberately does not lead with "Didn't receive a postcard?" —
 * that framing makes an organic visitor feel like an afterthought to the
 * postcard funnel rather than a first-class way to arrive at Webpresa.
 */
export default function SelfServiceCTASection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="bg-white py-24 lg:py-32"
      aria-labelledby="self-service-heading"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-1.5 bg-brand-muted text-brand text-xs font-bold px-4 py-2 rounded-full mb-6">
            <Sparkles size={14} />
            Build It Yourself
          </span>

          <h2
            id="self-service-heading"
            className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-6"
          >
            See your new website in minutes.
          </h2>

          <p className="text-lg text-gray-500 leading-relaxed max-w-xl mx-auto mb-10">
            Tell us about your business and we&apos;ll build a custom website for
            you — no calls, no waiting, no design work.
          </p>

          <motion.div
            className="inline-block"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              href="/build"
              className="inline-flex items-center justify-center gap-2 bg-brand text-white font-bold text-base px-8 py-4 rounded-xl shadow-md hover:bg-brand-dark transition-colors duration-200"
            >
              Build My Website
              <ArrowRight size={18} />
            </Link>
          </motion.div>

          <p className="text-sm text-gray-400 mt-6">
            Already received a Webpresa postcard?{" "}
            <Link href="/r" className="underline text-brand hover:text-brand-dark">
              Enter your access code instead
            </Link>
            .
          </p>
        </motion.div>
      </div>
    </section>
  );
}
