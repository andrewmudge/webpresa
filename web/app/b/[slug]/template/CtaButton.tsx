'use client';
import type { HTMLAttributes } from 'react';
import { externalLinkAttrs, type ResolvedCta } from './cta';
import { useRequestService } from './RequestServiceModal';

interface CtaButtonProps extends Omit<HTMLAttributes<HTMLElement>, 'onClick'> {
  cta: ResolvedCta;
  /** Runs before navigating/opening the dialog — e.g. closing a mobile nav drawer. */
  onNavigate?: () => void;
}

/**
 * Renders a resolved CTA as either a real link (every action type except
 * `request_service`) or a button that opens the shared request-service
 * dialog. This is the single place a stored CTA action type decides between
 * "navigate" and "open the modal" — individual template sections stay
 * unaware of the distinction and just pass through their existing
 * className/style.
 */
export function CtaButton({ cta, onNavigate, ...rest }: CtaButtonProps) {
  const { openRequestService } = useRequestService();

  if (cta.type === 'request_service') {
    return (
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          openRequestService();
        }}
        {...rest}
      />
    );
  }

  return <a href={cta.href} {...externalLinkAttrs(cta)} onClick={onNavigate} {...rest} />;
}
