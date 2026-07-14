import { createElement } from 'react';
import Image from 'next/image';
import { V } from './tokens';
import { CtaIcon, externalLinkAttrs, type ResolvedCta } from './cta';
import { getHeroIcon } from './industry-icons';
import type { HeroStyle } from '@/domain/models/site-preview';
import type { Industry } from '@/domain/constants/industries';

interface Props {
  headline: string;
  subheadline: string;
  serviceArea?: string;
  heroImageUrl?: string;
  /** Falls back to `heroImageUrl ? 'image' : 'solid'` when absent (legacy previews). */
  heroStyle?: HeroStyle;
  /** Drives the industry watermark icon shown when there's no hero photo. */
  industry?: Industry;
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
  primary,
  secondary,
}: Props) {
  const resolvedStyle: HeroStyle = heroStyle ?? (heroImageUrl ? 'image' : 'solid');
  const showImage = resolvedStyle === 'image' && !!heroImageUrl;

  return (
    <section className="relative flex items-center min-h-[88vh] overflow-hidden">
      {/* Background: photo, CSS gradient, CSS dot pattern, or a flat primary-color fallback */}
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

      {/* Industry watermark icon — only when there's no hero photo; adds visual
          interest to the gradient/pattern/solid fallback without pretending
          to be a real photo of the business (see industry-icons.tsx). */}
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
