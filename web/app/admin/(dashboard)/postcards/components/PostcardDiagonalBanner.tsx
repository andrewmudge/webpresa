import { MonitorSmartphone } from 'lucide-react';
import { POSTCARD_BLUE, POSTCARD_BLUE_LIGHT } from './postcard-colors';

/**
 * Top-right diagonal banner — fixed marketing copy, no dynamic data. The
 * slanted left edge is a `clip-path` polygon; there's no existing
 * precedent for this shape elsewhere in the app (confirmed via grep before
 * building this), so this is new, not reused.
 *
 * The banner's blue shape is deliberately full-bleed (spans to the card's
 * top and right edges — its parent column in `PostcardFront.tsx` already
 * reaches both via `justify-between`), but its text content is not: extra
 * top padding pushes the words down below the safe-zone line even though
 * the background gradient itself bleeds to the card's edges.
 */
export default function PostcardDiagonalBanner() {
  return (
    <div
      className="flex h-full items-center gap-[1.4cqw] pb-[1.6cqh] pl-[9cqw] pr-[2.5cqw] pt-[3cqh] text-white"
      style={{
        background: `linear-gradient(135deg, ${POSTCARD_BLUE_LIGHT}, ${POSTCARD_BLUE})`,
        clipPath: 'polygon(18% 0%, 100% 0%, 100% 100%, 0% 100%)',
      }}
    >
      <MonitorSmartphone className="h-[2.6cqw] w-[2.6cqw] shrink-0" strokeWidth={2} />
      <p className="text-[1.5cqw] font-bold leading-tight">Modern. Mobile Friendly. Built to Convert.</p>
    </div>
  );
}
