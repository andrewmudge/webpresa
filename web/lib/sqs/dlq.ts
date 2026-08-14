import 'server-only';
import { GetQueueAttributesCommand } from '@aws-sdk/client-sqs';
import { getSqsClient } from './client';

/**
 * Stage 24 — read-only depth check for the Stage 14 screenshot Lambda's
 * dead-letter queue. This DLQ has existed since Stage 14 (see
 * `infra/lib/constructs/webpresa-screenshot-lambda.ts`) with zero consumers
 * and zero admin/CLI visibility until now — a genuine gap, not a redesign:
 * the queue itself is unchanged, this only reports its
 * `ApproximateNumberOfMessagesVisible` attribute.
 *
 * `webpresa-vercel-{env}` is granted exactly `sqs:GetQueueAttributes` on
 * this one queue's ARN — never `ReceiveMessage`/`DeleteMessage` — see
 * `infra/lib/stacks/vercel-access-stack.ts`'s `ScreenshotDlqDepthRead`
 * statement. This module never drains or consumes DLQ messages.
 */

export function getScreenshotDlqUrl(): string {
  const url = process.env.SCREENSHOT_DLQ_URL;
  if (!url) {
    throw new Error('SCREENSHOT_DLQ_URL environment variable is not set');
  }
  return url;
}

export interface DlqDepth {
  approximateMessageCount: number;
}

/**
 * Returns the DLQ's approximate visible-message count. Never throws on a
 * misconfigured/missing queue URL or a failed AWS call — callers (the
 * Operations page) treat an unavailable depth reading as "unknown," not as
 * a page-breaking error, since this is a diagnostic signal, not a
 * correctness dependency.
 */
export async function getScreenshotDlqDepth(): Promise<DlqDepth | null> {
  let queueUrl: string;
  try {
    queueUrl = getScreenshotDlqUrl();
  } catch {
    return null;
  }

  try {
    const client = getSqsClient();
    const result = await client.send(
      new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ['ApproximateNumberOfMessages'],
      }),
    );
    const raw = result.Attributes?.ApproximateNumberOfMessages;
    const approximateMessageCount = raw ? Number.parseInt(raw, 10) : 0;
    return { approximateMessageCount: Number.isFinite(approximateMessageCount) ? approximateMessageCount : 0 };
  } catch {
    return null;
  }
}
