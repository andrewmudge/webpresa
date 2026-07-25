import { describe, it, expect } from 'vitest';
import { SCAN_WORKFLOW_STATUSES } from '@/domain/models/scan-execution';
import { SCAN_WORKFLOW_STATUS_LABELS, SCAN_WORKFLOW_STATUS_TONE, isActiveWorkflowStatus } from '../labels';

describe('SCAN_WORKFLOW_STATUS_LABELS / SCAN_WORKFLOW_STATUS_TONE', () => {
  it('has a label and a tone for every ScanWorkflowStatus', () => {
    for (const status of SCAN_WORKFLOW_STATUSES) {
      expect(SCAN_WORKFLOW_STATUS_LABELS[status]).toBeTruthy();
      expect(SCAN_WORKFLOW_STATUS_TONE[status]).toBeTruthy();
    }
  });
});

describe('isActiveWorkflowStatus', () => {
  it('treats queued and running as active', () => {
    expect(isActiveWorkflowStatus('queued')).toBe(true);
    expect(isActiveWorkflowStatus('running')).toBe(true);
  });

  it('treats every terminal status as not active', () => {
    expect(isActiveWorkflowStatus('manual_review')).toBe(false);
    expect(isActiveWorkflowStatus('qualified')).toBe(false);
    expect(isActiveWorkflowStatus('reject')).toBe(false);
    expect(isActiveWorkflowStatus('preview_ready')).toBe(false);
    expect(isActiveWorkflowStatus('failed')).toBe(false);
  });
});
