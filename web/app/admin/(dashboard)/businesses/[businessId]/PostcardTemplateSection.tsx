import type { Business } from '@/domain/models/business';
import { POSTCARD_TEMPLATE_VARIANTS, type PostcardTemplateVariant } from '@/domain/models/postcard';
import { resolvePostcardTemplateVariant } from '@/lib/postcards/template';
import { overridePostcardTemplateAction, clearPostcardTemplateOverrideAction } from './postcard-template-actions';

/**
 * Stage 26 — lets an admin pin a business to a specific postcard front
 * template, overriding the automatic `has_website`/`no_website` choice
 * (`resolvePostcardTemplateVariant`). Mirrors `ScoringSection.tsx`'s
 * `OverrideForm`/`OverrideBanner` shape. Foundation for future per-business
 * A/B testing of template conversion — no generic experiment framework
 * exists in this codebase yet, so this is a durable per-business field, not
 * a variant assignment system.
 */

const TEMPLATE_LABELS: Record<PostcardTemplateVariant, string> = {
  has_website: 'Has website (before/after comparison)',
  no_website: 'No website',
};

interface Props {
  business: Business;
  overrideQuery?: string;
}

export function PostcardTemplateSection({ business, overrideQuery }: Props) {
  const detailPageUrl = `/admin/businesses/${business.businessId}`;
  const computedDefault = resolvePostcardTemplateVariant({ websiteUrl: business.websiteUrl, adminPostcardTemplateOverride: undefined });
  const hasOverride = business.adminPostcardTemplateOverride !== undefined;
  const effective = hasOverride ? business.adminPostcardTemplateOverride! : computedDefault;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Postcard Template</h3>

      {overrideQuery && <OverrideBanner result={overrideQuery} />}

      <div className="text-sm">
        <div className="text-xs text-gray-400">Template in use</div>
        <div className="text-gray-900">
          {TEMPLATE_LABELS[effective]}
          {hasOverride && <span className="ml-2 text-xs text-gray-400">(admin override — automatic would be {TEMPLATE_LABELS[computedDefault]})</span>}
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100">
        <form action={overridePostcardTemplateAction.bind(null, business.businessId, detailPageUrl)} className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-gray-500">
            Override
            <select
              name="adminPostcardTemplateOverride"
              defaultValue={business.adminPostcardTemplateOverride ?? ''}
              className="block mt-1 w-64 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            >
              <option value="" disabled>
                Choose a template…
              </option>
              {POSTCARD_TEMPLATE_VARIANTS.map((variant) => (
                <option key={variant} value={variant}>
                  {TEMPLATE_LABELS[variant]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
            Save Override
          </button>
        </form>
        {hasOverride && (
          <form action={clearPostcardTemplateOverrideAction.bind(null, business.businessId, detailPageUrl)} className="mt-2">
            <button type="submit" className="text-xs text-gray-400 hover:text-gray-600 underline">
              Revert to automatic
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const OVERRIDE_BANNER_COPY: Record<string, { tone: 'success' | 'error'; text: string }> = {
  saved: { tone: 'success', text: 'Postcard template override saved.' },
  cleared: { tone: 'success', text: 'Postcard template override cleared.' },
  invalid: { tone: 'error', text: 'Choose a valid template.' },
};

function OverrideBanner({ result }: { result: string }) {
  const copy = OVERRIDE_BANNER_COPY[result];
  if (!copy) return null;
  const toneClass = copy.tone === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800';
  return <div className={`rounded-lg border px-4 py-3 text-sm ${toneClass}`}>{copy.text}</div>;
}
