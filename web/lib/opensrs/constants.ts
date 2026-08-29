/**
 * OpenSRS Storefront integration constants.
 *
 * `DNS_TEMPLATE_ID` is a single, permanent DNS Template created once by hand
 * in Storefront Manager (Settings → Advanced Settings → Domain Defaults →
 * DNS Templates — see the plan's "One-time reseller-side setup"), holding
 * the same apex A / `www` CNAME values `lib/vercel/domains.ts`'s
 * `buildRoutingInstructions` already computes for the existing-domain flow.
 * One template serves every Business — tenant resolution happens inside
 * this app via `resolveActiveDomainRoute`, not via different DNS values per
 * business — so this is intentionally a single shared constant, not a
 * per-business lookup.
 *
 * Populate the real value (the Template ID shown in Storefront Manager)
 * once the PTE template is created; left empty until then so a missing
 * template fails loudly (`startDomainPurchaseAction` below) instead of
 * silently omitting `dnstemplateid` from the SSO redirect.
 */
export const OPENSRS_DNS_TEMPLATE_ID = process.env.OPENSRS_DNS_TEMPLATE_ID ?? '';
