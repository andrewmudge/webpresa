import Link from 'next/link';
import { getMarketingOutbox } from '@/lib/marketing/outbox';
import type { EmailSequence } from '@/domain/models/email-template';

export const dynamic = 'force-dynamic';

/** Shared column template — the header row and every `<summary>` row must use the exact same grid so columns line up (a plain `<table>` can't be mixed with `<details>/<summary>` body rows, since table layout and grid layout size columns independently). */
const OUTBOX_GRID_COLS = 'grid grid-cols-[1.5fr_0.7fr_1.2fr_1.5fr_2fr_0.6fr]';

interface SearchParams {
  sequence?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

function parseSequence(raw: string | undefined): EmailSequence | undefined {
  if (raw === '1' || raw === '2' || raw === '3') return Number(raw) as EmailSequence;
  return undefined;
}

function SequenceLink({ label, sequence, active }: { label: string; sequence?: EmailSequence; active: boolean }) {
  const href = sequence ? `/admin/marketing/outbox?sequence=${sequence}` : '/admin/marketing/outbox';
  return (
    <Link
      href={href}
      className={`text-sm ${active ? 'font-semibold text-(--color-brand)' : 'text-gray-500 hover:text-gray-700 hover:underline'}`}
    >
      {label}
    </Link>
  );
}

export default async function MarketingOutboxPage({ searchParams }: Props) {
  const { sequence: sequenceParam } = await searchParams;
  const emailSequence = parseSequence(sequenceParam);

  const entries = await getMarketingOutbox({ emailSequence });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Outbox</h1>
          <p className="text-sm text-gray-500 mt-0.5">{entries.length} sent emails</p>
        </div>
        <Link href="/admin/marketing" className="text-sm text-(--color-brand) hover:underline">
          ← Back to Marketing
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <SequenceLink label="All" active={emailSequence === undefined} />
        <SequenceLink label="Step 1" sequence={1} active={emailSequence === 1} />
        <SequenceLink label="Step 2" sequence={2} active={emailSequence === 2} />
        <SequenceLink label="Step 3" sequence={3} active={emailSequence === 3} />
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">No emails sent yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className={`${OUTBOX_GRID_COLS} gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50 text-left text-sm font-medium text-gray-600`}>
            <span>Business</span>
            <span>Step</span>
            <span>Sent</span>
            <span>Recipient</span>
            <span>Subject</span>
            <span>Clicks</span>
          </div>
          <div className="divide-y divide-gray-50">
            {entries.map(({ message, business }) => (
              <details key={`${message.businessId}#${message.sortKey}`} className="group">
                <summary
                  className={`${OUTBOX_GRID_COLS} gap-3 items-center px-4 py-3 text-sm cursor-pointer list-none hover:bg-gray-50 transition-colors [&::-webkit-details-marker]:hidden`}
                >
                  <span className="font-medium text-gray-900 truncate">{business ? business.name : 'Unknown business'}</span>
                  <span className="text-gray-600">Email {message.emailSequence}</span>
                  <span className="text-gray-400 text-xs">{message.sentAt ? new Date(message.sentAt).toLocaleString() : '—'}</span>
                  <span className="text-gray-600 truncate">{message.recipientEmail ?? <span className="text-gray-300">—</span>}</span>
                  <span className="text-gray-600 truncate">{message.subjectSnapshot ?? <span className="text-gray-300">—</span>}</span>
                  <span className="text-gray-600">{message.clickCount}</span>
                </summary>
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-4">
                  {business && (
                    <p className="text-xs">
                      <Link href={`/admin/businesses/${business.businessId}`} className="text-(--color-brand) hover:underline">
                        View business →
                      </Link>
                    </p>
                  )}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Rendered email</p>
                    {message.htmlBodySnapshot ? (
                      <iframe
                        title={`Email ${message.emailSequence} to ${business?.name ?? message.businessId}`}
                        sandbox=""
                        srcDoc={message.htmlBodySnapshot}
                        className="w-full h-96 rounded-lg border border-gray-200 bg-white"
                      />
                    ) : (
                      <p className="text-xs text-gray-400">No HTML snapshot recorded.</p>
                    )}
                  </div>
                  {message.textBodySnapshot && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Plain text</p>
                      <pre className="whitespace-pre-wrap text-xs text-gray-700 bg-white rounded-lg border border-gray-200 p-3">
                        {message.textBodySnapshot}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
