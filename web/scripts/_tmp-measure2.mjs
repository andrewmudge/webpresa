import { chromium } from 'playwright';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const libDir = path.join(os.homedir(), '.cache/webpresa-playwright-libs/usr/lib/x86_64-linux-gnu');
if (fs.existsSync(libDir)) {
  process.env.LD_LIBRARY_PATH = `${libDir}:${process.env.LD_LIBRARY_PATH ?? ''}`;
}

const token = fs.readFileSync('/tmp/claude-1000/-home-mudge-apps-webpresa/f8562d86-8608-4632-9ffb-7b0e3b5f9593/scratchpad/session-token.txt', 'utf8').trim();
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  await context.addCookies([
    { name: 'webpresa_admin_session', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' },
  ]);
  const page = await context.newPage();
  await page.goto('http://localhost:3000/admin/postcards/postcard_7f643f31-60fa-4b75-9649-40083e458ce8', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const front = page.getByText('FRONT — CLICK TO ENLARGE').locator('..').locator('div').first();
  await front.click();
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => {
    const frames = Array.from(document.querySelectorAll('*')).filter((el) => getComputedStyle(el).containerType === 'size');
    const frame = frames.reduce((a, b) => (a.getBoundingClientRect().width > b.getBoundingClientRect().width ? a : b));
    const frameRect = frame.getBoundingClientRect();
    const laptopSvg = Array.from(frame.querySelectorAll('svg')).find((s) => s.getAttribute('viewBox') === '0 0 1030 701');
    const laptopRect = laptopSvg.getBoundingClientRect();
    const candidates = Array.from(frame.querySelectorAll('*')).filter((el) => el.textContent.includes('MODERN') && el.textContent.includes('EDIT ANYTIME'));
    const featureRow = candidates.reduce((a, b) => (a.getBoundingClientRect().width < b.getBoundingClientRect().width ? a : b));
    const featureRowRect = featureRow.getBoundingClientRect();
    const safeYPercent = ((0.125 + 0.125) / 6.25) * 100;
    const safeTopY = frameRect.top + frameRect.height * (safeYPercent / 100);
    return {
      frame: { left: frameRect.left, top: frameRect.top, width: frameRect.width, height: frameRect.height },
      laptop: { left: laptopRect.left, right: laptopRect.right, top: laptopRect.top, bottom: laptopRect.bottom, width: laptopRect.width, height: laptopRect.height },
      featureRow: featureRowRect ? { left: featureRowRect.left, right: featureRowRect.right, top: featureRowRect.top, bottom: featureRowRect.bottom, width: featureRowRect.width, height: featureRowRect.height } : null,
      safeTopY,
      safeYPercent,
    };
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
