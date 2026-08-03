import 'server-only';
import { SESv2Client } from '@aws-sdk/client-sesv2';

/**
 * Singleton SESv2 client (Stage 20). Unlike every other AWS SDK client in
 * this app (`lib/db/client.ts`, `lib/secrets/`), SES authenticates purely
 * via IAM (`ses:SendEmail`, granted in
 * `infra/lib/stacks/vercel-access-stack.ts`) — there is no API key and
 * therefore no Secrets Manager entry to read. Credential resolution mirrors
 * `lib/db/client.ts` exactly (explicit static credentials on Vercel,
 * default SDK credential chain / AWS_PROFILE for local dev).
 */

let client: SESv2Client | undefined;

export function getSesClient(): SESv2Client {
  if (client) return client;

  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error('AWS_REGION environment variable is not set');
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  client = new SESv2Client({
    region,
    ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
  });

  return client;
}
