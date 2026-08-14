"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Paintbrush, Smartphone, PenLine } from "lucide-react";

const problems = [
  {
    icon: Paintbrush,
    title: "Outdated Design",
    description:
      "First impressions happen online. An outdated website signals distrust and sends customers straight to a competitor with a better one.",
  },
  {
    icon: Smartphone,
    title: "Poor Mobile Experience",
    description:
      "Over 60% of web traffic is mobile. If your site isn't built for phones, you're losing customers every single day.",
  },
  {
    icon: PenLine,
    title: "Impossible to Update",
    description:
      "Changing your hours, services, or pricing shouldn't require a developer. Your website should work for you, not the other way around.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" as const },
  },
};

export default function ProblemSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="bg-[#FAFAFA] py-24 lg:py-32"
      aria-labelledby="problem-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <h2
            id="problem-heading"
            className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight tracking-tight max-w-3xl mx-auto"
          >
            An outdated website costs you more than you think.
          </h2>
          <p className="mt-5 text-lg text-gray-500 max-w-2xl mx-auto">
            Most local businesses aren&apos;t losing customers to bad service — they&apos;re losing them online, before anyone ever picks up the phone.
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {problems.map((problem) => {
            const Icon = problem.icon;
            return (
              <motion.div
                key={problem.title}
                variants={cardVariants}
                className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div className="w-11 h-11 bg-brand-muted rounded-xl flex items-center justify-center mb-5">
                  <Icon size={20} className="text-brand" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2.5">
                  {problem.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {problem.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
