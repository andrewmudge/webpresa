import { DiscoverPanel } from './DiscoverPanel';

export default function DiscoverPage() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Discover businesses</h1>
        <p className="text-sm text-gray-400 mt-1">
          Search Google Places by industry and location, review results, and selectively import the
          businesses you choose. Nothing is imported automatically, and no website work (Firecrawl,
          screenshots, AI generation) starts from this page — that always begins as a separate, explicit
          admin action from a business&apos;s own detail page.
        </p>
      </div>
      <DiscoverPanel />
    </div>
  );
}
