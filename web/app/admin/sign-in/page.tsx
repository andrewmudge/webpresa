'use client';
import { useActionState } from 'react';
import { signIn, type SignInState } from '@/lib/auth/actions';

export default function SignInPage() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, undefined);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-[--color-border] p-8">
          {/* Logo / brand */}
          <div className="mb-8 text-center">
            <span className="text-2xl font-bold text-[--color-brand]">Webpresa</span>
            <p className="text-sm text-gray-500 mt-1">Admin Dashboard</p>
          </div>

          {/* Global error */}
          {state?.message && (
            <div
              role="alert"
              className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
            >
              {state.message}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[--color-brand] focus:border-transparent"
              />
              {state?.errors?.username && (
                <p className="mt-1 text-xs text-red-600">{state.errors.username[0]}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[--color-brand] focus:border-transparent"
              />
              {state?.errors?.password && (
                <p className="mt-1 text-xs text-red-600">{state.errors.password[0]}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-[--color-brand] text-white py-2.5 text-sm font-medium hover:bg-[--color-brand-dark] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
