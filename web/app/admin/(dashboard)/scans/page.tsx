export const dynamic = 'force-dynamic';

export default function ScansPage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Scans</h1>
      <p className="text-sm text-gray-500 mb-6">Read-only view of all scan events.</p>
      <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
        Scan execution will be available in a future stage — Website Scanner.
      </div>
    </div>
  );
}
