import 'server-only';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * Singleton DynamoDB DocumentClient.
 *
 * The AWS region is read from the AWS_REGION environment variable.
 * Credentials are resolved from the default SDK credential chain:
 *   - Local dev:  IAM Identity Center SSO profile (AWS_PROFILE=webpresa)
 *   - Vercel:     AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY env vars
 *                 (dedicated least-privilege IAM user — see deployment.md)
 *
 * Never expose this module or its callers to browser bundles.
 */

let client: DynamoDBDocumentClient | undefined;

export function getDynamoDBClient(): DynamoDBDocumentClient {
  if (client) return client;

  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error('AWS_REGION environment variable is not set');
  }

  // Explicitly pass static credentials when env vars are present (Vercel).
  // Falls back to the default SDK credential chain when they are absent
  // (local dev uses AWS_PROFILE / SSO session instead).
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  const ddbClient = new DynamoDBClient({
    region,
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });

  client = DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertEmptyValues: false,
    },
  });

  return client;
}

// ---------------------------------------------------------------------------
// Table name helpers — read from environment variables
// ---------------------------------------------------------------------------

export function getTableName(envVar: string): string {
  const name = process.env[envVar];
  if (!name) {
    throw new Error(`${envVar} environment variable is not set`);
  }
  return name;
}

export const TABLE_BUSINESSES = () => getTableName('BUSINESSES_TABLE_NAME');
export const TABLE_SITE_PREVIEWS = () => getTableName('SITE_PREVIEWS_TABLE_NAME');
export const TABLE_SCAN_EVENTS = () => getTableName('SCAN_EVENTS_TABLE_NAME');
export const TABLE_POSTCARDS = () => getTableName('POSTCARDS_TABLE_NAME');
export const TABLE_SCAN_EXECUTIONS = () => getTableName('SCAN_EXECUTIONS_TABLE_NAME');
export const TABLE_STOCK_IMAGES = () => getTableName('STOCK_IMAGES_TABLE_NAME');
export const TABLE_CLAIMS = () => getTableName('CLAIMS_TABLE_NAME');
