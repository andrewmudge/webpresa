"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Layout, Mail, RefreshCw } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Layout,
    title: "We Build Your Preview First",
    description:
      "We noticed your business could use a better website, so we built a modern one for you — no forms to fill out, no onboarding call required.",
  },
  {
    number: "02",
    icon: Mail,
    title: "You Get a Postcard or Email",
    description:
      "We mail you a postcard with an access code, or email you a direct link — either way, you can see your new website and decide if you want it.",
  },
  {
    number: "03",
    icon: RefreshCw,
    title: "View Your Site & Make It Yours",
    description:
      "Follow your email link, or enter your postcard code, to view your site — then update your content, photos, services, and theme yourself. Changes go live instantly.",
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="bg-[#F8FAFC] py-24 lg:py-32"
      aria-labelledby="how-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-brand mb-4">
            How It Works
          </span>
          <h2
            id="how-heading"
            className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight"
          >
            An effortless process, start to finish.
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
            We build it, host it, and secure it. You stay in control of what it says.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line — desktop only */}
          <div
            className="hidden lg:block absolute top-16 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 28 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: 0.55,
                    delay: i * 0.12,
                    ease: "easeOut",
                  }}
                  whileHover={{ y: -4 }}
                  className="relative bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 text-center lg:text-left"
                >
                  {/* Step number */}
                  <span className="absolute top-6 right-7 text-5xl font-black text-gray-50 select-none leading-none">
                    {step.number}
                  </span>

                  {/* Icon */}
                  <div className="w-12 h-12 bg-brand-muted rounded-xl flex items-center justify-center mb-6 mx-auto lg:mx-0">
                    <Icon size={22} className="text-brand" />
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
