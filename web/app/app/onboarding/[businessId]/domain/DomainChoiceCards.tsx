'use client';

import { useState } from 'react';
import { Globe, Link2, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { deferDomainAction, connectExistingDomainAction, startDomainPurchaseAction } from '../actions';

const GENERIC_PURCHASE_ERROR = 'Unable to open the domain store right now. Please try again.';

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
 * 19.x, Part 1/2/3). "Use my Webpresa address for now" is the default
 * selection and sits first — it's the choice most customers will actually
 * make in this stage. "Use a domain I already own" and "Buy a new domain"
 * both start collapsed (title + one-line subtitle only) and expand inline
 * once selected, rather than always showing their input fields/actions.
 * "Buy a new domain" hands off to OpenSRS Storefront (see
 * `startDomainPurchaseAction`) in a **new tab**, behind a deliberate
 * confirm step — clicking "Search for a domain" only shows a notice
 * explaining what's about to happen; the tab doesn't open until "Continue"
 * (a second, separate click). `window.open('', '_blank')` runs
 * synchronously inside *that* click handler, before the action's `await` —
 * the standard pattern for surviving popup blockers — then navigates to the
 * real SSO URL once the action resolves. This keeps the original Webpresa
 * tab in place rather than navigating it away entirely (there's no way back
 * from Storefront otherwise — confirmed no return-URL mechanism exists,
 * though a Storefront-side Custom Code footer link now provides one too).
 * The parent (`DomainStepPanel`) swaps this card out for a waiting view via
 * `onPurchaseStarted` the moment the tab opens successfully.
 *
 * Also reused, unmodified apart from its two overridable action props, by
 * Settings' post-onboarding "change domain" flow (`SettingsDomainPanel`) —
 * `startDomainPurchaseAction` needs no override since it already returns a
 * result instead of redirecting.
 */
export function DomainChoiceCards({
  businessId,
  displayUrl,
  onPurchaseStarted,
  deferAction = deferDomainAction,
  connectExistingAction = connectExistingDomainAction,
}: {
  businessId: string;
  displayUrl: string;
  onPurchaseStarted: () => void;
  /** Overridable so Settings' post-onboarding "change domain" flow can redirect back to Settings instead of the onboarding wizard — see `SettingsDomainPanel`. */
  deferAction?: (businessId: string) => Promise<void>;
  connectExistingAction?: (businessId: string, formData: FormData) => Promise<void>;
}) {
  const [selected, setSelected] = useState<'webpresa' | 'existing' | 'buy'>('webpresa');
  const [confirming, setConfirming] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  // Deliberately two clicks, not one — "Search for a domain" only shows the
  // notice below; opening the tab happens on the *next*, separate click
  // ("Continue"). Each is its own genuine user gesture, so `window.open`
  // inside handleBuyDomain (triggered by Continue) stays popup-blocker-safe
  // exactly like the original single-click version did.
  async function handleBuyDomain() {
    setBuyError(null);
    setBuying(true);
    // Must be the first thing that happens — a `window.open` after any
    // `await` is treated as not directly triggered by the click and gets
    // silently blocked by most browsers' popup blockers.
    const popup = window.open('', '_blank');
    try {
      const result = await startDomainPurchaseAction(businessId);
      if (result.outcome === 'redirect') {
        if (popup) popup.location.href = result.url;
        onPurchaseStarted();
        return;
      }
      popup?.close();
      setBuyError(result.message);
      setConfirming(false);
    } catch {
      popup?.close();
      setBuyError(GENERIC_PURCHASE_ERROR);
      setConfirming(false);
    } finally {
      setBuying(false);
    }
  }

  return (
    <div className="space-y-3">
      <ChoiceCard
        selected={selected === 'webpresa'}
        onSelect={() => setSelected('webpresa')}
        icon={<Globe size={18} />}
        title="Use my Webpresa address for now"
        subtitle="Your website will be published at your Webpresa address. Connect a custom domain anytime later."
      >
        <div className="space-y-3">
          <p className="truncate rounded-lg border border-(--color-border) bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">
            {displayUrl}
          </p>
          <form action={deferAction.bind(null, businessId)}>
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
        <form action={connectExistingAction.bind(null, businessId)} className="space-y-3">
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

      <ChoiceCard
        selected={selected === 'buy'}
        onSelect={() => setSelected('buy')}
        icon={<ShoppingCart size={18} />}
        title="Buy a new domain"
        subtitle="Search for and purchase the perfect domain for your business."
      >
        <div>
          <p className="mb-3 text-xs text-gray-500">
            You&apos;ll search for and buy your domain through our domain store, opened in a new tab and signed in
            automatically — no separate account to create. It&apos;s connected to your website automatically once
            purchased.
          </p>
          {buyError && (
            <p role="alert" className="mb-3 text-xs text-red-700">
              {buyError}
            </p>
          )}
          {confirming ? (
            <div className="space-y-3">
              <p className="rounded-lg bg-(--color-brand-muted) px-3 py-2 text-xs text-(--color-brand)">
                You&apos;ll be directed to Webpresa&apos;s domain store in a new tab. After purchasing your domain,
                you can return to this page — it&apos;ll update automatically once your domain is connected.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleBuyDomain}
                  disabled={buying}
                  className="rounded-lg bg-(--color-brand) px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-(--color-brand-dark) disabled:opacity-50"
                >
                  {buying ? 'Opening…' : 'Continue'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={buying}
                  className="rounded-lg border border-(--color-border) bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-lg bg-(--color-brand) px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-(--color-brand-dark)"
            >
              Search for a domain
            </button>
          )}
        </div>
      </ChoiceCard>
    </div>
  );
}
