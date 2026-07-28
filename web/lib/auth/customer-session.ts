import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

/**
 * Customer session — structurally identical to the admin session
 * (`lib/auth/session.ts`), but fully separate: its own cookie name, its own
 * signing secret. A captured admin session token can never verify as a
 * customer session or vice versa, by construction (see implementation.md,
 * Stage 17, "Authentication requirements").
 *
 * Minted only after a successful Cognito authentication
 * (`lib/auth/customer-cognito.ts`) — this module never talks to Cognito
 * itself, and never talks to DynamoDB. `sub`/`email` come from Cognito's
 * response, not a database lookup.
 */

const COOKIE_NAME = 'webpresa_customer_session';
const SESSION_DURATION_DAYS = 7;

function getSecretKey(): Uint8Array {
  const secret = process.env.CUSTOMER_SESSION_SECRET;
  if (!secret) {
    throw new Error('CUSTOMER_SESSION_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

// ---------------------------------------------------------------------------
// Session payload
// ---------------------------------------------------------------------------

export interface CustomerSessionPayload {
  /** Cognito `sub` — never read as proof of business ownership. */
  sub: string;
  email: string;
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// Encrypt / decrypt
// ---------------------------------------------------------------------------

export async function encryptCustomerSession(payload: CustomerSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(getSecretKey());
}

export async function decryptCustomerSession(
  token: string | undefined,
): Promise<CustomerSessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ['HS256'],
    });
    return payload as unknown as CustomerSessionPayload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie management
// ---------------------------------------------------------------------------

export async function createCustomerSession(params: { sub: string; email: string }): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const token = await encryptCustomerSession({
    sub: params.sub,
    email: params.email,
    expiresAt: expiresAt.toISOString(),
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

export async function getCustomerSession(): Promise<CustomerSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return decryptCustomerSession(token);
}

export async function deleteCustomerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export const CUSTOMER_SESSION_COOKIE = COOKIE_NAME;
