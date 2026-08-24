/**
 * Unit tests for the Cognito Hosted UI OAuth helpers ("Sign in with
 * Google"). The token exchange is a plain `fetch` call, not the AWS SDK —
 * mocked here rather than hit for real.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/env/app-base-url', () => ({ resolveAppBaseUrl: () => 'https://app.example.test' }));

import { buildGoogleAuthorizeUrl, exchangeGoogleOAuthCode } from '../google-oauth';

beforeEach(() => {
  process.env.COGNITO_HOSTED_UI_DOMAIN = 'https://webpresa-dev-customers.auth.us-east-1.amazoncognito.com';
  process.env.COGNITO_USER_POOL_CLIENT_ID = 'client-abc123';
  vi.restoreAllMocks();
});

describe('buildGoogleAuthorizeUrl', () => {
  it('builds a Hosted UI /oauth2/authorize URL with the expected params', () => {
    const url = new URL(buildGoogleAuthorizeUrl('signed-state-token'));
    expect(url.origin + url.pathname).toBe('https://webpresa-dev-customers.auth.us-east-1.amazoncognito.com/oauth2/authorize');
    expect(url.searchParams.get('client_id')).toBe('client-abc123');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('redirect_uri')).toBe('https://app.example.test/api/auth/google/callback');
    expect(url.searchParams.get('identity_provider')).toBe('Google');
    expect(url.searchParams.get('state')).toBe('signed-state-token');
  });

  it('strips a trailing slash from the configured domain', () => {
    process.env.COGNITO_HOSTED_UI_DOMAIN = 'https://webpresa-dev-customers.auth.us-east-1.amazoncognito.com/';
    const url = new URL(buildGoogleAuthorizeUrl('state'));
    expect(url.origin + url.pathname).toBe('https://webpresa-dev-customers.auth.us-east-1.amazoncognito.com/oauth2/authorize');
  });
});

describe('exchangeGoogleOAuthCode', () => {
  it('posts the authorization code and returns the ID token on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id_token: 'header.payload.sig', access_token: 'ignored' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await exchangeGoogleOAuthCode('auth-code-123');
    expect(result).toEqual({ idToken: 'header.payload.sig' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://webpresa-dev-customers.auth.us-east-1.amazoncognito.com/oauth2/token');
    expect(init.method).toBe('POST');
    const body = new URLSearchParams(init.body);
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('client_id')).toBe('client-abc123');
    expect(body.get('code')).toBe('auth-code-123');
    expect(body.get('redirect_uri')).toBe('https://app.example.test/api/auth/google/callback');
  });

  it('returns null when Cognito responds with a non-OK status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    expect(await exchangeGoogleOAuthCode('bad-code')).toBeNull();
  });

  it('returns null when the response has no id_token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: 'x' }) }));
    expect(await exchangeGoogleOAuthCode('code')).toBeNull();
  });

  it('returns null when fetch itself throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    );
    expect(await exchangeGoogleOAuthCode('code')).toBeNull();
  });
});
