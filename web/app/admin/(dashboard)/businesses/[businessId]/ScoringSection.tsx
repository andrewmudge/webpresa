import Link from 'next/link';
import type { Business } from '@/domain/models/business';
import type { ScanEvent } from '@/domain/models/scan-event';
import { ASSESSMENT_CATEGORIES, QUALIFICATION_RESULTS, type AssessmentCategory } from '@/domain/models/website-assessment';
import { scoreWebsiteAction, overrideScoreAction, clearScoreOverrideAction } from './scoring-actions';

/**
 * Stage 15 (AI Prospect Qualification & Website Analysis) admin card.
 * Mirrors `EnrichmentSection`'s shape (plain server component, redirect +
 * query-param result banner) — see `scoring-actions.ts`.
 */

const CATEGORY_LABELS: Record<AssessmentCategory, string> = {
  mobileFriendliness: 'Mobile Friendliness',
  visualDesign: 'Visual Design',
  branding: 'Branding',
  professionalism: 'Professionalism',
  trust: 'Trust',
  callsToAction: 'Calls to Action',
  leadGeneration: 'Lead Generation',
  localSeo: 'Local SEO',
  serviceClarity: 'Service Clarity',
  contentQuality: 'Content Quality',
  accessibility: 'Accessibility',
  overallUserExperience: 'Overall User Experience',
};

const QUALIFICATION_LABELS: Record<string, string> = {
  qualified: 'Qualified',
  manual_review: 'Manual Review',
  reject: 'Reject',
};

const QUALIFICATION_TONE: Record<string, string> = {
  qualified: 'bg-green-50 text-green-700 border-green-200',
  manual_review: 'bg-amber-50 text-amber-700 border-amber-200',
  reject: 'bg-red-50 text-red-700 border-red-200',
};

const PRIORITY_LABELS: Record<string, string> = { high: 'High', medium: 'Medium', low: 'Low' };

const SCAN_STATUS_LABELS: Record<ScanEvent['status'], string> = {
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  partial: 'Partially completed',
  failed: 'Failed',
  manual_approval_required: 'Manual review',
};

interface Props {
  business: Business;
  scans: ScanEvent[]; // newest first, all providers
  resultQuery?: string;
  overrideQuery?: string;
}

export function ScoringSection({ business, scans, resultQuery, overrideQuery }: Props) {
  const scoringScans = scans.filter((s) => s.provider === 'openai' && s.operation === 'score');
  const latestScan = scoringScans[0];
  const activeScan = scoringScans.find((s) => s.status === 'queued' || s.status === 'running');
  const latestAssessedScan = scoringScans.find((s) => s.assessment);
  const assessment = latestAssessedScan?.assessment;

  const detailPageUrl = `/admin/businesses/${business.businessId}`;
  const hasOverride = business.adminReviewedScore !== undefined || business.adminReviewedQualification !== undefined;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Website Assessment</h3>
      </div>

      {resultQuery && <ResultBanner result={resultQuery} />}
      {overrideQuery && <OverrideBanner result={overrideQuery} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-gray-400">Website quality score</div>
          <div className="text-gray-900">
            {business.websiteQualityScore ?? '—'}
            {hasOverride && business.adminReviewedScore !== undefined && (
              <span className="ml-2 text-xs text-gray-400">(admin override: {business.adminReviewedScore})</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Lead priority</div>
          <div className="text-gray-900">{business.leadPriority ? PRIORITY_LABELS[business.leadPriority] : '—'}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Qualification</div>
          <div>
            {business.qualification ? (
              <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${QUALIFICATION_TONE[business.qualification]}`}>
                {QUALIFICATION_LABELS[business.qualification]}
              </span>
            ) : (
              <span className="text-gray-900">—</span>
            )}
            {hasOverride && business.adminReviewedQualification && (
              <span className="ml-2 text-xs text-gray-400">
                (admin override: {QUALIFICATION_LABELS[business.adminReviewedQualification]})
              </span>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Latest scan status</div>
          {latestScan ? (
            <Link href={`/admin/scans/${latestScan.scanId}`} className="text-(--color-brand) hover:underline">
              {SCAN_STATUS_LABELS[latestScan.status]} →
            </Link>
          ) : (
            <div className="text-gray-900">Never run</div>
          )}
        </div>
      </div>

      {assessment && (
        <div className="space-y-4 pt-2 border-t border-gray-100">
          <div>
            <div className="text-xs text-gray-400 mb-1">Confidence: {assessment.confidence}</div>
            <p className="text-sm text-gray-700">{assessment.executiveSummary}</p>
          </div>

          {assessment.topProblems.length > 0 && (
            <TextList title="Top problems" items={assessment.topProblems} />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            {ASSESSMENT_CATEGORIES.map((category) => (
              <CategoryRow key={category} label={CATEGORY_LABELS[category]} category={assessment.categories[category]} />
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {assessment.strengths.length > 0 && <TextList title="Strengths" items={assessment.strengths} />}
            {assessment.weaknesses.length > 0 && <TextList title="Weaknesses" items={assessment.weaknesses} />}
          </div>

          {assessment.missingOpportunities.length > 0 && (
            <TextList title="Missing opportunities" items={assessment.missingOpportunities} />
          )}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <form action={scoreWebsiteAction.bind(null, business.businessId)}>
          <button
            type="submit"
            disabled={!!activeScan}
            className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {activeScan ? 'Scoring in progress…' : latestScan ? 'Score again' : 'Score Website'}
          </button>
        </form>
      </div>

      <OverrideForm businessId={business.businessId} redirectTo={detailPageUrl} business={business} />
    </div>
  );
}

function CategoryRow({ label, category }: { label: string; category?: { score: number; explanation: string; suggestedImprovement: string } }) {
  if (!category) return null;
  const pct = Math.min(100, Math.max(0, category.score));
  return (
    <div className="py-1.5 border-b border-gray-50 last:border-0" title={`${category.explanation} Suggested improvement: ${category.suggestedImprovement}`}>
      <div className="flex justify-between mb-1">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-sm font-medium text-gray-800">{category.score}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-(--color-brand)" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TextList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-1">{title}</div>
      <ul className="text-sm text-gray-700 list-disc list-inside space-y-0.5">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function OverrideForm({ businessId, redirectTo, business }: { businessId: string; redirectTo: string; business: Business }) {
  return (
    <div className="pt-4 border-t border-gray-100">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Admin Override</h4>
      <p className="text-xs text-gray-400 mb-3">
        Overrides the score/qualification shown to the rest of the app without altering the original AI assessment.
      </p>
      <form action={overrideScoreAction.bind(null, businessId, redirectTo)} className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-gray-500">
          Score
          <input
            type="number"
            name="adminReviewedScore"
            min={0}
            max={100}
            defaultValue={business.adminReviewedScore ?? ''}
            className="block mt-1 w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Qualification
          <select
            name="adminReviewedQualification"
            defaultValue={business.adminReviewedQualification ?? ''}
            className="block mt-1 w-40 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          >
            <option value="">—</option>
            {QUALIFICATION_RESULTS.map((q) => (
              <option key={q} value={q}>
                {QUALIFICATION_LABELS[q]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
          Save Override
        </button>
      </form>
      {(business.adminReviewedScore !== undefined || business.adminReviewedQualification) && (
        <form action={clearScoreOverrideAction.bind(null, businessId, redirectTo)} className="mt-2">
          <button type="submit" className="text-xs text-gray-400 hover:text-gray-600 underline">
            Clear override
          </button>
        </form>
      )}
    </div>
  );
}

const RESULT_BANNER_COPY: Record<string, { tone: 'success' | 'warning' | 'error'; text: string }> = {
  completed: { tone: 'success', text: 'Scoring completed.' },
  manual_approval_required: { tone: 'warning', text: "The business's website could not be reached — flagged for manual review." },
  conflict: { tone: 'warning', text: 'A scoring attempt for this business is already queued or running.' },
  failed: { tone: 'error', text: 'The scoring attempt failed. See the failure details on the scan below.' },
  not_eligible: { tone: 'error', text: 'Run Firecrawl enrichment for this business before scoring.' },
};

function ResultBanner({ result }: { result: string }) {
  const copy = RESULT_BANNER_COPY[result];
  if (!copy) return null;
  return <div className={bannerClass(copy.tone)}>{copy.text}</div>;
}

const OVERRIDE_BANNER_COPY: Record<string, { tone: 'success' | 'warning' | 'error'; text: string }> = {
  saved: { tone: 'success', text: 'Admin override saved.' },
  cleared: { tone: 'success', text: 'Admin override cleared.' },
  invalid: { tone: 'error', text: 'Score must be a whole number between 0 and 100.' },
};

function OverrideBanner({ result }: { result: string }) {
  const copy = OVERRIDE_BANNER_COPY[result];
  if (!copy) return null;
  return <div className={bannerClass(copy.tone)}>{copy.text}</div>;
}

function bannerClass(tone: 'success' | 'warning' | 'error'): string {
  const toneClass =
    tone === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-red-200 bg-red-50 text-red-800';
  return `rounded-lg border px-4 py-3 text-sm ${toneClass}`;
}
