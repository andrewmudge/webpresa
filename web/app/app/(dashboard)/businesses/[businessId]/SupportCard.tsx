import { Mail } from 'lucide-react';
import { Card } from './FormBits';

/** The only support destination that exists in this app today — `mailto:hello@webpresa.com`, the same address already used in onboarding/checkout. No help center exists yet, so no "View Help Center" action is shown. */
export function SupportCard() {
  return (
    <Card title="Need help?" description="We're here if you have questions about your website or subscription.">
      <a
        href="mailto:hello@webpresa.com"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Mail size={16} aria-hidden="true" />
        Contact Support
      </a>
    </Card>
  );
}
