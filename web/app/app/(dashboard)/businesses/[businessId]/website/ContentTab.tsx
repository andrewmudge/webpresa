import type { Business } from '@/domain/models/business';
import { Card, TextField, TextAreaField, SaveButton } from '../FormBits';
import { PhotoSlotPicker } from '../PhotoSlotPicker';
import {
  updateHeroCardActionCustomer,
  updateAboutCardActionCustomer,
  toggleReviewVisibilityActionCustomer,
  updateBusinessListFieldActionCustomer,
} from '../actions';
import { getCachedPreviews } from './data';

interface Props {
  businessId: string;
  business: Business;
  isReadOnly: boolean;
}

/**
 * Pads `items` with blank rows so the form always shows at least `minRows`
 * (a believable "get started" prompt for an empty business) and at most
 * `maxRows` (the field's schema cap) — existing content always shows in
 * full, plus up to 2 trailing blanks for adding more. Mirrors the
 * `EXTRA_ROWS` padding idiom used elsewhere on this page (e.g.
 * `ServicesTab.tsx`), generalized since FAQ's cap (30) is much larger than
 * Process's (10).
 */
function buildRows<T>(items: T[], blank: T, minRows: number, maxRows: number): T[] {
  const count = Math.min(maxRows, Math.max(items.length + 2, minRows));
  return Array.from({ length: count }, (_, i) => items[i] ?? blank);
}

export async function ContentTab({ businessId, business, isReadOnly }: Props) {
  const previews = await getCachedPreviews(businessId);
  const content = previews[0]?.content;
  const photoUrls = business.photoUrls ?? [];
  // `testimonials`/`faqItems`/`processSteps` are read straight off `Business`
  // (never `SitePreview.content`), so these three cards render regardless of
  // whether a website has been generated yet — unlike Hero/About below.
  const googleReviews = (business.testimonials ?? []).filter((t) => t.source === 'google');
  const faqRows = buildRows(business.faqItems ?? [], { question: '', answer: '' }, 5, 30);
  const processRows = buildRows(business.processSteps ?? [], { title: '', description: '' }, 3, 10);

  return (
    <div className="space-y-6">
      {content ? (
        <>
          <Card title="Hero" description="The first thing visitors see at the top of your website.">
            <form action={updateHeroCardActionCustomer.bind(null, businessId)} className="space-y-4">
              <TextField label="Headline" name="headline" defaultValue={content.hero.headline} required disabled={isReadOnly} maxLength={120} />
              <TextAreaField label="Sub-headline" name="subheadline" defaultValue={content.hero.subheadline} required disabled={isReadOnly} maxLength={300} rows={2} />
              <div className="grid gap-3 sm:grid-cols-2">
                <PhotoSlotPicker
                  label="Hero photo (desktop)"
                  fieldName="heroPhotoUrl"
                  uploadFieldName="heroPhotoFile"
                  currentValue={business.heroPhotoUrl}
                  photoUrls={photoUrls}
                  disabled={isReadOnly}
                />
                <PhotoSlotPicker
                  label="Hero photo (mobile)"
                  fieldName="heroPhotoUrlMobile"
                  uploadFieldName="heroPhotoFileMobile"
                  currentValue={business.heroPhotoUrlMobile}
                  photoUrls={photoUrls}
                  disabled={isReadOnly}
                />
              </div>
              <SaveButton disabled={isReadOnly} />
            </form>
          </Card>

          <Card title="About" description="Tells your story and builds trust with visitors.">
            <form action={updateAboutCardActionCustomer.bind(null, businessId)} className="space-y-4">
              <TextField label="Headline" name="tagline" defaultValue={content.tagline} required disabled={isReadOnly} maxLength={200} />
              <TextAreaField label="Description" name="aboutText" defaultValue={content.aboutText} required disabled={isReadOnly} maxLength={2000} rows={5} />
              <TextField label="Featured quote (optional)" name="quote" defaultValue={content.aboutSection?.quote} disabled={isReadOnly} maxLength={300} />
              <PhotoSlotPicker
                label="About photo"
                fieldName="aboutPhotoUrl"
                uploadFieldName="aboutPhotoFile"
                currentValue={business.aboutPhotoUrl}
                photoUrls={photoUrls}
                disabled={isReadOnly}
              />
              <SaveButton disabled={isReadOnly} />
            </form>
          </Card>
        </>
      ) : (
        <Card title="No website yet">
          <p className="text-sm text-gray-500">Your website hasn&apos;t been created yet — content will appear here once it has.</p>
        </Card>
      )}

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

      <Card title="FAQ" description="Answers to common customer questions. Enable the FAQ section in Page Sections to show this on your website.">
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
        description="A short step-by-step explanation of how you work with a new customer. Enable the Process section in Page Sections to show this on your website."
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
