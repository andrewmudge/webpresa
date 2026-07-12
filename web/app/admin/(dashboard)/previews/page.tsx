export const dynamic = 'force-dynamic';

export default function PreviewsPage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Previews</h1>
      <p className="text-sm text-gray-500 mb-6">Read-only view of all site previews.</p>
      <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
        Preview management will be available in Stage 8 — Dynamic Business Preview Website.
      </div>
    </div>
  );
}
