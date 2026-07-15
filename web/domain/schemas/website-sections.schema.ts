import { z } from 'zod';
import {
  WEBSITE_SECTION_TYPES,
  WEBSITE_SECTION_CATALOG,
  REQUIRED_SECTION_TYPES,
  SECTION_CONFIG_VERSION,
} from '@/domain/constants/website-sections';

/**
 * Validates a single stored section entry. `component` is restricted to the
 * fixed catalog enum — an unsupported identifier fails at the `z.enum`
 * level before the variant check ever runs. `variant` is checked against
 * that specific component's allowed variants in the catalog, not just any
 * string.
 */
export const WebsiteSectionConfigSchema = z
  .object({
    component: z.enum(WEBSITE_SECTION_TYPES),
    enabled: z.boolean(),
    order: z.number().int().min(0).max(1000),
    variant: z.string().min(1).max(40),
  })
  .refine((section) => (WEBSITE_SECTION_CATALOG[section.component].variants as readonly string[]).includes(section.variant), {
    message: 'variant is not supported for this component',
    path: ['variant'],
  });

/**
 * Validates the full, versioned section configuration for a business. This
 * is the strict, save-time gate — used by the admin server action before
 * any `Business.websiteSections` write. It intentionally rejects malformed
 * input rather than silently repairing it (that lenient behavior belongs to
 * the render-time fallback in `lib/website-sections/resolve.ts`, which must
 * never throw).
 */
export const WebsiteSectionsConfigSchema = z
  .object({
    sectionConfigVersion: z.number().int().min(1),
    sections: z.array(WebsiteSectionConfigSchema).min(1).max(WEBSITE_SECTION_TYPES.length),
  })
  .superRefine((config, ctx) => {
    if (config.sectionConfigVersion > SECTION_CONFIG_VERSION) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sectionConfigVersion'],
        message: `Unsupported sectionConfigVersion (max supported: ${SECTION_CONFIG_VERSION})`,
      });
    }

    const seen = new Set<string>();
    for (const section of config.sections) {
      if (seen.has(section.component)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sections'],
          message: `Duplicate section entry: ${section.component}`,
        });
      }
      seen.add(section.component);
    }

    for (const required of REQUIRED_SECTION_TYPES) {
      const entry = config.sections.find((s) => s.component === required);
      if (!entry) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sections'],
          message: `Missing required section: ${required}`,
        });
      } else if (!entry.enabled) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sections'],
          message: `Required section cannot be disabled: ${required}`,
        });
      }
    }
  });
