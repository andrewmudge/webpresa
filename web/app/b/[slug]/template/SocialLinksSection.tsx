import { SOCIAL_PLATFORM_LABELS } from '@/domain/constants/social-platforms';
import type { PreviewSocialLink } from '@/domain/models/site-preview';
import { SocialIcon } from './SocialIcon';
import { V } from './tokens';

interface Props {
  businessName: string;
  socialLinks: PreviewSocialLink[];
}

/**
 * A row of platform-icon links to the business's own social/review
 * profiles — admin-entered (`Business.socialLinks`) when present, else
 * discovered by Firecrawl during Stage 13 enrichment
 * (`WebsiteEnrichmentSnapshot.socialLinks` → `PreviewContent.socialLinks`
 * at generation time — see `lib/ai/generate-preview.ts`). Never rendered
 * with no data — `computeSectionAvailability`'s `socialLinks` check keeps
 * this off the page entirely when there's nothing found.
 */
export function SocialLinksSection({ businessName, socialLinks }: Props) {
  if (socialLinks.length === 0) return null;

  return (
    <section className="py-16 bg-(--site-surface)">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-xs font-bold tracking-widest uppercase mb-5" style={{ color: V.accent }}>
          Follow Us
        </p>
        <div className="flex items-center justify-center gap-4">
          {socialLinks.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-label={`${businessName} on ${SOCIAL_PLATFORM_LABELS[link.platform]}`}
              className="flex items-center justify-center w-16 h-16 rounded-full border-2 shadow-sm transition-all hover:opacity-80 hover:shadow-md"
              style={{ borderColor: V.border, color: V.primary, backgroundColor: V.background }}
            >
              <SocialIcon platform={link.platform} className="w-7 h-7" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
