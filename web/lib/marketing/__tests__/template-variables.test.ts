import { describe, it, expect } from 'vitest';
import { validateTemplateVariables } from '../template-variables';

describe('validateTemplateVariables', () => {
  it('accepts text with only supported variables', () => {
    const result = validateTemplateVariables('Hello {{businessName}}, see {{previewUrl}} or {{unsubscribeUrl}}');
    expect(result.valid).toBe(true);
    expect(result.unknownVariables).toEqual([]);
  });

  it('accepts text with no variables at all', () => {
    expect(validateTemplateVariables('Plain text, no placeholders.').valid).toBe(true);
  });

  it('rejects an unsupported variable', () => {
    const result = validateTemplateVariables('Hi {{firstName}}, check out {{previewUrl}}');
    expect(result.valid).toBe(false);
    expect(result.unknownVariables).toEqual(['firstName']);
  });

  it('does not treat non-identifier text inside braces as a variable at all — it never matches the {{word}} shape, so it is inert literal text rather than a rejected/executed expression (rendering is plain string substitution, never eval)', () => {
    const result = validateTemplateVariables('{{constructor.constructor("x")()}}');
    expect(result.valid).toBe(true);
    expect(result.unknownVariables).toEqual([]);
  });

  it('deduplicates repeated unknown variables', () => {
    const result = validateTemplateVariables('{{foo}} and {{foo}} again');
    expect(result.unknownVariables).toEqual(['foo']);
  });

  it('tolerates whitespace inside the braces', () => {
    expect(validateTemplateVariables('{{ businessName }}').valid).toBe(true);
  });
});
