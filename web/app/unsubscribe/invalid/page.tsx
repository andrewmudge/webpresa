export const dynamic = 'force-static';

export default function UnsubscribeInvalidPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-(--color-border) p-8 text-center">
          <span className="text-2xl font-bold text-(--color-brand)">Webpresa</span>
          <p className="mt-4 text-sm text-gray-700">This unsubscribe link isn&apos;t valid. If you&apos;re still receiving unwanted email, reply to any message and let us know.</p>
        </div>
      </div>
    </div>
  );
}
