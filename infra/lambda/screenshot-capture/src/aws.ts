import { DynamoDBClient, ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

/**
 * Thin AWS SDK wrappers for this Lambda — the region/credentials come from
 * the Lambda execution environment automatically (no explicit config
 * needed, unlike the web app's clients, which resolve SSO/static keys
 * depending on where they run).
 */

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const secretsManager = new SecretsManagerClient({});

export async function getItem<T>(tableName: string, key: Record<string, string>): Promise<T | null> {
  const result = await ddb.send(new GetCommand({ TableName: tableName, Key: key }));
  return (result.Item as T | undefined) ?? null;
}

/**
 * Conditional update — returns `false` (never throws) when the condition
 * fails, e.g. another invocation already transitioned this record. See
 * implementation.md, Stage 14, "Idempotency and status transitions" — this
 * is the mechanism that makes it safe for a rare duplicate Lambda
 * invocation to observe the same ScanEvent twice.
 */
export async function conditionalUpdateStatus(params: {
  tableName: string;
  key: Record<string, string>;
  expectedCurrentStatus: string;
  updates: Record<string, unknown>;
}): Promise<boolean> {
  const names: Record<string, string> = { '#status': 'status' };
  const values: Record<string, unknown> = { ':expectedStatus': params.expectedCurrentStatus };
  const setClauses: string[] = [];

  let i = 0;
  for (const [field, value] of Object.entries(params.updates)) {
    const nameKey = `#f${i}`;
    const valueKey = `:v${i}`;
    names[nameKey] = field;
    values[valueKey] = value;
    setClauses.push(`${nameKey} = ${valueKey}`);
    i += 1;
  }

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: params.tableName,
        Key: params.key,
        UpdateExpression: `SET ${setClauses.join(', ')}`,
        ConditionExpression: '#status = :expectedStatus',
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

export async function putScreenshot(bucket: string, key: string, body: Buffer): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'image/png',
    }),
  );
}

const secretCache = new Map<string, Record<string, string>>();

export async function getSecretJson(secretName: string): Promise<Record<string, string>> {
  const cached = secretCache.get(secretName);
  if (cached) return cached;

  const result = await secretsManager.send(new GetSecretValueCommand({ SecretId: secretName }));
  if (!result.SecretString) throw new Error(`Secret "${secretName}" has no SecretString value`);

  const parsed = JSON.parse(result.SecretString) as Record<string, string>;
  secretCache.set(secretName, parsed);
  return parsed;
}
