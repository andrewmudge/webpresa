'use client';

import type { Business } from '@/domain/models/business';
import { Modal } from '../Modal';
import { TextField, TextAreaField, SaveButton } from '../FormBits';
import { SocialLinksEditor } from './SocialLinksEditor';
import { updateBusinessInfoAction } from '../actions';

interface Props {
  businessId: string;
  business: Business;
  hours?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function EditBusinessModal({ businessId, business, hours, isOpen, onClose }: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Business"
      description="Information shown publicly on your website."
      maxWidthClassName="max-w-2xl"
    >
      <form action={updateBusinessInfoAction.bind(null, businessId)} className="space-y-4">
        <TextField label="Business name" name="name" defaultValue={business.name} required maxLength={200} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Public phone" name="phone" defaultValue={business.phone} autoComplete="tel" />
          <TextField label="Public email" name="email" type="email" defaultValue={business.email} autoComplete="email" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Address line 1" name="addressLine1" defaultValue={business.address?.line1} />
          <TextField label="Address line 2" name="addressLine2" defaultValue={business.address?.line2} />
          <TextField label="City" name="addressCity" defaultValue={business.address?.city} />
          <TextField label="State" name="addressState" defaultValue={business.address?.state} />
          <TextField label="ZIP / Postal code" name="addressPostalCode" defaultValue={business.address?.postalCode} />
        </div>
        <TextAreaField
          label="Business hours"
          name="hours"
          defaultValue={hours}
          placeholder="Mon–Fri 8am–6pm, Sat 9am–2pm"
          rows={2}
          maxLength={200}
        />
        <SocialLinksEditor defaultLinks={business.socialLinks ?? []} />
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
