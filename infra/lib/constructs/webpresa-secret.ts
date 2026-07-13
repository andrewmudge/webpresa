import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

// ---------------------------------------------------------------------------
// Construct props
// ---------------------------------------------------------------------------

export interface WebpresaSecretProps {
  readonly config: EnvironmentConfig;
  /**
   * Short secret name without prefix or environment suffix.
   *
   * The full Secrets Manager secret name is constructed as:
   *   `webpresa-{config.suffix}-{secretName}`
   *
   * Example:
   *   'openai'  →  'webpresa-dev-openai'
   */
  readonly secretName: string;
  readonly description: string;
  /**
   * JSON keys the secret's value must contain, e.g. `['apiKey']` or
   * `['secretKey', 'webhookSecret']`.
   *
   * The first key receives a securely-generated random placeholder value at
   * creation time (via Secrets Manager `GenerateSecretString` — the value
   * never appears in the CDK synth output or CloudFormation template).
   * Remaining keys are seeded with an empty-string placeholder.
   *
   * CloudFormation only re-generates `GenerateSecretString` when its
   * properties change, so once a real value is written out-of-band (e.g.
   * `aws secretsmanager put-secret-value`), subsequent `cdk deploy` runs do
   * not overwrite it as long as `jsonKeys` is not edited.
   */
  readonly jsonKeys: string[];
}

// ---------------------------------------------------------------------------
// Reusable secret construct
// ---------------------------------------------------------------------------

/**
 * WebpresaSecret — standard Secrets Manager secret for the Webpresa platform.
 *
 * Automatically configured per environment:
 *   - Explicit secret name:   webpresa-{suffix}-{secretName}
 *   - Initial value:          random placeholder (first jsonKeys entry) +
 *                             empty-string placeholders (remaining keys) —
 *                             never a real secret value
 *   - Removal policy:         DESTROY (dev) | RETAIN (prod)
 *   - CloudFormation outputs: SecretArn
 *
 * Real values are populated out-of-band after deployment, e.g.:
 *
 *   aws secretsmanager put-secret-value \
 *     --secret-id webpresa-dev-openai \
 *     --secret-string '{"apiKey":"sk-..."}' \
 *     --profile webpresa
 *
 * Adding a future secret requires only:
 *
 *   new WebpresaSecret(this, 'MyService', {
 *     config,
 *     secretName: 'my-service',
 *     description: 'My Service API credentials',
 *     jsonKeys: ['apiKey'],
 *   });
 */
export class WebpresaSecret extends Construct {
  /** The underlying CDK Secret — exposed for granting permissions. */
  public readonly secret: secretsmanager.Secret;

  /** Full Secrets Manager secret name as deployed, e.g. `webpresa-dev-openai`. */
  public readonly fullSecretName: string;

  constructor(scope: Construct, id: string, props: WebpresaSecretProps) {
    super(scope, id);

    this.fullSecretName = `webpresa-${props.config.suffix}-${props.secretName}`;

    const [generateStringKey, ...remainingKeys] = props.jsonKeys;
    const secretStringTemplate = JSON.stringify(
      Object.fromEntries(remainingKeys.map((key) => [key, ''])),
    );

    this.secret = new secretsmanager.Secret(this, 'Secret', {
      secretName: this.fullSecretName,
      description: props.description,
      removalPolicy: props.config.removalPolicy,
      generateSecretString: {
        secretStringTemplate,
        generateStringKey,
        excludePunctuation: true,
      },
    });

    // ── CloudFormation outputs ───────────────────────────────────────────
    new cdk.CfnOutput(this, 'SecretArn', {
      value: this.secret.secretArn,
      exportName: `${this.fullSecretName}-arn`,
      description: `Secrets Manager secret ARN: ${this.fullSecretName}`,
    });
  }
}
