"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Globe,
  MapPin,
  Star,
  Building2,
  MessageSquare,
  Users,
} from "lucide-react";

const products = [
  {
    icon: Globe,
    title: "Website",
    description: "Professional, managed websites tailored to your business.",
    available: true,
  },
  {
    icon: MapPin,
    title: "Local SEO",
    description: "Dominate local search results and bring in nearby customers.",
    available: false,
  },
  {
    icon: Star,
    title: "Reviews",
    description: "Automate review requests and manage your reputation.",
    available: false,
  },
  {
    icon: Building2,
    title: "Google Business",
    description: "Keep your Google Business Profile optimized and up to date.",
    available: false,
  },
  {
    icon: MessageSquare,
    title: "Reputation",
    description: "Automated review requests and reputation monitoring to build trust.",
    available: false,
  },
  {
    icon: Users,
    title: "CRM",
    description: "Track leads, customers, and conversations in one place.",
    available: false,
  },
];

export default function FutureSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="bg-[#FAFAFA] py-24 lg:py-32"
      aria-labelledby="future-heading"
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
            The Roadmap
          </span>
          <h2
            id="future-heading"
            className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-4"
          >
            Your website is just the beginning.
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Webpresa is expanding to help local businesses manage their entire online presence — from search visibility to customer reviews.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product, i) => {
            const Icon = product.icon;
            return (
              <motion.div
                key={product.title}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.5,
                  delay: i * 0.07,
                  ease: "easeOut",
                }}
                className={`relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm ${
                  !product.available ? "opacity-70" : ""
                }`}
              >
                {!product.available && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                )}
                {product.available && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest bg-brand-muted text-brand px-2 py-0.5 rounded-full">
                    Live
                  </span>
                )}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                    product.available ? "bg-brand-muted" : "bg-gray-100"
                  }`}
                >
                  <Icon
                    size={18}
                    className={product.available ? "text-brand" : "text-gray-400"}
                  />
                </div>
                <h3
                  className={`text-sm font-semibold mb-1.5 ${
                    product.available ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {product.title}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {product.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
