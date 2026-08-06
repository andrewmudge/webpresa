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
      className="flex h-full items-center gap-[1.2cqw] bg-(--color-brand) py-[1.2cqw] pl-[7cqw] pr-[2.5cqw] text-white"
      style={{ clipPath: 'polygon(12% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
    >
      <div className="flex shrink-0 items-center gap-[0.6cqw]">
        <Monitor className="h-[2cqw] w-[2cqw]" />
        <Smartphone className="h-[1.7cqw] w-[1.7cqw]" />
      </div>
      <p className="text-[1.5cqw] font-semibold leading-tight">Modern. Mobile Friendly. Built to Convert.</p>
    </div>
  );
}
