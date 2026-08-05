import Link from 'next/link';
import { listAllPostcards } from '@/lib/db/postcards';
import { listAllBusinesses } from '@/lib/db/businesses';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  submitting: 'bg-amber-50 text-amber-700',
  submitted: 'bg-blue-50 text-blue-700',
  mailed: 'bg-blue-50 text-blue-700',
  delivered: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
};

export default async function PostcardsPage() {
  const [postcards, businesses] = await Promise.all([listAllPostcards(), listAllBusinesses()]);
  const businessById = new Map(businesses.map((b) => [b.businessId, b]));

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Postcards</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {postcards.length} total — generate a postcard from a campaign recipient&apos;s{' '}
          <Link href="/admin/campaigns" className="text-(--color-brand) hover:underline">
            campaign detail page
          </Link>
          .
        </p>
      </div>

      {postcards.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <p className="text-lg mb-2">No postcards yet</p>
          <p className="text-sm">
            Open a{' '}
            <Link href="/admin/campaigns" className="text-(--color-brand) hover:underline">
              campaign
            </Link>{' '}
            and generate one from a recipient row.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-(--color-border) bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reviewed</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {postcards.map((postcard) => (
                <tr key={postcard.postcardId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/postcards/${postcard.postcardId}`} className="font-medium text-(--color-brand) hover:underline">
                      {businessById.get(postcard.businessId)?.name ?? postcard.businessId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 uppercase text-gray-600">{postcard.provider}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[postcard.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {postcard.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{postcard.reviewedAt ? 'Yes' : '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(postcard.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
