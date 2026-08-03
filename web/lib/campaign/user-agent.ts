import 'server-only';
import { UAParser } from 'ua-parser-js';
import type { DeviceClass } from '@/domain/models/scan-hit';

export interface ParsedUserAgent {
  deviceClass: DeviceClass;
  browserFamily?: string;
  operatingSystem?: string;
}

/**
 * Parses a raw `User-Agent` header into a coarse device class, browser
 * family, and OS for `ScanHit` analytics — heuristic, best-effort, never
 * presented as exact (see implementation.md, Stage 21, "Analytics").
 *
 * `device.type` is `undefined` for ordinary desktop browsers (ua-parser-js
 * only sets it for mobile/tablet/console/smarttv/wearable/embedded), so a
 * missing value is treated as `'desktop'`; any other recognized-but-unhandled
 * type (console, smarttv, wearable, embedded, xr) falls back to `'unknown'`
 * rather than being misreported as a phone or a desktop.
 */
export function parseUserAgent(userAgent: string): ParsedUserAgent {
  const { device, browser, os } = new UAParser(userAgent).getResult();

  const deviceClass: DeviceClass =
    device.type === 'mobile' ? 'mobile' : device.type === 'tablet' ? 'tablet' : device.type === undefined ? 'desktop' : 'unknown';

  return {
    deviceClass,
    ...(browser.name !== undefined && { browserFamily: browser.name }),
    ...(os.name !== undefined && { operatingSystem: os.name }),
  };
}
