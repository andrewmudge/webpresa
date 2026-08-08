import 'server-only';
import { InvokeCommand } from '@aws-sdk/client-lambda';
import { getPostcardById, markPostcardRendered } from '@/lib/db/postcards';
import { getLambdaClient, getPostcardRenderLambdaFunctionName } from '@/lib/lambda/client';

/**
 * Stage 22 Phase 2 — invokes the postcard-render Lambda **synchronously**
 * (`InvocationType: 'RequestResponse'`), unlike Stage 14's fire-and-forget
 * screenshot capture (`lib/screenshots/capture.ts`'s `InvocationType:
 * 'Event'`). A few seconds of admin-facing wait is an acceptable tradeoff
 * here for a much simpler flow: no `queued`/`running` ScanEvent state
 * machine, no DLQ, no polling — the caller gets the rendered result (or a
 * thrown error) directly, and owns writing it to `Postcard` itself. The
 * Lambda already wrote the PDF to S3 before returning; this module only
 * ever records the resulting keys.
 */

export type PostcardSide = 'front' | 'back';

interface RenderPayload {
  postcardId: string;
  businessId: string;
  side: PostcardSide;
}

interface RenderResult {
  storageKey: string;
}

export interface RenderPostcardOutcome {
  status: 'rendered' | 'not_eligible' | 'failed';
  message?: string;
}

async function invokeRenderLambda(payload: RenderPayload): Promise<RenderResult> {
  const client = getLambdaClient();
  const response = await client.send(
    new InvokeCommand({
      FunctionName: getPostcardRenderLambdaFunctionName(),
      InvocationType: 'RequestResponse',
      Payload: Buffer.from(JSON.stringify(payload)),
    }),
  );

  const responseText = response.Payload ? Buffer.from(response.Payload).toString('utf-8') : undefined;

  if (response.FunctionError) {
    throw new Error(`Postcard render Lambda failed rendering the ${payload.side}: ${responseText ?? 'no error detail returned'}`);
  }
  if (!responseText) {
    throw new Error(`Postcard render Lambda returned no payload rendering the ${payload.side}.`);
  }
  return JSON.parse(responseText) as RenderResult;
}

/**
 * Renders both sides of a postcard and records the resulting S3 keys.
 * Refuses once the postcard is past `pending` (see `Postcard.status`'s
 * lifecycle) — re-rendering an already-approved/submitted postcard would
 * silently invalidate what an admin already reviewed and what may already
 * be on its way to Lob.
 */
export async function renderPostcardArtifacts(postcardId: string): Promise<RenderPostcardOutcome> {
  const postcard = await getPostcardById(postcardId);
  if (!postcard) return { status: 'failed', message: 'Postcard not found.' };

  if (postcard.status !== 'pending') {
    return {
      status: 'not_eligible',
      message: `This postcard is past the 'pending' stage (currently '${postcard.status}') and can no longer be re-rendered.`,
    };
  }

  try {
    const [front, back] = await Promise.all([
      invokeRenderLambda({ postcardId, businessId: postcard.businessId, side: 'front' }),
      invokeRenderLambda({ postcardId, businessId: postcard.businessId, side: 'back' }),
    ]);

    await markPostcardRendered(postcardId, { frontArtifactKey: front.storageKey, backArtifactKey: back.storageKey });

    return { status: 'rendered' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to render postcard artifacts.';
    return { status: 'failed', message };
  }
}
