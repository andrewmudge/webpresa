/**
 * Campaign-code display formatting and manual-entry normalization
 * (Stage 21). Deliberately split from `./code.ts` (which generates codes
 * via Node's `crypto` and carries a `server-only` guard) — these two pure,
 * dependency-free string functions are used both server-side (`app/r/actions.ts`)
 * and client-side (the admin recipient card), so this file has no
 * `server-only` guard and no Node-specific imports.
 */

/**
 * Normalize a manually-typed campaign code before lookup (`/r` manual-entry
 * page — see `app/r/actions.ts`): strip whitespace/dashes, uppercase. A
 * visitor typing a dash-grouped display copy (see
 * `formatCampaignCodeForDisplay` below) still resolves correctly, since the
 * stored/indexed value itself never has dashes. Mirrors
 * `lib/claim/token.ts`'s `normalizeClaimToken`.
 */
export function normalizeCampaignCodeInput(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Group a campaign code into dash-separated fours for display/print only
 * (`AB23-CD45-EF67-GH89`) — e.g. the admin recipient card, or whatever gets
 * printed next to a QR code as a manual-entry fallback. Purely
 * presentational: the stored `campaignCode`, the GSI lookup, and the QR
 * payload itself are never dash-grouped.
 */
export function formatCampaignCodeForDisplay(code: string): string {
  const groups: string[] = [];
  for (let i = 0; i < code.length; i += 4) {
    groups.push(code.slice(i, i + 4));
  }
  return groups.join('-');
}
