'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { User, KeyRound, ShieldCheck } from 'lucide-react';
import { Card, Badge } from '../FormBits';
import { EditAccountModal } from './EditAccountModal';
import { sendPasswordResetEmailAction } from '../actions';

interface Props {
  businessId: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  isReadOnly: boolean;
}

/**
 * Account card — the authenticated user's own profile/security, kept
 * separate from `BusinessInfoCard` (public business contact info). See
 * implementation.md's Account card requirements: password is never shown
 * or stored in plaintext, so only masked dots represent it; the only
 * supported password-change flow is Cognito's reset-email one, since the
 * customer session carries no access token for a real "current password"
 * form (see `updateCustomerProfile`'s doc comment).
 */
export function AccountCard({ businessId, firstName, lastName, email, phone, isReadOnly }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [resetState, setResetState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [isPending, startTransition] = useTransition();

  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Not set';

  function sendResetEmail() {
    setResetState('sending');
    startTransition(async () => {
      await sendPasswordResetEmailAction(businessId);
      setResetState('sent');
    });
  }

  return (
    <>
      <Card title="Account" description="Your personal profile and security.">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-(--color-brand-muted) flex items-center justify-center shrink-0">
            <User size={18} className="text-(--color-brand)" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{fullName}</p>
            <p className="text-xs text-gray-500 truncate">{email}</p>
          </div>
        </div>

        <dl className="space-y-2 text-sm mb-4">
          {phone && (
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500">Phone</dt>
              <dd className="text-gray-900">{phone}</dd>
            </div>
          )}
          <div className="flex justify-between gap-2 items-center">
            <dt className="text-gray-500">Password</dt>
            <dd className="text-gray-900 tracking-widest" aria-label="Password is set">
              ••••••••
            </dd>
          </div>
          <div className="flex justify-between gap-2 items-center">
            <dt className="text-gray-500 flex items-center gap-1.5">
              <ShieldCheck size={14} aria-hidden="true" /> Two-factor authentication
            </dt>
            <dd>
              <Badge tone="gray">Coming soon</Badge>
            </dd>
          </div>
        </dl>

        {resetState === 'sent' ? (
          <p role="status" className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
            Check <span className="font-medium">{email}</span> for a reset code, then{' '}
            <Link href={`/account/reset-password?email=${encodeURIComponent(email)}`} className="underline font-medium">
              reset your password
            </Link>
            .
          </p>
        ) : (
          <button
            type="button"
            onClick={sendResetEmail}
            disabled={isReadOnly || isPending}
            className="w-full mb-3 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <KeyRound size={16} aria-hidden="true" />
            {resetState === 'sending' ? 'Sending…' : 'Send password reset email'}
          </button>
        )}

        <button
          type="button"
          onClick={() => setEditOpen(true)}
          disabled={isReadOnly}
          className="w-full inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-(--color-brand) text-white hover:bg-(--color-brand-dark) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Edit Account
        </button>
      </Card>

      <EditAccountModal
        businessId={businessId}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        firstName={firstName}
        lastName={lastName}
        phone={phone}
      />
    </>
  );
}
