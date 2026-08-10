import { AccessPageShell } from '@/components/access/AccessPageShell';
import { ACCESS_BLUE } from '@/components/access/theme';
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
 *
 * Redesigned 2026-08-09 to a dedicated two-tone hero (near-white top,
 * vivid blue bottom, curved wave divider). The shell itself was extracted
 * into `components/access/AccessPageShell.tsx` on 2026-08-10 so
 * `/claim/continue` (the very next page in this flow) could reuse it
 * exactly rather than duplicating the markup.
 */
export default function CampaignCodePage() {
  return (
    <AccessPageShell
      eyebrow="Your new website is ready"
      headline="Let&rsquo;s get you access."
      subtext="Enter the access code from your postcard to unlock your new website preview."
    >
      <CampaignCodeForm accentColor={ACCESS_BLUE} />
    </AccessPageShell>
  );
}
