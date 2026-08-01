import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatusChecklistItem {
  label: string;
  done: boolean;
}

/**
 * Publish step's launch checklist. Every item's `done` value comes from the
 * page's own already-fetched real state (business contact info, active
 * subscription, domain status, preview existence) — never a fabricated
 * checkmark. Done/pending is distinguished by icon shape as well as color,
 * not color alone.
 */
export function StatusChecklist({ items }: { items: StatusChecklistItem[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2.5 text-sm">
          <span
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
              item.done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400',
            )}
            aria-hidden="true"
          >
            {item.done ? <Check size={12} strokeWidth={3} /> : <Circle size={7} className="fill-current" />}
          </span>
          <span className={item.done ? 'text-gray-900' : 'text-gray-500'}>
            {item.label}
            <span className="sr-only">{item.done ? ' — done' : ' — pending'}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
