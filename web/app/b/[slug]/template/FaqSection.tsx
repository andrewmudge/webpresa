import { V } from './tokens';
import type { BusinessFaqItem } from '@/domain/models/business';

interface Props {
  faqItems: BusinessFaqItem[];
}

// Only rendered when the business has verified FAQ content. No FAQ content
// is ever generated here — see Business.faqItems.
export function FaqSection({ faqItems }: Props) {
  if (!faqItems || faqItems.length === 0) return null;

  return (
    <section className="py-20 bg-(--site-surface)">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: V.accent }}>
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-(--site-text)">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <details
              key={i}
              className="group rounded-xl bg-(--site-background) border border-(--site-border) px-5 py-4"
            >
              <summary className="flex items-center justify-between cursor-pointer font-bold text-(--site-text) list-none">
                {item.question}
                <svg
                  className="w-4 h-4 flex-shrink-0 ml-4 transition-transform group-open:rotate-45"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: V.primary }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </summary>
              <p className="mt-3 text-sm text-(--site-muted) leading-relaxed">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
