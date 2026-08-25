import { describe, it, expect } from 'vitest';
import { SelfServiceBuildCreateInputSchema, SelfServiceBuildInputSchema } from '../schema';

const VALID = {
  name: 'Acme Plumbing',
  industry: 'plumbing' as const,
  phone: '512-555-0100',
  hasExistingWebsite: false,
};

describe('SelfServiceBuildCreateInputSchema', () => {
  it('accepts a minimal valid no-website submission', () => {
    expect(SelfServiceBuildCreateInputSchema.safeParse(VALID).success).toBe(true);
  });

  it('requires websiteUrl when hasExistingWebsite is true', () => {
    const result = SelfServiceBuildCreateInputSchema.safeParse({ ...VALID, hasExistingWebsite: true });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('websiteUrl'))).toBe(true);
    }
  });

  it('accepts hasExistingWebsite: true with a websiteUrl', () => {
    const result = SelfServiceBuildCreateInputSchema.safeParse({
      ...VALID,
      hasExistingWebsite: true,
      websiteUrl: 'https://acme-plumbing.com',
    });
    expect(result.success).toBe(true);
  });

  it('requires at least a phone or an email', () => {
    const { phone: _phone, ...withoutPhone } = VALID;
    const result = SelfServiceBuildCreateInputSchema.safeParse(withoutPhone);
    expect(result.success).toBe(false);
  });

  it('accepts email in place of phone', () => {
    const { phone: _phone, ...withoutPhone } = VALID;
    const result = SelfServiceBuildCreateInputSchema.safeParse({ ...withoutPhone, email: 'owner@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects a blank business name', () => {
    expect(SelfServiceBuildCreateInputSchema.safeParse({ ...VALID, name: '' }).success).toBe(false);
  });

  it('rejects an invalid industry value', () => {
    expect(SelfServiceBuildCreateInputSchema.safeParse({ ...VALID, industry: 'not_a_real_industry' }).success).toBe(false);
  });

  it('has no logoUrl/photoUrls fields at all — those upload after this step', () => {
    const result = SelfServiceBuildCreateInputSchema.safeParse({ ...VALID, logoUrl: '/api/assets/x' });
    // Zod strips unknown keys by default rather than erroring — assert the
    // field simply isn't present on the parsed output.
    expect(result.success).toBe(true);
    expect(result.success && 'logoUrl' in result.data).toBe(false);
  });
});

describe('SelfServiceBuildInputSchema', () => {
  it('accepts logoUrl/photoUrls as already-resolved asset paths', () => {
    const result = SelfServiceBuildInputSchema.safeParse({
      ...VALID,
      logoUrl: '/api/assets/businesses/biz_1/assets/logo.png',
      photoUrls: ['/api/assets/businesses/biz_1/assets/photos/1.png'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a raw (non-proxy, non-http) logoUrl value', () => {
    const result = SelfServiceBuildInputSchema.safeParse({ ...VALID, logoUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });
});
