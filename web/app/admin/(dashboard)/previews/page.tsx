export const dynamic = 'force-dynamic';

export default function PreviewsPage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Previews</h1>
      <p className="text-sm text-gray-500 mb-6">
        Create previews from individual business detail pages.
        A full preview list and management UI will be added in a future stage.
      </p>
      <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
        To create a preview, go to{' '}
        <a href="/admin/businesses" className="text-[--color-brand] underline">Businesses</a>
        {' '}→ click a business → &ldquo;Create test preview&rdquo;.
      </div>
    </div>
  );
}
