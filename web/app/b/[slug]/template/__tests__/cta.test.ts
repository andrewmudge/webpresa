import { describe, it, expect } from 'vitest';
import { resolvePreviewCta, resolvePreviewCtaConfig, getMobileBarActions } from '../cta';
import type { PreviewContact, PreviewContent } from '@/domain/models/site-preview';

// ---------------------------------------------------------------------------
// resolvePreviewCta
// ---------------------------------------------------------------------------

describe('resolvePreviewCta — phone', () => {
  it('uses the contact phone number by default', () => {
    const contact: PreviewContact = { phone: '(512) 555-0100' };
    const result = resolvePreviewCta({
      cta: { type: 'phone', label: 'Call Now' },
      contact,
      variant: 'primary',
    });
    expect(result).toEqual({ type: 'phone', label: 'Call Now', href: 'tel:+15125550100', variant: 'primary' });
  });

  it('honors a phone override value over the contact phone', () => {
    const contact: PreviewContact = { phone: '512-555-0100' };
    const result = resolvePreviewCta({
      cta: { type: 'phone', label: 'Call Now', value: '888-555-9999' },
      contact,
      variant: 'primary',
    });
    expect(result?.href).toBe('tel:+18885559999');
  });

  it('sanitizes formatting characters out of the phone number', () => {
    const contact: PreviewContact = { phone: '+1-512-555-0100' };
    const result = resolvePreviewCta({ cta: { type: 'phone', label: 'Call Now' }, contact, variant: 'primary' });
    expect(result?.href).toBe('tel:+15125550100');
  });

  it('returns null when no phone is available from override or contact', () => {
    const result = resolvePreviewCta({ cta: { type: 'phone', label: 'Call Now' }, contact: {}, variant: 'primary' });
    expect(result).toBeNull();
  });
});

describe('resolvePreviewCta — email', () => {
  it('uses the contact email by default', () => {
    const contact: PreviewContact = { email: 'hello@example.com' };
    const result = resolvePreviewCta({ cta: { type: 'email', label: 'Email Us' }, contact, variant: 'primary' });
    expect(result).toEqual({ type: 'email', label: 'Email Us', href: 'mailto:hello@example.com', variant: 'primary' });
  });

  it('honors an email override over the contact email', () => {
    const contact: PreviewContact = { email: 'hello@example.com' };
    const result = resolvePreviewCta({
      cta: { type: 'email', label: 'Email Us', value: 'sales@example.com' },
      contact,
      variant: 'primary',
    });
    expect(result?.href).toBe('mailto:sales@example.com');
  });

  it('returns null when no email is available', () => {
    const result = resolvePreviewCta({ cta: { type: 'email', label: 'Email Us' }, contact: {}, variant: 'primary' });
    expect(result).toBeNull();
  });
});

describe('resolvePreviewCta — sms', () => {
  it('resolves an sms: link from the contact phone', () => {
    const contact: PreviewContact = { phone: '512-555-0100' };
    const result = resolvePreviewCta({ cta: { type: 'sms', label: 'Text Us' }, contact, variant: 'secondary' });
    expect(result).toEqual({ type: 'sms', label: 'Text Us', href: 'sms:+15125550100', variant: 'secondary' });
  });

  it('returns null when no phone is available for sms', () => {
    const result = resolvePreviewCta({ cta: { type: 'sms', label: 'Text Us' }, contact: {}, variant: 'secondary' });
    expect(result).toBeNull();
  });
});

describe('resolvePreviewCta — external_url', () => {
  it('resolves a valid https external URL', () => {
    const result = resolvePreviewCta({
      cta: { type: 'external_url', label: 'Book Online', value: 'https://calendly.com/acme' },
      contact: {},
      variant: 'primary',
    });
    expect(result).toEqual({
      type: 'external_url',
      label: 'Book Online',
      href: 'https://calendly.com/acme',
      variant: 'primary',
    });
  });

  it('rejects an unsafe non-https protocol', () => {
    const result = resolvePreviewCta({
      cta: { type: 'external_url', label: 'Book Online', value: 'javascript:alert(1)' },
      contact: {},
      variant: 'primary',
    });
    expect(result).toBeNull();
  });

  it('rejects plain http (non-https)', () => {
    const result = resolvePreviewCta({
      cta: { type: 'external_url', label: 'Book Online', value: 'http://calendly.com/acme' },
      contact: {},
      variant: 'primary',
    });
    expect(result).toBeNull();
  });

  it('returns null when no destination value is provided', () => {
    const result = resolvePreviewCta({
      cta: { type: 'external_url', label: 'Book Online' },
      contact: {},
      variant: 'primary',
    });
    expect(result).toBeNull();
  });
});

describe('resolvePreviewCta — none', () => {
  it('always returns null for type "none"', () => {
    const result = resolvePreviewCta({
      cta: { type: 'none', label: '' },
      contact: { phone: '512-555-0100', email: 'a@b.com' },
      variant: 'primary',
    });
    expect(result).toBeNull();
  });

  it('returns null when cta is undefined', () => {
    const result = resolvePreviewCta({ cta: undefined, contact: {}, variant: 'primary' });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolvePreviewCtaConfig
// ---------------------------------------------------------------------------

function baseContent(overrides: Partial<PreviewContent> = {}): PreviewContent {
  return {
    hero: { headline: 'Acme Plumbing', subheadline: 'Reliable service.', ctaText: 'Get a Free Quote' },
    services: [{ name: 'Drain Cleaning', description: 'Fast drain service.' }],
    tagline: 'Trusted local plumbing.',
    aboutText: 'We are Acme Plumbing.',
    contact: {},
    ...overrides,
  };
}

describe('resolvePreviewCtaConfig — structured config', () => {
  it('resolves one valid CTA when only primary is configured', () => {
    const content = baseContent({
      contact: { phone: '512-555-0100' },
      cta: { primary: { type: 'phone', label: 'Call Now' } },
    });
    const { primary, secondary } = resolvePreviewCtaConfig(content);
    expect(primary).not.toBeNull();
    expect(secondary).toBeNull();
  });

  it('resolves two valid CTAs when primary and secondary are both configured', () => {
    const content = baseContent({
      contact: { phone: '512-555-0100', email: 'hello@acme.com' },
      cta: {
        primary: { type: 'phone', label: 'Call Now' },
        secondary: { type: 'email', label: 'Email Us' },
      },
    });
    const { primary, secondary } = resolvePreviewCtaConfig(content);
    expect(primary?.type).toBe('phone');
    expect(secondary?.type).toBe('email');
  });

  it('collapses two CTAs that resolve to the same action and destination into one', () => {
    const content = baseContent({
      contact: { phone: '512-555-0100' },
      cta: {
        primary: { type: 'phone', label: 'Call Now' },
        secondary: { type: 'phone', label: 'Call Us' }, // same fallback phone, same href
      },
    });
    const { primary, secondary } = resolvePreviewCtaConfig(content);
    expect(primary).not.toBeNull();
    expect(secondary).toBeNull();
  });

  it('keeps two CTAs distinct when their destinations differ', () => {
    const content = baseContent({
      contact: { phone: '512-555-0100' },
      cta: {
        primary: { type: 'phone', label: 'Call Now' },
        secondary: { type: 'phone', label: 'Call Dispatch', value: '888-555-1111' },
      },
    });
    const { primary, secondary } = resolvePreviewCtaConfig(content);
    expect(primary?.href).toBe('tel:+15125550100');
    expect(secondary?.href).toBe('tel:+18885551111');
  });

  it('returns null for both when nothing resolves', () => {
    const content = baseContent({
      contact: {},
      cta: { primary: { type: 'phone', label: 'Call Now' } },
    });
    const { primary, secondary } = resolvePreviewCtaConfig(content);
    expect(primary).toBeNull();
    expect(secondary).toBeNull();
  });
});

describe('resolvePreviewCtaConfig — legacy normalization', () => {
  it('preserves the legacy hero.ctaText label and uses phone when no structured cta is present', () => {
    const content = baseContent({
      contact: { phone: '512-555-0100' },
      hero: { headline: 'Acme', subheadline: 'x', ctaText: 'Get a Free Quote' },
      // no `cta` field at all — simulates a preview saved before this feature existed
    });
    const { primary, secondary } = resolvePreviewCtaConfig(content);
    expect(primary).toEqual({ type: 'phone', label: 'Get a Free Quote', href: 'tel:+15125550100', variant: 'primary' });
    expect(secondary).toBeNull();
  });

  it('falls back to email when there is no phone', () => {
    const content = baseContent({
      contact: { email: 'hello@acme.com' },
      hero: { headline: 'Acme', subheadline: 'x', ctaText: 'Request an Estimate' },
    });
    const { primary } = resolvePreviewCtaConfig(content);
    expect(primary).toEqual({
      type: 'email',
      label: 'Request an Estimate',
      href: 'mailto:hello@acme.com',
      variant: 'primary',
    });
  });

  it('hides the CTA entirely when there is no phone, no email, and no structured cta', () => {
    const content = baseContent({ contact: {} });
    const { primary, secondary } = resolvePreviewCtaConfig(content);
    expect(primary).toBeNull();
    expect(secondary).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getMobileBarActions
// ---------------------------------------------------------------------------

describe('getMobileBarActions', () => {
  it('returns a single action when only one CTA resolves', () => {
    const content = baseContent({
      contact: { phone: '512-555-0100' },
      cta: { primary: { type: 'phone', label: 'Call Now' } },
    });
    const { primary, secondary } = resolvePreviewCtaConfig(content);
    const actions = getMobileBarActions(primary, secondary);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('phone');
  });

  it('returns two actions when both primary and secondary resolve', () => {
    const content = baseContent({
      contact: { phone: '512-555-0100', email: 'hello@acme.com' },
      cta: {
        primary: { type: 'phone', label: 'Call Now' },
        secondary: { type: 'email', label: 'Email Us' },
      },
    });
    const { primary, secondary } = resolvePreviewCtaConfig(content);
    const actions = getMobileBarActions(primary, secondary);
    expect(actions).toHaveLength(2);
  });

  it('returns an empty array when nothing resolves', () => {
    const actions = getMobileBarActions(null, null);
    expect(actions).toHaveLength(0);
  });
});
