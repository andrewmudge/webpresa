"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Check, X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const rows = [
  {
    label: "Upfront Cost",
    agency: { value: "$5,000–$20,000+", type: "bad" },
    diy: { value: "Low, but your time", type: "neutral" },
    webpresa: { value: "$0 upfront", type: "good" },
  },
  {
    label: "Maintenance",
    agency: { value: "Extra monthly fee", type: "bad" },
    diy: { value: "DIY or pay more", type: "bad" },
    webpresa: { value: "Included", type: "good" },
  },
  {
    label: "Setup Time",
    agency: { value: "6–12 weeks", type: "bad" },
    diy: { value: "Weeks of learning", type: "neutral" },
    webpresa: { value: "2 weeks or less", type: "good" },
  },
  {
    label: "Technical Skills",
    agency: { value: "Not required", type: "good" },
    diy: { value: "Required", type: "bad" },
    webpresa: { value: "Not required", type: "good" },
  },
  {
    label: "Ongoing Updates",
    agency: { value: "Billable hours", type: "bad" },
    diy: { value: "Do it yourself", type: "neutral" },
    webpresa: { value: "Unlimited, included", type: "good" },
  },
  {
    label: "SEO Foundation",
    agency: { value: "Sometimes extra", type: "neutral" },
    diy: { value: "Limited tools", type: "neutral" },
    webpresa: { value: "Always included", type: "good" },
  },
];

type CellType = "good" | "bad" | "neutral";

function Cell({ value, type }: { value: string; type: CellType }) {
  return (
    <td className="px-4 py-4 text-center">
      <div className="flex flex-col items-center gap-1">
        <span
          className={cn(
            "inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0",
            type === "good" && "bg-green-50",
            type === "bad" && "bg-red-50",
            type === "neutral" && "bg-gray-100"
          )}
          aria-hidden="true"
        >
          {type === "good" && <Check size={12} className="text-green-600" />}
          {type === "bad" && <X size={12} className="text-red-500" />}
          {type === "neutral" && <Minus size={12} className="text-gray-400" />}
        </span>
        <span
          className={cn(
            "text-xs leading-tight",
            type === "good" && "text-gray-700",
            type === "bad" && "text-gray-400",
            type === "neutral" && "text-gray-500"
          )}
        >
          {value}
        </span>
      </div>
    </td>
  );
}

export default function ComparisonSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="bg-white py-24 lg:py-32"
      aria-labelledby="comparison-heading"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-brand mb-4">
            Compare
          </span>
          <h2
            id="comparison-heading"
            className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight"
          >
            A simpler path to a professional website.
          </h2>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.12, ease: "easeOut" }}
          className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm bg-white"
        >
          <table className="w-full min-w-[560px]" aria-label="Service comparison table">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-5 text-sm font-semibold text-gray-500 w-1/4">
                  Feature
                </th>
                <th className="text-center px-4 py-5 text-sm font-semibold text-gray-400">
                  Traditional Agency
                </th>
                <th className="text-center px-4 py-5 text-sm font-semibold text-gray-400">
                  DIY Builder
                </th>
                <th className="text-center px-4 py-5 text-sm font-bold text-brand bg-brand-muted/50 rounded-t-lg">
                  Webpresa
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.label}
                  className={cn(
                    "border-b border-gray-50 last:border-0",
                    i % 2 === 1 && "bg-gray-50/50"
                  )}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {row.label}
                  </td>
                  <Cell value={row.agency.value} type={row.agency.type as CellType} />
                  <Cell value={row.diy.value} type={row.diy.type as CellType} />
                  <td className="px-4 py-4 text-center bg-brand-muted/20">
                    <div className="flex flex-col items-center gap-1">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-50">
                        <Check size={12} className="text-green-600" />
                      </span>
                      <span className="text-xs text-gray-700 font-medium leading-tight">
                        {row.webpresa.value}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}
