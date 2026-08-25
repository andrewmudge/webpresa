import { describe, it, expect } from 'vitest';
import { resolveProgressLabel } from '../progress-labels';

describe('resolveProgressLabel', () => {
  it('starts at the first stage when currentStep is undefined (still queued)', () => {
    expect(resolveProgressLabel(undefined, true)).toEqual({
      label: 'Business information received',
      position: 1,
      totalSteps: 6,
    });
    expect(resolveProgressLabel(undefined, false)).toEqual({
      label: 'Business information received',
      position: 1,
      totalSteps: 6,
    });
  });

  it('advances through the has-website branch', () => {
    expect(resolveProgressLabel('crawling', true).label).toBe('Analyzing your current website');
    expect(resolveProgressLabel('scoring', true).label).toBe('Reviewing your services');
    expect(resolveProgressLabel('generating_preview', true).label).toBe('Writing your website');
    expect(resolveProgressLabel('finalizing', true).label).toBe('Publishing your website');
  });

  it('advances through the no-website branch, never surfacing a has-website-only step', () => {
    expect(resolveProgressLabel('recording_no_website', false).label).toBe('Reviewing your services');
    expect(resolveProgressLabel('generating_preview', false).label).toBe('Writing your website');
    expect(resolveProgressLabel('capturing_preview_screenshots', false).label).toBe('Preparing your photos');
    expect(resolveProgressLabel('finalizing', false).label).toBe('Publishing your website');
  });

  it('never returns a position beyond totalSteps', () => {
    for (const step of ['finalizing', 'queueing_manual_review', 'capturing_preview_screenshots'] as const) {
      const has = resolveProgressLabel(step, true);
      const no = resolveProgressLabel(step, false);
      expect(has.position).toBeLessThanOrEqual(has.totalSteps);
      expect(no.position).toBeLessThanOrEqual(no.totalSteps);
    }
  });
});
