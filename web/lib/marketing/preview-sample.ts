/**
 * Lightweight, client-safe variable substitution using representative
 * sample data — for the Email Templates admin page's live-as-you-type
 * preview pane only. Deliberately NOT the same function as
 * `renderTemplate()` (server-only, needs the click-token secret and a real
 * business) — this preview trades exact fidelity for being usable in a
 * client component with no server round-trip. "Send Test Email" is what
 * guarantees true WYSIWYG parity with a real send, by calling
 * `renderTemplate()` server-side instead of this.
 */
const SAMPLE_VALUES: Record<string, string> = {
  businessName: 'Pensacola Plumbing Co.',
  previewUrl: 'https://webpresa.com/b/pensacola-plumbing-co',
  unsubscribeUrl: 'https://webpresa.com/unsubscribe/sample-token',
};

export function renderPreviewSample(text: string): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (full, name: string) => SAMPLE_VALUES[name] ?? full);
}
