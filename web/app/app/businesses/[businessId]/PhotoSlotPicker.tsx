/**
 * Shared photo-slot picker — select an already-uploaded photo for a
 * specific spot on the website (hero, about, etc.), or upload a brand-new
 * one directly into that slot. Extracted from `design/page.tsx`'s
 * previously-private `SlotPicker` so it can also be embedded inside the
 * Website page's Content/Services cards without duplicating the markup —
 * pure extraction, same props, same rendered output.
 */
interface PhotoSlotPickerProps {
  label: string;
  fieldName: string;
  uploadFieldName: string;
  currentValue?: string;
  photoUrls: string[];
  disabled: boolean;
}

export function PhotoSlotPicker({ label, fieldName, uploadFieldName, currentValue, photoUrls, disabled }: PhotoSlotPickerProps) {
  return (
    <div className="border border-gray-100 rounded-lg p-3 space-y-2">
      <span className="block text-sm font-medium text-gray-700">{label}</span>
      <select
        name={fieldName}
        defaultValue={currentValue ?? ''}
        disabled={disabled}
        className="w-full rounded-lg border border-(--color-border) px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
      >
        <option value="">Auto</option>
        <option value="none">No photo</option>
        {photoUrls.map((url, i) => (
          <option key={url} value={url}>
            Photo {i + 1}
          </option>
        ))}
      </select>
      <input type="file" name={uploadFieldName} accept="image/*" disabled={disabled} className="text-xs text-gray-500" />
    </div>
  );
}
