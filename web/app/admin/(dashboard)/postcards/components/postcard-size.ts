/**
 * Lob "6x9" jumbo postcard dimensions (confirmed 2026-08-05). The trim
 * size — what the recipient actually holds after cutting — is 6"×9"
 * landscape. The print artwork file must be produced larger, at 6.25"×9.25"
 * (0.125"/⅛" bleed added to all four sides of the trim size), so background
 * artwork extends past the cut line and no unprinted white edge appears
 * from production cutting tolerance. Essential content (text/QR/address)
 * must in turn stay at least 0.125" *inside* the trim edge — a 5.75"×8.75"
 * safe zone — so it isn't clipped by real-world cutting tolerance either.
 *
 * These are the authoritative numbers for both the admin preview (this
 * folder) and the eventual Lambda `page.pdf()` rendering pipeline (Phase 2,
 * not yet built) — the rendered PDF handed to Lob must be sized to
 * `POSTCARD_BLEED_SIZE_INCHES`, not `POSTCARD_TRIM_SIZE_INCHES`, and that
 * pipeline is what must actually enforce the safe zone pixel-for-pixel; the
 * live-rendered HTML mockup in this folder only *shows* the boundary as a
 * visual guide, it doesn't yet guarantee every element respects it.
 */
export const POSTCARD_TRIM_SIZE_INCHES = { width: 9, height: 6 };
export const POSTCARD_BLEED_INCHES = 0.125;
export const POSTCARD_BLEED_SIZE_INCHES = {
  width: POSTCARD_TRIM_SIZE_INCHES.width + POSTCARD_BLEED_INCHES * 2,
  height: POSTCARD_TRIM_SIZE_INCHES.height + POSTCARD_BLEED_INCHES * 2,
};

/** Inset from the trim edge (not the bleed edge) that essential content must clear. */
export const POSTCARD_SAFE_ZONE_INCHES = 0.125;
export const POSTCARD_SAFE_ZONE_SIZE_INCHES = {
  width: POSTCARD_TRIM_SIZE_INCHES.width - POSTCARD_SAFE_ZONE_INCHES * 2,
  height: POSTCARD_TRIM_SIZE_INCHES.height - POSTCARD_SAFE_ZONE_INCHES * 2,
};

/**
 * Inset percentages (of the full bleed canvas) for the trim and safe-zone
 * guide lines — shared by `PostcardFrame` (draws the guide overlays) and
 * `PostcardFront` (pads its content wrapper to at least the safe-zone
 * inset, expressed as `cqw`/`cqh` container-query units so it tracks the
 * card's actual rendered width/height rather than the viewport).
 */
export const POSTCARD_TRIM_INSET_PERCENT = {
  x: (POSTCARD_BLEED_INCHES / POSTCARD_BLEED_SIZE_INCHES.width) * 100,
  y: (POSTCARD_BLEED_INCHES / POSTCARD_BLEED_SIZE_INCHES.height) * 100,
};

export const POSTCARD_SAFE_ZONE_INSET_PERCENT = {
  x: ((POSTCARD_BLEED_INCHES + POSTCARD_SAFE_ZONE_INCHES) / POSTCARD_BLEED_SIZE_INCHES.width) * 100,
  y: ((POSTCARD_BLEED_INCHES + POSTCARD_SAFE_ZONE_INCHES) / POSTCARD_BLEED_SIZE_INCHES.height) * 100,
};

/**
 * Lob's "ink-free zone" on the postcard *back* (confirmed against Lob's
 * live docs, help.lob.com — "all other postcard sizes" than 4x6, which
 * covers 6x9): a 4"×2.375" block where Lob automatically overlays the
 * recipient's address and USPS postage indicia. Anything our own artwork
 * puts there simply isn't printed — Lob's own docs: "Anything in the
 * address block area will not be printed, as this space is where the
 * postage and address information will be printed during production." So
 * this isn't a safety requirement the way the safe zone above is (nothing
 * gets clipped), but `PostcardBack` still reserves it and skips drawing
 * real address text inside it when rendering the actual print artifact
 * (`showGuides={false}`) — no point drawing text that will be discarded,
 * and it keeps the *admin preview* (`showGuides={true}`) honest that the
 * recipient address shown there is illustrative, not what actually prints.
 * Offsets are measured from the bleed edge ("including bleed"), per Lob's
 * own documented convention — matching how every other measurement in
 * this file is anchored.
 */
export const POSTCARD_INK_FREE_ZONE_INCHES = { width: 4, height: 2.375 };
export const POSTCARD_INK_FREE_ZONE_OFFSET_INCHES = { right: 0.275, bottom: 0.25 };

/** Same block, expressed as a percentage of the full bleed canvas — for positioning via `cqw`/`cqh` in `PostcardBack`, the same convention every other postcard component uses. */
export const POSTCARD_INK_FREE_ZONE_PERCENT = {
  width: (POSTCARD_INK_FREE_ZONE_INCHES.width / POSTCARD_BLEED_SIZE_INCHES.width) * 100,
  height: (POSTCARD_INK_FREE_ZONE_INCHES.height / POSTCARD_BLEED_SIZE_INCHES.height) * 100,
  right: (POSTCARD_INK_FREE_ZONE_OFFSET_INCHES.right / POSTCARD_BLEED_SIZE_INCHES.width) * 100,
  bottom: (POSTCARD_INK_FREE_ZONE_OFFSET_INCHES.bottom / POSTCARD_BLEED_SIZE_INCHES.height) * 100,
};
