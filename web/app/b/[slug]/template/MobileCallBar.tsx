'use client';
import { V } from './tokens';
import { CtaIcon, externalLinkAttrs, getMobileBarActions, type ResolvedCta } from './cta';

interface Props {
  primary: ResolvedCta | null;
  secondary: ResolvedCta | null;
}

const BAR_COLORS = [V.primary, V.accent];

// Sticky bar at the bottom of the viewport on mobile only.
// Hides on md+ screens — the header handles CTAs there.
// A single resolved CTA spans the full bar width instead of leaving an empty half.
export function MobileCallBar({ primary, secondary }: Props) {
  const actions = getMobileBarActions(primary, secondary);
  if (actions.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden safe-area-inset-bottom">
      <div className="flex gap-0 border-t border-white/20 shadow-2xl">
        {actions.map((cta, i) => (
          <a
            key={cta.variant}
            href={cta.href}
            {...externalLinkAttrs(cta)}
            className="flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold text-white"
            style={{ backgroundColor: BAR_COLORS[i] }}
          >
            <CtaIcon type={cta.type} className="w-4 h-4" />
            {cta.label}
          </a>
        ))}
      </div>
    </div>
  );
}
