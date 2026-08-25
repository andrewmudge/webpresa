import type { Metadata } from 'next';
import { BuildWizard } from './BuildWizard';

export const metadata: Metadata = {
  title: 'Build My Website — Webpresa',
  description: 'Tell us about your business and we\'ll build a custom website for you — no calls, no waiting, no design work.',
};

export default function BuildPage() {
  return <BuildWizard />;
}
