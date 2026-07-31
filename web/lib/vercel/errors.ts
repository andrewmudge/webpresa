export const VERCEL_ERROR_CATEGORIES = [
  'auth',
  'rate_limit',
  'timeout',
  'provider_error',
  'unreachable',
  'domain_already_in_use',
  'not_found',
  'unknown',
] as const;
export type VercelErrorCategory = (typeof VERCEL_ERROR_CATEGORIES)[number];

export class VercelApiError extends Error {
  category: VercelErrorCategory;
  httpStatus?: number;

  constructor(category: VercelErrorCategory, message: string, opts?: { httpStatus?: number }) {
    super(message);
    this.name = 'VercelApiError';
    this.category = category;
    this.httpStatus = opts?.httpStatus;
  }
}

export function categorizeHttpError(status: number): VercelErrorCategory {
  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'not_found';
  if (status === 409) return 'domain_already_in_use';
  if (status === 429) return 'rate_limit';
  if (status === 408) return 'timeout';
  if (status >= 500) return 'provider_error';
  return 'unknown';
}
