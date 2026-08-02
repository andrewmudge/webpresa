'use client';

import { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { classifySocialPlatform } from '@/lib/social-links';
import { SOCIAL_PLATFORM_LABELS } from '@/domain/constants/social-platforms';

interface Props {
  defaultLinks: string[];
}

/**
 * Repeatable Platform+URL rows, per implementation.md's explicit
 * instruction not to use a single "one URL per line" textarea when the
 * model can reasonably support structured rows. `Business.socialLinks`
 * itself stays a plain `string[]` server-side (see the plan's "Data model
 * changes" — avoids a migration across every existing business record);
 * this component only adds the structured *editing* affordance, mirroring
 * exactly what the server already does with each URL
 * (`classifySocialPlatform`) rather than trusting a separately-chosen
 * platform value that could disagree with it. The hidden textarea is what
 * `updateCustomerBusinessInfo` actually parses (one URL per line).
 */
export function SocialLinksEditor({ defaultLinks }: Props) {
  const [urls, setUrls] = useState<string[]>(defaultLinks.length > 0 ? defaultLinks : ['']);
  const legendId = useId();

  function updateUrl(index: number, value: string) {
    setUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  }

  function removeRow(index: number) {
    setUrls((prev) => (prev.length === 1 ? [''] : prev.filter((_, i) => i !== index)));
  }

  function addRow() {
    setUrls((prev) => [...prev, '']);
  }

  return (
    <fieldset>
      <legend id={legendId} className="block text-sm font-medium text-gray-700 mb-1">
        Social links
      </legend>
      <div className="space-y-2">
        {urls.map((url, index) => {
          const platform = url.trim() ? classifySocialPlatform(url) : undefined;
          return (
            <div key={index} className="flex items-center gap-2">
              <span className="hidden sm:block w-20 shrink-0 text-xs text-gray-500 truncate">
                {platform ? SOCIAL_PLATFORM_LABELS[platform] : '—'}
              </span>
              <input
                type="url"
                aria-label={`Social link ${index + 1}`}
                value={url}
                onChange={(e) => updateUrl(index, e.target.value)}
                placeholder="https://facebook.com/yourbusiness"
                className="flex-1 min-w-0 rounded-lg border border-(--color-border) px-3 py-2 text-base sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
              />
              <button
                type="button"
                onClick={() => removeRow(index)}
                aria-label={`Remove social link ${index + 1}`}
                className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-(--color-brand) hover:underline"
      >
        <Plus size={14} aria-hidden="true" /> Add social link
      </button>
      <textarea name="socialLinks" value={urls.filter((u) => u.trim()).join('\n')} readOnly hidden aria-hidden="true" />
    </fieldset>
  );
}
