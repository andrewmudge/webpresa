import { V } from './tokens';

interface Props {
  businessName: string;
  rating?: number;
  reviewCount?: number;
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      className="w-6 h-6"
      viewBox="0 0 20 20"
      fill={filled ? V.accent : 'none'}
      stroke={V.accent}
      strokeWidth={filled ? 0 : 1.5}
    >
      <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.9l-5.2 2.61.99-5.79-4.21-4.1 5.82-.85L10 1.5z" />
    </svg>
  );
}

// Only rendered when the business has a verified Google rating/review count
// (reserved fields — see Business.googleRating/googleReviewCount, populated
// by Stage 12). Never fabricates a rating or review count.
export function ReviewsSection({ businessName, rating, reviewCount }: Props) {
  if (!rating || !reviewCount || reviewCount < 1) return null;

  const roundedStars = Math.round(rating);

  return (
    <section className="py-20 bg-(--site-surface)">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: V.accent }}>
          Reviews
        </p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-(--site-text) mb-6">
          Trusted by our customers
        </h2>
        <div className="flex items-center justify-center gap-1 mb-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} filled={i < roundedStars} />
          ))}
        </div>
        <p className="text-(--site-muted)">
          <span className="font-bold text-(--site-text)">{rating.toFixed(1)}</span> average rating from{' '}
          <span className="font-bold text-(--site-text)">{reviewCount}</span>{' '}
          {reviewCount === 1 ? 'review' : 'reviews'} on Google — {businessName}
        </p>
      </div>
    </section>
  );
}
