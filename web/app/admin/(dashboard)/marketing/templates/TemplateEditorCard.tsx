'use client';

import { useActionState, useState } from 'react';
import type { EmailTemplate, EmailSequence } from '@/domain/models/email-template';
import { renderPreviewSample } from '@/lib/marketing/preview-sample';
import { saveTemplateAction, resetTemplateAction, sendTestEmailAction } from './actions';

const SEQUENCE_LABELS: Record<EmailSequence, string> = {
  1: 'Email 1 — 24 hours after postcard delivery',
  2: 'Email 2 — 4 days after postcard delivery',
  3: 'Email 3 — 10 days after postcard delivery',
};

export function TemplateEditorCard({ template }: { template: EmailTemplate }) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [testEmail, setTestEmail] = useState('');
  const [confirmingReset, setConfirmingReset] = useState(false);

  const [saveState, saveAction, savePending] = useActionState(saveTemplateAction, undefined);
  const [resetState, resetAction, resetPending] = useActionState(resetTemplateAction, undefined);
  const [testState, testAction, testPending] = useActionState(sendTestEmailAction, undefined);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{SEQUENCE_LABELS[template.emailSequence]}</h3>
        <span className="text-xs text-gray-400">
          v{template.version} · updated {new Date(template.updatedAt).toLocaleDateString()}
          {template.updatedBy ? ` by ${template.updatedBy}` : ''}
        </span>
      </div>

      <form action={saveAction} className="space-y-3">
        <input type="hidden" name="emailSequence" value={template.emailSequence} />
        {saveState?.error && (
          <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {saveState.error}
          </p>
        )}
        {saveState?.ok && <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Saved.</p>}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
          <input
            name="subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Body</label>
          <textarea
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={12}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-400">
            Supported variables: <code>{'{{businessName}}'}</code>, <code>{'{{previewUrl}}'}</code>, <code>{'{{unsubscribeUrl}}'}</code>
          </p>
        </div>
        <button
          type="submit"
          disabled={savePending}
          className="rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors disabled:opacity-60"
        >
          {savePending ? 'Saving…' : 'Save'}
        </button>
      </form>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-medium text-gray-500 mb-2">Preview (sample data — Pensacola Plumbing Co.)</p>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
          <p className="font-medium text-gray-900 mb-2">{renderPreviewSample(subject)}</p>
          <div className="whitespace-pre-wrap text-gray-700">{renderPreviewSample(body)}</div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 flex items-center justify-between flex-wrap gap-3">
        <form
          action={resetAction}
          onSubmit={(event) => {
            if (!confirmingReset) {
              event.preventDefault();
              setConfirmingReset(true);
            }
          }}
        >
          <input type="hidden" name="emailSequence" value={template.emailSequence} />
          <button type="submit" disabled={resetPending} className="text-xs text-red-600 hover:underline disabled:opacity-60">
            {resetPending ? 'Resetting…' : confirmingReset ? 'Confirm reset to default?' : 'Reset to default'}
          </button>
        </form>

        <form action={testAction} className="flex items-center gap-2">
          <input type="hidden" name="emailSequence" value={template.emailSequence} />
          <input type="hidden" name="subject" value={subject} />
          <input type="hidden" name="body" value={body} />
          <input
            type="email"
            name="to"
            value={testEmail}
            onChange={(event) => setTestEmail(event.target.value)}
            placeholder="you@example.com"
            required
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
          />
          <button
            type="submit"
            disabled={testPending}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {testPending ? 'Sending…' : 'Send Test Email'}
          </button>
        </form>
      </div>

      {testState?.error && (
        <p role="alert" className="text-xs text-red-700">
          {testState.error}
        </p>
      )}
      {testState?.ok && <p className="text-xs text-green-700">Test email sent — clearly marked as a test, no campaign state touched.</p>}
      {resetState?.error && <p className="text-xs text-red-700">{resetState.error}</p>}
    </div>
  );
}
