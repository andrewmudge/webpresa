'use client';

import { useState } from 'react';
import { THEME_OPTIONS } from '@/lib/themes';
import type { ThemeName } from '@/domain/constants/themes';
import { Card, SaveButton } from '../FormBits';
import { updateThemeCardActionCustomer } from '../actions';

interface Props {
  businessId: string;
  currentTheme?: ThemeName;
  isReadOnly: boolean;
}

/**
 * The selected swatch's border is colored to match that theme's own primary
 * color (not a generic brand-blue ring) — tracked in local state so the
 * border jumps to whichever swatch was just clicked instantly, before the
 * form is even submitted.
 */
export function ThemeTab({ businessId, currentTheme, isReadOnly }: Props) {
  const [selected, setSelected] = useState<ThemeName | undefined>(currentTheme);

  return (
    <Card title="Theme" description="A curated color and style preset for your website.">
      <form action={updateThemeCardActionCustomer.bind(null, businessId)} className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {THEME_OPTIONS.map((theme) => (
            <label
              key={theme.name}
              className="flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 cursor-pointer transition-colors"
              style={{ borderColor: selected === theme.name ? theme.primary : 'transparent' }}
            >
              <input
                type="radio"
                name="theme"
                value={theme.name}
                checked={selected === theme.name}
                onChange={() => setSelected(theme.name)}
                disabled={isReadOnly}
                className="sr-only"
              />
              <span className="flex gap-1">
                <span className="h-5 w-5 rounded-full" style={{ backgroundColor: theme.primary }} />
                <span className="h-5 w-5 rounded-full" style={{ backgroundColor: theme.accent }} />
              </span>
              <span className="text-xs text-gray-700 text-center">{theme.displayName}</span>
            </label>
          ))}
        </div>
        <SaveButton disabled={isReadOnly} />
      </form>
    </Card>
  );
}
