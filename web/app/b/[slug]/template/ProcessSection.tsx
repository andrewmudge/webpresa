import { V } from './tokens';
import type { BusinessProcessStep } from '@/domain/models/business';

interface Props {
  steps: BusinessProcessStep[];
}

// Only rendered when the business has defined process steps. See
// Business.processSteps.
export function ProcessSection({ steps }: Props) {
  if (!steps || steps.length === 0) return null;

  return (
    <section className="py-20 bg-(--site-background)">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="mb-12 text-center">
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: V.accent }}>
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-(--site-text)">Our Process</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div
                className="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center text-lg font-extrabold text-white"
                style={{ backgroundColor: V.primary }}
              >
                {i + 1}
              </div>
              <h3 className="font-bold text-(--site-text) mb-2">{step.title}</h3>
              <p className="text-sm text-(--site-muted) leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
