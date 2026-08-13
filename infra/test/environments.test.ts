import { describe, expect, it } from 'vitest';
import { ENVIRONMENTS, assertAccountMatchesEnvironment, getEnvironmentConfig } from '../lib/config/environments';

describe('getEnvironmentConfig', () => {
  it('returns the dev config', () => {
    expect(getEnvironmentConfig('dev')).toBe(ENVIRONMENTS.dev);
  });

  it('returns the prod config', () => {
    expect(getEnvironmentConfig('prod')).toBe(ENVIRONMENTS.prod);
  });

  it('throws on an unknown environment name', () => {
    expect(() => getEnvironmentConfig('staging')).toThrow(/Unknown environment "staging"/);
  });
});

describe('assertAccountMatchesEnvironment', () => {
  it('does not throw when the resolved account matches the environment', () => {
    expect(() => assertAccountMatchesEnvironment('dev', ENVIRONMENTS.dev, ENVIRONMENTS.dev.expectedAccountId)).not.toThrow();
    expect(() => assertAccountMatchesEnvironment('prod', ENVIRONMENTS.prod, ENVIRONMENTS.prod.expectedAccountId)).not.toThrow();
  });

  it('does not throw when no account was resolved (e.g. no active profile)', () => {
    expect(() => assertAccountMatchesEnvironment('dev', ENVIRONMENTS.dev, undefined)).not.toThrow();
  });

  it('throws when env=prod resolves to the dev account (wrong --profile)', () => {
    expect(() => assertAccountMatchesEnvironment('prod', ENVIRONMENTS.prod, ENVIRONMENTS.dev.expectedAccountId)).toThrow(
      /Account mismatch/,
    );
  });

  it('throws when env=dev resolves to the prod account (wrong --profile)', () => {
    expect(() => assertAccountMatchesEnvironment('dev', ENVIRONMENTS.dev, ENVIRONMENTS.prod.expectedAccountId)).toThrow(
      /Account mismatch/,
    );
  });

  it('throws when the resolved account matches neither known environment', () => {
    expect(() => assertAccountMatchesEnvironment('dev', ENVIRONMENTS.dev, '000000000000')).toThrow(/Account mismatch/);
  });
});
