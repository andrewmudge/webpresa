import { getScanTypeLabel, getScanTypeColorClass, type ScanTypeInput } from '@/lib/scans/scan-type';

export function ScanTypeBadge({ scan }: { scan: ScanTypeInput }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getScanTypeColorClass(scan)}`}>
      {getScanTypeLabel(scan)}
    </span>
  );
}
