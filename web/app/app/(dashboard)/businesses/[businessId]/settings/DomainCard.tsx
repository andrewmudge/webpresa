import Link from 'next/link';
import { LinkIcon, ArrowRight } from 'lucide-react';
import type { DomainConnection, DomainConnectionStatus } from '@/domain/models/domain-connection';
import { Card, Badge, type BadgeTone } from '../FormBits';

interface Props {
  businessId: string;
  slug: string;
  domainConnection: DomainConnection | null;
}

/**
 * Truthful domain status only — never fabricates DNS detail the backend
 * doesn't provide (implementation.md's Domain card requirements). Reuses
 * the existing onboarding domain route rather than forking a second
 * domain-management surface (Stage 19.x, Part 2's documented boundary).
 */
const STATUS_DISPLAY: Partial<Record<DomainConnectionStatus, { label: string; tone: BadgeTone }>> = {
  draft: { label: 'Pending setup', tone: 'gray' },
  awaiting_dns: { label: 'Pending setup', tone: 'amber' },
  verifying: { label: 'Verifying', tone: 'amber' },
  connected: { label: 'Verifying', tone: 'amber' },
  certificate_pending: { label: 'Verifying', tone: 'amber' },
  active: { label: 'Connected', tone: 'green' },
  failed: { label: 'Action required', tone: 'red' },
  expired: { label: 'Action required', tone: 'red' },
};

export function DomainCard({ businessId, slug, domainConnection }: Props) {
  const display = domainConnection ? STATUS_DISPLAY[domainConnection.status] : undefined;

  return (
    <Card title="Domain" description="Where your website lives on the internet.">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-(--color-brand-muted) flex items-center justify-center shrink-0">
          <LinkIcon size={18} className="text-(--color-brand)" aria-hidden="true" />
        </div>
        <Badge tone={display?.tone ?? 'gray'}>{display?.label ?? 'Not connected'}</Badge>
      </div>

      <dl className="space-y-2 text-sm mb-4">
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500 shrink-0">Webpresa address</dt>
          <dd className="text-gray-900 text-right break-all">/b/{slug}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500 shrink-0">Custom domain</dt>
          <dd className="text-gray-900 text-right break-all">{domainConnection?.domainName ?? '—'}</dd>
        </div>
        {domainConnection?.source === 'webpresa_registered' && (
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500 shrink-0">Purchased through</dt>
            <dd className="text-gray-900 text-right">Webpresa</dd>
          </div>
        )}
      </dl>

      <Link
        href={`/app/onboarding/${businessId}/domain`}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-(--color-brand) text-white hover:bg-(--color-brand-dark) transition-colors"
      >
        Manage Domain
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </Card>
  );
}
