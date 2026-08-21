/**
 * The only placeholders an email template's subject/body may reference.
 * Anything else must be rejected at save time — see
 * `implementation.md`, Marketing stage, "Email template editor".
 */
export const ALLOWED_TEMPLATE_VARIABLES = ['businessName', 'previewUrl', 'unsubscribeUrl'] as const;
export type AllowedTemplateVariable = (typeof ALLOWED_TEMPLATE_VARIABLES)[number];

/** Exported so `render-template.ts` can reuse the exact same matching rule when substituting values — must never drift from the validation regex below. */
export const VARIABLE_PATTERN = /\{\{\s*(\w+)\s*\}\}/g;

export interface ValidateTemplateVariablesResult {
  valid: boolean;
  unknownVariables: string[];
}

/**
 * Scans a subject or body for `{{variable}}` placeholders and reports any
 * that aren't in `ALLOWED_TEMPLATE_VARIABLES`. This is the load-bearing
 * gate — called from the admin save Server Action's Zod `.refine()`
 * (`app/admin/(dashboard)/marketing/templates/actions.ts`) — so an
 * unrecognized variable is rejected before it can ever reach a send.
 */
export function validateTemplateVariables(text: string): ValidateTemplateVariablesResult {
  const unknownVariables = new Set<string>();
  for (const match of text.matchAll(VARIABLE_PATTERN)) {
    const name = match[1];
    if (!(ALLOWED_TEMPLATE_VARIABLES as readonly string[]).includes(name)) {
      unknownVariables.add(name);
    }
  }
  return { valid: unknownVariables.size === 0, unknownVariables: Array.from(unknownVariables) };
}
