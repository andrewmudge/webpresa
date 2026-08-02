import Link from 'next/link';
import { ExternalLink, ArrowRight } from 'lucide-react';
import { Badge } from './FormBits';
import type { DescribedStatus } from './overview-status';

interface Props {
  label: string;
  status: DescribedStatus;
  action?: { label: string; href: string; external?: boolean };
}

/** One of the four top-level Overview status cards (Website / Domain / SSL / Subscription). */
export function StatusCard({ label, status, action }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col">
      <h2 className="text-sm font-semibold text-gray-900">{label}</h2>
      <div className="mt-2">
        <Badge tone={status.tone}>{status.label}</Badge>
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
