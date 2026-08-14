"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Wifi, Search, Shield } from "lucide-react";
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
    <div className="relative w-full max-w-sm mx-auto lg:mx-0">
      {/* Main mockup card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        aria-hidden="true"
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 border-b border-gray-100">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <div className="ml-3 flex-1 bg-gray-200 rounded-md h-5 flex items-center px-2">
            <span className="text-[9px] text-gray-400 font-mono">
              www.cityplumbingpros.com
            </span>
          </div>
        </div>

        {/* Fake website content */}
        <div className="bg-white">
          {/* Fake nav */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
            <div className="h-3 w-20 bg-brand rounded-sm opacity-80" />
            <div className="flex gap-2">
              <div className="h-2.5 w-8 bg-gray-200 rounded-sm" />
              <div className="h-2.5 w-10 bg-gray-200 rounded-sm" />
              <div className="h-2.5 w-8 bg-gray-200 rounded-sm" />
            </div>
            <div className="h-5 w-16 bg-accent rounded-md opacity-90" />
          </div>

          {/* Fake hero */}
          <div className="bg-gradient-to-br from-[#0D3AD9] to-[#5D7AE2] px-5 py-6">
            <div className="h-3 w-40 bg-white/30 rounded-sm mb-2" />
            <div className="h-5 w-52 bg-white/60 rounded-sm mb-1.5" />
            <div className="h-3 w-44 bg-white/25 rounded-sm mb-4" />
            <div className="h-7 w-28 bg-accent rounded-lg opacity-95" />
          </div>

          {/* Service cards */}
          <div className="px-4 py-4">
            <div className="h-2.5 w-24 bg-gray-200 rounded-sm mb-3 mx-auto" />
            <div className="grid grid-cols-3 gap-2">
              {["Drain Repair", "Water Heaters", "Emergency"].map((s) => (
                <div
                  key={s}
                  className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100"
                >
                  <div className="w-5 h-5 bg-brand/20 rounded-md mx-auto mb-1.5" />
                  <div className="h-2 bg-gray-300 rounded-sm w-full" />
                  <div className="h-1.5 bg-gray-200 rounded-sm w-3/4 mx-auto mt-1" />
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial strip */}
          <div className="px-4 pb-4">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className="flex items-center gap-1 mb-1.5">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-[10px]">★</span>
                ))}
                <span className="text-[9px] text-gray-400 ml-1">5.0</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-sm w-full mb-1" />
              <div className="h-2 bg-gray-200 rounded-sm w-4/5 mb-2" />
              <div className="h-2 w-16 bg-gray-300 rounded-sm" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating status cards */}
      {statusCards.map((card, i) => {
        const Icon = card.icon;
        const positions = [
          "-left-10 top-12",
          "-right-8 top-1/3",
          "-left-6 bottom-16",
        ];
        const delays = [0.6, 0.8, 1.0];
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
            {/* Badge */}
            <motion.div
              custom={0}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="inline-flex items-center gap-2 bg-brand-muted text-brand text-xs font-semibold px-4 py-1.5 rounded-full mb-6"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand" />
              For businesses we&apos;ve already built a site for
            </motion.div>

            {/* Headline */}
            <motion.h1
              id="hero-heading"
              custom={1}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.05] tracking-tight mb-6"
            >
              Your website is already built.{" "}
              <span className="text-brand">Go see it.</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              custom={2}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="text-lg sm:text-xl text-gray-500 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0"
            >
              We noticed your business could use a better website, so we built
              one and sent you a postcard or an email. Click your email link,
              or enter your postcard code below, to see your site and make it
              yours.
            </motion.p>

            {/* CTAs */}
            <motion.div
              custom={3}
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
                  href="#how-it-works"
                  className="inline-flex items-center justify-center bg-white text-gray-800 font-semibold text-base px-7 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors duration-200"
                >
                  See How It Works
                </Link>
              </motion.div>
            </motion.div>

            {/* Trust items */}
            <motion.ul
              custom={4}
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
