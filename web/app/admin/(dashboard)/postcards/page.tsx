export const dynamic = 'force-dynamic';

export default function PostcardsPage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Postcards</h1>
      <p className="text-sm text-gray-500 mb-6">Read-only view of all postcard records.</p>
      <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
        Postcard submission will be available in a future stage — Postcard Service.
      </div>
    </div>
  );
}
