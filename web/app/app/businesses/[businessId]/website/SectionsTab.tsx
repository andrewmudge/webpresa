import type { Business } from '@/domain/models/business';
import type { WebsiteSectionConfig } from '@/domain/models/website-sections';
import { WEBSITE_SECTION_CATALOG } from '@/domain/constants/website-sections';
import { Card, SaveButton } from '../FormBits';
import { updateSectionsActionCustomer, toggleReviewVisibilityActionCustomer } from '../actions';

interface Props {
  businessId: string;
  sections: WebsiteSectionConfig[];
  business: Business;
  isReadOnly: boolean;
}

export function SectionsTab({ businessId, sections, business, isReadOnly }: Props) {
  const googleReviews = (business.testimonials ?? []).filter((t) => t.source === 'google');

  return (
    <div className="space-y-6">
      <Card title="Page sections" description="Choose which sections appear on your website, and in what order (lower numbers appear first).">
        <form action={updateSectionsActionCustomer.bind(null, businessId)} className="space-y-2">
          {sections.map((section) => {
            const catalog = WEBSITE_SECTION_CATALOG[section.component];
            return (
              <div
                key={section.component}
                className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5"
              >
                <input
                  type="checkbox"
                  name={`enabled_${section.component}`}
                  defaultChecked={section.enabled}
                  disabled={isReadOnly || catalog.required}
                  className="h-4 w-4 rounded border-gray-300 text-(--color-brand) focus:ring-(--color-brand)"
                />
                <span className="flex-1 text-sm text-gray-800">
                  {catalog.label}
                  {catalog.required && <span className="ml-2 text-xs text-gray-400">Always on</span>}
                </span>
                <input
                  type="number"
                  name={`order_${section.component}`}
                  defaultValue={section.order}
                  disabled={isReadOnly}
                  className="w-16 rounded-md border border-(--color-border) px-2 py-1 text-sm text-gray-900 disabled:bg-gray-50"
                />
              </div>
            );
          })}
          <div className="pt-2">
            <SaveButton disabled={isReadOnly} />
          </div>
        </form>
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
