'use client';

import { Modal } from '../Modal';
import { TextField, SaveButton } from '../FormBits';
import { updateAccountProfileAction } from '../actions';

interface Props {
  businessId: string;
  isOpen: boolean;
  onClose: () => void;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * Name/phone editing only — email stays read-only (a Cognito email change
 * needs its own verification flow, not shipped in this stage; see
 * `updateCustomerProfile`'s doc comment). Submitting redirects back to
 * Settings with `?saved=1`/`?error=...`, same feedback mechanism every
 * other form on this page already uses (`SaveBanner`).
 */
export function EditAccountModal({ businessId, isOpen, onClose, firstName, lastName, phone }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Account" description="Update your name and phone number.">
      <form action={updateAccountProfileAction.bind(null, businessId)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="First name" name="firstName" defaultValue={firstName} required autoComplete="given-name" />
          <TextField label="Last name" name="lastName" defaultValue={lastName} required autoComplete="family-name" />
        </div>
        <TextField label="Phone" name="phone" defaultValue={phone} autoComplete="tel" placeholder="(555) 123-4567" />
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <SaveButton label="Save changes" />
        </div>
      </form>
    </Modal>
  );
}
