import 'server-only';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { MarketingCampaign, MarketingCampaignStatus } from '@/domain/models/marketing-campaign';
import { MarketingCampaignSchema } from '@/domain/schemas/marketing-campaign.schema';
import { getDynamoDBClient, TABLE_MARKETING_CAMPAIGNS } from './client';

export async function getMarketingCampaignById(marketingCampaignId: string): Promise<MarketingCampaign | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_MARKETING_CAMPAIGNS(),
      Key: { marketingCampaignId },
    }),
  );
  if (!result.Item) return null;
  return MarketingCampaignSchema.parse(result.Item);
}

/**
 * First-ever-creation guard for the MVP's single campaign row — see
 * `lib/marketing/campaign.ts`, `ensureMarketingCampaignExists()`. Returns
 * `false` (never throws) when a row already exists, so a race between two
 * concurrent callers can't create two rows or clobber an admin's existing
 * `status`.
 */
export async function putMarketingCampaignIfNotExists(campaign: MarketingCampaign): Promise<boolean> {
  MarketingCampaignSchema.parse(campaign);
  const client = getDynamoDBClient();
  try {
    await client.send(
      new PutCommand({
        TableName: TABLE_MARKETING_CAMPAIGNS(),
        Item: campaign,
        ConditionExpression: 'attribute_not_exists(marketingCampaignId)',
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

/** The admin "Campaign Settings" enable/disable toggle. */
export async function updateMarketingCampaignStatus(
  marketingCampaignId: string,
  status: MarketingCampaignStatus,
  updatedBy: string,
): Promise<void> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  await client.send(
    new UpdateCommand({
      TableName: TABLE_MARKETING_CAMPAIGNS(),
      Key: { marketingCampaignId },
      UpdateExpression: 'SET #status = :status, updatedBy = :updatedBy, updatedAt = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status, ':updatedBy': updatedBy, ':now': now },
    }),
  );
}
