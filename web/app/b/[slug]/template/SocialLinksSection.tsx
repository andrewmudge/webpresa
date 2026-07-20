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
    <section className="py-12 bg-(--site-background)">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: V.accent }}>
          Follow Us
        </p>
        <div className="flex items-center justify-center gap-3">
          {socialLinks.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-label={`${businessName} on ${SOCIAL_PLATFORM_LABELS[link.platform]}`}
              className="flex items-center justify-center w-11 h-11 rounded-full border transition-colors hover:opacity-80"
              style={{ borderColor: V.border, color: V.primary }}
            >
              <SocialIcon platform={link.platform} className="w-5 h-5" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
