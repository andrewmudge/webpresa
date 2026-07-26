'use client';

import { useActionState, useState } from 'react';
import Image from 'next/image';
import type { Business } from '@/domain/models/business';
import type { SitePreview } from '@/domain/models/site-preview';
import type { WebsiteSectionType } from '@/domain/constants/website-sections';
import { PhotoPickerField, SubmitButton } from '../FormFields';
import { RepeatableListEditor } from './RepeatableListEditor';
import { GoogleReviewsPanel } from './GoogleReviewsPanel';
import { TestimonialsOrderEditor } from './TestimonialsOrderEditor';
import {
  updateSectionContentAction,
  updateBusinessListFieldAction,
  updatePhotosAction,
  type BusinessListField,
} from './actions';

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function ErrorAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
      {message}
    </div>
  );
}

function TextInput({ name, label, defaultValue, maxLength }: { name: string; label: string; defaultValue?: string; maxLength?: number }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue ?? ''}
        maxLength={maxLength}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
      />
    </div>
  );
}

function TextArea({ name, label, defaultValue, maxLength, rows = 3 }: { name: string; label: string; defaultValue?: string; maxLength?: number; rows?: number }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ''}
        maxLength={maxLength}
        rows={rows}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
      />
    </div>
  );
}

/**
 * Single-slot photo override, its own sibling `<form>` (never nested inside
 * the text-content form). Carries the other three slots' current values as
 * hidden inputs so saving this one slot can never clobber the others —
 * `updatePhotosAction` expects the full set of overrides together.
 */
const PHOTO_SLOTS = ['heroPhotoUrl', 'aboutPhotoUrl', 'whyChooseUsPhotoUrl', 'servicesPhotoUrl'] as const;
type PhotoSlot = (typeof PHOTO_SLOTS)[number];

const SLOT_UPLOAD_FIELD_NAMES: Record<PhotoSlot, string> = {
  heroPhotoUrl: 'heroPhotoFile',
  aboutPhotoUrl: 'aboutPhotoFile',
  whyChooseUsPhotoUrl: 'whyChooseUsPhotoFile',
  servicesPhotoUrl: 'servicesPhotoFile',
};

function SectionPhotoEditor({
  businessId,
  redirectTo,
  business,
  slot,
  label,
  hint,
}: {
  businessId: string;
  redirectTo: string;
  business: Business;
  slot: PhotoSlot;
  label: string;
  hint?: string;
}) {
  const [, formAction] = useActionState(updatePhotosAction.bind(null, businessId, redirectTo), undefined);
  const photoUrls = business.photoUrls ?? [];
  const otherSlots = PHOTO_SLOTS.filter((s) => s !== slot);

  return (
    <form action={formAction} className="mt-4 pt-4 border-t border-gray-100">
      {otherSlots.map((s) => (
        <input key={s} type="hidden" name={s} value={business[s] ?? ''} />
      ))}
      <PhotoPickerField
        label={label}
        name={slot}
        photoUrls={photoUrls}
        defaultValue={business[slot]}
        hint={hint}
        uploadFieldName={SLOT_UPLOAD_FIELD_NAMES[slot]}
      />
      <div className="mt-2">
        <SubmitButton label="Save Photo" />
      </div>
    </form>
  );
}

let galleryIdCounter = 0;
function nextGalleryId(): number {
  galleryIdCounter += 1;
  return galleryIdCounter;
}

function GalleryImageEditor({
  images,
  availablePhotoUrls,
}: {
  images: { url: string; caption?: string }[];
  availablePhotoUrls: string[];
}) {
  const [items, setItems] = useState(() => images.map((img) => ({ id: nextGalleryId(), url: img.url, caption: img.caption ?? '' })));
  const usedUrls = new Set(items.map((it) => it.url));
  const selectable = availablePhotoUrls.filter((u) => !usedUrls.has(u));

  function addPhoto(url: string) {
    setItems((current) => [...current, { id: nextGalleryId(), url, caption: '' }]);
  }
  function removePhoto(id: number) {
    setItems((current) => current.filter((it) => it.id !== id));
  }
  function move(id: number, direction: 'up' | 'down') {
    setItems((current) => {
      const index = current.findIndex((it) => it.id === id);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && selectable.length === 0 && (
        <p className="text-xs text-gray-400 italic">Upload photos in the Photos card first.</p>
      )}
      {items.map((item, position) => (
        <div key={item.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-2">
          <input type="hidden" name={`galleryImages.${position}.url`} value={item.url} />
          <div className="relative w-14 h-14 rounded overflow-hidden shrink-0 border border-gray-200">
            <Image src={item.url} alt="" fill className="object-cover" sizes="56px" />
          </div>
          <input
            type="text"
            name={`galleryImages.${position}.caption`}
            defaultValue={item.caption}
            placeholder="Caption (optional)"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
          />
          <div className="flex gap-1 shrink-0">
            <button type="button" onClick={() => move(item.id, 'up')} disabled={position === 0} aria-label="Move up" className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30">↑</button>
            <button type="button" onClick={() => move(item.id, 'down')} disabled={position === items.length - 1} aria-label="Move down" className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30">↓</button>
            <button type="button" onClick={() => removePhoto(item.id)} aria-label="Remove" className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50">✕</button>
          </div>
        </div>
      ))}
      {selectable.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Add an uploaded photo:</p>
          <div className="flex flex-wrap gap-2">
            {selectable.map((url, i) => (
              <button
                type="button"
                key={url}
                onClick={() => addPhoto(url)}
                aria-label={`Add photo ${i + 1}`}
                className="relative w-14 h-14 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-(--color-brand) transition-colors"
              >
                <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="56px" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

interface Props {
  section: WebsiteSectionType;
  business: Business;
  preview?: SitePreview;
  redirectTo: string;
}

// `reviews` uses the `testimonials` Business field — the public
// ReviewsSection renders testimonials directly underneath the rating
// summary (see app/b/[slug]/template/ReviewsSection.tsx), so its row here
// gets the same editor (manual testimonials form, TestimonialsOrderEditor,
// GoogleReviewsPanel) the now-removed standalone `testimonials` section
// used to have.
const BUSINESS_LIST_SECTIONS: Partial<Record<WebsiteSectionType, BusinessListField>> = {
  reviews: 'testimonials',
  faq: 'faqItems',
  process: 'processSteps',
};

export function SectionContentEditor({ section, business, preview, redirectTo }: Props) {
  const listField = BUSINESS_LIST_SECTIONS[section];

  if (listField) {
    return <BusinessListEditor businessId={business.businessId} field={listField} section={section} business={business} />;
  }

  if (!preview) {
    return (
      <p className="px-4 pb-4 text-xs text-gray-400 italic">
        Generate a website first to edit this section&apos;s content.
      </p>
    );
  }

  const content = preview.content;
  // Saving the photo mini-form redirects too (it reuses updatePhotosAction) —
  // carry the section back through so it re-opens expanded, same as the
  // text-content form (see updateSectionContentAction's own redirect).
  const photoRedirectTo = `${redirectTo}?expandedSection=${section}`;

  switch (section) {
    case 'hero':
      return (
        <>
          <ContentForm businessId={business.businessId} previewId={preview.previewId} section="hero">
            <TextInput name="headline" label="Headline" defaultValue={content.hero.headline} maxLength={120} />
            <TextArea name="subheadline" label="Sub-Headline" defaultValue={content.hero.subheadline} maxLength={300} />
          </ContentForm>
          <div className="px-4 pb-4">
            <SectionPhotoEditor
              businessId={business.businessId}
              redirectTo={photoRedirectTo}
              business={business}
              slot="heroPhotoUrl"
              label="Hero photo"
              hint="For a full-width background, use a photo within 100px of 1920×1080 or 1600×900px."
            />
          </div>
        </>
      );

    case 'services':
      return (
        <>
          <ContentForm businessId={business.businessId} previewId={preview.previewId} section="services">
            <TextInput name="sectionHeadline" label="Headline" defaultValue={content.servicesSection?.headline} maxLength={120} />
            <TextArea name="sectionSubheadline" label="Sub-Headline" defaultValue={content.servicesSection?.subheadline} maxLength={300} />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Services</label>
              <RepeatableListEditor
                name="services"
                fields={[
                  { key: 'name', label: 'Service name', maxLength: 100 },
                  { key: 'description', label: 'Description', multiline: true, maxLength: 500 },
                ]}
                defaultItems={content.services.map((s) => ({ name: s.name, description: s.description }))}
                addLabel="Add service"
                maxItems={10}
              />
            </div>
          </ContentForm>
          <div className="px-4 pb-4">
            <SectionPhotoEditor
              businessId={business.businessId}
              redirectTo={photoRedirectTo}
              business={business}
              slot="servicesPhotoUrl"
              label="Featured service card photo"
            />
          </div>
        </>
      );

    case 'whyChooseUs':
      return (
        <>
          <ContentForm businessId={business.businessId} previewId={preview.previewId} section="whyChooseUs">
            <TextInput name="sectionHeadline" label="Headline" defaultValue={content.whyChooseUsSection?.headline} maxLength={120} />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Differentiators</label>
              <RepeatableListEditor
                name="differentiators"
                fields={[
                  { key: 'title', label: 'Title', maxLength: 80 },
                  { key: 'description', label: 'Description', multiline: true, maxLength: 300 },
                ]}
                defaultItems={(content.differentiators ?? []).map((d) => ({ title: d.title, description: d.description }))}
                addLabel="Add differentiator"
                maxItems={8}
              />
            </div>
          </ContentForm>
          <div className="px-4 pb-4">
            <SectionPhotoEditor
              businessId={business.businessId}
              redirectTo={photoRedirectTo}
              business={business}
              slot="whyChooseUsPhotoUrl"
              label="Why Choose Us photo"
            />
          </div>
        </>
      );

    case 'about':
      return (
        <>
          <ContentForm businessId={business.businessId} previewId={preview.previewId} section="about">
            <TextInput name="tagline" label="Headline" defaultValue={content.tagline} maxLength={200} />
            <TextArea name="aboutText" label="Description" defaultValue={content.aboutText} maxLength={2000} rows={5} />
            <TextInput name="quote" label="Photo panel quote" defaultValue={content.aboutSection?.quote} maxLength={300} />
          </ContentForm>
          <div className="px-4 pb-4">
            <SectionPhotoEditor
              businessId={business.businessId}
              redirectTo={photoRedirectTo}
              business={business}
              slot="aboutPhotoUrl"
              label="About Us photo"
            />
          </div>
        </>
      );

    case 'serviceAreas':
      return (
        <ContentForm businessId={business.businessId} previewId={preview.previewId} section="serviceAreas">
          <TextInput name="sectionHeadline" label="Headline" defaultValue={content.serviceAreasSection?.headline} maxLength={120} />
          <TextArea name="sectionSubheadline" label="Sub-Headline" defaultValue={content.serviceAreasSection?.subheadline} maxLength={300} />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Service Areas</label>
            <RepeatableListEditor
              name="serviceAreas"
              fields={[{ key: 'value', label: 'Area', maxLength: 80 }]}
              defaultItems={(content.serviceAreas ?? []).map((v) => ({ value: v }))}
              addLabel="Add area"
              maxItems={10}
            />
          </div>
        </ContentForm>
      );

    case 'gallery': {
      const images = content.gallerySection?.images ?? (business.photoUrls ?? []).map((url) => ({ url }));
      return (
        <ContentForm businessId={business.businessId} previewId={preview.previewId} section="gallery">
          <TextInput name="sectionHeadline" label="Headline" defaultValue={content.gallerySection?.headline} maxLength={120} />
          <TextArea name="sectionSubheadline" label="Sub-Headline" defaultValue={content.gallerySection?.subheadline} maxLength={300} />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Photos</label>
            <GalleryImageEditor images={images} availablePhotoUrls={business.photoUrls ?? []} />
          </div>
        </ContentForm>
      );
    }

    case 'ctaBanner':
      return (
        <ContentForm businessId={business.businessId} previewId={preview.previewId} section="ctaBanner">
          <TextInput name="sectionHeadline" label="Headline" defaultValue={content.ctaBannerSection?.headline} maxLength={120} />
          <TextArea name="sectionSubheadline" label="Sub-Headline" defaultValue={content.ctaBannerSection?.subheadline} maxLength={300} />
        </ContentForm>
      );

    case 'contact':
      return (
        <ContentForm businessId={business.businessId} previewId={preview.previewId} section="contact">
          <TextInput name="phone" label="Phone" defaultValue={content.contact.phone} />
          <TextInput name="email" label="Email" defaultValue={content.contact.email} />
          <TextInput name="address" label="Address" defaultValue={content.contact.address} maxLength={300} />
          <TextInput name="hours" label="Hours" defaultValue={content.hours} maxLength={200} />
        </ContentForm>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// ContentForm — a thin useActionState wrapper bound to updateSectionContentAction
// ---------------------------------------------------------------------------

function ContentForm({
  businessId,
  previewId,
  section,
  children,
}: {
  businessId: string;
  previewId: string;
  section: WebsiteSectionType;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState(
    updateSectionContentAction.bind(null, businessId, previewId, section),
    undefined,
  );

  return (
    <div className="px-4 pb-4 space-y-3">
      <form action={formAction} className="space-y-3">
        <ErrorAlert message={state?.message} />
        {children}
        <SubmitButton label="Save Content" />
      </form>
    </div>
  );
}

function BusinessListEditor({
  businessId,
  field,
  section,
  business,
}: {
  businessId: string;
  field: BusinessListField;
  /** Which row this editor is rendering under — distinct from `field`
   *  (`reviews` uses `field="testimonials"`), so this is what tells the save
   *  action which row to re-expand on redirect (see
   *  `updateBusinessListFieldAction`). */
  section: WebsiteSectionType;
  business: Business;
}) {
  const [state, formAction] = useActionState(updateBusinessListFieldAction.bind(null, businessId, field, section), undefined);

  const config: Record<
    BusinessListField,
    {
      name: string;
      fields: { key: string; label: string; multiline?: boolean; maxLength?: number; type?: 'select' | 'hidden'; options?: { value: string; label: string }[] }[];
      items: Record<string, string>[];
      addLabel: string;
      max: number;
    }
  > = {
    testimonials: {
      name: 'testimonials',
      fields: [
        // Round-trips each row's stable identity so a save can tell "this is
        // still the same testimonial, just edited" from "this is a brand-new
        // one" — needed to preserve the admin's custom ordering (see
        // TestimonialsOrderEditor.tsx / mergeTestimonialsPreservingOrder).
        { key: 'id', label: '', type: 'hidden' },
        { key: 'author', label: 'Author', maxLength: 100 },
        { key: 'quote', label: 'Quote', multiline: true, maxLength: 500 },
        {
          key: 'rating',
          label: 'Rating',
          type: 'select',
          options: [
            { value: '', label: 'No rating' },
            { value: '5', label: '★★★★★ (5)' },
            { value: '4', label: '★★★★☆ (4)' },
            { value: '3', label: '★★★☆☆ (3)' },
            { value: '2', label: '★★☆☆☆ (2)' },
            { value: '1', label: '★☆☆☆☆ (1)' },
          ],
        },
      ],
      // Manual entries only — Google-sourced testimonials are read-only and
      // rendered separately by GoogleReviewsPanel below, never through this
      // free-text form.
      items: (business.testimonials ?? [])
        .filter((t) => t.source === 'manual')
        .map((t) => ({ id: t.id, author: t.author, quote: t.quote, rating: t.rating?.toString() ?? '' })),
      addLabel: 'Add testimonial',
      max: 20,
    },
    faqItems: {
      name: 'faq',
      fields: [
        { key: 'question', label: 'Question', maxLength: 200 },
        { key: 'answer', label: 'Answer', multiline: true, maxLength: 1000 },
      ],
      items: (business.faqItems ?? []).map((f) => ({ question: f.question, answer: f.answer })),
      addLabel: 'Add FAQ item',
      max: 30,
    },
    processSteps: {
      name: 'process',
      fields: [
        { key: 'title', label: 'Title', maxLength: 80 },
        { key: 'description', label: 'Description', multiline: true, maxLength: 300 },
      ],
      items: (business.processSteps ?? []).map((p) => ({ title: p.title, description: p.description })),
      addLabel: 'Add step',
      max: 10,
    },
  };

  const { name, fields, items, addLabel, max } = config[field];

  return (
    <div className="px-4 pb-4">
      {field === 'testimonials' && (
        <>
          <TestimonialsOrderEditor
            businessId={businessId}
            testimonials={(business.testimonials ?? []).filter((t) => !t.hidden)}
          />
          <GoogleReviewsPanel
            businessId={businessId}
            googlePlaceId={business.googlePlaceId}
            googleTestimonials={(business.testimonials ?? []).filter((t) => t.source === 'google')}
          />
        </>
      )}
      <form action={formAction} className="space-y-3">
        <ErrorAlert message={state?.message} />
        <RepeatableListEditor name={name} fields={fields} defaultItems={items} addLabel={addLabel} maxItems={max} />
        <SubmitButton label="Save Content" />
      </form>
    </div>
  );
}
