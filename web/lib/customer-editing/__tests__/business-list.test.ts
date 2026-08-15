/**
 * Unit tests for `updateCustomerBusinessListField` — the customer-scoped
 * counterpart of the admin's `updateBusinessListFieldAction`, backing the
 * FAQ/Process/testimonials editors on the customer website "Sections" tab.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockGetBusinessById, mockUpdateBusiness } = vi.hoisted(() => ({
  mockGetBusinessById: vi.fn(),
  mockUpdateBusiness: vi.fn(),
}));

vi.mock('@/lib/db/businesses', () => ({
  getBusinessById: mockGetBusinessById,
  updateBusiness: mockUpdateBusiness,
}));

import { updateCustomerBusinessListField } from '@/lib/customer-editing/business-list';

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  mockGetBusinessById.mockReset();
  mockUpdateBusiness.mockReset();
});

describe('updateCustomerBusinessListField', () => {
  describe('faqItems', () => {
    it('saves question/answer pairs from indexed form fields', async () => {
      const result = await updateCustomerBusinessListField(
        'biz_1',
        'faqItems',
        formData({
          'faq.0.question': 'Do you offer free estimates?',
          'faq.0.answer': 'Yes, every estimate is free.',
          'faq.1.question': 'What areas do you serve?',
          'faq.1.answer': 'The greater Austin metro area.',
        }),
      );

      expect(result).toBeUndefined();
      expect(mockUpdateBusiness).toHaveBeenCalledTimes(1);
      expect(mockUpdateBusiness).toHaveBeenCalledWith('biz_1', {
        faqItems: [
          { question: 'Do you offer free estimates?', answer: 'Yes, every estimate is free.' },
          { question: 'What areas do you serve?', answer: 'The greater Austin metro area.' },
        ],
      });
      expect(mockGetBusinessById).not.toHaveBeenCalled();
    });

    it('drops rows missing a question or an answer', async () => {
      await updateCustomerBusinessListField(
        'biz_1',
        'faqItems',
        formData({
          'faq.0.question': 'Complete question',
          'faq.0.answer': 'Complete answer',
          'faq.1.question': '',
          'faq.1.answer': 'Answer with no question',
          'faq.2.question': 'Question with no answer',
          'faq.2.answer': '',
        }),
      );

      expect(mockUpdateBusiness).toHaveBeenCalledWith('biz_1', {
        faqItems: [{ question: 'Complete question', answer: 'Complete answer' }],
      });
    });

    it('trims and truncates question to 200 chars and answer to 1000 chars', async () => {
      const longQuestion = `Q${'a'.repeat(250)}`;
      const longAnswer = `A${'b'.repeat(1200)}`;

      await updateCustomerBusinessListField(
        'biz_1',
        'faqItems',
        formData({
          'faq.0.question': `  ${longQuestion}  `,
          'faq.0.answer': `  ${longAnswer}  `,
        }),
      );

      const saved = mockUpdateBusiness.mock.calls[0][1];
      expect(saved.faqItems[0].question).toBe(longQuestion.slice(0, 200));
      expect(saved.faqItems[0].answer).toBe(longAnswer.slice(0, 1000));
    });
  });

  describe('processSteps', () => {
    it('saves title/description pairs from indexed form fields', async () => {
      const result = await updateCustomerBusinessListField(
        'biz_1',
        'processSteps',
        formData({
          'process.0.title': 'Contact us',
          'process.0.description': 'Reach out for a free quote.',
          'process.1.title': 'Schedule',
          'process.1.description': 'We book a time that works for you.',
        }),
      );

      expect(result).toBeUndefined();
      expect(mockUpdateBusiness).toHaveBeenCalledWith('biz_1', {
        processSteps: [
          { title: 'Contact us', description: 'Reach out for a free quote.' },
          { title: 'Schedule', description: 'We book a time that works for you.' },
        ],
      });
      expect(mockGetBusinessById).not.toHaveBeenCalled();
    });

    it('drops rows missing a title or a description', async () => {
      await updateCustomerBusinessListField(
        'biz_1',
        'processSteps',
        formData({
          'process.0.title': 'Complete step',
          'process.0.description': 'Complete description',
          'process.1.title': '',
          'process.1.description': 'Description with no title',
          'process.2.title': 'Title with no description',
          'process.2.description': '',
        }),
      );

      expect(mockUpdateBusiness).toHaveBeenCalledWith('biz_1', {
        processSteps: [{ title: 'Complete step', description: 'Complete description' }],
      });
    });

    it('trims and truncates title to 80 chars and description to 300 chars', async () => {
      const longTitle = `T${'a'.repeat(100)}`;
      const longDescription = `D${'b'.repeat(350)}`;

      await updateCustomerBusinessListField(
        'biz_1',
        'processSteps',
        formData({
          'process.0.title': `  ${longTitle}  `,
          'process.0.description': `  ${longDescription}  `,
        }),
      );

      const saved = mockUpdateBusiness.mock.calls[0][1];
      expect(saved.processSteps[0].title).toBe(longTitle.slice(0, 80));
      expect(saved.processSteps[0].description).toBe(longDescription.slice(0, 300));
    });
  });

  it('rejects an unknown field', async () => {
    const result = await updateCustomerBusinessListField(
      'biz_1',
      // @ts-expect-error — deliberately invalid to exercise the guard
      'notAField',
      formData({}),
    );

    expect(result).toEqual({ message: 'Unknown field' });
    expect(mockUpdateBusiness).not.toHaveBeenCalled();
  });

  it('returns an error message and does not throw when the db write fails', async () => {
    mockUpdateBusiness.mockRejectedValueOnce(new Error('DynamoDB unavailable'));

    const result = await updateCustomerBusinessListField(
      'biz_1',
      'faqItems',
      formData({ 'faq.0.question': 'Q', 'faq.0.answer': 'A' }),
    );

    expect(result).toEqual({ message: 'Failed to save changes. Please try again.' });
  });
});
