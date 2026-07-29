/**
 * Unit tests for the Cognito-backed customer identity wrappers (Stage 17).
 * All AWS interactions are mocked — no real AWS calls, no real Cognito.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: vi.fn(() => ({ send: mockSend })),
  SignUpCommand: vi.fn((input) => ({ input })),
  ConfirmSignUpCommand: vi.fn((input) => ({ input })),
  ResendConfirmationCodeCommand: vi.fn((input) => ({ input })),
  InitiateAuthCommand: vi.fn((input) => ({ input })),
  ForgotPasswordCommand: vi.fn((input) => ({ input })),
  ConfirmForgotPasswordCommand: vi.fn((input) => ({ input })),
  ListUsersCommand: vi.fn((input) => ({ input })),
}));

vi.mock('server-only', () => ({}));

import {
  signUpCustomer,
  signInCustomer,
  confirmCustomerPasswordReset,
  adminGetCustomerProfileBySub,
} from '../customer-cognito';

const testProfile = { firstName: 'Jane', lastName: 'Doe', phone: '555-123-4567' };

function fakeIdToken(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${payload}.signature`;
}

function namedError(name: string): Error {
  const err = new Error(name);
  err.name = name;
  return err;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AWS_REGION = 'us-east-1';
  process.env.COGNITO_USER_POOL_ID = 'us-east-1_test';
  process.env.COGNITO_USER_POOL_CLIENT_ID = 'test-client-id';
});

describe('signUpCustomer', () => {
  it('returns ok on success', async () => {
    mockSend.mockResolvedValueOnce({});
    const result = await signUpCustomer('owner@example.com', 'correct horse battery staple', testProfile);
    expect(result).toEqual({ ok: true });
  });

  it('maps UsernameExistsException to email_taken — without disclosing Cognito-specific text', async () => {
    mockSend.mockRejectedValueOnce(namedError('UsernameExistsException'));
    const result = await signUpCustomer('owner@example.com', 'password', testProfile);
    expect(result).toEqual({ ok: false, reason: 'email_taken' });
  });

  it('maps InvalidPasswordException to weak_password', async () => {
    mockSend.mockRejectedValueOnce(namedError('InvalidPasswordException'));
    const result = await signUpCustomer('owner@example.com', 'weak', testProfile);
    expect(result).toEqual({ ok: false, reason: 'weak_password' });
  });

  it('maps TooManyRequestsException to rate_limited', async () => {
    mockSend.mockRejectedValueOnce(namedError('TooManyRequestsException'));
    const result = await signUpCustomer('owner@example.com', 'password', testProfile);
    expect(result).toEqual({ ok: false, reason: 'rate_limited' });
  });

  it('maps any other error to unknown — never leaks the raw Cognito error', async () => {
    mockSend.mockRejectedValueOnce(namedError('SomeInternalCognitoDetail'));
    const result = await signUpCustomer('owner@example.com', 'password', testProfile);
    expect(result).toEqual({ ok: false, reason: 'unknown' });
  });
});

describe('signInCustomer', () => {
  it('decodes sub/email from the ID token on success', async () => {
    const idToken = fakeIdToken({ sub: 'cognito-sub-123', email: 'owner@example.com' });
    mockSend.mockResolvedValueOnce({ AuthenticationResult: { IdToken: idToken } });

    const result = await signInCustomer('owner@example.com', 'password');
    expect(result).toEqual({ ok: true, sub: 'cognito-sub-123', email: 'owner@example.com' });
  });

  it('maps UserNotConfirmedException to needs_confirmation', async () => {
    mockSend.mockRejectedValueOnce(namedError('UserNotConfirmedException'));
    const result = await signInCustomer('owner@example.com', 'password');
    expect(result).toEqual({ ok: false, reason: 'needs_confirmation' });
  });

  it('maps NotAuthorizedException to invalid_credentials', async () => {
    mockSend.mockRejectedValueOnce(namedError('NotAuthorizedException'));
    const result = await signInCustomer('owner@example.com', 'wrong-password');
    expect(result).toEqual({ ok: false, reason: 'invalid_credentials' });
  });

  it('uses the USER_PASSWORD_AUTH flow explicitly', async () => {
    const idToken = fakeIdToken({ sub: 'cognito-sub-123', email: 'owner@example.com' });
    mockSend.mockResolvedValueOnce({ AuthenticationResult: { IdToken: idToken } });
    await signInCustomer('owner@example.com', 'password');
    const command = mockSend.mock.calls[0][0];
    expect(command.input.AuthFlow).toBe('USER_PASSWORD_AUTH');
  });
});

describe('confirmCustomerPasswordReset', () => {
  it('maps CodeMismatchException to invalid_code', async () => {
    mockSend.mockRejectedValueOnce(namedError('CodeMismatchException'));
    const result = await confirmCustomerPasswordReset('owner@example.com', '000000', 'newpassword');
    expect(result).toEqual({ ok: false, reason: 'invalid_code' });
  });

  it('maps InvalidPasswordException to weak_password', async () => {
    mockSend.mockRejectedValueOnce(namedError('InvalidPasswordException'));
    const result = await confirmCustomerPasswordReset('owner@example.com', '000000', 'weak');
    expect(result).toEqual({ ok: false, reason: 'weak_password' });
  });
});

describe('adminGetCustomerProfileBySub', () => {
  it('resolves the profile for a well-formed sub', async () => {
    mockSend.mockResolvedValueOnce({
      Users: [
        {
          Attributes: [
            { Name: 'email', Value: 'owner@example.com' },
            { Name: 'given_name', Value: 'Jane' },
            { Name: 'family_name', Value: 'Doe' },
            { Name: 'phone_number', Value: '+15551234567' },
          ],
        },
      ],
    });
    const profile = await adminGetCustomerProfileBySub('12345678-1234-1234-1234-123456789012');
    expect(profile).toEqual({
      email: 'owner@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '+15551234567',
    });
  });

  it('rejects a malformed sub without calling Cognito at all', async () => {
    const profile = await adminGetCustomerProfileBySub('; DROP TABLE users; --');
    expect(profile).toBeNull();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns null when no user matches', async () => {
    mockSend.mockResolvedValueOnce({ Users: [] });
    const profile = await adminGetCustomerProfileBySub('12345678-1234-1234-1234-123456789012');
    expect(profile).toBeNull();
  });
});
