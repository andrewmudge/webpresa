import type { ScanEvent } from '@/domain/models/scan-event';

/**
 * What a scan admin views need to identify a `ScanEvent` by *kind*, distinct
 * from its `status`. `provider` + `operation` fully identify the scan type;
 * `targetType` further disambiguates a Playwright screenshot into which URL
 * it captured.
 */
export type ScanTypeInput = Pick<ScanEvent, 'provider' | 'operation' | 'targetType'>;

interface ScanTypeMeta {
  label: string;
  colorClass: string;
}

// Keyed by `${provider}:${operation}` — see ScanEvent's provider/operation
// enums (domain/models/scan-event.ts) for the full set of valid pairs.
const SCAN_TYPE_META: Record<string, ScanTypeMeta> = {
  'firecrawl:scrape': { label: 'Website Enrichment', colorClass: 'bg-blue-50 text-blue-700' },
  'openai:score': { label: 'AI Scoring', colorClass: 'bg-emerald-50 text-emerald-700' },
  'playwright:screenshot': { label: 'Screenshot', colorClass: 'bg-purple-50 text-purple-700' },
};

const TARGET_TYPE_SUFFIX: Record<NonNullable<ScanTypeInput['targetType']>, string> = {
  existing_site: 'Existing Site',
  generated_preview: 'Generated Preview',
};

function getScanTypeMeta(scan: ScanTypeInput): ScanTypeMeta {
  return (
    SCAN_TYPE_META[`${scan.provider}:${scan.operation}`] ?? {
      label: `${scan.provider} · ${scan.operation}`,
      colorClass: 'bg-gray-50 text-gray-600',
    }
  );
}

/** Human-readable scan-type label, e.g. "Screenshot — Existing Site". */
export function getScanTypeLabel(scan: ScanTypeInput): string {
  const { label } = getScanTypeMeta(scan);
  if (scan.provider === 'playwright' && scan.targetType) {
    return `${label} — ${TARGET_TYPE_SUFFIX[scan.targetType]}`;
  }
  return label;
}

/** Tailwind background/text color classes for badging a scan's type. */
export function getScanTypeColorClass(scan: ScanTypeInput): string {
  return getScanTypeMeta(scan).colorClass;
}
