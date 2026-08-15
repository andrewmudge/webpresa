import type { Business } from '@/domain/models/business';
import { resolveStoredOrDefaultSections } from '@/lib/website-sections/resolve';
import { Card, TextField, TextAreaField, SaveButton } from '../FormBits';
import { toggleReviewVisibilityActionCustomer, updateBusinessListFieldActionCustomer } from '../actions';
import { SectionsOrderEditor } from './SectionsOrderEditor';

interface Props {
  businessId: string;
  business: Business;
  isReadOnly: boolean;
}

/**
 * Pads `items` with blank rows so the form always shows at least `minRows`
 * (a believable "get started" prompt for an empty business) and at most
 * `maxRows` (the field's schema cap) — existing content always shows in
 * full, plus up to 2 trailing blanks for adding more. Mirrors
 * `ServicesTab.tsx`'s `EXTRA_ROWS` padding idiom, generalized since FAQ's
 * cap (30) is much larger than Process's (10).
 */
function buildRows<T>(items: T[], blank: T, minRows: number, maxRows: number): T[] {
  const count = Math.min(maxRows, Math.max(items.length + 2, minRows));
  return Array.from({ length: count }, (_, i) => items[i] ?? blank);
}

export function SectionsTab({ businessId, business, isReadOnly }: Props) {
  const sections = resolveStoredOrDefaultSections(business.websiteSections);
  const googleReviews = (business.testimonials ?? []).filter((t) => t.source === 'google');
  const faqRows = buildRows(business.faqItems ?? [], { question: '', answer: '' }, 5, 30);
  const processRows = buildRows(business.processSteps ?? [], { title: '', description: '' }, 3, 10);

  return (
    <div className="space-y-6">
      <Card title="Page sections" description="Choose which sections appear on your website, and use the arrows to reorder them.">
        <SectionsOrderEditor businessId={businessId} sections={sections} isReadOnly={isReadOnly} />
      </Card>

      {googleReviews.length > 0 && (
        <Card title="Google reviews" description="Sourced from Google — text, author, and rating can't be changed, but you can hide individual reviews.">
          <div className="divide-y divide-gray-100">
            {googleReviews.map((review) => (
              <div key={review.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{review.author}</p>
                  <p className="text-xs text-gray-500 truncate">{review.quote}</p>
                </div>
                <form action={toggleReviewVisibilityActionCustomer.bind(null, businessId)} className="shrink-0">
                  <input type="hidden" name="googleReviewId" value={review.googleReviewId ?? review.id} />
                  <button
                    type="submit"
                    disabled={isReadOnly}
                    className="text-xs font-medium text-(--color-brand) hover:underline disabled:text-gray-300"
                  >
                    {review.hidden ? 'Show' : 'Hide'}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="FAQ" description="Answers to common customer questions. Enable the FAQ section above to show this on your website.">
        <form action={updateBusinessListFieldActionCustomer.bind(null, businessId, 'faqItems')} className="space-y-3">
          {faqRows.map((row, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-2 border border-gray-100 rounded-lg p-3">
              <TextField label={`Question ${i + 1}`} name={`faq.${i}.question`} defaultValue={row.question} disabled={isReadOnly} maxLength={200} />
              <TextAreaField label="Answer" name={`faq.${i}.answer`} defaultValue={row.answer} disabled={isReadOnly} maxLength={1000} rows={2} />
            </div>
          ))}
          <SaveButton disabled={isReadOnly} />
        </form>
      </Card>

      <Card
        title="Process / How It Works"
        description="A short step-by-step explanation of how you work with a new customer. Enable the Process section above to show this on your website."
      >
        <form action={updateBusinessListFieldActionCustomer.bind(null, businessId, 'processSteps')} className="space-y-3">
          {processRows.map((row, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-2 border border-gray-100 rounded-lg p-3">
              <TextField label={`Step ${i + 1} title`} name={`process.${i}.title`} defaultValue={row.title} disabled={isReadOnly} maxLength={80} />
              <TextAreaField label="Description" name={`process.${i}.description`} defaultValue={row.description} disabled={isReadOnly} maxLength={300} rows={2} />
            </div>
          ))}
          <SaveButton disabled={isReadOnly} />
        </form>
      </Card>
    </div>
  );
}
