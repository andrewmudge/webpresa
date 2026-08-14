import 'server-only';
import type { PreviewContent, GalleryImage, PreviewService } from '@/domain/models/site-preview';
import { PreviewContentSchema } from '@/domain/schemas/site-preview.schema';
import type { WebsiteSectionType } from '@/domain/constants/website-sections';
import { ensureDraftPreview, putSitePreview } from '@/lib/db/site-previews';
import { parseIndexedList } from '@/lib/forms/indexed-list';

/**
 * Customer-scoped counterpart to the admin's `updateSectionContentAction` —
 * same per-section parsing (hero/services/whyChooseUs/about/serviceAreas/
 * gallery/ctaBanner/contact), but always resolves its target through
 * `ensureDraftPreview(businessId)` rather than trusting a browser-supplied
 * `previewId`, so an edit can never land directly on an already-published
 * preview.
 *
 * Stage 25 — performs no auth/ownership check itself; the caller must call
 * `requireBusinessAccess()`/`requireBusinessOwnership()` first.
 */
export type CustomerSectionContentState = { message?: string } | undefined;

const SECTION_HEADING_MAX = { headline: 120, subheadline: 300 };

function coerceOptional(value: string | null | undefined): string | undefined {
  return value?.trim() || undefined;
}

function optionalHeading(headline: string, subheadline: string): { headline?: string; subheadline?: string } | undefined {
  const h = headline.trim();
  const s = subheadline.trim();
  if (!h && !s) return undefined;
  return { ...(h ? { headline: h } : {}), ...(s ? { subheadline: s } : {}) };
}

export async function updateCustomerSectionContent(
  businessId: string,
  section: WebsiteSectionType,
  formData: FormData,
): Promise<CustomerSectionContentState> {
  try {
    const draft = await ensureDraftPreview(businessId);
    if (!draft) return { message: 'No website exists yet to edit.' };

    const content: PreviewContent = { ...draft.content };

    switch (section) {
      case 'hero': {
        const headline = ((formData.get('headline') as string | null) ?? '').trim();
        const subheadline = ((formData.get('subheadline') as string | null) ?? '').trim();
        if (!headline || !subheadline) return { message: 'Headline and sub-headline are required.' };
        content.hero = {
          ...content.hero,
          headline: headline.slice(0, SECTION_HEADING_MAX.headline),
          subheadline: subheadline.slice(0, SECTION_HEADING_MAX.subheadline),
        };
        break;
      }
      case 'services': {
        const rows = parseIndexedList(formData, 'services', ['name', 'description']).filter((r) => r.name || r.description);
        if (rows.length === 0) return { message: 'At least one service is required.' };
        const services: PreviewService[] = rows.map((r) => ({
          name: r.name.slice(0, 100),
          description: r.description.slice(0, 500),
        }));
        content.services = services;
        content.servicesSection = optionalHeading(
          (formData.get('sectionHeadline') as string | null) ?? '',
          (formData.get('sectionSubheadline') as string | null) ?? '',
        );
        break;
      }
      case 'whyChooseUs': {
        const rows = parseIndexedList(formData, 'differentiators', ['title', 'description']).filter(
          (r) => r.title || r.description,
        );
        content.differentiators = rows.length
          ? rows.map((r) => ({ title: r.title.slice(0, 80), description: r.description.slice(0, 300) }))
          : undefined;
        content.whyChooseUsSection = optionalHeading((formData.get('sectionHeadline') as string | null) ?? '', '');
        break;
      }
      case 'about': {
        const tagline = ((formData.get('tagline') as string | null) ?? '').trim();
        const aboutText = ((formData.get('aboutText') as string | null) ?? '').trim();
        if (!tagline || !aboutText) return { message: 'Headline and description are required.' };
        const quote = ((formData.get('quote') as string | null) ?? '').trim();
        content.tagline = tagline.slice(0, 200);
        content.aboutText = aboutText.slice(0, 2000);
        content.aboutSection = quote ? { quote: quote.slice(0, 300) } : undefined;
        break;
      }
      case 'serviceAreas': {
        const rows = parseIndexedList(formData, 'serviceAreas', ['value']).map((r) => r.value).filter(Boolean);
        content.serviceAreas = rows.length ? rows.slice(0, 10).map((v) => v.slice(0, 80)) : undefined;
        content.serviceAreasSection = optionalHeading(
          (formData.get('sectionHeadline') as string | null) ?? '',
          (formData.get('sectionSubheadline') as string | null) ?? '',
        );
        break;
      }
      case 'gallery': {
        const rows = parseIndexedList(formData, 'galleryImages', ['url', 'caption']).filter((r) => r.url);
        const images: GalleryImage[] = rows
          .slice(0, 6)
          .map((r) => ({ url: r.url, ...(r.caption ? { caption: r.caption.slice(0, 200) } : {}) }));
        content.gallerySection = {
          ...optionalHeading(
            (formData.get('sectionHeadline') as string | null) ?? '',
            (formData.get('sectionSubheadline') as string | null) ?? '',
          ),
          images,
        };
        break;
      }
      case 'ctaBanner': {
        content.ctaBannerSection = optionalHeading(
          (formData.get('sectionHeadline') as string | null) ?? '',
          (formData.get('sectionSubheadline') as string | null) ?? '',
        );
        break;
      }
      case 'contact': {
        const phone = coerceOptional(formData.get('phone') as string | null);
        const email = coerceOptional(formData.get('email') as string | null);
        const address = coerceOptional(formData.get('address') as string | null);
        const hours = coerceOptional(formData.get('hours') as string | null);
        content.contact = { ...(phone ? { phone } : {}), ...(email ? { email } : {}), ...(address ? { address } : {}) };
        content.hours = hours;
        break;
      }
      default:
        return { message: `Section "${section}" has no content editor.` };
    }

    PreviewContentSchema.parse(content);
    await putSitePreview({ ...draft, content, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error(`Failed to update customer ${section} content:`, err instanceof Error ? err.message : err);
    return { message: 'Failed to save changes. Please try again.' };
  }

  return undefined;
}
