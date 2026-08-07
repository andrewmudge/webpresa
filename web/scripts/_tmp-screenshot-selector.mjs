import { chromium } from 'playwright';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const libDir = path.join(os.homedir(), '.cache/webpresa-playwright-libs/usr/lib/x86_64-linux-gnu');
if (fs.existsSync(libDir)) {
  process.env.LD_LIBRARY_PATH = `${libDir}:${process.env.LD_LIBRARY_PATH ?? ''}`;
}

const [, , url, outPath] = process.argv;
const token = fs.readFileSync('/tmp/claude-1000/-home-mudge-apps-webpresa/f8562d86-8608-4632-9ffb-7b0e3b5f9593/scratchpad/session-token.txt', 'utf8').trim();

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  await context.addCookies([
    { name: 'webpresa_admin_session', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' },
  ]);
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const front = page.getByText('FRONT — CLICK TO ENLARGE').locator('..').locator('div').first();
  await front.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: outPath, fullPage: true });
} finally {
  await browser.close();
}
