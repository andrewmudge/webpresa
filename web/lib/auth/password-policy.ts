/**
 * Single source of truth for the customer password policy — must match the
 * Cognito User Pool's actual enforced policy exactly, or the client-side
 * checklist shows all-green for a password Cognito still rejects.
 *
 * `infra/lib/constructs/webpresa-user-pool.ts`'s `WebpresaUserPool`
 * construct passes no `passwordPolicy` override, so the User Pool uses
 * CDK/Cognito's default: min 8 characters, at least one uppercase,
 * lowercase, digit, and symbol — confirmed as real server-side enforcement
 * via `InvalidPasswordException` in `lib/auth/customer-cognito.ts`.
 *
 * Deliberately no `server-only` import here — used both by a client
 * component (the live checklist) and a `'use server'` action file
 * (`app/claim/actions.ts`).
 */
export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'At least 8 characters', test: (password) => password.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (password) => /[A-Z]/.test(password) },
  { id: 'lowercase', label: 'One lowercase letter', test: (password) => /[a-z]/.test(password) },
  { id: 'digit', label: 'One number', test: (password) => /[0-9]/.test(password) },
  { id: 'symbol', label: 'One symbol (e.g. !@#$%)', test: (password) => /[^A-Za-z0-9]/.test(password) },
];

export function passwordMeetsPolicy(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
