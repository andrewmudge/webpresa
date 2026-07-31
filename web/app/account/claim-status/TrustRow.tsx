import type { LucideIcon } from 'lucide-react';

export interface TrustRowItem {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

/**
 * Small three-up icon/title/subtitle row — reused for both the
 * checkout-trust row (Secure checkout / No setup fees / Cancel anytime) and
 * the page-footer value-reinforcement row (already built / go live in
 * minutes / edit anytime). Pure presentation, no plan/business knowledge.
 */
export function TrustRow({ items }: { items: TrustRowItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
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
