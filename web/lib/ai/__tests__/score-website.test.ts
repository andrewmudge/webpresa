/**
 * Unit tests for scoreWebsite. The OpenAI client is mocked — no real API calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockParse = vi.hoisted(() => vi.fn());
const mockGetOpenAiClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/ai/client', () => ({
  getOpenAiClient: mockGetOpenAiClient,
  getOpenAiScoringModel: () => 'gpt-5.5',
}));

vi.mock('server-only', () => ({}));

import { scoreWebsite } from '@/lib/ai/score-website';
import type { Business } from '@/domain/models/business';
import { ASSESSMENT_CATEGORIES, type WebsiteDeterministicMetrics } from '@/domain/models/website-assessment';

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_00000000-0000-0000-0000-000000000001',
    slug: 'acme-plumbing',
    name: 'Acme Plumbing',
    industry: 'plumbing',
    source: 'google_places',
    status: 'pending',
    websiteUrl: 'https://acmeplumbing.example.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const VALID_METRICS: WebsiteDeterministicMetrics = {
  websiteExists: true,
  httpsEnabled: true,
  crawlSucceeded: true,
  desktopScreenshotCaptured: true,
  mobileScreenshotCaptured: true,
  googlePlacesDataAvailable: true,
  businessCategory: 'plumbing',
  phoneDetected: true,
  emailDetected: false,
  contactFormDetected: true,
  socialProfilesDetected: false,
  hoursDetected: false,
  servicesDetected: true,
  heroImageAvailable: true,
};

const oneCategory = { score: 70, explanation: 'Reasonably clear.', suggestedImprovement: 'Add more detail.' };
const VALID_MODEL_OUTPUT = {
  overallScore: 68,
  confidence: 'medium' as const,
  leadPriority: 'medium' as const,
  qualification: 'qualified' as const,
  categories: Object.fromEntries(ASSESSMENT_CATEGORIES.map((c) => [c, oneCategory])),
  strengths: ['Clear service list'],
  weaknesses: ['No visible trust signals'],
  missingOpportunities: ['Testimonials'],
  executiveSummary: 'A serviceable but dated website with room to grow.',
  topProblems: ['No testimonials', 'Weak calls to action'],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOpenAiClient.mockResolvedValue({ chat: { completions: { parse: mockParse } } });
});

describe('scoreWebsite — success', () => {
  it('returns a validated assessment with schemaVersion and generatedAt attached', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });

    const result = await scoreWebsite({ business: makeBusiness(), metrics: VALID_METRICS });

    expect(result.assessment.schemaVersion).toBe('1');
    expect(result.assessment.overallScore).toBe(68);
    expect(result.assessment.generatedAt).toBeTruthy();
    expect(result.metadata.model).toBe('gpt-5.5');
  });

  it('includes image_url content parts only for screenshots that were actually provided', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });

    await scoreWebsite({
      business: makeBusiness(),
      metrics: VALID_METRICS,
      screenshots: { desktopUrl: 'https://signed.example.com/desktop.png' },
    });

    const call = mockParse.mock.calls[0][0];
    const userMessage = call.messages.find((m: { role: string }) => m.role === 'user');
    expect(Array.isArray(userMessage.content)).toBe(true);
    const imageParts = userMessage.content.filter((p: { type: string }) => p.type === 'image_url');
    expect(imageParts).toHaveLength(1);
    expect(imageParts[0].image_url.url).toBe('https://signed.example.com/desktop.png');
  });

  it('sends a plain string user message when no screenshots are provided', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });

    await scoreWebsite({ business: makeBusiness(), metrics: VALID_METRICS });

    const call = mockParse.mock.calls[0][0];
    const userMessage = call.messages.find((m: { role: string }) => m.role === 'user');
    expect(typeof userMessage.content).toBe('string');
  });
});

describe('scoreWebsite — failure', () => {
  it('throws when OpenAI returns no parsable output', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: null } }] });

    await expect(scoreWebsite({ business: makeBusiness(), metrics: VALID_METRICS })).rejects.toThrow(/no parsable structured output/i);
  });

  it('throws a ZodError when the model output fails the domain schema re-validation', async () => {
    mockParse.mockResolvedValueOnce({
      choices: [{ message: { parsed: { ...VALID_MODEL_OUTPUT, overallScore: 500 } } }],
    });

    await expect(scoreWebsite({ business: makeBusiness(), metrics: VALID_METRICS })).rejects.toThrow();
  });
});
