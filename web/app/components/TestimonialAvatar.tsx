import Image from 'next/image';

interface Props {
  name: string;
  photoUrl?: string;
  size?: 'sm' | 'md';
  /** Applied to the circle container — lets callers theme the initials
   *  fallback (e.g. the public template ties it to `--site-primary`).
   *  Defaults to a neutral gray, since this component is also used inside
   *  the admin dashboard, which has no per-business `--site-*` theme. */
  className?: string;
  style?: React.CSSProperties;
}

const SIZE_CLASSES: Record<NonNullable<Props['size']>, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-11 h-11 text-sm',
};

/**
 * A reviewer/testimonial-author avatar: a real photo when one exists
 * (Google-sourced reviews only), otherwise a circle showing the author's
 * first initial — used for every manually-added testimonial, which has no
 * photo field at all. Shared between the admin `GoogleReviewsPanel` and the
 * public `TestimonialCard`, so it lives outside `app/b/[slug]/template/`.
 */
export function TestimonialAvatar({ name, photoUrl, size = 'md', className, style }: Props) {
  const dimension = SIZE_CLASSES[size];
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  if (photoUrl) {
    return (
      <div className={`relative ${dimension} rounded-full overflow-hidden flex-shrink-0`}>
        {/* Google's photo CDN (lh3.googleusercontent.com) commonly rejects
            requests carrying a Referer header from an unrecognized origin —
            most visibly on localhost during development, where it 404s and
            shows as a broken image. Stripping the referrer avoids that. */}
        <Image src={photoUrl} alt={name} fill sizes="48px" className="object-cover" referrerPolicy="no-referrer" />
      </div>
    );
  }

  return (
    <div
      className={`flex-shrink-0 ${dimension} rounded-full flex items-center justify-center font-bold ${className ?? 'bg-gray-200 text-gray-600'}`}
      style={style}
    >
      {initial}
    </div>
  );
}
