'use client';
import { useActionState } from 'react';
import { Mail, KeyRound, LogIn } from 'lucide-react';
import { customerSignInAction } from '@/lib/auth/customer-actions';
import { IconField, SubmitButton, ErrorAlert } from '@/components/access/fields';

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
