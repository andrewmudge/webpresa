'use client';

import { useActionState, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ImagePlus, Upload } from 'lucide-react';
import { INDUSTRIES, type Industry } from '@/domain/constants/industries';
import { HONEYPOT_FIELD_NAME, FORM_RENDERED_AT_FIELD_NAME } from '@/lib/leads/spam-guard';
import { submitBuildAction, type BuildFormState } from './actions';

const INDUSTRY_LABELS: Record<Industry, string> = {
  plumbing: 'Plumbing',
  hvac: 'HVAC',
  electrical: 'Electrical',
  roofing: 'Roofing',
  landscaping: 'Landscaping',
  painting: 'Painting',
  cleaning: 'Cleaning',
  restaurant: 'Restaurant',
  bakery: 'Bakery',
  salon: 'Salon',
  law_firm: 'Law Firm',
  accounting: 'Accounting',
};

type StepKey = 'business' | 'contact' | 'website' | 'details' | 'online' | 'photos';

const SOCIAL_FIELDS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'twitter', label: 'X / Twitter' },
] as const;

const MAX_PHOTOS = 6;

const inputClass =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

/**
 * All six steps' fields are always mounted — only visually toggled via
 * `hidden`, never conditionally rendered — so the one native form
 * submission on the final step's "Build My Website" button collects every
 * field from every step the visitor has already filled in. Conditionally
 * rendering (mounting only the current step) would unmount earlier steps'
 * inputs and silently drop their values from the submitted FormData.
 */
function StepSection({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <div className={active ? 'block space-y-5' : 'hidden'}>{children}</div>;
}

export function BuildWizard() {
  const [state, formAction, pending] = useActionState<BuildFormState, FormData>(submitBuildAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  const [hasExistingWebsite, setHasExistingWebsite] = useState<boolean | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [renderedAt] = useState(() => Date.now().toString());

  const steps: StepKey[] = useMemo(() => {
    const base: StepKey[] = ['business', 'contact', 'website'];
    if (hasExistingWebsite === false) base.push('details');
    base.push('online', 'photos');
    return base;
  }, [hasExistingWebsite]);

  // Clamp stepIndex if the branch change (answering Step 3) shortens the
  // step list while the visitor is currently sitting past the new end.
  const clampedIndex = Math.min(stepIndex, steps.length - 1);
  const currentStep = steps[clampedIndex];
  const isLastStep = clampedIndex === steps.length - 1;

  function fieldValue(name: string): string {
    if (!formRef.current) return '';
    const el = formRef.current.elements.namedItem(name);
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      return el.value.trim();
    }
    return '';
  }

  function validateStep(step: StepKey): string | null {
    if (step === 'business') {
      if (!fieldValue('name')) return 'Enter your business name.';
      if (!fieldValue('industry')) return 'Choose your industry.';
    }
    if (step === 'contact') {
      if (!fieldValue('phone') && !fieldValue('email')) return 'Enter a phone number or email.';
    }
    if (step === 'website') {
      if (hasExistingWebsite === null) return 'Let us know if you already have a website.';
      if (hasExistingWebsite && !fieldValue('websiteUrl')) return 'Enter your website address.';
    }
    return null;
  }

  function goNext() {
    const error = validateStep(currentStep);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function goBack() {
    setStepError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }

  function handlePhotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS);
    setPhotoPreviews(files.map((f) => URL.createObjectURL(f)));
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center">
            <Image
              src="/webpresa_logo_horizontal_cropped_nobg.png"
              alt="Webpresa"
              width={1460}
              height={238}
              className="h-6 w-auto sm:h-7"
              priority
            />
          </Link>
          <Link href="/r" className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
            Already have a code? Enter it instead →
          </Link>
        </div>
        <div className="h-1 w-full bg-gray-100">
          <motion.div
            className="h-full bg-(--color-brand)"
            initial={false}
            animate={{ width: `${((clampedIndex + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <form ref={formRef} action={formAction} className="space-y-8">
          {/* hasExistingWebsite is derived UI state, not a native input the visitor types — mirrored into a hidden field for the submit. */}
          <input type="hidden" name="hasExistingWebsite" value={hasExistingWebsite ? 'true' : 'false'} />
          <input type="hidden" name={FORM_RENDERED_AT_FIELD_NAME} value={renderedAt} />
          {/* Honeypot — real visitors never see or fill this in; a bot filling every field trips it. */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="build-website-honeypot">Leave this field blank</label>
            <input id="build-website-honeypot" name={HONEYPOT_FIELD_NAME} type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-(--color-brand)">
            Step {clampedIndex + 1} of {steps.length}
          </p>

          <StepSection active={currentStep === 'business'}>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Tell us about your business.</h1>
            <div>
              <label className={labelClass} htmlFor="name">Business name</label>
              <input id="name" name="name" type="text" placeholder="Acme Plumbing" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="industry">Industry</label>
              <select id="industry" name="industry" defaultValue="" className={inputClass}>
                <option value="" disabled>Select your industry</option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>{INDUSTRY_LABELS[industry]}</option>
                ))}
              </select>
            </div>
          </StepSection>

          <StepSection active={currentStep === 'contact'}>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">How can customers reach you?</h1>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="phone">Business phone</label>
                <input id="phone" name="phone" type="tel" placeholder="(555) 123-4567" className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="email">Business email</label>
                <input id="email" name="email" type="email" placeholder="you@business.com" className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="addressLine1">Street address <span className="text-gray-400 font-normal">(optional)</span></label>
              <input id="addressLine1" name="addressLine1" type="text" placeholder="123 Main St" className={inputClass} />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <input name="addressCity" type="text" placeholder="City" className={inputClass} />
              <input name="addressState" type="text" placeholder="State" className={inputClass} />
              <input name="addressPostalCode" type="text" placeholder="ZIP" className={inputClass} />
            </div>
          </StepSection>

          <StepSection active={currentStep === 'website'}>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Do you already have a website?</h1>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setHasExistingWebsite(true)}
                className={`rounded-xl border-2 px-5 py-4 text-left font-semibold transition-colors ${
                  hasExistingWebsite === true ? 'border-(--color-brand) bg-(--color-brand-muted) text-(--color-brand)' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                Yes, I have a website
              </button>
              <button
                type="button"
                onClick={() => setHasExistingWebsite(false)}
                className={`rounded-xl border-2 px-5 py-4 text-left font-semibold transition-colors ${
                  hasExistingWebsite === false ? 'border-(--color-brand) bg-(--color-brand-muted) text-(--color-brand)' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                No, I don&apos;t have one
              </button>
            </div>
            <div className={hasExistingWebsite === true ? 'block' : 'hidden'}>
              <label className={labelClass} htmlFor="websiteUrl">Website URL</label>
              <input id="websiteUrl" name="websiteUrl" type="url" placeholder="https://your-business.com" className={inputClass} />
            </div>
          </StepSection>

          <StepSection active={currentStep === 'details'}>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">A few details for your new site.</h1>
            <p className="text-sm text-gray-500">Nothing here is required — the more you share, the better your website turns out.</p>
            <div>
              <label className={labelClass} htmlFor="servicesOffered">Services offered <span className="text-gray-400 font-normal">(one per line)</span></label>
              <textarea id="servicesOffered" name="servicesOffered" rows={3} placeholder={'Drain cleaning\nWater heater repair\nEmergency service'} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="serviceAreas">Service areas <span className="text-gray-400 font-normal">(cities or towns you serve — not whole states)</span></label>
              <textarea id="serviceAreas" name="serviceAreas" rows={3} placeholder={'Pensacola\nGulf Breeze\nPace\nMilton'} className={inputClass} />
              <p className="mt-1.5 text-xs text-gray-400">List specific cities or communities, one per line — not entire states.</p>
            </div>
            <div>
              <label className={labelClass} htmlFor="description">Business description</label>
              <textarea id="description" name="description" rows={3} placeholder="Tell us what your business does." className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="differentiators">What makes you different? <span className="text-gray-400 font-normal">(one per line)</span></label>
              <textarea id="differentiators" name="differentiators" rows={3} placeholder={'Family owned\nUpfront pricing\nSame-day service'} className={inputClass} />
            </div>
          </StepSection>

          <StepSection active={currentStep === 'online'}>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Your online presence.</h1>
            <p className="text-sm text-gray-500">Optional — add any links you already have.</p>
            {SOCIAL_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label className={labelClass} htmlFor={`social_${key}`}>{label}</label>
                <input id={`social_${key}`} name={`social_${key}`} type="url" placeholder="https://..." className={inputClass} />
              </div>
            ))}
          </StepSection>

          <StepSection active={currentStep === 'photos'}>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Add your logo and photos.</h1>
            <p className="text-sm text-gray-500">Optional — we&apos;ll design something great even with zero photos.</p>

            <div>
              <label className={labelClass}>Logo</label>
              <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-500 hover:border-(--color-brand) transition-colors">
                {logoPreview ? (
                  <Image src={logoPreview} alt="Logo preview" width={48} height={48} className="h-12 w-12 rounded-lg object-contain" unoptimized />
                ) : (
                  <Upload size={20} />
                )}
                <span>{logoPreview ? 'Change logo' : 'Upload a logo'}</span>
                <input type="file" name="logo" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoChange} />
              </label>
            </div>

            <div>
              <label className={labelClass}>Business photos <span className="text-gray-400 font-normal">(up to {MAX_PHOTOS})</span></label>
              <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-500 hover:border-(--color-brand) transition-colors">
                <ImagePlus size={20} />
                <span>{photoPreviews.length > 0 ? `${photoPreviews.length} photo(s) selected` : 'Upload photos'}</span>
                <input type="file" name="photos" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handlePhotosChange} />
              </label>
              {photoPreviews.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {photoPreviews.map((src, i) => (
                    <Image key={i} src={src} alt="" width={80} height={80} className="h-20 w-full rounded-lg object-cover" unoptimized />
                  ))}
                </div>
              )}
            </div>
          </StepSection>

          {(stepError || state?.error) && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {stepError ?? state?.error}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            {clampedIndex > 0 ? (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            ) : (
              <span />
            )}

            {isLastStep ? (
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-xl bg-(--color-brand) px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-(--color-brand-dark) transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pending ? 'Building your website…' : 'Build My Website'}
                {!pending && <ArrowRight size={16} />}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-xl bg-(--color-brand) px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-(--color-brand-dark) transition-colors"
              >
                Next
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
