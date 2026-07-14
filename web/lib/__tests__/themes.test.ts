import { describe, it, expect } from 'vitest';
import { THEME_NAMES } from '@/domain/constants/themes';
import { THEMES, THEME_OPTIONS, getTheme, isThemeName, resolveThemePalette } from '@/lib/themes';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const COLOR_FIELDS = [
  'primary',
  'accent',
  'background',
  'surface',
  'text',
  'mutedText',
  'border',
  'success',
  'warning',
  'danger',
] as const;

describe('THEMES — curated preset catalog', () => {
  it('has exactly one entry per THEME_NAMES value', () => {
    expect(Object.keys(THEMES).sort()).toEqual([...THEME_NAMES].sort());
  });

  it.each(THEME_NAMES)('%s has every required color as a valid 6-digit hex value', (name) => {
    const theme = THEMES[name];
    for (const field of COLOR_FIELDS) {
      expect(theme[field]).toMatch(HEX_RE);
    }
  });

  it.each(THEME_NAMES)('%s reports its own name and a non-empty displayName/bestFor', (name) => {
    const theme = THEMES[name];
    expect(theme.name).toBe(name);
    expect(theme.displayName.length).toBeGreaterThan(0);
    expect(theme.bestFor.length).toBeGreaterThan(0);
  });

  it('THEME_OPTIONS contains every preset in THEME_NAMES order', () => {
    expect(THEME_OPTIONS.map((t) => t.name)).toEqual([...THEME_NAMES]);
  });
});

describe('getTheme / isThemeName', () => {
  it('getTheme returns the exact preset for a given name', () => {
    expect(getTheme('green').primary).toBe('#1E7D46');
  });

  it('isThemeName accepts every approved name', () => {
    for (const name of THEME_NAMES) {
      expect(isThemeName(name)).toBe(true);
    }
  });

  it('isThemeName rejects an arbitrary string', () => {
    expect(isThemeName('neonPink')).toBe(false);
  });
});

describe('resolveThemePalette', () => {
  it('resolves a curated preset directly by themeName, ignoring any legacy fields', () => {
    const palette = resolveThemePalette({ themeName: 'purple', primaryColor: '#000000' });
    expect(palette).toEqual(THEMES.purple);
  });

  it('falls back to the default preset neutrals with legacy hex colors substituted in', () => {
    const palette = resolveThemePalette({ primaryColor: '#123456', accentColor: '#abcdef' });
    expect(palette.primary).toBe('#123456');
    expect(palette.accent).toBe('#abcdef');
    expect(palette.background).toBe(THEMES.classicBlue.background);
    expect(palette.text).toBe(THEMES.classicBlue.text);
  });
});
