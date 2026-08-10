/**
 * Page-local palette for the postcard-access flow (`/r`, `/claim/continue`)
 * — deliberately not the app's shared `--color-page-gradient-*` tokens used
 * by `/account/claim-status` etc. (a linear blend); this flow uses two flat
 * color zones split by a wave divider instead. Kept in one place so `/r` and
 * `/claim/continue` can never drift apart — see `AccessPageShell`.
 */
export const ACCESS_BLUE_LIGHT = '#eef4fc';
export const ACCESS_BLUE = '#0d3ad9';
