import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GooglePlaceReview } from '@/domain/schemas/google-places.schema';

const { mockGetPlaceReviews } = vi.hoisted(() => ({
  mockGetPlaceReviews: vi.fn(),
}));

vi.mock('../client', () => ({
  getPlaceReviews: mockGetPlaceReviews,
}));

vi.mock('server-only', () => ({}));

import { mapGoogleReviewToTestimonial, fetchAndMapGoogleReviews } from '../reviews';

describe('mapGoogleReviewToTestimonial', () => {
  it('maps every Google review field onto a source: "google" testimonial', () => {
    const review: GooglePlaceReview = {
      name: 'places/place_1/reviews/review_1',
      rating: 5,
      text: { text: 'Fantastic service, highly recommend!' },
      authorAttribution: {
        displayName: 'Jane D.',
        uri: 'https://www.google.com/maps/contrib/12345',
        photoUri: 'https://lh3.googleusercontent.com/a/abc123',
      },
      relativePublishTimeDescription: '2 months ago',
      publishTime: '2026-05-01T00:00:00Z',
    };

    const mapped = mapGoogleReviewToTestimonial(review);

    expect(mapped).toEqual({
      id: 'places/place_1/reviews/review_1',
      author: 'Jane D.',
      quote: 'Fantastic service, highly recommend!',
      source: 'google',
      hidden: false,
      rating: 5,
      authorPhotoUrl: 'https://lh3.googleusercontent.com/a/abc123',
      authorProfileUrl: 'https://www.google.com/maps/contrib/12345',
      googleReviewId: 'places/place_1/reviews/review_1',
      publishTimeDescription: '2 months ago',
    });
  });

  it('falls back to originalText when text is absent', () => {
    const mapped = mapGoogleReviewToTestimonial({ originalText: { text: 'Great work.' } });
    expect(mapped?.quote).toBe('Great work.');
  });

  it('falls back to a generic author name when authorAttribution is absent', () => {
    const mapped = mapGoogleReviewToTestimonial({ text: { text: 'Great work.' } });
    expect(mapped?.author).toBe('Google user');
  });

  it('returns null for a review with no usable text', () => {
    expect(mapGoogleReviewToTestimonial({ rating: 4 })).toBeNull();
  });
});

describe('fetchAndMapGoogleReviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and maps every review, dropping text-less ones', async () => {
    mockGetPlaceReviews.mockResolvedValue([
      { text: { text: 'Great!' }, authorAttribution: { displayName: 'Jane D.' } },
      { rating: 3 }, // no text — must be dropped
    ]);

    const testimonials = await fetchAndMapGoogleReviews('place_1');

    expect(mockGetPlaceReviews).toHaveBeenCalledWith('place_1');
    expect(testimonials).toHaveLength(1);
    expect(testimonials[0].author).toBe('Jane D.');
  });

  it('lets a client error propagate — callers decide fatal vs. non-fatal', async () => {
    mockGetPlaceReviews.mockRejectedValue(new Error('boom'));
    await expect(fetchAndMapGoogleReviews('place_1')).rejects.toThrow('boom');
  });
});
