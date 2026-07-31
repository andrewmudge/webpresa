'use client';

import { useState } from 'react';
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

const SELECTED_CARD = 'rounded-2xl p-5 border-2 border-(--color-brand) bg-(--color-brand-muted) shadow-md transition-colors';
const UNSELECTED_CARD = 'rounded-2xl p-5 border border-gray-200 bg-white hover:border-gray-300 transition-colors';

/**
 * The no-connection-yet Domain-step choice UI (implementation.md, Stage
 * 19.x, Part 1/2). "Use my Webpresa address for now" is the default
 * selection and sits first — it's the choice most customers will actually
 * make in this stage, since real domain purchase (Part 3) doesn't exist
 * yet. "Use a domain I already own" starts collapsed (title + one-line
 * subtitle only) and expands inline once selected, rather than always
 * showing its input fields.
 */
export function DomainChoiceCards({ businessId }: { businessId: string }) {
  const [selected, setSelected] = useState<'webpresa' | 'existing'>('webpresa');

  return (
    <div className="space-y-3">
      <div className={selected === 'webpresa' ? SELECTED_CARD : UNSELECTED_CARD}>
        <button
          type="button"
          onClick={() => setSelected('webpresa')}
          disabled={selected === 'webpresa'}
          className="w-full text-left disabled:cursor-default"
        >
          <h2 className={`text-base font-bold ${selected === 'webpresa' ? 'text-gray-900' : 'text-gray-500'}`}>
            Use my Webpresa address for now
          </h2>
        </button>
        {selected === 'webpresa' && (
          <>
            <p className="mt-1 text-sm text-gray-700">
              Keep using your Webpresa website address. You can connect a domain anytime from your dashboard.
            </p>
            <form action={deferDomainAction.bind(null, businessId)} className="mt-3">
              <button
                type="submit"
                className="rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
              >
                Continue
              </button>
            </form>
          </>
        )}
      </div>

      <div className={selected === 'existing' ? SELECTED_CARD : UNSELECTED_CARD}>
        <button
          type="button"
          onClick={() => setSelected('existing')}
          disabled={selected === 'existing'}
          className="w-full text-left disabled:cursor-default"
        >
          <h2 className={`text-base font-bold ${selected === 'existing' ? 'text-gray-900' : 'text-gray-500'}`}>
            Use a domain I already own
          </h2>
          <p className={`mt-1 text-xs ${selected === 'existing' ? 'text-gray-700' : 'text-gray-500'}`}>
            Connect a website address from GoDaddy, Wix, Squarespace, or another provider.
          </p>
        </button>
        {selected === 'existing' && (
          <form action={connectExistingDomainAction.bind(null, businessId)} className="mt-3 space-y-3">
            <input
              type="text"
              name="domain"
              placeholder="coastalplumbing.com"
              required
              className="w-full rounded-lg border border-(--color-border) px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
            />
            <select
              name="registrarProvider"
              defaultValue=""
              className="w-full rounded-lg border border-(--color-border) px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Where do you manage this domain? (optional)</option>
              {REGISTRAR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
            >
              Connect this domain
            </button>
          </form>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 opacity-60">
        <h2 className="text-sm font-semibold text-gray-900">Buy a new domain</h2>
        <p className="mt-1 text-xs text-gray-500">Coming soon — search for and purchase a website address.</p>
      </div>
    </div>
  );
}
