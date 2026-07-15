import { createElement } from 'react';
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
  /** Falls back to `heroImageUrl ? 'image' : 'illustration'` when absent (legacy previews). */
  heroStyle?: HeroStyle;
  /** Drives the industry watermark icon shown for the legacy gradient/pattern/solid fallbacks. */
  industry?: Industry;
  /** Drives which theme-matched illustration renders for the 'illustration' fallback. */
  themeName?: ThemeName;
  primary: ResolvedCta | null;
  secondary: ResolvedCta | null;
}

export function GeneratedHero({
  headline,
  subheadline,
  serviceArea,
  heroImageUrl,
  heroStyle,
  industry,
  themeName,
  primary,
  secondary,
}: Props) {
  const resolvedStyle: HeroStyle = heroStyle ?? (heroImageUrl ? 'image' : 'illustration');
  const showImage = resolvedStyle === 'image' && !!heroImageUrl;

  // The 'illustration' fallback (the universal no-photo default for every
  // newly generated preview) is a structurally different layout — a plain
  // light two-column split, not a full-bleed background with a dark
  // readability scrim — so it gets its own early-return branch rather than
  // being squeezed into the single-background-layer chain below, which
  // exists only to serve the legacy gradient/pattern/solid styles.
  if (resolvedStyle === 'illustration') {
    return (
      <section className="relative overflow-hidden bg-(--site-background)">
        {/* No max-width wrapper here — the grid spans the full viewport so the
            illustration column reaches the true browser edge (a full bleed),
            unlike every other section which sits inside max-w-6xl. Only the
            text column gets its own padding, via lg:pl-12 xl:pl-20 below. */}
        <div className="relative grid grid-cols-1 lg:grid-cols-2 min-h-[520px] lg:min-h-[640px]">
          {/* Text + CTAs — sits at the top of its column (no vertical centering
              against the illustration's height, which previously left a large
              empty gap above the eyebrow on tall illustrations). On mobile the
              illustration is now a 30%-opacity background sitting behind this
              (see below) rather than a separate block, so this stays the only
              row-occupying content there — no order/reordering needed on mobile. */}
          <div className="relative z-10 lg:order-1 px-4 sm:px-6 lg:pl-12 xl:pl-20 lg:pr-8 py-12 lg:py-20">
            <div className="max-w-xl">
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

              <div className="flex flex-col sm:flex-row gap-3">
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

          {/* Theme-matched illustration. Desktop (lg+): unchanged — a full-bleed
              right column at full opacity, reaching the true browser edge.
              Mobile: a 30%-opacity watermark filling the whole section behind
              the text/CTA (position: absolute takes it out of grid flow, so it
              no longer reserves its own row — this replaces the earlier
              "banner above the text" mobile treatment). */}
          <div className="absolute inset-0 opacity-30 lg:relative lg:inset-auto lg:opacity-100 lg:order-2 lg:min-h-[280px]">
            <Image
              src={getHeroIllustration(themeName)}
              alt=""
              fill
              className="object-cover"
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
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
          the 'illustration' style (handled above) has its own dedicated image
          instead and never reaches this branch. See industry-icons.tsx. */}
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
}
