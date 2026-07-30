import type { Business } from '@/domain/models/business';
import { resolveStoredOrDefaultSections } from '@/lib/website-sections/resolve';
import { Card } from '../FormBits';
import { toggleReviewVisibilityActionCustomer } from '../actions';
import { SectionsOrderEditor } from './SectionsOrderEditor';

interface Props {
  businessId: string;
  business: Business;
  isReadOnly: boolean;
}

export function SectionsTab({ businessId, business, isReadOnly }: Props) {
  const sections = resolveStoredOrDefaultSections(business.websiteSections);
  const googleReviews = (business.testimonials ?? []).filter((t) => t.source === 'google');

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
    </div>
  );
}
