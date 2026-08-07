import { MonitorSmartphone } from 'lucide-react';
import { POSTCARD_BLUE, POSTCARD_BLUE_LIGHT } from './postcard-colors';
import { POSTCARD_SAFE_ZONE_INSET_PERCENT } from './postcard-size';

/**
 * Top-right diagonal banner — fixed marketing copy, no dynamic data. The
 * slanted left edge is a `clip-path` polygon; there's no existing
 * precedent for this shape elsewhere in the app (confirmed via grep before
 * building this), so this is new, not reused.
 *
 * The banner's blue shape is deliberately full-bleed (spans to the card's
 * top and right edges — its parent column in `PostcardFront.tsx` already
 * reaches both via `justify-between`), but its text content is not: extra
 * top padding pushes the words down below the safe-zone line, and the
 * right padding exactly matches `PostcardFront.tsx`'s `CONTENT_RIGHT`
 * (same `POSTCARD_SAFE_ZONE_INSET_PERCENT.x` source) so the text's right
 * edge lines up with the showcase column and the footer's URL block —
 * the "shared right-side alignment" grid line from 2026-08-06 feedback.
 */
export default function PostcardDiagonalBanner() {
  return (
    <div
      className="flex h-full items-center gap-[1.4cqw] pb-[1.6cqh] pl-[9cqw] pt-[3cqh] text-white"
      style={{
        paddingRight: `${POSTCARD_SAFE_ZONE_INSET_PERCENT.x}cqw`,
        background: `linear-gradient(135deg, ${POSTCARD_BLUE_LIGHT}, ${POSTCARD_BLUE})`,
        clipPath: 'polygon(18% 0%, 100% 0%, 100% 100%, 0% 100%)',
      }}
    >
      <MonitorSmartphone className="h-[2.6cqw] w-[2.6cqw] shrink-0" strokeWidth={2} />
      <p className="text-[1.5cqw] font-bold leading-tight">Modern. Mobile Friendly. Built to Convert.</p>
    </div>
  );
}
