import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ businessId: string }>;
}

/**
 * `/design` was folded into `/website`'s own Theme/Photos tabs (Stage
 * 19.A) — every field it used to expose (Theme, all 6 photo slots) was
 * already independently editable there, writing through the identical
 * `lib/customer-editing/*` functions via a different action name. This
 * route now exists only to forward old links/bookmarks; it does its own
 * session/ownership checks by simply falling through to `/website`, which
 * re-verifies everything itself.
 */
export default async function DesignRedirectPage({ params }: Props) {
  const { businessId } = await params;
  redirect(`/app/businesses/${businessId}/website#theme`);
}
