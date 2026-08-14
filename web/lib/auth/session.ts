import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COOKIE_NAME = 'webpresa_admin_session';
const SESSION_DURATION_DAYS = 7;

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

// ---------------------------------------------------------------------------
// Session payload
// ---------------------------------------------------------------------------

export interface SessionPayload {
  /** Admin username. */
  sub: string;
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// Encrypt / decrypt
// ---------------------------------------------------------------------------

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(getSecretKey());
}

export async function decryptSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie management
// ---------------------------------------------------------------------------

export async function createSession(username: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const token = await encryptSession({ sub: username, expiresAt: expiresAt.toISOString() });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return decryptSession(token);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Stage 25 (Security Hardening) — a shared throwing equivalent of the
 * `const session = await getSession(); if (!session) return {...}` check
 * every admin Server Action/Route Handler already repeats independently
 * (audited: consistently applied everywhere today, just duplicated rather
 * than centrally enforced, unlike `requireCustomerSession()` on the
 * customer side). New admin server code should prefer this; existing call
 * sites are intentionally left as-is — they are already correct, and
 * rewriting ~30 already-correct checks purely for style is out of scope
 * for this pass.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized: no valid admin session');
  }
  return session;
}

export const ADMIN_SESSION_COOKIE = COOKIE_NAME;
