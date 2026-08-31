"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

/**
 * Build-wizard step screenshots, positioned as percentages of a 700x610
 * design box (see `BuildStepsMockup`'s viewBox) so the cascading layout
 * scales with the container instead of relying on fixed pixel offsets.
 */
const buildSteps = [
  {
    src: "/diy_1.png",
    width: 863,
    height: 462,
    alt: "Step 1 of the Webpresa build wizard: business name and industry",
    label: "STEP 1",
    style: { top: "7.2%", left: "0%", width: "45.7%" },
    delay: 0.3,
  },
  {
    src: "/diy_2.png",
    width: 886,
    height: 590,
    alt: "Step 2 of the Webpresa build wizard: business phone, email, and address",
    label: "STEP 2",
    style: { top: "30.2%", left: "28.6%", width: "48.6%" },
    delay: 0.55,
  },
  {
    src: "/diy_3a.png",
    width: 863,
    height: 492,
    alt: "Step 3 of the Webpresa build wizard: do you already have a website",
    label: "STEP 3",
    style: { top: "69.5%", left: "54.3%", width: "42.9%" },
    delay: 0.8,
  },
];

function BuildStepsMockup({ inView }: { inView: boolean }) {
  return (
    <div className="relative w-full max-w-[560px] mx-auto aspect-[700/610]">
      <svg
        viewBox="0 0 700 610"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <marker
            id="step-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--color-brand)" />
          </marker>
        </defs>
        <path
          d="M160,215 L160,250 L200,250"
          stroke="var(--color-brand)"
          strokeWidth={2}
          strokeDasharray="6 6"
          markerEnd="url(#step-arrow)"
        />
        <path
          d="M260,410 L260,465 L380,465"
          stroke="var(--color-brand)"
          strokeWidth={2}
          strokeDasharray="6 6"
          markerEnd="url(#step-arrow)"
        />
      </svg>

      {buildSteps.map((step) => (
        <motion.div
          key={step.label}
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: step.delay, ease: "easeOut" }}
          className="absolute"
          style={step.style}
        >
          <span className="absolute left-0 -top-2 -translate-y-full inline-flex items-center bg-brand-muted text-brand text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide">
            {step.label}
          </span>
          <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-100">
            <Image
              src={step.src}
              alt={step.alt}
              width={step.width}
              height={step.height}
              className="w-full h-auto"
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * The self-service `/build` funnel's homepage entry point — for organic
 * visitors who found Webpresa on their own, distinct from `PreviewSection`
 * (which is explicitly framed for postcard/email recipients, right above
 * this one).
 */
export default function SelfServiceCTASection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="page-ambient-bg py-24 lg:py-32"
      aria-labelledby="self-service-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="text-center lg:text-left"
          >
            <span className="inline-flex items-center gap-1.5 bg-brand-muted text-brand text-xs font-bold px-4 py-2 rounded-full mb-6">
              <Sparkles size={14} />
              No postcard? Start here
            </span>

            <h2
              id="self-service-heading"
              className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-3"
            >
              Build your professional website in minutes.
            </h2>

            <p className="text-2xl sm:text-3xl font-bold text-brand tracking-tight mb-6">
              Start from scratch or use your current website as a guide.
            </p>

            <div className="w-16 h-px bg-gray-300 mb-6 mx-auto lg:mx-0" />

            <p className="text-lg text-gray-500 leading-relaxed max-w-lg mx-auto lg:mx-0 mb-10">
              Answer a few simple questions and preview a custom Webpresa
              website in minutes. No calls, no design work, no waiting
              weeks.
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
              Already received a postcard?{" "}
              <Link href="/r" className="underline text-brand hover:text-brand-dark">
                Enter your code instead
              </Link>
              .
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="hidden lg:block"
          >
            <BuildStepsMockup inView={inView} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
