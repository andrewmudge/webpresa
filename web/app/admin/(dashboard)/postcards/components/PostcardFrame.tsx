/**
 * Postcard-shaped layout wrapper — 3:2 aspect ratio matches a standard 6"×4"
 * printed postcard. Purely presentational; front/back content is passed as
 * children.
 */
export default function PostcardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="aspect-[3/2] w-full overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
      {children}
    </div>
  );
}
