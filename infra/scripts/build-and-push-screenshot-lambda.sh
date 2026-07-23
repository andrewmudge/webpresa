#!/usr/bin/env bash
# Builds and pushes the Stage 14 (Playwright Screenshots) container image to
# its dedicated ECR repository. A deliberate, separate step from
# `cdk deploy` — see infra/lib/constructs/webpresa-screenshot-lambda.ts for
# why this stage references a pre-pushed image by tag rather than letting
# CDK build one automatically via `fromImageAsset`.
#
# Usage:
#   ./scripts/build-and-push-screenshot-lambda.sh [env] [profile]
#
# Defaults: env=dev, profile=webpresa
#
# Prerequisites:
#   - Docker running locally
#   - `aws sso login --profile <profile>` already done
#   - The webpresa-{env}-screenshot-capture ECR repository already exists
#     (created by `cdk deploy WebpresaDevScreenshotStack`) — run the CDK
#     deploy for the ECR repository itself before the very first image push.

set -euo pipefail

ENV_NAME="${1:-dev}"
PROFILE="${2:-webpresa}"
REPO_NAME="webpresa-${ENV_NAME}-screenshot-capture"
IMAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../lambda/screenshot-capture" && pwd)"

echo "Environment:      ${ENV_NAME}"
echo "AWS profile:       ${PROFILE}"
echo "ECR repository:    ${REPO_NAME}"
echo "Build context:     ${IMAGE_DIR}"
echo

ACCOUNT_ID="$(aws sts get-caller-identity --profile "${PROFILE}" --query Account --output text)"
REGION="$(aws configure get region --profile "${PROFILE}")"
if [ -z "${REGION}" ]; then
  echo "No region configured for profile ${PROFILE} — set AWS_REGION or configure the profile's default region." >&2
  exit 1
fi

REPO_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}"

echo "Logging in to ECR (${REPO_URI})..."
aws ecr get-login-password --profile "${PROFILE}" --region "${REGION}" \
  | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "Building image..."
docker build --platform linux/amd64 -t "${REPO_NAME}:latest" "${IMAGE_DIR}"

docker tag "${REPO_NAME}:latest" "${REPO_URI}:latest"

echo "Pushing ${REPO_URI}:latest ..."
docker push "${REPO_URI}:latest"

echo
echo "Done. cdk deploy for the screenshot stack can now find this image."
echo "Reminder: this script does not deploy any AWS resource change itself —"
echo "it only builds and pushes the image. Run 'cdk diff'/'cdk deploy' for"
echo "the Lambda function's own configuration separately, with approval."
