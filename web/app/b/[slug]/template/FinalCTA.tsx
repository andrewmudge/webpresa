import { V } from './tokens';
import { CtaIcon, type ResolvedCta } from './cta';
import { CtaButton } from './CtaButton';

interface Props {
  primary: ResolvedCta | null;
  secondary: ResolvedCta | null;
  /** Admin-editable heading override (`content.ctaBannerSection`). Falls back to the built-in copy below when absent. */
  sectionHeadline?: string;
  sectionSubheadline?: string;
}

export function FinalCTA({ primary, secondary, sectionHeadline, sectionSubheadline }: Props) {
  return (
    <section
      className="py-20 relative overflow-hidden"
      style={{ backgroundColor: V.primary }}
    >
      {/* Decorative circles */}
      <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full opacity-5 bg-white" />
      <div className="absolute -left-10 -bottom-10 w-56 h-56 rounded-full opacity-5 bg-white" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
          {sectionHeadline || "Ready for a fix? Let's talk."}
        </h2>
        <p className="text-white/75 mb-10 max-w-md mx-auto">
          {sectionSubheadline || 'Schedule service today — fast response, professional results.'}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {primary && (
            <CtaButton
              cta={primary}
              className="inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-base font-bold transition-all hover:scale-[1.02] hover:shadow-lg"
              style={{ backgroundColor: V.accent, color: '#fff' }}
            >
              {primary.label}
            </CtaButton>
          )}
          {secondary && (
            <CtaButton
              cta={secondary}
              className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-bold text-white bg-white/15 border border-white/25 transition-all hover:bg-white/25"
            >
              <CtaIcon type={secondary.type} className="w-5 h-5" />
              {secondary.label}
            </CtaButton>
          )}
        </div>
      </div>
    </section>
  );
}
