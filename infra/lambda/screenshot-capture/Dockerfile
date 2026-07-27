# Stage 14 (Playwright Screenshots) — the project's first container-image
# Lambda. Base image is Microsoft's official Playwright image, which already
# ships Chromium plus every OS-level dependency it needs (fonts, codecs,
# etc.) — reproducing that dependency list by hand on a bare
# public.ecr.aws/lambda/nodejs base is exactly the packaging fragility
# implementation.md's original Stage 14 draft warned about ("container
# images if browser packaging is unreliable in a standard Lambda bundle").
# The AWS Lambda Runtime Interface Client (aws-lambda-ric) adapts this
# otherwise-ordinary Node.js image to Lambda's invocation protocol.
#
# Build/push is a deliberate, separate step from `cdk deploy` — see
# infra/scripts/build-and-push-screenshot-lambda.sh. CDK references this
# image by tag (ecr.Repository + DockerImageCode.fromEcr), it does not build
# it — see infra/lib/constructs/webpresa-screenshot-lambda.ts for why.

FROM mcr.microsoft.com/playwright:v1.49.0-noble AS base

# MUST match package.json's playwright-core version EXACTLY (an exact pin,
# no ^ range) — confirmed the hard way, by actually launching Chromium
# inside a locally built image: a caret range let npm resolve a newer
# playwright-core than this image's installed browser build, and the
# mismatch fails at launch (`Executable doesn't exist at ...`), not at
# `docker build` or `tsc` time. Bump both together, deliberately, never one
# alone.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# AWS Lambda's real (non-emulator) runtime filesystem is read-only except
# /tmp. The base image's default HOME (/root, running as root) is fine for
# local Docker/RIE testing — that container filesystem is fully writable —
# but Chromium crashes immediately on launch in the real deployed Lambda
# when it can't create its profile/cache dir there. This is exactly why
# pre-deploy RIE smoke tests (see build_log.md, Stage 14) passed but the
# first real invocation failed with "Target page, context or browser has
# been closed" the instant a page/context was created.
ENV HOME=/tmp

# aws-lambda-ric has a native (C++) component compiled at install time —
# needs cmake + a working toolchain, which the base Playwright image does
# not include by default.
RUN apt-get update \
    && apt-get install -y --no-install-recommends cmake build-essential libcurl4-openssl-dev autoconf automake libtool pkg-config unzip python3-setuptools \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/task

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY tsconfig.json ./
COPY src ./src
RUN npm install --no-save typescript@^5 \
    && npx tsc \
    && npm uninstall --no-save typescript

# Lambda Runtime Interface Client — makes this a normal Node.js container
# respond to the Lambda invocation API. `dist/handler.handler` is the
# compiled entrypoint (see tsconfig.json's outDir).
ENTRYPOINT ["npx", "aws-lambda-ric"]
CMD ["dist/handler.handler"]
