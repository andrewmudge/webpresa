import Image from 'next/image';
import { V } from './tokens';
import { externalLinkAttrs, type ResolvedCta } from './cta';

interface Props {
  businessName: string;
  tagline: string;
  aboutText: string;
  primary: ResolvedCta | null;
  imageUrl?: string;
}

export function AboutSection({ businessName, tagline, aboutText, primary, imageUrl }: Props) {
  return (
    <section id="about" className="py-20 bg-(--site-background)">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div>
            <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: V.accent }}>
              About Us
            </p>
            <h2
              className="font-extrabold text-(--site-text) leading-tight mb-5"
              style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
            >
              {tagline}
            </h2>
            <p className="text-(--site-muted) leading-relaxed mb-7 max-w-prose">{aboutText}</p>
            {primary && (
              <a
                href={primary.href}
                {...externalLinkAttrs(primary)}
                className="inline-flex items-center gap-2 font-bold rounded-xl px-6 py-3 text-white text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: V.primary }}
              >
                {primary.label}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            )}
          </div>

          {/* Visual accent block — an uploaded photo always wins over the decorative fallback */}
          <div className="relative hidden lg:block rounded-2xl overflow-hidden min-h-[320px]">
            {imageUrl ? (
              <>
                <Image
                  src={imageUrl}
                  alt={`${businessName} team`}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                {/* Scrim for text legibility over an arbitrary photo */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              </>
            ) : (
              <>
                <div className="absolute inset-0" style={{ backgroundColor: V.primary }} />
                {/* Decorative concentric circles */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <div className="w-96 h-96 rounded-full border-2 border-white" />
                  <div className="absolute w-64 h-64 rounded-full border-2 border-white" />
                  <div className="absolute w-32 h-32 rounded-full border-2 border-white" />
                </div>
              </>
            )}
            <div className="relative z-10 p-10 flex flex-col justify-end h-full">
              <blockquote className="text-white/90 text-lg font-medium italic leading-relaxed">
                &ldquo;Our goal is simple: deliver quality work on time, every time.&rdquo;
              </blockquote>
              <p className="text-white/60 text-sm mt-3">— {businessName}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
