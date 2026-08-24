import 'server-only';

/**
 * Decodes an unverified ID token payload for `{sub, email}`. Safe here
 * specifically because every caller obtains the token from a trusted,
 * server-to-server call over TLS — either Cognito's `InitiateAuth` SDK
 * response (`signInCustomer`), or Cognito Hosted UI's own `/oauth2/token`
 * endpoint (`exchangeGoogleOAuthCode`, Google federation) — never from
 * client-supplied input. Same trust level as any other direct Cognito API
 * response, so no second signature-verification pass is needed.
 */
export function decodeIdTokenClaims(idToken: string): { sub: string; email: string } | null {
  try {
    const payloadSegment = idToken.split('.')[1];
    if (!payloadSegment) return null;
    const json = Buffer.from(payloadSegment, 'base64url').toString('utf8');
    const claims = JSON.parse(json) as { sub?: string; email?: string };
    if (!claims.sub || !claims.email) return null;
    return { sub: claims.sub, email: claims.email };
  } catch {
    return null;
  }
}
