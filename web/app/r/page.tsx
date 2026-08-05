import { CampaignCodeForm } from './CampaignCodeForm';

export const dynamic = 'force-dynamic';

/**
 * Manual campaign-code entry (Stage 21) — for a postcard recipient who
 * can't scan the QR code. Coexists with `app/r/[campaignCode]/route.ts`
 * (the QR target itself) the same way `app/claim/page.tsx` already
 * coexists with `app/claim/[claimToken]/route.ts` — a static page and a
 * dynamic route under the same path segment, no conflict.
 *
 * Deliberately submits through `submitCampaignCodeAction`, which reuses
 * `resolveCampaignRedirect()` unchanged, rather than routing through
 * `/claim` — see `app/r/actions.ts`.
 */
export default function CampaignCodePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-(--color-border) p-8">
          <div className="mb-6 text-center">
            <span className="text-2xl font-bold text-(--color-brand)">Webpresa</span>
            <p className="text-sm text-gray-500 mt-1">Enter the code from your postcard</p>
          </div>
          <CampaignCodeForm />
        </div>
      </div>
    </div>
  );
}
