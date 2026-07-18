import 'server-only';
import { QueryCommand, ScanCommand, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { ScanEvent } from '@/domain/models/scan-event';
import { ScanEventSchema } from '@/domain/schemas/scan-event.schema';
import { getDynamoDBClient, TABLE_SCAN_EVENTS } from './client';

/**
 * Retrieve every scan event across every business, newest-first (by
 * `createdAt`) — the admin `/admin/scans` list. Pages through `ScanCommand`
 * until exhausted or a safety cap, matching `listAllBusinesses`' documented
 * dev-scale tradeoff: no GSI supports a global "all scans, sorted by date"
 * query (`business-id-index` is keyed by business), so this scans the whole
 * table and sorts in application code. Acceptable at today's dev scale; a
 * production-scale table would need a proper index before this could run
 * safely at volume.
 */
const LIST_ALL_SCANS_SAFETY_CAP_PAGES = 40;

export async function listAllScans(): Promise<ScanEvent[]> {
  const client = getDynamoDBClient();
  const items: ScanEvent[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  let pages = 0;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: TABLE_SCAN_EVENTS(),
        Limit: 200,
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    for (const item of result.Items ?? []) {
      items.push(ScanEventSchema.parse(item));
    }
    exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    pages += 1;
  } while (exclusiveStartKey && pages < LIST_ALL_SCANS_SAFETY_CAP_PAGES);

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getScanEventById(scanId: string): Promise<ScanEvent | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_SCAN_EVENTS(),
      Key: { scanId },
    }),
  );
  if (!result.Item) return null;
  return ScanEventSchema.parse(result.Item);
}

/**
 * List all scan events for a business, ordered by `createdAt` descending (newest first).
 */
export async function listScansForBusiness(businessId: string): Promise<ScanEvent[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_SCAN_EVENTS(),
      IndexName: 'business-id-index',
      KeyConditionExpression: 'businessId = :businessId',
      ExpressionAttributeValues: { ':businessId': businessId },
      ScanIndexForward: false,
    }),
  );
  return (result.Items ?? []).map((item) => ScanEventSchema.parse(item));
}

export async function putScanEvent(scan: ScanEvent): Promise<void> {
  ScanEventSchema.parse(scan);
  const client = getDynamoDBClient();
  await client.send(
    new PutCommand({
      TableName: TABLE_SCAN_EVENTS(),
      Item: scan,
    }),
  );
}

export async function deleteScanEventById(scanId: string): Promise<void> {
  const client = getDynamoDBClient();
  await client.send(
    new DeleteCommand({
      TableName: TABLE_SCAN_EVENTS(),
      Key: { scanId },
    }),
  );
}
