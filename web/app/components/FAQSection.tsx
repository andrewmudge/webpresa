"use client";

import { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    question: "What is Webpresa?",
    answer:
      "Webpresa is a website-as-a-service company for local businesses. We design, build, host, and maintain your website for one flat monthly fee. You get a professional online presence without needing any technical knowledge or hiring an expensive agency.",
  },
  {
    question: "Do I own my domain?",
    answer:
      "Yes, absolutely. Your domain name is yours. If you already have one, we'll connect it to your new site. If you need one, we'll help you register it in your name. You always remain the owner.",
  },
  {
    question: "Can I request changes?",
    answer:
      "Unlimited edits are included in your subscription. Need to update your hours, add a new service, or swap out a photo? Just send us a message and we'll handle it—typically within one business day.",
  },
  {
    question: "Is hosting included?",
    answer:
      "Yes. Fast, secure, managed hosting is included in your monthly subscription. We handle all server maintenance, SSL certificates, uptime monitoring, and performance optimization.",
  },
  {
    question: "What happens after 12 months?",
    answer:
      "After the initial 12-month agreement, your subscription continues month-to-month. You can cancel anytime with 30 days' notice. If you decide to cancel, we'll help you transition your domain and content.",
  },
  {
    question: "Can you redesign my existing website?",
    answer:
      "Absolutely. We can take over and redesign your current website, or start fresh from scratch. Either way, we handle the migration and make sure nothing is lost in the process.",
  },
];

function FAQItem({
  question,
  answer,
  index,
  inView,
}: {
  question: string;
  answer: string;
  index: number;
  inView: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.45,
        delay: index * 0.07,
        ease: "easeOut",
      }}
      className="border-b border-gray-100 last:border-0"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 group"
        aria-expanded={open}
      >
        <span className="text-base font-medium text-gray-900 group-hover:text-brand transition-colors duration-200">
          {question}
        </span>
        <span
          className="flex-shrink-0 w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center transition-colors duration-200 group-hover:border-brand"
          aria-hidden="true"
        >
          {open ? (
            <Minus size={12} className="text-brand" />
          ) : (
            <Plus size={12} className="text-gray-500 group-hover:text-brand" />
          )}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm text-gray-500 leading-relaxed max-w-2xl">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="bg-[#FAFAFA] py-24 lg:py-32"
      aria-labelledby="faq-heading"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-brand mb-4">
            FAQ
          </span>
          <h2
            id="faq-heading"
            className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight"
          >
            Common questions.
          </h2>
        </motion.div>

        {/* Accordion */}
        <div
          className="bg-white rounded-2xl px-6 sm:px-8 border border-gray-100 shadow-sm"
          role="list"
        >
          {faqs.map((faq, i) => (
            <FAQItem
              key={faq.question}
              question={faq.question}
              answer={faq.answer}
              index={i}
              inView={inView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
