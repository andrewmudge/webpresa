'use client';

import { useState } from 'react';

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

interface Props {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/** A bordered card whose body collapses behind a chevron toggle. Defaults closed unless `defaultOpen`. */
export function CollapsibleCard({ title, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-gray-200 bg-white mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-6 py-4 text-left text-gray-800 hover:text-black"
      >
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
        <ChevronIcon open={open} />
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}
