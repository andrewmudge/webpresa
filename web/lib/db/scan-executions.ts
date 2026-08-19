import 'server-only';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { ScanExecution } from '@/domain/models/scan-execution';
import { ScanExecutionSchema } from '@/domain/schemas/scan-execution.schema';
import { getDynamoDBClient, TABLE_SCAN_EXECUTIONS } from './client';

/**
 * Retrieve every scan execution across every business, newest-first — the
 * Stage 24 Operations page's cross-business aggregation. Mirrors
 * `listAllScans`' documented dev-scale tradeoff exactly: no GSI supports a
 * global "all executions, sorted by date" query, so this scans the whole
 * table and sorts in application code, bounded by the same safety cap.
 */
const LIST_ALL_SCAN_EXECUTIONS_SAFETY_CAP_PAGES = 40;

export async function listAllScanExecutions(): Promise<ScanExecution[]> {
  const client = getDynamoDBClient();
  const items: ScanExecution[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  let pages = 0;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: TABLE_SCAN_EXECUTIONS(),
        Limit: 200,
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    for (const item of result.Items ?? []) {
      items.push(ScanExecutionSchema.parse(item));
    }
    exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    pages += 1;
  } while (exclusiveStartKey && pages < LIST_ALL_SCAN_EXECUTIONS_SAFETY_CAP_PAGES);

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getScanExecutionById(scanExecutionId: string): Promise<ScanExecution | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_SCAN_EXECUTIONS(),
      Key: { scanExecutionId },
    }),
  );
  if (!result.Item) return null;
  return ScanExecutionSchema.parse(result.Item);
}

/**
 * List all scan executions for a business, ordered by `createdAt` descending
 * (newest first) — mirrors `listScansForBusiness` in `scan-events.ts`.
 */
export async function listScanExecutionsForBusiness(businessId: string): Promise<ScanExecution[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_SCAN_EXECUTIONS(),
      IndexName: 'business-id-index',
      KeyConditionExpression: 'businessId = :businessId',
      ExpressionAttributeValues: { ':businessId': businessId },
      ScanIndexForward: false,
    }),
  );
  return (result.Items ?? []).map((item) => ScanExecutionSchema.parse(item));
}

/**
 * Write a complete ScanExecution record — used only for the initial
 * `'queued'` create (the admin trigger action) and the rerun create. Every
 * subsequent transition goes through `claimScanExecutionStatus` below, never
 * a blind `putScanExecution` overwrite.
 */
export async function putScanExecution(scanExecution: ScanExecution): Promise<void> {
  ScanExecutionSchema.parse(scanExecution);
  const client = getDynamoDBClient();
  await client.send(
    new PutCommand({
      TableName: TABLE_SCAN_EXECUTIONS(),
      Item: scanExecution,
    }),
  );
}

/**
 * Atomically transition a ScanExecution, guarded by its current `status` —
 * the Next.js-side counterpart to the screenshot Lambda's
 * `conditionalUpdateStatus` (`infra/lambda/screenshot-capture/src/aws.ts`).
 * Neither `putScanEvent` nor `updateBusiness` is atomic (they read-then-write
 * in application code — acceptable there since a duplicate write just
 * overwrites with the same intent), but ScanExecution's `queued → running`
 * claim specifically exists to guard against two concurrent Step Functions
 * task invocations (Standard workflow's at-least-once semantics) racing each
 * other, so it needs a real `ConditionExpression`.
 *
 * Returns `false` (never throws) when the condition fails — i.e. another
 * invocation already won the race — matching the Lambda-side convention so
 * callers can treat a lost race as an expected outcome, not an error.
 */
export async function claimScanExecutionStatus(params: {
  scanExecutionId: string;
  expectedCurrentStatus: ScanExecution['status'];
  updates: Partial<Omit<ScanExecution, 'scanExecutionId' | 'businessId' | 'createdAt'>>;
}): Promise<boolean> {
  const { scanExecutionId, expectedCurrentStatus, updates } = params;
  const client = getDynamoDBClient();

  const fields: Record<string, unknown> = { ...updates, updatedAt: new Date().toISOString() };
  const setClauses: string[] = [];
  const names: Record<string, string> = { '#status': 'status' };
  const values: Record<string, unknown> = { ':expectedStatus': expectedCurrentStatus };

  for (const [key, value] of Object.entries(fields)) {
    // The Step Functions state machine can't omit a JSONPath reference that
    // resolves to nothing (e.g. `qualification`/`leadPriority` for a
    // no-website business — see the schema's own doc comment) — it sends a
    // literal JSON `null` instead. Every field on `ScanExecution` is either
    // a real value or simply absent, never `null`, so skip it here rather
    // than persisting a `NULL` DynamoDB attribute a schema `.parse()` can't
    // read back as "unset".
    if (value === null) continue;
    const nameAlias = `#${key}`;
    const valueAlias = `:${key}`;
    setClauses.push(`${nameAlias} = ${valueAlias}`);
    names[nameAlias] = key;
    values[valueAlias] = value;
  }

  try {
    await client.send(
      new UpdateCommand({
        TableName: TABLE_SCAN_EXECUTIONS(),
        Key: { scanExecutionId },
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
