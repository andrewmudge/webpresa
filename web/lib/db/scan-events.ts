import 'server-only';
import { QueryCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { ScanEvent } from '@/domain/models/scan-event';
import { ScanEventSchema } from '@/domain/schemas/scan-event.schema';
import { getDynamoDBClient, TABLE_SCAN_EVENTS } from './client';

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
