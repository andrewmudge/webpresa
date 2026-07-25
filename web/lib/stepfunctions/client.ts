import 'server-only';
import { SFNClient } from '@aws-sdk/client-sfn';

/**
 * Singleton Step Functions client — Stage 16 only, used exclusively to start
 * the scan workflow execution (see `lib/workflow/run-scan-workflow.ts`).
 * Same region/credential pattern as every other AWS client in this codebase
 * (`lib/db/client.ts`, `lib/secrets/client.ts`, `lib/lambda/client.ts`).
 *
 * The `webpresa-vercel-dev` IAM identity is granted exactly one permission
 * for this client's target — `states:StartExecution` scoped to the scan
 * workflow state machine's own ARN — nothing broader.
 */

let client: SFNClient | undefined;

export function getStepFunctionsClient(): SFNClient {
  if (client) return client;

  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error('AWS_REGION environment variable is not set');
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  client = new SFNClient({
    region,
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });

  return client;
}

export function getScanWorkflowStateMachineArn(): string {
  const arn = process.env.SCAN_WORKFLOW_STATE_MACHINE_ARN;
  if (!arn) {
    throw new Error('SCAN_WORKFLOW_STATE_MACHINE_ARN environment variable is not set');
  }
  return arn;
}
