import { createElement, type ReactNode } from 'react';
import Image from 'next/image';
import { V } from './tokens';
import { CtaIcon, type ResolvedCta } from './cta';
import { CtaButton } from './CtaButton';
import { getHeroIcon } from './industry-icons';
import { getHeroIllustration } from './hero-illustrations';
import type { HeroStyle } from '@/domain/models/site-preview';
import type { Industry } from '@/domain/constants/industries';
import type { ThemeName } from '@/domain/constants/themes';

interface Props {
  headline: string;
  subheadline: string;
  heroImageUrl?: string;
  /**
   * Optional mobile-only hero photo, independent of `heroImageUrl`/`heroStyle`
   * (both desktop-oriented). Unset falls back to the theme illustration on
   * mobile, exactly as before this prop existed.
   */
  heroImageUrlMobile?: string;
  /**
   * The business's own logo (`Business.logoUrl`). Only used to detect when
   * `heroImageUrl`/`heroImageUrlMobile` is the same file — a logo/badge
   * design is usually edge-to-edge artwork (e.g. text running around a
   * circular rim), which gets cropped by the normal `object-cover`
   * treatment on any breakpoint whose container isn't the logo's own aspect
   * ratio. See `HeroCornerImage`'s `desktopIsLogo`/`mobileIsLogo`.
   */
  logoUrl?: string;
  /** Falls back to `heroImageUrl ? 'image' : 'illustration'` when absent (legacy previews). */
  heroStyle?: HeroStyle;
  /** Drives the industry watermark icon shown for the legacy gradient/pattern/solid fallbacks. */
  industry?: Industry;
  /** Drives which theme-matched illustration renders for the 'illustration' fallback and for the mobile-only no-photo treatment shared by 'image'/'imageSplit'. */
  themeName?: ThemeName;
  primary: ResolvedCta | null;
  secondary: ResolvedCta | null;
}

/** Renders a logo image `object-contain`ed on a neutral surface backdrop, inset by `padding`, instead of `object-cover` cropping it. */
function LogoFrame({ image, padding, breakpointClassName }: { image: ReactNode; padding: string; breakpointClassName: string }) {
  return (
    <div className={`absolute inset-0 ${padding} ${breakpointClassName}`} style={{ backgroundColor: V.surface }}>
      <div className="relative w-full h-full">{image}</div>
    </div>
  );
}

/**
 * The image column of the two-column split layout (`SplitHeroSection`).
 * Used for: the theme illustration fallback (no mobile photo chosen), and a
 * logo reused as the mobile hero. A deliberately chosen, non-logo mobile
 * photo never reaches this component — see `mobileHasPhoto` in
 * `GeneratedHero`, which routes that case through `MobileFullBleedHeroPhoto`
 * instead (see build_log.md, "Mobile hero photo — full-bleed redesign").
 */
function HeroCornerImage({
  desktopSrc,
  mobileSrc,
  desktopIsPhoto,
  desktopIsLogo,
  mobileIsLogo,
}: {
  desktopSrc: string;
  mobileSrc: string;
  /**
   * The floating rounded/shadowed/gapped card treatment is desktop-only, and
   * only for a real desktop photo that isn't exactly hero-dimensioned
   * (`'imageSplit'`) — the theme illustration fallback keeps its original
   * flush, edge-to-edge look on desktop too. Mobile is always flush.
   */
  desktopIsPhoto: boolean;
  /** True when that breakpoint's resolved image is the business's own logo — see `LogoFrame`. */
  desktopIsLogo?: boolean;
  mobileIsLogo?: boolean;
}) {
  const desktopBox = desktopIsPhoto ? 'lg:rounded-2xl lg:overflow-hidden lg:shadow-xl lg:my-8 lg:mr-8 xl:mr-12' : '';
  const wrapperClassName =
    `absolute w-[35%] inset-y-0 right-0 lg:relative lg:inset-auto lg:w-auto lg:order-2 lg:min-h-[280px] ${desktopBox}`.trim();
  const gradientOverlay = (
    <div
      className="absolute inset-0 lg:hidden"
      style={{ background: 'linear-gradient(to right, var(--site-background) 0%, transparent 25%)' }}
    />
  );

  if (desktopSrc === mobileSrc) {
    const image = (
      <Image src={desktopSrc} alt="" fill className="object-contain" priority sizes="(min-width: 1024px) 50vw, 35vw" />
    );
    return (
      <div className={wrapperClassName}>
        {desktopIsLogo || mobileIsLogo ? (
          <LogoFrame image={image} padding="p-6 lg:p-10" breakpointClassName="" />
        ) : (
          <Image
            src={desktopSrc}
            alt=""
            fill
            className="object-cover object-right lg:object-center"
            priority
            sizes="(min-width: 1024px) 50vw, 35vw"
          />
        )}
        {gradientOverlay}
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      {mobileIsLogo ? (
        <LogoFrame
          image={<Image src={mobileSrc} alt="" fill className="object-contain" priority sizes="35vw" />}
          padding="p-6"
          breakpointClassName="lg:hidden"
        />
      ) : (
        <Image src={mobileSrc} alt="" fill className="lg:hidden object-cover object-right" priority sizes="35vw" />
      )}
      {desktopIsLogo ? (
        <LogoFrame
          image={<Image src={desktopSrc} alt="" fill className="object-contain" priority sizes="50vw" />}
          padding="p-10"
          breakpointClassName="hidden lg:block"
        />
      ) : (
        <Image src={desktopSrc} alt="" fill className="hidden lg:block object-cover object-center" priority sizes="50vw" />
      )}
      {gradientOverlay}
    </div>
  );
}

interface HeroTextContentProps {
  headline: string;
  subheadline: string;
  primary: ResolvedCta | null;
  secondary: ResolvedCta | null;
}

/**
 * The theme-colored eyebrow/headline/subheadline/CTA block — text sits on a
 * plain background (`text-(--site-text)`/`text-(--site-muted)`), not on a
 * dark scrim over a photo. Shared by `SplitHeroSection`'s text column and
 * `MobileFullBleedHeroPhoto`'s content (over the solid-color portion of its
 * background-fade). Deliberately separate from `HeroOverlayContent` (below)
 * — that one hardcodes white text for a dark scrim over a full-bleed photo,
 * which would be illegible on a light theme's plain background.
 */
function HeroTextContent({ headline, subheadline, primary, secondary }: HeroTextContentProps) {
  return (
    <div className="max-w-xl">
      {/* Capped to 75% width so it never runs under a photo anchored to the right. */}
      <div className="max-w-[75%] lg:max-w-none">
        <h1
          className="font-extrabold text-(--site-text) leading-[1.1] mb-5 tracking-tight"
          style={{ fontSize: 'clamp(2.4rem, 5.5vw, 4rem)' }}
        >
          {headline}
        </h1>

        <p className="text-(--site-muted) mb-8 leading-relaxed" style={{ fontSize: 'clamp(1rem, 1.8vw, 1.2rem)' }}>
          {subheadline}
        </p>
      </div>

      {/* Capped tighter than the text above (60% vs 75%) — the pill buttons'
          borders/shadow read worse than text if they touch a photo's edge,
          so they get more clearance. */}
      <div className="max-w-[60%] lg:max-w-none flex flex-col sm:flex-row gap-3">
        {primary && (
          <CtaButton
            cta={primary}
            className="inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
            style={{ backgroundColor: V.primary }}
          >
            <CtaIcon type={primary.type} className="w-5 h-5 mr-2" />
            {primary.label}
          </CtaButton>
        )}
        {secondary && (
          <CtaButton
            cta={secondary}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-base font-bold border-2 border-(--site-primary) text-(--site-primary) transition-colors hover:bg-(--site-primary) hover:text-white"
          >
            <CtaIcon type={secondary.type} className="w-5 h-5" />
            {secondary.label}
          </CtaButton>
        )}
      </div>
    </div>
  );
}

interface SplitHeroSectionProps {
  headline: string;
  subheadline: string;
  primary: ResolvedCta | null;
  secondary: ResolvedCta | null;
  desktopImageSrc: string;
  mobileImageSrc: string;
  /** See `HeroCornerImage` — only a real *desktop* photo gets the rounded/shadowed/gapped card treatment; mobile is always flush. */
  desktopIsPhoto: boolean;
  /** See `HeroCornerImage`/`LogoFrame` — renders `object-contain` on a surface backdrop instead of cropping. */
  desktopIsLogo?: boolean;
  mobileIsLogo?: boolean;
}

/**
 * The two-column split layout: text left, image right. Used for the theme
 * illustration fallback (every breakpoint) and a logo reused as the mobile
 * hero — never for a deliberately chosen, non-logo mobile photo (see
 * `MobileFullBleedHeroPhoto`).
 *
 * Desktop (`lg:`+): the section itself has no `max-w-6xl` wrapper, unlike
 * every other section, so the text column can run the full width of its
 * half — light background, no dark readability scrim (text sits on a plain
 * panel, not on top of the image). The image's own treatment depends on
 * whether it's a real photo or the theme illustration — see
 * `HeroCornerImage`: a real photo floats as a rounded, shadowed card inset
 * from the section's top/right/bottom edges; the illustration stays flush,
 * edge-to-edge, exactly as originally designed.
 * Mobile: the image column is `position: absolute`, cropped to the right
 * ~35% of the screen and always flush/edge-to-edge (no card),
 * height-matched to the text column's own natural content height, with a
 * gradient blending its left portion into `var(--site-background)` so text
 * stays legible.
 */
function SplitHeroSection({
  headline,
  subheadline,
  primary,
  secondary,
  desktopImageSrc,
  mobileImageSrc,
  desktopIsPhoto,
  desktopIsLogo,
  mobileIsLogo,
}: SplitHeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-(--site-background)">
      <div className="relative grid grid-cols-1 lg:grid-cols-2 lg:min-h-[640px]">
        {/* Text + CTAs — sits at the top of its column (no vertical centering
            against the image's height, which previously left a large empty
            gap above the eyebrow on tall illustrations). The section's
            mobile height is driven entirely by this block's natural content
            height (no artificial min-height), which is what lets the image
            below match it exactly instead of overshooting. */}
        <div className="relative z-10 lg:order-1 px-4 sm:px-6 lg:pl-12 xl:pl-20 lg:pr-8 py-12 lg:py-20">
          <HeroTextContent headline={headline} subheadline={subheadline} primary={primary} secondary={secondary} />
        </div>

        <HeroCornerImage
          desktopSrc={desktopImageSrc}
          mobileSrc={mobileImageSrc}
          desktopIsPhoto={desktopIsPhoto}
          desktopIsLogo={desktopIsLogo}
          mobileIsLogo={mobileIsLogo}
        />
      </div>
    </section>
  );
}

interface HeroOverlayContentProps {
  headline: string;
  subheadline: string;
  primary: ResolvedCta | null;
  secondary: ResolvedCta | null;
}

/**
 * The white-text eyebrow/headline/subheadline/CTA block used on top of a
 * dark scrim — shared by `FullBleedHeroSection` (the desktop `'image'`
 * style's full-bleed photo) and the legacy gradient/pattern/solid fallback
 * in `GeneratedHero`, which differ only in what's behind this content, never
 * in the content itself. Deliberately separate from `HeroTextContent` — see
 * that component's doc comment for why they can't be merged.
 */
function HeroOverlayContent({ headline, subheadline, primary, secondary }: HeroOverlayContentProps) {
  return (
    <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-24 w-full">
      <div className="max-w-2xl">
        {/* Headline */}
        <h1
          className="font-extrabold text-white leading-[1.1] mb-5 tracking-tight"
          style={{ fontSize: 'clamp(2.4rem, 5.5vw, 4rem)' }}
        >
          {headline}
        </h1>

        {/* Sub-headline */}
        <p className="text-white/85 mb-8 leading-relaxed max-w-xl" style={{ fontSize: 'clamp(1rem, 1.8vw, 1.2rem)' }}>
          {subheadline}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          {primary && (
            <CtaButton
              cta={primary}
              className="inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
              style={{ backgroundColor: V.accent }}
            >
              <CtaIcon type={primary.type} className="w-5 h-5 mr-2" />
              {primary.label}
            </CtaButton>
          )}
          {secondary && (
            <CtaButton
              cta={secondary}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-base font-bold text-white bg-white/15 backdrop-blur-sm border border-white/30 transition-all hover:bg-white/25"
            >
              <CtaIcon type={secondary.type} className="w-5 h-5" />
              {secondary.label}
            </CtaButton>
          )}
        </div>
      </div>
    </div>
  );
}

interface FullBleedHeroSectionProps {
  imageSrc: string;
  headline: string;
  subheadline: string;
  primary: ResolvedCta | null;
  secondary: ResolvedCta | null;
}

/**
 * A hero photo that fills the entire section edge-to-edge — no rounded
 * corners, inset margin, or shadow — with only a dark gradient scrim behind
 * the text for readability. This is the desktop `'image'` style's
 * full-bleed treatment (a real photo that's exactly hero-dimensioned); see
 * the `'image'` branch in `GeneratedHero`, which renders this on desktop
 * only. Not used on mobile — see `MobileFullBleedHeroPhoto` for the mobile
 * equivalent, which uses theme-colored text and a background-color fade
 * instead of a black scrim + white text (this one only reads correctly over
 * a sufficiently dark photo, which isn't guaranteed on mobile's differently
 * cropped/chosen image).
 */
function FullBleedHeroSection({ imageSrc, headline, subheadline, primary, secondary }: FullBleedHeroSectionProps) {
  return (
    <section className="relative flex items-center min-h-[88vh] overflow-hidden">
      <Image src={imageSrc} alt="" fill className="object-cover object-center" priority sizes="100vw" />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.15) 100%)' }}
      />
      <HeroOverlayContent headline={headline} subheadline={subheadline} primary={primary} secondary={secondary} />
    </section>
  );
}

/**
 * Where the mobile background-color fade (see `MobileFullBleedHeroPhoto`)
 * holds fully solid before it starts fading, and where it finishes fading
 * to fully transparent (full photo). Tune to taste.
 */
const MOBILE_HERO_TINT_HOLD = '50%';
const MOBILE_HERO_TINT_END = '82%';

interface MobileFullBleedHeroPhotoProps {
  imageSrc: string;
  headline: string;
  subheadline: string;
  primary: ResolvedCta | null;
  secondary: ResolvedCta | null;
}

/**
 * Mobile-only rendering of a deliberately chosen, non-logo hero photo (see
 * `mobileHasPhoto` in `GeneratedHero`). The photo fills the whole section
 * edge-to-edge (`object-cover`, cropping is fine — unlike the desktop split
 * treatment, this is meant to look like a real full-bleed background photo,
 * per direct reference/feedback). A `var(--site-background)`-colored fade —
 * not a black scrim — sits on top: solid through `MOBILE_HERO_TINT_HOLD`
 * (where the text/CTAs sit, via the theme-colored `HeroTextContent`, so it
 * reads correctly on any theme, not just a dark one), then fading to fully
 * transparent by `MOBILE_HERO_TINT_END`, fully revealing the photo on the
 * right. No artificial min-height — the section's height is driven entirely
 * by the normal in-flow text content, keeping it compact.
 */
function MobileFullBleedHeroPhoto({ imageSrc, headline, subheadline, primary, secondary }: MobileFullBleedHeroPhotoProps) {
  return (
    <section className="relative overflow-hidden lg:hidden">
      <Image src={imageSrc} alt="" fill className="object-cover object-right" priority sizes="100vw" />
      <div
        className="absolute inset-0"
        style={{
          background:
            `linear-gradient(to right, var(--site-background) 0%, var(--site-background) ${MOBILE_HERO_TINT_HOLD}, transparent ${MOBILE_HERO_TINT_END})`,
        }}
      />
      <div className="relative z-10 px-4 sm:px-6 py-12">
        <HeroTextContent headline={headline} subheadline={subheadline} primary={primary} secondary={secondary} />
      </div>
    </section>
  );
}

interface LegacyFallbackSectionProps {
  resolvedStyle: HeroStyle;
  industry?: Industry;
  headline: string;
  subheadline: string;
  primary: ResolvedCta | null;
  secondary: ResolvedCta | null;
}

/**
 * The legacy gradient/pattern/solid-color hero background (no photo at
 * all) — previews saved before `heroStyle` defaulted to `'illustration'`
 * for the no-photo case. No new preview produces these; kept only so
 * previews saved with one keep rendering exactly as before. Used both by
 * the bottom-of-file fallback and, when a real mobile photo exists for an
 * otherwise-legacy preview, as that legacy preview's *desktop* rendering.
 */
function LegacyFallbackSection({
  resolvedStyle,
  industry,
  headline,
  subheadline,
  primary,
  secondary,
}: LegacyFallbackSectionProps) {
  return (
    <section className="relative flex items-center min-h-[88vh] overflow-hidden">
      {resolvedStyle === 'gradient' ? (
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, var(--site-primary) 0%, color-mix(in srgb, var(--site-primary) 55%, var(--site-accent)) 100%)',
          }}
        />
      ) : resolvedStyle === 'pattern' ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: V.primary,
            backgroundImage:
              'radial-gradient(circle, color-mix(in srgb, var(--site-accent) 40%, transparent) 2px, transparent 2px)',
            backgroundSize: '28px 28px',
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: V.primary }} />
      )}

      {createElement(getHeroIcon(industry), {
        className: 'hidden lg:block absolute -right-16 top-1/2 -translate-y-1/2 text-white/10',
        style: { width: '32rem', height: '32rem' },
        strokeWidth: 1,
        'aria-hidden': true,
      })}

      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 100%)' }}
      />

      <HeroOverlayContent headline={headline} subheadline={subheadline} primary={primary} secondary={secondary} />
    </section>
  );
}

export function GeneratedHero({
  headline,
  subheadline,
  heroImageUrl,
  heroImageUrlMobile,
  logoUrl,
  heroStyle,
  industry,
  themeName,
  primary,
  secondary,
}: Props) {
  const resolvedStyle: HeroStyle = heroStyle ?? (heroImageUrl ? 'image' : 'illustration');
  const showImage = (resolvedStyle === 'image' || resolvedStyle === 'imageSplit') && !!heroImageUrl;
  const heroImageIsLogo = !!logoUrl && !!heroImageUrl && heroImageUrl === logoUrl;
  const heroImageMobileIsLogo = !!logoUrl && !!heroImageUrlMobile && heroImageUrlMobile === logoUrl;

  // A deliberately chosen mobile hero photo (not the business's own logo)
  // always renders full-bleed on mobile, completely independent of whatever
  // style the desktop resolves to — see MobileFullBleedHeroPhoto. This
  // bypasses the split treatment below entirely, which is reserved for the
  // theme illustration fallback and a logo reused as the mobile hero.
  const mobileHasPhoto = !!heroImageUrlMobile && !heroImageMobileIsLogo;

  // The 'illustration' fallback (the universal no-photo default for every
  // newly generated preview) is a structurally different layout — a plain
  // light two-column split, not a full-bleed background with a dark
  // readability scrim — so it gets its own early-return branch rather than
  // being squeezed into the single-background-layer chain below, which
  // exists only to serve the legacy gradient/pattern/solid styles (and the
  // 'image' style's own desktop rendering — see further down). Explicitly
  // unaffected by `mobileHasPhoto` per direct instruction — this fallback
  // never changes.
  if (resolvedStyle === 'illustration' && !mobileHasPhoto) {
    const illustrationSrc = getHeroIllustration(themeName);
    return (
      <SplitHeroSection
        headline={headline}
        subheadline={subheadline}
        primary={primary}
        secondary={secondary}
        desktopImageSrc={illustrationSrc}
        mobileImageSrc={heroImageUrlMobile ?? illustrationSrc}
        desktopIsPhoto={false}
        mobileIsLogo={heroImageMobileIsLogo}
      />
    );
  }

  if (mobileHasPhoto) {
    // Desktop still resolves independently by its own `resolvedStyle` —
    // compute it once and reuse below regardless of which branch produced
    // it, wrapped so it only ever shows at `lg:`+.
    const desktopSection = (() => {
      if (resolvedStyle === 'illustration') {
        const illustrationSrc = getHeroIllustration(themeName);
        return (
          <SplitHeroSection
            headline={headline}
            subheadline={subheadline}
            primary={primary}
            secondary={secondary}
            desktopImageSrc={illustrationSrc}
            mobileImageSrc={illustrationSrc}
            desktopIsPhoto={false}
          />
        );
      }
      if (resolvedStyle === 'imageSplit' && heroImageUrl) {
        return (
          <SplitHeroSection
            headline={headline}
            subheadline={subheadline}
            primary={primary}
            secondary={secondary}
            desktopImageSrc={heroImageUrl}
            mobileImageSrc={heroImageUrl}
            desktopIsPhoto
            desktopIsLogo={heroImageIsLogo}
          />
        );
      }
      if (resolvedStyle === 'image' && showImage) {
        return (
          <FullBleedHeroSection
            imageSrc={heroImageUrl!}
            headline={headline}
            subheadline={subheadline}
            primary={primary}
            secondary={secondary}
          />
        );
      }
      return (
        <LegacyFallbackSection
          resolvedStyle={resolvedStyle}
          industry={industry}
          headline={headline}
          subheadline={subheadline}
          primary={primary}
          secondary={secondary}
        />
      );
    })();

    return (
      <>
        <div className="lg:hidden">
          <MobileFullBleedHeroPhoto
            imageSrc={heroImageUrlMobile!}
            headline={headline}
            subheadline={subheadline}
            primary={primary}
            secondary={secondary}
          />
        </div>
        <div className="hidden lg:block">{desktopSection}</div>
      </>
    );
  }

  // 'imageSplit' — a real hero photo that isn't exactly 1920x1080 or
  // 1600x900 (see lib/image/hero-dimensions.ts). Reuses the same split
  // layout as 'illustration', with the real photo on the desktop side.
  // Mobile is independent of the desktop photo — it shows
  // `heroImageUrlMobile` when set, else the theme illustration.
  if (resolvedStyle === 'imageSplit' && heroImageUrl) {
    return (
      <SplitHeroSection
        headline={headline}
        subheadline={subheadline}
        primary={primary}
        secondary={secondary}
        desktopImageSrc={heroImageUrl}
        mobileImageSrc={heroImageUrlMobile ?? getHeroIllustration(themeName)}
        desktopIsPhoto
        desktopIsLogo={heroImageIsLogo}
        mobileIsLogo={heroImageMobileIsLogo}
      />
    );
  }

  // Legacy single-layer section: a real full-bleed photo (via
  // FullBleedHeroSection, desktop 'image' style only) or the
  // 'gradient'/'pattern'/'solid' fallbacks — unchanged at every viewport
  // size. Computed once so it can be reused by both the 'image' branch and
  // the final fallback return.
  const legacySection = showImage ? (
    <FullBleedHeroSection
      imageSrc={heroImageUrl!}
      headline={headline}
      subheadline={subheadline}
      primary={primary}
      secondary={secondary}
    />
  ) : (
    <LegacyFallbackSection
      resolvedStyle={resolvedStyle}
      industry={industry}
      headline={headline}
      subheadline={subheadline}
      primary={primary}
      secondary={secondary}
    />
  );

  // 'image' — a real hero photo, exactly hero-dimensioned. Desktop keeps
  // today's full-bleed photo treatment (the legacy section above) exactly
  // as-is; mobile borrows the same flush split shell that
  // 'illustration'/'imageSplit' use, showing `heroImageUrlMobile` when set,
  // else the theme illustration (independent of the desktop photo above —
  // this branch's desktop rendering is `legacySection`, a completely
  // separate element, so `desktopImageSrc` here only matters for the
  // `desktopSrc === mobileSrc` single-`<Image>` optimization inside
  // `HeroCornerImage`, never for anything actually shown at `lg:`+).
  if (resolvedStyle === 'image' && showImage) {
    const mobileHeroSrc = heroImageUrlMobile ?? getHeroIllustration(themeName);
    return (
      <>
        <div className="lg:hidden">
          <SplitHeroSection
            headline={headline}
            subheadline={subheadline}
            primary={primary}
            secondary={secondary}
            desktopImageSrc={mobileHeroSrc}
            mobileImageSrc={mobileHeroSrc}
            desktopIsPhoto={false}
            desktopIsLogo={heroImageMobileIsLogo}
            mobileIsLogo={heroImageMobileIsLogo}
          />
        </div>
        <div className="hidden lg:block">{legacySection}</div>
      </>
    );
  }

  return legacySection;
}
