'use client';
import { useState, type FormEvent } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { V } from './tokens';

interface RequestServiceFormProps {
  businessName?: string;
  /** Pre-fills the "preferred contact" hint copy only — never auto-fills the visitor's own phone field. */
  phone?: string;
  /** Submit button text. Defaults to "Request Service" — the same label the triggering CTA button uses. */
  submitLabel?: string;
  onSuccess?: () => void;
}

const inputClassName =
  'w-full rounded-lg border px-3.5 py-2.5 text-sm text-(--site-text) bg-(--site-background) placeholder:text-(--site-muted) focus:outline-none focus:ring-2 focus:ring-(--site-primary)';

/**
 * Reusable service-request form, shared by every business's site. Rendered
 * inside a modal (desktop) / full-screen drawer (mobile) by
 * `RequestServiceProvider`, but kept independent of that shell so it could
 * be embedded elsewhere later.
 *
 * Frontend only for now — submission is simulated locally (no request is
 * sent anywhere yet). Wiring this to a real lead-capture endpoint is
 * deferred, tracked-later work.
 */
export function RequestServiceForm({ businessName, phone, submitLabel = 'Request Service', onSuccess }: RequestServiceFormProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const name = String(form.get('name') || '').trim();
    const contactPhone = String(form.get('phone') || '').trim();
    const email = String(form.get('email') || '').trim();

    if (!name) {
      setError('Please enter your name.');
      return;
    }
    if (!contactPhone && !email) {
      setError('Please enter a phone number or email so we can reach you.');
      return;
    }

    setStatus('submitting');
    // Simulated submission — no backend exists yet for this flow.
    await new Promise((resolve) => setTimeout(resolve, 600));
    setStatus('success');
    onSuccess?.();
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="w-12 h-12" style={{ color: V.primary }} />
        <p className="text-lg font-bold text-(--site-text)">Request sent!</p>
        <p className="text-sm text-(--site-muted) max-w-xs">
          Thanks for reaching out{businessName ? ` to ${businessName}` : ''} — we&apos;ll be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-(--site-muted)">
        Tell us a bit about what you need{businessName ? ` and ${businessName}` : ''} will get back to you.
        {phone && ' Prefer to talk now? Give us a call instead.'}
      </p>

      {error && (
        <div role="alert" className="rounded-lg border px-3.5 py-2.5 text-sm" style={{ borderColor: V.danger, color: V.danger }}>
          {error}
        </div>
      )}

      <div>
        <label htmlFor="rsf-name" className="block text-sm font-medium text-(--site-text) mb-1">
          Name <span style={{ color: V.danger }}>*</span>
        </label>
        <input
          id="rsf-name"
          name="name"
          type="text"
          required
          autoComplete="name"
          placeholder="Jane Smith"
          className={inputClassName}
          style={{ borderColor: V.border }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="rsf-phone" className="block text-sm font-medium text-(--site-text) mb-1">
            Phone
          </label>
          <input
            id="rsf-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="(555) 123-4567"
            className={inputClassName}
            style={{ borderColor: V.border }}
          />
        </div>
        <div>
          <label htmlFor="rsf-email" className="block text-sm font-medium text-(--site-text) mb-1">
            Email
          </label>
          <input
            id="rsf-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="jane@example.com"
            className={inputClassName}
            style={{ borderColor: V.border }}
          />
        </div>
      </div>

      <div>
        <label htmlFor="rsf-service" className="block text-sm font-medium text-(--site-text) mb-1">
          Service needed
        </label>
        <input
          id="rsf-service"
          name="service"
          type="text"
          placeholder="e.g. Drain cleaning, roof repair…"
          className={inputClassName}
          style={{ borderColor: V.border }}
        />
      </div>

      <div>
        <label htmlFor="rsf-message" className="block text-sm font-medium text-(--site-text) mb-1">
          Details
        </label>
        <textarea
          id="rsf-message"
          name="message"
          rows={3}
          placeholder="Anything else that would help us prepare?"
          className={`${inputClassName} resize-none`}
          style={{ borderColor: V.border }}
        />
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: V.primary }}
      >
        {status === 'submitting' && <Loader2 className="w-4 h-4 animate-spin" />}
        {status === 'submitting' ? 'Sending…' : submitLabel}
      </button>
    </form>
  );
}
