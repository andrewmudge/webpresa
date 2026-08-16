import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/app/components/Footer';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="mx-auto flex w-full max-w-3xl items-center px-4 py-6 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/webpresa_w.png" alt="Webpresa" width={692} height={394} className="h-7 w-auto" />
          <span className="text-base font-bold tracking-tight text-gray-900">Webpresa</span>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 sm:px-6">{children}</main>

      <Footer />
    </div>
  );
}
