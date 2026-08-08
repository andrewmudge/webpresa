import { Globe, Smartphone, SquarePen } from 'lucide-react';
import { POSTCARD_NAVY, POSTCARD_BLUE } from './postcard-colors';

const FEATURES = [
  { Icon: Globe, label: 'MODERN', sub: 'Built for today' },
  { Icon: Smartphone, label: 'MOBILE FRIENDLY', sub: 'Looks great everywhere' },
  { Icon: SquarePen, label: 'EDIT ANYTIME', sub: "You're in control" },
] as const;

/**
 * Top-right feature row — three icon+label+sub-label items separated by
 * thin dividers, on the plain white card background. Replaces the diagonal
 * blue banner entirely (2026-08-08 feedback: "completely remove the blue
 * accent... replace with icons and text", matching a reference postcard's
 * header treatment) — `PostcardDiagonalBanner` is gone, not repurposed.
 */
export default function PostcardFeatureRow() {
  return (
    <div className="flex items-center gap-[1.6cqw]">
      {FEATURES.map((feature, i) => (
        <div key={feature.label} className="flex items-center gap-[1.6cqw]">
          {i > 0 && <div className="h-[3.6cqw] w-px bg-gray-200" />}
          <div className="flex items-center gap-[0.8cqw]">
            <span className="flex h-[3.4cqw] w-[3.4cqw] shrink-0 items-center justify-center rounded-full border-[1.5px]" style={{ borderColor: POSTCARD_BLUE }}>
              <feature.Icon className="h-[1.8cqw] w-[1.8cqw]" style={{ color: POSTCARD_BLUE }} strokeWidth={2} />
            </span>
            <div>
              <p className="whitespace-nowrap text-[1.15cqw] font-extrabold tracking-wide" style={{ color: POSTCARD_NAVY }}>
                {feature.label}
              </p>
              <p className="whitespace-nowrap text-[0.95cqw] font-bold text-gray-500">{feature.sub}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
