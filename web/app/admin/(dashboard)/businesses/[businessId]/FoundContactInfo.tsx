import type { Business } from '@/domain/models/business';
import type { WebsiteEnrichmentSnapshot } from '@/domain/models/website-enrichment';
import { applyFoundContactFieldAction } from './enrichment-actions';

const CONTACT_APPROVAL_MESSAGES: Record<string, string> = {
  phone: 'Phone number applied to the business.',
  email: 'Email address applied to the business.',
  address: 'Address applied to the business.',
  not_found: 'Could not apply that value.',
};

/**
 * Surfaces phone/email/address Firecrawl found on the business's own
 * website (from its most recent completed scan) next to the Business
 * Details card, with an explicit "Apply" action per field — the found
 * values already fill gaps in the *generated preview* automatically (see
 * `lib/firecrawl/generation-context.ts`) when Business is blank, but only
 * this deliberate admin click ever writes them onto the canonical Business
 * record itself.
 */
export function FoundContactInfo({
  businessId,
  business,
  snapshot,
  redirectTo,
  contactApproval,
}: {
  businessId: string;
  business: Business;
  snapshot: WebsiteEnrichmentSnapshot | null;
  redirectTo: string;
  contactApproval?: string;
}) {
  if (!snapshot) return null;

  const foundPhone = snapshot.contact.phones[0];
  const foundEmail = snapshot.contact.emails[0];
  const foundAddress = snapshot.contact.addresses[0];

  const fields: { field: 'phone' | 'email' | 'address'; label: string; found: string | undefined; current: string | undefined }[] = [
    { field: 'phone', label: 'Phone', found: foundPhone, current: business.phone },
    { field: 'email', label: 'Email', found: foundEmail, current: business.email },
    {
      field: 'address',
      label: 'Address',
      found: foundAddress,
      current: business.address
        ? [business.address.line1, business.address.city, business.address.state, business.address.postalCode]
            .filter(Boolean)
            .join(', ')
        : undefined,
    },
  ];

  const applicable = fields.filter((f) => f.found && f.found !== f.current);
  if (applicable.length === 0) return null;

  return (
    <div className="mt-5 pt-5 border-t border-gray-100">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Contact info found on website</h3>
      <p className="text-xs text-gray-400 mb-3">
        Found by Firecrawl during enrichment. Already used to fill in the generated preview where these fields were blank — apply one
        here to also save it directly on this business.
      </p>
      {contactApproval && (
        <p className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
          {CONTACT_APPROVAL_MESSAGES[contactApproval] ?? 'Applied.'}
        </p>
      )}
      <div className="space-y-2">
        {applicable.map(({ field, label, found, current }) => (
          <div key={field} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2">
            <div className="text-sm">
              <span className="text-gray-400">{label}:</span> <span className="text-gray-900">{found}</span>
              {current && <span className="ml-2 text-xs text-amber-600">(currently: {current})</span>}
            </div>
            <form action={applyFoundContactFieldAction.bind(null, businessId, field, found!, redirectTo)}>
              <button
                type="submit"
                className="shrink-0 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {current ? 'Overwrite' : 'Apply'}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
