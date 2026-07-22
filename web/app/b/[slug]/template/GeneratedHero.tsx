import { createElement, type ReactNode } from 'react';
import Image from 'next/image';
import { V } from './tokens';
import { CtaIcon, externalLinkAttrs, type ResolvedCta } from './cta';
import { getHeroIcon } from './industry-icons';
import { getHeroIllustration } from './hero-illustrations';
import type { HeroStyle } from '@/domain/models/site-preview';
import type { Industry } from '@/domain/constants/industries';
import type { ThemeName } from '@/domain/constants/themes';

interface Props {
  headline: string;
  subheadline: string;
  serviceArea?: string;
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

/**
 * The image column of the two-column split layout (`SplitHeroSection`).
 *
 * When `desktopSrc === mobileSrc` (the `'illustration'` style — same theme
 * graphic at every viewport), renders a single `<Image>` whose crop shifts
 * by breakpoint via CSS, exactly as before this component was extracted.
 *
 * When they differ (the `'imageSplit'` style, the mobile-only piece of
 * `'image'`, or `'illustration'` with a `heroImageUrlMobile` set — see
 * below), renders two `<Image>`s, each CSS-hidden at the other breakpoint:
 * mobile shows whichever `mobileSrc` its caller resolved (the theme
 * illustration by default, or a real photo when `heroImageUrlMobile` is
 * set), desktop shows `desktopSrc`.
 */
/** Renders a logo image `object-contain`ed on a neutral surface backdrop, inset by `padding`, instead of `object-cover` cropping it. */
function LogoFrame({ image, padding, breakpointClassName }: { image: ReactNode; padding: string; breakpointClassName: string }) {
  return (
    <div className={`absolute inset-0 ${padding} ${breakpointClassName}`} style={{ backgroundColor: V.surface }}>
      <div className="relative w-full h-full">{image}</div>
    </div>
  );
}

function HeroCornerImage({
  desktopSrc,
  mobileSrc,
  desktopIsPhoto,
  mobileIsPhoto,
  desktopIsLogo,
  mobileIsLogo,
}: {
  desktopSrc: string;
  mobileSrc: string;
  /**
   * The floating rounded/shadowed/gapped card treatment is for real uploaded
   * photos only — the theme illustration fallback keeps its original flush,
   * edge-to-edge look at whichever breakpoint it's actually showing on.
   * These are independent per breakpoint (e.g. a real mobile photo can be
   * rounded while desktop still shows the flush illustration, or vice versa).
   */
  desktopIsPhoto: boolean;
  mobileIsPhoto: boolean;
  /** True when that breakpoint's resolved image is the business's own logo — see `LogoFrame`. */
  desktopIsLogo?: boolean;
  mobileIsLogo?: boolean;
}) {
  const mobileBox = mobileIsPhoto ? 'inset-y-4 right-4 rounded-2xl overflow-hidden shadow-xl' : 'inset-y-0 right-0';
  const desktopBox = desktopIsPhoto ? 'lg:rounded-2xl lg:overflow-hidden lg:shadow-xl lg:my-8 lg:mr-8 xl:mr-12' : '';
  const wrapperClassName =
    `absolute w-[35%] ${mobileBox} lg:relative lg:inset-auto lg:w-auto lg:order-2 lg:min-h-[280px] ${desktopBox}`.trim();
  const gradientOverlay = (
    <div
      className="absolute inset-0 lg:hidden"
      style={{ background: 'linear-gradient(to right, var(--site-background) 0%, var(--site-background) 10%, transparent 60%)' }}
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

interface SplitHeroSectionProps {
  headline: string;
  subheadline: string;
  serviceArea?: string;
  primary: ResolvedCta | null;
  secondary: ResolvedCta | null;
  desktopImageSrc: string;
  mobileImageSrc: string;
  /** See `HeroCornerImage` — only a real photo gets the rounded/shadowed/gapped card treatment. */
  desktopIsPhoto: boolean;
  mobileIsPhoto: boolean;
  /** See `HeroCornerImage`/`LogoFrame` — renders `object-contain` on a surface backdrop instead of cropping. */
  desktopIsLogo?: boolean;
  mobileIsLogo?: boolean;
}

/**
 * The two-column split layout: text left, image right. Originally built as
 * the `'illustration'` no-photo fallback's only shape; now also used for
 * `'imageSplit'` (a real photo that isn't hero-dimensioned) and for the
 * mobile-only rendering of `'image'` (a hero-dimensioned real photo, whose
 * desktop rendering stays the separate full-bleed legacy section below —
 * see the `'image'` branch in `GeneratedHero`).
 *
 * Desktop (`lg:`+): the section itself has no `max-w-6xl` wrapper, unlike
 * every other section, so the text column can run the full width of its
 * half — light background, no dark readability scrim (text sits on a plain
 * panel, not on top of the image). The image's own treatment depends on
 * whether it's a real photo or the theme illustration — see
 * `HeroCornerImage`: a real photo floats as a rounded, shadowed card inset
 * from the section's top/right/bottom edges; the illustration stays flush,
 * edge-to-edge, exactly as originally designed.
 * Mobile: the image is `position: absolute`, cropped to the right ~35% of
 * the screen (also only inset into a rounded card when it's a real photo —
 * see `HeroCornerImage`), height-matched to the text column's own natural
 * content height, with a gradient blending its left portion into
 * `var(--site-background)` so text stays legible.
 */
function SplitHeroSection({
  headline,
  subheadline,
  serviceArea,
  primary,
  secondary,
  desktopImageSrc,
  mobileImageSrc,
  desktopIsPhoto,
  mobileIsPhoto,
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
          <div className="max-w-xl">
            {/* Capped to 75% width on mobile so it never runs under the
                image, which is anchored to the right ~25%. */}
            <div className="max-w-[75%] lg:max-w-none">
              {serviceArea && (
                <div
                  className="inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 mb-5"
                  style={{ backgroundColor: V.surface, borderColor: V.border }}
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" style={{ color: V.primary }}>
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-(--site-text)">Serving {serviceArea}</span>
                </div>
              )}

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

            {/* Capped tighter than the text above (60% vs 75%) — the pill
                buttons' borders/shadow read worse than text if they touch
                the image's edge, so they get more clearance. */}
            <div className="max-w-[60%] lg:max-w-none flex flex-col sm:flex-row gap-3">
              {primary && (
                <a
                  href={primary.href}
                  {...externalLinkAttrs(primary)}
                  className="inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
                  style={{ backgroundColor: V.primary }}
                >
                  <CtaIcon type={primary.type} className="w-5 h-5 mr-2" />
                  {primary.label}
                </a>
              )}
              {secondary && (
                <a
                  href={secondary.href}
                  {...externalLinkAttrs(secondary)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-base font-bold border-2 border-(--site-primary) text-(--site-primary) transition-colors hover:bg-(--site-primary) hover:text-white"
                >
                  <CtaIcon type={secondary.type} className="w-5 h-5" />
                  {secondary.label}
                </a>
              )}
            </div>
          </div>
        </div>

        <HeroCornerImage
          desktopSrc={desktopImageSrc}
          mobileSrc={mobileImageSrc}
          desktopIsPhoto={desktopIsPhoto}
          mobileIsPhoto={mobileIsPhoto}
          desktopIsLogo={desktopIsLogo}
          mobileIsLogo={mobileIsLogo}
        />
      </div>
    </section>
  );
}

export function GeneratedHero({
  headline,
  subheadline,
  serviceArea,
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

  // The 'illustration' fallback (the universal no-photo default for every
  // newly generated preview) is a structurally different layout — a plain
  // light two-column split, not a full-bleed background with a dark
  // readability scrim — so it gets its own early-return branch rather than
  // being squeezed into the single-background-layer chain below, which
  // exists only to serve the legacy gradient/pattern/solid styles (and the
  // 'image' style's own desktop rendering — see further down).
  if (resolvedStyle === 'illustration') {
    const illustrationSrc = getHeroIllustration(themeName);
    return (
      <SplitHeroSection
        headline={headline}
        subheadline={subheadline}
        serviceArea={serviceArea}
        primary={primary}
        secondary={secondary}
        desktopImageSrc={illustrationSrc}
        mobileImageSrc={heroImageUrlMobile ?? illustrationSrc}
        desktopIsPhoto={false}
        mobileIsPhoto={!!heroImageUrlMobile}
        mobileIsLogo={heroImageMobileIsLogo}
      />
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
        serviceArea={serviceArea}
        primary={primary}
        secondary={secondary}
        desktopImageSrc={heroImageUrl}
        mobileImageSrc={heroImageUrlMobile ?? getHeroIllustration(themeName)}
        desktopIsPhoto
        mobileIsPhoto={!!heroImageUrlMobile}
        desktopIsLogo={heroImageIsLogo}
        mobileIsLogo={heroImageMobileIsLogo}
      />
    );
  }

  // Legacy single-layer section: serves the 'gradient'/'pattern'/'solid'
  // fallbacks unchanged at every viewport size, and is also the 'image'
  // style's own desktop-only rendering below. Computed once so it can be
  // reused by both the 'image' branch and the final fallback return.
  const legacySection = (
    <section className="relative flex items-center min-h-[88vh] overflow-hidden">
      {/* Background: photo, CSS gradient, CSS dot pattern, or a flat primary-color fallback (legacy styles only) */}
      {showImage ? (
        <Image
          src={heroImageUrl!}
          alt=""
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
      ) : resolvedStyle === 'gradient' ? (
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

      {/* Industry watermark icon — legacy gradient/pattern/solid previews only;
          the 'illustration'/'imageSplit' styles (handled above) have their own
          dedicated image instead and never reach this branch. See industry-icons.tsx. */}
      {!showImage &&
        createElement(getHeroIcon(industry), {
          className: 'hidden lg:block absolute -right-16 top-1/2 -translate-y-1/2 text-white/10',
          style: { width: '32rem', height: '32rem' },
          strokeWidth: 1,
          'aria-hidden': true,
        })}

      {/* Dark gradient overlay — always present for text readability */}
      <div
        className="absolute inset-0"
        style={{
          background: showImage
            ? 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.15) 100%)'
            : 'linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-24 w-full">
        <div className="max-w-2xl">
          {/* Eyebrow */}
          {serviceArea && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 px-4 py-1.5 mb-5">
              <svg className="w-3.5 h-3.5 text-white/80" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-white/90">Serving {serviceArea}</span>
            </div>
          )}

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
              <a
                href={primary.href}
                {...externalLinkAttrs(primary)}
                className="inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
                style={{ backgroundColor: V.accent }}
              >
                {primary.label}
              </a>
            )}
            {secondary && (
              <a
                href={secondary.href}
                {...externalLinkAttrs(secondary)}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-base font-bold text-white bg-white/15 backdrop-blur-sm border border-white/30 transition-all hover:bg-white/25"
              >
                <CtaIcon type={secondary.type} className="w-5 h-5" />
                {secondary.label}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  // 'image' — a real hero photo, exactly hero-dimensioned. Desktop keeps
  // today's full-bleed photo treatment (the legacy section above) exactly
  // as-is; mobile borrows the same no-photo split shell that
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
            serviceArea={serviceArea}
            primary={primary}
            secondary={secondary}
            desktopImageSrc={mobileHeroSrc}
            mobileImageSrc={mobileHeroSrc}
            desktopIsPhoto={!!heroImageUrlMobile}
            mobileIsPhoto={!!heroImageUrlMobile}
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
