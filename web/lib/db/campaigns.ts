import 'server-only';
import { GetCommand, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { Campaign, CampaignStatus } from '@/domain/models/campaign';
import { CampaignSchema } from '@/domain/schemas/campaign.schema';
import { getDynamoDBClient, TABLE_CAMPAIGNS } from './client';

export async function getCampaignById(campaignId: string): Promise<Campaign | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_CAMPAIGNS(),
      Key: { campaignId },
    }),
  );
  if (!result.Item) return null;
  return CampaignSchema.parse(result.Item);
}

const LIST_SAFETY_CAP_PAGES = 40;

/**
 * Every campaign, newest first — the admin `/admin/campaigns` list. A
 * bounded `Scan`, not a GSI query: campaign count stays small under manual
 * creation (see implementation.md, Stage 21, "Infrastructure changes"), the
 * same YAGNI reasoning already applied to `customer-billing-profiles`/
 * `customer-onboarding`.
 */
export async function listAllCampaigns(): Promise<Campaign[]> {
  const client = getDynamoDBClient();
  const items: Campaign[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  let pages = 0;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: TABLE_CAMPAIGNS(),
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    for (const item of result.Items ?? []) {
      items.push(CampaignSchema.parse(item));
    }
    exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    pages += 1;
  } while (exclusiveStartKey && pages < LIST_SAFETY_CAP_PAGES);

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return items;
}

export async function putCampaign(campaign: Campaign): Promise<void> {
  CampaignSchema.parse(campaign);
  const client = getDynamoDBClient();
  await client.send(
    new PutCommand({
      TableName: TABLE_CAMPAIGNS(),
      Item: campaign,
    }),
  );
}

export async function updateCampaignStatus(campaignId: string, status: CampaignStatus): Promise<void> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  await client.send(
    new UpdateCommand({
      TableName: TABLE_CAMPAIGNS(),
      Key: { campaignId },
      UpdateExpression: 'SET #status = :status, updatedAt = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status, ':now': now },
    }),
  );
}
