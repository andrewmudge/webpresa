export const dynamic = 'force-static';

export default function UnsubscribeConfirmedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-(--color-border) p-8 text-center">
          <span className="text-2xl font-bold text-(--color-brand)">Webpresa</span>
          <p className="mt-4 text-sm text-gray-700">You&apos;ve been unsubscribed and won&apos;t receive any more emails from this campaign.</p>
        </div>
      </div>
    </div>
  );
}
