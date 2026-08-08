# Stage 22 Phase 2 (Postcard Rendering Pipeline) — second container-image
# Lambda in this repo, mirroring infra/lambda/screenshot-capture/Dockerfile
# line for line (same base image, same HOME=/tmp and aws-lambda-ric build
# fixes, discovered the hard way there — see that Dockerfile's comments for
# the full rationale of each). The only functional difference from that
# Lambda is what src/handler.ts does once Chromium is up: page.pdf(), not
# page.screenshot(), and no DynamoDB access at all (see src/aws.ts).

FROM mcr.microsoft.com/playwright:v1.49.0-noble AS base

# MUST match package.json's playwright-core version EXACTLY — see
# screenshot-capture/Dockerfile's comment; the same caret-range/browser-build
# mismatch failure mode applies identically here.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# AWS Lambda's real (non-emulator) runtime filesystem is read-only except
# /tmp — see screenshot-capture/Dockerfile's comment for why this is
# required, not optional, and how its absence fails (only on the real
# deployed Lambda, not in local Docker/RIE testing).
ENV HOME=/tmp

# aws-lambda-ric has a native (C++) component compiled at install time.
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

ENTRYPOINT ["npx", "aws-lambda-ric"]
CMD ["dist/handler.handler"]
