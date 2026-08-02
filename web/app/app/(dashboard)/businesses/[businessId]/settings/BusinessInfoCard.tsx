'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';
import type { Business } from '@/domain/models/business';
import { Card } from '../FormBits';
import { EditBusinessModal } from './EditBusinessModal';

interface Props {
  businessId: string;
  business: Business;
  hours?: string;
  isReadOnly: boolean;
}

function formatAddress(business: Business): string | null {
  const a = business.address;
  if (!a) return null;
  const line2 = a.line2 ? `${a.line2}, ` : '';
  return `${a.line1}, ${line2}${a.city}, ${a.state} ${a.postalCode}`;
}

export function BusinessInfoCard({ businessId, business, hours, isReadOnly }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const address = formatAddress(business);
  const socialCount = business.socialLinks?.length ?? 0;

  return (
    <>
      <Card title="Business Information" description="Shown publicly on your website.">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-(--color-brand-muted) flex items-center justify-center shrink-0">
            <Building2 size={18} className="text-(--color-brand)" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-gray-900 truncate">{business.name}</p>
        </div>

        <dl className="space-y-2 text-sm mb-4">
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500 shrink-0">Phone</dt>
            <dd className="text-gray-900 text-right break-words">{business.phone || '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500 shrink-0">Email</dt>
            <dd className="text-gray-900 text-right break-words">{business.email || '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500 shrink-0">Address</dt>
            <dd className="text-gray-900 text-right break-words">{address || '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500 shrink-0">Hours</dt>
            <dd className="text-gray-900 text-right break-words">{hours || '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500 shrink-0">Social links</dt>
            <dd className="text-gray-900">{socialCount}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => setEditOpen(true)}
          disabled={isReadOnly}
          className="w-full inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-(--color-brand) text-white hover:bg-(--color-brand-dark) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Edit Business
        </button>
      </Card>

      <EditBusinessModal
        businessId={businessId}
        business={business}
        hours={hours}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}
