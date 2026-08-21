import 'server-only';
import { createVerify } from 'crypto';

export interface SnsMessageEnvelope {
  Type: string;
  MessageId: string;
  Token?: string;
  TopicArn: string;
  Subject?: string;
  Message: string;
  SubscribeURL?: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  UnsubscribeURL?: string;
}

/** `sns.<region>.amazonaws.com` (or the `.amazonaws.com.cn` China variant) — the critical SSRF/spoofing guard. Never fetch a `SigningCertURL` that doesn't match this before verifying anything else. */
const SIGNING_CERT_HOSTNAME_PATTERN = /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/i;

const certCache = new Map<string, string>();

async function fetchSigningCert(url: string): Promise<string> {
  const cached = certCache.get(url);
  if (cached) return cached;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`failed to fetch SNS signing cert: HTTP ${response.status}`);
  const cert = await response.text();
  certCache.set(url, cert);
  return cert;
}

/** Field order per AWS's documented "String to Sign" format — differs between a delivered Notification and a (Un)SubscriptionConfirmation handshake. `Subject` is entirely omitted (not empty-stringed) when absent, per the same spec. */
function buildStringToSign(envelope: SnsMessageEnvelope): string {
  const fields =
    envelope.Type === 'SubscriptionConfirmation' || envelope.Type === 'UnsubscribeConfirmation'
      ? ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type']
      : ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type'];

  let stringToSign = '';
  for (const field of fields) {
    const value = (envelope as unknown as Record<string, string | undefined>)[field];
    if (value === undefined) continue;
    stringToSign += `${field}\n${value}\n`;
  }
  return stringToSign;
}

/**
 * Verifies one SNS message's signature per AWS's documented algorithm.
 * Returns `false` (never throws) for anything that doesn't verify —
 * including a `SigningCertURL` that isn't actually hosted on AWS's SNS
 * domain, which is checked and rejected *before* ever fetching it.
 */
export async function verifySnsMessageSignature(envelope: SnsMessageEnvelope): Promise<boolean> {
  let certUrl: URL;
  try {
    certUrl = new URL(envelope.SigningCertURL);
  } catch {
    return false;
  }
  if (certUrl.protocol !== 'https:' || !SIGNING_CERT_HOSTNAME_PATTERN.test(certUrl.hostname)) {
    return false;
  }

  const stringToSign = buildStringToSign(envelope);
  const algorithm = envelope.SignatureVersion === '2' ? 'sha256' : 'sha1';

  try {
    const cert = await fetchSigningCert(envelope.SigningCertURL);
    const verifier = createVerify(algorithm);
    verifier.update(stringToSign, 'utf8');
    verifier.end();
    return verifier.verify(cert, envelope.Signature, 'base64');
  } catch {
    return false;
  }
}
