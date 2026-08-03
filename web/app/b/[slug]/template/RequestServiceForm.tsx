'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { V } from './tokens';
import { submitLeadAction } from '../actions';
import { HONEYPOT_FIELD_NAME, FORM_RENDERED_AT_FIELD_NAME } from '@/lib/leads/spam-guard';

interface RequestServiceFormProps {
  businessName?: string;
  /** Pre-fills the "preferred contact" hint copy only — never auto-fills the visitor's own phone field. */
  phone?: string;
  /** The trusted business slug — the only identifier the Server Action needs; everything else is re-resolved server-side. */
  slug: string;
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
 * Wired to `submitLeadAction` (`../actions.ts`, Stage 20) — a real
 * server-side submission (persisted lead + owner notification email), not
 * the frontend-only simulation this component used to be.
 */
export function RequestServiceForm({ businessName, phone, slug, submitLabel = 'Request Service', onSuccess }: RequestServiceFormProps) {
  const [state, formAction, pending] = useActionState(submitLeadAction, { status: 'idle' } as const);
  const nameInputRef = useRef<HTMLInputElement>(null);
  // Captured once, at mount — read by the spam-guard's minimum-fill-time
  // check server-side. A real client timestamp, not spoofable to look old
  // without also delaying the actual submit.
  const [renderedAt] = useState(() => Date.now().toString());

  useEffect(() => {
    if (state.status === 'success') onSuccess?.();
  }, [state.status, onSuccess]);

  useEffect(() => {
    if (state.status === 'error') nameInputRef.current?.focus();
  }, [state.status]);

  if (state.status === 'success') {
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
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-(--site-muted)">
        Tell us a bit about what you need{businessName ? ` and ${businessName}` : ''} will get back to you.
        {phone && ' Prefer to talk now? Give us a call instead.'}
      </p>

      {state.status === 'error' && (
        <div role="alert" className="rounded-lg border px-3.5 py-2.5 text-sm" style={{ borderColor: V.danger, color: V.danger }}>
          {state.error}
        </div>
      )}

      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name={FORM_RENDERED_AT_FIELD_NAME} value={renderedAt} />
      {/* Honeypot — real visitors never see or fill this in; a bot filling every field trips it. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="rsf-website">Leave this field blank</label>
        <input id="rsf-website" name={HONEYPOT_FIELD_NAME} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label htmlFor="rsf-name" className="block text-sm font-medium text-(--site-text) mb-1">
          Name <span style={{ color: V.danger }}>*</span>
        </label>
        <input
          ref={nameInputRef}
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
          name="serviceNeeded"
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
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: V.primary }}
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        {pending ? 'Sending…' : submitLabel}
      </button>
    </form>
  );
}
