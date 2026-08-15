'use client';
import { useActionState, useState } from 'react';
import { Mail, Phone, KeyRound, UserPlus } from 'lucide-react';
import { passwordMeetsPolicy } from '@/lib/auth/password-policy';
import { IconField, PlainField, SubmitButton, ErrorAlert } from '@/components/access/fields';
import {
  signUpForClaimAction,
  confirmSignUpForClaimAction,
  signInForClaimAction,
  resendConfirmationCodeAction,
} from '../actions';
import { PasswordStrengthChecklist } from './PasswordStrengthChecklist';

interface Props {
  businessName: string;
  accentColor: string;
}

export function ClaimContinueForm({ businessName, accentColor }: Props) {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessNameInput, setBusinessNameInput] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressPostalCode, setAddressPostalCode] = useState('');

  const passwordValid = passwordMeetsPolicy(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const [signUpState, signUpFormAction, signUpPending] = useActionState(signUpForClaimAction, undefined);
  const [confirmState, confirmFormAction, confirmPending] = useActionState(confirmSignUpForClaimAction, undefined);
  const [signInState, signInFormAction, signInPending] = useActionState(signInForClaimAction, undefined);

  const pendingConfirmEmail =
    signUpState?.step === 'confirm' ? signUpState.email : signInState?.needsConfirmation ? signInState.email : undefined;

  if (pendingConfirmEmail) {
    return (
      <div>
        <div className="mb-6 flex flex-col items-center text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
          >
            <Mail size={24} />
          </span>
          <h2 className="mt-4 text-xl font-bold text-gray-900">Check your email</h2>
          <p className="mt-1.5 text-sm text-gray-500">
            We emailed a confirmation code to <span className="font-medium text-gray-700">{pendingConfirmEmail}</span>.
          </p>
        </div>

        <div className="space-y-4">
          {confirmState?.error && <ErrorAlert>{confirmState.error}</ErrorAlert>}
          <form action={confirmFormAction} className="space-y-3">
            <input type="hidden" name="email" value={pendingConfirmEmail} />
            <input type="hidden" name="password" value={password} />
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirmation code
              </label>
              <PlainField
                id="code"
                name="code"
                type="text"
                required
                autoComplete="one-time-code"
                accentColor={accentColor}
              />
            </div>
            <SubmitButton accentColor={accentColor} pending={confirmPending} pendingLabel="Confirming…" label="Confirm" />
          </form>
          <form action={resendConfirmationCodeAction} className="text-center">
            <input type="hidden" name="email" value={pendingConfirmEmail} />
            <button type="submit" className="text-xs text-gray-500 underline hover:text-gray-700">
              Resend code
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col items-center text-center">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
        >
          <UserPlus size={24} />
        </span>
        <h2 className="mt-4 text-xl font-bold text-gray-900">Create your account</h2>
        <p className="mt-1.5 text-sm text-gray-500">
          Claiming <span className="font-medium text-gray-700">{businessName}</span>
        </p>
      </div>

      <div className="mb-5 flex gap-5 border-b border-gray-200 text-sm">
        <button
          type="button"
          onClick={() => setMode('signup')}
          className="-mb-px border-b-2 pb-2.5 font-semibold transition-colors"
          style={mode === 'signup' ? { borderColor: accentColor, color: accentColor } : { borderColor: 'transparent', color: '#6b7280' }}
        >
          Create account
        </button>
        <button
          type="button"
          onClick={() => setMode('signin')}
          className="-mb-px border-b-2 pb-2.5 font-semibold transition-colors"
          style={mode === 'signin' ? { borderColor: accentColor, color: accentColor } : { borderColor: 'transparent', color: '#6b7280' }}
        >
          Sign in
        </button>
      </div>

      {mode === 'signup' ? (
        <>
          <p className="mb-4 text-xs text-gray-500">You&apos;ll use this account to subscribe, edit, and manage your website.</p>
          <div className="space-y-4">
            {signUpState?.step === 'signup' && signUpState.error && <ErrorAlert>{signUpState.error}</ErrorAlert>}
            <form action={signUpFormAction} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <PlainField
                  name="firstName"
                  type="text"
                  placeholder="First name"
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  accentColor={accentColor}
                />
                <PlainField
                  name="lastName"
                  type="text"
                  placeholder="Last name"
                  required
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  accentColor={accentColor}
                />
              </div>
              <IconField
                icon={Mail}
                name="email"
                type="email"
                placeholder="Email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                accentColor={accentColor}
              />
              <IconField
                icon={Phone}
                name="phone"
                type="tel"
                placeholder="Phone number"
                required
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                accentColor={accentColor}
              />
              <div>
                <IconField
                  icon={KeyRound}
                  name="password"
                  type="password"
                  placeholder="Password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  accentColor={accentColor}
                />
                <PasswordStrengthChecklist password={password} />
              </div>

              <div>
                <IconField
                  icon={KeyRound}
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  accentColor={accentColor}
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="mt-1.5 text-xs text-red-600">Passwords don&apos;t match.</p>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-2.5">Business information</p>
                <div className="space-y-3">
                  <PlainField
                    name="businessName"
                    type="text"
                    placeholder="Business name"
                    required
                    autoComplete="organization"
                    value={businessNameInput}
                    onChange={(event) => setBusinessNameInput(event.target.value)}
                    accentColor={accentColor}
                  />
                  <PlainField
                    name="addressLine1"
                    type="text"
                    placeholder="Street address"
                    required
                    autoComplete="address-line1"
                    value={addressLine1}
                    onChange={(event) => setAddressLine1(event.target.value)}
                    accentColor={accentColor}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <PlainField
                      name="addressCity"
                      type="text"
                      placeholder="City"
                      required
                      autoComplete="address-level2"
                      value={addressCity}
                      onChange={(event) => setAddressCity(event.target.value)}
                      accentColor={accentColor}
                    />
                    <PlainField
                      name="addressState"
                      type="text"
                      placeholder="State"
                      required
                      autoComplete="address-level1"
                      value={addressState}
                      onChange={(event) => setAddressState(event.target.value)}
                      accentColor={accentColor}
                    />
                  </div>
                  <PlainField
                    name="addressPostalCode"
                    type="text"
                    placeholder="ZIP code"
                    required
                    autoComplete="postal-code"
                    value={addressPostalCode}
                    onChange={(event) => setAddressPostalCode(event.target.value)}
                    accentColor={accentColor}
                  />
                </div>
              </div>

              <SubmitButton
                accentColor={accentColor}
                pending={signUpPending}
                pendingLabel="Creating account…"
                label="Create account"
                disabled={!passwordValid || !passwordsMatch}
              />
            </form>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          {signInState?.error && <ErrorAlert>{signInState.error}</ErrorAlert>}
          <form action={signInFormAction} className="space-y-3">
            <IconField
              icon={Mail}
              name="email"
              type="email"
              placeholder="Email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              accentColor={accentColor}
            />
            <IconField
              icon={KeyRound}
              name="password"
              type="password"
              placeholder="Password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              accentColor={accentColor}
            />
            <SubmitButton accentColor={accentColor} pending={signInPending} pendingLabel="Signing in…" label="Sign in" />
          </form>
        </div>
      )}
    </div>
  );
}
