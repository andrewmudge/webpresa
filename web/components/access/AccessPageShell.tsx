import Image from 'next/image';
import type { ReactNode } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { ACCESS_BLUE, ACCESS_BLUE_LIGHT } from './theme';

interface AccessPageShellProps {
  eyebrow: string;
  headline: string;
  subtext: ReactNode;
  children: ReactNode;
  /** Tailwind max-width class for the floating card. Defaults to `/r`'s size. */
  cardMaxWidth?: string;
}

/**
 * Shared two-tone shell for the postcard-access flow — near-white top zone
 * (watermarks, header, hero copy), a curved wave into a solid vivid-blue
 * bottom zone, and a white card straddling the boundary. Introduced when
 * `/claim/continue` (the account-creation page reached right after `/r`)
 * was redesigned to match `/r`'s look "as close as possible" — extracted
 * here rather than duplicated a second time. Any third page joining this
 * flow should use this too rather than re-copying the markup again.
 */
export function AccessPageShell({ eyebrow, headline, subtext, children, cardMaxWidth = 'max-w-md' }: AccessPageShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: ACCESS_BLUE }}>
      {/* Top zone — near-white, faint watermark W's + dot texture.
          `overflow-hidden` is load-bearing: the watermark images are sized/
          positioned to look right on the tallest hero copy (`/claim/continue`),
          but on shorter hero copy (e.g. `/account/sign-in`) this box is
          shorter and, without clipping, their absolutely-positioned tail
          bleeds past this box's own bottom edge into the blue zone below —
          which has no opaque background of its own to cover it (see
          2026-08-10 bugfix). */}
      <div className="relative overflow-hidden" style={{ backgroundColor: ACCESS_BLUE_LIGHT }}>
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
            {eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">{headline}</h1>
          <p className="mx-auto mt-4 max-w-md text-base text-gray-500 sm:text-lg">{subtext}</p>
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
        <div className={`mx-auto w-full ${cardMaxWidth} rounded-3xl bg-white p-8 shadow-xl`}>{children}</div>
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
