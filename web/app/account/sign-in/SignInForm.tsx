'use client';
import { useActionState } from 'react';
import { Mail, KeyRound, LogIn } from 'lucide-react';
import { customerSignInAction } from '@/lib/auth/customer-actions';
import { IconField, SubmitButton, ErrorAlert } from '@/components/access/fields';
import { GoogleGIcon } from '@/components/icons/GoogleGIcon';

interface Props {
  next?: string;
  accentColor: string;
}

export function SignInForm({ next, accentColor }: Props) {
  const [state, formAction, pending] = useActionState(customerSignInAction, undefined);

  return (
    <div>
      <div className="mb-6 flex flex-col items-center text-center">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
        >
          <LogIn size={24} />
        </span>
        <h2 className="mt-4 text-xl font-bold text-gray-900">Sign in</h2>
        <p className="mt-1.5 text-sm text-gray-500">Enter your email and password to continue.</p>
      </div>

      <a
        href={`/api/auth/google/start${next ? `?next=${encodeURIComponent(next)}` : ''}`}
        className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <GoogleGIcon className="h-4 w-4" />
        Continue with Google
      </a>
      <div className="mb-4 flex items-center gap-3 text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        or
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ''} />
        {state?.error && <ErrorAlert>{state.error}</ErrorAlert>}
        <IconField icon={Mail} name="email" type="email" placeholder="Email" required autoComplete="email" accentColor={accentColor} />
        <IconField
          icon={KeyRound}
          name="password"
          type="password"
          placeholder="Password"
          required
          autoComplete="current-password"
          accentColor={accentColor}
        />
        <SubmitButton accentColor={accentColor} pending={pending} pendingLabel="Signing in…" label="Sign in" />
      </form>
    </div>
  );
}
