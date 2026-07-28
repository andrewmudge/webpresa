'use client';
import { useActionState, useState } from 'react';
import {
  signUpForClaimAction,
  confirmSignUpForClaimAction,
  signInForClaimAction,
  resendConfirmationCodeAction,
} from '../actions';

interface Props {
  businessName: string;
}

export function ClaimContinueForm({ businessName }: Props) {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [password, setPassword] = useState('');

  const [signUpState, signUpFormAction, signUpPending] = useActionState(signUpForClaimAction, undefined);
  const [confirmState, confirmFormAction, confirmPending] = useActionState(confirmSignUpForClaimAction, undefined);
  const [signInState, signInFormAction, signInPending] = useActionState(signInForClaimAction, undefined);

  const pendingConfirmEmail =
    signUpState?.step === 'confirm' ? signUpState.email : signInState?.needsConfirmation ? signInState.email : undefined;

  if (pendingConfirmEmail) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          We emailed a confirmation code to <span className="font-medium">{pendingConfirmEmail}</span>.
        </p>
        {confirmState?.error && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {confirmState.error}
          </div>
        )}
        <form action={confirmFormAction} className="space-y-3">
          <input type="hidden" name="email" value={pendingConfirmEmail} />
          <input type="hidden" name="password" value={password} />
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Confirmation code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              autoComplete="one-time-code"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={confirmPending}
            className="w-full rounded-lg bg-(--color-brand) text-white py-2.5 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {confirmPending ? 'Confirming…' : 'Confirm'}
          </button>
        </form>
        <form action={resendConfirmationCodeAction}>
          <input type="hidden" name="email" value={pendingConfirmEmail} />
          <button type="submit" className="text-xs text-gray-500 underline hover:text-gray-700">
            Resend code
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Claiming <span className="font-medium">{businessName}</span>
      </p>

      <div className="flex gap-3 text-sm border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={mode === 'signup' ? 'font-semibold text-(--color-brand)' : 'text-gray-500'}
        >
          Create account
        </button>
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={mode === 'signin' ? 'font-semibold text-(--color-brand)' : 'text-gray-500'}
        >
          Sign in
        </button>
      </div>

      {mode === 'signup' ? (
        <>
          {signUpState?.step === 'signup' && signUpState.error && (
            <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {signUpState.error}
            </div>
          )}
          <form action={signUpFormAction} className="space-y-3">
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
            />
            <button
              type="submit"
              disabled={signUpPending}
              className="w-full rounded-lg bg-(--color-brand) text-white py-2.5 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {signUpPending ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </>
      ) : (
        <>
          {signInState?.error && (
            <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {signInState.error}
            </div>
          )}
          <form action={signInFormAction} className="space-y-3">
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
            />
            <button
              type="submit"
              disabled={signInPending}
              className="w-full rounded-lg bg-(--color-brand) text-white py-2.5 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {signInPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
