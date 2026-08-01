'use client';

import { useState } from 'react';
import { Globe, Link2, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { deferDomainAction, connectExistingDomainAction } from '../actions';

const REGISTRAR_OPTIONS = [
  { value: 'godaddy', label: 'GoDaddy' },
  { value: 'wix', label: 'Wix' },
  { value: 'squarespace', label: 'Squarespace' },
  { value: 'namecheap', label: 'Namecheap' },
  { value: 'cloudflare', label: 'Cloudflare' },
  { value: 'hostinger', label: 'Hostinger' },
  { value: 'network_solutions', label: 'Network Solutions' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: "I'm not sure" },
] as const;

function ChoiceCard({
  selected,
  onSelect,
  icon,
  title,
  badge,
  subtitle,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-5 shadow-sm transition-colors',
        selected ? 'border-(--color-brand) bg-white ring-2 ring-(--color-brand)/15' : 'border-(--color-border) bg-white hover:border-(--color-brand)/40',
      )}
    >
      <button type="button" onClick={onSelect} disabled={selected} className="flex w-full items-start gap-3 text-left disabled:cursor-default">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            selected ? 'bg-(--color-brand) text-white' : 'bg-(--color-brand-muted) text-(--color-brand)',
          )}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-gray-900">{title}</span>
            {badge && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">{badge}</span>
            )}
          </span>
          <span className="mt-0.5 block text-sm text-gray-500">{subtitle}</span>
        </span>
      </button>
      {selected && children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/**
 * The no-connection-yet Domain-step choice UI (implementation.md, Stage
 * 19.x, Part 1/2). "Use my Webpresa address for now" is the default
 * selection and sits first — it's the choice most customers will actually
 * make in this stage, since real domain purchase (Part 3) doesn't exist
 * yet. "Use a domain I already own" starts collapsed (title + one-line
 * subtitle only) and expands inline once selected, rather than always
 * showing its input fields.
 */
export function DomainChoiceCards({ businessId, displayUrl }: { businessId: string; displayUrl: string }) {
  const [selected, setSelected] = useState<'webpresa' | 'existing'>('webpresa');

  return (
    <div className="space-y-3">
      <ChoiceCard
        selected={selected === 'webpresa'}
        onSelect={() => setSelected('webpresa')}
        icon={<Globe size={18} />}
        title="Use my Webpresa address for now"
        badge="Recommended"
        subtitle="Your website will be published at your Webpresa address. Connect a custom domain anytime later."
      >
        <div className="space-y-3">
          <p className="truncate rounded-lg border border-(--color-border) bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">
            {displayUrl}
          </p>
          <form action={deferDomainAction.bind(null, businessId)}>
            <button
              type="submit"
              className="rounded-lg bg-(--color-brand) px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-(--color-brand-dark)"
            >
              Continue
            </button>
          </form>
        </div>
      </ChoiceCard>

      <ChoiceCard
        selected={selected === 'existing'}
        onSelect={() => setSelected('existing')}
        icon={<Link2 size={18} />}
        title="Use a domain I already own"
        subtitle="Connect a website address from GoDaddy, Wix, Squarespace, or another provider."
      >
        <form action={connectExistingDomainAction.bind(null, businessId)} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Your domain</span>
            <input
              type="text"
              name="domain"
              placeholder="coastalplumbing.com"
              required
              autoComplete="off"
              className="w-full rounded-lg border border-(--color-border) px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Where you manage this domain (optional)</span>
            <select
              name="registrarProvider"
              defaultValue=""
              className="w-full rounded-lg border border-(--color-border) px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Select a provider</option>
              {REGISTRAR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-(--color-brand) px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-(--color-brand-dark)"
          >
            Connect this domain
          </button>
        </form>
      </ChoiceCard>

      <div className="flex items-start gap-3 rounded-2xl border border-(--color-border) bg-white p-5 opacity-60">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
          <ShoppingCart size={18} />
        </span>
        <span>
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-gray-900">Buy a new domain</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Coming soon</span>
          </span>
          <span className="mt-0.5 block text-sm text-gray-500">Search for and purchase the perfect domain for your business.</span>
        </span>
      </div>
    </div>
  );
}
