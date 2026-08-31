import type { Industry } from '@/domain/constants/industries';
import type { PostcardTemplateVariant } from '@/domain/models/postcard';
import type { BusinessStatus } from '@/domain/models/business';

/**
 * Stage 29 — Admin Analytics Dashboard. Client-safe types/constants only
 * (no `server-only` import) — mirrors `lib/operations/needs-attention-types.ts`'s
 * split so `PostcardPerformanceTable.tsx` ('use client') can import shapes
 * from here without transitively pulling in any DynamoDB access.
 */

export const DATE_RANGE_PRESETS = ['7d', '30d', '90d', 'ytd', 'all', 'custom'] as const;
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  ytd: 'Year to date',
  all: 'All time',
  custom: 'Custom range',
};

/** Minimum postcard sends required before a template can be declared the "best performer" — see `pickBestPerformingTemplate`. */
export const MIN_TEMPLATE_SAMPLE_SIZE = 25;

export interface AnalyticsFilters {
  datePreset: DateRangePreset;
  /** YYYY-MM-DD — only meaningful when `datePreset === 'custom'`. */
  customFrom?: string;
  customTo?: string;
  industry?: Industry;
  templateVariant?: PostcardTemplateVariant;
  campaignId?: string;
}

export interface ResolvedDateWindow {
  /** ISO 8601, inclusive. */
  start: string;
  /** ISO 8601, exclusive. */
  end: string;
  /** Present only when `comparisonAvailable` is true. */
  previousStart?: string;
  previousEnd?: string;
  /** False for `ytd`/`all` — no misleading prior-period comparison is computed for those. */
  comparisonAvailable: boolean;
}

/** A KPI's current value plus its prior-period comparison — `previous`/`changePct` are `null`, never `NaN`/`Infinity`, whenever a comparison isn't available or well-defined. */
export interface KpiValue {
  current: number | null;
  previous: number | null;
  changePct: number | null;
}

export type FunnelStageKey = 'sent' | 'engaged' | 'claimed' | 'signedUp' | 'paid';

export interface FunnelStage {
  key: FunnelStageKey;
  label: string;
  count: number;
  /** Conversion from the previous stage — `null` on a zero-count previous stage, never `Infinity`. */
  conversionFromPrevious: number | null;
}

export interface FunnelResult {
  stages: FunnelStage[];
  overallConversion: number | null;
  /** Number of postcards in the cohort (== the "sent" stage's count). */
  cohortSize: number;
}

export interface TemplatePerformanceRow {
  templateVariant: PostcardTemplateVariant;
  sent: number;
  engaged: number;
  engagementRate: number | null;
  claimed: number;
  claimRate: number | null;
  paidCustomers: number;
  paidConversion: number | null;
  /** Monthly-normalized MRR attributed to this template's paid customers — labeled "MRR Attributed" in the UI, never lifetime revenue. */
  revenueAttributedCents: number;
}

export type BestTemplateResult =
  | { status: 'insufficient_data' }
  | { status: 'ok'; row: TemplatePerformanceRow; sampleSize: number };

export interface MrrTrendPoint {
  /** e.g. "Aug 2026". */
  monthLabel: string;
  /** ISO 8601 — the instant this point's MRR was reconstructed as of. */
  monthEnd: string;
  mrrCents: number;
}

export interface RevenueSummary {
  currentMrrCents: number;
  arrCents: number;
  newMrrCents: number;
  churnedMrrCents: number;
  netNewMrrCents: number;
  trend: MrrTrendPoint[];
}

export type SubscriberMixResult =
  | { status: 'empty' }
  | { status: 'ok'; monthlyCount: number; annualCount: number; monthlyPct: number; annualPct: number };

export interface CustomerHealthResult {
  activeCustomers: number;
  newCustomers: number;
  canceledCustomers: number;
  netGrowth: number;
  churnRate: number | null;
}

/**
 * Always this exact shape today — Webpresa does not capture cancellation
 * reasons (no Stripe `cancellation_details` handling, no survey, no
 * `Business` field). See `lib/analytics/attribution.ts`'s
 * `getCancellationReasons()` doc comment for how to add real capture later.
 */
export interface CancellationReasonsResult {
  collected: false;
  breakdown: [];
}

export interface AnalyticsFilterOptions {
  industries: Industry[];
  templates: PostcardTemplateVariant[];
  campaigns: { campaignId: string; name: string }[];
}

/**
 * Postcard map card — most-advanced-funnel-stage-wins color: cancelled (red)
 * beats customer (green) beats engaged/claimed (purple) beats a postcard
 * that's only reached `mailed`/`delivered` so far (blue). See
 * `computeMapPins` (`lib/analytics/map-pins.ts`) for the exact derivation.
 */
export type PostcardPinColor = 'blue' | 'purple' | 'green' | 'red';

export interface PostcardMapPin {
  businessId: string;
  name: string;
  industry: Industry;
  /** ZIP-centroid approximation (`lib/geo/zip-centroid.ts`), not a street-level geocode. */
  latitude: number;
  longitude: number;
  color: PostcardPinColor;
  businessStatus: BusinessStatus;
}

export interface AnalyticsDashboardViewModel {
  window: ResolvedDateWindow;
  filterOptions: AnalyticsFilterOptions;
  kpis: {
    activeCustomers: KpiValue;
    mrrCents: KpiValue;
    arrCents: KpiValue;
    newPaidCustomers: KpiValue;
    churnRate: KpiValue;
    postcardToPaidConversion: KpiValue;
  };
  funnel: FunnelResult;
  postcardPerformance: TemplatePerformanceRow[];
  bestTemplate: BestTemplateResult;
  revenue: RevenueSummary;
  subscriberMix: SubscriberMixResult;
  customerHealth: CustomerHealthResult;
  cancellationReasons: CancellationReasonsResult;
  mapPins: PostcardMapPin[];
}
