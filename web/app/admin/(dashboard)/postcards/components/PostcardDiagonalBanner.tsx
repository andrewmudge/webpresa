import { Monitor, Smartphone } from 'lucide-react';

/**
 * Top-right diagonal banner — fixed marketing copy, no dynamic data. The
 * slanted left edge is a `clip-path` polygon; there's no existing
 * precedent for this shape elsewhere in the app (confirmed via grep before
 * building this), so this is new, not reused.
 */
export default function PostcardDiagonalBanner() {
  return (
    <div
      className="flex h-full items-center gap-[1cqw] bg-(--color-brand) py-[1cqh] pl-[8cqw] pr-[2.5cqw] text-white"
      style={{ clipPath: 'polygon(12% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
    >
      <div className="flex shrink-0 items-center gap-[0.5cqw]">
        <Monitor className="h-[1.8cqw] w-[1.8cqw] shrink-0" />
        <Smartphone className="h-[1.5cqw] w-[1.5cqw] shrink-0" />
      </div>
      <p className="text-[1.15cqw] font-semibold leading-tight">Modern. Mobile Friendly. Built to Convert.</p>
    </div>
  );
}
