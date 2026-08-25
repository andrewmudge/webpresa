import 'server-only';
import { SignJWT, jwtVerify } from 'jose';

/**
 * The build-session cookie — the self-service `/build` funnel's counterpart
 * to `lib/auth/claim-intent.ts`, same shape and same guarantees: a
 * short-lived, signed, purpose-scoped JWT proving "this browser just
 * started this specific build," never ownership, authentication, or
 * payment. Signed with its own dedicated secret (`BUILD_SESSION_SECRET`),
 * separate from the claim-intent, customer-session, and OAuth-state
 * secrets, so a build session can never be replayed as any of those.
 *
 * Deliberately pure sign/verify — cookie get/set is left to each call site
 * (the `/build` submit Server Action, the `/build/[buildId]` status route,
 * the self-service upload/publish endpoints), matching `claim-intent.ts`'s
 * own rationale.
 */

export const BUILD_SESSION_COOKIE_NAME = 'webpresa_build_session';
const BUILD_SESSION_DURATION_MINUTES = 120;
export const BUILD_SESSION_MAX_AGE_SECONDS = BUILD_SESSION_DURATION_MINUTES * 60;

export interface BuildSessionPayload {
  purpose: 'self_service_build';
  businessId: string;
  buildId: string;
}

export interface BuildSession {
  businessId: string;
  buildId: string;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.BUILD_SESSION_SECRET;
  if (!secret) {
    throw new Error('BUILD_SESSION_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

export async function signBuildSession(session: BuildSession): Promise<string> {
  return new SignJWT({
    purpose: 'self_service_build',
    businessId: session.businessId,
    buildId: session.buildId,
  } satisfies BuildSessionPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${BUILD_SESSION_DURATION_MINUTES}m`)
    .sign(getSecretKey());
}

export async function verifyBuildSession(token: string | undefined): Promise<BuildSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] });
    const claims = payload as unknown as Partial<BuildSessionPayload>;
    if (claims.purpose !== 'self_service_build' || !claims.businessId || !claims.buildId) return null;
    return { businessId: claims.businessId, buildId: claims.buildId };
  } catch {
    return null;
  }
}

/**
 * The one check every consumer (progress route, self-service publish,
 * upload endpoint) must run before trusting anything else about a build
 * session — never assume a verified session authorizes an arbitrary
 * `buildId` just because its signature checks out.
 */
export function buildSessionAuthorizes(session: BuildSession | null, buildId: string): boolean {
  return session !== null && session.buildId === buildId;
}
