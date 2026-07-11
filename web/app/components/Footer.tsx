import Link from "next/link";
import Image from "next/image";

const footerLinks = [
  {
    heading: "Company",
    links: [
      { label: "How It Works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "About", href: "#about" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Privacy Policy", href: "#contact" },
      { label: "Terms of Service", href: "#contact" },
      { label: "Contact", href: "#contact" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-[#FAFAFA] border-t border-gray-100" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
          {/* Brand column */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <Image
                src="/webpresa_logo.png"
                alt="Webpresa"
                width={128}
                height={28}
                className="h-7 w-auto"
              />
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              Professional websites for local businesses. Hosting included.
              Maintenance handled.
            </p>
            <span className="inline-block mt-4 text-xs font-semibold text-brand bg-brand-muted px-3 py-1 rounded-full">
              Veteran-Owned
            </span>
          </div>

          {/* Link columns */}
          <div className="md:col-span-2 grid grid-cols-2 gap-8">
            {footerLinks.map((col) => (
              <div key={col.heading}>
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-4">
                  {col.heading}
                </h4>
                <ul className="space-y-2.5" role="list">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            © 2026 Webpresa. All rights reserved. 
          </p>
          <p>V0.0.1</p>
          <p className="text-xs text-gray-400">
            Your online presence, automated.
          </p>
        </div>
      </div>
    </footer>
  );
}
