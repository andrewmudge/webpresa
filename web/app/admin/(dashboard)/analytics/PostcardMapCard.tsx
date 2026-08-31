'use client';

import { useMemo, useState } from 'react';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import { INDUSTRIES } from '@/domain/constants/industries';
import type { Industry } from '@/domain/constants/industries';
import type { PostcardMapPin, PostcardPinColor } from '@/lib/analytics/dashboard-types';

/**
 * The one deliberately client-exposed key in this codebase — see
 * `.env.local.example` and `docs/architecture.md` for why a Google Maps JS
 * key is safe to ship to the browser (HTTP-referrer restriction, not
 * secrecy) unlike every other secret in this app.
 */
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const PIN_COLORS: Record<PostcardPinColor, { hex: string; label: string }> = {
  blue: { hex: '#2563eb', label: 'Delivered' },
  purple: { hex: '#9333ea', label: 'Engaged' },
  green: { hex: '#16a34a', label: 'Customer' },
  red: { hex: '#dc2626', label: 'Cancelled' },
};

const CONTINENTAL_US_CENTER = { lat: 39.8283, lng: -98.5795 };
const CONTINENTAL_US_ZOOM = 4;
/** Below this degree span, `fitBounds` would over-zoom (e.g. a single pin, or several businesses sharing one ZIP centroid) — fall back to a fixed center/zoom instead. */
const MIN_BOUNDS_SPAN_DEGREES = 0.05;

function markerIconUrl(color: PostcardPinColor): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="6" fill="${PIN_COLORS[color].hex}" stroke="white" stroke-width="2"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function formatIndustryLabel(industry: string): string {
  return industry.replace(/_/g, ' ');
}

interface Camera {
  bounds?: google.maps.LatLngBoundsLiteral;
  center?: google.maps.LatLngLiteral;
  zoom?: number;
}

function computeCamera(pins: PostcardMapPin[]): Camera {
  if (pins.length === 0) return { center: CONTINENTAL_US_CENTER, zoom: CONTINENTAL_US_ZOOM };
  if (pins.length === 1) return { center: { lat: pins[0].latitude, lng: pins[0].longitude }, zoom: 10 };

  let north = pins[0].latitude;
  let south = pins[0].latitude;
  let east = pins[0].longitude;
  let west = pins[0].longitude;
  for (const pin of pins) {
    north = Math.max(north, pin.latitude);
    south = Math.min(south, pin.latitude);
    east = Math.max(east, pin.longitude);
    west = Math.min(west, pin.longitude);
  }

  if (north - south < MIN_BOUNDS_SPAN_DEGREES && east - west < MIN_BOUNDS_SPAN_DEGREES) {
    return { center: { lat: (north + south) / 2, lng: (east + west) / 2 }, zoom: 10 };
  }
  return { bounds: { north, south, east, west } };
}

/**
 * Stage 29 addendum — one pin per business a postcard has been mailed to
 * (`computeMapPins`, `lib/analytics/dashboard.ts`), colored by funnel stage.
 * `pins` is server-computed and fed in as a prop; the industry filter and
 * map pan/zoom are local client-side state, independent of `FilterBar.tsx`'s
 * page-level GET-form filters, mirroring `PostcardPerformanceTable.tsx`'s
 * "local interaction over server-fetched data" precedent.
 */
export function PostcardMapCard({ pins }: { pins: PostcardMapPin[] }) {
  const [industry, setIndustry] = useState<Industry | ''>('');
  const [selectedPin, setSelectedPin] = useState<PostcardMapPin | null>(null);

  const filteredPins = useMemo(() => (industry ? pins.filter((p) => p.industry === industry) : pins), [pins, industry]);
  const camera = useMemo(() => computeCamera(filteredPins), [filteredPins]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Postcard Map</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {filteredPins.length} of {pins.length} mailed businesses shown
          </p>
        </div>
        <div>
          <label htmlFor="postcard-map-industry-filter" className="sr-only">
            Industry
          </label>
          <select
            id="postcard-map-industry-filter"
            value={industry}
            onChange={(e) => {
              setIndustry(e.target.value as Industry | '');
              setSelectedPin(null);
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
          >
            <option value="">All industries</option>
            {INDUSTRIES.map((opt) => (
              <option key={opt} value={opt}>
                {formatIndustryLabel(opt)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-3">
        {(Object.keys(PIN_COLORS) as PostcardPinColor[]).map((color) => (
          <div key={color} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIN_COLORS[color].hex }} />
            {PIN_COLORS[color].label}
          </div>
        ))}
      </div>

      {!GOOGLE_MAPS_API_KEY ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
          Map isn&apos;t configured yet — set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable it (see deployment.md).
        </div>
      ) : filteredPins.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">No mailed businesses match this filter yet.</div>
      ) : (
        <div className="h-[480px] w-full overflow-hidden rounded-lg border border-gray-200">
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              key={industry}
              defaultBounds={camera.bounds ? { ...camera.bounds, padding: 40 } : undefined}
              defaultCenter={camera.bounds ? undefined : camera.center}
              defaultZoom={camera.bounds ? undefined : camera.zoom}
              gestureHandling="greedy"
              mapTypeControl={false}
              streetViewControl={false}
            >
              {filteredPins.map((pin) => (
                <Marker key={pin.businessId} position={{ lat: pin.latitude, lng: pin.longitude }} icon={markerIconUrl(pin.color)} title={pin.name} onClick={() => setSelectedPin(pin)} />
              ))}
              {selectedPin && (
                <InfoWindow position={{ lat: selectedPin.latitude, lng: selectedPin.longitude }} onCloseClick={() => setSelectedPin(null)}>
                  <div className="text-xs">
                    <p className="font-semibold text-gray-900">{selectedPin.name}</p>
                    <p className="text-gray-500">{formatIndustryLabel(selectedPin.industry)}</p>
                    <p className="text-gray-500">{PIN_COLORS[selectedPin.color].label}</p>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        </div>
      )}
    </div>
  );
}
