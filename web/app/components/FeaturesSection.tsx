import { CheckCircle2 } from "lucide-react";

const columns = [
  {
    title: "Your Website",
    items: [
      "Professional, modern design",
      "Mobile optimized",
      "Fast loading",
      "Contact forms included",
    ],
  },
  {
    title: "Editing & Control",
    items: [
      "Edit your text, photos, and services yourself",
      "Change your theme and logo anytime",
      "Reorder or hide page sections",
      "Connect your own custom domain",
    ],
  },
  {
    title: "Ongoing Management",
    items: [
      "Managed hosting",
      "Security monitoring",
      "Ongoing maintenance",
      "Automatic backups",
    ],
  },
];

export default function FeaturesSection() {
  return (
    <section
      className="bg-[#F8FAFC] py-24 lg:py-32"
      aria-labelledby="features-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-brand mb-4">
            Everything Included
          </span>
          <h2
            id="features-heading"
            className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight"
          >
            Everything managed. Full control, still yours.
          </h2>
        </div>

        {/* Feature columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {columns.map((col) => (
            <div key={col.title} className="bg-[#FAFAFA] rounded-2xl p-8 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6 pb-5 border-b border-gray-200">
                {col.title}
              </h3>
              <ul className="space-y-3.5" role="list">
                {col.items.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2
                      size={16}
                      className="text-brand flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-sm text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
