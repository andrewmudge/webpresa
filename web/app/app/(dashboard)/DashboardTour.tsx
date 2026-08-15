'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Joyride, EVENTS, type Step, type EventData } from 'react-joyride';

/**
 * Spotlight walkthrough of the 5 persistent sidebar nav items
 * (`data-tour-id` anchors added in `AppSidebar.tsx`). Triggered by a
 * `?tour=start` query param — set once by `completeTourAction` when a
 * customer finishes onboarding step 4, and reusable any time via the
 * sidebar's "Take a tour" link. Deliberately single-page/no-navigation
 * (targets only ever live in the sidebar, which persists across every
 * dashboard route) — see the onboarding-tour build plan for why a deeper
 * tour into the website editor's tabs was scoped out of this pass.
 *
 * `run` is derived directly from `searchParams` on every render — not
 * mirrored into local state via an effect (that was tried first and broke
 * "Take a tour" clicks: this component lives in the persistent dashboard
 * layout and never remounts between dashboard pages, so a `useState`
 * lazy-initializer only ever reads the URL once, on first page load, and
 * never reacts to a later same-page navigation that only changes the query
 * string). Deriving `run` straight from `searchParams` re-evaluates on every
 * navigation instead, including query-only ones, and needs no
 * `react-hooks/set-state-in-effect`-triggering effect to turn the tour on.
 * The param is only cleared at the end (`handleEvent`, an event-handler
 * callback — not an effect, so `router.replace` there is unproblematic).
 *
 * Onboarding-step completion (`completedSteps`/`tourCompletedAt`) is
 * recorded server-side before the redirect that carries this param — this
 * component is purely a client-side replay of the walkthrough UI, not a
 * source of truth for whether the tour was "completed".
 */
const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour-id="nav-overview"]',
    title: 'Your dashboard',
    content: 'This is your home base — a quick health check on your website and account.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="nav-website"]',
    title: 'Edit your website',
    content: 'Change your content, photos, theme, and more here.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="nav-leads"]',
    title: 'Leads',
    content: 'New customer inquiries from your website land here.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="nav-billing"]',
    title: 'Subscription',
    content: 'Manage your plan and billing details.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="nav-settings"]',
    title: 'Settings',
    content: 'Update your business info and account settings.',
    placement: 'right',
  },
];

export function DashboardTour() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const run = searchParams.get('tour') === 'start';

  function handleEvent(data: EventData) {
    if (data.type !== EVENTS.TOUR_END) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('tour');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <Joyride
      run={run}
      steps={TOUR_STEPS}
      continuous
      onEvent={handleEvent}
      options={{
        primaryColor: '#0D3AD9',
        showProgress: true,
        buttons: ['back', 'primary', 'skip'],
        skipBeacon: true,
      }}
    />
  );
}
