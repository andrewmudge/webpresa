#!/usr/bin/env node
// Headless-Chromium screenshot helper for local visual review (postcards, previews, etc).
// Usage: node scripts/screenshot.mjs <url> <output.png> [--width=1440] [--height=900] [--full-page] [--selector=".foo"]
//
// This sandbox has no libnspr4/libnss3/libasound2 system libraries and no sudo. The
// required .so files are pre-extracted (via `apt-get download` + `dpkg -x`, no root
// needed) into ~/.cache/webpresa-playwright-libs — see web/docs/build_log.md (2026-08
// entry) for how that was done. If that directory is missing, recreate it with:
//   mkdir -p ~/.cache/webpresa-playwright-libs
//   cd $(mktemp -d) && apt-get download libnspr4 libnss3 libasound2t64
//   for f in *.deb; do dpkg -x "$f" ~/.cache/webpresa-playwright-libs; done

import { chromium } from 'playwright';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const libDir = path.join(os.homedir(), '.cache/webpresa-playwright-libs/usr/lib/x86_64-linux-gnu');
if (fs.existsSync(libDir)) {
  process.env.LD_LIBRARY_PATH = `${libDir}:${process.env.LD_LIBRARY_PATH ?? ''}`;
}

const [, , url, outPath, ...rest] = process.argv;
if (!url || !outPath) {
  console.error('Usage: node scripts/screenshot.mjs <url> <output.png> [--width=1440] [--height=900] [--full-page] [--selector=".foo"]');
  process.exit(1);
}

const flags = Object.fromEntries(
  rest.map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? true];
  })
);

const width = Number(flags.width ?? 1440);
const height = Number(flags.height ?? 900);
const fullPage = Boolean(flags['full-page']);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url, { waitUntil: 'networkidle' });

  const target = flags.selector ? page.locator(flags.selector) : page;
  await target.screenshot({ path: outPath, fullPage });

  console.log(`Saved screenshot to ${outPath}`);
} finally {
  await browser.close();
}
