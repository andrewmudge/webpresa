'use client';
import { useActionState, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X } from 'lucide-react';
import { PhotoThumbnail } from './FormFields';
import type { PhotoManagerState } from './[businessId]/actions';

type PhotoManagerAction = (prevState: PhotoManagerState, formData: FormData) => Promise<PhotoManagerState>;

interface PhotoManagerProps {
  logoUrl?: string;
  photoUrls: string[];
  addPhotosAction: PhotoManagerAction;
  deletePhotoAction: PhotoManagerAction;
  updateLogoAction: PhotoManagerAction;
  onPhotosChange: (photoUrls: string[]) => void;
  onLogoChange: (logoUrl: string | undefined) => void;
}

/** Mirrors business.schema.ts's photoUrls cap — same duplicated-constant convention actions.ts already uses. */
const MAX_BUSINESS_PHOTOS = 6;
const ARM_TIMEOUT_MS = 3000;

/**
 * Unified logo + photo manager shown at the top of the Photos card:
 * upload/replace the logo, add new photos (appending, never replacing —
 * see appendBusinessPhotos), and delete any photo. Every mutation here is
 * instant — no "Save" click, no redirect — dispatched via useActionState,
 * matching the auto-save convention autoSaveWebsiteSectionsAction already
 * established elsewhere in the admin (see actions.ts). Deleting a photo
 * pinned to a section slot or the logo is handled server-side (the action
 * clears the reference and dual-writes the live preview); this component
 * only needs to reflect whatever photoUrls/logoUrl the server confirms.
 */
export function PhotoManager({
  logoUrl,
  photoUrls,
  addPhotosAction,
  deletePhotoAction,
  updateLogoAction,
  onPhotosChange,
  onLogoChange,
}: PhotoManagerProps) {
  const router = useRouter();
  const [logoState, dispatchLogo, isLogoPending] = useActionState<PhotoManagerState, FormData>(updateLogoAction, undefined);
  const [addState, dispatchAdd, isAddPending] = useActionState<PhotoManagerState, FormData>(addPhotosAction, undefined);
  const [deleteState, dispatchDelete, isDeletePending] = useActionState<PhotoManagerState, FormData>(
    deletePhotoAction,
    undefined,
  );

  const [armedUrl, setArmedUrl] = useState<string | null>(null);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAnyPending = isLogoPending || isAddPending || isDeletePending;

  useEffect(() => {
    if (logoState?.logoUrl) {
      onLogoChange(logoState.logoUrl);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoState]);

  useEffect(() => {
    if (addState?.photoUrls) {
      onPhotosChange(addState.photoUrls);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addState]);

  useEffect(() => {
    if (deleteState?.photoUrls) {
      onPhotosChange(deleteState.photoUrls);
      onLogoChange(deleteState.logoUrl);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteState]);

  useEffect(() => {
    return () => {
      if (armTimer.current) clearTimeout(armTimer.current);
    };
  }, []);

  function handleLogoFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const fd = new FormData();
    fd.set('logo', file);
    dispatchLogo(fd);
  }

  function handleAddFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    const fd = new FormData();
    files.forEach((f) => fd.append('photos', f));
    dispatchAdd(fd);
  }

  function handleDeleteClick(url: string) {
    if (armedUrl !== url) {
      setArmedUrl(url);
      if (armTimer.current) clearTimeout(armTimer.current);
      armTimer.current = setTimeout(() => setArmedUrl(null), ARM_TIMEOUT_MS);
      return;
    }
    if (armTimer.current) clearTimeout(armTimer.current);
    setArmedUrl(null);
    setDeletingUrl(url);
    const fd = new FormData();
    fd.set('photoUrl', url);
    dispatchDelete(fd);
  }

  const atCap = photoUrls.length >= MAX_BUSINESS_PHOTOS;

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Logo &amp; Photos</h2>

      <div className="mb-5">
        <span className="block text-xs text-gray-500 mb-1.5">Logo</span>
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <PhotoThumbnail url={logoUrl} label="Logo" />
          ) : (
            <div className="w-16 h-16 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-[10px] text-gray-400 text-center px-1">
              No logo
            </div>
          )}
          <label
            className={`rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors ${
              isAnyPending ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:bg-gray-50'
            }`}
          >
            {isLogoPending ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
            <input type="file" accept="image/*" className="hidden" disabled={isAnyPending} onChange={handleLogoFile} />
          </label>
        </div>
        {logoState?.message && <p className="mt-1.5 text-xs text-red-600">{logoState.message}</p>}
      </div>

      <div>
        <span className="block text-xs text-gray-500 mb-1.5">
          Photos ({photoUrls.length}/{MAX_BUSINESS_PHOTOS})
        </span>
        {photoUrls.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-2">
            {photoUrls.map((url, i) => (
              <PhotoThumbnail
                key={url}
                url={url}
                index={i}
                overlay={
                  <button
                    type="button"
                    disabled={isAnyPending}
                    onClick={() => handleDeleteClick(url)}
                    aria-label={armedUrl === url ? `Confirm delete photo ${i + 1}` : `Delete photo ${i + 1}`}
                    className={`absolute top-0.5 right-0.5 rounded-full p-0.5 text-white transition-colors ${
                      armedUrl === url ? 'bg-red-600' : 'bg-black/50 hover:bg-red-600'
                    } ${isDeletePending && deletingUrl === url ? 'opacity-50' : ''}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                }
              />
            ))}
          </div>
        )}
        <label
          className={`inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium transition-colors ${
            isAnyPending || atCap ? 'opacity-50 pointer-events-none' : 'cursor-pointer text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          {isAddPending ? 'Uploading…' : 'Add photos'}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={isAnyPending || atCap}
            onChange={handleAddFiles}
          />
        </label>
        {atCap && <p className="mt-1.5 text-xs text-gray-400">Maximum {MAX_BUSINESS_PHOTOS} photos reached — delete one to add another.</p>}
        {addState?.message && <p className="mt-1.5 text-xs text-red-600">{addState.message}</p>}
        {deleteState?.message && <p className="mt-1.5 text-xs text-red-600">{deleteState.message}</p>}
      </div>
    </section>
  );
}
