import 'server-only';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { EmailTemplate, EmailSequence } from '@/domain/models/email-template';
import { EmailTemplateSchema } from '@/domain/schemas/email-template.schema';
import { getDynamoDBClient, TABLE_MARKETING_EMAIL_TEMPLATES } from './client';

export async function getEmailTemplate(marketingCampaignId: string, emailSequence: EmailSequence): Promise<EmailTemplate | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_MARKETING_EMAIL_TEMPLATES(),
      Key: { marketingCampaignId, emailSequence },
    }),
  );
  if (!result.Item) return null;
  return EmailTemplateSchema.parse(result.Item);
}

/** All 3 steps of one campaign, ordered by `emailSequence` ascending — the Email Templates admin page's sole read. */
export async function listEmailTemplates(marketingCampaignId: string): Promise<EmailTemplate[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_MARKETING_EMAIL_TEMPLATES(),
      KeyConditionExpression: 'marketingCampaignId = :marketingCampaignId',
      ExpressionAttributeValues: { ':marketingCampaignId': marketingCampaignId },
    }),
  );
  return (result.Items ?? []).map((item) => EmailTemplateSchema.parse(item));
}

/** First-ever-seeding guard — used by `ensureMarketingCampaignExists()` to seed the 3 default templates without ever overwriting an admin's existing customization. */
export async function putEmailTemplateIfNotExists(template: EmailTemplate): Promise<boolean> {
  EmailTemplateSchema.parse(template);
  const client = getDynamoDBClient();
  try {
    await client.send(
      new PutCommand({
        TableName: TABLE_MARKETING_EMAIL_TEMPLATES(),
        Item: template,
        ConditionExpression: 'attribute_not_exists(marketingCampaignId)',
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

/** Unconditional overwrite — the admin "Save"/"Reset to default" actions, both of which are meant to replace whatever is there. */
export async function putEmailTemplate(template: EmailTemplate): Promise<void> {
  EmailTemplateSchema.parse(template);
  const client = getDynamoDBClient();
  await client.send(
    new PutCommand({
      TableName: TABLE_MARKETING_EMAIL_TEMPLATES(),
      Item: template,
    }),
  );
}
