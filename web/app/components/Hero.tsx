"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Wifi, Search, Shield } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

const trustItems = [
  "Hosting included",
  "Edit it yourself",
  "No technical skills needed",
];

const statusCards = [
  { icon: Wifi, label: "Mobile Optimized", color: "text-brand" },
  { icon: Search, label: "SEO Ready", color: "text-accent" },
  { icon: Shield, label: "Fully Managed", color: "text-brand" },
];

function WebsiteMockup() {
  return (
    <div className="relative w-full max-w-[690px] mx-auto lg:mx-0">
      {/* Hero photo */}
      <motion.div
        initial={{ opacity: 0, x: 48 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        className="relative rounded-2xl overflow-hidden shadow-2xl"
      >
        <Image
          src="/hero_illustrations/main_app_hero.png"
          alt="A laptop and phone displaying a website Webpresa built for a plumbing business"
          width={1547}
          height={1016}
          priority
          className="w-full h-auto"
        />
      </motion.div>

      {/* Floating status cards */}
      {statusCards.map((card, i) => {
        const Icon = card.icon;
        const positions = [
          "-left-6 top-8",
          "-right-6 top-1/3",
          "-right-10 bottom-10",
        ];
        const delays = [0.8, 1.0, 1.2];
        const yRange = [i % 2 === 0 ? -6 : -4, i % 2 === 0 ? 6 : 4];

        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: [yRange[0], yRange[1], yRange[0]],
            }}
            transition={{
              opacity: { duration: 0.4, delay: delays[i] },
              scale: { duration: 0.4, delay: delays[i] },
              y: {
                duration: 3 + i * 0.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: delays[i],
              },
            }}
            className={`absolute ${positions[i]} bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 flex items-center gap-2 min-w-max`}
            aria-hidden="true"
          >
            <Icon size={14} className={card.color} />
            <span className="text-xs font-semibold text-gray-700">
              {card.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center bg-white overflow-hidden pt-24 pb-20"
      aria-labelledby="hero-heading"
    >
      {/* Subtle background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-muted rounded-full blur-3xl opacity-40 translate-x-1/3 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl opacity-60 -translate-x-1/4 translate-y-1/4" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column */}
          <div className="text-center lg:text-left">
            {/* Headline */}
            <motion.h1
              id="hero-heading"
              custom={0}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.05] tracking-tight mb-6"
            >
              A professional website.{" "}
              <span className="text-brand">Without the work.</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              custom={1}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="text-lg sm:text-xl text-gray-500 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0"
            >
              We take the time and complexity out of building your website. Got a postcard? Yours is already waiting. Starting fresh? We&apos;ll build it for you.
            </motion.p>

            {/* CTAs */}
            <motion.div
              custom={2}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/r"
                  className="inline-flex items-center justify-center bg-brand text-white font-semibold text-base px-7 py-3.5 rounded-xl shadow-md hover:bg-brand-dark transition-colors duration-200"
                >
                  Enter My Code
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/build"
                  className="inline-flex items-center justify-center bg-white text-gray-800 font-semibold text-base px-7 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors duration-200"
                >
                  Build My Website
                </Link>
              </motion.div>
            </motion.div>

            {/* Trust items */}
            <motion.ul
              custom={3}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-center lg:justify-start"
              role="list"
            >
              {trustItems.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-gray-500"
                >
                  <CheckCircle2 size={15} className="text-brand flex-shrink-0" />
                  {item}
                </li>
              ))}
            </motion.ul>
          </div>

          {/* Right column — mockup */}
          <div className="hidden lg:flex justify-center lg:justify-end px-8">
            <WebsiteMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
