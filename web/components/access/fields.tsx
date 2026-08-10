import type { CSSProperties, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * Shared form-field/button primitives for the postcard-access flow's white
 * cards (`/r`, `/claim/continue`, `/account/sign-in`) — extracted once a
 * third page needed the same rounded-xl, icon-accented input/button style
 * (see `components/access/AccessPageShell.tsx` for the surrounding shell
 * these are meant to be used inside of).
 */

export function IconField({
  icon: Icon,
  accentColor,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accentColor: string;
}) {
  return (
    <div className="relative">
      <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        {...props}
        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
        style={{ '--tw-ring-color': accentColor } as CSSProperties}
      />
    </div>
  );
}

export function PlainField(props: React.InputHTMLAttributes<HTMLInputElement> & { accentColor: string }) {
  const { accentColor, ...rest } = props;
  return (
    <input
      {...rest}
      className="w-full rounded-xl border border-gray-200 bg-white py-3 px-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
      style={{ '--tw-ring-color': accentColor } as CSSProperties}
    />
  );
}

export function SubmitButton({
  accentColor,
  pending,
  pendingLabel,
  label,
  disabled = false,
}: {
  accentColor: string;
  pending: boolean;
  pendingLabel: string;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
      style={{ backgroundColor: accentColor }}
    >
      {pending ? pendingLabel : label}
      {!pending && <ArrowRight size={16} />}
    </button>
  );
}

export function ErrorAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {children}
    </div>
  );
}

export function SuccessAlert({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
      {children}
    </div>
  );
}
