import { Check, X } from 'lucide-react';
import { PASSWORD_RULES } from '@/lib/auth/password-policy';

export function PasswordStrengthChecklist({ password }: { password: string }) {
  return (
    <ul className="mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li key={rule.id} className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600' : 'text-gray-400'}`}>
            {met ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
