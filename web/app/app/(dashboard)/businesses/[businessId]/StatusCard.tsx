import Link from 'next/link';
import { ExternalLink, ArrowRight, Check, AlertTriangle, X, Minus, type LucideIcon } from 'lucide-react';
import type { BadgeTone } from './FormBits';
import type { DescribedStatus } from './overview-status';

interface Props {
  label: string;
  status: DescribedStatus;
  /** The card's subject icon (e.g. `Monitor` for Website, `Globe` for Domain) — shown inside a tone-tinted circle. */
  icon: LucideIcon;
  action?: { label: string; href: string; external?: boolean };
}

const ICON_CIRCLE_CLASSES: Record<BadgeTone, string> = {
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-gray-100 text-gray-500',
  blue: 'bg-blue-100 text-blue-700',
};

const VALUE_TEXT_CLASSES: Record<BadgeTone, string> = {
  green: 'text-green-700',
  amber: 'text-amber-700',
  red: 'text-red-700',
  gray: 'text-gray-600',
  blue: 'text-blue-700',
};

const BADGE_CIRCLE_CLASSES: Record<BadgeTone, string> = {
  green: 'bg-green-600',
  amber: 'bg-amber-600',
  red: 'bg-red-600',
  gray: 'bg-gray-400',
  blue: 'bg-blue-600',
};

/** Small overlay badge on the icon circle — reinforces tone with a shape (check/triangle/x/dash), not color alone. */
const BADGE_ICON: Record<BadgeTone, LucideIcon> = {
  green: Check,
  amber: AlertTriangle,
  red: X,
  gray: Minus,
  blue: Check,
};

/** One of the four top-level Overview status cards (Website / Domain / SSL / Subscription). */
export function StatusCard({ label, status, icon: Icon, action }: Props) {
  const BadgeIcon = BADGE_ICON[status.tone];
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col">
      <div className="flex items-start gap-3">
        <span className="relative shrink-0">
          <span className={`flex h-11 w-11 items-center justify-center rounded-full ${ICON_CIRCLE_CLASSES[status.tone]}`}>
            <Icon size={20} aria-hidden="true" />
          </span>
          <span
            className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-white ${BADGE_CIRCLE_CLASSES[status.tone]}`}
          >
            <BadgeIcon size={10} className="text-white" strokeWidth={3} aria-hidden="true" />
          </span>
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 className="text-sm font-semibold text-gray-900">{label}</h2>
          <p className={`text-lg font-bold leading-tight ${VALUE_TEXT_CLASSES[status.tone]}`}>{status.label}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500 flex-1">{status.description}</p>
      {action &&
        (action.external ? (
          <a
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-(--color-brand) hover:underline"
          >
            {action.label}
            <ExternalLink size={12} aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : (
          <Link href={action.href} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-(--color-brand) hover:underline">
            {action.label}
            <ArrowRight size={12} aria-hidden="true" />
          </Link>
        ))}
    </div>
  );
}
