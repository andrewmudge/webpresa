import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TrustRowItem {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

const COLUMN_CLASSES = {
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
} as const;

/**
 * Small icon/title/subtitle row shared across `/account/claim-status` and
 * the checkout-success page — the checkout-trust row (Secure checkout / No
 * setup fees / Cancel anytime), the claim-status footer value row (already
 * built / go live in minutes / edit anytime), and the success page's
 * 4-up "what just happened" row (website activated / SSL / hosting /
 * dashboard unlocked). Pure presentation, no plan/business knowledge.
 */
export function TrustRow({ items, columns = 3 }: { items: TrustRowItem[]; columns?: 3 | 4 }) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:gap-6', COLUMN_CLASSES[columns])}>
      {items.map(({ icon: Icon, title, subtitle }) => (
        <div key={title} className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--color-brand-muted) text-(--color-brand)">
            <Icon size={16} strokeWidth={2.25} />
          </span>
          <span>
            <span className="block text-sm font-medium text-gray-900">{title}</span>
            <span className="block text-xs text-gray-500">{subtitle}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
