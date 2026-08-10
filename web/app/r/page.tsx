import Image from 'next/image';
import { ShieldCheck, Sparkles } from 'lucide-react';
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
 * vivid blue bottom, curved wave divider) rather than reusing the app's
 * shared `--color-page-gradient-*` linear-blend tokens used on
 * `/account/claim-status` etc. — deliberately a page-local palette (see
 * `ACCESS_BLUE`/`ACCESS_BLUE_LIGHT` below), not a shared design token.
 */

const ACCESS_BLUE_LIGHT = '#eef4fc';
const ACCESS_BLUE = '#0d3ad9';

export default function CampaignCodePage() {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: ACCESS_BLUE }}>
      {/* Top zone — near-white, faint watermark W's + dot texture */}
      <div className="relative" style={{ backgroundColor: ACCESS_BLUE_LIGHT }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `radial-gradient(circle, ${ACCESS_BLUE} 1px, transparent 1px)`,
            backgroundSize: '18px 18px',
            backgroundPosition: '0 0, 9px 9px',
            maskImage:
              'radial-gradient(ellipse 45% 60% at 8% 15%, black 0%, transparent 70%), radial-gradient(ellipse 45% 60% at 8% 85%, black 0%, transparent 70%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 45% 60% at 8% 15%, black 0%, transparent 70%), radial-gradient(ellipse 45% 60% at 8% 85%, black 0%, transparent 70%)',
          }}
        />
        <Image
          src="/webpresa_w.png"
          alt=""
          aria-hidden
          width={692}
          height={394}
          className="pointer-events-none absolute -left-16 top-24 h-72 w-72 select-none object-contain opacity-[0.05] sm:h-96 sm:w-96"
        />
        <Image
          src="/webpresa_w.png"
          alt=""
          aria-hidden
          width={692}
          height={394}
          className="pointer-events-none absolute -right-16 top-8 h-72 w-72 select-none object-contain opacity-[0.05] sm:h-96 sm:w-96"
        />

        <div className="relative mx-auto flex max-w-5xl items-center justify-between px-4 py-6 sm:px-6">
          <Image
            src="/webpresa_logo_horizontal_cropped_nobg.png"
            alt="Webpresa"
            width={1460}
            height={238}
            className="h-7 w-auto sm:h-8"
            priority
          />
          <div
            className="hidden items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur sm:flex"
            style={{ color: ACCESS_BLUE }}
          >
            <ShieldCheck size={14} />
            Secure. Private. Built for Small Business.
          </div>
        </div>

        <div className="relative mx-auto max-w-2xl px-4 pb-28 pt-6 text-center sm:px-6 sm:pb-36">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCESS_BLUE }}>
            Your new website is ready
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Let&apos;s get you access.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base text-gray-500 sm:text-lg">
            Enter the access code from your postcard to unlock your new website preview.
          </p>
        </div>

        {/* Wave divider between the light top zone and the solid blue bottom zone */}
        <svg
          aria-hidden
          className="absolute bottom-[-1px] left-0 h-24 w-full sm:h-32"
          viewBox="0 0 1440 200"
          preserveAspectRatio="none"
        >
          <path d="M0,120 C320,40 1120,190 1440,60 L1440,200 L0,200 Z" fill={ACCESS_BLUE} />
        </svg>
      </div>

      {/* Card — straddles the wave boundary via negative margin */}
      <div className="relative z-10 -mt-24 px-4 sm:-mt-28 sm:px-6">
        <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
          <CampaignCodeForm accentColor={ACCESS_BLUE} />
        </div>
      </div>

      {/* Bottom zone content — trust line + footer copy, on solid blue */}
      <div className="relative px-4 pb-14 pt-8 text-center sm:px-6">
        <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-white/90">
          <ShieldCheck size={16} />
          Your information is secure and never shared.
        </p>

        <div className="mx-auto mt-10 max-w-lg space-y-1.5">
          <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-white">
            <Sparkles size={16} />
            Built to help your business look amazing and get more customers.
          </p>
          <p className="text-xs text-white/70">Modern. Mobile friendly. Built to convert.</p>
        </div>
      </div>
    </div>
  );
}
