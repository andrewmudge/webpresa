import { describe, it, expect } from 'vitest';
import { SCAN_FAILURE_CATEGORIES } from '@/domain/models/scan-event';
import { SCAN_WORKFLOW_FAILURE_CATEGORIES } from '@/domain/models/scan-execution';
import { mapToWorkflowFailureCategory, isWorkflowFailureRetryable } from '../failure-mapping';

describe('mapToWorkflowFailureCategory', () => {
  it('maps every ScanFailureCategory to a valid ScanWorkflowFailureCategory', () => {
    for (const category of SCAN_FAILURE_CATEGORIES) {
      const mapped = mapToWorkflowFailureCategory(category);
      expect(SCAN_WORKFLOW_FAILURE_CATEGORIES).toContain(mapped);
    }
  });

  it('maps rate-limit categories to rate_limit', () => {
    expect(mapToWorkflowFailureCategory('firecrawl_rate_limit')).toBe('rate_limit');
  });

  it('maps AI schema failures to schema_validation', () => {
    expect(mapToWorkflowFailureCategory('invalid_ai_schema_output')).toBe('schema_validation');
  });

  it('maps missing_website to validation', () => {
    expect(mapToWorkflowFailureCategory('missing_website')).toBe('validation');
  });
});

describe('isWorkflowFailureRetryable', () => {
  it('treats rate_limit, provider_timeout, provider_error, and network as retryable', () => {
    expect(isWorkflowFailureRetryable('rate_limit')).toBe(true);
    expect(isWorkflowFailureRetryable('provider_timeout')).toBe(true);
    expect(isWorkflowFailureRetryable('provider_error')).toBe(true);
    expect(isWorkflowFailureRetryable('network')).toBe(true);
  });

  it('treats validation, schema_validation, and internal as not retryable', () => {
    expect(isWorkflowFailureRetryable('validation')).toBe(false);
    expect(isWorkflowFailureRetryable('schema_validation')).toBe(false);
    expect(isWorkflowFailureRetryable('internal')).toBe(false);
  });
});
