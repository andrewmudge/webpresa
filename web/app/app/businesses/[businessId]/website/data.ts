import { cache } from 'react';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';

/**
 * React `cache()`-memoized per-request wrapper. The website editor page
 * renders every section independently (each wrapped in its own `<Suspense>`
 * so the page can stream in rather than blocking on everything at once —
 * see `page.tsx`), and several sections (Content, Services, Photos, Contact,
 * SEO) all need the business's latest `SitePreview`. `cache()` ensures that,
 * no matter how many sibling sections ask for it, only one DynamoDB query
 * actually runs per page load — the first section to await it triggers the
 * fetch, and every other section reads the same already-resolved promise.
 */
export const getCachedPreviews = cache(listPreviewsForBusiness);
